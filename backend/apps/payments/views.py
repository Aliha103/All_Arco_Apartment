from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from django.utils import timezone
from decimal import Decimal
import stripe
from .models import Payment, Refund, PaymentRequest
from .serializers import PaymentSerializer, RefundSerializer, PaymentRequestSerializer
from apps.bookings.models import Booking, BookingAttempt
from apps.bookings.serializers import BookingSerializer
from apps.emails.services import (
    send_booking_confirmation,
    send_payment_receipt,
    send_online_checkin_prompt,
)
from datetime import date

stripe.api_key = settings.STRIPE_SECRET_KEY


def _compute_city_tax_amount(booking: Booking) -> float:
    """
    City tax: €4 per adult per night, max 5 nights.
    Adults inferred from booking guests with DOB; fallback to number_of_guests.
    """
    guests = booking.guests.all()
    today = date.today()

    def _age(dob):
        if not dob:
            return None
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    adult_count = 0
    have_dobs = False
    for g in guests:
        age = _age(g.date_of_birth)
        if age is not None:
            have_dobs = True
            if age >= 13:
                adult_count += 1
    if not have_dobs:
        adult_count = booking.number_of_guests or 1

    nights = min(booking.nights or 1, 5)
    return float(adult_count * nights * 4)


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

    # Do not charge city tax online; it is paid at property
    base_amount = float(booking.amount_due or booking.total_price or 0)
    tourist_tax = float(booking.tourist_tax or 0)
    amount_to_charge = max(base_amount - tourist_tax, 0)
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
                            'name': f"All'Arco Apartment · {booking.nights} night{'s' if booking.nights != 1 else ''}",
                            'description': f"Stay in Venice · {booking.check_in_date} → {booking.check_out_date}",
                        },
                        'unit_amount': int(amount_to_charge * 100),  # Convert to cents
                    },
                    'quantity': 1,
                },
            ],
            mode='payment',
            billing_address_collection='required',
            phone_number_collection={'enabled': True},
            consent_collection={
                'terms_of_service': 'required',
            },
            success_url=(
                f"{frontend_host}/booking/confirmation"
                f"?session_id={{CHECKOUT_SESSION_ID}}&booking_id={booking.id}"
            ),
            cancel_url=f"{frontend_host}/book",
            customer_email=booking.guest_email,
            custom_text={
                'submit': {
                    'message': "Secure checkout handled by Stripe for All'Arco Apartment."
                },
                'terms_of_service_acceptance': {
                    'message': "By paying, you confirm the stay details and our house rules."
                }
            },
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
    try:
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
            if not payment_intent:
                return Response(
                    {'status': 'pending', 'session_status': session_status, 'payment_status': payment_status},
                    status=status.HTTP_202_ACCEPTED,
                )

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
            booking.amount_due = Decimal(booking.tourist_tax or 0)  # City tax remains due at property
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
            try:
                send_online_checkin_prompt(booking)
            except Exception:
                pass

            return Response(BookingSerializer(booking).data)

        # If the session was cancelled/expired and booking is still unpaid, cancel but keep record
        if session_status in ['expired', 'canceled']:
            if booking.payment_status != 'paid':
                booking.status = 'cancelled'
                booking.payment_status = 'unpaid'
                booking.save(update_fields=['status', 'payment_status'])
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
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def create_city_tax_session(request):
    """Create Stripe Checkout Session for city tax only."""
    booking_id = request.data.get('booking_id')
    try:
        booking = Booking.objects.get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)

    tax_amount = float(booking.tourist_tax or 0)
    computed_tax = _compute_city_tax_amount(booking)
    if computed_tax > 0:
        tax_amount = computed_tax
    if tax_amount <= 0:
        return Response({'error': 'No city tax due for this booking'}, status=status.HTTP_400_BAD_REQUEST)

    frontend_host = getattr(settings, 'FRONTEND_URL', None) or (
        settings.CORS_ALLOWED_ORIGINS[0] if settings.CORS_ALLOWED_ORIGINS else None
    ) or 'https://www.allarcoapartment.com'
    frontend_host = frontend_host.rstrip('/')

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[
                {
                    'price_data': {
                        'currency': 'eur',
                        'product_data': {
                            'name': "City tax · All'Arco Apartment",
                            'description': f"{booking.number_of_guests} guest(s) · {booking.check_in_date} → {booking.check_out_date}",
                        },
                        'unit_amount': int(tax_amount * 100),
                    },
                    'quantity': 1,
                },
            ],
            mode='payment',
            billing_address_collection='required',
            phone_number_collection={'enabled': True},
            success_url=(
                f"{frontend_host}/booking/confirmation"
                f"?session_id={{CHECKOUT_SESSION_ID}}&booking_id={booking.id}&city_tax=1"
            ),
            cancel_url=f"{frontend_host}/booking/{booking.id}/check-in",
            customer_email=booking.guest_email,
            metadata={'booking_id': str(booking.id), 'city_tax': '1'},
            payment_intent_data={'metadata': {'booking_id': str(booking.id), 'city_tax': '1'}},
        )

        booking.city_tax_payment_status = 'pending'
        booking.city_tax_payment_intent = session.id
        booking.save(update_fields=['city_tax_payment_status', 'city_tax_payment_intent'])

        BookingAttempt.objects.create(
            booking=booking,
            stripe_session_id=session.id,
            status='initiated',
            amount_due=tax_amount,
            guest_email=booking.guest_email,
            guest_name=booking.guest_name,
            check_in_date=booking.check_in_date,
            check_out_date=booking.check_out_date,
        )

        return Response({'session_url': session.url, 'session_id': session.id})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def confirm_city_tax_session(request):
    """Confirm Stripe session for city tax and mark booking as city-tax paid."""
    session_id = request.data.get('session_id')
    booking_id = request.data.get('booking_id')
    if not session_id:
        return Response({'error': 'Missing session_id'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception:
        return Response({'error': 'Invalid or expired session'}, status=status.HTTP_400_BAD_REQUEST)

    resolved_booking_id = booking_id or (session.get('metadata') or {}).get('booking_id')
    try:
        booking = Booking.objects.get(id=resolved_booking_id)
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)

    if booking.city_tax_payment_status == 'paid':
        return Response(BookingSerializer(booking).data)

    session_status = session.get('status')
    payment_status = session.get('payment_status')
    payment_intent = session.get('payment_intent')

    if session_status == 'complete' or payment_status == 'paid':
        if not payment_intent:
            return Response({'status': 'pending'}, status=status.HTTP_202_ACCEPTED)

        amount_total = (session.get('amount_total') or 0) / 100
        currency = (session.get('currency') or 'eur').upper()
        payment_method_types = session.get('payment_method_types') or ['card']

        BookingAttempt.objects.filter(stripe_session_id=session_id).update(
            status='paid',
            failure_reason=''
        )

        payment, created = Payment.objects.get_or_create(
            stripe_payment_intent_id=payment_intent,
            defaults={
                'booking': booking,
                'amount': amount_total or computed_tax,
                'currency': currency,
                'status': 'succeeded',
                'payment_method': payment_method_types[0],
                'paid_at': timezone.now(),
                'kind': 'city_tax',
            },
        )
        if not created:
            payment.status = 'succeeded'
            payment.kind = 'city_tax'
            if amount_total:
                payment.amount = amount_total
            if not payment.paid_at:
                payment.paid_at = timezone.now()
            payment.save(update_fields=['status', 'amount', 'paid_at', 'kind'])

        booking.city_tax_payment_status = 'paid'
        booking.city_tax_payment_intent = payment_intent
        booking.city_tax_paid_at = timezone.now()
        booking.save(update_fields=['city_tax_payment_status', 'city_tax_payment_intent', 'city_tax_paid_at'])

        return Response(BookingSerializer(booking).data)

    return Response({'status': 'pending'}, status=status.HTTP_202_ACCEPTED)


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
        metadata = session.get('metadata') or {}
        booking_id = metadata.get('booking_id')
        is_city_tax = metadata.get('city_tax') == '1'
        
        if booking_id:
            try:
                booking = Booking.objects.get(id=booking_id)

                if is_city_tax:
                    tax_amount = _compute_city_tax_amount(booking)
                    Payment.objects.update_or_create(
                        stripe_payment_intent_id=session['payment_intent'],
                        defaults={
                            'booking': booking,
                            'amount': tax_amount,
                            'currency': 'eur',
                            'status': 'succeeded',
                            'payment_method': session.get('payment_method_types', ['card'])[0],
                            'paid_at': timezone.now(),
                            'kind': 'city_tax',
                        }
                    )
                    booking.city_tax_payment_status = 'paid'
                    booking.city_tax_payment_intent = session['payment_intent']
                    booking.city_tax_paid_at = timezone.now()
                    booking.save(update_fields=['city_tax_payment_status', 'city_tax_payment_intent', 'city_tax_paid_at'])
                else:
                    # Create payment record
                    payment = Payment.objects.create(
                        booking=booking,
                        stripe_payment_intent_id=session['payment_intent'],
                        amount=max((booking.amount_due or booking.total_price) - (booking.tourist_tax or 0), 0),
                        currency='eur',
                        status='succeeded',
                        payment_method=session.get('payment_method_types', ['card'])[0],
                        paid_at=timezone.now(),
                        kind='booking',
                    )
                    
                    # Update booking status
                    booking.status = 'confirmed'
                    booking.payment_status = 'paid'
                    booking.amount_due = Decimal(booking.tourist_tax or 0)
                    booking.save(update_fields=['status', 'payment_status', 'amount_due'])

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
                    try:
                        send_online_checkin_prompt(booking)
                    except Exception:
                        pass
            except Booking.DoesNotExist:
                pass

    # Handle payment/session failures: mark cancelled but keep record
    if event['type'] in ['checkout.session.expired', 'checkout.session.async_payment_failed']:
        session = event['data']['object']
        booking_id = (session.get('metadata') or {}).get('booking_id')
        if booking_id:
            try:
                booking = Booking.objects.get(id=booking_id)
                if booking.payment_status != 'paid':
                    booking.status = 'cancelled'
                    booking.payment_status = 'unpaid'
                    booking.save(update_fields=['status', 'payment_status'])
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
                    booking.status = 'cancelled'
                    booking.payment_status = 'unpaid'
                    booking.save(update_fields=['status', 'payment_status'])
                BookingAttempt.objects.filter(stripe_session_id=obj.get('checkout_session_id')).update(
                    status='failed',
                    failure_reason=error_message
                )
            except Booking.DoesNotExist:
                pass

    return Response({'status': 'success'})


# ============================================================================
# PAYMENT REQUEST VIEWS
# ============================================================================

class PaymentRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing payment requests with Stripe payment links.
    """
    queryset = PaymentRequest.objects.all()
    serializer_class = PaymentRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter payment requests based on query params"""
        queryset = super().get_queryset()

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            if status_filter == 'unpaid':
                # Show pending and overdue requests
                queryset = queryset.filter(status__in=['pending', 'overdue'])
            else:
                queryset = queryset.filter(status=status_filter)

        # Filter by booking
        booking_id = self.request.query_params.get('booking')
        if booking_id:
            queryset = queryset.filter(booking__id=booking_id)

        # Search by booking ID or guest name/email
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(booking__booking_id__icontains=search) |
                Q(booking__guest_name__icontains=search) |
                Q(booking__guest_email__icontains=search)
            )

        return queryset.select_related('booking', 'created_by')

    def perform_create(self, serializer):
        """Create payment request and generate Stripe payment link"""
        payment_request = serializer.save(created_by=self.request.user)

        # Generate Stripe payment link
        try:
            link = stripe.PaymentLink.create(
                line_items=[{
                    'price_data': {
                        'currency': payment_request.currency.lower(),
                        'product_data': {
                            'name': f"{payment_request.get_type_display()} - {payment_request.booking.booking_id}",
                            'description': payment_request.description,
                        },
                        'unit_amount': int(payment_request.amount * 100),  # Convert to cents
                    },
                    'quantity': 1,
                }],
                metadata={
                    'payment_request_id': str(payment_request.id),
                    'booking_id': str(payment_request.booking.id),
                    'type': payment_request.type,
                },
            )

            payment_request.stripe_payment_link_id = link.id
            payment_request.stripe_payment_link_url = link.url
            payment_request.save(update_fields=['stripe_payment_link_id', 'stripe_payment_link_url'])

        except Exception as e:
            # If Stripe fails, still create the payment request but without link
            print(f"Failed to create Stripe payment link: {e}")

    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send payment request email to guest with payment link"""
        payment_request = self.get_object()

        if not payment_request.stripe_payment_link_url:
            return Response(
                {'error': 'No payment link available'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if payment_request.status != 'pending':
            return Response(
                {'error': 'Payment request is not pending'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Send email
        from apps.emails.services import send_payment_request_email
        try:
            send_payment_request_email(payment_request)
            return Response({'message': 'Email sent successfully'})
        except Exception as e:
            return Response(
                {'error': f'Failed to send email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Manually mark payment request as paid"""
        payment_request = self.get_object()

        if payment_request.status == 'paid':
            return Response(
                {'error': 'Payment request is already paid'},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment_request.mark_as_paid()
        serializer = self.get_serializer(payment_request)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel_request(self, request, pk=None):
        """Cancel payment request"""
        payment_request = self.get_object()

        if payment_request.status == 'paid':
            return Response(
                {'error': 'Cannot cancel paid payment request'},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment_request.cancel()
        serializer = self.get_serializer(payment_request)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get payment request statistics"""
        total_pending = PaymentRequest.objects.filter(status='pending')
        total_overdue = PaymentRequest.objects.filter(status='overdue')
        total_paid = PaymentRequest.objects.filter(status='paid')

        pending_amount = sum(float(pr.amount) for pr in total_pending)
        overdue_amount = sum(float(pr.amount) for pr in total_overdue)
        paid_amount = sum(float(pr.amount) for pr in total_paid)

        return Response({
            'total_open_balance': pending_amount + overdue_amount,
            'pending_count': total_pending.count(),
            'overdue_amount': overdue_amount,
            'overdue_count': total_overdue.count(),
            'total_collected': paid_amount,
            'paid_count': total_paid.count(),
        })
