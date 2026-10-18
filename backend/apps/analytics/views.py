"""AnalyticsQuery (SM-F-19): the seller's metrics over a range, as JSON for cards and charts and as CSV.

Both answers come from the same `evaluate` calls on the same definitions, so a card, its chart and the
export always agree. The seller is the organization the request acts for; nothing else can be asked for.
"""

import csv
import datetime as dt
import io
from typing import Any

from django.http import HttpRequest, HttpResponse
from django.utils import timezone

from apps.analytics.engine import EAT, MAX_DAYS, SOURCES, current_definitions, definitions_version, evaluate
from apps.organizations.models import Organization
from apps.organizations.tenancy import active_membership
from core.api import endpoint, fail, invalid
from core.policies import allowed
from core.result import ErrorCode


def _query(request: HttpRequest) -> dict[str, Any]:
    org = active_membership(request).organization
    if org.organization_type != Organization.Type.SELLER or not allowed(request.user, "analytics.view", org):
        fail(ErrorCode.FORBIDDEN, "Analytics are for seller organizations.")
    today = timezone.localtime(timezone.now(), EAT).date()
    try:
        date_to = dt.date.fromisoformat(request.GET["date_to"]) if request.GET.get("date_to") else today
        date_from = (
            dt.date.fromisoformat(request.GET["date_from"])
            if request.GET.get("date_from")
            else date_to - dt.timedelta(days=29)
        )
    except ValueError:
        invalid({"date_from": ["Use dates such as 2026-10-01."]})
    if date_from > date_to:
        invalid({"date_from": ["The range must start before it ends."]})
    if (date_to - date_from).days + 1 > MAX_DAYS:
        invalid({"date_from": [f"Ask for at most {MAX_DAYS} days at a time."]})
    keys = [k for k in request.GET.get("metrics", "").split(",") if k][:20]
    defs = current_definitions(keys or None)
    if keys and len(defs) != len(set(keys)):
        invalid({"metrics": ["One of the metrics is not defined."]})
    dimension = request.GET.get("dimension") or None
    if dimension not in (None, "day", "product", "buyer"):
        invalid({"dimension": ["Break down by day, product or buyer."]})
    return {"seller": org, "defs": defs, "date_from": date_from, "date_to": date_to, "dimension": dimension}


@endpoint("GET")
def analytics(request: HttpRequest) -> dict[str, Any]:
    """GET analytics?metrics=revenue,orders&date_from=…&date_to=…&dimension=day, with the previous period."""
    q = _query(request)
    span = (q["date_to"] - q["date_from"]).days + 1
    prev_to = q["date_from"] - dt.timedelta(days=1)
    prev_from = prev_to - dt.timedelta(days=span - 1)
    metrics = []
    for d in q["defs"]:
        now = evaluate(d, q["seller"], q["date_from"], q["date_to"], q["dimension"])
        # A metric of the present (stock) has no earlier period to compare with.
        dated = SOURCES[d.source_entity].when is not None
        before = evaluate(d, q["seller"], prev_from, prev_to) if dated else {"value": None}
        metrics.append(
            {
                "key": d.key,
                "name": d.name,
                "unit": d.unit,
                "better": d.better,
                "description": d.description,
                "version": d.version,
                "dimensions": d.dimensions_json,
                "previous": before["value"],
                **now,
            }
        )
    return {
        "query": {
            "date_from": q["date_from"].isoformat(),
            "date_to": q["date_to"].isoformat(),
            "previous_from": prev_from.isoformat(),
            "previous_to": prev_to.isoformat(),
            "dimension": q["dimension"],
        },
        "definitions_version": definitions_version(q["defs"]),
        "metrics": metrics,
    }


@endpoint("GET")
def export(request: HttpRequest) -> HttpResponse:
    """The same query as CSV: one row per metric and bucket (or the total when there is no breakdown)."""
    q = _query(request)
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["metric", "version", "unit", "date_from", "date_to", "bucket", "value", "units"])
    for d in q["defs"]:
        result = evaluate(d, q["seller"], q["date_from"], q["date_to"], q["dimension"])
        base = [d.key, d.version, d.unit, q["date_from"].isoformat(), q["date_to"].isoformat()]
        if "series" in result:
            for row in result["series"]:
                writer.writerow([*base, row["bucket"], row["value"], ""])
        elif "breakdown" in result:
            for row in result["breakdown"]:
                writer.writerow([*base, row["label"], row["value"], row.get("units", "")])
        writer.writerow([*base, "total", result["value"], ""])
    response = HttpResponse(out.getvalue(), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="sokomesh-analytics-{q["date_from"]}-{q["date_to"]}.csv"'
    response["Cache-Control"] = "private, no-store"
    return response
