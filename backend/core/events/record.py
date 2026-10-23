"""Write an audit row and, when integrations should hear of it, an outbox event, in the caller's transaction."""

from typing import Any

from django.utils import timezone

from core.events import context
from core.events.models import AuditEvent, OutboxEvent

# Never kept in an audit row or an outbox payload, whatever a caller passes.
REDACTED = {"phone", "msisdn", "tax_identifier", "token", "secret", "password", "pin", "email"}


def _redact(data: Any) -> Any:
    if isinstance(data, dict):
        return {k: ("[redacted]" if k.lower() in REDACTED else _redact(v)) for k, v in data.items()}
    if isinstance(data, list):
        return [_redact(v) for v in data]
    return data


def _actor(actor: Any) -> tuple[Any, str]:
    if actor is None:
        return None, "SokoMesh"
    if isinstance(actor, str):
        return None, actor[:150]
    label = getattr(actor, "display_name", "") or getattr(actor, "name", "") or getattr(actor, "email", "")
    return getattr(actor, "pk", None), str(label)[:150]


def audit(
    event_type: str,
    *,
    domain: str,
    resource: Any,
    summary: str,
    organization: Any = None,
    actor: Any = None,
    reason: str = "",
    data: dict[str, Any] | None = None,
    correlation_id: str | None = None,
) -> AuditEvent:
    """`resource` is a model instance (its type is its model name) or a `(type, id)` pair."""
    rtype, rid = resource if isinstance(resource, tuple) else (resource._meta.model_name, resource.pk)
    actor_id, actor_label = _actor(actor)
    return AuditEvent.objects.create(
        occurred_at=timezone.now(),
        event_type=event_type,
        domain=domain,
        resource_type=str(rtype),
        resource_id=str(rid),
        organization_id=getattr(organization, "pk", organization),
        actor_id=actor_id,
        actor_label=actor_label,
        request_id=context.request_id(),
        correlation_id=correlation_id or context.correlation_id(),
        summary=summary[:500],
        reason=reason[:1000],
        data=_redact(data or {}),
    )


def emit(topic: str, *, organization: Any, payload: dict[str, Any], correlation_id: str | None = None) -> OutboxEvent:
    return OutboxEvent.objects.create(
        topic=topic,
        organization_id=getattr(organization, "pk", organization),
        payload=_redact(payload),
        correlation_id=correlation_id or context.correlation_id(),
        available_at=timezone.now(),
    )
