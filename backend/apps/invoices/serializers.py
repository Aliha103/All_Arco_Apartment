from rest_framework import serializers
from .models import Invoice, Company
from apps.bookings.serializers import BookingListSerializer


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for Invoice model."""
    booking_details = BookingListSerializer(source='booking', read_only=True)
    guest_name = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    issued_at = serializers.DateField(source='issue_date', read_only=True)
    type = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['id', 'invoice_number', 'created_at', 'updated_at']

    def get_guest_name(self, obj):
        """Get guest name from linked booking."""
        if obj.booking:
            return getattr(obj.booking, 'guest_name', None)
        return getattr(obj, 'guest_name', None)

    def get_company_name(self, obj):
        """Get company name if exists."""
        # Add this if you have a company field in your Invoice model
        return None

    def get_total_amount(self, obj):
        """Return invoice amount, or booking total if amount is 0."""
        if obj.amount and float(obj.amount) > 0:
            return str(obj.amount)
        elif obj.booking:
            return str(obj.booking.total_price)
        return "0.00"

    def get_type(self, obj):
        """Return invoice type (receipt by default)."""
        # If you don't have a type field in the model, return default
        return getattr(obj, 'type', 'receipt')

    def create(self, validated_data):
        """
        Ensure amount is set from booking total if not provided
        and attach booking from incoming booking id.
        """
        booking = validated_data.get('booking')
        amount = validated_data.get('amount')

        # Default amount from booking total_price when missing/zero
        if booking and (amount is None or float(amount) == 0):
            validated_data['amount'] = booking.total_price

        invoice = super().create(validated_data)
        return invoice


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
