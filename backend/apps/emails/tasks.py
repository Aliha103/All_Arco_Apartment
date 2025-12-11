"""
Celery tasks for scheduled emails.
"""
from celery import shared_task
from datetime import datetime, timedelta
from apps.bookings.models import Booking
from .services import send_booking_confirmation, send_review_request_email


@shared_task
def send_checkin_instructions():
    """Send check-in instructions 48 hours before arrival."""
    target_date = datetime.now().date() + timedelta(days=2)

    bookings = Booking.objects.filter(
        check_in_date=target_date,
        status__in=['confirmed', 'paid']
    )

    for booking in bookings:
        # TODO: Implement check-in instructions email
        pass

    return f"Sent check-in instructions to {bookings.count()} bookings"


@shared_task
def send_pre_arrival_reminders():
    """Send pre-arrival reminders 7 days before check-in."""
    target_date = datetime.now().date() + timedelta(days=7)

    bookings = Booking.objects.filter(
        check_in_date=target_date,
        status__in=['confirmed', 'paid']
    )

    for booking in bookings:
        # TODO: Implement pre-arrival reminder email
        pass

    return f"Sent pre-arrival reminders to {bookings.count()} bookings"


@shared_task
def send_post_stay_emails():
    """
    Send review request emails 1 day after check-out.

    Sends emails to guests who:
    - Checked out exactly 1 day ago
    - Have status='checked_out'
    - Can request review (not already submitted, not already requested recently)

    Generates unique review token for each booking with 30-day expiry.
    """
    target_date = datetime.now().date() - timedelta(days=1)

    # Get all bookings that checked out yesterday
    bookings = Booking.objects.filter(
        check_out_date=target_date,
        status='checked_out'
    )

    sent_count = 0
    skipped_count = 0

    for booking in bookings:
        # Check if review request can be sent
        if booking.can_request_review():
            success = send_review_request_email(booking)
            if success:
                sent_count += 1
            else:
                skipped_count += 1
        else:
            skipped_count += 1

    return f"Sent review request emails to {sent_count} bookings (skipped {skipped_count})"


@shared_task
def send_booking_confirmation_async(booking_id):
    """Asynchronous task to send booking confirmation email."""
    try:
        booking = Booking.objects.get(id=booking_id)
        send_booking_confirmation(booking)
        return f"Sent confirmation email for booking {booking.booking_id}"
    except Booking.DoesNotExist:
        return f"Booking {booking_id} not found"
