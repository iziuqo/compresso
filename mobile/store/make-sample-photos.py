"""Sample photos for the store screenshots and the reel.

Painterly, generated, and in the same leaf style as the website's demo
images, so the listing never shows a real person's photo. They are big,
grainy, full-quality JPEGs, the way phone photos are, so the savings shown
are honest. Run: python3 store/make-sample-photos.py OUT_DIR
"""
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

PALETTES = {
    'sage':   [(214, 160, 120), (120, 170, 90), (70, 120, 60), (190, 200, 120), (240, 190, 150)],
    'lagoon': [(30, 110, 130), (80, 170, 170), (20, 60, 90), (150, 210, 200), (240, 220, 180)],
    'dusk':   [(110, 70, 160), (200, 110, 170), (60, 40, 110), (240, 170, 140), (160, 140, 220)],
    'coral':  [(210, 90, 90), (240, 150, 120), (130, 50, 70), (250, 210, 170), (90, 140, 120)],
    'meadow': [(150, 190, 70), (90, 150, 60), (230, 210, 90), (50, 100, 50), (200, 230, 150)],
    'harbor': [(40, 70, 120), (90, 140, 190), (220, 200, 160), (20, 40, 70), (170, 190, 210)],
}


def paint(name, size, seed):
    rnd = random.Random(seed)
    pal = PALETTES[name]
    w, h = size
    base = Image.new('RGB', (w // 2, h // 2), pal[0])
    layer = Image.new('RGBA', base.size)
    d = ImageDraw.Draw(layer)
    for _ in range(1100):
        cx, cy = rnd.uniform(-50, base.width + 50), rnd.uniform(-50, base.height + 50)
        rx = rnd.uniform(40, 240)
        ry = rx * rnd.uniform(0.18, 0.4)
        col = rnd.choice(pal) + (rnd.randint(70, 190),)
        leaf = Image.new('RGBA', (int(rx * 2) + 2, int(rx * 2) + 2))
        ImageDraw.Draw(leaf).ellipse([1, rx - ry, rx * 2, rx + ry], fill=col)
        leaf = leaf.rotate(rnd.uniform(0, 180), resample=Image.BICUBIC)
        layer.alpha_composite(leaf, (int(cx - rx), int(cy - rx)))
    base = Image.alpha_composite(base.convert('RGBA'), layer).convert('RGB')
    base = base.filter(ImageFilter.GaussianBlur(1.2)).resize(size, Image.LANCZOS)
    # Light falls from one corner, like a photo taken outdoors.
    yy, xx = np.mgrid[0:h, 0:w]
    light = 1.12 - 0.35 * np.hypot((xx - w * 0.3) / w, (yy - h * 0.25) / h)
    base = Image.fromarray(np.clip(np.asarray(base) * light[..., None], 0, 255).astype(np.uint8))
    # Sensor grain: what makes a real phone photo heavy.
    arr = np.asarray(base).astype(np.int16)
    arr += np.random.default_rng(seed).normal(0, 7, arr.shape).astype(np.int16)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


if __name__ == '__main__':
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    for i, name in enumerate(PALETTES):
        size = (3024, 4032) if i % 3 == 1 else (4032, 3024)
        paint(name, size, i + 7).save(out / f'{i + 1:02d}-{name}.jpg', quality=95, subsampling=0)
        print(name, (out / f'{i + 1:02d}-{name}.jpg').stat().st_size)
