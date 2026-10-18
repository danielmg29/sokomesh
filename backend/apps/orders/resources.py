"""Orders (SM-F-15) with approval (SM-F-12), delivery (SM-F-17) and reorder (SM-F-20); approval policies.

An order belongs to its buyer and its seller, so each side reads it and runs the commands its roles hold;
`can` then narrows what is offered to the commands the order's state and the viewer's side allow (the
command handlers check again). Commands that need input (a reason, a carrier) declare it as input-only
fields, so forms are projected and records stay clean.
"""

from typing import Any

from django.db.models import Q, QuerySet
from django.http import HttpRequest

from apps.delivery import services as delivery
from apps.orders import approvals, lifecycle
from apps.orders.models import ApprovalPolicy, Order
from apps.orders.services import lines_of, preview, reorder
from apps.organizations.models import Organization
from apps.organizations.tenancy import active_membership, is_admin
from core.api import fail
from core.operations.registry import Action, Field, Resource, action_input, derive, register
from core.result import ErrorCode

ORDER_TONES = {
    "pending_approval": "warning",
    "submitted": "info",
    "confirmed": "info",
    "picking": "signal",
    "partially_fulfilled": "warning",
    "shipped": "signal",
    "delivered": "success",
    "cancelled": "neutral",
    "disputed": "danger",
}


def _orders(request: HttpRequest) -> QuerySet[Order]:
    qs = Order.objects.select_related(
        "buyer_organization", "seller_organization__seller_profile", "submitted_by", "delivery_address", "quote"
    )
    if is_admin(request.user):
        return qs
    org = active_membership(request).organization
    # A seller sees an order once it was submitted to them, never while the buyer is still approving it.
    sent = Order.objects.filter(seller_organization=org, transitions__to_status=Order.Status.SUBMITTED).values("pk")
    return qs.filter(Q(buyer_organization=org) | Q(pk__in=sent))


def _order_extra(o: Order, request: HttpRequest) -> dict[str, Any]:
    side = lifecycle.side_of(request, o)
    out: dict[str, Any] = {
        "side": side,
        "seller": {"id": str(o.seller_organization.pk), "label": lifecycle.seller_name(o)},
        "buyer": {"id": str(o.buyer_organization.pk), "label": o.buyer_organization.name},
        "delivery": o.delivery_snapshot or None,
        "next_actions": lifecycle.next_actions(o, side),
    }
    if request.resolver_match is None or request.resolver_match.url_name != "order-detail":
        return out  # lists stay light; the detail adds lines, history, approval and delivery
    out.update(
        {
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
                    "price_explanation": line.price_explanation or None,
                }
                for line in lines_of(o)
            ],
            "transitions": [
                {
                    "id": str(t.pk),
                    "from": t.from_status or None,
                    "to": t.to_status,
                    "at": t.occurred_at.isoformat(),
                    "actor": lifecycle.person_name(t.actor) if t.actor else "SokoMesh",
                    "reason": t.reason or None,
                }
                for t in o.transitions.select_related("actor")  # pyright: ignore[reportAttributeAccessIssue]
            ],
            "approval": approvals.approval_view(o, request),
            "shipments": [
                delivery.shipment_view(s)
                for s in o.shipments.prefetch_related("events").select_related("proof_of_delivery")  # pyright: ignore[reportAttributeAccessIssue]
            ],
            "quote": {"id": str(o.quote.pk), "reference": o.quote.reference} if o.quote else None,
        }
    )
    if side == "buyer" and o.status != Order.Status.PENDING_APPROVAL:
        out["reorder"] = preview(o, request)
    return out


def _can(request: HttpRequest, o: Order, names: list[str]) -> list[str]:
    """Offer only what this side may do in this state (approval also needs eligibility)."""
    side = lifecycle.side_of(request, o)
    allowed = set(lifecycle.next_actions(o, side))
    if "approve" in allowed and not approvals.can_decide(request, o):
        allowed -= {"approve", "reject"}
    return [n for n in names if n in allowed]


def _reorder(request: HttpRequest, o: Order, data: dict[str, Any]) -> dict[str, Any]:
    return reorder(request, o)


