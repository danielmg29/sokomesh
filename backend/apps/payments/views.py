"""Payment endpoints: provider results (`POST payments/callbacks/<provider>`, signed, no session) and the
sandbox phone (`POST payments/<id>/simulate`, the buyer answering the prompt in the sandbox)."""

import uuid
from typing import Any

from django.db import transaction
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from apps.payments import providers
from apps.payments.models import PaymentIntent
from apps.payments.services import apply_result, payment_view, simulate
from core.api import body, endpoint, fail, throttle
from core.result import ErrorCode

MAX_RESULT_BYTES = 16_384


@csrf_exempt
def callback(request: HttpRequest, provider: str) -> JsonResponse:
    """A provider's result. Answers 2xx once the result is recorded (applied, duplicate or ignored) so the
    provider stops retrying; 401 for a bad signature, 404 for an unknown payment."""
    if request.method != "POST":
        return JsonResponse({"code": "METHOD_NOT_ALLOWED"}, status=405)
    if provider not in providers.PROVIDERS or not providers.named(provider).confirms:
        return JsonResponse({"code": "NOT_FOUND"}, status=404)
    if len(request.body) > MAX_RESULT_BYTES:
        return JsonResponse({"code": "VALIDATION", "detail": "Result too large."}, status=413)
    throttle(f"payments:callback:{request.META.get('REMOTE_ADDR', '')}", limit=300, window=60)
    with transaction.atomic():
        status, answer = apply_result(provider, request.body, request.headers.get("X-SokoMesh-Signature"))
    return JsonResponse(answer, status=status)


@endpoint("POST")
def simulate_view(request: HttpRequest, intent_id: str) -> dict[str, Any]:
    try:
        ref = uuid.UUID(intent_id)
    except ValueError:
        fail(ErrorCode.NOT_FOUND)
    with transaction.atomic():
        intent = PaymentIntent.objects.select_related("order").filter(pk=ref).first()
        if intent is None:
            fail(ErrorCode.NOT_FOUND)
        intent = simulate(request, intent, str(body(request).get("outcome", "")))
        return payment_view(intent)
