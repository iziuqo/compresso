"""Sample photos for the store screenshots and the reel.

The pictures in store/photos come from generate-photos.mjs (OpenAI Images),
so the listing never shows a real person's photo. This script brings them to
phone size (12 MP) with light sensor grain and saves full-quality JPEGs, the
way a phone camera does, so the savings shown are honest.
Run: python3 store/make-sample-photos.py OUT_DIR
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

SRC = Path(__file__).parent / 'photos'


def phone(src, seed):
    im = Image.open(src).convert('RGB')
    size = (3024, 4032) if im.height > im.width else (4032, 3024)
    im = im.resize(size, Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=40, threshold=2))
    # Sensor grain: what makes a real phone photo heavy.
    arr = np.asarray(im).astype(np.int16)
    arr += np.random.default_rng(seed).normal(0, 4, arr.shape).astype(np.int16)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


if __name__ == '__main__':
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    for i, src in enumerate(sorted(SRC.glob('*.jpg'))):
        dest = out / src.name
        phone(src, i + 7).save(dest, quality=95, subsampling=0)
        print(src.stem, dest.stat().st_size)
