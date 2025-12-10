"""
Cleaning Management Models
Handles cleaning schedules, tasks, and assignments for the property.
"""

import uuid
from django.db import models
from django.utils import timezone
from apps.bookings.models import Booking
from apps.users.models import User


class CleaningSchedule(models.Model):
    """
    Represents a cleaning schedule tied to a booking checkout or standalone cleaning.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(
        Booking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cleaning_schedules',
        help_text='Associated booking (if triggered by checkout)'
    )

    # Scheduling
    scheduled_date = models.DateField(help_text='Date when cleaning is scheduled')
    scheduled_time = models.TimeField(help_text='Time when cleaning should start')
    estimated_duration = models.IntegerField(
        default=120,
        help_text='Estimated duration in minutes'
    )

    # Assignment
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_cleanings',
        help_text='Cleaner assigned to this task'
    )
    assigned_at = models.DateTimeField(null=True, blank=True)

    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='normal'
    )

    # Completion tracking
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='completed_cleanings',
        help_text='User who completed this cleaning'
    )
    actual_duration = models.IntegerField(
        null=True,
        blank=True,
        help_text='Actual duration in minutes'
    )

    # Quality check
    quality_rating = models.IntegerField(
        null=True,
        blank=True,
        help_text='Quality rating from 1-5'
    )
    quality_notes = models.TextField(blank=True)
    inspected_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inspected_cleanings',
        help_text='User who inspected the cleaning'
    )
    inspected_at = models.DateTimeField(null=True, blank=True)

    # Notes
    notes = models.TextField(blank=True, help_text='Internal notes about this cleaning')
    special_instructions = models.TextField(
        blank=True,
        help_text='Special instructions for the cleaner'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-scheduled_date', '-scheduled_time']
        indexes = [
            models.Index(fields=['scheduled_date', 'status']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['status']),
        ]
        permissions = [
            ('view_cleaning', 'Can view cleaning schedules'),
            ('add_cleaning', 'Can add cleaning schedules'),
            ('change_cleaning', 'Can change cleaning schedules'),
            ('delete_cleaning', 'Can delete cleaning schedules'),
            ('assign_cleaning', 'Can assign cleanings to staff'),
            ('inspect_cleaning', 'Can inspect and rate cleanings'),
        ]

    def __str__(self):
        booking_ref = f" (Booking: {self.booking.booking_id})" if self.booking else ""
        return f"Cleaning on {self.scheduled_date} at {self.scheduled_time}{booking_ref}"

    def mark_in_progress(self):
        """Mark cleaning as in progress"""
        self.status = 'in_progress'
        self.started_at = timezone.now()
        self.save(update_fields=['status', 'started_at', 'updated_at'])

    def mark_completed(self):
        """Mark cleaning as completed"""
        self.status = 'completed'
        self.completed_at = timezone.now()

        if self.started_at:
            duration = (self.completed_at - self.started_at).total_seconds() / 60
            self.actual_duration = int(duration)

        self.save(update_fields=['status', 'completed_at', 'actual_duration', 'updated_at'])

    def assign_to_cleaner(self, user):
        """Assign cleaning to a cleaner"""
        self.assigned_to = user
        self.assigned_at = timezone.now()
        self.status = 'assigned'
        self.save(update_fields=['assigned_to', 'assigned_at', 'status', 'updated_at'])

    def cancel(self, reason=''):
        """Cancel this cleaning schedule and all associated tasks"""
        # Only cancel if not already completed
        if self.status != 'completed':
            self.status = 'cancelled'
            self.notes = f"{self.notes}\n\nCancelled: {reason}".strip() if reason else self.notes
            self.save(update_fields=['status', 'notes', 'updated_at'])
            return True
        return False

    @property
    def is_active(self):
        """Check if this cleaning is active (not cancelled or completed)"""
        return self.status not in ['cancelled', 'completed']

    @property
    def has_valid_booking(self):
        """Check if associated booking exists and is not cancelled/no-show"""
        if not self.booking:
            return False
        return self.booking.status not in ['cancelled', 'no_show']


class CleaningTask(models.Model):
    """
    Individual cleaning tasks/checklist items within a cleaning schedule.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cleaning_schedule = models.ForeignKey(
        CleaningSchedule,
        on_delete=models.CASCADE,
        related_name='tasks',
        help_text='Parent cleaning schedule'
    )

    # Task details
    title = models.CharField(max_length=200, help_text='Task title')
    description = models.TextField(blank=True, help_text='Detailed description')
    category = models.CharField(
        max_length=50,
        default='general',
        help_text='Task category (e.g., bedroom, bathroom, kitchen)'
    )

    # Status
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='completed_tasks'
    )

    # Order
    order = models.IntegerField(default=0, help_text='Display order')

    # Notes
    notes = models.TextField(blank=True, help_text='Notes about task completion')

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['cleaning_schedule', 'is_completed']),
        ]

    def __str__(self):
        return f"{self.title} ({'✓' if self.is_completed else '○'})"

    def mark_completed(self, user=None):
        """Mark task as completed"""
        self.is_completed = True
        self.completed_at = timezone.now()
        if user:
            self.completed_by = user
        self.save(update_fields=['is_completed', 'completed_at', 'completed_by', 'updated_at'])
