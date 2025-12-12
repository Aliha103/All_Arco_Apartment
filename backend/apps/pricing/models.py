import uuid
from django.db import models
from django.core.exceptions import ValidationError
from apps.users.models import User


class Settings(models.Model):
    """
    Singleton model for global pricing and booking settings.
    """
    id = models.IntegerField(primary_key=True, default=1, editable=False)
    default_nightly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    cleaning_fee = models.DecimalField(max_digits=10, decimal_places=2)
    pet_cleaning_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tourist_tax_per_person_per_night = models.DecimalField(max_digits=6, decimal_places=2)
    minimum_stay_nights = models.IntegerField(default=2)
    maximum_stay_nights = models.IntegerField(default=30)
    check_in_time = models.TimeField(default='15:00')
    check_out_time = models.TimeField(default='11:00')
    max_guests = models.IntegerField(default=4)
    extra_guest_fee = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    extra_guest_threshold = models.IntegerField(default=2)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='settings_updates'
    )
    
    class Meta:
        db_table = 'pricing_settings'
        verbose_name_plural = 'Settings'
    
    def __str__(self):
        return "Apartment Settings"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        self.pk = 1
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        # Prevent deletion
        pass
    
    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance."""
        settings, created = cls.objects.get_or_create(pk=1)
        return settings
    
    def calculate_booking_price(self, check_in, check_out, guests, has_pet=False):
        """Calculate total booking price."""
        nights = (check_out - check_in).days

        # Get nightly rate (check for seasonal pricing)
        nightly_rate = self.get_rate_for_dates(check_in, check_out)

        # Calculate accommodation cost
        accommodation = nightly_rate * nights

        # Calculate tourist tax
        tourist_tax = self.tourist_tax_per_person_per_night * guests * nights

        # Calculate extra guest fee
        extra_guest_cost = 0
        if guests > self.extra_guest_threshold:
            extra_guests = guests - self.extra_guest_threshold
            extra_guest_cost = self.extra_guest_fee * extra_guests * nights

        # Pet fee (only if has_pet=True)
        pet_fee = float(self.pet_cleaning_fee) if has_pet else 0.0

        return {
            'nightly_rate': float(nightly_rate),
            'nights': nights,
            'accommodation_total': float(accommodation),
            'cleaning_fee': float(self.cleaning_fee),
            'pet_fee': pet_fee,
            'tourist_tax': float(tourist_tax),
            'extra_guest_fee': float(extra_guest_cost),
            'total': float(accommodation + self.cleaning_fee + pet_fee + tourist_tax + extra_guest_cost)
        }
    
    def get_rate_for_dates(self, check_in, check_out):
        """Get the nightly rate for date range (considers seasonal pricing)."""
        # Check for active pricing rules
        active_rules = PricingRule.objects.filter(
            is_active=True,
            start_date__lte=check_out,
            end_date__gte=check_in
        ).order_by('-nightly_rate')
        
        if active_rules.exists():
            # Return highest rate if multiple rules overlap
            return active_rules.first().nightly_rate
        
        return self.default_nightly_rate


class PricingRule(models.Model):
    """
    Seasonal pricing rules with custom rates for date ranges.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    nightly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='pricing_rules_created'
    )
    
    class Meta:
        db_table = 'pricing_pricingrule'
        ordering = ['start_date']
        indexes = [
            models.Index(fields=['start_date', 'end_date']),
            models.Index(fields=['is_active']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_date__gte=models.F('start_date')),
                name='rule_end_after_start'
            ),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.start_date} to {self.end_date})"
    
    def clean(self):
        if self.end_date < self.start_date:
            raise ValidationError('End date must be on or after start date')


