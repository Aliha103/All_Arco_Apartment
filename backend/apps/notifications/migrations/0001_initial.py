# Generated manually for notification system

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('type', models.CharField(choices=[('booking_confirmed', 'Booking Confirmed'), ('booking_cancelled', 'Booking Cancelled'), ('booking_modified', 'Booking Modified'), ('booking_checked_in', 'Booking Checked In'), ('booking_checked_out', 'Booking Checked Out'), ('payment_received', 'Payment Received'), ('payment_due', 'Payment Due'), ('date_blocked', 'Date Blocked'), ('system', 'System Notification')], help_text='Type of notification', max_length=50)),
                ('title', models.CharField(help_text='Notification title', max_length=255)),
                ('message', models.TextField(help_text='Notification message content')),
                ('booking_id', models.CharField(blank=True, help_text='Related booking ID', max_length=255, null=True)),
                ('data', models.JSONField(blank=True, default=dict, help_text='Additional data (guest name, dates, amounts, etc.)')),
                ('is_read', models.BooleanField(default=False, help_text='Whether notification has been read')),
                ('read_at', models.DateTimeField(blank=True, help_text='When notification was read', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(help_text='User who receives this notification', on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Notification',
                'verbose_name_plural': 'Notifications',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', '-created_at'], name='notificatio_user_id_9c1e89_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', 'is_read'], name='notificatio_user_id_4f5a8b_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['booking_id'], name='notificatio_booking_1a2b3c_idx'),
        ),
    ]
