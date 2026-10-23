"""SM-F-12 purchase approval: decisions on orders waiting under the buyer's policy.

Who may decide comes from the policy copied onto the order (its roles, how many approvals), not from the
policy as it is now. The person who placed the order cannot approve it. Decisions are append-only; enough
approvals send the order to the seller, one rejection cancels it with the approver's reason.
"""

from typing import Any

from django.http import HttpRequest
from django.utils import timezone

from apps.orders.checkout import hold
from apps.orders.lifecycle import buyer_link, person_name, record, side_of
from apps.orders.models import ApprovalDecision, Order
from apps.organizations.tenancy import roles
from core.api import fail, invalid
from core.result import ErrorCode


def can_decide(request: HttpRequest, order: Order) -> bool:
    snapshot = order.approval_snapshot or {}
    if order.status != Order.Status.PENDING_APPROVAL or side_of(request, order) != "buyer":
        return False
    if order.submitted_by_id == request.user.pk:  # pyright: ignore[reportAttributeAccessIssue]
        return False
    if ApprovalDecision.objects.filter(order=order, approver=request.user).exists():
        return False
    return bool(roles(request.user, order.buyer_organization) & set(snapshot.get("roles", [])))


def decide(request: HttpRequest, order: Order, decision: str, comment: str) -> None:
    if not can_decide(request, order):
        fail(
            ErrorCode.FORBIDDEN,
            "You cannot decide on this order: it is yours, decided already, or not waiting for approval.",
        )
    if decision == ApprovalDecision.Decision.REJECTED and not comment.strip():
        invalid({"comment": ["Say why you are rejecting it; the person who placed it reads this."]})
    ApprovalDecision.objects.create(
        order=order, approver=request.user, decision=decision, comment=comment.strip(), decided_at=timezone.now()
    )
    from apps.notifications.services import notify

    who = person_name(request.user)
    params = {"order": order.order_number, "person": who, "reason": comment.strip() or "-"}
    if decision == ApprovalDecision.Decision.REJECTED:
        record(order, Order.Status.CANCELLED, request.user, f"Rejected by {who}: {comment.strip()}")
        if order.submitted_by:
            notify(
                order.submitted_by,
                event_key="approval",
                event_id=f"order:{order.pk}:rejected",
                message="order.rejected",
                params=params,
                deep_link=buyer_link(order),
            )
        return
    approved = ApprovalDecision.objects.filter(order=order, decision=ApprovalDecision.Decision.APPROVED).count()
    if approved >= int((order.approval_snapshot or {}).get("minimum", 1)):
        # Approved: now it waits for payment, with its stock on hold (refused here if the stock is gone).
        record(order, Order.Status.AWAITING_PAYMENT, request.user, f"Approved by {who}")
        hold(order)
        if order.submitted_by:
            notify(
                order.submitted_by,
                event_key="approval",
                event_id=f"order:{order.pk}:approved",
                message="order.approved",
                params=params,
                deep_link=buyer_link(order),
            )


def approval_view(order: Order, request: HttpRequest) -> dict[str, Any] | None:
    snapshot = order.approval_snapshot or {}
    if not snapshot:
        return None
    decisions = list(order.approvals.select_related("approver"))  # pyright: ignore[reportAttributeAccessIssue]
    approved = sum(1 for d in decisions if d.decision == ApprovalDecision.Decision.APPROVED)
    rejected = any(d.decision == ApprovalDecision.Decision.REJECTED for d in decisions)
    if snapshot.get("exempt"):
        state = "not_required"
    elif rejected:
        state = "rejected"
    else:
        state = "pending" if order.status == Order.Status.PENDING_APPROVAL else "approved"
    return {
        "state": state,
        "placed_as": snapshot.get("placed_as"),
        "policy": snapshot.get("name"),
        "threshold": snapshot.get("threshold"),
        "roles": snapshot.get("roles", []),
        "minimum": snapshot.get("minimum", 1),
        "approved": approved,
        "decisions": [
            {
                "approver": person_name(d.approver),
                "decision": d.decision,
                "comment": d.comment,
                "decided_at": d.decided_at.isoformat(),
            }
            for d in decisions
        ],
        "can_decide": can_decide(request, order),
    }
