#!/usr/bin/env python3
"""Regenerate the derived test fixtures and rewrite manifest.json.

Every fixture except the four `sample.*` files and `photo.jpg` is derived here
from `photo.jpg` (a CC0 photo, see manifest.json) or drawn from scratch, so the
corpus stays reproducible and licence-clean. The manifest records each file's
licence, source, displayed size and SHA-256; `test/fixtures.test.js` fails if a
committed file drifts from it.

    python3 -m venv .venv && .venv/bin/pip install pillow pillow-heif
    .venv/bin/python test/fixtures/generate.py

Pillow and pillow-heif are needed only to regenerate, never to run the tests.
"""

import hashlib
import io
import json
import struct
import zlib
from pathlib import Path

from PIL import Image
from pillow_heif import register_heif_opener

register_heif_opener()
HERE = Path(__file__).parent
PHOTO = HERE / "photo.jpg"

SYNTHETIC = "MIT (this repository); synthetic, drawn by generate.py"
DERIVED = "CC0-1.0; derived from photo.jpg by generate.py"
GPS = {  # A public landmark (the Royal Observatory, Greenwich), never a real person's location.
    1: "N", 2: (51.0, 28.0, 38.0), 3: "W", 4: (0.0, 0.0, 0.0), 6: 46.0,
}

# The files this script does not write: inputs and the original fixtures.
FIXED = {
    "photo.jpg": {
        "licence": "CC0-1.0",
        "source": "https://commons.wikimedia.org/wiki/File:Lofoten,_Norway_(Unsplash).jpg (resized to 1600 px wide)",
        "stresses": "a real photograph: realistic encode sizes and the default path",
    },
    "sample.jpg": {"licence": SYNTHETIC, "source": "test/fixtures/README.md", "stresses": "a tiny JPEG"},
    "sample.png": {"licence": SYNTHETIC, "source": "test/fixtures/README.md", "stresses": "a tiny PNG"},
    "sample.heic": {"licence": SYNTHETIC, "source": "test/fixtures/README.md", "stresses": "a tiny HEIC"},
    "sample.avif": {"licence": SYNTHETIC, "source": "test/fixtures/README.md", "stresses": "a tiny AVIF"},
}


def save(name, data):
    (HERE / name).write_bytes(data)


def encoded(image, fmt, **params):
    buf = io.BytesIO()
    image.save(buf, fmt, **params)
    return buf.getvalue()


def exif_with_gps():
    exif = Image.Exif()
    exif[0x010F] = "compresso.js fixture"  # Make
    exif[0x0110] = "generate.py"  # Model
    exif.get_ifd(0x8825).update(GPS)  # GPSInfo
    return exif.tobytes()


