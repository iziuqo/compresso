import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Img, interpolate, OffthreadVideo, Sequence, staticFile } from 'remotion';
import { ease, formatBytes, formatPercent, FPS, H, mono, px, ui, W } from './system';

/**
 * The kit the everyday stories share (wave two): a real place, a phone in it,
 * and the few things a phone screen needs to tell a story without words.
 *
 * A story is shot like a product film: the place is a free-licence photo out
 * of focus, the phone sits in it in 3D, and everything on its screen is drawn
 * in iPhone points, so the screens read at the size people know. What the
 * app shows is the app, recorded by scripts/measure.mjs.
 */

/** An iPhone's screen in points; every screen is drawn at this size. */
export const SCREEN = { w: 393, h: 852 };

/** The system colours the stories need besides the app's own black and white. */
export const tone = { red: '#FF453A', green: '#30D158', blue: '#0A84FF', paper: '#F2F2F7', card: '#FFFFFF', text: '#1C1C1E', mute: '#8E8E93' };

/**
 * A value that moves through keyframes `[frame, value]`, gliding between each
 * pair on the app's glide curve and held before the first and after the last.
 */
export function keys(t: number, frames: [number, number][], curve?: (x: number) => number) {
  return interpolate(t, frames.map(([f]) => f), frames.map(([, v]) => v), {
    easing: curve, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
}

/** A rejection's shake: a damped sideways jolt from frame `at`, `amp` points wide. */
export const shake = (t: number, at: number, amp = 10, length = 30) =>
  t < at || t > at + length ? 0 : Math.sin((t - at) * 1.4) * amp * (1 - (t - at) / length) ** 2;

/**
 * The place: a photo out of focus, drifting slowly as a handheld camera
 * would, graded by `light` (a CSS colour laid over it in soft light).
 */
export function Room({ photo, t, light, dim = 0, focus = '50% 50%' }: { photo: string; t: number; light: string; dim?: number; focus?: string }) {
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <Img src={staticFile(`photos/${photo}.jpg`)} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: focus,
        transform: `scale(${1.18 + t * 0.00004}) translate(${Math.sin(t / 240) * px(8)}px, ${Math.cos(t / 300) * px(6)}px)`,
        filter: `blur(${px(12)}px) brightness(${0.78 - dim * 0.7}) saturate(1.15)`,
      }} />
      <AbsoluteFill style={{ background: light, mixBlendMode: 'soft-light' }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 60% at 50% 48%, transparent 40%, rgb(0 0 0 / ${0.55 + dim * 0.45}))` }} />
    </AbsoluteFill>
  );
}

export type Pose = { k: number; x?: number; y?: number; rx?: number; ry?: number; rz?: number };

/**
 * A phone in the room, `k` frame pixels (at 1080 wide) per point. The body
 * is a titanium rim and black glass; a soft shadow falls behind it and a
 * highlight slides across the glass as it turns. `children` are drawn in
 * points, on the screen.
 */
export function Phone({ k, x = 0, y = 0, rx = 0, ry = 0, rz = 0, children }: Pose & { children: ReactNode }) {
  const s = px(k);
  const [w, h, rim] = [SCREEN.w * s, SCREEN.h * s, 6 * s];
  return (
    <AbsoluteFill style={{ perspective: px(2600) }}>
      {/* The shadow stays on the table plane, pushed away from the light as the phone turns. */}
      <div style={{
        position: 'absolute', left: W / 2 + x - w * 0.42 + ry * s * 2, top: H / 2 + y - h * 0.38 + px(70) * k,
        width: w * 0.84, height: h * 0.86, borderRadius: 60 * s, background: 'rgb(0 0 0 / 0.75)',
        filter: `blur(${px(60)}px)`, transform: `rotate(${rz}deg)`,
      }} />
      <div style={{
        position: 'absolute', left: W / 2 + x - w / 2 - rim, top: H / 2 + y - h / 2 - rim,
        width: w + rim * 2, height: h + rim * 2, borderRadius: 61 * s, padding: rim,
        background: 'linear-gradient(135deg, #5B5B60 0%, #1E1E21 18%, #3A3A3E 50%, #151517 82%, #6A6A70 100%)',
        boxShadow: `inset 0 0 0 ${s}px rgb(255 255 255 / 0.18), inset 0 0 ${3 * s}px rgb(0 0 0 / 0.9)`,
        transform: `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
      }}>
        <div style={{ position: 'relative', width: w, height: h, borderRadius: 55 * s, overflow: 'hidden', background: '#000' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: SCREEN.w, height: SCREEN.h, transform: `scale(${s})`, transformOrigin: '0 0' }}>
            {children}
            <div style={{ position: 'absolute', left: (SCREEN.w - 124) / 2, top: 11, width: 124, height: 36, borderRadius: 18, background: '#000' }} />
            <div style={{ position: 'absolute', left: (SCREEN.w - 136) / 2, bottom: 8, width: 136, height: 5, borderRadius: 3, background: 'rgb(255 255 255 / 0.55)', mixBlendMode: 'difference' }} />
          </div>
          {/* The glass: a broad highlight that slides with the turn. */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `linear-gradient(${118 + ry * 1.5}deg, transparent ${32 + ry}%, rgb(255 255 255 / 0.10) ${44 + ry}%, transparent ${56 + ry}%)`,
          }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** The top of every screen: the time, signal bars out of four, and the battery. Ink follows the screen. */
