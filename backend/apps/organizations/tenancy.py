"""Who belongs where: active memberships, the organization a request acts for, and role resolution.

The request's active organization is kept in the session (`org`) and must be one the user is an
active member of; otherwise the first active membership is used. Marketplace administrators are
members of the marketplace_admin organization, and their role applies everywhere.

Permission checks run many times per request (each record of a page lists the commands it allows), so a
user's memberships are read once per user object, which Django makes per request. Code that changes the
signed-in person's memberships within a request calls `forget(user)` afterwards.
"""

from typing import Any

from django.db.models import QuerySet
from django.http import HttpRequest

from apps.organizations.models import Membership, Organization
from core.api import fail
from core.result import ErrorCode

SESSION_KEY = "org"
_CACHE = "_ac_memberships"


def active_memberships(user: Any) -> QuerySet[Membership]:
    return Membership.objects.filter(user=user, status=Membership.Status.ACTIVE).select_related("organization")


def held(user: Any) -> list[Membership]:
    """The user's active memberships, read once per user object (so once per request)."""
    found = getattr(user, _CACHE, None)
    if found is None:
        found = list(active_memberships(user))
        setattr(user, _CACHE, found)
    return found


def forget(user: Any) -> None:
    """Drop the memberships read for this user object, after changing them within a request."""
    if hasattr(user, _CACHE):
        delattr(user, _CACHE)


def _admin(m: Membership) -> bool:
    return m.role_key == "marketplace_admin" and m.organization.organization_type == Organization.Type.MARKETPLACE_ADMIN


def is_admin(user: Any) -> bool:
    return bool(getattr(user, "is_authenticated", False)) and any(_admin(m) for m in held(user))


def roles(user: Any, organization: Any | None) -> set[str]:
    """Roles the user holds in `organization`, or in any organization when None. Admin applies everywhere."""
    found = set()
    for m in held(user):
        if _admin(m):
            found.add("marketplace_admin")
        elif organization is None or m.organization_id == getattr(organization, "pk", organization):
            found.add(m.role_key)
    return found


def active_membership(request: HttpRequest) -> Membership:
    memberships = held(request.user)
    if not memberships:
        fail(ErrorCode.FORBIDDEN, "Your account is not part of an organization yet.")
    chosen = request.session.get(SESSION_KEY)
    return next((m for m in memberships if str(m.organization_id) == chosen), memberships[0])


def member_organizations(user: Any) -> QuerySet[Organization]:
    return Organization.objects.filter(memberships__user=user, memberships__status=Membership.Status.ACTIVE).distinct()
