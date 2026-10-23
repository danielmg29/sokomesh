"""SM-F-14 payments: an intent per attempt to pay an order, and every provider result received for it.

A result is applied at most once: events are kept whatever happens (the trace), and the database allows one
*applied* event per provider event id, so a repeated or concurrent callback can never move an order twice.
"""

import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class PaymentIntent(models.Model):
    class Status(models.TextChoices):
        CREATED = "created", "Ready to pay"
        PENDING = "pending", "Awaiting approval on phone"
        CONFIRMED = "confirmed", "Paid"
        FAILED = "failed", "Not paid"
        CANCELLED = "cancelled", "Cancelled on phone"
        REFUNDED = "refunded", "Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey("orders.Order", on_delete=models.CASCADE, related_name="payments", verbose_name="Order")
    buyer_organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="+")
    seller_organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="+")
    provider = models.CharField("Provider", max_length=20)
    provider_intent_id = models.CharField("Provider reference", max_length=64, blank=True, default="")
    amount = models.DecimalField("Amount", max_digits=14, decimal_places=2)
    currency = models.CharField("Currency", max_length=3, default="KES")
    status = models.CharField("Status", max_length=12, choices=Status.choices, default=Status.CREATED, db_index=True)
    idempotency_key = models.CharField(max_length=120, unique=True)
    attempt = models.PositiveSmallIntegerField(default=1)
    phone_masked = models.CharField("Phone", max_length=20, blank=True)  # 0712 *** 678: the number itself is not kept
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    failure_code = models.CharField(max_length=40, blank=True)
    failure_reason = models.CharField(max_length=200, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    refunded_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ("-created_at",)
        constraints = (
            models.UniqueConstraint(
                fields=["provider", "provider_intent_id"],
                condition=~Q(provider_intent_id=""),
                name="one_intent_per_provider_reference",
            ),
        )

    def __str__(self) -> str:
        return self.provider_intent_id or str(self.pk)


class PaymentEvent(models.Model):
    class Result(models.TextChoices):
        APPLIED = "applied", "Applied"
        DUPLICATE = "duplicate", "Duplicate (already applied)"
        IGNORED = "ignored", "Ignored (payment already final)"
        INVALID = "invalid", "Invalid"
        CONFLICT = "conflict", "Conflict"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment_intent = models.ForeignKey(
        PaymentIntent, null=True, blank=True, on_delete=models.CASCADE, related_name="events"
    )
    provider = models.CharField(max_length=20)
    provider_event_id = models.CharField("Provider event", max_length=80)
    event_type = models.CharField("Event", max_length=40)
    signature_valid = models.BooleanField(default=False)
    payload_hash = models.CharField(max_length=64)  # sha256 of the raw body; the body itself is not kept
    received_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    processing_result = models.CharField(max_length=12, choices=Result.choices, blank=True)
    error_code = models.CharField(max_length=40, blank=True)

    class Meta:
        ordering = ("received_at",)
        constraints = (
            models.UniqueConstraint(
                fields=["provider", "provider_event_id"],
                condition=Q(processing_result="applied"),
                name="one_applied_event_per_provider_event",
            ),
        )

    def __str__(self) -> str:
        return f"{self.provider}:{self.provider_event_id}"
