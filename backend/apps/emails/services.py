"""
Email service using Zeptomail API.
Supports multiple sender addresses with their own tokens.

Email Types:
- reservations: reservations@allarcoapartment.com - Booking confirmations, payment receipts
- support: support@allarcoapartment.com - General support, welcome emails, team invites
- checkin: check-in@allarcoapartment.com - Check-in instructions, arrival info
"""
import requests
from django.conf import settings
from django.template.loader import render_to_string
from .models import EmailLog


class ZeptomailService:
    """Service for sending emails via Zeptomail with multiple sender support."""

    API_URL = settings.ZEPTOMAIL_API_URL
    TOKENS = getattr(settings, 'ZEPTOMAIL_TOKENS', {})

    @classmethod
    def get_sender_config(cls, sender_type='support'):
        """Get sender configuration based on email type."""
        return cls.TOKENS.get(sender_type, cls.TOKENS.get('support', {}))

    @classmethod
    def send_email(cls, to_email, from_email, from_name, subject, html_body, booking=None, sender_type=None):
        """
        Send email via Zeptomail API.

        Args:
            to_email: Recipient email address
            from_email: Sender email (used for logging, actual sender determined by sender_type)
            from_name: Sender display name
            subject: Email subject
            html_body: HTML content
            booking: Optional booking reference for logging
            sender_type: 'reservations', 'support', or 'checkin' (auto-detected if not provided)
        """
        # Auto-detect sender type from from_email if not provided
        if sender_type is None:
            if 'reservations' in from_email:
                sender_type = 'reservations'
            elif 'check-in' in from_email or 'checkin' in from_email:
                sender_type = 'checkin'
            else:
                sender_type = 'support'

        config = cls.get_sender_config(sender_type)
        token = config.get('token', settings.ZEPTOMAIL_API_KEY)
        sender_email = config.get('email', from_email)

        headers = {
            'Authorization': token,  # Token already includes "Zoho-enczapikey" prefix
            'Content-Type': 'application/json'
        }

        payload = {
            'from': {
                'address': sender_email,
                'name': from_name
            },
            'to': [
                {'email_address': {'address': to_email}}
            ],
            'subject': subject,
            'htmlbody': html_body
        }

        try:
            response = requests.post(cls.API_URL, headers=headers, json=payload, timeout=30)

            # Log email
            EmailLog.objects.create(
                recipient_email=to_email,
                from_email=sender_email,
                subject=subject,
                template_name='custom',
                booking=booking,
                status='sent' if response.status_code == 200 else 'failed',
                error_message=response.text if response.status_code != 200 else None
            )

            return response.status_code == 200

        except Exception as e:
            # Log failed email
            EmailLog.objects.create(
                recipient_email=to_email,
                from_email=sender_email,
                subject=subject,
                template_name='custom',
                booking=booking,
                status='failed',
                error_message=str(e)
            )
            return False


