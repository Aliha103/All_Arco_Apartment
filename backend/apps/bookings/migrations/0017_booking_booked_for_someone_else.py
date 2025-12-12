# Generated manually for proxy booking tracking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0016_booking_review_requested_at_booking_review_submitted_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='booked_for_someone_else',
            field=models.BooleanField(default=False, help_text='True if logged-in user booked for a different guest'),
        ),
    ]
