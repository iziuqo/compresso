# Browser integration tests

These run inside real browser engines (Chromium, Firefox, WebKit) via Playwright,
not in Node — `compress()` ultimately calls real `Image`/`createImageBitmap`/
`OffscreenCanvas`/`convertToBlob` APIs that Node has no implementation of at all,
so nothing here can be faithfully tested outside an actual engine. Pure-logic
tests (byte parsing, dimension math, format tables) belong in `test/*.test.js`
(the `unit` project) instead — that's why the two are separate Vitest projects
rather than one suite: forcing everything through a real browser would make the
fast, no-decode-needed tests slow for no reason.

Run with `npm run test:browser`. `npm run test:dist` runs the same suite against
the build (`npm run build` first): the `dist` project points the tests' imports
of `src/` at `dist/`, so a build that breaks what the source does fails here.
The packed tarball and seven bundler apps are tested in `../bundlers/`.

## The honesty check and the known-failure list

Every test passes each result it inspects to `expectHonestResult(result, source)`
(`support/honest.js`). It re-reads the output from scratch, its magic bytes, a
fresh decode, the `file` and the object URL, and compares every field the
result claims (format, MIME types, file name, contents, sizes, dimensions,
savings) with what the bytes really are, in one assertion that lists every
mismatch. Only the pool timing tests skip it, so it never sits inside a
measured span.

A case that exposes a confirmed finding is not skipped. It goes in
`KNOWN_FAILURES` (`test/support/known-failures.js`, shared with the unit
tests), keyed by case, with the environments where it reproduces (`chromium`,
`firefox`, `webkit`, or `node`) and how it fails. By default that is an
assertion whose message names the finding (`expect(value, 'COR-10 …')`); an
entry can give its own `failsWith` instead, for example `liesAbout('format')`.
`itTracked()` (`support/known-bugs.js` here) puts the finding ID in the title
and, in those environments, requires the case to fail that exact way; a
different error still fails the test. When a fix lands, the case stops
failing and the test fails with a message to delete the entry, so the fixing
pull request deletes it and the case must then pass for real.

`findings.test.js` holds one such case for each confirmed finding the
browser can show. Findings that show in one engine only (COR-18, CMP-16,
CMP-17) force the capability or fake the encoder or decoder, so their cases
fail in every engine.

Fixtures come from `support/fixtures.js`: `fixture(name)` loads anything in
`test/fixtures/` (see its README and manifest) and checks its checksum on arrival, and `generatedImage(w, h)`
draws large photo-like images on the device.

## The files

- `findings.test.js` — a case per confirmed finding (above), plus the
  baselines they guard: one encode by default, never bigger, the fallback cap.
- `exports.test.js` — the main entry's convenience exports, run for real.
- `fixtures.test.js` runs every committed fixture through `compress()` and
  checks the result is honest and reports the manifest's size; the eight
  orientation fixtures must come out upright; the pixel flood must be refused.
- `compress.test.js` — always runs; uses the small, committed, synthetic `sample.*`
  fixtures in `test/fixtures/` so CI has real coverage without depending on personal
  photos.
- `benchmark.test.js` — always runs; uses the public, committed corpus at
  `benchmark/corpus/` (see `benchmark/README.md`) — larger and more varied than
  `test/fixtures/`'s tiny 64×64 set, so it also doubles as the input for the
  comparison figures in the README and the public benchmark suite (issue #4).
- `corpus.test.js` — additional coverage against the full local `_assets/`
  corpus (gitignored, real photos, not committed) — skips cleanly wherever that
  directory isn't present, which is every CI run today. This is where the wider
  format/EXIF sweep lives; treat a pass here as a stronger signal than
  `compress.test.js` alone, but never treat a *skip* as a failure.
- `pool.test.js`'s "decodes HEIC input through a real worker" case skips on
  Chromium and Firefox, not compresso.js's fault: Vitest's browser-mode dev
  server breaks dynamic `import()` calls made from inside a worker on those
  two engines specifically (confirmed, open upstream bug,
  [vitest-dev/vitest#6552](https://github.com/vitest-dev/vitest/issues/6552)).
  WebKit isn't affected and still runs it for real. A gap here, not silently
  assumed covered — the behavior this test exists to check was additionally
  verified by hand against a real Vite production build (`compresso-app`'s
  own), where the bug that prompted the test was originally found; see the M5
  notes in `_docs/LIB_V1_WORKERS_PLAN.md`.
