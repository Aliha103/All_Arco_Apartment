# Generated manually to add guest_tax_code to booking
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0005_booking_booking_source'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='guest_tax_code',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]