export function StatusBar({ time, bars = 4, battery = 0.8, ink = '#fff' }: { time: string; bars?: number; battery?: number; ink?: string }) {
  const low = battery < 0.2;
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 54, color: ink, fontFamily: ui, fontWeight: 600, fontSize: 17 }}>
      <div style={{ position: 'absolute', left: 52, top: 17, fontVariantNumeric: 'tabular-nums' }}>{time}</div>
      <div style={{ position: 'absolute', right: 74, top: 21, display: 'flex', gap: 2, alignItems: 'flex-end' }}>
        {[0, 1, 2, 3].map((i) => <div key={i} style={{ width: 3, height: 4 + i * 2.6, borderRadius: 1, background: ink, opacity: i < bars ? 1 : 0.28 }} />)}
      </div>
      <div style={{ position: 'absolute', right: 30, top: 20, width: 26, height: 13, borderRadius: 4, border: `1.2px solid ${ink}`, opacity: 0.95, padding: 1.6 }}>
        <div style={{ width: `${battery * 100}%`, height: '100%', borderRadius: 2, background: low ? tone.red : ink }} />
      </div>
    </div>
  );
}

/** The symbols the stories speak in: they mean the same in every language. */
export function Glyph({ name, size, color, style }: { name: 'up' | 'check' | 'cross' | 'mail' | 'heart' | 'clip' | 'clock' | 'alert'; size: number; color: string; style?: CSSProperties }) {
  const stroke = { fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const paths = {
    up: <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" {...stroke} />,
    check: <path d="M5 12.5 10 17.5 19 7" {...stroke} />,
    cross: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...stroke} />,
    mail: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" {...stroke} /><path d="M3.5 7l8.5 6.5L20.5 7" {...stroke} /></>,
    heart: <path d="M12 20.5s-8-4.9-8-10.6A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 8 2.6c0 5.7-8 10.6-8 10.6Z" fill={color} />,
    clip: <path d="M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8.1-8.1a3.3 3.3 0 0 1 4.7 4.7l-8.1 8.1a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4" {...stroke} />,
    clock: <><circle cx="12" cy="12" r="8.5" {...stroke} /><path d="M12 7.5V12l3 2" {...stroke} /></>,
    alert: <><circle cx="12" cy="12" r="10" fill={color} /><path d="M12 6.8v6.4" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" /><circle cx="12" cy="17" r="1.5" fill="#fff" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" style={style}>{paths[name]}</svg>;
}

/** A finger's touch: a soft disc that presses in and fades, centred on (x, y) in points, from frame `at`. */
export function Touch({ x, y, at, t }: { x: number; y: number; at: number; t: number }) {
  const p = (t - at) / 18;
  if (p < 0 || p > 1) return null;
  return <div style={{
    position: 'absolute', left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: 22,
    background: 'rgb(255 255 255 / 0.45)', border: '1px solid rgb(255 255 255 / 0.8)',
    transform: `scale(${0.7 + p * 0.5})`, opacity: 1 - p, boxShadow: '0 0 16px rgb(0 0 0 / 0.25)',
  }} />;
}

/** A size as data: Geist Mono, figures that don't shift as they change. */
export function Bytes({ bytes, size, color, style }: { bytes: number; size: number; color?: string; style?: CSSProperties }) {
  return <span style={{ fontFamily: mono, fontSize: size, color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', ...style }}>{formatBytes('en', bytes)}</span>;
}

/**
 * The size dropping, big, in front of the phone: the moment every story is
 * built for. From frame `at` the size slides from `from` to `to` on a log
 * scale (so every digit gets its turn), lands, and the saving fades in under it.
 */
export function Drop({ from, to, at, t, y }: { from: number; to: number; at: number; t: number; y: number }) {
  const land = at + 48;
  const p = keys(t, [[at, 0], [land, 1]], (x) => 1 - (1 - x) ** 3);
  const bytes = Math.exp(Math.log(from) + (Math.log(to) - Math.log(from)) * p);
  const show = keys(t, [[at - 12, 0], [at, 1]]);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, textAlign: 'center', opacity: show, color: '#fff', textShadow: `0 ${px(8)}px ${px(60)}px rgb(0 0 0 / 0.6)` }}>
      <Bytes bytes={bytes} size={px(210)} style={{ display: 'inline-block', transform: `scale(${1 + (1 - p) * 0.08})` }} />
      <div style={{ fontFamily: mono, fontSize: px(46), marginTop: px(18), opacity: keys(t, [[land, 0], [land + 20, 1]]), color: 'rgb(255 255 255 / 0.75)' }}>
        {formatBytes('en', from)} → {formatBytes('en', to)} · −{formatPercent('en', 1 - to / from)}
      </div>
    </div>
  );
}

