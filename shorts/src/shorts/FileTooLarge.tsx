import type { ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { Ground, Mono } from '../parts';
import { Name, Plates, pressGap } from '../Plates';
import { beats, ease, formatBytes, frames, px, safe, sec, tween, W } from '../system';

/**
 * File too large., 14 s, loops; one cut per language. Everyone has been
 * turned away by a size limit. The rejections pile up into a beat, then one
 * tap ends them, and the line says why the app stays on the phone.
 *
 * The dialogs are generic, drawn here in the app's hairline style: no brand,
 * no real site. Everything inside the app is the app, captured by
 * scripts/measure.mjs.
 */
export const TOO_LARGE = { duration: sec(14) };

export type Copy = {
  ok: string;
  dialogs: { title: string; body: string; limit?: number }[];
  keep: string;
};

// Each rejection lands on the beat, a little sooner than the last.
const LANDS = [0, 4, 6, 7, 8, 9].map(beats);
const APP = sec(5.5); //   after half a second of silence, Compresso opens on "Upload form, under 1 MB"
const DONE = sec(6.5); //  under the limit
const KEEP = sec(8.5); //  the one line
const ENTER = sec(11);
const CLAMP = sec(12); //  then the first dialog lands again at 13 s
const LOOP = sec(13);

const CARD = { w: px(920), step: px(168), top: px(400) };

function Dialog({ title, body, ok, at, t }: { title: string; body: ReactNode; ok: string; at: number; t: number }) {
  const land = tween(t, at, frames('entrance'), ease.entrance);
  return (
    <div style={{
      position: 'absolute', left: (W - CARD.w) / 2, width: CARD.w, top: 0,
      transform: `translateY(${(1 - land) * px(40)}px)`, opacity: land,
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
  // The last second replays the first, so the loop has no seam.
  const t = f >= LOOP ? f - LOOP : f;
  const pile = f < APP || f >= LOOP;

  return (
    <Ground>
      {pile && (
        <div style={{ position: 'absolute', inset: 0 }}>
          {copy.dialogs.map((d, i) => t >= LANDS[i] && (
            <div key={d.title} style={{ position: 'absolute', inset: 0, top: CARD.top + i * CARD.step }}>
              <Dialog title={d.title} body={withLimit(d.body, d.limit, locale)} ok={copy.ok} at={LANDS[i]} t={t} />
            </div>
          ))}
        </div>
      )}
      {f >= APP && f < KEEP && (
        // The app as it drew itself, full width, top-aligned under YouTube's bar.
        <Img src={staticFile(f < DONE ? `out/too-large-purpose.png` : `out/too-large-done.png`)}
          style={{ position: 'absolute', left: 0, top: safe.top, width: W }} />
      )}
      {f >= KEEP && f < CLAMP && (
        <AbsoluteFill style={{ justifyContent: 'center', padding: `0 ${safe.side}px`, paddingBottom: px(240) }}>
          <div style={{ fontSize: px(84), fontWeight: 500, lineHeight: 1.08, letterSpacing: '-0.025em', opacity: tween(f, KEEP, frames('entrance'), ease.entrance) }}>
            {copy.keep}
          </div>
        </AbsoluteFill>
      )}
      {f >= ENTER && f < LOOP && <Plates gap={pressGap(f - ENTER, CLAMP - ENTER)} />}
      {f >= CLAMP && f < LOOP && (
        <Name />
      )}
    </Ground>
  );
}
