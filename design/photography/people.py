"""Prepare seeded profile photos for both themes (Pillow only; run with `python -I`).

    python -I design/photography/people.py design/photography/people.json \\
        design/photography/raw/people backend/apps/demo/avatars

For each person: crop square around the face, estimate the photograph's (graded, vignetted) backdrop
as a smooth field, matte the person out by their colour distance from that field, take the backdrop
colour out of the edges, then composite onto the theme's photo-well colour. The light version keeps
the photograph's exposure; the dark version is a touch lower so faces do not glow on graphite.
Writes <key>.light.webp and <key>.dark.webp and a credits README; the review contact sheet goes beside
the raw photographs.
"""

import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageMath

SIZE = 384
WORK = 512


def oklch(L: float, C: float, h: float) -> tuple[int, int, int]:
    """OKLCH to sRGB, so the grounds match the design tokens (well, light and dark)."""
    a, b = C * math.cos(math.radians(h)), C * math.sin(math.radians(h))
    l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    rgb = (
        4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
        -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
        -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_,
    )

    def encode(c: float) -> int:
        c = max(0.0, min(1.0, c))
        return round(255 * (12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055))

    return tuple(encode(c) for c in rgb)  # type: ignore[return-value]


GROUNDS = {"light": oklch(0.9432, 0.007, 88.64), "dark": oklch(0.2463, 0.0074, 106.93)}


