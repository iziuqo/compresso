import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Counter, rollTicks } from '../Counter';
import measured from '../measured.json';
import { Ground, Mono, Photo } from '../parts';
import { Name, Plates, pressGap } from '../Plates';
import { Cue, semitones } from '../sound';
import { beats, ease, formatBytes, formatPercent, frames, H, px, sec, tween, W } from '../system';

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

/** The size on screen at frame `t` of a press: it rolls down after the release. */
const sizeAt = (shot: Shot, t: number) =>
  interpolate(tween(t, RELEASE, LAND - RELEASE), [0, 1], [measured[shot].from, measured[shot].to]);

function Press({ shot, wordmark, t }: { shot: Shot; wordmark: boolean; t: number }) {
  const m = measured[shot];
  const clamped = t >= CLAMP && t < RELEASE;
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
            <Counter bytes={sizeAt(shot, t)} size={W / 6} turning={t < RELEASE ? 0 : 1 - tween(t, LAND - frames('standard'), frames('standard'))} />
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

/**
 * The score of one press, from its photo's cut at frame `s`: the press logo
 * (its hum rises under the plates, its hit lands on the clamp), a counter tick
 * each time the size changes, the glass tick when it lands, then the groove
 * drops back in for the sweep: shutter on the eighths, a low knock on the beat.
 */
function PressScore({ shot, s }: { shot: Shot; s: number }) {
  const groove = Array.from({ length: (PRESS.length - SWEEP) / beats(0.5) }, (_, i) => s + SWEEP + i * beats(0.5));
  return (
    <>
      <Cue sound="press-logo" at={s} />
      {rollTicks((f) => sizeAt(shot, f - s), s + RELEASE, s + LAND).map((f) => <Cue key={f} sound="counter-tick" at={f} volume={0.45} />)}
      <Cue sound="glass-tick" at={s + LAND} volume={0.7} />
      {groove.map((f, i) => <Cue key={f} sound="shutter" at={f} volume={i % 2 ? 0.12 : 0.22} />)}
      {groove.filter((_, i) => i % 2 === 0).map((f) => <Cue key={f} sound="knock" at={f} volume={0.4} pitch={semitones(-7)} />)}
    </>
  );
}

export function ThePress() {
  const t = (useCurrentFrame() + PRESS.lead) % PRESS.duration;
  const i = Math.floor(t / PRESS.length);
  // Each press starts on its photo's cut; the first one again at the end, so the sound loops too.
  const starts = [...SHOTS.map((_, k) => k * PRESS.length), PRESS.duration].map((s) => s - PRESS.lead);
  return (
    <>
      <Press {...SHOTS[i]} t={t - i * PRESS.length} />
      {starts.map((s, k) => <PressScore key={s} shot={SHOTS[k % SHOTS.length].shot} s={s} />)}
    </>
  );
}
