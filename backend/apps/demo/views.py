"""The seeded demo accounts, for the sign-in page. Answers only where settings.AC_DEMO_ACCOUNTS is on."""

from django.conf import settings
from django.http import HttpRequest

from apps.accounts.models import User
from apps.accounts.services import avatar_json
from apps.demo import data
from core.api import endpoint, fail
from core.result import ErrorCode

ROLE_LABELS = {
    "marketplace_admin": "Marketplace administrator",
    "seller_manager": "Seller manager",
    "warehouse_operator": "Warehouse operator",
    "buyer_owner": "Buyer owner",
    "buyer_purchaser": "Buyer purchaser",
}


@endpoint("GET", auth=False)
def accounts(request: HttpRequest):
    if not settings.AC_DEMO_ACCOUNTS:
        fail(ErrorCode.NOT_FOUND)
    users = {
        u.email: u
        for u in User.objects.filter(email__in=[a["email"] for a in data.ACCOUNTS]).select_related(
            "avatar", "avatar_dark"
        )
    }
    orgs = {o["key"]: o["name"] for o in data.ORGANIZATIONS}
    return {
        "password": data.DEMO_PASSWORD,
        "accounts": [
            {
                "email": a["email"],
                "name": a["name"],
                "role_key": a["role"],
                "role_label": ROLE_LABELS[a["role"]],
                "organization": orgs[a["org"]],
                "summary": a["summary"],
                "avatar": avatar_json(users[a["email"]]) if a["email"] in users else None,
            }
            for a in data.ACCOUNTS
            if a["email"] in users
        ],
    }
