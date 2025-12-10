"""
Cleaning serializers for API responses.
"""

from rest_framework import serializers
from .models import CleaningSchedule, CleaningTask
from apps.bookings.serializers import BookingSerializer
from apps.users.serializers import UserSerializer


class CleaningTaskSerializer(serializers.ModelSerializer):
    """Serializer for cleaning tasks/checklist items."""

    completed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CleaningTask
        fields = [
            'id',
            'cleaning_schedule',
            'title',
            'description',
            'category',
            'is_completed',
            'completed_at',
            'completed_by',
            'completed_by_name',
            'order',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'completed_by_name']

    def get_completed_by_name(self, obj):
        if obj.completed_by:
            return f"{obj.completed_by.first_name} {obj.completed_by.last_name}".strip()
        return None


class CleaningScheduleSerializer(serializers.ModelSerializer):
    """Serializer for cleaning schedules."""

    tasks = CleaningTaskSerializer(many=True, read_only=True)
    booking_details = BookingSerializer(source='booking', read_only=True)
    booking = serializers.SerializerMethodField()  # Override to include status
    assigned_to_name = serializers.SerializerMethodField()
    completed_by_name = serializers.SerializerMethodField()
    inspected_by_name = serializers.SerializerMethodField()
    task_completion_rate = serializers.SerializerMethodField()

    class Meta:
        model = CleaningSchedule
        fields = [
            'id',
            'booking',
            'booking_details',
            'scheduled_date',
            'scheduled_time',
            'estimated_duration',
            'assigned_to',
            'assigned_to_name',
            'assigned_at',
            'status',
            'priority',
            'started_at',
            'completed_at',
            'completed_by',
            'completed_by_name',
            'actual_duration',
            'quality_rating',
            'quality_notes',
            'inspected_by',
            'inspected_by_name',
            'inspected_at',
            'notes',
            'special_instructions',
            'tasks',
            'task_completion_rate',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'assigned_to_name',
            'completed_by_name',
            'inspected_by_name',
            'task_completion_rate',
        ]

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip()
        return None

    def get_completed_by_name(self, obj):
        if obj.completed_by:
            return f"{obj.completed_by.first_name} {obj.completed_by.last_name}".strip()
        return None

    def get_inspected_by_name(self, obj):
        if obj.inspected_by:
            return f"{obj.inspected_by.first_name} {obj.inspected_by.last_name}".strip()
        return None

    def get_booking(self, obj):
        """Return essential booking info including status for smart filtering."""
        if obj.booking:
            return {
                'id': str(obj.booking.id),
                'booking_id': obj.booking.booking_id,
                'guest_name': obj.booking.guest_name,
                'status': obj.booking.status,  # IMPORTANT: Include booking status
            }
        return None

    def get_task_completion_rate(self, obj):
        """Calculate percentage of completed tasks."""
        tasks = obj.tasks.all()
        if not tasks.exists():
            return None
        completed = tasks.filter(is_completed=True).count()
        total = tasks.count()
        return round((completed / total) * 100, 1) if total > 0 else 0
