/**
 * The device lab's checks. Each one runs the built library (dist/) the way a
 * page without a bundler would, on images drawn on the device or fetched from
 * test/fixtures/, and returns `{ pass, finding?, summary?, details }`: what
 * really came back, not what the library says came back. lab.js runs them in
 * order, each within its timeout, and builds the report.
 *
 * Modern syntax is fine here: the library needs a modern browser anyway. If
 * this module fails to load, lab.js still reports the environment and says
 * the library did not load. Importing it outside a browser only lists the
 * checks (test/lab/lab.test.js does that to name its cases).
 */
import { compress, getBestFormat, isFormatSupported } from '../dist/compresso.mjs';
import { createPool, isPoolSupported } from '../dist/compresso.pool.mjs';
import { FORMATS, normal, sniffFormat } from '../test/support/formats.js';

const FIXTURES = new URL('../test/fixtures/', import.meta.url);
const MB = 1024 * 1024;
const ENCODERS = ['image/webp', 'image/avif', 'image/jpeg', 'image/png'];
const LOSSY = ['image/webp', 'image/avif', 'image/jpeg'];
const QUALITIES = [0.5, 0.9];
const MINUTE = 60_000;

/**
 * CMP-18's reference: the bytes Chromium's encoder gives for the 2 MP
 * texture below at quality 0.8. Measured with Chrome for Testing 153.0.8010.12
 * (headless, Linux x64), opening this page with `?only=jpeg-size`: 211,125 B,
 * the same on every run. The texture is the same pixels in every browser, so
 * only the encoder differs. Safari's encoder gave 2.3 times Chrome's size in
 * the browser lab; 1.5 times fails that and leaves room for the ordinary
 * differences between other encoders.
 */
const JPEG_REFERENCE_BYTES = 211_125;
const JPEG_MAX_RATIO = 1.5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** The value or the error a promise settles with. */
const settle = (promise) => promise.then((value) => ({ value }), (error) => ({ error }));
const errorOf = (e) => ({ name: e?.name ?? null, message: String(e?.message ?? e).slice(0, 300), kind: e?.kind ?? null });
const kb = (bytes) => (bytes == null ? '—' : `${Math.round(bytes / 1024)} KB`);

/* ------------------------------------------------------------ images */

function canvasOf(width, height) {
  return Object.assign(document.createElement('canvas'), { width, height });
}

/** Frees a canvas's backing store now, not at the next garbage collection: large ones add up fast. */
function release(canvas) {
  canvas.width = canvas.height = 0;
}

/** `canvas.toBlob` as a promise; `null` when the browser gives no blob. */
const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/** A 32-bit integer hash: the same input gives the same output in every engine. */
function hash(x, y, seed) {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ seed;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return (h ^ (h >>> 13)) >>> 0;
}

/**
 * A canvas filled with a photo-like texture: gradients, 32 px tiles and
 * per-pixel grain. Only integer hashing and IEEE arithmetic, written with
 * putImageData, so every browser draws exactly the same pixels and encoder
 * sizes compare across browsers. `grain: 0` gives a flat, screenshot-like image.
 */
