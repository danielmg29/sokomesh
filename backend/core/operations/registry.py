"""The operation registry: each model is declared once and becomes contract metadata plus routes.

A `Resource` names a Django model, the fields clients see (derived from the model with presentation
overrides), its list behaviour, permissions and commands. `export_models()` writes the contract's
`models` block from these declarations; `urls()` mounts the generic list, detail, create, update and
command endpoints. Apps add tenancy (`queryset`), serialisation tweaks and command handlers; they
never write a bespoke list or detail view.
"""

from __future__ import annotations

import datetime as dt
import re
import uuid
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field, replace
from decimal import Decimal, InvalidOperation
from typing import Any, cast

from django.core.exceptions import ObjectDoesNotExist
from django.db import models, transaction
from django.http import HttpRequest
from django.urls import URLPattern, path
from django.utils.text import capfirst

from core.api import Created, body, endpoint, fail, invalid
from core.operations.listing import ListSpec, parse_list_query, run_list
from core.policies import allowed
from core.result import Err, ErrorCode
from core.richtext import sanitize

SELF = "self"

# --- field metadata ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class Field:
    name: str
    type: str
    widget: str
    label: str | None = None
    required: bool = False
    read_only: bool = False
    help: str | None = None
    max_length: int | None = None
    choices: tuple[Mapping[str, str], ...] | None = None
    filter: tuple[str, ...] = ()
    relation: Mapping[str, str] | None = None
    role: str | None = None
    weight: int | None = None
    group: str | None = None
    currency: str | None = None
    decimal_places: int | None = None
    max_digits: int | None = None
    accept: tuple[str, ...] | None = None
    max_bytes: int | None = None
    field_policy: Mapping[str, str] | None = None
    max_items: int | None = None  # list values (multiselect, image galleries): the most entries allowed
    # A command's input only (a reason, a carrier reference): described for forms, never part of a record.
    input_only: bool = False

    def meta(self) -> dict[str, Any]:
        out: dict[str, Any] = {"name": self.name, "type": self.type, "widget": self.widget}
        optional = {
            "label": self.label,
            "help": self.help,
            "maxLength": self.max_length,
            "choices": [dict(c) for c in self.choices] if self.choices else None,
            "filter": list(self.filter) if self.filter else None,
            "relation": dict(self.relation) if self.relation else None,
            "role": self.role,
            "weight": self.weight,
            "group": self.group,
            "currency": self.currency,
            "decimalPlaces": self.decimal_places,
            "maxDigits": self.max_digits,
            "accept": list(self.accept) if self.accept else None,
            "maxBytes": self.max_bytes,
            "fieldPolicy": dict(self.field_policy) if self.field_policy else None,
            "maxItems": self.max_items,
        }
        out.update({k: v for k, v in optional.items() if v is not None})
        if self.required:
            out["required"] = True
        if self.read_only:
            out["readOnly"] = True
        if self.input_only:
            out["inputOnly"] = True
        return out


