"""SM-F-01 Organization accounts: organizations, their members and addresses (spec pp. 6 and 7).

Seller- and buyer-specific fields live in profile tables (SellerProfile in apps.sellers), not here.
Addresses are their own table because one organization reuses them for billing, delivery and identity.
"""

import uuid

from django.conf import settings
from django.db import models

ROLE_CHOICES = [
    ("buyer_owner", "Buyer owner"),
    ("buyer_purchaser", "Buyer purchaser"),
    ("seller_manager", "Seller manager"),
    ("warehouse_operator", "Warehouse operator"),
    ("marketplace_admin", "Marketplace administrator"),
]
# Roles each organization type may hand out (an owner never makes a buyer a warehouse operator).
ROLES_FOR = {
    "buyer": ("buyer_owner", "buyer_purchaser"),
    "seller": ("seller_manager", "warehouse_operator"),
    "marketplace_admin": ("marketplace_admin",),
}
OWNER_ROLE = {"buyer": "buyer_owner", "seller": "seller_manager", "marketplace_admin": "marketplace_admin"}


class Organization(models.Model):
    class Type(models.TextChoices):
        SELLER = "seller", "Seller"
        BUYER = "buyer", "Buyer"
        MARKETPLACE_ADMIN = "marketplace_admin", "Marketplace administration"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        ARCHIVED = "archived", "Archived"

    class Approval(models.TextChoices):
        PENDING = "pending", "Pending review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        SUSPENDED = "suspended", "Suspended"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization_type = models.CharField("Organization type", max_length=20, choices=Type.choices)
    name = models.CharField("Trading name", max_length=160, help_text="The name buyers and sellers see.")
    legal_name = models.CharField("Registered legal name", max_length=200, blank=True)
    tax_identifier = models.CharField(
        "KRA PIN",
        max_length=40,
        blank=True,
        help_text="Tax identifier. Visible only to people who manage this organization.",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    approval_state = models.CharField("Approval", max_length=20, choices=Approval.choices, default=Approval.PENDING)
    default_currency = models.CharField("Currency", max_length=3, default="KES")
    timezone = models.CharField("Time zone", max_length=64, default="Africa/Nairobi")
    created_at = models.DateTimeField("Created", auto_now_add=True)
    updated_at = models.DateTimeField("Updated", auto_now=True)

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class Membership(models.Model):
    # Foreign-key columns, declared for the type checker (Django adds them).
    organization_id: uuid.UUID
    user_id: uuid.UUID

    class Status(models.TextChoices):
        INVITED = "invited", "Invited"
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        REMOVED = "removed", "Removed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships")
    role_key = models.CharField("Role", max_length=30, choices=ROLE_CHOICES)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="invitations_sent"
    )
    created_at = models.DateTimeField("Joined", auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = (models.UniqueConstraint(fields=["organization", "user"], name="one_membership_per_user"),)
        ordering = ("created_at",)

    def __str__(self) -> str:
        return f"{self.user} in {self.organization}"


class Address(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="addresses")
    label = models.CharField(max_length=80, help_text="Warehouse, Head office, Shop 1.")
    line1 = models.CharField("Address line 1", max_length=200)
    line2 = models.CharField("Address line 2", max_length=200, blank=True)
    city = models.CharField("Town or city", max_length=100)
    region = models.CharField("County", max_length=100, blank=True)
    postal_code = models.CharField("Postal code", max_length=20, blank=True)
    country_code = models.CharField("Country", max_length=2, default="KE")
    # Spec: geography(Point). Stored as {"lat", "lng"} until PostGIS joins the stack (decision 36).
    location_point = models.JSONField("Map point", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("label",)
        verbose_name_plural = "addresses"

    def __str__(self) -> str:
        return f"{self.label}, {self.city}"
