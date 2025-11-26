from django.contrib import admin
from .models import EmailLog


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ['recipient_email', 'template_name', 'status', 'sent_at']
    list_filter = ['status', 'template_name', 'sent_at']
    search_fields = ['recipient_email', 'subject', 'booking__booking_id']
    readonly_fields = ['sent_at']
    ordering = ['-sent_at']
