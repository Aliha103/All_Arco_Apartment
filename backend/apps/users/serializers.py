from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, GuestNote, Role, Permission, HostProfile, Review
from .models_compensation import TeamCompensation


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone', 'country',
            'date_of_birth', 'role', 'is_active', 'created_at', 'updated_at', 'last_login'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_login']


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.

    Required: email, password, first_name, last_name, country
    Optional: phone, date_of_birth, invitation_code (referral code)
    """
    password = serializers.CharField(write_only=True, min_length=8)
    country = serializers.CharField(required=True, max_length=100)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    invitation_code = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'first_name', 'last_name', 'phone', 'country', 'date_of_birth', 'invitation_code']

    def validate_invitation_code(self, value):
        """Validate that the invitation code exists if provided."""
        if value:
            try:
                User.objects.get(reference_code=value.strip().upper())
            except User.DoesNotExist:
                raise serializers.ValidationError('Invalid invitation code. Please check and try again.')
        return value.strip().upper() if value else None

    def create(self, validated_data):
        invitation_code = validated_data.pop('invitation_code', None)
        normalized_email = validated_data['email'].strip().lower()

        user = User.objects.create_user(
            email=normalized_email,
            username=normalized_email,
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone', ''),
            country=validated_data.get('country', ''),
            date_of_birth=validated_data.get('date_of_birth')
        )
        # legacy_role defaults to 'guest' automatically via model default

        # Handle invitation code
        if invitation_code:
            try:
                referrer = User.objects.get(reference_code=invitation_code)
                user.referred_by = referrer
                user.save(update_fields=['referred_by'])
            except User.DoesNotExist:
                pass  # Already validated above

        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for login."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        
        if email and password:
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError('Invalid credentials')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled')
            data['user'] = user
        else:
            raise serializers.ValidationError('Must include "email" and "password"')
        
        return data


class GuestNoteSerializer(serializers.ModelSerializer):
    """Serializer for GuestNote model."""
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GuestNote
        fields = ['id', 'guest', 'note', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None


# ============================================================================
# Team Compensation Serializers
# ============================================================================

class TeamCompensationSerializer(serializers.ModelSerializer):
    """Serializer for TeamCompensation model."""

    class Meta:
        model = TeamCompensation
        fields = [
            'id', 'user', 'compensation_type',
            'salary_method', 'fixed_amount_per_checkout', 'percentage_on_base_price',
            'profit_share_timing', 'profit_share_percentage',
            'notes', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """Validate compensation configuration."""
        compensation_type = data.get('compensation_type')

        if compensation_type == 'salary':
            salary_method = data.get('salary_method')
            if not salary_method:
                raise serializers.ValidationError({'salary_method': 'Salary method is required for salary-based compensation'})

            if salary_method == 'per_checkout' and not data.get('fixed_amount_per_checkout'):
                raise serializers.ValidationError({'fixed_amount_per_checkout': 'Fixed amount is required for per-checkout salary'})

            if salary_method == 'percentage_base_price' and not data.get('percentage_on_base_price'):
                raise serializers.ValidationError({'percentage_on_base_price': 'Percentage is required for percentage-based salary'})

        elif compensation_type == 'profit_share':
            if not data.get('profit_share_timing'):
                raise serializers.ValidationError({'profit_share_timing': 'Profit share timing is required'})

            if not data.get('profit_share_percentage'):
                raise serializers.ValidationError({'profit_share_percentage': 'Profit share percentage is required'})

        return data


class TeamMemberSerializer(serializers.ModelSerializer):
    """Enhanced serializer for team members with compensation and activation dates."""
    role_name = serializers.SerializerMethodField()
    assigned_role_name = serializers.SerializerMethodField()
    compensation = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone',
            'role', 'assigned_role_id', 'role_name', 'assigned_role_name',
            'is_active', 'activation_start_date', 'activation_end_date',
            'compensation', 'created_at', 'updated_at', 'last_login'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_login']

    def get_role_name(self, obj):
        """Get role name for display."""
        return obj.role_name

    def get_assigned_role_name(self, obj):
        """Get assigned role name."""
        if obj.assigned_role:
            return obj.assigned_role.name
        return None

    def get_compensation(self, obj):
        """Get compensation data if exists, otherwise return None."""
        try:
            if hasattr(obj, 'compensation'):
                return TeamCompensationSerializer(obj.compensation).data
        except Exception:
            pass
        return None

    def to_representation(self, instance):
        """
        Safely serialize even if related tables are missing (migrations pending).
        """
        try:
            return super().to_representation(instance)
        except Exception:
            data = super().to_representation(instance)
            data['compensation'] = None
            return data


class TeamMemberInviteSerializer(serializers.Serializer):
    """Serializer for inviting team members with compensation configuration."""
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True, max_length=50)
    last_name = serializers.CharField(required=True, max_length=50)
    assigned_role_id = serializers.UUIDField(required=True)

    # Activation period
    activation_start_date = serializers.DateField(required=False, allow_null=True)
    activation_end_date = serializers.DateField(required=False, allow_null=True)

    # Compensation configuration
    compensation_type = serializers.ChoiceField(
        choices=['salary', 'profit_share'],
        required=False,
        allow_null=True
    )

    # Salary fields
    salary_method = serializers.ChoiceField(
        choices=['per_checkout', 'percentage_base_price'],
        required=False,
        allow_null=True
    )
    fixed_amount_per_checkout = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    percentage_on_base_price = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True
    )

    # Profit share fields
    profit_share_timing = serializers.ChoiceField(
        choices=['before_expenses', 'after_expenses', 'after_expenses_and_salaries'],
        required=False,
        allow_null=True
    )
    profit_share_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True
    )

    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        """Validate invitation data."""
        # Validate activation dates
        if data.get('activation_start_date') and data.get('activation_end_date'):
            if data['activation_end_date'] <= data['activation_start_date']:
                raise serializers.ValidationError({
                    'activation_end_date': 'End date must be after start date'
                })

        # Validate compensation if provided
        compensation_type = data.get('compensation_type')
        if compensation_type:
            if compensation_type == 'salary':
                salary_method = data.get('salary_method')
                if not salary_method:
                    raise serializers.ValidationError({
                        'salary_method': 'Salary method is required for salary-based compensation'
                    })

                if salary_method == 'per_checkout' and not data.get('fixed_amount_per_checkout'):
                    raise serializers.ValidationError({
                        'fixed_amount_per_checkout': 'Fixed amount is required for per-checkout salary'
                    })

                if salary_method == 'percentage_base_price' and not data.get('percentage_on_base_price'):
                    raise serializers.ValidationError({
                        'percentage_on_base_price': 'Percentage is required for percentage-based salary'
                    })

            elif compensation_type == 'profit_share':
                if not data.get('profit_share_timing'):
                    raise serializers.ValidationError({
                        'profit_share_timing': 'Profit share timing is required'
                    })

                if not data.get('profit_share_percentage'):
                    raise serializers.ValidationError({
                        'profit_share_percentage': 'Profit share percentage is required'
                    })

        return data


# ============================================================================
# RBAC Serializers
# ============================================================================

class PermissionSerializer(serializers.ModelSerializer):
    """Serializer for Permission model."""

    class Meta:
        model = Permission
        fields = ['id', 'code', 'group', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class RoleSerializer(serializers.ModelSerializer):
    """Serializer for Role model."""
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_codes = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    can_be_deleted = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            'id', 'name', 'slug', 'description',
            'is_system', 'is_super_admin',
            'permissions', 'permission_codes',
            'member_count', 'can_be_deleted',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_permission_codes(self, obj):
        """Get list of permission codes for this role."""
        return obj.get_permission_codes()

    def get_member_count(self, obj):
        """Get count of users assigned to this role."""
        return obj.get_member_count()

    def get_can_be_deleted(self, obj):
        """Check if this role can be deleted."""
        return obj.can_be_deleted()


class UserWithRoleSerializer(serializers.ModelSerializer):
    """
    Enhanced user serializer for /api/me endpoint.
    Includes full role object, permissions array, and invitation info.
    """
    role_info = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    is_super_admin = serializers.SerializerMethodField()
    is_team_member = serializers.SerializerMethodField()
    reference_code = serializers.CharField(read_only=True)
    invited_count = serializers.SerializerMethodField()
    referral_credits_earned = serializers.SerializerMethodField()
    referred_by_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone', 'country', 'date_of_birth',
            'reference_code', 'invited_count', 'referral_credits_earned', 'referred_by_name',
            'role_info', 'permissions',
            'is_super_admin', 'is_team_member',
            'is_active', 'created_at', 'updated_at', 'last_login'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_login']

    def get_role_info(self, obj):
        """
        Get role information.
        Returns full Role object if using new RBAC, or legacy role info.
        """
        if obj.assigned_role:
            # New RBAC system
            return {
                'id': str(obj.assigned_role.id),
                'name': obj.assigned_role.name,
                'slug': obj.assigned_role.slug,
                'description': obj.assigned_role.description,
                'is_super_admin': obj.assigned_role.is_super_admin,
                'is_system': obj.assigned_role.is_system,
            }
        else:
            # Legacy role system
            return {
                'id': None,
                'name': obj.role_name,
                'slug': obj.role_slug,
                'description': '',
                'is_super_admin': obj.legacy_role == 'admin',
                'is_system': True,
            }

    def get_permissions(self, obj):
        """Get array of permission codes user has."""
        return obj.get_all_permissions()

    def get_is_super_admin(self, obj):
        """Check if user is super admin."""
        return obj.is_super_admin()

    def get_is_team_member(self, obj):
        """Check if user is team member."""
        return obj.is_team_member()

    def get_invited_count(self, obj):
        """Get count of people this user has invited."""
        return obj.get_invited_count()

    def get_referral_credits_earned(self, obj):
        """Get total referral credits earned."""
        return float(obj.get_referral_credits_earned())

    def get_referred_by_name(self, obj):
        """Get name of user who referred this user."""
        if obj.referred_by:
            return obj.referred_by.get_full_name()
        return None


class HostProfileSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = HostProfile
        fields = [
            'id',
            'display_name',
            'bio',
            'languages',
            'avatar',
            'avatar_url',
            'photo_url',
            'is_superhost',
            'review_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'photo_url']

    def get_photo_url(self, obj):
        return obj.photo_url


class ReviewSerializer(serializers.ModelSerializer):
    """
    Basic review serializer for public display (homepage).
    Only includes approved, active reviews with essential fields.
    """
    category_ratings = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id', 'guest_name', 'location', 'rating', 'title', 'text',
            'stay_date', 'is_featured', 'is_active', 'created_at', 'updated_at',
            'category_ratings'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_category_ratings(self, obj):
        """Return category ratings as a dictionary."""
        return {
            'cleanliness': float(obj.rating_cleanliness) if obj.rating_cleanliness else None,
            'communication': float(obj.rating_communication) if obj.rating_communication else None,
            'checkin': float(obj.rating_checkin) if obj.rating_checkin else None,
            'accuracy': float(obj.rating_accuracy) if obj.rating_accuracy else None,
            'location': float(obj.rating_location) if obj.rating_location else None,
            'value': float(obj.rating_value) if obj.rating_value else None,
        }

    def validate_rating(self, value):
        if value is None:
            raise serializers.ValidationError('Rating is required')
        if value < 0 or value > 10:
            raise serializers.ValidationError('Rating must be between 0 and 10')
        return value


class ReviewDetailSerializer(serializers.ModelSerializer):
    """
    Detailed review serializer for PMS.
    Includes all fields including approval workflow data.
    """
    category_ratings = serializers.SerializerMethodField()
    submitted_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    rejected_by_name = serializers.SerializerMethodField()
    edited_by_name = serializers.SerializerMethodField()
    booking_info = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id', 'guest_name', 'location', 'rating', 'title', 'text',
            'stay_date', 'is_featured', 'is_active',
            'status', 'ota_source',
            'booking', 'booking_info',
            'rating_cleanliness', 'rating_communication', 'rating_checkin',
            'rating_accuracy', 'rating_location', 'rating_value',
            'category_ratings',
            'submitted_by', 'submitted_by_name',
            'approved_by', 'approved_by_name', 'approved_at',
            'rejected_by', 'rejected_by_name', 'rejected_at', 'rejection_reason',
            'edited_by', 'edited_by_name', 'edited_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'submitted_by', 'approved_by', 'approved_at',
            'rejected_by', 'rejected_at', 'edited_by', 'edited_at'
        ]

    def get_category_ratings(self, obj):
        """Return category ratings as a dictionary."""
        return {
            'cleanliness': float(obj.rating_cleanliness) if obj.rating_cleanliness else None,
            'communication': float(obj.rating_communication) if obj.rating_communication else None,
            'checkin': float(obj.rating_checkin) if obj.rating_checkin else None,
            'accuracy': float(obj.rating_accuracy) if obj.rating_accuracy else None,
            'location': float(obj.rating_location) if obj.rating_location else None,
            'value': float(obj.rating_value) if obj.rating_value else None,
        }

    def get_submitted_by_name(self, obj):
        return obj.submitted_by.get_full_name() if obj.submitted_by else None

    def get_approved_by_name(self, obj):
        return obj.approved_by.get_full_name() if obj.approved_by else None

    def get_rejected_by_name(self, obj):
        return obj.rejected_by.get_full_name() if obj.rejected_by else None

    def get_edited_by_name(self, obj):
        return obj.edited_by.get_full_name() if obj.edited_by else None

    def get_booking_info(self, obj):
        """Return basic booking information if linked."""
        if obj.booking:
            return {
                'id': str(obj.booking.id),
                'booking_code': obj.booking.booking_id,
                'guest_email': obj.booking.guest_email,
                'check_in_date': obj.booking.check_in_date,
                'check_out_date': obj.booking.check_out_date,
            }
        return None


class ReviewCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for manual review creation by staff.
    Auto-approves and sets the staff member as both submitted_by and approved_by.
    """
    booking_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Review
        fields = [
            'guest_name', 'location', 'title', 'text', 'stay_date',
            'rating_cleanliness', 'rating_communication', 'rating_checkin',
            'rating_accuracy', 'rating_location', 'rating_value',
            'ota_source', 'booking_id', 'is_featured'
        ]

    def validate(self, data):
        """Validate that all category ratings are provided."""
        required_ratings = [
            'rating_cleanliness', 'rating_communication', 'rating_checkin',
            'rating_accuracy', 'rating_location', 'rating_value'
        ]
        for rating_field in required_ratings:
            rating_value = data.get(rating_field)
            if rating_value is None:
                raise serializers.ValidationError(f'{rating_field} is required')
            if rating_value < 0 or rating_value > 10:
                raise serializers.ValidationError(f'{rating_field} must be between 0 and 10')
        return data

    def create(self, validated_data):
        """Create review with auto-approval for staff-created reviews."""
        from apps.bookings.models import Booking
        from django.utils import timezone

        booking_id = validated_data.pop('booking_id', None)
        user = self.context['request'].user

        # Create review instance
        review = Review(**validated_data)

        # Calculate overall rating from category ratings
        review.calculate_overall_rating()

        # Auto-approve staff-created reviews
        review.status = 'approved'
        review.submitted_by = user
        review.approved_by = user
        review.approved_at = timezone.now()
        review.is_active = True

        # Link to booking if provided
        if booking_id:
            try:
                booking = Booking.objects.get(id=booking_id)
                review.booking = booking
                # Auto-populate OTA source from booking
                if not validated_data.get('ota_source'):
                    review.ota_source = booking.booking_source
                # Mark booking as having a review
                booking.review_submitted = True
                booking.save(update_fields=['review_submitted'])
            except Booking.DoesNotExist:
                pass

        review.save()
        return review