function texture(width, height, { seed = 1, grain = 16 } = {}) {
  const canvas = canvasOf(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const band = Math.max(1, Math.min(height, Math.floor(2_000_000 / width)));
  const image = ctx.createImageData(width, band);
  const data = image.data;
  for (let top = 0; top < height; top += band) {
    for (let y = 0; y < band && top + y < height; y++) {
      const row = top + y;
      for (let x = 0; x < width; x++) {
        const tile = hash(x >> 5, row >> 5, seed);
        const noise = grain ? (hash(x, row, seed) & 255) * grain / 256 - grain / 2 : 0;
        const i = (y * width + x) * 4;
        data[i] = (x * 255 / width) * 0.6 + (tile & 255) * 0.4 + noise;
        data[i + 1] = (row * 255 / height) * 0.6 + ((tile >>> 8) & 255) * 0.4 + noise;
        data[i + 2] = ((x + row) % 512 < 256 ? (x + row) % 256 : 255 - ((x + row) % 256)) * 0.6 + ((tile >>> 16) & 255) * 0.4 + noise;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, top);
  }
  return canvas;
}

const sources = new Map();

/**
 * The texture encoded as a file, the way an upload arrives; made once per
 * page, since several checks share the 12 MP photo.
 */
function generated(width, height, type = 'image/jpeg', options = {}) {
  const key = [width, height, type, options.grain].join();
  if (!sources.has(key)) {
    sources.set(key, (async () => {
      const canvas = texture(width, height, options);
      const blob = await toBlob(canvas, type, 0.92);
      release(canvas);
      if (!blob) throw new Error(`this browser could not encode a ${width} x ${height} ${type} source`);
      return new File([blob], `generated-${width}x${height}.${FORMATS[sniffFormat(await head(blob))]?.extension}`, { type });
    })().catch((error) => {
      sources.delete(key);
      throw error;
    }));
  }
  return sources.get(key);
}

/** A committed fixture from test/fixtures/, as a File. */
async function fixture(name, type) {
  const response = await fetch(new URL(name, FIXTURES));
  if (!response.ok) throw new Error(`fixture ${name} answered HTTP ${response.status}`);
  return new File([await response.blob()], name, { type });
}

/* ------------------------------------------------------------ what came back */

/** The first kilobyte: enough for every signature sniffFormat reads. */
const head = async (blob) => new Uint8Array(await blob.slice(0, 1024).arrayBuffer());
const hex = (bytes, n = 12) => Array.from(bytes.subarray(0, n), (b) => b.toString(16).padStart(2, '0')).join(' ');
const mimeOf = (format) => FORMATS[format]?.mime ?? null;

function loadImage(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

/** Displayed size through `<img>`, which applies EXIF orientation and needs no canvas; `null` if undecodable. */
async function decodedSize(blob) {
  const img = await loadImage(blob);
  return img && [img.naturalWidth, img.naturalHeight];
}

/**
 * A compress() result's claims beside the truth of its bytes: their magic
 * numbers and a fresh decode. `lies` names every claim that is wrong.
 */
async function inspect(result) {
  const { blob } = result;
  const bytes = await head(blob);
  const format = sniffFormat(bytes);
  URL.revokeObjectURL(result.url);
  const claimed = {
    format: result.format,
    mimeType: normal(result.mimeType),
    blobType: normal(blob.type),
    size: [result.width, result.height],
    bytes: result.compressedSize,
  };
  const actual = { format, mimeType: mimeOf(format), blobType: mimeOf(format), size: await decodedSize(blob), bytes: blob.size };
  const lies = Object.keys(claimed).filter((key) => JSON.stringify(claimed[key]) !== JSON.stringify(actual[key]));
  return { honest: lies.length === 0, lies, claimed, actual, head: hex(bytes), originalSize: result.originalSize };
}

/** One line for the table: what the label says and what the bytes are. */
const said = (seen) => `${seen.claimed.format} ${seen.claimed.size?.join('x')} ${kb(seen.actual.bytes)}; bytes are ${seen.actual.format} ${seen.actual.size?.join('x') ?? 'undecodable'}` +
  (seen.honest ? '' : `; wrong: ${seen.lies.join(', ')}`);

/**
 * The finding a dishonest result points to, from the claim that is wrong: an
 * AVIF label on other bytes is CMP-16, a wrong size COR-01, the source's own
 * bytes under another name COR-06; `null` for any other failure, or for a
 * job that failed and so has no result to inspect.
 */
function findingOf(seen, source) {
  if (!seen?.actual || seen.honest) return null;
  if (seen.claimed.format === 'avif' && seen.actual.format !== 'avif') return 'CMP-16';
  if (seen.lies.includes('size')) return 'COR-01';
  return seen.actual.bytes === source.size ? 'COR-06' : null;
}

/* ------------------------------------------------------------ the pool */

const livePools = new Set();
let realOffscreenCanvas = null;

/** Runs `fn(pool)` and always destroys the pool, even when the check times out (see afterEach). */
async function withPool(options, fn) {
  const pool = createPool(options);
  livePools.add(pool);
  try {
    return await fn(pool);
  } finally {
    pool.destroy();
    livePools.delete(pool);
  }
}

/** Resolves once `predicate()` is true, polling every `interval` ms; false after `timeout`. */
async function until(predicate, { timeout = 5000, interval = 5 } = {}) {
  const end = performance.now() + timeout;
  while (performance.now() < end) {
    if (predicate()) return true;
    await sleep(interval);
  }
  return predicate();
}

/** Cleans up after a check that timed out: no pool keeps working, OffscreenCanvas is back. */
function afterEach() {
  for (const pool of livePools) pool.destroy();
  livePools.clear();
  if (realOffscreenCanvas) Object.defineProperty(globalThis, 'OffscreenCanvas', realOffscreenCanvas);
  realOffscreenCanvas = null;
}

/* ------------------------------------------------------------ checks */

/** For each encoder: the label, the first bytes, what they really are, and the size at each quality. */
async function encoderRows(encode) {
  const rows = [];
  for (const type of ENCODERS) {
    const blobs = [];
    for (const quality of QUALITIES) blobs.push(await encode(type, quality).catch(() => null));
    const [low, high] = blobs;
    const bytes = low && (await head(low));
    const formats = await Promise.all(blobs.map(async (blob) => blob && sniffFormat(await head(blob))));
    const labelTrue = blobs.every((blob, i) => blob && normal(blob.type) === mimeOf(formats[i]));
    const qualityWorks = !low || !LOSSY.includes(low.type) || low.size < high.size;
    rows.push({
      requested: type,
      label: low?.type ?? null,
      head: bytes ? hex(bytes) : null,
      bytesAre: formats[0],
      bytes: Object.fromEntries(QUALITIES.map((q, i) => [q, blobs[i]?.size ?? null])),
      labelTrue,
      qualityWorks,
    });
  }
  return rows;
}

const encoderLine = (rows) => rows.map((r) => `${r.requested.slice(6)}→${r.bytesAre ?? 'none'} ${QUALITIES.map((q) => kb(r.bytes[q])).join('/')}${r.labelTrue ? '' : ' LABEL WRONG'}${r.qualityWorks ? '' : ' QUALITY IGNORED'}`).join('; ');

/** One orientation fixture's output: displayed size and the colour of each quadrant. */
const QUADRANTS = { red: [220, 20, 20], green: [20, 200, 20], blue: [20, 20, 220], white: [240, 240, 240] };
const UPRIGHT = ['red', 'green', 'blue', 'white'];

/** The named quadrant colour nearest to `pixel`, or 'other' when none is close. */
function colourName(pixel) {
  let best = 'other';
  let bestDistance = 3 * 60 * 60;
  for (const [name, rgb] of Object.entries(QUADRANTS)) {
    const distance = rgb.reduce((sum, v, i) => sum + (v - pixel[i]) ** 2, 0);
    if (distance < bestDistance) [best, bestDistance] = [name, distance];
  }
  return best;
}

/** Reads the centre of each quadrant back from a canvas; `{ error }` where read-back fails. */
async function look(blob) {
  const img = await loadImage(blob);
  if (!img) return { size: null, corners: null, note: 'undecodable' };
  const [width, height] = [img.naturalWidth, img.naturalHeight];
  const canvas = canvasOf(width, height);
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const corners = [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]
      .map(([fx, fy]) => colourName(ctx.getImageData(Math.floor(fx * width), Math.floor(fy * height), 1, 1).data));
    return { size: [width, height], corners };
  } catch (e) {
    return { size: [width, height], corners: null, note: `colours not checked: canvas read-back failed (${errorOf(e).message})` };
  } finally {
    release(canvas);
  }
}

/** All eight EXIF orientations through `run`: each must come back displayed 48 x 32 and upright. */
async function orientations(run) {
  const rows = [];
  for (let n = 1; n <= 8; n++) {
    const outcome = await settle(run(await fixture(`orientation-${n}.jpg`, 'image/jpeg')));
    if (outcome.error) {
      rows.push({ orientation: n, ok: false, error: errorOf(outcome.error) });
      continue;
    }
    URL.revokeObjectURL(outcome.value.url);
    const seen = await look(outcome.value.blob);
    const upright = !seen.corners || seen.corners.join() === UPRIGHT.join();
    rows.push({ orientation: n, ok: seen.size?.join('x') === '48x32' && upright, reported: [outcome.value.width, outcome.value.height], ...seen });
  }
  const wrong = rows.filter((r) => !r.ok).map((r) => r.orientation);
  const unread = rows.some((r) => r.ok && !r.corners);
  return {
    pass: wrong.length === 0,
    // A rejected job is not an orientation bug.
    finding: rows.some((r) => r.error) ? null : undefined,
    summary: (wrong.length ? `wrong: ${wrong.join(', ')}` : 'all 8 upright, 48x32') + (unread ? ' (sizes only: read-back failed)' : ''),
    details: { rows },
  };
}

/** photo.heic must come back as a real image in another format, labelled as what its bytes are. */
async function heic(run) {
  const source = await fixture('photo.heic', 'image/heic');
  const seen = await inspect(await run(source));
  const converted = seen.actual.format && seen.actual.format !== 'heic';
  return {
    pass: converted && seen.honest,
    // COR-06: the source came back as it was, labelled as another format.
    finding: seen.actual.format === 'heic' && seen.claimed.format !== 'heic' ? 'COR-06' : null,
    summary: said(seen),
    details: { sourceBytes: source.size, result: seen },
  };
}

/** `compress(source, options)` on the main thread, with its result inspected. */
async function compressed(source, options) {
  const started = performance.now();
  const result = await compress(source, options);
  return { ms: Math.round(performance.now() - started), seen: await inspect(result) };
}

/** Checks in run order. `finding` is what a returned failure points to; `timeout` is in ms. */
export const CHECKS = [
  {
    name: 'encoders',
    finding: 'CMP-16',
    title: 'every canvas encoder labels its output truly, and quality changes lossy output',
    timeout: MINUTE,
    async run() {
      const canvas = texture(1024, 1024);
      try {
        const main = await encoderRows((type, quality) => toBlob(canvas, type, quality));
        let offscreen = 'OffscreenCanvas not available';
        if (typeof OffscreenCanvas === 'function') {
          const off = new OffscreenCanvas(canvas.width, canvas.height);
          off.getContext('2d').drawImage(canvas, 0, 0);
          offscreen = await encoderRows((type, quality) => off.convertToBlob({ type, quality }));
        }
        const rows = [...main, ...(Array.isArray(offscreen) ? offscreen : [])];
        return {
          pass: rows.every((r) => r.labelTrue && r.qualityWorks),
          finding: rows.every((r) => r.label) ? undefined : null,
          summary: `canvas: ${encoderLine(main)}` + (Array.isArray(offscreen) ? ` | offscreen: ${encoderLine(offscreen)}` : ` | ${offscreen}`),
          details: { size: '1024x1024', canvas: main, offscreen },
        };
      } finally {
        release(canvas);
      }
    },
  },
  {
    name: 'jpeg-size',
    finding: 'CMP-18',
    title: `JPEG at quality 0.8 is at most ${JPEG_MAX_RATIO} times the reference size`,
    timeout: MINUTE,
    async run() {
      const canvas = texture(1600, 1250);
      const blob = await toBlob(canvas, 'image/jpeg', 0.8);
      release(canvas);
      const ratio = Math.round((blob.size / JPEG_REFERENCE_BYTES) * 100) / 100;
      return {
        pass: ratio <= JPEG_MAX_RATIO,
        summary: `${blob.size} B, ${ratio} times the reference ${JPEG_REFERENCE_BYTES} B`,
        details: { size: '1600x1250', quality: 0.8, bytes: blob.size, label: blob.type, referenceBytes: JPEG_REFERENCE_BYTES, ratio, maxRatio: JPEG_MAX_RATIO },
      };
    },
  },
  {
    name: 'default-12mp',
    finding: 'CMP-16',
    title: 'a 12 MP JPEG with defaults comes back smaller, as the format it claims, at the size it reports',
    timeout: 2 * MINUTE,
    async run() {
      const source = await generated(4000, 3000);
      const { ms, seen } = await compressed(source);
      return {
        pass: seen.honest && seen.actual.bytes < source.size,
        finding: findingOf(seen, source),
        summary: `${kb(source.size)} source → ${said(seen)}`,
        details: { sourceBytes: source.size, ms, result: seen },
      };
    },
  },
  // COR-02 sources are PNG: a JPEG source can win the never-bigger fallback,
  // which returns it honestly labelled and hides what the encoder did. The
  // PNG fallback of an encoder that can't do the format is the same size as
  // a PNG source, so the encoder's output is what comes back.
  ...['webp', 'avif'].map((format) => ({
    name: `explicit-${format}`,
    finding: 'COR-02',
    title: `format: '${format}' on a 2 MP image gives bytes in the format it claims`,
    timeout: MINUTE,
    async run() {
      const source = await generated(1600, 1250, 'image/png');
      const { ms, seen } = await compressed(source, { format });
      const labelled = seen.claimed.format === seen.actual.format && seen.claimed.mimeType === seen.actual.mimeType;
      return {
        // Where the browser can't encode the format, an honest WebP or JPEG.
        pass: labelled && (seen.actual.format === format || ['webp', 'jpeg'].includes(seen.actual.format)),
        summary: said(seen),
        details: { sourceBytes: source.size, ms, result: seen },
      };
    },
  })),
  {
    name: 'long-screenshot',
    finding: 'COR-18',
    title: 'an 800x16000 screenshot with defaults comes back at least 720 px wide',
    timeout: MINUTE,
    async run() {
      // Under WebP's 16383 px limit, so COR-01 stays out of this check.
      const source = await generated(800, 16000, 'image/png', { grain: 0 });
      const { ms, seen } = await compressed(source);
      const width = seen.actual.size?.[0] ?? null;
      return {
        pass: width >= 720,
        // COR-18 is the JPEG fallback's 2048 px cap; an undecodable result is something else.
        finding: width !== null && seen.actual.format === 'jpeg' ? 'COR-18' : null,
        summary: `${width ?? 'undecodable,'} px wide; ${said(seen)}`,
        details: { ms, width, result: seen },
      };
    },
  },
  {
    name: 'target-1mb',
    title: 'a 12 MP photo with maxSizeMB: 1 comes back at or under 1 MB',
    timeout: 2 * MINUTE,
    async run() {
      const source = await generated(4000, 3000);
      const { ms, seen } = await compressed(source, { maxSizeMB: 1 });
      return { pass: seen.actual.bytes <= MB, finding: findingOf(seen, source), summary: `${seen.actual.bytes} B in ${ms} ms; ${said(seen)}`, details: { sourceBytes: source.size, ms, result: seen } };
    },
  },
  {
    name: 'orientation',
    title: 'all eight EXIF orientations come back 48x32 and upright (main thread)',
    timeout: MINUTE,
    run: () => orientations((file) => compress(file)),
  },
  {
    name: 'heic',
    finding: 'COR-06',
    title: 'photo.heic comes back as a real image in another format, truly labelled (main thread)',
    timeout: MINUTE,
    run: () => heic((file) => compress(file)),
  },
  {
    name: 'pool-basic',
    finding: 'CMP-16',
    title: 'real workers compress a 12 MP JPEG honestly',
    timeout: 2 * MINUTE,
    run: () => withPool({ size: 2 }, async (pool) => {
      const { size } = pool.stats();
      if (size === 0) return { pass: false, finding: null, summary: 'no real workers: createPool() fell back to the main thread', details: { stats: pool.stats(), isPoolSupported: isPoolSupported() } };
      const source = await generated(4000, 3000);
      const seen = await inspect(await pool.compress(source));
      return { pass: seen.honest, finding: findingOf(seen, source), summary: `${size} workers; ${said(seen)}`, details: { sourceBytes: source.size, stats: pool.stats(), result: seen } };
    }),
  },
  {
    name: 'pool-parallel',
    title: 'compressMany() of four on createPool({ size: 2 }) runs two at once, fulfils all four and reports each one\'s progress',
    timeout: 2 * MINUTE,
    run: () => withPool({ size: 2 }, async (pool) => {
      const source = await generated(1600, 1250);
      let busiest = 0;
      const watch = setInterval(() => { busiest = Math.max(busiest, pool.stats().busy); }, 5);
      const events = [];
      const started = performance.now();
      const outcomes = await pool.compressMany([source, source, source, source], {}, (e) => events.push(e)).finally(() => clearInterval(watch));
      const ms = Math.round(performance.now() - started);
      const fulfilled = outcomes.filter((o) => o.status === 'fulfilled');
      const seen = await Promise.all(fulfilled.map((o) => inspect(o.value)));
      const honest = seen.filter((one) => one.honest).length;
      const files = new Set(events.map((e) => e.fileIndex)).size;
      const overall = events[events.length - 1]?.overallProgress ?? 0;
      const ran = fulfilled.length === 4 && busiest === 2 && files === 4 && overall > 0.99;
      return {
        pass: ran && honest === 4,
        // A finding only for a dishonest result, so it can't excuse a pool that misbehaved.
        finding: ran ? findingOf(seen.find((one) => !one.honest), source) : null,
        summary: `${fulfilled.length} of 4 fulfilled (${honest} honest) in ${ms} ms, at most ${busiest} busy, progress for ${files} files ending at ${overall}`,
        details: { busiest, fulfilled: fulfilled.length, honest, ms, progressEvents: events.length, progressFiles: files, finalProgress: overall, errors: outcomes.filter((o) => o.reason).map((o) => errorOf(o.reason)) },
      };
    }),
  },
  {
    name: 'pool-cancel',
    title: 'aborting an in-flight job rejects it as aborted and frees the worker for the next job',
    timeout: MINUTE,
    run: () => withPool({ size: 1 }, async (pool) => {
      const source = await generated(1600, 1250);
      const controller = new AbortController();
      const job = settle(pool.compress(source, { signal: controller.signal }));
      const started = await until(() => pool.stats().busy === 1);
      controller.abort();
      const { error } = await job;
      const freed = await until(() => pool.stats().busy === 0 && pool.stats().queued === 0);
      const next = await settle(pool.compress(source));
      const seen = next.value && (await inspect(next.value));
      const cancelled = started && error?.kind === 'aborted' && freed;
      return {
        pass: cancelled && Boolean(seen?.honest),
        finding: cancelled ? findingOf(seen, source) : null,
        summary: `rejected with kind ${error?.kind ?? 'none'}, ${freed ? 'freed' : 'still busy'}; next job ${seen ? said(seen) : `failed: ${errorOf(next.error).message}`}`,
        details: { startedRunning: started, rejection: error ? errorOf(error) : null, freed, next: seen ?? errorOf(next.error) },
      };
    }),
  },
  {
    name: 'pool-timeout',
    title: 'timeoutMs: 1 rejects as timeout and replaces the worker',
    timeout: MINUTE,
    run: () => withPool({ size: 1, timeoutMs: 1 }, async (pool) => {
      const { error } = await settle(pool.compress(await fixture('sample.jpg', 'image/jpeg')));
      const recovered = await until(() => pool.stats().size === 1 && pool.stats().busy === 0);
      const stats = pool.stats();
      return {
        pass: error?.kind === 'timeout' && recovered && stats.recoveries >= 1,
        summary: `rejected with kind ${error?.kind ?? 'none'}; stats ${JSON.stringify(stats)}`,
        details: { rejection: error ? errorOf(error) : null, stats },
      };
    }),
  },
  {
    name: 'pool-fallback',
    title: 'without OffscreenCanvas, createPool() works on the main thread and stays honest',
    timeout: MINUTE,
    async run() {
      realOffscreenCanvas = Object.getOwnPropertyDescriptor(globalThis, 'OffscreenCanvas') ?? null;
      delete globalThis.OffscreenCanvas;
      try {
        const supported = isPoolSupported();
        return await withPool({}, async (pool) => {
          const stats = pool.stats();
          const source = await fixture('sample.jpg', 'image/jpeg');
          const one = await inspect(await pool.compress(source));
          const many = await pool.compressMany([source, source]);
          const batch = await Promise.all(many.map((o) => (o.value ? inspect(o.value) : { honest: false, error: errorOf(o.reason) })));
          return {
            pass: !supported && stats.size === 0 && one.honest && batch.every((b) => b.honest),
            finding: !supported && stats.size === 0 ? findingOf([one, ...batch].find((b) => !b.honest), source) : null,
            summary: `isPoolSupported ${supported}, size ${stats.size}; ${said(one)}; batch ${batch.filter((b) => b.honest).length} of 2 honest`,
            details: { isPoolSupported: supported, stats, one, batch },
          };
        });
      } finally {
        if (realOffscreenCanvas) Object.defineProperty(globalThis, 'OffscreenCanvas', realOffscreenCanvas);
        realOffscreenCanvas = null;
      }
    },
  },
  {
    name: 'pool-missing-worker',
    finding: 'PKG-01',
    title: 'a worker URL that answers 404 is retried at most twice in 3 s, and the job settles',
    timeout: MINUTE,
    run: () => {
      const url = new URL(`no-such-worker.js?run=${Date.now()}`, location.href).href;
      return withPool({ size: 1, workerUrl: url }, async (pool) => {
        // Grows the Resource Timing buffer so a respawn loop can't overflow it into an undercount.
        performance.setResourceTimingBufferSize?.(5000);
        let outcome = 'pending';
        settle(pool.compress(await fixture('sample.jpg', 'image/jpeg'))).then((o) => { outcome = o.error ? `rejected: ${errorOf(o.error).message}` : 'fulfilled'; });
        // Stops as soon as the pool has retried too often: a respawn storm is
        // heavy, above all on WebKit, and the answer is already known.
        const started = performance.now();
        await until(() => pool.stats().recoveries > 2, { timeout: 3000, interval: 20 });
        const seconds = Math.round((performance.now() - started) / 100) / 10;
        // Resource Timing sees worker script requests in some engines only;
        // each failed load also counts as one recovery, which every engine sees.
        const requests = performance.getEntriesByName(url).length;
        const { recoveries } = pool.stats();
        return {
          pass: recoveries <= 2 && requests <= 2 && outcome !== 'pending',
          summary: `${requests} requests seen, ${recoveries} recoveries in ${seconds} s; job ${outcome}`,
          details: { requestsSeen: requests, recoveries, job: outcome, stats: pool.stats() },
        };
      });
    },
  },
  {
    name: 'pool-orientation',
    title: 'all eight EXIF orientations come back 48x32 and upright (pool)',
    timeout: MINUTE,
    run: () => withPool({ size: 1 }, (pool) => orientations((file) => pool.compress(file))),
  },
  {
    name: 'pool-heic',
    finding: 'COR-06',
    title: 'photo.heic comes back as a real image in another format, truly labelled (pool)',
    timeout: MINUTE,
    run: () => withPool({ size: 1 }, (pool) => heic((file) => pool.compress(file))),
  },
  // Last: on a phone short of memory the 48 MP canvas can end the tab, and
  // the checks before it are already on the page to copy.
  {
    name: 'canvas-size',
    finding: 'CMP-03',
    title: 'draws, reads back and encodes 4096x4096, 6000x4000 and 8064x6048 canvases',
    timeout: 2 * MINUTE,
    async run() {
      const rows = [];
      for (const [width, height] of [[4096, 4096], [6000, 4000], [8064, 6048]]) {
        const canvas = canvasOf(width, height);
        const row = { size: `${width}x${height}`, megapixels: Math.round((width * height) / 1e5) / 10 };
        const started = performance.now();
        try {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) throw new Error('no 2d context');
          const halves = [[0, 0, 'red'], [width / 2, 0, 'green'], [0, height / 2, 'blue'], [width / 2, height / 2, 'white']];
          for (const [x, y, name] of halves) {
            ctx.fillStyle = `rgb(${QUADRANTS[name]})`;
            ctx.fillRect(x, y, width / 2, height / 2);
          }
          const read = [[1, 1], [width - 2, 1], [1, height - 2], [width - 2, height - 2]]
            .map(([x, y]) => colourName(ctx.getImageData(x, y, 1, 1).data));
          row.readBack = read.join() === UPRIGHT.join() ? 'ok' : read;
          const blob = await toBlob(canvas, 'image/jpeg', 0.8);
          row.encoded = blob ? { bytes: blob.size, bytesAre: sniffFormat(await head(blob)) } : null;
          row.ok = row.readBack === 'ok' && row.encoded?.bytesAre === 'jpeg';
        } catch (e) {
          Object.assign(row, { ok: false, error: errorOf(e).message });
        } finally {
          release(canvas);
        }
        row.ms = Math.round(performance.now() - started);
        rows.push(row);
      }
      return {
        pass: rows.every((r) => r.ok),
        summary: rows.map((r) => `${r.size} ${r.ok ? 'ok' : `failed (${r.error ?? `read-back ${r.readBack}, encoded ${r.encoded?.bytesAre ?? 'nothing'}`})`}`).join('; '),
        details: { rows },
      };
    },
  },
];

/** What the library itself says about this browser, for the report's environment. */
function libraryEnv() {
  return {
    getBestFormat: getBestFormat(),
    isPoolSupported: isPoolSupported(),
    isFormatSupported: Object.fromEntries(['webp', 'avif', 'jpeg', 'png'].map((f) => [f, isFormatSupported(f)])),
  };
}

globalThis.compressoLab?.ready({ env: libraryEnv, checks: CHECKS, afterEach });
