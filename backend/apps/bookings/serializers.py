from rest_framework import serializers
from .models import Booking, BlockedDate
from apps.users.serializers import UserSerializer


class BookingSerializer(serializers.ModelSerializer):
    """Full serializer for Booking model."""
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ['id', 'booking_id', 'nights', 'total_price', 'created_at', 'updated_at']


class BookingListSerializer(serializers.ModelSerializer):
    """Minimal serializer for booking lists."""
    
    class Meta:
        model = Booking
        fields = [
            'id', 'booking_id', 'guest_name', 'guest_email', 'check_in_date',
            'check_out_date', 'nights', 'status', 'payment_status', 'total_price', 'created_at'
        ]
        read_only_fields = fields


class BookingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating bookings."""
    
    class Meta:
        model = Booking
        fields = [
            'user', 'guest_email', 'guest_name', 'guest_phone', 'guest_address',
            'check_in_date', 'check_out_date', 'number_of_guests',
            'nightly_rate', 'cleaning_fee', 'tourist_tax', 'special_requests'
        ]
    
    def validate(self, data):
        # Validate dates
        if data['check_out_date'] <= data['check_in_date']:
            raise serializers.ValidationError('Check-out must be after check-in')
        
        # Check availability
        overlapping = Booking.objects.filter(
            check_in_date__lt=data['check_out_date'],
            check_out_date__gt=data['check_in_date'],
            status__in=['confirmed', 'paid', 'checked_in']
        ).exists()
        
        if overlapping:
            raise serializers.ValidationError('Dates are not available')
        
        # Check blocked dates
        blocked = BlockedDate.objects.filter(
            start_date__lt=data['check_out_date'],
            end_date__gt=data['check_in_date']
        ).exists()
        
        if blocked:
            raise serializers.ValidationError('Dates are blocked')
        
        return data


class BlockedDateSerializer(serializers.ModelSerializer):
    """Serializer for BlockedDate model."""
    
    class Meta:
        model = BlockedDate
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
    
    def validate(self, data):
        if data['end_date'] < data['start_date']:
            raise serializers.ValidationError('End date must be on or after start date')
        return data
