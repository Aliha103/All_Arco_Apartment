import apps.users.models
from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0011_enforce_case_insensitive_email'),
    ]

    operations = [
        migrations.CreateModel(
            name='HostProfile',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('display_name', models.CharField(max_length=150)),
                ('role_title', models.CharField(blank=True, default='', max_length=150)),
                ('bio', models.TextField(blank=True, default='')),
                ('languages', models.JSONField(blank=True, default=list)),
                ('photo', models.ImageField(blank=True, null=True, upload_to=apps.users.models.host_avatar_upload_path)),
                ('photo_url', models.URLField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Host Profile',
                'verbose_name_plural': 'Host Profiles',
                'db_table': 'users_hostprofile',
            },
        ),
        migrations.CreateModel(
            name='Review',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('guest_name', models.CharField(max_length=150)),
                ('location', models.CharField(blank=True, default='', max_length=150)),
                ('rating', models.DecimalField(decimal_places=1, max_digits=3)),
                ('title', models.CharField(blank=True, default='', max_length=200)),
                ('text', models.TextField()),
                ('stay_date', models.DateField(blank=True, null=True)),
                ('is_featured', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'users_review',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='review',
            index=models.Index(fields=['is_active'], name='users_revie_is_acti_985fa9_idx'),
        ),
        migrations.AddIndex(
            model_name='review',
            index=models.Index(fields=['is_featured'], name='users_revie_is_feat_8e41c6_idx'),
        ),
    ]
