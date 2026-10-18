"""List queries: one parameter grammar for every list endpoint (manual 4.3, Pillar 4).

The grammar lives in `AC_LIST_QUERY` and is exported in the contract as `listQuery`, so clients build
these parameters instead of inventing them. Every list validates against its model's own metadata: only
declared search fields are searched, only declared operators filter, only fields named in `ordering`
order, and page sizes stay inside the contract limits. Pages are keyset pages behind signed cursors, so
a page never shifts when rows are added before it; each page returns a cursor to the next page and one
back to the previous page, so a reader can step both ways from a page's URL alone. The total is counted
up to a cap. A resource may widen one request's spec with fields its own data declares (a category
contract's buyer filters) and may match such a field with its own query (`builders`).
"""

from __future__ import annotations

import datetime as dt
import unicodedata
import uuid
import zoneinfo
from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from functools import reduce
from operator import or_
from typing import Any, cast

from django.conf import settings
from django.core import signing
from django.db.models import F, Model, Q, QuerySet
from django.db.models.expressions import OrderBy

from core.result import AppError, Err, ErrorCode, Ok, Result

CURSOR_SALT = "core.operations.listing.cursor"
LOOKUPS = {"eq": "exact", "in": "in", "contains": "icontains", "gte": "gte", "lte": "lte", "isnull": "isnull"}
TEXT_TYPES = {"string", "text", "email", "phone", "url"}


def grammar() -> dict[str, Any]:
    return settings.AC_LIST_QUERY


@dataclass(frozen=True, slots=True)
class FieldSpec:
    name: str
    type: str
    ops: frozenset[str]
    choices: frozenset[str] | None = None


@dataclass(frozen=True, slots=True)
class ListSpec:
    """What one list allows, read from the model's contract metadata (the registry builds it from there)."""

    search: tuple[str, ...]
    fields: Mapping[str, FieldSpec]
    ordering: tuple[str, ...]
    default_page_size: int
    max_page_size: int
    # Public field name -> database path, for fields read through a relation (a member's name is
    # `user__display_name`). Names without an entry are their own path.
    paths: Mapping[str, str] = field(default_factory=dict)
    # Field name -> the query that matches one of its filters, for values a plain lookup cannot match
    # (a JSON list that should contain any of the chosen values).
    builders: Mapping[str, Callable[[Filter], Q]] = field(default_factory=dict)

    @classmethod
    def from_meta(cls, meta: Mapping[str, Any], paths: Mapping[str, str] | None = None) -> ListSpec:
        allowed = set(grammar()["operators"])
        fields: dict[str, FieldSpec] = {}
        for f in meta.get("fields", []):
            ops = set(f.get("filter") or [])
            if "range" in ops:  # a range travels as its two bounds
                ops |= {"gte", "lte"}
            choices = frozenset(c["value"] for c in f["choices"]) if f.get("choices") else None
            fields[f["name"]] = FieldSpec(f["name"], f["type"], frozenset(ops & allowed), choices)
        search = tuple(meta.get("search", []))
        ordering = tuple(meta.get("ordering", []))
        unknown = [n for n in (*search, *(o.lstrip("-") for o in ordering)) if n not in fields]
        if unknown:
            raise ValueError(f"search and ordering name undeclared fields: {', '.join(unknown)}")
        limits, page = settings.AC_LIMITS, meta.get("list", {})
        maximum = min(page.get("maxPageSize", limits["max_page_size"]), limits["max_page_size"])
        return cls(
            search=search,
            fields=fields,
            ordering=ordering,
            default_page_size=min(page.get("defaultPageSize", limits["default_page_size"]), maximum),
            max_page_size=maximum,
            paths=dict(paths or {}),
        )

    def path(self, name: str) -> str:
        return self.paths.get(name, name)

    def widen(
        self,
        fields: Iterable[FieldSpec],
        paths: Mapping[str, str] | None = None,
        builders: Mapping[str, Callable[[Filter], Q]] | None = None,
    ) -> ListSpec:
        """This spec plus fields one request may also filter on (filters only: never search or order)."""
        allowed = set(grammar()["operators"])
        extra = {f.name: FieldSpec(f.name, f.type, frozenset(f.ops & allowed), f.choices) for f in fields}
        return ListSpec(
            search=self.search,
            fields={**self.fields, **extra},
            ordering=self.ordering,
            default_page_size=self.default_page_size,
            max_page_size=self.max_page_size,
            paths={**self.paths, **(paths or {})},
            builders={**self.builders, **(builders or {})},
        )

    @property
    def orderable(self) -> frozenset[str]:
        return frozenset(o.lstrip("-") for o in self.ordering)


