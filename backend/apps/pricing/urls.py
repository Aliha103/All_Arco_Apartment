from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'rules', views.PricingRuleViewSet, basename='pricing-rule')
router.register(r'promotions', views.PromotionViewSet, basename='promotion')
router.register(r'vouchers', views.VoucherViewSet, basename='voucher')

urlpatterns = [
    path('settings/', views.get_settings, name='get-settings'),
    path('settings/update/', views.update_settings, name='update-settings'),
    path('settings/patch/', views.update_settings, name='patch-settings'),  # compatibility
    path('calculate/', views.calculate_price, name='calculate-price'),
    path('validate-promo/', views.validate_promo_code, name='validate-promo'),
    path('', include(router.urls)),
]
