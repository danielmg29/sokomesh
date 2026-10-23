"""SM-F-14: paying an order, and the one place a provider's result changes anything.

    pay ─► intent pending (prompt on the phone) ─► signed result ─► apply ─► confirmed ─► order submitted
                                                       │                       (held stock allocated, seller told)
                                                       └► failed / cancelled ─► the buyer may send the prompt again

Repeated taps reuse the pending intent; repeated or late results are kept as events but change nothing
(`apply_result` locks the intent, and only one event per provider event id can be applied). A payment that
arrives for an order that can no longer be served (cancelled, or its stock gone) is refunded.
"""

import hashlib
import json
from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.conf import settings
from django.db import IntegrityError, transaction
from django.http import HttpRequest
from django.utils import timezone

from apps.orders.lifecycle import buyer_link, record, side_of, tell
from apps.orders.models import Order
from apps.payments import providers
from apps.payments.models import PaymentEvent, PaymentIntent
from core.api import Problem, fail
from core.events import context
from core.events.record import audit, emit
from core.result import ErrorCode

PS = PaymentIntent.Status
FAILURES = {
    "cancelled_by_user": "You cancelled the prompt on your phone.",
    "wrong_pin": "The M-Pesa PIN was wrong, so nothing was paid.",
    "insufficient_funds": "The M-Pesa balance was too low, so nothing was paid.",
    "timeout": "The prompt expired before it was answered.",
}


def stale(intent: PaymentIntent, now: Any = None) -> bool:
    """A prompt with no result after a few minutes: shown as "not confirmed yet", and may be sent again."""
    limit = timedelta(minutes=settings.AC_PAYMENTS["stale_minutes"])
    return (
        intent.status == PS.PENDING and intent.sent_at is not None and (now or timezone.now()) - intent.sent_at > limit
    )


def sandbox_on(intent: PaymentIntent | None = None) -> bool:
    return bool(settings.AC_PAYMENTS.get("sandbox")) and (intent is None or intent.provider == "sandbox")


def payment_view(intent: PaymentIntent) -> dict[str, Any]:
    events = list(intent.events.all())  # pyright: ignore[reportAttributeAccessIssue]
    return {
        "id": str(intent.pk),
        "status": "stale" if stale(intent) else intent.status,
        "amount": format(intent.amount, "f"),
        "currency": intent.currency,
        "provider": intent.provider,
        "reference": intent.provider_intent_id,
        "phone": intent.phone_masked,
        "attempt": intent.attempt,
        "sent_at": intent.sent_at.isoformat() if intent.sent_at else None,
        "confirmed_at": intent.confirmed_at.isoformat() if intent.confirmed_at else None,
        "failure": intent.failure_reason or None,
        "refunded_amount": format(intent.refunded_amount, "f"),
        "results_received": len(events),
        "duplicates": sum(1 for e in events if e.processing_result == PaymentEvent.Result.DUPLICATE),
        "sandbox": sandbox_on(intent) and intent.status in (PS.PENDING,),
        "confirms": providers.named(intent.provider).confirms,
    }


