from rest_framework import serializers
from django.utils import timezone
from .models import Invoice, Company, CompanyNote
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
    created_by_name = serializers.SerializerMethodField()
    calculated_total = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()

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
            'calculated_total',
            'accommodation_total',
            'cleaning_fee',
            'extra_guest_fee',
            'tourist_tax',
            'status',
            'payment_method',
            'pdf_url',
            'pdf_file',
            'download_url',
            'line_items',
            'sent_to_email',
            'sent_count',
            'last_sent_at',
            'created_by',
            'created_by_name',
            'sent_at',
            'paid_at',
            'notes',
            'created_at',
            'updated_at',
            'guest_name',
            'guest_email',
            'company_name',
        ]
        read_only_fields = [
            'id',
            'invoice_number',
            'created_at',
            'updated_at',
            'issued_at',
            'booking_details',
            'company_details',
            'calculated_total',
            'download_url',
            'created_by_name',
            'pdf_file'
        ]
        extra_kwargs = {
            'amount': {'required': False, 'allow_null': True},
        }

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

    def get_created_by_name(self, obj):
        """Get name of user who created the invoice."""
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def get_calculated_total(self, obj):
        """Calculate total from line_items JSON."""
        return str(obj.calculate_total())

    def get_download_url(self, obj):
        """Get URL for PDF download."""
        return obj.get_download_url()

    def create(self, validated_data):
        """
        Ensure amount is set from line items or booking total if not provided.
        Prevent duplicate invoices/receipts of the same type for the same booking.
        Auto-generate line items if not provided.
        """
        from decimal import Decimal

        booking = validated_data.get('booking')
        amount = validated_data.get('amount')
        doc_type = validated_data.get('type', 'receipt')
        line_items = validated_data.get('line_items', [])

        # Check if booking is paid before allowing invoice/receipt creation
        if booking and hasattr(booking, 'payment_status'):
            if booking.payment_status != 'paid':
                raise serializers.ValidationError({
                    'booking': 'Cannot generate invoice/receipt. Payment must be completed before generating documents. Please ensure the booking is fully paid first.'
                })

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

        # Calculate amount from line_items if provided and amount is not set
        if line_items and (amount is None or float(amount or 0) == 0):
            total = Decimal('0')
            for item in line_items:
                # Support both 'total' and 'amount' fields
                item_total = item.get('total', item.get('amount', 0))
                if item_total:
                    total += Decimal(str(item_total))
            validated_data['amount'] = total
        # Default amount from booking total_price when missing/zero and no line items
        elif booking and (amount is None or float(amount or 0) == 0):
            validated_data['amount'] = booking.total_price

        # Set created_by from context if available
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user

        # Auto-set invoice status and payment method based on booking
        if booking and hasattr(booking, 'payment_status'):
            if booking.payment_status == 'paid':
                validated_data['status'] = 'paid'
                validated_data['paid_at'] = timezone.now()

                # Get actual payment method from booking's payment records
                latest_payment = booking.payments.filter(
                    status='succeeded',
                    kind='booking'
                ).order_by('-paid_at').first()

                if latest_payment and latest_payment.payment_method:
                    # Map Stripe payment methods to invoice payment methods
                    stripe_method = latest_payment.payment_method.lower()
                    if 'card' in stripe_method:
                        validated_data['payment_method'] = 'stripe'
                    else:
                        validated_data['payment_method'] = 'stripe'
                # If no payment record found, assume cash/property payment
                elif 'payment_method' not in validated_data:
                    validated_data['payment_method'] = 'property'
            elif booking.payment_status == 'partially_paid':
                validated_data['status'] = 'sent'
            # Otherwise keep default 'draft' status

        invoice = super().create(validated_data)

        # Auto-generate line items if not provided
        if not line_items and booking:
            invoice.line_items = invoice.generate_line_items_from_booking()
            invoice.save(update_fields=['line_items'])

        return invoice


class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company model with CRM features."""
    created_by_name = serializers.SerializerMethodField()
    recent_invoices = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            'id',
            'name',
            'vat_number',
            'sdi',
            'tax_code',
            'address',
            'country',
            'email',
            'phone',
            'website',
            'contact_person_name',
            'contact_person_email',
            'contact_person_phone',
            'notes',
            'tags',
            'is_active',
            'invoice_count',
            'total_invoiced',
            'last_invoice_date',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
            'recent_invoices',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
            'invoice_count',
            'total_invoiced',
            'last_invoice_date',
            'recent_invoices',
        ]

    def get_created_by_name(self, obj):
        """Get name of user who created the company."""
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def get_recent_invoices(self, obj):
        """Get recent invoices for this company (last 5)."""
        # Only include in detail view to avoid N+1 queries
        if self.context.get('include_recent_invoices'):
            from apps.invoices.models import Invoice
            recent = Invoice.objects.filter(company=obj).order_by('-issue_date')[:5]
            return InvoiceSerializer(recent, many=True, context=self.context).data
        return None


class CompanyNoteSerializer(serializers.ModelSerializer):
    """Serializer for CompanyNote model (CRM feature)."""
    created_by_name = serializers.SerializerMethodField()
    note_type_display = serializers.CharField(source='get_note_type_display', read_only=True)

    class Meta:
        model = CompanyNote
        fields = [
            'id',
            'company',
            'created_by',
            'created_by_name',
            'note_type',
            'note_type_display',
            'content',
            'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_at', 'note_type_display']

    def get_created_by_name(self, obj):
        """Get name of user who created the note."""
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def create(self, validated_data):
        """Set created_by from context."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)
