"""
URL configuration for gallery app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import HeroImageViewSet

router = DefaultRouter()
router.register('images', HeroImageViewSet, basename='hero-images')

urlpatterns = [
    path('', include(router.urls)),
]
