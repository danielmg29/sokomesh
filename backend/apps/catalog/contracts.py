"""SM-F-03 category contracts: what a contract may declare, and what it derives.

A contract version holds a category's attribute schema, unit rules, buyer filters (facets), comparison
rows and display hints. This module is the one place those definitions are checked and turned into
everything else: the seller's generated fields, product and variant validation, the search document's
facet values, buyer filters, comparison rows and normalised prices. Nothing downstream reads a category
by name; every surface reads the contract.

Attribute definition (one entry of `attribute_schema`):
    {"key": "grain", "label": "Grain", "type": "enum" | "decimal" | "integer" | "string" | "boolean",
     "required": bool, "choices": [{"value", "label"}] (enum only), "unit": "kg" (numbers only),
     "min"/"max": numbers (numbers only), "variant": bool (set per variant; enum only), "help": str}
Unit rules: {"sale_units": [packaging unit keys], "normalise": {"attribute", "per", "factor"}}; a
normalised price is the variant price divided by units per pack x the attribute x factor.
Display recipe: {"card_keys": [at most two keys], "spec_keys": [keys, in reading order]}.
"""

import re
from decimal import Decimal
from typing import Any

PACKAGING_UNITS = (
    ("bale", "Bale"),
    ("sack", "Sack"),
    ("carton", "Carton"),
    ("case", "Case"),
    ("tray", "Tray"),
    ("crate", "Crate"),
    ("jerrycan", "Jerrycan"),
    ("pack", "Pack"),
    ("piece", "Piece"),
)
UNIT_LABELS = dict(PACKAGING_UNITS)
TYPES = ("enum", "decimal", "integer", "string", "boolean")
NUMERIC = ("decimal", "integer")
KEY = re.compile(r"[a-z][a-z0-9_]{0,39}")
VALUE = re.compile(r"[a-z0-9][a-z0-9_]{0,39}")
# Bounds: a contract is a form and a filter panel, so it stays readable.
MAX_ATTRIBUTES = 30
MAX_CHOICES = 40
MAX_CARD_KEYS = 2
FACET_PREFIX = "attr."


def _choice_values(attr: dict[str, Any]) -> list[str]:
    return [str(c.get("value")) for c in attr.get("choices") or [] if isinstance(c, dict)]


def definition_errors(schema: Any, units: Any, facets: Any, comparison: Any, display: Any) -> dict[str, list[str]]:
    """Everything wrong with a contract definition, keyed by the contract field it belongs to."""
    errors: dict[str, list[str]] = {}

    def add(field: str, message: str) -> None:
        errors.setdefault(field, []).append(message)

    if not isinstance(schema, list):
        return {"attribute_schema": ["Send the attributes as a list."]}
    if len(schema) > MAX_ATTRIBUTES:
        add("attribute_schema", f"Use at most {MAX_ATTRIBUTES} attributes.")
    keys: dict[str, dict[str, Any]] = {}
    for i, attr in enumerate(schema, 1):
        if not isinstance(attr, dict):
            add("attribute_schema", f"Attribute {i} is not an attribute definition.")
            continue
        key, kind = str(attr.get("key", "")), attr.get("type")
        name = f"Attribute {i}" + (f" ({key})" if key else "")
        if not KEY.fullmatch(key):
            add("attribute_schema", f"{name}: keys use lowercase letters, numbers and underscores.")
        elif key in keys:
            add("attribute_schema", f"{name}: another attribute already uses this key.")
        if not str(attr.get("label", "")).strip():
            add("attribute_schema", f"{name}: give it a label buyers and sellers will read.")
        if kind not in TYPES:
            add("attribute_schema", f"{name}: choose a type.")
            continue
        if kind == "enum":
            values = _choice_values(attr)
            if not values:
                add("attribute_schema", f"{name}: add at least one choice.")
            elif len(values) > MAX_CHOICES:
                add("attribute_schema", f"{name}: use at most {MAX_CHOICES} choices.")
            elif len(set(values)) != len(values) or not all(VALUE.fullmatch(v) for v in values):
                add("attribute_schema", f"{name}: choice values must be unique lowercase words.")
        elif attr.get("choices"):
            add("attribute_schema", f"{name}: only a choice attribute has choices.")
        if kind not in NUMERIC and (attr.get("unit") or "min" in attr or "max" in attr):
            add("attribute_schema", f"{name}: only numbers have a unit or limits.")
        if attr.get("variant") and kind != "enum":
            add("attribute_schema", f"{name}: variants differ by a choice, so make it a choice attribute.")
        keys[key] = attr

    def known(field: str, value: Any, label: str) -> list[str]:
        if not isinstance(value, list) or not all(isinstance(k, str) for k in value):
            add(field, f"Send {label} as a list of attribute keys.")
            return []
        for k in value:
            if k not in keys:
                add(field, f"{k} is not one of the attributes.")
        if len(set(value)) != len(value):
            add(field, f"Name each attribute once in {label}.")
        return [k for k in value if k in keys]

    for k in known("facet_keys", facets, "buyer filters"):
        if keys[k]["type"] == "string":
            add("facet_keys", f"{keys[k].get('label', k)} is free text; make it a choice to filter by it.")
    for k in known("comparison_keys", comparison, "compared attributes"):
        if keys[k].get("variant"):
            add("comparison_keys", f"{keys[k].get('label', k)} differs per variant; compare product attributes.")

    if not isinstance(display, dict):
        add("display_recipe", "Send the display recipe as an object.")
    else:
        card = known("display_recipe", display.get("card_keys", []), "card attributes")
        known("display_recipe", display.get("spec_keys", []), "specification rows")
        if len(card) > MAX_CARD_KEYS:
            add("display_recipe", f"Show at most {MAX_CARD_KEYS} attributes on a product card.")

    if not isinstance(units, dict):
        add("unit_rules", "Send the unit rules as an object.")
        return errors
    sale = units.get("sale_units")
    if not isinstance(sale, list) or not sale:
        add("unit_rules", "Choose at least one unit products are sold in.")
    elif any(u not in UNIT_LABELS for u in sale):
        add("unit_rules", "Sale units must come from the marketplace's unit list.")
    norm = units.get("normalise")
    if norm is not None:
        target = keys.get(str(norm.get("attribute"))) if isinstance(norm, dict) else None
        if not isinstance(norm, dict) or target is None:
            add("unit_rules", "Normalise by one of the attributes.")
        elif target["type"] not in NUMERIC or target.get("variant") or not target.get("required"):
            add("unit_rules", "Normalise by a required number attribute of the product, such as its pack size.")
        elif not str(norm.get("per", "")).strip():
            add("unit_rules", "Say which unit normalised prices are per, such as kg.")
        elif not isinstance(norm.get("factor"), int | float) or norm["factor"] <= 0:
            add("unit_rules", "The conversion factor must be a positive number.")
    return errors


