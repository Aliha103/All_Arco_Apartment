from django.contrib import admin
from .models import Payment, Refund


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'booking', 'amount', 'currency', 'status', 'paid_at', 'created_at']
    list_filter = ['status', 'currency', 'created_at']
    search_fields = ['stripe_payment_intent_id', 'booking__booking_id', 'booking__guest_email']
    readonly_fields = ['created_at']
    ordering = ['-created_at']


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ['id', 'booking', 'amount', 'reason', 'status', 'processed_by', 'refunded_at']
    list_filter = ['reason', 'status', 'created_at']
    search_fields = ['stripe_refund_id', 'booking__booking_id']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
