# Data migration to create initial host profile

import uuid
from django.db import migrations


def create_initial_host_profile(apps, schema_editor):
    """Create default host profile with current hardcoded values."""
    HostProfile = apps.get_model('users', 'HostProfile')

    # Only create if no profile exists (idempotent)
    if not HostProfile.objects.exists():
        HostProfile.objects.create(
            display_name='Ali Hassan Cheema',
            languages='English, Italian',
            is_superhost=True,
            review_count=59,
            bio='',  # Empty initially
        )


def reverse_migration(apps, schema_editor):
    """Delete the initial host profile."""
    HostProfile = apps.get_model('users', 'HostProfile')
    HostProfile.objects.filter(display_name='Ali Hassan Cheema').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0013_add_hostprofile'),
    ]

    operations = [
        migrations.RunPython(create_initial_host_profile, reverse_migration),
    ]