class Promotion(models.Model):
    """
    Promotional discount codes for marketing campaigns.
    Team members create these for public use.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.CharField(max_length=255)
    discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text='Percentage discount (e.g., 10.00 for 10%)'
    )
    min_spend = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Minimum booking amount to use this promotion'
    )
    max_uses = models.IntegerField(
        null=True,
        blank=True,
        help_text='Maximum number of times this code can be used (null = unlimited)'
    )
    current_uses = models.IntegerField(default=0, editable=False)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When this promotion expires (null = never expires)'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='promotions_created'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pricing_promotion'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"{self.code} - {self.discount_percent}% off"

    def clean(self):
        # Uppercase the code
        if self.code:
            self.code = self.code.upper()

        # Validate discount
        if self.discount_percent <= 0 or self.discount_percent > 100:
            raise ValidationError('Discount must be between 0 and 100')

        # Validate min spend
        if self.min_spend < 0:
            raise ValidationError('Minimum spend cannot be negative')

        # Validate max uses
        if self.max_uses is not None and self.max_uses < 1:
            raise ValidationError('Max uses must be at least 1 or null for unlimited')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def is_valid(self, booking_amount=None):
        """
        Check if promotion is currently valid for use.

        Args:
            booking_amount: Optional booking amount to check min_spend requirement

        Returns:
            (is_valid: bool, reason: str)
        """
        from django.utils import timezone

        # Check if active
        if not self.is_active:
            return (False, 'This promotion is no longer active')

        # Check expiry
        if self.expires_at and timezone.now() > self.expires_at:
            return (False, 'This promotion has expired')

        # Check usage limit
        if self.max_uses is not None and self.current_uses >= self.max_uses:
            return (False, 'This promotion has reached its usage limit')

        # Check minimum spend
        if booking_amount is not None and booking_amount < self.min_spend:
            return (False, f'Minimum spend of €{self.min_spend} required')

        return (True, 'Valid')

    def increment_usage(self):
        """Increment usage counter atomically."""
        from django.db.models import F
        Promotion.objects.filter(pk=self.pk).update(current_uses=F('current_uses') + 1)
        self.refresh_from_db()


class Voucher(models.Model):
    """
    Single-use or limited-use voucher codes (e.g., for refunds, gifts).
    Similar to promotions but typically more restricted.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.CharField(max_length=255)
    discount_type = models.CharField(
        max_length=20,
        choices=[
            ('percent', 'Percentage'),
            ('fixed', 'Fixed Amount'),
        ],
        default='percent'
    )
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Percentage (e.g., 15.00) or fixed amount (e.g., 50.00)'
    )
    min_spend = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Minimum booking amount to use this voucher'
    )
    max_uses = models.IntegerField(
        default=1,
        help_text='Maximum number of times this code can be used'
    )
    current_uses = models.IntegerField(default=0, editable=False)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When this voucher expires (null = never expires)'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='vouchers_created'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pricing_voucher'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        if self.discount_type == 'percent':
            return f"{self.code} - {self.discount_value}% off"
        else:
            return f"{self.code} - €{self.discount_value} off"

    def clean(self):
        # Uppercase the code
        if self.code:
            self.code = self.code.upper()

        # Validate discount
        if self.discount_type == 'percent':
            if self.discount_value <= 0 or self.discount_value > 100:
                raise ValidationError('Percentage discount must be between 0 and 100')
        else:
            if self.discount_value <= 0:
                raise ValidationError('Fixed discount must be greater than 0')

        # Validate min spend
        if self.min_spend < 0:
            raise ValidationError('Minimum spend cannot be negative')

        # Validate max uses
        if self.max_uses < 1:
            raise ValidationError('Max uses must be at least 1')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def is_valid(self, booking_amount=None):
        """
        Check if voucher is currently valid for use.

        Args:
            booking_amount: Optional booking amount to check min_spend requirement

        Returns:
            (is_valid: bool, reason: str)
        """
        from django.utils import timezone

        # Check if active
        if not self.is_active:
            return (False, 'This voucher is no longer active')

        # Check expiry
        if self.expires_at and timezone.now() > self.expires_at:
            return (False, 'This voucher has expired')

        # Check usage limit
        if self.current_uses >= self.max_uses:
            return (False, 'This voucher has been fully used')

        # Check minimum spend
        if booking_amount is not None and booking_amount < self.min_spend:
            return (False, f'Minimum spend of €{self.min_spend} required')

        return (True, 'Valid')

    def increment_usage(self):
        """Increment usage counter atomically."""
        from django.db.models import F
        Voucher.objects.filter(pk=self.pk).update(current_uses=F('current_uses') + 1)
        self.refresh_from_db()

    def calculate_discount(self, booking_amount):
        """Calculate discount amount for given booking amount."""
        if self.discount_type == 'percent':
            return booking_amount * (self.discount_value / 100)
        else:
            # Fixed amount, but don't exceed booking amount
            return min(self.discount_value, booking_amount)


class PromoUsage(models.Model):
    """
    Track promotion and voucher usage by users/bookings.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code_type = models.CharField(
        max_length=20,
        choices=[
            ('promotion', 'Promotion'),
            ('voucher', 'Voucher'),
        ]
    )
    promotion = models.ForeignKey(
        Promotion,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='usages'
    )
    voucher = models.ForeignKey(
        Voucher,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='usages'
    )
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='promo_usages'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='promo_usages'
    )
    guest_email = models.EmailField(help_text='Email of guest who used the code')
    booking_amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2)
    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pricing_promousage'
        ordering = ['-used_at']
        indexes = [
            models.Index(fields=['code_type']),
            models.Index(fields=['guest_email']),
            models.Index(fields=['used_at']),
        ]

    def __str__(self):
        code = self.promotion.code if self.promotion else self.voucher.code
        return f"{code} used by {self.guest_email}"

    def clean(self):
        # Ensure exactly one of promotion or voucher is set
        if self.code_type == 'promotion' and not self.promotion:
            raise ValidationError('Promotion must be set for promotion type')
        if self.code_type == 'voucher' and not self.voucher:
            raise ValidationError('Voucher must be set for voucher type')
