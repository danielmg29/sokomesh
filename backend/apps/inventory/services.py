"""Inventory operations (SM-F-07) and stock reservations (SM-F-13). Callers own the transaction.

Every change locks its balance rows (`select_for_update`, always in id order so two checkouts never wait on
each other in a circle), checks what is available, applies the change through `_apply`, which appends the
movement, and keeps `Variant.stock_on_hand` (the available figure buyers and search read) in step. The
database's `never_oversold` constraint backs every check.

    receipt / adjustment / return ─► on hand        reservation ─► held       allocation: held ─► allocated
    release: held or allocated ─► available          shipment: allocated and on hand go out together
"""

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.catalog.models import Variant
from apps.inventory.models import Balance, ExpiryRun, Location, Movement, Reservation
from core.api import fail, invalid
from core.events import context
from core.events.record import audit, emit
from core.result import ErrorCode

M = Movement.Type
R = Reservation.Status


@dataclass(frozen=True, slots=True)
class Change:
    """How a movement moves the balance: on hand, held and allocated packs."""

    on_hand: int = 0
    reserved: int = 0
    allocated: int = 0

    @property
    def available(self) -> int:
        return self.on_hand - self.reserved - self.allocated


def default_location(seller: Any) -> Location:
    found = Location.objects.filter(seller=seller, is_default=True).first()
    if found:
        return found
    address = seller.addresses.order_by("created_at").first()
    return Location.objects.create(
        seller=seller, name=address.label if address else "Main warehouse", address=address, is_default=True
    )


def balances_of(variant: Variant) -> list[Balance]:
    return list(Balance.objects.filter(variant=variant).select_related("location"))


def tracked(variant: Variant) -> bool:
    return Balance.objects.filter(variant=variant).exists()


def sync_variant(variant_id: Any) -> None:
    """Keep the variant's available figure (read by carts, product pages and search) equal to the ledger."""
    totals = Balance.objects.filter(variant_id=variant_id).aggregate(
        h=Sum("on_hand"), r=Sum("reserved"), a=Sum("allocated")
    )
    available = None if totals["h"] is None else totals["h"] - totals["r"] - totals["a"]
    Variant.objects.filter(pk=variant_id).update(stock_on_hand=available)
    product_id = Variant.objects.filter(pk=variant_id).values_list("product_id", flat=True).first()

    def reindex() -> None:
        from apps.catalog.models import Product
        from apps.catalog.search import index

        product = Product.objects.filter(pk=product_id).first()
        if product:
            index(product)

    transaction.on_commit(reindex)


def _apply(
    balance: Balance,
    kind: str,
    change: Change,
    *,
    reference_type: str,
    reference_id: Any = "",
    reference_label: str = "",
    actor: Any = None,
    reason_code: str = "",
    note: str = "",
) -> Movement:
    """Change a locked balance and append its movement. Refuses anything that would oversell."""
    on_hand = balance.on_hand + change.on_hand
    reserved = balance.reserved + change.reserved
    allocated = balance.allocated + change.allocated
    if min(on_hand, reserved, allocated) < 0 or on_hand < reserved + allocated:
        fail(
            ErrorCode.CONFLICT,
            f"Only {balance.available} {balance.variant.packaging_unit}s of {balance.variant.sku} are available.",
        )
    balance.on_hand, balance.reserved, balance.allocated = on_hand, reserved, allocated
    balance.version += 1
    balance.save(update_fields=["on_hand", "reserved", "allocated", "version", "updated_at"])
    movement = Movement.objects.create(
        seller_id=balance.seller_id,  # pyright: ignore[reportAttributeAccessIssue]
        variant_id=balance.variant_id,  # pyright: ignore[reportAttributeAccessIssue]
        balance=balance,
        movement_type=kind,
        quantity=change.available,
        on_hand_change=change.on_hand,
        available_after=balance.available,
        on_hand_after=balance.on_hand,
        unit=balance.variant.packaging_unit,
        reference_type=reference_type,
        reference_id=str(reference_id),
        reference_label=reference_label[:80],
        reason_code=reason_code,
        note=note[:300],
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        occurred_at=timezone.now(),
        correlation_id=context.correlation_id(),
    )
    sync_variant(balance.variant_id)  # pyright: ignore[reportAttributeAccessIssue]
    if kind in (M.RECEIPT, M.ADJUSTMENT, M.RETURN):
        audit(
            f"inventory.{kind}",
            domain="inventory",
            resource=movement,
            organization=balance.seller_id,  # pyright: ignore[reportAttributeAccessIssue]
            actor=actor,
            summary=f"{change.on_hand:+d} {balance.variant.packaging_unit}s {balance.variant.sku}: "
            f"{Movement.Type(kind).label.lower()}"
            + (f" ({Movement.Reason(reason_code).label.lower()})" if reason_code else ""),
            reason=note,
            data={
                "variant": str(balance.variant_id),  # pyright: ignore[reportAttributeAccessIssue]
                "on_hand_after": balance.on_hand,
                "available_after": balance.available,
            },  # pyright: ignore[reportAttributeAccessIssue]
        )
    low = balance.variant.minimum_order_quantity * 3
    if change.available < 0 and balance.available < low <= balance.available - change.available:
        emit(
            "inventory.low",
            organization=balance.seller_id,  # pyright: ignore[reportAttributeAccessIssue]
            payload={"sku": balance.variant.sku, "available": balance.available},
        )  # pyright: ignore[reportAttributeAccessIssue]
    return movement


