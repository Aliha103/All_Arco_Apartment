from rest_framework import serializers
from .models import Payment, Refund
from apps.bookings.serializers import BookingListSerializer


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment model."""
    booking_details = BookingListSerializer(source='booking', read_only=True)
    
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class RefundSerializer(serializers.ModelSerializer):
    """Serializer for Refund model."""
    booking_details = BookingListSerializer(source='booking', read_only=True)
    processed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Refund
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
    
    def get_processed_by_name(self, obj):
        if obj.processed_by:
            return obj.processed_by.get_full_name()
        return None
