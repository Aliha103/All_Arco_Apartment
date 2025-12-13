from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from . import views

router = DefaultRouter()
router.register(r'', views.BookingViewSet, basename='booking')
router.register(r'blocked-dates', views.BlockedDateViewSet, basename='blocked-date')

# Nested router for booking guests
bookings_router = routers.NestedSimpleRouter(router, r'', lookup='booking')
bookings_router.register(r'guests', views.BookingGuestViewSet, basename='booking-guests')

urlpatterns = [
    path('availability/', views.check_availability, name='check-availability'),
    path('blocked-dates-public/', views.get_blocked_dates, name='get-blocked-dates'),
    path('calendar/month/', views.calendar_month, name='calendar-month'),
    path('statistics/', views.booking_statistics, name='booking-statistics'),
    # Public booking lookup endpoints (no auth required)
    path('lookup/', views.public_booking_lookup, name='public-booking-lookup'),
    path('lookup/update/', views.public_booking_update, name='public-booking-update'),
    path('lookup/checkin/', views.public_booking_checkin, name='public-booking-checkin'),
    # Claim booking endpoint (auth required)
    path('claim/', views.claim_booking, name='claim-booking'),
    # iCal export/import and OTA management
    path('ical/export/', views.export_ical_calendar, name='ical-export'),
    path('ical/sources/', views.ical_sources_list, name='ical-sources'),
    path('ical/sources/<uuid:source_id>/sync/', views.sync_ical_source, name='sync-ical-source'),
    path('ical/sources/<uuid:source_id>/', views.delete_ical_source, name='delete-ical-source'),
    path('ical/sync-all/', views.sync_all_ical_sources, name='sync-all-ical-sources'),
    path('', include(router.urls)),
    path('', include(bookings_router.urls)),
]
