from django.contrib import admin
from .models import Booking, BlockedDate, BookingGuest


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['booking_id', 'guest_name', 'check_in_date', 'check_out_date', 
                    'nights', 'status', 'payment_status', 'cancellation_policy', 'total_price']
    list_filter = ['status', 'payment_status', 'check_in_date', 'created_at']
    search_fields = ['booking_id', 'guest_name', 'guest_email', 'guest_phone']
    readonly_fields = ['booking_id', 'nights', 'total_price', 'created_at', 'updated_at']
    ordering = ['-check_in_date']
    
    fieldsets = (
        ('Booking Info', {
            'fields': ('booking_id', 'user', 'status', 'payment_status')
        }),
        ('Guest Information', {
            'fields': ('guest_name', 'guest_email', 'guest_phone', 'guest_address')
        }),
        ('Dates & Guests', {
            'fields': ('check_in_date', 'check_out_date', 'nights', 'number_of_guests')
        }),
        ('Pricing', {
            'fields': ('nightly_rate', 'cleaning_fee', 'tourist_tax', 'total_price', 'cancellation_policy', 'is_non_refundable')
        }),
        ('Notes', {
            'fields': ('special_requests', 'internal_notes')
        }),
        ('Metadata', {
            'fields': ('created_at', 'created_by', 'updated_at', 'cancelled_at', 'cancellation_reason')
        }),
    )


@admin.register(BlockedDate)
class BlockedDateAdmin(admin.ModelAdmin):
    list_display = ['start_date', 'end_date', 'reason', 'created_by', 'created_at']
    list_filter = ['reason', 'created_at']
    search_fields = ['notes']
    readonly_fields = ['created_at']


@admin.register(BookingGuest)
class BookingGuestAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'booking', 'is_primary', 'country_of_birth', 'created_at']
    list_filter = ['is_primary', 'country_of_birth', 'created_at']
    search_fields = ['first_name', 'last_name', 'booking__booking_id', 'email']
    readonly_fields = ['created_at', 'updated_at']