@dataclass(frozen=True, slots=True)
class Filter:
    field: str
    lookup: str
    value: object


@dataclass(frozen=True, slots=True)
class Cursor:
    ordering: str
    value: object
    pk: str
    backward: bool = False  # opens the page that ends just before the row it names


@dataclass(frozen=True, slots=True)
class ListQuery:
    terms: tuple[str, ...]
    filters: tuple[Filter, ...]
    ordering: str
    page_size: int
    after: Cursor | None = None


def search_terms(q: str) -> tuple[str, ...]:
    """The words of a search, as the client sends them: bounded in length and count, deduplicated."""
    g = grammar()
    words = unicodedata.normalize("NFC", q[: g["max_search_length"]]).split()
    return tuple(dict.fromkeys(w.casefold() for w in words))[: g["max_search_terms"]]


def _parse(spec: FieldSpec, raw: str) -> object:
    """One filter or cursor value in the field's own type. Raises ValueError with reader-facing copy."""
    match spec.type:
        case "integer":
            return int(raw)
        case "number":  # a number held in JSON (a category attribute), compared as a JSON number
            number = float(raw)
            if number != number or number in (float("inf"), float("-inf")):
                raise ValueError("Use a number such as 2.5.")
            return number
        case "decimal":
            try:
                d = Decimal(raw)
            except InvalidOperation:
                raise ValueError("Use a number such as 1740.00.") from None
            if not d.is_finite():
                raise ValueError("Use a number such as 1740.00.")
            return d
        case "boolean":
            if raw not in ("true", "false"):
                raise ValueError("Use true or false.")
            return raw == "true"
        case "date":
            return dt.date.fromisoformat(raw)
        case "datetime":
            value = dt.datetime.fromisoformat(raw)
            if value.tzinfo is None:
                raise ValueError("Include the UTC offset, for example 2026-10-12T11:18:00+03:00.")
            return value
        case "uuid" | "relation":
            return uuid.UUID(raw)
        case "enum":
            if spec.choices is not None and raw not in spec.choices:
                raise ValueError("Not one of this field's choices.")
            return raw
        case _:
            return raw


def _day_bound(raw: str, op: str) -> tuple[str, dt.datetime]:
    """A date-only bound on a datetime field covers the whole calendar day in the grammar's timezone."""
    day = dt.date.fromisoformat(raw)
    zone = zoneinfo.ZoneInfo(grammar()["date_timezone"])
    if op == "gte":
        return "gte", dt.datetime.combine(day, dt.time.min, zone)
    return "lt", dt.datetime.combine(day + dt.timedelta(days=1), dt.time.min, zone)


def _items(params: Mapping[str, Any]) -> Iterable[tuple[str, list[str]]]:
    lists = getattr(params, "lists", None)  # Django QueryDict keeps repeated keys
    if callable(lists):
        yield from cast(Iterable[tuple[str, list[str]]], lists())
        return
    for key, value in params.items():
        yield key, [value] if isinstance(value, str) else [str(v) for v in value]


