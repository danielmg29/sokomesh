"""SM-F-17 delivery tracking: a shipment's identity, kept apart from its ordered history of events.

A shipment starts when the seller hands the order over. Events come from the seller by hand for now
(carrier webhooks can add `provider_event_id` later); each records when it happened and when SokoMesh
received it, so a page can say how fresh the information is instead of inventing live tracking.
"""

import uuid

from django.db import models


class Shipment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Being prepared"
        HANDED_OVER = "handed_over", "Handed to carrier"
        IN_TRANSIT = "in_transit", "In transit"
        DELIVERED = "delivered", "Delivered"
        EXCEPTION = "exception", "Delivery problem"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey("orders.Order", on_delete=models.CASCADE, related_name="shipments", verbose_name="Order")
    carrier_name = models.CharField("Carrier", max_length=80, blank=True)
    carrier_reference = models.CharField("Tracking reference", max_length=80, blank=True)
    status = models.CharField("Status", max_length=12, choices=Status.choices, default=Status.PENDING)
    estimated_start_at = models.DateTimeField("Expected from", null=True, blank=True)
    estimated_end_at = models.DateTimeField("Expected by", null=True, blank=True)
    last_event_at = models.DateTimeField("Last update", null=True, blank=True)
    proof_of_delivery = models.ForeignKey(
        "media.FileAsset",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        verbose_name="Proof of delivery",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.order} · {self.carrier_reference or self.carrier_name or 'shipment'}"


class ShipmentEvent(models.Model):
    class Type(models.TextChoices):
        HANDED_OVER = "handed_over", "Handed to carrier"
        IN_TRANSIT = "in_transit", "In transit"
        OUT_FOR_DELIVERY = "out_for_delivery", "Out for delivery"
        DELAYED = "delayed", "Delayed"
        EXCEPTION = "exception", "Delivery problem"
        DELIVERED = "delivered", "Delivered"
        NOTE = "note", "Note"

    class Source(models.TextChoices):
        SELLER = "seller", "Seller"
        CARRIER = "carrier", "Carrier"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField("Event", max_length=20, choices=Type.choices)
    description = models.TextField("What happened", blank=True, max_length=500)
    location_text = models.CharField("Where", max_length=120, blank=True)
    occurred_at = models.DateTimeField("When")
    received_at = models.DateTimeField("Received", auto_now_add=True)
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.SELLER)
    provider_event_id = models.CharField(max_length=80, blank=True)

    class Meta:
        ordering = ("occurred_at", "received_at")
        constraints = (
            models.UniqueConstraint(
                fields=["shipment", "provider_event_id"],
                condition=~models.Q(provider_event_id=""),
                name="provider_event_once",
            ),
        )

    def __str__(self) -> str:
        return f"{self.shipment}: {self.event_type}"