def border_colour(img: Image.Image) -> tuple[int, int, int]:
    """Median colour of the top band and upper sides, where the backdrop is (the body fills the bottom)."""
    w, h = img.size
    band = max(4, w // 16)
    regions = [(0, 0, w, band), (0, 0, band, h // 2), (w - band, 0, w, h // 2)]
    pixels = [p for r in regions for p in img.crop(r).get_flattened_data()]
    return tuple(sorted(p[i] for p in pixels)[len(pixels) // 2] for i in range(3))  # type: ignore[return-value]


def distance(img: Image.Image, ref: Image.Image) -> Image.Image:
    """Per-pixel colour distance (L mode, 0 to 255): the largest channel difference."""
    r, g, b = ImageChops.difference(img, ref).split()
    return ImageChops.lighter(ImageChops.lighter(r, g), b)


def backdrop_field(img: Image.Image, mask: Image.Image, radius: int) -> Image.Image:
    """Normalised convolution: blur(img * mask) / blur(mask), so the field follows the backdrop's grading."""
    blurred_mask = mask.filter(ImageFilter.GaussianBlur(radius)).convert("F")
    bands = []
    for band in img.split():
        weighted = ImageChops.multiply(band, mask).filter(ImageFilter.GaussianBlur(radius)).convert("F")
        out = ImageMath.lambda_eval(lambda a: a["w"] * 255.0 / (a["m"] + 0.5), w=weighted, m=blurred_mask)
        bands.append(out.convert("L"))
    return Image.merge("RGB", bands)


def ramp(d: Image.Image, near: int, far: int) -> Image.Image:
    span = max(1, far - near)
    return d.point(lambda v: 0 if v <= near else 255 if v >= far else round(255 * (v - near) / span))


def outer_region(size: int) -> Image.Image:
    """Where the backdrop is in a centred head-and-shoulders crop: the top band and the upper sides."""
    m = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(m)
    draw.rectangle((0, 0, size, round(size * 0.10)), fill=255)
    draw.rectangle((0, 0, round(size * 0.16), round(size * 0.62)), fill=255)
    draw.rectangle((size - round(size * 0.16), 0, size, round(size * 0.62)), fill=255)
    return m


def core_region(size: int, box: list[float] | None = None) -> Image.Image:
    """The face and body the matte must never cut into: an ellipse from the brow to below the crop."""
    x0, y0, x1, y1 = box or (0.24, 0.20, 0.76, 1.25)
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).ellipse((size * x0, size * y0, size * x1, size * y1), fill=255)
    return m.filter(ImageFilter.GaussianBlur(size / 40))


def matte(
    img: Image.Image,
    near: int,
    far: int,
    core_box: list[float] | None = None,
    gap: int = 7,
    body_box: list[float] | None = None,
) -> tuple[Image.Image, Image.Image]:
    size = img.size[0]
    core = core_region(size, core_box)
    if body_box:  # dark clothing against a darkening vignette: protect the torso as well as the face
        core = ImageChops.lighter(core, core_region(size, body_box))
    flat = Image.new("RGB", img.size, border_colour(img))
    close = distance(img, flat).point(lambda v: 255 if v < far * 1.5 else 0)
    # The backdrop field is learnt from the outer region only and extrapolated inwards by the blur,
    # so skin or clothing near the backdrop's colour never teaches it what the backdrop looks like.
    field = backdrop_field(img, ImageChops.multiply(close, outer_region(size)), radius=size // 5)
    alpha = ImageChops.lighter(ramp(distance(img, field), near, far), core)
    # Second pass: re-learn the backdrop from everything the first matte called backdrop (outside the
    # protected core) at a finer radius, so the vignette right next to the body is modelled too.
    clear = ImageChops.multiply(alpha.point(lambda v: 255 if v < 40 else 0), ImageChops.invert(core))
    field = backdrop_field(img, clear, radius=size // 12)
    alpha = ImageChops.lighter(ramp(distance(img, field), near, far), core)
    # Close pin-holes (fabric or hair near the backdrop's colour), then soften the edge.
    alpha = alpha.filter(ImageFilter.MaxFilter(gap)).filter(ImageFilter.MinFilter(gap)).filter(ImageFilter.MedianFilter(5))
    alpha = alpha.filter(ImageFilter.MinFilter(3))  # choke a pixel: drop the last of the backdrop fringe
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.2))
    return alpha, field


def decontaminate(img: Image.Image, field: Image.Image, alpha: Image.Image) -> Image.Image:
    """Recover the person's own colour at the edge: F = (I - (1 - a) B) / a, for a above a floor."""
    a = alpha.convert("F")
    bands = []
    for i_band, b_band in zip(img.split(), field.split(), strict=True):
        out = ImageMath.lambda_eval(
            lambda v: (v["i"] - (1.0 - v["a"] / 255.0) * v["b"]) / ((v["a"] + 25.0) / 280.0),
            i=i_band.convert("F"),
            b=b_band.convert("F"),
            a=a,
        )
        bands.append(out.convert("L"))  # float to 8-bit clamps to 0..255
    return Image.merge("RGB", bands)


def grade(img: Image.Image, exposure: float) -> Image.Image:
    return img.point(lambda v: max(0, min(255, round(v * exposure))))


def main(manifest: Path, src: Path, out: Path) -> None:
    people = json.loads(manifest.read_text(encoding="utf-8"))["people"]
    out.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGB", (len(people) * 200, 400), (128, 128, 128))
    credits = ["# Seeded profile photos", "", "Demo portraits, prepared by `design/photography/people.py`. Unsplash License.", ""]
    for col, (key, p) in enumerate(people.items()):
        source = Image.open(src / p["file"]).convert("RGB")
        w, h = source.size
        x0, y0, x1, y1 = p["crop"]
        box = (round(x0 * w), round(y0 * h), round(x1 * w), round(y1 * h))
        side = min(box[2] - box[0], box[3] - box[1])
        square = source.crop((box[0], box[1], box[0] + side, box[1] + side)).resize((WORK, WORK), Image.Resampling.LANCZOS)
        alpha, field = matte(square, *p["key"], p.get("core"), p.get("close", 7), p.get("body"))
        person = decontaminate(square, field, alpha)
        for row, (variant, exposure) in enumerate((("light", 1.0), ("dark", 0.93))):
            ground = Image.new("RGB", square.size, GROUNDS[variant])
            composed = Image.composite(grade(person, exposure), ground, alpha).resize((SIZE, SIZE), Image.Resampling.LANCZOS)
            composed.save(out / f"{key}.{variant}.webp", "WEBP", quality=84, method=6)
            sheet.paste(composed.resize((200, 200)), (col * 200, row * 200))
        credits.append(f"- `{key}`: [{p['title']}]({p['page']}) by {p['author']}")
    (out / "README.md").write_text("\n".join(credits) + "\n", encoding="utf-8")
    sheet.save(src / "contact-sheet.png")  # review aid, kept beside the raw photos (git-ignored)
    print(f"wrote {len(people) * 2} avatars to {out}")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
