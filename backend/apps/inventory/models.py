"""SM-F-07 inventory ledger and SM-F-13 stock reservations.

A `Balance` is one variant at one location: packs on hand, packs held by reservations and packs allocated to
paid orders. Available = on hand - reserved - allocated, and the database refuses a row where that would go
below zero, so no code path can oversell. Every change is a `Movement` (append-only), so a balance can be
rebuilt from its movements alone. A `Reservation` holds packs for a buyer for a bounded time.
"""

import uuid

from django.conf import settings
from django.db import models
from django.db.models import F, Q

from core.events.models import AppendOnly


class Location(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="inventory_locations"
    )
    name = models.CharField("Location", max_length=80)
    address = models.ForeignKey(
        "organizations.Address", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = (
            models.UniqueConstraint(fields=["seller", "name"], name="one_location_name_per_seller"),
            models.UniqueConstraint(fields=["seller"], condition=Q(is_default=True), name="one_default_location"),
        )

    def __str__(self) -> str:
        return self.name


class Balance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="+")
    variant = models.ForeignKey(
        "catalog.Variant", on_delete=models.CASCADE, related_name="balances", verbose_name="Pack"
    )
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name="balances", verbose_name="Location")
    bin_label = models.CharField("Bin", max_length=20, blank=True, help_text="Where the pack sits, such as A-03.")
    on_hand = models.PositiveIntegerField("On hand", default=0)
    reserved = models.PositiveIntegerField("Held for checkouts", default=0)
    allocated = models.PositiveIntegerField("Allocated to paid orders", default=0)
    version = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField("Updated", auto_now=True)

    class Meta:
        constraints = (
            models.UniqueConstraint(fields=["variant", "location"], name="one_balance_per_variant_location"),
            # The oversell guard: nothing can hold or allocate packs that are not on hand.
            models.CheckConstraint(condition=Q(on_hand__gte=F("reserved") + F("allocated")), name="never_oversold"),
        )

    def __str__(self) -> str:
        return f"{self.variant_id} at {self.location_id}"  # pyright: ignore[reportAttributeAccessIssue]

    @property
    def available(self) -> int:
        return self.on_hand - self.reserved - self.allocated


class Movement(AppendOnly):
    class Type(models.TextChoices):
        RECEIPT = "receipt", "Receipt"
        RESERVATION = "reservation", "Reservation"
        RELEASE = "release", "Release"
        ALLOCATION = "allocation", "Allocation"
        ADJUSTMENT = "adjustment", "Adjustment"
        SHIPMENT = "shipment", "Shipment"
        RETURN = "return", "Return to stock"

    class Reference(models.TextChoices):
        OPENING = "opening", "Opening balance"
        RECEIPT = "receipt", "Goods received"
        MANUAL = "manual_adjustment", "Manual adjustment"
        RESERVATION = "reservation", "Reservation"
        ORDER = "order", "Order"
        RETURN_CASE = "return_case", "Return case"

    class Reason(models.TextChoices):
        COUNT = "count", "Stock count correction"
        DAMAGE = "damage", "Damaged in the warehouse"
        LOSS = "loss", "Lost or stolen"
        FOUND = "found", "Found in the warehouse"
        EXPIRED = "expired", "Past its date"
        OTHER = "other", "Other (explain in the note)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="+")
    variant = models.ForeignKey(
        "catalog.Variant", on_delete=models.CASCADE, related_name="movements", verbose_name="Pack"
    )
    balance = models.ForeignKey(Balance, on_delete=models.CASCADE, related_name="movements")
    movement_type = models.CharField("Movement", max_length=12, choices=Type.choices, db_index=True)
    quantity = models.IntegerField("Change in available")  # signed: what buyers can order moved by this much
    on_hand_change = models.IntegerField("Change on hand", default=0)
    available_after = models.IntegerField("Available after")
    on_hand_after = models.IntegerField("On hand after")
    unit = models.CharField("Unit", max_length=20)
    reference_type = models.CharField("Reference", max_length=20, choices=Reference.choices)
    reference_id = models.CharField("Reference id", max_length=64, blank=True)
    reference_label = models.CharField("Reference", max_length=80, blank=True)  # SO-2026-0141, RSV-…, a note
    reason_code = models.CharField("Reason", max_length=12, choices=Reason.choices, blank=True)
    note = models.CharField("Note", max_length=300, blank=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    occurred_at = models.DateTimeField("When", db_index=True)
    correlation_id = models.CharField(max_length=64, blank=True)

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        ordering = ("-occurred_at",)
        indexes = (models.Index(fields=["variant", "occurred_at"]),)


class Reservation(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Held"
        CONSUMED = "consumed", "In a paid order"
        RELEASED = "released", "Released"
        EXPIRED = "expired", "Expired"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField("Reservation", max_length=20, unique=True)
    buyer_organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="reservations"
    )
    cart = models.ForeignKey(
        "carts.Cart", null=True, blank=True, on_delete=models.SET_NULL, related_name="reservations"
    )
    order = models.ForeignKey(
        "orders.Order", null=True, blank=True, on_delete=models.CASCADE, related_name="reservations"
    )
    variant = models.ForeignKey("catalog.Variant", on_delete=models.PROTECT, related_name="reservations")
    balance = models.ForeignKey(Balance, on_delete=models.PROTECT, related_name="reservations")
    quantity = models.PositiveIntegerField("Packs")
    unit = models.CharField("Unit", max_length=20)
    status = models.CharField("Status", max_length=12, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    idempotency_key = models.CharField(max_length=120, unique=True)
    expires_at = models.DateTimeField("Held until", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    consumed_at = models.DateTimeField(null=True, blank=True)
    released_at = models.DateTimeField(null=True, blank=True)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ("-created_at",)
        indexes = (models.Index(fields=["status", "expires_at"]),)

    def __str__(self) -> str:
        return self.reference


class ExpiryRun(models.Model):
    """One pass of the reservation expiry worker, for operational visibility (spec ReservationExpiryJob)."""

    id = models.BigAutoField(primary_key=True)
    started_at = models.DateTimeField()
    finished_at = models.DateTimeField(null=True, blank=True)
    batch_size = models.PositiveIntegerField()
    claimed = models.PositiveIntegerField(default=0)
    expired = models.PositiveIntegerField(default=0)
    orders_cancelled = models.PositiveIntegerField(default=0)
    retry_count = models.PositiveIntegerField(default=0)
    last_error = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ("-started_at",)

    def __str__(self) -> str:
        return f"Expiry run {self.started_at:%Y-%m-%d %H:%M}"