def parse_list_query(params: Mapping[str, Any], spec: ListSpec) -> Result[ListQuery]:
    """Validate request parameters against the list's spec. Unknown or undeclared parameters are refused."""
    g = grammar()
    reserved = {g["search"], g["ordering"], g["page_size"], g["cursor"]}
    errors: dict[str, list[str]] = {}
    values: dict[str, str] = {}
    filters: list[Filter] = []

    for key, raws in _items(params):
        if key in reserved:
            values[key] = raws[-1]
            continue
        name, sep, op = key.rpartition(g["operator_separator"])
        field = spec.fields.get(name) if sep else None
        if field is None or op not in field.ops:
            errors[key] = ["This list cannot be filtered that way."]
            continue
        try:
            filters.append(_filter(field, op, raws, g))
        except ValueError as exc:
            errors[key] = [str(exc)]

    q = values.get(g["search"], "")
    terms = search_terms(q)
    if terms and not spec.search:
        errors[g["search"]] = ["This list cannot be searched."]

    ordering = values.get(g["ordering"]) or (spec.ordering[0] if spec.ordering else "")
    if ordering and ordering.lstrip("-") not in spec.orderable:
        errors[g["ordering"]] = ["This list cannot be ordered that way."]

    page_size = spec.default_page_size
    if g["page_size"] in values:
        raw = values[g["page_size"]]
        if not raw.isdigit() or not 1 <= int(raw) <= spec.max_page_size:
            errors[g["page_size"]] = [f"Use a page size from 1 to {spec.max_page_size}."]
        else:
            page_size = int(raw)

    after = None
    if values.get(g["cursor"]):
        try:
            after = _read_cursor(values[g["cursor"]], ordering, spec)
        except ValueError as exc:
            errors[g["cursor"]] = [str(exc)]

    if errors:
        return Err(AppError(ErrorCode.VALIDATION, "Some list parameters are not allowed.", errors))
    return Ok(ListQuery(terms, tuple(filters), ordering, page_size, after))


def _filter(field: FieldSpec, op: str, raws: Sequence[str], g: Mapping[str, Any]) -> Filter:
    if op == "in":
        items = [v for raw in raws for v in raw.split(g["list_separator"]) if v]
        if not items:
            raise ValueError("Choose at least one value.")
        if len(items) > g["max_list_values"]:
            raise ValueError(f"Choose at most {g['max_list_values']} values.")
        return Filter(field.name, "in", [_parse(field, v) for v in items])
    raw = raws[-1]
    if op == "isnull":
        if raw not in ("true", "false"):
            raise ValueError("Use true or false.")
        return Filter(field.name, "isnull", raw == "true")
    if op == "contains":
        if field.type not in TEXT_TYPES:
            raise ValueError("Only text can be searched for a phrase.")
        return Filter(field.name, "icontains", raw[: g["max_search_length"]])
    if op in ("gte", "lte") and field.type == "datetime" and len(raw) == 10:
        lookup, bound = _day_bound(raw, op)
        return Filter(field.name, lookup, bound)
    return Filter(field.name, LOOKUPS[op], _parse(field, raw))


# --- keyset pages -----------------------------------------------------------------------------


def _encode(value: object) -> object:
    return value if value is None or isinstance(value, bool | int) else str(value)


def _make_cursor(ordering: str, row: Model, spec: ListSpec | None = None, backward: bool = False) -> str:
    name = ordering.lstrip("-")
    *hops, last = (spec.path(name) if spec else name).split("__")
    target: Any = row
    for hop in hops:  # a field read through a relation: walk to the related row
        target = getattr(target, hop)
    # A relation orders by its key: read the column, not the related row (no extra query).
    attname = f"{last}_id" if hasattr(target, f"{last}_id") else last
    value = _encode(getattr(target, attname)) if name else None
    payload: dict[str, object] = {"o": ordering, "v": value, "k": str(row.pk)}
    if backward:
        payload["d"] = "b"
    return signing.dumps(payload, salt=CURSOR_SALT, compress=True)


def _read_cursor(raw: str, ordering: str, spec: ListSpec) -> Cursor:
    try:
        payload = signing.loads(raw, salt=CURSOR_SALT)
    except signing.BadSignature:
        raise ValueError("This page link is no longer valid. Start from the first page.") from None
    if payload.get("o") != ordering:
        raise ValueError("This page link belongs to another order. Start from the first page.")
    value = payload.get("v")
    name = ordering.lstrip("-")
    if name and isinstance(value, str):
        value = _parse(spec.fields[name], value)
    return Cursor(ordering, value, str(payload["k"]), backward=payload.get("d") == "b")


