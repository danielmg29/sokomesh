"""SM-F-07 resources: a seller's stock balances (start tracking a pack, receive goods, adjust with a reason)
and the movement ledger, read-only. Quantities change only through these commands and the order flow."""

from typing import Any

from django.db.models import QuerySet
from django.http import HttpRequest

from apps.catalog.models import Variant
from apps.catalog.resources import relation_ref
from apps.inventory import services
from apps.inventory.models import Balance, Movement
from apps.organizations.tenancy import active_membership, is_admin
from core.api import invalid
from core.operations.registry import Action, Field, Resource, action_input, derive, register

MOVEMENT_TONES = {
    "receipt": "success",
    "reservation": "signal",
    "release": "info",
    "allocation": "info",
    "adjustment": "warning",
    "shipment": "neutral",
    "return": "success",
}


STOCK_STATES = (
    {"value": "ok", "label": "In stock", "tone": "success"},
    {"value": "low", "label": "Running low", "tone": "warning"},
    {"value": "out", "label": "Below one order", "tone": "danger"},
)


def _seller_scope(request: HttpRequest, qs: QuerySet[Any]) -> QuerySet[Any]:
    return qs if is_admin(request.user) else qs.filter(seller=active_membership(request).organization)


def _balance_view(b: Balance, request: HttpRequest) -> dict[str, Any]:
    v = b.variant
    low = v.minimum_order_quantity * 3
    return {
        "product": {"id": str(v.product_id), "label": v.product.name},  # pyright: ignore[reportAttributeAccessIssue]
        "pack_label": v.sku,
        "unit": v.packaging_unit,
        "stock_state": "out" if b.available < v.minimum_order_quantity else "low" if b.available < low else "ok",
        "minimum_order": v.minimum_order_quantity,
    }


def _create(request: HttpRequest, data: dict[str, Any]) -> Balance:
    """Start tracking one of the seller's packs at their main location; receive goods into it next."""
    own = (
        Variant.objects.all()
        if is_admin(request.user)
        else Variant.objects.filter(seller=active_membership(request).organization)
    )
    variant = relation_ref(own, data.pop("variant", None), "variant", "Choose one of your packs.")
    if services.tracked(variant):
        invalid({"variant": ["This pack is tracked already; receive goods into it instead."]})
    return Balance(variant=variant, seller=variant.seller, location=services.default_location(variant.seller), **data)


def _action(name: str) -> Action:
    return next(a for a in inventory_balance.actions if a.name == name)


def _receive(request: HttpRequest, b: Balance, data: dict[str, Any]) -> None:
    values = action_input(inventory_balance, _action("receive"), data, ("quantity",))
    services.receive(b.variant, int(values["quantity"]), actor=request.user, note=values.get("note") or "")


def _adjust(request: HttpRequest, b: Balance, data: dict[str, Any]) -> None:
    values = action_input(inventory_balance, _action("adjust"), data, ("quantity_change", "reason_code"))
    services.adjust(
        b.variant,
        int(values["quantity_change"]),
        actor=request.user,
        reason_code=values["reason_code"],
        note=values.get("note") or "",
    )


def _update(request: HttpRequest, b: Balance, changes: dict[str, Any]) -> None:
    for k, v in changes.items():  # only the bin is editable; quantities move through commands
        setattr(b, k, v)


