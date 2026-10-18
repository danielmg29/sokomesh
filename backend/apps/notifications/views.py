"""Collection-wide notification commands the registry's per-record actions don't cover."""

from django.conf import settings
from django.http import HttpRequest
from django.utils import timezone

from apps.notifications.models import Notification, NotificationPreference
from apps.notifications.services import ensure_preferences
from core.api import body, endpoint, invalid, text


@endpoint("GET")
def summary(request: HttpRequest):
    """For the header bell: the unread count and the five newest."""
    inbox = Notification.objects.filter(recipient=request.user, channel="in_app")
    latest = [
        {
            "id": str(n.pk),
            "event_key": n.event_key,
            "title": n.title,
            "body_text": n.body_text,
            "deep_link": n.deep_link,
            "status": n.status,
            "created_at": n.created_at.isoformat(),
        }
        for n in inbox[:5]
    ]
    return {"unread": inbox.exclude(status=Notification.Status.READ).count(), "latest": latest}


@endpoint("POST")
def read_all(request: HttpRequest):
    changed = (
        Notification.objects.filter(recipient=request.user, channel="in_app")
        .exclude(status=Notification.Status.READ)
        .update(status=Notification.Status.READ, read_at=timezone.now())
    )
    return {"read": changed}


@endpoint("POST")
def set_locale(request: HttpRequest):
    """The language notifications are written in (spec: NotificationPreference.locale), set on every row."""
    locale = text(body(request), "locale", max_length=10)
    if locale not in {code for code, _ in settings.AC_LOCALES["supported"]}:
        invalid({"locale": ["Choose one of the offered languages."]})
    ensure_preferences(request.user)
    NotificationPreference.objects.filter(user=request.user).update(locale=locale)
    return {"locale": locale}
