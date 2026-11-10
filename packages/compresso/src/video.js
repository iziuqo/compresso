/**
 * The video half of compresso.js/plan: bitrate, resolution and frame rate,
 * without the pixels.
 *
 * Phones encode video on their hardware chip, so unlike a photo, a video
 * can't be test-encoded ten times in memory. The planner instead works out the
 * settings from the numbers (`fitVideo`, pure), the host encodes once, and
 * when the encoder overshoots (hardware lands within about 5–10% of the
 * bitrate it is asked for) one corrective pass runs with the overshoot priced
 * in (`planVideo`). The host can be Media3 on Android, AVFoundation on iOS,
 * WebCodecs or a test fake.
 *
 * The rules:
 *   1. Never bigger: output is capped at the source's own size, and when
 *      nothing smaller is possible, the source itself is the answer.
 *   2. Without a size target, `quality` sets the bitrate as bits per pixel per
 *      frame, at the source's resolution and frame rate.
 *   3. A size target is a ceiling. Its byte budget becomes a bitrate, and the
 *      resolution steps down a ladder of standard heights until each pixel
 *      gets enough bits to look clean, rather than blocky at full size.
 */
import { resolveFormat, throwIfAborted } from './host.js';

/** Short-edge heights the resolution steps down through to meet a target. */
const LADDER = [2160, 1440, 1080, 720, 540, 480, 360];
/**
 * Bits per pixel per frame below which H.264 starts to look blocky; a step
 * down the ladder looks better than going under it.
 */
const MIN_BITS_PER_PIXEL = 0.07;
/** Bits per pixel per frame at quality 1, in H.264 terms. */
const BITS_PER_PIXEL_AT_FULL = 0.15;
/** Bits each codec needs for the same picture, relative to H.264. */
const CODEC_COST = { h264: 1, vp9: 0.65, hevc: 0.6, av1: 0.55 };
/** Frame rate a target caps at: 60 fps costs bits a sent clip rarely needs. */
const TARGET_FRAME_RATE = 30;
/** AAC audio bitrate, and the lower one when a budget is tight. */
const AUDIO_BITRATE = 96_000;
const TIGHT_AUDIO_BITRATE = 64_000;
/** Audio may take at most this share of a target's bitrate before it drops to the tight rate. */
const AUDIO_SHARE = 1 / 8;
/** The lowest video bitrate worth encoding at; below it a target is out of reach. */
const MIN_VIDEO_BITRATE = 100_000;
/** Room left under a ceiling for MP4 overhead and a hardware encoder overshooting. */
const MARGIN = 0.92;
/** Encodes at most: the first, and one correction. */
const MAX_PASSES = 2;

/**
 * The encoder settings for `source`, or `null` when the source should be kept
 * because nothing smaller is possible. Pure: no host, no I/O.
 *
 * `overshoot` is how much bigger than estimated the encoder's output came out
 * (1 = spot on); `planVideo` passes it after a pass that missed, so the next
 * plan asks for proportionally fewer bits.
 *
 * @param {object} source See `VideoSource` in types/plan.d.ts.
 * @param {object} recipe See `VideoRecipe`; its first codec is the one planned for.
 * @param {number} [overshoot]
 * @returns {object | null} See `VideoSettings`.
 */
