/**
 * compresso.js/plan — the photo and video decisions, without the pixels.
 *
 * `compress()` decides and encodes in one go, on a canvas. The planner keeps
 * only the deciding, so any host that can encode (a canvas, iOS ImageIO,
 * Android Bitmap, a test fake) reaches the same answers through a small
 * adapter, the `PhotoHost`. It is what the Compresso apps run on the phone,
 * and it never touches the DOM, so it also runs in Node and React Native.
 *
 * The rules:
 *   1. Never bigger: output is capped at the source's own size, and when
 *      nothing fits, the source itself is the answer.
 *   2. A size target is a ceiling, met by searching quality down
 *      (`findQuality`, at most 11 encodes, measured in memory; only the winner
 *      is written).
 *   3. When no quality meets the target (a 48 MP photo into "under 200 KB"),
 *      the long edge steps down by 20% and the search runs again, rather than
 *      failing. Below a 480 px long edge it gives the smallest file it can make
 *      and says so.
 *
 * Video follows the same rules through a `VideoHost`; see video.js.
 */
import { resolveFormat, throwIfAborted } from './host.js';
import { findQuality } from './quality.js';

export { findQuality, resolveFormat };
export { fitVideo, planVideo } from './video.js';

/** Each resize keeps this share of the long edge. */
const EDGE_STEP = 0.8;
/** Never resize below this long edge, in pixels, to meet a target. */
const MIN_LONG_EDGE = 480;
const MAX_EDGE_TRIES = 8;
/** Quality of the last-resort file when a target is out of reach. */
const FLOOR_QUALITY = 0.05;
/** Room left in a shared budget for container overhead. */
const BUDGET_MARGIN = 0.97;
/** Weight of a file whose size is unknown when there's nothing to average. */
const TYPICAL_PHOTO_BYTES = 3_000_000;

/**
 * Plan and write one photo through `host`. See types/plan.d.ts for the
 * `PhotoHost` contract and the shape of the returned decision.
 */
export async function planPhoto(host, recipe, { signal, onProgress } = {}) {
  const format = resolveFormat(recipe.formats, host.formats);
  const quality = Math.min(1, Math.max(0.01, recipe.quality ?? 0.8));
  const target = recipe.targetBytes ?? Infinity;
  const lossy = format !== 'png';
  const measure = (q) => {
    throwIfAborted(signal);
    return host.measure(format, q);
  };
  const finish = (decision) => {
    onProgress?.(1);
    return decision;
  };
  const write = async (q, missedTarget) =>
    finish({ result: await host.write(format, q), format, quality: lossy ? q : null, kept: false, missedTarget });
  const keep = async (missedTarget) =>
    finish({ result: await host.keep(), format: null, quality: null, kept: true, missedTarget });

  let maxLongEdge = recipe.maxLongEdge ?? undefined;
  for (let attempt = 0; ; attempt++) {
    throwIfAborted(signal);
    const { width, height, originalSize } = await host.prepare(maxLongEdge);
    try {
      const ceiling = Math.min(target, originalSize || Infinity);
      // Progress assumes a photo settles by its second attempt, as most do.
      const onStep = (step) => onProgress?.(Math.min(0.95, (attempt + step) / 2));
      // PNG ignores quality: one encode either fits or doesn't.
      const fit = lossy
        ? await findQuality(measure, quality, ceiling, onStep)
        : (await measure(quality)) <= ceiling ? quality : null;
      if (fit !== null) return await write(fit, false);

      // Nothing fits. When the caller's target is what binds, try smaller.
      const targetBinds = target < (originalSize || Infinity);
      const nextEdge = Math.round(Math.max(width, height) * EDGE_STEP);
      if (targetBinds && attempt < MAX_EDGE_TRIES && nextEdge >= MIN_LONG_EDGE) {
        maxLongEdge = nextEdge;
        continue;
      }

      // Only the source's own size binds: the source is the smallest honest answer.
      if (!targetBinds) return await keep(false);

      // The target is out of reach even at the smallest size: give the
      // smallest file there is, and say so, rather than nothing.
      const floorBigger = originalSize > 0 && (await measure(FLOOR_QUALITY)) >= originalSize;
      return await (floorBigger ? keep(true) : write(FLOOR_QUALITY, true));
    } finally {
      host.release?.();
    }
  }
}

/**
 * Split one byte budget across files ("all of these under 10 MB"), roughly in
 * proportion to their size, since a big file has more to give up; it works the
 * same for photos and videos. No file gets more than it already weighs; what a
 * small one can't use flows to the others. A file of unknown size (0) is
 * weighed like an average one.
 *
 * @param {number} totalBytes The budget for all photos together.
 * @param {number[]} sizes Each photo's size in bytes, 0 when unknown.
 * @returns {number[]} Each photo's `targetBytes`, in the same order.
 */
export function allocateBudget(totalBytes, sizes) {
  const known = sizes.filter((size) => size > 0);
  const average = known.length > 0 ? known.reduce((a, b) => a + b, 0) / known.length : TYPICAL_PHOTO_BYTES;
  const weights = sizes.map((size) => (size > 0 ? size : average));
  const shares = weights.map(() => 0);
  let open = weights.map((_, i) => i);
  let remaining = totalBytes * BUDGET_MARGIN;

  // Each round, files whose proportional share would reach their own weight
  // are capped at it and leave; the rest share what's left. It ends in a round
  // that caps no one, so it runs at most once per file.
  while (open.length > 0 && remaining > 1) {
    const weight = open.reduce((sum, i) => sum + weights[i], 0);
    const share = (i) => (remaining * weights[i]) / weight;
    const capped = open.filter((i) => share(i) >= weights[i]);
    if (capped.length === 0) {
      for (const i of open) shares[i] = share(i);
      break;
    }
    for (const i of capped) {
      shares[i] = weights[i];
      remaining -= weights[i];
    }
    open = open.filter((i) => !capped.includes(i));
  }
  return shares.map(Math.floor);
}
