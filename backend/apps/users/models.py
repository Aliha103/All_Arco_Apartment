import os
import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower
from django.core.exceptions import ValidationError

# Import compensation models
from .models_compensation import TeamCompensation


# ============================================================================
# RBAC (Role-Based Access Control) Models
# ============================================================================

class Permission(models.Model):
    """
    Represents a single permission in the system.
    Permissions are organized by group (feature area) for UI display.

    Examples:
    - bookings.view, bookings.create, bookings.cancel
    - payments.view, payments.refund
    - roles.manage
    """
    # Permission groups for organization
    GROUP_CHOICES = [
        ('dashboard', 'Dashboard & Analytics'),
        ('bookings', 'Bookings & Calendar'),
        ('payments', 'Payments & Invoices'),
        ('invoices', 'Invoice Management'),
        ('guests', 'Guests'),
        ('pricing', 'Pricing'),
        ('expenses', 'Expense Management'),
        ('team', 'Team & Roles'),
        ('gallery', 'Gallery Management'),
        ('reports', 'Reports & Logs'),
        ('reviews', 'Review Management'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)  # e.g., "bookings.view"
    group = models.CharField(max_length=20, choices=GROUP_CHOICES)
    description = models.CharField(max_length=200)  # Human-readable description
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users_permission'
        ordering = ['group', 'code']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['group']),
        ]

    def __str__(self):
        return f"{self.code} - {self.description}"


