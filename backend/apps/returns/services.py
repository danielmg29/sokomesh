"""SM-F-18: opening a case, evidence, and the seller's decision. Callers own the transaction.

    open ─request evidence─► evidence requested ─buyer adds evidence─► under review ─decide─► resolved
      └──────────────────────────────── decide ─────────────────────────────────────┘          (or rejected)
A decision is carried out at once: the refund for the accepted packs goes back through the payment provider
(recorded as due when the provider cannot refund automatically), and restocked packs return to the ledger.
"""

from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.conf import settings
from django.db.models import Sum
from django.http import HttpRequest
from django.utils import timezone

from apps.orders.checkout import next_reference
from apps.orders.lifecycle import buyer_link, move, seller_link, side_of, tell
from apps.orders.models import Order, OrderTransition
from apps.returns.models import ReturnCase, ReturnEvidence
from core.api import fail, invalid
from core.events import context
from core.events.record import audit, emit
from core.result import ErrorCode

C = ReturnCase.Status
OPENABLE = (Order.Status.SHIPPED, Order.Status.DELIVERED, Order.Status.DISPUTED, Order.Status.PARTIALLY_FULFILLED)
OPEN_STATES = (C.OPEN, C.EVIDENCE_REQUESTED, C.REVIEWING)


def window_closes(order: Order) -> Any:
    """Claims are accepted for a while after delivery (or shipping, while it is on its way)."""
    moved = (
        OrderTransition.objects.filter(order=order, to_status__in=[Order.Status.DELIVERED, Order.Status.SHIPPED])
        .order_by("-occurred_at")
        .first()
    )
    since = moved.occurred_at if moved else order.submitted_at
    return since + timedelta(days=settings.AC_RETURNS["window_days"])


def claimed(line: Any, *, excluding: Any = None) -> int:
    qs = (
        ReturnCase.objects.filter(order_line=line)
        .exclude(status__in=[C.REJECTED])
        .exclude(decision=ReturnCase.Decision.REJECTED)
    )
    if excluding is not None:
        qs = qs.exclude(pk=excluding.pk)
    return qs.aggregate(n=Sum("quantity"))["n"] or 0


def prepare(request: HttpRequest, order: Order, data: dict[str, Any]) -> ReturnCase:
    """A buyer's claim, checked (the order is theirs and in the window, the packs not already claimed)."""
    if side_of(request, order) != "buyer":
        fail(ErrorCode.FORBIDDEN, "Only the buyer opens a case on an order.")
    if order.status not in OPENABLE:
        fail(ErrorCode.CONFLICT, "A case can be opened once the order has been shipped.")
    if timezone.now() > window_closes(order):
        fail(
            ErrorCode.CONFLICT, f"Cases on this order closed {settings.AC_RETURNS['window_days']} days after delivery."
        )
    line = data.get("order_line")
    if data.get("case_type") != ReturnCase.Type.DISPUTE and line is None:
        invalid({"order_line": ["Choose the line the problem is with."]})
    if line is not None:
        if line.order_id != order.pk:
            invalid({"order_line": ["Choose a line of this order."]})
        left = line.quantity_ordered - claimed(line)
        qty = data.get("quantity") or 0
        if not 1 <= qty <= left:
            invalid(
                {
                    "quantity": [
                        f"Claim between 1 and {left} packs." if left else "Every pack on this line is already claimed."
                    ]
                }
            )
    if not str(data.get("reason_details") or "").strip():
        invalid({"reason_details": ["Describe what happened; the seller reads this."]})
    return ReturnCase(
        reference=next_reference(ReturnCase, "reference", "RC"),
        order=order,
        buyer_organization=order.buyer_organization,
        seller_organization=order.seller_organization,
        opened_by=request.user,
        **data,
    )


def opened(case: ReturnCase) -> None:
    with context.bound(case.order.correlation_id):
        what = case.order_line.product_name_snapshot if case.order_line else "the whole order"
        audit(
            "return.opened",
            domain="return",
            resource=case,
            organization=case.seller_organization_id,  # pyright: ignore[reportAttributeAccessIssue]
            actor=case.opened_by,
            summary=f"{case.reference}: {case.get_case_type_display()} on {case.order.order_number}, {what}",  # pyright: ignore[reportAttributeAccessIssue]
            reason=case.reason_details,
        )  # pyright: ignore[reportAttributeAccessIssue]
        emit(
            "return.opened",
            organization=case.seller_organization_id,  # pyright: ignore[reportAttributeAccessIssue]
            payload={"case": case.reference, "order_number": case.order.order_number, "type": case.case_type},
        )  # pyright: ignore[reportAttributeAccessIssue]
        tell(
            case.seller_organization,
            ("seller_manager",),
            event_key="order",
            event_id=f"case:{case.pk}:opened",
            message="return.opened",
            params={"case": case.reference, "order": case.order.order_number, "buyer": case.buyer_organization.name},
            link=f"/sell/returns/{case.pk}",
        )


