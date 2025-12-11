"""
Management command to seed invoice permissions.
Run with: python manage.py seed_invoice_permissions
"""
from django.core.management.base import BaseCommand
from apps.users.models import Permission


class Command(BaseCommand):
    help = 'Seed invoice management permissions'

    def handle(self, *args, **options):
        permissions_data = [
            {
                'code': 'invoices.view',
                'group': 'invoices',
                'description': 'Can view invoices and receipts'
            },
            {
                'code': 'invoices.create',
                'group': 'invoices',
                'description': 'Can create new invoices and receipts'
            },
            {
                'code': 'invoices.edit',
                'group': 'invoices',
                'description': 'Can edit invoice settings (Note: invoices themselves are immutable after creation)'
            },
            {
                'code': 'invoices.delete',
                'group': 'invoices',
                'description': 'Can delete invoices and receipts'
            },
            {
                'code': 'invoices.send',
                'group': 'invoices',
                'description': 'Can send invoices via email'
            },
        ]

        created_count = 0
        updated_count = 0

        for perm_data in permissions_data:
            permission, created = Permission.objects.update_or_create(
                code=perm_data['code'],
                defaults={
                    'group': perm_data['group'],
                    'description': perm_data['description']
                }
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created permission: {permission.code}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated permission: {permission.code}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Invoice permissions seeded successfully!'
                f'\n   Created: {created_count}'
                f'\n   Updated: {updated_count}'
            )
        )