class Role(models.Model):
    """
    Represents a role that can be assigned to users.
    Roles have a set of permissions that define what users with that role can do.

    The Super Admin role has is_super_admin=True and implicitly has all permissions.
    System roles (is_system=True) cannot be deleted.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)  # e.g., "Front Desk"
    slug = models.SlugField(max_length=100, unique=True)  # e.g., "front_desk"
    description = models.TextField(blank=True)

    # System flags
    is_system = models.BooleanField(default=False)  # Protected from deletion
    is_super_admin = models.BooleanField(default=False)  # Has all permissions implicitly

    # Permissions assigned to this role
    permissions = models.ManyToManyField(
        Permission,
        related_name='roles',
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users_role'
        ordering = ['name']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_super_admin']),
        ]

    def __str__(self):
        return self.name

    def clean(self):
        """Validate role before saving."""
        # Super admin role must be a system role
        if self.is_super_admin and not self.is_system:
            raise ValidationError('Super admin role must be a system role')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def has_permission(self, permission_code: str) -> bool:
        """
        Check if this role has a specific permission.
        Super admin roles implicitly have all permissions.
        """
        if self.is_super_admin:
            return True
        return self.permissions.filter(code=permission_code).exists()

    def get_permission_codes(self) -> list:
        """
        Get list of all permission codes for this role.
        If super admin, returns all available permission codes.
        """
        if self.is_super_admin:
            return list(Permission.objects.values_list('code', flat=True))
        return list(self.permissions.values_list('code', flat=True))

    def get_member_count(self) -> int:
        """Get count of users assigned to this role."""
        return self.users.count()

    def can_be_deleted(self) -> bool:
        """Check if this role can be deleted."""
        # System roles cannot be deleted
        if self.is_system:
            return False
        # Roles with assigned users cannot be deleted
        if self.get_member_count() > 0:
            return False
        return True


class AuditLog(models.Model):
    """
    Audit log for tracking key actions in the system.
    Captures who did what, when, and what changed for security and traceability.

    Examples:
    - User login/logout
    - Booking created/updated/cancelled/marked no-show
    - Payment refund requested/succeeded/failed
    - Pricing settings or rules changed
    - Team member invited/role changed/deactivated
    - Role created/edited/deleted
    """
    # Action types for filtering and display
    ACTION_TYPE_CHOICES = [
        # Authentication
        ('auth.login', 'User Login'),
        ('auth.logout', 'User Logout'),
        ('auth.password_reset', 'Password Reset'),

        # Bookings
        ('booking.created', 'Booking Created'),
        ('booking.updated', 'Booking Updated'),
        ('booking.status_changed', 'Booking Status Changed'),
        ('booking.cancelled', 'Booking Cancelled'),
        ('booking.marked_no_show', 'Booking Marked No-Show'),

        # Payments
        ('payment.received', 'Payment Received'),
        ('payment.failed', 'Payment Failed'),
        ('payment.refund_requested', 'Refund Requested'),
        ('payment.refund_succeeded', 'Refund Succeeded'),
        ('payment.refund_failed', 'Refund Failed'),

        # Emails
        ('email.sent', 'Email Sent'),
        ('email.failed', 'Email Failed'),

        # Pricing
        ('pricing.settings_updated', 'Pricing Settings Updated'),
        ('pricing.rule_created', 'Pricing Rule Created'),
        ('pricing.rule_updated', 'Pricing Rule Updated'),
        ('pricing.rule_deleted', 'Pricing Rule Deleted'),

        # Team Management
        ('team.member_invited', 'Team Member Invited'),
        ('team.member_role_changed', 'Team Member Role Changed'),
        ('team.member_deactivated', 'Team Member Deactivated'),
        ('team.member_reactivated', 'Team Member Reactivated'),

        # Role Management
        ('role.created', 'Role Created'),
        ('role.updated', 'Role Updated'),
        ('role.deleted', 'Role Deleted'),
        ('role.permissions_changed', 'Role Permissions Changed'),
    ]

    # Resource types for organization
    RESOURCE_TYPE_CHOICES = [
        ('user', 'User'),
        ('booking', 'Booking'),
        ('payment', 'Payment'),
        ('refund', 'Refund'),
        ('email', 'Email'),
        ('pricing_settings', 'Pricing Settings'),
        ('pricing_rule', 'Pricing Rule'),
        ('role', 'Role'),
        ('permission', 'Permission'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    # Who performed the action (null for system-generated events)
    user = models.ForeignKey(
        'User',  # Forward reference since User is defined later
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )

    # Snapshot of user's role at time of action (for historical accuracy)
    role_at_time = models.CharField(max_length=100, blank=True)

    # What action was performed
    action_type = models.CharField(max_length=50, choices=ACTION_TYPE_CHOICES, db_index=True)

    # What resource was affected
    resource_type = models.CharField(max_length=50, choices=RESOURCE_TYPE_CHOICES, db_index=True)
    resource_id = models.CharField(max_length=255)  # UUID as string for flexibility

    # Additional context (before/after values, reason, etc.)
    metadata = models.JSONField(default=dict, blank=True)

    # IP address and user agent for security tracking
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = 'users_auditlog'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action_type', '-timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]

    def __str__(self):
        user_str = self.user.get_full_name() if self.user else 'System'
        return f"{self.timestamp.strftime('%Y-%m-%d %H:%M')} - {user_str}: {self.get_action_type_display()}"


# ============================================================================
# User Model
# ============================================================================

class User(AbstractUser):
    """
    Custom User model with dynamic role-based access control.

    Migration Note: The old 'role' field (guest/team/admin) will be migrated to
    the new Role FK system. During migration, users get assigned to matching roles.
    """
    # Legacy role field - kept for backward compatibility during migration
    # Will be removed in a future migration after full Role FK adoption
    LEGACY_ROLE_CHOICES = [
        ('guest', 'Guest'),
        ('team', 'Team Member'),
        ('admin', 'Admin'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True, blank=True, null=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    phone = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)  # Required for registration
    date_of_birth = models.DateField(blank=True, null=True)  # Optional, can add later

    # New dynamic role system (FK to Role model)
    assigned_role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,  # Cannot delete roles with assigned users
        related_name='users',
        null=True,  # Nullable during migration
        blank=True
    )

    # Legacy role field (will be deprecated)
    legacy_role = models.CharField(
        max_length=10,
        choices=LEGACY_ROLE_CHOICES,
        default='guest',
        db_column='role'  # Keep same column name for migration
    )

    is_active = models.BooleanField(default=True)

    # Account activation period for team members
    activation_start_date = models.DateField(
        null=True,
        blank=True,
        help_text='Date when team member account becomes active'
    )
    activation_end_date = models.DateField(
        null=True,
        blank=True,
        help_text='Date when team member account expires'
    )

    # Invitation/Referral System
    reference_code = models.CharField(
        max_length=13,
        unique=True,
        db_index=True,
        blank=True,
        null=True
    )  # e.g., "ARCO-XXXXXXXX" - Unique code for this user to invite others

    referred_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invited_guests'
    )  # Tracks who invited this user

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        db_table = 'users_user'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['legacy_role']),
            models.Index(fields=['assigned_role']),
        ]
        constraints = [
            models.UniqueConstraint(
                Lower('email'),
                name='users_user_email_ci_unique'
            ),
            models.UniqueConstraint(
                Lower('username'),
                name='users_user_username_ci_unique'
            ),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    # ========================================================================
    # Role and Permission Methods (New RBAC System)
    # ========================================================================

    @property
    def role(self):
        """
        Get user's role. Prioritizes assigned_role over legacy_role.
        Returns Role object or None.
        """
        return self.assigned_role

    @property
    def role_name(self):
        """Get user's role name as string."""
        if self.assigned_role:
            return self.assigned_role.name
        # Fallback to legacy role during migration
        return dict(self.LEGACY_ROLE_CHOICES).get(self.legacy_role, 'Guest')

    @property
    def role_slug(self):
        """Get user's role slug."""
        if self.assigned_role:
            return self.assigned_role.slug
        return self.legacy_role

    def is_super_admin(self):
        """Check if user has super admin role."""
        if self.assigned_role:
            return self.assigned_role.is_super_admin
        # Fallback: legacy admin role
        return self.legacy_role == 'admin'

    def is_team_member(self):
        """
        Check if user is a team member (has PMS access).
        This includes any role that's not a pure guest role.
        """
        if self.assigned_role:
            # Any non-guest role or super admin
            return self.assigned_role.slug != 'guest' or self.assigned_role.is_super_admin
        # Fallback: legacy team/admin roles
        return self.legacy_role in ['team', 'admin']

    def has_perm_code(self, permission_code: str) -> bool:
        """
        Check if user has a specific permission code.

        Args:
            permission_code: Permission code like "bookings.view"

        Returns:
            True if user has the permission, False otherwise.
        """
        if not self.assigned_role:
            # Fallback: legacy role system
            # Admin has everything
            if self.legacy_role == 'admin':
                return True
            # Team has most permissions except role management
            if self.legacy_role == 'team':
                return not permission_code.startswith('roles.')
            # Guest has no PMS permissions
            return False

        return self.assigned_role.has_permission(permission_code)

    def has_any_perm(self, permission_codes: list) -> bool:
        """Check if user has ANY of the given permissions."""
        return any(self.has_perm_code(code) for code in permission_codes)

    def has_all_perms(self, permission_codes: list) -> bool:
        """Check if user has ALL of the given permissions."""
        return all(self.has_perm_code(code) for code in permission_codes)

    def get_all_permissions(self) -> list:
        """
        Get list of all permission codes user has.

        Returns:
            List of permission code strings.
        """
        if not self.assigned_role:
            # Fallback: return empty for guests, all for legacy admin
            if self.legacy_role == 'admin':
                return list(Permission.objects.values_list('code', flat=True))
            return []

        return self.assigned_role.get_permission_codes()

    def save(self, *args, **kwargs):
        # Normalize identifiers to prevent duplicates with different casing/spacing
        if self.email:
            self.email = self.email.strip().lower()
        if self.username:
            self.username = self.username.strip().lower()

        # Set username to email if not provided
        if not self.username:
            self.username = self.email

        # Generate reference code if not already set
        if not self.reference_code:
            self.reference_code = self._generate_reference_code()

        super().save(*args, **kwargs)

    @staticmethod
    def _generate_reference_code():
        """
        Generate a unique reference code for inviting others.
        Uses available field length; capped to 12 chars to stay compatible with older DBs.
        """
        import secrets
        import string

        prefix = "ARCO-"
        field_max = User._meta.get_field('reference_code').max_length or 12
        # Cap at 12 to avoid hitting older varchar(12) columns; ensure at least 4 chars suffix
        suffix_len = max(4, min(field_max, 12) - len(prefix))

        # Characters to use (no confusing: 0/O, 1/I/l, etc.)
        chars = string.ascii_uppercase + string.digits.replace('0', '').replace('1', '')

        while True:
            code_suffix = ''.join(secrets.choice(chars) for _ in range(suffix_len))
            reference_code = f"{prefix}{code_suffix}"

            # Ensure uniqueness
            if not User.objects.filter(reference_code=reference_code).exists():
                return reference_code

    def get_invited_count(self):
        """Get count of people invited by this user."""
        return self.invited_guests.filter(is_active=True).count()

    def get_referral_credits_earned(self):
        """
        Get total referral credits earned from invitations.
        Returns sum of all credits from completed bookings of invited guests.
        Includes ALL earned credits (both active and expired) for historical tracking.
        """
        return self.referral_credits.filter(
            status='earned'
        ).aggregate(models.Sum('amount'))['amount__sum'] or 0

    def get_referral_credits_spent(self):
        """Total credits spent by this user."""
        return self.credit_usages.aggregate(models.Sum('amount'))['amount__sum'] or 0

    def get_available_credits(self):
        """
        Get available credits (earned, not expired, not spent).
        Credits expire 90 days after being earned.
        """
        from django.utils import timezone

        # Get earned credits that haven't expired
        earned_not_expired = self.referral_credits.filter(
            models.Q(status='earned') &
            (models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=timezone.now()))
        ).aggregate(models.Sum('amount'))['amount__sum'] or 0

        spent = self.get_referral_credits_spent() or 0
        remaining = earned_not_expired - spent
        return remaining if remaining > 0 else 0


