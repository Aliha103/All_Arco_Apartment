from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'companies', views.CompanyViewSet, basename='company')
router.register(r'', views.InvoiceViewSet, basename='invoice')

urlpatterns = [
    path('statistics/', views.invoice_statistics, name='invoice-statistics'),
    path('', include(router.urls)),
]
