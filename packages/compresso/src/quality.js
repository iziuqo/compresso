/**
 * The quality search shared by `compress()` and `planPhoto()`. Host-free: it
 * only sees an `encode(quality) → bytes` function, so it runs the same over a
 * canvas, a native encoder or a test fake. Cancelling is the caller's job:
 * throw from `encode` and the search stops there.
 */

/** Encodes per search, the first one included (PERF-02). */
const MAX_ENCODES = 4;
/** A fit this close under the ceiling is good enough to stop on. */
const CLOSE_ENOUGH = 0.9;
/** Where each guess aims, inside the good-enough band (best on measured encoder curves). */
const AIM = 0.97;
const MIN_QUALITY = 0.01;

/**
 * Highest quality found, at or below `quality`, whose encode fits in
 * `ceiling` bytes; `null` when none of the tries does. Tries `quality` first,
 * so a source that already fits costs one encode. Then each guess
 * interpolates where size meets the ceiling, along the line through the two
 * encodes that bound it best (at first the origin, then the last two misses,
 * then the best fit and the nearest miss). It stops at a fit within 10% under
 * the ceiling, or after four encodes.
 *
 * @param {(quality: number) => Promise<number>} encode Encoded size in bytes.
 * @param {number} quality Starting (and highest) quality, 0–1.
 * @param {number} ceiling Byte budget the result must fit in.
 * @param {(fraction: number) => void} [onStep] How far the search is, 0–1.
 * @returns {Promise<number | null>}
 */
export async function findQuality(encode, quality, ceiling, onStep) {
  // The nearest miss so far, and the point the next guess interpolates from:
  // the origin at first, then the previous miss, then the best fit.
  let q2 = quality;
  let s2 = await encode(quality);
  if (s2 <= ceiling) return quality;
  let q1 = 0;
  let s1 = 0;
  let fit = null;
  for (let i = 1; i < MAX_ENCODES; i++) {
    // Two misses of the same size give no slope to follow: halve instead.
    // Rounded so repeated values hit a host's encode cache.
    const guess = s2 === s1 ? q2 / 2 : q1 + ((q2 - q1) * (ceiling * AIM - s1)) / (s2 - s1);
    const q = Math.round(Math.min(q2 - MIN_QUALITY, Math.max(MIN_QUALITY, guess)) * 1000) / 1000;
    if (q < MIN_QUALITY || q <= fit) break;
    const size = await encode(q);
    onStep?.(i / (MAX_ENCODES - 1));
    if (size > ceiling) {
      if (fit === null) [q1, s1] = [q2, s2];
      [q2, s2] = [q, size];
    } else {
      q1 = fit = q;
      s1 = size;
      if (size >= ceiling * CLOSE_ENOUGH) break;
    }
  }
  return fit;
}