# ============================================================================
# Host Profile Model
# ============================================================================

class HostProfile(models.Model):
    """
    Store host profile information displayed on the homepage.
    This is a singleton model - only one host profile should exist.

    Supports both file upload and external URL for avatar images,
    with uploaded files taking priority.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    display_name = models.CharField(
        max_length=200,
        help_text="Name shown as 'Hosted by [name]'"
    )
    bio = models.TextField(
        blank=True,
        null=True,
        help_text="Host bio/description - not shown on homepage"
    )
    languages = models.CharField(
        max_length=500,
        blank=True,
        help_text="Comma-separated languages (e.g., 'English, Italian')"
    )
    avatar = models.ImageField(
        upload_to='host/avatar/',
        blank=True,
        null=True,
        help_text="Upload avatar image"
    )
    avatar_url = models.URLField(
        blank=True,
        null=True,
        max_length=2000,
        help_text="External avatar URL (alternative to upload)"
    )
    is_superhost = models.BooleanField(
        default=True,
        help_text="Show Superhost badge"
    )
    review_count = models.PositiveIntegerField(
        default=59,
        help_text="Total review count (editable for manual updates)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users_hostprofile'
        verbose_name = 'Host Profile'
        verbose_name_plural = 'Host Profiles'

    def __str__(self):
        return f"Host Profile: {self.display_name}"

    @property
    def photo_url(self):
        """Return the avatar URL - either uploaded file or external URL."""
        # Prefer uploaded file over external URL
        if self.avatar and hasattr(self.avatar, 'url'):
            try:
                return self.avatar.url
            except ValueError:
                # Handle case where file reference exists but file doesn't
                pass
        return self.avatar_url or ''


class GuestNote(models.Model):
    """
    Internal notes about guests (only visible to team members).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    guest = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notes',
        limit_choices_to={'role': 'guest'}
    )
    note = models.TextField()
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='notes_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'users_guestnote'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['guest']),
        ]
    
    def __str__(self):
        return f"Note for {self.guest.get_full_name()} by {self.created_by.get_full_name()}"