def _action(name: str) -> Action:
    return next(a for a in order.actions if a.name == name)


def _move(name: str, required: tuple[str, ...] = ()):
    def run(request: HttpRequest, o: Order, data: dict[str, Any]) -> None:
        values = action_input(order, _action(name), data, required)
        lifecycle.move(request, o, name, values.get("reason", ""))

    return run


def _ship(request: HttpRequest, o: Order, data: dict[str, Any]) -> None:
    values = action_input(order, _action("ship"), data, ("carrier_name", "estimated_end_at"))
    start, end = values.get("estimated_start_at"), values["estimated_end_at"]
    if start and end <= start:
        fail(
            ErrorCode.CONFLICT,
            "The delivery window must end after it starts.",
            {"estimated_end_at": ["End after the start."]},
        )
    lifecycle.move(request, o, "ship")
    delivery.start(
        o,
        carrier_name=values["carrier_name"],
        carrier_reference=values.get("carrier_reference", ""),
        start_at=start,
        end_at=end,
    )


def _decide(decision: str):
    def run(request: HttpRequest, o: Order, data: dict[str, Any]) -> None:
        values = action_input(order, _action("approve" if decision == "approved" else "reject"), data)
        approvals.decide(request, o, decision, values.get("comment", ""))

    return run


INPUTS = (
    Field(
        "reason",
        "text",
        "textarea",
        label="Reason",
        help="The other side reads this.",
        max_length=1000,
        input_only=True,
    ),
    Field(
        "comment",
        "text",
        "textarea",
        label="Comment",
        help="Kept in the order history.",
        max_length=500,
        input_only=True,
    ),
    Field("carrier_name", "string", "text", label="Carrier", max_length=80, input_only=True),
    Field("carrier_reference", "string", "code", label="Tracking reference", max_length=80, input_only=True),
    Field("estimated_start_at", "datetime", "datetime", label="Expected from", input_only=True),
    Field("estimated_end_at", "datetime", "datetime", label="Expected by", input_only=True),
)

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
            derive(
                Order,
                "buyer_organization",
                read_only=True,
                relation={"model": "organization", "display": "name"},
                filter=("eq", "in"),
            ),
            derive(Order, "submitted_by", read_only=True, relation={"model": "user", "display": "display_name"}),
            derive(Order, "delivery_address", read_only=True, relation={"model": "address", "display": "label"}),
            derive(Order, "status", widget="status", tones=ORDER_TONES, read_only=True, filter=("in",)),
            derive(Order, "submitted_at", read_only=True, filter=("range",)),
            derive(Order, "subtotal", read_only=True, widget="currency", currency="KES"),
            derive(Order, "total", read_only=True, widget="currency", currency="KES", filter=("range",)),
            derive(Order, "special_instructions", read_only=True),
            *INPUTS,
        ),
        list_fields=("order_number", "seller_organization", "buyer_organization", "status", "submitted_at", "total"),
        search=("order_number",),
        ordering=("-submitted_at", "submitted_at", "-total"),
        default_page_size=25,
        permissions={"list": "order.list", "get": "order.get"},
        actions=(
            Action(
                "approve",
                "Approve order",
                "order.approve",
                _decide("approved"),
                input=("comment",),
                icon="check",
                when={"status": ["pending_approval"]},
            ),
            Action(
                "reject",
                "Reject",
                "order.approve",
                _decide("rejected"),
                input=("comment",),
                tone="danger",
                when={"status": ["pending_approval"]},
            ),
            Action(
                "confirm",
                "Confirm order",
                "order.fulfil",
                _move("confirm"),
                icon="check",
                when={"status": ["submitted"]},
            ),
            Action(
                "start_picking", "Start picking", "order.fulfil", _move("start_picking"), when={"status": ["confirmed"]}
            ),
            Action(
                "mark_partial",
                "Short-ship",
                "order.fulfil",
                _move("mark_partial", ("reason",)),
                input=("reason",),
                tone="warning",
                when={"status": ["picking"]},
            ),
            Action(
                "ship",
                "Ship",
                "order.fulfil",
                _ship,
                input=("carrier_name", "carrier_reference", "estimated_start_at", "estimated_end_at"),
                icon="truck",
                when={"status": ["confirmed", "picking", "partially_fulfilled"]},
            ),
            Action(
                "mark_delivered",
                "Mark delivered",
                "order.fulfil",
                _move("mark_delivered"),
                confirm=True,
                when={"status": ["shipped"]},
            ),
            Action(
                "cancel",
                "Cancel order",
                "order.cancel",
                _move("cancel"),
                input=("reason",),
                tone="danger",
                when={"status": ["pending_approval", "submitted", "confirmed", "picking"]},
            ),
            Action(
                "dispute",
                "Report a problem",
                "order.dispute",
                _move("dispute", ("reason",)),
                input=("reason",),
                tone="danger",
                when={"status": ["shipped", "delivered"]},
            ),
            Action("reorder", "Reorder", "order.reorder", _reorder, icon="copy"),
        ),
        hooks={
            "queryset": _orders,
            "organization_of": lambda o: [o.buyer_organization, o.seller_organization],
            "serialize_extra": _order_extra,
            "can": _can,
        },
    )
)


