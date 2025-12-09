from rest_framework import serializers
from .models import Settings, PricingRule, Promotion, Voucher, PromoUsage


class SettingsSerializer(serializers.ModelSerializer):
    """Serializer for Settings model."""
    
    class Meta:
        model = Settings
        fields = '__all__'
        read_only_fields = ['id', 'updated_at', 'updated_by']


class PricingRuleSerializer(serializers.ModelSerializer):
    """Serializer for PricingRule model."""
    
    class Meta:
        model = PricingRule
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
    
    def validate(self, data):
        if data['end_date'] < data['start_date']:
            raise serializers.ValidationError('End date must be on or after start date')
        return data


class PromotionSerializer(serializers.ModelSerializer):
    """Serializer for Promotion model."""
    created_by_name = serializers.SerializerMethodField()
    usage_percent = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = Promotion
        fields = [
            'id', 'code', 'description', 'discount_percent', 'min_spend',
            'max_uses', 'current_uses', 'expires_at', 'is_active',
            'created_at', 'updated_at', 'created_by', 'created_by_name',
            'usage_percent', 'is_expired'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'current_uses']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return None

    def get_usage_percent(self, obj):
        if obj.max_uses is None:
            return 0  # Unlimited
        if obj.max_uses == 0:
            return 100
        return round((obj.current_uses / obj.max_uses) * 100, 1)

    def get_is_expired(self, obj):
        from django.utils import timezone
        return obj.expires_at and timezone.now() > obj.expires_at


class VoucherSerializer(serializers.ModelSerializer):
    """Serializer for Voucher model."""
    created_by_name = serializers.SerializerMethodField()
    usage_percent = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = Voucher
        fields = [
            'id', 'code', 'description', 'discount_type', 'discount_value',
            'min_spend', 'max_uses', 'current_uses', 'expires_at', 'is_active',
            'created_at', 'updated_at', 'created_by', 'created_by_name',
            'usage_percent', 'is_expired'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'current_uses']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return None

    def get_usage_percent(self, obj):
        if obj.max_uses == 0:
            return 100
        return round((obj.current_uses / obj.max_uses) * 100, 1)

    def get_is_expired(self, obj):
        from django.utils import timezone
        return obj.expires_at and timezone.now() > obj.expires_at


class PromoUsageSerializer(serializers.ModelSerializer):
    """Serializer for PromoUsage model."""
    code = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    booking_id = serializers.SerializerMethodField()

    class Meta:
        model = PromoUsage
        fields = [
            'id', 'code_type', 'code', 'guest_email', 'user_name',
            'booking_id', 'booking_amount', 'discount_amount', 'used_at'
        ]
        read_only_fields = ['id', 'used_at']

    def get_code(self, obj):
        return obj.promotion.code if obj.promotion else obj.voucher.code

    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
        return None

    def get_booking_id(self, obj):
        return obj.booking.booking_id if obj.booking else None


class ValidatePromoSerializer(serializers.Serializer):
    """Serializer for validating promo/voucher codes."""
    code = serializers.CharField(max_length=50, required=True)
    booking_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
