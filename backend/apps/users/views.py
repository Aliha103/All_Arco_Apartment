from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import login, logout
from django.db.models import Q
from .models import User, GuestNote, Role, Permission, PasswordResetToken
from .serializers import (
    UserSerializer, UserCreateSerializer, LoginSerializer, GuestNoteSerializer,
    UserWithRoleSerializer, RoleSerializer, PermissionSerializer
)
from .permissions import HasPermission


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """User registration endpoint."""
    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        login(request, user)
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """User login endpoint with audit logging."""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        login(request, user)

        # Create audit log entry for login
        from .models import AuditLog
        AuditLog.objects.create(
            user=user,
            role_at_time=user.role_name,
            action_type='auth.login',
            resource_type='user',
            resource_id=str(user.id),
            metadata={'email': user.email},
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
        )

        return Response(UserWithRoleSerializer(user).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """User logout endpoint."""
    logout(request)
    return Response({'message': 'Logged out successfully'})


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_view(request):
    """
    Password reset request endpoint.
    Generates a 6-digit code that expires in 10 minutes.
    Always returns success for security (don't reveal if email exists).
    """
    email = request.data.get('email', '').lower().strip()

    if not email:
        return Response({'message': 'If your email is registered, you will receive a password reset code.'})

    try:
        user = User.objects.get(email=email)

        # Create a secure reset token (invalidates any existing tokens)
        reset_token = PasswordResetToken.create_token(user)

        # Send password reset email with the code
        from apps.emails.services import send_password_reset_email
        send_password_reset_email(user, reset_token.token)

    except User.DoesNotExist:
        # Don't reveal that the email doesn't exist
        pass

    # Always return success message for security
    return Response({
        'message': 'If your email is registered, you will receive a password reset code.'
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    """
    Password reset confirmation endpoint.
    Verifies the 6-digit code and sets the new password.

    Security:
    - Code must match the email that requested it
    - Code expires after 10 minutes
    - Code is one-time use only
    """
    email = request.data.get('email', '').lower().strip()
    code = request.data.get('code', '').strip()
    new_password = request.data.get('new_password', '')

    # Validate required fields
    if not email or not code or not new_password:
        return Response(
            {'error': 'Email, code, and new password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate password length
    if len(new_password) < 8:
        return Response(
            {'error': 'Password must be at least 8 characters.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verify the token
    reset_token, error = PasswordResetToken.verify_token(email, code)

    if error:
        return Response(
            {'error': error},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Set the new password
    user = reset_token.user
    user.set_password(new_password)
    user.save()

    # Mark token as used (prevents reuse)
    reset_token.mark_used()

    # Create audit log entry
    from .models import AuditLog
    AuditLog.objects.create(
        user=user,
        role_at_time=user.role_name,
        action_type='auth.password_reset',
        resource_type='user',
        resource_id=str(user.id),
        metadata={'email': user.email, 'method': 'code_verification'},
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
    )

    return Response({
        'message': 'Password has been reset successfully. You can now log in with your new password.'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    Get current authenticated user with role and permissions.

    Returns:
        - User details (id, email, name, phone)
        - role_info: Full role object with name, slug, is_super_admin
        - permissions: Array of permission codes user has
        - is_super_admin: Boolean flag
        - is_team_member: Boolean flag

    This endpoint is used by the frontend to:
    1. Display user info in header
    2. Store permissions in Zustand store
    3. Enable/disable UI elements based on permissions
    """
    return Response(UserWithRoleSerializer(request.user).data)


class GuestViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing guests (team/admin only)."""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Only team/admin can view guests
        if not request.user.is_team_member():
            return User.objects.none()
        
        queryset = User.objects.filter(role='guest')
        
        # Search
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['get'])
    def notes(self, request, pk=None):
        """Get notes for a specific guest."""
        guest = self.get_object()
        notes = GuestNote.objects.filter(guest=guest)
        serializer = GuestNoteSerializer(notes, many=True)
        return Response(serializer.data)


class TeamViewSet(viewsets.ModelViewSet):
    """ViewSet for managing team members (admin only)."""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Only admin can view/manage team
        if request.user.role != 'admin':
            return User.objects.none()
        
        return User.objects.filter(role__in=['team', 'admin']).order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        # Only admin can create team members
        if request.user.role != 'admin':
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # TODO: Send invitation email
            return Response(
                UserSerializer(user).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# RBAC Management ViewSets
# ============================================================================

class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing available permissions.
    Read-only - permissions are system-defined and cannot be created/edited by users.

    Requires roles.manage permission.
    """
    queryset = Permission.objects.all().order_by('group', 'code')
    serializer_class = PermissionSerializer
    permission_classes = [HasPermission]
    required_permission = 'roles.manage'

    @action(detail=False, methods=['get'], url_path='by-group')
    def by_group(self, request):
        """
        Get permissions grouped by feature area.

        Returns:
            {
                "bookings": [
                    {"id": "...", "code": "bookings.view", "description": "..."},
                    ...
                ],
                "payments": [...],
                ...
            }
        """
        permissions = Permission.objects.all().order_by('group', 'code')
        grouped = {}

        for perm in permissions:
            if perm.group not in grouped:
                grouped[perm.group] = []
            grouped[perm.group].append({
                'id': str(perm.id),
                'code': perm.code,
                'description': perm.description,
                'group': perm.group,
            })

        return Response(grouped)


class RoleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for role management.

    Super Admin can:
    - List all roles
    - View role details with permissions and member count
    - Create new roles
    - Update role details and permissions
    - Delete roles (if not system roles and have no members)

    Requires roles.manage permission for all actions.
    """
    queryset = Role.objects.all().order_by('name')
    serializer_class = RoleSerializer
    permission_classes = [HasPermission]
    required_permission = 'roles.manage'

    def perform_create(self, serializer):
        """Create role with audit logging."""
        role = serializer.save()

        # Create audit log entry
        from .models import AuditLog
        AuditLog.objects.create(
            user=self.request.user,
            role_at_time=self.request.user.role_name,
            action_type='role.created',
            resource_type='role',
            resource_id=str(role.id),
            metadata={
                'role_name': role.name,
                'role_slug': role.slug,
                'is_system': role.is_system,
                'is_super_admin': role.is_super_admin,
            },
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')[:255]
        )

        return role

    def perform_update(self, serializer):
        """Update role with audit logging."""
        old_data = {
            'name': serializer.instance.name,
            'description': serializer.instance.description,
            'permission_codes': serializer.instance.get_permission_codes(),
        }

        role = serializer.save()

        # Create audit log entry
        from .models import AuditLog
        AuditLog.objects.create(
            user=self.request.user,
            role_at_time=self.request.user.role_name,
            action_type='role.updated',
            resource_type='role',
            resource_id=str(role.id),
            metadata={
                'role_name': role.name,
                'role_slug': role.slug,
                'old_data': old_data,
                'new_data': {
                    'name': role.name,
                    'description': role.description,
                    'permission_codes': role.get_permission_codes(),
                },
            },
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')[:255]
        )

        return role

    def perform_destroy(self, instance):
        """Delete role with validation and audit logging."""
        # Validate role can be deleted
        if not instance.can_be_deleted():
            from rest_framework.exceptions import ValidationError
            if instance.is_system:
                raise ValidationError({'error': 'Cannot delete system roles'})
            elif instance.get_member_count() > 0:
                raise ValidationError({
                    'error': f'Cannot delete role with {instance.get_member_count()} assigned members'
                })

        # Store data for audit log
        role_data = {
            'role_name': instance.name,
            'role_slug': instance.slug,
            'member_count': instance.get_member_count(),
        }

        role_id = str(instance.id)
        instance.delete()

        # Create audit log entry
        from .models import AuditLog
        AuditLog.objects.create(
            user=self.request.user,
            role_at_time=self.request.user.role_name,
            action_type='role.deleted',
            resource_type='role',
            resource_id=role_id,
            metadata=role_data,
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')[:255]
        )

    @action(detail=True, methods=['post'], url_path='assign-permissions')
    def assign_permissions(self, request, pk=None):
        """
        Assign permissions to a role.

        Request body:
            {
                "permission_codes": ["bookings.view", "bookings.create", ...]
            }

        Sets the role's permissions to exactly the provided list.
        """
        role = self.get_object()

        # Validate role can be modified
        if role.is_super_admin:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'error': 'Cannot modify Super Admin role permissions (has all implicitly)'})

        permission_codes = request.data.get('permission_codes', [])

        # Get permission objects
        permissions = Permission.objects.filter(code__in=permission_codes)

        # Store old permissions for audit log
        old_permission_codes = role.get_permission_codes()

        # Set permissions (clears existing and sets new)
        role.permissions.set(permissions)

        # Create audit log entry
        from .models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            role_at_time=request.user.role_name,
            action_type='role.permissions_changed',
            resource_type='role',
            resource_id=str(role.id),
            metadata={
                'role_name': role.name,
                'old_permissions': old_permission_codes,
                'new_permissions': list(permission_codes),
                'added': list(set(permission_codes) - set(old_permission_codes)),
                'removed': list(set(old_permission_codes) - set(permission_codes)),
            },
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
        )

        serializer = self.get_serializer(role)
        return Response({
            'message': 'Permissions updated successfully',
            'role': serializer.data
        })


# ============================================================================
# RBAC Seed Endpoint (for initial setup)
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def seed_rbac_data(request):
    """
    Seed initial permissions and roles.

    This endpoint creates:
    - All system permissions organized by feature groups
    - Default system roles (Super Admin, Front Desk, Accounting, Housekeeping)

    Can only be run by superuser or existing super admin.
    Safe to run multiple times (idempotent).
    """
    # Only allow superuser or super admin
    if not (request.user.is_superuser or request.user.is_super_admin()):
        return Response(
            {'error': 'Only superuser can seed RBAC data'},
            status=status.HTTP_403_FORBIDDEN
        )

    from django.db import transaction
    from django.utils.text import slugify

    created_permissions = []
    created_roles = []

    with transaction.atomic():
        # Define all permissions
        permissions_data = [
            # Bookings
            ('bookings.view', 'bookings', 'View bookings and calendar'),
            ('bookings.create', 'bookings', 'Create new bookings'),
            ('bookings.update', 'bookings', 'Update booking details'),
            ('bookings.delete', 'bookings', 'Delete bookings'),
            ('bookings.cancel', 'bookings', 'Cancel bookings'),
            ('bookings.mark_no_show', 'bookings', 'Mark bookings as no-show'),

            # Payments
            ('payments.view', 'payments', 'View payments and invoices'),
            ('payments.create', 'payments', 'Process payments'),
            ('payments.refund', 'payments', 'Issue refunds'),
            ('payments.export', 'payments', 'Export payment reports'),

            # Guests
            ('guests.view', 'guests', 'View guest information'),
            ('guests.update', 'guests', 'Update guest details'),
            ('guests.notes', 'guests', 'Add/view guest notes'),
            ('guests.export', 'guests', 'Export guest data'),

            # Pricing
            ('pricing.view', 'pricing', 'View pricing settings'),
            ('pricing.update', 'pricing', 'Update pricing settings'),
            ('pricing.rules_manage', 'pricing', 'Manage pricing rules'),

            # Team
            ('team.view', 'team', 'View team members'),
            ('team.invite', 'team', 'Invite team members'),
            ('team.update', 'team', 'Update team member details'),
            ('team.deactivate', 'team', 'Deactivate team members'),

            # Roles
            ('roles.manage', 'team', 'Manage roles and permissions'),

            # Reports
            ('reports.view', 'reports', 'View reports and analytics'),
            ('reports.export', 'reports', 'Export reports'),
            ('reports.audit_logs', 'reports', 'View audit logs'),
        ]

        # Create permissions
        for code, group, description in permissions_data:
            permission, created = Permission.objects.get_or_create(
                code=code,
                defaults={
                    'group': group,
                    'description': description
                }
            )
            if created:
                created_permissions.append(code)

        # Define default roles with their permissions
        roles_data = [
            {
                'name': 'Super Admin',
                'slug': 'super_admin',
                'description': 'Full system access with all permissions',
                'is_system': True,
                'is_super_admin': True,
                'permissions': []  # Has all implicitly
            },
            {
                'name': 'Front Desk',
                'slug': 'front_desk',
                'description': 'Manage bookings, guests, and check-ins',
                'is_system': True,
                'is_super_admin': False,
                'permissions': [
                    'bookings.view', 'bookings.create', 'bookings.update',
                    'bookings.cancel', 'bookings.mark_no_show',
                    'guests.view', 'guests.update', 'guests.notes',
                    'payments.view', 'pricing.view',
                ]
            },
            {
                'name': 'Accounting',
                'slug': 'accounting',
                'description': 'Manage payments, refunds, and financial reports',
                'is_system': True,
                'is_super_admin': False,
                'permissions': [
                    'bookings.view', 'guests.view',
                    'payments.view', 'payments.create', 'payments.refund', 'payments.export',
                    'pricing.view', 'reports.view', 'reports.export',
                ]
            },
            {
                'name': 'Housekeeping',
                'slug': 'housekeeping',
                'description': 'View bookings and check-in/out status',
                'is_system': True,
                'is_super_admin': False,
                'permissions': [
                    'bookings.view', 'guests.view',
                ]
            },
        ]

        # Create roles
        for role_data in roles_data:
            permission_codes = role_data.pop('permissions')
            role, created = Role.objects.get_or_create(
                slug=role_data['slug'],
                defaults=role_data
            )

            if created:
                created_roles.append(role.name)

            # Assign permissions (skip for super admin)
            if not role.is_super_admin and permission_codes:
                permissions = Permission.objects.filter(code__in=permission_codes)
                role.permissions.set(permissions)

    return Response({
        'message': 'RBAC data seeded successfully',
        'created_permissions': created_permissions,
        'created_roles': created_roles,
        'total_permissions': Permission.objects.count(),
        'total_roles': Role.objects.count(),
    })
