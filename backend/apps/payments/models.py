import uuid
from django.db import models
from apps.bookings.models import Booking
from apps.users.models import User


class Payment(models.Model):
    """
    Payment records for bookings (Stripe integration).
    """
    KIND_CHOICES = [
        ('booking', 'Booking'),
        ('city_tax', 'City Tax'),
        ('custom', 'Custom Payment'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('partially_refunded', 'Partially Refunded'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='booking')
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='EUR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payments_payment'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['stripe_payment_intent_id']),
            models.Index(fields=['booking']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Payment {self.id} - {self.booking.booking_id} - {self.status}"


class Refund(models.Model):
    """
    Refund records for payments.
    """
    REASON_CHOICES = [
        ('guest_cancellation', 'Guest Cancellation'),
        ('property_issue', 'Property Issue'),
        ('double_booking', 'Double Booking'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name='refunds'
    )
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='refunds'
    )
    stripe_refund_id = models.CharField(max_length=255, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    reason_notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    refunded_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='refunds_processed'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payments_refund'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['stripe_refund_id']),
            models.Index(fields=['payment']),
            models.Index(fields=['booking']),
        ]
    
    def __str__(self):
        return f"Refund {self.id} - {self.booking.booking_id} - €{self.amount}"


class PaymentRequest(models.Model):
    """
    Payment requests sent to guests with Stripe payment links.
    For collecting deposits, remaining balances, or additional charges.
    """
    TYPE_CHOICES = [
        ('deposit', 'Security Deposit'),
        ('remaining_balance', 'Remaining Balance'),
        ('additional_charge', 'Additional Charge'),
        ('custom', 'Custom'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
        ('overdue', 'Overdue'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='payment_requests'
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='EUR')
    due_date = models.DateField(null=True, blank=True)

    # Stripe payment link
    stripe_payment_link_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    stripe_payment_link_url = models.URLField(max_length=500, null=True, blank=True)

    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paid_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    # Who created and who paid
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='payment_requests_created'
    )

    # Metadata
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments_payment_request'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['booking']),
            models.Index(fields=['status']),
            models.Index(fields=['due_date']),
            models.Index(fields=['stripe_payment_link_id']),
        ]

    def __str__(self):
        return f"PaymentRequest {self.id} - {self.booking.booking_id} - €{self.amount} - {self.status}"

    @property
    def is_overdue(self):
        """Check if payment request is overdue"""
        from django.utils import timezone
        if self.status == 'pending' and self.due_date:
            return timezone.now().date() > self.due_date
        return False

    @property
    def guest_name(self):
        """Get guest name from booking"""
        return self.booking.guest_name

    @property
    def guest_email(self):
        """Get guest email from booking"""
        return self.booking.guest_email

    def mark_as_paid(self, stripe_payment_intent_id=None):
        """
        Mark payment request as paid and deactivate payment link.
        Also creates a Payment record and updates booking financials.
        """
        from django.utils import timezone
        from decimal import Decimal
        import stripe
        import uuid

        self.status = 'paid'
        self.paid_at = timezone.now()
        self.save(update_fields=['status', 'paid_at', 'updated_at'])

        # Create Payment record to track this in the payments system
        # Always create a Payment record (even for manual payments without Stripe)
        try:
            from apps.payments.models import Payment

            # Use provided payment intent ID, or generate a unique one for manual payments
            payment_intent_id = stripe_payment_intent_id or f"manual_{uuid.uuid4()}"

            Payment.objects.get_or_create(
                stripe_payment_intent_id=payment_intent_id,
                defaults={
                    'booking': self.booking,
                    'kind': 'custom',  # Payment from Payment Request
                    'amount': self.amount,
                    'currency': self.currency,
                    'status': 'succeeded',
                    'payment_method': 'manual' if not stripe_payment_intent_id else 'card',
                    'paid_at': timezone.now(),
                }
            )
        except Exception as e:
            # Don't fail if payment record creation fails
            print(f"Failed to create Payment record: {e}")

        # Update booking's amount_due (reduce by payment amount)
        # This reflects that the guest has paid part of their balance
        if self.booking.amount_due > 0:
            new_amount_due = max(Decimal(self.booking.amount_due) - self.amount, Decimal('0'))
            self.booking.amount_due = new_amount_due

            # Update payment_status based on remaining balance
            if new_amount_due == 0:
                self.booking.payment_status = 'paid'
            elif new_amount_due < self.booking.total_price:
                self.booking.payment_status = 'partial'

            self.booking.save(update_fields=['amount_due', 'payment_status'])

        # Deactivate Stripe payment link to prevent duplicate payments
        if self.stripe_payment_link_id:
            try:
                stripe.PaymentLink.modify(
                    self.stripe_payment_link_id,
                    active=False
                )
            except Exception:
                pass  # Don't fail if link deactivation fails

    def cancel(self):
        """Cancel payment request and deactivate payment link"""
        from django.utils import timezone
        from decimal import Decimal
        import stripe

        # If additional_charge, deposit, or custom type and not yet paid, revert booking totals
        # These types add to the booking total, so cancelling should remove the amount
        if self.type in ['additional_charge', 'deposit', 'custom'] and self.status != 'paid':
            booking = self.booking
            booking.total_price = max(Decimal('0'), Decimal(booking.total_price) - self.amount)
            booking.amount_due = max(Decimal('0'), Decimal(booking.amount_due or booking.total_price) - self.amount)
            booking.save(update_fields=['total_price', 'amount_due', 'updated_at'])

        self.status = 'cancelled'
        self.cancelled_at = timezone.now()
        self.save(update_fields=['status', 'cancelled_at', 'updated_at'])

        # Deactivate Stripe payment link to prevent accidental payments
        if self.stripe_payment_link_id:
            try:
                stripe.PaymentLink.modify(
                    self.stripe_payment_link_id,
                    active=False
                )
            except Exception:
                pass  # Don't fail if link deactivation fails
