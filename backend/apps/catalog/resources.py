"""Catalogue resources.

- `product`: the public storefront (SM-F-22, SM-F-08): published products only, read from the search
  document for search, price and stock filters, plus buyer filters from the category's contract.
- `category`: public categories, each with its published contract's buyer-facing summary.
- `category_contract` (SM-F-03): administrators draft, publish and revise versions; anyone may read
  published versions, which is how every derived surface learns its fields.
- `catalog_product` and `variant` (SM-F-04): a seller's own products, drafts included, and what they sell.
"""

from collections import Counter
from functools import reduce
from operator import or_
from typing import Any

from django.conf import settings
from django.db.models import Count, Max, Min, Q, QuerySet
from django.http import HttpRequest
from django.utils import timezone
from django.utils.text import slugify

from apps.catalog import contracts, pricing
from apps.catalog.media import display_url as media_display_url
from apps.catalog.media import image_value, original_url, remove
from apps.catalog.models import (
    GALLERY_LIMIT,
    BuyerGroupMember,
    Category,
    CategoryContract,
    MediaAsset,
    PriceRule,
    Product,
    Variant,
)
from apps.catalog.search import index_many
from apps.organizations.models import Organization
from apps.organizations.tenancy import active_membership, is_admin
from core.api import fail, invalid
from core.operations.listing import FieldSpec, ListQuery, ListSpec, narrow
from core.operations.registry import Action, Field, Resource, derive, register
from core.result import ErrorCode

STATUS_TONES = {"draft": "neutral", "published": "success", "suspended": "warning", "archived": "neutral"}
CONTRACT_TONES = {"draft": "info", "published": "success", "retired": "neutral"}
FACET_SAMPLE = 2000  # documents read to count one attribute's values: bounded work per request
COMPARE_LIMIT = 4


def published(qs: QuerySet[Product] | None = None) -> QuerySet[Product]:
    """What the public may see: published products of approved, active sellers."""
    base = qs if qs is not None else Product.objects.all()
    return base.filter(
        status=Product.Status.PUBLISHED,
        seller__approval_state="approved",
        seller__seller_profile__activation_status="active",
    ).select_related("seller", "seller__seller_profile", "category", "category__parent", "category_contract")


def storefront() -> QuerySet[Product]:
    """Published products whose search document is published too (it also checks the listing window)."""
    return published().filter(search__is_published=True).select_related("search")


def absolute(path: str) -> str:
    return path if path.startswith("http") else f"{settings.AC_SITE_URL}{path}"


def relation_ref(qs: QuerySet[Any], value: Any, field: str, message: str) -> Any:
    """A relation written as an id or as {"id", "label"}, resolved inside `qs` (so only permitted rows match)."""
    ref = value.get("id") if isinstance(value, dict) else value
    try:
        return qs.get(pk=ref)
    except Exception:  # missing, malformed or outside the caller's rows: one message either way
        invalid({field: [message]})


# --- shared views of variants and contracts ---------------------------------------------------


def stock_of(v: Variant) -> dict[str, Any]:
    """CartLine.stock_status values: available, limited, unavailable or unknown (never warehouse detail)."""
    return {"state": v.stock_state(), "available": v.stock_on_hand, "unit": v.packaging_unit}


def variant_view(v: Variant, product: Product) -> dict[str, Any]:
    contract, attrs = product.category_contract, product.attributes or {}
    defs = {a["key"]: a for a in contracts.attributes_of(contract, variant=True)}
    return {
        "id": str(v.pk),
        "sku": v.sku,
        "pack_label": contracts.pack_label(contract, attrs, v),
        "packaging_unit": v.packaging_unit,
        "units_per_pack": f"{v.units_per_pack.normalize():f}",
        "moq": v.minimum_order_quantity,
        "unit_price": format(v.unit_price, "f"),
        "normalised_price": contracts.normalised_price(contract, attrs, v),
        "stock": stock_of(v),
        "is_active": v.is_active,
        "attributes": v.attributes or {},
        "details": [
            {"key": k, "label": defs[k].get("label", k), "value": contracts.choice_label(defs[k], val)}
            for k, val in (v.attributes or {}).items()
            if k in defs
        ],
    }


def specs_of(product: Product) -> list[dict[str, str]]:
    """The product's attributes as specification rows, in the contract's display order."""
    contract, attrs = product.category_contract, product.attributes or {}
    defs = {a["key"]: a for a in contracts.attributes_of(contract, variant=False)}
    order = [k for k in (contract.display_recipe or {}).get("spec_keys") or [] if k in defs] or list(defs)
    return [
        {"key": k, "label": defs[k].get("label", k), "value": contracts.display_value(defs[k], attrs[k])}
        for k in order
        if attrs.get(k) is not None
    ]


def contract_summary(c: CategoryContract) -> dict[str, Any]:
    """What buyers and seller forms need from a published version: fields, filters, comparison, guidance."""
    return {
        "id": str(c.pk),
        "name": c.name,
        "version": c.version,
        "attributes": [contracts.field_meta(a) for a in contracts.attributes_of(c, variant=False)],
        "variant_attributes": [contracts.field_meta(a) for a in contracts.attributes_of(c, variant=True)],
        "facets": contracts.facet_fields(c),
        "comparison_keys": list(c.comparison_keys or []),
        "display_recipe": c.display_recipe or {},
        "sale_units": [
            {"value": u, "label": contracts.UNIT_LABELS.get(u, u)} for u in (c.unit_rules or {}).get("sale_units", [])
        ],
        "normalise": (c.unit_rules or {}).get("normalise"),
        "seller_guidance": {"html": c.seller_guidance, "text": c.seller_guidance_text},
        "buyer_guidance": {"html": c.buyer_guidance, "text": c.buyer_guidance_text},
    }


# --- public products --------------------------------------------------------------------------


def images_of(p: Product) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    """The product's photographs: its ready media (SM-F-05) in the seller's order, or, until a seller has
    uploaded any, the prepared images seeded with the product."""
    ready = [m for m in p.media.all() if m.public]  # pyright: ignore[reportAttributeAccessIssue]
    if ready:
        values = [image_value(m) for m in ready]
        return values[0], values[1:]
    return p.primary_image, list(p.gallery or [])


