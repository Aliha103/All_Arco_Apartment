from rest_framework import serializers
from .models import Invoice, Company
from apps.bookings.serializers import BookingListSerializer


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for Invoice model."""
    booking_details = BookingListSerializer(source='booking', read_only=True)
    
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['id', 'invoice_number', 'created_at', 'updated_at']


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
