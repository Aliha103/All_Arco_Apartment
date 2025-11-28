from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, GuestNote, Role, Permission


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
        fields = ['email', 'password', 'first_name', 'last_name', 'phone', 'country', 'date_of_birth', 'invitation_code', 'role']

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

        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone', ''),
            country=validated_data.get('country', ''),
            date_of_birth=validated_data.get('date_of_birth'),
            role=validated_data.get('role', 'guest')
        )

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
