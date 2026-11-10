/**
 * What every wave-three Short shares besides the scene: the clock in
 * seconds, the camera's moves, the type that rides on the scene, the grain,
 * and Find, where the name is typed into a search field and the store row
 * answers. One master plays in every language, so nothing here is a
 * sentence: sizes, the name, and the store's own badge.
 */
import type { CSSProperties } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import icon from '../../../mobile/assets/store-icon-512.png';
import { Cue, semitones } from '../sound';
import { ease, formatBytes, H, mono, px, sec, ui, W } from '../system';
import type { Pose } from './scene';

/** 0 → 1 between seconds `a` and `b`, held at both ends; optionally on one of the app's curves. */
export const span = (t: number, a: number, b: number, curve?: (x: number) => number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return curve ? curve(x) : x;
};
export const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/** The beats every one-press Short keeps, in seconds (a beat is 0.5 s, a bar 2 s, at 120 BPM). */
export const B = {
  line: 0.3, //      the red limit drops onto the photo
  crane: 2, //       the photo is a tower, the line is the opening's top edge
  wide: 3.5,
  tries: [4, 5], //  it glides to the opening and stops against it, twice
  phone: 5.5, //     the camera finds the phone: the real app, the purpose chosen
  app: 7,
  tap: 9, //         "Make it lighter": the plate is released
  touch: 10, //      Com
  pressed: 12.5, //  …press…
  front: 12, //      the camera turns square to the icon
  name: 14, //       …o
  lift: 18, //       the plate goes, the prints stand up
  shown: 20, //      the same pictures, full frame
  flat: 22, //       they lie down again at the gate
  slide: 22.75, //   and go through
  through: 23.5,
  sink: 26, //       the colour sinks to black
  find: 26.5, //     the name typed into a search field; the store row; the badge
  loop: 29.75, //    the first frame again
};

/** The frame's side margin, as a share of its width. */
export const GUTTER = 96 / 1080;

/** A size as the app prints it: the figure, and its unit smaller and dimmer. */
export function Size({ bytes, size, style }: { bytes: number; size: number; style?: CSSProperties }) {
  const [n, unit] = formatBytes('en', bytes).split(' ');
  return (
    <div style={{ position: 'absolute', fontFamily: mono, fontWeight: 500, fontSize: size, lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: 'var(--ink)', ...style }}>
      {n}<span style={{ fontSize: '0.56em', letterSpacing: '0.04em', marginLeft: '0.28em', opacity: 0.6 }}>{unit}</span>
    </div>
  );
}

/** Type placed at a point in the frame, given as fractions; `anchor` is the point on the type that sits there. */
export const at = ([x, y]: [number, number], anchor: [number, number] = [0, 0]): CSSProperties => ({
  left: x * W, top: y * H, transform: `translate(${-anchor[0] * 100}%, ${-anchor[1] * 100}%)`,
});

/** The name, set as the app sets its wordmark: Geist, tight. */
export function Wordmark({ style }: { style?: CSSProperties }) {
  return <div style={{ position: 'absolute', fontFamily: ui, fontWeight: 500, fontSize: px(104), letterSpacing: '-0.04em', lineHeight: 1, whiteSpace: 'nowrap', color: 'var(--ink)', ...style }}>Compresso</div>;
}

let grainTile: string | undefined;
/** One tile of seeded noise, made once per tab: drawing turbulence every frame cost as much as the 3D scene. */
const tile = () => {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d')!, img = x.createImageData(256, 256);
  let s = 1;
  for (let i = 0; i < img.data.length; i += 4) {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5; // xorshift: the same grain in every render
    img.data[i] = img.data[i + 1] = img.data[i + 2] = s & 255;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return (grainTile = c.toDataURL());
};

/** Film grain that moves like film: the tile lands somewhere new every frame (seeded, so renders repeat). */
export function Grain({ seed }: { seed: number }) {
  const k = px(256), jump = (n: number) => ((Math.imul(seed + 1, n) >>> 0) % 997) / 997 * k;
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'overlay', opacity: 0.12,
    backgroundImage: `url(${tile()})`, backgroundSize: `${k}px ${k}px`, backgroundPosition: `${jump(2654435761)}px ${jump(2246822519)}px` }} />;
}

/** The app's icon as the stores show it: the store artwork (mobile/assets), rounded as phones round it. */
export function Icon({ size, style }: { size: number; style?: CSSProperties }) {
  return <Img src={icon} style={{ width: size, height: size, borderRadius: size * 0.225, boxShadow: `0 0 0 ${px(1.5)}px rgb(255 255 255 / 0.14)`, ...style }} />;
}

/** Find's clock, in seconds from its start: a letter every 16th note, then the row, then the badge. */
export const FIND = { letters: 0.25, letter: 0.125, row: 1.5, badge: 2, out: 3, length: 3.5 };

