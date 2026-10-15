"""Rich-text sanitising for the four WYSIWYG fields (spec p.5), against settings.AC_RICH_TEXT.

The backend is the authority: every write passes through `sanitize`, and the stored value is the
sanitised HTML plus its plain-text projection (used for search, previews, length limits and
notifications). The web editor mirrors the same policy from the contract for immediate feedback;
the server result always wins.
"""

import html
import re
from dataclasses import dataclass
from functools import cache
from urllib.parse import urlsplit

import nh3
from django.conf import settings

LINK_REL = "noopener noreferrer nofollow"
_EMPTY_MEDIA = re.compile(r"<figure class=\"media\">\s*(<oembed></oembed>)?\s*</figure>")
_BLOCK_END = re.compile(r"</(p|h3|h4|li|blockquote|figcaption|td|th)>|<br>|<hr>", re.IGNORECASE)
_SPACE = re.compile(r"\s+")


@dataclass(frozen=True, slots=True)
class RichText:
    html: str
    text: str


@cache
def _policy() -> dict:
    p = settings.AC_RICH_TEXT
    return {
        **p,
        "embed_patterns": [re.compile(e["url"]) for e in p["embeds"]],
        "tag_set": set(p["tags"]),
        # `class` is governed by allowed_classes (named values only), so nh3 must not see it as a free attribute.
        "attributes": {tag: set(attrs) - {"class"} for tag, attrs in p["tags"].items() if set(attrs) - {"class"}},
        "classes": {tag: set(names) for tag, names in p["classes"].items()},
    }


def _safe_url(value: str, schemes: list[str], same_origin: bool) -> bool:
    if same_origin and value.startswith("/") and not value.startswith("//"):
        return True
    return urlsplit(value).scheme.lower() in schemes


def _filter(tag: str, attribute: str, value: str) -> str | None:
    p = _policy()
    if tag == "a" and attribute == "href":
        return value if _safe_url(value, p["link_schemes"], same_origin=True) else None
    if tag == "img" and attribute == "src":
        return value if _safe_url(value, p["image_schemes"], p["same_origin_images"]) else None
    if tag == "oembed" and attribute == "url":
        return value if any(pattern.match(value) for pattern in p["embed_patterns"]) else None
    return value


def embed_for(url: str) -> dict | None:
    """The provider and player address for a stored oEmbed reference, or None if it is not allowed."""
    for embed, pattern in zip(_policy()["embeds"], _policy()["embed_patterns"], strict=True):
        if match := pattern.match(url):
            return {"name": embed["name"], "player": embed["player"].format(id=match.group(1))}
    return None


def sanitize(value: str) -> RichText:
    """Allow-listed HTML and its plain-text projection. Disallowed tags are removed but their text kept;
    scripts and styles are removed with their content; unsafe URLs and unknown embeds are dropped."""
    p = _policy()
    cleaned = nh3.clean(
        value,
        tags=p["tag_set"],
        attributes=p["attributes"],
        attribute_filter=_filter,
        allowed_classes=p["classes"],
        url_schemes=set(p["link_schemes"]) | set(p["image_schemes"]),
        link_rel=LINK_REL,
        strip_comments=True,
    )
    cleaned = _EMPTY_MEDIA.sub("", cleaned).strip()
    spaced = _BLOCK_END.sub(lambda m: m.group(0) + " ", cleaned)
    text = _SPACE.sub(" ", html.unescape(nh3.clean(spaced, tags=set()))).strip()
    return RichText(html=cleaned, text=text)
