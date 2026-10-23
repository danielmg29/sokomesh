"""SM-F-16: pick, pack and hand over one confirmed order. Callers own the transaction.

    confirmed ─► pick list queued ─start─► picking ─decide each line─► pack ─► hand over (photo) ─► shipped
                                                        │ short or not sent: the reason is required, the order is
                                                        └► marked partly fulfilled and the short value refunded
Hand-over moves the picked packs out of the ledger, returns short-shipped allocations to available stock,
opens the shipment (SM-F-17) and records who drove which vehicle.
"""

from decimal import Decimal
from typing import Any

from django.db.models import F
from django.utils import timezone

from apps.fulfillment.models import FulfillmentLine, FulfillmentTask
from apps.orders.lifecycle import record
from apps.orders.models import Order
from core.api import fail, invalid
from core.events import context
from core.events.record import audit
from core.result import ErrorCode

T = FulfillmentTask.Status
L = FulfillmentLine.Outcome
SHIPPABLE = (Order.Status.CONFIRMED, Order.Status.PICKING, Order.Status.PARTIALLY_FULFILLED)


def task_for(order: Order) -> FulfillmentTask:
    """The order's pick list, made once (when the seller confirms it, or on first use for older orders)."""
    task, made = FulfillmentTask.objects.get_or_create(order=order, defaults={"seller": order.seller_organization})
    if made:
        FulfillmentLine.objects.bulk_create(
            [
                FulfillmentLine(task=task, order_line=line, quantity_ordered=line.quantity_ordered)
                for line in order.lines.all()  # pyright: ignore[reportAttributeAccessIssue]
            ]  # pyright: ignore[reportAttributeAccessIssue]
        )
    return task


def _locked(task: FulfillmentTask) -> FulfillmentTask:
    return FulfillmentTask.objects.select_for_update(of=("self",)).select_related("order").get(pk=task.pk)


def start(task: FulfillmentTask, actor: Any) -> FulfillmentTask:
    task = _locked(task)
    if task.status != T.QUEUED:
        fail(ErrorCode.CONFLICT, "This pick list has already been started.")
    if task.order.status == Order.Status.CONFIRMED:
        record(task.order, Order.Status.PICKING, actor, "Picking started")  # the handler moves the task too
        task.refresh_from_db()
    else:
        _picking(task, actor)
    return task


def _picking(task: FulfillmentTask, actor: Any) -> None:
    task.status, task.started_at = T.PICKING, task.started_at or timezone.now()
    if getattr(actor, "is_authenticated", False):
        task.assigned_to = actor
    task.version += 1
    task.save()


def decide(task: FulfillmentTask, picks: list[dict[str, Any]], actor: Any) -> FulfillmentTask:
    """Record what was picked for some or all lines: all of it, part of it (with why), or none (with why)."""
    task = _locked(task)
    if task.status == T.QUEUED:
        start(task, actor)
        task = _locked(task)
    if task.status != T.PICKING:
        fail(ErrorCode.CONFLICT, "Lines can be picked only while the pick list is open.")
    lines = {str(line.pk): line for line in task.lines.select_related("order_line")}  # pyright: ignore[reportAttributeAccessIssue]
    errors: dict[str, list[str]] = {}
    for pick in picks if isinstance(picks, list) else []:
        line = lines.get(str(pick.get("line")))
        if line is None:
            errors["picks"] = ["One of the lines is not on this pick list."]
            continue
        try:
            picked = int(pick.get("picked", 0))
        except (TypeError, ValueError):
            picked = -1
        reason = str(pick.get("reason") or "").strip()[:300]
        name = line.order_line.product_name_snapshot
        if not 0 <= picked <= line.quantity_ordered:
            errors[f"picks.{line.pk}"] = [f"{name}: pick between 0 and {line.quantity_ordered}."]
            continue
        if picked < line.quantity_ordered and not reason:
            errors[f"picks.{line.pk}"] = [f"{name}: say why it is short; the buyer reads this."]
            continue
        line.quantity_picked = picked
        line.outcome = L.FULL if picked == line.quantity_ordered else L.REJECTED if picked == 0 else L.SHORT
        line.short_ship_reason = "" if line.outcome == L.FULL else reason
        line.save()
    if not picks:
        errors["picks"] = ["Record at least one line."]
    if errors:
        invalid(errors)
    return task


def pack(task: FulfillmentTask, *, packages: int | None, weight_kg: Any, actor: Any) -> FulfillmentTask:
    task = _locked(task)
    if task.status != T.PICKING:
        fail(ErrorCode.CONFLICT, "Pack once the lines are picked.")
    lines = list(task.lines.select_related("order_line"))  # pyright: ignore[reportAttributeAccessIssue]
    waiting = [line for line in lines if line.outcome == L.PENDING]
    if waiting:
        fail(
            ErrorCode.CONFLICT, f"Decide {len(waiting)} more {'line' if len(waiting) == 1 else 'lines'} before packing."
        )
    if all(line.quantity_picked == 0 for line in lines):
        fail(ErrorCode.CONFLICT, "Nothing was picked. Cancel the order instead, with the reason.")
    task.status, task.packed_at, task.packages, task.weight_kg = T.PACKED, timezone.now(), packages, weight_kg
    task.version += 1
    task.save()
    short = [line for line in lines if line.outcome != L.FULL]
    if short:
        why = "; ".join(
            f"{line.order_line.product_name_snapshot}: {line.quantity_picked} of {line.quantity_ordered}"
            f" ({line.short_ship_reason})"
            for line in short
        )
        record(task.order, Order.Status.PARTIALLY_FULFILLED, actor, why[:1000])
    return task


