"""SM-F-11 quote resources: buyers request (from their cart's lines for one seller), sellers respond or
decline, buyers accept (which places the order at the offered prices) or decline; open quotes expire.

A quote belongs to both organizations; `can` offers each side only its own commands in the quote's state.
Expiry is applied lazily whenever quotes are read (and by `manage.py expire_quotes` for schedulers).
"""

from datetime import timedelta
from decimal import Decimal, InvalidOperation
from typing import Any

from django.db.models import Q, QuerySet
from django.http import HttpRequest
from django.utils import timezone

from apps.carts.services import active_cart, buyer_org
from apps.catalog import contracts
from apps.catalog.pricing import resolve
from apps.catalog.resources import relation_ref
from apps.orders.checkout import next_reference, place_from_quote
from apps.orders.lifecycle import tell
from apps.organizations.models import Address, Organization
from apps.organizations.tenancy import active_membership, is_admin
from apps.quotes.models import Quote, QuoteLine
from core.api import fail, invalid
from core.operations.registry import Action, Field, Resource, action_input, derive, register
from core.result import ErrorCode

QUOTE_TONES = {
    "requested": "info",
    "responded": "signal",
    "accepted": "success",
    "declined": "danger",
    "expired": "neutral",
    "cancelled": "neutral",
}
MAX_VALIDITY = timedelta(days=30)
MIN_VALIDITY = timedelta(hours=2)
BUYER_ACTIONS = {"accept", "decline_offer", "cancel"}
SELLER_ACTIONS = {"respond", "decline"}


def expire_due() -> int:
    return Quote.objects.filter(status__in=Quote.OPEN, expires_at__lt=timezone.now()).update(
        status=Quote.Status.EXPIRED
    )


def _quotes(request: HttpRequest) -> QuerySet[Quote]:
    expire_due()
    qs = Quote.objects.select_related(
        "buyer_organization", "seller_organization__seller_profile", "requested_by", "delivery_address"
    ).prefetch_related("lines", "orders")
    if is_admin(request.user):
        return qs
    org = active_membership(request).organization
    return qs.filter(Q(buyer_organization=org) | Q(seller_organization=org))


def side_of(request: HttpRequest, q: Quote) -> str | None:
    if is_admin(request.user):
        return None
    org_id = active_membership(request).organization_id  # pyright: ignore[reportAttributeAccessIssue]
    return "buyer" if org_id == q.buyer_organization_id else "seller" if org_id == q.seller_organization_id else None  # pyright: ignore[reportAttributeAccessIssue]


def seller_name(q: Quote) -> str:
    profile = getattr(q.seller_organization, "seller_profile", None)
    return profile.public_name if profile else q.seller_organization.name


def _quote_extra(q: Quote, request: HttpRequest) -> dict[str, Any]:
    lines = list(q.lines.all())  # pyright: ignore[reportAttributeAccessIssue]
    listed = sum((line.list_price * line.quantity for line in lines), Decimal("0"))
    offered = sum(
        ((line.offered_price if line.offered_price is not None else line.list_price) * line.quantity for line in lines),
        Decimal("0"),
    )
    order = next(iter(q.orders.all()), None)  # pyright: ignore[reportAttributeAccessIssue]  (prefetched)
    return {
        "side": side_of(request, q),
        "seller": {"id": str(q.seller_organization.pk), "label": seller_name(q)},
        "buyer": {"id": str(q.buyer_organization.pk), "label": q.buyer_organization.name},
        "lines": [
            {
                "id": str(line.pk),
                "product": line.product_name,
                "sku": line.sku,
                "pack_label": line.pack_label,
                "quantity": line.quantity,
                "unit": line.unit,
                "list_price": format(line.list_price, "f"),
                "offered_price": format(line.offered_price, "f") if line.offered_price is not None else None,
            }
            for line in lines
        ],
        "list_total": format(listed, "f"),
        "offered_total": format(offered, "f"),
        "order": {"id": str(order.pk), "order_number": order.order_number} if order else None,
    }


def _can(request: HttpRequest, q: Quote, names: list[str]) -> list[str]:
    side = side_of(request, q)
    allowed: set[str] = set()
    if side == "buyer":
        if q.status == Quote.Status.RESPONDED:
            allowed |= {"accept", "decline_offer"}
        if q.status == Quote.Status.REQUESTED:
            allowed.add("cancel")
    elif side == "seller" and q.status in Quote.OPEN:
        allowed |= {"respond", "decline"}
    return [n for n in names if n in allowed]


