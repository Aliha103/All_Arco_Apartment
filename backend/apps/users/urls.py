from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'guests', views.GuestViewSet, basename='guest')
router.register(r'team', views.TeamViewSet, basename='team')

urlpatterns = [
    # Authentication
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('me/', views.me_view, name='me'),
    
    # Router URLs
    path('', include(router.urls)),
]
