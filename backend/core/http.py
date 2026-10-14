"""One mapping from ErrorCode to HTTP status, retryability and default copy.

The same table feeds JSON responses and the contract's `errors` block, so the client
never keeps its own copy of status codes or messages.
"""

from dataclasses import dataclass

from django.http import JsonResponse

from core.result import Err, ErrorCode, Ok, assert_never


@dataclass(frozen=True, slots=True)
class ErrorSpec:
    status: int
    retryable: bool
    message: str


ERRORS: dict[ErrorCode, ErrorSpec] = {
    ErrorCode.NOT_FOUND: ErrorSpec(404, False, "We couldn't find that record. It may have been removed."),
    ErrorCode.VALIDATION: ErrorSpec(422, False, "Some details need attention before this can be saved."),
    ErrorCode.FORBIDDEN: ErrorSpec(403, False, "Your role does not allow this action."),
    ErrorCode.CONFLICT: ErrorSpec(
        409, False, "Someone else changed this record. Review the latest version and try again."
    ),
    ErrorCode.DUPLICATE: ErrorSpec(409, False, "A record with these details already exists."),
    ErrorCode.RATE_LIMITED: ErrorSpec(429, True, "Too many requests. Wait a moment, then try again."),
    ErrorCode.LIMIT_EXCEEDED: ErrorSpec(413, False, "This request is larger than the allowed limit."),
    ErrorCode.UNAVAILABLE: ErrorSpec(503, True, "The service is temporarily unavailable. Try again shortly."),
}


def respond(result, *, created: bool = False, headers: dict | None = None) -> JsonResponse:
    match result:
        case Ok(value):
            return JsonResponse(value, status=201 if created else 200, headers=headers)
        case Err(error):
            body = {
                "code": error.code,
                "detail": error.detail,
                "fields": error.fields or {},
                "retryable": error.retryable,
            }
            return JsonResponse(body, status=ERRORS[error.code].status)
        case _:
            assert_never(result)
