"""
Management command to create a super admin user with RBAC role
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.users.models import User, Role, Permission


class Command(BaseCommand):
    help = 'Create a super admin user with full RBAC permissions'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, default='support@allarcoapartment.com')
        parser.add_argument('--password', type=str, default='admin123')
        parser.add_argument('--first-name', type=str, default='Super')
        parser.add_argument('--last-name', type=str, default='Admin')

    @transaction.atomic
    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        first_name = options['first_name']
        last_name = options['last_name']

        # First, ensure we have the RBAC system seeded
        self.seed_rbac()

        # Get or create the Super Admin role
        super_admin_role = Role.objects.filter(is_super_admin=True).first()
        if not super_admin_role:
            super_admin_role = Role.objects.create(
                name='Super Admin',
                slug='super-admin',
                description='Full system access with all permissions',
                is_super_admin=True,
                is_system=True,
            )
            self.stdout.write(self.style.SUCCESS(f'Created Super Admin role'))

        # Check if user already exists
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name': first_name,
                'last_name': last_name,
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
                'assigned_role': super_admin_role,
                'legacy_role': 'admin',
            }
        )

        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created super admin user: {email}'))
        else:
            # Update existing user to be super admin
            user.assigned_role = super_admin_role
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.legacy_role = 'admin'
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Updated existing user to super admin: {email}'))

        self.stdout.write(self.style.SUCCESS(f'\nSuper Admin Created:'))
        self.stdout.write(f'  Email: {email}')
        self.stdout.write(f'  Password: {password}')
        self.stdout.write(f'  Role: {super_admin_role.name}')

    def seed_rbac(self):
        """Seed the RBAC system with default roles and permissions"""

        # Define all permissions
        permissions_data = [
            # Bookings
            ('bookings.view', 'bookings', 'View bookings'),
            ('bookings.create', 'bookings', 'Create bookings'),
            ('bookings.update', 'bookings', 'Update bookings'),
            ('bookings.delete', 'bookings', 'Delete bookings'),
            ('bookings.cancel', 'bookings', 'Cancel bookings'),
            ('bookings.mark_no_show', 'bookings', 'Mark bookings as no-show'),
            # Payments
            ('payments.view', 'payments', 'View payments'),
            ('payments.create', 'payments', 'Create payments'),
            ('payments.refund', 'payments', 'Process refunds'),
            ('payments.export', 'payments', 'Export payment data'),
            # Guests
            ('guests.view', 'guests', 'View guest profiles'),
            ('guests.update', 'guests', 'Update guest profiles'),
            ('guests.notes', 'guests', 'Manage guest notes'),
            ('guests.export', 'guests', 'Export guest data'),
            # Pricing
            ('pricing.view', 'pricing', 'View pricing settings'),
            ('pricing.update', 'pricing', 'Update pricing settings'),
            ('pricing.rules_manage', 'pricing', 'Manage pricing rules'),
            # Team
            ('team.view', 'team', 'View team members'),
            ('team.invite', 'team', 'Invite team members'),
            ('team.update', 'team', 'Update team members'),
            ('team.deactivate', 'team', 'Deactivate team members'),
            # Reports
            ('reports.view', 'reports', 'View reports'),
            ('reports.export', 'reports', 'Export reports'),
            ('reports.audit_logs', 'reports', 'View audit logs'),
            # Roles
            ('roles.manage', 'roles', 'Manage roles and permissions'),
            # Invoices
            ('invoices.view', 'invoices', 'View invoices'),
            ('invoices.create', 'invoices', 'Create invoices'),
            ('invoices.update', 'invoices', 'Update invoices'),
            ('invoices.send', 'invoices', 'Send invoices'),
            ('invoices.cancel', 'invoices', 'Cancel invoices'),
            # Calendar
            ('calendar.view', 'calendar', 'View calendar'),
            ('calendar.block_dates', 'calendar', 'Block dates on calendar'),
            # Gallery
            ('gallery.view', 'gallery', 'View gallery images'),
            ('gallery.manage', 'gallery', 'Manage gallery images'),
        ]

        # Create permissions
        for code, group, description in permissions_data:
            Permission.objects.get_or_create(
                code=code,
                defaults={'group': group, 'description': description}
            )

        self.stdout.write(self.style.SUCCESS(f'Seeded {len(permissions_data)} permissions'))

        # Define default roles
        roles_data = [
            {
                'name': 'Super Admin',
                'slug': 'super-admin',
                'description': 'Full system access with all permissions',
                'is_super_admin': True,
                'is_system': True,
                'permissions': [],  # Super admin has all permissions implicitly
            },
            {
                'name': 'Front Desk',
                'slug': 'front-desk',
                'description': 'Manage bookings, guests, and check-ins',
                'is_super_admin': False,
                'is_system': True,
                'permissions': [
                    'bookings.view', 'bookings.create', 'bookings.update', 'bookings.cancel',
                    'guests.view', 'guests.update', 'guests.notes',
                    'calendar.view', 'calendar.block_dates',
                    'invoices.view', 'invoices.send',
                    'gallery.view', 'gallery.manage',
                ],
            },
            {
                'name': 'Accounting',
                'slug': 'accounting',
                'description': 'Manage payments, invoices, and financial reports',
                'is_super_admin': False,
                'is_system': True,
                'permissions': [
                    'bookings.view',
                    'payments.view', 'payments.create', 'payments.refund', 'payments.export',
                    'invoices.view', 'invoices.create', 'invoices.update', 'invoices.send', 'invoices.cancel',
                    'reports.view', 'reports.export',
                    'guests.view',
                ],
            },
            {
                'name': 'Housekeeping',
                'slug': 'housekeeping',
                'description': 'View-only access to bookings and calendar',
                'is_super_admin': False,
                'is_system': True,
                'permissions': [
                    'bookings.view',
                    'calendar.view',
                    'guests.view',
                ],
            },
        ]

        for role_data in roles_data:
            permission_codes = role_data.pop('permissions')
            role, created = Role.objects.get_or_create(
                slug=role_data['slug'],
                defaults=role_data
            )
            if permission_codes:
                permissions = Permission.objects.filter(code__in=permission_codes)
                role.permissions.set(permissions)

        self.stdout.write(self.style.SUCCESS(f'Seeded {len(roles_data)} roles'))
