import uuid
from datetime import datetime
from django.db import models
from apps.bookings.models import Booking
from apps.users.models import User


class Invoice(models.Model):
    """
    Invoice model for booking payments.
    Supports both Invoice (for companies with VAT) and Receipt (for individuals).
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
    ]

    TYPE_CHOICES = [
        ('invoice', 'Invoice'),
        ('receipt', 'Receipt'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('bank_transfer', 'Bank Transfer'),
        ('property', 'At Property'),
        ('stripe', 'Stripe'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True, editable=False)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='receipt')
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    company = models.ForeignKey(
        'Company',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices',
        help_text='Required for invoice type, optional for receipt'
    )
    issue_date = models.DateField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default='property',
        help_text='Payment method for this invoice/receipt'
    )
    pdf_url = models.CharField(max_length=500, blank=True, null=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'invoices_invoice'
        ordering = ['-issue_date']
        indexes = [
            models.Index(fields=['invoice_number']),
            models.Index(fields=['booking']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.invoice_number} - {self.booking.guest_name} - €{self.amount}"
    
    def save(self, *args, **kwargs):
        # Generate invoice/receipt number based on type
        if not self.invoice_number:
            # Use INV- prefix for invoices, REC- for receipts
            prefix = 'INV' if self.type == 'invoice' else 'REC'
            year = datetime.now().strftime('%Y')

            # Count existing documents of this type for this year
            count = Invoice.objects.filter(
                type=self.type,
                invoice_number__startswith=f'{prefix}-{year}'
            ).count()

            self.invoice_number = f'{prefix}-{year}-{str(count + 1).zfill(5)}'

        super().save(*args, **kwargs)


class Company(models.Model):
    """
    Company details for invoicing (optional fields include tax code / codice fiscale).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    vat_number = models.CharField(max_length=50)
    sdi = models.CharField(max_length=20, blank=True, null=True)
    tax_code = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField()
    country = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=50)
    website = models.URLField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='companies_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'invoices_company'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['vat_number']),
            models.Index(fields=['country']),
        ]

    def __str__(self):
        return self.name
