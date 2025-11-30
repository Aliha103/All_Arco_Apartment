# Demo Bookings Management Command

This directory contains Django management commands for the bookings app.

## create_demo_bookings

Creates 4 demo bookings from different booking sources for testing and demonstration purposes.

### Usage

```bash
# Make sure you're in the backend directory
cd backend

# Run the management command
python manage.py create_demo_bookings
```

### What it does

The command creates 4 demo bookings with the following sources:

1. **Airbnb** - John Smith
   - 2 guests, 3 nights
   - Check-in: 7 days from now
   - Status: Confirmed, Paid

2. **Booking.com** - Maria Garcia
   - 3 guests, 4 nights
   - Check-in: 14 days from now
   - Status: Confirmed, Paid

3. **Own Website** - Sophie Laurent
   - 2 guests, 5 nights
   - Check-in: 21 days from now
   - Status: Confirmed, Paid

4. **Direct** - Thomas Mueller
   - 4 guests, 7 nights
   - Check-in: 35 days from now
   - Status: Confirmed, Partial Payment

### Prerequisites

Before running this command, make sure:

1. The database migration for `booking_source` field has been applied:
   ```bash
   python manage.py migrate bookings
   ```

2. You have a Django environment properly set up with all dependencies installed.

### Notes

- The command is idempotent - it checks for existing bookings and won't create duplicates
- All bookings are associated with a demo guest user (demo.guest@example.com)
- Prices are calculated automatically based on nights, cleaning fee, and tourist tax
- Each booking has unique guest details and realistic check-in dates spread over time

### Example Output

```
Creating demo bookings...
Created demo guest user: demo.guest@example.com
Created booking ARK-20251207-0001 for John Smith from Airbnb (€590.00)
Created booking ARK-20251214-0001 for Maria Garcia from Booking.com (€842.00)
Created booking ARK-20251221-0001 for Sophie Laurent from Own Website (€935.00)
Created booking ARK-20260104-0001 for Thomas Mueller from Direct (€1478.00)

Successfully created 4 demo booking(s)!
```
