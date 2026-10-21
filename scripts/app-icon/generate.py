#!/usr/bin/env python3
"""
Generates every app icon from the AI-generated artwork in AppIcon.png.

The artwork is a play symbol on pure black inside a *drawn* rounded square
(with a faint glow on its border) and has no transparency. Used as is, the
launcher would mask a square picture of a rounded square ("icon inside an
icon", clipped corners). So this script:

1. isolates the play symbol (largest connected bright component) and drops
   the drawn frame and its glow;
2. turns it into real transparency by "unblending" from black: the artwork
   was composed over black, so color = symbol * alpha and
   alpha = max(r, g, b) recovers soft edges and glow exactly;
3. builds an Android adaptive icon (transparent foreground + background +
   monochrome layer, symbol inside the 66dp safe zone so no mask clips it),
   legacy icons with antialiased rounded corners for Android 7, the Play
   Store icon, iOS icons (full-bleed, iOS rounds them) and the white
   notification icon.

Usage (Pillow required): python3 scripts/app-icon/generate.py
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'AppIcon.png'
RES = ROOT / 'android/app/src/main/res'
IOS_SET = ROOT / 'ios/excultus/Images.xcassets/AppIcon.appiconset'

GLYPH_THRESHOLD = 60  # max channel above which a pixel belongs to the symbol
GLYPH_SEED = (450, 620)  # a pixel inside the symbol's ribbon
HALO_PX = 24  # keeps antialiasing and glow around the symbol
SAFE_RADIUS_DP = 30  # adaptive safe zone is a 33dp radius circle; 3dp breathing room
ICON_BACKGROUND = (0, 0, 0)

DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def isolate_symbol(art: Image.Image) -> Image.Image:
    """RGBA symbol with real transparency; everything else removed."""
    r, g, b = art.split()
    brightness = ImageChops.lighter(ImageChops.lighter(r, g), b)
    binary = brightness.point(lambda v: 255 if v > GLYPH_THRESHOLD else 0)
    ImageDraw.floodfill(binary, GLYPH_SEED, 128)
    component = binary.point(lambda v: 255 if v == 128 else 0)
    region = component.filter(ImageFilter.MaxFilter(HALO_PX * 2 + 1))
    region = region.filter(ImageFilter.GaussianBlur(HALO_PX / 3))

    alpha = ImageChops.multiply(brightness, region)
    # Unblend from black: color = observed / alpha.
    out = Image.new('RGBA', art.size)
    src = art.load()
    a_px = alpha.load()
    dst = out.load()
    for y in range(art.height):
        for x in range(art.width):
            a = a_px[x, y]
            if a == 0:
                continue
            cr, cg, cb = src[x, y]
            k = 255 / max(cr, cg, cb, 1)
            dst[x, y] = (min(255, round(cr * k)), min(255, round(cg * k)), min(255, round(cb * k)), a)
    return out


def max_radius(symbol: Image.Image, center: tuple[float, float]) -> float:
    """Distance from `center` to the farthest clearly visible symbol pixel."""
    alpha = symbol.getchannel('A').point(lambda v: 255 if v > 32 else 0)
    px = alpha.load()
    cx, cy = center
    best = 0.0
    for y in range(0, symbol.height, 2):
        for x in range(0, symbol.width, 2):
            if px[x, y]:
                best = max(best, ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5)
    return best


def resize(image: Image.Image, size: int) -> Image.Image:
    """Premultiplied resampling, so transparent pixels never bleed dark fringes."""
    return image.convert('RGBa').resize((size, size), Image.LANCZOS).convert('RGBA')


def place(symbol: Image.Image, canvas_px: int, scale: float) -> Image.Image:
    """Scales the symbol about the artwork center onto a transparent square canvas."""
    scaled_size = round(symbol.width * scale)
    scaled = symbol.convert('RGBa').resize((scaled_size, scaled_size), Image.LANCZOS)
    canvas = Image.new('RGBa', (canvas_px, canvas_px))
    offset = (canvas_px - scaled_size) // 2
    canvas.paste(scaled, (offset, offset))
    return canvas.convert('RGBA')


def silhouette(symbol_canvas: Image.Image, color=(255, 255, 255)) -> Image.Image:
    """Single-color shape for themed (monochrome) and notification icons."""
    alpha = symbol_canvas.getchannel('A').point(lambda v: 0 if v < 48 else min(255, (v - 48) * 3))
    out = Image.new('RGBA', symbol_canvas.size, color + (0,))
    out.putalpha(alpha)
    return out


def rounded_mask(size: int, radius_ratio: float, inset_ratio: float, circle=False) -> Image.Image:
    """Antialiased mask (drawn 4x larger, then downsampled)."""
    big = size * 4
    mask = Image.new('L', (big, big), 0)
    draw = ImageDraw.Draw(mask)
    inset = round(big * inset_ratio)
    box = (inset, inset, big - inset - 1, big - inset - 1)
    if circle:
        draw.ellipse(box, fill=255)
    else:
        draw.rounded_rectangle(box, radius=round(big * radius_ratio), fill=255)
    return mask.resize((size, size), Image.LANCZOS)


def on_background(foreground: Image.Image) -> Image.Image:
    base = Image.new('RGBA', foreground.size, ICON_BACKGROUND + (255,))
    return Image.alpha_composite(base, foreground)


def save(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)
    print('wrote', path.relative_to(ROOT))


def main() -> None:
    art = Image.open(SOURCE).convert('RGB')
    center = (art.width / 2, art.height / 2)
    symbol = isolate_symbol(art)
    radius = max_radius(symbol, center)

    # Adaptive icon: 108dp canvas, symbol within the safe-zone circle.
    master_dp_px = 10  # master rendered at 1080px (108dp * 10)
    master = place(symbol, 108 * master_dp_px, SAFE_RADIUS_DP * master_dp_px / radius)
    mono = silhouette(master)
    for name, factor in DENSITIES.items():
        folder = RES / f'mipmap-{name}'
        size = round(108 * factor)
        save(resize(master, size), folder / 'ic_launcher_foreground.png')
        save(resize(mono, size), folder / 'ic_launcher_monochrome.png')

        # Legacy (Android 7): 48dp, antialiased rounded square / circle.
        legacy = round(48 * factor)
        tile = resize(on_background(master), legacy)
        square = Image.new('RGBA', (legacy, legacy))
        square.paste(tile, (0, 0), rounded_mask(legacy, 0.2, 1 / 48))
        save(square, folder / 'ic_launcher.png')
        round_icon = Image.new('RGBA', (legacy, legacy))
        round_icon.paste(tile, (0, 0), rounded_mask(legacy, 0, 1 / 48, circle=True))
        save(round_icon, folder / 'ic_launcher_round.png')

        # Notification: white silhouette in 24dp with 2dp padding.
        notification = round(24 * factor)
        glyph = silhouette(place(symbol, notification * 8, (notification * 8 * 10 / 24) / radius))
        save(resize(glyph, notification), RES / f'drawable-{name}' / 'ic_notification.png')

    # Play Store: 512px full-bleed square; the store applies its own mask.
    save(resize(on_background(master), 512).convert('RGB'), ROOT / 'android/app/src/main/ic_launcher-playstore.png')

    # iOS: opaque full-bleed squares (iOS rounds the corners). Same symbol
    # proportion as the original artwork's tile (~1025px wide).
    ios_master = on_background(place(symbol, 1024, 1024 / 1025)).convert('RGB')
    contents = json.loads((IOS_SET / 'Contents.json').read_text())
    for entry in contents['images']:
        points = float(entry['size'].split('x')[0])
        scale = int(entry['scale'].rstrip('x'))
        pixels = round(points * scale)
        filename = f'icon-{pixels}.png'
        entry['filename'] = filename
        save(ios_master.resize((pixels, pixels), Image.LANCZOS), IOS_SET / filename)
    (IOS_SET / 'Contents.json').write_text(json.dumps(contents, indent=2) + '\n')
    print('updated', (IOS_SET / 'Contents.json').relative_to(ROOT))


if __name__ == '__main__':
    main()
