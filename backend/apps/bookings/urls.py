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
    path('', include(router.urls)),
]
