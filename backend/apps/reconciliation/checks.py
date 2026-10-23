"""SM-F-24 reconciliation: checks that the records which must agree do, and a trace of one journey.

Each check is a query that should find nothing; anything it finds is listed (at most a few examples) with
what it means. The trace collects every audit row that shares a correlation id: one order's checkout,
holds, payment, fulfilment, delivery and returns, in time order.
"""

from datetime import timedelta
from typing import Any

from django.db.models import Exists, F, OuterRef, Q, Subquery, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.integrations.models import WebhookDelivery
from apps.inventory.models import Balance, Movement, Reservation
from apps.orders.models import Order
from apps.payments.models import PaymentIntent
from core.events.models import AuditEvent, OutboxEvent

PAST_PAYMENT = [
    Order.Status.SUBMITTED,
    Order.Status.CONFIRMED,
    Order.Status.PICKING,
    Order.Status.PARTIALLY_FULFILLED,
    Order.Status.SHIPPED,
    Order.Status.DELIVERED,
    Order.Status.DISPUTED,
]
EXAMPLES = 5


# Checks whose examples are order numbers or hold references, which the trace can follow.
TRACEABLE = {"unpaid_orders", "paid_not_submitted", "lagging_holds", "orphaned_allocations", "refunds_due"}


def _check(key: str, label: str, help_text: str, rows: list[str], count: int) -> dict[str, Any]:
    return {
        "key": key,
        "label": label,
        "help": help_text,
        "count": count,
        "ok": count == 0,
        "examples": rows[:EXAMPLES],
        "traceable": key in TRACEABLE,
    }


def run_checks(now: Any = None) -> list[dict[str, Any]]:
    now = now or timezone.now()
    paid = PaymentIntent.objects.filter(
        order=OuterRef("pk"), status__in=[PaymentIntent.Status.CONFIRMED, PaymentIntent.Status.REFUNDED]
    )
    unpaid = Order.objects.filter(status__in=PAST_PAYMENT).filter(~Exists(paid))
    stuck = PaymentIntent.objects.filter(
        status=PaymentIntent.Status.CONFIRMED, order__status=Order.Status.AWAITING_PAYMENT
    )
    moved = (
        Movement.objects.filter(balance=OuterRef("pk")).values("balance").annotate(s=Sum("on_hand_change")).values("s")
    )
    drift = Balance.objects.annotate(ledger=Coalesce(Subquery(moved), 0)).exclude(on_hand=F("ledger"))
    lagging = Reservation.objects.filter(status=Reservation.Status.ACTIVE, expires_at__lt=now - timedelta(minutes=5))
    orphaned = Reservation.objects.filter(status=Reservation.Status.CONSUMED).filter(
        Q(order__status=Order.Status.CANCELLED) | Q(order__isnull=True)
    )
    refund_due = PaymentIntent.objects.filter(
        order__status=Order.Status.CANCELLED, status=PaymentIntent.Status.CONFIRMED
    )
    backlog = OutboxEvent.objects.filter(status=OutboxEvent.Status.PENDING, available_at__lt=now - timedelta(minutes=5))
    failed = WebhookDelivery.objects.filter(status=WebhookDelivery.Status.FAILED)
    return [
        _check(
            "unpaid_orders",
            "Orders with sellers but no confirmed payment",
            "Every order a seller sees should have been paid. "
            "Orders placed before payments were recorded also show here.",
            [o.order_number for o in unpaid[:EXAMPLES]],
            unpaid.count(),
        ),
        _check(
            "paid_not_submitted",
            "Confirmed payments whose order still waits for payment",
            "A confirmed payment should submit its order at once.",
            [p.order.order_number for p in stuck.select_related("order")[:EXAMPLES]],
            stuck.count(),
        ),
        _check(
            "ledger_drift",
            "Stock balances that differ from their movements",
            "On hand must equal the sum of its movements; a difference means a change bypassed the ledger.",
            [f"{b.variant.sku} at {b.location.name}" for b in drift.select_related("variant", "location")[:EXAMPLES]],
            drift.count(),
        ),
        _check(
            "lagging_holds",
            "Stock holds past their time and not yet released",
            "The expiry worker (expire_reservations) is behind or stopped.",
            [r.reference for r in lagging[:EXAMPLES]],
            lagging.count(),
        ),
        _check(
            "orphaned_allocations",
            "Stock allocated to cancelled orders",
            "A cancelled order should give its allocated packs back.",
            [r.reference for r in orphaned[:EXAMPLES]],
            orphaned.count(),
        ),
        _check(
            "refunds_due",
            "Payments to refund on cancelled orders",
            "The provider could not refund automatically; finance must return the money.",
            [p.order.order_number for p in refund_due.select_related("order")[:EXAMPLES]],
            refund_due.count(),
        ),
        _check(
            "outbox_backlog",
            "Integration events waiting more than five minutes",
            "The relay (relay_outbox) is behind or stopped.",
            [e.topic for e in backlog[:EXAMPLES]],
            backlog.count(),
        ),
        _check(
            "failed_webhooks",
            "Webhook deliveries that gave up",
            "An organization's endpoint refused every attempt; they can send it again.",
            [f"{d.topic} to {d.endpoint.url}" for d in failed.select_related("endpoint")[:EXAMPLES]],
            failed.count(),
        ),
    ]


def resolve(query: str) -> tuple[str | None, str]:
    """An order number, a correlation id, a payment or reservation reference, to the journey's correlation id."""
    q = query.strip()[:64]
    if not q:
        return None, ""
    order = Order.objects.filter(Q(order_number__iexact=q) | Q(correlation_id=q)).first()
    if order is None:
        intent = PaymentIntent.objects.select_related("order").filter(provider_intent_id=q).first()
        order = intent.order if intent else None
    if order is None:
        hold = Reservation.objects.select_related("order").filter(reference__iexact=q).first()
        order = hold.order if hold else None
    if order is not None:
        return order.correlation_id, order.order_number
    return (q, q) if AuditEvent.objects.filter(correlation_id=q).exists() else (None, q)


def trace(correlation: str, limit: int = 200) -> list[dict[str, Any]]:
    return [
        {
            "id": str(e.pk),
            "at": e.occurred_at.isoformat(),
            "domain": e.domain,
            "event": e.event_type,
            "summary": e.summary,
            "reason": e.reason or None,
            "requestId": e.request_id,
            "eventId": str(e.pk)[:8],
            "actor": e.actor_label,
        }
        for e in AuditEvent.objects.filter(correlation_id=correlation).order_by("occurred_at")[:limit]
    ]