def attributes_of(contract: Any, *, variant: bool | None = None) -> list[dict[str, Any]]:
    """The contract's attribute definitions: all of them, or only variant (True) or product (False) ones."""
    schema = [a for a in contract.attribute_schema or [] if isinstance(a, dict)]
    return schema if variant is None else [a for a in schema if bool(a.get("variant")) is variant]


def field_meta(attr: dict[str, Any], *, name: str | None = None, facet: bool = False) -> dict[str, Any]:
    """Contract field metadata for one attribute, in the same shape as a model field's (contract `fields`)."""
    kind = attr["type"]
    widget = {"enum": "select", "decimal": "decimal", "integer": "integer", "boolean": "boolean"}.get(kind, "text")
    out: dict[str, Any] = {
        "name": name or attr["key"],
        "type": "string" if kind == "string" else kind,
        "widget": widget,
    }
    out["label"] = attr.get("label") or attr["key"]
    if attr.get("help"):
        out["help"] = attr["help"]
    if attr.get("unit"):
        out["unit"] = attr["unit"]
    for bound in ("min", "max"):
        if bound in attr:
            out[bound] = attr[bound]
    if kind == "decimal":
        out["decimalPlaces"] = 2
    if kind == "enum":
        out["choices"] = [{"value": str(c["value"]), "label": str(c.get("label", c["value"]))} for c in attr["choices"]]
    if attr.get("required") and not facet:
        out["required"] = True
    if facet:
        out["filter"] = ["in"] if kind == "enum" else ["eq"] if kind == "boolean" else ["range"]
    return out


def facet_fields(contract: Any) -> list[dict[str, Any]]:
    """Buyer filters, named `attr.<key>` as the product list accepts them (`attr.grain__in=maize`)."""
    by_key = {a["key"]: a for a in attributes_of(contract)}
    return [
        field_meta(by_key[k], name=f"{FACET_PREFIX}{k}", facet=True) for k in contract.facet_keys or [] if k in by_key
    ]


def _number(value: Any) -> Decimal | None:
    if isinstance(value, bool) or not isinstance(value, int | float | str | Decimal):
        return None
    try:
        number = Decimal(str(value))
    except ArithmeticError:
        return None
    return number if number.is_finite() else None


def value_errors(contract: Any, values: Any, *, variant: bool, require: bool = True) -> dict[str, list[str]]:
    """Field-level problems with product (variant=False) or variant attribute values, keyed `attributes.<key>`.

    With `require=False` missing required values pass (a draft may be incomplete); wrong values never do.
    """
    if not isinstance(values, dict):
        return {"attributes": ["Send the attributes as an object."]}
    defs = {a["key"]: a for a in attributes_of(contract, variant=variant)}
    errors: dict[str, list[str]] = {}
    for key in values.keys() - defs.keys():
        errors[f"attributes.{key}"] = [f"{contract.name} has no attribute called {key}."]
    for key, attr in defs.items():
        value = values.get(key)
        label = attr.get("label") or key
        if value is None or value == "":
            if require and (attr.get("required") or variant):
                errors[f"attributes.{key}"] = [f"{label} is required for {contract.name}."]
            continue
        kind = attr["type"]
        problem = None
        if kind == "enum" and str(value) not in _choice_values(attr):
            problem = f"Choose one of the listed {label.lower()} options."
        elif kind == "boolean" and not isinstance(value, bool):
            problem = "Choose yes or no."
        elif kind == "string" and (not isinstance(value, str) or len(value) > 200):
            problem = "Use at most 200 characters."
        elif kind in NUMERIC:
            number = _number(value)
            if number is None or (kind == "integer" and number != number.to_integral_value()):
                problem = "Use a whole number." if kind == "integer" else "Use a number such as 2.5."
            elif "min" in attr and number < Decimal(str(attr["min"])):
                problem = f"Use at least {attr['min']}{(' ' + attr['unit']) if attr.get('unit') else ''}."
            elif "max" in attr and number > Decimal(str(attr["max"])):
                problem = f"Use at most {attr['max']}{(' ' + attr['unit']) if attr.get('unit') else ''}."
        if problem:
            errors[f"attributes.{key}"] = [problem]
    return errors


