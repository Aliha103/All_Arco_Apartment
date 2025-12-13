from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, SAFE_METHODS
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction, DatabaseError
from django.db.models import Q
from .models import User, GuestNote, Role, Permission, PasswordResetToken, HostProfile, Review
from apps.bookings.models import Booking, BookingGuest
from .serializers import (
    UserSerializer, UserCreateSerializer, LoginSerializer, GuestNoteSerializer,
    UserWithRoleSerializer, RoleSerializer, PermissionSerializer,
    HostProfileSerializer, ReviewSerializer, ReviewDetailSerializer,
    ReviewCreateSerializer, ReviewSubmitSerializer, ReviewApproveSerializer,
    ReviewRejectSerializer
)
from .permissions import HasPermission, IsSuperAdmin


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """User registration endpoint."""
    import logging
    from django.db import IntegrityError

    logger = logging.getLogger(__name__)

    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        try:
            user = serializer.save()
            login(request, user)

            # Log successful registration (info level)
            logger.info(
                f"User registered successfully: {user.email}",
                extra={
                    'user_id': str(user.id),
                    'email': user.email,
                    'ip_address': request.META.get('REMOTE_ADDR'),
                }
            )

            return Response(
                UserSerializer(user).data,
                status=status.HTTP_201_CREATED
            )

        except IntegrityError as e:
            # Database constraint violation (duplicate email/username despite validation)
            logger.error(
                f"Registration IntegrityError: {str(e)}",
                extra={
                    'email': request.data.get('email'),
                    'error': str(e),
                    'ip_address': request.META.get('REMOTE_ADDR'),
                },
                exc_info=True
            )
            return Response(
                {'error': 'An account with this email already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception as e:
            # Catch any other unexpected errors
            logger.error(
                f"Unexpected registration error: {str(e)}",
                extra={
                    'email': request.data.get('email'),
                    'error_type': type(e).__name__,
                    'error': str(e),
                    'ip_address': request.META.get('REMOTE_ADDR'),
                },
                exc_info=True
            )
            return Response(
                {'error': 'An error occurred during registration. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
    response = Response({'message': 'Logged out successfully'})

    # Explicitly delete session cookies
    response.delete_cookie('sessionid', path='/', samesite='Lax')
    response.delete_cookie('csrftoken', path='/', samesite='Lax')

    # Add cache control headers to prevent caching
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, private'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'

    return response


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

    # Verify the token
    reset_token, error = PasswordResetToken.verify_token(email, code)

    if error:
        return Response(
            {'error': error},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate password using Django's validators
    try:
        validate_password(new_password, user=reset_token.user)
    except DjangoValidationError as e:
        return Response(
            {'error': '; '.join(e.messages)},
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


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    Get or update current authenticated user with role and permissions.

    GET:
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

    PATCH:
        Updates user profile fields (first_name, last_name, phone, date_of_birth, country)
        Email cannot be changed through this endpoint for security.
    """
    if request.method == 'GET':
        return Response(UserWithRoleSerializer(request.user).data)

    elif request.method == 'PATCH':
        user = request.user

        # Fields that can be updated
        updatable_fields = ['first_name', 'last_name', 'phone', 'date_of_birth', 'country']

        # Update only provided fields
        for field in updatable_fields:
            if field in request.data:
                value = request.data[field]
                # Convert empty strings to None for optional fields
                if value == '' and field in ['phone', 'date_of_birth', 'country']:
                    value = None
                setattr(user, field, value)

        # Validate and save
        try:
            user.full_clean()
            user.save()

            # Create audit log entry
            from .models import AuditLog
            AuditLog.objects.create(
                user=user,
                role_at_time=user.role_name,
                action_type='user.profile_updated',
                resource_type='user',
                resource_id=str(user.id),
                metadata={'updated_fields': list(request.data.keys())},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
            )

            return Response(UserWithRoleSerializer(user).data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class GuestViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing guests (team/admin only)."""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request, *args, **kwargs):
        """
        Return merged guests:
        - Registered users with guest role
        - Unique guest emails from bookings (even if not registered)
        - Booking guest records (online check-ins)
        """
        if not request.user.is_team_member():
            return Response([])

        search = request.query_params.get('search', '').strip()

        # Registered guests
        registered = self.get_queryset()
        if search:
            registered = registered.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone__icontains=search)
            )

        merged = {}

        for user in registered:
            key = (user.email or '').lower()
            merged[key] = {
                'id': str(user.id),
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'phone': user.phone,
                'total_bookings': 0,
                'total_spent': 0.0,
                'total_guests_count': 0,
                'online_bookings': 0,
            }

        # Guests derived from bookings (captures non-registered)
        bookings_qs = Booking.objects.all()
        if search:
            bookings_qs = bookings_qs.filter(
                Q(guest_email__icontains=search) |
                Q(guest_name__icontains=search) |
                Q(guest_phone__icontains=search)
            )

        for booking in bookings_qs:
            key = (booking.guest_email or '').lower()
            if not key:
                continue

            entry = merged.get(key, {
                # deterministic synthetic id for non-registered guests
                'id': f"booking-{booking.id}",
                'first_name': '',
                'last_name': '',
                'email': booking.guest_email,
                'phone': booking.guest_phone,
                'total_bookings': 0,
                'total_spent': 0.0,
                'total_guests_count': 0,
                'online_bookings': 0,
                'eta_checkin_time': booking.eta_checkin_time,
                'eta_checkout_time': booking.eta_checkout_time,
            })

            # Split guest_name into first/last if missing
            if not entry['first_name'] and booking.guest_name:
                parts = booking.guest_name.split(' ', 1)
                entry['first_name'] = parts[0]
                entry['last_name'] = parts[1] if len(parts) > 1 else ''

            entry['phone'] = entry['phone'] or booking.guest_phone
            entry['total_bookings'] = entry.get('total_bookings', 0) + 1
            entry['total_spent'] = entry.get('total_spent', 0.0) + float(booking.total_price or 0)
            entry['total_guests_count'] = entry.get('total_guests_count', 0) + (booking.number_of_guests or 0)

            # Track latest booking code for quick access in UI
            checkin_date = getattr(booking, 'check_in_date', None) or getattr(booking, 'check_in', None)
            code = getattr(booking, 'booking_id', None) or getattr(booking, 'confirmation_code', None) or str(booking.id)
            if checkin_date and code:
                existing_date = entry.get('latest_booking_date')
                if not existing_date or checkin_date > existing_date:
                    entry['latest_booking_date'] = checkin_date
                    entry['latest_booking_code'] = code

            # Count online bookings (website/direct treated as online self-managed)
            if booking.booking_source in ['website', 'direct']:
                entry['online_bookings'] = entry.get('online_bookings', 0) + 1
            entry['online_checkin'] = entry.get('online_checkin', False) or booking.guests.filter(is_primary=True).exists()
            merged[key] = entry

        # Guests from BookingGuest (online check-in)
        booking_guests_qs = BookingGuest.objects.select_related('booking').all()
        if search:
            booking_guests_qs = booking_guests_qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )

        for bg in booking_guests_qs:
            # Use unique key per BookingGuest to avoid collapsing multiple guests
            key = f"bookingguest-{bg.id}"
            entry = {
                'id': str(bg.id),
                'first_name': bg.first_name,
                'last_name': bg.last_name,
                'email': bg.email or '',
                'phone': '',
                'nationality': bg.country_of_birth or '',
                'date_of_birth': bg.date_of_birth,
                'address': '',
                'city': '',
                'country': '',
                'document_number': bg.document_number or '',
                'document_type': bg.document_type or '',
                'relationship': bg.relationship or '',
                'total_bookings': 0,
                'total_spent': 0.0,
                'total_guests_count': 0,
                'online_bookings': 0,
                'online_checkin': True,
                'checkin_draft': getattr(bg.booking, 'checkin_draft', False),
            }

            if bg.booking:
                entry['total_bookings'] = 1
                entry['total_spent'] = float(bg.booking.total_price or 0)
                entry['total_guests_count'] = bg.booking.number_of_guests or 0
                code = getattr(bg.booking, 'booking_id', None) or getattr(bg.booking, 'confirmation_code', None) or str(bg.booking.id)
                entry['latest_booking_code'] = code
                if bg.booking.booking_source in ['website', 'direct']:
                    entry['online_bookings'] = 1
            merged[key] = entry

        # Sort by name then email for stable display
        data = sorted(
            merged.values(),
            key=lambda g: ((g.get('first_name') or '') + (g.get('last_name') or '')).lower() or g.get('email', '')
        )

        return Response(data)

    def get_queryset(self):
        # Only team/admin can view guests
        if not self.request.user.is_team_member():
            return User.objects.none()
        
        # Guests are legacy_role=guest (db column "role"); also include any explicit guest assigned role
        queryset = User.objects.filter(
            Q(legacy_role='guest') |
            Q(assigned_role__slug='guest')
        )
        
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
    
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a specific guest with booking statistics and history.
        """
        if not request.user.is_team_member():
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        guest_id = kwargs.get('pk')

        # Try to get registered user
        try:
            user = User.objects.get(id=guest_id)
            guest_email = user.email
            guest_data = {
                'id': str(user.id),
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'phone': user.phone,
                'created_at': user.created_at,
                'is_active': user.is_active,
            }
        except (User.DoesNotExist, ValueError):
            # Not a registered user ID, might be booking-{id} or bookingguest-{id}
            return Response({'error': 'Guest not found'}, status=status.HTTP_404_NOT_FOUND)

        # Get all bookings for this guest
        bookings = Booking.objects.filter(
            Q(user=user) | Q(guest_email__iexact=guest_email)
        ).select_related('user').order_by('-check_in_date')

        # Calculate statistics including custom payments
        total_bookings = bookings.count()

        # Calculate total spent including custom payments
        from apps.payments.models import PaymentRequest
        from django.db.models import Sum
        base_spent = sum(float(b.total_price or 0) for b in bookings)
        custom_payments = PaymentRequest.objects.filter(
            booking__in=bookings,
            status='paid'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        total_spent = base_spent + float(custom_payments)

        total_nights = sum(b.nights or 0 for b in bookings)
        last_booking = bookings.first()

        # Add statistics to guest data
        guest_data.update({
            'total_bookings': total_bookings,
            'total_spent': str(total_spent),
            'total_nights': total_nights,
            'last_booking_date': last_booking.check_in_date if last_booking else None,
        })

        # Serialize booking history
        from apps.bookings.serializers import BookingListSerializer
        guest_data['bookings'] = BookingListSerializer(bookings, many=True).data

        return Response(guest_data)

    @action(detail=True, methods=['get'])
    def notes(self, request, pk=None):
        """Get notes for a specific guest."""
        guest = self.get_object()
        notes = GuestNote.objects.filter(guest=guest)
        serializer = GuestNoteSerializer(notes, many=True)
        return Response(serializer.data)


class TeamViewSet(viewsets.ModelViewSet):
    """ViewSet for managing team members with compensation support."""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            from .serializers import TeamMemberInviteSerializer
            return TeamMemberInviteSerializer
        from .serializers import TeamMemberSerializer
        return TeamMemberSerializer

    def get_queryset(self):
        # Only admin can view/manage team
        if not self.request.user.is_team_member():
            return User.objects.none()

        # Treat anyone with a non-guest assigned role (or legacy team/admin) as team
        return User.objects.filter(
            Q(legacy_role__in=['team', 'admin']) |
            (Q(assigned_role__isnull=False) & ~Q(assigned_role__slug='guest')) |
            Q(assigned_role__slug__in=['team', 'admin'])
        ).select_related('assigned_role', 'compensation').order_by('-created_at')

    def list(self, request, *args, **kwargs):
        """
        List team members. If the compensation table is missing (migration not applied),
        return a clear error instead of a 500.
        """
        try:
            return super().list(request, *args, **kwargs)
        except DatabaseError as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error("Team listing failed, likely due to missing migrations: %s", str(e), exc_info=True)
            return Response(
                {'error': 'Team data not available. Please run database migrations (compensation tables).'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

    def create(self, request, *args, **kwargs):
        """Create team member with compensation configuration."""
        # Only admin can create team members
        if not (request.user.is_super_admin() or request.user.legacy_role == 'admin'):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        from .serializers import TeamMemberInviteSerializer, TeamMemberSerializer
        from .models_compensation import TeamCompensation
        from .models import Role
        import random
        import string

        serializer = TeamMemberInviteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        email = data['email'].strip().lower()
        first_name = data['first_name']
        last_name = data['last_name']

        # Generate random password for invitation (for new users)
        temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=16))

        # Get the assigned role
        try:
            role = Role.objects.get(id=data['assigned_role_id'])
        except Role.DoesNotExist:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent accidental super-admin assignment without explicit confirmation flag
        if role.is_super_admin and not request.data.get('confirm_super_admin'):
            return Response({
                'error': 'Cannot assign Super Admin role through team invitation. Please confirm explicitly or choose another role.'
            }, status=status.HTTP_400_BAD_REQUEST)
        try:
            with transaction.atomic():
                user = User.objects.filter(email__iexact=email).select_related('compensation').first()

                # Upsert user: promote existing guest to team, or create fresh
                if user:
                    user.first_name = first_name
                    user.last_name = last_name
                    user.assigned_role = role
                    user.legacy_role = 'team' if not role.is_super_admin else 'admin'
                    user.activation_start_date = data.get('activation_start_date')
                    user.activation_end_date = data.get('activation_end_date')
                    user.is_active = True
                    user.save(update_fields=[
                        'first_name', 'last_name', 'assigned_role', 'legacy_role',
                        'activation_start_date', 'activation_end_date', 'is_active', 'updated_at'
                    ])
                    is_new_user = False
                else:
                    user = User.objects.create_user(
                        email=email,
                        username=email,
                        password=temp_password,
                        first_name=first_name,
                        last_name=last_name,
                        assigned_role=role,
                        is_active=True,
                        activation_start_date=data.get('activation_start_date'),
                        activation_end_date=data.get('activation_end_date')
                    )
                    is_new_user = True

                # Create or update compensation if provided
                compensation_type = data.get('compensation_type')
                if compensation_type:
                    comp_defaults = {
                        'compensation_type': compensation_type,
                        'notes': data.get('notes', ''),
                        'is_active': True,
                        'salary_method': None,
                        'fixed_amount_per_checkout': None,
                        'percentage_on_base_price': None,
                        'profit_share_timing': None,
                        'profit_share_percentage': None,
                    }

                    if compensation_type == 'salary':
                        comp_defaults.update({
                            'salary_method': data.get('salary_method'),
                            'fixed_amount_per_checkout': data.get('fixed_amount_per_checkout'),
                            'percentage_on_base_price': data.get('percentage_on_base_price'),
                        })
                    elif compensation_type == 'profit_share':
                        comp_defaults.update({
                            'profit_share_timing': data.get('profit_share_timing'),
                            'profit_share_percentage': data.get('profit_share_percentage'),
                        })

                    compensation, _created = TeamCompensation.objects.update_or_create(
                        user=user,
                        defaults=comp_defaults,
                    )
                    compensation.full_clean()
                    compensation.save()
        except IntegrityError:
            return Response({'error': 'A user with this email already exists and could not be updated.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create/update team member for {email}: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to create team member: {str(e)}. Please ensure database migrations are up to date.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Send invitation email with password setup token for new users only
        try:
            if is_new_user:
                setup_token = PasswordResetToken.create_token(user)

                # Send invitation email from support@allarcoapartment.com
                from apps.emails.services import send_team_invitation
                send_team_invitation(user, setup_token.token)
        except Exception as e:
            # Log error but don't fail the user creation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send team invitation email to {user.email}: {str(e)}")

        # Reload user with all relationships for serialization
        user = User.objects.select_related('assigned_role', 'compensation').get(id=user.id)

        return Response(
            TeamMemberSerializer(user).data,
            status=status.HTTP_201_CREATED
        )


# ============================================================================
# Host Profile & Reviews (Public + Admin)
# ============================================================================


class HostProfileViewSet(viewsets.ModelViewSet):
    """Singleton host profile; public read, super admin manage."""
    serializer_class = HostProfileSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [IsSuperAdmin()]

    def get_queryset(self):
        return HostProfile.objects.all()

    def get_object(self):
        obj = HostProfile.objects.first()
        if not obj:
            obj = HostProfile.objects.create(
                display_name='Ali Hassan Cheema',
                languages='English, Italian',
                is_superhost=True,
                review_count=59,
            )
        return obj

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response(serializer.data)


class ReviewViewSet(viewsets.ModelViewSet):
    """
    Review Management ViewSet with approval workflow.

    Public endpoints:
    - GET /api/reviews/ - List approved reviews (homepage display)
    - POST /api/reviews/submit/ - Guest review submission via email link
    - GET /api/reviews/verify-token/{token}/ - Verify review token

    Authenticated endpoints (requires permissions):
    - GET /api/reviews/ - List all reviews with filters (PMS)
    - POST /api/reviews/ - Create review manually (staff)
    - PATCH /api/reviews/{id}/ - Update review
    - DELETE /api/reviews/{id}/ - Delete review
    - POST /api/reviews/{id}/approve/ - Approve pending review
    - POST /api/reviews/{id}/reject/ - Reject pending review
    - POST /api/reviews/{id}/toggle-featured/ - Toggle featured status
    - GET /api/reviews/statistics/ - Review statistics
    """

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            # PMS users get detailed serializer, public gets basic
            if self.request.user.is_authenticated and self.request.user.has_perm_code('reviews.view'):
                return ReviewDetailSerializer
            return ReviewSerializer
        elif self.action == 'retrieve':
            if self.request.user.is_authenticated and self.request.user.has_perm_code('reviews.view'):
                return ReviewDetailSerializer
            return ReviewSerializer
        elif self.action == 'create':
            return ReviewCreateSerializer
        elif self.action == 'submit':
            return ReviewSubmitSerializer
        elif self.action == 'approve':
            return ReviewApproveSerializer
        elif self.action == 'reject':
            return ReviewRejectSerializer
        return ReviewSerializer

    def get_permissions(self):
        """Define permissions based on action."""
        if self.action in ['list', 'retrieve']:
            # Public can view approved reviews, authenticated with reviews.view can see all
            return [AllowAny()]
        elif self.action in ['submit', 'verify_token']:
            # Public guest submission and token verification
            return [AllowAny()]
        elif self.action == 'create':
            # Manual creation requires reviews.create permission
            return [IsAuthenticated(), HasPermission()]
        elif self.action in ['approve', 'reject']:
            # Approval/rejection requires reviews.approve permission
            return [IsAuthenticated(), HasPermission()]
        elif self.action in ['update', 'partial_update', 'toggle_featured']:
            # Editing requires reviews.edit permission
            return [IsAuthenticated(), HasPermission()]
        elif self.action == 'destroy':
            # Deletion requires reviews.delete permission
            return [IsAuthenticated(), HasPermission()]
        elif self.action == 'statistics':
            # Statistics requires reviews.view permission
            return [IsAuthenticated(), HasPermission()]
        return [IsSuperAdmin()]

    @property
    def required_permission(self):
        """Return required permission for current action."""
        permission_map = {
            'create': 'reviews.create',
            'update': 'reviews.edit',
            'partial_update': 'reviews.edit',
            'destroy': 'reviews.delete',
            'approve': 'reviews.approve',
            'reject': 'reviews.approve',
            'toggle_featured': 'reviews.edit',
            'statistics': 'reviews.view',
        }
        return permission_map.get(self.action)

    def get_queryset(self):
        """
        Return queryset based on user permissions.

        Public (unauthenticated): Only approved + active reviews
        Authenticated with reviews.view: All reviews with filters
        """
        queryset = Review.objects.all()

        # Public access: only approved and active reviews
        if not self.request.user.is_authenticated or not self.request.user.has_perm_code('reviews.view'):
            queryset = queryset.filter(status='approved', is_active=True)
            return queryset.order_by('-is_featured', '-created_at')

        # Authenticated PMS access: filter by query params
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        ota_source = self.request.query_params.get('ota_source')
        if ota_source:
            queryset = queryset.filter(ota_source=ota_source)

        booking_id = self.request.query_params.get('booking_id')
        if booking_id:
            queryset = queryset.filter(booking_id=booking_id)

        rating_min = self.request.query_params.get('rating')
        if rating_min:
            try:
                queryset = queryset.filter(rating__gte=float(rating_min))
            except ValueError:
                pass

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(guest_name__icontains=search) |
                Q(title__icontains=search) |
                Q(text__icontains=search)
            )

        # Ordering
        ordering = self.request.query_params.get('ordering', '-created_at')
        queryset = queryset.order_by(ordering)

        return queryset

    @action(detail=False, methods=['post'], url_path='submit')
    def submit(self, request):
        """
        Public endpoint for guest review submission via email link.

        Validates token, booking code, and creates review with status='pending'.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save()

        return Response({
            'id': str(review.id),
            'message': 'Review submitted successfully and is pending approval',
            'status': 'pending'
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='verify-token/(?P<token>[^/.]+)')
    def verify_token(self, request, token=None):
        """
        Public endpoint to verify review token and booking code.

        Returns booking details if valid, error message if not.
        """
        booking_code = request.query_params.get('booking_code', '').strip().upper()

        if not booking_code:
            return Response({
                'valid': False,
                'error': 'Booking code is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            booking = Booking.objects.get(review_token=token)
        except Booking.DoesNotExist:
            return Response({
                'valid': False,
                'error': 'Invalid or expired review link'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check token not expired
        if not booking.is_review_token_valid():
            return Response({
                'valid': False,
                'error': 'This review link has expired'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check booking code matches
        if booking.booking_id != booking_code:
            return Response({
                'valid': False,
                'error': 'Incorrect booking code'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check not already submitted
        if booking.review_submitted:
            return Response({
                'valid': False,
                'error': 'You have already submitted a review for this booking'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Return booking details for form pre-fill
        return Response({
            'valid': True,
            'booking': {
                'guest_name': booking.guest_name,
                'guest_location': booking.guest_country or '',
                'check_in_date': booking.check_in_date,
                'check_out_date': booking.check_out_date,
                'booking_code': booking.booking_id,
            }
        })

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve a pending review.

        Sets status='approved', records approver, and makes review visible.
        """
        review = self.get_object()

        from django.utils import timezone

        # Update review status
        review.status = 'approved'
        review.approved_by = request.user
        review.approved_at = timezone.now()
        review.is_active = True

        # Clear rejection fields if previously rejected
        review.rejected_by = None
        review.rejected_at = None
        review.rejection_reason = None

        review.save()

        serializer = ReviewDetailSerializer(review)
        return Response({
            'message': 'Review approved successfully',
            **serializer.data
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject a pending review with reason.

        Sets status='rejected', records rejecter and reason, hides review.
        """
        review = self.get_object()

        serializer = ReviewRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from django.utils import timezone

        # Update review status
        review.status = 'rejected'
        review.rejected_by = request.user
        review.rejected_at = timezone.now()
        review.rejection_reason = serializer.validated_data['rejection_reason']
        review.is_active = False

        # Clear approval fields if previously approved
        review.approved_by = None
        review.approved_at = None

        review.save()

        serializer = ReviewDetailSerializer(review)
        return Response({
            'message': 'Review rejected successfully',
            **serializer.data
        })

    @action(detail=True, methods=['post'], url_path='toggle-featured')
    def toggle_featured(self, request, pk=None):
        """Toggle the is_featured status of a review."""
        review = self.get_object()
        review.is_featured = not review.is_featured
        review.save(update_fields=['is_featured'])

        return Response({
            'id': str(review.id),
            'is_featured': review.is_featured,
            'message': 'Review featured status updated'
        })

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get review statistics for PMS dashboard.

        Returns counts by status, OTA source, rating distribution, and averages.
        """
        from django.db.models import Count, Avg, Q
        from datetime import datetime, timedelta

        queryset = Review.objects.all()

        # Total counts by status
        total_reviews = queryset.count()
        pending_count = queryset.filter(status='pending').count()
        approved_count = queryset.filter(status='approved').count()
        rejected_count = queryset.filter(status='rejected').count()

        # Average rating (approved reviews only)
        avg_rating = queryset.filter(status='approved').aggregate(
            avg=Avg('rating')
        )['avg'] or 0

        # Reviews this month
        this_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        reviews_this_month = queryset.filter(created_at__gte=this_month_start).count()

        # By OTA source
        by_ota_source = {}
        for ota_choice in Review.OTA_CHOICES:
            ota_code = ota_choice[0]
            count = queryset.filter(ota_source=ota_code).count()
            if count > 0:
                by_ota_source[ota_code] = count

        # By rating (5-star scale for display)
        by_rating = {
            '5_stars': queryset.filter(rating__gte=9.0).count(),  # 9.0-10.0 = 5 stars
            '4_stars': queryset.filter(rating__gte=7.0, rating__lt=9.0).count(),  # 7.0-8.9 = 4 stars
            '3_stars': queryset.filter(rating__gte=5.0, rating__lt=7.0).count(),  # 5.0-6.9 = 3 stars
            '2_stars': queryset.filter(rating__gte=3.0, rating__lt=5.0).count(),  # 3.0-4.9 = 2 stars
            '1_star': queryset.filter(rating__lt=3.0).count(),  # 0-2.9 = 1 star
        }

        return Response({
            'total_reviews': total_reviews,
            'pending_count': pending_count,
            'approved_count': approved_count,
            'rejected_count': rejected_count,
            'average_rating': round(float(avg_rating), 1),
            'reviews_this_month': reviews_this_month,
            'by_ota_source': by_ota_source,
            'by_rating': by_rating,
        })

    def perform_update(self, serializer):
        """Track edits when review is updated."""
        from django.utils import timezone
        review = serializer.save(
            edited_by=self.request.user,
            edited_at=timezone.now()
        )
        return review


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
        from rest_framework.exceptions import ValidationError

        # Super Admin role cannot be deleted by anyone
        if instance.is_super_admin:
            raise ValidationError({'error': 'Cannot delete Super Admin role'})

        # Check if role has assigned members (cannot delete if it does)
        if instance.get_member_count() > 0:
            raise ValidationError({
                'error': f'Cannot delete role with {instance.get_member_count()} assigned members'
            })

        # Check if user is Super Admin
        is_super_admin = self.request.user.is_super_admin()

        # Non-Super Admin users cannot delete system roles
        if instance.is_system and not is_super_admin:
            raise ValidationError({'error': 'Cannot delete system roles - only Super Admin can delete system roles'})

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
    Seed initial permissions and Super Admin role.

    This endpoint creates:
    - All system permissions organized by feature groups (bookings, payments, guests, pricing, team, reports)
    - Super Admin role (has all permissions implicitly)

    Super Admin can then create custom roles manually with specific permissions.

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
            ('pricing.settings.view', 'pricing', 'View pricing settings'),
            ('pricing.settings.edit', 'pricing', 'Edit pricing settings'),
            ('pricing.rules.view', 'pricing', 'View pricing rules'),
            ('pricing.rules.manage', 'pricing', 'Manage pricing rules'),
            ('pricing.promotions.view', 'pricing', 'View promotions'),
            ('pricing.promotions.manage', 'pricing', 'Manage promotions'),
            ('pricing.vouchers.view', 'pricing', 'View vouchers'),
            ('pricing.vouchers.manage', 'pricing', 'Manage vouchers'),

            # Team
            ('team.view', 'team', 'View team members'),
            ('team.invite', 'team', 'Invite team members'),
            ('team.update', 'team', 'Update team member details'),
            ('team.deactivate', 'team', 'Deactivate team members'),

            # Roles
            ('roles.manage', 'team', 'Manage roles and permissions'),

            # Reports & Analytics
            ('reports.view', 'reports', 'View reports and analytics dashboard'),
            ('reports.create', 'reports', 'Create custom reports'),
            ('reports.edit', 'reports', 'Edit saved reports'),
            ('reports.delete', 'reports', 'Delete saved reports'),
            ('reports.export', 'reports', 'Export reports (CSV, PDF, Excel)'),
            ('reports.audit_logs', 'reports', 'View system audit logs'),
            ('reports.financial', 'reports', 'View financial reports'),
            ('reports.advanced', 'reports', 'Access advanced analytics'),

            # OTA Management
            ('ota.view', 'ota', 'View OTA bookings and settings'),
            ('ota.manage', 'ota', 'Manage OTA bookings and iCal sources'),
            ('ota.sync', 'ota', 'Sync iCal calendars from OTA platforms'),
            ('ota.export', 'ota', 'Export calendar to share with OTAs'),
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
        # Only Super Admin is created by default
        # Super Admin can create custom roles manually with specific permissions
        roles_data = [
            {
                'name': 'Super Admin',
                'slug': 'super_admin',
                'description': 'Full system access with all permissions',
                'is_system': True,
                'is_super_admin': True,
                'permissions': []  # Has all permissions implicitly
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
