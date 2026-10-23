"""Payment providers behind one small interface: send an M-Pesa prompt, refund, sign and verify callbacks.

`sandbox` (the default outside production) simulates the buyer's phone: no money moves, and its results come
back as HMAC-signed callbacks through the same verify-and-apply path a provider's would. `sellapay` sends
real STK pushes (`POST /api/v1/requestStkPush` after `POST /api/v1/authorize`); SellaPay v1 documents no
callback or status endpoint, so its results cannot be confirmed automatically yet (docs/architecture/decisions.md).
"""

import hashlib
import hmac
import json
import secrets
import time
import urllib.request
from typing import Any, Protocol

from django.conf import settings
from django.core.cache import cache


class ProviderError(Exception):
    """The provider refused or could not be reached; the message is safe to show the buyer."""


class Provider(Protocol):
    name: str
    confirms: bool  # whether results arrive by callback

    def send_prompt(self, *, phone: str, amount: Any, reference: str, description: str) -> str: ...
    def refund(self, *, intent: Any, amount: Any) -> bool: ...


def local_msisdn(phone: str) -> str | None:
    """A Kenyan mobile number as SellaPay wants it (local, no leading 0 or 254): 712345678."""
    digits = "".join(c for c in phone if c.isdigit())
    if digits.startswith("254"):
        digits = digits[3:]
    elif digits.startswith("0"):
        digits = digits[1:]
    return digits if len(digits) == 9 and digits[0] in "17" else None


def mask(phone: str) -> str:
    local = local_msisdn(phone) or ""
    return f"0{local[:3]} *** {local[-3:]}" if local else ""


def secret() -> bytes:
    configured = settings.AC_PAYMENTS.get("sandbox_secret")
    if configured:
        return configured.encode()
    return hmac.new(settings.SECRET_KEY.encode(), b"sokomesh.payments.sandbox", hashlib.sha256).digest()


def sign(body: bytes, at: int | None = None) -> str:
    """`t=<unix seconds>,v1=<hex HMAC-SHA256 of "t.body">`: the timestamp stops old callbacks being replayed."""
    at = at or int(time.time())
    mac = hmac.new(secret(), f"{at}.".encode() + body, hashlib.sha256).hexdigest()
    return f"t={at},v1={mac}"


def verify(body: bytes, header: str | None, now: int | None = None) -> bool:
    try:
        parts = dict(p.split("=", 1) for p in (header or "").split(","))
        at = int(parts["t"])
    except (ValueError, KeyError):
        return False
    if abs((now or int(time.time())) - at) > settings.AC_PAYMENTS["signature_tolerance_seconds"]:
        return False
    expected = hmac.new(secret(), f"{at}.".encode() + body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, parts.get("v1", ""))


class Sandbox:
    name = "sandbox"
    confirms = True

    def send_prompt(self, *, phone: str, amount: Any, reference: str, description: str) -> str:
        if local_msisdn(phone) is None:
            raise ProviderError("Enter a Kenyan mobile number starting 07 or 01.")
        return f"SBX-{secrets.token_hex(8).upper()}"

    def refund(self, *, intent: Any, amount: Any) -> bool:
        return True  # the sandbox returns the money at once


class SellaPay:
    name = "sellapay"
    confirms = False

    def _token(self) -> str:
        cached = cache.get("sellapay:token")
        if cached:
            return cached
        conf = settings.AC_PAYMENTS
        answer = self._post(
            "authorize", {}, headers={"X-API-KEY": conf["sellapay_key"], "X-API-SECRET": conf["sellapay_secret"]}
        )
        token = answer.get("access_token")
        if not token:
            raise ProviderError("SellaPay did not accept our credentials. Try again later.")
        cache.set("sellapay:token", token, int(answer.get("expires_in") or 3600) - 60)
        return token

    def _post(self, path: str, data: dict[str, Any], headers: dict[str, str]) -> dict[str, Any]:
        request = urllib.request.Request(
            f"{settings.AC_PAYMENTS['sellapay_base']}/{path}",
            data=json.dumps(data).encode(),
            headers={"Content-Type": "application/json", "Accept": "application/json", **headers},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                return json.loads(response.read() or b"{}")
        except Exception as exc:  # network, HTTP or JSON errors: the buyer may try again
            raise ProviderError("SellaPay could not send the prompt. Try again in a moment.") from exc

    def send_prompt(self, *, phone: str, amount: Any, reference: str, description: str) -> str:
        local = local_msisdn(phone)
        if local is None:
            raise ProviderError("Enter a Kenyan mobile number starting 07 or 01.")
        answer = self._post(
            "requestStkPush",
            {"phone": local, "amount": str(amount), "reference": reference[:20], "description": description[:60]},
            headers={"Authorization": f"Bearer {self._token()}"},
        )
        if not answer.get("transaction_id"):
            raise ProviderError(str(answer.get("message") or "SellaPay refused the prompt."))
        return str(answer["transaction_id"])

    def refund(self, *, intent: Any, amount: Any) -> bool:
        return False  # refunds through sendFundsToMobile are handled by finance until automated


PROVIDERS = {"sandbox": Sandbox, "sellapay": SellaPay}


def current() -> Provider:
    return PROVIDERS[settings.AC_PAYMENTS["provider"]]()


def named(name: str) -> Provider:
    return PROVIDERS[name]()
