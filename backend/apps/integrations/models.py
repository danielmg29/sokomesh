"""SM-F-23 integration API: clients and their tokens (stored only as a hash), webhook endpoints (their signing
secret derived from a server key, never stored), and each delivery attempt's outcome."""

import uuid

from django.conf import settings
from django.db import models

SCOPES = (
    ("catalogue.read", "Read products and packs"),
    ("inventory.read", "Read stock"),
    ("inventory.write", "Record goods received"),
    ("orders.read", "Read orders"),
)
TOPICS = (
    ("order.submitted", "Order paid and submitted"),
    ("order.shipped", "Order shipped"),
    ("order.delivered", "Order delivered"),
    ("order.cancelled", "Order cancelled"),
    ("payment.confirmed", "Payment confirmed"),
    ("payment.refunded", "Payment refunded"),
    ("inventory.low", "Stock running low"),
    ("return.opened", "Case opened"),
    ("return.decided", "Case decided"),
)


class ApiClient(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        REVOKED = "revoked", "Revoked"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="api_clients")
    name = models.CharField("Name", max_length=80, help_text="What connects with it, such as Stock sync (ERP).")
    status = models.CharField("Status", max_length=10, choices=Status.choices, default=Status.ACTIVE)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class ApiToken(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        REVOKED = "revoked", "Revoked"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(ApiClient, on_delete=models.CASCADE, related_name="tokens")
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="+")
    name = models.CharField("Name", max_length=80)
    prefix = models.CharField(max_length=16, unique=True)  # the public part, to find the token
    token_hash = models.CharField(max_length=64)  # sha256 of the whole token; the token is shown once
    last4 = models.CharField(max_length=4)
    scopes = models.JSONField("Access", default=list)
    status = models.CharField("Status", max_length=10, choices=Status.choices, default=Status.ACTIVE)
    expires_at = models.DateTimeField("Expires", null=True, blank=True)
    last_used_at = models.DateTimeField("Last used", null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField("Created", auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.name} (…{self.last4})"


class WebhookEndpoint(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="webhook_endpoints"
    )
    url = models.URLField("Address", max_length=300, help_text="An https:// address on the public internet.")
    events = models.JSONField("Events", default=list)
    secret_salt = models.CharField(max_length=32)  # with the server key, derives the signing secret
    is_active = models.BooleanField("On", default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField("Created", auto_now_add=True)
    rotated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("created_at",)

    def __str__(self) -> str:
        return self.url


class WebhookDelivery(models.Model):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        DELIVERED = "delivered", "Delivered"
        RETRYING = "retrying", "Retrying"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    endpoint = models.ForeignKey(WebhookEndpoint, on_delete=models.CASCADE, related_name="deliveries")
    event = models.ForeignKey("events.OutboxEvent", on_delete=models.CASCADE, related_name="+")
    topic = models.CharField(max_length=60)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.QUEUED, db_index=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    next_attempt_at = models.DateTimeField(db_index=True)
    response_status = models.PositiveSmallIntegerField(null=True, blank=True)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    last_error = models.CharField(max_length=200, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = (models.UniqueConstraint(fields=["endpoint", "event"], name="one_delivery_per_endpoint_event"),)

    def __str__(self) -> str:
        return f"{self.topic} to {self.endpoint_id}"  # pyright: ignore[reportAttributeAccessIssue]