def send_booking_confirmation(booking):
    """Send booking confirmation email."""
    context = {
        'booking': booking,
        'guest_name': booking.guest_name,
        'booking_id': booking.booking_id,
        'check_in': booking.check_in_date,
        'check_out': booking.check_out_date,
        'nights': booking.nights,
        'total': booking.total_price,
        'cancellation_policy': booking.cancellation_policy,
        'tourist_tax': booking.tourist_tax,
    }

    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2563eb;">Booking Confirmed!</h1>
                <p>Dear {booking.guest_name},</p>
                <p>Your booking at All'Arco Apartment has been confirmed.</p>

                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="margin-top: 0;">Booking Details</h2>
                    <p><strong>Booking ID:</strong> {booking.booking_id}</p>
                    <p><strong>Check-in:</strong> {booking.check_in_date}</p>
                    <p><strong>Check-out:</strong> {booking.check_out_date}</p>
                    <p><strong>Nights:</strong> {booking.nights}</p>
                    <p><strong>Total Paid (online):</strong> €{float(booking.total_price) - float(booking.tourist_tax or 0):.2f}</p>
                    <p><strong>City tax:</strong> €{booking.tourist_tax} (pay at property)</p>
                    <p><strong>Cancellation:</strong> {"Non-refundable (10% discount applied)" if booking.cancellation_policy == "non_refundable" else "Flexible — free until 24h before check-in"}</p>
                </div>

                <p>Check-in instructions will be sent 48 hours before your arrival.</p>
                <p>If you have any questions, please contact us at support@allarcoapartment.com</p>

                <p style="margin-top: 30px;">Best regards,<br>All'Arco Apartment Team</p>
            </div>
        </body>
    </html>
    """

    return ZeptomailService.send_email(
        to_email=booking.guest_email,
        from_email='reservation@allarcoapartment.com',
        from_name="All'Arco Apartment",
        subject=f"Booking Confirmed - All'Arco Apartment {booking.booking_id}",
        html_body=html_body,
        booking=booking
    )


def send_online_checkin_prompt(booking):
    """Send online check-in prompt from check-in@."""
    frontend_host = getattr(settings, 'FRONTEND_URL', None) or 'https://www.allarcoapartment.com'
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #C4A572;">Complete your online check-in</h1>
                <p>Hi {booking.guest_name},</p>
                <p>Your stay from <strong>{booking.check_in_date}</strong> to <strong>{booking.check_out_date}</strong> is confirmed. Please complete online check-in so we can share arrival instructions.</p>
                <p style="margin: 16px 0;"><a href="{frontend_host}/booking/{booking.booking_id}/check-in" style="background:#C4A572;color:white;padding:12px 18px;text-decoration:none;border-radius:6px;">Start online check-in</a></p>
                <ul>
                    <li>City tax (€{booking.tourist_tax}) is paid at the property.</li>
                    <li>Cancellation: {"Non-refundable (10% discount applied)" if booking.cancellation_policy == "non_refundable" else "Flexible — free until 24h before check-in"}.</li>
                    <li>Check-in: 15:00 · Check-out: 10:00</li>
                </ul>
                <p>Questions? Reply to this email.</p>
                <p style="margin-top: 30px;">All'Arco Apartment Team</p>
            </div>
        </body>
    </html>
    """

    return ZeptomailService.send_email(
        to_email=booking.guest_email,
        from_email='check-in@allarcoapartment.com',
        from_name="All'Arco Apartment",
        subject=f"Complete online check-in - {booking.booking_id}",
        html_body=html_body,
        booking=booking,
        sender_type='checkin'
    )


def send_online_checkin_completed(booking):
    """Send thank-you / completion email from check-in@."""
    frontend_host = getattr(settings, 'FRONTEND_URL', None) or 'https://www.allarcoapartment.com'
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #C4A572;">Thanks for completing online check-in</h1>
                <p>Hi {booking.guest_name},</p>
                <p>We’ve received your guest details for <strong>{booking.check_in_date}</strong> to <strong>{booking.check_out_date}</strong>. Arrival instructions will be shared 48 hours before check-in.</p>
                <ul>
                    <li>Check-in: 15:00 · Check-out: 10:00</li>
                    <li>City tax (€{booking.tourist_tax}) is paid at the property.</li>
                    <li>Cancellation: {"Non-refundable (10% discount applied)" if booking.cancellation_policy == "non_refundable" else "Flexible — free until 24h before check-in"}.</li>
                </ul>
                <p style="margin: 16px 0;"><a href="{frontend_host}/booking/confirmation?booking_id={booking.id}" style="background:#C4A572;color:white;padding:12px 18px;text-decoration:none;border-radius:6px;">View your booking</a></p>
                <p>Questions? Reply to this email.</p>
                <p style="margin-top: 30px;">All'Arco Apartment Team</p>
            </div>
        </body>
    </html>
    """
    return ZeptomailService.send_email(
        to_email=booking.guest_email,
        from_email='check-in@allarcoapartment.com',
        from_name="All'Arco Apartment",
        subject=f"Online check-in completed - {booking.booking_id}",
        html_body=html_body,
        booking=booking,
        sender_type='checkin'
    )


def send_payment_receipt(payment):
    """Send payment receipt email."""
    booking = payment.booking
    formatted_date = payment.paid_at.strftime('%B %d, %Y at %I:%M %p') if payment.paid_at else 'Recently'

    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #10b981;">✓ Payment Confirmed</h1>
                <p>Dear {booking.guest_name},</p>
                <p>Your payment has been successfully processed through Stripe. Here are the details:</p>

                <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="margin-top: 0; color: #059669;">Payment Details</h2>
                    <p><strong>Amount Paid:</strong> €{payment.amount}</p>
                    <p><strong>Payment Method:</strong> Stripe ({payment.payment_method or 'card'})</p>
                    <p><strong>Payment ID:</strong> {payment.stripe_payment_intent_id}</p>
                    <p><strong>Date & Time:</strong> {formatted_date}</p>
                    <p><strong>Booking Reference:</strong> {booking.booking_id}</p>
                </div>

                <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Remaining Balance:</strong> €{booking.amount_due} (city tax to be paid at property)</p>
                </div>

                <p>Your payment has been securely processed. You can view your booking details anytime in your account dashboard.</p>

                <p>Best regards,<br>All'Arco Apartment Team</p>
            </div>
        </body>
    </html>
    """

    return ZeptomailService.send_email(
        to_email=booking.guest_email,
        from_email='reservation@allarcoapartment.com',
        from_name="All'Arco Apartment",
        subject=f"Payment Confirmed - All'Arco Apartment {booking.booking_id}",
        html_body=html_body,
        booking=booking
    )


