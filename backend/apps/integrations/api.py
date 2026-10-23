"""SM-F-23: the integration API, under `integration/`, authenticated by `Authorization: Bearer smk_…` tokens
(never by session cookies). Each route needs one scope; each token may make 100 requests a minute; a write
with an `Idempotency-Key` header answers the same way however often it is repeated (for 24 hours).

    GET  integration/products              catalogue.read   the organization's products and packs
    GET  integration/inventory             inventory.read   stock per pack: on hand, held, allocated, available
    POST integration/inventory/receipts    inventory.write  {sku, quantity, note}: goods received
    GET  integration/orders?status=…       orders.read      the organization's latest orders, either side
Lists take `?after=<the last key of the previous page>` and return at most 100 rows.
"""

import json
from collections.abc import Callable
from functools import wraps
from typing import Any

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.db.models import Q
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from apps.catalog.models import Product, Variant
from apps.integrations.models import ApiToken
from apps.integrations.services import authenticate
from apps.inventory.models import Balance
from apps.inventory.services import receive
from apps.orders.models import Order
from core.api import Problem, body, throttle
from core.http import respond
from core.result import Err, ErrorCode, Ok

PAGE = 100


def token_route(method: str, scope: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    def decorate(view: Callable[..., Any]) -> Callable[..., Any]:
        @csrf_exempt
        @wraps(view)
        def wrapper(request: HttpRequest, *args: Any, **kwargs: Any) -> Any:
            if request.method != method:
                return JsonResponse({"code": "METHOD_NOT_ALLOWED", "detail": "Method not allowed."}, status=405)
            token = authenticate(request.headers.get("Authorization"))
            if token is None:
                return JsonResponse(
                    {"code": "UNAUTHENTICATED", "detail": "Send a valid API token: Authorization: Bearer smk_…"},
                    status=401,
                )
            if scope not in (token.scopes or []):
                return JsonResponse(
                    {"code": "FORBIDDEN", "detail": f"This token cannot {scope.replace('.', ' ')}."}, status=403
                )
            try:
                throttle(f"api-token:{token.pk}", limit=settings.AC_INTEGRATIONS["requests_per_minute"], window=60)
                if not token.last_used_at or (timezone.now() - token.last_used_at).total_seconds() > 60:
                    ApiToken.objects.filter(pk=token.pk).update(last_used_at=timezone.now())
                return respond(Ok(view(request, token, *args, **kwargs)))
            except Problem as problem:
                return respond(Err(problem.error))

        return wrapper

    return decorate


def _after(request: HttpRequest) -> str:
    return (request.GET.get("after") or "")[:64]


@token_route("GET", "catalogue.read")
def products(request: HttpRequest, token: ApiToken) -> dict[str, Any]:
    qs = Product.objects.filter(seller=token.organization).order_by("slug").prefetch_related("variants")
    if _after(request):
        qs = qs.filter(slug__gt=_after(request))
    rows = list(qs[:PAGE])
    return {
        "results": [
            {
                "id": str(p.pk),
                "slug": p.slug,
                "name": p.name,
                "status": p.status,
                "packs": [
                    {
                        "sku": v.sku,
                        "packaging_unit": v.packaging_unit,
                        "minimum_order": v.minimum_order_quantity,
                        "unit_price": format(v.unit_price, "f"),
                        "available": v.stock_on_hand,
                        "on_sale": v.is_active,
                    }
                    for v in p.variants.all()  # pyright: ignore[reportAttributeAccessIssue]
                ],
            }
            for p in rows
        ],
        "next": rows[-1].slug if len(rows) == PAGE else None,
    }


@token_route("GET", "inventory.read")
def inventory(request: HttpRequest, token: ApiToken) -> dict[str, Any]:
    qs = (
        Balance.objects.filter(seller=token.organization).select_related("variant", "location").order_by("variant__sku")
    )
    if _after(request):
        qs = qs.filter(variant__sku__gt=_after(request))
    rows = list(qs[:PAGE])
    return {
        "results": [
            {
                "sku": b.variant.sku,
                "location": b.location.name,
                "bin": b.bin_label,
                "on_hand": b.on_hand,
                "reserved": b.reserved,
                "allocated": b.allocated,
                "available": b.available,
                "updated_at": b.updated_at.isoformat(),
            }
            for b in rows
        ],
        "next": rows[-1].variant.sku if len(rows) == PAGE else None,
    }


@token_route("POST", "inventory.write")
def receipts(request: HttpRequest, token: ApiToken) -> dict[str, Any]:
    key = (request.headers.get("Idempotency-Key") or "")[:80]
    cache_key = f"idem:{token.pk}:{key}"
    if key and (done := cache.get(cache_key)) is not None:
        return {**json.loads(done), "replayed": True}
    data = body(request)
    variant = Variant.objects.filter(seller=token.organization, sku=str(data.get("sku") or "")).first()
    if variant is None:
        raise Problem(ErrorCode.VALIDATION, "No pack of yours has that SKU.", {"sku": ["Unknown SKU."]})
    try:
        quantity = int(data.get("quantity"))  # pyright: ignore[reportArgumentType]
    except (TypeError, ValueError):
        raise Problem(
            ErrorCode.VALIDATION, "Send a whole number of packs.", {"quantity": ["Send a whole number."]}
        ) from None
    with transaction.atomic():
        movement = receive(
            variant,
            quantity,
            actor=f"API: {token.client.name}",
            note=str(data.get("note") or "")[:300] or f"Received through {token.client.name}",
        )
    answer = {
        "sku": variant.sku,
        "movement": str(movement.pk),
        "on_hand": movement.on_hand_after,
        "available": movement.available_after,
    }
    if key:
        cache.set(cache_key, json.dumps(answer), 24 * 3600)
    return answer


@token_route("GET", "orders.read")
def orders(request: HttpRequest, token: ApiToken) -> dict[str, Any]:
    org = token.organization
    qs = (
        Order.objects.filter(
            Q(seller_organization=org, transitions__to_status=Order.Status.SUBMITTED) | Q(buyer_organization=org)
        )
        .distinct()
        .order_by("-submitted_at")
    )
    status = request.GET.get("status")
    if status:
        if status not in Order.Status.values:
            raise Problem(
                ErrorCode.VALIDATION, "Unknown status.", {"status": [f"Use one of: {', '.join(Order.Status.values)}."]}
            )
        qs = qs.filter(status=status)
    if _after(request):
        qs = qs.filter(order_number__lt=_after(request))
    rows = list(qs.select_related("buyer_organization", "seller_organization")[:PAGE])
    return {
        "results": [
            {
                "id": str(o.pk),
                "order_number": o.order_number,
                "status": o.status,
                "total": format(o.total, "f"),
                "currency": o.currency,
                "placed_at": o.submitted_at.isoformat(),
                "buyer": o.buyer_organization.name,
                "seller": o.seller_organization.name,
            }
            for o in rows
        ],
        "next": rows[-1].order_number if len(rows) == PAGE else None,
    }