def product_page(p: Product) -> dict[str, Any]:
    """ProductPage (spec p. 10): canonical URL, schema.org JSON-LD, image and breadcrumbs, all derived."""
    canonical = absolute(f"/products/{p.slug}")
    seller = p.seller.seller_profile.public_name  # pyright: ignore[reportAttributeAccessIssue]
    primary, gallery = images_of(p)
    image = (primary or {}).get("url")
    lead = _lead(p)
    # Every photograph, main one first, as absolute URLs (gallery photos may already be absolute).
    images = [absolute(u) for u in [image, *(g.get("url") for g in gallery)] if u]
    offer: dict[str, Any] = {
        "@type": "Offer",
        "url": canonical,
        "priceCurrency": p.currency,
        "seller": {"@type": "Organization", "name": seller},
    }
    if lead:
        offer["price"] = lead["unit_price"]
        offer["eligibleQuantity"] = {
            "@type": "QuantitativeValue",
            "minValue": lead["moq"],
            "unitText": lead["pack_label"],
        }
    structured = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": p.name,
        "description": (p.seo_description or p.short_description or p.description_text)[:500],
        "category": " > ".join(c.name for c in p.category.trail()),
        "brand": {"@type": "Brand", "name": p.brand or seller},
        "offers": offer,
        **({"sku": lead["sku"]} if lead else {}),
        **({"image": images} if images else {}),
    }
    crumbs = [{"label": "Catalogue", "href": "/catalogue"}]
    crumbs += [{"label": c.name, "href": f"/catalogue/{c.slug}"} for c in p.category.trail()]
    crumbs.append({"label": p.name})
    pack = f", {lead['pack_label']}" if lead else ""
    return {
        "product_id": str(p.pk),
        "canonical_url": canonical,
        "structured_data_json": structured,
        "primary_image_url": image,
        "breadcrumb_items": crumbs,
        "title": p.seo_title or f"{p.name}{pack}",
        "description": p.seo_description or (p.short_description or p.description_text)[:160],
    }


def _lead(p: Product) -> dict[str, Any] | None:
    """The cheapest active variant, as the search document holds it."""
    doc = getattr(p, "search", None)
    return doc.lead if doc is not None and doc.lead else None


def _product_extra(p: Product, request: HttpRequest) -> dict[str, Any]:
    profile = p.seller.seller_profile  # pyright: ignore[reportAttributeAccessIssue]
    doc = getattr(p, "search", None)
    lead = _lead(p) or {}
    primary, gallery = images_of(p)
    return {
        "primary_image": primary,
        "gallery": gallery,
        # The product's headline values are its cheapest active variant's (the search document's lead).
        "sku": lead.get("sku"),
        "pack_label": lead.get("pack_label"),
        "unit_price": lead.get("unit_price"),
        "min_order_quantity": lead.get("moq"),
        "in_stock": bool(doc and doc.in_stock),
        # `detail` is what a product cell shows under the seller's name: where they trade from.
        "seller": {
            "id": str(p.seller_id),  # pyright: ignore[reportAttributeAccessIssue]
            "label": profile.public_name,
            "detail": (doc.seller_city if doc else "") or None,
            "phone": profile.support_phone or None,
        },
        "category": {"id": str(p.category_id), "label": p.category.name, "slug": p.category.slug},  # pyright: ignore[reportAttributeAccessIssue]
        "page": product_page(p),
    }


def _product_detail_extra(p: Product, request: HttpRequest) -> dict[str, Any]:
    out = _product_extra(p, request)
    # Public tiers are the prices every buyer gets; a signed-in buyer asks `prices` for their own.
    out["variants"] = [
        {**variant_view(v, p), "tiers": pricing.tiers(v)}
        for v in p.variants.all()  # pyright: ignore[reportAttributeAccessIssue]
        if v.is_active
    ]
    out["specs"] = specs_of(p)
    contract = p.category.active_contract() or p.category_contract
    out["contract"] = {
        "id": str(contract.pk),
        "version": contract.version,
        "comparable": bool(contract.comparison_keys),
        "buyer_guidance": {"html": contract.buyer_guidance, "text": contract.buyer_guidance_text},
    }
    return out


def _category_from(request: HttpRequest) -> Category | None:
    """The one category a list request narrows to (`category__eq`, or `category__in` with a single id)."""
    raw = request.GET.get("category__eq") or request.GET.get("category__in", "")
    if not raw or "," in raw:
        return None
    try:
        return Category.objects.filter(pk=raw).first()
    except Exception:  # a malformed id: the list grammar reports it
        return None


def _contains_any(path: str):
    return lambda f: reduce(or_, (Q(**{f"{path}__contains": [v]}) for v in f.value))


def _facet_spec(request: HttpRequest, spec: ListSpec) -> ListSpec:
    """Buyer filters from the category's published contract (`attr.<key>`), accepted only within that category."""
    category = _category_from(request)
    contract = category.active_contract() if category else None
    if contract is None:
        return spec
    fields, paths, builders = [], {}, {}
    defs = {a["key"]: a for a in contracts.attributes_of(contract)}
    for key in contract.facet_keys or []:
        attr, name, path = defs.get(key), f"{contracts.FACET_PREFIX}{key}", f"search__facet_values__{key}"
        if attr is None:
            continue
        if attr["type"] == "enum":
            values = frozenset(str(c["value"]) for c in attr.get("choices") or [])
            fields.append(FieldSpec(name, "enum", frozenset({"in"}), values))
            builders[name] = _contains_any(path)
        elif attr["type"] == "boolean":
            fields.append(FieldSpec(name, "boolean", frozenset({"eq"})))
            builders[name] = lambda f, path=path: Q(**{f"{path}__contains": [f.value]})
        elif attr["type"] in contracts.NUMERIC:
            fields.append(FieldSpec(name, "number", frozenset({"gte", "lte"})))
            paths[name] = path
    return spec.widen(fields, paths, builders)


