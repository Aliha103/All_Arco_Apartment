"""
Stripe API integration service.
"""

import stripe
from django.conf import settings
from decimal import Decimal

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    """Service class for Stripe operations"""

    @staticmethod
    def create_checkout_session(booking, success_url, cancel_url):
        """
        Create Stripe Checkout Session for guest booking.
        """
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[
                    {
                        'price_data': {
                            'currency': 'eur',
                            'unit_amount': int(booking.nightly_rate * booking.nights * 100),
                            'product_data': {
                                'name': f"Accommodation - {booking.nights} nights",
                                'description': f"Check-in: {booking.check_in_date}, Check-out: {booking.check_out_date}"
                            },
                        },
                        'quantity': 1,
                    },
                    {
                        'price_data': {
                            'currency': 'eur',
                            'unit_amount': int(booking.cleaning_fee * 100),
                            'product_data': {
                                'name': 'Cleaning Fee',
                            },
                        },
                        'quantity': 1,
                    },
                    {
                        'price_data': {
                            'currency': 'eur',
                            'unit_amount': int(booking.tourist_tax * 100),
                            'product_data': {
                                'name': 'Tourist Tax',
                                'description': f"{booking.number_of_guests} guests × {booking.nights} nights"
                            },
                        },
                        'quantity': 1,
                    },
                ],
                mode='payment',
                success_url=success_url,
                cancel_url=cancel_url,
                customer_email=booking.guest_email,
                client_reference_id=str(booking.id),
                metadata={
                    'booking_id': booking.booking_id,
                },
                billing_address_collection='required',
                phone_number_collection={'enabled': True},
                locale='auto',
                expires_at=int((settings.STRIPE_SESSION_EXPIRY if hasattr(settings, 'STRIPE_SESSION_EXPIRY') else 1800))  # 30 minutes
            )

            return {
                'session_id': session.id,
                'session_url': session.url
            }

        except stripe.error.StripeError as e:
            return {
                'error': str(e)
            }

    @staticmethod
    def create_payment_intent(booking):
        """
        Create Payment Intent for manual bookings (PMS).
        """
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(booking.total_amount * 100),
                currency='eur',
                metadata={
                    'booking_id': booking.booking_id,
                },
                receipt_email=booking.guest_email,
            )

            return {
                'payment_intent_id': intent.id,
                'client_secret': intent.client_secret
            }

        except stripe.error.StripeError as e:
            return {
                'error': str(e)
            }

    @staticmethod
    def create_refund(payment, amount, reason='requested_by_customer'):
        """
        Create a refund for a payment.
        """
        try:
            refund = stripe.Refund.create(
                payment_intent=payment.stripe_payment_intent_id,
                amount=int(amount * 100) if amount else None,  # None for full refund
                reason=reason
            )

            return {
                'refund_id': refund.id,
                'status': refund.status,
                'amount': Decimal(refund.amount) / 100
            }

        except stripe.error.StripeError as e:
            return {
                'error': str(e)
            }

    @staticmethod
    def retrieve_payment_intent(payment_intent_id):
        """
        Retrieve Payment Intent details from Stripe.
        """
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            return intent

        except stripe.error.StripeError as e:
            return None

    @staticmethod
    def construct_webhook_event(payload, sig_header):
        """
        Construct and verify webhook event from Stripe.
        """
        try:
            event = stripe.Webhook.construct_event(
                payload,
                sig_header,
                settings.STRIPE_WEBHOOK_SECRET
            )
            return event

        except ValueError:
            # Invalid payload
            return None
        except stripe.error.SignatureVerificationError:
            # Invalid signature
            return None
