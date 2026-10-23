"""Every request gets a request id (`X-Request-ID`, kept from the caller when it is plain, else new) and may
carry a correlation id (`X-Correlation-ID`) that ties it to earlier work; both come back as headers."""

from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

from core.events import context


class RequestContextMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        rid = context.safe_id(request.headers.get("X-Request-ID")) or context.new_id("req")
        cid = context.safe_id(request.headers.get("X-Correlation-ID"))
        request.request_id = rid  # type: ignore[attr-defined]
        tokens = context.start(rid, cid)
        try:
            response = self.get_response(request)
        finally:
            context.finish(tokens)
        response["X-Request-ID"] = rid
        return response
