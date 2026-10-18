"""What every endpoint shares: method checks, the signed-in user, JSON bodies and typed failures.

Views raise `Problem` (or Django's ValidationError) instead of building error responses, and return
a plain dict (200), `Created(dict)` (201) or a ready response. `endpoint` turns all of them into the
one error shape the contract describes (`core.http.respond`).
"""

from __future__ import annotations

import json
import time
from collections.abc import Callable
from dataclasses import dataclass
from functools import wraps
from typing import Any, NoReturn

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.http import HttpRequest, HttpResponseBase, JsonResponse

from core.http import ERRORS, respond
from core.result import AppError, Err, ErrorCode, Ok


class Problem(Exception):
    def __init__(self, code: ErrorCode, detail: str | None = None, fields: dict[str, list[str]] | None = None):
        super().__init__(detail or code)
        spec = ERRORS[code]
        self.error = AppError(code, detail or spec.message, fields, spec.retryable)


def fail(code: ErrorCode, detail: str | None = None, fields: dict[str, list[str]] | None = None) -> NoReturn:
    raise Problem(code, detail, fields)


def invalid(fields: dict[str, list[str]], detail: str = "Some details need attention.") -> NoReturn:
    raise Problem(ErrorCode.VALIDATION, detail, fields)


@dataclass(frozen=True, slots=True)
class Created:
    body: dict[str, Any]


def from_validation_error(exc: ValidationError) -> AppError:
    fields = {k: [str(m) for m in v] for k, v in exc.message_dict.items()} if hasattr(exc, "error_dict") else {}
    detail = "Some details need attention." if fields else "; ".join(str(m) for m in exc.messages)
    return AppError(ErrorCode.VALIDATION, detail, fields)


def body(request: HttpRequest) -> dict[str, Any]:
    """The request's JSON object. Size is already bounded by DATA_UPLOAD_MAX_MEMORY_SIZE."""
    if not request.body:
        return {}
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        fail(ErrorCode.VALIDATION, "The request body is not valid JSON.")
    if not isinstance(data, dict):
        fail(ErrorCode.VALIDATION, "Send a JSON object.")
    return data


def text(data: dict[str, Any], key: str, *, required: bool = True, max_length: int = 500) -> str:
    value = data.get(key, "")
    if not isinstance(value, str):
        invalid({key: ["Send text."]})
    value = value.strip()
    if required and not value:
        invalid({key: ["This field is required."]})
    if len(value) > max_length:
        invalid({key: [f"Use at most {max_length} characters."]})
    return value


View = Callable[..., HttpResponseBase]


def endpoint(*methods: str, auth: bool = True, verified: bool = True) -> Callable[[Callable[..., Any]], View]:
    """Wrap a view: allowed methods, an authenticated (and by default verified) user, typed failures."""

    def decorate(view: Callable[..., Any]) -> View:
        @wraps(view)
        def wrapper(request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponseBase:
            if request.method not in methods:
                return JsonResponse({"code": "METHOD_NOT_ALLOWED", "detail": "Method not allowed."}, status=405)
            try:
                if auth:
                    user = request.user
                    if not user.is_authenticated:
                        fail(ErrorCode.UNAUTHENTICATED)
                    if verified and getattr(user, "email_verified_at", None) is None:
                        fail(ErrorCode.UNVERIFIED)
                result = view(request, *args, **kwargs)
            except Problem as problem:
                return respond(Err(problem.error))
            except ValidationError as exc:
                return respond(Err(from_validation_error(exc)))
            if isinstance(result, HttpResponseBase):
                return result
            if isinstance(result, Created):
                return respond(Ok(result.body), created=True)
            return respond(Ok(result))

        return wrapper

    return decorate


def throttle(key: str, *, limit: int, window: int) -> None:
    """Count one attempt under `key`; refuse with RATE_LIMITED (and the wait) past `limit` per `window` seconds."""
    if not settings.AC_THROTTLE:
        return
    count_key, reset_key = f"throttle:{key}:n", f"throttle:{key}:t"
    cache.add(count_key, 0, window)
    cache.add(reset_key, time.time() + window, window)
    count = cache.incr(count_key)
    if count > limit:
        wait = max(1, int(float(cache.get(reset_key, time.time() + window)) - time.time()))
        fail(ErrorCode.RATE_LIMITED, f"Too many attempts. Try again in {wait} seconds.", {"retryAfter": [str(wait)]})
