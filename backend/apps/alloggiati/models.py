import uuid
from datetime import datetime, timedelta
from typing import Optional

from django.db import models
from django.utils import timezone


class AlloggiatiAccount(models.Model):
    """
    Stores Alloggiati credentials and connection state.

    WSKEY (Web Service Key) is the primary authentication method for Alloggiati Web Services.
    It must be generated from the Alloggiati Web portal under Account → "Chiave Web Service".

    A new WSKEY can only be generated once per day.
    When password changes, a new WSKEY must be generated.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=100, blank=True, null=True, help_text="Alloggiati Web username")
    password = models.CharField(max_length=255, blank=True, null=True, help_text="Encrypted password")
    wskey = models.CharField(max_length=500, blank=True, null=True, help_text="Web Service Key from Alloggiati portal")

    # Connection status
    is_connected = models.BooleanField(default=False, help_text="Whether credentials are working")
    last_test_at = models.DateTimeField(blank=True, null=True, help_text="Last successful connection test")
    last_error = models.TextField(blank=True, null=True, help_text="Last error message")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'alloggiati_account'
        ordering = ['-updated_at']

    def __str__(self):
        return f"AlloggiatiAccount ({self.username or 'Not configured'})"

    def has_credentials(self) -> bool:
        """Check if account has either WSKEY or username/password."""
        return bool(self.wskey or (self.username and self.password))

    def mark_connected(self):
        """Mark the account as successfully connected."""
        self.is_connected = True
        self.last_test_at = timezone.now()
        self.last_error = None
        self.save(update_fields=['is_connected', 'last_test_at', 'last_error', 'updated_at'])

    def set_error(self, message: str):
        """Set error message and mark as disconnected."""
        self.is_connected = False
        self.last_error = message
        self.save(update_fields=['is_connected', 'last_error', 'updated_at'])
