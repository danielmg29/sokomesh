"""SM-F-15 order lifecycle: which side may move an order from which state to which, and the record of it.

Moves are guarded here and nowhere else; the order resource's commands call `move`, and so do approvals
(SM-F-12), payments (SM-F-14), fulfilment (SM-F-16) and delivery (SM-F-17). Every move appends an
OrderTransition (actor, time, reason), raises the order's version, writes an audit row and, for the moves
integrations follow, an outbox event, then sends `order_moved` so inventory, payments and fulfilment react
without this module importing them.

    pending_approval ─approve─► awaiting_payment ─paid─► submitted ─confirm─► confirmed ─pick─► picking
          │ reject, cancel          │ cancel, hold expired     │ cancel            │ cancel           │ pack short
          ▼                         ▼                          ▼                   ▼                  ▼
      cancelled                 cancelled                  cancelled           cancelled   partially_fulfilled
                                                                                                      │ hand over / ship
    disputed ◄─dispute (buyer)─ delivered ◄─deliver─ shipped ◄────────────────────────────────────────┘
"""

from typing import Any

from django.dispatch import Signal
from django.http import HttpRequest
from django.utils import timezone

from apps.orders.models import Order, OrderTransition
from apps.organizations.models import Membership, Organization
from apps.organizations.tenancy import active_membership, is_admin
from core.api import fail, invalid
from core.events import context
from core.events.record import audit, emit
from core.result import ErrorCode

# Sent after every transition, inside its transaction: order, from_status, to_status, actor, reason.
order_moved = Signal()
# Moves integrations hear about through webhooks (SM-F-23), once for each side's organization.
PUBLISHED = {"submitted", "shipped", "delivered", "cancelled"}

S = Order.Status
# Seller commands: (from states, to state, reason required)
SELLER_MOVES: dict[str, tuple[tuple[str, ...], str, bool]] = {
    "confirm": ((S.SUBMITTED,), S.CONFIRMED, False),
    "start_picking": ((S.CONFIRMED,), S.PICKING, False),
    "mark_partial": ((S.PICKING,), S.PARTIALLY_FULFILLED, True),
    "ship": ((S.CONFIRMED, S.PICKING, S.PARTIALLY_FULFILLED), S.SHIPPED, False),
    "mark_delivered": ((S.SHIPPED,), S.DELIVERED, False),
}
BUYER_CANCEL_FROM = (S.PENDING_APPROVAL, S.AWAITING_PAYMENT, S.SUBMITTED)
SELLER_CANCEL_FROM = (S.SUBMITTED, S.CONFIRMED, S.PICKING)
DISPUTE_FROM = (S.SHIPPED, S.DELIVERED)
BUYER_ACTIONS = {"approve", "reject", "dispute", "reorder"}
SELLER_ACTIONS = set(SELLER_MOVES)

# Messages per destination (apps.notifications.messages) and who hears of it.
NOTICE: dict[str, tuple[str, str]] = {
    S.CONFIRMED: ("order.confirmed", "buyer"),
    S.PARTIALLY_FULFILLED: ("order.partial", "buyer"),
    S.SHIPPED: ("order.shipped", "buyer"),
    S.DELIVERED: ("order.delivered", "buyer"),
}


def side_of(request: HttpRequest, order: Order) -> str | None:
    """Whether the request acts for the order's buyer or its seller (administrators act for neither)."""
    if is_admin(request.user):
        return None
    org_id = active_membership(request).organization_id  # pyright: ignore[reportAttributeAccessIssue]
    if org_id == order.buyer_organization_id:  # pyright: ignore[reportAttributeAccessIssue]
        return "buyer"
    if org_id == order.seller_organization_id:  # pyright: ignore[reportAttributeAccessIssue]
        return "seller"
    return None


def members(org: Organization, roles: tuple[str, ...]) -> list[Any]:
    return [
        m.user
        for m in Membership.objects.filter(
            organization=org, role_key__in=roles, status=Membership.Status.ACTIVE
        ).select_related("user")
    ]


def tell(
    org: Organization,
    roles: tuple[str, ...],
    *,
    event_key: str,
    event_id: str,
    message: str,
    params: dict[str, Any],
    link: str,
    skip: Any = None,
) -> None:
    from apps.notifications.services import notify

    for user in members(org, roles):
        if skip is not None and user.pk == skip.pk:
            continue
        notify(user, event_key=event_key, event_id=event_id, message=message, params=params, deep_link=link)


def buyer_link(order: Order) -> str:
    return f"/orders/{order.pk}"


def seller_link(order: Order) -> str:
    return f"/sell/orders/{order.pk}"


def person_name(user: Any) -> str:
    """How a person is named to others in notices and timelines."""
    return getattr(user, "display_name", "") or getattr(user, "email", "")


def seller_name(order: Order) -> str:
    profile = getattr(order.seller_organization, "seller_profile", None)
    return profile.public_name if profile else order.seller_organization.name


