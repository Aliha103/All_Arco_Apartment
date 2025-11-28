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
                    <p><strong>Total Paid:</strong> €{booking.total_price}</p>
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
        from_email='reservations@allarcoapartment.com',
        from_name="All'Arco Apartment",
        subject=f"Booking Confirmed - All'Arco Apartment {booking.booking_id}",
        html_body=html_body,
        booking=booking
    )


def send_payment_receipt(payment):
    """Send payment receipt email."""
    booking = payment.booking

    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2563eb;">Payment Receipt</h1>
                <p>Dear {booking.guest_name},</p>
                <p>Thank you for your payment. Here are the details:</p>

                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="margin-top: 0;">Payment Details</h2>
                    <p><strong>Amount Paid:</strong> €{payment.amount}</p>
                    <p><strong>Payment Method:</strong> {payment.payment_method}</p>
                    <p><strong>Transaction ID:</strong> {payment.stripe_payment_intent_id}</p>
                    <p><strong>Date:</strong> {payment.paid_at}</p>
                </div>

                <p>Best regards,<br>All'Arco Apartment Team</p>
            </div>
        </body>
    </html>
    """

    return ZeptomailService.send_email(
        to_email=booking.guest_email,
        from_email='reservations@allarcoapartment.com',
        from_name="All'Arco Apartment",
        subject=f"Payment Receipt - All'Arco Apartment {booking.booking_id}",
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


def send_password_reset_email(user, new_password):
    """Send password reset email with new temporary password."""
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header with Logo -->
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
                <img src="https://www.allarcoapartment.com/logos/logo-horizontal-white.svg" alt="All'Arco Apartment" style="height: 50px; width: auto;" />
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
                <h1 style="color: #1a1a2e; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">
                    Password Reset
                </h1>

                <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Hello {user.first_name or 'there'},
                </p>

                <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    We received a request to reset your password for your All'Arco Apartment account. Your new temporary password is:
                </p>

                <!-- Password Box -->
                <div style="background-color: #f8f9fa; border: 2px dashed #C4A572; border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
                    <p style="color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px 0;">
                        Your New Password
                    </p>
                    <p style="color: #1a1a2e; font-size: 28px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 2px; margin: 0;">
                        {new_password}
                    </p>
                </div>

                <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    For your security, please:
                </p>

                <ul style="color: #4a5568; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0; padding-left: 20px;">
                    <li>Log in with this temporary password</li>
                    <li>Change your password immediately after logging in</li>
                    <li>Delete this email after you've updated your password</li>
                </ul>

                <!-- Login Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://www.allarcoapartment.com/auth/login"
                       style="display: inline-block; background-color: #C4A572; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 40px; border-radius: 8px;">
                        Login to Your Account
                    </a>
                </div>

                <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                    If you didn't request this password reset, please ignore this email or contact us at
                    <a href="mailto:support@allarcoapartment.com" style="color: #C4A572;">support@allarcoapartment.com</a>
                </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #1a1a2e; padding: 30px; text-align: center;">
                <p style="color: #a0aec0; font-size: 14px; margin: 0 0 10px 0;">
                    All'Arco Apartment
                </p>
                <p style="color: #718096; font-size: 12px; margin: 0;">
                    Venice, Italy | support@allarcoapartment.com
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
        subject="Password Reset - All'Arco Apartment",
        html_body=html_body,
        sender_type='support'
    )
