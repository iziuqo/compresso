# The device lab

`lab/index.html` runs compresso.js's conformance checks in whatever browser
opens it: a phone, a simulator, a desktop browser, or CI. It draws its large
test images on the device, runs the built library (`dist/`) on them and on
the committed fixtures (`test/fixtures/`), and shows pass or fail per check
with what really came back. **Copy report** copies the whole report as JSON,
the environment included.

The page has no analytics and sends nothing anywhere unless its link carries
`?report=<http(s) address>`, which it names on the page before it runs. It carries
`<meta name="robots" content="noindex, nofollow">` and belongs in no sitemap.

## Opening it

Every merge to `main` that changes the package publishes the page to GitHub
Pages, so any phone or browser can open it at
<https://iziuqo.github.io/compresso/lab/> (`.github/workflows/lab-pages.yml`).
To run your own build:

```bash
npm run build                 # in packages/compresso
python3 -m http.server 8080   # any static server, from packages/compresso
```

Then open <http://localhost:8080/lab/>. From a phone on the same network, use
the computer's address instead of `localhost`; the page works the same, but
outside a secure context **Copy report** falls back to selecting the text.

The page needs these paths, served side by side as they are in this package:
`lab/`, `dist/`, `test/fixtures/` and `test/support/formats.js` (the format
sniffer the browser tests use too).

### URL parameters

| Parameter | Effect |
| --- | --- |
| `?only=encoders,heic` | Runs only the named checks, in the page's order. An unknown name is reported as a failed check. |
| `?report=<url>` | When done, POSTs the report there as JSON (sent as `text/plain`, so any server takes it). Without it, nothing leaves the page. |

The finished report is also `window.labReport`, and the page sets
`data-lab-done="true"` on `<html>` once it is complete.

## How it is built

- `lab.js` is the page's own script. It is ES5 on purpose (no arrow
  functions, classes, `let`/`const`, template literals or `async`), and
  feature-detects everything newer, so a browser below the library's floor
  still shows its environment and why nothing ran, instead of a blank page. It
  reads the environment, runs the checks one at a time, each within its own
  timeout, and builds the report. Safari's version comes from its `Version/`
  token, and on iOS so does the OS version: iOS 26 Safari still says
  "iPhone OS 18_7".
- `checks.mjs` is a module script that imports `../dist/compresso.mjs` and
  `../dist/compresso.pool.mjs`, as a page without a bundler would, and
  registers the checks. If it fails to load or parse, the page says "library
  did not load" with the error.
- An import map points the main thread's `import('heic-to')` at
  `dist/heic-to.js`, which is how a host without a bundler serves HEIC
  decoding.
- Generated images are drawn with `putImageData` from integer hashes, so
  every browser encodes exactly the same pixels and sizes compare across
  browsers.

A check returns `{ pass, finding, summary, details }`. A failure it returns is
the symptom it measures and names that finding; a thrown error or a timeout
names none.

## The checks

| Check | Passes when | Finding |
| --- | --- | --- |
| `encoders` | For WebP, AVIF, JPEG and PNG, on `<canvas>` and `OffscreenCanvas`: every blob is the type its label claims, and lossy output at quality 0.5 is smaller than at 0.9. Records the label, first 12 bytes and both sizes. | CMP-16 |
| `jpeg-size` | JPEG at quality 0.8 of a 2 MP texture is at most 1.5 times Chromium's size (reference in `checks.mjs`). | CMP-18 |
| `default-12mp` | A 12 MP JPEG with defaults comes back smaller, as the format it claims, at the size it reports. | From the wrong claim: CMP-16 (AVIF label), COR-01 (size), COR-06 (source renamed) |
| `explicit-webp`, `explicit-avif` | `format: 'webp'` / `'avif'` on a 2 MP PNG gives bytes in the claimed format, or, where the browser can't encode it, an honest WebP or JPEG. | COR-02 |
| `long-screenshot` | An 800 × 16000 PNG with defaults decodes at least 720 px wide (COR-18 when the JPEG fallback's cap narrows it). | COR-18 |
| `target-1mb` | A 12 MP photo with `maxSizeMB: 1` comes back at or under 1 MB; the time it took is in the report. | |
| `orientation`, `pool-orientation` | All eight EXIF orientation fixtures come back 48 × 32 and upright, quadrant colours read back where the canvas allows (sizes only otherwise, and the report says so). | |
| `heic`, `pool-heic` | `photo.heic` comes back as a real image in another format, labelled as what its bytes are. | COR-06 |
| `pool-basic` | Real workers (`stats().size > 0`) compress a 12 MP JPEG honestly. | As `default-12mp` |
| `pool-parallel` | `compressMany()` of four on `createPool({ size: 2 })` has two busy at once, fulfils all four honestly and reports progress for each. | |
| `pool-cancel` | Aborting an in-flight job rejects it with kind `aborted`, and the freed worker takes the next job. | |
| `pool-timeout` | `timeoutMs: 1` rejects with kind `timeout`, and the worker is replaced. | |
| `pool-fallback` | With `OffscreenCanvas` removed, `createPool()` falls back to the main thread and stays honest. | |
| `pool-missing-worker` | A `workerUrl` that answers 404 is retried at most twice in 3 s (counted as pool recoveries, and as requests where Resource Timing sees them), and the job settles. | PKG-01 |
| `canvas-size` | 24 and 48 MP photos sent to PNG come back re-encoded, honest, whole and upright, on the main thread and in the pool, inside whatever canvas the browser really gives. The sources are PNGs written as bytes, since a phone can't draw a source past its own canvas limit, and go to PNG because a JPEG of them is bigger and the source would come back untouched. Colours are read on a canvas at most 2048 px long. The details also show whether the browser's own canvas draws, reads back and encodes at 4096 × 4096, 6000 × 4000 and 8064 × 6048. Runs last: on a phone short of memory it can end the tab. | CMP-03 |

Every pool test that `test/browser/pool.test.js` skips on WebKit has a check
here except its two timing smoke tests (pool against serial, warm against
cold): one run on one device is too noisy to pass or fail on, so
`pool-parallel` records its batch time instead.

## In CI

`test/lab/lab.test.js` (`npm run test:lab`, after `npm run build`) serves this
package with a small Node server, opens `/lab/?report=<server>/report` in
Playwright's Chromium, Firefox and WebKit, waits for the report, and turns
each check into a case per engine keyed `lab/<check>`. Checks that fail today
are listed in `KNOWN_FAILURES` (`test/support/known-failures.js`) and must
fail naming their finding. `LAB_BROWSERS=chromium,firefox` limits the engines;
`CHROMIUM_PATH` picks another Chromium.

The `test-ios` job runs the same test in iPhone Safari on GitHub's macOS
runners: on the oldest iOS simulator on `macos-15` and the newest on
`macos-26` (18 and 26 today). `test/lab/pick-simulator.mjs` picks and the job boots the simulator,
then `LAB_OPEN="xcrun simctl openurl <device>"` opens the page instead of
Playwright and `LAB_ENV=ios-<major>` names it, so its known failures are
listed as `ios-18` and `ios-26`. Any command that opens a URL works the same
way, for a browser Playwright doesn't drive.

Desktop Safari isn't in CI: on the runners it can't read back an ordinary
(GPU-backed) canvas, so its results there say nothing about a real Mac. It is
checked on a real Mac at each release candidate.
