import uuid
import random
import string
from datetime import datetime
from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from apps.users.models import User


class Booking(models.Model):
    """
    Booking model for apartment reservations.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('paid', 'Paid'),
        ('checked_in', 'Checked In'),
        ('checked_out', 'Checked Out'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No-Show'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('partial', 'Partial'),
        ('paid', 'Paid'),
        ('refunded', 'Refunded'),
        ('partially_refunded', 'Partially Refunded'),
    ]

    SOURCE_CHOICES = [
        ('airbnb', 'Airbnb'),
        ('booking_com', 'Booking.com'),
        ('website', 'Own Website'),
        ('direct', 'Direct'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking_id = models.CharField(max_length=50, unique=True, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings'
    )
    guest_email = models.EmailField()
    guest_name = models.CharField(max_length=100)
    guest_tax_code = models.CharField(max_length=50, blank=True, null=True)
    guest_phone = models.CharField(max_length=20)
    guest_country = models.CharField(max_length=100)  # Required for booking
    guest_address = models.TextField(blank=True, null=True)
    
    check_in_date = models.DateField()
    check_out_date = models.DateField()
    nights = models.IntegerField(editable=False)
    number_of_guests = models.IntegerField(default=1)

    # Guest breakdown (for display purposes)
    adults = models.IntegerField(default=2, help_text='Number of adult guests (13+)')
    children = models.IntegerField(default=0, help_text='Number of children (2-12)')
    infants = models.IntegerField(default=0, help_text='Number of infants (0-2, free)')

    # Proxy booking tracking
    booked_for_someone_else = models.BooleanField(
        default=False,
        help_text='True if logged-in user booked for a different guest'
    )

    nightly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    cleaning_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    pet_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='Pet cleaning fee')
    tourist_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    applied_credit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Referral/loyalty credit applied to this booking'
    )
    amount_due = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        editable=False,
        help_text='Total after credits (amount to charge)'
    )
    CANCELLATION_POLICY_CHOICES = [
        ('flex_24h', 'Flexible - free until 24h'),
        ('non_refundable', 'Non-refundable - discounted'),
    ]
    cancellation_policy = models.CharField(
        max_length=20,
        choices=CANCELLATION_POLICY_CHOICES,
        default='flex_24h',
        help_text='Cancellation policy selected by guest'
    )
    is_non_refundable = models.BooleanField(default=False)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='unpaid'
    )
    booking_source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default='direct',
        help_text='Source of the booking (Airbnb, Booking.com, website, etc.)'
    )

    special_requests = models.TextField(blank=True, null=True)
    internal_notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings_created'
    )
    updated_at = models.DateTimeField(auto_now=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True, null=True)
    issue_refund = models.BooleanField(
        default=False,
        help_text='Whether to issue refund when cancelling this booking'
    )

    # Online city tax payment tracking
    CITY_TAX_STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('refunded', 'Refunded'),
    ]
    city_tax_payment_status = models.CharField(
        max_length=20,
        choices=CITY_TAX_STATUS_CHOICES,
        default='unpaid'
    )
    city_tax_payment_intent = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='Stripe payment intent/session for city tax'
    )
    city_tax_paid_at = models.DateTimeField(null=True, blank=True)

    # ETA from online check-in
    eta_checkin_time = models.TimeField(null=True, blank=True)
    eta_checkout_time = models.TimeField(null=True, blank=True)
    checkin_draft = models.BooleanField(
        default=False,
        help_text='Online check-in saved as draft (team can review/complete)'
    )

    # Alloggiati (Italian police reporting) tracking
    alloggiati_sent = models.BooleanField(
        default=False,
        help_text='Whether guest data has been sent to Italian police (Alloggiati)'
    )
    alloggiati_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the data was sent to Alloggiati'
    )
    alloggiati_sent_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alloggiati_submissions',
        help_text='Team member who sent the data to police'
    )

    # No-show handling: marks the date from which nights are released
    # For full no-show: equals check_in_date (all nights released)
    # For partial no-show: equals the date guest disappeared (remaining nights released)
    # Nights before this date are still considered occupied/unavailable
    released_from_date = models.DateField(null=True, blank=True)

    # Review request tracking (post-checkout review emails)
    review_token = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        unique=True,
        db_index=True,
        help_text='UUID4 token for review submission link (sent in email)'
    )
    review_token_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Review token expiry (30 days from email send)'
    )
    review_requested_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When review request email was sent'
    )
    review_submitted = models.BooleanField(
        default=False,
        help_text='Whether guest submitted a review for this booking'
    )

    class Meta:
        db_table = 'bookings_booking'
        ordering = ['-check_in_date']
        indexes = [
            models.Index(fields=['booking_id']),
            models.Index(fields=['check_in_date']),
            models.Index(fields=['check_out_date']),
            models.Index(fields=['status']),
            models.Index(fields=['guest_email']),
            models.Index(fields=['check_in_date', 'check_out_date']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(check_out_date__gt=models.F('check_in_date')),
                name='check_out_after_check_in'
            ),
            models.CheckConstraint(
                check=models.Q(total_price__gte=0),
                name='total_price_non_negative'
            ),
            models.CheckConstraint(
                check=models.Q(applied_credit__gte=0),
                name='applied_credit_non_negative'
            ),
            models.CheckConstraint(
                check=models.Q(amount_due__gte=0),
                name='amount_due_non_negative'
            ),
        ]
    
    def __str__(self):
        return f"{self.booking_id} - {self.guest_name}"
    
    def clean(self):
        if self.check_out_date <= self.check_in_date:
            raise ValidationError('Check-out date must be after check-in date')
    
    def save(self, *args, **kwargs):
        # Generate booking ID
        if not self.booking_id:
            # Generate unique random 6-character alphanumeric ID
            while True:
                # Use uppercase letters and digits for alphanumeric ID
                characters = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                booking_id = f'ARCO{characters}'
                # Check if this ID already exists
                if not Booking.objects.filter(booking_id=booking_id).exists():
                    self.booking_id = booking_id
                    break
        
        # Calculate nights
        if self.check_in_date and self.check_out_date:
            self.nights = (self.check_out_date - self.check_in_date).days
        
        # Calculate total price
        base_total = (
            (self.nightly_rate * self.nights) +
            self.cleaning_fee +
            self.pet_fee +
            self.tourist_tax
        )

        discount_amount = Decimal('0')
        if self.cancellation_policy == 'non_refundable':
            discount_amount = (base_total * Decimal('0.10')).quantize(Decimal('0.01'))

        self.total_price = base_total - discount_amount

        credit_to_apply = self.applied_credit or Decimal('0')
        self.amount_due = self.total_price - credit_to_apply
        # Amount due can never be negative
        if self.amount_due < 0:
            self.amount_due = Decimal('0')
        
        super().save(*args, **kwargs)
    
    def get_pricing_breakdown(self):
        """Returns a dictionary with pricing components."""
        base_total = (
            (self.nightly_rate * self.nights) +
            self.cleaning_fee +
            self.pet_fee +
            self.tourist_tax
        )
        discount_amount = Decimal('0')
        if self.cancellation_policy == 'non_refundable':
            discount_amount = (base_total * Decimal('0.10')).quantize(Decimal('0.01'))

        return {
            'nightly_rate': float(self.nightly_rate),
            'nights': self.nights,
            'accommodation': float(self.nightly_rate * self.nights),
            'cleaning_fee': float(self.cleaning_fee),
            'pet_fee': float(self.pet_fee),
            'tourist_tax': float(self.tourist_tax),
            'discount': float(discount_amount),
            'total': float(self.total_price),
            'applied_credit': float(self.applied_credit),
            'amount_due': float(self.amount_due),
        }
    
    def is_overlapping(self, check_in, check_out):
        """Check if booking overlaps with given date range."""
        return (
            self.check_in_date < check_out and
            self.check_out_date > check_in
        )

    def blocks_dates(self):
        """
        Determine if this booking currently blocks dates from being booked.

        Returns True if this booking prevents new bookings, False otherwise.

        Rules:
        - cancelled: Does NOT block (dates immediately available)
        - checked_out: Does NOT block (stay completed)
        - no_show: Partially blocks (only nights before released_from_date)
        - All others (pending, confirmed, paid, checked_in): BLOCKS all dates
        """
        if self.status in ['cancelled', 'checked_out']:
            return False
        return True

    def get_blocked_date_range(self):
        """
        Get the actual date range blocked by this booking.

        Returns tuple (start_date, end_date) of blocked dates, or None if not blocking.

        For no_show bookings with released_from_date:
        - Only blocks from check_in_date to released_from_date
        - Dates from released_from_date onward are available

        For all other active bookings:
        - Blocks full range from check_in_date to check_out_date
        """
        if not self.blocks_dates():
            return None

        # No-show bookings with released_from_date only block partial range
        if self.status == 'no_show' and self.released_from_date:
            # Only block dates before released_from_date
            if self.released_from_date <= self.check_in_date:
                # All dates released
                return None
            # Block from check_in to released_from_date
            return (self.check_in_date, self.released_from_date)

        # All other active bookings block full range
        return (self.check_in_date, self.check_out_date)

    def can_request_review(self):
        """
        Check if review request can be sent for this booking.

        Returns True if:
        - status == 'checked_out'
        - review_submitted == False
        - review_requested_at is None OR > 30 days ago (allow re-send)
        """
        if self.status != 'checked_out':
            return False

        if self.review_submitted:
            return False

        # Allow re-send if no previous request or request is old (30+ days)
        if self.review_requested_at is None:
            return True

        from django.utils import timezone
        from datetime import timedelta
        thirty_days_ago = timezone.now() - timedelta(days=30)
        return self.review_requested_at < thirty_days_ago

    def generate_review_token(self):
        """
        Generate new UUID4 review token and set expiry.

        Sets:
        - review_token (new UUID4)
        - review_token_expires_at (now + 30 days)
        - review_requested_at (now)

        Returns the generated token string.
        """
        from django.utils import timezone
        from datetime import timedelta

        # Generate new UUID4 token
        self.review_token = str(uuid.uuid4())

        # Set expiry to 30 days from now
        self.review_token_expires_at = timezone.now() + timedelta(days=30)

        # Set request timestamp
        self.review_requested_at = timezone.now()

        # Save the model
        self.save(update_fields=['review_token', 'review_token_expires_at', 'review_requested_at'])

        return self.review_token

    def is_review_token_valid(self):
        """
        Check if review token exists and is not expired.

        Returns True if token exists and expiry is in the future.
        """
        if not self.review_token or not self.review_token_expires_at:
            return False

        from django.utils import timezone
        return self.review_token_expires_at > timezone.now()

    def get_total_paid(self):
        """
        Calculate total amount paid for this booking from all Payment records.
        Includes: booking payments, city tax payments, and custom payments (Payment Requests).
        Excludes: refunded amounts.
        """
        from apps.payments.models import Payment
        from decimal import Decimal

        # Sum all succeeded payments
        payments = Payment.objects.filter(booking=self, status='succeeded')
        total_paid = sum(Decimal(p.amount) for p in payments)

        # Subtract refunded amounts
        for payment in payments.filter(status__in=['refunded', 'partially_refunded']):
            refunded = sum(Decimal(r.amount) for r in payment.refunds.filter(status='succeeded'))
            total_paid -= refunded

        return float(max(total_paid, Decimal('0')))

    def get_balance_remaining(self):
        """
        Calculate the remaining balance for this booking.
        Formula: total_price - total_paid
        """
        from decimal import Decimal
        total_paid = Decimal(str(self.get_total_paid()))
        return float(max(self.total_price - total_paid, Decimal('0')))


class BookingAttempt(models.Model):
    """
    Tracks checkout attempts so admins can see abandoned or failed payments.
    """
    STATUS_CHOICES = [
        ('initiated', 'Initiated'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('expired', 'Expired'),
        ('canceled', 'Canceled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(
        Booking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attempts'
    )
    stripe_session_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='initiated')
    failure_reason = models.TextField(blank=True, null=True)
    amount_due = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    guest_email = models.EmailField(blank=True, null=True)
    guest_name = models.CharField(max_length=150, blank=True, null=True)
    check_in_date = models.DateField(blank=True, null=True)
    check_out_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bookings_attempt'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['stripe_session_id']),
            models.Index(fields=['status']),
            models.Index(fields=['guest_email']),
        ]

    def __str__(self):
        return f"Attempt {self.id} - {self.get_status_display()}"


class BookingGuest(models.Model):
    """
    Guest information for check-in (Italian Alloggiati Web compliance).

    For primary guest: all fields required
    For other guests: email is optional

    Italian citizen requirements:
    - Must have birth_province and birth_city

    Italian-issued document requirements:
    - Must have document_issue_province and document_issue_city
    """
    DOCUMENT_TYPE_CHOICES = [
        ('passport', 'Passport'),
        ('id_card', 'ID Card'),
        ('driving_license', 'Driving License'),
        ('residence_permit', 'Residence Permit'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='guests'
    )

    # Basic info
    is_primary = models.BooleanField(default=False)  # Primary guest or additional
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(blank=True, null=True)  # Required for primary, optional for others
    date_of_birth = models.DateField(blank=True, null=True)
    country_of_birth = models.CharField(max_length=100, blank=True, null=True)
    relationship = models.CharField(max_length=50, blank=True, null=True, help_text='Relationship to primary guest')
    parent_guest = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='family_members',
        help_text='Parent/primary guest for tree view'
    )

    # Italian citizen fields (required if country_of_birth is Italy)
    birth_province = models.CharField(max_length=100, blank=True, null=True)
    birth_city = models.CharField(max_length=100, blank=True, null=True)

    # Document information
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES, blank=True, null=True)
    document_number = models.CharField(max_length=50, blank=True, null=True)
    document_issue_date = models.DateField(blank=True, null=True)
    document_expire_date = models.DateField(blank=True, null=True)
    document_issue_country = models.CharField(max_length=100, blank=True, null=True)

    # Italian-issued document fields (required if document_issue_country is Italy)
    document_issue_province = models.CharField(max_length=100, blank=True, null=True)
    document_issue_city = models.CharField(max_length=100, blank=True, null=True)
    note = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bookings_bookingguest'
        ordering = ['-is_primary', 'created_at']
        indexes = [
            models.Index(fields=['booking'], name='bookings_bo_booking_idx'),
            models.Index(fields=['is_primary'], name='bookings_bo_is_prim_idx'),
            models.Index(fields=['parent_guest'], name='bookings_bo_parent_idx'),
        ]

    def __str__(self):
        primary_str = ' (Primary)' if self.is_primary else ''
        return f"{self.first_name} {self.last_name}{primary_str}"

    def clean(self):
        """Validate Italian-specific requirements."""
        # If Italian citizen, must have birth province and city
        if self.country_of_birth and self.country_of_birth.lower() in ['italy', 'italia', 'it']:
            if not self.birth_province:
                raise ValidationError('Birth province is required for Italian citizens')
            if not self.birth_city:
                raise ValidationError('Birth city is required for Italian citizens')

        # If Italian-issued document, must have issue province and city
        if self.document_issue_country and self.document_issue_country.lower() in ['italy', 'italia', 'it']:
            if not self.document_issue_province:
                raise ValidationError('Document issue province is required for Italian-issued documents')
            if not self.document_issue_city:
                raise ValidationError('Document issue city is required for Italian-issued documents')

        # Primary guest must have email
        if self.is_primary and not self.email:
            raise ValidationError('Email is required for primary guest')

        # Document expire date must be after issue date
        if self.document_expire_date and self.document_issue_date:
            if self.document_expire_date <= self.document_issue_date:
                raise ValidationError('Document expire date must be after issue date')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class BlockedDate(models.Model):
    """
    Dates blocked from booking (maintenance, owner use, etc.).
    """
    REASON_CHOICES = [
        ('maintenance', 'Maintenance'),
        ('owner_use', 'Owner Use'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='blocked_dates_created'
    )
    
    class Meta:
        db_table = 'bookings_blockeddate'
        ordering = ['start_date']
        indexes = [
            models.Index(fields=['start_date', 'end_date']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_date__gte=models.F('start_date')),
                name='end_date_after_start_date'
            ),
        ]
    
    def __str__(self):
        return f"Blocked: {self.start_date} to {self.end_date} ({self.reason})"
    
    def clean(self):
        if self.end_date < self.start_date:
            raise ValidationError('End date must be on or after start date')
    
    @classmethod
    def is_date_blocked(cls, date):
        """Check if specific date is blocked."""
        return cls.objects.filter(
            start_date__lte=date,
            end_date__gte=date
        ).exists()
