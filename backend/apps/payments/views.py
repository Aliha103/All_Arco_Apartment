from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
import stripe
from .models import Payment, Refund
from .serializers import PaymentSerializer, RefundSerializer
from apps.bookings.models import Booking

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
        )
        
        return Response({'session_url': session.url, 'session_id': session.id})
    
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
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
                    payment_method=session.get('payment_method_types', ['card'])[0]
                )
                
                # Update booking status
                booking.status = 'confirmed'
                booking.payment_status = 'paid'
                booking.save(update_fields=['status', 'payment_status'])
                
                # TODO: Send confirmation email
                
            except Booking.DoesNotExist:
                pass
    
    return Response({'status': 'success'})
