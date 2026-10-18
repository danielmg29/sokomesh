"""Catalogue workflow views: comparison (SM-F-09), photographs (SM-F-05) and price resolution (SM-F-06).

These are projections and byte streams rather than records, so they are views over the catalogue, not
registered resources. Every rule they apply lives in the catalogue modules they call.
"""

import uuid
from typing import Any

from django.conf import settings
from django.core.files.storage import default_storage
from django.db.models import Count, Max
from django.http import FileResponse, HttpRequest

from apps.catalog import media, pricing
from apps.catalog.models import BuyerGroupMember, MediaAsset, Product, Variant
from apps.catalog.resources import COMPARE_LIMIT, comparable, media_view
from apps.organizations.models import Organization
from apps.organizations.tenancy import active_membership, active_memberships, is_admin
from core.api import Created, endpoint, fail, invalid
from core.policies import allowed
from core.result import ErrorCode


@endpoint("GET", auth=False)
def compare(request: HttpRequest) -> dict[str, Any]:
    """GET compare?products=<id>,<id>: from one to COMPARE_LIMIT published products of one category."""
    ids = list(dict.fromkeys(x.strip() for x in request.GET.get("products", "").split(",") if x.strip()))
    if not ids:
        invalid({"products": ["Choose products to compare."]})
    if len(ids) > COMPARE_LIMIT:
        invalid({"products": [f"Compare at most {COMPARE_LIMIT} products at a time."]})
    try:
        ids = [str(uuid.UUID(i)) for i in ids]
    except ValueError:
        invalid({"products": ["One of the products is not recognised."]})
    return comparable(ids)


# --- photographs ------------------------------------------------------------------------------------------


def _uuid(raw: str) -> uuid.UUID:
    try:
        return uuid.UUID(raw)
    except ValueError:
        fail(ErrorCode.NOT_FOUND)


@endpoint("POST")
def upload_media(request: HttpRequest, ref: str) -> Any:
    """POST catalog/products/<id>/media (multipart `file`, optional `alt_text`): queue a photograph."""
    limit = settings.AC_UPLOADS["product_image"]["max_bytes"]
    if int(request.META.get("CONTENT_LENGTH") or 0) > limit + 65_536:  # refuse before reading the body
        invalid({"file": [f"Photographs can be up to {limit // 1_048_576} MB."]})
    product = Product.objects.select_related("seller").filter(pk=_uuid(ref)).first()
    if product is None or not allowed(request.user, "media_asset.create", product.seller):
        fail(ErrorCode.NOT_FOUND)
    upload = request.FILES.get("file")
    if upload is None:
        invalid({"file": ["Choose a photograph to upload."]})
    asset = media.accept_upload(product, upload, alt_text=request.POST.get("alt_text", ""))
    asset.refresh_from_db()
    return Created(media_view(asset))


def _seller_member(request: HttpRequest, asset: MediaAsset) -> bool:
    user = request.user
    if not getattr(user, "is_authenticated", False):
        return False
    return is_admin(user) or active_memberships(user).filter(organization_id=asset.seller_id).exists()  # pyright: ignore[reportAttributeAccessIssue]


@endpoint("GET", auth=False)
def media_display(request: HttpRequest, asset_id: str) -> Any:
    """The public display copy (metadata stripped) of a ready photograph of a product buyers can see.

    Cacheable for a year: a changed photograph is a new asset with a new address. Photographs that are not
    public yet are shown only to the seller's own people, never cached.
    """
    asset = MediaAsset.objects.select_related("product__search").filter(pk=_uuid(asset_id)).first()
    if asset is None:
        fail(ErrorCode.NOT_FOUND)
    doc = getattr(asset.product, "search", None) if asset.product else None
    visible = asset.public and doc is not None and doc.is_published
    if not visible and not (asset.public and _seller_member(request, asset)):
        fail(ErrorCode.NOT_FOUND)
    response = FileResponse(
        default_storage.open(asset.derivatives["display"]["key"], "rb"), content_type=asset.mime_type
    )
    response["Cache-Control"] = "public, max-age=31536000, immutable" if visible else "private, no-store"
    response["X-Content-Type-Options"] = "nosniff"
    response["ETag"] = f'"{asset.sha256[:32]}"'
    return response


