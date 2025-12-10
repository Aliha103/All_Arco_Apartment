from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AlloggiatiAccountViewSet,
    submit_booking_to_police,
    generate_alloggiati_pdf,
)

router = DefaultRouter()
router.register(r'account', AlloggiatiAccountViewSet, basename='alloggiati-account')

urlpatterns = [
    path('', include(router.urls)),
    path('submit/<uuid:booking_id>/', submit_booking_to_police, name='submit-to-police'),
    path('pdf/<uuid:booking_id>/', generate_alloggiati_pdf, name='generate-pdf'),
]
