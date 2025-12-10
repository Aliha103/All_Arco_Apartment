import uuid
from datetime import datetime
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone
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
    pdf_url = models.CharField(max_length=500, blank=True, null=True)  # Deprecated - use pdf_file instead
    pdf_file = models.FileField(upload_to='invoices/', null=True, blank=True, help_text='PDF file storage')
    line_items = models.JSONField(default=list, blank=True, help_text='Custom line items as JSON array')
    sent_to_email = models.EmailField(null=True, blank=True, help_text='Email address where invoice was sent')
    sent_count = models.IntegerField(default=0, help_text='Number of times email was sent')
    last_sent_at = models.DateTimeField(null=True, blank=True, help_text='Last email send timestamp')
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices_created',
        help_text='Team member who created this invoice'
    )
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

    def generate_line_items_from_booking(self):
        """
        Auto-populate line items from booking charges.
        Returns list of line item dictionaries.
        """
        booking = self.booking
        line_items = []

        # Calculate number of nights
        num_nights = (booking.check_out - booking.check_in).days

        # Add accommodation line item
        if booking.nightly_rate and booking.nightly_rate > 0:
            line_items.append({
                'description': f'Accommodation ({num_nights} night{"s" if num_nights != 1 else ""})',
                'quantity': num_nights,
                'unit_price': float(booking.nightly_rate),
                'amount': float(booking.nightly_rate * num_nights)
            })

        # Add cleaning fee line item
        if booking.cleaning_fee and booking.cleaning_fee > 0:
            line_items.append({
                'description': 'Cleaning Fee',
                'quantity': 1,
                'unit_price': float(booking.cleaning_fee),
                'amount': float(booking.cleaning_fee)
            })

        # Add tourist tax line item
        if booking.tourist_tax and booking.tourist_tax > 0:
            line_items.append({
                'description': f'City Tax ({booking.number_of_guests} guest{"s" if booking.number_of_guests != 1 else ""} x {num_nights} night{"s" if num_nights != 1 else ""})',
                'quantity': booking.number_of_guests * num_nights,
                'unit_price': float(booking.tourist_tax / (booking.number_of_guests * num_nights)) if booking.number_of_guests and num_nights else 0,
                'amount': float(booking.tourist_tax)
            })

        return line_items

    def calculate_total(self):
        """
        Calculate total from line_items JSON.
        Returns Decimal.
        """
        if not self.line_items:
            return Decimal('0.00')

        total = sum(Decimal(str(item.get('amount', 0))) for item in self.line_items)
        return total

    def generate_pdf_file(self):
        """
        Generate PDF and save to pdf_file field.
        Returns the file path.
        Note: Implementation will be in pdf_service.py
        """
        # Import here to avoid circular imports
        from apps.invoices.pdf_service import InvoicePDFGenerator

        generator = InvoicePDFGenerator(self)
        pdf_buffer = generator.generate()

        # Save to file field
        filename = f"{self.invoice_number}.pdf"
        self.pdf_file.save(filename, ContentFile(pdf_buffer.getvalue()), save=False)

        return self.pdf_file.name

    def get_download_url(self):
        """
        Get URL for PDF download.
        Returns API endpoint URL.
        """
        if self.pdf_file:
            return self.pdf_file.url
        return f'/api/invoices/{self.id}/download_pdf/'


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

    # Contact person details (CRM feature)
    contact_person_name = models.CharField(max_length=255, blank=True, help_text='Primary contact at company')
    contact_person_email = models.EmailField(blank=True, help_text='Contact email (may differ from company email)')
    contact_person_phone = models.CharField(max_length=50, blank=True, help_text='Contact phone number')

    # CRM fields
    notes = models.TextField(blank=True, help_text='Internal notes about company')
    tags = models.JSONField(default=list, blank=True, help_text='Tags for categorization')
    is_active = models.BooleanField(default=True, help_text='Soft delete / archive companies')

    # Cached statistics
    invoice_count = models.IntegerField(default=0, help_text='Cache of total invoices issued')
    total_invoiced = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Cache of total amount invoiced'
    )
    last_invoice_date = models.DateField(null=True, blank=True, help_text='Last invoice issued date')

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

    def update_stats(self):
        """
        Recalculate invoice_count, total_invoiced, last_invoice_date.
        Should be called after creating/deleting invoices.
        """
        invoices = self.invoices.filter(status__in=['sent', 'paid'])

        self.invoice_count = invoices.count()
        self.total_invoiced = sum(
            invoice.amount for invoice in invoices
        ) or Decimal('0.00')

        latest_invoice = invoices.order_by('-issue_date').first()
        self.last_invoice_date = latest_invoice.issue_date if latest_invoice else None

        self.save(update_fields=['invoice_count', 'total_invoiced', 'last_invoice_date'])

    def get_invoice_history(self):
        """
        Get all invoices for this company.
        Returns queryset ordered by date (most recent first).
        """
        return self.invoices.select_related('booking').order_by('-issue_date')


class CompanyNote(models.Model):
    """
    Notes/interactions with companies (CRM feature).
    Tracks communication history and important information about companies.
    """
    NOTE_TYPE_CHOICES = [
        ('general', 'General Note'),
        ('call', 'Phone Call'),
        ('email', 'Email'),
        ('meeting', 'Meeting'),
        ('issue', 'Issue/Problem'),
        ('resolution', 'Resolution'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='company_notes',
        help_text='Company this note belongs to'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='company_notes_created',
        help_text='Team member who created this note'
    )
    note_type = models.CharField(
        max_length=50,
        choices=NOTE_TYPE_CHOICES,
        default='general',
        help_text='Type of interaction or note'
    )
    content = models.TextField(help_text='Note content')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'invoices_company_note'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', '-created_at']),
            models.Index(fields=['note_type']),
        ]

    def __str__(self):
        return f"{self.get_note_type_display()} - {self.company.name} ({self.created_at.strftime('%Y-%m-%d')})"
