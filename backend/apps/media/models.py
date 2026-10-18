"""Stored files (spec SM-F-02 `SellerDocument.file_asset_id`): authorised metadata around one upload.

Documents are private: only members of the owning organization (with permission) and marketplace
administrators may read them, through `GET /files/<id>`. Avatars are public. Files live in the
default storage under `<kind>/<id><ext>`, never under a guessable original name.
"""

import uuid

from django.conf import settings
from django.db import models


def _upload_to(asset: "FileAsset", filename: str) -> str:
    ext = {"application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    return f"{asset.kind}/{asset.id}{ext.get(asset.content_type, '')}"


class FileAsset(models.Model):
    class Kind(models.TextChoices):
        DOCUMENT = "document", "Document"
        AVATAR = "avatar", "Avatar"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    organization = models.ForeignKey(
        "organizations.Organization", null=True, blank=True, on_delete=models.CASCADE, related_name="files"
    )
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    file = models.FileField(upload_to=_upload_to, max_length=200)
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    size = models.PositiveIntegerField()
    sha256 = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.original_name

    @property
    def url(self) -> str:
        return f"{settings.AC_CONTRACT['api_base']}files/{self.id}"

    def describe(self) -> dict:
        """The FileValue shape the client's file widgets read."""
        return {
            "id": str(self.id),
            "name": self.original_name,
            "size": self.size,
            "type": self.content_type,
            "state": "ready",
            "url": self.url,
        }