def send_welcome_email(user):
    """Send welcome email to new user."""
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2563eb;">Welcome to All'Arco Apartment!</h1>
                <p>Dear {user.first_name},</p>
                <p>Thank you for creating an account with us.</p>
                <p>You can now log in to view your bookings and manage your profile.</p>
                <p>If you have any questions, please contact us at support@allarcoapartment.com</p>
                <p style="margin-top: 30px;">Best regards,<br>All'Arco Apartment Team</p>
            </div>
        </body>
    </html>
    """

    return ZeptomailService.send_email(
        to_email=user.email,
        from_email='support@allarcoapartment.com',
        from_name="All'Arco Apartment",
        subject="Welcome to All'Arco Apartment",
        html_body=html_body
    )


def send_team_invitation(user, temporary_password):
    """Send team member invitation email."""
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2563eb;">You've Been Invited!</h1>
                <p>Dear {user.first_name},</p>
                <p>You have been invited to join the All'Arco Apartment team as a <strong>{user.role}</strong>.</p>

                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="margin-top: 0;">Login Details</h2>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Temporary Password:</strong> {temporary_password}</p>
                </div>

                <p>Please log in and change your password immediately.</p>
                <p style="margin-top: 30px;">Best regards,<br>All'Arco Apartment Team</p>
            </div>
        </body>
    </html>
    """

    return ZeptomailService.send_email(
        to_email=user.email,
        from_email='support@allarcoapartment.com',
        from_name="All'Arco Apartment",
        subject="You've Been Invited to All'Arco Apartment PMS",
        html_body=html_body
    )


def send_password_reset_email(user, reset_code):
    """
    Send password reset email with a 6-digit verification code.

    The code expires after 10 minutes and is one-time use only.
    User must enter this code along with their email to set a new password.
    """
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header with Logo -->
            <div style="background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%); padding: 40px 30px; text-align: center;">
                <img src="https://www.allarcoapartment.com/allarco-logo.png" alt="All'Arco Apartment" style="height: 55px; width: auto;" />
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
                <h1 style="color: #0a0a0a; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">
                    Password Reset Code
                </h1>

                <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Hello {user.first_name or 'there'},
                </p>

                <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    We received a request to reset your password for your All'Arco Apartment account. Use the code below to create a new password:
                </p>

                <!-- Code Box -->
                <div style="background: linear-gradient(135deg, #faf9f6 0%, #f5f5f0 100%); border: 2px solid #C4A572; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                    <p style="color: #86754e; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 15px 0; font-weight: 600;">
                        Your Verification Code
                    </p>
                    <p style="color: #0a0a0a; font-size: 36px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 8px; margin: 0;">
                        {reset_code}
                    </p>
                    <p style="color: #a0aec0; font-size: 13px; margin: 15px 0 0 0;">
                        This code expires in 10 minutes
                    </p>
                </div>

                <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    To reset your password:
                </p>

                <ol style="color: #4a5568; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0; padding-left: 20px;">
                    <li>Click the button below or go to the reset password page</li>
                    <li>Enter your email address and the code above</li>
                    <li>Create your new password</li>
                </ol>

                <!-- Reset Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://www.allarcoapartment.com/auth/reset-password?email={user.email}"
                       style="display: inline-block; background-color: #C4A572; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 40px; border-radius: 8px;">
                        Reset Password
                    </a>
                </div>

                <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                    If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
                </p>
            </div>

            <!-- Footer -->
            <div style="background: linear-gradient(135deg, #f5f5f0 0%, #ebe9e4 100%); padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #86754e; font-size: 14px; font-weight: 500; margin: 0 0 8px 0;">
                    All'Arco Apartment
                </p>
                <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                    Venice, Italy
                </p>
                <p style="color: #a0aec0; font-size: 12px; margin: 8px 0 0 0;">
                    <a href="mailto:support@allarcoapartment.com" style="color: #C4A572; text-decoration: none;">support@allarcoapartment.com</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return ZeptomailService.send_email(
        to_email=user.email,
        from_email='support@allarcoapartment.com',
        from_name="All'Arco Apartment",
        subject="Password Reset Code - All'Arco Apartment",
        html_body=html_body,
        sender_type='support'
    )


