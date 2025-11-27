"""
Admin configuration for gallery app.
"""
from django.contrib import admin
from .models import HeroImage


@admin.register(HeroImage)
class HeroImageAdmin(admin.ModelAdmin):
    list_display = ['title', 'image_type', 'order', 'is_active', 'uploaded_by', 'created_at']
    list_filter = ['image_type', 'is_active', 'created_at']
    search_fields = ['title', 'alt_text']
    ordering = ['order', '-created_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        (None, {
            'fields': ('title', 'alt_text', 'image', 'image_url', 'image_type')
        }),
        ('Display Options', {
            'fields': ('order', 'is_active')
        }),
        ('Metadata', {
            'fields': ('uploaded_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
