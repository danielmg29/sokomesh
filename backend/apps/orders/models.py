"""Orders as history: immutable snapshots of what a buyer ordered from one seller (spec SM-F-15 fields).

Only what reorder (SM-F-20) needs exists so far: the order and its lines, with commercial terms copied at
the time so history never changes when products or prices do. Checkout from the cart, transitions and
their guards (OrderTransition) arrive with the order lifecycle (SM-F-15); until then orders are seeded.
"""

import uuid

from django.conf import settings
from django.db import models


class Order(models.Model):
    class Status(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        CONFIRMED = "confirmed", "Confirmed"
        PICKING = "picking", "Picking"
        PARTIALLY_FULFILLED = "partially_fulfilled", "Partly fulfilled"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"
        DISPUTED = "disputed", "Disputed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField("Order", max_length=20, unique=True)
    buyer_organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.PROTECT, related_name="orders", verbose_name="Buyer"
    )
    seller_organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.PROTECT, related_name="sales", verbose_name="Seller"
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+", verbose_name="Placed by"
    )
    delivery_address = models.ForeignKey(
        "organizations.Address", null=True, on_delete=models.SET_NULL, related_name="+", verbose_name="Deliver to"
    )
    currency = models.CharField("Currency", max_length=3, default="KES")
    subtotal = models.DecimalField("Subtotal", max_digits=14, decimal_places=2)
    total = models.DecimalField("Total", max_digits=14, decimal_places=2)
    status = models.CharField("Status", max_length=30, choices=Status.choices, default=Status.SUBMITTED)
    special_instructions = models.TextField("Delivery notes", blank=True)
    submitted_at = models.DateTimeField("Placed")
    version = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ("-submitted_at",)

    def __str__(self) -> str:
        return self.order_number


class OrderLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="lines")
    # The current catalogue reference; the snapshot fields below are what was ordered.
    variant = models.ForeignKey("catalog.Variant", null=True, on_delete=models.SET_NULL, related_name="+")
    product_name_snapshot = models.CharField("Product", max_length=160)
    sku_snapshot = models.CharField("SKU", max_length=40)
    pack_label_snapshot = models.CharField("Pack", max_length=120, blank=True)
    quantity_ordered = models.PositiveIntegerField("Quantity")
    unit = models.CharField("Unit", max_length=20)
    unit_price = models.DecimalField("Price per pack", max_digits=12, decimal_places=2)
    line_total = models.DecimalField("Line total", max_digits=14, decimal_places=2)

    class Meta:
        ordering = ("product_name_snapshot",)

    def __str__(self) -> str:
        return f"{self.quantity_ordered} × {self.product_name_snapshot}"
