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
    
    def calculate_booking_price(self, check_in, check_out, guests):
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
        
        return {
            'nightly_rate': float(nightly_rate),
            'nights': nights,
            'accommodation': float(accommodation),
            'cleaning_fee': float(self.cleaning_fee),
            'tourist_tax': float(tourist_tax),
            'extra_guest_fee': float(extra_guest_cost),
            'total': float(accommodation + self.cleaning_fee + tourist_tax + extra_guest_cost)
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
