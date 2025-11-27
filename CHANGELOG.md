# Changelog

All notable changes to All'Arco Apartment will be documented in this file.

## [1.0.8] - 2025-11-27

### Enhanced
- **Premium Booking Widget**: Complete redesign with always-visible 2-month calendar
  - Side-by-side calendar layout (responsive: stacked on mobile)
  - Smooth date range selection with react-day-picker
  - Premium styling with gold accent highlights

- **Guest Types**: Adults, Children, Infants
  - Adults (13+) and Children (2-12) count toward max 5 guests
  - Infants (under 2) stay free and don't count
  - Visual icons for each guest type

- **Dynamic Cleaning Fees**:
  - €25 for stays ≤2 nights
  - €35 for stays >2 nights

- **Pet Option**: Yes/No toggle
  - €15 pet cleaning fee for ≤2 nights
  - €25 pet cleaning fee for >2 nights

- **City Tax Display**:
  - €4 per adult per night (max 5 nights)
  - Shown separately as "Pay at property"
  - Amber info box for visibility

### Technical
- Always-visible calendar (no dropdown toggle needed)
- Animated price breakdown with Framer Motion
- Premium guest counter components with icons
- Full booking URL with all parameters

---

## [1.0.7] - 2025-11-27

### Enhanced
- **Premium Hero Carousel**: Cinematic Ken Burns effect with smooth crossfade transitions
  - 6-second per slide with animated progress indicators
  - Pause on hover, navigation arrows on hover
  - requestAnimationFrame-based timing for buttery smooth animations
  - Luxury easing curves for hospitality-grade feel

- **About Section Redesign**: Premium hospitality-style layout
  - Superhost badge and verified host card
  - Premium image grid with hover effects
  - Animated statistics counters
  - Trust indicators and verification badges
  - Italic serif typography accents

- **Reviews Section Upgrade**: Industry-standard rating display
  - Animated circular progress score (9.8/10)
  - 6-category rating breakdown with animated progress bars
  - Premium review cards with avatars and verification badges
  - Stay type labels, helpful counts
  - Trust badges (Guest Favorite 2024, Superhost)

### Technical
- Ken Burns animation with 4 directional variants
- Framer Motion springs and luxury easing curves
- RatingScoreDisplay component with SVG progress
- Category-based rating breakdown system

---

## [1.0.6] - 2025-11-27

### Added
- **Booking Widget**: Hospitality-grade booking component on homepage
  - Interactive date range picker using react-day-picker
  - Guest selector with Adults (13+) and Children (2-12)
  - Real-time price breakdown (nightly rate, cleaning fee, service fee)
  - Minimum 2-night stay validation
  - Direct booking link with query parameters
  - Trust indicators (free cancellation, charge disclaimer)
- New "Book Your Stay" section after Amenities on homepage
- Smooth animations with Framer Motion

### Technical
- BookingWidget component with TypeScript
- Calendar component using react-day-picker library
- Responsive design (2-month calendar on desktop, 1 on mobile)

---

## [1.0.5] - 2025-11-27

### Added
- **Gallery Management System**: Admin can now manage hero and gallery images
  - New Django gallery app with HeroImage model
  - PMS gallery page at `/pms/gallery` for image management
  - Upload images via file upload or external URL
  - Image types: Hero Carousel, Gallery, or Both
  - Reorder images with display order controls
  - Toggle active/inactive status
  - RBAC permissions (gallery.view, gallery.manage)
- **Dynamic Homepage Images**: Homepage now fetches images from API
  - Hero carousel uses admin-uploaded images
  - Gallery section uses admin-uploaded images
  - Fallback to default Unsplash images when empty

### Technical
- Public API endpoint for guest-facing pages
- React Query caching for image data
- FormData support for file uploads

---

## [1.0.4] - 2025-11-27

### Fixed
- **Celery Background Tasks**: Added celery binary to Docker image
  - celery-worker now running for async tasks
  - celery-beat now running for scheduled jobs
- **Favicon**: Replaced corrupted ICO with SVG icon

### Changed
- Removed CTA section from homepage (cleaner design)

### Technical
- Node.js 25.x (Current)
- React 19.2
- Next.js 16.0.5
- Django 5.1.4

---

## [1.0.3] - 2025-11-27

### Upgraded
- **Node.js**: 18 → 25.x (Current)
- **React**: 18.3.1 → 19.1.0+ (supports 19.2)
- **Next.js**: 15.1.0 → 16.0.5
- **Django**: 5.0.1 → 5.1.4
- **All dependencies** updated to latest stable versions

### Added
- **Zeptomail Multi-Sender**: 3 dedicated email addresses with separate tokens
  - `reservations@allarcoapartment.com` - Booking confirmations, payment receipts
  - `support@allarcoapartment.com` - General support, welcome emails, team invites
  - `check-in@allarcoapartment.com` - Check-in instructions, arrival info
- Auto-detection of sender type based on from_email
- EU region Zeptomail endpoint (api.zeptomail.eu)

### Fixed
- Django version compatibility with django-celery-beat
- Package lock file sync issues
- Dockerfile Node.js version for Next.js 16 compatibility

---

## [1.0.2] - 2025-11-27

### Fixed
- TypeScript type errors for RBAC User model
- API method calls in team page
- Form state type mismatches
- Django admin RBAC field configuration

---

## [1.0.1] - 2025-11-27

### Added
- Super admin creation management command
- Version control files (VERSION, CHANGELOG.md)

### Changed
- Apartment specs: 85m², 2 bedrooms, 5 guests
- Host profile: Ali Hassan Cheema

---

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
