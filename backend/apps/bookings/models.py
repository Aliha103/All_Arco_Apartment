import uuid
from datetime import datetime
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
    guest_phone = models.CharField(max_length=20)
    guest_country = models.CharField(max_length=100)  # Required for booking
    guest_address = models.TextField(blank=True, null=True)
    
    check_in_date = models.DateField()
    check_out_date = models.DateField()
    nights = models.IntegerField(editable=False)
    number_of_guests = models.IntegerField(default=1)
    
    nightly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    cleaning_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tourist_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    
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

    # No-show handling: marks the date from which nights are released
    # For full no-show: equals check_in_date (all nights released)
    # For partial no-show: equals the date guest disappeared (remaining nights released)
    # Nights before this date are still considered occupied/unavailable
    released_from_date = models.DateField(null=True, blank=True)
    
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
        ]
    
    def __str__(self):
        return f"{self.booking_id} - {self.guest_name}"
    
    def clean(self):
        if self.check_out_date <= self.check_in_date:
            raise ValidationError('Check-out date must be after check-in date')
    
    def save(self, *args, **kwargs):
        # Generate booking ID
        if not self.booking_id:
            date_str = datetime.now().strftime('%Y%m%d')
            count = Booking.objects.filter(
                booking_id__startswith=f'ARK-{date_str}'
            ).count()
            self.booking_id = f'ARK-{date_str}-{str(count + 1).zfill(4)}'
        
        # Calculate nights
        if self.check_in_date and self.check_out_date:
            self.nights = (self.check_out_date - self.check_in_date).days
        
        # Calculate total price
        self.total_price = (
            (self.nightly_rate * self.nights) +
            self.cleaning_fee +
            self.tourist_tax
        )
        
        super().save(*args, **kwargs)
    
    def get_pricing_breakdown(self):
        """Returns a dictionary with pricing components."""
        return {
            'nightly_rate': float(self.nightly_rate),
            'nights': self.nights,
            'accommodation': float(self.nightly_rate * self.nights),
            'cleaning_fee': float(self.cleaning_fee),
            'tourist_tax': float(self.tourist_tax),
            'total': float(self.total_price),
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
    date_of_birth = models.DateField()
    country_of_birth = models.CharField(max_length=100)

    # Italian citizen fields (required if country_of_birth is Italy)
    birth_province = models.CharField(max_length=100, blank=True, null=True)
    birth_city = models.CharField(max_length=100, blank=True, null=True)

    # Document information
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES)
    document_number = models.CharField(max_length=50)
    document_issue_date = models.DateField()
    document_expire_date = models.DateField()
    document_issue_country = models.CharField(max_length=100)

    # Italian-issued document fields (required if document_issue_country is Italy)
    document_issue_province = models.CharField(max_length=100, blank=True, null=True)
    document_issue_city = models.CharField(max_length=100, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bookings_bookingguest'
        ordering = ['-is_primary', 'created_at']
        indexes = [
            models.Index(fields=['booking'], name='bookings_bo_booking_idx'),
            models.Index(fields=['is_primary'], name='bookings_bo_is_prim_idx'),
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
