/**
 * One test per confirmed finding, written as the behaviour the fix must
 * deliver (see the quality plan's pull request rows). While a finding still
 * reproduces, its case is listed in test/support/known-failures.js and must
 * fail the known way; the fixing pull request deletes the entry.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { compress } from '../../src/compress.js';
import { getBestFormat, isFormatSupported, __resetCapabilities, __setCapabilities } from '../../src/index.js';
import { createPool } from '../../src/pool.js';
import { fixture, generatedImage, fileFrom } from './support/fixtures.js';
import { expectHonestResult } from './support/honest.js';
import { itTracked } from './support/known-bugs.js';
import { sniffFormat } from '../support/formats.js';
import { server } from 'vitest/browser';
import transparentUrl from '../../../../benchmark/corpus/transparent-graphic.png?url';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** The value or the error a promise settles with, so tests can assert on either. */
const settled = (promise) => promise.then((value) => value, (error) => error);
const bytesOf = async (blob) => new Uint8Array(await blob.arrayBuffer());
const sameBytes = (a, b) => a.length === b.length && a.every((byte, i) => byte === b[i]);
const latin1 = async (blob) => new TextDecoder('latin1').decode(await bytesOf(blob));

/** Runs `fn` and counts the canvas encodes it makes on the main thread. */
async function countEncodes(fn) {
  const targets = [[HTMLCanvasElement.prototype, 'toBlob'], [globalThis.OffscreenCanvas?.prototype, 'convertToBlob']]
    .filter(([proto]) => proto);
  const originals = targets.map(([proto, name]) => proto[name]);
  let encodes = 0;
  targets.forEach(([proto, name], i) => {
    proto[name] = function (...args) { encodes++; return originals[i].apply(this, args); };
  });
  try {
    return { value: await fn(), encodes: () => encodes };
  } finally {
    targets.forEach(([proto, name], i) => { proto[name] = originals[i]; });
  }
}

/** A 64 × 64 uncompressed 24-bit BMP: decodable everywhere, encodable nowhere. */
function bmp(size = 64) {
  const rowBytes = size * 3;
  const pixels = rowBytes * size;
  const buffer = new ArrayBuffer(54 + pixels);
  const view = new DataView(buffer);
  view.setUint16(0, 0x4d42, true); // "BM"
  view.setUint32(2, buffer.byteLength, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, size, true);
  view.setInt32(22, size, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, pixels, true);
  const data = new Uint8Array(buffer, 54);
  for (let i = 0; i < pixels; i++) data[i] = (i * 7) % 256;
  return new File([buffer], 'photo.bmp', { type: 'image/bmp' });
}

afterEach(() => __resetCapabilities());

