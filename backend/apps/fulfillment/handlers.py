"""Fulfilment's part of the order lifecycle: a confirmed order gets its pick list; picking and cancellation
are mirrored on it (whether they start from the order page or the warehouse)."""

from typing import Any

from django.dispatch import receiver

from apps.fulfillment.models import FulfillmentTask
from apps.fulfillment.services import _picking, task_for
from apps.orders.lifecycle import order_moved
from apps.orders.models import Order


@receiver(order_moved, dispatch_uid="fulfillment.follow_order")
def follow_order(sender: Any, order: Order, to_status: str, actor: Any, **kwargs: Any) -> None:
    if to_status == Order.Status.CONFIRMED:
        task_for(order)
    elif to_status == Order.Status.PICKING:
        task = task_for(order)
        if task.status == FulfillmentTask.Status.QUEUED:
            _picking(task, actor)
    elif to_status == Order.Status.CANCELLED:
        FulfillmentTask.objects.filter(order=order).exclude(status=FulfillmentTask.Status.HANDED_OVER).update(
            status=FulfillmentTask.Status.CANCELLED
        )
