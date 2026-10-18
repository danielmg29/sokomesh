"""SM-F-05 media pipeline: product photographs from upload to public display.

1. `accept_upload` checks the bytes (type by signature, size, count per product, duplicates), stores the
   original privately and queues the asset. It never decodes the image on the request thread.
2. `process` runs in a bounded background job: it reads the image's own header for its dimensions,
   refuses what is not a usable photograph, strips metadata (EXIF, GPS, XMP, IPTC, comments) by rewriting
   the container without decoding, and writes that copy as the public display image.
3. Responsive sizes come from the web tier's image optimizer, from the display copy, at the bounded
   widths recorded in `derivatives` (no pixel library on the API server). Originals are served only through
   short-lived signed links.

Jobs run in a small in-process pool (`AC_MEDIA["workers"]`, at most `AC_MEDIA["queue"]` waiting); anything
the pool does not take stays queued for `manage.py process_media`, the worker for production.
"""

import hashlib
import struct
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.core import signing
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import UploadedFile
from django.db import connections, transaction
from django.utils import timezone

from apps.catalog.models import MEDIA_LIMIT, MediaAsset, Product
from apps.media.services import sniff
from core.api import invalid

EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
RESPONSIVE_WIDTHS = (320, 480, 640, 960, 1280, 1920)
ORIGINAL_SALT = "catalog.media.original"
ORIGINAL_LINK_SECONDS = 600


class Unusable(Exception):
    """The file is not a photograph SokoMesh can show; the message is the seller's reason."""


# --- reading containers (headers only, no pixel decoding) -------------------------------------------


def dimensions(data: bytes, mime: str) -> tuple[int, int]:
    if mime == "image/png":
        if len(data) < 24 or data[12:16] != b"IHDR":
            raise Unusable("The PNG file is damaged.")
        return struct.unpack(">II", data[16:24])
    if mime == "image/jpeg":
        return _jpeg_size(data)
    if mime == "image/webp":
        return _webp_size(data)
    raise Unusable("Upload a JPEG, PNG or WebP photograph.")


def _jpeg_size(data: bytes) -> tuple[int, int]:
    i = 2
    while i + 9 < len(data):
        if data[i] != 0xFF:
            raise Unusable("The JPEG file is damaged.")
        marker = data[i + 1]
        if marker == 0xFF:  # fill byte
            i += 1
            continue
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            i += 2
            continue
        length = struct.unpack(">H", data[i + 2 : i + 4])[0]
        if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
            height, width = struct.unpack(">HH", data[i + 5 : i + 9])
            return width, height
        i += 2 + length
    raise Unusable("The JPEG file has no image size.")


def _webp_chunks(data: bytes):
    i = 12
    while i + 8 <= len(data):
        kind, size = data[i : i + 4], struct.unpack("<I", data[i + 4 : i + 8])[0]
        yield kind, i, data[i + 8 : i + 8 + size]
        i += 8 + size + (size & 1)


def _webp_size(data: bytes) -> tuple[int, int]:
    for kind, _, body in _webp_chunks(data):
        if kind == b"VP8X" and len(body) >= 10:
            return 1 + int.from_bytes(body[4:7], "little"), 1 + int.from_bytes(body[7:10], "little")
        if kind == b"VP8 " and len(body) >= 10 and body[3:6] == b"\x9d\x01\x2a":
            return struct.unpack("<H", body[6:8])[0] & 0x3FFF, struct.unpack("<H", body[8:10])[0] & 0x3FFF
        if kind == b"VP8L" and len(body) >= 5 and body[0] == 0x2F:
            bits = int.from_bytes(body[1:5], "little")
            return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    raise Unusable("The WebP file has no image size.")


