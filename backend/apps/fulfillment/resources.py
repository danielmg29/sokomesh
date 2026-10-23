"""SM-F-16 resource: the seller's pick lists. Warehouse staff start one, decide each line, pack and hand over
with a photo; the order, the ledger and the shipment follow (apps.fulfillment.services)."""

from typing import Any

from django.db.models import QuerySet
from django.http import HttpRequest

from apps.fulfillment import services
from apps.fulfillment.models import FulfillmentTask
from apps.media.models import FileAsset
from apps.media.services import ACCESS_RULES
from apps.organizations.tenancy import active_membership, is_admin
from core.api import invalid
from core.operations.registry import Action, Field, Resource, action_input, derive, register

TASK_TONES = {
    "queued": "info",
    "picking": "signal",
    "packed": "warning",
    "handed_over": "success",
    "cancelled": "neutral",
}


def _tasks(request: HttpRequest) -> QuerySet[FulfillmentTask]:
    qs = FulfillmentTask.objects.select_related("order__buyer_organization", "assigned_to", "handover_evidence")
    return qs if is_admin(request.user) else qs.filter(seller=active_membership(request).organization)


def _action(name: str) -> Action:
    return next(a for a in fulfillment_task.actions if a.name == name)


def _start(request: HttpRequest, task: FulfillmentTask, data: dict[str, Any]) -> None:
    services.start(task, request.user)


def _picks(request: HttpRequest, task: FulfillmentTask, data: dict[str, Any]) -> None:
    values = action_input(fulfillment_task, _action("record_picks"), data, ("picks",))
    services.decide(task, values["picks"], request.user)


def _pack(request: HttpRequest, task: FulfillmentTask, data: dict[str, Any]) -> None:
    values = action_input(fulfillment_task, _action("pack"), data)
    services.pack(task, packages=values.get("packages"), weight_kg=values.get("weight_kg"), actor=request.user)


def _hand_over(request: HttpRequest, task: FulfillmentTask, data: dict[str, Any]) -> None:
    values = action_input(fulfillment_task, _action("hand_over"), data, ("carrier_name",))
    proof = values.get("evidence_file")
    evidence = None
    if proof:
        ref = proof.get("id") if isinstance(proof, dict) else proof
        evidence = FileAsset.objects.filter(pk=ref, organization=task.seller).first()
        if evidence is None:
            invalid({"evidence_file": ["Upload the handover photo first."]})
    services.hand_over(
        task,
        actor=request.user,
        carrier_name=values["carrier_name"],
        carrier_reference=values.get("carrier_reference") or "",
        end_at=values.get("estimated_end_at"),
        driver_name=values.get("driver_name") or "",
        vehicle_registration=values.get("vehicle_registration") or "",
        evidence=evidence,
    )


fulfillment_task = register(
    Resource(
        key="fulfillment_task",
        path="fulfilment/tasks",
        model=FulfillmentTask,
        label="Pick list",
        label_plural="Pick lists",
        display_field="order",
        fields=(
            derive(FulfillmentTask, "id"),
            derive(FulfillmentTask, "order", read_only=True, relation={"model": "order", "display": "order_number"}),
            derive(FulfillmentTask, "status", widget="status", tones=TASK_TONES, read_only=True, filter=("in",)),
            derive(
                FulfillmentTask, "assigned_to", read_only=True, relation={"model": "user", "display": "display_name"}
            ),
            derive(FulfillmentTask, "packages"),
            derive(FulfillmentTask, "weight_kg"),
            derive(FulfillmentTask, "driver_name"),
            derive(FulfillmentTask, "vehicle_registration", widget="code"),
            derive(FulfillmentTask, "created_at", read_only=True, widget="relative-time", filter=("range",)),
            derive(FulfillmentTask, "handed_over_at", read_only=True, widget="relative-time"),
            Field(
                "picks",
                "json",
                "json",
                label="Picks",
                help="For each line: packs picked, and why if short.",
                input_only=True,
            ),
            Field("carrier_name", "string", "text", label="Carrier", max_length=80, input_only=True),
            Field("carrier_reference", "string", "code", label="Tracking reference", max_length=80, input_only=True),
            Field("estimated_end_at", "datetime", "datetime", label="Expected by", input_only=True),
            Field(
                "evidence_file",
                "file",
                "file",
                label="Handover photo",
                help="The loaded goods with the delivery note.",
                input_only=True,
            ),
        ),
        list_fields=("order", "status", "assigned_to", "created_at"),
        search=("order",),
        search_paths={"order": "order__order_number"},
        ordering=("created_at", "-created_at"),
        default_page_size=25,
        writable=("packages", "weight_kg", "driver_name", "vehicle_registration"),
        permissions={
            "list": "fulfillment_task.list",
            "get": "fulfillment_task.get",
            "update": "fulfillment_task.update",
        },
        actions=(
            Action(
                "start", "Start picking", "fulfillment_task.update", _start, icon="package", when={"status": ["queued"]}
            ),
            Action(
                "record_picks",
                "Record picks",
                "fulfillment_task.update",
                _picks,
                input=("picks",),
                when={"status": ["queued", "picking"]},
            ),
            Action(
                "pack",
                "Packed",
                "fulfillment_task.update",
                _pack,
                input=("packages", "weight_kg"),
                icon="package-check",
                when={"status": ["picking"]},
            ),
            Action(
                "hand_over",
                "Hand over",
                "fulfillment_task.update",
                _hand_over,
                input=(
                    "carrier_name",
                    "carrier_reference",
                    "estimated_end_at",
                    "driver_name",
                    "vehicle_registration",
                    "evidence_file",
                ),
                icon="truck",
                when={"status": ["packed"]},
            ),
        ),
        hooks={
            "queryset": _tasks,
            "organization_of": lambda t: t.seller,
            "serialize_extra": lambda t, request: services.task_view(t, request),
        },
    )
)


def _handover_reader(user: Any, asset: Any) -> bool:
    """The buyer of an order may open its handover photo (the seller owns the file already)."""
    from apps.organizations.tenancy import active_memberships

    if not getattr(user, "is_authenticated", False):
        return False
    orgs = active_memberships(user).values_list("organization_id", flat=True)
    return FulfillmentTask.objects.filter(handover_evidence=asset, order__buyer_organization_id__in=orgs).exists()


ACCESS_RULES.append(_handover_reader)
