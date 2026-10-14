"""Policy registry: permissions are data, evaluated on the server, exported to the contract.

Roles come from the SokoMesh actor list (docs/project-context.md). Permission sets stay
empty until the slice that introduces each model adds its "<model>.<operation>" names —
a role never gains a permission that no route enforces.
"""

from collections.abc import Callable

ROLE_PERMISSIONS: dict[str, set[str]] = {
    "marketplace_admin": set(),
    "seller_manager": set(),
    "warehouse_operator": set(),
    "buyer_owner": set(),
    "buyer_purchaser": set(),
}

OBJECT_RULES: dict[str, Callable[[object, object], bool]] = {}


def object_rule(permission: str):
    def deco(fn):
        OBJECT_RULES[permission] = fn
        return fn

    return deco


def role_has(role: str, permission: str) -> bool:
    perms = ROLE_PERMISSIONS.get(role, set())
    prefix = permission.split(".")[0] + ".*"
    return "*" in perms or permission in perms or prefix in perms


def export_policies() -> dict:
    return {"roles": {role: sorted(perms) for role, perms in ROLE_PERMISSIONS.items()}}
