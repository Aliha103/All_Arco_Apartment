"""
Admin configuration for cleaning app.
"""

from django.contrib import admin
from .models import CleaningSchedule, CleaningTask


class CleaningTaskInline(admin.TabularInline):
    model = CleaningTask
    extra = 0
    fields = ['title', 'category', 'is_completed', 'order']


@admin.register(CleaningSchedule)
class CleaningScheduleAdmin(admin.ModelAdmin):
    list_display = [
        'scheduled_date',
        'scheduled_time',
        'status',
        'priority',
        'assigned_to',
        'booking',
    ]
    list_filter = ['status', 'priority', 'scheduled_date']
    search_fields = ['notes', 'special_instructions']
    inlines = [CleaningTaskInline]
    date_hierarchy = 'scheduled_date'
    readonly_fields = ['created_at', 'updated_at']


@admin.register(CleaningTask)
class CleaningTaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'cleaning_schedule', 'category', 'is_completed', 'order']
    list_filter = ['is_completed', 'category']
    search_fields = ['title', 'description']
    readonly_fields = ['created_at', 'updated_at']
