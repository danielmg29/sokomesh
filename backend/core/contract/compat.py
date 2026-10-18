"""Mechanical compatibility rules that make the contract version meaningful (manual 3.1).

| Change                                           | Classification |
| add optional field/model/action/error/choice     | additive       |
| add required field without a default            | breaking       |
| remove or rename anything                        | breaking       |
| narrow a constraint (max 200 -> 120)             | breaking       |
| widen a constraint (120 -> 200)                  | additive       |
| change label, help text, tone, widget or message | presentational |
"""

from dataclasses import dataclass
from enum import StrEnum

PRESENTATIONAL_KEYS = {"label", "labelPlural", "help", "tone", "widget", "icon", "message", "weight", "group"}
UPPER_BOUNDS = {
    "maxLength",
    "max",
    "maxDigits",
    "decimalPlaces",
    "maxPageSize",
    "maxRequestBytes",
    "maxUploadBytes",
    "maxBulk",
    "maxSearchLength",
    "maxSearchTerms",
    "maxListValues",
    "countCap",
}
LOWER_BOUNDS = {"min", "minLength"}
IDENTITY_KEYS = ("name", "value")  # list items are matched by these, not by position
VERSION_ONLY = {"contractVersion", "generatedBy"}


class Change(StrEnum):
    PRESENTATIONAL = "patch"
    ADDITIVE = "minor"
    BREAKING = "major"


RANK = {None: 0, Change.PRESENTATIONAL: 1, Change.ADDITIVE: 2, Change.BREAKING: 3}


@dataclass(frozen=True, slots=True)
class Diff:
    kind: Change
    path: str
    detail: str


def classify_changes(old: dict, new: dict) -> list[Diff]:
    out: list[Diff] = []
    _walk(_strip_version(old), _strip_version(new), "", out)
    return out


def required_bump(changes: list[Diff]) -> Change | None:
    return max((c.kind for c in changes), key=RANK.__getitem__, default=None)


def bump_made(old_version: str, new_version: str) -> Change | None:
    old, new = _semver(old_version), _semver(new_version)
    if new <= old:
        return None
    if new[0] > old[0]:
        return Change.BREAKING
    if new[1] > old[1]:
        return Change.ADDITIVE
    return Change.PRESENTATIONAL


def _semver(v: str) -> tuple[int, int, int]:
    major, minor, patch = (int(p) for p in v.split("."))
    return major, minor, patch


def _strip_version(contract: dict) -> dict:
    meta = {k: v for k, v in contract.get("meta", {}).items() if k not in VERSION_ONLY}
    return {**contract, "meta": meta}


def _walk(old, new, path: str, out: list[Diff]) -> None:
    if isinstance(old, dict) and isinstance(new, dict):
        for key in old.keys() - new.keys():
            out.append(_removed(f"{path}.{key}", key))
        for key in new.keys() - old.keys():
            out.append(_added(f"{path}.{key}", key, new[key]))
        for key in old.keys() & new.keys():
            _walk(old[key], new[key], f"{path}.{key}", out)
    elif isinstance(old, list) and isinstance(new, list):
        _walk_list(old, new, path, out)
    elif type(old) is not type(new):
        out.append(Diff(Change.BREAKING, path, f"type changed from {type(old).__name__} to {type(new).__name__}"))
    elif old != new:
        out.append(_scalar(path, old, new))


def _walk_list(old: list, new: list, path: str, out: list[Diff]) -> None:
    ident = next((k for k in IDENTITY_KEYS if all(isinstance(i, dict) and k in i for i in old + new)), None)
    if ident is None:  # plain values: compare as sets
        for item in [i for i in old if i not in new]:
            out.append(Diff(Change.BREAKING, path, f"removed {item!r}"))
        for item in [i for i in new if i not in old]:
            out.append(Diff(Change.ADDITIVE, path, f"added {item!r}"))
        return
    before, after = {i[ident]: i for i in old}, {i[ident]: i for i in new}
    for key in before.keys() - after.keys():
        out.append(Diff(Change.BREAKING, f"{path}[{key}]", "removed"))
    for key in after.keys() - before.keys():
        item = after[key]
        breaking = item.get("required") is True and "default" not in item
        out.append(
            Diff(
                Change.BREAKING if breaking else Change.ADDITIVE,
                f"{path}[{key}]",
                "added required without default" if breaking else "added",
            )
        )
    for key in before.keys() & after.keys():
        _walk(before[key], after[key], f"{path}[{key}]", out)


def _removed(path: str, key: str) -> Diff:
    if key in UPPER_BOUNDS | LOWER_BOUNDS:
        return Diff(Change.ADDITIVE, path, "constraint removed (widened)")
    if key in {"required", "readOnly"}:  # flags are written only when true: dropping one relaxes the field
        return Diff(Change.ADDITIVE, path, "flag removed (relaxed)")
    return Diff(Change.BREAKING, path, "removed")


def _added(path: str, key: str, value) -> Diff:
    if key in UPPER_BOUNDS | LOWER_BOUNDS or (key == "required" and value is True):
        return Diff(Change.BREAKING, path, f"constraint added: {value!r}")
    if key in PRESENTATIONAL_KEYS:
        return Diff(Change.PRESENTATIONAL, path, "added")
    return Diff(Change.ADDITIVE, path, "added")


def _scalar(path: str, old, new) -> Diff:
    key = path.rsplit(".", 1)[-1]
    detail = f"{old!r} -> {new!r}"
    if key in PRESENTATIONAL_KEYS:
        return Diff(Change.PRESENTATIONAL, path, detail)
    if key in UPPER_BOUNDS and isinstance(old, int | float):
        return Diff(Change.ADDITIVE if new > old else Change.BREAKING, path, detail)
    if key in LOWER_BOUNDS and isinstance(old, int | float):
        return Diff(Change.ADDITIVE if new < old else Change.BREAKING, path, detail)
    if key in {"required", "readOnly"}:
        return Diff(Change.BREAKING if new else Change.ADDITIVE, path, detail)
    return Diff(Change.BREAKING, path, detail)