def strip_metadata(data: bytes, mime: str) -> bytes:
    """The same image without the parts that can identify a person or a place."""
    if mime == "image/jpeg":
        out, i = bytearray(data[:2]), 2
        while i + 4 <= len(data):
            marker = data[i + 1]
            if marker == 0xDA:  # start of scan: the image data runs to the end
                out += data[i:]
                break
            length = struct.unpack(">H", data[i + 2 : i + 4])[0]
            segment = data[i : i + 2 + length]
            if marker not in (0xE1, 0xED, 0xFE):  # Exif/XMP, IPTC/Photoshop, comments
                out += segment
            i += 2 + length
        return bytes(out)
    if mime == "image/png":
        out, i = bytearray(data[:8]), 8
        while i + 12 <= len(data):
            size = struct.unpack(">I", data[i : i + 4])[0]
            kind = data[i + 4 : i + 8]
            chunk = data[i : i + 12 + size]
            if kind not in (b"tEXt", b"zTXt", b"iTXt", b"eXIf", b"tIME"):
                out += chunk
            i += 12 + size
            if kind == b"IEND":
                break
        return bytes(out)
    if mime == "image/webp":
        body = bytearray()
        for kind, start, chunk in _webp_chunks(data):
            if kind in (b"EXIF", b"XMP "):
                continue
            raw = bytearray(data[start : start + 8 + len(chunk) + (len(chunk) & 1)])
            if kind == b"VP8X":
                raw[8] &= ~0x0C & 0xFF  # no Exif or XMP flags any more
            body += raw
        return b"RIFF" + struct.pack("<I", 4 + len(body)) + b"WEBP" + bytes(body)
    return data


# --- upload, jobs and processing --------------------------------------------------------------------------


def accept_upload(product: Product, upload: UploadedFile, *, alt_text: str = "") -> MediaAsset:
    rules = settings.AC_UPLOADS["product_image"]
    if product.media.count() >= MEDIA_LIMIT:  # pyright: ignore[reportAttributeAccessIssue]
        invalid({"file": [f"A product has at most {MEDIA_LIMIT} photographs. Remove one first."]})
    if upload.size is None or upload.size > rules["max_bytes"]:
        invalid({"file": [f"Photographs can be up to {rules['max_bytes'] // 1_048_576} MB."]})
    upload.seek(0)
    mime = sniff(upload.read(16))
    if mime is None or mime not in rules["types"]:
        invalid({"file": ["Upload a JPEG, PNG or WebP photograph."]})
    digest = hashlib.sha256()
    upload.seek(0)
    for chunk in upload.chunks():
        digest.update(chunk)
    sha = digest.hexdigest()
    if MediaAsset.objects.filter(product=product, sha256=sha).exists():
        invalid({"file": ["This photograph is already on the product."]})
    asset = MediaAsset(
        seller=product.seller,
        product=product,
        original_name="".join(c for c in (upload.name or "photo") if c.isalnum() or c in " ._-")[-160:] or "photo",
        mime_type=mime,
        size_bytes=upload.size,
        sha256=sha,
        alt_text=(alt_text or product.name)[:200],
        sort_order=product.media.count(),  # pyright: ignore[reportAttributeAccessIssue]
    )
    upload.seek(0)
    seller_id = product.seller_id  # pyright: ignore[reportAttributeAccessIssue]
    asset.object_key = default_storage.save(f"products/{seller_id}/{asset.pk}/original.{EXTENSIONS[mime]}", upload)
    asset.save()
    transaction.on_commit(lambda: enqueue(asset.pk))
    return asset