def open_dispute(request: HttpRequest, order: Order, reason: str) -> ReturnCase:
    """The order page's "Report a problem": the order is disputed and a case opened for the whole order."""
    move(request, order, "dispute", reason)
    case = prepare(
        request,
        order,
        {
            "case_type": ReturnCase.Type.DISPUTE,
            "reason_code": ReturnCase.Reason.OTHER,
            "reason_details": reason,
            "order_line": None,
            "quantity": None,
        },
    )
    case.save()
    opened(case)
    return case


def _seller(request: HttpRequest, case: ReturnCase) -> None:
    if side_of(request, case.order) != "seller":
        fail(ErrorCode.FORBIDDEN, "Only the seller decides on a case.")
    if case.status not in OPEN_STATES:
        fail(ErrorCode.CONFLICT, "This case is closed.")


def request_evidence(request: HttpRequest, case: ReturnCase, note: str) -> None:
    _seller(request, case)
    if not note.strip():
        invalid({"note": ["Say what you need to see, such as photos of the damaged bales."]})
    case.status, case.evidence_note = C.EVIDENCE_REQUESTED, note.strip()[:300]
    case.version += 1
    case.save()
    tell(
        case.buyer_organization,
        ("buyer_owner", "buyer_purchaser"),
        event_key="order",
        event_id=f"case:{case.pk}:evidence:{case.version}",
        message="return.evidence",
        params={"case": case.reference, "note": case.evidence_note},
        link=f"/returns/{case.pk}",
    )


def add_evidence(request: HttpRequest, case: ReturnCase, file: Any, note: str) -> ReturnEvidence:
    side = side_of(request, case.order)
    if side not in ("buyer", "seller"):
        fail(ErrorCode.FORBIDDEN)
    if case.status not in OPEN_STATES:
        fail(ErrorCode.CONFLICT, "This case is closed.")
    if case.evidence.count() >= settings.AC_RETURNS["max_evidence"]:  # pyright: ignore[reportAttributeAccessIssue]
        fail(ErrorCode.CONFLICT, f"A case holds at most {settings.AC_RETURNS['max_evidence']} files.")
    item = ReturnEvidence.objects.create(
        case=case, file=file, note=note.strip()[:300], side=side, uploaded_by=request.user
    )
    if side == "buyer" and case.status == C.EVIDENCE_REQUESTED:
        case.status = C.REVIEWING
        case.version += 1
        case.save()
        tell(
            case.seller_organization,
            ("seller_manager",),
            event_key="order",
            event_id=f"case:{case.pk}:evidence-added:{item.pk}",
            message="return.evidence_added",
            params={"case": case.reference},
            link=f"/sell/returns/{case.pk}",
        )
    return item


