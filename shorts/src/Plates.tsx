import { interpolate } from 'remotion';
import { ease, frames, H, px, sec, tween, ui, W } from './system';

/**
 * The two halves of the Compresso icon (website/public/logo.svg), drawn across
 * the whole frame so they can travel in from its edges. In the logo they sit
 * on a 512 grid with a 40-unit gap; `gap` is that gap at this moment, so 40 is
 * the closed icon and larger values open the press.
 */
const TOP = 'M104 128H408L332 236H180Z';
const BOTTOM = 'M104 384H408L332 276H180Z';
const CLOSED = 40;
const OPEN = 1000; // both plates outside the frame
const NEAR = 110; //  the hover: just short of contact
const AIR = sec(0.5);

/**
 * The clamp every Short builds to, as the gap at frame `t` (counted from the
 * plates' entry) of a press that closes at `at`: glide in, hover for half a
 * second of air, go into contact on the exit curve and stop dead. From
 * `release` the plates open on the entrance curve.
 */
export function pressGap(t: number, at: number, release = Infinity) {
  if (t >= release) return interpolate(tween(t, release, frames('ceremony'), ease.entrance), [0, 1], [CLOSED, OPEN]);
  const approach = interpolate(tween(t, 0, at - AIR, ease.glide), [0, 1], [OPEN, NEAR]);
  return approach - (NEAR - CLOSED) * tween(t, at - frames('micro'), frames('micro'), ease.exit);
}

/** The plates at a given gap. The default scale makes the icon's 512 box the frame width. */
export function Plates({ gap, scale = W / 512 }: { gap: number; scale?: number }) {
  const shift = (gap - CLOSED) / 2;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
      <g transform={`translate(${W / 2} ${H / 2}) scale(${scale}) translate(-256 -256)`} fill="var(--ink)">
        <path d={TOP} transform={`translate(0 ${-shift})`} />
        <path d={BOTTOM} transform={`translate(0 ${shift})`} />
      </g>
    </svg>
  );
}

/**
 * The name, once, under the closed icon, set as the app sets its wordmark:
 * Geist SemiBold, a hair tight (mobile/src/app/index.tsx).
 */
export function Name() {
  return (
    <div style={{ position: 'absolute', width: '100%', textAlign: 'center', top: H / 2 + 128 * (W / 512) + px(56),
      fontFamily: ui, fontWeight: 600, fontSize: px(52), letterSpacing: '-0.012em' }}>
      Compresso
    </div>
  );
}
