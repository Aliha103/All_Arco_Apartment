"""
Management command to create cleaning schedules for existing bookings.
"""

from django.core.management.base import BaseCommand
from apps.bookings.models import Booking, BlockedDate
from apps.cleaning.models import CleaningSchedule, CleaningTask


class Command(BaseCommand):
    help = 'Create cleaning schedules for existing bookings and blocked dates'

    def handle(self, *args, **options):
        created_count = 0

        # Create cleanings for existing bookings
        bookings = Booking.objects.filter(
            status__in=['confirmed', 'paid', 'checked_in', 'checked_out']
        ).exclude(
            id__in=CleaningSchedule.objects.filter(
                booking__isnull=False
            ).values_list('booking_id', flat=True)
        )

        self.stdout.write(f'Found {bookings.count()} bookings without cleaning schedules')

        for booking in bookings:
            # Create cleaning schedule
            cleaning = CleaningSchedule.objects.create(
                booking=booking,
                scheduled_date=booking.check_out_date,
                scheduled_time='11:00',
                status='pending',
                priority='medium',
                special_instructions=f'Post check-out cleaning for {booking.guest_name}'
            )

            # Create default cleaning tasks
            default_tasks = [
                ('Living Room', 'living_room', 1),
                ('Kitchen', 'kitchen', 2),
                ('Bedroom', 'bedroom', 3),
                ('Bathroom', 'bathroom', 4),
                ('Floors & Surfaces', 'general', 5),
                ('Windows & Mirrors', 'general', 6),
                ('Trash & Recycling', 'general', 7),
                ('Check Amenities', 'inspection', 8),
                ('Restock Supplies', 'inspection', 9),
                ('Final Inspection', 'inspection', 10),
            ]

            for title, category, order in default_tasks:
                CleaningTask.objects.create(
                    cleaning_schedule=cleaning,
                    title=title,
                    category=category,
                    order=order,
                    is_completed=False
                )

            created_count += 1
            self.stdout.write(
                self.style.SUCCESS(f'Created cleaning for booking {booking.booking_id}')
            )

        # Create cleanings for blocked dates
        blocked_dates = BlockedDate.objects.all()

        for blocked_date in blocked_dates:
            # Check if cleaning already exists
            existing = CleaningSchedule.objects.filter(
                scheduled_date=blocked_date.end_date,
                booking__isnull=True
            ).first()

            if not existing:
                cleaning = CleaningSchedule.objects.create(
                    scheduled_date=blocked_date.end_date,
                    scheduled_time='14:00',
                    status='pending',
                    priority='low',
                    special_instructions=f'Cleaning after blocked period: {blocked_date.reason or "Maintenance"}'
                )

                # Create basic tasks
                basic_tasks = [
                    ('General Cleaning', 'general', 1),
                    ('Check Property', 'inspection', 2),
                    ('Restock if Needed', 'inspection', 3),
                ]

                for title, category, order in basic_tasks:
                    CleaningTask.objects.create(
                        cleaning_schedule=cleaning,
                        title=title,
                        category=category,
                        order=order,
                        is_completed=False
                    )

                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created cleaning for blocked date ending {blocked_date.end_date}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} cleaning schedules')
        )
