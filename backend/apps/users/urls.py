from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import referral_views

router = DefaultRouter()
router.register(r'guests', views.GuestViewSet, basename='guest')
router.register(r'team', views.TeamViewSet, basename='team')
router.register(r'permissions', views.PermissionViewSet, basename='permission')
router.register(r'roles', views.RoleViewSet, basename='role')
router.register(r'referrals', referral_views.ReferralStatsViewSet, basename='referral')
router.register(r'host-profile', views.HostProfileViewSet, basename='host-profile')
router.register(r'reviews', views.ReviewViewSet, basename='review')

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

    # Referral stats for team/admin
    path('referral-stats/', referral_views.referral_stats, name='referral_stats'),

    # Router URLs
    path('', include(router.urls)),
]
