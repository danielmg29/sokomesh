"""Raising a notification: preference-aware, deduplicated, delivered after the transaction commits."""

from typing import Any

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.notifications.messages import CHROME, render, supported
from apps.notifications.models import CHANNEL_CHOICES, EVENT_CHOICES, Notification, NotificationPreference
from core.mail import send_email

# What a new account receives until the person changes it: everything in the app, and email for
# the events that need action (approvals, account and team changes).
EMAIL_BY_DEFAULT = {"approval", "account", "order", "payment"}


def ensure_preferences(user: Any, locale: str | None = None) -> None:
    existing = set(NotificationPreference.objects.filter(user=user).values_list("event_key", "channel"))
    rows = [
        NotificationPreference(
            user=user,
            event_key=event,
            channel=channel,
            enabled=channel == "in_app" or event in EMAIL_BY_DEFAULT,
            locale=locale or settings.AC_LOCALES["default"],
        )
        for event, _ in EVENT_CHOICES
        for channel, _ in CHANNEL_CHOICES
        if (event, channel) not in existing
    ]
    NotificationPreference.objects.bulk_create(rows)


def locale_of(user: Any) -> str:
    """The language this person reads notifications in (one value, stored on each preference row)."""
    return supported(NotificationPreference.objects.filter(user=user).values_list("locale", flat=True).first())


def notify(
    user: Any, *, event_key: str, event_id: str, message: str, params: dict[str, Any], deep_link: str = ""
) -> list[Notification]:
    """One notification per enabled channel, worded in the person's language (apps.notifications.messages).

    A repeat of the same event for the same person is ignored.
    """
    ensure_preferences(user)
    title, body = render(message, locale_of(user), params)
    enabled = set(
        NotificationPreference.objects.filter(user=user, event_key=event_key, enabled=True).values_list(
            "channel", flat=True
        )
    )
    created: list[Notification] = []
    for channel in ("in_app", "email"):
        if channel not in enabled:
            continue
        try:
            with transaction.atomic():
                n = Notification.objects.create(
                    recipient=user,
                    event_id=event_id,
                    event_key=event_key,
                    dedupe_key=f"{user.pk}:{channel}:{event_id}"[:200],
                    channel=channel,
                    title=title[:160],
                    body_text=body,
                    deep_link=deep_link,
                    status=Notification.Status.SENT if channel == "in_app" else Notification.Status.QUEUED,
                    sent_at=timezone.now() if channel == "in_app" else None,
                )
        except IntegrityError:
            continue  # already delivered for this event: the dedupe key holds
        created.append(n)
        if channel == "email":
            transaction.on_commit(lambda n=n: deliver_email(n))
    return created


def deliver_email(n: Notification) -> None:
    chrome = CHROME[locale_of(n.recipient)]
    link = f"{settings.AC_SITE_URL}{n.deep_link}" if n.deep_link else None
    ok = send_email(
        n.recipient.email,
        n.title,
        [n.body_text],
        action=(chrome["open"], link) if link else None,
        footer=chrome["footer"],
    )
    n.status = Notification.Status.SENT if ok else Notification.Status.FAILED
    n.sent_at = timezone.now() if ok else None
    n.save(update_fields=["status", "sent_at"])
