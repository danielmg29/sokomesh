"""Session, registration, verification, profile and invitation endpoints (SM-F-01).

Sign-in is by email and password; a new account must confirm its address with the emailed code
before it can use anything beyond these endpoints (`core.api.endpoint(verified=True)` everywhere else).
"""

from typing import cast

from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.http import HttpRequest
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie

from apps.accounts import services
from apps.accounts.models import User
from apps.accounts.resources import account
from apps.media.services import store
from apps.organizations.models import Membership
from apps.organizations.tenancy import active_memberships, forget
from core.api import Created, body, endpoint, fail, invalid, text, throttle
from core.operations.registry import clean_input
from core.result import ErrorCode


def _ip(request: HttpRequest) -> str:
    return request.META.get("REMOTE_ADDR", "unknown")


@ensure_csrf_cookie
@endpoint("GET", auth=False)
def session(request: HttpRequest):
    """Who is signed in, their organizations and which one they act for. Also sets the CSRF cookie."""
    return services.session_json(request)


@endpoint("POST", auth=False)
def register(request: HttpRequest):
    data = body(request)
    throttle(f"register:{_ip(request)}", limit=10, window=3600)
    user = services.register(
        display_name=text(data, "display_name", max_length=150),
        email=User.objects.normalize_email(text(data, "email", max_length=254)).lower(),
        password=str(data.get("password") or ""),
        organization_name=text(data, "organization_name", max_length=160),
        organization_type=text(data, "organization_type", max_length=20),
    )
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    return Created(services.session_json(request))


@endpoint("POST", auth=False)
def sign_in(request: HttpRequest):
    data = body(request)
    email = text(data, "email", max_length=254).lower()
    throttle(f"login:{_ip(request)}:{email}", limit=8, window=900)
    user = authenticate(request, username=email, password=data.get("password") or "")
    if user is None:
        invalid({"password": ["The email address or password is not right."]}, "We couldn't sign you in.")
    login(request, user)
    return services.session_json(request)


@endpoint("POST", auth=False)
def sign_out(request: HttpRequest):
    logout(request)
    return services.session_json(request)


@endpoint("POST", verified=False)
def verify(request: HttpRequest):
    user = request.user
    if user.email_verified_at:  # pyright: ignore[reportAttributeAccessIssue]
        return services.session_json(request)
    throttle(f"verify:{user.pk}", limit=10, window=900)
    services.confirm_code(user, text(body(request), "code", max_length=10))  # pyright: ignore[reportArgumentType]
    return services.session_json(request)


@endpoint("POST", verified=False)
def resend(request: HttpRequest):
    user = request.user
    if user.email_verified_at:  # pyright: ignore[reportAttributeAccessIssue]
        return {"sent": False}
    throttle(f"resend:{user.pk}", limit=1, window=60)
    throttle(f"resend-hour:{user.pk}", limit=5, window=3600)
    services.issue_code(user)  # pyright: ignore[reportArgumentType]
    return {"sent": True}


@endpoint("PATCH")
def profile(request: HttpRequest):
    """Name and phone, validated against the contract's account description (apps.accounts.resources)."""
    user = cast(User, request.user)
    for k, v in clean_input(account, body(request)).items():
        setattr(user, k, v)
    user.save()
    return services.session_json(request)


@endpoint("POST", "DELETE")
def avatar(request: HttpRequest):
    user = cast(User, request.user)
    if request.method == "DELETE":
        user.avatar = user.avatar_dark = None  # pyright: ignore[reportAttributeAccessIssue]
        user.save(update_fields=["avatar", "avatar_dark"])
        return services.session_json(request)
    upload = request.FILES.get("file")
    if upload is None:
        invalid({"file": ["Choose a photo to upload."]})
    asset = store(upload, "avatar", user=user)
    # One uploaded photo serves both themes; only seeded people carry a separate dark version.
    user.avatar, user.avatar_dark = asset, None  # pyright: ignore[reportAttributeAccessIssue]
    user.save(update_fields=["avatar", "avatar_dark"])
    return services.session_json(request)


@endpoint("POST")
def password(request: HttpRequest):
    data = body(request)
    user = cast(User, request.user)
    throttle(f"password:{user.pk}", limit=6, window=900)
    if not user.check_password(data.get("current_password") or ""):
        invalid({"current_password": ["Your current password is not right."]})
    new = data.get("new_password") if isinstance(data.get("new_password"), str) else ""
    if problems := services.password_errors(new, user):  # pyright: ignore[reportArgumentType]
        invalid({"new_password": problems})
    user.set_password(new)
    user.save()
    update_session_auth_hash(request, user)  # stay signed in here, sign out other sessions
    return {"changed": True}


@endpoint("POST")
def switch_organization(request: HttpRequest):
    wanted = text(body(request), "organization", max_length=40)
    if not any(str(m.organization_id) == wanted for m in active_memberships(request.user)):
        fail(ErrorCode.FORBIDDEN, "You are not a member of that organization.")
    request.session["org"] = wanted
    return services.session_json(request)


@endpoint("GET", "POST", auth=False)
def invitation(request: HttpRequest, token: str):
    membership = services.read_invitation(token)
    if request.method == "GET":
        return {
            "organization": membership.organization.name,
            "role_label": membership.get_role_key_display(),  # pyright: ignore[reportAttributeAccessIssue]
            "email": membership.user.email,
            "invited_by": membership.invited_by.display_name if membership.invited_by else None,
            "needs_password": not membership.user.has_usable_password(),
        }
    data = body(request)
    user = membership.user
    if not user.has_usable_password():
        user.display_name = text(data, "display_name", max_length=150)
        new = data.get("password") if isinstance(data.get("password"), str) else ""
        if problems := services.password_errors(new, user):  # pyright: ignore[reportArgumentType]
            invalid({"password": problems})
        user.set_password(new)
    elif not user.check_password(data.get("password") or ""):
        invalid({"password": ["Enter the password for this account to join."]})
    # Following the emailed link proves the address.
    user.email_verified_at = user.email_verified_at or timezone.now()
    user.save()
    membership.status = Membership.Status.ACTIVE
    membership.save(update_fields=["status", "updated_at"])
    forget(user)
    from apps.notifications.services import ensure_preferences, notify

    ensure_preferences(user)
    if membership.invited_by:
        notify(
            membership.invited_by,
            event_key="account",
            event_id=f"membership:{membership.pk}:accepted",
            message="membership.accepted",
            params={
                "person": user.display_name or user.email,
                "organization": membership.organization.name,
                "role": membership.role_key,
            },
            deep_link="/organization?tab=team",
        )
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    request.session["org"] = str(membership.organization_id)
    return services.session_json(request)
