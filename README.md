# 🏛️ All'Arco Apartment - Vacation Rental Platform

> A comprehensive full-stack web platform for managing a vacation rental in Venice, Italy. Built with Next.js 16, React 19, Django 5.2, and PostgreSQL 15.

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://reactjs.org/)
[![Django](https://img.shields.io/badge/Django-5.2-092e20)](https://www.djangoproject.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🏠 Overview

**All'Arco Apartment** is a production-ready, dual-purpose web platform designed for modern vacation rental management. The system combines a guest-facing booking website with a comprehensive Property Management System (PMS) for operations.

### Purpose

1. **Guest-Facing Booking System** - Public website where guests can browse apartment details, check availability, book instantly with Stripe, and manage their reservations
2. **Property Management System (PMS)** - Internal dashboard with 9 comprehensive sections for team members to manage all aspects of operations

### Key Highlights

- ✅ **100% Complete** - All features implemented and production-ready
- 🚀 **Modern Stack** - Built with latest versions (Next.js 16, React 19, Django 5.2)
- 🔒 **Secure** - Role-based access control, CSRF protection, secure session management
- 💳 **Payment Integration** - Stripe Checkout with webhook handling
- 📧 **Email Service** - Automated transactional emails via Zeptomail (EU)
- 📊 **Analytics** - Revenue reports, occupancy tracking, guest insights
- 🌍 **International** - Multi-currency support, Italian compliance (Alloggiati)
- 🐳 **Containerized** - Docker support for easy deployment

---

## ✨ Features

### 🎯 Guest-Facing Features

#### Authentication & Profile
- User registration with email verification
- Secure login with session management
- Password reset via email
- Profile management (name, email, phone, address)

#### Booking Experience
- Rich apartment details page with amenities, reviews, and gallery
- Interactive 2-month availability calendar with dynamic pricing
- Instant booking flow with guest information collection
- Stripe Checkout integration for secure payments
- Multiple booking sources support (Website, Airbnb, Booking.com, Direct)

#### Guest Dashboard
- View all bookings with status tracking
- Download invoices and receipts (PDF)
- Online check-in form (pre-arrival)
- Booking confirmation emails
- Access to booking details and instructions

---

### 🏢 Property Management System (PMS)

#### 1. Dashboard Overview
- **Real-time Metrics**
  - Total revenue (current month/year)
  - Active bookings count
  - Occupancy rate percentage
  - Average booking value
- Recent bookings list
- Quick action buttons
- Performance charts (Recharts)

#### 2. Bookings Management (30+ Endpoints)
- **Advanced Search & Filtering**
  - Filter by status (pending, confirmed, paid, checked-out, cancelled)
  - Date range filtering
  - Guest name/email search
  - Booking source filter
  - Payment status filter
- **Booking Operations**
  - Create manual bookings
  - View detailed booking information
  - Update booking status
  - Cancel bookings with reason tracking
  - Mark as no-show
  - Check-in/check-out management
  - ETA time tracking
- **Communication**
  - Email guests directly from dashboard
  - Automated confirmation emails
  - Pre-arrival instructions (48h before)
  - Booking reminders
- **Bulk Operations**
  - Export to CSV
  - Bulk status updates

#### 3. Payments & Refunds
- Payment tracking and transaction history
- Multiple payment methods (Stripe, Cash, Card, Bank Transfer, At Property)
- Payment status monitoring (pending, succeeded, failed, refunded)
- Refund processing with Stripe integration
- Partial refund support
- Refund reason tracking
- Transaction failure logging

#### 4. Invoices & Receipts System (Professional & Immutable)

**Dual Document Type Support:**
- **Invoices** - For companies with detailed business information
  - Numbering format: `INV-YYYY-xxxxx`
  - Company details (name, VAT, SDI code, tax code, address)
  - Business contact email
  - Optional due date
- **Receipts** - For individual guests
  - Numbering format: `REC-YYYY-xxxxx`
  - Guest name and contact info
  - Immediate payment tracking

**Dynamic Line Item Management:**
- **Add/Remove Items** - Full control during invoice creation
  - Auto-populated from booking (accommodation, cleaning, tourist tax)
  - Manual line items with custom descriptions
  - Quantity, unit price, and tax rate per item
  - Real-time total calculation
- **Immutable After Creation** - Invoices cannot be edited once generated
  - Ensures document integrity
  - Clear visual indicators on frontend
  - Audit trail preservation

**Professional Features:**
- **Multi-Step Creation Wizard**
  1. Select booking
  2. Choose document type (Invoice/Receipt)
  3. Select company (for invoices)
  4. Add/edit line items dynamically
  5. Review and create
- **Company Management** - Full CRUD operations
  - Store and reuse company details
  - VAT number, SDI code, tax code support
  - Multiple companies support
  - Search and filter capabilities
- **PDF Generation** - Professional branded documents (ReportLab)
  - Line items table with quantities and prices
  - Subtotal, tax, and grand total
  - Company branding and styling
- **Email Delivery** - Automated sending from support@allarcoapartment.com
  - Professional email template
  - PDF attachment included
  - Email tracking (sent count, last sent date)
  - Send to custom or guest email
- **Permission-Based Access** - RBAC integration
  - View invoices
  - Create invoices/receipts
  - Delete invoices
  - Send emails
  - Edit settings
- **Smart Features**
  - Duplicate prevention per booking
  - Auto-generated invoice numbers
  - Date tracking (issued, due, sent)
  - Payment method tracking

#### 5. Guests Directory
- Complete guest profiles with contact information
- Booking history per guest
- Internal notes and tags
- Communication log
- Guest search and filtering
- Export guest data
- Repeat guest identification

#### 6. Pricing Management
- **Base Pricing Configuration**
  - Nightly rate
  - Cleaning fee (one-time)
  - Tourist tax per person per night
  - Extra guest fees
- **Stay Requirements**
  - Minimum stay duration
  - Maximum stay duration
  - Check-in time (default 15:00)
  - Check-out time (default 10:00)
  - Maximum guest capacity
- **Seasonal Pricing Rules**
  - Date range-based pricing
  - Multiplier or fixed rate
  - Priority system for overlapping rules
  - Rule description and notes
- **Dynamic Calculation** - Real-time price calculation on frontend

#### 7. Calendar View
- Visual monthly booking calendar
- Color-coded booking status
- Block dates for maintenance/events
- Drag-and-drop availability management
- Quick booking details on hover
- Month navigation
- Booking density heatmap

#### 8. Team Management (Admin Only)
- **Role-Based Access Control (RBAC)**
  - Guest role - Limited to own bookings
  - Team Member role - PMS access (except Team Management)
  - Admin role - Full access including team management
- **Team Operations**
  - Invite team members via email
  - Assign roles and permissions
  - Revoke access
  - View team activity logs
- **Granular Permissions** (10 groups, 50+ permissions)
  - **Dashboard** - View metrics and analytics
  - **Bookings** - Create, view, edit, cancel reservations
  - **Payments** - Process payments and refunds
  - **Invoices** - Create, view, send, delete invoices/receipts
  - **Guests** - Manage guest directory
  - **Pricing** - Configure rates and rules
  - **Expenses** - Track and approve business expenses
  - **Team** - Manage team members (Admin only)
  - **Gallery** - Upload and manage images
  - **Reports** - View analytics and exports

#### 9. Reports & Analytics
- **Revenue Reports**
  - Daily, weekly, monthly breakdown
  - Year-over-year comparison
  - Revenue by booking source
  - Payment method distribution
- **Occupancy Analytics**
  - Occupancy rate trends
  - Peak season identification
  - Average length of stay
  - Booking lead time
- **Guest Insights**
  - Guest demographics
  - Repeat guest rate
  - Guest satisfaction scores
  - Booking patterns
- **Export Options**
  - CSV export
  - Date range selection
  - Custom report generation

#### 10. Cleaning Management
- **Automated Task Creation**
  - Auto-created on booking checkout
  - Auto-created for blocked dates
- **Scheduling & Assignment**
  - Assign to team members
  - Set priority (low, normal, high, urgent)
  - Estimated duration
  - Due date tracking
- **Status Workflow**
  - Pending → Assigned → In Progress → Completed
  - Inspector notes
- **Task Checklists**
  - Predefined cleaning tasks
  - Custom checklist per cleaning
  - Completion tracking
- **Calendar View**
  - Daily cleaning counts
  - Color-coded status
  - Drag-and-drop scheduling

#### 11. Alloggiati Compliance (Italian Law)
- **Guest Registration System**
  - Public online check-in form
  - Unique booking code access
  - Guest and family member capture
  - Document type and dates collection
  - Birth information tracking
- **API Integration**
  - Alloggiati API token management
  - Token expiry tracking
  - Submission status
  - Error logging
- **Privacy Compliance**
  - GDPR-compliant data processing
  - Document retention policies
  - Consent management

---

## 🛠 Tech Stack

### Frontend Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | Next.js (App Router) | 16.x | SSR, routing, API routes |
| **UI Library** | React | 19.x | Component-based UI |
| **Language** | TypeScript | 5.x | Type safety |
| **Styling** | TailwindCSS | 4.x | Utility-first CSS |
| **Components** | Radix UI + shadcn/ui | Latest | Accessible components |
| **State Management** | React Query + Zustand | 5.x + 4.5.x | Server/client state |
| **Forms** | React Hook Form + Zod | Latest | Form handling & validation |
| **HTTP Client** | Axios | Latest | API requests |
| **Animations** | Framer Motion | Latest | Smooth transitions |
| **Payments UI** | @stripe/react-stripe-js | Latest | Stripe components |
| **Maps** | Leaflet + React Leaflet | Latest | Location display |
| **Charts** | Recharts | Latest | Analytics visualization |
| **Notifications** | Sonner | Latest | Toast notifications |
| **Date Utils** | date-fns | Latest | Date manipulation |

### Backend Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | Django | 5.2 | Web framework |
| **API** | Django REST Framework | 3.16 | RESTful API |
| **Database** | PostgreSQL | 15+ | Primary data store |
| **Cache** | Redis | 7+ | Caching & message broker |
| **Task Queue** | Celery + Beat | 5.4 | Async tasks & scheduling |
| **Payments** | Stripe SDK | 11.4 | Payment processing |
| **Email** | Zeptomail (EU) | Latest | Transactional emails |
| **PDF Generation** | ReportLab | 4.2.5 | Invoice/receipt PDFs |
| **PDF Alternative** | WeasyPrint | 63.1 | Advanced PDF rendering |
| **Image Processing** | Pillow | Latest | Gallery images |
| **CORS** | django-cors-headers | Latest | CORS handling |
| **API Docs** | drf-spectacular | Latest | OpenAPI/Swagger |
| **Cache Backend** | django-redis | Latest | Redis integration |
| **Config** | python-decouple | Latest | Environment variables |

### Infrastructure & DevOps

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Containerization** | Docker + docker-compose | Multi-stage builds |
| **Reverse Proxy** | Nginx | Static files & routing |
| **WSGI Server** | Gunicorn (3 workers) | Production server |
| **Process Manager** | Supervisor | Multi-process management |
| **Deployment** | Railway | Cloud platform |
| **Static Files** | WhiteNoise | Compression & serving |
| **Version Control** | Git + GitHub | Source control |

---

## 🏗 Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Browser                       │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Nginx (Port 8080)                       │
│                     Reverse Proxy                            │
└───────┬──────────────────────────────────────────┬──────────┘
        │                                          │
        │ /api/*                                   │ /*
        ▼                                          ▼
┌──────────────────┐                    ┌──────────────────────┐
│  Django Backend  │                    │  Next.js Frontend    │
│  (Port 8000)     │                    │  (Port 3000)         │
│  - REST API      │                    │  - SSR Pages         │
│  - Gunicorn      │◄───────────────────│  - API Proxy         │
│  - DRF           │  API Requests      │  - React Components  │
└────────┬─────────┘                    └──────────────────────┘
         │
         │ Database Queries
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│                     (Port 5432)                              │
└─────────────────────────────────────────────────────────────┘
         ▲
         │ Cache Queries
┌────────┴─────────┐
│  Redis Cache     │◄──────────┐
│  (Port 6379)     │            │
└──────────────────┘            │ Celery Broker
         ▲                      │
         │                      │
┌────────┴──────────────────────┴──────┐
│         Celery Workers                │
│  - Email sending (async)              │
│  - PDF generation                     │
│  - Scheduled tasks (Beat)             │
│  - Booking reminders                  │
└───────────────────────────────────────┘
         │
         │ External APIs
         ▼
┌─────────────────────────────────────────┐
│  External Services                      │
│  - Stripe (Payments)                    │
│  - Zeptomail (Emails)                   │
│  - Alloggiati API (Italian compliance)  │
└─────────────────────────────────────────┘
```

### Authentication Flow

```
┌─────────┐                ┌──────────┐               ┌──────────┐
│ Browser │                │ Next.js  │               │  Django  │
└────┬────┘                └────┬─────┘               └────┬─────┘
     │                          │                          │
     │ 1. Login Form            │                          │
     ├─────────────────────────►│                          │
     │                          │ 2. POST /api/auth/login/ │
     │                          ├─────────────────────────►│
     │                          │                          │
     │                          │ 3. Session Cookie + CSRF │
     │                          │◄─────────────────────────┤
     │ 4. Set Cookies           │                          │
     │◄─────────────────────────┤                          │
     │                          │                          │
     │ 5. Subsequent Requests   │                          │
     │  (with session cookie)   │                          │
     ├─────────────────────────►│ 6. Verify Session        │
     │                          ├─────────────────────────►│
     │                          │ 7. User Data             │
     │                          │◄─────────────────────────┤
     │ 8. Response              │                          │
     │◄─────────────────────────┤                          │
     │                          │                          │
```

### Booking & Payment Flow

```
1. Guest selects dates on calendar (Frontend)
2. API call to check availability (GET /api/bookings/availability/)
3. Guest fills booking form (name, email, guests, etc.)
4. Create booking (POST /api/bookings/)
5. Backend calculates price, applies rules
6. Create Stripe Checkout Session
7. Return session URL to frontend
8. Redirect to Stripe hosted checkout page
9. Guest completes payment on Stripe
10. Stripe webhook notifies backend (POST /api/payments/webhook/)
11. Update booking status to 'paid'
12. Trigger Celery task to send confirmation email
13. Redirect to confirmation page
14. Display booking details and next steps
```

---

## 📁 Project Structure

```
All_Arco_Apartment/
├── frontend/                           # Next.js 16 Application
│   ├── src/
│   │   ├── app/                       # App Router Pages
│   │   │   ├── auth/                  # Authentication (login, register, reset)
│   │   │   ├── book/                  # Booking flow pages
│   │   │   ├── booking/               # Booking details & management
│   │   │   │   ├── [id]/             # Dynamic booking routes
│   │   │   │   │   ├── check-in/     # Online check-in form
│   │   │   │   │   └── confirmation/  # Booking confirmation
│   │   │   │   └── confirmation/      # Alias route
│   │   │   ├── dashboard/             # Guest dashboard
│   │   │   ├── pms/                   # Property Management System
│   │   │   │   ├── bookings/         # Bookings management
│   │   │   │   ├── payments/         # Payments & refunds
│   │   │   │   ├── invoices/         # Invoice/receipt system
│   │   │   │   ├── guests/           # Guest directory
│   │   │   │   ├── pricing/          # Pricing management
│   │   │   │   ├── calendar/         # Calendar view
│   │   │   │   ├── team/             # Team management (admin)
│   │   │   │   ├── reports/          # Reports & analytics
│   │   │   │   ├── cleaning/         # Cleaning management
│   │   │   │   └── compliance/       # Alloggiati compliance
│   │   │   ├── profile/              # User profile
│   │   │   ├── privacy-policy/       # Privacy policy
│   │   │   ├── terms-of-service/     # Terms of service
│   │   │   ├── cancellation-policy/  # Cancellation policy
│   │   │   ├── layout.tsx            # Root layout
│   │   │   └── page.tsx              # Homepage
│   │   ├── components/               # React Components
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── booking/              # Booking components
│   │   │   ├── pms/                  # PMS components
│   │   │   ├── location/             # Map & location
│   │   │   ├── reviews/              # Review components
│   │   │   ├── SiteNav.tsx           # Navigation
│   │   │   └── SiteFooter.tsx        # Footer
│   │   ├── hooks/                    # Custom React Hooks
│   │   │   ├── useAuth.ts            # Authentication
│   │   │   ├── useBooking.ts         # Booking operations
│   │   │   └── useDebounce.ts        # Debounce utility
│   │   ├── lib/                      # Utilities & Configuration
│   │   │   ├── api.ts                # Axios API client
│   │   │   ├── stripe.ts             # Stripe initialization
│   │   │   ├── queryClient.ts        # React Query config
│   │   │   ├── utils.ts              # Helper functions
│   │   │   ├── auditLogger.ts        # Audit logging
│   │   │   └── userId.ts             # User ID utils
│   │   ├── stores/                   # Zustand State Management
│   │   │   └── authStore.ts          # Auth state
│   │   ├── types/                    # TypeScript Types
│   │   │   └── index.ts              # Type definitions
│   │   └── middleware.ts             # Next.js middleware
│   ├── public/                       # Static Assets
│   │   ├── images/                   # Images
│   │   └── icons/                    # Icons
│   ├── .env.local.example            # Environment template
│   ├── next.config.js                # Next.js configuration
│   ├── tailwind.config.ts            # Tailwind configuration
│   ├── tsconfig.json                 # TypeScript configuration
│   └── package.json                  # Dependencies
│
├── backend/                          # Django Application
│   ├── core/                         # Django Project Settings
│   │   ├── settings.py               # Main configuration
│   │   ├── urls.py                   # Root URL router
│   │   ├── celery.py                 # Celery configuration
│   │   ├── wsgi.py                   # WSGI entry point
│   │   └── asgi.py                   # ASGI entry point
│   ├── apps/                         # Django Apps (11 apps)
│   │   ├── users/                    # User Management
│   │   │   ├── models.py             # User, Role, Permission
│   │   │   ├── views.py              # Auth endpoints
│   │   │   ├── serializers.py        # Serializers
│   │   │   ├── urls.py               # URL routes
│   │   │   └── admin.py              # Django admin
│   │   ├── bookings/                 # Booking System
│   │   │   ├── models.py             # Booking, BlockedDate
│   │   │   ├── views.py              # 30+ endpoints
│   │   │   ├── serializers.py        # Serializers
│   │   │   └── urls.py               # URL routes
│   │   ├── payments/                 # Payment Processing
│   │   │   ├── models.py             # Payment, Refund
│   │   │   ├── views.py              # Payment endpoints
│   │   │   ├── serializers.py        # Serializers
│   │   │   └── urls.py               # URL routes
│   │   ├── invoices/                 # Invoice/Receipt System
│   │   │   ├── models.py             # Invoice, Company
│   │   │   ├── views.py              # CRUD, PDF, Email
│   │   │   ├── serializers.py        # Serializers
│   │   │   └── urls.py               # URL routes
│   │   ├── pricing/                  # Pricing Configuration
│   │   │   ├── models.py             # Settings, PricingRule
│   │   │   ├── views.py              # Pricing endpoints
│   │   │   ├── serializers.py        # Serializers
│   │   │   └── urls.py               # URL routes
│   │   ├── emails/                   # Email Service
│   │   │   ├── models.py             # EmailLog
│   │   │   ├── services.py           # Zeptomail integration
│   │   │   ├── views.py              # Email endpoints
│   │   │   └── urls.py               # URL routes
│   │   ├── gallery/                  # Image Management
│   │   │   ├── models.py             # HeroImage
│   │   │   ├── views.py              # Gallery endpoints
│   │   │   └── urls.py               # URL routes
│   │   ├── cleaning/                 # Cleaning Management
│   │   │   ├── models.py             # CleaningSchedule, Task
│   │   │   ├── views.py              # Cleaning endpoints
│   │   │   └── urls.py               # URL routes
│   │   ├── expenses/                 # Expense Tracking
│   │   │   └── models.py             # Expense model
│   │   ├── alloggiati/              # Italian Compliance
│   │   │   ├── models.py             # AlloggiatiAccount
│   │   │   ├── views.py              # Check-in form
│   │   │   └── urls.py               # URL routes
│   │   └── reports/                  # Reports & Analytics
│   │       ├── views.py              # Report endpoints
│   │       └── urls.py               # URL routes
│   ├── manage.py                     # Django CLI
│   ├── requirements.txt              # Python dependencies
│   ├── .env.example                  # Environment template
│   └── Procfile                      # Railway configuration
│
├── Dockerfile                        # Multi-stage Docker build
├── docker-compose.yml                # Local development
├── docker-entrypoint.sh              # Container startup script
├── nginx.conf                        # Nginx configuration
├── supervisord.conf                  # Process management
├── railway.toml                      # Railway deployment
├── .env.docker.example               # Docker environment
├── .gitignore                        # Git ignore rules
├── README.md                         # This file
├── CHANGELOG.md                      # Version history
├── DOCKER_QUICKSTART.md              # Docker setup guide
└── DEPLOYMENT.md                     # Deployment guide
```

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20+ and npm/yarn
- **Python** 3.11+
- **PostgreSQL** 15+
- **Redis** 7+
- **Git**
- **Docker & Docker Compose** (for containerized setup)

### Quick Start with Docker (Recommended)

The fastest way to get the entire stack running:

```bash
# 1. Clone the repository
git clone https://github.com/your-username/All_Arco_Apartment.git
cd All_Arco_Apartment

# 2. Copy environment file and configure
cp .env.docker.example .env
# Edit .env with your credentials (see Configuration section)

# 3. Start all services
docker-compose up -d

# 4. Check logs
docker-compose logs -f app

# 5. Access the application
# Frontend: http://localhost:8080
# Backend: http://localhost:8080/api
# Swagger Docs: http://localhost:8080/api/docs
```

The application will be available at `http://localhost:8080`

---

### Manual Setup (Development)

#### 1. Clone Repository

```bash
git clone https://github.com/your-username/All_Arco_Apartment.git
cd All_Arco_Apartment
```

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your configuration
# NEXT_PUBLIC_API_URL=http://localhost:8000/api
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

#### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your configuration (see Configuration section)

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

Backend API will be available at `http://localhost:8000`

#### 4. Start Celery Workers (Required for Emails & Async Tasks)

Open two new terminal windows:

**Terminal 1 - Celery Worker:**
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
celery -A core worker --loglevel=info
```

**Terminal 2 - Celery Beat (Scheduler):**
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
celery -A core beat --loglevel=info
```

#### 5. Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/api
- **Django Admin:** http://localhost:8000/admin
- **API Documentation (Swagger):** http://localhost:8000/api/docs/

---

## ⚙️ Configuration

### Environment Variables

#### Frontend (.env.local)

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Stripe Publishable Key (get from Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxx
```

#### Backend (.env)

**Django Core:**
```bash
# REQUIRED - Generate with: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
SECRET_KEY=your-secret-key-here

# Debug mode (NEVER set to True in production)
DEBUG=False

# Allowed hosts (comma-separated, required in production)
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

**Database (PostgreSQL):**
```bash
PGDATABASE=allarco
PGUSER=postgres
PGPASSWORD=your-strong-password  # REQUIRED
PGHOST=localhost
PGPORT=5432
```

**Redis & Celery:**
```bash
REDIS_URL=redis://localhost:6379/0
```

**Security:**
```bash
# Comma-separated origins
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.com
CSRF_TRUSTED_ORIGINS=http://localhost:3000,https://your-frontend.com
```

**Stripe Payments:**
```bash
# Get from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx  # REQUIRED
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx  # REQUIRED

# Get from https://dashboard.stripe.com/webhooks
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # REQUIRED
```

**Zeptomail (EU Region):**
```bash
# Get from https://www.zoho.com/zeptomail/
ZEPTOMAIL_RESERVATIONS_TOKEN=your-token-here  # REQUIRED
ZEPTOMAIL_SUPPORT_TOKEN=your-token-here       # REQUIRED
ZEPTOMAIL_CHECKIN_TOKEN=your-token-here       # REQUIRED
```

### Configuration Files

#### Next.js Configuration (frontend/next.config.js)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'your-backend-domain.com'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
```

#### Django Settings (backend/core/settings.py)

Key configurations:
- `SESSION_COOKIE_AGE = 1209600` (2 weeks)
- `SESSION_COOKIE_HTTPONLY = True`
- `SESSION_COOKIE_SECURE = True` (production only)
- `CSRF_COOKIE_SECURE = True` (production only)
- `CSRF_USE_SESSIONS = False`
- `REST_FRAMEWORK` with session authentication
- `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND`

---

## 📚 API Documentation

### API Overview

The backend provides 40+ RESTful endpoints organized by domain:

#### Authentication Endpoints (4)
```
POST   /api/auth/register/        # Register new user
POST   /api/auth/login/           # Login and create session
POST   /api/auth/logout/          # Logout and destroy session
GET    /api/auth/me/              # Get current user details
POST   /api/auth/password-reset/  # Request password reset
POST   /api/auth/password-reset-confirm/  # Confirm password reset
```

#### Booking Endpoints (15+)
```
GET    /api/bookings/                        # List bookings (with filters)
POST   /api/bookings/                        # Create booking
GET    /api/bookings/{id}/                   # Get booking details
PATCH  /api/bookings/{id}/                   # Update booking
DELETE /api/bookings/{id}/                   # Delete booking
POST   /api/bookings/{id}/complete_checkin/  # Complete check-in
POST   /api/bookings/{id}/cancel_booking/    # Cancel booking
POST   /api/bookings/{id}/mark_no_show/      # Mark as no-show
GET    /api/bookings/availability/           # Check availability
GET    /api/bookings/calendar/month/         # Monthly calendar data
GET    /api/bookings/statistics/             # Booking statistics
GET    /api/bookings/blocked-dates/          # List blocked dates
POST   /api/bookings/blocked-dates/          # Block dates
```

#### Payment Endpoints (5+)
```
GET    /api/payments/                           # List payments
POST   /api/payments/create-checkout-session/   # Create Stripe session
POST   /api/payments/create-city-tax-session/   # Create city tax session
POST   /api/payments/{id}/refund/               # Process refund
POST   /api/payments/webhook/                   # Stripe webhook handler
GET    /api/payments/confirm-checkout-session/  # Confirm session
GET    /api/payments/confirm-city-tax-session/  # Confirm city tax
```

#### Invoice Endpoints (8+)
```
GET    /api/invoices/                    # List invoices (with filters)
POST   /api/invoices/                    # Create invoice with line items
GET    /api/invoices/{id}/               # Get invoice details
DELETE /api/invoices/{id}/               # Delete invoice
POST   /api/invoices/{id}/generate_pdf/  # Generate PDF with line items
POST   /api/invoices/{id}/send_email/    # Send via email from support@
GET    /api/invoices/{id}/download_pdf/  # Download PDF

GET    /api/companies/                   # List companies
POST   /api/companies/                   # Create company
GET    /api/companies/{id}/              # Get company details
PATCH  /api/companies/{id}/              # Update company
DELETE /api/companies/{id}/              # Delete company
```

#### Pricing Endpoints (4+)
```
GET    /api/pricing/settings/        # Get pricing settings
PATCH  /api/pricing/settings/update/  # Update settings
GET    /api/pricing/calculate/       # Calculate price for dates
GET    /api/pricing/rules/           # List pricing rules
POST   /api/pricing/rules/           # Create pricing rule
```

#### Other Endpoints
```
# Guests
GET    /api/guests/              # List guests
GET    /api/guests/{id}/         # Guest details

# Team
GET    /api/team/                # List team members
POST   /api/team/                # Invite team member
DELETE /api/team/{id}/           # Remove team member

# Cleaning
GET    /api/cleaning/            # List cleaning tasks
POST   /api/cleaning/            # Create cleaning task
GET    /api/cleaning/{id}/       # Task details
PATCH  /api/cleaning/{id}/       # Update task

# Gallery
GET    /api/gallery/public/      # Public gallery images
GET    /api/gallery/             # All images (admin)
POST   /api/gallery/             # Upload image

# Alloggiati
GET    /api/alloggiati/public-form/    # Public check-in form
POST   /api/alloggiati/submit-checkin/  # Submit check-in data
```

### Interactive API Documentation

Once the backend is running, access comprehensive API documentation:

- **Swagger UI:** http://localhost:8000/api/docs/
  - Interactive API explorer
  - Try endpoints directly
  - View request/response schemas

- **OpenAPI Schema:** http://localhost:8000/api/schema/
  - Download OpenAPI 3.0 spec
  - Import into Postman/Insomnia

---

## 🚢 Deployment

### Railway Deployment (Recommended)

#### Prerequisites

1. Railway account (https://railway.app/)
2. GitHub repository
3. Stripe account with webhook configured
4. Zeptomail account

#### Services Setup

Create the following services on Railway:

**1. PostgreSQL Database**
```bash
# Add PostgreSQL plugin from Railway
# Note the connection details
```

**2. Redis Cache**
```bash
# Add Redis plugin from Railway
# Note the connection URL
```

**3. Backend Service (Python)**

```bash
# Build Command
pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate

# Start Command
gunicorn core.wsgi:application --bind 0.0.0.0:$PORT --workers 3

# Environment Variables
# Copy all from backend/.env.example and configure
```

**4. Frontend Service (Node.js)**

```bash
# Build Command
npm install && npm run build

# Start Command
npm start

# Environment Variables
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
```

**5. Celery Worker Service**

```bash
# Start Command
celery -A core worker --loglevel=info

# Environment Variables
# Same as Backend Service
```

**6. Celery Beat Service**

```bash
# Start Command
celery -A core beat --loglevel=info

# Environment Variables
# Same as Backend Service
```

#### Auto-Deployment

Railway automatically deploys when you push to GitHub:

```bash
git add .
git commit -m "Your commit message"
git push origin main
# Railway will automatically build and deploy
```

---

### Docker Deployment

#### Single Container (All Services)

```bash
# Build image
docker build -t allarco-apartment .

# Run container
docker run -d \
  --name allarco \
  -p 8080:8080 \
  --env-file .env \
  allarco-apartment
```

#### Docker Compose (Local Production)

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: allarco
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${PGPASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  app:
    build: .
    ports:
      - "8080:8080"
    env_file:
      - .env
    depends_on:
      - db
      - redis

volumes:
  postgres_data:
```

---

### Manual Deployment (VPS/Server)

#### Prerequisites

- Ubuntu 22.04+ or similar
- Nginx installed
- Supervisor installed
- SSL certificate (Let's Encrypt)

#### Steps

1. **Clone repository**
2. **Setup backend** (see Backend Setup)
3. **Setup frontend** (see Frontend Setup)
4. **Configure Nginx** (see nginx.conf)
5. **Setup Supervisor** (see supervisord.conf)
6. **Configure SSL** with Certbot
7. **Start services**

---

## 🔒 Security

### Authentication & Authorization

#### User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Guest** | Regular user | View own bookings, make new bookings, manage profile |
| **Team Member** | Staff member | Access to PMS (all sections except Team Management) |
| **Admin** | Administrator | Full access including team management and RBAC |

#### Session Security

- **HttpOnly cookies** - Prevents XSS attacks
- **Secure flag** - HTTPS only (production)
- **SameSite=Lax** - CSRF protection
- **2-week expiration** - Auto logout after 14 days
- **CSRF tokens** - Double-submit cookie pattern

### Role-Based Access Control (RBAC)

**Permission Groups (10 total, 50+ individual permissions):**
1. **Dashboard** - View metrics and overview
2. **Bookings** - Manage reservations
3. **Payments** - Process payments and refunds
4. **Invoices** - Create, view, send, delete invoices/receipts
   - `invoices.view` - View invoices and receipts
   - `invoices.create` - Create new invoices/receipts
   - `invoices.edit` - Edit invoice settings
   - `invoices.delete` - Delete invoices
   - `invoices.send` - Send invoices via email
5. **Guests** - View and manage guest directory
6. **Pricing** - Configure pricing and rules
7. **Expenses** - Track and approve business expenses
   - `expenses.view` - View expenses and statistics
   - `expenses.create` - Create expense records
   - `expenses.edit` - Edit expenses
   - `expenses.delete` - Delete expenses
   - `expenses.approve` - Approve/reject expenses
8. **Team** - Manage team members (Admin only)
9. **Gallery** - Manage images
10. **Reports** - View analytics and reports

**Permission Levels:**
- **View** - Read-only access to resources
- **Create** - Add new records
- **Edit** - Modify existing records
- **Delete** - Remove records
- **Approve** - Approve/reject submissions (expenses)
- **Send** - Send communications (emails, invoices)

### Application Security

✅ **Input Validation**
- DRF serializers validate all API inputs
- Zod schemas validate frontend forms
- SQL injection prevention via Django ORM
- XSS protection in templates

✅ **Secure Configuration**
- DEBUG defaults to False
- No default SECRET_KEY (must be set)
- ALLOWED_HOSTS validation
- CORS whitelist (no wildcards)

✅ **API Security**
- Session authentication required
- CSRF protection on mutations
- Permission classes on all views
- Rate limiting ready

✅ **Payment Security**
- PCI-DSS compliant via Stripe
- No card data stored locally
- Webhook signature verification
- Payment intent tracking

✅ **Infrastructure Security**
- Nginx runs as non-root
- Docker security scanning
- Environment variable secrets
- PostgreSQL password required
- Redis authentication

### Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Rotate keys regularly** - Update tokens quarterly
3. **Monitor logs** - Check Django admin for suspicious activity
4. **Use HTTPS** - Always in production
5. **Update dependencies** - Run `npm audit` and `pip-audit` regularly
6. **Backup database** - Daily automated backups
7. **Strong passwords** - Enforce minimum 8 characters
8. **Two-factor authentication** - Recommended for admin accounts

---

## 🔧 Troubleshooting

### Common Issues

#### CORS Errors

**Problem:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Solution:**
```bash
# In backend/.env, ensure:
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.com
CSRF_TRUSTED_ORIGINS=http://localhost:3000,https://your-frontend.com

# In frontend API client (lib/api.ts), ensure:
withCredentials: true
```

#### Session Not Persisting

**Problem:** User logs in but session doesn't persist

**Solution:**
```python
# In backend/core/settings.py, check:
SESSION_COOKIE_SECURE = False  # Set to True only on HTTPS
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# Ensure frontend and backend are on same domain or proper CORS setup
```

#### Stripe Webhooks Not Working

**Problem:** Payments succeed but booking status doesn't update

**Solution:**
```bash
# For local development, use Stripe CLI:
stripe listen --forward-to localhost:8000/api/payments/webhook/

# Copy the webhook signing secret to .env:
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# For production, configure webhook in Stripe Dashboard:
https://your-backend.com/api/payments/webhook/
```

#### Emails Not Sending

**Problem:** Confirmation emails not received

**Solution:**
```bash
# Check Celery worker is running:
docker-compose logs celery-worker

# Verify Zeptomail tokens in .env:
ZEPTOMAIL_RESERVATIONS_TOKEN=your-token
ZEPTOMAIL_SUPPORT_TOKEN=your-token
ZEPTOMAIL_CHECKIN_TOKEN=your-token

# Check email logs in Django admin:
http://localhost:8000/admin/emails/emaillog/
```

#### Database Connection Failed

**Problem:** `django.db.utils.OperationalError: could not connect to server`

**Solution:**
```bash
# Check PostgreSQL is running:
docker-compose ps
# or
sudo systemctl status postgresql

# Verify database credentials in .env:
PGDATABASE=allarco
PGUSER=postgres
PGPASSWORD=your-password
PGHOST=localhost  # or 'db' for docker-compose
PGPORT=5432

# Test connection:
psql -h localhost -U postgres -d allarco
```

#### Redis Connection Failed

**Problem:** `redis.exceptions.ConnectionError: Error connecting to Redis`

**Solution:**
```bash
# Check Redis is running:
docker-compose ps
# or
sudo systemctl status redis

# Verify Redis URL in .env:
REDIS_URL=redis://localhost:6379/0
# or for docker-compose:
REDIS_URL=redis://redis:6379/0

# Test connection:
redis-cli ping
# Should return: PONG
```

#### PDF Generation Fails

**Problem:** Invoice PDF download returns 500 error

**Solution:**
```bash
# Check ReportLab is installed:
pip show reportlab

# Check Django logs for errors:
python manage.py runserver --verbosity 2

# Verify media directory exists and is writable:
mkdir -p backend/media/invoices
chmod 755 backend/media/invoices
```

#### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using the port:
# On macOS/Linux:
lsof -i :3000
# On Windows:
netstat -ano | findstr :3000

# Kill the process:
# On macOS/Linux:
kill -9 <PID>
# On Windows:
taskkill /PID <PID> /F

# Or use different port:
PORT=3001 npm run dev
```

---

## 🧪 Testing

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Lint code
npm run lint

# Type check
npm run type-check

# Build for production (test build)
npm run build
```

### Backend Tests

```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate

# Run all tests
python manage.py test

# Run specific app tests
python manage.py test apps.bookings

# Run with coverage
coverage run --source='.' manage.py test
coverage report

# Check Django configuration
python manage.py check

# Check database migrations
python manage.py makemigrations --check --dry-run
```

### End-to-End Testing

```bash
# Install Playwright (optional)
npm install -D @playwright/test

# Run E2E tests
npx playwright test

# Run in headed mode
npx playwright test --headed

# Run specific test file
npx playwright test tests/booking-flow.spec.ts
```

---

## 📖 Additional Documentation

- **[Backend README](backend/README.md)** - Django backend details
- **[Docker Quickstart](DOCKER_QUICKSTART.md)** - Docker setup guide
- **[Deployment Guide](DEPLOYMENT.md)** - Detailed deployment instructions
- **[Changelog](CHANGELOG.md)** - Version history and updates

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write or update tests
5. Ensure all tests pass
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Style

**Frontend:**
- Follow TypeScript strict mode
- Use ESLint + Prettier
- Functional components with hooks
- TailwindCSS utility classes
- Meaningful variable names

**Backend:**
- Follow PEP 8 style guide
- Django best practices
- DRF serializers for validation
- Docstrings for functions
- Type hints (Python 3.11+)

### Commit Messages

Follow conventional commits:
```
feat: Add city tax payment option
fix: Resolve booking calendar date range bug
docs: Update deployment guide
refactor: Simplify booking form validation
test: Add invoice PDF generation tests
```

### Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure CI/CD passes
4. Request review from maintainers
5. Address review feedback
6. Squash commits if requested

---

## 📄 License

**Proprietary - All Rights Reserved**

This software and associated documentation files (the "Software") are proprietary and confidential. Unauthorized copying, modification, distribution, or use of this Software, via any medium, is strictly prohibited without explicit written permission from the owner.

For licensing inquiries, contact: support@allarcoapartment.com

---

## 📞 Support & Contact

### Technical Support

- **Email:** support@allarcoapartment.com
- **Website:** https://www.allarcoapartment.com
- **Documentation:** See `/docs` folder

### Reporting Issues

Please report bugs or security vulnerabilities:
1. Check existing issues on GitHub
2. Create a detailed issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, browser, versions)

### Feature Requests

We welcome feature suggestions! Please:
1. Check if it's already requested
2. Describe the use case
3. Explain the expected behavior
4. Provide mockups if applicable

---

## ✅ Implementation Status

### Completed Features (100%)

- ✅ **Frontend** (40+ pages) - All routes and components
- ✅ **Backend** (40+ endpoints) - Complete RESTful API
- ✅ **Authentication System** - Session-based with RBAC
- ✅ **Booking Flow** - From availability check to confirmation
- ✅ **Payment Integration** - Stripe Checkout with webhooks
- ✅ **PMS Dashboard** - All 9 sections fully functional
- ✅ **Guest Dashboard** - Booking history and profile
- ✅ **Email Service** - Zeptomail integration with templates
- ✅ **Invoice System** - Dual-type PDF generation
- ✅ **Database Models** - 10+ models with relationships
- ✅ **Cleaning Management** - Full workflow
- ✅ **Alloggiati Compliance** - Italian law compliance
- ✅ **Reports & Analytics** - Charts and exports
- ✅ **Deployment Configs** - Docker, Railway, manual
- ✅ **Documentation** - Comprehensive guides

### Production Ready 🚀

**Deployment Checklist:**
- [ ] Setup PostgreSQL database
- [ ] Configure Redis cache
- [ ] Run database migrations
- [ ] Create superuser account
- [ ] Configure environment variables
- [ ] Setup Stripe webhook endpoint
- [ ] Configure email service (Zeptomail)
- [ ] Upload gallery images
- [ ] Configure pricing settings
- [ ] Test booking flow end-to-end
- [ ] Setup SSL certificate
- [ ] Configure domain DNS
- [ ] Deploy to Railway/VPS
- [ ] Test all features in production
- [ ] Monitor logs and errors
- [ ] Setup automated backups

---

## 🙏 Acknowledgments

Built with these amazing technologies:
- [Next.js](https://nextjs.org/) - React framework
- [Django](https://www.djangoproject.com/) - Python web framework
- [Stripe](https://stripe.com/) - Payment processing
- [Railway](https://railway.app/) - Deployment platform
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS
- [Radix UI](https://www.radix-ui.com/) - Accessible components
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Redis](https://redis.io/) - Caching
- [Celery](https://docs.celeryq.dev/) - Task queue

---

## 📊 Project Stats

- **Version:** 1.2.0
- **Status:** Production Ready
- **Lines of Code:** ~55,000+
- **Components:** 45+ React components
- **API Endpoints:** 50+ REST endpoints
- **Database Models:** 12+ Django models
- **Permission Groups:** 10 groups, 50+ permissions
- **Languages:** TypeScript, Python
- **Test Coverage:** TBD

---

<div align="center">

**Built with ❤️ for All'Arco Apartment, Venice, Italy**

🏛️ Experience the beauty of Venice at All'Arco Apartment 🏛️

[Website](https://www.allarcoapartment.com) • [Book Now](https://www.allarcoapartment.com/book) • [Contact](mailto:support@allarcoapartment.com)

</div>