def send_cleaning_cancelled_notification(cleaning_schedule, reason=''):
    """
    Send email notification to assigned cleaner when their cleaning task is cancelled.

    Args:
        cleaning_schedule: CleaningSchedule instance
        reason: Reason for cancellation (e.g., "Booking cancelled")
    """
    # Only send if cleaner is assigned
    if not cleaning_schedule.assigned_to or not cleaning_schedule.assigned_to.email:
        return False

    cleaner_name = cleaning_schedule.assigned_to.get_full_name() or 'Team Member'
    booking_ref = f" (Booking: {cleaning_schedule.booking.booking_id})" if cleaning_schedule.booking else ""

    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #dc2626;">Cleaning Task Cancelled</h1>
                <p>Hi {cleaner_name},</p>
                <p>A cleaning task that was assigned to you has been cancelled.</p>

                <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
                    <h2 style="margin-top: 0; color: #dc2626;">Cancelled Cleaning</h2>
                    <p><strong>Scheduled Date:</strong> {cleaning_schedule.scheduled_date} at {cleaning_schedule.scheduled_time}</p>
                    <p><strong>Priority:</strong> {cleaning_schedule.get_priority_display()}</p>
                    {f'<p><strong>Booking:</strong> {cleaning_schedule.booking.booking_id}</p>' if cleaning_schedule.booking else ''}
                    {f'<p><strong>Guest:</strong> {cleaning_schedule.booking.guest_name}</p>' if cleaning_schedule.booking else ''}
                    {f'<p><strong>Reason:</strong> {reason}</p>' if reason else ''}
                </div>

                <p>This task has been removed from your schedule. No action is required from you.</p>
                <p>If you have any questions, please contact the management team.</p>

                <p style="margin-top: 30px;">Best regards,<br>All'Arco Apartment Management</p>
            </div>
        </body>
    </html>
    """

    return ZeptomailService.send_email(
        to_email=cleaning_schedule.assigned_to.email,
        from_email='support@allarcoapartment.com',
        from_name="All'Arco Apartment",
        subject=f"Cleaning Cancelled - {cleaning_schedule.scheduled_date}",
        html_body=html_body,
        booking=cleaning_schedule.assigned_to,
        sender_type='support'
    )


def send_payment_request_email(payment_request):
    """
    Send payment request email to guest with Stripe payment link.

    Args:
        payment_request: PaymentRequest instance with stripe_payment_link_url
    """
    if not payment_request.guest_email:
        return False

    due_date_text = payment_request.due_date.strftime('%B %d, %Y') if payment_request.due_date else 'as soon as possible'

    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #1e40af;">Payment Request</h1>
                <p>Dear {payment_request.guest_name},</p>
                <p>We have a payment request for your booking <strong>{payment_request.booking.booking_id}</strong>.</p>

                <div style="background: #eff6ff; border-left: 4px solid #1e40af; padding: 20px; margin: 20px 0;">
                    <h2 style="margin-top: 0; color: #1e40af;">Payment Details</h2>
                    <p><strong>Type:</strong> {payment_request.get_type_display()}</p>
                    <p><strong>Amount:</strong> €{payment_request.amount}</p>
                    <p><strong>Description:</strong> {payment_request.description}</p>
                    <p><strong>Due Date:</strong> {due_date_text}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{payment_request.stripe_payment_link_url}"
                       style="background: #1e40af; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
                        Pay Now
                    </a>
                </div>

                <p>Click the button above to securely pay with credit/debit card through Stripe.</p>

                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                    This payment is for booking <strong>{payment_request.booking.booking_id}</strong><br>
                    Check-in: {payment_request.booking.check_in_date.strftime('%B %d, %Y')}<br>
                    Check-out: {payment_request.booking.check_out_date.strftime('%B %d, %Y')}
                </p>

                <p style="margin-top: 30px;">Best regards,<br>All'Arco Apartment Team</p>
            </div>
        </body>
    </html>
    """

    return ZeptomailService.send_email(
        to_email=payment_request.guest_email,
        from_email='payments@allarcoapartment.com',
        from_name="All'Arco Apartment - Payments",
        subject=f"Payment Request - {payment_request.booking.booking_id}",
        html_body=html_body,
        booking=payment_request.booking,
        sender_type='booking'
    )