def _facet_counts(request: HttpRequest, base: QuerySet[Product], query: ListQuery, spec: ListSpec) -> dict[str, Any]:
    """For each filter, how many products each choice would show with every other filter applied."""
    sellers = (
        narrow(base, query, spec, skip="seller")
        .order_by()
        .values("seller_id", "seller__seller_profile__public_name")
        .annotate(n=Count("pk"))
    )
    options = sorted(
        ({"value": str(r["seller_id"]), "label": r["seller__seller_profile__public_name"]} for r in sellers),
        key=lambda o: o["label"],
    )
    counts: dict[str, dict[str, int]] = {"seller": {str(r["seller_id"]): r["n"] for r in sellers}}
    counts["in_stock"] = {"true": narrow(base, query, spec, skip="in_stock").filter(search__in_stock=True).count()}
    by_category = narrow(base, query, spec, skip="category").order_by().values("category_id").annotate(n=Count("pk"))
    counts["category"] = {str(r["category_id"]): r["n"] for r in by_category}
    for name, field in spec.fields.items():
        if not name.startswith(contracts.FACET_PREFIX) or field.type not in ("enum", "boolean"):
            continue
        key, tally = name.removeprefix(contracts.FACET_PREFIX), Counter()
        rows = narrow(base, query, spec, skip=name).values_list("search__facet_values", flat=True)[:FACET_SAMPLE]
        for values in rows:
            for v in (values or {}).get(key, []):
                tally[("true" if v else "false") if isinstance(v, bool) else str(v)] += 1
        counts[name] = dict(tally)
    bounds = narrow(base, query, spec, skip="unit_price").aggregate(
        min=Min("search__min_price"), max=Max("search__min_price")
    )
    return {
        "facets": {
            "counts": counts,
            "options": {"seller": options},
            "price": {k: format(v, "f") if v is not None else None for k, v in bounds.items()},
        }
    }


product = register(
    Resource(
        key="product",
        path="products",
        model=Product,
        label="Product",
        label_plural="Products",
        display_field="name",
        public=True,
        tenant_scoped=False,
        by="slug",
        fields=(
            derive(Product, "id"),
            derive(Product, "primary_image", type="image", widget="image", read_only=True, weight=5),
            derive(Product, "gallery", type="image", widget="image", read_only=True, max_items=GALLERY_LIMIT, weight=6),
            derive(Product, "name", read_only=True, weight=10),
            derive(
                Product,
                "seller",
                read_only=True,
                relation={"model": "organization", "display": "name"},
                role="subtitle",
                filter=("eq", "in"),
                weight=20,
            ),
            derive(
                Product,
                "category",
                read_only=True,
                relation={"model": "category", "display": "name"},
                filter=("in", "eq"),
                weight=25,
            ),
            derive(Product, "slug", read_only=True, widget="hidden"),
            # Headline values from the cheapest active variant (SM-F-04 moved packs and prices to variants).
            Field("sku", "string", "code", label="SKU", max_length=40, read_only=True, weight=30),
            Field(
                "pack_label",
                "string",
                "text",
                label="Pack",
                help="How it is sold, for example Bale of 12 × 2 kg.",
                max_length=80,
                read_only=True,
                weight=35,
            ),
            Field(
                "unit_price",
                "decimal",
                "currency",
                label="Price per pack",
                help="The lowest price among the product's variants.",
                currency="KES",
                max_digits=12,
                decimal_places=2,
                filter=("range",),
                read_only=True,
                weight=40,
            ),
            Field("min_order_quantity", "integer", "integer", label="Minimum order", read_only=True, weight=45),
            derive(Product, "short_description", read_only=True, weight=47),
            derive(Product, "brand", read_only=True, weight=48),
            derive(Product, "description", type="richtext", widget="richtext", read_only=True, weight=50),
            Field("in_stock", "boolean", "boolean", label="In stock", filter=("eq",), read_only=True, weight=55),
            derive(Product, "status", widget="status", tones=STATUS_TONES, read_only=True),
            derive(Product, "published_at", read_only=True, widget="relative-time"),
            derive(Product, "seo_title", read_only=True),
            derive(Product, "seo_description", read_only=True),
        ),
        list_fields=("primary_image", "name", "seller", "pack_label", "unit_price", "min_order_quantity"),
        search=("name", "sku"),
        ordering=("-published_at", "unit_price", "-unit_price", "name"),
        default_page_size=24,
        permissions={},
        hooks={
            "queryset": lambda request: storefront().prefetch_related("variants", "variants__price_rules", "media"),
            "organization_of": lambda p: p.seller,
            "serialize_extra": lambda p, request: (
                _product_detail_extra(p, request)
                if request.resolver_match.url_name == "product-detail"
                else _product_extra(p, request)  # pyright: ignore[reportOptionalMemberAccess]
            ),
            "list_spec": _facet_spec,
            "list_extra": _facet_counts,
        },
        # Search reads the document's title and body (summary, description, every SKU, attribute values).
        search_paths={
            "name": "search__title",
            "sku": "search__body_text",
            "unit_price": "search__min_price",
            "in_stock": "search__in_stock",
        },
    )
)


# --- categories -------------------------------------------------------------------------------


def _category_queryset(request: HttpRequest) -> QuerySet[Category]:
    live = Q(
        products__status="published",
        products__seller__approval_state="approved",
        products__seller__seller_profile__activation_status="active",
        products__search__is_published=True,
    )
    return Category.objects.select_related("parent").annotate(product_count=Count("products", filter=live))


def _category_extra(c: Category, request: HttpRequest) -> dict[str, Any]:
    contract = c.active_contract()
    return {"contract": contract_summary(contract) if contract else None}


category = register(
    Resource(
        key="category",
        path="categories",
        model=Category,
        label="Category",
        label_plural="Categories",
        display_field="name",
        public=True,
        tenant_scoped=False,
        by="slug",
        fields=(
            derive(Category, "id"),
            derive(Category, "name", read_only=True),
            derive(Category, "slug", read_only=True, widget="hidden"),
            derive(
                Category,
                "parent",
                read_only=True,
                relation={"model": "category", "display": "name"},
                filter=("eq", "isnull"),
            ),
            derive(Category, "description", read_only=True),
            derive(Category, "position", read_only=True, widget="hidden"),
            Field("product_count", "integer", "integer", label="Products", read_only=True),
        ),
        list_fields=("name", "product_count"),
        search=("name",),
        ordering=("position", "name"),
        default_page_size=50,
        permissions={},
        hooks={"queryset": _category_queryset, "organization_of": lambda c: None, "serialize_extra": _category_extra},
    )
)


