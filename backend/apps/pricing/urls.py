from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'rules', views.PricingRuleViewSet, basename='pricing-rule')

urlpatterns = [
    path('settings/', views.get_settings, name='get-settings'),
    path('settings/update/', views.update_settings, name='update-settings'),
    path('calculate/', views.calculate_price, name='calculate-price'),
    path('', include(router.urls)),
]
