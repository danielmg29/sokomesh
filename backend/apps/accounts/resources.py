"""The signed-in person's own account, described for the contract so profile forms project from it.

Its reads and writes go through `apps.accounts.views` (the session answer and `PATCH account/profile`),
so the registry generates no routes for it; the view validates writes against these fields.
"""

from django.conf import settings

from apps.accounts.models import User
from core.operations.registry import SELF, Field, Resource, derive, register

account = register(
    Resource(
        key="account",
        path="account/profile",
        model=User,
        label="Account",
        label_plural="Accounts",
        display_field="display_name",
        tenant_scoped=False,
        routed=False,
        fields=(
            derive(User, "id"),
            derive(
                User,
                "display_name",
                label="Your name",
                help="Shown to your team and on the orders, quotes and reviews you send.",
                required=True,
                weight=10,
            ),
            derive(
                User,
                "email",
                read_only=True,
                help="Sign-in address. Write to support to change it.",
                weight=20,
            ),
            derive(
                User,
                "phone",
                label="Phone",
                widget="phone",
                help="For delivery calls and M-Pesa prompts, for example +254 712 345 678.",
                weight=30,
            ),
            derive(User, "date_joined", label="Member since", read_only=True, widget="date", weight=40),
            Field(
                "avatar",
                "image",
                "image",
                label="Photo",
                read_only=True,
                help="Square photos work best.",
                accept=tuple(settings.AC_UPLOADS["avatar"]["types"]),
                max_bytes=settings.AC_UPLOADS["avatar"]["max_bytes"],
                weight=5,
            ),
        ),
        list_fields=("display_name", "email"),
        writable=("display_name", "phone"),
        permissions={"get": SELF, "update": SELF},
    )
)