def derive(model: type[models.Model], name: str, **overrides: Any) -> Field:
    """A Field from the model's own definition (type, label, help, length, choices, requiredness)."""
    f = cast(models.Field, model._meta.get_field(name))
    kind, widget = "string", "text"
    extra: dict[str, Any] = {}
    if isinstance(f, models.UUIDField):
        kind, widget = "uuid", "hidden"
    elif isinstance(f, models.EmailField):
        kind, widget = "email", "email"
    elif isinstance(f, models.TextField):
        kind, widget = "text", "textarea"
    elif isinstance(f, models.BooleanField):
        kind, widget = "boolean", "boolean"
    elif isinstance(f, models.IntegerField):
        kind, widget = "integer", "integer"
    elif isinstance(f, models.DecimalField):
        kind, widget = "decimal", "decimal"
        extra = {"max_digits": f.max_digits, "decimal_places": f.decimal_places}
    elif isinstance(f, models.DateTimeField):
        kind, widget = "datetime", "datetime"
    elif isinstance(f, models.DateField):
        kind, widget = "date", "date"
    elif isinstance(f, models.ForeignKey | models.OneToOneField):
        kind, widget = "relation", "relation"
    elif isinstance(f, models.FileField):
        kind, widget = "file", "file"
    elif isinstance(f, models.JSONField):
        kind, widget = "json", "json"
    choices = getattr(f, "choices", None)
    if choices:
        kind, widget = "enum", overrides.pop("widget", "select")
        tones: Mapping[str, str] = overrides.pop("tones", {})
        extra["choices"] = tuple(
            {"value": str(v), "label": str(lbl), **({"tone": tones[str(v)]} if str(v) in tones else {})}
            for v, lbl in choices
        )
    max_length = getattr(f, "max_length", None) if kind in ("string", "email") else None
    blank, has_default = getattr(f, "blank", False), f.has_default() if hasattr(f, "has_default") else False
    required = not (blank or getattr(f, "null", False) or has_default) and not getattr(f, "auto_now", False)
    base = Field(
        name=name,
        type=kind,
        widget=widget,
        label=capfirst(str(getattr(f, "verbose_name", name))),
        required=required,
        help=str(f.help_text) if getattr(f, "help_text", "") else None,
        max_length=max_length,
        **extra,
    )
    return replace(base, **overrides)


# --- actions and resources --------------------------------------------------------------------

Handler = Callable[[HttpRequest, Any, dict[str, Any]], Any]


@dataclass(frozen=True, slots=True)
class Action:
    name: str
    label: str
    policy: str
    handler: Handler
    kind: str = "command"
    input: tuple[str, ...] = ()
    confirm: bool = False
    tone: str | None = None
    icon: str | None = None
    when: Mapping[str, Sequence[str]] | None = None

    def meta(self) -> dict[str, Any]:
        out: dict[str, Any] = {"name": self.name, "label": self.label, "kind": self.kind, "policy": self.policy}
        if self.input:
            out["input"] = list(self.input)
        if self.confirm:
            out["confirm"] = True
        if self.tone:
            out["tone"] = self.tone
        if self.icon:
            out["icon"] = self.icon
        if self.when:
            out["when"] = {k: list(v) for k, v in self.when.items()}
        return out


