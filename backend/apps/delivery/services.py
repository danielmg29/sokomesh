"""Shipments and their events (SM-F-17): started by the order's ship command, kept current by the seller.

Status follows the events: handed over, in transit (and out for delivery), a problem, delivered. A
delivered event (with optional proof of delivery) also moves the order to delivered. Freshness is
reported, never invented: `stale` when nothing has arrived for AC_DELIVERY["stale_hours"], `delayed` when
the expected window has passed or the last event says so.
"""

from datetime import timedelta
from typing import Any

from django.conf import settings
from django.utils import timezone

from apps.delivery.models import Shipment, ShipmentEvent
from apps.orders.models import Order

STATUS_FOR: dict[str, str] = {
    ShipmentEvent.Type.HANDED_OVER: Shipment.Status.HANDED_OVER,
    ShipmentEvent.Type.IN_TRANSIT: Shipment.Status.IN_TRANSIT,
    ShipmentEvent.Type.OUT_FOR_DELIVERY: Shipment.Status.IN_TRANSIT,
    ShipmentEvent.Type.DELAYED: Shipment.Status.IN_TRANSIT,
    ShipmentEvent.Type.EXCEPTION: Shipment.Status.EXCEPTION,
    ShipmentEvent.Type.DELIVERED: Shipment.Status.DELIVERED,
}


def start(order: Order, *, carrier_name: str, carrier_reference: str, start_at: Any, end_at: Any) -> Shipment:
    shipment = Shipment.objects.create(
        order=order,
        carrier_name=carrier_name,
        carrier_reference=carrier_reference,
        estimated_start_at=start_at,
        estimated_end_at=end_at,
    )
    add_event(shipment, ShipmentEvent.Type.HANDED_OVER, description=f"Handed to {carrier_name or 'the carrier'}.")
    return shipment


def add_event(
    shipment: Shipment,
    event_type: str,
    *,
    description: str = "",
    location: str = "",
    occurred_at: Any = None,
    source: str = ShipmentEvent.Source.SELLER,
) -> ShipmentEvent:
    event = ShipmentEvent.objects.create(
        shipment=shipment,
        event_type=event_type,
        description=description,
        location_text=location,
        occurred_at=occurred_at or timezone.now(),
        source=source,
    )
    if event_type in STATUS_FOR and shipment.status != Shipment.Status.DELIVERED:
        shipment.status = STATUS_FOR[event_type]
    latest = shipment.last_event_at
    shipment.last_event_at = event.occurred_at if latest is None or event.occurred_at > latest else latest
    shipment.save(update_fields=["status", "last_event_at"])
    return event


def shipment_view(s: Shipment, now: Any = None) -> dict[str, Any]:
    now = now or timezone.now()
    events = list(s.events.all())  # pyright: ignore[reportAttributeAccessIssue]
    last = events[-1] if events else None
    open_ = s.status not in (Shipment.Status.DELIVERED,)
    stale = bool(
        open_ and s.last_event_at and now - s.last_event_at > timedelta(hours=settings.AC_DELIVERY["stale_hours"])
    )
    late = bool(open_ and s.estimated_end_at and s.estimated_end_at < now)
    pod = s.proof_of_delivery
    return {
        "id": str(s.pk),
        "carrier_name": s.carrier_name,
        "carrier_reference": s.carrier_reference,
        "status": s.status,
        "estimated_start_at": s.estimated_start_at.isoformat() if s.estimated_start_at else None,
        "estimated_end_at": s.estimated_end_at.isoformat() if s.estimated_end_at else None,
        "last_event_at": s.last_event_at.isoformat() if s.last_event_at else None,
        "last_source": last.source if last else None,
        "stale": stale,
        "delayed": late
        or bool(last and last.event_type in (ShipmentEvent.Type.DELAYED, ShipmentEvent.Type.EXCEPTION) and open_),
        "events": [
            {
                "id": str(e.pk),
                "type": e.event_type,
                "label": ShipmentEvent.Type(e.event_type).label,
                "description": e.description,
                "location": e.location_text or None,
                "occurred_at": e.occurred_at.isoformat(),
                "received_at": e.received_at.isoformat(),
                "source": e.source,
            }
            for e in events
        ],
        "proof_of_delivery": pod.describe() if pod else None,
    }
