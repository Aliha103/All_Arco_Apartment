# Generated migration for WSKEY and connection status fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('alloggiati', '0001_initial'),
    ]

    operations = [
        # Remove old token-related fields
        migrations.RemoveField(
            model_name='alloggiatiaccount',
            name='token',
        ),
        migrations.RemoveField(
            model_name='alloggiatiaccount',
            name='token_expires_at',
        ),
        migrations.RemoveField(
            model_name='alloggiatiaccount',
            name='last_fetched_at',
        ),

        # Add new fields
        migrations.AddField(
            model_name='alloggiatiaccount',
            name='password',
            field=models.CharField(blank=True, help_text='Encrypted password', max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='alloggiatiaccount',
            name='wskey',
            field=models.CharField(blank=True, help_text='Web Service Key from Alloggiati portal', max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='alloggiatiaccount',
            name='is_connected',
            field=models.BooleanField(default=False, help_text='Whether credentials are working'),
        ),
        migrations.AddField(
            model_name='alloggiatiaccount',
            name='last_test_at',
            field=models.DateTimeField(blank=True, help_text='Last successful connection test', null=True),
        ),

        # Update existing fields
        migrations.AlterField(
            model_name='alloggiatiaccount',
            name='username',
            field=models.CharField(blank=True, help_text='Alloggiati Web username', max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='alloggiatiaccount',
            name='last_error',
            field=models.TextField(blank=True, help_text='Last error message', null=True),
        ),
    ]
