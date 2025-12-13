"""
Notification service for creating and sending notifications.
"""

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from .models import Notification

User = get_user_model()


class NotificationService:
    """Service for creating and managing notifications."""

    @staticmethod
    def create_notification(user, notification_type, title, message, booking_id=None, data=None):
        """
        Create a new notification for a user.

        Args:
            user: User object
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            booking_id: Related booking ID (optional)
            data: Additional data dict (optional)

        Returns:
            Notification object
        """
        return Notification.objects.create(
            user=user,
            type=notification_type,
            title=title,
            message=message,
            booking_id=booking_id,
            data=data or {}
        )

    @staticmethod
    def notify_team_booking_confirmed(booking):
        """Notify all team members when booking is confirmed."""
        # Get all super admin and team members with booking permissions
        team_users = User.objects.filter(
            models.Q(is_super_admin=True) |
            models.Q(assigned_role__permissions__code__in=['bookings.view', 'bookings.manage'])
        ).distinct()

        for user in team_users:
            NotificationService.create_notification(
                user=user,
                notification_type='booking_confirmed',
                title=f'New Booking Confirmed: {booking.booking_id}',
                message=f'{booking.guest_name} has confirmed a booking from {booking.check_in_date} to {booking.check_out_date}',
                booking_id=booking.booking_id,
                data={
                    'guest_name': booking.guest_name,
                    'check_in_date': str(booking.check_in_date),
                    'check_out_date': str(booking.check_out_date),
                    'total_price': str(booking.total_price),
                    'booking_url': f'/pms/bookings/{booking.booking_id}'
                }
            )

    @staticmethod
    def notify_team_booking_cancelled(booking, cancelled_by=None):
        """Notify all team members when booking is cancelled."""
        from django.db import models

        team_users = User.objects.filter(
            models.Q(is_super_admin=True) |
            models.Q(assigned_role__permissions__code__in=['bookings.view', 'bookings.manage'])
        ).distinct()

        cancelled_by_text = f' by {cancelled_by.get_full_name()}' if cancelled_by else ''

        for user in team_users:
            NotificationService.create_notification(
                user=user,
                notification_type='booking_cancelled',
                title=f'Booking Cancelled: {booking.booking_id}',
                message=f'{booking.guest_name}\'s booking for {booking.check_in_date} to {booking.check_out_date} was cancelled{cancelled_by_text}',
                booking_id=booking.booking_id,
                data={
                    'guest_name': booking.guest_name,
                    'check_in_date': str(booking.check_in_date),
                    'check_out_date': str(booking.check_out_date),
                    'cancelled_by': cancelled_by.email if cancelled_by else None,
                    'booking_url': f'/pms/bookings/{booking.booking_id}'
                }
            )

    @staticmethod
    def notify_team_booking_modified(booking, modified_by=None):
        """Notify all team members when booking is modified."""
        from django.db import models

        team_users = User.objects.filter(
            models.Q(is_super_admin=True) |
            models.Q(assigned_role__permissions__code__in=['bookings.view', 'bookings.manage'])
        ).distinct()

        modified_by_text = f' by {modified_by.get_full_name()}' if modified_by else ''

        for user in team_users:
            NotificationService.create_notification(
                user=user,
                notification_type='booking_modified',
                title=f'Booking Modified: {booking.booking_id}',
                message=f'{booking.guest_name}\'s booking has been updated{modified_by_text}',
                booking_id=booking.booking_id,
                data={
                    'guest_name': booking.guest_name,
                    'check_in_date': str(booking.check_in_date),
                    'check_out_date': str(booking.check_out_date),
                    'modified_by': modified_by.email if modified_by else None,
                    'booking_url': f'/pms/bookings/{booking.booking_id}'
                }
            )

    @staticmethod
    def send_guest_email(booking, email_type, additional_context=None):
        """
        Send email to guest for booking events.

        Args:
            booking: Booking object
            email_type: Type of email (confirmed, cancelled, modified, blocked)
            additional_context: Additional context for email template
        """
        if not booking.email:
            return False

        context = {
            'guest_name': booking.guest_name,
            'booking_id': booking.booking_id,
            'check_in_date': booking.check_in_date.strftime('%B %d, %Y'),
            'check_out_date': booking.check_out_date.strftime('%B %d, %Y'),
            'total_price': booking.total_price,
            'currency': booking.currency or 'EUR',
            **(additional_context or {})
        }

        email_templates = {
            'confirmed': {
                'subject': f'Booking Confirmed - {booking.booking_id}',
                'message': f'''Dear {booking.guest_name},

Your booking has been confirmed!

Booking ID: {booking.booking_id}
Check-in: {context['check_in_date']}
Check-out: {context['check_out_date']}
Total: {booking.total_price} {context['currency']}

We look forward to hosting you!

Best regards,
All Arco Apartment'''
            },
            'cancelled': {
                'subject': f'Booking Cancelled - {booking.booking_id}',
                'message': f'''Dear {booking.guest_name},

Your booking has been cancelled.

Booking ID: {booking.booking_id}
Dates: {context['check_in_date']} to {context['check_out_date']}

If you have any questions, please contact us.

Best regards,
All Arco Apartment'''
            },
            'modified': {
                'subject': f'Booking Updated - {booking.booking_id}',
                'message': f'''Dear {booking.guest_name},

Your booking has been updated.

Booking ID: {booking.booking_id}
Check-in: {context['check_in_date']}
Check-out: {context['check_out_date']}
Total: {booking.total_price} {context['currency']}

Please review your updated booking details.

Best regards,
All Arco Apartment'''
            },
            'blocked': {
                'subject': f'Date Unavailable - {booking.booking_id}',
                'message': f'''Dear {booking.guest_name},

We regret to inform you that the dates for your booking are no longer available.

Booking ID: {booking.booking_id}
Dates: {context['check_in_date']} to {context['check_out_date']}

Please contact us to discuss alternative dates.

Best regards,
All Arco Apartment'''
            }
        }

        template = email_templates.get(email_type)
        if not template:
            return False

        try:
            send_mail(
                subject=template['subject'],
                message=template['message'],
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[booking.email],
                fail_silently=False,
            )
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False
