"""SM-F-08 search documents: each product as buyers search it, rebuilt from the database.

The database stays authoritative: a document is a projection, rebuilt whenever a product, one of its
variants, its seller's activation or its seller's address changes (apps.catalog.signals). It runs in the
same transaction as the change for now; when the background worker arrives with the media pipeline
(SM-F-05) the rebuild moves there unchanged. `is_published` is the hard gate for buyer results, and the
public product list also re-checks the seller's standing, so a stale document never exposes a product.
"""

from django.utils import timezone

from apps.catalog import contracts
from apps.catalog.models import Product, SearchDocument


def visible(p: Product) -> bool:
    profile = getattr(p.seller, "seller_profile", None)
    now = timezone.now()
    return (
        p.status == Product.Status.PUBLISHED
        and p.seller.approval_state == "approved"
        and profile is not None
        and profile.activation_status == "active"
        and (p.available_from is None or p.available_from <= now)
        and (p.available_until is None or p.available_until > now)
    )


def index(p: Product) -> SearchDocument:
    contract = p.category_contract
    variants = [v for v in p.variants.all() if v.is_active]  # pyright: ignore[reportAttributeAccessIssue]
    lead = min(variants, key=lambda v: (v.unit_price, v.sku)) if variants else None
    tracked = [v.stock_on_hand for v in variants if v.stock_on_hand is not None]
    defs = {a["key"]: a for a in contracts.attributes_of(contract)}
    words = [
        p.brand,
        p.short_description,
        p.description_text,
        *(v.sku for v in variants),
        *(contracts.display_value(defs[k], v) for k, v in (p.attributes or {}).items() if k in defs),
    ]
    place = p.seller.addresses.order_by("created_at").first()  # pyright: ignore[reportAttributeAccessIssue]
    doc, _ = SearchDocument.objects.update_or_create(
        product=p,
        defaults={
            "seller_id": p.seller_id,  # pyright: ignore[reportAttributeAccessIssue]
            "category_contract": contract,
            "title": p.name,
            "body_text": "\n".join(w for w in words if w)[:20_000],
            "facet_values": contracts.facet_values(contract, p.attributes or {}, variants),
            "min_price": lead.unit_price if lead else None,
            "available_quantity": sum(tracked) if tracked else None,
            # Untracked stock is not "out": only a reported count of zero takes a product out of stock.
            "in_stock": any(v.stock_state() != "unavailable" for v in variants),
            "lead": {
                "id": str(lead.pk),
                "sku": lead.sku,
                "pack_label": contracts.pack_label(contract, p.attributes or {}, lead),
                "moq": lead.minimum_order_quantity,
                "unit_price": format(lead.unit_price, "f"),
            }
            if lead
            else {},
            "seller_city": place.city if place else "",
            "is_published": visible(p) and lead is not None,
            "indexed_at": timezone.now(),
        },
    )
    return doc


def index_many(products) -> int:
    """Rebuild documents for a queryset of products (a seller's catalogue, or everything), in bounded batches."""
    n = 0
    qs = products.select_related("seller", "seller__seller_profile", "category_contract").prefetch_related("variants")
    for p in qs.iterator(chunk_size=200):
        index(p)
        n += 1
    return n
