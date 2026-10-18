"""Turn a MetricDefinition into one bounded query for one seller and date range (SM-F-19).

Only declared sources, measures, filters and breakdowns are accepted (a definition is data, so it is
checked like input). Cards, the chart and the CSV export all call `evaluate`, so they reconcile by
construction. Dates are calendar days in East Africa Time; ranges are at most MAX_DAYS long and day series
are filled so every day appears.
"""

import datetime as dt
import zoneinfo
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from django.db.models import Avg, Count, F, Q, QuerySet, Sum
from django.db.models.functions import TruncDate

from apps.analytics.models import MetricDefinition
from apps.catalog.models import Variant
from apps.orders.models import Order, OrderLine

EAT = zoneinfo.ZoneInfo("Africa/Nairobi")
MAX_DAYS = 366
TOP = 10


@dataclass(frozen=True)
class Source:
    model: Any
    seller: str
    when: str | None
    measures: frozenset[str]
    dimensions: dict[str, str] = field(default_factory=dict)
    status: str | None = None  # path to the order status, for status filters


SOURCES: dict[str, Source] = {
    "order": Source(
        Order,
        "seller_organization",
        "submitted_at",
        frozenset({"total", "subtotal"}),
        {"day": "submitted_at", "buyer": "buyer_organization__name"},
        "status",
    ),
    "order_line": Source(
        OrderLine,
        "order__seller_organization",
        "order__submitted_at",
        frozenset({"line_total", "quantity_ordered"}),
        {"day": "order__submitted_at", "product": "product_name_snapshot"},
        "order__status",
    ),
    "variant": Source(Variant, "seller", None, frozenset(), {"product": "product__name"}),
}


class DefinitionError(ValueError):
    pass


def _apply(qs: QuerySet, source: Source, where: dict[str, Any]) -> QuerySet:
    """Fixed metric filters, from an allow-list: status in or not in, never reached a status, stock risk."""
    for key, value in (where or {}).items():
        if key == "status_in" and source.status:
            qs = qs.filter(**{f"{source.status}__in": list(value)})
        elif key == "status_not_in" and source.status:
            qs = qs.exclude(**{f"{source.status}__in": list(value)})
        elif key == "never_status" and source.model is Order:
            qs = qs.exclude(transitions__to_status=str(value))
        elif key == "active" and source.model is Variant:
            qs = qs.filter(is_active=bool(value), product__status="published")
        elif key == "stock_below_moq_times" and source.model is Variant:
            qs = qs.filter(stock_on_hand__isnull=False, stock_on_hand__lt=F("minimum_order_quantity") * int(value))
        else:
            raise DefinitionError(f"Filter {key} is not allowed for {source.model.__name__}.")
    return qs


def _bounds(date_from: dt.date, date_to: dt.date) -> tuple[dt.datetime, dt.datetime]:
    return dt.datetime.combine(date_from, dt.time.min, EAT), dt.datetime.combine(
        date_to + dt.timedelta(days=1), dt.time.min, EAT
    )


def _base(defn: MetricDefinition, seller: Any, date_from: dt.date, date_to: dt.date) -> tuple[Source, QuerySet]:
    source = SOURCES.get(defn.source_entity)
    if source is None:
        raise DefinitionError(f"Unknown source {defn.source_entity}.")
    if defn.aggregation in ("sum", "avg") and defn.measure not in source.measures:
        raise DefinitionError(f"{defn.measure} cannot be aggregated for {defn.source_entity}.")
    qs = source.model.objects.filter(**{source.seller: seller})
    if source.when:
        start, end = _bounds(date_from, date_to)
        qs = qs.filter(**{f"{source.when}__gte": start, f"{source.when}__lt": end})
    return source, qs


def _aggregate(defn: MetricDefinition):
    if defn.aggregation == "sum":
        return Sum(defn.measure)
    if defn.aggregation == "avg":
        return Avg(defn.measure)
    return Count("pk", distinct=True)


def _number(value: Any, defn: MetricDefinition) -> str:
    if value is None:  # nothing to add up is zero; nothing to average or divide has no value ("")
        return {"count": "0", "sum": "0.00"}.get(defn.aggregation, "")
    if defn.aggregation == "count":
        return str(int(value))
    return format(Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), "f")


def _ratio(qs: QuerySet, source: Source, filters: dict[str, Any]) -> str:
    denominator = _apply(qs, source, filters.get("denominator", {})).distinct().count()
    if not denominator:
        return ""
    numerator = _apply(qs, source, filters.get("numerator", {})).distinct().count()
    return format(
        (Decimal(numerator) * 100 / Decimal(denominator)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP), "f"
    )


def evaluate(
    defn: MetricDefinition, seller: Any, date_from: dt.date, date_to: dt.date, dimension: str | None = None
) -> dict[str, Any]:
    """The metric's value over the range and, when asked and allowed, its breakdown by `dimension`."""
    source, qs = _base(defn, seller, date_from, date_to)
    filters = defn.filters_json or {}
    out: dict[str, Any] = {}
    if defn.aggregation == "ratio":
        out["value"] = _ratio(qs, source, filters)
    else:
        qs = _apply(qs, source, filters.get("where", {}))
        out["value"] = _number(qs.aggregate(v=_aggregate(defn))["v"], defn)
    if not dimension or dimension not in (defn.dimensions_json or []) or dimension not in source.dimensions:
        return out
    path = source.dimensions[dimension]
    if dimension == "day" and defn.aggregation != "ratio":
        rows = {
            r["bucket"]: r["v"]
            for r in qs.annotate(bucket=TruncDate(path, tzinfo=EAT))
            .values("bucket")
            .annotate(v=_aggregate(defn))
            .order_by("bucket")
        }
        days = (date_to - date_from).days + 1
        out["series"] = [
            {
                "bucket": (date_from + dt.timedelta(days=i)).isoformat(),
                "value": _number(rows.get(date_from + dt.timedelta(days=i)), defn),
            }
            for i in range(days)
        ]
    elif dimension != "day" and defn.aggregation != "ratio":
        extra = {"units": Sum("quantity_ordered")} if source.model is OrderLine else {}
        rows = qs.values(path).annotate(v=_aggregate(defn), **extra).order_by("-v")[:TOP]
        out["breakdown"] = [
            {
                "rank": i + 1,
                "label": r[path],
                "value": _number(r["v"], defn),
                **({"units": int(r["units"] or 0)} if extra else {}),
            }
            for i, r in enumerate(rows)
        ]
    return out


def current_definitions(keys: list[str] | None = None) -> list[MetricDefinition]:
    """The latest active version of each metric (optionally only these keys), in display order."""
    latest: dict[str, MetricDefinition] = {}
    for d in MetricDefinition.objects.filter(is_active=True).order_by("key", "-version"):
        latest.setdefault(d.key, d)
    chosen = [latest[k] for k in keys if k in latest] if keys else list(latest.values())
    return sorted(chosen, key=lambda d: (d.position, d.key))


def definitions_version(defs: list[MetricDefinition]) -> str:
    return " · ".join(f"{d.key} v{d.version}" for d in defs)


__all__ = ["MAX_DAYS", "DefinitionError", "Q", "current_definitions", "definitions_version", "evaluate"]
