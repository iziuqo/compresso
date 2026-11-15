# RFC 0001: Results that say what happened

- Status: accepted, implemented in 1.1.0
- Findings: API-02, COR-06, COR-02, TST-08
- Decision: O4 (explicit format against never-bigger), as recommended

## Problem

A `compress()` result could contradict its own bytes. The source could come
back unchanged under a new name and the asked format's label. A browser that
can't encode a format could hand back PNG bytes labelled WebP or AVIF. A kept
JPEG said `format: 'jpg'` where a new one said `'jpeg'`. And nothing in the
result said whether the file was new, kept, or in another format than asked.

## The contract

Every result, from `compress()` and from the pool, carries the same fields,
and each one describes the bytes in `blob`:

| Field | Meaning |
| --- | --- |
| `format` | The format the bytes really are, read from their signature, in canonical names: `jpeg`, `png`, `webp`, `avif`, and for a kept source its own `gif`, `heic` or `svg`. Never `jpg` or `heif`. A kept source in a format the library doesn't know keeps its own type's name (`bmp`), or `''` when it has none. |
| `mimeType` | That format's MIME type; `blob.type` and `file.type` are the same. |
| `kept` | `true` when the source itself came back, byte for byte. |
| `reason` | Why the result isn't exactly what was asked, or `null` when it is. |
| `missedTarget` | `true` when `maxSizeMB` was out of reach even at the smallest size tried, or a kept animation is larger than it. |

`reason` is one of:

- `'not-smaller'`: kept, because no encode was smaller than the source.
- `'unsupported-format'`: this browser can't encode the asked format, so the
  result is in the best format it can encode.
- `'animated'`: kept, because the source is an animated GIF, APNG or animated
  WebP, and a re-encode would keep only its first frame. Animations come back
  untouched whatever was asked, a size or format included; `missedTarget`
  says when one is larger than `maxSizeMB`.

When more than one applies, the reason for a kept source wins, `'animated'`
first: the bytes are the source's, whatever was asked.

B7 adds `'vector'` for SVG, which comes back kept. Later reasons are added the same way; code that reads
`reason` treats an unknown one as "not what was asked".

A kept result is the source: its own bytes, file name, width and height,
and the MIME type its bytes give. An untyped source (an iPhone HEIC often has
no type) comes back labelled. A source whose name or label says another
format than its bytes (JPEG bytes in `photo.png`) comes back named and
labelled as what it is.

## Explicit formats (O4)

- `format: 'auto'` never returns a bigger file.
- An explicit format is always honoured, at the asked quality, and the result
  shows when the file grew: `savings` is negative.
- A source already in the asked format, judged by its bytes, is kept when
  re-encoding can't shrink it, so that case never grows either. PNG is the
  exception, as before: it is lossless and ignores quality, so only
  `maxSizeMB` caps it.
- A format the browser can't encode falls back to the best one it can, with
  `reason: 'unsupported-format'`.

## Names

The names match the planner (`compresso.js/plan`), whose decisions already
carry `kept` and `missedTarget`, and the multi-format plan's result shape, so
photos, videos and PDFs share one vocabulary. `detectFormat()` returns the
same canonical names.

## Compatibility

Additive: `kept` and `reason` are new fields. Two values change to tell the
truth: a JPEG's `format` is always `'jpeg'` (it was `'jpg'` for a kept file and
from `detectFormat()`), and an explicit conversion that grows now returns the
asked format instead of the source.
