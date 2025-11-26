"""
Custom permissions for All'Arco Apartment.
"""

from rest_framework import permissions


class IsTeamMember(permissions.BasePermission):
    """
    Permission check for team members and admins.
    """

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['team', 'admin']
        )


class IsOwnerOrTeamMember(permissions.BasePermission):
    """
    Permission check: owner of the object or team member.
    """

    def has_object_permission(self, request, view, obj):
        # Team members have full access
        if request.user.role in ['team', 'admin']:
            return True

        # Check if user owns the object
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'guest_email'):
            return obj.guest_email == request.user.email

        return False
