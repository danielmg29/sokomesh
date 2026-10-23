"""SM-F-16 fulfilment: the warehouse's pick list for one confirmed order, line by line, to hand-over."""

import uuid

from django.conf import settings
from django.db import models


class FulfillmentTask(models.Model):
    class Status(models.TextChoices):
        QUEUED = "queued", "To pick"
        PICKING = "picking", "Picking"
        PACKED = "packed", "Packed"
        HANDED_OVER = "handed_over", "Handed over"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(
        "orders.Order", on_delete=models.CASCADE, related_name="fulfilment", verbose_name="Order"
    )
    seller = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="+")
    status = models.CharField("Status", max_length=12, choices=Status.choices, default=Status.QUEUED, db_index=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        verbose_name="Picker",
    )
    packages = models.PositiveSmallIntegerField("Packages", null=True, blank=True)
    weight_kg = models.DecimalField("Total weight (kg)", max_digits=8, decimal_places=2, null=True, blank=True)
    driver_name = models.CharField("Driver", max_length=80, blank=True)
    vehicle_registration = models.CharField("Vehicle registration", max_length=20, blank=True)
    handover_evidence = models.ForeignKey(
        "media.FileAsset",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        verbose_name="Handover photo",
    )
    started_at = models.DateTimeField(null=True, blank=True)
    packed_at = models.DateTimeField(null=True, blank=True)
    handed_over_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField("Queued", auto_now_add=True)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ("created_at",)

    def __str__(self) -> str:
        return f"Pick list for {self.order_id}"  # pyright: ignore[reportAttributeAccessIssue]


class FulfillmentLine(models.Model):
    class Outcome(models.TextChoices):
        PENDING = "pending", "To pick"
        FULL = "full", "Picked"
        SHORT = "short", "Short"
        REJECTED = "rejected", "Not sent"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(FulfillmentTask, on_delete=models.CASCADE, related_name="lines")
    order_line = models.OneToOneField("orders.OrderLine", on_delete=models.CASCADE, related_name="fulfilment_line")
    quantity_ordered = models.PositiveIntegerField("Ordered")
    quantity_picked = models.PositiveIntegerField("Picked", default=0)
    outcome = models.CharField("Outcome", max_length=10, choices=Outcome.choices, default=Outcome.PENDING)
    short_ship_reason = models.TextField("Why it is short", max_length=300, blank=True)

    class Meta:
        ordering = ("order_line__product_name_snapshot",)

    def __str__(self) -> str:
        return f"{self.quantity_picked} of {self.quantity_ordered}"

    @property
    def short(self) -> int:
        return self.quantity_ordered - self.quantity_picked