# --- category contracts (SM-F-03) ---------------------------------------------------------------


def _contract_queryset(request: HttpRequest) -> QuerySet[CategoryContract]:
    qs = CategoryContract.objects.select_related("category", "published_by", "predecessor")
    return qs if is_admin(request.user) else qs.filter(status=CategoryContract.Status.PUBLISHED)


def _contract_extra(c: CategoryContract, request: HttpRequest) -> dict[str, Any]:
    if request.resolver_match is None or request.resolver_match.url_name != "category_contract-detail":
        return {"category_slug": c.category.slug}  # lists stay cheap: the builder reads the rest on the record
    problems = contracts.definition_errors(
        c.attribute_schema, c.unit_rules, c.facet_keys, c.comparison_keys, c.display_recipe
    )
    return {
        # What this version generates (seller fields, buyer filters, units), as the storefront will read it.
        "derived": contract_summary(c),
        "problems": problems,
        "product_count": Product.objects.filter(category_contract=c).count(),
        "category_slug": c.category.slug,
    }


def _create_contract(request: HttpRequest, data: dict[str, Any]) -> CategoryContract:
    category = relation_ref(Category.objects.all(), data.pop("category", None), "category", "Choose a category.")
    if CategoryContract.objects.filter(category=category, status=CategoryContract.Status.DRAFT).exists():
        fail(ErrorCode.CONFLICT, f"{category.name} already has a draft. Open it instead.")
    data.setdefault("name", category.name)
    return CategoryContract(category=category, predecessor=category.active_contract(), **data)


def _update_contract(request: HttpRequest, c: CategoryContract, changes: dict[str, Any]) -> None:
    if c.status != CategoryContract.Status.DRAFT:
        fail(ErrorCode.CONFLICT, "Published versions cannot change. Start a new draft from this version.")
    if "category" in changes:
        invalid({"category": ["A draft stays in its category; start a new draft in the other category."]})
    for k, v in changes.items():
        setattr(c, k, v)


def _publish_contract(request: HttpRequest, c: CategoryContract, data: dict[str, Any]) -> dict[str, Any]:
    c.full_clean()
    current = c.category.active_contract()
    if current is not None:
        current.status = CategoryContract.Status.RETIRED
        current.save(update_fields=["status", "updated_at"])
    c.status = CategoryContract.Status.PUBLISHED
    c.published_by, c.published_at = request.user, timezone.now()
    c.save()
    # The category takes the published name; products keep the version they were validated against and
    # move to this one the next time their seller saves them. Their documents are rebuilt for new filters.
    Category.objects.filter(pk=c.category_id).update(name=c.name)  # pyright: ignore[reportAttributeAccessIssue]
    index_many(Product.objects.filter(category_id=c.category_id))  # pyright: ignore[reportAttributeAccessIssue]
    return category_contract.serialize(c, request)


def _revise_contract(request: HttpRequest, c: CategoryContract, data: dict[str, Any]) -> dict[str, Any]:
    if CategoryContract.objects.filter(category=c.category, status=CategoryContract.Status.DRAFT).exists():
        fail(ErrorCode.CONFLICT, f"{c.category.name} already has a draft. Open it instead.")
    draft = CategoryContract(
        category=c.category,
        name=c.name,
        attribute_schema=c.attribute_schema,
        unit_rules=c.unit_rules,
        facet_keys=c.facet_keys,
        comparison_keys=c.comparison_keys,
        display_recipe=c.display_recipe,
        seller_guidance=c.seller_guidance,
        seller_guidance_text=c.seller_guidance_text,
        buyer_guidance=c.buyer_guidance,
        buyer_guidance_text=c.buyer_guidance_text,
        predecessor=c,
    )
    draft.full_clean()
    draft.save()
    return category_contract.serialize(draft, request)


category_contract = register(
    Resource(
        key="category_contract",
        path="category-contracts",
        model=CategoryContract,
        label="Category contract",
        label_plural="Category contracts",
        display_field="name",
        public=True,  # published versions are public: they describe the storefront's fields and filters
        tenant_scoped=False,
        fields=(
            derive(CategoryContract, "id"),
            derive(
                CategoryContract,
                "category",
                relation={"model": "category", "display": "name"},
                filter=("eq", "in"),
                weight=5,
            ),
            derive(CategoryContract, "name", weight=10),
            derive(CategoryContract, "version", read_only=True, weight=15),
            derive(
                CategoryContract,
                "status",
                widget="status",
                tones=CONTRACT_TONES,
                read_only=True,
                filter=("in",),
                weight=20,
            ),
            derive(CategoryContract, "attribute_schema", weight=30),
            derive(CategoryContract, "unit_rules", weight=31),
            derive(CategoryContract, "facet_keys", weight=32),
            derive(CategoryContract, "comparison_keys", weight=33),
            derive(CategoryContract, "display_recipe", weight=34),
            derive(CategoryContract, "seller_guidance", type="richtext", widget="richtext", weight=40),
            derive(CategoryContract, "buyer_guidance", type="richtext", widget="richtext", weight=41),
            derive(
                CategoryContract,
                "predecessor",
                read_only=True,
                relation={"model": "category_contract", "display": "name"},
            ),
            derive(
                CategoryContract, "published_by", read_only=True, relation={"model": "user", "display": "display_name"}
            ),
            derive(CategoryContract, "published_at", read_only=True, widget="relative-time"),
            derive(CategoryContract, "updated_at", read_only=True, widget="relative-time"),
        ),
        list_fields=("name", "category", "version", "status", "updated_at"),
        search=("name",),
        ordering=("-updated_at", "name", "-version"),
        writable=(
            "category",
            "name",
            "attribute_schema",
            "unit_rules",
            "facet_keys",
            "comparison_keys",
            "display_recipe",
            "seller_guidance",
            "buyer_guidance",
        ),
        permissions={
            "list": "category_contract.list",
            "get": "category_contract.get",
            "create": "category_contract.create",
            "update": "category_contract.update",
        },
        actions=(
            Action(
                "publish",
                "Publish",
                "category_contract.publish",
                _publish_contract,
                confirm=True,
                icon="check",
                when={"status": ["draft"]},
            ),
            Action(
                "revise",
                "New draft",
                "category_contract.revise",
                _revise_contract,
                icon="copy",
                when={"status": ["published"]},
            ),
        ),
        hooks={
            "queryset": _contract_queryset,
            "organization_of": lambda c: None,
            "serialize_extra": _contract_extra,
            "create": _create_contract,
            "update": _update_contract,
        },
    )
)


