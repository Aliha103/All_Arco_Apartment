"""
iCal (.ics) utility functions for calendar export and import.
"""
import requests
from datetime import datetime, timedelta
from icalendar import Calendar, Event as ICalEvent
from django.utils import timezone
from .models import Booking, ICalSource


def generate_ical_calendar(bookings):
    """
    Generate an iCal calendar from bookings.

    Args:
        bookings: QuerySet of Booking objects

    Returns:
        bytes: iCal calendar data (.ics format)
    """
    cal = Calendar()
    cal.add('prodid', '-//All Arco Apartment//Booking Calendar//EN')
    cal.add('version', '2.0')
    cal.add('calscale', 'GREGORIAN')
    cal.add('method', 'PUBLISH')
    cal.add('x-wr-calname', 'All Arco Apartment')
    cal.add('x-wr-timezone', 'Europe/Rome')
    cal.add('x-wr-caldesc', 'Booking calendar for All Arco Apartment')

    for booking in bookings:
        # Skip cancelled bookings
        if booking.status == 'cancelled':
            continue

        event = ICalEvent()

        # Unique identifier
        uid = booking.ical_uid or f"booking-{booking.booking_id}@allarcoapartment.com"
        event.add('uid', uid)

        # Dates (iCal uses DTSTART and DTEND)
        event.add('dtstart', booking.check_in_date)
        event.add('dtend', booking.check_out_date)

        # Summary (what shows on the calendar)
        summary = f"Blocked - {booking.guest_name}"
        if booking.ota_platform:
            summary = f"{booking.ota_platform} - {booking.guest_name}"
        event.add('summary', summary)

        # Description
        description_parts = [
            f"Booking ID: {booking.booking_id}",
            f"Guest: {booking.guest_name}",
            f"Email: {booking.guest_email}",
            f"Phone: {booking.guest_phone}",
            f"Nights: {booking.nights}",
            f"Guests: {booking.number_of_guests}",
            f"Status: {booking.get_status_display()}",
        ]

        if booking.ota_platform:
            description_parts.append(f"Platform: {booking.ota_platform}")
        if booking.ota_confirmation_code:
            description_parts.append(f"OTA Confirmation: {booking.ota_confirmation_code}")

        event.add('description', '\n'.join(description_parts))

        # Status
        if booking.status == 'confirmed' or booking.status == 'paid':
            event.add('status', 'CONFIRMED')
        elif booking.status == 'pending':
            event.add('status', 'TENTATIVE')
        else:
            event.add('status', 'CONFIRMED')

        # Timestamps
        event.add('dtstamp', timezone.now())
        event.add('created', booking.created_at)
        event.add('last-modified', booking.updated_at)

        cal.add_component(event)

    return cal.to_ical()


def parse_ical_feed(ical_data):
    """
    Parse iCal data and extract booking events.

    Args:
        ical_data: str or bytes - iCal calendar data

    Returns:
        list: List of dictionaries with booking data
    """
    try:
        cal = Calendar.from_ical(ical_data)
    except Exception as e:
        raise ValueError(f"Invalid iCal data: {str(e)}")

    bookings = []

    for component in cal.walk():
        if component.name == "VEVENT":
            try:
                # Extract dates
                dtstart = component.get('dtstart')
                dtend = component.get('dtend')

                if not dtstart or not dtend:
                    continue

                # Convert to date objects
                check_in = dtstart.dt if hasattr(dtstart.dt, 'date') else dtstart.dt
                check_out = dtend.dt if hasattr(dtend.dt, 'date') else dtend.dt

                # Ensure they're date objects (not datetime)
                if hasattr(check_in, 'date'):
                    check_in = check_in.date()
                if hasattr(check_out, 'date'):
                    check_out = check_out.date()

                # Skip past events
                if check_out < datetime.now().date():
                    continue

                # Extract other fields
                summary = str(component.get('summary', 'Blocked'))
                description = str(component.get('description', ''))
                uid = str(component.get('uid', ''))
                status = str(component.get('status', 'CONFIRMED')).upper()

                # Parse guest name from summary (format: "Platform - Guest Name" or just "Guest Name")
                guest_name = summary
                if ' - ' in summary:
                    parts = summary.split(' - ', 1)
                    guest_name = parts[1] if len(parts) > 1 else parts[0]

                # Clean up guest name (remove "Blocked", "Reserved", etc.)
                guest_name = guest_name.replace('Blocked', '').replace('Reserved', '').strip()
                if not guest_name:
                    guest_name = 'OTA Guest'

                bookings.append({
                    'ical_uid': uid,
                    'check_in_date': check_in,
                    'check_out_date': check_out,
                    'guest_name': guest_name,
                    'summary': summary,
                    'description': description,
                    'status': status,
                })

            except Exception as e:
                # Skip invalid events
                continue

    return bookings


def fetch_and_sync_ical_source(ical_source):
    """
    Fetch iCal feed from URL and sync bookings.

    Args:
        ical_source: ICalSource instance

    Returns:
        dict: Sync results with counts
    """
    try:
        # Fetch iCal data
        response = requests.get(ical_source.ical_url, timeout=30)
        response.raise_for_status()
        ical_data = response.content

        # Parse iCal data
        events = parse_ical_feed(ical_data)

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for event_data in events:
            ical_uid = event_data['ical_uid']

            # Skip if no UID
            if not ical_uid:
                skipped_count += 1
                continue

            # Check if booking already exists
            existing_booking = Booking.objects.filter(ical_uid=ical_uid).first()

            if existing_booking:
                # Update existing booking
                existing_booking.check_in_date = event_data['check_in_date']
                existing_booking.check_out_date = event_data['check_out_date']
                existing_booking.guest_name = event_data['guest_name']
                existing_booking.save()
                updated_count += 1
            else:
                # Create new booking
                nights = (event_data['check_out_date'] - event_data['check_in_date']).days

                # Create booking
                Booking.objects.create(
                    ical_uid=ical_uid,
                    check_in_date=event_data['check_in_date'],
                    check_out_date=event_data['check_out_date'],
                    guest_name=event_data['guest_name'],
                    guest_email=f"ota-{ical_uid[:8]}@sync.allarcoapartment.com",  # Placeholder email
                    guest_phone='N/A',
                    guest_country='Unknown',
                    nightly_rate=0,  # Needs to be set manually
                    nights=nights,
                    number_of_guests=2,  # Default
                    adults=2,
                    status='confirmed',
                    payment_status='paid',  # Assume OTA bookings are paid
                    ota_platform=ical_source.ota_name,
                    synced_from_ical=True,
                    booking_source='other',
                    internal_notes=f"Auto-synced from {ical_source.ota_name} iCal feed.\n\nOriginal summary: {event_data['summary']}\n\nUID: {ical_uid}",
                )
                created_count += 1

        # Update source
        ical_source.last_synced = timezone.now()
        ical_source.sync_status = 'active'
        ical_source.last_sync_error = None
        ical_source.bookings_count = Booking.objects.filter(ical_uid__isnull=False).filter(
            ota_platform=ical_source.ota_name
        ).count()
        ical_source.save()

        return {
            'success': True,
            'created': created_count,
            'updated': updated_count,
            'skipped': skipped_count,
            'total_events': len(events),
        }

    except Exception as e:
        # Update source with error
        ical_source.sync_status = 'error'
        ical_source.last_sync_error = str(e)
        ical_source.save()

        raise Exception(f"Failed to sync iCal source: {str(e)}")
