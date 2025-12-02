import uuid
from datetime import datetime, timedelta
from typing import Optional

from django.db import models
from django.utils import timezone


class AlloggiatiAccount(models.Model):
    """
    Stores Alloggiati credentials and token state.

    The password itself is expected to be provided via environment variables
    for security; the DB fields are used mainly to track status and fallback
    username.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=50, blank=True, null=True)
    token = models.TextField(blank=True, null=True)
    token_expires_at = models.DateTimeField(blank=True, null=True)
    last_fetched_at = models.DateTimeField(blank=True, null=True)
    last_error = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'alloggiati_account'
        ordering = ['-updated_at']

    def __str__(self):
        return f"AlloggiatiAccount ({self.username or 'env credentials'})"

    def token_is_valid(self) -> bool:
        return bool(self.token and self.token_expires_at and self.token_expires_at > timezone.now())

    def update_token(self, token: str, validity_minutes: Optional[int] = None):
        self.token = token
        self.last_fetched_at = timezone.now()
        if validity_minutes:
            self.token_expires_at = self.last_fetched_at + timedelta(minutes=validity_minutes)
        self.last_error = None
        self.save(update_fields=['token', 'token_expires_at', 'last_fetched_at', 'last_error', 'updated_at'])

    def set_error(self, message: str):
        self.last_error = message
        self.save(update_fields=['last_error', 'updated_at'])
