"""SM-F-21 resources: a person's in-app notifications and their preference rows. Both are self-owned."""

from typing import Any

from django.conf import settings
from django.db.models import QuerySet
from django.http import HttpRequest
from django.utils import timezone

from apps.notifications.models import Notification, NotificationPreference
from apps.notifications.services import ensure_preferences
from core.operations.registry import SELF, Action, Resource, derive, register

STATUS_TONES = {"queued": "neutral", "sent": "signal", "failed": "danger", "read": "neutral"}
LOCALES = tuple({"value": code, "label": label} for code, label in settings.AC_LOCALES["supported"])


def _inbox(request: HttpRequest) -> QuerySet[Notification]:
    return Notification.objects.filter(recipient=request.user, channel="in_app")


def _read(request: HttpRequest, n: Notification, data: dict[str, Any]) -> None:
    n.status, n.read_at = Notification.Status.READ, timezone.now()
    n.save(update_fields=["status", "read_at"])


notification = register(
    Resource(
        key="notification",
        path="notifications",
        model=Notification,
        label="Notification",
        label_plural="Notifications",
        display_field="title",
        tenant_scoped=False,
        fields=(
            derive(Notification, "id"),
            derive(Notification, "event_key", read_only=True, filter=("in",)),
            derive(Notification, "title", read_only=True),
            derive(Notification, "body_text", read_only=True),
            derive(Notification, "deep_link", read_only=True, widget="url"),
            derive(Notification, "status", widget="status", tones=STATUS_TONES, read_only=True, filter=("in",)),
            derive(Notification, "created_at", read_only=True, widget="relative-time", filter=("range",)),
            derive(Notification, "read_at", read_only=True, widget="relative-time"),
        ),
        list_fields=("title", "event_key", "status", "created_at"),
        search=("title", "body_text"),
        ordering=("-created_at",),
        default_page_size=25,
        permissions={"list": SELF, "get": SELF},
        actions=(Action("read", "Mark as read", SELF, _read, icon="check", when={"status": ["queued", "sent"]}),),
        hooks={"queryset": _inbox, "organization_of": lambda n: None},
    )
)


def _preferences(request: HttpRequest) -> QuerySet[NotificationPreference]:
    ensure_preferences(request.user)
    return NotificationPreference.objects.filter(user=request.user)


preference = register(
    Resource(
        key="notification_preference",
        path="notification-preferences",
        model=NotificationPreference,
        label="Notification preference",
        label_plural="Notification preferences",
        display_field="event_key",
        tenant_scoped=False,
        fields=(
            derive(NotificationPreference, "id"),
            derive(NotificationPreference, "event_key", read_only=True, filter=("in",)),
            derive(NotificationPreference, "channel", read_only=True, filter=("in",)),
            derive(NotificationPreference, "enabled"),
            derive(NotificationPreference, "locale", type="enum", widget="select", choices=LOCALES, read_only=True),
        ),
        list_fields=("event_key", "channel", "enabled"),
        ordering=("event_key",),
        default_page_size=50,
        writable=("enabled",),
        permissions={"list": SELF, "get": SELF, "update": SELF},
        hooks={"queryset": _preferences, "organization_of": lambda p: None},
    )
)
