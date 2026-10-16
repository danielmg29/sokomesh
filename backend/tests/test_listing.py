import datetime as dt
import uuid
import zoneinfo
from decimal import Decimal
from types import SimpleNamespace
from typing import cast

import pytest
from django.conf import settings
from django.db.models import Model
from django.http import QueryDict

from apps.accounts.models import User
from core.contract.build import build_contract
from core.operations.listing import (
    Filter,
    ListQuery,
    ListSpec,
    _make_cursor,
    parse_list_query,
    run_list,
    search_terms,
)
from core.result import Err, ErrorCode, Ok

EAT = zoneinfo.ZoneInfo("Africa/Nairobi")
BUYER = uuid.UUID("7d1a6f1e-3c1b-4b6f-9a51-0c2b1c4f8e10")

ORDER_META = {
    "ordering": ["-submitted_at", "total"],
    "search": ["order_number"],
    "list": {"fields": ["order_number"], "defaultPageSize": 25, "maxPageSize": 500},
    "fields": [
        {"name": "order_number", "type": "string"},
        {
            "name": "status",
            "type": "enum",
            "choices": [{"value": "submitted"}, {"value": "delivered"}],
            "filter": ["in"],
        },
        {"name": "buyer", "type": "relation", "filter": ["eq"]},
        {"name": "total", "type": "decimal", "filter": ["range"]},
        {"name": "submitted_at", "type": "datetime", "filter": ["range"]},
        {"name": "lines", "type": "integer"},
        {"name": "place", "type": "location", "filter": ["near"]},
    ],
}
SPEC = ListSpec.from_meta(ORDER_META)


def ok(params) -> ListQuery:
    result = parse_list_query(params, SPEC)
    assert isinstance(result, Ok), result
    return result.value


def refused(params, spec: ListSpec = SPEC) -> dict[str, list[str]]:
    result = parse_list_query(params, spec)
    assert isinstance(result, Err), result
    assert result.error.code is ErrorCode.VALIDATION
    return result.error.fields or {}


def test_spec_reads_the_contract_metadata():
    assert SPEC.fields["total"].ops == {"gte", "lte"}  # a range travels as its two bounds
    assert SPEC.fields["place"].ops == frozenset()  # distance needs geo search, not this grammar
    assert SPEC.max_page_size == settings.AC_LIMITS["max_page_size"]  # a model cannot exceed the contract
    assert SPEC.orderable == {"submitted_at", "total"}
    with pytest.raises(ValueError, match="undeclared"):
        ListSpec.from_meta({**ORDER_META, "search": ["nickname"]})


def test_defaults_come_from_the_spec():
    q = ok({})
    assert (q.terms, q.filters, q.ordering, q.page_size, q.after) == ((), (), "-submitted_at", 25, None)


def test_a_full_query_parses_into_typed_filters():
    q = ok(
        {
            "q": "  Mavuno  mavuno FLOUR ",
            "status__in": "submitted,delivered",
            "buyer__eq": str(BUYER),
            "total__gte": "1000",
            "total__lte": "48250.00",
            "ordering": "total",
            "page_size": "10",
        }
    )
    assert q.terms == ("mavuno", "flour")
    assert q.filters == (
        Filter("status", "in", ["submitted", "delivered"]),
        Filter("buyer", "exact", BUYER),
        Filter("total", "gte", Decimal("1000")),
        Filter("total", "lte", Decimal("48250.00")),
    )
    assert (q.ordering, q.page_size) == ("total", 10)


def test_date_only_bounds_on_a_datetime_cover_whole_days_in_eat():
    q = ok({"submitted_at__gte": "2026-10-11", "submitted_at__lte": "2026-10-11"})
    assert q.filters == (
        Filter("submitted_at", "gte", dt.datetime(2026, 10, 11, tzinfo=EAT)),
        Filter("submitted_at", "lt", dt.datetime(2026, 10, 12, tzinfo=EAT)),
    )


def test_repeated_keys_in_a_query_string_combine():
    q = ok(QueryDict("status__in=submitted&status__in=delivered"))
    assert q.filters == (Filter("status", "in", ["submitted", "delivered"]),)


def test_every_problem_is_reported_at_once():
    fields = refused(
        {
            "colour": "red",
            "total__in": "1",
            "place__near": "10",
            "status__in": "lost",
            "submitted_at__gte": "2026-10-11T10:00",
            "ordering": "lines",
            "page_size": "101",
        }
    )
    assert set(fields) == {
        "colour",
        "total__in",
        "place__near",
        "status__in",
        "submitted_at__gte",
        "ordering",
        "page_size",
    }


@pytest.mark.parametrize(
    ("key", "value"),
    [("total__gte", "abc"), ("total__gte", "NaN"), ("buyer__eq", "not-a-uuid"), ("page_size", "0"), ("page_size", "x")],
)
def test_values_must_fit_the_field_type(key, value):
    assert key in refused({key: value})


