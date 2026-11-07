/**
 * The frame, clock and curves every Short shares. Nothing here is a new
 * design decision: colours and type come from the app's tokens.css, curves and
 * timings from its motion.ts, sizes are printed by the app's own formatter.
 * The Shorts only add what video needs: a frame, a 120 BPM clock and the area
 * YouTube's interface leaves free.
 */
import '../../website/compresso-app/src/design/tokens.css';
import './fonts.css';
import { continueRender, delayRender, Easing, interpolate } from 'remotion';
import { DUR, EASE } from '../../website/compresso-app/src/design/motion';

export { formatBytes, formatPercent } from '../../mobile/src/i18n/format';

/** Vertical 4K at 60 fps: YouTube keeps the most detail from the largest upload. */
export const FPS = 60;
export const W = 2160;
export const H = 3840;

/** Sizes are designed at 1080 wide, the width YouTube quotes for Shorts. */
export const px = (n: number) => (n * W) / 1080;

/** Frames from seconds, and from beats at 120 BPM (a beat is 0.5 s, a bar 2 s). */
export const sec = (s: number) => Math.round(s * FPS);
export const beats = (n: number) => sec(n / 2);
/** An app duration (motion.ts, in ms) in frames. */
export const frames = (d: keyof typeof DUR) => (DUR[d] * FPS) / 1000;

const bezier = (css: string) => {
  const [x1, y1, x2, y2] = css.match(/[\d.]+/g)!.map(Number);
  return Easing.bezier(x1, y1, x2, y2);
};
/** The app's four curves. None can overshoot, so nothing on screen can bounce. */
export const ease = {
  standard: bezier(EASE.standard),
  entrance: bezier(EASE.entrance),
  exit: bezier(EASE.exit),
  glide: bezier(EASE.glide),
};

/** 0 → 1 across `length` frames from `start`, on a curve, held at both ends. */
export const tween = (frame: number, start: number, length: number, curve = ease.standard) =>
  interpolate(frame, [start, start + length], [0, 1], {
    easing: curve, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

/**
 * Where YouTube draws over a Short: the search bar on top, the title and
 * channel at the bottom, the buttons down the right. Approximate; every master
 * is checked on real phones before it ships.
 */
export const safe = { top: px(140), bottom: px(420), right: px(160), side: px(64) };

export const ui = 'var(--font-ui)';
export const mono = 'var(--font-mono)';

// Hold the first frame until every face is loaded, so no frame renders in a
// fallback font. The faces are declared in tokens.css and fonts.css.
const fontsReady = delayRender('fonts');
Promise.all(['400 1em Geist', '500 1em Geist', '600 1em Geist', '400 1em "Geist Mono"']
  .map((face) => document.fonts.load(face)))
  .then(() => continueRender(fontsReady));
