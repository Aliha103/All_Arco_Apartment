from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'guests', views.GuestViewSet, basename='guest')
router.register(r'team', views.TeamViewSet, basename='team')
router.register(r'permissions', views.PermissionViewSet, basename='permission')
router.register(r'roles', views.RoleViewSet, basename='role')

urlpatterns = [
    # Authentication
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('me/', views.me_view, name='me'),
    path('password-reset/', views.password_reset_view, name='password_reset'),
    path('password-reset/confirm/', views.password_reset_confirm_view, name='password_reset_confirm'),

    # RBAC Setup
    path('seed-rbac/', views.seed_rbac_data, name='seed_rbac'),

    # Router URLs
    path('', include(router.urls)),
]
