"""SM-F-20 buyer reorder: copy a historical order into a fresh cart at today's conditions.

Reorder is a command over an immutable order. It never reprices or changes the order; it reads each line's
variant as it is now and reports every difference (price, stock, discontinued, minimum order) explicitly.
Substitutes are not offered yet (no substitution rules exist), so `substitution` is always null.
"""

from typing import Any

from django.http import HttpRequest
from django.utils import timezone

from apps.carts.models import Cart, CartLine, on_sale
from apps.carts.services import active_cart, buyer_org
from apps.catalog import contracts
from apps.catalog.pricing import resolve
from apps.catalog.resources import stock_of
from apps.orders.models import Order, OrderLine
from core.api import fail
from core.result import ErrorCode


def difference(line: OrderLine) -> dict[str, Any]:
    """One historical line against today's catalogue, and the quantity a new cart would get."""
    v = line.variant
    then = {
        "unit_price": format(line.unit_price, "f"),
        "quantity": line.quantity_ordered,
        "pack_label": line.pack_label_snapshot,
    }
    out: dict[str, Any] = {
        "line_id": str(line.pk),
        "product": line.product_name_snapshot,
        "sku": line.sku_snapshot,
        "unit": line.unit,
        "then": then,
        "now": None,
        "kinds": [],
        "addable": False,
        "substitution": None,
        "product_slug": None,
    }
    if v is None or not on_sale(v):
        out["kinds"] = ["discontinued"]
        return out
    p = v.product
    quantity = max(line.quantity_ordered, v.minimum_order_quantity)
    if v.stock_on_hand is not None:
        quantity = min(quantity, v.stock_on_hand)
    now_price = resolve(v, line.order.buyer_organization, quantity).unit_price
    kinds = []
    if now_price != line.unit_price:
        kinds.append("price")
    if v.minimum_order_quantity > line.quantity_ordered:
        kinds.append("moq")
    if v.stock_on_hand is not None and v.stock_on_hand < max(line.quantity_ordered, v.minimum_order_quantity):
        kinds.append("stock")
    addable = quantity >= v.minimum_order_quantity and v.stock_state() != "unavailable"
    out.update(
        kinds=kinds,
        addable=addable,
        product_slug=p.slug,
        now={
            "unit_price": format(now_price, "f"),
            "quantity": quantity if addable else 0,
            "pack_label": contracts.pack_label(p.category_contract, p.attributes or {}, v),
            "moq": v.minimum_order_quantity,
            "stock": stock_of(v),
        },
    )
    return out


def lines_of(order: Order) -> list[OrderLine]:
    return list(
        order.lines.select_related(  # pyright: ignore[reportAttributeAccessIssue]
            "order__buyer_organization",
            "variant",
            "variant__product",
            "variant__product__search",
            "variant__product__category_contract",
        ).prefetch_related("variant__price_rules")
    )


def preview(order: Order, request: HttpRequest) -> dict[str, Any]:
    diffs = [difference(line) for line in lines_of(order)]
    current = active_cart(request)
    return {
        "lines": diffs,
        "addable": sum(1 for d in diffs if d["addable"]),
        "current_cart_lines": current.lines.count() if current else 0,  # pyright: ignore[reportAttributeAccessIssue]
    }


def reorder(request: HttpRequest, order: Order) -> dict[str, Any]:
    """ReorderResult: the new cart, every line's differences and the lines that could not be added."""
    org = buyer_org(request)
    if order.buyer_organization_id != org.pk:  # pyright: ignore[reportAttributeAccessIssue]
        fail(ErrorCode.FORBIDDEN)
    previous = active_cart(request)
    replaced = previous.lines.count() if previous else 0  # pyright: ignore[reportAttributeAccessIssue]
    if previous is not None and replaced:
        previous.status = Cart.Status.ABANDONED  # kept, not deleted: the buyer's earlier cart is set aside
        previous.save(update_fields=["status", "updated_at"])
        previous = None
    cart = previous or Cart.objects.create(buyer_organization=org, created_by=request.user)
    diffs, unavailable = [], []
    for line in lines_of(order):
        d = difference(line)
        if d["addable"]:
            new = CartLine(cart=cart, variant=line.variant, quantity=d["now"]["quantity"])
            new.full_clean()
            new.save()
        else:
            unavailable.append(d["line_id"])
        diffs.append(d)
    return {
        "source_order_id": str(order.pk),
        "new_cart_id": str(cart.pk),
        "line_differences": diffs,
        "unavailable_line_ids": unavailable,
        "replaced_cart_lines": replaced,
        "created_at": timezone.now().isoformat(),
    }
