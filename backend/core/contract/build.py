"""Assemble the contract from the backend's single sources. Deterministic: no timestamps."""

import json

from django.conf import settings

from core.http import ERRORS
from core.operations.registry import export_models
from core.policies import export_policies


def _camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(part.title() for part in rest)


def _password_policy() -> dict:
    """The password rules, read from the validators Django runs, so forms describe what the server checks."""
    min_length, rules = 0, []
    for v in settings.AUTH_PASSWORD_VALIDATORS:
        name = v["NAME"].rsplit(".", 1)[-1]
        if name == "MinimumLengthValidator":
            min_length = v.get("OPTIONS", {}).get("min_length", 8)
        elif name == "NumericPasswordValidator":
            rules.append("not only numbers")
        elif name == "CommonPasswordValidator":
            rules.append("not a common password")
        elif name == "UserAttributeSimilarityValidator":
            rules.append("not close to your name or email")
    parts = ([f"At least {min_length} characters"] if min_length else []) + rules
    text = ", ".join(parts[:-1]) + (" and " if len(parts) > 1 else "") + parts[-1] if parts else ""
    return {"minLength": min_length, "help": f"{text[:1].upper()}{text[1:]}." if text else ""}


def build_contract() -> dict:
    contract, auth, locales, rich = settings.AC_CONTRACT, settings.AC_AUTH, settings.AC_LOCALES, settings.AC_RICH_TEXT
    listing = settings.AC_LIST_QUERY
    return {
        "meta": {
            "contractVersion": contract["version"],
            "apiBase": contract["api_base"],
            "generatedBy": "backend/core/contract",
        },
        "auth": {
            "mode": auth["mode"],
            "verification": list(auth["verification"]),
            "session": auth["session"],
            "password": _password_policy(),
        },
        "limits": {_camel(k): v for k, v in settings.AC_LIMITS.items()},
        "listQuery": {_camel(k): v for k, v in listing.items()},
        "locales": {
            "default": locales["default"],
            "supported": [{"value": code, "label": label} for code, label in locales["supported"]],
        },
        "richText": {_camel(k): v for k, v in rich.items()},
        # What each upload endpoint accepts (checked again on the server, by the file's own bytes).
        "uploads": {
            _camel(kind): {"types": list(rule["types"]), "maxBytes": rule["max_bytes"]}
            for kind, rule in settings.AC_UPLOADS.items()
        },
        "errors": {
            code.value: {"status": spec.status, "retryable": spec.retryable, "message": spec.message}
            for code, spec in ERRORS.items()
        },
        "policies": export_policies(),
        "events": {},
        # Every resource registered with core.operations.registry.
        "models": export_models(),
    }


def dump(contract: dict) -> str:
    return json.dumps(contract, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