def _after(cursor: Cursor, spec: ListSpec) -> Q:
    """Rows after the cursor in (field, pk) order with blanks last, in either direction."""
    name = spec.path(cursor.ordering.lstrip("-")) if cursor.ordering else ""
    desc = cursor.ordering.startswith("-")
    beyond, pk_beyond = ("lt", "pk__lt") if desc else ("gt", "pk__gt")
    if not name:
        return Q(**{pk_beyond: cursor.pk})
    if cursor.value is None:
        return Q(**{f"{name}__isnull": True, pk_beyond: cursor.pk})
    return (
        Q(**{f"{name}__{beyond}": cursor.value})
        | Q(**{name: cursor.value, pk_beyond: cursor.pk})
        | Q(**{f"{name}__isnull": True})
    )


def _before(cursor: Cursor, spec: ListSpec) -> Q:
    """Rows before the cursor in the same order: the mirror of `_after` (blanks are last, never before a value)."""
    name = spec.path(cursor.ordering.lstrip("-")) if cursor.ordering else ""
    desc = cursor.ordering.startswith("-")
    behind, pk_behind = ("gt", "pk__gt") if desc else ("lt", "pk__lt")
    if not name:
        return Q(**{pk_behind: cursor.pk})
    if cursor.value is None:
        return Q(**{f"{name}__isnull": False}) | Q(**{f"{name}__isnull": True, pk_behind: cursor.pk})
    return Q(**{f"{name}__{behind}": cursor.value}) | Q(**{name: cursor.value, pk_behind: cursor.pk})


def _order(name: str, desc: bool, reverse: bool) -> tuple[OrderBy | str, ...]:
    """The list's order (blanks last, then pk), or its exact reverse for reading a page backwards."""
    if not name:
        return ("-pk",) if reverse else ("pk",)
    if reverse:
        return (F(name).asc(nulls_first=True), "pk") if desc else (F(name).desc(nulls_first=True), "-pk")
    return (F(name).desc(nulls_last=True), "-pk") if desc else (F(name).asc(nulls_last=True), "pk")


def narrow[M: Model](queryset: QuerySet[M], query: ListQuery, spec: ListSpec, skip: str | None = None) -> QuerySet[M]:
    """The rows a query matches: every search word and filter, except filters on `skip` (for facet counts)."""
    qs = queryset
    for term in query.terms:
        qs = qs.filter(reduce(or_, (Q(**{f"{spec.path(name)}__icontains": term}) for name in spec.search)))
    for f in query.filters:
        if f.field == skip:
            continue
        build = spec.builders.get(f.field)
        qs = qs.filter(build(f) if build else Q(**{f"{spec.path(f.field)}__{f.lookup}": f.value}))
    return qs


# Adds to a list response from the unfiltered queryset and the validated query (facet counts, say).
Extra = Callable[[QuerySet[Any], ListQuery, ListSpec], dict[str, Any]]


def run_list[M: Model](
    queryset: QuerySet[M],
    query: ListQuery,
    spec: ListSpec,
    serialize: Callable[[M], dict],
    extra: Extra | None = None,
) -> dict[str, Any]:
    """Apply a validated query and cut one keyset page.

    Returns `results`; `next` and `previous` cursors (null at either end); `total` and `totalCapped`;
    `pageSize`; and whatever `extra` adds.
    """
    qs = narrow(queryset, query, spec)
    cap = grammar()["count_cap"]
    total = qs[: cap + 1].count()  # bounded: never counts past the cap

    name = spec.path(query.ordering.lstrip("-")) if query.ordering else ""
    desc = query.ordering.startswith("-")
    back = bool(query.after and query.after.backward)
    qs = qs.order_by(*_order(name, desc, reverse=back))
    if query.after:
        qs = qs.filter(_before(query.after, spec) if back else _after(query.after, spec))

    rows = list(qs[: query.page_size + 1])
    more = len(rows) > query.page_size
    rows = rows[: query.page_size]
    if back:  # read backwards from the cursor: put the page in reading order again
        rows.reverse()
    # Arriving by a cursor means there are rows on the side the reader came from.
    earlier = more if back else query.after is not None
    later = query.after is not None if back else more
    out = {
        "results": [serialize(r) for r in rows],
        "next": _make_cursor(query.ordering, rows[-1], spec) if later and rows else None,
        "previous": _make_cursor(query.ordering, rows[0], spec, backward=True) if earlier and rows else None,
        "total": min(total, cap),
        "totalCapped": total > cap,
        "pageSize": query.page_size,
    }
    if extra:
        out.update(extra(queryset, query, spec))
    return out
