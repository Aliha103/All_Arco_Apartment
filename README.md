# All'Arco Apartment - Vacation Rental Platform

A comprehensive dual-purpose web platform for All'Arco Apartment, a vacation rental in Venice, Italy.

## 🏠 Overview

This platform serves two primary purposes:
1. **Guest-Facing Booking System** - Public website for browsing, booking, and managing reservations
2. **Property Management System (PMS)** - Internal dashboard for team members to manage bookings, payments, and operations

## 🛠 Tech Stack

### Frontend
- **Next.js 16 (App Router)**, **React 19** + **TypeScript**
- **TailwindCSS** + **Radix UI** + **shadcn/ui**
- **React Query** (@tanstack/react-query) for server state, **Zustand** for client state
- **Axios** API client with session authentication
- **Framer Motion** for animations

### Backend
- **Django 5.1** + **Django REST Framework 3.15**
- **PostgreSQL 15**, **Redis 7**, **Celery** + **Beat**
- **Stripe** payments, **Zeptomail** (EU) transactional emails
- **ReportLab** for PDF generation (production-ready, no system dependencies)
- **Session-based authentication** with CSRF protection

### Infrastructure
- **Railway** deployment (auto-deploy from GitHub)
- **Docker** support with docker-compose
- **Nginx** reverse proxy
- **Gunicorn** WSGI server

## 📁 Project Structure

```
All_Arco_Apartment/
├── frontend/                # Next.js application
│   ├── src/
│   │   ├── app/            # Next.js App Router pages
│   │   │   ├── auth/       # Authentication pages
│   │   │   ├── book/       # Booking flow
│   │   │   ├── dashboard/  # Guest dashboard
│   │   │   └── pms/        # PMS dashboard (9 sections)
│   │   ├── components/     # React components
│   │   │   └── ui/         # UI components (8 components)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities & API client
│   │   └── styles/         # Global styles
│   └── package.json
│
├── backend/                # Django application
│   ├── core/               # Django settings
│   ├── apps/               # Django apps
│   │   ├── users/          # Authentication & user management
│   │   ├── bookings/       # Booking system
│   │   ├── payments/       # Stripe integration
│   │   ├── invoices/       # Invoice & Receipt system
│   │   ├── pricing/        # Pricing rules
│   │   ├── emails/         # Email service (Zeptomail)
│   │   ├── cleaning/       # Cleaning schedule management
│   │   ├── alloggiati/     # Guest compliance (Italian law)
│   │   └── gallery/        # Image management
│   ├── manage.py
│   └── requirements.txt
│
├── docker-compose.yml      # Docker orchestration
├── Dockerfile              # Docker image
├── nginx.conf              # Nginx configuration
├── railway.toml            # Railway deployment config
└── README.md               # This file
```

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone repository
git clone <repository-url>
cd All_Arco_Apartment

# Create environment file
cp .env.docker.example .env
# Edit .env with your credentials

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f app
```

Access the application at `http://localhost:8080`

### Option 2: Manual Setup

#### Prerequisites

- **Node.js 20+** and npm/yarn
- **Python 3.11+**
- **PostgreSQL 15+**
- **Redis 7+**
- **Stripe** account (payments)
- **Zeptomail** account (transactional emails)

### 1. Clone Repository

```bash
git clone <repository-url>
cd All_Arco_Apartment
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

Frontend will run on `http://localhost:3000`

### 3. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend will run on `http://localhost:8000`

### 4. Start Celery (for background tasks)

```bash
# In separate terminal
cd backend
source venv/bin/activate
celery -A core worker --loglevel=info

# In another terminal
celery -A core beat --loglevel=info
```

## 🎯 Features

### Guest Features
- ✅ User registration and authentication
- ✅ Browse apartment details
- ✅ Check availability calendar
- ✅ Instant booking with payment
- ✅ View booking history
- ✅ Download invoices
- ✅ Profile management

### PMS Features (Team/Admin)
1. **Dashboard Overview**
   - Key metrics (revenue, bookings, occupancy)
   - Recent bookings
   - Quick actions

2. **Bookings Management**
   - Search and filter bookings
   - View booking details
   - Manual booking creation
   - Status updates
   - Email communication

3. **Payments**
   - Payment tracking
   - Refund processing
   - Transaction history

