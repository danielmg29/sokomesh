"""SM-F-06 price books: one explainable price for a buyer, a quantity and a moment.

A variant's own `unit_price` is its list price. Price rules refine it: a rule applies when it is on, its
period covers the moment, the quantity reaches its threshold and it targets everyone or one of the
buyer's groups with that seller. Among the rules that apply, the winner is decided by a fixed order:
higher priority, then a buyer-group rule over an everyone rule, then the higher quantity threshold, then
the later start, then the rule id. The client never chooses; it is told the price and why.
"""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Any

from django.utils import timezone

from apps.catalog import contracts
from apps.catalog.models import BuyerGroupMember, PriceRule, Variant


@dataclass(frozen=True, slots=True)
class PriceResolution:
    variant_id: str
    unit_price: Decimal
    rule_id: str | None  # None: the list price
    explanation: str
    resolved_at: datetime

    def as_dict(self) -> dict[str, Any]:
        return {
            "variant_id": self.variant_id,
            "unit_price": format(self.unit_price, "f"),
            "rule_id": self.rule_id,
            "explanation": self.explanation,
            "resolved_at": self.resolved_at.isoformat(),
        }


def groups_of(seller_id: Any, buyer: Any) -> set[str]:
    if buyer is None:
        return set()
    return set(BuyerGroupMember.objects.filter(seller_id=seller_id, buyer=buyer).values_list("group_key", flat=True))


def in_effect(rule: PriceRule, at: datetime) -> bool:
    return rule.is_active and rule.effective_from <= at and (rule.effective_until is None or rule.effective_until > at)


def _key(rule: PriceRule) -> tuple:
    return (rule.priority, 1 if rule.buyer_group_key else 0, rule.minimum_quantity, rule.effective_from, str(rule.pk))


def _rules(variant: Variant) -> list[PriceRule]:
    cached = getattr(variant, "_prefetched_objects_cache", {}).get("price_rules")
    return list(cached) if cached is not None else list(variant.price_rules.all())  # pyright: ignore[reportAttributeAccessIssue]


def group_label(key: str) -> str:
    return key.replace("_", " ").capitalize()


def day(value: datetime) -> str:
    local = timezone.localtime(value)
    return f"{local.day} {local:%b %Y}"


def explain(rule: PriceRule, variant: Variant) -> str:
    """A safe reason a buyer may read: "Key accounts price from 10 bales until 31 Oct 2026"."""
    unit = (contracts.UNIT_LABELS.get(variant.packaging_unit) or variant.packaging_unit).lower()
    if rule.buyer_group_key:
        head = f"{group_label(rule.buyer_group_key)} price"
    elif rule.label:
        head = rule.label
    else:
        head = "Quantity price" if rule.minimum_quantity > variant.minimum_order_quantity else "Price"
    parts = [head]
    if rule.minimum_quantity > variant.minimum_order_quantity:  # every order already reaches the minimum
        parts.append(f"from {rule.minimum_quantity} {unit}s")
    if rule.effective_until:
        parts.append(f"until {day(rule.effective_until)}")
    return " ".join(parts)


def resolve(
    variant: Variant, buyer: Any = None, quantity: int | None = None, at: datetime | None = None
) -> PriceResolution:
    """The price `buyer` pays for `quantity` packs of `variant` at `at` (now), and the reason."""
    at = at or timezone.now()
    quantity = quantity or variant.minimum_order_quantity
    groups = groups_of(variant.seller_id, buyer)  # pyright: ignore[reportAttributeAccessIssue]
    applicable = [
        r
        for r in _rules(variant)
        if in_effect(r, at)
        and r.minimum_quantity <= quantity
        and (not r.buyer_group_key or r.buyer_group_key in groups)
    ]
    if not applicable:
        return PriceResolution(str(variant.pk), variant.unit_price, None, "List price", at)
    rule = max(applicable, key=_key)
    return PriceResolution(str(variant.pk), rule.unit_price, str(rule.pk), explain(rule, variant), at)


def tiers(variant: Variant, buyer: Any = None, at: datetime | None = None) -> list[dict[str, Any]]:
    """The price at each quantity where it changes, from the minimum order up (for the tier table)."""
    at = at or timezone.now()
    thresholds = sorted(
        {variant.minimum_order_quantity}
        | {
            r.minimum_quantity
            for r in _rules(variant)
            if in_effect(r, at) and r.minimum_quantity > variant.minimum_order_quantity
        }
    )
    out: list[dict[str, Any]] = []
    for q in thresholds:
        price = resolve(variant, buyer, q, at)
        if out and out[-1]["unit_price"] == format(price.unit_price, "f"):
            continue
        out.append({"min_quantity": q, "unit_price": format(price.unit_price, "f"), "explanation": price.explanation})
    for i, tier in enumerate(out):
        tier["max_quantity"] = out[i + 1]["min_quantity"] - 1 if i + 1 < len(out) else None
    return out


def state_of(rule: PriceRule, siblings: list[PriceRule], at: datetime | None = None) -> tuple[str, str | None]:
    """How the editor shows a rule: active, future, expired, off, or in conflict (same buyers, threshold,
    priority and overlapping dates as another rule, so only the tie-break decides)."""
    at = at or timezone.now()
    if not rule.is_active:
        return "off", None
    if rule.effective_until and rule.effective_until <= at:
        return "expired", None
    for other in siblings:
        if other.pk == rule.pk or not other.is_active:
            continue
        overlaps = (other.effective_until is None or other.effective_until > rule.effective_from) and (
            rule.effective_until is None or rule.effective_until > other.effective_from
        )
        if (
            overlaps
            and other.buyer_group_key == rule.buyer_group_key
            and other.minimum_quantity == rule.minimum_quantity
            and other.priority == rule.priority
        ):
            return (
                "conflict",
                f"Same buyers, quantity and priority as “{other.label or other.pk}”; give one a higher priority.",
            )
    return ("future" if rule.effective_from > at else "active"), None