def decide(
    request: HttpRequest,
    case: ReturnCase,
    *,
    decision: str,
    approved_quantity: int | None,
    disposition: str,
    notes: str,
) -> None:
    from apps.inventory.services import restock
    from apps.payments.services import refund_order

    _seller(request, case)
    D = ReturnCase.Decision
    errors: dict[str, list[str]] = {}
    if decision not in D.values:
        errors["decision"] = ["Choose a decision."]
    if not notes.strip():
        errors["decision_notes"] = ["Explain the decision; the buyer reads it."]
    line, claimed_qty = case.order_line, case.quantity or 0
    if decision == D.PARTIAL and not (line and approved_quantity and 0 < approved_quantity < claimed_qty):
        errors["approved_quantity"] = [f"Accept between 1 and {max(claimed_qty - 1, 1)} packs, or approve in full."]
    if decision in (D.APPROVED, D.PARTIAL, D.REPLACEMENT) and line and disposition not in ReturnCase.Disposition.values:
        errors["stock_disposition"] = ["Say what happens to the returned packs."]
    if errors:
        invalid(errors)
    accepted = 0 if decision == D.REJECTED else (approved_quantity if decision == D.PARTIAL else claimed_qty) or 0
    refund = (line.unit_price * accepted) if line and decision in (D.APPROVED, D.PARTIAL) else Decimal("0")
    case.decision, case.decision_notes, case.approved_quantity = decision, notes.strip()[:1000], accepted or None
    case.stock_disposition = disposition if line and decision != D.REJECTED else ""
    case.decided_by, case.decided_at, case.refund_amount = request.user, timezone.now(), refund
    with context.bound(case.order.correlation_id):
        if refund:
            case.refunded_amount = refund_order(
                case.order, refund, why=f"Refunded on {case.reference}: {notes.strip()[:200]}", actor=request.user
            )
        if line and line.variant and accepted and disposition == ReturnCase.Disposition.RESTOCK:
            restock(line.variant, accepted, case=case, actor=request.user)
        if decision == D.REJECTED:
            case.status = C.REJECTED
        elif case.refunded_amount >= refund:
            case.status, case.resolved_at = C.RESOLVED, timezone.now()
        else:
            case.status = C.APPROVED  # the refund is due through finance (the provider cannot refund automatically)
        case.version += 1
        case.save()
        audit(
            "return.decided",
            domain="return",
            resource=case,
            organization=case.seller_organization_id,  # pyright: ignore[reportAttributeAccessIssue]
            actor=request.user,
            summary=f"{case.reference}: {case.get_decision_display()}"  # pyright: ignore[reportAttributeAccessIssue]
            + (f", KES {refund:,.2f} refund" if refund else "")
            + (
                f", {accepted} packs {ReturnCase.Disposition(disposition).label.lower()}"
                if case.stock_disposition
                else ""
            ),
            reason=case.decision_notes,
            data={"refund": format(refund, "f"), "refunded": format(case.refunded_amount, "f")},
        )  # pyright: ignore[reportAttributeAccessIssue]
        emit(
            "return.decided",
            organization=case.buyer_organization_id,  # pyright: ignore[reportAttributeAccessIssue]
            payload={"case": case.reference, "decision": decision, "refund": format(refund, "f")},
        )  # pyright: ignore[reportAttributeAccessIssue]
    tell(
        case.buyer_organization,
        ("buyer_owner", "buyer_purchaser"),
        event_key="order",
        event_id=f"case:{case.pk}:decided",
        message="return.decided",
        params={"case": case.reference, "decision": case.get_decision_display(), "notes": case.decision_notes},  # pyright: ignore[reportAttributeAccessIssue]
        link=f"/returns/{case.pk}",
    )  # pyright: ignore[reportAttributeAccessIssue]


def withdraw(request: HttpRequest, case: ReturnCase) -> None:
    if side_of(request, case.order) != "buyer":
        fail(ErrorCode.FORBIDDEN, "Only the buyer withdraws a case.")
    if case.status not in OPEN_STATES:
        fail(ErrorCode.CONFLICT, "This case is closed.")
    case.status, case.resolved_at, case.decision_notes = C.RESOLVED, timezone.now(), "Withdrawn by the buyer."
    case.version += 1
    case.save()
    audit(
        "return.withdrawn",
        domain="return",
        resource=case,
        organization=case.seller_organization_id,  # pyright: ignore[reportAttributeAccessIssue]
        actor=request.user,
        summary=f"{case.reference} withdrawn",
        correlation_id=case.order.correlation_id,
    )  # pyright: ignore[reportAttributeAccessIssue]


def case_summary(order: Order) -> list[dict[str, Any]]:
    return [
        {
            "id": str(c.pk),
            "reference": c.reference,
            "type": c.case_type,
            "status": c.status,
            "line": c.order_line.product_name_snapshot if c.order_line else None,
        }
        for c in order.cases.select_related("order_line")  # pyright: ignore[reportAttributeAccessIssue]
    ]


def case_view(case: ReturnCase, request: HttpRequest) -> dict[str, Any]:
    line = case.order_line
    return {
        "side": side_of(request, case.order),
        "order_ref": {"id": str(case.order.pk), "order_number": case.order.order_number},
        "line": {
            "product": line.product_name_snapshot,
            "sku": line.sku_snapshot,
            "quantity": line.quantity_ordered,
            "unit": line.unit,
            "unit_price": format(line.unit_price, "f"),
        }
        if line
        else None,
        "evidence": [
            {**e.file.describe(), "note": e.note, "side": e.side, "added_at": e.created_at.isoformat()}
            for e in case.evidence.select_related("file")  # pyright: ignore[reportAttributeAccessIssue]
        ],
        "window_closes": window_closes(case.order).isoformat(),
        "window_open": timezone.now() <= window_closes(case.order),
        "buyer": case.buyer_organization.name,
        "seller": case.seller_organization.name,
        "links": {"buyer": buyer_link(case.order), "seller": seller_link(case.order)},
    }