@dataclass
class Resource:
    """One model's declaration.

    Hooks: queryset, organization_of (one organization, or several), serialize_extra, create, after_create,
    update, can; and for lists, list_spec
    (widen one request's filters from the resource's own data) and list_extra (add to the response).
    """

    key: str
    path: str
    model: type[models.Model]
    label: str
    label_plural: str
    fields: tuple[Field, ...]
    list_fields: tuple[str, ...]
    display_field: str
    permissions: Mapping[str, str]  # operation (list, get, create, update) -> policy name
    search: tuple[str, ...] = ()
    ordering: tuple[str, ...] = ()
    default_page_size: int = 25
    writable: tuple[str, ...] = ()
    actions: tuple[Action, ...] = ()
    tenant_scoped: bool = True
    versioned: bool = False
    public: bool = False  # list and get without signing in (published storefront data)
    by: str = "pk"  # lookup for detail routes: pk or a unique slug field
    # False for a model whose reads and writes are served by its own views (the signed-in account):
    # it is described in the contract and validates writes, but the registry generates no routes.
    routed: bool = True
    hooks: Mapping[str, Callable[..., Any]] = field(default_factory=dict)
    # Public field name -> database path for fields read through a relation (search, filter, order).
    search_paths: Mapping[str, str] = field(default_factory=dict)

    # --- contract -----------------------------------------------------------------------------

    def meta(self) -> dict[str, Any]:
        return {
            "label": self.label,
            "labelPlural": self.label_plural,
            "path": self.path,
            "lookup": self.by,
            "public": self.public,
            "primaryKey": "id",
            "displayField": self.display_field,
            "tenantScoped": self.tenant_scoped,
            "versioned": self.versioned,
            "ordering": list(self.ordering),
            "search": list(self.search),
            "list": {"fields": list(self.list_fields), "defaultPageSize": self.default_page_size, "maxPageSize": 100},
            "fields": [f.meta() for f in self.fields],
            "actions": [a.meta() for a in self.actions],
        }

    def list_spec(self) -> ListSpec:
        return ListSpec.from_meta(self.meta(), self.search_paths)

    # --- hooks with defaults ------------------------------------------------------------------

    def queryset(self, request: HttpRequest) -> models.QuerySet:
        hook = self.hooks.get("queryset")
        return hook(request) if hook else self.model._default_manager.all()

    def organization_of(self, obj: Any) -> Any:
        hook = self.hooks.get("organization_of")
        return hook(obj) if hook else getattr(obj, "organization", None)

    def organizations(self, obj: Any) -> tuple[Any, ...]:
        """The organizations a record belongs to: one, or several (an order is the buyer's and the seller's)."""
        org = self.organization_of(obj)
        return tuple(org) if isinstance(org, list | tuple) else (org,)

    def authorize(self, request: HttpRequest, permission: str, obj: Any = None) -> None:
        # "self": records that belong to the signed-in person; the queryset already holds only theirs.
        if permission == SELF:
            return
        orgs = self.organizations(obj) if obj is not None else (None,)
        if not any(allowed(request.user, permission, org) for org in orgs):
            fail(ErrorCode.FORBIDDEN)

    def permitted(self, request: HttpRequest, obj: Any) -> list[str]:
        orgs = self.organizations(obj)

        def may(policy: str) -> bool:
            return policy == SELF or any(allowed(request.user, policy, org) for org in orgs)

        names = [a.name for a in self.actions if may(a.policy) and self._when(a, obj)]
        if "update" in self.permissions and may(self.permissions["update"]):
            names.append("update")
        # A resource can withhold what a record's own rules always refuse (e.g. editing your own membership).
        narrow = self.hooks.get("can")
        return narrow(request, obj, names) if narrow else names

    @staticmethod
    def _when(action: Action, obj: Any) -> bool:
        return all(when_value(getattr(obj, k, "")) in v for k, v in (action.when or {}).items())

    def serialize(self, obj: Any, request: HttpRequest) -> dict[str, Any]:
        out: dict[str, Any] = {"id": str(obj.pk)}
        for f in self.fields:
            if f.name == "id" or f.input_only:
                continue
            out[f.name] = value_of(obj, f)
        if self.versioned:
            out["version"] = obj.version
        if request.user.is_authenticated:
            out["_can"] = self.permitted(request, obj)
        extra = self.hooks.get("serialize_extra")
        if extra:
            out.update(extra(obj, request))
        return out

    # --- views --------------------------------------------------------------------------------

    def collection_view(self, request: HttpRequest) -> Any:
        if request.method == "GET":
            if not self.public:
                self.authorize(request, self.permissions["list"])
            spec = self.list_spec()
            widen = self.hooks.get("list_spec")
            if widen:
                spec = widen(request, spec)
            result = parse_list_query(request.GET, spec)
            if isinstance(result, Err):
                fail(result.error.code, result.error.detail, result.error.fields)
            extra = self.hooks.get("list_extra")
            return run_list(
                self.queryset(request),
                result.value,
                spec,
                lambda o: self.serialize(o, request),
                (lambda qs, query, s: extra(request, qs, query, s)) if extra else None,
            )
        if "create" not in self.permissions:
            fail(ErrorCode.FORBIDDEN)
        self.authorize(request, self.permissions["create"])
        data = clean_input(self, body(request))
        creator = self.hooks.get("create")
        with transaction.atomic():
            obj = creator(request, data) if creator else self.model(**data)
            obj.full_clean()
            obj.save()
            after = self.hooks.get("after_create")  # work that needs the saved record (child rows, notices)
            if after:
                after(obj, request)
        return Created(self.serialize(obj, request))

    def item_view(self, request: HttpRequest, ref: str) -> Any:
        obj = self.find(request, ref)
        if request.method == "GET":
            if not self.public:
                self.authorize(request, self.permissions["get"], obj)
            return self.serialize(obj, request)
        if "update" not in self.permissions:
            fail(ErrorCode.FORBIDDEN)
        self.authorize(request, self.permissions["update"], obj)
        data = body(request)
        expected = data.pop("version", None)
        if self.versioned and expected is not None and int(expected) != obj.version:
            fail(ErrorCode.CONFLICT)
        changes = clean_input(self, data)
        updater = self.hooks.get("update")
        with transaction.atomic():
            if updater:
                updater(request, obj, changes)
            else:
                for k, v in changes.items():
                    setattr(obj, k, v)
            if self.versioned:
                obj.version += 1
            obj.full_clean()
            obj.save()
        return self.serialize(obj, request)

    def action_view(self, request: HttpRequest, ref: str, name: str) -> Any:
        action = next((a for a in self.actions if a.name == name), None)
        if action is None:
            fail(ErrorCode.NOT_FOUND)
        obj = self.find(request, ref)
        self.authorize(request, action.policy, obj)
        if not self._when(action, obj):
            fail(ErrorCode.CONFLICT, "This record is not in a state that allows that.")
        with transaction.atomic():
            result = action.handler(request, obj, body(request))
        return result if result is not None else self.serialize(obj, request)

    def find(self, request: HttpRequest, ref: str) -> Any:
        try:
            if self.by == "pk":
                uuid.UUID(ref)
            return self.queryset(request).get(**{self.by: ref})
        except (ValueError, ObjectDoesNotExist):
            fail(ErrorCode.NOT_FOUND)


