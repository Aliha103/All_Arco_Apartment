"""
Email service using Zeptomail API.
"""
import requests
from django.conf import settings
from django.template.loader import render_to_string
from .models import EmailLog


class ZeptomailService:
    """Service for sending emails via Zeptomail."""
    
    API_URL = settings.ZEPTOMAIL_API_URL
    API_KEY = settings.ZEPTOMAIL_API_KEY
    
    @classmethod
    def send_email(cls, to_email, from_email, from_name, subject, html_body, booking=None):
        """Send email via Zeptomail API."""
        
        headers = {
            'Authorization': f'Zoho-enczapikey {cls.API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'from': {
                'address': from_email,
                'name': from_name
            },
            'to': [
                {'email_address': {'address': to_email}}
            ],
            'subject': subject,
            'htmlbody': html_body
        }
        
        try:
            response = requests.post(cls.API_URL, headers=headers, json=payload)
            
            # Log email
            EmailLog.objects.create(
                recipient_email=to_email,
                from_email=from_email,
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
                from_email=from_email,
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
