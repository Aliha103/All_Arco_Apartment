"""
Permission classes for Expense Management
"""
from rest_framework import permissions


class ExpensePermission(permissions.BasePermission):
    """
    Custom permission for expense operations based on RBAC.

    Permissions:
    - expenses.view: Can view expenses
    - expenses.create: Can create expenses
    - expenses.edit: Can edit expenses
    - expenses.delete: Can delete expenses
    - expenses.approve: Can approve/reject expenses
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Super admin has all permissions
        if request.user.is_superuser:
            return True

        # Check role-based permissions
        if not hasattr(request.user, 'role') or not request.user.role:
            return False

        # Map HTTP methods to permission codes
        if view.action in ['list', 'retrieve', 'statistics', 'summary']:
            return request.user.role.has_permission('expenses.view')
        elif view.action == 'create':
            return request.user.role.has_permission('expenses.create')
        elif view.action in ['update', 'partial_update']:
            return request.user.role.has_permission('expenses.edit')
        elif view.action == 'destroy':
            return request.user.role.has_permission('expenses.delete')
        elif view.action in ['approve', 'reject']:
            return request.user.role.has_permission('expenses.approve')

        return False

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        # Super admin has all permissions
        if request.user.is_superuser:
            return True

        # Check role-based permissions for object-level operations
        if not hasattr(request.user, 'role') or not request.user.role:
            return False

        # View permission for retrieve
        if view.action == 'retrieve':
            return request.user.role.has_permission('expenses.view')

        # Edit permission for update
        elif view.action in ['update', 'partial_update']:
            return request.user.role.has_permission('expenses.edit')

        # Delete permission
        elif view.action == 'destroy':
            return request.user.role.has_permission('expenses.delete')

        # Approve/reject permission
        elif view.action in ['approve', 'reject']:
            return request.user.role.has_permission('expenses.approve')

        return False