def _locked(variant: Variant, location: Location | None = None) -> Balance:
    qs = Balance.objects.select_for_update(of=("self",)).select_related("variant")
    found = qs.filter(variant=variant, **({"location": location} if location else {})).order_by("pk").first()
    if found is None:
        fail(ErrorCode.CONFLICT, f"{variant.sku} is not tracked yet. Record a receipt to start tracking it.")
    return found


def receive(variant: Variant, quantity: int, *, actor: Any, note: str = "", bin_label: str = "") -> Movement:
    """Goods in: starts tracking a variant at the seller's default location if it was not tracked."""
    if quantity < 1:
        invalid({"quantity": ["Receive at least one pack."]})
    location = default_location(variant.seller)
    balance, _ = Balance.objects.get_or_create(
        variant=variant, location=location, defaults={"seller": variant.seller, "bin_label": bin_label}
    )
    balance = Balance.objects.select_for_update(of=("self",)).select_related("variant").get(pk=balance.pk)
    if bin_label and balance.bin_label != bin_label:
        balance.bin_label = bin_label
        balance.save(update_fields=["bin_label"])
    return _apply(
        balance,
        M.RECEIPT,
        Change(on_hand=quantity),
        reference_type=Movement.Reference.RECEIPT,
        reference_label=note or "Goods received",
        actor=actor,
        note=note,
    )


def adjust(variant: Variant, change: int, *, actor: Any, reason_code: str, note: str) -> Movement:
    """A manual correction on hand, with its reason; it can never take away packs held or allocated."""
    if change == 0:
        invalid({"quantity_change": ["Enter how many packs to add or remove."]})
    if reason_code not in Movement.Reason.values:
        invalid({"reason_code": ["Choose why the stock is changing."]})
    if reason_code == Movement.Reason.OTHER and not note.strip():
        invalid({"note": ["Explain the adjustment."]})
    balance = _locked(variant)
    if balance.on_hand + change < balance.reserved + balance.allocated:
        fail(
            ErrorCode.CONFLICT,
            f"{balance.reserved + balance.allocated} packs are held or allocated to orders; "
            "on hand cannot go below that.",
            {"quantity_change": [f"Remove at most {balance.available} packs."]},
        )
    return _apply(
        balance,
        M.ADJUSTMENT,
        Change(on_hand=change),
        reference_type=Movement.Reference.MANUAL,
        reference_label=Movement.Reason(reason_code).label,  # pyright: ignore[reportArgumentType]
        actor=actor,
        reason_code=reason_code,
        note=note,
    )


# --- reservations (SM-F-13) -----------------------------------------------------------------------------


def ttl() -> timedelta:
    return timedelta(minutes=settings.AC_RESERVATIONS["ttl_minutes"])


def _reference() -> str:
    from apps.orders.checkout import next_reference

    return next_reference(Reservation, "reference", "RSV")


def reserve(order: Any, lines: list[tuple[Variant, int]], *, cart: Any = None, key: str) -> list[Reservation]:
    """Hold packs for an order until it is paid. All or nothing: a line short of stock refuses the lot.

    Untracked variants are not held (their seller confirms availability on the order). `key` makes a repeated
    command return the holds it already made instead of holding twice.
    """
    with context.bound(order.correlation_id):
        return _reserve(order, lines, cart=cart, key=key)


