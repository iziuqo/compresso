/**
 * Can You Tell? (wave three, 07): the quality proof. A glass loupe reads the
 * photo up close before the press; after it, the original and the pressed
 * print side by side with their sizes hidden, shuffled like shells, the loupe
 * over the same detail in both, and the answer told by glass: a block rises
 * under each print, a tower and a slice, each with its size. No red.
 */
import type { CSSProperties } from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { ease, H, px, ui, W } from '../system';
import { B, mix, Size, span } from './ritual';
import type { Pose, Press } from './scene';

/** Details worth a close look, as shares of the photo's 4:3 frame: an orange's skin, a leaf, a banana's tip. */
const DETAILS: [number, number][] = [[0.85, 0.6], [0.37, 0.72], [0.6, 0.25]];
/** The loupe's stops before the press, one detail each; it comes in on the first and leaves before the phone. */
export const LOOKS = [1, 2.5, 4];
const LOUPE = { r: px(200), zoom: 3 };
/** The game: the prints swap places on these beats, then the loupe reads the same detail in each; then the answer. */
export const SWAPS = [19, 19.5, 20];
export const READ = [20.75, 21.75];
export const ANSWER = 23;
export const TELL_OUT = B.lift; // the studio gives way to the two prints

/** The loupe: a glass ring, the photo inside it `zoom` times closer around `at` (a share of the photo), over `rect` (the photo in the frame, in px). */
function Loupe({ src, rect, at, opacity }: { src: string; rect: { left: number; top: number; width: number; height: number }; at: [number, number]; opacity: number }) {
  const { r, zoom } = LOUPE;
  const cx = rect.left + at[0] * rect.width, cy = rect.top + at[1] * rect.height;
  return (
    <div style={{ position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: '50%', overflow: 'hidden', opacity,
      boxShadow: `0 ${px(18)}px ${px(48)}px rgb(0 0 0 / 0.55)` }}>
      <Img src={src} style={{ position: 'absolute', left: r - at[0] * rect.width * zoom, top: r - at[1] * rect.height * zoom, width: rect.width * zoom, height: rect.height * zoom, objectFit: 'cover' }} />
      {/* The glass over it: its rim, a soft inner glow and one highlight. */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 32% 26%, rgb(255 255 255 / 0.28), transparent 38%)',
        boxShadow: `inset 0 0 0 ${px(5)}px rgb(255 255 255 / 0.85), inset 0 0 ${px(26)}px rgb(255 255 255 / 0.3)` }} />
    </div>
  );
}

/** The loupe over the photo while it fills the frame, from the opening to the phone: in, three stops, out. */
export function Looking({ press, p, t }: { press: Press; p: Pose; t: number }) {
  const [a, b] = [press.onStack(p, -0.5, 0.5, -0.5), press.onStack(p, 0.5, 0.5, 0.5)];
  const rect = { left: Math.min(a[0], b[0]) * W, top: Math.min(a[1], b[1]) * H, width: Math.abs(b[0] - a[0]) * W, height: Math.abs(b[1] - a[1]) * H };
  // From one detail to the next, gliding; it comes up from below the frame and leaves the same way.
  let at = DETAILS[0];
  LOOKS.slice(1).forEach((s, i) => {
    const k = span(t, s - 0.6, s, ease.glide);
    at = [mix(at[0], DETAILS[i + 1][0], k), mix(at[1], DETAILS[i + 1][1], k)];
  });
  const rise = 1.4 * (1 - span(t, B.line, LOOKS[0], ease.entrance)) + 1.4 * span(t, LOOKS[2] + 0.8, B.phone, ease.exit);
  return <Loupe src={press.photos[0].before} rect={rect} at={[at[0], at[1] + rise]} opacity={span(t, B.line, B.line + 0.3)} />;
}

/** A print in the game: its photo, cropped 4:3 as the scene shows it. */
const card = (left: number, top: number, w: number): CSSProperties => ({ position: 'absolute', left: left * W, top: top * H, width: w * W, height: (w * W * 0.75), borderRadius: px(24), objectFit: 'cover' });

