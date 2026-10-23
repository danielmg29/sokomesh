"""SM-F-18 returns and disputes: a buyer's claim about one order line (or the whole order, for a dispute),
the evidence both sides add, and the seller's decision with its refund and what happens to returned stock."""

import uuid

from django.conf import settings
from django.db import models


class ReturnCase(models.Model):
    class Type(models.TextChoices):
        RETURN = "return", "Return"
        DISPUTE = "dispute", "Dispute"
        DAMAGE = "damage", "Damaged goods"
        SHORTAGE = "shortage", "Short delivery"
        WRONG_ITEM = "wrong_item", "Wrong item"
        QUALITY = "quality_issue", "Quality issue"

    class Reason(models.TextChoices):
        DAMAGED_IN_TRANSIT = "damaged_in_transit", "Damaged on the way"
        SHORT_DELIVERED = "short_delivered", "Fewer packs than invoiced"
        WRONG_PRODUCT = "wrong_product", "A different product arrived"
        PAST_DATE = "past_date", "Past its date or too close to it"
        QUALITY = "quality", "Not of the expected quality"
        NOT_AS_DESCRIBED = "not_as_described", "Not as described"
        OTHER = "other", "Something else"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        EVIDENCE_REQUESTED = "evidence_requested", "Evidence requested"
        REVIEWING = "reviewing", "Under review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        RESOLVED = "resolved", "Resolved"

    class Decision(models.TextChoices):
        APPROVED = "approved", "Approve in full"
        PARTIAL = "partial", "Approve part of the claim"
        REPLACEMENT = "replacement", "Send a replacement"
        REJECTED = "rejected", "Reject"

    class Disposition(models.TextChoices):
        RESTOCK = "restock", "Restock"
        QUARANTINE = "quarantine", "Quarantine for inspection"
        SCRAP = "scrap", "Scrap"
        SUPPLIER_RETURN = "supplier_return", "Return to supplier"
        NONE = "none", "No stock returned"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField("Case", max_length=20, unique=True)
    order = models.ForeignKey("orders.Order", on_delete=models.CASCADE, related_name="cases", verbose_name="Order")
    order_line = models.ForeignKey(
        "orders.OrderLine", null=True, blank=True, on_delete=models.CASCADE, related_name="cases", verbose_name="Line"
    )
    buyer_organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="+")
    seller_organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="+")
    case_type = models.CharField("Type", max_length=20, choices=Type.choices)
    reason_code = models.CharField("Reason", max_length=24, choices=Reason.choices)
    reason_details = models.TextField("What happened", max_length=2000)
    quantity = models.PositiveIntegerField("Packs affected", null=True, blank=True)
    status = models.CharField("Status", max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True)
    decision = models.CharField("Decision", max_length=12, choices=Decision.choices, blank=True)
    decision_notes = models.TextField("Decision explanation", max_length=1000, blank=True)
    approved_quantity = models.PositiveIntegerField("Packs accepted", null=True, blank=True)
    stock_disposition = models.CharField("Returned stock", max_length=16, choices=Disposition.choices, blank=True)
    refund_amount = models.DecimalField("Refund", max_digits=14, decimal_places=2, default=0)
    refunded_amount = models.DecimalField("Refunded", max_digits=14, decimal_places=2, default=0)
    evidence_note = models.CharField("Evidence asked for", max_length=300, blank=True)
    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+", verbose_name="Opened by"
    )
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    opened_at = models.DateTimeField("Opened", auto_now_add=True)
    decided_at = models.DateTimeField("Decided", null=True, blank=True)
    resolved_at = models.DateTimeField("Resolved", null=True, blank=True)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ("-opened_at",)

    def __str__(self) -> str:
        return self.reference


class ReturnEvidence(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(ReturnCase, on_delete=models.CASCADE, related_name="evidence")
    file = models.ForeignKey("media.FileAsset", on_delete=models.CASCADE, related_name="+")
    note = models.CharField("Note", max_length=300, blank=True)
    side = models.CharField(max_length=10)  # buyer or seller
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)

    def __str__(self) -> str:
        return f"Evidence on {self.case_id}"  # pyright: ignore[reportAttributeAccessIssue]