describe('correctness findings', () => {
  itTracked('COR-01/webp-past-16383', 'WebP output taller than 16,383 px reports the size it really has', async () => {
    const source = await generatedImage(800, 20000);
    await expectHonestResult(await compress(source, { format: 'webp' }), source);
  }, 60000);

  itTracked('COR-02/avif-where-unsupported', "format: 'avif' where AVIF can't be encoded gives a labelled WebP or JPEG", async () => {
    const source = bmp();
    const result = await compress(source, { format: 'avif' });
    if (result.format === 'avif') return expectHonestResult(result, source); // a real AVIF encoder
    expect(['webp', 'jpeg'], 'COR-02 falls back to an encodable format').toContain(result.format);
    await expectHonestResult(result, source);
  });

  describe('COR-03: an explicit undefined option behaves like an omitted one', () => {
    // `base` makes the default observable: Chromium's default WebP quality
    // happens to equal the library's, so `quality` is compared as JPEG.
    const same = async (option, base = {}) => {
      const source = await fixture('photo.jpg');
      const plain = await compress(source, base);
      const result = await compress(source, { ...base, [option]: undefined });
      expect([result.format, result.compressedSize], `COR-03 ${option}`).toEqual([plain.format, plain.compressedSize]);
    };
    itTracked('COR-03/format', '{ format: undefined }', () => same('format'));
    itTracked('COR-03/quality', '{ quality: undefined }', () => same('quality', { format: 'jpeg' }));
    itTracked('COR-03/maxSizeMB', '{ maxSizeMB: undefined }', () => same('maxSizeMB'));
    itTracked('COR-03/maxWidth', '{ maxWidth: undefined }', () => same('maxWidth'));
    itTracked('COR-03/backgroundColor', '{ backgroundColor: undefined } still fills transparency white', async () => {
      const source = await fileFrom(transparentUrl, 'transparent.png', 'image/png');
      const plain = await compress(source, { format: 'jpeg' });
      const result = await compress(source, { format: 'jpeg', backgroundColor: undefined });
      expect(await bytesOf(result.blob), 'COR-03 backgroundColor').toEqual(await bytesOf(plain.blob));
    });
    itTracked('COR-03/maxInputPixels', '{ maxInputPixels: undefined } keeps the pixel-flood guard on', async () => {
      const error = await settled(compress(await fixture('pixel-flood.png'), { maxInputPixels: undefined }));
      expect(error?.kind, 'COR-03 maxInputPixels').toBe('too-large');
    });
  });

  // Each GPS fixture takes one path: re-encoded, or kept because no encode beats it.
  for (const [file, kept] of [['photo-gps.jpg', false], ['photo-gps-compact.jpg', true], ['photo-gps.webp', true]]) {
    itTracked(`COR-04/${file}`, `${file}: no EXIF or GPS survives (${kept ? 'kept' : 're-encoded'})`, async () => {
      const source = await fixture(file);
      const result = await compress(source);
      expect(sameBytes(await bytesOf(result.blob), await bytesOf(source)), `the ${kept ? 'kept' : 're-encode'} path`).toBe(kept);
      expect(/Exif\0\0|EXIF/.test(await latin1(result.blob)), 'COR-04 metadata in the output').toBe(false);
    });
  }

  itTracked('COR-05/already-compact', 'a source no encode can beat comes back after one encode', async () => {
    const source = await fixture('photo-gps.webp');
    const { value: result, encodes } = await countEncodes(() => compress(source));
    expect(await bytesOf(result.blob), 'the source comes back').toEqual(await bytesOf(source));
    expect(encodes(), 'COR-05 encodes').toBeLessThanOrEqual(1);
  });

  itTracked('COR-06/explicit-format-and-resize', 'an explicit format with a resize reports the size it returns', async () => {
    const source = await fixture('sample.avif');
    await expectHonestResult(await compress(source, { format: 'jpeg', maxWidth: 60 }), source);
  });

  itTracked('COR-07/truncated-main-thread', 'a truncated JPEG is rejected on the main thread, as in the pool', async () => {
    const outcome = await settled(compress(await fixture('photo-truncated.jpg')));
    expect(outcome, 'COR-07 a truncated JPEG must reject').toBeInstanceOf(Error);
  });

  itTracked('COR-08/pool-abort-name', 'a pool cancel is an AbortError, as from compress()', async () => {
    const pool = createPool({ size: 1 });
    try {
      const controller = new AbortController();
      controller.abort();
      const error = await settled(pool.compress(await fixture('sample.jpg'), { signal: controller.signal }));
      expect(error?.name, 'COR-08 pool abort name').toBe('AbortError');
    } finally {
      pool.destroy();
    }
  });

  itTracked('COR-08/decode-error-kind', 'an undecodable file fails with the same kind on both paths', async () => {
    const garbage = new File([new Uint8Array(512).fill(7)], 'broken.jpg', { type: 'image/jpeg' });
    const pool = createPool({ size: 1 });
    try {
      const [main, worker] = [await settled(compress(garbage)), await settled(pool.compress(garbage))];
      expect(worker, 'the pool rejects it as undecodable').toMatchObject({ kind: 'decode' });
      expect(main.kind, 'COR-08 same kind on both paths').toBe(worker.kind);
    } finally {
      pool.destroy();
    }
  });

  itTracked('COR-10/after-destroy', 'compress() after destroy() rejects at once', async () => {
    const source = await fixture('sample.jpg');
    const pool = createPool({ size: 1 });
    pool.destroy();
    const outcome = await Promise.race([settled(pool.compress(source)), sleep(1000).then(() => 'pending')]);
    expect(outcome, 'COR-10 after destroy').toBeInstanceOf(Error);
  });

  for (const format of ['jpeg', 'png']) {
    itTracked(`COR-14/${format}`, `a missed maxSizeMB target is flagged (${format})`, async () => {
      const maxSizeMB = 0.001;
      const result = await compress(await fixture('photo.jpg'), { format, maxSizeMB });
      const met = result.compressedSize <= maxSizeMB * 1024 * 1024;
      expect(met || result.missedTarget === true, 'COR-14 target met or flagged').toBe(true);
    });
  }

  itTracked('COR-15/signal-type', 'a signal that is not an AbortSignal is refused on the main thread, as in the pool', async () => {
    const outcome = await settled(compress(await fixture('sample.jpg'), { signal: {} }));
    expect(outcome, 'COR-15 signal: {}').toBeInstanceOf(TypeError);
  });

  for (const file of ['animated.gif', 'animated.png', 'animated.webp']) {
    itTracked(`COR-16/${file}`, `${file} comes back untouched, still animated`, async () => {
      const source = await fixture(file);
      const result = await compress(source);
      expect(await bytesOf(result.blob), 'COR-16 animation kept').toEqual(await bytesOf(source));
    });
  }

  itTracked('COR-16/svg-both-paths', 'an SVG comes back untouched on the main thread and in the pool', async () => {
    const source = await fixture('vector.svg');
    const pool = createPool({ size: 1 });
    try {
      for (const outcome of [await settled(compress(source)), await settled(pool.compress(source))]) {
        expect(outcome, 'COR-16 SVG rejected as undecodable').not.toMatchObject({ kind: 'decode' });
        expect(outcome).not.toBeInstanceOf(Error);
        expect(await bytesOf(outcome.blob), 'COR-16 SVG kept').toEqual(await bytesOf(source));
      }
    } finally {
      pool.destroy();
    }
  });

  describe('the JPEG fallback cap (no WebP or AVIF encoder)', () => {
    it('still caps an ordinary 4000 × 3000 photo at 2048 × 1536', async () => {
      __setCapabilities({ avif: false, webp: false });
      const result = await compress(await generatedImage(4000, 3000));
      expect([result.width, result.height]).toEqual([2048, 1536]);
    });

    itTracked('COR-18/long-screenshot', 'keeps an 800 × 20000 screenshot 720 px wide', async () => {
      __setCapabilities({ avif: false, webp: false });
      const result = await compress(await generatedImage(800, 20000));
      expect([result.width, result.height], 'COR-18 size').toEqual([720, 18000]);
    }, 60000);

    it('never lifts the long edge past 23040, so a 600 × 24000 strip comes back 576 × 23040', async () => {
      __setCapabilities({ avif: false, webp: false });
      const result = await compress(await generatedImage(600, 24000));
      expect([result.width, result.height]).toEqual([576, 23040]);
    }, 60000);
  });
});

