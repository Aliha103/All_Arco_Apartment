from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from apps.users.models import User, Role, Permission


class Command(BaseCommand):
    help = 'Seed initial RBAC permissions and roles'

    def handle(self, *args, **options):
        self.stdout.write('Seeding RBAC data...')

        created_permissions = []
        created_roles = []

        with transaction.atomic():
            # Define all permissions
            permissions_data = [
                # Dashboard
                ('dashboard.view', 'dashboard', 'View dashboard and analytics'),

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

                # Reports
                ('reports.view', 'reports', 'View reports and analytics'),
                ('reports.export', 'reports', 'Export reports'),
                ('reports.audit_logs', 'reports', 'View audit logs'),

                # Reviews
                ('reviews.view', 'reviews', 'View reviews'),
                ('reviews.create', 'reviews', 'Create reviews'),
                ('reviews.edit', 'reviews', 'Edit reviews'),
                ('reviews.delete', 'reviews', 'Delete reviews'),
                ('reviews.approve', 'reviews', 'Approve/reject reviews'),
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
                    self.stdout.write(self.style.SUCCESS(f'  Created permission: {code}'))

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
                        'dashboard.view',
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
                        'dashboard.view',
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
                    self.stdout.write(self.style.SUCCESS(f'  Created role: {role.name}'))

                # Assign permissions (skip for super admin)
                if not role.is_super_admin and permission_codes:
                    permissions = Permission.objects.filter(code__in=permission_codes)
                    role.permissions.set(permissions)

            # Assign super admin role to first admin/team user
            super_admin_role = Role.objects.get(slug='super_admin')
            admin_users = User.objects.filter(legacy_role__in=['admin', 'team']).order_by('created_at')

            if admin_users.exists():
                for user in admin_users:
                    if not user.assigned_role:
                        user.assigned_role = super_admin_role
                        user.save(update_fields=['assigned_role'])
                        self.stdout.write(self.style.SUCCESS(f'  Assigned Super Admin role to: {user.email}'))

        self.stdout.write(self.style.SUCCESS(f'\nRBAC data seeded successfully!'))
        self.stdout.write(f'  Created {len(created_permissions)} new permissions')
        self.stdout.write(f'  Created {len(created_roles)} new roles')
        self.stdout.write(f'  Total permissions: {Permission.objects.count()}')
        self.stdout.write(f'  Total roles: {Role.objects.count()}')
