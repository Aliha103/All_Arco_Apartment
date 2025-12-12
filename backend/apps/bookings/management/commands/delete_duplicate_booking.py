"""
Delete duplicate booking ARCO9QKVM and keep only backend-generated ARCOEAGHJ4
"""
from django.core.management.base import BaseCommand
from apps.bookings.models import Booking


class Command(BaseCommand):
    help = 'Delete duplicate booking ARCO9QKVM'

    def handle(self, *args, **options):
        booking_id_to_delete = 'ARCO9QKVM'

        try:
            # Find the booking
            booking = Booking.objects.get(booking_id=booking_id_to_delete)

            # Display booking info before deletion
            self.stdout.write(self.style.WARNING(f'\nFound booking to delete:'))
            self.stdout.write(f'  Booking ID: {booking.booking_id}')
            self.stdout.write(f'  Guest: {booking.guest_name}')
            self.stdout.write(f'  Email: {booking.guest_email}')
            self.stdout.write(f'  Check-in: {booking.check_in_date}')
            self.stdout.write(f'  Check-out: {booking.check_out_date}')
            self.stdout.write(f'  Total: €{booking.total_price}')
            self.stdout.write(f'  Status: {booking.status}')
            self.stdout.write(f'  Created: {booking.created_at}')

            # Check for related data
            payment_count = booking.payments.count() if hasattr(booking, 'payments') else 0
            payment_request_count = booking.payment_requests.count() if hasattr(booking, 'payment_requests') else 0

            self.stdout.write(f'\n  Related data:')
            self.stdout.write(f'    Payments: {payment_count}')
            self.stdout.write(f'    Payment Requests: {payment_request_count}')

            # Delete the booking (CASCADE will delete related data)
            booking.delete()

            self.stdout.write(self.style.SUCCESS(f'\n✅ Successfully deleted booking {booking_id_to_delete}'))
            self.stdout.write(self.style.SUCCESS(f'   All related data has been removed.'))

        except Booking.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'\n❌ Booking {booking_id_to_delete} not found in database'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Error deleting booking: {str(e)}'))
