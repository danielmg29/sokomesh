"""Cut product photographs out of their grounds (docs/design/constitution.md, 2026-10-13 amendment).

Each photograph in sources.json is keyed against its own ground, so the product keeps its pixels and loses
the backdrop. The web layer then sets the cut-out on the theme's `well` token: one file shows the product
on light stone or on dark graphite with the colour mode, and no copy of a token colour is baked in.

Per-photo options in sources.json:
  crop    [left, top, right, bottom] as fractions of the original
  erase   list of [left, top, right, bottom] fractions of the original forced transparent (props in shot)
  ground  how the ground is measured:
            "border"      (default) the median colour of the outer frame
            "columns"     a smooth field from the left and right edges of every row (graded studio sweeps)
            [r, g, b]     a known colour
            "saturation"  distance is colourfulness: removes neutral plates and cloths from a coloured product
            "channel:R|G|B"  distance is that channel's value: removes a dark ground that is low in it
  key     [near, far]: distances below `near` are ground, above `far` are product, a soft ramp between
  open    removes specks smaller than this many pixels from the matte (morphological opening)
  shadow  contact-shadow alpha, 0 to 255 (default 70)

Usage (Pillow only; downloads are untrusted input, so run isolated):
    python -I design/photography/cutout.py design/photography/sources.json design/photography/raw web/public/images/products
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageMath

MAX_SIDE = 900  # rendered at most ~300 CSS px wide in a well; 3x covers dense screens
SEED_STEP = 12  # border flood-fill seeds every N px


def border_colour(img: Image.Image) -> tuple[int, int, int]:
    """Median of the outer 2% frame."""
    w, h = img.size
    band = max(2, round(min(w, h) * 0.02))
    px = []
    for box in ((0, 0, w, band), (0, h - band, w, h), (0, 0, band, h), (w - band, 0, w, h)):
        px.extend(img.crop(box).resize((64, 64)).get_flattened_data())
    return tuple(sorted(c[i] for c in px)[len(px) // 2] for i in range(3))


def column_field(img: Image.Image) -> Image.Image:
    """The ground as a smooth field: each row runs from its left-edge colour to its right-edge colour."""
    w, h = img.size
    band = max(2, round(w * 0.02))
    left = img.crop((0, 0, band, h)).resize((1, h), Image.BOX)
    right = img.crop((w - band, 0, w, h)).resize((1, h), Image.BOX)
    edges = Image.new('RGB', (2, h))
    edges.paste(left, (0, 0))
    edges.paste(right, (1, 0))
    return edges.resize((w, h), Image.BILINEAR).filter(ImageFilter.GaussianBlur(8))


def max_channel(img: Image.Image) -> Image.Image:
    r, g, b = img.split()
    return ImageChops.lighter(ImageChops.lighter(r, g), b)


def min_channel(img: Image.Image) -> Image.Image:
    r, g, b = img.split()
    return ImageChops.darker(ImageChops.darker(r, g), b)


def measure(img: Image.Image, ground) -> tuple[Image.Image, Image.Image]:
    """(distance from ground, ground field used to clean edge colour)."""
    if ground == 'columns':
        field = column_field(img)
        return max_channel(ImageChops.difference(img, field)), field
    if ground == 'saturation':
        return ImageChops.subtract(max_channel(img), min_channel(img)), Image.new('RGB', img.size, border_colour(img))
    if isinstance(ground, str) and ground.startswith('channel:'):
        return img.getchannel(ground.split(':')[1]), Image.new('RGB', img.size, border_colour(img))
    colour = tuple(ground) if isinstance(ground, list) else border_colour(img)
    field = Image.new('RGB', img.size, colour)
    return max_channel(ImageChops.difference(img, field)), field


def matte(dist: Image.Image, near: int, far: int) -> Image.Image:
    """Alpha from distance. Only ground connected to the frame is removed, so product pixels that happen to
    match it (white sugar inside a bowl) survive."""
    ramp = dist.point(lambda v: 0 if v <= near else 255 if v >= far else round((v - near) * 255 / (far - near)))
    groundish = dist.point(lambda v: 255 if v < far else 0)
    w, h = groundish.size
    seeds = [(x, y) for x in range(0, w, SEED_STEP) for y in (0, h - 1)] + [(x, y) for y in range(0, h, SEED_STEP) for x in (0, w - 1)]
    for xy in seeds:
        if groundish.getpixel(xy) == 255:
            ImageDraw.floodfill(groundish, xy, 128)
    connected = groundish.point(lambda v: 255 if v == 128 else 0)
    alpha = Image.composite(ramp, Image.new('L', dist.size, 255), connected)
    # Close the fringe: erode one pixel, then soften the edge.
    return alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))


def decontaminate(img: Image.Image, alpha: Image.Image, field: Image.Image) -> Image.Image:
    """Remove the ground's colour from semi-transparent edge pixels (C = aF + (1 - a)B, solved for F), so a
    studio halo does not glow on the dark well."""
    a = alpha.convert('F')
    bands = []
    for band, ground in zip(img.split(), field.split()):
        f = ImageMath.lambda_eval(
            lambda e: e['max'](e['min']((e['c'] - (255.0 - e['a']) * e['b'] / 255.0) * 255.0 / e['max'](e['a'], 1.0), 255.0), 0.0),
            c=band.convert('F'), a=a, b=ground.convert('F'),
        )
        bands.append(f.convert('L'))
    return Image.merge('RGBA', (*bands, alpha))


def contact_shadow(cut: Image.Image, strength: int) -> Image.Image:
    """A short ground shadow under the product so it sits on the well rather than floating. Pure black at
    low alpha, so it reads on both wells."""
    w, h = cut.size
    bbox = cut.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    if not bbox or strength <= 0:
        return cut
    x0, _, x1, y1 = bbox
    pad = round(h * 0.06)
    canvas = Image.new('RGBA', (w, h + pad), (0, 0, 0, 0))
    shadow = Image.new('L', canvas.size, 0)
    ImageDraw.Draw(shadow).ellipse((x0 + (x1 - x0) * 0.08, y1 - pad * 0.35, x1 - (x1 - x0) * 0.08, y1 + pad * 0.55), fill=strength)
    shadow = shadow.filter(ImageFilter.GaussianBlur(pad * 0.45))
    canvas.paste(Image.new('RGBA', canvas.size, (0, 0, 0, 255)), (0, 0), shadow)
    canvas.alpha_composite(cut, (0, 0))
    return canvas


def frac_box(box: list[float], size: tuple[int, int]) -> tuple[int, int, int, int]:
    w, h = size
    return round(box[0] * w), round(box[1] * h), round(box[2] * w), round(box[3] * h)


def process(item: dict, raw: Path, out: Path) -> Path:
    img = Image.open(raw / item['file']).convert('RGB')
    keep = Image.new('L', img.size, 255)
    for box in item.get('erase', []):
        ImageDraw.Draw(keep).rectangle(frac_box(box, img.size), fill=0)
    if crop := item.get('crop'):
        box = frac_box(crop, img.size)
        img, keep = img.crop(box), keep.crop(box)
    dist, field = measure(img, item.get('ground', 'border'))
    near, far = item.get('key', [18, 46])
    alpha = ImageChops.multiply(matte(dist, near, far), keep)
    if size := item.get('open'):
        alpha = alpha.filter(ImageFilter.MinFilter(size)).filter(ImageFilter.MaxFilter(size))
    cut = decontaminate(img, alpha, field)
    cut = cut.crop(alpha.point(lambda v: 255 if v > 8 else 0).getbbox() or (0, 0, *cut.size))
    cut = contact_shadow(cut, item.get('shadow', 70))
    cut.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    dest = out / f"{item['key_name']}.webp"
    cut.save(dest, 'WEBP', quality=84, method=6)
    return dest


CREDIT_KEYS = ('key_name', 'product', 'title', 'author', 'license', 'page')
SHARE_ALIKE = 'CC BY-SA'


def write_credits(items: list[dict], out: Path) -> None:
    """credits.json (read by the design-system page) and README.md, both from the manifest, so a credit can
    never drift from the file it describes."""
    credits = [{k: item[k] for k in CREDIT_KEYS} for item in items]
    (out / 'credits.json').write_text(json.dumps(credits, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')
    rows = [f"| `{c['key_name']}.webp` | {c['product']} | [{c['title']}]({c['page']}) | {c['author']} | {c['license']} |" for c in credits]
    readme = [
        '# Demo product photographs',
        'Generated by `design/photography/cutout.py` from `design/photography/sources.json`; do not edit by hand.',
        'Open-licence photographs from Wikimedia Commons, cut out of their backgrounds (cropped, keyed, edge-cleaned, '
        "given a contact shadow and resized) so the theme's `well` colour shows behind them. They show the goods, not the "
        'packaging of the invented demo brands, and are demo material only.',
        f'The cut-outs of {SHARE_ALIKE} photographs are adaptations and are shared under the same licence as their source.',
        '\n'.join(['| File | Demo product | Source | Author | Licence |', '|---|---|---|---|---|', *rows]),
    ]
    (out / 'README.md').write_text('\n\n'.join(readme) + '\n', encoding='utf-8', newline='\n')


def main(manifest: str, raw: str, out: str) -> None:
    items = json.loads(Path(manifest).read_text(encoding='utf-8'))['photos']
    only = set(sys.argv[4:])
    Path(out).mkdir(parents=True, exist_ok=True)
    write_credits(items, Path(out))
    for item in items:
        if only and item['key_name'] not in only:
            continue
        dest = process(item, Path(raw), Path(out))
        with Image.open(dest) as done:
            print(f'{dest.name}: {done.size[0]}x{done.size[1]}, {dest.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main(*sys.argv[1:4])