def start(request: HttpRequest, order: Order, phone: str) -> PaymentIntent:
    """Send the M-Pesa prompt for an unpaid order (or return the prompt already waiting on the phone)."""
    from apps.inventory.services import expire_due

    order = Order.objects.select_for_update(of=("self",)).get(pk=order.pk)  # one payment command at a time
    if side_of(request, order) != "buyer":
        fail(ErrorCode.FORBIDDEN, "Only the buyer pays for an order.")
    with context.bound(order.correlation_id):
        if order.status == Order.Status.AWAITING_PAYMENT:
            expire_due(order=order)
            order.refresh_from_db()
        if order.status != Order.Status.AWAITING_PAYMENT:
            fail(
                ErrorCode.CONFLICT,
                "The stock hold expired, so the order was cancelled. Check out again to order these packs."
                if order.status == Order.Status.CANCELLED
                else "This order is not waiting for payment.",
            )
        latest = order.payments.order_by("-attempt").first()  # pyright: ignore[reportAttributeAccessIssue]
        if latest and (latest.status == PS.CONFIRMED or (latest.status == PS.PENDING and not stale(latest))):
            return latest  # repeated taps reuse the logical intent
        provider = providers.current()
        attempt = latest.attempt + 1 if latest else 1
        intent = PaymentIntent.objects.create(
            order=order,
            buyer_organization=order.buyer_organization,
            seller_organization=order.seller_organization,
            provider=provider.name,
            amount=order.total,
            currency=order.currency,
            idempotency_key=f"order:{order.pk}:{attempt}",
            attempt=attempt,
            phone_masked=providers.mask(phone),
            requested_by=request.user,
        )
        try:
            ref = provider.send_prompt(
                phone=phone,
                amount=order.total,
                reference=order.order_number,
                description=f"SokoMesh {order.order_number}",
            )
        except providers.ProviderError as exc:
            intent.status, intent.failure_code, intent.failure_reason = PS.FAILED, "provider_error", str(exc)[:200]
            intent.save()
            audit(
                "payment.failed",
                domain="payment",
                resource=intent,
                organization=order.seller_organization,
                actor=request.user,
                summary=f"Prompt for {order.order_number} not sent: {exc}",
            )
            return intent
        intent.provider_intent_id, intent.status, intent.sent_at = ref, PS.PENDING, timezone.now()
        intent.save()
        audit(
            "payment.prompt_sent",
            domain="payment",
            resource=intent,
            organization=order.seller_organization,
            actor=request.user,
            summary=f"M-Pesa prompt for {order.order_number}, KES {order.total:,.2f}, "
            f"sent to {intent.phone_masked} ({ref})",
            data={"reference": ref, "attempt": attempt, "amount": format(order.total, "f")},
        )
        return intent


# --- results -----------------------------------------------------------------------------------------------


def apply_result(provider_name: str, raw: bytes, signature: str | None) -> tuple[int, dict[str, Any]]:
    """A provider result, as it arrived. Always leaves a PaymentEvent; changes state at most once."""
    digest = hashlib.sha256(raw).hexdigest()
    valid = providers.verify(raw, signature)
    try:
        body = json.loads(raw)
        event_id, kind, data = str(body["id"]), str(body["type"]), dict(body.get("data") or {})
    except (ValueError, KeyError, TypeError):
        body, event_id, kind, data = {}, f"unreadable:{digest[:24]}", "unreadable", {}
    event = PaymentEvent(
        provider=provider_name,
        provider_event_id=event_id[:80],
        event_type=kind[:40],
        signature_valid=valid,
        payload_hash=digest,
    )

    def finish(result: str, code: str = "", status: int = 200) -> tuple[int, dict[str, Any]]:
        event.processing_result, event.error_code, event.processed_at = result, code, timezone.now()
        try:
            with transaction.atomic():
                event.save()
        except IntegrityError:  # another delivery of this event was applied first
            event.processing_result = PaymentEvent.Result.DUPLICATE
            event.save()
        return status, {"result": event.processing_result, "event": event_id}

    if not valid:
        audit(
            "payment.result_rejected",
            domain="payment",
            resource=("payment_event", event_id[:64]),
            summary="A payment result with a bad or expired signature was refused",
            data={"provider": provider_name},
        )
        return finish(PaymentEvent.Result.INVALID, "bad_signature", 401)
    intent = (
        PaymentIntent.objects.select_for_update(of=("self",))
        .select_related("order")
        .filter(provider=provider_name, provider_intent_id=data.get("reference"))
        .first()
    )
    if intent is None:
        return finish(PaymentEvent.Result.INVALID, "unknown_intent", 404)
    event.payment_intent = intent
    with context.bound(intent.order.correlation_id):
        if PaymentEvent.objects.filter(
            provider=provider_name,
            provider_event_id=event.provider_event_id,
            processing_result=PaymentEvent.Result.APPLIED,
        ).exists():
            audit(
                "payment.result_duplicate",
                domain="payment",
                resource=intent,
                organization=intent.seller_organization_id,  # pyright: ignore[reportAttributeAccessIssue]
                summary=f"Repeated result {event_id} for {intent.order.order_number} kept, not applied",
            )  # pyright: ignore[reportAttributeAccessIssue]
            return finish(PaymentEvent.Result.DUPLICATE)
        if kind == "payment.succeeded":
            if (
                Decimal(str(data.get("amount"))) != intent.amount
                or data.get("currency", intent.currency) != intent.currency
            ):
                audit(
                    "payment.conflict",
                    domain="payment",
                    resource=intent,
                    organization=intent.seller_organization_id,  # pyright: ignore[reportAttributeAccessIssue]
                    summary=f"Result for {intent.order.order_number} names a different amount; not applied",
                    data={"expected": format(intent.amount, "f"), "received": str(data.get("amount"))},
                )  # pyright: ignore[reportAttributeAccessIssue]
                return finish(PaymentEvent.Result.CONFLICT, "amount_mismatch")
            if intent.status in (PS.CONFIRMED, PS.REFUNDED):
                return finish(PaymentEvent.Result.IGNORED)
            confirm(intent, receipt=str(data.get("receipt") or intent.provider_intent_id))
            return finish(PaymentEvent.Result.APPLIED)
        if kind == "payment.failed":
            if intent.status not in (PS.PENDING, PS.CREATED):
                return finish(PaymentEvent.Result.IGNORED)
            decline(intent, str(data.get("failure_code") or "failed"))
            return finish(PaymentEvent.Result.APPLIED)
        return finish(PaymentEvent.Result.INVALID, "unknown_type", 400)


