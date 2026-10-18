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
    # SM-F-15 orders and SM-F-12 approvals
    "order.placed": {
        "en-KE": (
            "New order {order} from {buyer}",
            "{buyer} placed {order} for {total}. Confirm it when you can supply it.",
        ),
        "sw-KE": (
            "Oda mpya {order} kutoka {buyer}",
            "{buyer} imeweka oda {order} ya {total}. Ithibitishe ukiweza kuisambaza.",
        ),
    },
    "order.needs_approval": {
        "en-KE": (
            "{order} needs your approval",
            "{person} placed {order} for {total} with {seller}. Approve or reject it.",
        ),
        "sw-KE": (
            "{order} inahitaji idhini yako",
            "{person} ameweka oda {order} ya {total} kwa {seller}. Iidhinishe au uikatae.",
        ),
    },
    "order.approved": {
        "en-KE": ("{order} is approved", "{person} approved it; it has gone to the seller."),
        "sw-KE": ("{order} imeidhinishwa", "{person} ameiidhinisha; imetumwa kwa muuzaji."),
    },
    "order.rejected": {
        "en-KE": ("{order} was rejected", "{person} rejected it. Reason: {reason}"),
        "sw-KE": ("{order} imekataliwa", "{person} ameikataa. Sababu: {reason}"),
    },
    "order.confirmed": {
        "en-KE": ("{seller} confirmed {order}", "Your order is confirmed and will be prepared."),
        "sw-KE": ("{seller} imethibitisha {order}", "Oda yako imethibitishwa na itaandaliwa."),
    },
    "order.partial": {
        "en-KE": ("{order} will arrive short", "{seller} cannot supply everything. Reason: {reason}"),
        "sw-KE": ("{order} itafika pungufu", "{seller} haiwezi kusambaza kila kitu. Sababu: {reason}"),
    },
    "order.shipped": {
        "en-KE": ("{order} is on its way", "{seller} has handed your order to the carrier."),
        "sw-KE": ("{order} iko njiani", "{seller} imekabidhi oda yako kwa msafirishaji."),
    },
    "order.delivered": {
        "en-KE": (
            "{order} was delivered",
            "{seller} confirmed delivery. Report a problem from the order if anything is wrong.",
        ),
        "sw-KE": (
            "{order} imefikishwa",
            "{seller} imethibitisha kufikishwa. Ripoti tatizo kutoka kwenye oda ikiwa kuna kasoro.",
        ),
    },
    "order.cancelled": {
        "en-KE": ("{order} was cancelled", "Cancelled by {by}. Reason: {reason}"),
        "sw-KE": ("{order} imeghairiwa", "Imeghairiwa na {by}. Sababu: {reason}"),
    },
    "order.disputed": {
        "en-KE": ("{buyer} reported a problem with {order}", "Reason: {reason}"),
        "sw-KE": ("{buyer} imeripoti tatizo kuhusu {order}", "Sababu: {reason}"),
    },
    # SM-F-11 quotes
    "quote.requested": {
        "en-KE": ("{buyer} asked for a quote", "Quote {quote} is waiting for your prices."),
        "sw-KE": ("{buyer} imeomba bei", "Ombi la bei {quote} linasubiri bei zako."),
    },
    "quote.responded": {
        "en-KE": ("{seller} answered quote {quote}", "Review the offer and accept it before it expires."),
        "sw-KE": ("{seller} imejibu ombi la bei {quote}", "Kagua ofa na uikubali kabla muda wake haujaisha."),
    },
    "quote.accepted": {
        "en-KE": ("{buyer} accepted quote {quote}", "It became order {order}."),
        "sw-KE": ("{buyer} imekubali ombi la bei {quote}", "Imekuwa oda {order}."),
    },
    "quote.declined": {
        "en-KE": ("Quote {quote} was declined", "Declined by {by}. {reason}"),
        "sw-KE": ("Ombi la bei {quote} limekataliwa", "Limekataliwa na {by}. {reason}"),
    },
    # SM-F-17 delivery
    "delivery.delayed": {
        "en-KE": ("{order} is delayed", "{detail}"),
        "sw-KE": ("{order} imechelewa", "{detail}"),
    },
    "delivery.exception": {
        "en-KE": ("Delivery problem with {order}", "{detail}"),
        "sw-KE": ("Tatizo la kufikisha {order}", "{detail}"),
    },
    "delivery.out_for_delivery": {
        "en-KE": ("{order} is out for delivery", "{detail}"),
        "sw-KE": ("{order} inaletwa leo", "{detail}"),
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