# --- approval policies (SM-F-12) -----------------------------------------------------------------------

ROLE_CHOICES = tuple({"value": r, "label": r.replace("_", " ").capitalize()} for r in ApprovalPolicy.APPROVER_ROLES)


def _policies(request: HttpRequest) -> QuerySet[ApprovalPolicy]:
    qs = ApprovalPolicy.objects.select_related("buyer_organization")
    return qs if is_admin(request.user) else qs.filter(buyer_organization=active_membership(request).organization)


def _create_policy(request: HttpRequest, data: dict[str, Any]) -> ApprovalPolicy:
    org = active_membership(request).organization
    if org.organization_type != Organization.Type.BUYER:
        fail(ErrorCode.FORBIDDEN, "Approval policies belong to buyer organizations.")
    return ApprovalPolicy(buyer_organization=org, **data)


def _switch(on: bool):
    def run(request: HttpRequest, p: ApprovalPolicy, data: dict[str, Any]) -> None:
        p.is_active = on
        p.save(update_fields=["is_active", "updated_at"])

    return run


approval_policy = register(
    Resource(
        key="approval_policy",
        path="approval-policies",
        model=ApprovalPolicy,
        label="Approval policy",
        label_plural="Approval policies",
        display_field="name",
        fields=(
            derive(ApprovalPolicy, "id"),
            derive(ApprovalPolicy, "name", weight=10),
            derive(ApprovalPolicy, "threshold_amount", widget="currency", currency="KES", weight=20),
            Field(
                "approver_role_keys",
                "multiselect",
                "multiselect",
                label="Who can approve",
                help="Members with any of these roles can approve; never the person who placed the order.",
                required=True,
                choices=ROLE_CHOICES,
                weight=30,
            ),
            derive(ApprovalPolicy, "minimum_approvals", weight=40),
            derive(ApprovalPolicy, "is_active", read_only=True, filter=("eq",)),
            derive(ApprovalPolicy, "currency", read_only=True),
            derive(ApprovalPolicy, "updated_at", read_only=True, widget="relative-time"),
        ),
        list_fields=("name", "threshold_amount", "approver_role_keys", "minimum_approvals", "is_active"),
        search=("name",),
        ordering=("threshold_amount", "-updated_at"),
        default_page_size=25,
        writable=("name", "threshold_amount", "approver_role_keys", "minimum_approvals"),
        permissions={
            "list": "approval_policy.list",
            "get": "approval_policy.get",
            "create": "approval_policy.create",
            "update": "approval_policy.update",
        },
        actions=(
            Action(
                "switch_off",
                "Switch off",
                "approval_policy.update",
                _switch(False),
                confirm=True,
                icon="pause",
                when={"is_active": ["true"]},
            ),
            Action(
                "switch_on",
                "Switch on",
                "approval_policy.update",
                _switch(True),
                icon="check",
                when={"is_active": ["false"]},
            ),
        ),
        hooks={
            "queryset": _policies,
            "organization_of": lambda p: p.buyer_organization,
            "create": _create_policy,
        },
    )
)
