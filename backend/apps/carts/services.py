"""Cart rules shared by the cart resources and the reorder command: who may buy, and how a cart reads."""

from decimal import Decimal
from typing import Any

from django.http import HttpRequest
from django.utils import timezone

from apps.carts.models import Cart, CartLine, on_sale
from apps.catalog.resources import stock_of, variant_view
from apps.organizations.models import Organization
from apps.organizations.tenancy import active_membership
from core.api import fail
from core.result import ErrorCode


def buyer_org(request: HttpRequest) -> Organization:
    """The approved buyer organization the request acts for; anyone else is refused with the reason."""
    org = active_membership(request).organization
    if org.organization_type != Organization.Type.BUYER:
        fail(ErrorCode.FORBIDDEN, "Carts belong to buyer organizations. Switch to one to order.")
    if org.approval_state != "approved":
        fail(ErrorCode.CONFLICT, f"{org.name} is waiting for marketplace approval before it can order.")
    return org


def active_cart(request: HttpRequest, *, create: bool = False) -> Cart | None:
    org = active_membership(request).organization
    cart = Cart.objects.filter(buyer_organization=org, created_by=request.user, status=Cart.Status.ACTIVE).first()
    if cart is None and create:
        cart = Cart.objects.create(buyer_organization=buyer_org(request), created_by=request.user)
    return cart


def lines_of(cart: Cart) -> list[CartLine]:
    return list(
        cart.lines.select_related(  # pyright: ignore[reportAttributeAccessIssue]
            "variant",
            "variant__product",
            "variant__product__search",
            "variant__product__category_contract",
            "variant__product__seller__seller_profile",
        )
    )


def line_view(line: CartLine) -> dict[str, Any]:
    """One line as the cart shows it: the quote, today's price, stock, and what (if anything) is wrong."""
    v, p = line.variant, line.variant.product
    view = variant_view(v, p)
    price = format(v.unit_price, "f")
    available = on_sale(v)
    stock = stock_of(v)
    reason = None
    if not available:
        state, reason = "unavailable", "No longer on sale."
    elif stock["state"] == "unavailable":
        state, reason = "unavailable", "Out of stock."
    else:
        state = "changed" if v.unit_price != line.quoted_unit_price else "valid"
        if line.quantity < v.minimum_order_quantity:
            reason = f"The minimum order is now {v.minimum_order_quantity} packs."
        elif v.stock_on_hand is not None and line.quantity > v.stock_on_hand:
            reason = f"Only {v.stock_on_hand} packs are in stock."
    return {
        "id": str(line.pk),
        "product": {"name": p.name, "slug": p.slug, "image": p.primary_image},
        "variant": {"id": str(v.pk), "sku": v.sku, "pack_label": view["pack_label"], "moq": v.minimum_order_quantity},
        "quantity": line.quantity,
        "unit": line.unit,
        "quoted_unit_price": format(line.quoted_unit_price, "f"),
        "unit_price": price,
        "price_validated_at": line.price_validated_at.isoformat(),
        "stock": stock,
        "state": state,
        "reason": reason,
        "seller_id": str(line.seller_id),  # pyright: ignore[reportAttributeAccessIssue]
    }


def cart_view(cart: Cart) -> dict[str, Any]:
    """The cart grouped by seller, with totals at today's prices; unavailable lines are left out of totals."""
    groups: dict[str, dict[str, Any]] = {}
    for line in lines_of(cart):
        view = line_view(line)
        seller = line.variant.product.seller
        doc = getattr(line.variant.product, "search", None)
        group = groups.setdefault(
            str(seller.pk),
            {
                "seller": {
                    "id": str(seller.pk),
                    "label": seller.seller_profile.public_name,  # pyright: ignore[reportAttributeAccessIssue]
                    "city": (doc.seller_city if doc else "") or None,
                },
                "lines": [],
                "subtotal": Decimal("0"),
            },
        )
        group["lines"].append(view)
        if view["state"] != "unavailable":
            group["subtotal"] += Decimal(view["unit_price"]) * line.quantity
    out = list(groups.values())
    total = sum((g["subtotal"] for g in out), Decimal("0"))
    for g in out:
        g["subtotal"] = format(g["subtotal"], "f")
    lines = [line for g in out for line in g["lines"]]
    repriced = sum(1 for line in lines if line["state"] == "changed")
    unavailable = sum(1 for line in lines if line["state"] == "unavailable")
    return {
        "groups": out,
        "line_count": len(lines),
        "subtotal": format(total, "f"),
        "repriced": repriced,
        "unavailable": unavailable,
        # CartBlock's states: lines out of stock block checkout before repricing does.
        "state": "out-of-stock" if unavailable else "repricing" if repriced else "valid",
        "checked_at": timezone.now().isoformat(),
    }


def accept_prices(cart: Cart) -> int:
    """Move every changed line's quote to today's price: the buyer's explicit acceptance of a reprice."""
    now, n = timezone.now(), 0
    for line in lines_of(cart):
        v = line.variant
        if on_sale(v) and line.quoted_unit_price != v.unit_price:
            CartLine.objects.filter(pk=line.pk).update(quoted_unit_price=v.unit_price, price_validated_at=now)
            n += 1
    if n:
        Cart.objects.filter(pk=cart.pk).update(version=cart.version + 1, updated_at=now)
    return n
