"""Placing orders (SM-F-15) from a cart or an accepted quote, under the buyer's approval policy (SM-F-12).

Checkout revalidates everything on the server: every line still on sale, minimum orders and reported
stock met, and every quoted price equal to the price resolved now (otherwise the buyer must accept the new
prices first: repricing is never silent). It writes one order per seller with its terms copied, evaluates
the approval policy against each order's own total, and converts the cart. An order needing approval
waits in `pending_approval`; it cannot reach the seller any other way.
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from django.db import IntegrityError, transaction
from django.http import HttpRequest
from django.utils import timezone

from apps.carts.models import Cart, CartLine, on_sale
from apps.carts.services import buyer_org, lines_of
from apps.catalog import contracts
from apps.catalog.pricing import resolve
from apps.orders.lifecycle import buyer_link, members, person_name, record, seller_link, seller_name, tell
from apps.orders.models import ApprovalPolicy, Order, OrderLine
from apps.organizations.models import Address, Organization
from core.api import fail, invalid
from core.result import ErrorCode


@dataclass(frozen=True, slots=True)
class LineTerms:
    variant: Any
    quantity: int
    unit_price: Decimal
    explanation: str


def next_reference(model: Any, field: str, prefix: str) -> str:
    """The next human reference for this year, `SO-2026-0164` (a unique constraint settles races)."""
    year = timezone.localdate().year
    stem = f"{prefix}-{year}-"
    last = (
        model.objects.filter(**{f"{field}__startswith": stem})
        .order_by(f"-{field}")
        .values_list(field, flat=True)
        .first()
    )
    number = int(last.rsplit("-", 1)[1]) + 1 if last else 1
    return f"{stem}{number:04d}"


def applicable_policy(buyer: Organization, total: Decimal) -> ApprovalPolicy | None:
    """The strictest active policy the total reaches (the highest threshold at or below it)."""
    return (
        ApprovalPolicy.objects.filter(buyer_organization=buyer, is_active=True, threshold_amount__lte=total)
        .order_by("-threshold_amount")
        .first()
    )


def address_snapshot(a: Address) -> dict[str, Any]:
    return {k: getattr(a, k, "") for k in ("label", "line1", "city", "region", "postal_code")}


def _address(buyer: Organization, value: Any) -> Address:
    ref = value.get("id") if isinstance(value, dict) else value
    try:
        return Address.objects.get(pk=ref, organization=buyer)
    except Exception:  # missing, malformed or another organization's
        invalid({"delivery_address": ["Choose one of your organization's addresses."]})


def _numbered(**fields: Any) -> Order:
    """Create the order under the next free number; another checkout may take a number first."""
    for attempt in range(3):
        try:
            with transaction.atomic():
                return Order.objects.create(order_number=next_reference(Order, "order_number", "SO"), **fields)
        except IntegrityError:
            if attempt == 2:
                raise
    raise AssertionError("unreachable")


def place(
    *,
    request: HttpRequest,
    buyer: Organization,
    seller: Organization,
    address: Address,
    instructions: str,
    lines: list[LineTerms],
    quote: Any = None,
) -> Order:
    user = request.user
    subtotal = sum((t.unit_price * t.quantity for t in lines), Decimal("0"))
    policy = applicable_policy(buyer, subtotal)
    if policy is not None:
        approvers = [u for u in members(buyer, tuple(policy.approver_role_keys)) if u.pk != user.pk]
        if len(approvers) < policy.minimum_approvals:
            fail(
                ErrorCode.CONFLICT,
                f"This order needs {policy.minimum_approvals} approval under “{policy.name}”, but nobody else in "
                f"{buyer.name} can approve it. Ask an owner to add an approver or change the policy.",
            )
    order = _numbered(
        buyer_organization=buyer,
        seller_organization=seller,
        submitted_by=user,
        delivery_address=address,
        delivery_snapshot=address_snapshot(address),
        quote=quote,
        subtotal=subtotal,
        total=subtotal,
        status=Order.Status.PENDING_APPROVAL if policy else Order.Status.SUBMITTED,
        special_instructions=instructions[:1000],
        submitted_at=timezone.now(),
        approval_policy=policy,
        approval_snapshot={
            "name": policy.name,
            "threshold": format(policy.threshold_amount, "f"),
            "currency": policy.currency,
            "roles": list(policy.approver_role_keys),
            "minimum": policy.minimum_approvals,
        }
        if policy
        else {},
    )
    for t in lines:
        v, p = t.variant, t.variant.product
        OrderLine.objects.create(
            order=order,
            variant=v,
            product_name_snapshot=p.name,
            sku_snapshot=v.sku,
            pack_label_snapshot=contracts.pack_label(p.category_contract, p.attributes or {}, v),
            quantity_ordered=t.quantity,
            unit=v.packaging_unit,
            unit_price=t.unit_price,
            line_total=t.unit_price * t.quantity,
            price_explanation=t.explanation[:160],
        )
    # The order's first transition: placed, either awaiting approval or straight to the seller.
    order.status, first = "", order.status
    record(order, first, user, "Placed from a quote" if quote else "Placed from the cart")
    params = {
        "order": order.order_number,
        "buyer": buyer.name,
        "seller": seller_name(order),
        "total": f"KES {subtotal:,.2f}",
    }
    if first == Order.Status.PENDING_APPROVAL:
        tell(
            buyer,
            tuple(order.approval_snapshot["roles"]),
            event_key="approval",
            event_id=f"order:{order.pk}:approval",
            message="order.needs_approval",
            params={**params, "person": person_name(user)},
            link=buyer_link(order),
            skip=user,
        )
    else:
        notify_seller(order)
    return order


def notify_seller(order: Order) -> None:
    params = {"order": order.order_number, "buyer": order.buyer_organization.name, "total": f"KES {order.total:,.2f}"}
    tell(
        order.seller_organization,
        ("seller_manager", "warehouse_operator"),
        event_key="order",
        event_id=f"order:{order.pk}:submitted",
        message="order.placed",
        params=params,
        link=seller_link(order),
    )


def checkout(request: HttpRequest, cart: Cart, address_value: Any, instructions: str) -> list[Order]:
    """Place one order per seller from the buyer's active cart, at the prices the buyer accepted."""
    buyer = buyer_org(request)
    # Lock the cart for this transaction (the command's): a second submit waits, then finds it converted.
    cart = Cart.objects.select_for_update(of=("self",)).get(pk=cart.pk)
    if cart.status != Cart.Status.ACTIVE:
        fail(ErrorCode.CONFLICT, "This cart is closed.")
    address = _address(buyer, address_value)
    lines = lines_of(cart)
    if not lines:
        fail(ErrorCode.CONFLICT, "The cart is empty.")
    problems: list[str] = []
    groups: dict[Any, list[LineTerms]] = {}
    for line in lines:
        v = line.variant
        name = v.product.name
        if not on_sale(v):
            problems.append(f"{name} is no longer on sale. Remove it to continue.")
            continue
        if line.quantity < v.minimum_order_quantity:
            problems.append(f"{name}: the minimum order is {v.minimum_order_quantity} packs.")
        if v.stock_on_hand is not None and line.quantity > v.stock_on_hand:
            problems.append(f"{name}: only {v.stock_on_hand} packs are in stock.")
        price = resolve(v, buyer, line.quantity)
        if price.unit_price != line.quoted_unit_price:
            problems.append(f"{name}: the price changed. Accept the new prices to continue.")
        groups.setdefault(line.seller_id, []).append(
            LineTerms(v, line.quantity, line.quoted_unit_price, price.explanation)
        )  # pyright: ignore[reportAttributeAccessIssue]
    if problems:
        fail(ErrorCode.CONFLICT, problems[0], {"lines": problems})
    orders = [
        place(
            request=request,
            buyer=buyer,
            seller=Organization.objects.get(pk=seller_id),
            address=address,
            instructions=instructions,
            lines=terms,
        )
        for seller_id, terms in groups.items()
    ]
    cart.status = Cart.Status.CONVERTED
    cart.save(update_fields=["status", "updated_at"])
    return orders


def lines_for_quote(quote: Any) -> list[LineTerms]:
    return [
        LineTerms(line.variant, line.quantity, line.offered_price, f"Quote {quote.reference}")
        for line in quote.lines.select_related("variant__product__category_contract")
    ]


def place_from_quote(request: HttpRequest, quote: Any) -> Order:
    """An accepted quote becomes an order at its offered prices: the immutable inputs the buyer agreed to."""
    return place(
        request=request,
        buyer=quote.buyer_organization,
        seller=quote.seller_organization,
        address=quote.delivery_address,
        instructions=quote.buyer_notes,
        lines=lines_for_quote(quote),
        quote=quote,
    )


def clear_cart_lines(cart: Cart, seller: Organization) -> int:
    n = 0
    for line in CartLine.objects.filter(cart=cart, seller=seller):
        line.delete()
        n += 1
    return n
