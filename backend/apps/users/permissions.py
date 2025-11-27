"""
Custom permissions for All'Arco Apartment.
"""

from rest_framework import permissions


class IsTeamMember(permissions.BasePermission):
    """
    Permission check for team members and admins.
    Backward compatible: checks both new RBAC system and legacy roles.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Use the User model's is_team_member() method which handles both systems
        return request.user.is_team_member()


class IsOwnerOrTeamMember(permissions.BasePermission):
    """
    Permission check: owner of the object or team member.
    Backward compatible with legacy role system.
    """

    def has_object_permission(self, request, view, obj):
        # Team members have full access
        if request.user.is_team_member():
            return True

        # Check if user owns the object
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'guest_email'):
            return obj.guest_email == request.user.email

        return False


class HasPermission(permissions.BasePermission):
    """
    Permission class for RBAC system.

    Usage:
        class MyViewSet(viewsets.ModelViewSet):
            permission_classes = [HasPermission]
            required_permission = 'bookings.view'

    Or with multiple permissions (requires ALL):
        class MyViewSet(viewsets.ModelViewSet):
            permission_classes = [HasPermission]
            required_permissions = ['bookings.view', 'bookings.create']

    Or with any permission (requires ANY):
        class MyViewSet(viewsets.ModelViewSet):
            permission_classes = [HasPermission]
            required_any_permissions = ['bookings.view', 'bookings.cancel']
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Check for required_permission (single permission)
        if hasattr(view, 'required_permission'):
            return request.user.has_perm_code(view.required_permission)

        # Check for required_permissions (all required)
        if hasattr(view, 'required_permissions'):
            return request.user.has_all_perms(view.required_permissions)

        # Check for required_any_permissions (any one required)
        if hasattr(view, 'required_any_permissions'):
            return request.user.has_any_perm(view.required_any_permissions)

        # If no permission attributes defined, default to team member check
        return request.user.is_team_member()


class HasPermissionForAction(permissions.BasePermission):
    """
    Permission class for action-level permissions.

    Usage:
        class BookingViewSet(viewsets.ModelViewSet):
            permission_classes = [HasPermissionForAction]
            action_permissions = {
                'list': 'bookings.view',
                'retrieve': 'bookings.view',
                'create': 'bookings.create',
                'update': 'bookings.update',
                'partial_update': 'bookings.update',
                'destroy': 'bookings.delete',
                'cancel_booking': 'bookings.cancel',
                'mark_no_show': 'bookings.mark_no_show',
            }
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Get action-specific permission from view
        if not hasattr(view, 'action_permissions'):
            # If no action_permissions defined, default to team member check
            return request.user.is_team_member()

        action = view.action
        permission_code = view.action_permissions.get(action)

        if not permission_code:
            # Action not in permission map - allow by default for team members
            return request.user.is_team_member()

        return request.user.has_perm_code(permission_code)
