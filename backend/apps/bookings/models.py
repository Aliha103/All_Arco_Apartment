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
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('partial', 'Partial'),
        ('paid', 'Paid'),
        ('refunded', 'Refunded'),
        ('partially_refunded', 'Partially Refunded'),
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
