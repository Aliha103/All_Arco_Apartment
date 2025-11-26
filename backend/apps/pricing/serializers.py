from rest_framework import serializers
from .models import Settings, PricingRule


class SettingsSerializer(serializers.ModelSerializer):
    """Serializer for Settings model."""
    
    class Meta:
        model = Settings
        fields = '__all__'
        read_only_fields = ['id', 'updated_at']


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