def clean_values(contract: Any, values: dict[str, Any], *, variant: bool) -> dict[str, Any]:
    """Valid values in their stored form: numbers as JSON numbers, choices as their value strings."""
    defs = {a["key"]: a for a in attributes_of(contract, variant=variant)}
    out: dict[str, Any] = {}
    for key, value in values.items():
        attr = defs.get(key)
        if attr is None or value is None or value == "":
            continue
        if attr["type"] == "integer":
            out[key] = int(Decimal(str(value)))
        elif attr["type"] == "decimal":
            out[key] = float(Decimal(str(value)))
        elif attr["type"] == "enum":
            out[key] = str(value)
        else:
            out[key] = value
    return out


def choice_label(attr: dict[str, Any], value: Any) -> str:
    return next(
        (str(c.get("label")) for c in attr.get("choices") or [] if str(c.get("value")) == str(value)), str(value)
    )


def display_value(attr: dict[str, Any], value: Any) -> str:
    """How an attribute value reads in a label or a search document ("2 kg", "Maize", "Yes")."""
    if attr["type"] == "enum":
        return choice_label(attr, value)
    if attr["type"] == "boolean":
        return "Yes" if value else "No"
    if attr["type"] in NUMERIC:
        number = _number(value)
        text = f"{number.normalize():f}" if number is not None else str(value)
        return f"{text} {attr['unit']}" if attr.get("unit") else text
    return str(value)


def content(contract: Any, product_attributes: dict[str, Any]) -> str | None:
    """What one retail unit holds, from the normalising attribute ("2 kg"), when the contract has one."""
    norm = (contract.unit_rules or {}).get("normalise")
    if not norm:
        return None
    attr = next((a for a in attributes_of(contract) if a["key"] == norm.get("attribute")), None)
    value = product_attributes.get(norm.get("attribute"))
    return display_value(attr, value) if attr and value is not None else None


def pack_label(contract: Any, product_attributes: dict[str, Any], variant: Any) -> str:
    """A variant's pack in words: "Bale of 12 × 2 kg", "Sack of 25 kg", "Carton of 25 × 800 g, green"."""
    unit = UNIT_LABELS.get(variant.packaging_unit, str(variant.packaging_unit).title())
    each = content(contract, product_attributes)
    count = Decimal(str(variant.units_per_pack)).normalize()
    if each:
        label = f"{unit} of {each}" if count == 1 else f"{unit} of {count:f} × {each}"
    else:
        label = unit if count == 1 else f"{unit} of {count:f}"
    defs = {a["key"]: a for a in attributes_of(contract, variant=True)}
    extras = [choice_label(defs[k], v).lower() for k, v in (variant.attributes or {}).items() if k in defs]
    return ", ".join([label, *extras])


def normalised_price(contract: Any, product_attributes: dict[str, Any], variant: Any) -> dict[str, str] | None:
    """The variant's price per the contract's normalised unit (KES per kg), or None when it cannot be worked out."""
    norm = (contract.unit_rules or {}).get("normalise")
    if not norm:
        return None
    measure = _number(product_attributes.get(norm["attribute"]))
    units = _number(variant.units_per_pack)
    if not measure or not units:
        return None
    quantity = units * measure * Decimal(str(norm["factor"]))
    if quantity <= 0:
        return None
    amount = (Decimal(variant.unit_price) / quantity).quantize(Decimal("0.01"))
    return {"amount": f"{amount:f}", "per": str(norm["per"])}


def facet_values(contract: Any, product_attributes: dict[str, Any], variants: list[Any]) -> dict[str, Any]:
    """Search facet values: numbers as single values (for ranges); choices and yes/no as lists, so a product
    whose variants differ (green and tan soap) matches a filter on any of them."""
    out: dict[str, Any] = {}
    for attr in attributes_of(contract):
        key = attr["key"]
        if attr.get("variant"):
            values = sorted({str(v.attributes[key]) for v in variants if key in (v.attributes or {})})
            if values:
                out[key] = values
            continue
        value = product_attributes.get(key)
        if value is None:
            continue
        out[key] = value if attr["type"] in NUMERIC else [value]
    return out