def _create(request: HttpRequest, data: dict[str, Any]) -> Quote:
    """Ask one seller for prices on the buyer's cart lines from that seller; those lines move to the quote."""
    buyer = buyer_org(request)
    sellers = Organization.objects.filter(
        organization_type=Organization.Type.SELLER,
        approval_state="approved",
        seller_profile__activation_status="active",
    )
    seller = relation_ref(sellers, data.pop("seller_organization", None), "seller_organization", "Choose a seller.")
    address = relation_ref(
        Address.objects.filter(organization=buyer),
        data.pop("delivery_address", None),
        "delivery_address",
        "Choose one of your organization's addresses.",
    )
    expires = data.get("expires_at")
    now = timezone.now()
    if expires is None or expires < now + MIN_VALIDITY or expires > now + MAX_VALIDITY:
        invalid({"expires_at": ["Give the seller between two hours and thirty days to respond."]})
    cart = active_cart(request)
    lines = list(cart.lines.filter(seller=seller).select_related("variant__product__category_contract")) if cart else []  # pyright: ignore[reportAttributeAccessIssue]
    if not lines:
        invalid(
            {"seller_organization": ["Add this seller's products to your cart first; the quote asks for those lines."]}
        )
    q = Quote(
        reference=next_reference(Quote, "reference", "QT"),
        buyer_organization=buyer,
        seller_organization=seller,
        requested_by=request.user,
        delivery_address=address,
        **data,
    )
    q._pending_lines = lines  # written after the quote is saved (see the post-save in `_after_create`)  # pyright: ignore[reportAttributeAccessIssue]
    return q


def _after_create(q: Quote, request: HttpRequest) -> None:
    for line in getattr(q, "_pending_lines", []):
        v, p = line.variant, line.variant.product
        QuoteLine.objects.create(
            quote=q,
            variant=v,
            product_name=p.name,
            sku=v.sku,
            pack_label=contracts.pack_label(p.category_contract, p.attributes or {}, v),
            quantity=line.quantity,
            unit=v.packaging_unit,
            list_price=resolve(v, q.buyer_organization, line.quantity).unit_price,
        )
        line.delete()
    tell(
        q.seller_organization,
        ("seller_manager",),
        event_key="quote",
        event_id=f"quote:{q.pk}:requested",
        message="quote.requested",
        params={"quote": q.reference, "buyer": q.buyer_organization.name},
        link=f"/sell/quotes/{q.pk}",
    )


def _action(name: str) -> Action:
    return next(a for a in quote.actions if a.name == name)


def _open(q: Quote) -> None:
    if q.expires_at < timezone.now():
        q.status = Quote.Status.EXPIRED
        q.save(update_fields=["status", "updated_at"])
        fail(ErrorCode.CONFLICT, "This quote has expired. Request a new one.")


def _respond(request: HttpRequest, q: Quote, data: dict[str, Any]) -> None:
    if side_of(request, q) != "seller":
        fail(ErrorCode.FORBIDDEN)
    _open(q)
    values = action_input(quote, _action("respond"), data, ("offers",))
    offers = values["offers"]
    lines = list(q.lines.all())  # pyright: ignore[reportAttributeAccessIssue]
    if not isinstance(offers, dict) or set(offers) != {str(line.pk) for line in lines}:
        invalid({"offers": ["Give an offer for every line."]})
    for line in lines:
        try:
            price = Decimal(str(offers[str(line.pk)]))
        except (InvalidOperation, ValueError):
            invalid({"offers": [f"The offer for {line.product_name} is not a price."]})
        if not price.is_finite() or price < 0:
            invalid({"offers": [f"The offer for {line.product_name} cannot be negative."]})
        line.offered_price = price.quantize(Decimal("0.01"))
        line.save(update_fields=["offered_price"])
    q.seller_notes = values.get("seller_notes", q.seller_notes) or ""
    q.status, q.responded_at, q.version = Quote.Status.RESPONDED, timezone.now(), q.version + 1
    q.save()
    tell(
        q.buyer_organization,
        ("buyer_owner", "buyer_purchaser"),
        event_key="quote",
        event_id=f"quote:{q.pk}:responded:{q.version}",
        message="quote.responded",
        params={"quote": q.reference, "seller": seller_name(q)},
        link=f"/quotes/{q.pk}",
    )


def _decline(request: HttpRequest, q: Quote, data: dict[str, Any]) -> None:
    if side_of(request, q) != "seller":
        fail(ErrorCode.FORBIDDEN)
    values = action_input(quote, _action("decline"), data, ("seller_notes",))
    q.seller_notes, q.status = values["seller_notes"], Quote.Status.DECLINED
    q.save()
    tell(
        q.buyer_organization,
        ("buyer_owner", "buyer_purchaser"),
        event_key="quote",
        event_id=f"quote:{q.pk}:declined",
        message="quote.declined",
        params={"quote": q.reference, "by": seller_name(q), "reason": q.seller_notes},
        link=f"/quotes/{q.pk}",
    )


