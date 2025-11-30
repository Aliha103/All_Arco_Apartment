# Generated manually for dashboard permission
from django.db import migrations


def add_dashboard_permission(apps, schema_editor):
    """
    Add dashboard.view permission to the Permission model.
    This allows role-based access control for the PMS dashboard.
    """
    Permission = apps.get_model('users', 'Permission')

    # Create dashboard.view permission
    Permission.objects.get_or_create(
        code='dashboard.view',
        defaults={
            'group': 'dashboard',
            'description': 'View PMS dashboard with statistics and analytics',
        }
    )


def remove_dashboard_permission(apps, schema_editor):
    """Reverse migration - remove dashboard permission."""
    Permission = apps.get_model('users', 'Permission')
    Permission.objects.filter(code='dashboard.view').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0008_fix_reference_code_length'),
    ]

    operations = [
        migrations.RunPython(add_dashboard_permission, remove_dashboard_permission),
    ]
