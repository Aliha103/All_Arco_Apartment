from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.BookingViewSet, basename='booking')
router.register(r'blocked-dates', views.BlockedDateViewSet, basename='blocked-date')

urlpatterns = [
    path('availability/', views.check_availability, name='check-availability'),
    path('calendar/month/', views.calendar_month, name='calendar-month'),
    path('statistics/', views.booking_statistics, name='booking-statistics'),
    # Public booking lookup endpoints (no auth required)
    path('lookup/', views.public_booking_lookup, name='public-booking-lookup'),
    path('lookup/update/', views.public_booking_update, name='public-booking-update'),
    path('lookup/checkin/', views.public_booking_checkin, name='public-booking-checkin'),
    path('', include(router.urls)),
]
