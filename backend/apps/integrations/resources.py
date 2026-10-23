"""SM-F-23 resources: an organization's API clients and tokens, webhook endpoints and their deliveries.
Tokens and webhook secrets are shown once, in the answer that creates (or rotates) them."""

from typing import Any

from django.db.models import QuerySet
from django.http import HttpRequest
from django.utils import timezone

from apps.catalog.resources import relation_ref
from apps.integrations import services
from apps.integrations.models import SCOPES, TOPICS, ApiClient, ApiToken, WebhookDelivery, WebhookEndpoint
from apps.organizations.tenancy import active_membership, is_admin
from core.api import invalid
from core.events.record import audit
from core.operations.registry import Action, Field, Resource, derive, register

STATUS_TONES = {"active": "success", "revoked": "neutral"}
DELIVERY_TONES = {"queued": "info", "delivered": "success", "retrying": "warning", "failed": "danger"}


def _own(request: HttpRequest, qs: QuerySet[Any]) -> QuerySet[Any]:
    return qs if is_admin(request.user) else qs.filter(organization=active_membership(request).organization)


def _org(request: HttpRequest) -> Any:
    return active_membership(request).organization


# --- clients and tokens -----------------------------------------------------------------------------------


def _revoke_client(request: HttpRequest, c: ApiClient, data: dict[str, Any]) -> None:
    c.status = ApiClient.Status.REVOKED
    c.save(update_fields=["status"])
    c.tokens.filter(status=ApiToken.Status.ACTIVE).update(status=ApiToken.Status.REVOKED, revoked_at=timezone.now())  # pyright: ignore[reportAttributeAccessIssue]
    audit(
        "integration.client_revoked",
        domain="integration",
        resource=c,
        organization=c.organization_id,  # pyright: ignore[reportAttributeAccessIssue]
        actor=request.user,
        summary=f"API client {c.name} revoked with all its tokens",
    )  # pyright: ignore[reportAttributeAccessIssue]


api_client = register(
    Resource(
        key="api_client",
        path="integrations/clients",
        model=ApiClient,
        label="API client",
        label_plural="API clients",
        display_field="name",
        fields=(
            derive(ApiClient, "id"),
            derive(ApiClient, "name"),
            derive(ApiClient, "status", widget="status", tones=STATUS_TONES, read_only=True),
            derive(ApiClient, "created_at", read_only=True, widget="relative-time"),
        ),
        list_fields=("name", "status", "created_at"),
        search=("name",),
        ordering=("name",),
        writable=("name",),
        permissions={
            "list": "integration.list",
            "get": "integration.list",
            "create": "integration.manage",
            "update": "integration.manage",
        },
        actions=(
            Action(
                "revoke",
                "Revoke",
                "integration.manage",
                _revoke_client,
                confirm=True,
                tone="danger",
                icon="ban",
                when={"status": ["active"]},
            ),
        ),
        hooks={
            "queryset": lambda request: _own(request, ApiClient.objects.all()),
            "organization_of": lambda c: c.organization,
            "create": lambda request, data: ApiClient(organization=_org(request), created_by=request.user, **data),
        },
    )
)


def _create_token(request: HttpRequest, data: dict[str, Any]) -> ApiToken:
    client = relation_ref(
        ApiClient.objects.filter(organization=_org(request), status="active"),
        data.pop("client", None),
        "client",
        "Choose an active API client.",
    )
    data["scopes"] = services.check_scopes(data.get("scopes"))
    if data.get("expires_at") and data["expires_at"] <= timezone.now():
        invalid({"expires_at": ["Choose a date in the future, or leave it empty."]})
    token = ApiToken(client=client, organization=client.organization, created_by=request.user, **data)
    token._raw = services.issue(token)  # type: ignore[attr-defined]  (shown in this answer only)
    return token


def _token_created(token: ApiToken, request: HttpRequest) -> None:
    audit(
        "integration.token_created",
        domain="integration",
        resource=token,
        organization=token.organization_id,  # pyright: ignore[reportAttributeAccessIssue]
        actor=request.user,
        summary=f"Token {token.name} (…{token.last4}) for {token.client.name}: {', '.join(token.scopes)}",
    )  # pyright: ignore[reportAttributeAccessIssue]