def when_value(value: Any) -> str:
    """A field value as `Action.when` lists it; booleans are `true`/`false`, as clients write them."""
    return ("true" if value else "false") if isinstance(value, bool) else str(value)


def value_of(obj: Any, f: Field) -> Any:
    if f.type == "relation":
        related = getattr(obj, f.name, None)
        return {"id": str(related.pk), "label": str(related)} if related is not None else None
    raw = getattr(obj, f.name, None)
    if f.type == "richtext" or f.widget == "richtext":
        return {"html": raw or "", "text": getattr(obj, f"{f.name}_text", "") or ""}
    if raw is None:
        return None
    if isinstance(raw, Decimal):
        return format(raw, "f")
    if isinstance(raw, dt.datetime | dt.date):
        return raw.isoformat()
    if isinstance(raw, uuid.UUID):
        return str(raw)
    return raw


def action_input(
    resource: Resource, action: Action, data: Mapping[str, Any], required: tuple[str, ...] = ()
) -> dict[str, Any]:
    """A command's input, type-checked against the fields it names (`action.input`); others are refused."""
    by_name = {f.name: f for f in resource.fields}
    errors: dict[str, list[str]] = {}
    out: dict[str, Any] = {}
    for key, value in data.items():
        f = by_name.get(key)
        if f is None or key not in action.input:
            errors[key] = ["This command does not take that."]
            continue
        try:
            out.update(coerce(f, value))
        except ValueError as exc:
            errors[key] = [str(exc)]
    for key in required:
        if out.get(key) in (None, ""):
            errors.setdefault(key, ["This is required."])
    if errors:
        invalid(errors)
    return out


def clean_input(resource: Resource, data: Mapping[str, Any]) -> dict[str, Any]:
    """Type-check and coerce a write against the resource's declared writable fields."""
    by_name = {f.name: f for f in resource.fields}
    errors: dict[str, list[str]] = {}
    out: dict[str, Any] = {}
    for key, value in data.items():
        f = by_name.get(key)
        if f is None or key not in resource.writable:
            errors[key] = ["This field cannot be changed here."]
            continue
        try:
            out.update(coerce(f, value))
        except ValueError as exc:
            errors[key] = [str(exc)]
    if errors:
        invalid(errors)
    return out


