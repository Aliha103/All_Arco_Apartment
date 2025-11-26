# All'Arco Apartment - Django Backend

Backend API for the All'Arco Apartment vacation rental platform.

## Tech Stack

- **Django 5.0** - Web framework
- **Django REST Framework** - API
- **PostgreSQL** - Database
- **Redis** - Caching & Celery broker
- **Celery** - Async task queue
- **Stripe** - Payment processing
- **Zeptomail** - Transactional emails
- **WeasyPrint** - PDF generation

## Setup Instructions

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `SECRET_KEY` - Django secret key
- `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGHOST`, `PGPORT` - PostgreSQL credentials
- `REDIS_URL` - Redis connection string
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` - Stripe API keys
- `ZEPTOMAIL_API_KEY` - Zeptomail API key

### 4. Database Setup

```bash
# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Create default settings
python manage.py shell
>>> from apps.pricing.models import Settings
>>> Settings.objects.create(
...     default_nightly_rate=150.00,
...     cleaning_fee=50.00,
...     tourist_tax_per_person_per_night=3.50
... )
>>> exit()
```

### 5. Run Development Server

```bash
# Django server
python manage.py runserver

# Celery worker (in separate terminal)
celery -A core worker --loglevel=info

# Celery beat scheduler (in separate terminal)
celery -A core beat --loglevel=info
```

### 6. Access Admin Panel

Navigate to `http://localhost:8000/admin` and login with your superuser credentials.

### 7. API Documentation

Interactive API docs available at:
- Swagger UI: `http://localhost:8000/api/docs/`
- Schema: `http://localhost:8000/api/schema/`

## Project Structure

```
backend/
├── core/               # Django project settings
│   ├── settings.py    # Configuration
│   ├── urls.py        # Root URL config
│   ├── celery.py      # Celery configuration
│   └── wsgi.py        # WSGI config
├── apps/              # Django apps
│   ├── users/         # User authentication & management
│   ├── bookings/      # Booking system
│   ├── payments/      # Stripe payment integration
│   ├── invoices/      # Invoice generation
│   ├── pricing/       # Pricing rules & settings
│   └── emails/        # Email service
├── manage.py          # Django management script
└── requirements.txt   # Python dependencies
```

## API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `GET /api/auth/me/` - Get current user

### Bookings
- `GET /api/bookings/` - List bookings
- `POST /api/bookings/` - Create booking
- `GET /api/bookings/{id}/` - Get booking details
- `PATCH /api/bookings/{id}/` - Update booking
- `GET /api/bookings/availability/` - Check availability
- `GET /api/bookings/calendar/month/` - Get calendar data
- `GET /api/bookings/statistics/` - Get booking statistics

### Payments
- `GET /api/payments/` - List payments
- `POST /api/payments/create-checkout-session/` - Create Stripe checkout
- `POST /api/payments/{id}/refund/` - Process refund
- `POST /api/payments/webhook/` - Stripe webhook handler

### Invoices
- `GET /api/invoices/` - List invoices
- `POST /api/invoices/{id}/generate_pdf/` - Generate PDF
- `GET /api/invoices/{id}/download_pdf/` - Download PDF
- `POST /api/invoices/{id}/send_email/` - Email invoice

### Pricing
- `GET /api/pricing/settings/` - Get pricing settings
- `PATCH /api/pricing/settings/update/` - Update settings
- `GET /api/pricing/calculate/` - Calculate booking price
- `GET /api/pricing/rules/` - List pricing rules
- `POST /api/pricing/rules/` - Create pricing rule

### Users & Team
- `GET /api/guests/` - List guests (team/admin)
- `GET /api/team/` - List team members (admin)
- `POST /api/team/` - Invite team member (admin)

## Stripe Webhook Setup

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to local:
   ```bash
   stripe listen --forward-to localhost:8000/api/payments/webhook/
   ```
4. Copy webhook secret to `.env` file

## Deployment (Railway)

### Backend Service

1. Create new Railway project
2. Add PostgreSQL service
3. Add Redis service
4. Add Python service:
   - Root directory: `backend`
   - Build command: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - Start command: `gunicorn core.wsgi:application --bind 0.0.0.0:$PORT`
5. Set environment variables (from `.env.example`)
6. Deploy

### Celery Worker (separate service)

1. Add new service to same project
2. Use same repository
3. Start command: `celery -A core worker --loglevel=info`
4. Use same environment variables

### Celery Beat (separate service)

1. Add new service to same project
2. Use same repository
3. Start command: `celery -A core beat --loglevel=info`
4. Use same environment variables

## Testing

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test apps.bookings

# Create test data
python manage.py shell
>>> from apps.bookings.tests import create_test_data
>>> create_test_data()
```

## Common Commands

```bash
# Create new migration
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic

# Django shell
python manage.py shell

# Check for issues
python manage.py check
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check credentials in `.env`
- Verify `PGHOST` and `PGPORT`

### Stripe Webhooks Not Working
- Ensure webhook secret is correct
- Check Stripe CLI is forwarding
- Verify endpoint is accessible

### Celery Tasks Not Running
- Ensure Redis is running
- Check Celery worker is active
- Verify `REDIS_URL` in `.env`

### Email Not Sending
- Verify Zeptomail API key
- Check email logs in admin panel
- Ensure from emails are verified

## Support

For issues or questions:
- Email: support@allarcoapartment.com
- GitHub: [Repository Link]