def decline(intent: PaymentIntent, code: str) -> None:
    intent.status = PS.CANCELLED if code == "cancelled_by_user" else PS.FAILED
    intent.failure_code, intent.failure_reason = code[:40], FAILURES.get(code, "The payment did not go through.")
    intent.version += 1
    intent.save()
    audit(
        f"payment.{intent.status}",
        domain="payment",
        resource=intent,
        organization=intent.seller_organization_id,  # pyright: ignore[reportAttributeAccessIssue]
        summary=f"{intent.order.order_number}: {intent.failure_reason}",
        data={"code": code},
    )  # pyright: ignore[reportAttributeAccessIssue]


def confirm(intent: PaymentIntent, *, receipt: str) -> None:
    """The buyer approved the prompt and M-Pesa took the money: submit the order to its seller."""
    from apps.inventory.services import consume_order, holds_lapsed, reserve
    from apps.orders.checkout import notify_seller

    intent.status, intent.confirmed_at = PS.CONFIRMED, timezone.now()
    intent.version += 1
    intent.save()
    order = Order.objects.select_for_update(of=("self",)).get(pk=intent.order_id)  # pyright: ignore[reportAttributeAccessIssue]
    audit(
        "payment.confirmed",
        domain="payment",
        resource=intent,
        organization=order.seller_organization_id,  # pyright: ignore[reportAttributeAccessIssue]
        summary=f"KES {intent.amount:,.2f} for {order.order_number} confirmed by M-Pesa ({receipt})",
        data={"reference": intent.provider_intent_id, "receipt": receipt, "amount": format(intent.amount, "f")},
    )  # pyright: ignore[reportAttributeAccessIssue]
    emit(
        "payment.confirmed",
        organization=order.seller_organization_id,  # pyright: ignore[reportAttributeAccessIssue]
        payload={
            "order_id": str(order.pk),
            "order_number": order.order_number,
            "amount": format(intent.amount, "f"),
            "currency": intent.currency,
        },
    )  # pyright: ignore[reportAttributeAccessIssue]
    if order.status != Order.Status.AWAITING_PAYMENT:
        why = (
            "the order was cancelled before the payment arrived"
            if order.status == Order.Status.CANCELLED
            else "the order was already paid"
        )
        refund(intent, intent.amount, why=f"Refunded: {why}.")
        return
    if holds_lapsed(order):  # paid after the hold ran out: hold again if the packs are still there
        try:
            with transaction.atomic():
                lines = [
                    (line.variant, line.quantity_ordered)
                    for line in order.lines.select_related("variant")  # pyright: ignore[reportAttributeAccessIssue]
                    if line.variant
                ]  # pyright: ignore[reportAttributeAccessIssue]
                reserve(order, lines, key=f"order:{order.pk}:paid:{intent.attempt}")
        except Problem:
            record(
                order,
                Order.Status.CANCELLED,
                None,
                "Paid after the stock hold expired, and the packs had gone; the payment is refunded.",
            )
            refund(intent, intent.amount, why="Refunded: the stock was no longer available.")
            return
    consume_order(order)
    record(order, Order.Status.SUBMITTED, None, f"Paid by M-Pesa ({receipt})")
    notify_seller(order)
    tell(
        order.buyer_organization,
        ("buyer_owner", "buyer_purchaser"),
        event_key="payment",
        event_id=f"payment:{intent.pk}:confirmed",
        message="payment.confirmed",
        params={
            "order": order.order_number,
            "total": f"KES {intent.amount:,.2f}",
            "seller": order.seller_organization.name,
        },
        link=buyer_link(order),
    )


