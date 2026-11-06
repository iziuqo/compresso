import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import measured from '../measured.json';
import { Ground, Mono, Photo } from '../parts';
import { Name, Plates, pressGap } from '../Plates';
import { ease, formatBytes, formatPercent, frames, H, px, sec, tween, W } from '../system';

/**
 * The Press, 12 s, loops. The icon comes down like a press on a heavy photo;
 * the bytes get crushed and the photo comes out the same. Wordless, so one
 * master plays in every market.
 *
 * Two presses of 6 s. The loop starts half a second into the first, so
 * frame 0 already has the plates moving and the last frame cuts into it.
 */
export const PRESS = { duration: sec(12), lead: sec(0.5), length: sec(6) };

type Shot = keyof typeof measured;
const SHOTS: { shot: Shot; wordmark: boolean }[] = [
  { shot: 'press-lake', wordmark: true },
  { shot: 'press-milky-way', wordmark: false },
];

// One press, from its photo's cut. Every cut lands on the 120 BPM grid.
const CLAMP = sec(2); //     closed icon on black; the press sounds
const RELEASE = sec(2.5); // the plates open on the same photo and the size rolls down
const LAND = sec(3.5); //    the number lands with the glass tick
const SWEEP = sec(4); //     the compare seam crosses and nothing changes

function Press({ shot, wordmark, t }: { shot: Shot; wordmark: boolean; t: number }) {
  const m = measured[shot];
  const clamped = t >= CLAMP && t < RELEASE;
  const size = interpolate(tween(t, RELEASE, LAND - RELEASE), [0, 1], [m.from, m.to]);
  // Right of the seam is what the app wrote; it sweeps right to left.
  const seam = W * (1 - tween(t, SWEEP, sec(1.5), ease.glide));

  return (
    <Ground>
      {!clamped && (
        <>
          <Photo src={`photos/${m.photo}.jpg`} />
          {t >= SWEEP && <Photo src={m.file} style={{ clipPath: `inset(0 0 0 ${seam}px)` }} />}
          {t >= SWEEP && seam > 0 && (
            // The app's compare seam: a hairline and the big white knob.
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: seam - px(1), width: px(2), background: 'var(--ink)' }}>
              <div style={{ position: 'absolute', top: H * 0.7, left: px(1) - px(26), width: px(52), height: px(52), borderRadius: '50%', background: 'var(--ink)' }} />
            </div>
          )}
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Mono size={W / 6}>{formatBytes('en', size)}</Mono>
            {t >= LAND && (
              <Mono size={px(40)} style={{ position: 'absolute', top: H / 2 + px(130), opacity: tween(t, LAND, frames('entrance'), ease.entrance) }}>
                {formatBytes('en', m.from)} → {formatBytes('en', m.to)} · −{formatPercent('en', 1 - m.to / m.from)}
              </Mono>
            )}
          </AbsoluteFill>
        </>
      )}
      <Plates gap={pressGap(t, CLAMP, RELEASE)} />
      {clamped && wordmark && (
        <Name />
      )}
    </Ground>
  );
}

export function ThePress() {
  const t = (useCurrentFrame() + PRESS.lead) % PRESS.duration;
  const i = Math.floor(t / PRESS.length);
  return <Press {...SHOTS[i]} t={t - i * PRESS.length} />;
}
