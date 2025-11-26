import uuid
from datetime import datetime
from django.db import models
from apps.bookings.models import Booking


class Invoice(models.Model):
    """
    Invoice model for booking payments.
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True, editable=False)
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    issue_date = models.DateField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
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
        # Generate invoice number
        if not self.invoice_number:
            date_str = datetime.now().strftime('%Y%m%d')
            count = Invoice.objects.filter(
                invoice_number__startswith=f'INV-{date_str}'
            ).count()
            self.invoice_number = f'INV-{date_str}-{str(count + 1).zfill(3)}'
        
        super().save(*args, **kwargs)
