"""Notification wording in every supported language (SM-F-21 translated templates).

A notification is written in the recipient's chosen language (NotificationPreference.locale) when it is
raised, so the in-app list and the email agree. Every message has a title and a body per locale in
settings.AC_LOCALES; tests check the table is complete. Amounts stay in KES and names are not translated.
"""

from typing import Any

from django.conf import settings

Template = tuple[str, str]  # title, body

MESSAGES: dict[str, dict[str, Template]] = {
    "seller.submitted": {
        "en-KE": (
            "{seller} applied to sell",
            "{seller} sent its seller application with {documents} documents for review.",
        ),
        "sw-KE": (
            "{seller} imeomba kuuza",
            "{seller} imetuma ombi la kuuza pamoja na nyaraka {documents} ili zikaguliwe.",
        ),
    },
    "seller.active": {
        "en-KE": ("{seller} is approved to sell", "You can now publish products and receive orders."),
        "sw-KE": ("{seller} imeidhinishwa kuuza", "Sasa unaweza kuchapisha bidhaa na kupokea oda."),
    },
    "seller.rejected": {
        "en-KE": ("{seller}: the application needs changes", "Reason: {reason}"),
        "sw-KE": ("{seller}: ombi linahitaji marekebisho", "Sababu: {reason}"),
    },
    "seller.suspended": {
        "en-KE": ("{seller} is suspended", "Reason: {reason}"),
        "sw-KE": ("{seller} imesimamishwa", "Sababu: {reason}"),
    },
    "organization.approved": {
        "en-KE": ("{organization} is approved", "The marketplace approved {organization}. You can start ordering."),
        "sw-KE": ("{organization} imeidhinishwa", "Soko limeidhinisha {organization}. Unaweza kuanza kuagiza."),
    },
    "organization.rejected": {
        "en-KE": ("{organization} was not approved", "The marketplace did not approve {organization}."),
        "sw-KE": ("{organization} haikuidhinishwa", "Soko halikuidhinisha {organization}."),
    },
    "organization.suspended": {
        "en-KE": ("{organization} is suspended", "The marketplace suspended {organization}. Ordering is paused."),
        "sw-KE": ("{organization} imesimamishwa", "Soko limesimamisha {organization}. Kuagiza kumesitishwa."),
    },
    "membership.accepted": {
        "en-KE": ("{person} joined {organization}", "{person} accepted the invitation and is now a {role}."),
        "sw-KE": ("{person} amejiunga na {organization}", "{person} amekubali mwaliko na sasa ni {role}."),
    },
}

# Role names inside sentences, per language (the contract's labels stay the English source).
ROLES: dict[str, dict[str, str]] = {
    "en-KE": {
        "buyer_owner": "buyer owner",
        "buyer_purchaser": "buyer purchaser",
        "seller_manager": "seller manager",
        "warehouse_operator": "warehouse operator",
        "marketplace_admin": "marketplace administrator",
    },
    "sw-KE": {
        "buyer_owner": "mmiliki wa duka",
        "buyer_purchaser": "mnunuzi wa duka",
        "seller_manager": "meneja wa mauzo",
        "warehouse_operator": "mhudumu wa ghala",
        "marketplace_admin": "msimamizi wa soko",
    },
}

# The words around every notification email.
CHROME: dict[str, dict[str, str]] = {
    "en-KE": {
        "open": "Open in SokoMesh",
        "footer": "Wholesale ordering for Kenyan retailers. Prices in KES, times in East Africa Time.",
    },
    "sw-KE": {
        "open": "Fungua katika SokoMesh",
        "footer": "Oda za jumla kwa maduka ya rejareja nchini Kenya. Bei kwa KES, saa za Afrika Mashariki.",
    },
}


def supported(locale: str | None) -> str:
    codes = {code for code, _ in settings.AC_LOCALES["supported"]}
    return locale if locale is not None and locale in codes else str(settings.AC_LOCALES["default"])


def render(message: str, locale: str, params: dict[str, Any]) -> Template:
    """The title and body of `message` in `locale`, with `role` keys turned into that language's role name."""
    locale = supported(locale)
    values = dict(params)
    if "role" in values:
        values["role"] = ROLES[locale].get(values["role"], values["role"])
    title, body = MESSAGES[message][locale]
    return title.format(**values), body.format(**values)
