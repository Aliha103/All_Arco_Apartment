"""
URL configuration for cleaning app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CleaningScheduleViewSet, CleaningTaskViewSet

router = DefaultRouter()
router.register(r'schedules', CleaningScheduleViewSet, basename='cleaning-schedule')
router.register(r'tasks', CleaningTaskViewSet, basename='cleaning-task')

urlpatterns = [
    path('', include(router.urls)),
]
