# Generated manually for HostProfile model

import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0012_add_gallery_permissions'),
    ]

    operations = [
        migrations.CreateModel(
            name='HostProfile',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('display_name', models.CharField(help_text="Name shown as 'Hosted by [name]'", max_length=200)),
                ('bio', models.TextField(blank=True, help_text='Host bio/description - not shown on homepage', null=True)),
                ('languages', models.CharField(blank=True, help_text="Comma-separated languages (e.g., 'English, Italian')", max_length=500)),
                ('avatar', models.ImageField(blank=True, help_text='Upload avatar image', null=True, upload_to='host/avatar/')),
                ('avatar_url', models.URLField(blank=True, help_text='External avatar URL (alternative to upload)', max_length=2000, null=True)),
                ('is_superhost', models.BooleanField(default=True, help_text='Show Superhost badge')),
                ('review_count', models.PositiveIntegerField(default=59, help_text='Total review count (editable for manual updates)')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'users_hostprofile',
                'verbose_name': 'Host Profile',
                'verbose_name_plural': 'Host Profiles',
            },
        ),
    ]