class PasswordResetToken(models.Model):
    """
    Secure token for password reset flow.

    Security features:
    - Expires after 10 minutes
    - One-time use (is_used flag)
    - Linked to specific user account
    - 6-digit numeric code for easy typing
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens'
    )
    token = models.CharField(max_length=6)  # 6-digit code
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        db_table = 'users_passwordresettoken'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token', 'is_used'], name='users_passw_token_i_idx'),
            models.Index(fields=['user', '-created_at'], name='users_passw_user_id_idx'),
        ]

    def __str__(self):
        return f"Reset token for {self.user.email} (expires: {self.expires_at})"

    @classmethod
    def create_token(cls, user):
        """
        Create a new password reset token for a user.
        Invalidates any existing unused tokens for the same user.
        """
        import secrets
        from django.utils import timezone
        from datetime import timedelta

        # Invalidate existing unused tokens for this user
        cls.objects.filter(user=user, is_used=False).update(is_used=True)

        # Generate 6-digit numeric code
        token = ''.join([str(secrets.randbelow(10)) for _ in range(6)])

        # Token expires in 10 minutes
        expires_at = timezone.now() + timedelta(minutes=10)

        return cls.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )

    def is_valid(self):
        """Check if token is still valid (not used and not expired)."""
        from django.utils import timezone
        return not self.is_used and self.expires_at > timezone.now()

    def mark_used(self):
        """Mark token as used."""
        self.is_used = True
        self.save()

    @classmethod
    def verify_token(cls, email, token):
        """
        Verify a token for a specific email.
        Returns (user, error_message) tuple.
        """
        from django.utils import timezone

        try:
            user = User.objects.get(email=email.lower().strip())
        except User.DoesNotExist:
            return None, 'Invalid email or code'

        try:
            reset_token = cls.objects.get(
                user=user,
                token=token,
                is_used=False
            )
        except cls.DoesNotExist:
            return None, 'Invalid or expired code'

        if reset_token.expires_at < timezone.now():
            return None, 'Code has expired. Please request a new one.'

        return reset_token, None


# ============================================================================
# Referral/Invitation Credit System
# ============================================================================

class ReferralCredit(models.Model):
    """
    Tracks referral credits earned when invited guests complete bookings.

    When a guest (referred_user) books and completes checkout,
    the person who invited them (referrer) earns 5€ per night.

    Status flow: pending -> earned (when booking completes)
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),  # Booking created, waiting for checkout
        ('earned', 'Earned'),  # Booking completed/checked out
        ('cancelled', 'Cancelled'),  # Booking was cancelled
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # The person who invited (earns the credit)
    referrer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='referral_credits'
    )

    # The person who was invited (created the booking)
    referred_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='referral_earnings'
    )

    # The booking that triggered this credit
    booking = models.ForeignKey(
        'bookings.Booking',  # Forward reference
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referral_credits'
    )

    # Credit amount (€5 per night)
    amount = models.DecimalField(max_digits=8, decimal_places=2)  # e.g., 15.00 for 3 nights

    # Number of nights in the booking
    nights = models.IntegerField()

    # Status of the credit
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    earned_at = models.DateTimeField(null=True, blank=True)  # When booking was completed
    expires_at = models.DateTimeField(null=True, blank=True)  # When credit expires (90 days after earned)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users_referralcredit'
        ordering = ['-created_at']
        indexes = [
            models.Index(
                fields=['referrer', '-created_at'],
                name='refcredit_referrer_created_idx',
            ),
            models.Index(
                fields=['referred_user'],
                name='refcredit_referred_user_idx',
            ),
            models.Index(
                fields=['status'],
                name='refcredit_status_idx',
            ),
            models.Index(
                fields=['booking'],
                name='refcredit_booking_idx',
            ),
        ]

    def __str__(self):
        return f"€{self.amount} credit for {self.referrer.get_full_name()} (from {self.referred_user.get_full_name()})"

    @property
    def is_expired(self):
        """Check if credit has expired (90 days after earned_at)."""
        from django.utils import timezone

        if self.status != 'earned':
            # Only earned credits can expire
            return False

        if not self.expires_at:
            # No expiration date set (legacy credits)
            return False

        return timezone.now() > self.expires_at

    def mark_earned(self):
        """Mark credit as earned when booking is completed. Sets expiration to 90 days from earned date."""
        from django.utils import timezone
        from datetime import timedelta

        self.status = 'earned'
        self.earned_at = timezone.now()
        self.expires_at = self.earned_at + timedelta(days=90)  # Credit expires after 90 days
        self.save(update_fields=['status', 'earned_at', 'expires_at', 'updated_at'])

    def mark_cancelled(self):
        """Mark credit as cancelled if booking is cancelled."""
        self.status = 'cancelled'
        self.save(update_fields=['status', 'updated_at'])