def _reserve(order: Any, lines: list[tuple[Variant, int]], *, cart: Any, key: str) -> list[Reservation]:
    wanted: dict[Any, int] = {}
    for variant, quantity in lines:
        wanted[variant.pk] = wanted.get(variant.pk, 0) + quantity
    existing = list(
        Reservation.objects.filter(idempotency_key__startswith=f"{key}:", status__in=[R.ACTIVE, R.CONSUMED])
    )
    if existing:
        return existing
    balances = list(
        Balance.objects.select_for_update(of=("self",))
        .select_related("variant")
        .filter(variant_id__in=wanted)
        .order_by("pk")
    )
    by_variant: dict[Any, Balance] = {}
    for b in balances:  # one location per variant for now: the first (default) one
        by_variant.setdefault(b.variant_id, b)  # pyright: ignore[reportAttributeAccessIssue]
    short = [
        f"{b.variant.sku}: {b.available} {b.variant.packaging_unit}s left, you asked for {wanted[vid]}."
        for vid, b in by_variant.items()
        if b.available < wanted[vid]
    ]
    if short:
        fail(ErrorCode.CONFLICT, "Some packs ran out while you were checking out. " + short[0], {"lines": short})
    until = timezone.now() + ttl()
    made = []
    for vid, b in by_variant.items():
        r = Reservation.objects.create(
            reference=_reference(),
            buyer_organization=order.buyer_organization,
            cart=cart,
            order=order,
            variant=b.variant,
            balance=b,
            quantity=wanted[vid],
            unit=b.variant.packaging_unit,
            idempotency_key=f"{key}:{vid}",
            expires_at=until,
        )
        _apply(
            b,
            M.RESERVATION,
            Change(reserved=wanted[vid]),
            reference_type=Movement.Reference.RESERVATION,
            reference_id=r.pk,
            reference_label=f"{r.reference} for {order.order_number}",
        )
        made.append(r)
    if made:
        audit(
            "inventory.reserved",
            domain="inventory",
            resource=("order", order.pk),
            organization=order.seller_organization,
            summary=f"Held {sum(r.quantity for r in made)} packs for {order.order_number} "
            f"until {timezone.localtime(until):%H:%M} EAT",
            data={"reservations": [r.reference for r in made], "expires_at": until.isoformat()},
        )
    return made


def _locked_reservation(r: Reservation) -> Reservation:
    return Reservation.objects.select_for_update(of=("self",)).select_related("balance__variant", "order").get(pk=r.pk)


def release(r: Reservation, status: str, *, actor: Any = None, why: str = "") -> bool:
    """Give held (or allocated, if the paid order is cancelled) packs back. Idempotent: False if done already."""
    r = _locked_reservation(r)
    if r.status not in (R.ACTIVE, R.CONSUMED):
        return False
    with context.bound(r.order.correlation_id if r.order else context.correlation_id()):
        return _release(r, status, actor=actor, why=why)


def _release(r: Reservation, status: str, *, actor: Any, why: str) -> bool:
    balance = Balance.objects.select_for_update(of=("self",)).select_related("variant").get(pk=r.balance_id)  # pyright: ignore[reportAttributeAccessIssue]
    change = Change(reserved=-r.quantity) if r.status == R.ACTIVE else Change(allocated=-r.quantity)
    label = r.order.order_number if r.order else r.reference
    _apply(
        balance,
        M.RELEASE,
        change,
        reference_type=Movement.Reference.RESERVATION,
        reference_id=r.pk,
        reference_label=f"{r.reference} {label}",
        actor=actor,
        note=why,
    )
    r.status = status if r.status == R.ACTIVE else R.CANCELLED
    r.released_at = timezone.now()
    r.version += 1
    r.save(update_fields=["status", "released_at", "version"])
    return True


def consume(r: Reservation) -> None:
    """Payment confirmed: held packs become allocated to the order (available does not change)."""
    r = _locked_reservation(r)
    if r.status != R.ACTIVE:
        return
    with context.bound(r.order.correlation_id if r.order else context.correlation_id()):
        _consume(r)


def _consume(r: Reservation) -> None:
    balance = Balance.objects.select_for_update(of=("self",)).select_related("variant").get(pk=r.balance_id)  # pyright: ignore[reportAttributeAccessIssue]
    _apply(
        balance,
        M.ALLOCATION,
        Change(reserved=-r.quantity, allocated=r.quantity),
        reference_type=Movement.Reference.ORDER,
        reference_id=r.order_id or "",  # pyright: ignore[reportAttributeAccessIssue]
        reference_label=r.order.order_number if r.order else r.reference,
    )  # pyright: ignore[reportAttributeAccessIssue]
    r.status, r.consumed_at = R.CONSUMED, timezone.now()
    r.version += 1
    r.save(update_fields=["status", "consumed_at", "version"])


