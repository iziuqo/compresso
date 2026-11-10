/**
 * The quality search shared by `compress()` and `planPhoto()`. Host-free: it
 * only sees an `encode(quality) → bytes` function, so it runs the same over a
 * canvas, a native encoder or a test fake. Cancelling is the caller's job:
 * throw from `encode` and the search stops there.
 */

/** Encodes tried after the first one, at most. */
const MAX_QUALITY_STEPS = 10;

/**
 * Highest quality, at or below `quality`, whose encode fits in `ceiling` bytes;
 * `null` when even the lowest searched quality doesn't. Tries `quality` first,
 * then binary-searches down, so a source that already fits costs one encode.
 *
 * @param {(quality: number) => Promise<number>} encode Encoded size in bytes.
 * @param {number} quality Starting (and highest) quality, 0–1.
 * @param {number} ceiling Byte budget the result must fit in.
 * @param {(fraction: number) => void} [onStep] How far the search is, 0–1.
 * @returns {Promise<number | null>}
 */
export async function findQuality(encode, quality, ceiling, onStep) {
  if ((await encode(quality)) <= ceiling) return quality;

  let low = 0;
  let high = quality;
  let best = null;
  for (let i = 1; i <= MAX_QUALITY_STEPS && high - low >= 0.01; i++) {
    // Rounded so repeated values hit a host's encode cache.
    const mid = Math.round(((low + high) / 2) * 1000) / 1000;
    if ((await encode(mid)) <= ceiling) {
      best = low = mid;
    } else {
      high = mid;
    }
    onStep?.(i / MAX_QUALITY_STEPS);
  }
  return best;
}
