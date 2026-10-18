"""SM-F-02 Seller onboarding: seller profile, documents and activation history (spec pp. 8 and 9).

Verification lives apart from the organization record. `description` is one of the four rich-text
fields the spec allows: it is sanitised on write (core.richtext) and keeps a plain projection for
search. Review notes and rejection reasons stay plain text for predictable audit and search.
"""

import uuid

from django.conf import settings
from django.db import models


class SellerProfile(models.Model):
    class Activation(models.TextChoices):
        DRAFT = "draft", "Draft"
        UNDER_REVIEW = "under_review", "Under review"
        ACTIVE = "active", "Active"
        REJECTED = "rejected", "Rejected"
        SUSPENDED = "suspended", "Suspended"

    organization = models.OneToOneField(
        "organizations.Organization", primary_key=True, on_delete=models.CASCADE, related_name="seller_profile"
    )
    public_name = models.CharField(
        "Marketplace name", max_length=160, help_text="The name buyers see on your products."
    )
    description = models.TextField(
        "About the business", blank=True, help_text="What you sell, where you deliver and how buyers reach you."
    )
    description_text = models.TextField(blank=True, editable=False)
    support_email = models.EmailField("Support email", blank=True)
    support_phone = models.CharField("Support phone", max_length=20, blank=True)
    activation_status = models.CharField("Status", max_length=20, choices=Activation.choices, default=Activation.DRAFT)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    reviewed_at = models.DateTimeField("Reviewed", null=True, blank=True)
    rejection_reason = models.TextField("Reason", blank=True, help_text="Shown to the seller. Say what to change.")
    submitted_at = models.DateTimeField("Submitted", null=True, blank=True)
    updated_at = models.DateTimeField("Updated", auto_now=True)

    class Meta:
        ordering = ("-submitted_at", "public_name")

    def __str__(self) -> str:
        return self.public_name


class SellerDocument(models.Model):
    class Kind(models.TextChoices):
        REGISTRATION = "registration", "Business registration certificate"
        TAX = "tax", "KRA PIN certificate"
        LICENSE = "license", "Trading licence"
        BANK = "bank_verification", "Bank verification letter"
        OTHER = "other", "Other document"

    class Verification(models.TextChoices):
        PENDING = "pending", "Pending check"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"
        EXPIRED = "expired", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller_organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="seller_documents"
    )
    document_type = models.CharField("Document", max_length=30, choices=Kind.choices)
    file_asset = models.ForeignKey("media.FileAsset", on_delete=models.PROTECT, related_name="+", verbose_name="File")
    verification_status = models.CharField(
        "Check", max_length=20, choices=Verification.choices, default=Verification.PENDING
    )
    expires_at = models.DateField("Valid until", null=True, blank=True)
    review_notes = models.TextField("Reviewer notes", blank=True)
    created_at = models.DateTimeField("Uploaded", auto_now_add=True)

    class Meta:
        ordering = ("document_type", "-created_at")

    def __str__(self) -> str:
        return self.get_document_type_display()  # pyright: ignore[reportAttributeAccessIssue]


class SellerStatusChange(models.Model):
    """Activation history: every move between statuses, who made it and why."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(SellerProfile, on_delete=models.CASCADE, related_name="history")
    from_status = models.CharField(max_length=20, choices=SellerProfile.Activation.choices)
    to_status = models.CharField(max_length=20, choices=SellerProfile.Activation.choices)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    reason = models.TextField(blank=True)
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-at",)

    def __str__(self) -> str:
        return f"{self.from_status} to {self.to_status}"