/** A stretch of a recording, in its own seconds, played at `rate` (a long encode can run faster than life). */
export type Cut = { start: number; end: number; rate?: number };

/** Where the recording's moment `at` (s) lands in the Short, for cuts laid end to end from frame `from`. */
export function recAt(cuts: Cut[], from: number, at: number) {
  let f = from;
  for (const { start, end, rate = 1 } of cuts) {
    if (at <= end) return f + ((at - start) * FPS) / rate;
    f += ((end - start) * FPS) / rate;
  }
  return f;
}

/**
 * The app, as scripts/measure.mjs recorded it: its `cuts` laid end to end
 * from frame `from`, under the phone's own status bar. The web build has no
 * status bar of its own, so the recording sits below it, a little narrower;
 * the app's black ground hides the margins. The last frame holds.
 */
export function Recording({ flow, from, cuts, time }: { flow: string; from: number; cuts: Cut[]; time: string }) {
  const top = 44;
  const height = SCREEN.h - top;
  const width = (height * SCREEN.w) / SCREEN.h;
  const style = { position: 'absolute', top, height, width, left: (SCREEN.w - width) / 2 } as const;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {cuts.map((cut, i) => {
        const at = Math.round(recAt(cuts, from, cut.start));
        const last = i === cuts.length - 1;
        return (
          <Sequence key={cut.start} from={at} durationInFrames={last ? undefined : Math.round(recAt(cuts, from, cut.end)) - at} layout="none">
            <OffthreadVideo src={staticFile(flow)} trimBefore={Math.round(cut.start * FPS)} playbackRate={cut.rate ?? 1} muted style={style} />
          </Sequence>
        );
      })}
      <StatusBar time={time} />
    </AbsoluteFill>
  );
}

/** iOS's app switch from frame `at`: the old screen slides out left as the new one comes in from the right. */
export function Swipe({ t, at, from, to }: { t: number; at: number; from: ReactNode; to: ReactNode }) {
  const p = keys(t, [[at, 0], [at + 22, 1]], ease.standard);
  if (p <= 0) return <>{from}</>;
  if (p >= 1) return <>{to}</>;
  const card = (shift: number, scale: number) => ({ transform: `translateX(${shift * SCREEN.w * 0.9}px) scale(${scale})`, borderRadius: 40, overflow: 'hidden' });
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <AbsoluteFill style={card(-p, 1 - p * 0.08)}>{from}</AbsoluteFill>
      <AbsoluteFill style={card(1 - p, 0.92 + p * 0.08)}>{to}</AbsoluteFill>
    </AbsoluteFill>
  );
}
