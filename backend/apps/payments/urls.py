from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.PaymentViewSet, basename='payment')

urlpatterns = [
    path('create-checkout-session/', views.create_checkout_session, name='create-checkout-session'),
    path('<uuid:pk>/refund/', views.refund_payment, name='refund-payment'),
    path('webhook/', views.stripe_webhook, name='stripe-webhook'),
    path('', include(router.urls)),
]
