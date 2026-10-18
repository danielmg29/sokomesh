"""SM-F-17 shipment resource: buyers and sellers read their orders' shipments; the seller corrects the carrier
and window, adds events as they happen, and confirms delivery with optional proof (which also moves the
order to delivered). Proof of delivery is a private document both sides of the order may open.
"""

from typing import Any

from django.db.models import Q, QuerySet
from django.http import HttpRequest

from apps.delivery import services
from apps.delivery.models import Shipment, ShipmentEvent
from apps.media.models import FileAsset
from apps.media.services import ACCESS_RULES
from apps.orders.lifecycle import buyer_link, record, side_of, tell
from apps.orders.models import Order
from apps.organizations.tenancy import active_membership, active_memberships, is_admin
from core.api import fail, invalid
from core.operations.registry import Action, Field, Resource, action_input, derive, register
from core.result import ErrorCode

SHIPMENT_TONES = {
    "pending": "neutral",
    "handed_over": "info",
    "in_transit": "signal",
    "delivered": "success",
    "exception": "danger",
}
BUYER_NOTICE = {ShipmentEvent.Type.DELAYED, ShipmentEvent.Type.EXCEPTION, ShipmentEvent.Type.OUT_FOR_DELIVERY}


def _shipments(request: HttpRequest) -> QuerySet[Shipment]:
    qs = Shipment.objects.select_related(
        "order__buyer_organization", "order__seller_organization", "proof_of_delivery"
    ).prefetch_related("events")
    if is_admin(request.user):
        return qs
    org = active_membership(request).organization
    return qs.filter(Q(order__buyer_organization=org) | Q(order__seller_organization=org))


def _seller_only(request: HttpRequest, s: Shipment) -> None:
    if side_of(request, s.order) != "seller":
        fail(ErrorCode.FORBIDDEN, "Only the seller updates a shipment.")
    if s.status == Shipment.Status.DELIVERED:
        fail(ErrorCode.CONFLICT, "This shipment is delivered; its history is closed.")


def _action(name: str) -> Action:
    return next(a for a in shipment.actions if a.name == name)


def _add_event(request: HttpRequest, s: Shipment, data: dict[str, Any]) -> None:
    _seller_only(request, s)
    values = action_input(shipment, _action("add_event"), data, ("event_type",))
    kind = values["event_type"]
    if kind == ShipmentEvent.Type.DELIVERED:
        invalid({"event_type": ["Use Confirm delivery, which can attach proof of delivery."]})
    event = services.add_event(
        s,
        kind,
        description=values.get("description", ""),
        location=values.get("location_text", ""),
        occurred_at=values.get("occurred_at"),
    )
    if kind in BUYER_NOTICE:
        tell(
            s.order.buyer_organization,
            ("buyer_owner", "buyer_purchaser"),
            event_key="delivery",
            event_id=f"shipment:{event.pk}",
            message=f"delivery.{kind}",
            params={"order": s.order.order_number, "detail": event.description or ShipmentEvent.Type(kind).label},
            link=buyer_link(s.order),
        )


def _confirm_delivery(request: HttpRequest, s: Shipment, data: dict[str, Any]) -> None:
    _seller_only(request, s)
    values = action_input(shipment, _action("confirm_delivery"), data)
    proof = values.get("proof_file")
    if proof:
        ref = proof.get("id") if isinstance(proof, dict) else proof
        asset = FileAsset.objects.filter(pk=ref, organization=s.order.seller_organization).first()
        if asset is None:
            invalid({"proof_file": ["Upload the proof of delivery first."]})
        s.proof_of_delivery = asset
        s.save(update_fields=["proof_of_delivery"])
    services.add_event(
        s,
        ShipmentEvent.Type.DELIVERED,
        description=values.get("description") or "Delivered.",
        occurred_at=values.get("occurred_at"),
    )
    order = s.order
    if order.status == Order.Status.SHIPPED:
        record(
            order,
            Order.Status.DELIVERED,
            request.user,
            "Delivery confirmed" + (" with proof of delivery" if proof else ""),
        )
        tell(
            order.buyer_organization,
            ("buyer_owner", "buyer_purchaser"),
            event_key="order",
            event_id=f"order:{order.pk}:delivered",
            message="order.delivered",
            params={"order": order.order_number, "seller": order.seller_organization.name, "reason": "-"},
            link=buyer_link(order),
        )


