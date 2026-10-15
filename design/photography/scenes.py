"""Prepare scene photographs for MARKET surfaces (docs/design/constitution.md, 2026-10-13 amendment).

Every photograph gets the same treatment so a page of them reads as one shoot: a crop to the slot's
shape, a gentle warm and matte grade (slightly less saturation, lifted blacks, softened highlights),
and, where white text will sit on the photograph, a darker lower third baked into the file. Writes
WebP files, a manifest with sizes and blur placeholders for next/image, and the credits README.

Usage (Pillow only; downloads are untrusted input, so run isolated):
    python -I design/photography/scenes.py design/photography/scenes.json design/photography/raw/scenes web/public/images/scenes
"""

import base64
import hashlib
import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

WARMTH = 0.025  # red up, blue down by this fraction
SATURATION = 0.9
BLACK_LIFT = 10  # out of 255: shadows read as ink, not crushed black
HIGHLIGHT = 247
SCRIM_START = 0.5  # default fraction of height where the bottom darkening begins
SCRIM_ALPHA = 150  # default darkest point at the bottom edge, out of 255


def grade(img: Image.Image) -> Image.Image:
    img = ImageEnhance.Color(img).enhance(SATURATION)
    r, g, b = img.split()
    r = r.point(lambda v: min(255, round(v * (1 + WARMTH))))
    b = b.point(lambda v: round(v * (1 - WARMTH)))
    curve = [round(BLACK_LIFT + v * (HIGHLIGHT - BLACK_LIFT) / 255) for v in range(256)]
    return Image.merge("RGB", (r, g, b)).point(curve * 3)


def scrim(img: Image.Image, start_at: float, alpha: int) -> Image.Image:
    """A darker lower part, so white text over it keeps contrast without a gradient in the interface. It
    reaches near full strength a quarter of the way down the darkened part and holds, so a whole text block
    sits on dark ground rather than only its last line."""
    w, h = img.size
    mask = Image.new("L", (1, h), 0)
    start = round(h * start_at)
    for y in range(start, h):
        t = (y - start) / max(1, h - start)
        mask.putpixel((0, y), round(alpha * min(1.0, t * 4) ** 1.2))
    mask = mask.resize((w, h))
    dark = Image.new("RGB", img.size, (8, 12, 10))
    return Image.composite(dark, img, mask)


def veil(img: Image.Image, until: float, alpha: int) -> Image.Image:
    """A light veil over the upper part, in the photograph's own top colour, so dark text there sits on a pale,
    quiet ground at any crop. It is full strength at the top and gone by `until`."""
    w, h = img.size
    top = img.crop((0, 0, w, max(1, h // 20))).resize((1, 1), Image.BOX).getpixel((0, 0))
    mask = Image.new("L", (1, h), 0)
    end = round(h * until)
    for y in range(end):
        t = 1 - y / max(1, end)
        mask.putpixel((0, y), round(alpha * min(1.0, t * 1.6) ** 1.3))
    return Image.composite(Image.new("RGB", img.size, top), img, mask.resize((w, h)))


def blur_placeholder(img: Image.Image) -> str:
    small = img.copy()
    small.thumbnail((16, 16))
    buf = io.BytesIO()
    small.filter(ImageFilter.GaussianBlur(0.6)).save(buf, "WEBP", quality=40)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def process(item: dict, raw: Path, out: Path) -> dict:
    img = Image.open(raw / item["file"]).convert("RGB")
    if crop := item.get("crop"):
        w, h = img.size
        img = img.crop((round(crop[0] * w), round(crop[1] * h), round(crop[2] * w), round(crop[3] * h)))
    target = item.get("width", 1600)
    if img.width > target:
        img = img.resize((target, round(img.height * target / img.width)), Image.LANCZOS)
    img = grade(img)
    if item.get("scrim") == "bottom":
        img = scrim(img, item.get("scrimFrom", SCRIM_START), item.get("scrimAlpha", SCRIM_ALPHA))
    if item.get("scrim") == "top-light":
        img = veil(img, item.get("veilUntil", 0.6), item.get("veilAlpha", 170))
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=82, method=6)
    data = buf.getvalue()
    # Content-addressed names: a re-edited photograph gets a new URL, so no cache serves the old one.
    name = f"{item['key']}.{hashlib.sha256(data).hexdigest()[:8]}.webp"
    for old in out.glob(f"{item['key']}.*webp"):
        old.unlink()
    (out / name).write_bytes(data)
    return {
        "key": item["key"],
        "src": f"/images/scenes/{name}",
        "file": name,
        "width": img.width,
        "height": img.height,
        "alt": item["alt"],
        "blurDataURL": blur_placeholder(img),
        # Where the subject sits (fractions of width and height): the interface's object-position, so a
        # crop to a different shape keeps the subject in frame.
        "focus": item.get("focus", [0.5, 0.5]),
        "credit": {"author": item["author"], "title": item["title"], "page": item["page"], "license": "Unsplash License"},
    }


def write_readme(entries: list[dict], out: Path) -> None:
    rows = [f"| `{e['file']}` | [{e['credit']['title']}]({e['credit']['page']}) | {e['credit']['author']} |" for e in entries]
    readme = [
        "# Scene photographs",
        "Generated by `design/photography/scenes.py` from `design/photography/scenes.json`; do not edit by hand.",
        "Photographs from Unsplash under the Unsplash License (free to use and modify; credited anyway), cropped "
        "to their slots and given one warm matte grade. They are demo material: captions never claim a place or a "
        "business the source does not state.",
        "\n".join(["| File | Source | Photographer |", "|---|---|---|", *rows]),
    ]
    (out / "README.md").write_text("\n\n".join(readme) + "\n", encoding="utf-8", newline="\n")


def main(manifest: str, raw: str, out: str) -> None:
    items = json.loads(Path(manifest).read_text(encoding="utf-8"))["photos"]
    target = Path(out)
    target.mkdir(parents=True, exist_ok=True)
    entries = []
    for item in items:
        entry = process(item, Path(raw), target)
        entries.append(entry)
        size = (target / entry["file"]).stat().st_size // 1024
        print(f"{entry['file']}: {entry['width']}x{entry['height']}, {size} KB")
    (target / "scenes.json").write_text(json.dumps({e["key"]: e for e in entries}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    write_readme(entries, target)


if __name__ == "__main__":
    main(*sys.argv[1:4])
