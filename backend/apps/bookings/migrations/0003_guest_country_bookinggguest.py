# Generated manually for booking guest check-in data (Alloggiati Web compliance)

import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0002_initial'),
    ]

    operations = [
        # Add guest_country to Booking model
        migrations.AddField(
            model_name='booking',
            name='guest_country',
            field=models.CharField(default='', max_length=100),
            preserve_default=False,
        ),
        # Create BookingGuest model for check-in data
        migrations.CreateModel(
            name='BookingGuest',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('is_primary', models.BooleanField(default=False)),
                ('first_name', models.CharField(max_length=50)),
                ('last_name', models.CharField(max_length=50)),
                ('email', models.EmailField(blank=True, max_length=254, null=True)),
                ('date_of_birth', models.DateField()),
                ('country_of_birth', models.CharField(max_length=100)),
                # Italian citizen fields
                ('birth_province', models.CharField(blank=True, max_length=100, null=True)),
                ('birth_city', models.CharField(blank=True, max_length=100, null=True)),
                # Document information
                ('document_type', models.CharField(choices=[
                    ('passport', 'Passport'),
                    ('id_card', 'ID Card'),
                    ('driving_license', 'Driving License'),
                    ('residence_permit', 'Residence Permit'),
                ], max_length=20)),
                ('document_number', models.CharField(max_length=50)),
                ('document_issue_date', models.DateField()),
                ('document_expire_date', models.DateField()),
                ('document_issue_country', models.CharField(max_length=100)),
                # Italian-issued document fields
                ('document_issue_province', models.CharField(blank=True, max_length=100, null=True)),
                ('document_issue_city', models.CharField(blank=True, max_length=100, null=True)),
                # Timestamps
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                # Foreign key to booking
                ('booking', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='guests',
                    to='bookings.booking'
                )),
            ],
            options={
                'db_table': 'bookings_bookinggguest',
                'ordering': ['-is_primary', 'created_at'],
            },
        ),
        # Add indexes
        migrations.AddIndex(
            model_name='bookinggguest',
            index=models.Index(fields=['booking'], name='bookings_bo_booking_idx'),
        ),
        migrations.AddIndex(
            model_name='bookinggguest',
            index=models.Index(fields=['is_primary'], name='bookings_bo_is_prim_idx'),
        ),
    ]