def _update(request: HttpRequest, s: Shipment, changes: dict[str, Any]) -> None:
    _seller_only(request, s)
    for k, v in changes.items():
        setattr(s, k, v)
    if s.estimated_start_at and s.estimated_end_at and s.estimated_end_at <= s.estimated_start_at:
        invalid({"estimated_end_at": ["The window must end after it starts."]})


shipment = register(
    Resource(
        key="shipment",
        path="shipments",
        model=Shipment,
        label="Shipment",
        label_plural="Shipments",
        display_field="carrier_reference",
        fields=(
            derive(Shipment, "id"),
            derive(
                Shipment,
                "order",
                read_only=True,
                relation={"model": "order", "display": "order_number"},
                filter=("eq",),
            ),
            derive(Shipment, "carrier_name"),
            derive(Shipment, "carrier_reference", widget="code"),
            derive(Shipment, "status", widget="status", tones=SHIPMENT_TONES, read_only=True, filter=("in",)),
            derive(Shipment, "estimated_start_at"),
            derive(Shipment, "estimated_end_at"),
            derive(Shipment, "last_event_at", read_only=True, widget="relative-time"),
            derive(Shipment, "created_at", read_only=True, widget="relative-time"),
            Field(
                "event_type",
                "enum",
                "select",
                label="What happened",
                choices=tuple(
                    {"value": v, "label": str(lbl)} for v, lbl in ShipmentEvent.Type.choices if v != "delivered"
                ),
                input_only=True,
            ),
            Field("description", "text", "textarea", label="Details", max_length=500, input_only=True),
            Field("location_text", "string", "text", label="Where", max_length=120, input_only=True),
            Field("occurred_at", "datetime", "datetime", label="When", help="Leave empty for now.", input_only=True),
            Field(
                "proof_file",
                "file",
                "file",
                label="Proof of delivery",
                help="A signed delivery note or photo.",
                input_only=True,
            ),
        ),
        list_fields=("order", "carrier_name", "carrier_reference", "status", "last_event_at"),
        search=("carrier_reference",),
        ordering=("-created_at", "-last_event_at"),
        default_page_size=25,
        writable=("carrier_name", "carrier_reference", "estimated_start_at", "estimated_end_at"),
        permissions={"list": "shipment.list", "get": "shipment.get", "update": "shipment.update"},
        actions=(
            Action(
                "add_event",
                "Add update",
                "shipment.update",
                _add_event,
                input=("event_type", "description", "location_text", "occurred_at"),
                icon="plus",
                when={"status": ["handed_over", "in_transit", "exception", "pending"]},
            ),
            Action(
                "confirm_delivery",
                "Confirm delivery",
                "shipment.update",
                _confirm_delivery,
                input=("proof_file", "description", "occurred_at"),
                icon="check",
                when={"status": ["handed_over", "in_transit", "exception", "pending"]},
            ),
        ),
        hooks={
            "queryset": _shipments,
            "organization_of": lambda s: [s.order.buyer_organization, s.order.seller_organization],
            "serialize_extra": lambda s, request: {
                k: v
                for k, v in services.shipment_view(s).items()
                if k in ("events", "stale", "delayed", "last_source", "proof_of_delivery")
            },
            "update": _update,
            "can": lambda request, s, names: names if side_of(request, s.order) == "seller" else [],
        },
    )
)


def _proof_reader(user: Any, asset: FileAsset) -> bool:
    """Both sides of an order may open its proof of delivery, whatever their role."""
    if not getattr(user, "is_authenticated", False):
        return False
    orgs = active_memberships(user).values_list("organization_id", flat=True)
    return Shipment.objects.filter(
        Q(order__buyer_organization_id__in=orgs) | Q(order__seller_organization_id__in=orgs), proof_of_delivery=asset
    ).exists()


ACCESS_RULES.append(_proof_reader)
