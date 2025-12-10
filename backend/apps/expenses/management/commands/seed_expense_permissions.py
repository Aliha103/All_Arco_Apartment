"""
Management command to seed expense permissions.
Run with: python manage.py seed_expense_permissions
"""
from django.core.management.base import BaseCommand
from apps.users.models import Permission


class Command(BaseCommand):
    help = 'Seed expense management permissions'

    def handle(self, *args, **options):
        permissions_data = [
            {
                'code': 'expenses.view',
                'group': 'expenses',
                'description': 'Can view expenses and statistics'
            },
            {
                'code': 'expenses.create',
                'group': 'expenses',
                'description': 'Can create new expense records'
            },
            {
                'code': 'expenses.edit',
                'group': 'expenses',
                'description': 'Can edit existing expenses'
            },
            {
                'code': 'expenses.delete',
                'group': 'expenses',
                'description': 'Can delete expense records'
            },
            {
                'code': 'expenses.approve',
                'group': 'expenses',
                'description': 'Can approve or reject expenses'
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
                f'\n✅ Expense permissions seeded successfully!'
                f'\n   Created: {created_count}'
                f'\n   Updated: {updated_count}'
            )
        )