def _accept(request: HttpRequest, q: Quote, data: dict[str, Any]) -> dict[str, Any]:
    if side_of(request, q) != "buyer":
        fail(ErrorCode.FORBIDDEN)
    _open(q)
    if q.status != Quote.Status.RESPONDED:
        fail(ErrorCode.CONFLICT, "Only a quote the seller has answered can be accepted.")
    q.status, q.accepted_at = Quote.Status.ACCEPTED, timezone.now()
    q.save()
    order = place_from_quote(request, q)
    tell(
        q.seller_organization,
        ("seller_manager",),
        event_key="quote",
        event_id=f"quote:{q.pk}:accepted",
        message="quote.accepted",
        params={"quote": q.reference, "buyer": q.buyer_organization.name, "order": order.order_number},
        link=f"/sell/quotes/{q.pk}",
    )
    return {
        **quote.serialize(q, request),
        "order": {"id": str(order.pk), "order_number": order.order_number, "status": order.status},
    }


def _buyer_close(to: str):
    def run(request: HttpRequest, q: Quote, data: dict[str, Any]) -> None:
        if side_of(request, q) != "buyer":
            fail(ErrorCode.FORBIDDEN)
        q.status = to
        q.save(update_fields=["status", "updated_at"])
        tell(
            q.seller_organization,
            ("seller_manager",),
            event_key="quote",
            event_id=f"quote:{q.pk}:{to}",
            message="quote.declined",
            params={"quote": q.reference, "by": q.buyer_organization.name, "reason": "-"},
            link=f"/sell/quotes/{q.pk}",
        )

    return run


quote = register(
    Resource(
        key="quote",
        path="quotes",
        model=Quote,
        label="Quote",
        label_plural="Quotes",
        display_field="reference",
        versioned=True,
        fields=(
            derive(Quote, "id"),
            derive(Quote, "reference", read_only=True, widget="code"),
            derive(
                Quote,
                "seller_organization",
                relation={"model": "organization", "display": "name"},
                filter=("eq", "in"),
                weight=10,
            ),
            derive(
                Quote,
                "buyer_organization",
                read_only=True,
                relation={"model": "organization", "display": "name"},
                filter=("eq", "in"),
            ),
            derive(Quote, "requested_by", read_only=True, relation={"model": "user", "display": "display_name"}),
            derive(Quote, "delivery_address", relation={"model": "address", "display": "label"}, weight=20),
            derive(Quote, "expires_at", weight=30),
            derive(Quote, "buyer_notes", weight=40),
            derive(Quote, "seller_notes", weight=50),
            derive(Quote, "status", widget="status", tones=QUOTE_TONES, read_only=True, filter=("in",)),
            derive(Quote, "responded_at", read_only=True, widget="relative-time"),
            derive(Quote, "accepted_at", read_only=True, widget="relative-time"),
            derive(Quote, "created_at", read_only=True, widget="relative-time", filter=("range",)),
            Field(
                "offers",
                "json",
                "json",
                label="Offers",
                help="Your price per pack for each line, by line.",
                input_only=True,
            ),
        ),
        list_fields=("reference", "seller_organization", "buyer_organization", "status", "expires_at", "created_at"),
        search=("reference",),
        ordering=("-created_at", "expires_at"),
        default_page_size=25,
        writable=("seller_organization", "delivery_address", "expires_at", "buyer_notes"),
        permissions={"list": "quote.list", "get": "quote.get", "create": "quote.create"},
        actions=(
            Action(
                "respond",
                "Send offer",
                "quote.respond",
                _respond,
                input=("offers", "seller_notes"),
                icon="check",
                when={"status": ["requested", "responded"]},
            ),
            Action(
                "decline",
                "Decline",
                "quote.respond",
                _decline,
                input=("seller_notes",),
                tone="danger",
                when={"status": ["requested", "responded"]},
            ),
            Action(
                "accept",
                "Accept and order",
                "quote.accept",
                _accept,
                confirm=True,
                icon="check",
                when={"status": ["responded"]},
            ),
            Action(
                "decline_offer",
                "Decline offer",
                "quote.accept",
                _buyer_close(Quote.Status.DECLINED),
                confirm=True,
                tone="danger",
                when={"status": ["responded"]},
            ),
            Action(
                "cancel",
                "Cancel request",
                "quote.accept",
                _buyer_close(Quote.Status.CANCELLED),
                confirm=True,
                tone="danger",
                when={"status": ["requested"]},
            ),
        ),
        hooks={
            "queryset": _quotes,
            "organization_of": lambda q: [q.buyer_organization, q.seller_organization],
            "serialize_extra": _quote_extra,
            "create": _create,
            "after_create": _after_create,
            "can": _can,
        },
    )
)