def _revoke_token(request: HttpRequest, t: ApiToken, data: dict[str, Any]) -> None:
    t.status, t.revoked_at = ApiToken.Status.REVOKED, timezone.now()
    t.save(update_fields=["status", "revoked_at"])
    audit(
        "integration.token_revoked",
        domain="integration",
        resource=t,
        organization=t.organization_id,  # pyright: ignore[reportAttributeAccessIssue]
        actor=request.user,
        summary=f"Token {t.name} (…{t.last4}) revoked",
    )  # pyright: ignore[reportAttributeAccessIssue]


api_token = register(
    Resource(
        key="api_token",
        path="integrations/tokens",
        model=ApiToken,
        label="API token",
        label_plural="API tokens",
        display_field="name",
        fields=(
            derive(ApiToken, "id"),
            derive(ApiToken, "client", relation={"model": "api_client", "display": "name"}, filter=("eq",), weight=5),
            derive(ApiToken, "name", weight=10),
            Field(
                "scopes",
                "multiselect",
                "multiselect",
                label="Access",
                help="Give each connection only what it needs.",
                required=True,
                choices=tuple({"value": k, "label": v} for k, v in SCOPES),
                weight=15,
            ),
            derive(ApiToken, "expires_at", weight=20),
            derive(ApiToken, "last4", read_only=True, widget="code"),
            derive(ApiToken, "status", widget="status", tones=STATUS_TONES, read_only=True, filter=("in",)),
            derive(ApiToken, "last_used_at", read_only=True, widget="relative-time"),
            derive(ApiToken, "created_at", read_only=True, widget="relative-time"),
        ),
        list_fields=("name", "client", "scopes", "last4", "status", "last_used_at"),
        search=("name",),
        ordering=("-created_at",),
        writable=("client", "name", "scopes", "expires_at"),
        permissions={"list": "integration.list", "get": "integration.list", "create": "integration.manage"},
        actions=(
            Action(
                "revoke",
                "Revoke",
                "integration.manage",
                _revoke_token,
                confirm=True,
                tone="danger",
                icon="ban",
                when={"status": ["active"]},
            ),
        ),
        hooks={
            "queryset": lambda request: _own(request, ApiToken.objects.select_related("client")),
            "organization_of": lambda t: t.organization,
            "create": _create_token,
            "after_create": _token_created,
            "serialize_extra": lambda t, request: {"token": t._raw} if getattr(t, "_raw", None) else {},
        },
    )
)


# --- webhooks -----------------------------------------------------------------------------------------------


def _create_endpoint(request: HttpRequest, data: dict[str, Any]) -> WebhookEndpoint:
    if not services.public_address(str(data.get("url") or "")):
        invalid({"url": ["Use an https:// address on the public internet."]})
    data["events"] = services.check_topics(data.get("events"))
    endpoint = WebhookEndpoint(
        organization=_org(request), created_by=request.user, secret_salt=services.new_salt(), **data
    )
    endpoint._show_secret = True  # type: ignore[attr-defined]
    return endpoint


def _update_endpoint(request: HttpRequest, e: WebhookEndpoint, changes: dict[str, Any]) -> None:
    if "url" in changes and not services.public_address(str(changes["url"])):
        invalid({"url": ["Use an https:// address on the public internet."]})
    if "events" in changes:
        changes["events"] = services.check_topics(changes["events"])
    for k, v in changes.items():
        setattr(e, k, v)


def _rotate(request: HttpRequest, e: WebhookEndpoint, data: dict[str, Any]) -> None:
    e.secret_salt, e.rotated_at = services.new_salt(), timezone.now()
    e.save(update_fields=["secret_salt", "rotated_at"])
    e._show_secret = True  # type: ignore[attr-defined]
    audit(
        "integration.webhook_rotated",
        domain="integration",
        resource=e,
        organization=e.organization_id,  # pyright: ignore[reportAttributeAccessIssue]
        actor=request.user,
        summary=f"Signing secret for {e.url} replaced",
    )  # pyright: ignore[reportAttributeAccessIssue]


def _switch(on: bool):
    def run(request: HttpRequest, e: WebhookEndpoint, data: dict[str, Any]) -> None:
        e.is_active = on
        e.save(update_fields=["is_active"])

    return run


