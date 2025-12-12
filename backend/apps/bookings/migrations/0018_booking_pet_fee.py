# Generated manually for pet fee tracking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0017_booking_booked_for_someone_else'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='pet_fee',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Pet cleaning fee', max_digits=10),
        ),
    ]
