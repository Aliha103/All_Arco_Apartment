from django.db import migrations


def create_gallery_permissions(apps, schema_editor):
    Permission = apps.get_model('users', 'Permission')

    permissions = [
        {
            'code': 'gallery.view',
            'group': 'gallery',
            'description': 'View gallery images',
        },
        {
            'code': 'gallery.manage',
            'group': 'gallery',
            'description': 'Upload, edit, and delete gallery images',
        },
    ]

    for perm_data in permissions:
        Permission.objects.get_or_create(
            code=perm_data['code'],
            defaults={
                'group': perm_data['group'],
                'description': perm_data['description'],
            }
        )


def reverse_gallery_permissions(apps, schema_editor):
    Permission = apps.get_model('users', 'Permission')
    Permission.objects.filter(code__startswith='gallery.').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0011_enforce_case_insensitive_email'),
    ]

    operations = [
        migrations.RunPython(
            create_gallery_permissions,
            reverse_gallery_permissions
        ),
    ]
