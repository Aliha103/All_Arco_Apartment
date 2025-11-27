from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, GuestNote, Role, Permission


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'assigned_role', 'is_active', 'created_at']
    list_filter = ['assigned_role', 'legacy_role', 'is_active', 'created_at']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-created_at']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone')}),
        ('Role & Permissions', {'fields': ('assigned_role', 'legacy_role', 'is_active', 'is_staff', 'is_superuser')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2', 'assigned_role'),
        }),
    )


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
