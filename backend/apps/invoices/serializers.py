from rest_framework import serializers
from .models import Invoice, Company
from apps.bookings.serializers import BookingListSerializer


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for Invoice model with support for both invoices and receipts."""
    booking_details = BookingListSerializer(source='booking', read_only=True)
    company_details = serializers.SerializerMethodField()
    guest_name = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    issued_at = serializers.DateField(source='issue_date', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id',
            'invoice_number',
            'type',
            'booking',
            'booking_details',
            'company',
            'company_details',
            'issue_date',
            'due_date',
            'issued_at',
            'amount',
            'total_amount',
            'status',
            'payment_method',
            'pdf_url',
            'sent_at',
            'paid_at',
            'notes',
            'created_at',
            'updated_at',
            'guest_name',
            'company_name',
        ]
        read_only_fields = ['id', 'invoice_number', 'created_at', 'updated_at', 'issued_at', 'booking_details', 'company_details']

    def get_guest_name(self, obj):
        """Get guest name from linked booking."""
        if obj.booking:
            return getattr(obj.booking, 'guest_name', None)
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