def ship(order: Any, variant: Variant, picked: int, short: int, *, actor: Any = None) -> None:
    """Hand-over: picked packs leave the warehouse; packs short-shipped go back to available."""
    r = Reservation.objects.filter(order=order, variant=variant, status=R.CONSUMED).first()
    if r is None:  # untracked variant, or an order placed before the ledger
        return
    balance = Balance.objects.select_for_update(of=("self",)).select_related("variant").get(pk=r.balance_id)  # pyright: ignore[reportAttributeAccessIssue]
    if picked:
        _apply(
            balance,
            M.SHIPMENT,
            Change(on_hand=-picked, allocated=-picked),
            reference_type=Movement.Reference.ORDER,
            reference_id=order.pk,
            reference_label=order.order_number,
            actor=actor,
        )
    if short:
        _apply(
            balance,
            M.RELEASE,
            Change(allocated=-short),
            reference_type=Movement.Reference.ORDER,
            reference_id=order.pk,
            reference_label=f"{order.order_number} short-shipped",
            actor=actor,
            note="Short-shipped: allocation returned",
        )


def restock(variant: Variant, quantity: int, *, case: Any, actor: Any) -> None:
    """An approved return put back on the shelf."""
    if not tracked(variant) or quantity < 1:
        return
    balance = _locked(variant)
    _apply(
        balance,
        M.RETURN,
        Change(on_hand=quantity),
        reference_type=Movement.Reference.RETURN_CASE,
        reference_id=case.pk,
        reference_label=case.reference,
        actor=actor,
        note="Returned goods restocked",
    )


def release_order(order: Any, status: str = R.RELEASED, *, actor: Any = None, why: str = "") -> int:
    return sum(
        release(r, status, actor=actor, why=why)
        for r in Reservation.objects.filter(order=order, status__in=[R.ACTIVE, R.CONSUMED])
    )


def consume_order(order: Any) -> None:
    for r in Reservation.objects.filter(order=order, status=R.ACTIVE).order_by("pk"):
        consume(r)


def holds_lapsed(order: Any, now: Any = None) -> bool:
    """Whether an unpaid order's holds have run out (it had some, and none is still active in time)."""
    now = now or timezone.now()
    rs = list(Reservation.objects.filter(order=order))
    return bool(rs) and not any(r.status == R.ACTIVE and r.expires_at > now for r in rs)


# --- expiry (the ReservationExpiryJob) -----------------------------------------------------------------------


def expire_due(batch_size: int | None = None, *, order: Any = None, now: Any = None) -> ExpiryRun:
    """Release holds past their time in one bounded batch (skipping rows another worker holds), then cancel
    unpaid orders that have nothing left on hold. Safe to run anywhere, any number of times."""
    from apps.orders.models import Order

    now = now or timezone.now()
    size = batch_size or settings.AC_RESERVATIONS["batch_size"]
    run = ExpiryRun.objects.create(started_at=now, batch_size=size)
    try:
        with transaction.atomic():
            qs = Reservation.objects.select_for_update(skip_locked=True, of=("self",)).filter(
                status=R.ACTIVE, expires_at__lte=now
            )
            if order is not None:
                qs = qs.filter(order=order)
            claimed = list(qs.order_by("expires_at")[:size])
            run.claimed = len(claimed)
            orders = set()
            for r in claimed:
                with context.bound(r.order.correlation_id if r.order else context.correlation_id()):
                    if release(r, R.EXPIRED, why="The stock hold expired before payment."):
                        run.expired += 1
                        if r.order_id:  # pyright: ignore[reportAttributeAccessIssue]
                            orders.add(r.order_id)  # pyright: ignore[reportAttributeAccessIssue]
            for o in Order.objects.select_for_update(of=("self",)).filter(
                pk__in=orders, status=Order.Status.AWAITING_PAYMENT
            ):
                if holds_lapsed(o, now):
                    from apps.orders.lifecycle import expire_unpaid

                    with context.bound(o.correlation_id):
                        expire_unpaid(o)
                    run.orders_cancelled += 1
    except Exception as exc:  # recorded for operators; the next run tries again
        run.retry_count += 1
        run.last_error = str(exc)[:300]
    run.finished_at = timezone.now()
    run.save()
    return run
