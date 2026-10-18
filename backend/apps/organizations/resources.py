"""SM-F-01 resources: organizations, memberships and addresses, declared once for contract and routes."""

from typing import Any

from django.db.models import QuerySet
from django.http import HttpRequest

from apps.accounts.models import User
from apps.organizations.models import OWNER_ROLE, ROLES_FOR, Address, Membership, Organization
from apps.organizations.tenancy import active_membership, is_admin, member_organizations
from core.api import fail, invalid
from core.operations.registry import Action, Field, Resource, derive, register
from core.policies import allowed
from core.result import ErrorCode

APPROVAL_TONES = {"pending": "info", "approved": "success", "rejected": "danger", "suspended": "warning"}
STATUS_TONES = {"active": "success", "suspended": "warning", "archived": "neutral"}
MEMBER_TONES = {"invited": "info", "active": "success", "suspended": "warning", "removed": "neutral"}
CURRENCIES = ({"value": "KES", "label": "Kenyan shilling (KES)"},)
TIMEZONES = tuple(
    {"value": z, "label": label}
    for z, label in (
        ("Africa/Nairobi", "East Africa Time, Nairobi"),
        ("Africa/Kampala", "East Africa Time, Kampala"),
        ("Africa/Dar_es_Salaam", "East Africa Time, Dar es Salaam"),
        ("Africa/Kigali", "Central Africa Time, Kigali"),
    )
)
COUNTRIES = (
    {"value": "KE", "label": "Kenya"},
    {"value": "UG", "label": "Uganda"},
    {"value": "TZ", "label": "Tanzania"},
    {"value": "RW", "label": "Rwanda"},
)


def _notify_owners(org: Organization, *, event_id: str, message: str, link: str) -> None:
    from apps.notifications.services import notify

    for m in Membership.objects.filter(
        organization=org, status=Membership.Status.ACTIVE, role_key=OWNER_ROLE[org.organization_type]
    ).select_related("user"):
        notify(
            m.user,
            event_key="approval",
            event_id=event_id,
            message=message,
            params={"organization": org.name},
            deep_link=link,
        )


# --- organizations ----------------------------------------------------------------------------


def _org_queryset(request: HttpRequest) -> QuerySet[Organization]:
    return Organization.objects.all() if is_admin(request.user) else member_organizations(request.user)


def _org_extra(org: Organization, request: HttpRequest) -> dict[str, Any]:
    out: dict[str, Any] = {"member_count": org.memberships.filter(status=Membership.Status.ACTIVE).count()}  # pyright: ignore[reportAttributeAccessIssue]
    # The tax identifier is restricted (spec: encrypt or restrict): managers see it, members see a mask.
    if org.tax_identifier and not allowed(request.user, "organization.update", org):
        out["tax_identifier"] = "•" * max(0, len(org.tax_identifier) - 3) + org.tax_identifier[-3:]
    return out


def _review(state: str):
    def handler(request: HttpRequest, org: Organization, data: dict[str, Any]) -> None:
        if org.organization_type == Organization.Type.SELLER:
            fail(ErrorCode.CONFLICT, "Sellers are approved through seller onboarding review.")
        org.approval_state = state
        org.save(update_fields=["approval_state", "updated_at"])
        _notify_owners(
            org,
            event_id=f"organization:{org.pk}:{state}:{org.updated_at.isoformat()}",
            message=f"organization.{state}",
            link="/organization",
        )

    return handler


