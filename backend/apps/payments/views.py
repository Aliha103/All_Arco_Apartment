from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from django.utils import timezone
import stripe
from .models import Payment, Refund
from .serializers import PaymentSerializer, RefundSerializer
from apps.bookings.models import Booking, BookingAttempt
from apps.bookings.serializers import BookingSerializer
from apps.emails.services import send_booking_confirmation, send_payment_receipt

stripe.api_key = settings.STRIPE_SECRET_KEY


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing payments."""
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Payment.objects.select_related('booking').all()

        # Guests see only their payments
        if not user.is_team_member():
            queryset = queryset.filter(
                Q(booking__user=user) | Q(booking__guest_email=user.email)
            )

        return queryset.order_by('-created_at')


@api_view(['POST'])
@permission_classes([AllowAny])
def create_checkout_session(request):
    """Create Stripe Checkout Session for booking payment."""
    booking_id = request.data.get('booking_id')
    
    try:
        booking = Booking.objects.get(id=booking_id)
    except Booking.DoesNotExist:
        return Response(
            {'error': 'Booking not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if booking.payment_status in ['paid', 'partial', 'partially_refunded', 'refunded']:
        return Response(
            {'error': 'Booking is already paid or settled'},
            status=status.HTTP_400_BAD_REQUEST
        )

    amount_to_charge = float(booking.amount_due or booking.total_price or 0)
    # Resolve frontend host for redirects (fallback to production domain)
    frontend_host = getattr(settings, 'FRONTEND_URL', None) or (
        settings.CORS_ALLOWED_ORIGINS[0] if settings.CORS_ALLOWED_ORIGINS else None
    ) or 'https://www.allarcoapartment.com'
    frontend_host = frontend_host.rstrip('/')

    if amount_to_charge <= 0:
        return Response(
            {'error': 'No payment due for this booking'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create Stripe Checkout Session
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[
                {
                    'price_data': {
                        'currency': 'eur',
                        'product_data': {
                            'name': f"All'Arco Apartment - {booking.nights} nights",
                            'description': f"{booking.check_in_date} to {booking.check_out_date}",
                        },
                        'unit_amount': int(amount_to_charge * 100),  # Convert to cents
                    },
                    'quantity': 1,
                },
            ],
            mode='payment',
            success_url=(
                f"{frontend_host}/booking/confirmation"
                f"?session_id={{CHECKOUT_SESSION_ID}}&booking_id={booking.id}"
            ),
            cancel_url=f"{frontend_host}/book",
            customer_email=booking.guest_email,
            metadata={
                'booking_id': str(booking.id),
            },
            payment_intent_data={
                'metadata': {
                    'booking_id': str(booking.id),
                }
            }
        )

        # Track attempt for admin visibility
        BookingAttempt.objects.create(
            booking=booking,
            stripe_session_id=session.id,
            status='initiated',
            amount_due=amount_to_charge,
            guest_email=booking.guest_email,
            guest_name=booking.guest_name,
            check_in_date=booking.check_in_date,
            check_out_date=booking.check_out_date,
        )
        
        return Response({'session_url': session.url, 'session_id': session.id})
    
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def confirm_checkout_session(request):
    """
    Verify a Stripe Checkout session and force-update booking/payment status.
    Useful if the webhook is delayed or missed.
    """
    session_id = request.data.get('session_id')
    booking_id = request.data.get('booking_id')

    if not session_id:
        return Response({'error': 'Missing session_id'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception:
        return Response({'error': 'Invalid or expired session'}, status=status.HTTP_400_BAD_REQUEST)

    resolved_booking_id = booking_id or (session.get('metadata') or {}).get('booking_id')
    if not resolved_booking_id:
        return Response({'error': 'Booking id missing'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        booking = Booking.objects.get(id=resolved_booking_id)
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)

    # Already paid
    if booking.payment_status == 'paid':
        return Response(BookingSerializer(booking).data)

    session_status = session.get('status')
    payment_status = session.get('payment_status')
    payment_intent = session.get('payment_intent')

    # Only mark paid when Stripe marks it complete/paid
    if session_status == 'complete' or payment_status == 'paid':
        amount_total = (session.get('amount_total') or 0) / 100
        currency = (session.get('currency') or 'eur').upper()
        payment_method_types = session.get('payment_method_types') or ['card']

        # Mark attempt as paid
        BookingAttempt.objects.filter(stripe_session_id=session_id).update(
            status='paid',
            failure_reason=''
        )

        payment, created = Payment.objects.get_or_create(
            stripe_payment_intent_id=payment_intent,
            defaults={
                'booking': booking,
                'amount': amount_total or (booking.amount_due or booking.total_price),
                'currency': currency,
                'status': 'succeeded',
                'payment_method': payment_method_types[0],
                'paid_at': timezone.now(),
            },
        )
        if not created:
            payment.status = 'succeeded'
            if amount_total:
                payment.amount = amount_total
            if not payment.paid_at:
                payment.paid_at = timezone.now()
            payment.save(update_fields=['status', 'amount', 'paid_at'])

        # Update booking
        booking.status = 'confirmed'
        booking.payment_status = 'paid'
        booking.amount_due = 0
        booking.save(update_fields=['status', 'payment_status', 'amount_due'])

        # Send confirmation + receipt emails
        try:
            send_booking_confirmation(booking)
        except Exception:
            pass
        try:
            send_payment_receipt(payment)
        except Exception:
            pass

        return Response(BookingSerializer(booking).data)

    # If the session was cancelled/expired and booking is still unpaid, delete it
    if session_status in ['expired', 'canceled']:
        if booking.payment_status != 'paid':
            booking.delete()
            BookingAttempt.objects.filter(stripe_session_id=session_id).update(
                status='expired',
                failure_reason='Checkout session expired/canceled'
            )
        return Response(
            {'error': 'Payment session expired; booking was not completed.'},
            status=status.HTTP_410_GONE,
        )

    return Response(
        {
            'status': 'pending',
            'session_status': session_status,
            'payment_status': payment_status,
        },
        status=status.HTTP_202_ACCEPTED,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refund_payment(request, pk):
    """Process refund for a payment."""
    if not request.user.is_team_member():
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        payment = Payment.objects.get(pk=pk)
    except Payment.DoesNotExist:
        return Response(
            {'error': 'Payment not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    amount = request.data.get('amount')
    reason = request.data.get('reason', 'other')
    reason_notes = request.data.get('reason_notes', '')
    
    if not amount:
        return Response(
            {'error': 'Amount is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Create Stripe refund
        stripe_refund = stripe.Refund.create(
            payment_intent=payment.stripe_payment_intent_id,
            amount=int(float(amount) * 100),  # Convert to cents
        )
        
        # Create refund record
        refund = Refund.objects.create(
            payment=payment,
            booking=payment.booking,
            stripe_refund_id=stripe_refund.id,
            amount=amount,
            reason=reason,
            reason_notes=reason_notes,
            status='succeeded',
            processed_by=request.user
        )
        
        # Update payment status
        if float(amount) >= float(payment.amount):
            payment.status = 'refunded'
        else:
            payment.status = 'partially_refunded'
        payment.save()
        
        # Update booking payment status
        payment.booking.payment_status = 'refunded' if float(amount) >= float(payment.amount) else 'partially_refunded'
        payment.booking.save()
        
        return Response(RefundSerializer(refund).data)
    
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@csrf_exempt
@api_view(['POST'])
@permission_classes([])
def stripe_webhook(request):
    """Handle Stripe webhooks."""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        return Response(status=status.HTTP_400_BAD_REQUEST)
    except stripe.error.SignatureVerificationError:
        return Response(status=status.HTTP_400_BAD_REQUEST)
    
    # Handle checkout.session.completed
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        booking_id = session['metadata'].get('booking_id')
        
        if booking_id:
            try:
                booking = Booking.objects.get(id=booking_id)

                # Create payment record
                payment = Payment.objects.create(
                    booking=booking,
                    stripe_payment_intent_id=session['payment_intent'],
                    amount=booking.amount_due or booking.total_price,
                    currency='eur',
                    status='succeeded',
                    payment_method=session.get('payment_method_types', ['card'])[0],
                    paid_at=timezone.now(),
                )
                
                # Update booking status
                booking.status = 'confirmed'
                booking.payment_status = 'paid'
                booking.save(update_fields=['status', 'payment_status'])

                BookingAttempt.objects.filter(stripe_session_id=session.get('id')).update(
                    status='paid',
                    failure_reason=''
                )
                
                # Send emails (best-effort)
                try:
                    send_booking_confirmation(booking)
                except Exception:
                    pass
                try:
                    send_payment_receipt(payment)
                except Exception:
                    pass
                
            except Booking.DoesNotExist:
                pass

    # Handle payment/session failures: clean up unpaid bookings
    if event['type'] in ['checkout.session.expired', 'checkout.session.async_payment_failed']:
        session = event['data']['object']
        booking_id = (session.get('metadata') or {}).get('booking_id')
        if booking_id:
            try:
                booking = Booking.objects.get(id=booking_id)
                if booking.payment_status != 'paid':
                    booking.delete()
                BookingAttempt.objects.filter(stripe_session_id=session.get('id')).update(
                    status='expired',
                    failure_reason='Stripe session expired or async payment failed'
                )
            except Booking.DoesNotExist:
                pass

    if event['type'] in ['payment_intent.payment_failed', 'charge.failed']:
        obj = event['data']['object']
        metadata = obj.get('metadata') or {}
        booking_id = metadata.get('booking_id')
        error_info = obj.get('last_payment_error')
        if isinstance(error_info, dict):
            error_message = error_info.get('message') or str(error_info)
        else:
            error_message = str(error_info) if error_info else 'Payment failed'
        if booking_id:
            try:
                booking = Booking.objects.get(id=booking_id)
                if booking.payment_status != 'paid':
                    booking.delete()
                BookingAttempt.objects.filter(stripe_session_id=obj.get('checkout_session_id')).update(
                    status='failed',
                    failure_reason=error_message
                )
            except Booking.DoesNotExist:
                pass
    
    return Response({'status': 'success'})
