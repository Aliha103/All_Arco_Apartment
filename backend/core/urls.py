"""
URL configuration for All'Arco Apartment backend.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # API endpoints
    path('api/auth/', include('apps.users.urls')),
    path('api/bookings/', include('apps.bookings.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/invoices/', include('apps.invoices.urls')),
    path('api/pricing/', include('apps.pricing.urls')),
    path('api/gallery/', include('apps.gallery.urls')),
    path('api/alloggiati/', include('apps.alloggiati.urls')),
    path('api/cleaning/', include('apps.cleaning.urls')),
    path('api/', include('apps.users.urls')),  # For /api/guests/ and /api/team/
]

# Serve media files (both dev and production for uploaded images)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
