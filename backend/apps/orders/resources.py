"""Order history (read-only) with the reorder command (SM-F-20).

Buyers see their own organization's orders; the seller's side of an order arrives with the order lifecycle
(SM-F-15), as do checkout and transitions. Orders cannot be written through the API yet.
"""

from typing import Any

from django.db.models import QuerySet
from django.http import HttpRequest

from apps.orders.models import Order
from apps.orders.services import lines_of, preview, reorder
from apps.organizations.tenancy import active_membership, is_admin
from core.operations.registry import Action, Resource, derive, register

ORDER_TONES = {
    "submitted": "info",
    "confirmed": "info",
    "picking": "info",
    "partially_fulfilled": "warning",
    "shipped": "signal",
    "delivered": "success",
    "cancelled": "neutral",
    "disputed": "danger",
}


def _orders(request: HttpRequest) -> QuerySet[Order]:
    qs = Order.objects.select_related(
        "buyer_organization", "seller_organization__seller_profile", "submitted_by", "delivery_address"
    )
    if is_admin(request.user):
        return qs
    return qs.filter(buyer_organization=active_membership(request).organization)


def _order_extra(o: Order, request: HttpRequest) -> dict[str, Any]:
    profile = getattr(o.seller_organization, "seller_profile", None)
    out: dict[str, Any] = {
        "seller": {
            "id": str(o.seller_organization.pk),
            "label": profile.public_name if profile else o.seller_organization.name,
        },
        "lines": [
            {
                "id": str(line.pk),
                "product": line.product_name_snapshot,
                "sku": line.sku_snapshot,
                "pack_label": line.pack_label_snapshot,
                "quantity": line.quantity_ordered,
                "unit": line.unit,
                "unit_price": format(line.unit_price, "f"),
                "line_total": format(line.line_total, "f"),
            }
            for line in lines_of(o)
        ],
    }
    if not is_admin(request.user):  # what a reorder would copy today; administrators do not buy
        out["reorder"] = preview(o, request)
    return out


def _reorder(request: HttpRequest, o: Order, data: dict[str, Any]) -> dict[str, Any]:
    return reorder(request, o)


order = register(
    Resource(
        key="order",
        path="orders",
        model=Order,
        label="Order",
        label_plural="Orders",
        display_field="order_number",
        fields=(
            derive(Order, "id"),
            derive(Order, "order_number", read_only=True, widget="code"),
            derive(
                Order,
                "seller_organization",
                read_only=True,
                relation={"model": "organization", "display": "name"},
                filter=("eq", "in"),
            ),
            derive(Order, "buyer_organization", read_only=True, relation={"model": "organization", "display": "name"}),
            derive(Order, "submitted_by", read_only=True, relation={"model": "user", "display": "display_name"}),
            derive(Order, "delivery_address", read_only=True, relation={"model": "address", "display": "label"}),
            derive(Order, "status", widget="status", tones=ORDER_TONES, read_only=True, filter=("in",)),
            derive(Order, "submitted_at", read_only=True, filter=("range",)),
            derive(Order, "subtotal", read_only=True, widget="currency", currency="KES"),
            derive(Order, "total", read_only=True, widget="currency", currency="KES"),
            derive(Order, "special_instructions", read_only=True),
        ),
        list_fields=("order_number", "seller_organization", "status", "submitted_at", "total"),
        search=("order_number",),
        ordering=("-submitted_at", "submitted_at", "-total"),
        default_page_size=25,
        permissions={"list": "order.list", "get": "order.get"},
        actions=(Action("reorder", "Reorder", "order.reorder", _reorder, icon="copy"),),
        hooks={
            "queryset": _orders,
            "organization_of": lambda o: o.buyer_organization,
            "serialize_extra": _order_extra,
        },
    )
)