4. **Invoices & Receipts**
   - **Dual document types:**
     - **Invoices** - For companies with detailed billing information
     - **Receipts** - For individual guests
   - Separate numbering: INV-YYYY-xxxxx / REC-YYYY-xxxxx
   - Company management with business details
   - Payment method tracking (Cash, Card, Bank Transfer, At Property, Stripe)
   - Professional PDF generation with All'Arco branding
   - Automatic amount calculation from bookings
   - Duplicate prevention (one invoice + one receipt per booking max)
   - Email delivery
   - Status tracking (Draft, Sent, Paid, Overdue)

5. **Guests Database**
   - Guest profiles
   - Booking history
   - Internal notes
   - Communication log

6. **Pricing Management**
   - Base pricing settings
   - Seasonal pricing rules
   - Dynamic rate calculation

7. **Calendar View**
   - Visual booking calendar
   - Block dates feature
   - Availability management

8. **Team Management** (Admin only)
   - Invite team members
   - Role management
   - Access control

9. **Reports & Analytics**
   - Revenue reports
   - Occupancy analytics
   - Guest insights
   - Export to CSV

10. **Cleaning Management**
    - Auto-created cleanings for check-outs/blocks
    - Calendar view with counts
    - Assign, start, complete, inspect; task checklists

11. **Compliance / Alloggiati**
    - Alloggiati token scaffold + settings page
    - Online guest check-in form (public link) with guest/family capture

12. **Invoices**
    - Single-invoice-per-booking guard
    - PDF download (ReportLab)
    - Receipts/invoices tied to bookings & companies

## 🔐 Security & Authentication

### Authentication & Authorization

#### User Roles
- **Guest** - Can book, view own bookings, manage profile
- **Team Member** - Access to PMS (all sections except Team Management)
- **Admin** - Full access including team management

#### Session-Based Authentication
- Django session cookies
- Secure, httpOnly cookies
- CSRF protection with trusted origins
- 2-week session duration
- Role-based access control (RBAC)

### Security Features

✅ **Credentials Management**
- All secrets via environment variables (no hardcoded credentials)
- Secret key required (no insecure defaults)
- Zeptomail tokens secured per sender address
- Stripe keys with validation

✅ **Infrastructure Security**
- Nginx runs as non-root user
- Docker security best practices
- PostgreSQL with strong passwords
- Redis secured connection

✅ **Application Security**
- DEBUG defaults to False for production
- ALLOWED_HOSTS validation
- CORS with explicit origin whitelist
- Content-Type validation
- SQL injection protection via ORM
- XSS protection in templates

✅ **API Security**
- Session authentication with CSRF tokens
- Permission classes on all endpoints
- Input validation via DRF serializers
- Rate limiting ready (Django-ratelimit compatible)

## 💳 Payment Flow

1. Guest selects dates and enters information
2. Frontend creates booking via API
3. Backend creates Stripe Checkout Session
4. Guest redirected to Stripe hosted payment page
5. Payment processed by Stripe
6. Webhook updates booking status
7. Confirmation email sent
8. Guest redirected to confirmation page

## 📧 Email System

### Transactional Emails (via Zeptomail)
- Booking confirmation
- Payment receipt
- Check-in instructions (48h before)
- Pre-arrival reminder (7 days before)
- Post-stay thank you
- Team invitations
- Password reset

### Email Addresses
- `reservations@allarcoapartment.com` - Booking confirmations
- `check-in@allarcoapartment.com` - Check-in instructions
- `support@allarcoapartment.com` - General support

## 🗄 Database Schema

### Main Models
- **User** - Custom user with roles (Guest, Team, Admin)
- **Booking** - Reservation records with payment tracking
- **Payment** - Stripe payment records and webhooks
- **Refund** - Refund transactions
- **Invoice** - Dual-type invoices/receipts with company links
- **Company** - Company details for invoicing (business info, address)
- **BlockedDate** - Unavailable dates for maintenance
- **PricingRule** - Seasonal pricing rules
- **CleaningSchedule** - Auto-created cleaning tasks
- **CleaningTask** - Checklist items per cleaning
- **HeroImage** - Gallery image management
- **Settings** - Global configuration
- **GuestNote** - Internal notes per guest
- **EmailLog** - Email delivery history

## 🚢 Deployment

### Railway Deployment

#### Frontend Service
```bash
# Build command
npm install && npm run build

# Start command
npm start

# Environment variables
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
```

#### Backend Service
```bash
# Build command
pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate

# Start command
gunicorn core.wsgi:application --bind 0.0.0.0:$PORT

# Environment variables
See backend/.env.example
```

