"""SM-F-11 quote requests: a buyer asks one seller for prices on selected lines, to a destination, by a date.

Request and response share one versioned record and its lines. The seller answers with an offer per line
and plain notes; the buyer accepts or declines. An accepted quote is frozen: its offers become the
immutable inputs of an order (apps.orders.checkout.place_from_quote) and it can no longer change.
"""

import uuid

from django.conf import settings
from django.db import models


class Quote(models.Model):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        RESPONDED = "responded", "Seller responded"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        EXPIRED = "expired", "Expired"
        CANCELLED = "cancelled", "Cancelled"

    OPEN = (Status.REQUESTED, Status.RESPONDED)

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField("Quote", max_length=20, unique=True, editable=False)
    buyer_organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.PROTECT,
        related_name="quotes_requested",
        verbose_name="Buyer",
        blank=True,
    )
    seller_organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.PROTECT, related_name="quotes_received", verbose_name="Seller"
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+", verbose_name="Requested by", blank=True
    )
    delivery_address = models.ForeignKey(
        "organizations.Address", on_delete=models.PROTECT, related_name="+", verbose_name="Deliver to"
    )
    buyer_notes = models.TextField("Notes for the seller", blank=True, max_length=1000)
    seller_notes = models.TextField("Seller's notes", blank=True, max_length=1000)
    status = models.CharField("Status", max_length=12, choices=Status.choices, default=Status.REQUESTED)
    expires_at = models.DateTimeField(
        "Valid until", help_text="The seller must respond, and you accept, before this time."
    )
    responded_at = models.DateTimeField("Responded", null=True, blank=True)
    accepted_at = models.DateTimeField("Accepted", null=True, blank=True)
    version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField("Requested", auto_now_add=True)
    updated_at = models.DateTimeField("Updated", auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return self.reference


class QuoteLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name="lines")
    variant = models.ForeignKey("catalog.Variant", on_delete=models.PROTECT, related_name="+")
    product_name = models.CharField(max_length=160)
    sku = models.CharField(max_length=40)
    pack_label = models.CharField(max_length=120, blank=True)
    quantity = models.PositiveIntegerField("Quantity")
    unit = models.CharField("Unit", max_length=20)
    list_price = models.DecimalField("Price when asked", max_digits=12, decimal_places=2)
    offered_price = models.DecimalField("Offer", max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default="KES")

    class Meta:
        ordering = ("product_name",)

    def __str__(self) -> str:
        return f"{self.quantity} × {self.product_name}"
