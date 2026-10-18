"""Policy registry: permissions are data, evaluated on the server, exported to the contract.

Roles come from the SokoMesh actor list (docs/project-context.md). Each slice adds the
"<model>.<operation>" names its routes enforce; a role never holds a permission no route checks.
Who holds which role in which organization is answered by the organizations app through
`set_role_resolver`, so this kernel module never imports a business app.
"""

from collections.abc import Callable

# SM-F-01 organizations, members, addresses; SM-F-02 seller onboarding; SM-F-04 a seller's catalogue;
# SM-F-10 carts and SM-F-20 reorder for buyers. Administration (organization.list/review,
# seller_profile.list/review, seller_document.verify, category_contract.* for SM-F-03) is admin-only.
_OWN_ORG = {"organization.get", "membership.list", "address.list"}
_MANAGE_ORG = _OWN_ORG | {
    "organization.update",
    "membership.invite",
    "membership.update",
    "address.create",
    "address.update",
    "address.delete",
}
_SELLER = {
    "seller_profile.get",
    "seller_profile.update",
    "seller_profile.submit",
    "seller_document.list",
    "seller_document.create",
    "seller_document.delete",
}
_CATALOG_READ = {"catalog_product.list", "catalog_product.get", "variant.list", "variant.get"}
_CATALOG = _CATALOG_READ | {
    "catalog_product.create",
    "catalog_product.update",
    "catalog_product.publish",
    "catalog_product.archive",
    "variant.create",
    "variant.update",
}
_BUY = {
    "cart.list",
    "cart.get",
    "cart.update",
    "cart_line.list",
    "cart_line.get",
    "cart_line.create",
    "cart_line.update",
    "cart_line.remove",
    "order.list",
    "order.get",
    "order.reorder",
}

ROLE_PERMISSIONS: dict[str, set[str]] = {
    "marketplace_admin": {"*"},
    "seller_manager": _MANAGE_ORG | _SELLER | _CATALOG,
    "warehouse_operator": _OWN_ORG | _CATALOG_READ | {"seller_profile.get", "seller_document.list"},
    "buyer_owner": _MANAGE_ORG | _BUY,
    "buyer_purchaser": _OWN_ORG | _BUY,
}

OBJECT_RULES: dict[str, Callable[[object, object], bool]] = {}

RoleResolver = Callable[[object, object | None], set[str]]
_resolver: RoleResolver | None = None


def set_role_resolver(fn: RoleResolver) -> None:
    global _resolver
    _resolver = fn


def object_rule(permission: str):
    def deco(fn):
        OBJECT_RULES[permission] = fn
        return fn

    return deco


def role_has(role: str, permission: str) -> bool:
    perms = ROLE_PERMISSIONS.get(role, set())
    prefix = permission.split(".")[0] + ".*"
    return "*" in perms or permission in perms or prefix in perms


def allowed(user: object, permission: str, organization: object | None = None) -> bool:
    """Whether the user's roles in `organization` (any of theirs when None) grant `permission`."""
    if not getattr(user, "is_authenticated", False) or _resolver is None:
        return False
    return any(role_has(role, permission) for role in _resolver(user, organization))


def export_policies() -> dict:
    return {"roles": {role: sorted(perms) for role, perms in ROLE_PERMISSIONS.items()}}
