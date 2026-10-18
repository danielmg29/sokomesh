"""SM-F-10 resources: the buyer's carts (read, accept new prices, empty, check out) and their lines.

Checking out (SM-F-15) places one order per seller at the prices the buyer accepted, under the buyer's
approval policy (SM-F-12); see apps.orders.checkout.

A person has at most one active cart per buyer organization; adding the first line opens it. Lines are
validated on the server against the variant's minimum order, reported stock and whether it is still on
sale, so the client's stepper is only a mirror for quick feedback.
"""

from typing import Any

from django.db.models import QuerySet
from django.http import HttpRequest

from apps.carts.models import Cart, CartLine
from apps.carts.services import accept_prices, active_cart, buyer_org, cart_view
from apps.catalog.models import Variant
from apps.catalog.resources import relation_ref
from apps.organizations.tenancy import active_membership
from core.api import fail, invalid
from core.operations.registry import Action, Field, Resource, action_input, derive, register
from core.result import ErrorCode

CART_TONES = {"active": "info", "submitted": "success", "abandoned": "neutral", "converted": "success"}
STOCK_TONES = {"available": "success", "limited": "warning", "unavailable": "danger", "unknown": "neutral"}


def _carts(request: HttpRequest) -> QuerySet[Cart]:
    org = active_membership(request).organization
    return Cart.objects.filter(buyer_organization=org, created_by=request.user).select_related("buyer_organization")


def _accept(request: HttpRequest, cart: Cart, data: dict[str, Any]) -> None:
    accept_prices(cart)
    cart.refresh_from_db()


def _checkout(request: HttpRequest, cart: Cart, data: dict[str, Any]) -> dict[str, Any]:
    from apps.orders.checkout import checkout

    action = next(a for a in carts.actions if a.name == "checkout")
    values = action_input(carts, action, data, ("delivery_address",))
    orders = checkout(request, cart, values["delivery_address"], values.get("special_instructions") or "")
    return {
        "orders": [
            {"id": str(o.pk), "order_number": o.order_number, "status": o.status, "total": format(o.total, "f")}
            for o in orders
        ]
    }


def _empty(request: HttpRequest, cart: Cart, data: dict[str, Any]) -> None:
    for line in cart.lines.all():  # pyright: ignore[reportAttributeAccessIssue]
        line.delete()
    cart.refresh_from_db()


carts = cart = register(
    Resource(
        key="cart",
        path="carts",
        model=Cart,
        label="Cart",
        label_plural="Carts",
        display_field="id",
        versioned=True,
        fields=(
            derive(Cart, "id"),
            derive(Cart, "buyer_organization", read_only=True, relation={"model": "organization", "display": "name"}),
            derive(Cart, "created_by", read_only=True, relation={"model": "user", "display": "display_name"}),
            derive(Cart, "status", widget="status", tones=CART_TONES, read_only=True, filter=("in",)),
            derive(Cart, "currency", read_only=True),
            derive(Cart, "updated_at", read_only=True, widget="relative-time"),
            Field(
                "delivery_address",
                "relation",
                "relation",
                label="Deliver to",
                relation={"model": "address", "display": "label"},
                input_only=True,
            ),
            Field(
                "special_instructions",
                "text",
                "textarea",
                label="Delivery notes",
                help="Gate, opening hours, who receives the goods.",
                max_length=1000,
                input_only=True,
            ),
        ),
        list_fields=("status", "updated_at"),
        ordering=("-updated_at",),
        default_page_size=10,
        permissions={"list": "cart.list", "get": "cart.get"},
        actions=(
            Action(
                "accept_prices", "Accept new prices", "cart.update", _accept, icon="check", when={"status": ["active"]}
            ),
            Action(
                "checkout",
                "Place orders",
                "cart.checkout",
                _checkout,
                input=("delivery_address", "special_instructions"),
                icon="check",
                when={"status": ["active"]},
            ),
            Action(
                "empty",
                "Empty cart",
                "cart.update",
                _empty,
                confirm=True,
                tone="danger",
                icon="trash",
                when={"status": ["active"]},
            ),
        ),
        hooks={
            "queryset": _carts,
            "organization_of": lambda c: c.buyer_organization,
            "serialize_extra": lambda c, request: cart_view(c),
        },
    )
)


def _lines(request: HttpRequest) -> QuerySet[CartLine]:
    current = active_cart(request)
    if current is None:
        return CartLine.objects.none()
    return CartLine.objects.filter(cart=current).select_related("cart", "variant", "variant__product", "seller")


def _add(request: HttpRequest, data: dict[str, Any]) -> CartLine:
    """Add packs of a variant; adding a variant already in the cart raises that line's quantity."""
    buyer_org(request)
    variant = relation_ref(
        Variant.objects.select_related("product", "product__search", "seller"),
        data.get("variant"),
        "variant",
        "Choose a product to add.",
    )
    quantity = data.get("quantity") or variant.minimum_order_quantity
    current = active_cart(request, create=True)
    existing = CartLine.objects.filter(cart=current, variant=variant).first()
    if existing is not None:
        existing.quantity += quantity
        existing.quoted_unit_price = None  # the buyer chose a new quantity: quote its tier now
        return existing
    return CartLine(cart=current, variant=variant, quantity=quantity)


def _change(request: HttpRequest, line: CartLine, changes: dict[str, Any]) -> None:
    if "variant" in changes:
        invalid({"variant": ["Remove this line and add the other product instead."]})
    if "quantity" in changes:
        if changes["quantity"] is None:
            invalid({"quantity": ["Enter how many packs you need."]})
        line.quantity = changes["quantity"]
        line.quoted_unit_price = None  # the buyer chose a new quantity: quote its tier now


def _remove(request: HttpRequest, line: CartLine, data: dict[str, Any]) -> dict[str, Any]:
    if line.cart.status != Cart.Status.ACTIVE:
        fail(ErrorCode.CONFLICT, "This cart is closed.")
    line.delete()
    return {"deleted": True}


cart_line = register(
    Resource(
        key="cart_line",
        path="cart-lines",
        model=CartLine,
        label="Cart line",
        label_plural="Cart lines",
        display_field="id",
        fields=(
            derive(CartLine, "id"),
            derive(CartLine, "cart", read_only=True, relation={"model": "cart", "display": "id"}),
            derive(CartLine, "variant", relation={"model": "variant", "display": "sku"}),
            derive(CartLine, "quantity"),
            derive(CartLine, "unit", read_only=True),
            derive(CartLine, "quoted_unit_price", read_only=True, widget="currency", currency="KES"),
            derive(CartLine, "price_validated_at", read_only=True, widget="relative-time"),
            derive(CartLine, "stock_status", widget="status", tones=STOCK_TONES, read_only=True),
            derive(CartLine, "seller", read_only=True, relation={"model": "organization", "display": "name"}),
            derive(CartLine, "updated_at", read_only=True, widget="relative-time"),
        ),
        list_fields=("variant", "quantity", "quoted_unit_price", "stock_status"),
        ordering=("-updated_at",),
        default_page_size=100,
        writable=("variant", "quantity"),
        permissions={
            "list": "cart_line.list",
            "get": "cart_line.get",
            "create": "cart_line.create",
            "update": "cart_line.update",
        },
        actions=(Action("remove", "Remove", "cart_line.remove", _remove, kind="archive", icon="trash"),),
        hooks={
            "queryset": _lines,
            "organization_of": lambda line: line.cart.buyer_organization,
            "create": _add,
            "update": _change,
        },
    )
)