# --- a seller's catalogue (SM-F-04) ----------------------------------------------------------------


def _seller_org(request: HttpRequest) -> Organization:
    org = active_membership(request).organization
    if org.organization_type != Organization.Type.SELLER:
        fail(ErrorCode.FORBIDDEN, "Only seller organizations have a catalogue.")
    return org


def _own_products(request: HttpRequest) -> QuerySet[Product]:
    qs = Product.objects.select_related(
        "seller", "seller__seller_profile", "category", "category_contract", "search"
    ).prefetch_related("variants", "variants__price_rules", "media")
    return qs if is_admin(request.user) else qs.filter(seller=active_membership(request).organization)


def publish_blockers(p: Product) -> list[str]:
    """Why the product cannot go on sale yet, in the seller's words; empty when it can."""
    out = []
    profile = getattr(p.seller, "seller_profile", None)
    if p.seller.approval_state != "approved" or profile is None or profile.activation_status != "active":
        out.append("The marketplace has to approve your seller account first.")
    if p.category_contract.status != CategoryContract.Status.PUBLISHED:
        out.append(f"{p.category.name} has a newer version. Save the product to check its details against it.")
    if contracts.value_errors(p.category_contract, p.attributes or {}, variant=False):
        out.append(f"Fill in the details {p.category.name} asks for.")
    if not any(v.is_active for v in p.variants.all()):  # pyright: ignore[reportAttributeAccessIssue]
        out.append("Add at least one variant that is on sale.")
    return out


def media_view(m: MediaAsset) -> dict[str, Any]:
    return {
        "id": str(m.pk),
        "name": m.original_name,
        "alt_text": m.alt_text,
        "size": m.size_bytes,
        "width": m.width_px,
        "height": m.height_px,
        "sort_order": m.sort_order,
        "scan_status": m.scan_status,
        "processing_status": m.processing_status,
        "rejection_reason": m.rejection_reason or None,
        "url": media_display_url(m) if m.public else None,
        "original_url": original_url(m),
    }


def rule_view(r: PriceRule, siblings: list[PriceRule]) -> dict[str, Any]:
    state, note = pricing.state_of(r, siblings)
    return {
        "id": str(r.pk),
        "variant": str(r.variant_id),  # pyright: ignore[reportAttributeAccessIssue]
        "label": r.label,
        "buyer_group_key": r.buyer_group_key or None,
        "minimum_quantity": r.minimum_quantity,
        "unit": r.unit,
        "unit_price": format(r.unit_price, "f"),
        "priority": r.priority,
        "effective_from": r.effective_from.isoformat(),
        "effective_until": r.effective_until.isoformat() if r.effective_until else None,
        "is_active": r.is_active,
        "state": state,
        "conflict_note": note,
        "explanation": pricing.explain(r, r.variant),
    }


def _catalog_extra(p: Product, request: HttpRequest) -> dict[str, Any]:
    variants = list(p.variants.all())  # pyright: ignore[reportAttributeAccessIssue]
    active = p.category.active_contract()
    rules = {v.pk: list(v.price_rules.all()) for v in variants}  # pyright: ignore[reportAttributeAccessIssue]
    return {
        # Each with `_can`, so the editor offers only the commands this person may run on it.
        "media": [{**media_view(m), "_can": media_asset.permitted(request, m)} for m in p.media.all()],  # pyright: ignore[reportAttributeAccessIssue]
        "price_rules": [
            {**rule_view(r, rules[v.pk]), "_can": price_rule.permitted(request, r)}
            for v in variants
            for r in rules[v.pk]
        ],
        "variant_count": len(variants),
        "variants": [variant_view(v, p) for v in variants],
        "publish_blockers": publish_blockers(p),
        "contract": contract_summary(p.category_contract),
        # A newer published version the product will move to when it is next saved.
        "newer_contract": contract_summary(active) if active and active.pk != p.category_contract_id else None,  # pyright: ignore[reportAttributeAccessIssue]
        "public_url": f"/products/{p.slug}" if p.status == Product.Status.PUBLISHED else None,
    }


def _unique_slug(name: str) -> str:
    base = slugify(name)[:150] or "product"
    slug, n = base, 2
    while Product.objects.filter(slug=slug).exists() and n < 100:
        slug, n = f"{base}-{n}", n + 1
    return slug


def _contract_ref(value: Any) -> CategoryContract:
    return relation_ref(
        CategoryContract.objects.filter(status=CategoryContract.Status.PUBLISHED).select_related("category"),
        value,
        "category_contract",
        "Choose a category.",
    )


def _create_product(request: HttpRequest, data: dict[str, Any]) -> Product:
    org = _seller_org(request)
    contract = _contract_ref(data.pop("category_contract", None))
    if not data.get("slug"):
        data["slug"] = _unique_slug(str(data.get("name") or ""))
    return Product(seller=org, category_contract=contract, category=contract.category, **data)


def _update_product(request: HttpRequest, p: Product, changes: dict[str, Any]) -> None:
    if p.status == Product.Status.ARCHIVED:
        fail(ErrorCode.CONFLICT, "Restore the product before you change it.")
    if "category_contract" in changes:
        changes["category_contract"] = _contract_ref(changes["category_contract"])
    elif p.category_contract.status != CategoryContract.Status.PUBLISHED:
        # Saving moves a product onto its category's published version, and checks it there.
        changes["category_contract"] = p.category.active_contract() or p.category_contract
    if changes.get("slug") == "":
        changes["slug"] = _unique_slug(changes.get("name") or p.name)
    for k, v in changes.items():
        setattr(p, k, v)
    p.category = p.category_contract.category


