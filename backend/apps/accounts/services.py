"""Account rules: registration with an organization, email verification codes, invitations, sessions."""

import hashlib
import hmac
import secrets
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core import signing
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import EmailVerification, User
from apps.notifications.services import ensure_preferences
from apps.organizations.models import OWNER_ROLE, ROLES_FOR, Membership, Organization
from apps.organizations.tenancy import active_memberships, forget, is_admin
from core.api import fail, invalid
from core.mail import send_email
from core.result import ErrorCode

CODE_TTL = timedelta(minutes=15)
MAX_ATTEMPTS = 5
INVITE_SALT = "apps.accounts.invitation"
INVITE_MAX_AGE = 7 * 24 * 3600


def _hash(user: User, code: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), f"{user.pk}:{code}".encode(), hashlib.sha256).hexdigest()


def issue_code(user: User) -> None:
    """Replace any open code with a new one and email it. The code itself is never stored."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    now = timezone.now()
    EmailVerification.objects.filter(user=user, used_at__isnull=True).update(used_at=now)
    EmailVerification.objects.create(
        user=user, email=user.email, code_hash=_hash(user, code), expires_at=now + CODE_TTL
    )
    transaction.on_commit(
        lambda: send_email(
            user.email,
            "Your SokoMesh verification code",
            [
                f"Hello {user.display_name or 'there'},",
                "Enter this code on SokoMesh to confirm your email address. It expires in 15 minutes.",
            ],
            code=code,
            action=("Open SokoMesh", f"{settings.AC_SITE_URL}/verify"),
        )
    )


def confirm_code(user: User, code: str) -> None:
    check = EmailVerification.objects.filter(user=user, used_at__isnull=True).first()
    if check is None or check.expires_at < timezone.now():
        invalid({"code": ["This code has expired. Ask for a new one."]})
    if check.attempts >= MAX_ATTEMPTS:
        invalid({"code": ["Too many wrong codes. Ask for a new one."]})
    if not hmac.compare_digest(check.code_hash, _hash(user, code.strip())):
        check.attempts += 1
        check.save(update_fields=["attempts"])
        left = MAX_ATTEMPTS - check.attempts
        invalid(
            {
                "code": [
                    f"That code is not right. {left} tries left."
                    if left
                    else "Too many wrong codes. Ask for a new one."
                ]
            }
        )
    now = timezone.now()
    check.used_at = now
    check.save(update_fields=["used_at"])
    user.email_verified_at = now
    user.save(update_fields=["email_verified_at"])


def password_errors(password: str, user: User | None = None) -> list[str]:
    try:
        validate_password(password, user)
    except ValidationError as exc:
        return [str(m) for m in exc.messages]
    return []


@transaction.atomic
def register(*, display_name: str, email: str, password: str, organization_name: str, organization_type: str) -> User:
    errors: dict[str, list[str]] = {}
    if organization_type not in ("buyer", "seller"):
        errors["organization_type"] = ["Choose buyer or seller."]
    if User.objects.filter(email__iexact=email).exists():
        errors["email"] = ["An account already uses this email address. Sign in instead."]
    candidate = User(email=email, display_name=display_name)
    if problems := password_errors(password, candidate):
        errors["password"] = problems
    if errors:
        invalid(errors)
    user = User.objects.create_user(email, password, display_name=display_name)
    org = Organization.objects.create(name=organization_name, organization_type=organization_type)
    Membership.objects.create(organization=org, user=user, role_key=OWNER_ROLE[organization_type])
    forget(user)
    if organization_type == "seller":
        from apps.sellers.models import SellerProfile

        SellerProfile.objects.create(organization=org, public_name=organization_name)
    ensure_preferences(user)
    issue_code(user)
    return user


def invitation_token(membership: Membership) -> str:
    return signing.dumps({"m": str(membership.pk)}, salt=INVITE_SALT, compress=True)


def read_invitation(token: str) -> Membership:
    try:
        data = signing.loads(token, salt=INVITE_SALT, max_age=INVITE_MAX_AGE)
        membership = Membership.objects.select_related("organization", "user", "invited_by").get(pk=data["m"])
    except (signing.BadSignature, Membership.DoesNotExist, KeyError):
        fail(ErrorCode.NOT_FOUND, "This invitation link is not valid or has expired. Ask for a new one.")
    if membership.status != Membership.Status.INVITED:
        fail(ErrorCode.CONFLICT, "This invitation has already been used.")
    return membership


def send_invitation(membership: Membership) -> None:
    link = f"{settings.AC_SITE_URL}/invitations/{invitation_token(membership)}"
    inviter = membership.invited_by.display_name if membership.invited_by else "A colleague"
    transaction.on_commit(
        lambda: send_email(
            membership.user.email,
            f"Join {membership.organization.name} on SokoMesh",
            [
                f"{inviter} invited you to {membership.organization.name} as {membership.get_role_key_display()}.",  # pyright: ignore[reportAttributeAccessIssue]
                "The link works for 7 days.",
            ],
            action=("Accept the invitation", link),
        )
    )


def avatar_json(user: User) -> dict[str, Any] | None:
    if not user.avatar_id:
        return None
    dark = user.avatar_dark.url if user.avatar_dark_id else None  # pyright: ignore[reportOptionalMemberAccess]
    return {"url": user.avatar.url, "dark_url": dark, "alt": ""}  # pyright: ignore[reportOptionalMemberAccess]


def user_json(user: User) -> dict[str, Any]:
    return {
        "id": str(user.pk),
        "email": user.email,
        "display_name": user.display_name,
        "phone": user.phone,
        "email_verified": user.email_verified_at is not None,
        "avatar": avatar_json(user),
        "date_joined": user.date_joined.isoformat(),
    }


def navigation(user: User, active: Membership | None) -> list[dict[str, str]]:
    """What this person may open, decided here from their roles; the client only renders it."""
    from core.policies import allowed

    org = active.organization if active else None
    # Work first, then the organization, then the person's own pages.
    items: list[dict[str, str]] = []
    if is_admin(user):
        items += [
            {"key": "admin-sellers", "label": "Seller reviews", "href": "/admin/sellers", "group": "Marketplace"},
            {
                "key": "admin-organizations",
                "label": "Buyer approvals",
                "href": "/admin/organizations",
                "group": "Marketplace",
            },
            {
                "key": "admin-categories",
                "label": "Category contracts",
                "href": "/admin/categories",
                "group": "Marketplace",
            },
        ]
    if org is not None and allowed(user, "organization.get", org):
        items.append({"key": "organization", "label": "Organization", "href": "/organization", "group": "Organization"})
    if org is not None and org.organization_type == "seller" and allowed(user, "order.list", org):
        items.append({"key": "sales", "label": "Orders", "href": "/sell/orders", "group": "Sell"})
    if org is not None and org.organization_type == "seller" and allowed(user, "quote.list", org):
        items.append({"key": "sell-quotes", "label": "Quotes", "href": "/sell/quotes", "group": "Sell"})
    if org is not None and org.organization_type == "seller" and allowed(user, "catalog_product.list", org):
        items.append({"key": "products", "label": "Products", "href": "/sell/products", "group": "Sell"})
    if org is not None and org.organization_type == "seller" and allowed(user, "buyer_group.list", org):
        items.append({"key": "buyers", "label": "Buyers and prices", "href": "/sell/buyers", "group": "Sell"})
    if org is not None and org.organization_type == "seller" and allowed(user, "analytics.view", org):
        items.append({"key": "analytics", "label": "Analytics", "href": "/sell/analytics", "group": "Sell"})
    if org is not None and org.organization_type == "seller" and allowed(user, "seller_profile.get", org):
        items.append({"key": "sell", "label": "Seller profile", "href": "/sell", "group": "Sell"})
    if org is not None and org.organization_type == "buyer":
        items.append({"key": "catalogue", "label": "Catalogue", "href": "/catalogue", "group": "Buy"})
        if allowed(user, "cart.get", org):
            items.append({"key": "cart", "label": "Cart", "href": "/cart", "group": "Buy"})
        if allowed(user, "order.list", org):
            items.append({"key": "orders", "label": "Orders", "href": "/orders", "group": "Buy"})
        if allowed(user, "quote.list", org):
            items.append({"key": "quotes", "label": "Quotes", "href": "/quotes", "group": "Buy"})
    items += [
        {"key": "notifications", "label": "Notifications", "href": "/notifications", "group": "You"},
        {"key": "account", "label": "Profile", "href": "/account", "group": "You"},
        {"key": "settings", "label": "Settings", "href": "/account/settings", "group": "You"},
    ]
    return items


def session_json(request: Any) -> dict[str, Any]:
    user = request.user
    if not user.is_authenticated:
        return {"user": None, "memberships": [], "active_organization": None, "is_admin": False, "nav": []}
    memberships = list(active_memberships(user))
    chosen = request.session.get("org")
    active = next((m for m in memberships if str(m.organization_id) == chosen), memberships[0] if memberships else None)
    return {
        "user": user_json(user),
        "memberships": [
            {
                "id": str(m.pk),
                "role_key": m.role_key,
                "role_label": m.get_role_key_display(),  # pyright: ignore[reportAttributeAccessIssue]
                "organization": {
                    "id": str(m.organization_id),
                    "name": m.organization.name,
                    "organization_type": m.organization.organization_type,
                    "approval_state": m.organization.approval_state,
                    # Roles this organization can give, for the invitation form; the API checks again.
                    "assignable_roles": list(ROLES_FOR[m.organization.organization_type]),
                },
            }
            for m in memberships
        ],
        "active_organization": str(active.organization_id) if active else None,
        "is_admin": is_admin(user),
        "nav": navigation(user, active) if user.email_verified_at else [],
    }
