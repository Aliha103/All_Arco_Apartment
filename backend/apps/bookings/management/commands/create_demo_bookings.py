"""
Management command to create demo bookings from different sources.

Usage:
    python manage.py create_demo_bookings
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from apps.bookings.models import Booking, BookingGuest
from apps.users.models import User


class Command(BaseCommand):
    help = 'Creates 4 demo bookings from different sources (Airbnb, Booking.com, website, direct)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Creating demo bookings...'))

        # Get or create a demo guest user
        demo_guest, created = User.objects.get_or_create(
            email='demo.guest@example.com',
            defaults={
                'first_name': 'Demo',
                'last_name': 'Guest',
                'username': 'demo.guest@example.com',
                'legacy_role': 'guest',
                'is_active': True,
            }
        )
        if created:
            demo_guest.set_password('demo123')
            demo_guest.save()
            self.stdout.write(self.style.SUCCESS(f'Created demo guest user: {demo_guest.email}'))

        # Demo bookings data with different sources
        demo_bookings = [
            {
                'guest_name': 'John Smith',
                'guest_email': 'john.smith@airbnb.com',
                'guest_phone': '+1-555-0101',
                'number_of_guests': 2,
                'check_in_date': timezone.now().date() + timedelta(days=7),
                'check_out_date': timezone.now().date() + timedelta(days=10),
                'booking_source': 'airbnb',
                'status': 'confirmed',
                'payment_status': 'paid',
                'nightly_rate': Decimal('180.00'),
                'cleaning_fee': Decimal('50.00'),
                'tourist_tax': Decimal('6.00'),  # 2 guests * 3 nights * €1
                'special_requests': 'Early check-in requested',
            },
            {
                'guest_name': 'Maria Garcia',
                'guest_email': 'maria.garcia@booking.com',
                'guest_phone': '+34-612-345-678',
                'number_of_guests': 3,
                'check_in_date': timezone.now().date() + timedelta(days=14),
                'check_out_date': timezone.now().date() + timedelta(days=18),
                'booking_source': 'booking_com',
                'status': 'confirmed',
                'payment_status': 'paid',
                'nightly_rate': Decimal('195.00'),
                'cleaning_fee': Decimal('50.00'),
                'tourist_tax': Decimal('12.00'),  # 3 guests * 4 nights * €1
                'special_requests': 'Need baby cot',
            },
            {
                'guest_name': 'Sophie Laurent',
                'guest_email': 'sophie.laurent@gmail.com',
                'guest_phone': '+33-6-12-34-56-78',
                'number_of_guests': 2,
                'check_in_date': timezone.now().date() + timedelta(days=21),
                'check_out_date': timezone.now().date() + timedelta(days=26),
                'booking_source': 'website',
                'status': 'confirmed',
                'payment_status': 'paid',
                'nightly_rate': Decimal('175.00'),
                'cleaning_fee': Decimal('50.00'),
                'tourist_tax': Decimal('10.00'),  # 2 guests * 5 nights * €1
                'special_requests': 'Anniversary celebration - champagne requested',
            },
            {
                'guest_name': 'Thomas Mueller',
                'guest_email': 'thomas.mueller@email.de',
                'guest_phone': '+49-170-1234567',
                'number_of_guests': 4,
                'check_in_date': timezone.now().date() + timedelta(days=35),
                'check_out_date': timezone.now().date() + timedelta(days=42),
                'booking_source': 'direct',
                'status': 'confirmed',
                'payment_status': 'partial',
                'nightly_rate': Decimal('200.00'),
                'cleaning_fee': Decimal('50.00'),
                'tourist_tax': Decimal('28.00'),  # 4 guests * 7 nights * €1
                'special_requests': 'Family vacation - need recommendations for kids activities',
            },
        ]

        created_count = 0
        for booking_data in demo_bookings:
            # Calculate nights
            nights = (booking_data['check_out_date'] - booking_data['check_in_date']).days

            # Calculate total price
            total_price = (
                booking_data['nightly_rate'] * nights +
                booking_data['cleaning_fee'] +
                booking_data['tourist_tax']
            )

            # Check if a similar booking already exists
            existing = Booking.objects.filter(
                guest_email=booking_data['guest_email'],
                check_in_date=booking_data['check_in_date']
            ).first()

            if existing:
                self.stdout.write(
                    self.style.WARNING(
                        f'Booking for {booking_data["guest_name"]} from {booking_data["booking_source"]} already exists. Skipping.'
                    )
                )
                continue

            # Create the booking
            booking = Booking.objects.create(
                user=demo_guest,
                guest_name=booking_data['guest_name'],
                guest_email=booking_data['guest_email'],
                guest_phone=booking_data['guest_phone'],
                number_of_guests=booking_data['number_of_guests'],
                check_in_date=booking_data['check_in_date'],
                check_out_date=booking_data['check_out_date'],
                booking_source=booking_data['booking_source'],
                status=booking_data['status'],
                payment_status=booking_data['payment_status'],
                nightly_rate=booking_data['nightly_rate'],
                cleaning_fee=booking_data['cleaning_fee'],
                tourist_tax=booking_data['tourist_tax'],
                total_price=total_price,
                special_requests=booking_data['special_requests'],
            )

            source_display = dict(Booking.SOURCE_CHOICES).get(
                booking_data['booking_source'],
                booking_data['booking_source']
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'Created booking {booking.booking_id} for {booking_data["guest_name"]} '
                    f'from {source_display} (€{total_price})'
                )
            )
            created_count += 1

        if created_count > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nSuccessfully created {created_count} demo booking(s)!'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    '\nNo new demo bookings created. They may already exist.'
                )
            )