def _move_product(to: str):
    def run(request: HttpRequest, p: Product, data: dict[str, Any]) -> None:
        if to == Product.Status.PUBLISHED:
            blockers = publish_blockers(p)
            if blockers:
                fail(ErrorCode.CONFLICT, blockers[0], {"status": blockers})
        p.status = to
        if to != Product.Status.PUBLISHED:
            p.published_at = None
        p.full_clean()
        p.save()

    return run


catalog_product = register(
    Resource(
        key="catalog_product",
        path="catalog/products",
        model=Product,
        label="Product",
        label_plural="Products",
        display_field="name",
        fields=(
            derive(Product, "id"),
            derive(Product, "primary_image", type="image", widget="image", read_only=True, weight=5),
            derive(Product, "name", weight=10),
            derive(
                Product,
                "category_contract",
                relation={"model": "category_contract", "display": "name"},
                weight=12,
            ),
            derive(
                Product,
                "category",
                read_only=True,
                relation={"model": "category", "display": "name"},
                filter=("eq", "in"),
                weight=13,
            ),
            derive(Product, "brand", weight=14),
            derive(Product, "short_description", weight=15),
            derive(Product, "description", type="richtext", widget="richtext", weight=20),
            derive(Product, "attributes", weight=25),
            derive(
                Product,
                "slug",
                required=False,
                help="The public address. Leave empty to make one from the name.",
                group="listing",
                weight=30,
            ),
            derive(Product, "available_from", group="listing", weight=31),
            derive(Product, "available_until", group="listing", weight=32),
            derive(Product, "seo_title", group="search", weight=40),
            derive(Product, "seo_description", group="search", weight=41),
            derive(Product, "status", widget="status", tones=STATUS_TONES, read_only=True, filter=("in",)),
            Field("variant_count", "integer", "integer", label="Variants", read_only=True),
            derive(Product, "published_at", read_only=True, widget="relative-time"),
            derive(Product, "updated_at", read_only=True, widget="relative-time"),
        ),
        list_fields=("primary_image", "name", "category", "status", "variant_count", "updated_at"),
        search=("name", "brand"),
        ordering=("-updated_at", "name"),
        default_page_size=25,
        writable=(
            "name",
            "category_contract",
            "brand",
            "short_description",
            "description",
            "attributes",
            "slug",
            "available_from",
            "available_until",
            "seo_title",
            "seo_description",
        ),
        permissions={
            "list": "catalog_product.list",
            "get": "catalog_product.get",
            "create": "catalog_product.create",
            "update": "catalog_product.update",
        },
        actions=(
            Action(
                "publish",
                "Publish",
                "catalog_product.publish",
                _move_product(Product.Status.PUBLISHED),
                icon="check",
                when={"status": ["draft"]},
            ),
            Action(
                "unpublish",
                "Take off sale",
                "catalog_product.publish",
                _move_product(Product.Status.DRAFT),
                confirm=True,
                tone="warning",
                when={"status": ["published"]},
            ),
            Action(
                "archive",
                "Archive",
                "catalog_product.archive",
                _move_product(Product.Status.ARCHIVED),
                confirm=True,
                tone="danger",
                icon="archive",
                when={"status": ["draft", "published"]},
            ),
            Action(
                "restore",
                "Restore as draft",
                "catalog_product.archive",
                _move_product(Product.Status.DRAFT),
                when={"status": ["archived"]},
            ),
        ),
        hooks={
            "queryset": _own_products,
            "organization_of": lambda p: p.seller,
            "serialize_extra": _catalog_extra,
            "create": _create_product,
            "update": _update_product,
        },
    )
)


# --- variants (SM-F-04) -----------------------------------------------------------------------------


def _own_variants(request: HttpRequest) -> QuerySet[Variant]:
    qs = Variant.objects.select_related("product", "product__category_contract", "product__seller")
    return qs if is_admin(request.user) else qs.filter(seller=active_membership(request).organization)


def _create_variant(request: HttpRequest, data: dict[str, Any]) -> Variant:
    owner = Product.objects.all() if is_admin(request.user) else Product.objects.filter(seller=_seller_org(request))
    p = relation_ref(owner, data.pop("product", None), "product", "Choose one of your products.")
    if p.status == Product.Status.ARCHIVED:
        fail(ErrorCode.CONFLICT, "Restore the product before you add variants.")
    return Variant(product=p, seller=p.seller, **data)


def _update_variant(request: HttpRequest, v: Variant, changes: dict[str, Any]) -> None:
    if "product" in changes:
        invalid({"product": ["A variant stays with its product."]})
    for k, val in changes.items():
        setattr(v, k, val)


def _variant_extra(v: Variant, request: HttpRequest) -> dict[str, Any]:
    view = variant_view(v, v.product)
    return {"pack_label": view["pack_label"], "normalised_price": view["normalised_price"], "stock": view["stock"]}


variant = register(
    Resource(
        key="variant",
        path="catalog/variants",
        model=Variant,
        label="Variant",
        label_plural="Variants",
        display_field="sku",
        fields=(
            derive(Variant, "id"),
            derive(
                Variant, "product", relation={"model": "catalog_product", "display": "name"}, filter=("eq",), weight=5
            ),
            derive(Variant, "sku", widget="code", weight=10),
            derive(Variant, "attributes", weight=15),
            derive(Variant, "packaging_unit", weight=20),
            derive(Variant, "units_per_pack", weight=25),
            derive(Variant, "minimum_order_quantity", weight=30),
            derive(Variant, "unit_price", widget="currency", currency="KES", weight=35),
            derive(Variant, "stock_on_hand", weight=40),
            derive(Variant, "is_active", filter=("eq",), weight=45),
            Field("pack_label", "string", "text", label="Pack", read_only=True, weight=50),
            derive(Variant, "updated_at", read_only=True, widget="relative-time"),
        ),
        list_fields=("sku", "pack_label", "unit_price", "minimum_order_quantity", "stock_on_hand", "is_active"),
        search=("sku",),
        ordering=("unit_price", "sku", "-updated_at"),
        default_page_size=50,
        writable=(
            "product",
            "sku",
            "attributes",
            "packaging_unit",
            "units_per_pack",
            "minimum_order_quantity",
            "unit_price",
            "stock_on_hand",
            "is_active",
        ),
        permissions={
            "list": "variant.list",
            "get": "variant.get",
            "create": "variant.create",
            "update": "variant.update",
        },
        hooks={
            "queryset": _own_variants,
            "organization_of": lambda v: v.seller,
            "serialize_extra": _variant_extra,
            "create": _create_variant,
            "update": _update_variant,
        },
    )
)