def _endpoint_view(e: WebhookEndpoint, request: HttpRequest) -> dict[str, Any]:
    last = e.deliveries.order_by("-created_at").first()  # pyright: ignore[reportAttributeAccessIssue]
    out: dict[str, Any] = {
        "last_delivery": {
            "status": last.status,
            "at": (last.delivered_at or last.created_at).isoformat(),
            "attempts": last.attempts,
            "code": last.response_status,
        }
        if last
        else None,
    }
    if getattr(e, "_show_secret", False):
        out["secret"] = services.endpoint_secret(e)
    return out


webhook_endpoint = register(
    Resource(
        key="webhook_endpoint",
        path="integrations/webhooks",
        model=WebhookEndpoint,
        label="Webhook",
        label_plural="Webhooks",
        display_field="url",
        fields=(
            derive(WebhookEndpoint, "id"),
            derive(WebhookEndpoint, "url", widget="url", weight=5),
            Field(
                "events",
                "multiselect",
                "multiselect",
                label="Events",
                help="Each event is sent as a signed POST; see the integration guide.",
                required=True,
                choices=tuple({"value": k, "label": v} for k, v in TOPICS),
                weight=10,
            ),
            derive(WebhookEndpoint, "is_active", read_only=True, filter=("eq",)),
            derive(WebhookEndpoint, "created_at", read_only=True, widget="relative-time"),
            derive(WebhookEndpoint, "rotated_at", read_only=True, widget="relative-time"),
        ),
        list_fields=("url", "events", "is_active", "created_at"),
        search=("url",),
        ordering=("created_at",),
        writable=("url", "events"),
        permissions={
            "list": "integration.list",
            "get": "integration.list",
            "create": "integration.manage",
            "update": "integration.manage",
        },
        actions=(
            Action(
                "rotate_secret",
                "Replace secret",
                "integration.manage",
                _rotate,
                confirm=True,
                tone="warning",
                icon="refresh-cw",
            ),
            Action(
                "switch_off",
                "Switch off",
                "integration.manage",
                _switch(False),
                confirm=True,
                icon="ban",
                when={"is_active": ["true"]},
            ),
            Action(
                "switch_on",
                "Switch on",
                "integration.manage",
                _switch(True),
                icon="check",
                when={"is_active": ["false"]},
            ),
        ),
        hooks={
            "queryset": lambda request: _own(request, WebhookEndpoint.objects.all()),
            "organization_of": lambda e: e.organization,
            "create": _create_endpoint,
            "update": _update_endpoint,
            "serialize_extra": _endpoint_view,
        },
    )
)


def _retry(request: HttpRequest, d: WebhookDelivery, data: dict[str, Any]) -> None:
    d.status, d.next_attempt_at = WebhookDelivery.Status.QUEUED, timezone.now()
    d.save(update_fields=["status", "next_attempt_at"])


webhook_delivery = register(
    Resource(
        key="webhook_delivery",
        path="integrations/deliveries",
        model=WebhookDelivery,
        label="Delivery",
        label_plural="Deliveries",
        display_field="topic",
        fields=(
            derive(WebhookDelivery, "id"),
            derive(
                WebhookDelivery,
                "endpoint",
                read_only=True,
                relation={"model": "webhook_endpoint", "display": "url"},
                filter=("eq",),
            ),
            derive(WebhookDelivery, "topic", read_only=True),
            derive(WebhookDelivery, "status", widget="status", tones=DELIVERY_TONES, read_only=True, filter=("in",)),
            derive(WebhookDelivery, "attempts", read_only=True),
            derive(WebhookDelivery, "response_status", read_only=True),
            derive(WebhookDelivery, "last_error", read_only=True),
            derive(WebhookDelivery, "next_attempt_at", read_only=True, widget="relative-time"),
            derive(WebhookDelivery, "delivered_at", read_only=True, widget="relative-time"),
            derive(WebhookDelivery, "created_at", read_only=True, widget="relative-time"),
        ),
        list_fields=("topic", "endpoint", "status", "attempts", "response_status", "created_at"),
        search=("topic",),
        ordering=("-created_at",),
        permissions={"list": "integration.list", "get": "integration.list"},
        actions=(
            Action("retry", "Send again", "integration.manage", _retry, icon="refresh-cw", when={"status": ["failed"]}),
        ),
        hooks={
            "queryset": lambda request: (
                WebhookDelivery.objects.select_related("endpoint")
                if is_admin(request.user)
                else WebhookDelivery.objects.select_related("endpoint").filter(endpoint__organization=_org(request))
            ),
            "organization_of": lambda d: d.endpoint.organization,
        },
    )
)
