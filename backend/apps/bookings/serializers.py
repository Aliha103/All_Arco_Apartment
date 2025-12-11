from decimal import Decimal
from rest_framework import serializers
from .models import Booking, BlockedDate, BookingGuest
from apps.users.serializers import UserSerializer


class BookingSerializer(serializers.ModelSerializer):
    """Full serializer for Booking model."""
    user_details = UserSerializer(source='user', read_only=True)
    total_paid = serializers.SerializerMethodField()
    balance_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ['id', 'booking_id', 'nights', 'total_price', 'amount_due', 'created_at', 'updated_at', 'cancelled_at']

    def get_total_paid(self, obj):
        """Get total amount paid for this booking from all sources."""
        return obj.get_total_paid()

    def get_balance_remaining(self, obj):
        """Get remaining balance for this booking."""
        return obj.get_balance_remaining()


class BookingListSerializer(serializers.ModelSerializer):
    """Minimal serializer for booking lists."""

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_id', 'guest_name', 'guest_email', 'check_in_date',
            'check_out_date', 'nights', 'status', 'payment_status', 'total_price',
            'amount_due', 'applied_credit',
            'booking_source', 'number_of_guests', 'guest_tax_code', 'created_at',
            'nightly_rate', 'cleaning_fee', 'tourist_tax'  # Added for invoice line items
        ]
        read_only_fields = fields


class BookingCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating bookings.

    Primary guest must provide: first_name, last_name (in guest_name), email, phone, country
    """

    class Meta:
        model = Booking
        extra_kwargs = {'guest_name': {'required': False}}
        fields = [
            'id', 'user', 'guest_email', 'guest_name', 'guest_phone', 'guest_country', 'guest_address',
            'check_in_date', 'check_out_date', 'number_of_guests',
            'nightly_rate', 'cleaning_fee', 'tourist_tax', 'special_requests',
            'cancellation_policy',
            # write-only helpers
            'first_name', 'last_name', 'guest_details', 'applied_credit',
            # read-only outputs
            'booking_id', 'nights', 'total_price', 'amount_due', 'is_non_refundable',
        ]
        read_only_fields = ['id', 'booking_id', 'nights', 'total_price', 'amount_due', 'is_non_refundable']


class BookingGuestPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingGuest
        fields = [
            'id', 'first_name', 'last_name', 'email', 'country_of_birth', 'date_of_birth',
            'birth_province', 'birth_city', 'document_type', 'document_number',
            'document_issue_country', 'document_issue_date', 'document_expire_date',
            'document_issue_province', 'document_issue_city', 'relationship', 'is_primary',
        ]
        read_only_fields = fields

    first_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    last_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    guest_details = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        default=list
    )
    applied_credit = serializers.DecimalField(
        write_only=True,
        required=False,
        max_digits=10,
        decimal_places=2,
        default=0
    )
    
    def validate(self, data):
        # Validate dates
        if data['check_out_date'] <= data['check_in_date']:
            raise serializers.ValidationError('Check-out must be after check-in')

        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            # Ensure booking is linked to the authenticated user for credits/history
            data.setdefault('user', request.user)
        
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

        applied_credit = data.get('applied_credit') or Decimal('0')
        if applied_credit:
            if not request or not request.user or not request.user.is_authenticated:
                raise serializers.ValidationError({
                    'applied_credit': 'Login required to use credits.'
                })

            # Compute gross total to ensure credits do not exceed
            nights = (data['check_out_date'] - data['check_in_date']).days
            nightly_rate = Decimal(str(data.get('nightly_rate') or 0))
            cleaning_fee = Decimal(str(data.get('cleaning_fee') or 0))
            tourist_tax = Decimal(str(data.get('tourist_tax') or 0))
            base_total = (nightly_rate * nights) + cleaning_fee + tourist_tax
            discount_amount = Decimal('0')
            if data.get('cancellation_policy') == 'non_refundable':
                discount_amount = (base_total * Decimal('0.10')).quantize(Decimal('0.01'))
            gross_total = base_total - discount_amount

            available = Decimal(str(request.user.get_available_credits()))
            if applied_credit > available:
                raise serializers.ValidationError({
                    'applied_credit': f'Max credits available: {available}'
                })

            if applied_credit > gross_total:
                # Cap to the booking total; avoid over-application
                applied_credit = gross_total

            data['applied_credit'] = applied_credit
        else:
            data['applied_credit'] = Decimal('0')

        return data

    def create(self, validated_data):
        request = self.context.get('request')
        first_name = validated_data.pop('first_name', '').strip()
        last_name = validated_data.pop('last_name', '').strip()
        guest_details = validated_data.pop('guest_details', [])
        applied_credit = validated_data.pop('applied_credit', Decimal('0'))

        if not validated_data.get('guest_name') and (first_name or last_name):
            validated_data['guest_name'] = f"{first_name} {last_name}".strip()

        booking = super().create(validated_data)

        if applied_credit and applied_credit > 0:
            booking.applied_credit = applied_credit
            booking.save(update_fields=['applied_credit', 'total_price', 'amount_due'])

            # Record credit usage for history/ledger
            from apps.users.models import ReferralCreditUsage
            ledger_user = booking.user or (request.user if request else None)

            if not ledger_user:
                raise serializers.ValidationError('Authenticated user required for credit usage.')

            ReferralCreditUsage.objects.create(
                user=ledger_user,
                booking=booking,
                amount=applied_credit
            )

        # Store cancellation flag for quick filtering
        booking.is_non_refundable = booking.cancellation_policy == 'non_refundable'
        booking.save(update_fields=['is_non_refundable'])

        # Create primary guest record
        primary_guest = BookingGuest.objects.create(
            booking=booking,
            is_primary=True,
            first_name=first_name or booking.guest_name.split(' ')[0] if booking.guest_name else '',
            last_name=last_name or ' '.join(booking.guest_name.split(' ')[1:]) if booking.guest_name else '',
            email=booking.guest_email,
            country_of_birth=booking.guest_country,
        )

        # Additional guest records (lite)
        for guest in guest_details:
            fn = str(guest.get('first_name', '')).strip()
            ln = str(guest.get('last_name', '')).strip()
            if not fn and not ln:
                continue
            BookingGuest.objects.create(
                booking=booking,
                is_primary=False,
                first_name=fn,
                last_name=ln or '',
                country_of_birth=str(guest.get('birth_country', '')).strip() or None,
                note=str(guest.get('note', '')).strip() or None,
                parent_guest=primary_guest,
                relationship=str(guest.get('relationship', '')).strip() or None,
            )

        return booking


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


# ============================================================================
# Check-in Guest Serializers (Alloggiati Web Compliance)
# ============================================================================

class BookingGuestSerializer(serializers.ModelSerializer):
    """
    Serializer for check-in guest data.

    For primary guest: email is required
    For other guests: email is optional

    Italian citizen requirements (country_of_birth = Italy):
    - birth_province required
    - birth_city required

    Italian-issued document requirements (document_issue_country = Italy):
    - document_issue_province required
    - document_issue_city required
    """

    class Meta:
        model = BookingGuest
        fields = [
            'id', 'booking', 'is_primary',
            'first_name', 'last_name', 'email', 'date_of_birth', 'country_of_birth',
            'birth_province', 'birth_city',
            'document_type', 'document_number', 'document_issue_date', 'document_expire_date',
            'document_issue_country', 'document_issue_province', 'document_issue_city',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'booking', 'created_at', 'updated_at']

    def validate(self, data):
        """Validate Italian-specific requirements."""
        country_of_birth = data.get('country_of_birth', '').lower()
        document_issue_country = data.get('document_issue_country', '').lower()

        # Italian citizen requirements
        if country_of_birth in ['italy', 'italia', 'it']:
            if not data.get('birth_province'):
                raise serializers.ValidationError({
                    'birth_province': 'Birth province is required for Italian citizens'
                })
            if not data.get('birth_city'):
                raise serializers.ValidationError({
                    'birth_city': 'Birth city is required for Italian citizens'
                })

        # Italian-issued document requirements
        if document_issue_country in ['italy', 'italia', 'it']:
            if not data.get('document_issue_province'):
                raise serializers.ValidationError({
                    'document_issue_province': 'Document issue province is required for Italian-issued documents'
                })
            if not data.get('document_issue_city'):
                raise serializers.ValidationError({
                    'document_issue_city': 'Document issue city is required for Italian-issued documents'
                })

        # Primary guest must have email
        if data.get('is_primary') and not data.get('email'):
            raise serializers.ValidationError({
                'email': 'Email is required for primary guest'
            })

        # Document expire date must be after issue date
        if data.get('document_expire_date') and data.get('document_issue_date'):
            if data['document_expire_date'] <= data['document_issue_date']:
                raise serializers.ValidationError({
                    'document_expire_date': 'Document expire date must be after issue date'
                })

        return data


class BookingGuestListSerializer(serializers.ModelSerializer):
    """Minimal serializer for guest lists."""

    class Meta:
        model = BookingGuest
        fields = [
            'id', 'is_primary', 'first_name', 'last_name', 'email',
            'date_of_birth', 'country_of_birth', 'document_type'
        ]
        read_only_fields = fields


class BookingWithGuestsSerializer(serializers.ModelSerializer):
    """Booking serializer with nested guests for check-in view."""
    guests = BookingGuestListSerializer(many=True, read_only=True)
    user_details = UserSerializer(source='user', read_only=True)

    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ['id', 'booking_id', 'nights', 'total_price', 'amount_due', 'created_at', 'updated_at']
