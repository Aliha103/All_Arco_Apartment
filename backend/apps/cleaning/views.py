"""
Cleaning ViewSets with RBAC support.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Count, Avg, Q
from datetime import datetime, timedelta

from .models import CleaningSchedule, CleaningTask
from .serializers import CleaningScheduleSerializer, CleaningTaskSerializer
from apps.users.permissions import HasPermissionForAction


class CleaningScheduleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing cleaning schedules.
    Supports RBAC permissions.
    """
    queryset = CleaningSchedule.objects.all().select_related(
        'booking',
        'assigned_to',
        'inspected_by'
    ).prefetch_related('tasks')
    serializer_class = CleaningScheduleSerializer
    permission_classes = [IsAuthenticated, HasPermissionForAction]
    action_permissions = {
        'list': 'cleaning.view',
        'retrieve': 'cleaning.view',
        'create': 'cleaning.add',
        'update': 'cleaning.change',
        'partial_update': 'cleaning.change',
        'destroy': 'cleaning.delete',
        'assign': 'cleaning.assign',
        'start': 'cleaning.change',
        'complete': 'cleaning.change',
        'inspect': 'cleaning.inspect',
        'statistics': 'cleaning.view',
        'calendar': 'cleaning.view',
    }

    def get_queryset(self):
        """
        Filter queryset based on query parameters.
        """
        queryset = super().get_queryset()

        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filter by assigned cleaner
        assigned_to = self.request.query_params.get('assigned_to')
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)

        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(scheduled_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(scheduled_date__lte=date_to)

        # Filter by priority
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)

        return queryset

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """
        Assign cleaning to a cleaner.
        Requires cleaning.assign permission.
        """
        cleaning = self.get_object()
        assigned_to_id = request.data.get('assigned_to')

        if not assigned_to_id:
            return Response(
                {'error': 'assigned_to field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.users.models import User
        try:
            user = User.objects.get(id=assigned_to_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        cleaning.assign_to_cleaner(user)
        serializer = self.get_serializer(cleaning)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """
        Mark cleaning as started.
        """
        cleaning = self.get_object()

        if cleaning.status == 'completed':
            return Response(
                {'error': 'Cannot start a completed cleaning'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cleaning.mark_in_progress()
        serializer = self.get_serializer(cleaning)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Mark cleaning as completed.
        """
        cleaning = self.get_object()

        if cleaning.status == 'completed':
            return Response(
                {'error': 'Cleaning is already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cleaning.mark_completed()
        serializer = self.get_serializer(cleaning)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def inspect(self, request, pk=None):
        """
        Inspect and rate a completed cleaning.
        Requires cleaning.inspect permission.
        """
        cleaning = self.get_object()

        if cleaning.status != 'completed':
            return Response(
                {'error': 'Can only inspect completed cleanings'},
                status=status.HTTP_400_BAD_REQUEST
            )

        quality_rating = request.data.get('quality_rating')
        quality_notes = request.data.get('quality_notes', '')

        if not quality_rating:
            return Response(
                {'error': 'quality_rating is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            quality_rating = int(quality_rating)
            if quality_rating < 1 or quality_rating > 5:
                raise ValueError
        except (ValueError, TypeError):
            return Response(
                {'error': 'quality_rating must be an integer between 1 and 5'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cleaning.quality_rating = quality_rating
        cleaning.quality_notes = quality_notes
        cleaning.inspected_by = request.user
        cleaning.inspected_at = timezone.now()
        cleaning.save(update_fields=[
            'quality_rating',
            'quality_notes',
            'inspected_by',
            'inspected_at',
            'updated_at'
        ])

        serializer = self.get_serializer(cleaning)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get cleaning statistics.
        """
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        # Basic counts
        total_cleanings = CleaningSchedule.objects.count()
        pending_cleanings = CleaningSchedule.objects.filter(status='pending').count()
        in_progress_cleanings = CleaningSchedule.objects.filter(status='in_progress').count()
        completed_cleanings = CleaningSchedule.objects.filter(status='completed').count()

        # Today's cleanings
        today_cleanings = CleaningSchedule.objects.filter(scheduled_date=today).count()
        today_completed = CleaningSchedule.objects.filter(
            scheduled_date=today,
            status='completed'
        ).count()

        # This week's statistics
        week_cleanings = CleaningSchedule.objects.filter(
            scheduled_date__gte=week_ago
        ).count()
        week_completed = CleaningSchedule.objects.filter(
            scheduled_date__gte=week_ago,
            status='completed'
        ).count()

        # Average quality rating
        avg_quality = CleaningSchedule.objects.filter(
            quality_rating__isnull=False
        ).aggregate(avg_rating=Avg('quality_rating'))['avg_rating']

        # Average duration
        avg_duration = CleaningSchedule.objects.filter(
            actual_duration__isnull=False
        ).aggregate(avg_duration=Avg('actual_duration'))['avg_duration']

        # By status
        status_breakdown = CleaningSchedule.objects.values('status').annotate(
            count=Count('id')
        )

        # Upcoming cleanings
        upcoming = CleaningSchedule.objects.filter(
            scheduled_date__gte=today,
            status__in=['pending', 'assigned']
        ).count()

        return Response({
            'total_cleanings': total_cleanings,
            'pending': pending_cleanings,
            'in_progress': in_progress_cleanings,
            'completed': completed_cleanings,
            'today': {
                'total': today_cleanings,
                'completed': today_completed,
                'completion_rate': round((today_completed / today_cleanings * 100), 1) if today_cleanings > 0 else 0,
            },
            'this_week': {
                'total': week_cleanings,
                'completed': week_completed,
                'completion_rate': round((week_completed / week_cleanings * 100), 1) if week_cleanings > 0 else 0,
            },
            'average_quality_rating': round(avg_quality, 1) if avg_quality else None,
            'average_duration_minutes': round(avg_duration) if avg_duration else None,
            'status_breakdown': list(status_breakdown),
            'upcoming_cleanings': upcoming,
        })

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """
        Get cleaning schedule in calendar format.
        Returns cleanings grouped by date.
        """
        # Get date range from query params
        year = request.query_params.get('year')
        month = request.query_params.get('month')

        if not year or not month:
            return Response(
                {'error': 'year and month parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            year = int(year)
            month = int(month)
        except (ValueError, TypeError):
            return Response(
                {'error': 'year and month must be integers'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get first and last day of month
        from calendar import monthrange
        _, last_day = monthrange(year, month)

        start_date = datetime(year, month, 1).date()
        end_date = datetime(year, month, last_day).date()

        # Get cleanings for the month
        cleanings = CleaningSchedule.objects.filter(
            scheduled_date__gte=start_date,
            scheduled_date__lte=end_date
        ).select_related('booking', 'assigned_to').prefetch_related('tasks')

        # Group by date
        calendar_data = {}
        for cleaning in cleanings:
            date_key = str(cleaning.scheduled_date)
            if date_key not in calendar_data:
                calendar_data[date_key] = []

            serializer = self.get_serializer(cleaning)
            calendar_data[date_key].append(serializer.data)

        return Response({
            'year': year,
            'month': month,
            'cleanings': calendar_data,
        })


class CleaningTaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing cleaning tasks/checklist items.
    """
    queryset = CleaningTask.objects.all().select_related(
        'cleaning_schedule',
        'completed_by'
    )
    serializer_class = CleaningTaskSerializer
    permission_classes = [IsAuthenticated, HasPermissionForAction]
    action_permissions = {
        'list': 'cleaning.view',
        'retrieve': 'cleaning.view',
        'create': 'cleaning.add',
        'update': 'cleaning.change',
        'partial_update': 'cleaning.change',
        'destroy': 'cleaning.delete',
        'toggle_complete': 'cleaning.change',
    }

    def get_queryset(self):
        """Filter by cleaning schedule if provided."""
        queryset = super().get_queryset()
        cleaning_schedule = self.request.query_params.get('cleaning_schedule')
        if cleaning_schedule:
            queryset = queryset.filter(cleaning_schedule_id=cleaning_schedule)
        return queryset

    @action(detail=True, methods=['post'])
    def toggle_complete(self, request, pk=None):
        """Toggle task completion status."""
        task = self.get_object()

        if task.is_completed:
            task.is_completed = False
            task.completed_at = None
            task.completed_by = None
        else:
            task.mark_completed(user=request.user)

        serializer = self.get_serializer(task)
        return Response(serializer.data)
