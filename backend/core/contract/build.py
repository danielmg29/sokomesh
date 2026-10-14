"""Assemble the contract from the backend's single sources. Deterministic: no timestamps."""

import json

from django.conf import settings

from core.http import ERRORS
from core.policies import export_policies


def _camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(part.title() for part in rest)


def build_contract() -> dict:
    contract, auth, locales = settings.AC_CONTRACT, settings.AC_AUTH, settings.AC_LOCALES
    return {
        "meta": {
            "contractVersion": contract["version"],
            "apiBase": contract["api_base"],
            "generatedBy": "backend/core/contract",
        },
        "auth": {"mode": auth["mode"], "verification": list(auth["verification"]), "session": auth["session"]},
        "limits": {_camel(k): v for k, v in settings.AC_LIMITS.items()},
        "locales": {
            "default": locales["default"],
            "supported": [{"value": code, "label": label} for code, label in locales["supported"]],
        },
        "errors": {
            code.value: {"status": spec.status, "retryable": spec.retryable, "message": spec.message}
            for code, spec in ERRORS.items()
        },
        "policies": export_policies(),
        # Filled from core.operations.registry as models are registered (first: SM-F-01).
        "events": {},
        "models": {},
    }


def dump(contract: dict) -> str:
    return json.dumps(contract, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
