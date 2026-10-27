"""Renders the app icons and splash mark from the Compresso logo (website/public/logo.svg).

The mark is two trapezoids pressing toward the centre, drawn on a 512 grid.
Run: python3 scripts/make-icons.py  (needs Pillow)
"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'assets'
TOP = [(104, 128), (408, 128), (332, 236), (180, 236)]
BOTTOM = [(104, 384), (408, 384), (332, 276), (180, 276)]
SS = 4  # supersampling for smooth edges


def mark(size, scale, fg, bg):
    """The logo centred on a size×size canvas, scaled relative to the 512 grid."""
    big = size * SS
    im = Image.new('RGBA', (big, big), bg)
    d = ImageDraw.Draw(im)
    k = big / 512
    for poly in (TOP, BOTTOM):
        d.polygon([((256 + (x - 256) * scale) * k, (256 + (y - 256) * scale) * k) for x, y in poly], fill=fg)
    return im.resize((size, size), Image.LANCZOS)


WHITE, BLACK, CLEAR = (255, 255, 255, 255), (0, 0, 0, 255), (0, 0, 0, 0)

# iOS and the store listing: full-bleed, the system rounds the corners.
mark(1024, 0.92, WHITE, BLACK).convert('RGB').save(OUT / 'icon.png')
# Android adaptive icon: the launcher masks to the inner 66%, so the mark sits inside it.
mark(1024, 0.62, WHITE, CLEAR).save(OUT / 'android-icon-foreground.png')
mark(1024, 0.62, WHITE, CLEAR).save(OUT / 'android-icon-monochrome.png')
Image.new('RGB', (1024, 1024), (0, 0, 0)).save(OUT / 'android-icon-background.png')
# Splash: the mark alone; the background colour comes from app.json.
mark(1024, 1, WHITE, CLEAR).save(OUT / 'splash-icon.png')
mark(1024, 1, BLACK, CLEAR).save(OUT / 'splash-icon-light.png')
mark(48, 1, WHITE, BLACK).convert('RGB').save(OUT / 'favicon.png')
# Play Store listing icon: 512×512, no transparency.
mark(512, 0.92, WHITE, BLACK).convert('RGB').save(OUT / 'store-icon-512.png')
