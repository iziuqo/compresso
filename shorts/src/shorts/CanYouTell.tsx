import { AbsoluteFill, useCurrentFrame } from 'remotion';
import measured from '../measured.json';
import { Ground, Mono, Photo } from '../parts';
import { Name, Plates, pressGap } from '../Plates';
import { Cue, semitones } from '../sound';
import { ease, formatBytes, formatPercent, frames, px, safe, sec, tween, W } from '../system';

/**
 * Can you tell?, 10 s, loops. The same photo twice: one is the original, one
 * is what the app made of it. People guess in the comments; the reveal sends
 * them back to look again. Wordless: two sizes, two letters, a "?" and
 * what the app took off.
 *
 * Honest by construction: both halves are real files at the size a phone
 * shows them, under one shared push-in, so the only difference is the number.
 */
export const TELL = { duration: sec(10) };

const ASK = sec(5); //      the push-in holds, the clicks stop: "?"
const REVEAL = sec(6); //   the letters flip to the sizes, with the glass tick
const ENTER = sec(7); //    the plates come in over the pair
const CLAMP = sec(8); //    closed icon and the name; at 9 s the pair is back

const m = measured['tell-cat'];
const PANE = { w: W, h: px(620), gap: px(4), top: px(280) };
// A is what the app wrote, B the original: most people pick the wrong one.
const PANES = [
  { src: m.file, label: 'A', size: m.to },
  { src: `photos/${m.photo}.jpg`, label: 'B', size: m.from },
];

export function CanYouTell() {
  const t = useCurrentFrame();
  const shown = t < CLAMP || t >= CLAMP + sec(1);
  // One push-in for both panes, into the fur around the eye. Back to the
  // start after the clamp, so the last second matches frame 0.
  const zoom = t >= CLAMP ? 1 : 1 + 0.14 * tween(t, 0, ASK, ease.glide);
  const flip = tween(t, REVEAL, frames('ceremony'), ease.standard);
  // A split-flap turn: the old face folds away, the new one folds in.
  const fold = { display: 'inline-block', transform: `scaleY(${Math.abs(1 - 2 * flip)})` };
  const asking = t >= ASK && t < CLAMP;

  return (
    <Ground>
      {shown && (
        <>
          <AbsoluteFill style={{ alignItems: 'center', top: safe.top, height: PANE.top - safe.top, justifyContent: 'center' }}>
            <Mono size={px(56)}>
              {!asking ? `${formatBytes('en', m.from)} · ${formatBytes('en', m.to)}`
                : <span style={fold}>{flip < 0.5 ? '?' : `−${formatPercent('en', 1 - m.to / m.from)}`}</span>}
            </Mono>
          </AbsoluteFill>
          {PANES.map((p, i) => (
            <div key={p.label} style={{ position: 'absolute', left: 0, top: PANE.top + i * (PANE.h + PANE.gap), width: PANE.w, height: PANE.h, overflow: 'hidden' }}>
              <Photo src={p.src} style={{ transform: `scale(${zoom})`, transformOrigin: '62% 42%' }} />
              {/* Labelled like the app's Before / After: a dark pill, so it reads on any photo. */}
              <Mono size={px(48)} style={{ position: 'absolute', left: safe.side, top: px(32), padding: `${px(12)}px ${px(22)}px`, borderRadius: 'var(--r-pill)', background: 'rgb(0 0 0 / 0.55)' }}>
                <span style={asking ? fold : undefined}>{flip < 0.5 || !asking ? p.label : formatBytes('en', p.size)}</span>
              </Mono>
            </div>
          ))}
        </>
      )}
      {t >= ENTER && t < CLAMP + sec(1) && <Plates gap={pressGap(t - ENTER, CLAMP - ENTER)} />}
      {!shown && <Name />}
      <Score />
    </Ground>
  );
}

/**
 * A soft shutter click each second, a semitone higher each time, like a clock
 * that isn't one. Then silence for the guess, the glass tick on the reveal
 * with the flap's clack, and the press on the clamp.
 */
function Score() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((n) => <Cue key={n} sound="shutter" at={sec(n)} volume={0.55} pitch={semitones(n)} />)}
      <Cue sound="glass-tick" at={REVEAL} volume={0.7} />
      <Cue sound="shutter" at={REVEAL + frames('ceremony') / 2} volume={0.3} pitch={semitones(-7)} />
      <Cue sound="press-hit" at={CLAMP} />
    </>
  );
}
