"""Catalogue: categories and their contracts (SM-F-03), products and variants (SM-F-04), search documents
(SM-F-08) and public product pages (SM-F-22, spec p. 10).

A Category is the stable identity buyers browse (its key is the slug); a CategoryContract is one version
of what products in it must state. Published versions are immutable: changing a category means a new
draft that replaces the published version when it is published. Products are merchandising (name,
description, category attributes); Variants are what is sold (SKU, pack, minimum order, price). Product
`description` is one of the four rich-text fields: sanitised on write, with a plain projection for
search and meta descriptions. ProductPage values (canonical URL, structured data, breadcrumbs) are
derived, never stored; so is the SearchDocument, rebuilt from the database whenever a product changes.
"""

import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.catalog import contracts

GALLERY_LIMIT = 8  # photos after the main one; a bound, so a listing never grows without limit
VARIANT_LIMIT = 50  # sellable variants per product; the editor and the buy box stay usable


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=80)
    slug = models.SlugField(max_length=80, unique=True)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.PROTECT, related_name="children")
    description = models.TextField(blank=True)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("position", "name")
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return self.name

    def trail(self) -> list["Category"]:
        node, out = self, []
        while node is not None and len(out) < 6:  # bounded: categories nest a few levels at most
            out.insert(0, node)
            node = node.parent
        return out

    def active_contract(self) -> "CategoryContract | None":
        return self.contracts.filter(status=CategoryContract.Status.PUBLISHED).first()  # pyright: ignore[reportAttributeAccessIssue]


