"""
Management command to initialize pricing settings with default values.
Run this on Railway if Settings singleton doesn't exist.
"""
from django.core.management.base import BaseCommand
from apps.pricing.models import Settings


class Command(BaseCommand):
    help = 'Initialize pricing settings with default values'

    def handle(self, *args, **options):
        try:
            settings = Settings.objects.get(pk=1)
            self.stdout.write(self.style.SUCCESS(
                f'Settings already exist: ID={settings.id}, nightly_rate={settings.default_nightly_rate}'
            ))
        except Settings.DoesNotExist:
            self.stdout.write(self.style.WARNING('Settings do not exist. Creating with defaults...'))

            # Create with default values
            settings = Settings.objects.create(
                id=1,
                default_nightly_rate=150.00,
                cleaning_fee=25.00,
                pet_cleaning_fee=15.00,
                tourist_tax_per_person_per_night=2.50,
                minimum_stay_nights=2,
                maximum_stay_nights=30,
                check_in_time='15:00',
                check_out_time='11:00',
                max_guests=4,
                extra_guest_fee=15.00,
                extra_guest_threshold=2,
            )

            self.stdout.write(self.style.SUCCESS(
                f'✓ Created Settings: ID={settings.id}, nightly_rate={settings.default_nightly_rate}'
            ))

        # Test the calculate_booking_price method
        from datetime import date, timedelta
        check_in = date.today() + timedelta(days=7)
        check_out = check_in + timedelta(days=2)

        try:
            pricing = settings.calculate_booking_price(check_in, check_out, 2, has_pet=False)
            self.stdout.write(self.style.SUCCESS(
                f'✓ Price calculation works: total={pricing["total"]}'
            ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Price calculation failed: {e}'))