def record(order: Order, to: str, actor: Any, reason: str = "") -> OrderTransition:
    """Append the transition and move the order (no guard: callers check who may make the move)."""
    before = order.status
    who = actor if getattr(actor, "is_authenticated", False) else None
    transition = OrderTransition.objects.create(
        order=order, from_status=before, to_status=to, actor=who, reason=reason, occurred_at=timezone.now()
    )
    order.status = to
    order.version += 1
    order.save(update_fields=["status", "version"])
    with context.bound(order.correlation_id):
        label = Order.Status(to).label.lower() if to in Order.Status.values else to
        audit(
            f"order.{to}",
            domain="order",
            resource=order,
            organization=order.seller_organization_id,  # pyright: ignore[reportAttributeAccessIssue]
            actor=who,
            summary=f"{order.order_number} {label}"
            + (f", from {Order.Status(before).label.lower()}" if before else ""),
            reason=reason,
            data={"order": order.order_number, "from": before, "to": to, "total": format(order.total, "f")},
        )
        if to in PUBLISHED:
            payload = {
                "order_id": str(order.pk),
                "order_number": order.order_number,
                "status": to,
                "total": format(order.total, "f"),
                "currency": order.currency,
            }
            for org in {order.seller_organization_id, order.buyer_organization_id}:  # pyright: ignore[reportAttributeAccessIssue]
                emit(f"order.{to}", organization=org, payload=payload)
        order_moved.send(sender=Order, order=order, from_status=before, to_status=to, actor=who, reason=reason)
    return transition


def expire_unpaid(order: Order) -> None:
    """The stock hold ran out before the buyer paid: the order is cancelled and the buyer told why."""
    record(order, S.CANCELLED, None, "The stock hold expired before payment.")
    tell(
        order.buyer_organization,
        ("buyer_owner", "buyer_purchaser"),
        event_key="order",
        event_id=f"order:{order.pk}:hold_expired",
        message="order.hold_expired",
        params={"order": order.order_number, "seller": seller_name(order)},
        link=buyer_link(order),
    )


def move(request: HttpRequest, order: Order, action: str, reason: str = "") -> OrderTransition:
    """A seller move, a cancellation or a dispute, by the side the request acts for."""
    side = side_of(request, order)
    actor = request.user
    if action in SELLER_MOVES:
        allowed_from, to, needs_reason = SELLER_MOVES[action]
        if side != "seller":
            fail(ErrorCode.FORBIDDEN, "Only the seller moves an order through fulfilment.")
    elif action == "cancel":
        allowed_from = BUYER_CANCEL_FROM if side == "buyer" else SELLER_CANCEL_FROM if side == "seller" else ()
        to, needs_reason = S.CANCELLED, side == "seller"
    elif action == "dispute":
        if side != "buyer":
            fail(ErrorCode.FORBIDDEN, "Only the buyer can dispute an order.")
        allowed_from, to, needs_reason = DISPUTE_FROM, S.DISPUTED, True
    else:
        fail(ErrorCode.NOT_FOUND)
    if order.status not in allowed_from:
        label = Order.Status(order.status).label.lower()
        fail(ErrorCode.CONFLICT, f"An order that is {label} cannot be moved that way.")
    if needs_reason and not reason.strip():
        invalid({"reason": ["Give a reason; the other side reads it."]})
    transition = record(order, to, actor, reason.strip())
    params = {"order": order.order_number, "seller": seller_name(order), "reason": reason.strip() or "-"}
    if to in NOTICE:
        message, _ = NOTICE[to]
        tell(
            order.buyer_organization,
            ("buyer_owner", "buyer_purchaser"),
            event_key="order",
            event_id=f"order:{order.pk}:{to}",
            message=message,
            params=params,
            link=buyer_link(order),
        )
    elif to == S.CANCELLED:
        if side == "buyer":
            tell(
                order.seller_organization,
                ("seller_manager",),
                event_key="order",
                event_id=f"order:{order.pk}:cancelled",
                message="order.cancelled",
                params={**params, "by": order.buyer_organization.name},
                link=seller_link(order),
            )
        else:
            tell(
                order.buyer_organization,
                ("buyer_owner", "buyer_purchaser"),
                event_key="order",
                event_id=f"order:{order.pk}:cancelled",
                message="order.cancelled",
                params={**params, "by": seller_name(order)},
                link=buyer_link(order),
            )
    elif to == S.DISPUTED:
        tell(
            order.seller_organization,
            ("seller_manager",),
            event_key="order",
            event_id=f"order:{order.pk}:disputed",
            message="order.disputed",
            params={**params, "buyer": order.buyer_organization.name},
            link=seller_link(order),
        )
    return transition


def next_actions(order: Order, side: str | None) -> list[str]:
    """What the viewing side could do next, by name (the order resource narrows `_can` with this)."""
    out: list[str] = []
    if side == "seller":
        out += [name for name, (froms, _, _) in SELLER_MOVES.items() if order.status in froms]
        if order.status in SELLER_CANCEL_FROM:
            out.append("cancel")
    elif side == "buyer":
        if order.status == S.PENDING_APPROVAL:
            out += ["approve", "reject"]
        if order.status == S.AWAITING_PAYMENT:
            out.append("pay")
        if order.status in BUYER_CANCEL_FROM:
            out.append("cancel")
        if order.status in DISPUTE_FROM:
            out.append("dispute")
        if order.status not in (S.PENDING_APPROVAL, S.AWAITING_PAYMENT):
            out.append("reorder")
    return out