def quadrants(width=48, height=32):
    """Four solid colours, one per corner, so any wrong rotation or mirror shows."""
    image = Image.new("RGB", (width, height))
    colours = [(220, 20, 20), (20, 200, 20), (20, 20, 220), (240, 240, 240)]  # TL, TR, BL, BR
    for i, colour in enumerate(colours):
        x, y = (i % 2) * width // 2, (i // 2) * height // 2
        image.paste(colour, (x, y, x + width // 2, y + height // 2))
    return image


# The stored pixels for each EXIF orientation: the inverse of the transform a
# viewer applies, so every file *displays* as the same upright quadrant image.
STORED = {
    1: lambda im: im,
    2: lambda im: im.transpose(Image.Transpose.FLIP_LEFT_RIGHT),
    3: lambda im: im.transpose(Image.Transpose.ROTATE_180),
    4: lambda im: im.transpose(Image.Transpose.FLIP_TOP_BOTTOM),
    5: lambda im: im.transpose(Image.Transpose.TRANSPOSE),
    6: lambda im: im.transpose(Image.Transpose.ROTATE_90),
    7: lambda im: im.transpose(Image.Transpose.TRANSVERSE),
    8: lambda im: im.transpose(Image.Transpose.ROTATE_270),
}


def orientations():
    upright = quadrants()
    entries = {}
    for tag, stored in STORED.items():
        exif = Image.Exif()
        exif[0x0112] = tag
        name = f"orientation-{tag}.jpg"
        save(name, encoded(stored(upright), "JPEG", quality=95, exif=exif.tobytes()))
        entries[name] = {
            "licence": SYNTHETIC,
            "stresses": f"EXIF orientation {tag}: displays as red, green / blue, white quadrants, 48 x 32",
            "orientation": tag,
        }
    return entries


def frames():
    colours = [(230, 60, 60), (60, 200, 60), (60, 60, 230)]
    return [Image.new("RGB", (32, 32), c) for c in colours]


def animations():
    first, *rest = frames()
    common = {"save_all": True, "append_images": rest, "duration": 200, "loop": 0}
    save("animated.gif", encoded(first, "GIF", **common))
    save("animated.png", encoded(first, "PNG", **common))
    save("animated.webp", encoded(first, "WEBP", lossless=True, **common))
    stress = "three animation frames that a re-encode flattens to one (COR-16)"
    return {name: {"licence": SYNTHETIC, "stresses": stress, "frames": 3}
            for name in ("animated.gif", "animated.png", "animated.webp")}


def pixel_flood():
    """A valid 1-pixel-of-data PNG whose header claims 100000 x 100000 (COR-09)."""
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
    ihdr = struct.pack(">IIBBBBB", 100_000, 100_000, 8, 0, 0, 0, 0)
    save("pixel-flood.png", b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
         + chunk(b"IDAT", zlib.compress(b"\x00\x00")) + chunk(b"IEND", b""))
    return {"pixel-flood.png": {"licence": SYNTHETIC, "width": 100_000, "height": 100_000,
                                "stresses": "a 10-gigapixel header in a tiny file: the pixel-flood guard"}}


def svg():
    save("vector.svg", (
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48" viewBox="0 0 64 48">'
        '<rect width="64" height="48" fill="#1e64dc"/><circle cx="32" cy="24" r="16" fill="#f0f0f0"/></svg>\n'
    ).encode())
    return {"vector.svg": {"licence": SYNTHETIC, "width": 64, "height": 48,
                           "stresses": "a vector source, returned or rejected depending on the path (COR-16, #112)"}}


def from_photo():
    photo = Image.open(PHOTO)
    small = photo.resize((800, round(800 * photo.height / photo.width)), Image.Resampling.LANCZOS)
    save("photo.heic", encoded(photo, "HEIF", quality=50))
    save("photo-truncated.jpg", PHOTO.read_bytes()[: PHOTO.stat().st_size // 3])
    save("photo-gps.jpg", encoded(small, "JPEG", quality=85, exif=exif_with_gps()))
    save("photo-gps.webp", encoded(small, "WEBP", quality=30, exif=exif_with_gps()))
    return {
        "photo.heic": {"licence": DERIVED, "stresses": "a real HEVC-coded HEIC photo, decoded natively or by heic-to"},
        "photo-truncated.jpg": {"licence": DERIVED, "width": photo.width, "height": photo.height,
                                "stresses": "the first third of photo.jpg: a broken download (COR-07)"},
        "photo-gps.jpg": {"licence": DERIVED, "gps": True,
                          "stresses": "EXIF with GPS: what a re-encode strips and a kept source leaks (COR-04)"},
        "photo-gps.webp": {"licence": DERIVED, "gps": True,
                           "stresses": "a compact WebP with GPS EXIF that a re-encode can't beat, so it is kept (COR-04)"},
    }


TYPES = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif",
         ".heic": "image/heic", ".gif": "image/gif", ".svg": "image/svg+xml"}


def describe(name, entry):
    path = HERE / name
    data = path.read_bytes()
    if "width" not in entry:
        image = Image.open(path)
        if entry.get("orientation", 1) in (5, 6, 7, 8):
            entry["width"], entry["height"] = image.height, image.width
        else:
            entry["width"], entry["height"] = image.size
    return {"file": name, "type": TYPES[path.suffix], "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(), **entry}


def main():
    generated = {**from_photo(), **orientations(), **animations(), **pixel_flood(), **svg()}
    files = [describe(name, entry) for name, entry in sorted({**FIXED, **generated}.items())]
    manifest = {
        "about": "Test fixtures for compresso.js. Regenerate with generate.py; test/fixtures.test.js checks every entry.",
        "files": files,
    }
    (HERE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"{len(files)} files, {sum(f['bytes'] for f in files):,} bytes")


if __name__ == "__main__":
    main()
