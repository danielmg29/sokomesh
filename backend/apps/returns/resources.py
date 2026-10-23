"""SM-F-18 resource: return and dispute cases. Buyers open them on their own shipped or delivered orders;
both sides add evidence; the seller asks for more or decides (apps.returns.services carries it out)."""

from typing import Any

from django.db.models import Q, QuerySet
from django.http import HttpRequest

from apps.catalog.resources import relation_ref
from apps.media.models import FileAsset
from apps.media.services import ACCESS_RULES
from apps.orders.lifecycle import side_of
from apps.orders.models import Order, OrderLine
from apps.organizations.tenancy import active_membership, active_memberships, is_admin
from apps.returns import services
from apps.returns.models import ReturnCase, ReturnEvidence
from core.api import invalid
from core.operations.registry import Action, Field, Resource, action_input, derive, register

CASE_TONES = {
    "open": "info",
    "evidence_requested": "warning",
    "reviewing": "signal",
    "approved": "success",
    "rejected": "danger",
    "resolved": "neutral",
}


def _cases(request: HttpRequest) -> QuerySet[ReturnCase]:
    qs = ReturnCase.objects.select_related(
        "order", "order_line", "buyer_organization", "seller_organization", "opened_by"
    )
    if is_admin(request.user):
        return qs
    org = active_membership(request).organization
    return qs.filter(Q(buyer_organization=org) | Q(seller_organization=org))


def _create(request: HttpRequest, data: dict[str, Any]) -> ReturnCase:
    org = active_membership(request).organization
    order = relation_ref(
        Order.objects.filter(buyer_organization=org), data.pop("order", None), "order", "Choose one of your orders."
    )
    raw_line = data.pop("order_line", None)
    data["order_line"] = (
        relation_ref(OrderLine.objects.filter(order=order), raw_line, "order_line", "Choose a line of this order.")
        if raw_line
        else None
    )
    return services.prepare(request, order, data)


def _action(name: str) -> Action:
    return next(a for a in return_case.actions if a.name == name)


def _file(request: HttpRequest, value: Any) -> FileAsset:
    ref = value.get("id") if isinstance(value, dict) else value
    found = (
        FileAsset.objects.filter(pk=ref, organization=active_membership(request).organization).first() if ref else None
    )
    if found is None:
        invalid({"evidence_file": ["Upload the photo or document first."]})
    return found


def _request_evidence(request: HttpRequest, case: ReturnCase, data: dict[str, Any]) -> None:
    values = action_input(return_case, _action("request_evidence"), data, ("note",))
    services.request_evidence(request, case, values["note"])


def _add_evidence(request: HttpRequest, case: ReturnCase, data: dict[str, Any]) -> None:
    values = action_input(return_case, _action("add_evidence"), data, ("evidence_file",))
    services.add_evidence(request, case, _file(request, values["evidence_file"]), values.get("note") or "")


def _decide(request: HttpRequest, case: ReturnCase, data: dict[str, Any]) -> None:
    values = action_input(return_case, _action("decide"), data, ("decision", "decision_notes"))
    services.decide(
        request,
        case,
        decision=values["decision"],
        approved_quantity=values.get("approved_quantity"),
        disposition=values.get("stock_disposition") or "",
        notes=values["decision_notes"],
    )


def _withdraw(request: HttpRequest, case: ReturnCase, data: dict[str, Any]) -> None:
    services.withdraw(request, case)


def _can(request: HttpRequest, case: ReturnCase, names: list[str]) -> list[str]:
    side = side_of(request, case.order)
    if case.status not in services.OPEN_STATES:
        return []
    allowed = {"add_evidence"}
    allowed |= {"request_evidence", "decide"} if side == "seller" else {"withdraw"} if side == "buyer" else set()
    return [n for n in names if n in allowed]


return_case = register(
    Resource(
        key="return_case",
        path="returns",
        model=ReturnCase,
        label="Case",
        label_plural="Returns and disputes",
        display_field="reference",
        fields=(
            derive(ReturnCase, "id"),
            derive(ReturnCase, "reference", read_only=True, widget="code"),
            derive(
                ReturnCase, "order", relation={"model": "order", "display": "order_number"}, filter=("eq",), weight=5
            ),
            derive(
                ReturnCase,
                "order_line",
                relation={"model": "order_line", "display": "product_name_snapshot"},
                weight=10,
            ),
            derive(ReturnCase, "case_type", filter=("in",), weight=15),
            derive(ReturnCase, "reason_code", weight=20),
            derive(ReturnCase, "quantity", weight=25),
            derive(ReturnCase, "reason_details", weight=30),
            derive(ReturnCase, "status", widget="status", tones=CASE_TONES, read_only=True, filter=("in",)),
            derive(ReturnCase, "decision"),
            derive(ReturnCase, "approved_quantity"),
            derive(ReturnCase, "stock_disposition"),
            derive(ReturnCase, "decision_notes"),
            derive(ReturnCase, "evidence_note", read_only=True),
            derive(ReturnCase, "refund_amount", read_only=True, widget="currency", currency="KES"),
            derive(ReturnCase, "refunded_amount", read_only=True, widget="currency", currency="KES"),
            derive(ReturnCase, "opened_by", read_only=True, relation={"model": "user", "display": "display_name"}),
            derive(ReturnCase, "opened_at", read_only=True, widget="relative-time", filter=("range",)),
            derive(ReturnCase, "decided_at", read_only=True, widget="relative-time"),
            Field("note", "text", "textarea", label="Note", max_length=300, input_only=True),
            Field(
                "evidence_file",
                "file",
                "file",
                label="Photo or document",
                help="JPEG, PNG or PDF of what you received.",
                input_only=True,
            ),
        ),
        list_fields=("reference", "order", "case_type", "status", "opened_at"),
        search=("reference",),
        ordering=("-opened_at", "opened_at"),
        default_page_size=25,
        writable=("order", "order_line", "case_type", "reason_code", "quantity", "reason_details"),
        permissions={"list": "return_case.list", "get": "return_case.get", "create": "return_case.create"},
        actions=(
            Action(
                "request_evidence",
                "Ask for evidence",
                "return_case.decide",
                _request_evidence,
                input=("note",),
                icon="message-square",
            ),
            Action(
                "add_evidence",
                "Add evidence",
                "return_case.evidence",
                _add_evidence,
                input=("evidence_file", "note"),
                icon="upload",
            ),
            Action(
                "decide",
                "Record decision",
                "return_case.decide",
                _decide,
                input=("decision", "approved_quantity", "stock_disposition", "decision_notes"),
                icon="scale",
            ),
            Action("withdraw", "Withdraw case", "return_case.create", _withdraw, confirm=True, tone="danger"),
        ),
        hooks={
            "queryset": _cases,
            "organization_of": lambda c: [c.buyer_organization, c.seller_organization],
            "serialize_extra": services.case_view,
            "create": _create,
            "after_create": lambda case, request: services.opened(case),
            "can": _can,
        },
    )
)


def _evidence_reader(user: Any, asset: FileAsset) -> bool:
    """Both sides of a case may open its evidence."""
    if not getattr(user, "is_authenticated", False):
        return False
    orgs = active_memberships(user).values_list("organization_id", flat=True)
    return ReturnEvidence.objects.filter(
        Q(case__buyer_organization_id__in=orgs) | Q(case__seller_organization_id__in=orgs), file=asset
    ).exists()


ACCESS_RULES.append(_evidence_reader)
