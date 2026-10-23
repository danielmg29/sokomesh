"""SM-F-24 resource: the audit trail, read-only, for marketplace administrators."""

from core.events.models import AuditEvent, Domain
from core.operations.registry import Field, Resource, derive, register

DOMAIN_TONES = {
    "payment": "success",
    "inventory": "signal",
    "order": "info",
    "return": "warning",
    "integration": "neutral",
}

audit_event = register(
    Resource(
        key="audit_event",
        path="audit-events",
        model=AuditEvent,
        label="Audit event",
        label_plural="Audit trail",
        display_field="event_type",
        fields=(
            derive(AuditEvent, "id"),
            derive(AuditEvent, "occurred_at", read_only=True, filter=("range",)),
            Field(
                "domain",
                "enum",
                "status",
                label="Area",
                read_only=True,
                filter=("in",),
                choices=tuple(
                    {"value": v, "label": str(lbl), **({"tone": DOMAIN_TONES[v]} if v in DOMAIN_TONES else {})}
                    for v, lbl in Domain.choices
                ),
            ),
            derive(AuditEvent, "event_type", read_only=True, widget="code", filter=("eq",)),
            derive(AuditEvent, "summary", read_only=True),
            derive(AuditEvent, "actor_label", read_only=True),
            derive(AuditEvent, "reason", read_only=True),
            derive(AuditEvent, "correlation_id", read_only=True, widget="code", filter=("eq",)),
            derive(AuditEvent, "request_id", read_only=True, widget="code"),
            derive(AuditEvent, "resource_type", read_only=True),
            derive(AuditEvent, "resource_id", read_only=True, widget="code"),
        ),
        list_fields=("occurred_at", "domain", "event_type", "summary", "actor_label"),
        search=("summary", "event_type"),
        ordering=("-occurred_at",),
        default_page_size=50,
        permissions={"list": "audit_event.list", "get": "audit_event.list"},
        hooks={"queryset": lambda request: AuditEvent.objects.all()},
    )
)