export function fitVideo(source, recipe, overshoot = 1) {
  const { originalSize = 0, durationMs, hasAudio } = source;
  const codec = recipe.codecs[0] ?? 'h264';
  const cost = CODEC_COST[codec] ?? 1;
  const quality = Math.min(1, Math.max(0.01, recipe.quality ?? 0.8));
  const target = recipe.targetBytes ?? Infinity;
  const ceiling = Math.min(target, originalSize || Infinity);
  const seconds = durationMs / 1000;
  if (!(seconds > 0)) throw new RangeError('A video plan needs the duration');
  const audible = hasAudio && recipe.audio !== false;
  const bytesAt = (videoBitrate, audioBitrate) =>
    Math.ceil(((videoBitrate + audioBitrate) * seconds * overshoot) / 8);

  // The quality plan: the source's own size (capped), at `quality`'s bits.
  const full = scaled(source, recipe.maxLongEdge);
  const fps = Math.min(source.fps, recipe.maxFps ?? Infinity);
  const audioBitrate = audible ? AUDIO_BITRATE : 0;
  const videoBitrate = Math.round(BITS_PER_PIXEL_AT_FULL * quality * cost * full.width * full.height * fps);
  const bytes = bytesAt(videoBitrate, audioBitrate);
  const settings = (size, rate, video, audio, estimate) => ({
    codec,
    ...size,
    fps: rate,
    videoBitrate: video,
    audioBitrate: audio,
    bytes: estimate,
  });
  if (bytes <= ceiling * MARGIN) return settings(full, fps, videoBitrate, audioBitrate, bytes);

  // Only the source's own size binds: the source is the smallest honest answer.
  if (target >= (originalSize || Infinity)) return null;

  // The target binds: turn its bytes into bits per second, audio first.
  const targetFps = Math.min(fps, TARGET_FRAME_RATE);
  const total = (target * MARGIN * 8) / seconds / overshoot;
  const audio = !audible ? 0 : AUDIO_BITRATE <= total * AUDIO_SHARE ? AUDIO_BITRATE : TIGHT_AUDIO_BITRATE;
  const video = Math.max(MIN_VIDEO_BITRATE, Math.round(total - audio));

  // The largest rung that still gets enough bits per pixel; the smallest otherwise.
  const shortEdge = Math.min(full.width, full.height);
  const rungs = [shortEdge, ...LADDER.filter((rung) => rung < shortEdge)];
  const clean = (size) => video / (size.width * size.height * targetFps) >= MIN_BITS_PER_PIXEL * cost;
  const sizes = rungs.map((rung) => scaled(full, Infinity, rung));
  const size = sizes.find(clean) ?? sizes.at(-1);
  return settings(size, targetFps, video, audio, bytesAt(video, audio));
}

/**
 * Plan and encode one video through `host`. See types/plan.d.ts for the
 * `VideoHost` contract and the shape of the returned decision.
 */
export async function planVideo(host, recipe, { signal, onProgress } = {}) {
  const { source } = host;
  const codec = resolveFormat(recipe.codecs, host.codecs, 'h264');
  const planned = { ...recipe, codecs: [codec] };
  const original = source.originalSize || Infinity;
  const ceiling = Math.min(recipe.targetBytes ?? Infinity, original);
  const finish = (decision) => {
    onProgress?.(1);
    return decision;
  };
  const keep = async (missedTarget) =>
    finish({ result: await host.keep(), settings: null, kept: true, missedTarget });

  throwIfAborted(signal);
  let settings = fitVideo(source, planned);
  if (!settings) return keep(false);
  let overshoot = 1;
  for (let pass = 1; ; pass++) {
    throwIfAborted(signal);
    const onPass = (fraction) => onProgress?.(Math.min(0.95, (pass - 1 + fraction) / MAX_PASSES));
    const { result, bytes } = await host.encode(settings, { signal, onProgress: onPass });
    const fits = bytes <= ceiling;
    // No more passes, or none would help: the plan itself (at the floor
    // bitrate) already expected to miss.
    const last = pass === MAX_PASSES || settings.bytes > ceiling;
    // A last miss that still beats the source is the smallest file there is:
    // give it, and say so, rather than nothing.
    if (fits || (last && bytes < original)) {
      return finish({ result, settings, kept: false, missedTarget: !fits });
    }
    await host.discard?.(result);
    if (last) return keep(ceiling < original);
    overshoot *= bytes / settings.bytes;
    settings = fitVideo(source, planned, overshoot);
    if (!settings) return keep(false);
  }
}

/**
 * `size` scaled down (never up) so its long edge is at most `maxLongEdge` and
 * its short edge at most `maxShortEdge`, in even pixels, which video encoders
 * need.
 */
function scaled({ width, height }, maxLongEdge, maxShortEdge = Infinity) {
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  const scale = Math.min(1, (maxLongEdge ?? Infinity) / long, maxShortEdge / short);
  // Rounded down, so a cap is never passed; the epsilon absorbs float error.
  const even = (edge) => Math.max(2, 2 * Math.floor((edge * scale) / 2 + 1e-9));
  return { width: even(width), height: even(height) };
}
