"""SM-F-23: tokens, webhook secrets, signatures and the outbox relay.

Tokens look like `smk_<prefix>_<secret>`: the prefix finds the row, the sha256 of the whole token is compared
in constant time, and the token itself is shown once. A webhook's signing secret is HMAC(server key, salt):
nothing readable is stored, and rotating the salt replaces it. The relay turns committed outbox events into
deliveries for subscribed endpoints, then posts them with a signature, retrying with backoff a bounded
number of times. It refuses addresses on private networks.
"""

import hashlib
import hmac
import ipaddress
import json
import secrets
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.integrations.models import SCOPES, TOPICS, ApiToken, WebhookDelivery, WebhookEndpoint
from core.api import invalid
from core.events.models import OutboxEvent

SCOPE_KEYS = {k for k, _ in SCOPES}
TOPIC_KEYS = {k for k, _ in TOPICS}
BACKOFF = (60, 300, 1800, 7200, 21600)  # seconds before attempts 2..6
MAX_ATTEMPTS = len(BACKOFF) + 1


def _digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def issue(token: ApiToken) -> str:
    """Fill a new token's prefix, hash and last four; returns the token, to show once."""
    token.prefix = secrets.token_hex(4)
    raw = f"smk_{token.prefix}_{secrets.token_urlsafe(32)}"
    token.token_hash, token.last4 = _digest(raw), raw[-4:]
    return raw


def authenticate(header: str | None) -> ApiToken | None:
    if not header or not header.startswith("Bearer smk_"):
        return None
    raw = header.removeprefix("Bearer ").strip()
    parts = raw.split("_", 2)
    if len(parts) != 3:
        return None
    token = ApiToken.objects.select_related("client", "organization").filter(prefix=parts[1]).first()
    if token is None or not hmac.compare_digest(token.token_hash, _digest(raw)):
        return None
    if token.status != ApiToken.Status.ACTIVE or token.client.status != "active":
        return None
    if token.expires_at and token.expires_at <= timezone.now():
        return None
    return token


def check_scopes(scopes: Any) -> list[str]:
    if not isinstance(scopes, list) or not scopes or any(s not in SCOPE_KEYS for s in scopes):
        invalid({"scopes": ["Choose what the token may do."]})
    return sorted(set(scopes))


def check_topics(topics: Any) -> list[str]:
    if not isinstance(topics, list) or not topics or any(t not in TOPIC_KEYS for t in topics):
        invalid({"events": ["Choose the events to send."]})
    return sorted(set(topics))


def public_address(url: str) -> bool:
    """https only, and never a loopback, private, link-local or reserved address (no server-side probing)."""
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname:
        return False
    if settings.AC_WEBHOOKS.get("allow_private"):
        return True
    try:
        infos = socket.getaddrinfo(parsed.hostname, parsed.port or 443, proto=socket.IPPROTO_TCP)
    except OSError:
        return True  # unresolvable now: refused at delivery time instead
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            return False
    return True


def endpoint_secret(endpoint: WebhookEndpoint) -> str:
    mac = hmac.new(
        settings.SECRET_KEY.encode(), f"webhook:{endpoint.pk}:{endpoint.secret_salt}".encode(), hashlib.sha256
    )
    return "whsec_" + mac.hexdigest()[:40]


def new_salt() -> str:
    return secrets.token_hex(16)


def signature(endpoint: WebhookEndpoint, body: bytes, at: int) -> str:
    mac = hmac.new(endpoint_secret(endpoint).encode(), f"{at}.".encode() + body, hashlib.sha256).hexdigest()
    return f"t={at},v1={mac}"


# --- the relay -------------------------------------------------------------------------------------------

Sender = Callable[[str, bytes, dict[str, str]], int]


def http_send(url: str, body: bytes, headers: dict[str, str]) -> int:
    if not public_address(url):
        raise ValueError("The address is not on the public internet.")
    request = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=settings.AC_WEBHOOKS["timeout_seconds"]) as response:
            return response.status
    except urllib.error.HTTPError as exc:
        return exc.code


def fan_out(batch: int = 100) -> int:
    """Committed outbox events become one delivery per subscribed, active endpoint of their organization."""
    made = 0
    with transaction.atomic():
        events = list(
            OutboxEvent.objects.select_for_update(skip_locked=True)
            .filter(status=OutboxEvent.Status.PENDING)
            .order_by("available_at")[:batch]
        )
        for event in events:
            endpoints = WebhookEndpoint.objects.filter(organization_id=event.organization_id, is_active=True)
            for endpoint in endpoints:
                if event.topic in (endpoint.events or []):
                    _, created = WebhookDelivery.objects.get_or_create(
                        endpoint=endpoint,
                        event=event,
                        defaults={"topic": event.topic, "next_attempt_at": timezone.now()},
                    )
                    made += created
            event.status, event.published_at = OutboxEvent.Status.PUBLISHED, timezone.now()
            event.save()
    return made


def deliver_due(batch: int = 50, send: Sender = http_send) -> int:
    """Post deliveries that are due; each attempt's outcome is kept, with backoff and a final failure."""
    done = 0
    with transaction.atomic():
        due = list(
            WebhookDelivery.objects.select_for_update(skip_locked=True)
            .select_related("endpoint", "event")
            .filter(
                status__in=[WebhookDelivery.Status.QUEUED, WebhookDelivery.Status.RETRYING],
                next_attempt_at__lte=timezone.now(),
            )
            .order_by("next_attempt_at")[:batch]
        )
        for d in due:
            attempt(d, send)
            done += 1
    return done


def attempt(d: WebhookDelivery, send: Sender) -> None:
    body = json.dumps(
        {"id": str(d.event_id), "type": d.topic, "created": d.event.created_at.isoformat(), "data": d.event.payload},  # pyright: ignore[reportAttributeAccessIssue]
        separators=(",", ":"),
    ).encode()  # pyright: ignore[reportAttributeAccessIssue]
    at = int(time.time())
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "SokoMesh-Webhooks/1",
        "X-SokoMesh-Event": d.topic,
        "X-SokoMesh-Delivery": str(d.pk),
        "X-SokoMesh-Signature": signature(d.endpoint, body, at),
    }
    started = time.monotonic()
    d.attempts += 1
    try:
        code = send(d.endpoint.url, body, headers)
        d.response_status, d.last_error = code, "" if 200 <= code < 300 else f"Answered {code}"
        ok = 200 <= code < 300
    except Exception as exc:  # timeouts, refused connections, private addresses
        d.response_status, d.last_error, ok = None, str(exc)[:200], False
    d.duration_ms = int((time.monotonic() - started) * 1000)
    if ok:
        d.status, d.delivered_at = WebhookDelivery.Status.DELIVERED, timezone.now()
    elif d.attempts >= MAX_ATTEMPTS:
        d.status = WebhookDelivery.Status.FAILED
    else:
        d.status, d.next_attempt_at = (
            WebhookDelivery.Status.RETRYING,
            timezone.now() + timedelta(seconds=BACKOFF[d.attempts - 1]),
        )
    d.save()