inventory_balance = register(
    Resource(
        key="inventory_balance",
        path="inventory/balances",
        model=Balance,
        label="Stock balance",
        label_plural="Stock balances",
        display_field="product",
        fields=(
            derive(Balance, "id"),
            derive(Balance, "variant", relation={"model": "variant", "display": "sku"}, filter=("eq",), weight=5),
            derive(
                Balance, "location", read_only=True, relation={"model": "location", "display": "name"}, filter=("eq",)
            ),
            derive(Balance, "bin_label", weight=10),
            derive(Balance, "on_hand", read_only=True),
            derive(Balance, "reserved", read_only=True),
            derive(Balance, "allocated", read_only=True),
            derive(Balance, "updated_at", read_only=True, widget="relative-time"),
            # Read from the balance (and its pack) when it is served; never written.
            Field(
                "product",
                "relation",
                "relation",
                label="Product",
                read_only=True,
                weight=1,
                relation={"model": "product", "display": "name"},
            ),
            Field(
                "available",
                "integer",
                "integer",
                label="Available",
                read_only=True,
                help="On hand less the packs held for checkouts and allocated to paid orders.",
            ),
            Field("stock_state", "enum", "status", label="Stock", read_only=True, choices=STOCK_STATES),
            Field(
                "quantity",
                "integer",
                "integer",
                label="Packs received",
                help="Whole packs, as counted at the door.",
                input_only=True,
            ),
            Field(
                "quantity_change",
                "integer",
                "integer",
                label="Change on hand",
                help="Positive to add packs, negative to remove them.",
                input_only=True,
            ),
            Field(
                "reason_code",
                "enum",
                "select",
                label="Why",
                choices=tuple({"value": v, "label": str(lbl)} for v, lbl in Movement.Reason.choices),
                input_only=True,
            ),
            Field(
                "note",
                "text",
                "textarea",
                label="Note",
                help="Delivery note number, count sheet, who checked.",
                max_length=300,
                input_only=True,
            ),
        ),
        list_fields=("product", "variant", "available", "stock_state", "on_hand", "reserved", "allocated", "bin_label"),
        search=("variant",),
        search_paths={"variant": "variant__sku"},
        ordering=("variant", "-updated_at", "on_hand"),
        default_page_size=50,
        writable=("variant", "bin_label"),
        permissions={
            "list": "inventory.list",
            "get": "inventory.list",
            "create": "inventory.receive",
            "update": "inventory.receive",
        },
        actions=(
            Action("receive", "Receive goods", "inventory.receive", _receive, input=("quantity", "note"), icon="plus"),
            Action(
                "adjust",
                "Adjust stock",
                "inventory.adjust",
                _adjust,
                input=("quantity_change", "reason_code", "note"),
                tone="warning",
            ),
        ),
        hooks={
            "queryset": lambda request: _seller_scope(
                request, Balance.objects.select_related("variant__product", "location")
            ),
            "organization_of": lambda b: b.seller,
            "serialize_extra": _balance_view,
            "create": _create,
            "update": _update,
        },
    )
)


inventory_movement = register(
    Resource(
        key="inventory_movement",
        path="inventory/movements",
        model=Movement,
        label="Stock movement",
        label_plural="Stock movements",
        display_field="reference_label",
        fields=(
            derive(Movement, "id"),
            derive(Movement, "occurred_at", read_only=True, filter=("range",)),
            derive(
                Movement, "variant", read_only=True, relation={"model": "variant", "display": "sku"}, filter=("eq",)
            ),
            derive(Movement, "movement_type", widget="status", tones=MOVEMENT_TONES, read_only=True, filter=("in",)),
            derive(Movement, "quantity", read_only=True),
            derive(Movement, "available_after", read_only=True),
            derive(Movement, "on_hand_after", read_only=True),
            derive(Movement, "unit", read_only=True),
            derive(Movement, "reference_label", read_only=True),
            derive(Movement, "reason_code", read_only=True),
            derive(Movement, "note", read_only=True),
            derive(Movement, "actor", read_only=True, relation={"model": "user", "display": "display_name"}),
        ),
        list_fields=("occurred_at", "variant", "movement_type", "quantity", "available_after", "reference_label"),
        search=("reference_label", "note"),
        ordering=("-occurred_at",),
        default_page_size=50,
        permissions={"list": "inventory.list", "get": "inventory.list"},
        hooks={
            "queryset": lambda request: _seller_scope(request, Movement.objects.select_related("variant", "actor")),
            "organization_of": lambda m: m.seller,
        },
    )
)