organization = register(
    Resource(
        key="organization",
        path="organizations",
        model=Organization,
        label="Organization",
        label_plural="Organizations",
        display_field="name",
        fields=(
            derive(Organization, "id"),
            derive(Organization, "name", weight=10),
            derive(Organization, "organization_type", read_only=True, filter=("in",), weight=5),
            derive(Organization, "legal_name", weight=20),
            derive(
                Organization,
                "tax_identifier",
                weight=30,
                field_policy={"read": "organization.update", "write": "organization.update"},
            ),
            derive(Organization, "default_currency", type="enum", widget="select", choices=CURRENCIES, weight=40),
            derive(Organization, "timezone", type="enum", widget="select", choices=TIMEZONES, weight=50),
            derive(Organization, "status", widget="status", tones=STATUS_TONES, read_only=True, filter=("in",)),
            derive(
                Organization, "approval_state", widget="status", tones=APPROVAL_TONES, read_only=True, filter=("in",)
            ),
            derive(Organization, "created_at", read_only=True, widget="relative-time"),
            derive(Organization, "updated_at", read_only=True, widget="relative-time"),
        ),
        list_fields=("name", "organization_type", "approval_state", "created_at"),
        search=("name", "legal_name"),
        ordering=("name", "-created_at"),
        writable=("name", "legal_name", "tax_identifier", "default_currency", "timezone"),
        permissions={"list": "organization.get", "get": "organization.get", "update": "organization.update"},
        actions=(
            Action(
                "approve",
                "Approve",
                "organization.review",
                _review("approved"),
                tone="primary",
                icon="check",
                when={"approval_state": ["pending", "rejected", "suspended"]},
            ),
            Action(
                "reject",
                "Reject",
                "organization.review",
                _review("rejected"),
                tone="danger",
                confirm=True,
                when={"approval_state": ["pending"]},
            ),
            Action(
                "suspend",
                "Suspend",
                "organization.review",
                _review("suspended"),
                tone="warning",
                confirm=True,
                when={"approval_state": ["approved"]},
            ),
        ),
        hooks={"queryset": _org_queryset, "organization_of": lambda o: o, "serialize_extra": _org_extra},
    )
)


# --- memberships ------------------------------------------------------------------------------


def _member_queryset(request: HttpRequest) -> QuerySet[Membership]:
    qs = Membership.objects.select_related("user", "organization", "user__avatar", "user__avatar_dark").exclude(
        status=Membership.Status.REMOVED
    )
    if is_admin(request.user):
        return qs
    return qs.filter(organization=active_membership(request).organization)


def _member_extra(m: Membership, request: HttpRequest) -> dict[str, Any]:
    from apps.accounts.services import avatar_json

    return {
        "name": m.user.display_name or m.user.email,
        "email": m.user.email,
        "avatar": avatar_json(m.user),
        "is_you": m.user_id == request.user.pk,
    }  # pyright: ignore[reportAttributeAccessIssue]


def _guard_member(request: HttpRequest, m: Membership, role: str | None = None) -> None:
    if m.user_id == request.user.pk:  # pyright: ignore[reportAttributeAccessIssue]
        fail(ErrorCode.CONFLICT, "You cannot change your own membership. Ask another owner.")
    owner = OWNER_ROLE[m.organization.organization_type]
    if m.role_key == owner and role != owner:
        others = Membership.objects.filter(
            organization=m.organization, role_key=owner, status=Membership.Status.ACTIVE
        ).exclude(pk=m.pk)
        if not others.exists():
            fail(ErrorCode.CONFLICT, "An organization needs at least one active owner.")


def _invite(request: HttpRequest, data: dict[str, Any]) -> Membership:
    from apps.accounts.services import send_invitation

    org = active_membership(request).organization
    email = (data.get("email") or "").strip().lower()
    role = data.get("role_key") or ""
    if "@" not in email:
        invalid({"email": ["Enter the email address to invite."]})
    if role not in ROLES_FOR[org.organization_type]:
        invalid({"role_key": ["Choose a role this organization can give."]})
    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        user = User.objects.create_user(email, None)  # unusable password until the invitation is accepted
    existing = Membership.objects.filter(organization=org, user=user).first()
    if existing and existing.status != Membership.Status.REMOVED:
        invalid({"email": ["This person is already a member or has an open invitation."]})
    m = existing or Membership(organization=org, user=user)
    m.role_key, m.status, m.invited_by = role, Membership.Status.INVITED, request.user
    m.save()
    send_invitation(m)
    return m


def _update_member(request: HttpRequest, m: Membership, changes: dict[str, Any]) -> None:
    if set(changes) - {"role_key"}:
        invalid({k: ["This field cannot be changed here."] for k in set(changes) - {"role_key"}})
    role = changes.get("role_key", m.role_key)
    if role not in ROLES_FOR[m.organization.organization_type]:
        invalid({"role_key": ["Choose a role this organization can give."]})
    _guard_member(request, m, role)
    m.role_key = role


def _change_role(request: HttpRequest, m: Membership, data: dict[str, Any]) -> None:
    _update_member(request, m, {"role_key": data.get("role_key") or ""})
    m.save(update_fields=["role_key", "updated_at"])


def _set_status(status: str):
    def handler(request: HttpRequest, m: Membership, data: dict[str, Any]) -> None:
        _guard_member(request, m)
        m.status = status
        m.save(update_fields=["status", "updated_at"])

    return handler


def _resend(request: HttpRequest, m: Membership, data: dict[str, Any]) -> None:
    from apps.accounts.services import send_invitation

    send_invitation(m)


