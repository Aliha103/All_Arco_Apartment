import uuid
from django.db import models
from django.core.validators import MinValueValidator
from apps.users.models import User


class Expense(models.Model):
    """
    Expense tracking model for property management.
    Records all business expenses with categorization and approval workflow.
    """

    CATEGORY_CHOICES = [
        ('utilities', 'Utilities'),
        ('maintenance', 'Maintenance & Repairs'),
        ('cleaning', 'Cleaning Supplies'),
        ('amenities', 'Guest Amenities'),
        ('marketing', 'Marketing & Advertising'),
        ('software', 'Software & Subscriptions'),
        ('insurance', 'Insurance'),
        ('taxes', 'Taxes & Fees'),
        ('supplies', 'Office Supplies'),
        ('professional', 'Professional Services'),
        ('other', 'Other'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('card', 'Credit/Debit Card'),
        ('bank_transfer', 'Bank Transfer'),
        ('check', 'Check'),
        ('other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Basic Information
    title = models.CharField(max_length=200, help_text='Short description of the expense')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Expense amount'
    )

    # Details
    description = models.TextField(blank=True, null=True, help_text='Detailed description or notes')
    vendor = models.CharField(max_length=200, blank=True, null=True, help_text='Vendor or payee name')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='cash')

    # Dates
    expense_date = models.DateField(help_text='Date when expense occurred')

    # Approval Workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_expenses',
        help_text='Team member who approved this expense'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)

    # Attachments
    receipt_url = models.URLField(blank=True, null=True, help_text='URL to receipt or invoice')

    # Metadata
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='expenses_created',
        help_text='Team member who created this expense record'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'expenses_expense'
        ordering = ['-expense_date', '-created_at']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['status']),
            models.Index(fields=['expense_date']),
            models.Index(fields=['created_by']),
        ]

    def __str__(self):
        return f"{self.title} - €{self.amount} ({self.get_category_display()})"

    def approve(self, approved_by_user):
        """Approve the expense"""
        from django.utils import timezone
        self.status = 'approved'
        self.approved_by = approved_by_user
        self.approved_at = timezone.now()
        self.rejection_reason = None
        self.save()

    def reject(self, rejected_by_user, reason=None):
        """Reject the expense"""
        from django.utils import timezone
        self.status = 'rejected'
        self.approved_by = rejected_by_user
        self.approved_at = timezone.now()
        self.rejection_reason = reason
        self.save()