class CategoryContract(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        RETIRED = "retired", "Retired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="contracts", verbose_name="Category")
    name = models.CharField("Name", max_length=80, help_text="What buyers see; publishing renames the category.")
    # Assigned on first save (blank so validation before then passes): one more than the latest version.
    version = models.PositiveIntegerField("Version", editable=False, blank=True)
    status = models.CharField("Status", max_length=20, choices=Status.choices, default=Status.DRAFT)
    attribute_schema = models.JSONField("Attributes", default=list, blank=True)
    unit_rules = models.JSONField("Units", default=dict, blank=True)
    facet_keys = models.JSONField("Buyer filters", default=list, blank=True)
    comparison_keys = models.JSONField("Compared attributes", default=list, blank=True)
    display_recipe = models.JSONField("Display", default=dict, blank=True)
    seller_guidance = models.TextField("Guidance for sellers", blank=True)
    seller_guidance_text = models.TextField(blank=True, editable=False)
    buyer_guidance = models.TextField("Guidance for buyers", blank=True)
    buyer_guidance_text = models.TextField(blank=True, editable=False)
    predecessor = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="successors",
        verbose_name="Previous version",
    )
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        verbose_name="Published by",
    )
    published_at = models.DateTimeField("Published", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField("Updated", auto_now=True)

    class Meta:
        ordering = ("category__position", "-version")
        constraints = (
            models.UniqueConstraint(fields=["category", "version"], name="contract_version_unique"),
            models.UniqueConstraint(
                fields=["category"], condition=Q(status="published"), name="one_published_contract_per_category"
            ),
            models.UniqueConstraint(
                fields=["category"], condition=Q(status="draft"), name="one_draft_contract_per_category"
            ),
        )

    def __str__(self) -> str:
        return f"{self.name} v{self.version}"

    def save(self, *args, **kwargs) -> None:
        if self.version is None:  # monotonic per category: the next number after every earlier version
            latest = CategoryContract.objects.filter(category=self.category).aggregate(v=models.Max("version"))["v"]
            self.version = (latest or 0) + 1
        super().save(*args, **kwargs)

    def clean(self) -> None:
        errors = contracts.definition_errors(
            self.attribute_schema, self.unit_rules, self.facet_keys, self.comparison_keys, self.display_recipe
        )
        if errors:
            raise ValidationError(errors)


class Product(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        SUSPENDED = "suspended", "Suspended"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, related_name="products")
    category_contract = models.ForeignKey(
        CategoryContract,
        on_delete=models.PROTECT,
        related_name="products",
        verbose_name="Category",
        help_text="The category's published contract decides which details the product needs.",
    )
    # Follows the contract (set on save), kept for browsing and as the search document's category.
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    name = models.CharField("Product", max_length=160)
    slug = models.SlugField(max_length=160, unique=True, help_text="Public address, unique across the marketplace.")
    short_description = models.TextField(
        "Summary", max_length=300, blank=True, help_text="One or two plain sentences for product cards and search."
    )
    description = models.TextField("Description", blank=True)
    description_text = models.TextField(blank=True, editable=False)
    attributes = models.JSONField("Details", default=dict, blank=True)
    brand = models.CharField("Brand", max_length=80, blank=True)
    currency = models.CharField(max_length=3, default="KES")
    # {"url", "alt", "width", "height"}: a prepared public image until the media pipeline (SM-F-05).
    primary_image = models.JSONField("Photo", null=True, blank=True)
    # Further photographs after the main one, each like `primary_image` plus an optional `credit`; at most
    # GALLERY_LIMIT. Replaced by MediaAsset rows when the media pipeline lands (SM-F-05).
    gallery = models.JSONField("More photos", default=list, blank=True)
    seo_title = models.CharField("Search title", max_length=70, blank=True)
    seo_description = models.TextField("Search description", max_length=160, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    available_from = models.DateTimeField("Listed from", null=True, blank=True)
    available_until = models.DateTimeField("Listed until", null=True, blank=True)
    published_at = models.DateTimeField("Published", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField("Updated", auto_now=True)

    class Meta:
        ordering = ("-published_at", "name")

    def __str__(self) -> str:
        return self.name

    def clean(self) -> None:
        errors: dict[str, list[str]] = {}
        contract = self.category_contract
        if len(self.gallery or []) > GALLERY_LIMIT:
            errors["gallery"] = [f"Add at most {GALLERY_LIMIT} more photos."]
        if self.available_from and self.available_until and self.available_until <= self.available_from:
            errors["available_until"] = ["The listing must end after it starts."]
        if contract is not None:
            self.category_id = contract.category_id
            changed = (
                self._state.adding or Product.objects.filter(pk=self.pk).exclude(category_contract=contract).exists()
            )
            if changed and contract.status != CategoryContract.Status.PUBLISHED:
                errors["category_contract"] = ["Choose a category whose contract is published."]
            # Drafts may be incomplete; a published product must state everything its contract requires.
            complete = self.status == self.Status.PUBLISHED
            errors.update(contracts.value_errors(contract, self.attributes or {}, variant=False, require=complete))
            if not errors:
                self.attributes = contracts.clean_values(contract, self.attributes or {}, variant=False)
        if self.status == self.Status.PUBLISHED:
            profile = getattr(self.seller, "seller_profile", None)
            if self.seller.approval_state != "approved" or profile is None or profile.activation_status != "active":
                errors.setdefault("status", []).append("Unapproved sellers cannot publish products.")
            self.published_at = self.published_at or timezone.now()
        if errors:
            raise ValidationError(errors)


class Variant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants", verbose_name="Product")
    # Copied from the product on save so SKUs can be unique per seller in the database.
    seller = models.ForeignKey(
        "organizations.Organization", on_delete=models.PROTECT, related_name="+", editable=False, blank=True
    )
    sku = models.CharField("SKU", max_length=40, help_text="Your stock code; unique across your catalogue.")
    attributes = models.JSONField("Variant details", default=dict, blank=True)
    packaging_unit = models.CharField("Sold by the", max_length=20, choices=contracts.PACKAGING_UNITS)
    units_per_pack = models.DecimalField(
        "Units per pack", max_digits=10, decimal_places=2, help_text="Packets, bottles or pieces in one pack."
    )
    minimum_order_quantity = models.PositiveIntegerField("Minimum order", default=1, help_text="In packs.")
    # The list price per pack; price rules (SM-F-06) refine it for quantity tiers, buyer groups and periods.
    unit_price = models.DecimalField("Price per pack", max_digits=12, decimal_places=2)
    # Derived from the inventory ledger (SM-F-07): packs buyers can order now, kept in step by
    # apps.inventory.services; empty = not tracked in the ledger.
    stock_on_hand = models.PositiveIntegerField(
        "Packs available",
        null=True,
        blank=True,
        help_text="From the stock ledger: on hand less held and allocated packs.",
    )
    is_active = models.BooleanField("On sale", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField("Updated", auto_now=True)

    class Meta:
        ordering = ("product", "unit_price", "sku")
        constraints = (models.UniqueConstraint(fields=["seller", "sku"], name="variant_sku_unique_per_seller"),)

    def __str__(self) -> str:
        return self.sku

    def clean(self) -> None:
        errors: dict[str, list[str]] = {}
        product = self.product
        self.seller_id = product.seller_id
        contract = product.category_contract
        allowed_units = (contract.unit_rules or {}).get("sale_units") or []
        if self.packaging_unit and self.packaging_unit not in allowed_units:
            names = ", ".join(str(contracts.UNIT_LABELS.get(u, u)).lower() for u in allowed_units)
            errors["packaging_unit"] = [f"{contract.name} is sold by the {names}."]
        if self.units_per_pack is not None and self.units_per_pack <= 0:
            errors["units_per_pack"] = ["A pack holds at least one unit."]
        if self.unit_price is not None and self.unit_price <= 0:
            errors["unit_price"] = ["Set a price above zero."]
        if self.minimum_order_quantity < 1:
            errors["minimum_order_quantity"] = ["The minimum order is at least one pack."]
        errors.update(contracts.value_errors(contract, self.attributes or {}, variant=True))
        others = Variant.objects.filter(product=product).exclude(pk=self.pk)
        if not errors:
            self.attributes = contracts.clean_values(contract, self.attributes or {}, variant=True)
            if self.attributes and others.filter(attributes=self.attributes).exists():
                errors["attributes"] = ["Another variant of this product already has these details."]
            elif (
                not self.attributes
                and others.filter(
                    attributes={}, packaging_unit=self.packaging_unit, units_per_pack=self.units_per_pack
                ).exists()
            ):
                errors["units_per_pack"] = ["Another variant already sells this pack."]
        if self.sku and Variant.objects.filter(seller_id=self.seller_id, sku=self.sku).exclude(pk=self.pk).exists():
            errors["sku"] = ["Another of your variants already uses this SKU."]
        if not self.pk and others.count() >= VARIANT_LIMIT:
            errors["product"] = [f"A product has at most {VARIANT_LIMIT} variants."]
        if errors:
            raise ValidationError(errors)

    def stock_state(self) -> str:
        """Buyer-visible availability (CartLine.stock_status values): never the raw count's history."""
        if self.stock_on_hand is None:
            return "unknown"
        if self.stock_on_hand <= 0 or self.stock_on_hand < self.minimum_order_quantity:
            return "unavailable"
        return "limited" if self.stock_on_hand < self.minimum_order_quantity * 3 else "available"


class SearchDocument(models.Model):
    """SM-F-08: one product as buyers search it, rebuilt by apps.catalog.search whenever it changes."""

    product = models.OneToOneField(Product, on_delete=models.CASCADE, primary_key=True, related_name="search")
    seller = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="+")
    category_contract = models.ForeignKey(CategoryContract, null=True, on_delete=models.SET_NULL, related_name="+")
    title = models.CharField(max_length=200)
    body_text = models.TextField(blank=True)  # summary, description, SKUs, brand and attribute values
    facet_values = models.JSONField(default=dict)
    min_price = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    available_quantity = models.PositiveIntegerField(null=True)  # packs across active variants; null = not tracked
    in_stock = models.BooleanField(default=False)
    # The cheapest active variant, for product cards: {"id", "sku", "pack_label", "moq", "unit_price"}.
    lead = models.JSONField(default=dict)
    seller_city = models.CharField(max_length=80, blank=True)  # until geography (location_point) is needed
    is_published = models.BooleanField(default=False)
    indexed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = (models.Index(fields=["is_published", "min_price"]),)

    def __str__(self) -> str:
        return self.title


MEDIA_LIMIT = 12  # photographs per product: a bound on the gallery, the upload queue and the editor


class MediaAsset(models.Model):
    """SM-F-05: one product photograph. The original is private (signed links only); after verification
    and metadata stripping a display copy is public, and the web image optimizer makes responsive sizes."""

    class Scan(models.TextChoices):
        PENDING = "pending", "Checking"
        CLEAN = "clean", "Clean"
        REJECTED = "rejected", "Rejected"
        FAILED = "failed", "Could not check"

    class Processing(models.TextChoices):
        QUEUED = "queued", "Queued"
        PROCESSING = "processing", "Processing"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="+")
    product = models.ForeignKey(
        Product, null=True, on_delete=models.CASCADE, related_name="media", verbose_name="Product"
    )
    variant = models.ForeignKey(
        Variant, null=True, blank=True, on_delete=models.SET_NULL, related_name="media", verbose_name="Variant"
    )
    original_name = models.CharField("File", max_length=160)
    object_key = models.CharField(max_length=255, editable=False)  # the private original in storage
    mime_type = models.CharField("Type", max_length=40, editable=False)
    size_bytes = models.PositiveBigIntegerField("Size", editable=False)
    sha256 = models.CharField(max_length=64, editable=False)
    width_px = models.PositiveIntegerField("Width", null=True, blank=True, editable=False)
    height_px = models.PositiveIntegerField("Height", null=True, blank=True, editable=False)
    scan_status = models.CharField("Check", max_length=12, choices=Scan.choices, default=Scan.PENDING, editable=False)
    processing_status = models.CharField(
        "Processing", max_length=12, choices=Processing.choices, default=Processing.QUEUED, editable=False
    )
    # {"display": {"key", "format", "width", "height", "bytes"}, "widths": [responsive widths, bounded]}
    derivatives = models.JSONField("Sizes", default=dict, blank=True, editable=False)
    alt_text = models.CharField(
        "Description", max_length=200, help_text="What the photograph shows, for people who cannot see it."
    )
    sort_order = models.PositiveSmallIntegerField("Order", default=0)
    rejection_reason = models.CharField("Why it was rejected", max_length=200, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True, editable=False)

    class Meta:
        ordering = ("product", "sort_order", "created_at")
        constraints = (models.UniqueConstraint(fields=["product", "sha256"], name="one_copy_per_product"),)

    def __str__(self) -> str:
        return self.original_name

    @property
    def public(self) -> bool:
        return self.scan_status == self.Scan.CLEAN and self.processing_status == self.Processing.READY


class BuyerGroupMember(models.Model):
    """SM-F-06 buyer groups: a seller places a buyer organization in a named group its price rules target."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="+", blank=True)
    buyer = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="price_groups", verbose_name="Buyer"
    )
    group_key = models.SlugField(
        "Group",
        max_length=40,
        help_text="A short name your price rules use, such as key_accounts.",
        allow_unicode=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("group_key", "buyer__name")
        constraints = (models.UniqueConstraint(fields=["seller", "buyer", "group_key"], name="buyer_once_per_group"),)

    def __str__(self) -> str:
        return f"{self.buyer} in {self.group_key}"


class PriceRule(models.Model):
    """SM-F-06: one rule of a seller's price book. The variant's own price is the list price; rules refine it
    for quantity tiers, buyer groups and periods, and apps.catalog.pricing picks one deterministically."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="+", blank=True)
    variant = models.ForeignKey(Variant, on_delete=models.CASCADE, related_name="price_rules", verbose_name="Variant")
    label = models.CharField("Name", max_length=80, blank=True, help_text="For you, such as October promotion.")
    buyer_group_key = models.SlugField(
        "Buyer group", max_length=40, blank=True, help_text="Leave empty for every buyer."
    )
    minimum_quantity = models.PositiveIntegerField("From quantity", default=1, help_text="In packs.")
    unit = models.CharField("Unit", max_length=20, blank=True, editable=False)
    unit_price = models.DecimalField("Price per pack", max_digits=12, decimal_places=2)
    currency = models.CharField("Currency", max_length=3, default="KES")
    priority = models.SmallIntegerField("Priority", default=0, help_text="Where rules overlap, the higher one wins.")
    effective_from = models.DateTimeField("Starts", default=timezone.now)
    effective_until = models.DateTimeField("Ends", null=True, blank=True)
    is_active = models.BooleanField("On", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField("Updated", auto_now=True)

    class Meta:
        ordering = ("variant", "buyer_group_key", "minimum_quantity", "-priority")

    def __str__(self) -> str:
        return self.label or f"{self.variant} from {self.minimum_quantity}"

    def clean(self) -> None:
        errors: dict[str, list[str]] = {}
        self.seller_id = self.variant.seller_id  # pyright: ignore[reportAttributeAccessIssue]
        self.unit = self.variant.packaging_unit
        if self.unit_price is not None and self.unit_price < 0:
            errors["unit_price"] = ["A price cannot be negative."]
        if self.minimum_quantity < 1:
            errors["minimum_quantity"] = ["Start from at least one pack."]
        if self.effective_until and self.effective_from and self.effective_until <= self.effective_from:
            errors["effective_until"] = ["The rule must end after it starts."]
        if errors:
            raise ValidationError(errors)
