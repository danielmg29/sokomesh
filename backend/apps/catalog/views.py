"""SM-F-09 comparison: a read-only projection, so it is a view over the catalogue rather than a resource."""

import uuid
from typing import Any

from django.http import HttpRequest

from apps.catalog.resources import COMPARE_LIMIT, comparable
from core.api import endpoint, invalid


@endpoint("GET", auth=False)
def compare(request: HttpRequest) -> dict[str, Any]:
    """GET compare?products=<id>,<id>: from one to COMPARE_LIMIT published products of one category."""
    ids = list(dict.fromkeys(x.strip() for x in request.GET.get("products", "").split(",") if x.strip()))
    if not ids:
        invalid({"products": ["Choose products to compare."]})
    if len(ids) > COMPARE_LIMIT:
        invalid({"products": [f"Compare at most {COMPARE_LIMIT} products at a time."]})
    try:
        ids = [str(uuid.UUID(i)) for i in ids]
    except ValueError:
        invalid({"products": ["One of the products is not recognised."]})
    return comparable(ids)