#### Required Railway Services
1. Frontend (Node.js)
2. Backend (Python)
3. PostgreSQL (database)
4. Redis (caching/Celery)
5. Celery Worker
6. Celery Beat

### Environment Variables

#### Frontend
- `NEXT_PUBLIC_API_URL` - Backend API URL

#### Backend (All Required - No Defaults)

**Django Core:**
- `SECRET_KEY` - Django secret (generate with Django command)
- `DEBUG` - Debug mode (default: False)
- `ALLOWED_HOSTS` - Comma-separated domains

**Database (PostgreSQL):**
- `PGDATABASE` - Database name
- `PGUSER` - Database user
- `PGPASSWORD` - Database password (REQUIRED)
- `PGHOST` - Database host
- `PGPORT` - Database port

**Redis & Celery:**
- `REDIS_URL` - Redis connection URL

**Security:**
- `CORS_ALLOWED_ORIGINS` - Frontend URLs (comma-separated)
- `CSRF_TRUSTED_ORIGINS` - Trusted origins (comma-separated)

**Payments (Stripe):**
- `STRIPE_SECRET_KEY` - Stripe secret key (REQUIRED)
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (REQUIRED)
- `STRIPE_WEBHOOK_SECRET` - Webhook secret (REQUIRED)

**Email (Zeptomail - EU Region):**
- `ZEPTOMAIL_RESERVATIONS_TOKEN` - Reservations sender (REQUIRED)
- `ZEPTOMAIL_SUPPORT_TOKEN` - Support sender (REQUIRED)
- `ZEPTOMAIL_CHECKIN_TOKEN` - Check-in sender (REQUIRED)

See [.env.example](backend/.env.example) and [.env.docker.example](.env.docker.example) for complete templates.

## 📊 API Documentation

Once backend is running, access interactive API docs:
- **Swagger UI:** `http://localhost:8000/api/docs/`
- **OpenAPI Schema:** `http://localhost:8000/api/schema/`

## 🧪 Testing

### Frontend
```bash
cd frontend
npm run test
npm run lint
npm run build  # Test production build
```

### Backend
```bash
cd backend
python manage.py test
python manage.py check
```

## 📝 Development Workflow

### Adding New Features

1. **Backend:**
   - Create/update models in `apps/*/models.py`
   - Create serializers in `apps/*/serializers.py`
   - Create views in `apps/*/views.py`
   - Add URLs in `apps/*/urls.py`
   - Run migrations: `python manage.py makemigrations && python manage.py migrate`

2. **Frontend:**
   - Add API endpoints in `src/lib/api.ts`
   - Create page in `src/app/*/page.tsx`
   - Add components in `src/components/`
   - Use React Query for data fetching

### Code Style

**Frontend:**
- TypeScript strict mode
- ESLint + Prettier
- Functional components with hooks
- TailwindCSS for styling

**Backend:**
- PEP 8 style guide
- Django best practices
- DRF serializers for validation
- Celery for async tasks

## 🔧 Troubleshooting

### Common Issues

**CORS Errors:**
- Ensure `CORS_ALLOWED_ORIGINS` includes frontend URL
- Check `withCredentials: true` in Axios config

**Session Not Persisting:**
- Verify cookie settings in Django settings
- Check `SESSION_COOKIE_SECURE` matches HTTPS status

**Stripe Webhooks Not Working:**
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:8000/api/payments/webhook/`
- Verify webhook secret matches

**Emails Not Sending:**
- Check Zeptomail API key
- View logs in Django admin

## 📖 Documentation

- [Frontend README](frontend/README.md)
- [Backend README](backend/README.md)
- [API Documentation](http://localhost:8000/api/docs/)

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Write tests
4. Submit pull request

## 📄 License

Proprietary - All Rights Reserved

## 📞 Support

For questions or issues:
- Email: support@allarcoapartment.com
- Documentation: See `/docs` folder

## ✅ Implementation Status

### Completed ✅
- ✅ Frontend (100%) - All 40+ pages and components
- ✅ Backend (100%) - All 40+ API endpoints
- ✅ Authentication system
- ✅ Booking flow
- ✅ Payment integration (Stripe)
- ✅ PMS Dashboard (all 9 sections)
- ✅ Guest Dashboard
- ✅ Email service (Zeptomail)
- ✅ Database models (10 models)
- ✅ Deployment configs

### Ready for Production 🚀
- Setup database and run migrations
- Configure environment variables
- Set up Stripe webhooks
- Configure email service
- Deploy to Railway
- Test all features

---

**Built with ❤️ for All'Arco Apartment, Venice**