/**
 * Find (the last 3.5 s, from black): "Compresso" typed letter by letter into
 * a search field with no one's branding, then the row it finds, the icon with
 * the name, and the App Store badge as Apple draws it, with Apple's credit
 * line. `t` is seconds since Find began. It starts from black and ends in
 * black, so it splices onto any Short.
 */
export function Find({ t, legal }: { t: number; legal: string }) {
  const typed = 'Compresso'.slice(0, Math.max(0, Math.floor((t - FIND.letters) / FIND.letter) + 1));
  const show = span(t, 0, 0.25, ease.standard);
  const row = span(t, FIND.row, FIND.row + 0.25, ease.standard);
  const badge = span(t, FIND.badge, FIND.badge + 0.25, ease.standard);
  const caret = Math.floor(t / 0.25) % 2 === 0;
  const top = px(640);
  return (
    <AbsoluteFill style={{ background: 'var(--void)', fontFamily: ui, opacity: 1 - span(t, FIND.out, FIND.out + 0.25, ease.exit) }}>
      <div style={{ position: 'absolute', left: px(96), right: px(96), top, height: px(116), borderRadius: px(58), background: 'rgb(255 255 255 / 0.08)',
        boxShadow: `inset 0 0 0 ${px(1.5)}px rgb(255 255 255 / 0.12)`, display: 'flex', alignItems: 'center', padding: `0 ${px(44)}px`, gap: px(26), opacity: show }}>
        <svg width={px(40)} height={px(40)} viewBox="0 0 24 24" fill="none" stroke="rgb(255 255 255 / 0.6)" strokeWidth={2.2} strokeLinecap="round">
          <circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" />
        </svg>
        <div style={{ fontSize: px(50), letterSpacing: '-0.02em', color: 'var(--ink)', display: 'flex', alignItems: 'center' }}>
          {typed}
          <span style={{ width: px(4), height: px(58), marginLeft: px(4), background: 'var(--ink)', opacity: caret ? 1 : 0 }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: px(96), right: px(96), top: top + px(196), display: 'flex', alignItems: 'center', gap: px(40),
        opacity: row, transform: `translateY(${(1 - row) * px(28)}px)` }}>
        <Icon size={px(176)} />
        <div style={{ fontWeight: 600, fontSize: px(62), letterSpacing: '-0.02em', color: 'var(--ink)' }}>Compresso</div>
      </div>
      <AbsoluteFill style={{ top: top + px(480), alignItems: 'center', opacity: badge }}>
        <Img src={staticFile('badges/app-store-en.svg')} style={{ height: px(92) }} />
        <div style={{ marginTop: px(64), width: px(820), textAlign: 'center', textWrap: 'balance', fontSize: px(17), lineHeight: 1.45, color: 'var(--ink-3)' }}>{legal}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/** The frames where Find's keys land: one tick per letter. */
export const findKeys = (start: number) => Array.from({ length: 9 }, (_, i) => start + FIND.letters + i * FIND.letter);

export type Cam = Pose['cam'];

/** The camera through its stops: from `first`, gliding to each next stop over that stop's [start, end] seconds. */
export function travel(t: number, first: Cam, stops: [Cam, number, number][]): Cam {
  let c = first;
  for (const [next, a, b] of stops) {
    const k = span(t, a, b, ease.glide);
    c = { az: mix(c.az, next.az, k), el: mix(c.el, next.el, k), dist: mix(c.dist, next.dist, k), tx: mix(c.tx ?? 0, next.tx ?? 0, k), ty: mix(c.ty, next.ty, k) };
  }
  return c;
}

/** A contact's jolt: `amp` units, settling over six frames' worth of decay without overshoot past rest. */
export const jolt = (t: number, at: number, amp: number) => {
  const k = t - at;
  return k >= 0 && k < 0.1 ? Math.sin((k / 0.1) * Math.PI) * amp * (1 - k / 0.1) : 0;
};

/**
 * The sound logo, the same in every Short: Com as the plate lands, press as
 * the air leaves through the squeeze, o (the one glass note) as the icon
 * locks; and Find's keys, a tick on each 16th note, and the row's tick.
 * Times in seconds.
 */
export function Signature({ touch, name, find }: { touch: number; name: number; find: number }) {
  return (
    <>
      <Cue sound="com" at={sec(touch)} />
      <Cue sound="press-air" at={sec(touch)} volume={0.55} />
      <Cue sound="glass-o" at={sec(name)} volume={0.7} />
      {findKeys(find).map((k, i) => <Cue key={k} sound="counter-tick" at={sec(k)} volume={0.32} pitch={semitones(i % 2 ? 7 : 5)} />)}
      <Cue sound="tap" at={sec(find + FIND.row)} volume={0.35} pitch={semitones(4)} />
    </>
  );
}
