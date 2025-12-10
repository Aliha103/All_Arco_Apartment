from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'payments', views.PaymentViewSet, basename='payment')
router.register(r'requests', views.PaymentRequestViewSet, basename='payment-request')

urlpatterns = [
    path('create-checkout-session/', views.create_checkout_session, name='create-checkout-session'),
    path('create-city-tax-session/', views.create_city_tax_session, name='create-city-tax-session'),
    path('confirm-city-tax-session/', views.confirm_city_tax_session, name='confirm-city-tax-session'),
    path('confirm-session/', views.confirm_checkout_session, name='confirm-session'),
    path('payments/<uuid:pk>/refund/', views.refund_payment, name='refund-payment'),
    path('webhook/', views.stripe_webhook, name='stripe-webhook'),
    path('', include(router.urls)),
]
