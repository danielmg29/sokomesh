"""Orders (SM-F-15), purchase approval (SM-F-12) and the order side of reorder (SM-F-20).

An order is one seller's part of a checkout (or an accepted quote), with its commercial terms copied at
the time so history never changes when products or prices do. Its status moves only through the guarded
transitions in apps.orders.lifecycle, each recorded as an append-only OrderTransition with actor, time and
reason. An order that needs approval waits in `pending_approval` until the buyer's policy is met; the
policy that applied is copied onto the order, so a later policy change never rewrites past approvals.
Then it waits in `awaiting_payment` with its stock on hold (SM-F-13) until the buyer pays (SM-F-14); only a
confirmed payment submits it to the seller. Its `correlation_id` ties every record of its journey together.
"""

import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from core.events.context import new_id


def _correlation() -> str:
    return new_id("ord")


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING_APPROVAL = "pending_approval", "Awaiting approval"
        AWAITING_PAYMENT = "awaiting_payment", "Awaiting payment"
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
    # The address as it was when the order was placed, for the legal record (the Address may change later).
    delivery_snapshot = models.JSONField("Delivery address", default=dict, blank=True)
    quote = models.ForeignKey(
        "quotes.Quote",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="orders",
        verbose_name="From quote",
    )
    currency = models.CharField("Currency", max_length=3, default="KES")
    subtotal = models.DecimalField("Subtotal", max_digits=14, decimal_places=2)
    total = models.DecimalField("Total", max_digits=14, decimal_places=2)
    status = models.CharField("Status", max_length=30, choices=Status.choices, default=Status.SUBMITTED)
    special_instructions = models.TextField("Delivery notes", blank=True, max_length=1000)
    submitted_at = models.DateTimeField("Placed")
    # SM-F-12: the policy that applied when the order was placed, copied so history never changes.
    approval_policy = models.ForeignKey(
        "orders.ApprovalPolicy", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    approval_snapshot = models.JSONField(default=dict, blank=True)
    # SM-F-24: reservations, payments, fulfilment and returns for this order share this id in the audit trail.
    correlation_id = models.CharField(max_length=64, default=_correlation, db_index=True, editable=False)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ("-submitted_at",)
        indexes = (
            models.Index(fields=["seller_organization", "submitted_at"]),
            models.Index(fields=["buyer_organization", "submitted_at"]),
        )

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
    price_explanation = models.CharField("Price basis", max_length=160, blank=True)

    class Meta:
        ordering = ("product_name_snapshot",)

    def __str__(self) -> str:
        return f"{self.quantity_ordered} × {self.product_name_snapshot}"


class OrderTransition(models.Model):
    """One status change, append-only: who, when, from what, to what and why."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="transitions")
    from_status = models.CharField(max_length=30, choices=Order.Status.choices, blank=True)
    to_status = models.CharField(max_length=30, choices=Order.Status.choices)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    reason = models.TextField(blank=True, max_length=1000)
    occurred_at = models.DateTimeField()

    class Meta:
        ordering = ("occurred_at",)

    def __str__(self) -> str:
        return f"{self.order}: {self.from_status or 'new'} → {self.to_status}"


class ApprovalPolicy(models.Model):
    """SM-F-12: orders from this value up need approval from members holding one of the approver roles.

    The people trusted to approve large orders are, by default, trusted with their own (an owner's restock goes
    straight to the seller); `exempt_approvers` off asks for a second person on every large order.
    """

    APPROVER_ROLES = ("buyer_owner", "buyer_purchaser")
    MAX_APPROVALS = 5

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    buyer_organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="approval_policies", blank=True
    )
    name = models.CharField("Name", max_length=80)
    currency = models.CharField("Currency", max_length=3, default="KES")
    threshold_amount = models.DecimalField(
        "From order value", max_digits=14, decimal_places=2, help_text="Orders of this value and above need approval."
    )
    approver_role_keys = models.JSONField("Who can approve", default=list)
    minimum_approvals = models.PositiveSmallIntegerField("Approvals needed", default=1)
    exempt_approvers = models.BooleanField(
        "Approvers' own orders skip approval",
        default=True,
        db_default=True,
        help_text="Orders placed by someone who can approve go straight to the seller. "
        "Turn this off to have a second person check every large order.",
    )
    is_active = models.BooleanField("On", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField("Updated", auto_now=True)

    class Meta:
        ordering = ("threshold_amount",)
        verbose_name_plural = "approval policies"

    def __str__(self) -> str:
        return self.name

    def clean(self) -> None:
        errors: dict[str, list[str]] = {}
        roles = self.approver_role_keys if isinstance(self.approver_role_keys, list) else []
        if not roles or any(r not in self.APPROVER_ROLES for r in roles):
            errors["approver_role_keys"] = ["Choose who can approve: buyer owners, purchasers or both."]
        if not 1 <= self.minimum_approvals <= self.MAX_APPROVALS:
            errors["minimum_approvals"] = [f"Ask for between 1 and {self.MAX_APPROVALS} approvals."]
        if self.threshold_amount is not None and self.threshold_amount <= 0:
            errors["threshold_amount"] = ["Set a value above zero."]
        if errors:
            raise ValidationError(errors)


class ApprovalDecision(models.Model):
    """One approver's decision on one order, append-only."""

    class Decision(models.TextChoices):
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="approvals")
    approver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    decision = models.CharField(max_length=10, choices=Decision.choices)
    comment = models.TextField(blank=True, max_length=500)
    decided_at = models.DateTimeField()

    class Meta:
        ordering = ("decided_at",)
        constraints = (models.UniqueConstraint(fields=["order", "approver"], name="one_decision_per_approver"),)

    def __str__(self) -> str:
        return f"{self.approver} {self.decision} {self.order}"
