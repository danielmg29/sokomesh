"""SM-F-10 cart: a server-backed buyer cart, grouped by seller, revalidated wherever it is opened.

Each line keeps the price it was added at (`quoted_unit_price`) and when that price was checked. When a
seller's price changes the line says so and the cart's total uses the current price, but the quote only
moves when the buyer accepts the new prices: repricing is explicit, never silent. Authoritative prices
are resolved again at checkout, which arrives with the order lifecycle (SM-F-15).
"""

import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q
from django.utils import timezone

MAX_LINES = 100  # lines per cart: a bound on every cart read and revalidation


class Cart(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SUBMITTED = "submitted", "Submitted"
        ABANDONED = "abandoned", "Set aside"
        CONVERTED = "converted", "Ordered"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    buyer_organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="carts", verbose_name="Buyer"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="carts", verbose_name="Started by"
    )
    status = models.CharField("Status", max_length=20, choices=Status.choices, default=Status.ACTIVE)
    currency = models.CharField("Currency", max_length=3, default="KES")
    version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField("Updated", auto_now=True)

    class Meta:
        ordering = ("-updated_at",)
        constraints = (
            models.UniqueConstraint(
                fields=["buyer_organization", "created_by"], condition=Q(status="active"), name="one_active_cart"
            ),
        )

    def __str__(self) -> str:
        return f"Cart {str(self.pk)[:8]}"


class CartLine(models.Model):
    class Stock(models.TextChoices):
        AVAILABLE = "available", "Available"
        LIMITED = "limited", "Limited"
        UNAVAILABLE = "unavailable", "Unavailable"
        UNKNOWN = "unknown", "Not reported"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="lines", verbose_name="Cart")
    variant = models.ForeignKey(
        "catalog.Variant", on_delete=models.PROTECT, related_name="cart_lines", verbose_name="Product"
    )
    # Copied from the variant (the grouping key), so a cart groups by seller without reading every product.
    seller = models.ForeignKey(
        "organizations.Organization", on_delete=models.PROTECT, related_name="+", editable=False, blank=True
    )
    quantity = models.PositiveIntegerField("Quantity", help_text="In packs; at least the minimum order.")
    unit = models.CharField("Unit", max_length=20, editable=False, blank=True)
    quoted_unit_price = models.DecimalField(
        "Price when added", max_digits=12, decimal_places=2, editable=False, blank=True
    )
    price_validated_at = models.DateTimeField("Price checked", default=timezone.now, editable=False)
    stock_status = models.CharField(
        "Stock", max_length=20, choices=Stock.choices, default=Stock.UNKNOWN, editable=False
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField("Updated", auto_now=True)

    class Meta:
        ordering = ("created_at",)
        constraints = (models.UniqueConstraint(fields=["cart", "variant"], name="one_line_per_variant"),)

    def __str__(self) -> str:
        return f"{self.quantity} × {self.variant}"

    def save(self, *args, **kwargs) -> None:
        super().save(*args, **kwargs)
        touch(self.cart_id)  # pyright: ignore[reportAttributeAccessIssue]

    def delete(self, *args, **kwargs):
        cart_id = self.cart_id  # pyright: ignore[reportAttributeAccessIssue]
        out = super().delete(*args, **kwargs)
        touch(cart_id)
        return out

    def clean(self) -> None:
        v = self.variant
        self.seller_id = v.seller_id  # pyright: ignore[reportAttributeAccessIssue]
        self.unit = v.packaging_unit
        if self.quoted_unit_price is None:
            self.quoted_unit_price, self.price_validated_at = v.unit_price, timezone.now()
        self.stock_status = v.stock_state()
        errors: dict[str, list[str]] = {}
        if self.cart.status != Cart.Status.ACTIVE:
            errors["cart"] = ["This cart is closed. Open your current cart instead."]
        if not on_sale(v):
            errors["variant"] = ["This product is not on sale."]
        elif self.quantity < v.minimum_order_quantity:
            errors["quantity"] = [f"The minimum order is {v.minimum_order_quantity} packs."]
        elif v.stock_on_hand is not None and self.quantity > v.stock_on_hand:
            errors["quantity"] = [f"Only {v.stock_on_hand} packs are in stock."]
        if self._state.adding and CartLine.objects.filter(cart=self.cart).count() >= MAX_LINES:
            errors["cart"] = [f"A cart holds at most {MAX_LINES} lines. Order these first."]
        if errors:
            raise ValidationError(errors)


def on_sale(v: object) -> bool:
    """A variant buyers can order now: active, and its product in the public catalogue (search document gate)."""
    doc = getattr(v.product, "search", None)  # pyright: ignore[reportAttributeAccessIssue]
    return bool(v.is_active and doc is not None and doc.is_published)  # pyright: ignore[reportAttributeAccessIssue]


def touch(cart_id: object) -> None:
    """Every change to a cart's lines makes a new version (optimistic concurrency, spec Cart.version)."""
    Cart.objects.filter(pk=cart_id).update(version=F("version") + 1, updated_at=timezone.now())
