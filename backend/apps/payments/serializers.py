from rest_framework import serializers
from .models import Payment, Refund, PaymentRequest
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


class PaymentRequestSerializer(serializers.ModelSerializer):
    """Serializer for PaymentRequest model."""
    booking_details = BookingListSerializer(source='booking', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    guest_name = serializers.ReadOnlyField()
    guest_email = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    booking_id = serializers.CharField(source='booking.booking_id', read_only=True)

    class Meta:
        model = PaymentRequest
        fields = [
            'id',
            'booking',
            'booking_id',
            'booking_details',
            'type',
            'description',
            'amount',
            'currency',
            'due_date',
            'stripe_payment_link_id',
            'stripe_payment_link_url',
            'status',
            'paid_at',
            'cancelled_at',
            'created_by',
            'created_by_name',
            'guest_name',
            'guest_email',
            'is_overdue',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'stripe_payment_link_id',
            'stripe_payment_link_url',
            'paid_at',
            'cancelled_at',
            'created_at',
            'updated_at',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None
