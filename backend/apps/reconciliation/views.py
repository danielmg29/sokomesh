"""Administrator endpoints (SM-F-24): `GET reconciliation/checks` and `GET reconciliation/trace?q=…`."""

from typing import Any

from django.http import HttpRequest

from apps.organizations.tenancy import is_admin
from apps.reconciliation.checks import resolve, run_checks, trace
from core.api import endpoint, fail
from core.result import ErrorCode


def _admin(request: HttpRequest) -> None:
    if not is_admin(request.user):
        fail(ErrorCode.FORBIDDEN, "Reconciliation is for marketplace administrators.")


@endpoint("GET")
def checks(request: HttpRequest) -> dict[str, Any]:
    _admin(request)
    found = run_checks()
    return {"checks": found, "attention": sum(1 for c in found if not c["ok"])}


@endpoint("GET")
def trace_view(request: HttpRequest) -> dict[str, Any]:
    _admin(request)
    correlation, label = resolve(request.GET.get("q", ""))
    return {"query": label, "correlation_id": correlation, "events": trace(correlation) if correlation else []}