def comparable(ids: list[str]) -> dict[str, Any]:
    """ComparisonState (SM-F-09): published products side by side on their category's comparable attributes.

    A projection only: nothing is stored. Values are each product's own; a value it does not state is listed
    in `missing_value_keys` so the table shows the gap instead of shifting. Prices are the cheapest active
    variant's, also per the contract's normalised unit; stock is buyer-visible state, not warehouse counts.
    """
    found = {str(p.pk): p for p in storefront().filter(pk__in=ids).prefetch_related("variants", "media")}
    rows = [found[i] for i in ids if i in found]
    if len({p.category_id for p in rows}) > 1:  # pyright: ignore[reportAttributeAccessIssue]
        fail(ErrorCode.CONFLICT, "Compare products from one category at a time.", {"products": ["Mixed categories."]})
    contract = (rows[0].category.active_contract() or rows[0].category_contract) if rows else None
    defs = {a["key"]: a for a in contracts.attributes_of(contract, variant=False)} if contract else {}
    keys = [k for k in (contract.comparison_keys if contract else []) if k in defs]
    products, missing = [], {}
    for p in rows:
        variants = [v for v in p.variants.all() if v.is_active]  # pyright: ignore[reportAttributeAccessIssue]
        lead = min(variants, key=lambda v: (v.unit_price, v.sku))
        view = variant_view(lead, p)
        attrs = p.attributes or {}
        missing[str(p.pk)] = [k for k in keys if attrs.get(k) is None]
        products.append(
            {
                "id": str(p.pk),
                "slug": p.slug,
                "name": p.name,
                "seller": p.seller.seller_profile.public_name,  # pyright: ignore[reportAttributeAccessIssue]
                "image": images_of(p)[0],
                "unit_price": view["unit_price"],
                "unit": view["pack_label"],
                "normalised_price": view["normalised_price"],
                "stock": view["stock"],
                "variant": {"id": view["id"], "sku": view["sku"], "moq": view["moq"]},
                "values": {k: attrs.get(k) for k in keys},
            }
        )
    norm = (contract.unit_rules or {}).get("normalise") if contract else None
    return {
        "category_contract": {"id": str(contract.pk), "name": contract.name, "version": contract.version}
        if contract
        else None,
        "category": {"label": rows[0].category.name, "slug": rows[0].category.slug} if rows else None,
        "comparison_keys": keys,
        "fields": [contracts.field_meta(defs[k]) for k in keys],
        "products": products,
        "missing_value_keys": missing,
        "unavailable_ids": [i for i in ids if i not in found],
        "price_context": {
            "as_of": timezone.now().isoformat(),
            "currency": "KES",
            "basis": "Each product's lowest current price per pack",
            "normalised_per": norm.get("per") if norm else None,
        },
    }


# --- photographs (SM-F-05) ------------------------------------------------------------------------------

MEDIA_TONES = {"queued": "neutral", "processing": "info", "ready": "success", "failed": "danger"}
SCAN_TONES = {"pending": "info", "clean": "success", "rejected": "danger", "failed": "warning"}


def _own_media(request: HttpRequest) -> QuerySet[MediaAsset]:
    qs = MediaAsset.objects.select_related("product", "variant")
    return qs if is_admin(request.user) else qs.filter(seller=active_membership(request).organization)


def _update_media(request: HttpRequest, m: MediaAsset, changes: dict[str, Any]) -> None:
    if "variant" in changes:
        changes["variant"] = (
            relation_ref(
                Variant.objects.filter(product=m.product),
                changes["variant"],
                "variant",
                "Choose one of this product's variants.",
            )
            if changes["variant"]
            else None
        )
    for k, v in changes.items():
        setattr(m, k, v)


def _remove_media(request: HttpRequest, m: MediaAsset, data: dict[str, Any]) -> dict[str, Any]:
    remove(m)
    return {"deleted": True}


media_asset = register(
    Resource(
        key="media_asset",
        path="catalog/media",
        model=MediaAsset,
        label="Photograph",
        label_plural="Photographs",
        display_field="original_name",
        fields=(
            derive(MediaAsset, "id"),
            derive(
                MediaAsset,
                "product",
                read_only=True,
                relation={"model": "catalog_product", "display": "name"},
                filter=("eq",),
            ),
            derive(MediaAsset, "variant", relation={"model": "variant", "display": "sku"}),
            derive(MediaAsset, "original_name", read_only=True),
            derive(MediaAsset, "alt_text"),
            derive(MediaAsset, "sort_order"),
            derive(MediaAsset, "mime_type", read_only=True),
            derive(MediaAsset, "size_bytes", read_only=True),
            derive(MediaAsset, "width_px", read_only=True),
            derive(MediaAsset, "height_px", read_only=True),
            derive(MediaAsset, "scan_status", widget="status", tones=SCAN_TONES, read_only=True),
            derive(MediaAsset, "processing_status", widget="status", tones=MEDIA_TONES, read_only=True, filter=("in",)),
            derive(MediaAsset, "rejection_reason", read_only=True),
            derive(MediaAsset, "created_at", read_only=True, widget="relative-time"),
        ),
        list_fields=("original_name", "alt_text", "processing_status", "scan_status", "sort_order"),
        search=("original_name", "alt_text"),
        ordering=("sort_order", "-created_at"),
        default_page_size=50,
        writable=("alt_text", "sort_order", "variant"),
        permissions={"list": "media_asset.list", "get": "media_asset.get", "update": "media_asset.update"},
        actions=(
            Action(
                "remove",
                "Remove",
                "media_asset.remove",
                _remove_media,
                kind="archive",
                confirm=True,
                tone="danger",
                icon="trash",
            ),
        ),
        hooks={
            "queryset": _own_media,
            "organization_of": lambda m: m.seller,
            "serialize_extra": lambda m, request: {
                k: v for k, v in media_view(m).items() if k in ("url", "original_url")
            },
            "update": _update_media,
        },
    )
)


