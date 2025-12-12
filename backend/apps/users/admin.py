from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, GuestNote, Role, Permission, HostProfile, ReferralCredit, ReferralCreditUsage


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'assigned_role', 'reference_code', 'invited_count_display', 'credits_earned_display', 'is_active', 'created_at']
    list_filter = ['assigned_role', 'legacy_role', 'is_active', 'created_at']
    search_fields = ['email', 'first_name', 'last_name', 'reference_code']
    ordering = ['-created_at']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone', 'country', 'date_of_birth')}),
        ('Referral Info', {'fields': ('reference_code', 'referred_by')}),
        ('Role & Permissions', {'fields': ('assigned_role', 'legacy_role', 'is_active', 'is_staff', 'is_superuser')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2', 'assigned_role'),
        }),
    )

    readonly_fields = ['reference_code', 'date_joined', 'last_login']

    def invited_count_display(self, obj):
        return obj.get_invited_count()
    invited_count_display.short_description = 'People Referred'

    def credits_earned_display(self, obj):
        return f"€{obj.get_referral_credits_earned()}"
    credits_earned_display.short_description = 'Credits Earned'


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_super_admin', 'is_system', 'member_count', 'created_at']
    list_filter = ['is_super_admin', 'is_system', 'created_at']
    search_fields = ['name', 'slug', 'description']
    filter_horizontal = ['permissions']
    readonly_fields = ['slug', 'created_at', 'updated_at']

    def member_count(self, obj):
        return obj.members.count()
    member_count.short_description = 'Members'


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ['code', 'group', 'description', 'created_at']
    list_filter = ['group', 'created_at']
    search_fields = ['code', 'description']
    ordering = ['group', 'code']


@admin.register(GuestNote)
class GuestNoteAdmin(admin.ModelAdmin):
    list_display = ['guest', 'created_by', 'created_at']
    list_filter = ['created_at']
    search_fields = ['guest__email', 'guest__first_name', 'guest__last_name', 'note']
    readonly_fields = ['created_at']


@admin.register(HostProfile)
class HostProfileAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'is_superhost', 'review_count', 'updated_at']
    list_filter = ['is_superhost', 'created_at']
    search_fields = ['display_name', 'bio']
    readonly_fields = ['created_at', 'updated_at', 'photo_url']

    fieldsets = (
        ('Basic Information', {
            'fields': ('display_name', 'bio', 'languages')
        }),
        ('Avatar', {
            'fields': ('avatar', 'avatar_url', 'photo_url')
        }),
        ('Display Settings', {
            'fields': ('is_superhost', 'review_count')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(ReferralCredit)
class ReferralCreditAdmin(admin.ModelAdmin):
    list_display = ['referrer', 'referred_user', 'amount', 'nights', 'status', 'expires_at_display', 'is_expired_display', 'created_at', 'earned_at']
    list_filter = ['status', 'created_at', 'earned_at', 'expires_at']
    search_fields = ['referrer__email', 'referrer__first_name', 'referrer__last_name',
                     'referred_user__email', 'referred_user__first_name', 'referred_user__last_name',
                     'booking__booking_id']
    readonly_fields = ['created_at', 'earned_at', 'is_expired_display']
    ordering = ['-created_at']

    fieldsets = (
        ('Referral Information', {
            'fields': ('referrer', 'referred_user', 'booking')
        }),
        ('Credit Details', {
            'fields': ('amount', 'nights', 'status')
        }),
        ('Timestamps & Expiration', {
            'fields': ('created_at', 'earned_at', 'expires_at', 'is_expired_display')
        }),
    )

    def expires_at_display(self, obj):
        """Display expiration date."""
        if obj.expires_at:
            return obj.expires_at.strftime('%b %d, %Y')
        return '-'
    expires_at_display.short_description = 'Expires At'

    def is_expired_display(self, obj):
        """Display expiration status."""
        try:
            if obj.status != 'earned':
                return '-'
            if not obj.expires_at:
                return 'No expiration'
            if obj.is_expired:
                return "✗ Expired"
            else:
                return "✓ Active"
        except Exception:
            return '-'
    is_expired_display.short_description = 'Status'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('referrer', 'referred_user', 'booking')


@admin.register(ReferralCreditUsage)
class ReferralCreditUsageAdmin(admin.ModelAdmin):
    list_display = ['user', 'booking', 'amount', 'note', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__email', 'booking__booking_id', 'note']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
