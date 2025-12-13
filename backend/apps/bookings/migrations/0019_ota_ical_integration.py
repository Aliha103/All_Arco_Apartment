# Generated manually for OTA and iCal integration

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('bookings', '0018_booking_pet_fee'),
    ]

    operations = [
        # Add OTA fields to Booking model
        migrations.AddField(
            model_name='booking',
            name='ota_platform',
            field=models.CharField(blank=True, help_text='OTA platform name (Airbnb, Booking.com, Expedia, etc.)', max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='booking',
            name='ota_confirmation_code',
            field=models.CharField(blank=True, help_text='OTA platform confirmation/booking number', max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='booking',
            name='ota_commission_percent',
            field=models.DecimalField(decimal_places=2, default=0, help_text='OTA commission percentage', max_digits=5),
        ),
        migrations.AddField(
            model_name='booking',
            name='ota_commission_amount',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Calculated OTA commission amount', max_digits=10),
        ),
        migrations.AddField(
            model_name='booking',
            name='ical_uid',
            field=models.CharField(blank=True, db_index=True, help_text='Unique identifier from iCal feed (for synced bookings)', max_length=255, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='booking',
            name='synced_from_ical',
            field=models.BooleanField(default=False, help_text='Whether this booking was imported from an iCal feed'),
        ),
        # Create ICalSource model
        migrations.CreateModel(
            name='ICalSource',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('ota_name', models.CharField(help_text='OTA platform name (Airbnb, Booking.com, etc.)', max_length=50)),
                ('ical_url', models.URLField(help_text='iCal feed URL from the OTA platform', max_length=500)),
                ('sync_status', models.CharField(choices=[('active', 'Active'), ('error', 'Error'), ('paused', 'Paused')], default='active', max_length=20)),
                ('last_synced', models.DateTimeField(blank=True, help_text='Last time this feed was successfully synced', null=True)),
                ('last_sync_error', models.TextField(blank=True, help_text='Error message from last failed sync', null=True)),
                ('bookings_count', models.IntegerField(default=0, help_text='Number of bookings synced from this source')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ical_sources_created', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'iCal Source',
                'verbose_name_plural': 'iCal Sources',
                'ordering': ['-created_at'],
            },
        ),
    ]
