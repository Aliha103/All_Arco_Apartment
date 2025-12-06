from django.contrib import admin
from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'amount', 'expense_date', 'status', 'created_by', 'created_at')
    list_filter = ('status', 'category', 'payment_method', 'expense_date')
    search_fields = ('title', 'description', 'vendor')
    readonly_fields = ('id', 'created_at', 'updated_at', 'approved_at')
    date_hierarchy = 'expense_date'

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'category', 'amount', 'expense_date')
        }),
        ('Details', {
            'fields': ('description', 'vendor', 'payment_method', 'receipt_url')
        }),
        ('Approval', {
            'fields': ('status', 'approved_by', 'approved_at', 'rejection_reason')
        }),
        ('Metadata', {
            'fields': ('id', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:  # If creating new expense
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