membership = register(
    Resource(
        key="membership",
        path="memberships",
        model=Membership,
        label="Member",
        label_plural="Members",
        display_field="name",
        fields=(
            derive(Membership, "id"),
            Field("name", "string", "text", label="Name", read_only=True, weight=10),
            Field("email", "email", "email", label="Email", required=True, weight=20),
            derive(
                Membership,
                "user",
                read_only=True,
                relation={"model": "user", "display": "display_name"},
                widget="hidden",
            ),
            derive(
                Membership,
                "organization",
                read_only=True,
                relation={"model": "organization", "display": "name"},
                filter=("eq",),
                widget="hidden",
            ),
            derive(Membership, "role_key", filter=("in",), weight=30),
            derive(
                Membership, "status", widget="status", tones=MEMBER_TONES, read_only=True, filter=("in",), weight=40
            ),
            derive(Membership, "created_at", read_only=True, widget="relative-time", weight=50),
        ),
        list_fields=("name", "email", "role_key", "status", "created_at"),
        search=("name", "email"),
        ordering=("name", "-created_at"),
        writable=("email", "role_key"),
        permissions={
            "list": "membership.list",
            "get": "membership.list",
            "create": "membership.invite",
            "update": "membership.update",
        },
        actions=(
            Action(
                "change_role",
                "Change role",
                "membership.update",
                _change_role,
                kind="update",
                icon="pencil",
                input=("role_key",),
                when={"status": ["invited", "active", "suspended"]},
            ),
            Action(
                "resend", "Resend invitation", "membership.invite", _resend, icon="mail", when={"status": ["invited"]}
            ),
            Action(
                "suspend",
                "Suspend",
                "membership.update",
                _set_status(Membership.Status.SUSPENDED),
                tone="warning",
                confirm=True,
                when={"status": ["active"]},
            ),
            Action(
                "reactivate",
                "Reactivate",
                "membership.update",
                _set_status(Membership.Status.ACTIVE),
                when={"status": ["suspended"]},
            ),
            Action(
                "remove",
                "Remove from organization",
                "membership.update",
                _set_status(Membership.Status.REMOVED),
                kind="archive",
                tone="danger",
                confirm=True,
                when={"status": ["invited", "active", "suspended"]},
            ),
        ),
        hooks={
            "queryset": _member_queryset,
            "serialize_extra": _member_extra,
            "create": _invite,
            "update": _update_member,
            # Your own membership is changed by another owner (see _guard_member), so offer nothing on it.
            "can": lambda request, m, names: [] if m.user_id == request.user.pk else names,
        },
        search_paths={"name": "user__display_name", "email": "user__email"},
    )
)


# --- addresses --------------------------------------------------------------------------------


def _address_queryset(request: HttpRequest) -> QuerySet[Address]:
    if is_admin(request.user):
        return Address.objects.all()
    return Address.objects.filter(organization=active_membership(request).organization)


def _create_address(request: HttpRequest, data: dict[str, Any]) -> Address:
    return Address(organization=active_membership(request).organization, **data)


def _delete_address(request: HttpRequest, a: Address, data: dict[str, Any]) -> dict[str, Any]:
    a.delete()
    return {"deleted": True}


address = register(
    Resource(
        key="address",
        path="addresses",
        model=Address,
        label="Address",
        label_plural="Addresses",
        display_field="label",
        fields=(
            derive(Address, "id"),
            derive(Address, "label", weight=10),
            derive(Address, "line1", weight=20),
            derive(Address, "line2", weight=30),
            derive(Address, "city", weight=40),
            derive(Address, "region", weight=50),
            derive(Address, "postal_code", weight=60),
            derive(Address, "country_code", type="enum", widget="select", choices=COUNTRIES, weight=70),
            derive(Address, "location_point", type="location", widget="location", weight=80),
            derive(Address, "created_at", read_only=True, widget="relative-time"),
        ),
        list_fields=("label", "line1", "city", "region"),
        search=("label", "line1", "city"),
        ordering=("label",),
        writable=("label", "line1", "line2", "city", "region", "postal_code", "country_code", "location_point"),
        permissions={
            "list": "address.list",
            "get": "address.list",
            "create": "address.create",
            "update": "address.update",
        },
        actions=(
            Action(
                "delete",
                "Delete address",
                "address.delete",
                _delete_address,
                kind="archive",
                tone="danger",
                confirm=True,
            ),
        ),
        hooks={"queryset": _address_queryset, "create": _create_address},
    )
)