describe('compatibility findings', () => {
  it('accepts exactly the encoders this browser really has (CMP-16)', async () => {
    // The test's own verdict, from a larger canvas and the corpus's signature sniffer.
    const canvas = Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
    const ctx = canvas.getContext('2d');
    const noise = ctx.createImageData(256, 256);
    for (let i = 0; i < noise.data.length; i++) noise.data[i] = i % 4 === 3 ? 255 : Math.floor(Math.random() * 256);
    ctx.putImageData(noise, 0, 0);
    const encodes = async (format) => {
      const [low, high] = await Promise.all([0.3, 0.9].map((q) => new Promise((resolve) => canvas.toBlob(resolve, `image/${format}`, q))));
      const real = async (blob) => blob && sniffFormat(await bytesOf(blob)) === format;
      return (await real(low)) && (await real(high)) && low.size < high.size;
    };
    const expected = { avif: await encodes('avif'), webp: await encodes('webp') };
    __resetCapabilities();
    expect({ avif: isFormatSupported('avif'), webp: isFormatSupported('webp') }).toEqual(expected);
  });

  // Engines with a real lossy WebP encoder keep it. WebKit's answer is the test above's.
  it.runIf(['chromium', 'firefox'].includes(server.browser))('keeps WebP in Chromium and Firefox (CMP-16)', () => {
    __resetCapabilities();
    expect(getBestFormat()).toBe('webp');
  });

  it('proves once per session, in under 20 ms', () => {
    const proto = HTMLCanvasElement.prototype;
    const { toDataURL } = proto;
    let encodes = 0;
    proto.toDataURL = function (...args) { encodes++; return toDataURL.apply(this, args); };
    try {
      __resetCapabilities();
      const started = performance.now();
      getBestFormat();
      const ms = performance.now() - started;
      const first = encodes;
      getBestFormat();
      isFormatSupported('webp');
      expect(first, 'two qualities for each of AVIF and WebP').toBe(4);
      expect(encodes, 'no encode after the first answer').toBe(first);
      expect(ms).toBeLessThan(20);
    } finally {
      proto.toDataURL = toDataURL;
    }
  });

  itTracked('CMP-16/fake-avif-label', 'an encoder that only labels its output AVIF is not believed', async () => {
    const png = await new Promise((resolve) => Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).toBlob(resolve, 'image/png'));
    const proto = HTMLCanvasElement.prototype;
    const { toDataURL, toBlob } = proto;
    proto.toDataURL = function (type, ...rest) {
      return type === 'image/avif' ? toDataURL.call(this, 'image/png', ...rest).replace('image/png', 'image/avif') : toDataURL.call(this, type, ...rest);
    };
    proto.toBlob = function (callback, type, ...rest) {
      if (type !== 'image/avif') return toBlob.call(this, callback, type, ...rest);
      setTimeout(() => callback(new Blob([png], { type: 'image/avif' })));
    };
    try {
      __resetCapabilities();
      expect(getBestFormat(), 'CMP-16 a mislabelled encoder').not.toBe('avif');
    } finally {
      Object.assign(proto, { toDataURL, toBlob });
    }
  });

  itTracked('CMP-17/decoded-smaller', 'a photo the browser decodes smaller still reports its real original size', async () => {
    const source = await generatedImage(800, 600);
    const proto = HTMLImageElement.prototype;
    const descriptors = ['naturalWidth', 'naturalHeight'].map((name) => [name, Object.getOwnPropertyDescriptor(proto, name)]);
    const realBitmap = globalThis.createImageBitmap;
    for (const [name, descriptor] of descriptors) {
      Object.defineProperty(proto, name, { configurable: true, get() { return Math.round(descriptor.get.call(this) * 0.75); } });
    }
    globalThis.createImageBitmap = async (image, options = {}) => {
      const full = await realBitmap(image, options);
      return realBitmap(full, { ...options, resizeWidth: Math.round(full.width * 0.75), resizeHeight: Math.round(full.height * 0.75) });
    };
    let result;
    try {
      result = await compress(source);
    } finally {
      for (const [name, descriptor] of descriptors) Object.defineProperty(proto, name, descriptor);
      globalThis.createImageBitmap = realBitmap;
    }
    expect([result.originalWidth, result.originalHeight], 'CMP-17 original size').toEqual([800, 600]);
  });

  it('the canvas check leaves no mark: a transparent corner stays transparent (CMP-03)', async () => {
    // 4200 × 4200 is past 16.7 MP, so the canvas is checked with one pixel in its far corner.
    const size = 4200;
    const canvas = Object.assign(document.createElement('canvas'), { width: size, height: size });
    canvas.getContext('2d').fillRect(1000, 1000, 2000, 2000);
    const source = new File([await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))], 'transparent.png', { type: 'image/png' });
    canvas.width = canvas.height = 0;
    const result = await compress(source, { format: 'png' });
    const bitmap = await createImageBitmap(result.blob);
    const check = Object.assign(document.createElement('canvas'), { width: bitmap.width, height: bitmap.height });
    const ctx = check.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    expect([bitmap.width, bitmap.height]).toEqual([size, size]);
    expect(ctx.getImageData(size - 1, size - 1, 1, 1).data[3], 'the far corner is still transparent').toBe(0);
    check.width = check.height = 0;
  }, 60000);

  it("a photo past the browser's canvas limit comes back smaller, whole and honest (CMP-03)", async () => {
    // iOS Safari 17 on an iPhone 15: past 16.7 MP a canvas draws nothing,
    // reads back empty and encodes to nothing, without an error.
    const LIMIT = 16_777_216;
    const source = await generatedImage(6000, 4000);
    const tooBig = (canvas) => canvas.width * canvas.height > LIMIT;
    const context = CanvasRenderingContext2D.prototype;
    const proto = HTMLCanvasElement.prototype;
    const { drawImage, fillRect, getImageData } = context;
    const { toBlob } = proto;
    context.drawImage = function (...args) { if (!tooBig(this.canvas)) drawImage.apply(this, args); };
    context.fillRect = function (...args) { if (!tooBig(this.canvas)) fillRect.apply(this, args); };
    context.getImageData = function (x, y, w, h) { return tooBig(this.canvas) ? new ImageData(w, h) : getImageData.call(this, x, y, w, h); };
    proto.toBlob = function (callback, ...rest) { return tooBig(this) ? setTimeout(() => callback(null)) : toBlob.call(this, callback, ...rest); };
    let result;
    try {
      result = await compress(source, { format: 'jpeg' });
    } finally {
      Object.assign(context, { drawImage, fillRect, getImageData });
      proto.toBlob = toBlob;
    }
    expect(result.width * result.height, 'CMP-03 inside the canvas limit').toBeLessThanOrEqual(LIMIT);
    expect(result.width / result.height).toBeCloseTo(1.5, 2);
    expect(result.width, 'one step down, not more').toBeGreaterThan(3000);
    await expectHonestResult(result, source);
  }, 60000);
});