def hand_over(
    task: FulfillmentTask,
    *,
    actor: Any,
    carrier_name: str,
    carrier_reference: str = "",
    start_at: Any = None,
    end_at: Any = None,
    driver_name: str = "",
    vehicle_registration: str = "",
    evidence: Any = None,
    require_evidence: bool = True,
) -> FulfillmentTask:
    from apps.delivery.services import start as open_shipment
    from apps.inventory.services import ship
    from apps.payments.services import refund_order

    task = _locked(task)
    order = Order.objects.select_for_update(of=("self",)).get(pk=task.order_id)  # pyright: ignore[reportAttributeAccessIssue]
    if task.status != T.PACKED:
        fail(ErrorCode.CONFLICT, "Hand over once the order is packed.")
    if order.status not in SHIPPABLE:
        fail(ErrorCode.CONFLICT, "This order can no longer be shipped.")
    if require_evidence and evidence is None:
        invalid({"evidence_file": ["Add the handover photo: the loaded goods with the delivery note."]})
    if not carrier_name.strip():
        invalid({"carrier_name": ["Who is carrying it?"]})
    with context.bound(order.correlation_id):
        short_value = Decimal("0")
        for line in task.lines.select_related("order_line__variant"):  # pyright: ignore[reportAttributeAccessIssue]
            ol = line.order_line
            if ol.variant:
                ship(order, ol.variant, line.quantity_picked, line.short, actor=actor)
            short_value += ol.unit_price * line.short
        task.status, task.handed_over_at = T.HANDED_OVER, timezone.now()
        task.driver_name, task.vehicle_registration, task.handover_evidence = (
            driver_name[:80],
            vehicle_registration[:20],
            evidence,
        )
        task.version += 1
        task.save()
        record(
            order,
            Order.Status.SHIPPED,
            actor,
            f"Handed to {carrier_name}" + (f", {vehicle_registration}" if vehicle_registration else ""),
        )
        open_shipment(
            order, carrier_name=carrier_name, carrier_reference=carrier_reference, start_at=start_at, end_at=end_at
        )
        audit(
            "fulfilment.handed_over",
            domain="fulfilment",
            resource=task,
            organization=order.seller_organization_id,  # pyright: ignore[reportAttributeAccessIssue]
            actor=actor,
            summary=f"{order.order_number} handed to {carrier_name}" + (" with a handover photo" if evidence else ""),
            data={"short_value": format(short_value, "f"), "driver": driver_name, "vehicle": vehicle_registration},
        )
        if short_value > 0:
            refund_order(order, short_value, why="Refunded: packs short-shipped.", actor=actor)
    return task


def ship_now(
    order: Order,
    *,
    actor: Any,
    carrier_name: str,
    carrier_reference: str = "",
    start_at: Any = None,
    end_at: Any = None,
) -> FulfillmentTask:
    """The order page's quick path: everything still undecided is picked in full, packed and handed over."""
    if order.status not in SHIPPABLE:
        fail(ErrorCode.CONFLICT, "This order cannot be shipped now.")
    task = _locked(task_for(order))
    if task.status == T.QUEUED:
        _picking(task, actor)
    if task.status == T.PICKING:
        task.lines.filter(outcome=L.PENDING).update(outcome=L.FULL, quantity_picked=F("quantity_ordered"))  # pyright: ignore[reportAttributeAccessIssue]
        task.status, task.packed_at = T.PACKED, timezone.now()
        task.save()
    return hand_over(
        task,
        actor=actor,
        carrier_name=carrier_name,
        carrier_reference=carrier_reference,
        start_at=start_at,
        end_at=end_at,
        require_evidence=False,
    )


def task_view(task: FulfillmentTask, request: Any = None) -> dict[str, Any]:
    from apps.inventory.models import Balance

    order = task.order
    lines = list(task.lines.select_related("order_line__variant"))  # pyright: ignore[reportAttributeAccessIssue]
    wanted = [line.order_line.variant_id for line in lines]
    shelves = {b.variant_id: b for b in Balance.objects.filter(variant_id__in=wanted)}  # pyright: ignore[reportAttributeAccessIssue]
    return {
        "order_number": order.order_number,
        "order_id": str(order.pk),
        "order_status": order.status,
        "buyer": order.buyer_organization.name,
        "deliver_to": ", ".join(filter(None, [(order.delivery_snapshot or {}).get(k) for k in ("line1", "city")])),
        "instructions": order.special_instructions,
        "lines": [
            {
                "id": str(line.pk),
                "product": line.order_line.product_name_snapshot,
                "pack_label": line.order_line.pack_label_snapshot,
                "sku": line.order_line.sku_snapshot,
                "unit": line.order_line.unit,
                "ordered": line.quantity_ordered,
                "picked": line.quantity_picked,
                "outcome": line.outcome,
                "reason": line.short_ship_reason or None,
                "bin": shelves[line.order_line.variant_id].bin_label if line.order_line.variant_id in shelves else None,  # pyright: ignore[reportAttributeAccessIssue]
                "on_shelf": shelves[line.order_line.variant_id].on_hand
                if line.order_line.variant_id in shelves
                else None,  # pyright: ignore[reportAttributeAccessIssue]
            }
            for line in lines
        ],
        "handover_evidence": task.handover_evidence.describe() if task.handover_evidence else None,
    }
