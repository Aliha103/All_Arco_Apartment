from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import AlloggiatiAccountViewSet

router = DefaultRouter()
router.register(r'account', AlloggiatiAccountViewSet, basename='alloggiati-account')

urlpatterns = [
    path('', include(router.urls)),
]
