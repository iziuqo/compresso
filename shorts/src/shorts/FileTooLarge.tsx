import type { ReactNode } from 'react';
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import measured from '../measured.json';
import { Ground, Mono } from '../parts';
import { Name, Plates, pressGap } from '../Plates';
import { Cue, semitones } from '../sound';
import { beats, ease, formatBytes, frames, px, safe, sec, tween, W } from '../system';

/**
 * File too large., 13 s, loops; one cut per language. Everyone has been
 * turned away by a size limit. The rejections pile up into a beat, then one
 * tap ends them, and the line says why the app stays on the phone.
 *
 * The dialogs are generic, drawn here in the app's hairline style: no brand,
 * no real site. Everything inside the app is the app, captured by
 * scripts/measure.mjs.
 */
export const TOO_LARGE = { duration: sec(13) };

export type Copy = {
  ok: string;
  dialogs: { title: string; body: string; limit?: number }[];
  keep: string;
};

// Each rejection lands on the beat, a little sooner than the last.
const LANDS = [0, 4, 6, 7, 8, 9].map(beats);
const SILENCE = sec(5); // the groove stops dead
const APP = sec(5.5); //   the tap on "Upload form, under 1 MB", in the real app
const app = measured['too-large'];
// The result lands as the app shows it, four beats after the tap (scripts/measure.mjs).
const DONE = APP + sec(app.at.done - app.at.tap); // the only major chord
const KEEP = sec(9); //    the one line
const ENTER = sec(11);
const CLAMP = sec(12); //  a second of the name, then the loop's cut lands the first no again

const CARD = { w: px(920), step: px(168), top: px(400) };

/** Lands whole on its knock, so frame 0 already shows the first no, then settles like a dropped card. */
function Dialog({ title, body, ok, at, t }: { title: string; body: ReactNode; ok: string; at: number; t: number }) {
  const settle = 1 - tween(t, at, frames('standard'), ease.entrance);
  return (
    <div style={{
      position: 'absolute', left: (W - CARD.w) / 2, width: CARD.w, top: 0,
      transform: `translateY(${settle * -px(16)}px) scale(${1 + settle * 0.025})`,
      background: 'var(--surface)', border: `${px(1)}px solid var(--line-2)`, borderRadius: px(28),
    }}>
      <div style={{ padding: `${px(40)}px ${px(44)}px ${px(36)}px` }}>
        <div style={{ fontSize: px(46), fontWeight: 500, letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ fontSize: px(36), color: 'var(--ink-2)', marginTop: px(14), lineHeight: 1.3 }}>{body}</div>
      </div>
      <div style={{ borderTop: `${px(1)}px solid var(--line)`, padding: `${px(26)}px ${px(44)}px`, textAlign: 'right', fontSize: px(36), fontWeight: 500 }}>
        {ok}
      </div>
    </div>
  );
}

/** Fills `{limit}` with the size, in Geist Mono: the numbers carry the drama. */
function withLimit(text: string, limit: number | undefined, locale: string) {
  const [before, after] = text.split('{limit}');
  return limit === undefined ? text : <>{before}<Mono size={px(36)} style={{ color: 'var(--ink)' }}>{formatBytes(locale, limit)}</Mono>{after}</>;
}

export function FileTooLarge({ copy, locale }: { copy: Copy; locale: string }) {
  const f = useCurrentFrame();

  return (
    <Ground>
      {f < SILENCE && (
        <div style={{ position: 'absolute', inset: 0 }}>
          {copy.dialogs.map((d, i) => f >= LANDS[i] && (
            <div key={d.title} style={{ position: 'absolute', inset: 0, top: CARD.top + i * CARD.step }}>
              <Dialog title={d.title} body={withLimit(d.body, d.limit, locale)} ok={copy.ok} at={LANDS[i]} t={f} />
            </div>
          ))}
        </div>
      )}
      {/* The app's own screen recording, from just before the tap, full width under YouTube's top bar. */}
      <Sequence from={APP - sec(0.3)} durationInFrames={KEEP - APP + sec(0.3)} layout="none">
        <OffthreadVideo src={staticFile(app.flow)} trimBefore={sec(app.at.tap - 0.3)} muted
          style={{ position: 'absolute', left: 0, top: safe.top, width: W }} />
      </Sequence>
      {f >= KEEP && f < CLAMP && (
        <AbsoluteFill style={{ justifyContent: 'center', padding: `0 ${safe.side}px`, paddingBottom: px(240) }}>
          {/* Gone before the plates cross it: white on white would smear. */}
          <div style={{
            fontSize: px(84), fontWeight: 500, lineHeight: 1.08, letterSpacing: '-0.025em',
            opacity: tween(f, KEEP, frames('entrance'), ease.entrance) - tween(f, ENTER, frames('standard'), ease.exit),
          }}>
            {copy.keep}
          </div>
        </AbsoluteFill>
      )}
      {f >= ENTER && <Plates gap={pressGap(f - ENTER, CLAMP - ENTER)} />}
      {f >= CLAMP && <Name />}
      <Score />
    </Ground>
  );
}

/**
 * Pain as rhythm: a muted wood block on every no, a semitone higher each
 * time, with shutter and a low knock filling in as they speed up. Dead
 * silence, one shutter click on the tap, and the knock rises into the only
 * major chord when the photo fits. Then the press.
 */
function Score() {
  const fill = Array.from({ length: (SILENCE - beats(6)) / beats(0.5) }, (_, i) => beats(6) + i * beats(0.5));
  return (
    <>
      {LANDS.map((f, i) => <Cue key={f} sound="knock" at={f} volume={0.8} pitch={semitones(i)} />)}
      {fill.map((f, i) => <Cue key={f} sound={i % 2 ? 'shutter' : 'knock'} at={f} volume={i % 2 ? 0.18 : 0.3} pitch={i % 2 ? 1 : semitones(-12)} />)}
      <Cue sound="shutter" at={APP} volume={0.6} />
      {[0, 4, 7].map((n) => <Cue key={n} sound="knock" at={DONE} volume={0.35} pitch={semitones(n + 5)} />)}
      {[0, 4, 7].map((n) => <Cue key={`g${n}`} sound="glass-tick" at={DONE} volume={0.3} pitch={semitones(n)} />)}
      <Cue sound="press-logo" at={CLAMP - sec(2)} />
    </>
  );
}