class ReferralCreditUsage(models.Model):
    """
    Ledger of credits redeemed against bookings.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='credit_usages'
    )
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.CASCADE,
        related_name='credit_usages'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    note = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users_referralcreditusage'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='refcreditusage_user_idx'),
            models.Index(fields=['booking'], name='refcreditusage_booking_idx'),
        ]

    def __str__(self):
        return f"€{self.amount} used by {self.user.email} on {self.booking.booking_id}"


# ============================================================================
# Host Profile & Reviews
# ============================================================================


def host_avatar_upload_path(instance, filename):
    """Legacy upload path for host profile avatar (kept for older migrations)."""
    return os.path.join('hosts', 'avatars', filename)


class Review(models.Model):
    """
    Public-facing review/testimonial with approval workflow.

    Reviews can be submitted by guests via email link after checkout,
    or manually created by staff. All guest-submitted reviews require
    approval before appearing on the homepage.
    """

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    OTA_CHOICES = [
        ('website', 'Website'),
        ('airbnb', 'Airbnb'),
        ('booking_com', 'Booking.com'),
        ('direct', 'Direct'),
        ('other', 'Other'),
    ]

    # Basic review fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    guest_name = models.CharField(max_length=150)
    location = models.CharField(max_length=150, blank=True, default='')
    rating = models.DecimalField(max_digits=3, decimal_places=1)  # up to 10.0, allows halves
    title = models.CharField(max_length=200, blank=True, default='')
    text = models.TextField()
    stay_date = models.DateField(null=True, blank=True)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # Approval workflow fields
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True,
        help_text='Review approval status'
    )

    # Booking relationship and OTA source
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviews',
        help_text='Linked booking (if submitted via review request)'
    )
    ota_source = models.CharField(
        max_length=20,
        choices=OTA_CHOICES,
        default='website',
        help_text='Booking source (auto-populated from booking or manual)'
    )

    # Category ratings (6 Airbnb-standard categories, 0-10 scale)
    rating_cleanliness = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        help_text='Cleanliness rating (0-10)'
    )
    rating_communication = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        help_text='Communication rating (0-10)'
    )
    rating_checkin = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        help_text='Check-in rating (0-10)'
    )
    rating_accuracy = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        help_text='Accuracy rating (0-10)'
    )
    rating_location = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        help_text='Location rating (0-10)'
    )
    rating_value = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        help_text='Value rating (0-10)'
    )

    # Submission tracking
    submitted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='submitted_reviews',
        help_text='User who submitted (guest or staff member)'
    )

    # Approval tracking
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_reviews',
        help_text='Staff member who approved'
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When review was approved'
    )

    # Rejection tracking
    rejected_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rejected_reviews',
        help_text='Staff member who rejected'
    )
    rejected_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When review was rejected'
    )
    rejection_reason = models.TextField(
        null=True,
        blank=True,
        help_text='Internal reason for rejection (not shown to guests)'
    )

    # Edit tracking
    edited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='edited_reviews',
        help_text='Staff member who last edited'
    )
    edited_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When review was last edited'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users_review'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['is_featured']),
            models.Index(fields=['status']),
            models.Index(fields=['ota_source']),
            models.Index(fields=['booking']),
        ]

    def __str__(self):
        return f"{self.guest_name} - {self.rating}/10 - {self.status}"

    def clean(self):
        if self.rating is None:
            raise ValidationError('Rating is required')
        if self.rating < 0 or self.rating > 10:
            raise ValidationError('Rating must be between 0 and 10')

    def calculate_overall_rating(self):
        """
        Calculate overall rating as average of 6 category ratings.
        Updates the rating field with the calculated average.
        """
        category_ratings = [
            self.rating_cleanliness,
            self.rating_communication,
            self.rating_checkin,
            self.rating_accuracy,
            self.rating_location,
            self.rating_value,
        ]
        # Filter out None values
        valid_ratings = [r for r in category_ratings if r is not None]

        if valid_ratings:
            from decimal import Decimal
            avg = sum(valid_ratings) / len(valid_ratings)
            self.rating = Decimal(str(round(avg, 1)))

    def can_be_edited_by(self, user):
        """Check if user has permission to edit this review."""
        if not user or not user.is_authenticated:
            return False
        return user.has_perm_code('reviews.edit')

    def can_be_deleted_by(self, user):
        """Check if user has permission to delete this review."""
        if not user or not user.is_authenticated:
            return False
        return user.has_perm_code('reviews.delete')

    def can_be_approved_by(self, user):
        """Check if user has permission to approve/reject this review."""
        if not user or not user.is_authenticated:
            return False
        return user.has_perm_code('reviews.approve')