/**
 * The game and the answer, from the lift: the original (left) and the
 * pressed print (right) come in side by side, swap places three times, the
 * loupe reads the orange in each with a "?" over both; then each drops to
 * the floor and a glass block rises under it, as tall as its file.
 */
export function Game({ press, t }: { press: Press; t: number }) {
  const [{ before, after, from, to }] = press.photos;
  const w = 0.42, gap = 0.04, slots = [0.5 - gap / 2 - w, 0.5 + gap / 2];
  const h = (w * W * 0.75) / H, top = 0.32;
  // Each swap trades the two places, the one going right passing over the top.
  const swaps = SWAPS.reduce((n, s) => n + span(t, s, s + 0.4, ease.glide), 0);
  const place = (start: number) => {
    const at = start + swaps, from = Math.floor(at) % 2, k = at % 1; // the place it left, and how far across it is
    return { x: mix(slots[from], slots[1 - from], k), lift: Math.sin(k * Math.PI) * (from === 0 ? -0.12 : 0.12) };
  };
  const shown = span(t, B.lift + 0.2, B.lift + 0.8, ease.entrance);
  const ask = span(t, READ[0] - 0.4, READ[0], ease.standard) - span(t, ANSWER, ANSWER + 0.3);
  // The answer: both settle on a floor line, then glass rises under each, as tall as its file.
  const floor = 0.86, tallest = 0.44;
  const settle = span(t, ANSWER, ANSWER + 0.4, ease.glide), grow = span(t, ANSWER + 0.5, ANSWER + 1.7, ease.entrance);
  const prints = [{ src: before, bytes: from, start: 0 }, { src: after, bytes: to, start: 1 }].map((print) => {
    const { x, lift } = place(print.start);
    const block = tallest * (print.bytes / from) * grow;
    return { ...print, x, y: mix(top + lift, floor - h - block, settle), block };
  });
  // The loupe reads the orange in the print on the left, then the same in the one on the right.
  const reading = span(t, READ[0] - 0.4, READ[0]) - span(t, READ[1] + 0.6, READ[1] + 1);
  const across = span(t, READ[0] + 0.4, READ[1], ease.glide);
  const rect = (x: number) => ({ left: x * W, top: top * H, width: w * W, height: h * H });
  const [left, right] = [...prints].sort((a, b) => a.x - b.x);
  return (
    <AbsoluteFill style={{ opacity: shown * (1 - span(t, B.sink, B.find, ease.exit)) }}>
      {prints.map(({ src, bytes, x, y, block }) => (
        <div key={src}>
          <Img src={src} style={{ ...card(x, y, w), transform: `scale(${mix(0.92, 1, shown)})` }} />
          <div style={{ position: 'absolute', left: (x + w / 2) * W, top: (top - 0.045) * H, transform: 'translate(-50%, -50%)', fontFamily: ui, fontWeight: 600, fontSize: px(84), color: 'var(--ink)', opacity: ask }}>?</div>
          {block > 0.001 && (
            <div style={{ position: 'absolute', left: x * W, top: (floor - block) * H, width: w * W, height: block * H, borderRadius: px(10), overflow: 'hidden',
              boxShadow: `inset 0 0 0 ${px(1.5)}px rgb(255 255 255 / 0.4), inset 0 ${px(2)}px 0 rgb(255 255 255 / 0.6)` }}>
              {/* Glass the photo's own colours, as the tower is in the studio. */}
              <Img src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', filter: `blur(${px(24)}px) saturate(1.3)`, transform: 'scale(1.3)', opacity: 0.85 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgb(255 255 255 / 0.22), transparent 30%, transparent 70%, rgb(255 255 255 / 0.12))' }} />
            </div>
          )}
          <Size bytes={bytes} size={px(52)} style={{ left: (x + w / 2) * W, top: (floor + 0.018) * H, transform: 'translateX(-50%)', opacity: span(t, ANSWER + 1.2, ANSWER + 1.6) }} />
        </div>
      ))}
      {reading > 0 && <Loupe src={(across < 0.5 ? left : right).src} rect={rect(mix(slots[0], slots[1], across))} at={DETAILS[0]} opacity={reading} />}
    </AbsoluteFill>
  );
}
