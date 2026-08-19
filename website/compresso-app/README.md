# Compresso

**Make images lighter.** A small image optimizer that runs entirely on your device —
nothing is uploaded, and it works with no connection at all.

Drop in a hundred photos, watch them get pressed in parallel, and take them back.
No account, no queue, no upload bar, no server. Install it and it keeps working on a
plane.

---

## Why this exists

Every image optimizer makes you pick two out of three:

|  | private | batch | free & install-free |
|---|---|---|---|
| TinyPNG, iLoveIMG, Kraken | ✗ uploads your files | ✓ | ✓ |
| Squoosh | ✓ | ✗ one at a time | ✓ |
| ImageOptim, Optimage, Compresto | ✓ | ✓ | ✗ Mac-only |
| **Compresso** | ✓ | ✓ | ✓ |

Nothing occupied the intersection. This does.

## How it works

The compression core is [`compresso.js`](https://github.com/iziuqo/compresso) — a
~2.5 KB, zero-required-dependency library built on the browser's own codecs. The app
runs it inside a pool of Web Workers (`createImageBitmap` → `OffscreenCanvas` →
`convertToBlob`), sized from `navigator.hardwareConcurrency`, so a large batch never
touches the main thread and the interface stays at 60fps while it works.

A separate worker is held back for the live preview, so dragging the quality slider
during a 200-file batch answers immediately instead of queueing behind it. It is
counted *inside* the pool's ceiling — every busy worker can be holding a decoded
12 MP bitmap, and memory is the binding constraint, not cores.

- **Formats in:** JPEG, PNG, WebP, AVIF, GIF, BMP, **HEIC/HEIF** (iPhone photos)
- **Formats out:** AVIF, WebP, JPEG, PNG — `Auto` picks the best the browser can write
- **Never bigger:** lossy output is never larger than the source. PNG can't be
  quantised by a canvas, so keeping PNG can grow a file — the app says so, and offers
  the conversion that actually shrinks it.

## Offline

Everything is precached at install: the shell, the fonts, the icons, the compression
worker, and the HEIC decoder. That last one is ~3 MB, which is a deliberate trade —
HEIC is what an iPhone actually produces, and a decoder that needs the network is a
decoder that fails exactly when you promised it wouldn't. It downloads in the
background after first paint, so it never delays a cold start.

There is no runtime caching strategy for user content, because there is no user
content on the network. Offline isn't a degraded mode here; it's the normal one.

## Languages

English · Español · Français · Deutsch · Italiano · Português (BR) · 简体中文

Detected from the system, overridable at any time, stored locally. All seven ship in
the main bundle (~4 KB each) rather than lazily — switching language must not need a
network, or it would break offline.

Numbers are localised, not just translated: `Intl.NumberFormat` formats every byte
count and percentage, so a French UI reads `1,5 MB`. The Latin display face is scoped
by `unicode-range`; Chinese falls back to a system CJK stack, which costs zero bytes
and looks native.

## Design

**The photograph is the only colour on screen.** Everything else is black, white, or
a step between — the interface has no opinion about your image, so it doesn't put a
hue next to one. The alert red appears on exactly one condition (output grew) and
nowhere else in the app.

The vocabulary comes from darkroom apps, VSCO most directly: a true black ground,
a full-bleed hairline slider with a knob big enough to look reachable and the value
floating directly above it, 10px uppercase labels tracked wide, and a single white
pill reserved for the one action you came to take. Structure is carried by space,
not by cards. Light mode is a real inversion — paper white, ink black — rather than
a tinted variant.

Four easing curves, and none of them can overshoot: every control point sits at
y ≤ 1, so bounce is not representable in the system. There are no springs.

Details worth finding:

- Thumbnails **develop** — the blur resolving as progress climbs *is* the progress
  indicator. There's no bar behind it.
- The savings figure rolls like a counter, and only the digits that changed move.
- Each tile settles **2px upward** when its result lands. It's lighter now.
- The comparison seam has no snap. It *decelerates* into the midpoint, so the centre
  has a little weight without taking the decision from you.
- The format pill travels, and each label inverts *in place* as it passes over —
  the white copy is clipped to exactly the pill.
- Grabbing the slider dims the track, grows the knob, and lifts the value.
- Switching language doesn't swap text; it drifts out and settles back.

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build     # typecheck + production build
npm run preview   # serve the build (needed to exercise the service worker)
npm run icons     # regenerate app icons from the mark
```

### The engine is vendored, for now

`src/engine/core/` is `compresso.js` v0.4.0 vendored as **source**, because v0.4.0 —
the release that adds the worker backend — is not yet published to npm. Once it is,
delete that directory, `npm i compresso.js@^0.4.0`, and repoint the two imports.
Nothing else changes; that's why it's vendored unmodified.

## License

MIT
