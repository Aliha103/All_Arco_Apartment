from django.contrib import admin
from .models import Settings, PricingRule


@admin.register(Settings)
class SettingsAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        # Only allow one instance
        return not Settings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Don't allow deletion
        return False
    
    fieldsets = (
        ('Base Pricing', {
            'fields': ('default_nightly_rate', 'cleaning_fee', 'tourist_tax_per_person_per_night')
        }),
        ('Guest Fees', {
            'fields': ('extra_guest_fee', 'extra_guest_threshold', 'max_guests')
        }),
        ('Booking Rules', {
            'fields': ('minimum_stay_nights', 'maximum_stay_nights', 'check_in_time', 'check_out_time')
        }),
        ('Metadata', {
            'fields': ('updated_at', 'updated_by')
        }),
    )
    readonly_fields = ['updated_at']


@admin.register(PricingRule)
class PricingRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'nightly_rate', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at']
    ordering = ['start_date']
