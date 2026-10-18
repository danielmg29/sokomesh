"""Accepting an upload: the bytes decide the type, the settings decide the size, the caller decides the owner."""

import hashlib
from typing import Any

from django.conf import settings
from django.core.files.uploadedfile import UploadedFile

from apps.media.models import FileAsset
from core.api import invalid

SIGNATURES = (
    (b"%PDF-", "application/pdf"),
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
)


def sniff(head: bytes) -> str | None:
    """The real type of a file from its first bytes, whatever the browser claimed."""
    for magic, kind in SIGNATURES:
        if head.startswith(magic):
            return kind
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    return None


def store(upload: UploadedFile, kind: str, *, user: Any, organization: Any = None) -> FileAsset:
    rules = settings.AC_UPLOADS[kind]
    name = (upload.name or "upload")[-255:]
    if upload.size is None or upload.size > rules["max_bytes"]:
        invalid({"file": [f"Files can be up to {rules['max_bytes'] // 1_048_576} MB."]})
    upload.seek(0)
    kind_found = sniff(upload.read(16))
    if kind_found not in rules["types"]:
        allowed = ", ".join(t.split("/")[-1].upper() for t in rules["types"])
        invalid({"file": [f"Upload a {allowed} file."]})
    digest = hashlib.sha256()
    upload.seek(0)
    for chunk in upload.chunks():
        digest.update(chunk)
    upload.seek(0)
    asset = FileAsset(
        kind=kind,
        organization=organization,
        uploaded_by=user,
        original_name=name,
        content_type=kind_found,
        size=upload.size,
        sha256=digest.hexdigest(),
    )
    asset.file.save(name, upload, save=False)
    asset.save()
    return asset
