"""
Team Compensation Models
Tracks salary and profit-sharing configurations for team members.
"""

import uuid
from django.db import models
from decimal import Decimal


class TeamCompensation(models.Model):
    """
    Compensation configuration for team members.
    Supports salary-based and profit-share based compensation.
    """

    COMPENSATION_TYPE_CHOICES = [
        ('salary', 'Salary Based'),
        ('profit_share', 'Profit Share'),
    ]

    # Salary calculation methods
    SALARY_METHOD_CHOICES = [
        ('per_checkout', 'Fixed Salary Per Check-out'),
        ('percentage_base_price', 'Percentage on Base Price'),
    ]

    # Profit share calculation timing
    PROFIT_SHARE_TIMING_CHOICES = [
        ('before_expenses', 'Before Expenses'),
        ('after_expenses', 'After Expenses'),
        ('after_expenses_and_salaries', 'After Expenses + Salaries'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        'User',
        on_delete=models.CASCADE,
        related_name='compensation'
    )

    # Compensation Type
    compensation_type = models.CharField(
        max_length=20,
        choices=COMPENSATION_TYPE_CHOICES,
        default='salary'
    )

    # === Salary-based fields ===
    salary_method = models.CharField(
        max_length=30,
        choices=SALARY_METHOD_CHOICES,
        null=True,
        blank=True,
        help_text='How to calculate salary'
    )

    # For fixed salary per checkout
    fixed_amount_per_checkout = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Fixed amount paid per checkout'
    )

    # For percentage on base price
    percentage_on_base_price = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Percentage of base price (e.g., 10.00 for 10%)'
    )

    # === Profit share fields ===
    profit_share_timing = models.CharField(
        max_length=35,
        choices=PROFIT_SHARE_TIMING_CHOICES,
        null=True,
        blank=True,
        help_text='When to calculate profit share'
    )

    profit_share_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Percentage of profit (e.g., 15.00 for 15%)'
    )

    # Metadata
    notes = models.TextField(
        blank=True,
        help_text='Internal notes about compensation arrangement'
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users_team_compensation'
        verbose_name = 'Team Compensation'
        verbose_name_plural = 'Team Compensations'

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.get_compensation_type_display()}"

    def clean(self):
        """Validate compensation configuration."""
        from django.core.exceptions import ValidationError

        if self.compensation_type == 'salary':
            if not self.salary_method:
                raise ValidationError({'salary_method': 'Salary method is required for salary-based compensation'})

            if self.salary_method == 'per_checkout' and not self.fixed_amount_per_checkout:
                raise ValidationError({'fixed_amount_per_checkout': 'Fixed amount is required for per-checkout salary'})

            if self.salary_method == 'percentage_base_price' and not self.percentage_on_base_price:
                raise ValidationError({'percentage_on_base_price': 'Percentage is required for percentage-based salary'})

        elif self.compensation_type == 'profit_share':
            if not self.profit_share_timing:
                raise ValidationError({'profit_share_timing': 'Profit share timing is required'})

            if not self.profit_share_percentage:
                raise ValidationError({'profit_share_percentage': 'Profit share percentage is required'})

            if self.profit_share_percentage < Decimal('0') or self.profit_share_percentage > Decimal('100'):
                raise ValidationError({'profit_share_percentage': 'Percentage must be between 0 and 100'})

    def calculate_salary(self, booking):
        """
        Calculate salary for a given booking.

        Args:
            booking: Booking instance

        Returns:
            Decimal: Calculated salary amount
        """
        if self.compensation_type != 'salary':
            return Decimal('0')

        if self.salary_method == 'per_checkout':
            return self.fixed_amount_per_checkout or Decimal('0')

        elif self.salary_method == 'percentage_base_price':
            # Base price = total_price - OTA commission - discount - voucher - promotion - credit
            base_price = Decimal(str(booking.total_price))

            # Subtract OTA commission
            if hasattr(booking, 'ota_commission_amount') and booking.ota_commission_amount:
                base_price -= Decimal(str(booking.ota_commission_amount))

            # Subtract applied credit
            if hasattr(booking, 'applied_credit') and booking.applied_credit:
                base_price -= Decimal(str(booking.applied_credit))

            # Calculate percentage
            percentage = self.percentage_on_base_price or Decimal('0')
            return (base_price * percentage) / Decimal('100')

        return Decimal('0')

    def calculate_profit_share(self, profit_data):
        """
        Calculate profit share based on timing and percentage.

        Args:
            profit_data: Dict with keys: revenue, expenses, salaries

        Returns:
            Decimal: Calculated profit share amount
        """
        if self.compensation_type != 'profit_share':
            return Decimal('0')

        revenue = Decimal(str(profit_data.get('revenue', 0)))
        expenses = Decimal(str(profit_data.get('expenses', 0)))
        salaries = Decimal(str(profit_data.get('salaries', 0)))

        # Calculate profit based on timing
        if self.profit_share_timing == 'before_expenses':
            profit = revenue
        elif self.profit_share_timing == 'after_expenses':
            profit = revenue - expenses
        elif self.profit_share_timing == 'after_expenses_and_salaries':
            profit = revenue - expenses - salaries
        else:
            profit = Decimal('0')

        # Calculate share
        percentage = self.profit_share_percentage or Decimal('0')
        return (profit * percentage) / Decimal('100')
