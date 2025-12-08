from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0010_booking_applied_credit_amount_due'),
    ]

    operations = [
        migrations.CreateModel(
            name='BookingAttempt',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('stripe_session_id', models.CharField(blank=True, db_index=True, max_length=255, null=True)),
                ('status', models.CharField(choices=[('initiated', 'Initiated'), ('paid', 'Paid'), ('failed', 'Failed'), ('expired', 'Expired'), ('canceled', 'Canceled')], default='initiated', max_length=20)),
                ('failure_reason', models.TextField(blank=True, null=True)),
                ('amount_due', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('guest_email', models.EmailField(blank=True, max_length=254, null=True)),
                ('guest_name', models.CharField(blank=True, max_length=150, null=True)),
                ('check_in_date', models.DateField(blank=True, null=True)),
                ('check_out_date', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('booking', models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='attempts', to='bookings.booking')),
            ],
            options={
                'db_table': 'bookings_attempt',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='bookingattempt',
            index=models.Index(fields=['stripe_session_id'], name='bookings_at_stripe__c85b52_idx'),
        ),
        migrations.AddIndex(
            model_name='bookingattempt',
            index=models.Index(fields=['status'], name='bookings_at_status_81d8c9_idx'),
        ),
        migrations.AddIndex(
            model_name='bookingattempt',
            index=models.Index(fields=['guest_email'], name='bookings_at_guest_e_7a0736_idx'),
        ),
    ]
