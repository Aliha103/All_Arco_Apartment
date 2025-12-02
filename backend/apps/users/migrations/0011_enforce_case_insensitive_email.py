from django.db import migrations, models
from django.db.models.functions import Lower


def normalize_user_identifiers(apps, schema_editor):
    User = apps.get_model('users', 'User')

    def ensure_unique(value, seen):
        """
        Ensure the value is unique within the provided set.
        If a collision happens, append a deterministic suffix.
        """
        base = value or ''
        candidate = base
        counter = 1

        while candidate in seen:
            if '@' in base:
                local, _, domain = base.partition('@')
                candidate = f"{local}+dedup{counter}@{domain}"
            else:
                candidate = f"{base}-dedup{counter}"
            counter += 1
        seen.add(candidate)
        return candidate

    email_seen = set()
    username_seen = set()

    for user in User.objects.all().order_by('created_at', 'id'):
        email = (user.email or '').strip().lower()
        username = (user.username or '').strip().lower()

        # Default username to email for consistency
        if not username:
            username = email

        email = ensure_unique(email, email_seen)
        username = ensure_unique(username or email, username_seen)

        user.email = email
        user.username = username
        user.save(update_fields=['email', 'username'])


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0010_alter_permission_group'),
    ]

    operations = [
        migrations.RunPython(
            normalize_user_identifiers,
            reverse_code=migrations.RunPython.noop
        ),
        migrations.AddConstraint(
            model_name='user',
            constraint=models.UniqueConstraint(
                Lower('email'),
                name='users_user_email_ci_unique'
            ),
        ),
        migrations.AddConstraint(
            model_name='user',
            constraint=models.UniqueConstraint(
                Lower('username'),
                name='users_user_username_ci_unique'
            ),
        ),
    ]
