"""
Signals for automatically creating cleaning schedules.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.bookings.models import Booking, BlockedDate
from .models import CleaningSchedule, CleaningTask


@receiver(post_save, sender=Booking)
def create_cleaning_for_checkout(sender, instance, created, **kwargs):
    """
    Automatically create a cleaning schedule when a booking is created or confirmed.
    Cleaning is scheduled for the check-out date.
    """
    # Only create cleaning for confirmed, paid bookings (not cancelled or no-show)
    if instance.status in ['confirmed', 'paid', 'checked_in', 'checked_out']:
        # Check if cleaning already exists for this booking
        existing = CleaningSchedule.objects.filter(booking=instance).first()

        if not existing:
            # Create cleaning schedule
            cleaning = CleaningSchedule.objects.create(
                booking=instance,
                scheduled_date=instance.check_out_date,
                scheduled_time='11:00',  # Default check-out time
                status='pending',
                priority='medium',
                special_instructions=f'Post check-out cleaning for {instance.guest_name}'
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


@receiver(post_save, sender=BlockedDate)
def create_cleaning_for_blocked_date(sender, instance, created, **kwargs):
    """
    Automatically create a cleaning schedule when blocked dates end.
    Cleaning is scheduled for the end date of the blocked period.
    """
    if created:
        # Check if cleaning already exists for this blocked date end
        existing = CleaningSchedule.objects.filter(
            scheduled_date=instance.end_date,
            booking__isnull=True
        ).first()

        if not existing:
            # Create cleaning schedule
            cleaning = CleaningSchedule.objects.create(
                scheduled_date=instance.end_date,
                scheduled_time='14:00',  # Afternoon cleaning for blocked dates
                status='pending',
                priority='low',  # Lower priority than guest check-outs
                special_instructions=f'Cleaning after blocked period: {instance.reason or "Maintenance"}'
            )

            # Create basic cleaning tasks for blocked dates
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
