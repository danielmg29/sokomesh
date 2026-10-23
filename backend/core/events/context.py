"""The request id and correlation id of the work in progress, for audit rows written deep in services."""

import contextlib
import re
import uuid
from collections.abc import Iterator
from contextvars import ContextVar

_SAFE = re.compile(r"^[A-Za-z0-9._:-]{8,64}$")
_request_id: ContextVar[str] = ContextVar("request_id", default="")
_correlation_id: ContextVar[str] = ContextVar("correlation_id", default="")


def safe_id(value: str | None) -> str | None:
    """An id from a client header, kept only if it is plain and short (it ends up in logs and traces)."""
    return value if value and _SAFE.match(value) else None


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:20]}"


def request_id() -> str:
    return _request_id.get()


def correlation_id() -> str:
    return _correlation_id.get() or _request_id.get()


def start(request: str, correlation: str | None) -> tuple:
    return _request_id.set(request), _correlation_id.set(correlation or "")


def finish(tokens: tuple) -> None:
    _request_id.reset(tokens[0])
    _correlation_id.reset(tokens[1])


@contextlib.contextmanager
def bound(correlation: str) -> Iterator[None]:
    """Everything recorded inside belongs to `correlation` (an order's journey, for example)."""
    token = _correlation_id.set(correlation)
    try:
        yield
    finally:
        _correlation_id.reset(token)
