from rest_framework import serializers
from .models import Expense
from apps.users.models import User


class ExpenseListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing expenses"""
    created_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'title', 'category', 'category_display', 'amount', 'expense_date',
            'vendor', 'payment_method', 'payment_method_display', 'status', 'status_display',
            'created_by', 'created_by_name', 'approved_by', 'approved_by_name',
            'created_at', 'updated_at'
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return None

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip() or obj.approved_by.email
        return None


class ExpenseDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single expense view"""
    created_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at', 'approved_by', 'approved_at')

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return None

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip() or obj.approved_by.email
        return None


class ExpenseCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating expenses"""

    class Meta:
        model = Expense
        fields = [
            'title', 'category', 'amount', 'description', 'vendor',
            'payment_method', 'expense_date', 'receipt_url', 'status'
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value

    def create(self, validated_data):
        # Set created_by from request user
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class ExpenseStatsSerializer(serializers.Serializer):
    """Serializer for expense statistics"""
    total_expenses = serializers.DecimalField(max_digits=10, decimal_places=2)
    approved_expenses = serializers.DecimalField(max_digits=10, decimal_places=2)
    pending_expenses = serializers.DecimalField(max_digits=10, decimal_places=2)
    category_breakdown = serializers.DictField()
    monthly_total = serializers.DecimalField(max_digits=10, decimal_places=2)
