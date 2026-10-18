"""SM-F-21 Notifications: per-user preferences and delivery records (spec pp. 11 and 12).

`Notification.dedupe_key` is unique per recipient, channel and source event, so an event retried
any number of times notifies once. Text is plain: explicit quantities, money or action state.
"""

import uuid

from django.conf import settings
from django.db import models

EVENT_CHOICES = [
    ("order", "Orders"),
    ("approval", "Approvals"),
    ("quote", "Quotes"),
    ("payment", "Payments"),
    ("delivery", "Deliveries"),
    ("account", "Account and team"),
]
CHANNEL_CHOICES = [("in_app", "In the app"), ("email", "Email")]


class NotificationPreference(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_preferences"
    )
    event_key = models.CharField("Event", max_length=20, choices=EVENT_CHOICES)
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES)
    enabled = models.BooleanField(default=True)
    locale = models.CharField("Language", max_length=10, default="en-KE")

    class Meta:
        constraints = (
            models.UniqueConstraint(fields=["user", "event_key", "channel"], name="one_preference_per_pair"),
        )
        ordering = (
            "event_key",
            "channel",
        )

    def __str__(self) -> str:
        return f"{self.event_key} by {self.channel}"


class Notification(models.Model):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        READ = "read", "Read"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    event_id = models.CharField(max_length=120)
    event_key = models.CharField("Event", max_length=20, choices=EVENT_CHOICES)
    dedupe_key = models.CharField(max_length=200, unique=True)
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES)
    title = models.CharField(max_length=160)
    body_text = models.TextField("Message")
    deep_link = models.CharField("Link", max_length=300, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.QUEUED)
    sent_at = models.DateTimeField("Sent", null=True, blank=True)
    read_at = models.DateTimeField("Read", null=True, blank=True)
    created_at = models.DateTimeField("Received", auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = (models.Index(fields=["recipient", "channel", "status"]),)

    def __str__(self) -> str:
        return self.title
