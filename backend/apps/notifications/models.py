"""
Notification models for real-time user notifications.
Tracks booking events and system notifications with read/unread status.
"""

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class Notification(models.Model):
    """
    Notification model for tracking booking events and system notifications.
    """
    TYPE_CHOICES = [
        ('booking_confirmed', 'Booking Confirmed'),
        ('booking_cancelled', 'Booking Cancelled'),
        ('booking_modified', 'Booking Modified'),
        ('booking_checked_in', 'Booking Checked In'),
        ('booking_checked_out', 'Booking Checked Out'),
        ('payment_received', 'Payment Received'),
        ('payment_due', 'Payment Due'),
        ('date_blocked', 'Date Blocked'),
        ('system', 'System Notification'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Recipient
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text='User who receives this notification'
    )

    # Notification details
    type = models.CharField(
        max_length=50,
        choices=TYPE_CHOICES,
        help_text='Type of notification'
    )
    title = models.CharField(
        max_length=255,
        help_text='Notification title'
    )
    message = models.TextField(
        help_text='Notification message content'
    )

    # Related objects
    booking_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='Related booking ID'
    )

    # Metadata
    data = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional data (guest name, dates, amounts, etc.)'
    )

    # Read status
    is_read = models.BooleanField(
        default=False,
        help_text='Whether notification has been read'
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When notification was read'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['booking_id']),
        ]
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'

    def __str__(self):
        return f"{self.type} - {self.title} ({self.user.email})"

    def mark_as_read(self):
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])

    def mark_as_unread(self):
        """Mark notification as unread."""
        if self.is_read:
            self.is_read = False
            self.read_at = None
            self.save(update_fields=['is_read', 'read_at'])
