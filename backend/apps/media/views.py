"""Upload and download for stored files. Documents need permission; avatars are public."""

import uuid

from django.conf import settings
from django.http import FileResponse, HttpRequest

from apps.media.models import FileAsset
from apps.media.services import ACCESS_RULES, store
from apps.organizations.tenancy import active_membership
from core.api import Created, endpoint, fail, invalid
from core.policies import allowed
from core.result import ErrorCode


@endpoint("POST")
def upload(request: HttpRequest):
    kind = request.POST.get("kind", "document")
    if kind != "document":
        invalid({"kind": ["Upload profile photos from your profile page."]})
    length = int(request.META.get("CONTENT_LENGTH") or 0)
    if length > settings.AC_UPLOADS[kind]["max_bytes"] + 65_536:  # refuse before reading the body
        invalid({"file": [f"Files can be up to {settings.AC_UPLOADS[kind]['max_bytes'] // 1_048_576} MB."]})
    org = active_membership(request).organization
    # Seller documents (SM-F-02) and proof of delivery (SM-F-17) are both private documents.
    if not (allowed(request.user, "seller_document.create", org) or allowed(request.user, "shipment.update", org)):
        fail(ErrorCode.FORBIDDEN)
    upload_file = request.FILES.get("file")
    if upload_file is None:
        invalid({"file": ["Choose a file to upload."]})
    return Created(store(upload_file, kind, user=request.user, organization=org).describe())


@endpoint("GET", auth=False)
def download(request: HttpRequest, asset_id: str):
    try:
        asset = FileAsset.objects.select_related("organization").get(pk=uuid.UUID(asset_id))
    except (ValueError, FileAsset.DoesNotExist):
        fail(ErrorCode.NOT_FOUND)
    private = asset.kind == FileAsset.Kind.DOCUMENT
    readable = allowed(request.user, "seller_document.list", asset.organization) or any(
        rule(request.user, asset) for rule in ACCESS_RULES
    )
    if private and not readable:
        fail(ErrorCode.NOT_FOUND)  # do not reveal that a private file exists
    response = FileResponse(asset.file.open("rb"), content_type=asset.content_type)
    disposition = (
        "inline" if asset.content_type in ("application/pdf", "image/jpeg", "image/png", "image/webp") else "attachment"
    )
    safe_name = "".join(c for c in asset.original_name if c.isalnum() or c in " ._-")[:120] or "file"
    response["Content-Disposition"] = f'{disposition}; filename="{safe_name}"'
    response["X-Content-Type-Options"] = "nosniff"
    response["Cache-Control"] = "private, max-age=300" if private else "public, max-age=86400, immutable"
    return response
