"""Typed, exhaustive results (borrowed from Rust's Result; manual 3.2, Borrowing 1)."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum
from typing import NoReturn


class ErrorCode(StrEnum):
    NOT_FOUND = "NOT_FOUND"
    VALIDATION = "VALIDATION"
    FORBIDDEN = "FORBIDDEN"
    CONFLICT = "CONFLICT"  # stale record version
    DUPLICATE = "DUPLICATE"  # unique constraint
    RATE_LIMITED = "RATE_LIMITED"
    LIMIT_EXCEEDED = "LIMIT_EXCEEDED"
    UNAVAILABLE = "UNAVAILABLE"
    UNAUTHENTICATED = "UNAUTHENTICATED"  # no session
    UNVERIFIED = "UNVERIFIED"  # email address not confirmed yet


@dataclass(frozen=True, slots=True)
class AppError:
    code: ErrorCode
    detail: str
    fields: dict[str, list[str]] | None = None
    retryable: bool = False


@dataclass(frozen=True, slots=True)
class Ok[T]:
    value: T

    def map[U](self, f: Callable[[T], U]) -> Ok[U]:
        return Ok(f(self.value))


@dataclass(frozen=True, slots=True)
class Err:
    error: AppError

    def map(self, f: Callable) -> Err:
        return self


type Result[T] = Ok[T] | Err


def assert_never(value: NoReturn) -> NoReturn:  # type checkers flag unhandled cases
    raise AssertionError(f"unhandled case: {value!r}")
