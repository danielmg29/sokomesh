"""AuditEvent (what happened, who did it, under which request and correlation) and OutboxEvent (what to tell
integrations, published by the relay after the transaction commits). Both are append-only."""

import uuid

from django.db import models


class Domain(models.TextChoices):
    ACCOUNT = "account", "Accounts"
    CATALOG = "catalog", "Catalogue"
    PRICE = "price", "Prices"
    INVENTORY = "inventory", "Inventory"
    ORDER = "order", "Orders"
    PAYMENT = "payment", "Payments"
    FULFILMENT = "fulfilment", "Fulfilment"
    RETURN = "return", "Returns"
    INTEGRATION = "integration", "Integrations"


class AppendOnly(models.Model):
    """Rows are written once; an edit would rewrite history."""

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):  # type: ignore[override]
        if not self._state.adding:
            raise ValueError(f"{type(self).__name__} rows are append-only.")
        super().save(*args, **kwargs)


class AuditEvent(AppendOnly):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    occurred_at = models.DateTimeField("When", db_index=True)
    event_type = models.CharField("Event", max_length=60, db_index=True)  # stable key: order.submitted
    domain = models.CharField("Area", max_length=20, choices=Domain.choices, db_index=True)
    resource_type = models.CharField("Record type", max_length=40)
    resource_id = models.CharField("Record", max_length=64)
    organization_id = models.UUIDField(null=True, blank=True, db_index=True)
    actor_id = models.UUIDField(null=True, blank=True)
    actor_label = models.CharField("By", max_length=150, blank=True)  # a person, an API client or SokoMesh
    request_id = models.CharField("Request", max_length=64, blank=True)
    correlation_id = models.CharField("Correlation", max_length=64, blank=True, db_index=True)
    summary = models.CharField("What happened", max_length=500)
    reason = models.TextField("Reason", max_length=1000, blank=True)
    data = models.JSONField("Details", default=dict, blank=True)  # identifiers and amounts, redacted

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        ordering = ("-occurred_at",)
        indexes = (models.Index(fields=["resource_type", "resource_id"]),)

    def __str__(self) -> str:
        return f"{self.event_type} {self.resource_type}:{self.resource_id}"


class OutboxEvent(AppendOnly):
    class Status(models.TextChoices):
        PENDING = "pending", "Waiting"
        PUBLISHED = "published", "Published"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    topic = models.CharField("Topic", max_length=60, db_index=True)  # order.submitted, payment.confirmed
    organization_id = models.UUIDField(null=True, blank=True, db_index=True)
    payload = models.JSONField(default=dict)  # the minimum: ids, numbers, states; readers fetch the rest
    correlation_id = models.CharField(max_length=64, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    available_at = models.DateTimeField(db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        ordering = ("available_at",)

    def __str__(self) -> str:
        return self.topic

    def save(self, *args, **kwargs):  # type: ignore[override]
        # The relay marks an event published; nothing else about it changes.
        if self._state.adding:
            return super().save(*args, **kwargs)
        return models.Model.save(self, update_fields=["status", "published_at"])
