# Changelog

All notable changes to All'Arco Apartment will be documented in this file.

## [1.0.0] - 2025-11-27

### Added
- **RBAC System**: Enterprise-grade role-based access control
  - 33 permissions across 8 groups (bookings, payments, guests, pricing, team, reports, roles, invoices)
  - 4 default roles: Super Admin, Front Desk, Accounting, Housekeeping
  - Permission-based UI rendering
  - Audit logging for security tracking

- **PMS Dashboard**: Complete Property Management System
  - Dashboard with key metrics and quick actions
  - Bookings management with filtering, search, and manual booking creation
  - Payments management with refund processing (full/partial)
  - Guest profiles with booking history and internal notes
  - Invoice management with PDF generation and email sending
  - Pricing settings with seasonal rules
  - Calendar view with availability blocking
  - Team management with role assignment
  - Reports and analytics

- **Detail Pages**: Rich detail views for all entities
  - `/pms/bookings/[id]` - Full booking details with actions
  - `/pms/payments/[id]` - Payment details with refund modal
  - `/pms/guests/[id]` - Guest profile with statistics
  - `/pms/invoices/[id]` - Invoice details with PDF/email actions

- **Modal Components**: Reusable modal dialogs
  - BookingFormModal for manual bookings
  - PricingRuleModal for seasonal pricing
  - Various confirmation and action modals

- **Authentication**: Secure session-based auth
  - Django session authentication with CSRF protection
  - Role-aware login redirects
  - Permission-based route protection

### Changed
- Updated apartment specs: 85m², 2 bedrooms, 5 guests
- Added host profile: Ali Hassan Cheema
- Improved homepage design and content

### Technical
- Next.js 15.1.0 with App Router
- Django 5.x backend with PostgreSQL
- React Query for data fetching
- Tailwind CSS v4 for styling
- Stripe integration for payments
- Zeptomail for transactional emails

---

## [0.1.0] - Initial Release

### Added
- Basic booking system
- Guest-facing website
- Payment processing with Stripe
- Email notifications