KENYAN_MOBILE = re.compile(r"[17]\d{8}")


def kenyan_mobile(value: str) -> str:
    """A Kenyan mobile number (Safaricom, Airtel, Telkom: 07xx or 01xx) as +254 and nine digits.

    SellaPay sends M-Pesa prompts to these numbers; the web client mirrors this rule for feedback.
    """
    digits = re.sub(r"\D", "", value)
    local = digits[3:] if digits.startswith("254") else digits.removeprefix("0")
    if not KENYAN_MOBILE.fullmatch(local):
        raise ValueError("Enter a Kenyan mobile number starting 07 or 01.")
    return f"+254{local}"


def coerce(f: Field, value: Any) -> dict[str, Any]:
    if value is None or value == "":
        if f.required:
            raise ValueError("This field is required.")
        return {f.name: None if f.type in ("relation", "datetime", "date", "decimal", "integer") else ""}
    match f.type:
        case "string" | "text" | "email":
            if not isinstance(value, str):
                raise ValueError("Send text.")
            value = value.strip()
            if f.max_length and len(value) > f.max_length:
                raise ValueError(f"Use at most {f.max_length} characters.")
            if f.widget == "phone":
                value = kenyan_mobile(value)
            return {f.name: value}
        case "richtext":
            html = value.get("html", "") if isinstance(value, dict) else value
            if not isinstance(html, str):
                raise ValueError("Send the document as HTML.")
            clean = sanitize(html)
            return {f.name: clean.html, f"{f.name}_text": clean.text}
        case "enum":
            allowed_values = {c["value"] for c in f.choices or ()}
            if str(value) not in allowed_values:
                raise ValueError("Not one of the allowed choices.")
            return {f.name: str(value)}
        case "boolean":
            if not isinstance(value, bool):
                raise ValueError("Use true or false.")
            return {f.name: value}
        case "integer":
            if not isinstance(value, int) or isinstance(value, bool):
                raise ValueError("Use a whole number.")
            return {f.name: value}
        case "decimal":
            try:
                return {f.name: Decimal(str(value))}
            except InvalidOperation:
                raise ValueError("Use a number.") from None
        case "date":
            return {f.name: dt.date.fromisoformat(str(value))}
        case "datetime":
            return {f.name: dt.datetime.fromisoformat(str(value))}
        case "location":
            if not isinstance(value, dict) or not all(isinstance(value.get(k), int | float) for k in ("lat", "lng")):
                raise ValueError("Send a point as latitude and longitude.")
            lat, lng = float(value["lat"]), float(value["lng"])
            if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                raise ValueError("That point is not on the map.")
            return {f.name: {"lat": lat, "lng": lng}}
        case _:
            return {f.name: value}


# --- the registry -----------------------------------------------------------------------------

REGISTRY: dict[str, Resource] = {}


def register(resource: Resource) -> Resource:
    if resource.key in REGISTRY:
        raise ValueError(f"{resource.key} is registered twice")
    REGISTRY[resource.key] = resource
    return resource


def export_models() -> dict[str, Any]:
    return {key: REGISTRY[key].meta() for key in sorted(REGISTRY)}


def urls() -> list[URLPattern]:
    out: list[URLPattern] = []
    for r in REGISTRY.values():
        if not r.routed:
            continue
        auth = not r.public
        out += [
            path(r.path, endpoint("GET", "POST", auth=auth)(r.collection_view), name=f"{r.key}-list"),
            path(f"{r.path}/<str:ref>", endpoint("GET", "PATCH", auth=auth)(r.item_view), name=f"{r.key}-detail"),
            path(f"{r.path}/<str:ref>/<str:name>", endpoint("POST")(r.action_view), name=f"{r.key}-action"),
        ]
    return out


__all__ = [
    "REGISTRY",
    "SELF",
    "Action",
    "Field",
    "Resource",
    "action_input",
    "derive",
    "export_models",
    "register",
    "urls",
]