def process(asset_id: Any) -> None:
    """Verify, measure and strip one queued asset. Safe to run twice: only a queued asset is taken."""
    with transaction.atomic():
        asset = MediaAsset.objects.select_for_update(skip_locked=True, of=("self",)).filter(pk=asset_id).first()
        if asset is None or asset.processing_status != MediaAsset.Processing.QUEUED:
            return
        asset.processing_status = MediaAsset.Processing.PROCESSING
        asset.save(update_fields=["processing_status"])
    limits = settings.AC_MEDIA
    try:
        with default_storage.open(asset.object_key, "rb") as f:
            data = f.read()
        width, height = dimensions(data, asset.mime_type)
        if width * height > limits["max_pixels"]:
            raise Unusable(f"The photograph is larger than {limits['max_pixels'] // 1_000_000} megapixels.")
        if max(width, height) < limits["min_long_side"]:
            raise Unusable(
                f"The photograph is too small: make its longer side at least {limits['min_long_side']} pixels."
            )
        clean = strip_metadata(data, asset.mime_type)
        seller_id = asset.seller_id  # pyright: ignore[reportAttributeAccessIssue]
        key = default_storage.save(
            f"products/{seller_id}/{asset.pk}/display.{EXTENSIONS[asset.mime_type]}", ContentFile(clean)
        )
        asset.width_px, asset.height_px = width, height
        asset.derivatives = {
            "display": {"key": key, "format": asset.mime_type, "width": width, "height": height, "bytes": len(clean)},
            "widths": [w for w in RESPONSIVE_WIDTHS if w <= width] or [width],
        }
        asset.scan_status, asset.processing_status = MediaAsset.Scan.CLEAN, MediaAsset.Processing.READY
    except Unusable as problem:
        asset.scan_status, asset.processing_status = MediaAsset.Scan.REJECTED, MediaAsset.Processing.FAILED
        asset.rejection_reason = str(problem)[:200]
    except Exception:  # a storage or parsing fault: say so, and let the worker command retry later
        asset.scan_status, asset.processing_status = MediaAsset.Scan.FAILED, MediaAsset.Processing.FAILED
        asset.rejection_reason = "The photograph could not be checked. Try uploading it again."
    asset.processed_at = timezone.now()
    asset.save()
    # The product's search document and public images change once a photograph is ready.
    from apps.catalog.search import index

    if asset.product_id is not None:  # pyright: ignore[reportAttributeAccessIssue]
        index(Product.objects.get(pk=asset.product_id))  # pyright: ignore[reportAttributeAccessIssue]


_pool: ThreadPoolExecutor | None = None
_slots = threading.BoundedSemaphore(int(getattr(settings, "AC_MEDIA", {}).get("queue", 8)))


def enqueue(asset_id: Any) -> None:
    """Process now (tests, seeding), in the bounded pool, or leave queued for the worker command."""
    global _pool
    if settings.AC_MEDIA["eager"]:
        process(asset_id)
        return
    if not _slots.acquire(blocking=False):
        return  # the pool is full: `process_media` takes it from the queue
    if _pool is None:
        _pool = ThreadPoolExecutor(max_workers=settings.AC_MEDIA["workers"], thread_name_prefix="media")

    def run() -> None:
        try:
            process(asset_id)
        finally:
            connections.close_all()
            _slots.release()

    _pool.submit(run)


def requeue_stuck(older_than: timedelta = timedelta(minutes=10)) -> int:
    """Assets left processing by a stopped worker go back to the queue."""
    cutoff = timezone.now() - older_than
    return MediaAsset.objects.filter(processing_status=MediaAsset.Processing.PROCESSING, created_at__lt=cutoff).update(
        processing_status=MediaAsset.Processing.QUEUED
    )


def remove(asset: MediaAsset) -> None:
    keys = [asset.object_key, (asset.derivatives.get("display") or {}).get("key")]
    product_id = asset.product_id  # pyright: ignore[reportAttributeAccessIssue]
    asset.delete()
    for key in filter(None, keys):
        transaction.on_commit(lambda key=key: default_storage.delete(key))
    if product_id:
        from apps.catalog.search import index

        index(Product.objects.get(pk=product_id))


# --- delivery ---------------------------------------------------------------------------------------------


def display_url(asset: MediaAsset) -> str:
    return f"{settings.AC_CONTRACT['api_base']}media/{asset.pk}"


def original_url(asset: MediaAsset) -> str:
    token = signing.TimestampSigner(salt=ORIGINAL_SALT).sign(str(asset.pk))
    return f"{settings.AC_CONTRACT['api_base']}media/{asset.pk}/original?t={token}"


def check_original_token(asset_id: str, token: str) -> bool:
    try:
        return signing.TimestampSigner(salt=ORIGINAL_SALT).unsign(token, max_age=ORIGINAL_LINK_SECONDS) == asset_id
    except signing.BadSignature:
        return False


def image_value(asset: MediaAsset) -> dict[str, Any]:
    """A ready photograph as the gallery and product cells read an image value."""
    return {
        "url": display_url(asset),
        "alt": asset.alt_text,
        "width": asset.width_px,
        "height": asset.height_px,
        "widths": asset.derivatives.get("widths", []),
    }