def send_payment_confirmation_email(payment_request):
    """
    Send thank you email to guest after successful payment.

    Args:
        payment_request: PaymentRequest instance that was paid
    """
    if not payment_request.guest_email or payment_request.status != 'paid':
        return False

    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #10b981;">Payment Received - Thank You!</h1>
                <p>Dear {payment_request.guest_name},</p>
                <p>We have successfully received your payment for booking <strong>{payment_request.booking.booking_id}</strong>.</p>

                <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
                    <h2 style="margin-top: 0; color: #059669;">Payment Confirmed</h2>
                    <p><strong>Type:</strong> {payment_request.get_type_display()}</p>
                    <p><strong>Amount:</strong> €{payment_request.amount}</p>
                    <p><strong>Paid On:</strong> {payment_request.paid_at.strftime('%B %d, %Y at %H:%M') if payment_request.paid_at else 'Recently'}</p>
                </div>

                <p>Thank you for your prompt payment. Your booking is now fully confirmed.</p>

                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                    Booking Details:<br>
                    <strong>Booking ID:</strong> {payment_request.booking.booking_id}<br>
                    <strong>Check-in:</strong> {payment_request.booking.check_in_date.strftime('%B %d, %Y')}<br>
                    <strong>Check-out:</strong> {payment_request.booking.check_out_date.strftime('%B %d, %Y')}
                </p>

                <p>We look forward to welcoming you!</p>

                <p style="margin-top: 30px;">Best regards,<br>All'Arco Apartment Team</p>
            </div>
        </body>
    </html>
    """

    return ZeptomailService.send_email(
        to_email=payment_request.guest_email,
        from_email='payments@allarcoapartment.com',
        from_name="All'Arco Apartment - Payments",
        subject=f"Payment Confirmed - Thank You!",
        html_body=html_body,
        booking=payment_request.booking,
        sender_type='booking'
    )


def send_review_request_email(booking):
    """
    Send review request email to guest after checkout.

    Generates review token and sends email with unique review link.
    Sent from support@allarcoapartment.com 1 day after checkout.

    Args:
        booking: Booking instance (status='checked_out')

    Returns:
        bool: True if email sent successfully
    """
    if not booking or not booking.guest_email:
        return False

    # Generate review token (30-day expiry)
    review_token = booking.generate_review_token()

    # Build review URL
    frontend_host = getattr(settings, 'FRONTEND_URL', None) or 'https://www.allarcoapartment.com'
    review_url = f"{frontend_host}/reviews/submit/{review_token}"

    # Render template with context
    from django.template.loader import render_to_string
    context = {
        'booking': booking,
        'review_url': review_url,
        'company': {
            'email': 'support@allarcoapartment.com'
        }
    }

    try:
        html_body = render_to_string('emails/post_stay_thankyou.html', context)
    except Exception:
        # Fallback to inline HTML if template fails
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Thank You</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }}
                .container {{ max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; }}
                .content {{ padding: 30px; }}
                .cta-button {{ display: inline-block; background: #0066cc; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; }}
                .footer {{ background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>❤️ Thank You for Staying With Us!</h1>
                </div>
                <div class="content">
                    <p>Dear {booking.guest_name},</p>
                    <p>Thank you for choosing All'Arco Apartment for your stay in Venice! We hope you had a wonderful experience.</p>
                    <p><strong>We'd Love Your Feedback!</strong></p>
                    <p>Your review helps us improve and helps future guests make informed decisions. Would you mind taking a moment to share your experience?</p>
                    <center style="margin: 30px 0;">
                        <a href="{review_url}" class="cta-button">Leave a Review</a>
                    </center>
                    <p><strong>Come Back Soon!</strong></p>
                    <p>We'd be delighted to host you again. As a returning guest, you'll receive a special discount on your next booking.</p>
                    <p>If you have any feedback or concerns about your stay, please don't hesitate to reach out at support@allarcoapartment.com.</p>
                    <p>Warmest regards,<br><strong>The All'Arco Apartment Team</strong></p>
                </div>
                <div class="footer">
                    <p>All'Arco Apartment | Venice, Italy</p>
                    <p style="font-size: 12px;">Booking ID: {booking.booking_id}</p>
                </div>
            </div>
        </body>
        </html>
        """

    return ZeptomailService.send_email(
        to_email=booking.guest_email,
        from_email='support@allarcoapartment.com',
        from_name="All'Arco Apartment",
        subject="How was your stay at All'Arco Apartment?",
        html_body=html_body,
        booking=booking,
        sender_type='support'
    )