# --- price rules and buyer groups (SM-F-06) ---------------------------------------------------------------


def _own_rules(request: HttpRequest) -> QuerySet[PriceRule]:
    qs = PriceRule.objects.select_related("variant", "variant__product")
    return qs if is_admin(request.user) else qs.filter(seller=active_membership(request).organization)


def _create_rule(request: HttpRequest, data: dict[str, Any]) -> PriceRule:
    own = Variant.objects.all() if is_admin(request.user) else Variant.objects.filter(seller=_seller_org(request))
    variant = relation_ref(own, data.pop("variant", None), "variant", "Choose one of your variants.")
    return PriceRule(variant=variant, seller=variant.seller, unit=variant.packaging_unit, **data)


def _update_rule(request: HttpRequest, r: PriceRule, changes: dict[str, Any]) -> None:
    if "variant" in changes:
        invalid({"variant": ["A rule stays with its variant; add a new rule for another one."]})
    for k, v in changes.items():
        setattr(r, k, v)


def _switch(on: bool):
    def run(request: HttpRequest, r: PriceRule, data: dict[str, Any]) -> None:
        r.is_active = on
        r.save(update_fields=["is_active", "updated_at"])

    return run


price_rule = register(
    Resource(
        key="price_rule",
        path="catalog/price-rules",
        model=PriceRule,
        label="Price rule",
        label_plural="Price rules",
        display_field="label",
        fields=(
            derive(PriceRule, "id"),
            derive(PriceRule, "variant", relation={"model": "variant", "display": "sku"}, filter=("eq",), weight=5),
            derive(PriceRule, "label", weight=10),
            derive(PriceRule, "buyer_group_key", widget="text", filter=("in",), weight=15),
            derive(PriceRule, "minimum_quantity", weight=20),
            derive(PriceRule, "unit_price", widget="currency", currency="KES", weight=25),
            derive(PriceRule, "priority", weight=30),
            derive(PriceRule, "effective_from", weight=35),
            derive(PriceRule, "effective_until", weight=40),
            derive(PriceRule, "is_active", filter=("eq",), weight=45),
            derive(PriceRule, "unit", read_only=True),
            derive(PriceRule, "currency", read_only=True),
            derive(PriceRule, "updated_at", read_only=True, widget="relative-time"),
        ),
        list_fields=("label", "variant", "buyer_group_key", "minimum_quantity", "unit_price", "is_active"),
        search=("label",),
        ordering=("-updated_at", "minimum_quantity"),
        default_page_size=50,
        writable=(
            "variant",
            "label",
            "buyer_group_key",
            "minimum_quantity",
            "unit_price",
            "priority",
            "effective_from",
            "effective_until",
            "is_active",
        ),
        permissions={
            "list": "price_rule.list",
            "get": "price_rule.get",
            "create": "price_rule.create",
            "update": "price_rule.update",
        },
        actions=(
            Action(
                "switch_off",
                "Switch off",
                "price_rule.update",
                _switch(False),
                confirm=True,
                icon="pause",
                when={"is_active": ["true"]},
            ),
            Action(
                "switch_on",
                "Switch on",
                "price_rule.update",
                _switch(True),
                icon="check",
                when={"is_active": ["false"]},
            ),
        ),
        hooks={
            "queryset": _own_rules,
            "organization_of": lambda r: r.seller,
            "serialize_extra": lambda r, request: rule_view(r, list(PriceRule.objects.filter(variant_id=r.variant_id))),
            "create": _create_rule,
            "update": _update_rule,
        },
    )
)


def _own_members(request: HttpRequest) -> QuerySet[BuyerGroupMember]:
    qs = BuyerGroupMember.objects.select_related("buyer")
    return qs if is_admin(request.user) else qs.filter(seller=active_membership(request).organization)


def _create_member(request: HttpRequest, data: dict[str, Any]) -> BuyerGroupMember:
    seller = _seller_org(request)
    buyers = Organization.objects.filter(organization_type=Organization.Type.BUYER, approval_state="approved")
    buyer = relation_ref(buyers, data.pop("buyer", None), "buyer", "Choose an approved buyer organization.")
    return BuyerGroupMember(seller=seller, buyer=buyer, **data)


def _remove_member(request: HttpRequest, m: BuyerGroupMember, data: dict[str, Any]) -> dict[str, Any]:
    m.delete()
    return {"deleted": True}


buyer_group_member = register(
    Resource(
        key="buyer_group_member",
        path="catalog/buyer-groups",
        model=BuyerGroupMember,
        label="Buyer group member",
        label_plural="Buyer groups",
        display_field="group_key",
        fields=(
            derive(BuyerGroupMember, "id"),
            derive(BuyerGroupMember, "buyer", relation={"model": "organization", "display": "name"}, filter=("eq",)),
            derive(BuyerGroupMember, "group_key", widget="text", filter=("in",)),
            derive(BuyerGroupMember, "created_at", read_only=True, widget="relative-time"),
        ),
        list_fields=("buyer", "group_key", "created_at"),
        ordering=("group_key", "-created_at"),
        default_page_size=100,
        writable=("buyer", "group_key"),
        permissions={"list": "buyer_group.list", "get": "buyer_group.list", "create": "buyer_group.create"},
        actions=(
            Action("remove", "Remove from group", "buyer_group.remove", _remove_member, kind="archive", icon="trash"),
        ),
        hooks={
            "queryset": _own_members,
            "organization_of": lambda m: m.seller,
            "create": _create_member,
        },
    )
)