class ReviewSubmitSerializer(serializers.Serializer):
    """
    Serializer for public guest review submission via email link.
    Creates review with status='pending' for approval.
    """
    token = serializers.CharField(required=True)
    booking_code = serializers.CharField(required=True)
    guest_name = serializers.CharField(max_length=150, required=True, min_length=2)
    location = serializers.CharField(max_length=150, required=False, allow_blank=True)
    title = serializers.CharField(max_length=200, required=True, min_length=5)
    text = serializers.CharField(required=True, min_length=50, max_length=2000)
    rating_cleanliness = serializers.DecimalField(max_digits=3, decimal_places=1, required=True)
    rating_communication = serializers.DecimalField(max_digits=3, decimal_places=1, required=True)
    rating_checkin = serializers.DecimalField(max_digits=3, decimal_places=1, required=True)
    rating_accuracy = serializers.DecimalField(max_digits=3, decimal_places=1, required=True)
    rating_location = serializers.DecimalField(max_digits=3, decimal_places=1, required=True)
    rating_value = serializers.DecimalField(max_digits=3, decimal_places=1, required=True)

    def validate(self, data):
        """Validate token, booking code, and ratings."""
        from apps.bookings.models import Booking
        from django.utils import timezone

        token = data.get('token')
        booking_code = data.get('booking_code')

        # Validate token exists
        try:
            booking = Booking.objects.get(review_token=token)
        except Booking.DoesNotExist:
            raise serializers.ValidationError({'token': 'Invalid or expired review link'})

        # Validate token not expired
        if not booking.is_review_token_valid():
            raise serializers.ValidationError({'token': 'This review link has expired'})

        # Validate booking code matches
        if booking.booking_id != booking_code.upper():
            raise serializers.ValidationError({'booking_code': 'Incorrect booking code'})

        # Validate not already submitted
        if booking.review_submitted:
            raise serializers.ValidationError({'token': 'You have already submitted a review for this booking'})

        # Validate all category ratings are 0-10
        rating_fields = ['rating_cleanliness', 'rating_communication', 'rating_checkin',
                        'rating_accuracy', 'rating_location', 'rating_value']
        for field in rating_fields:
            value = data.get(field)
            if value < 0 or value > 10:
                raise serializers.ValidationError({field: 'Rating must be between 0 and 10'})

        data['booking'] = booking
        return data

    def create(self, validated_data):
        """Create review with status='pending' for approval."""
        booking = validated_data.pop('booking')
        validated_data.pop('token')
        validated_data.pop('booking_code')

        # Create review instance
        review = Review(
            guest_name=validated_data['guest_name'],
            location=validated_data.get('location', ''),
            title=validated_data['title'],
            text=validated_data['text'],
            stay_date=booking.check_in_date,
            rating_cleanliness=validated_data['rating_cleanliness'],
            rating_communication=validated_data['rating_communication'],
            rating_checkin=validated_data['rating_checkin'],
            rating_accuracy=validated_data['rating_accuracy'],
            rating_location=validated_data['rating_location'],
            rating_value=validated_data['rating_value'],
            booking=booking,
            ota_source=booking.booking_source,
            status='pending',
            is_active=False,  # Not visible until approved
        )

        # Calculate overall rating
        review.calculate_overall_rating()
        review.save()

        # Mark booking as having submitted review
        booking.review_submitted = True
        booking.save(update_fields=['review_submitted'])

        return review


class ReviewApproveSerializer(serializers.Serializer):
    """Serializer for approving a review."""
    pass  # No additional fields needed


class ReviewRejectSerializer(serializers.Serializer):
    """Serializer for rejecting a review with reason."""
    rejection_reason = serializers.CharField(
        required=True,
        min_length=10,
        max_length=500,
        error_messages={
            'required': 'Rejection reason is required',
            'min_length': 'Rejection reason must be at least 10 characters',
        }
    )
