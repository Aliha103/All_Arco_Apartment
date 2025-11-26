from django.contrib import admin
from .models import Invoice


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'booking', 'amount', 'status', 'issue_date', 'due_date', 'paid_at']
    list_filter = ['status', 'issue_date']
    search_fields = ['invoice_number', 'booking__booking_id', 'booking__guest_email']
    readonly_fields = ['invoice_number', 'created_at', 'updated_at']
    ordering = ['-issue_date']
