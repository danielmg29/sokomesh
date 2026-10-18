"""Outgoing email: one entry point, Brevo in deployments, Mailpit on a laptop.

`send_email` renders a plain-text body and a matching branded HTML part and hands both to the
configured mailer. `BrevoBackend` sends through Brevo's transactional API when `BREVO_API_KEY`
is set (settings choose it); otherwise development uses SMTP into Mailpit and tests use the
in-memory backend. Messages are concise and plain by design (spec SM-F-21): no rich text.
"""

from __future__ import annotations

import html
import json
import logging
import urllib.error
import urllib.request
from collections.abc import Sequence
from typing import Any

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.core.mail.backends.base import BaseEmailBackend

log = logging.getLogger(__name__)

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


class BrevoBackend(BaseEmailBackend):
    """Django mailer for Brevo's transactional email API (POST /v3/smtp/email)."""

    def __init__(
        self, *, api_key: str, sender_email: str, sender_name: str = "SokoMesh", timeout: float = 10, **kwargs: Any
    ):
        super().__init__(**kwargs)
        self.api_key, self.sender_email, self.sender_name, self.timeout = api_key, sender_email, sender_name, timeout

    def payload(self, message: EmailMultiAlternatives) -> dict[str, Any]:
        body: dict[str, Any] = {
            "sender": {"email": self.sender_email, "name": self.sender_name},
            "to": [{"email": address} for address in message.to],
            "subject": message.subject,
            "textContent": message.body,
        }
        for alternative in getattr(message, "alternatives", []):
            if alternative.mimetype == "text/html":
                body["htmlContent"] = alternative.content
        if message.reply_to:
            body["replyTo"] = {"email": message.reply_to[0]}
        return body

    def send_messages(self, email_messages: Sequence[EmailMultiAlternatives]) -> int:  # pyright: ignore[reportIncompatibleMethodOverride]
        sent = 0
        for message in email_messages:
            request = urllib.request.Request(
                BREVO_URL,
                data=json.dumps(self.payload(message)).encode(),
                method="POST",
                headers={"api-key": self.api_key, "accept": "application/json", "content-type": "application/json"},
            )
            try:
                with urllib.request.urlopen(request, timeout=self.timeout) as response:
                    if 200 <= response.status < 300:
                        sent += 1
            except urllib.error.HTTPError as exc:
                # Brevo explains refusals (unverified sender, bad key) in the body; keep it out of the reader's view.
                log.error("Brevo refused a message: %s %s", exc.code, exc.read()[:300])
                raise
        return sent


def _html(title: str, lines: Sequence[str], action: tuple[str, str] | None, code: str | None, footer: str) -> str:
    esc = html.escape
    paragraphs = "".join(f'<p style="margin:0 0 14px">{esc(line)}</p>' for line in lines)
    code_block = (
        f'<p style="margin:8px 0 18px;font:700 30px/1.1 Menlo,Consolas,monospace;letter-spacing:6px">{esc(code)}</p>'
        if code
        else ""
    )
    button = (
        f'<p style="margin:18px 0"><a href="{esc(action[1])}" '
        'style="display:inline-block;background:#145C43;color:#fff;'
        f'padding:12px 18px;border-radius:2px;text-decoration:none;font-weight:600">{esc(action[0])}</a></p>'
        if action
        else ""
    )
    return (
        '<div style="background:#F3F2EE;padding:24px 12px;font:15px/1.55 Arial,sans-serif;color:#1d211f">'
        '<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #d9d6cd">'
        '<div style="background:#14261f;color:#fff;padding:14px 20px;font-weight:700;letter-spacing:.5px">'
        "SokoMesh</div>"
        f'<div style="padding:22px 20px"><h1 style="margin:0 0 14px;font-size:20px">{esc(title)}</h1>'
        f"{paragraphs}{code_block}{button}</div>"
        '<div style="border-top:1px solid #d9d6cd;padding:12px 20px;font-size:12px;color:#5b605c">'
        f"{esc(footer)}</div></div></div>"
    )


FOOTER = "Wholesale ordering for Kenyan retailers. Prices in KES, times in East Africa Time."


def send_email(
    to: str,
    subject: str,
    lines: Sequence[str],
    *,
    action: tuple[str, str] | None = None,
    code: str | None = None,
    footer: str = FOOTER,
) -> bool:
    """Send one message. Returns False (and logs) when delivery fails, so callers can record the outcome."""
    text = "\n\n".join([*lines, *([code] if code else []), *([f"{action[0]}: {action[1]}"] if action else [])])
    message = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [to])
    message.attach_alternative(_html(subject, lines, action, code, footer), "text/html")
    try:
        return message.send() == 1
    except Exception:  # transport failures must not break the request that triggered the email
        log.exception("Email to %s failed", to.split("@")[-1])
        return False