@endpoint("GET", auth=False)
def media_original(request: HttpRequest, asset_id: str) -> Any:
    """The private original, through a short-lived signed link handed only to the seller's own people."""
    asset = MediaAsset.objects.filter(pk=_uuid(asset_id)).first()
    if asset is None or not media.check_original_token(str(asset.pk), request.GET.get("t", "")):
        fail(ErrorCode.NOT_FOUND)
    response = FileResponse(default_storage.open(asset.object_key, "rb"), content_type=asset.mime_type)
    safe = "".join(c for c in asset.original_name if c.isalnum() or c in " ._-")[:120] or "photo"
    response["Content-Disposition"] = f'attachment; filename="{safe}"'
    response["Cache-Control"] = "private, no-store"
    response["X-Content-Type-Options"] = "nosniff"
    return response


# --- prices -----------------------------------------------------------------------------------------------


def _buyer_of(request: HttpRequest) -> Organization | None:
    if not getattr(request.user, "is_authenticated", False) or not active_memberships(request.user).exists():
        return None
    org = active_membership(request).organization
    return org if org.organization_type == Organization.Type.BUYER else None


@endpoint("GET", auth=False)
def prices(request: HttpRequest) -> dict[str, Any]:
    """GET prices?variant=<id>&quantity=<packs>: the PriceResolution for this buyer (or any buyer, signed out)
    with the quantity tiers they get. The client never picks a rule; it shows the answer and its reason."""
    variant = (
        Variant.objects.select_related("product__search")
        .prefetch_related("price_rules")
        .filter(pk=_uuid(request.GET.get("variant", "")))
        .first()
    )
    doc = getattr(variant.product, "search", None) if variant else None
    if variant is None or not variant.is_active or doc is None or not doc.is_published:
        fail(ErrorCode.NOT_FOUND)
    raw = request.GET.get("quantity") or str(variant.minimum_order_quantity)
    if not raw.isdigit() or not 1 <= int(raw) <= 100_000:
        invalid({"quantity": ["Use a whole number of packs."]})
    buyer = _buyer_of(request)
    resolution = pricing.resolve(variant, buyer, int(raw))
    return {
        **resolution.as_dict(),
        "quantity": int(raw),
        "personal": buyer is not None,
        "tiers": pricing.tiers(variant, buyer),
    }


@endpoint("GET")
def buyers(request: HttpRequest) -> dict[str, Any]:
    """GET catalog/buyers: the buyer organizations this seller trades with (orders, quotes or groups) and the
    price groups each is in, for the seller's price-group page."""
    org = active_membership(request).organization
    if org.organization_type != Organization.Type.SELLER or not allowed(request.user, "buyer_group.list", org):
        fail(ErrorCode.FORBIDDEN)
    from apps.orders.models import Order
    from apps.quotes.models import Quote

    # Only orders that reached this seller: one still awaiting the buyer's approval is not theirs to see.
    sent = Order.objects.filter(seller_organization=org, transitions__to_status=Order.Status.SUBMITTED).values("pk")
    traded = (
        Order.objects.filter(pk__in=sent).values("buyer_organization").annotate(n=Count("pk"), last=Max("submitted_at"))
    )
    orders = {r["buyer_organization"]: r for r in traded}
    quoted = set(Quote.objects.filter(seller_organization=org).values_list("buyer_organization", flat=True))
    members = BuyerGroupMember.objects.filter(seller=org)
    grouped: dict[Any, list[dict[str, str]]] = {}
    for m in members:
        grouped.setdefault(m.buyer_id, []).append({"id": str(m.pk), "group_key": m.group_key})  # pyright: ignore[reportAttributeAccessIssue]
    ids = set(orders) | quoted | set(grouped)
    rows = []
    for buyer in Organization.objects.filter(pk__in=ids).prefetch_related("addresses").order_by("name")[:200]:
        place = next(iter(buyer.addresses.all()), None)  # pyright: ignore[reportAttributeAccessIssue]
        stats = orders.get(buyer.pk, {})
        rows.append(
            {
                "id": str(buyer.pk),
                "name": buyer.name,
                "city": place.city if place else None,
                "orders": stats.get("n", 0),
                "last_order_at": stats["last"].isoformat() if stats.get("last") else None,
                "groups": grouped.get(buyer.pk, []),
            }
        )
    keys = sorted({m.group_key for m in members})
    return {"results": rows, "groups": [{"value": k, "label": pricing.group_label(k)} for k in keys]}
