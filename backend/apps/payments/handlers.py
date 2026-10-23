"""Payments' part of the order lifecycle: money taken for an order that is then cancelled goes back."""

from typing import Any

from django.dispatch import receiver

from apps.orders.lifecycle import order_moved
from apps.orders.models import Order
from apps.payments.services import refund_order


@receiver(order_moved, dispatch_uid="payments.refund_on_cancel")
def refund_on_cancel(sender: Any, order: Order, to_status: str, actor: Any, reason: str, **kwargs: Any) -> None:
    if to_status == Order.Status.CANCELLED:
        refund_order(order, order.total, why=f"Refunded: {reason or 'the order was cancelled'}", actor=actor)