def refund(intent: PaymentIntent, amount: Decimal, *, why: str, actor: Any = None) -> bool:
    """Give money back through the provider (the sandbox at once); otherwise record that it is due."""
    amount = min(Decimal(amount), intent.amount - intent.refunded_amount)
    if amount <= 0:
        return False
    ok = providers.named(intent.provider).refund(intent=intent, amount=amount)
    if ok:
        intent.refunded_amount += amount
        if intent.refunded_amount >= intent.amount:
            intent.status = PS.REFUNDED
        intent.version += 1
        intent.save()
        emit(
            "payment.refunded",
            organization=intent.seller_organization_id,  # pyright: ignore[reportAttributeAccessIssue]
            payload={"order_id": str(intent.order_id), "amount": format(amount, "f")},  # pyright: ignore[reportAttributeAccessIssue]
        )  # pyright: ignore[reportAttributeAccessIssue]
    audit(
        "payment.refunded" if ok else "payment.refund_due",
        domain="payment",
        resource=intent,
        organization=intent.seller_organization_id,  # pyright: ignore[reportAttributeAccessIssue]
        actor=actor,
        summary=f"KES {amount:,.2f} {'refunded' if ok else 'due back'} on {intent.order.order_number}",
        reason=why,
        data={"amount": format(amount, "f")},
    )
    return ok


def refund_order(order: Order, amount: Decimal, *, why: str, actor: Any = None) -> Decimal:
    """Refund up to `amount` across the order's confirmed payments; returns what was refunded."""
    left, done = Decimal(amount), Decimal("0")
    for intent in (
        PaymentIntent.objects.select_for_update(of=("self",))
        .filter(order=order, status__in=[PS.CONFIRMED, PS.REFUNDED])
        .order_by("confirmed_at")
    ):
        part = min(left, intent.amount - intent.refunded_amount)
        if part > 0 and refund(intent, part, why=why, actor=actor):
            done += part
            left -= part
    return done


# --- the sandbox phone ----------------------------------------------------------------------------------

OUTCOMES = {
    "approve": None,
    "cancel": "cancelled_by_user",
    "wrong_pin": "wrong_pin",
    "insufficient_funds": "insufficient_funds",
    "timeout": "timeout",
}


def simulate(request: HttpRequest, intent: PaymentIntent, outcome: str) -> PaymentIntent:
    """What the buyer does on the sandbox phone. The sandbox then delivers the signed result twice, as real
    providers retry, through `apply_result`: the second delivery is kept as a duplicate and changes nothing."""
    if not sandbox_on(intent):
        fail(ErrorCode.NOT_FOUND)
    if side_of(request, intent.order) != "buyer":
        fail(ErrorCode.FORBIDDEN, "Only the buyer's phone answers the prompt.")
    if outcome not in OUTCOMES:
        fail(ErrorCode.VALIDATION, "Choose what happens on the phone.", {"outcome": ["Choose an outcome."]})
    if intent.status != PS.PENDING:
        fail(ErrorCode.CONFLICT, "This prompt has already been answered.")
    code = OUTCOMES[outcome]
    body = json.dumps(
        {
            "id": f"evt_{intent.provider_intent_id}_{outcome}",
            "type": "payment.failed" if code else "payment.succeeded",
            "created": int(timezone.now().timestamp()),
            "data": {
                "reference": intent.provider_intent_id,
                "amount": format(intent.amount, "f"),
                "currency": intent.currency,
                "failure_code": code,
                "receipt": f"SBX{intent.provider_intent_id[-6:]}" if not code else None,
            },  # pyright: ignore[reportOptionalSubscript]
        },
        separators=(",", ":"),
    ).encode()
    for _ in range(2):
        apply_result("sandbox", body, providers.sign(body))
    intent.refresh_from_db()
    return intent
