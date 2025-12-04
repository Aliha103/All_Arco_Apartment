from rest_framework import serializers
from .models import Invoice, Company
from apps.bookings.serializers import BookingListSerializer


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for Invoice model with support for both invoices and receipts."""
    booking_details = BookingListSerializer(source='booking', read_only=True)
    company_details = serializers.SerializerMethodField()
    guest_name = serializers.SerializerMethodField()
    guest_email = serializers.SerializerMethodField()
    booking_id = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    accommodation_total = serializers.SerializerMethodField()
    cleaning_fee = serializers.SerializerMethodField()
    extra_guest_fee = serializers.SerializerMethodField()
    tourist_tax = serializers.SerializerMethodField()
    issued_at = serializers.DateField(source='issue_date', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id',
            'invoice_number',
            'type',
            'booking',
            'booking_id',
            'booking_details',
            'company',
            'company_details',
            'issue_date',
            'due_date',
            'issued_at',
            'amount',
            'total_amount',
            'accommodation_total',
            'cleaning_fee',
            'extra_guest_fee',
            'tourist_tax',
            'status',
            'payment_method',
            'pdf_url',
            'sent_at',
            'paid_at',
            'notes',
            'created_at',
            'updated_at',
            'guest_name',
            'guest_email',
            'company_name',
        ]
        read_only_fields = ['id', 'invoice_number', 'created_at', 'updated_at', 'issued_at', 'booking_details', 'company_details']

    def get_guest_name(self, obj):
        """Get guest name from linked booking."""
        if obj.booking:
            return getattr(obj.booking, 'guest_name', None)
        return None

    def get_guest_email(self, obj):
        """Get guest email from linked booking."""
        if obj.booking:
            return getattr(obj.booking, 'guest_email', None)
        return None

    def get_booking_id(self, obj):
        """Get booking ID from linked booking."""
        if obj.booking:
            return getattr(obj.booking, 'booking_id', None)
        return None

    def get_company_name(self, obj):
        """Get company name if exists."""
        if obj.company:
            return obj.company.name
        return None

    def get_company_details(self, obj):
        """Get full company details if exists."""
        if obj.company:
            return CompanySerializer(obj.company).data
        return None

    def get_total_amount(self, obj):
        """Return invoice amount, or booking total if amount is 0."""
        if obj.amount and float(obj.amount) > 0:
            return str(obj.amount)
        elif obj.booking:
            return str(obj.booking.total_price)
        return "0.00"

    def get_accommodation_total(self, obj):
        """Calculate accommodation total from nightly rate and nights."""
        if obj.booking:
            nightly_rate = getattr(obj.booking, 'nightly_rate', 0)
            nights = getattr(obj.booking, 'nights', 0)
            return str(nightly_rate * nights)
        return "0.00"

    def get_cleaning_fee(self, obj):
        """Get cleaning fee from booking."""
        if obj.booking:
            return str(getattr(obj.booking, 'cleaning_fee', 0))
        return "0.00"

    def get_extra_guest_fee(self, obj):
        """Calculate extra guest fee from booking."""
        if obj.booking:
            # Get extra guest fee from total_price - (accommodation + cleaning + tourist_tax)
            total = float(getattr(obj.booking, 'total_price', 0))
            accommodation = float(self.get_accommodation_total(obj))
            cleaning = float(getattr(obj.booking, 'cleaning_fee', 0))
            tourist = float(getattr(obj.booking, 'tourist_tax', 0))
            extra_fee = total - accommodation - cleaning - tourist
            return str(max(0, extra_fee))  # Ensure non-negative
        return "0.00"

    def get_tourist_tax(self, obj):
        """Get tourist tax from booking."""
        if obj.booking:
            return str(getattr(obj.booking, 'tourist_tax', 0))
        return "0.00"

    def create(self, validated_data):
        """
        Ensure amount is set from booking total if not provided.
        Prevent duplicate invoices/receipts of the same type for the same booking.
        """
        booking = validated_data.get('booking')
        amount = validated_data.get('amount')
        doc_type = validated_data.get('type', 'receipt')

        # Check if document of same type already exists for this booking
        if booking:
            existing_doc = Invoice.objects.filter(
                booking=booking,
                type=doc_type
            ).first()
            if existing_doc:
                doc_type_name = 'invoice' if doc_type == 'invoice' else 'receipt'
                raise serializers.ValidationError({
                    'booking': f'A {doc_type_name} already exists for this booking: {existing_doc.invoice_number}',
                    'existing_id': str(existing_doc.id)
                })

        # For invoices, require company
        if doc_type == 'invoice' and not validated_data.get('company'):
            raise serializers.ValidationError({
                'company': 'Company is required for invoice type documents'
            })

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
