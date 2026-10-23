"""Inventory's part of the order lifecycle: a cancelled order gives back what it held or was allocated."""

from typing import Any

from django.dispatch import receiver

from apps.inventory.services import release_order
from apps.orders.lifecycle import order_moved
from apps.orders.models import Order


@receiver(order_moved, dispatch_uid="inventory.release_on_cancel")
def release_on_cancel(sender: Any, order: Order, to_status: str, actor: Any, reason: str, **kwargs: Any) -> None:
    if to_status == Order.Status.CANCELLED:
        release_order(order, actor=actor, why=reason or "Order cancelled")
