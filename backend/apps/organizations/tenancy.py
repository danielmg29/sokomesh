"""Who belongs where: active memberships, the organization a request acts for, and role resolution.

The request's active organization is kept in the session (`org`) and must be one the user is an
active member of; otherwise the first active membership is used. Marketplace administrators are
members of the marketplace_admin organization, and their role applies everywhere.
"""

from typing import Any

from django.db.models import QuerySet
from django.http import HttpRequest

from apps.organizations.models import Membership, Organization
from core.api import fail
from core.result import ErrorCode

SESSION_KEY = "org"


def active_memberships(user: Any) -> QuerySet[Membership]:
    return Membership.objects.filter(user=user, status=Membership.Status.ACTIVE).select_related("organization")


def is_admin(user: Any) -> bool:
    return (
        getattr(user, "is_authenticated", False)
        and active_memberships(user)
        .filter(role_key="marketplace_admin", organization__organization_type=Organization.Type.MARKETPLACE_ADMIN)
        .exists()
    )


def roles(user: Any, organization: Any | None) -> set[str]:
    """Roles the user holds in `organization`, or in any organization when None. Admin applies everywhere."""
    found = set()
    for m in active_memberships(user):
        if (
            m.role_key == "marketplace_admin"
            and m.organization.organization_type == Organization.Type.MARKETPLACE_ADMIN
        ):
            found.add("marketplace_admin")
        elif organization is None or m.organization_id == getattr(organization, "pk", organization):
            found.add(m.role_key)
    return found


def active_membership(request: HttpRequest) -> Membership:
    memberships = list(active_memberships(request.user))
    if not memberships:
        fail(ErrorCode.FORBIDDEN, "Your account is not part of an organization yet.")
    chosen = request.session.get(SESSION_KEY)
    return next((m for m in memberships if str(m.organization_id) == chosen), memberships[0])


def member_organizations(user: Any) -> QuerySet[Organization]:
    return Organization.objects.filter(memberships__user=user, memberships__status=Membership.Status.ACTIVE).distinct()