def test_lists_and_searches_are_bounded():
    g = settings.AC_LIST_QUERY
    assert "status__in" in refused({"status__in": ",".join(["submitted"] * (g["max_list_values"] + 1))})
    assert len(search_terms(" ".join(f"w{i}" for i in range(30)))) == g["max_search_terms"]
    assert search_terms("x" * 500) == ("x" * g["max_search_length"],)


def test_search_needs_declared_search_fields():
    unsearchable = ListSpec.from_meta({**ORDER_META, "search": []})
    assert "q" in refused({"q": "mavuno"}, unsearchable)


def test_cursors_are_signed_and_tied_to_their_ordering():
    row = cast(Model, SimpleNamespace(pk=uuid.uuid4(), total=Decimal("8700.00")))
    cursor = _make_cursor("total", row)
    q = ok({"ordering": "total", "cursor": cursor})
    assert q.after is not None and q.after.value == Decimal("8700.00")
    assert "cursor" in refused({"ordering": "-total", "cursor": cursor})
    assert "cursor" in refused({"ordering": "total", "cursor": cursor[:-2] + "xx"})


def test_the_contract_exports_the_grammar():
    exported = build_contract()["listQuery"]
    assert exported["search"] == "q" and exported["operatorSeparator"] == "__"
    assert exported["countCap"] == settings.AC_LIST_QUERY["count_cap"]


# --- applied to a real queryset (Postgres) ----------------------------------------------------

USER_SPEC = ListSpec.from_meta(
    {
        "ordering": ["-date_joined", "email", "email_verified_at"],
        "search": ["email", "display_name"],
        "list": {"defaultPageSize": 25, "maxPageSize": 100},
        "fields": [
            {"name": "email", "type": "email", "filter": ["contains"]},
            {"name": "display_name", "type": "string"},
            {"name": "is_active", "type": "boolean", "filter": ["eq"]},
            {"name": "date_joined", "type": "datetime", "filter": ["range"]},
            {"name": "email_verified_at", "type": "datetime", "filter": ["isnull"]},
        ],
    }
)


@pytest.fixture
def people():
    base = dt.datetime(2026, 10, 1, 9, 0, tzinfo=EAT)
    rows = [
        ("faith@mwangaza-demo.co.ke", "Faith Chebet", True, 0, 1),
        ("peter@mwangaza-demo.co.ke", "Peter Kamau", True, 1, None),
        ("grace@wanjiru-demo.co.ke", "Grace Wanjiru", True, 2, 3),
        ("brian@baraka-demo.co.ke", "Brian Otieno", False, 3, None),
        ("amina@pwani-demo.co.ke", "Amina Hassan", True, 4, 2),
        ("joseph@rift-demo.co.ke", "Joseph Mutua", True, 5, None),
    ]
    for email, name, active, day, verified in rows:
        User.objects.create(
            email=email,
            display_name=name,
            is_active=active,
            date_joined=base + dt.timedelta(days=day),
            email_verified_at=None if verified is None else base + dt.timedelta(days=verified, hours=1),
        )


def page(params, spec: ListSpec = USER_SPEC):
    result = parse_list_query(params, spec)
    assert isinstance(result, Ok), result
    return run_list(User.objects.all(), result.value, spec, lambda u: {"email": u.email})


def emails(body) -> list[str]:
    return [r["email"] for r in body["results"]]


@pytest.mark.django_db
def test_search_filters_and_order_apply_on_the_database(people):
    mwangaza = ["faith@mwangaza-demo.co.ke", "peter@mwangaza-demo.co.ke"]
    assert emails(page({"q": "mwangaza", "ordering": "email"})) == mwangaza
    assert emails(page({"q": "wanjiru grace"})) == ["grace@wanjiru-demo.co.ke"]
    assert "brian@baraka-demo.co.ke" not in emails(page({"is_active__eq": "true"}))
    assert emails(page({"date_joined__gte": "2026-10-05", "ordering": "email"})) == [
        "amina@pwani-demo.co.ke",
        "joseph@rift-demo.co.ke",
    ]
    body = page({"email_verified_at__isnull": "true"})
    assert body["total"] == 3 and body["totalCapped"] is False


@pytest.mark.django_db
@pytest.mark.parametrize("ordering", ["email", "-email", "email_verified_at", "-email_verified_at", "-date_joined"])
def test_keyset_pages_visit_every_row_once_with_blanks_last(people, ordering):
    seen: list[str] = []
    params = {"ordering": ordering, "page_size": "2"}
    for _ in range(10):
        body = page(params)
        seen += emails(body)
        if not body["next"]:
            break
        params = {**params, "cursor": body["next"]}
    everyone = page({"ordering": ordering, "page_size": "100"})
    assert seen == emails(everyone) and len(set(seen)) == 6
    if ordering.lstrip("-") == "email_verified_at":
        verified = {u.email for u in User.objects.filter(email_verified_at__isnull=False)}
        assert set(seen[:3]) == verified  # blanks last in both directions


@pytest.mark.django_db
def test_the_total_is_counted_up_to_the_cap(people, settings):
    settings.AC_LIST_QUERY = {**settings.AC_LIST_QUERY, "count_cap": 4}
    body = page({})
    assert (body["total"], body["totalCapped"]) == (4, True)