describe('packaging and performance findings', () => {
  itTracked('PKG-01/unreachable-worker', 'an unreachable worker file is requested once per worker, and every job still finishes', async () => {
    // Each `new Worker()` is one request for the worker file.
    const RealWorker = globalThis.Worker;
    let requests = 0;
    globalThis.Worker = class extends RealWorker {
      constructor(...args) { requests++; super(...args); }
    };
    const files = await Promise.all([fixture('sample.jpg'), fixture('sample.png')]);
    const pool = createPool({ size: 2, workerUrl: '/no-such-worker.js' });
    try {
      const jobs = Promise.all(files.map((file) => settled(pool.compress(file))));
      await sleep(5000);
      expect(requests, 'PKG-01 worker file requests in 5 s').toBeLessThanOrEqual(2);
      for (const outcome of await jobs) expect(outcome, 'PKG-01 a job still finishes').not.toBeInstanceOf(Error);
      expect(pool.stats(), 'PKG-01 the pool says why').toMatchObject({ mode: 'main-thread', reason: 'worker-failed-to-load' });
    } finally {
      pool.destroy();
      globalThis.Worker = RealWorker;
    }
  }, 30000);

  itTracked('PERF-01/slow-but-progressing', 'a pool job that keeps reporting progress is not timed out', async () => {
    const source = await generatedImage(4000, 3000);
    const options = { format: 'jpeg', maxSizeMB: 0.03 };
    const warmUp = await generatedImage(200, 150);
    /** One job on `pool`: its outcome, its length, and its longest silence between progress reports. */
    const watched = async (pool) => {
      const started = performance.now();
      let last = started;
      let silence = 0;
      const heard = () => {
        const now = performance.now();
        silence = Math.max(silence, now - last);
        last = now;
      };
      const outcome = await settled(pool.compress(source, { ...options, onProgress: heard }));
      heard();
      return { outcome, job: performance.now() - started, silence };
    };
    // A warm pool with no timeout gives the job and its longest silence.
    const probe = createPool({ size: 1, timeoutMs: Infinity });
    let timeoutMs;
    try {
      await probe.compress(source, options);
      const { job, silence } = await watched(probe);
      timeoutMs = Math.sqrt(job * silence);
    } finally {
      probe.destroy();
    }
    // A run tells only when its timeout fell between its longest silence and
    // its length: then a pool that restarts its clock on progress finishes,
    // and one that times the whole job doesn't. Timings move on shared
    // runners, so a run that misses moves the timeout toward the side it
    // missed and tries again.
    for (let run = 0; run < 4; run++) {
      const pool = createPool({ size: 1, timeoutMs: Math.round(timeoutMs) });
      let seen;
      try {
        // Warm, so the worker's start-up doesn't count against the job.
        await pool.compress(warmUp, options);
        seen = await watched(pool);
      } finally {
        pool.destroy();
      }
      // Any failure but the pool's timeout is a failure of its own.
      if (seen.outcome instanceof Error && !/timed out/.test(seen.outcome.message)) throw seen.outcome;
      const quiet = seen.silence < 0.9 * timeoutMs;
      if (quiet && (seen.outcome instanceof Error || seen.job > 1.1 * timeoutMs)) {
        expect(seen.outcome, `PERF-01 timed out at ${Math.round(timeoutMs)} ms, though no silence reached ${Math.round(seen.silence)} ms`).not.toBeInstanceOf(Error);
        return;
      }
      timeoutMs *= quiet ? 0.8 : 1.25;
    }
    throw new Error('no timeout fell between the job and its longest silence in 4 runs');
  }, 60000);

  // B2's gates, on the real encoder: a 12 MP photo meets each target in four
  // encodes at most [8 or 9 before], and a 48 MP photo meets "under 0.2 MB" by
  // stepping its size down [1,370 KB before], instead of missing it.
  for (const maxSizeMB of [1, 0.5, 0.2]) {
    it(`PERF-02: a 12 MP photo meets a ${maxSizeMB} MB target in four encodes at most`, async () => {
      const source = await generatedImage(4000, 3000);
      const { value: result, encodes } = await countEncodes(() => compress(source, { format: 'jpeg', maxSizeMB }));
      expect(result.compressedSize).toBeLessThanOrEqual(maxSizeMB * 1024 * 1024);
      expect(result.missedTarget).toBe(false);
      expect(encodes(), 'PERF-02 encodes').toBeLessThanOrEqual(4);
    }, 60000);
  }

  it('COR-14: a 48 MP photo meets a 0.2 MB target by stepping its size down', async () => {
    const source = await generatedImage(8000, 6000);
    const result = await compress(source, { format: 'jpeg', maxSizeMB: 0.2 });
    expect(result.compressedSize).toBeLessThanOrEqual(0.2 * 1024 * 1024);
    expect(result.missedTarget).toBe(false);
    expect(result.width).toBeLessThan(8000);
    expect(sniffFormat(await bytesOf(result.blob))).toBe('jpeg');
  }, 120000);

  // B3's gate: the same photo in the pool, with the default timeout [rejected
  // at 30.0 s before], since the pool now times silence, not the whole job.
  it('PERF-01: a 48 MP photo with a size target finishes in the pool', async () => {
    const pool = createPool({ size: 1 });
    try {
      const result = await pool.compress(await generatedImage(8000, 6000), { format: 'jpeg', maxSizeMB: 0.2 });
      expect(result.compressedSize).toBeLessThanOrEqual(0.2 * 1024 * 1024);
      expect(result.missedTarget).toBe(false);
    } finally {
      pool.destroy();
    }
  }, 180000);

  itTracked('PERF-02/size-target-encodes', 'a size target costs four encodes at most, and is met', async () => {
    const source = await generatedImage(3000, 2000);
    const maxSizeMB = 0.3;
    const { value: result, encodes } = await countEncodes(() => compress(source, { format: 'jpeg', maxSizeMB }));
    expect(result.compressedSize).toBeLessThanOrEqual(maxSizeMB * 1024 * 1024);
    expect(encodes(), 'PERF-02 encodes').toBeLessThanOrEqual(4);
  }, 60000);
});
