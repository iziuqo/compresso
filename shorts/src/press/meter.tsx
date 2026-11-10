/**
 * The Meter's gauge (wave three, 06): the mobile data left on a thin white
 * dial, 10 MB, red below 2 MB, read by its needle and its size. As the
 * camera finds the tower, a dashed ghost needle swings to what sending the
 * photo would leave. Pressed, the print goes in and the needle moves a hair;
 * then the light prints of a whole camera roll (05's, at the app's own
 * Message sizes) slip in behind its face, faster and faster, until the
 * needle meets the ghost: the data of one heavy photo sends all of them.
 */
import { Img, staticFile } from 'remotion';
import measured from '../measured.json';
import { Signal } from '../story';
import { ease, px } from '../system';
import { at, B, GUTTER, mix, Size, span } from './ritual';
import { RED, type Pose, type Press } from './scene';

const DATA = 10e6, LOW = 2e6;
const HEAVY = measured.harbour.from;
/** The prints that go in: the photo itself, then the roll's, as many as the heavy photo's data sends. */
const ROLL = [{ to: measured.harbour.to, file: measured.harbour.file }, ...measured.batch.items];
const SENT = ROLL.filter((_, i) => ROLL.slice(0, i + 1).reduce((s, r) => s + r.to, 0) <= HEAVY);
/** When each print leaves the plate: the first on the slide, then faster and faster, down to a 64th note; each flies FLY seconds. */
export const TICKS = SENT.reduce<number[]>((ts, _, i) => [...ts, i === 0 ? B.slide : ts[i - 1] + Math.max(0.04, 0.3 * 0.75 ** i)], []);
const FLY = 0.28;
/** When the needle meets the ghost. */
export const MEET = TICKS[TICKS.length - 1] + FLY;

/** The dial in the corner, and in the middle for the payoff, where the light opens from. */
const CORNER: [number, number] = [1 - GUTTER - 0.1, 0.1], MIDDLE: [number, number] = [0.5, 0.21];
export const GAUGE_LIGHT = MIDDLE;
const R = px(110);
/** A size's place on the dial: 240° clockwise from bottom left, empty to full. */
const angle = (bytes: number) => (150 + 240 * Math.max(0, bytes) / DATA) * Math.PI / 180;
const onDial = (bytes: number, r: number): [number, number] => [Math.cos(angle(bytes)) * r, Math.sin(angle(bytes)) * r];

/** The gauge over the scene from the moment it lands, the prints flying into it from the plate, from `from` in the frame. */
export function Meter({ press, p, t }: { press: Press; p: Pose; t: number }) {
  const land = span(t, B.line, B.line + 0.2, ease.entrance);
  const away = span(t, B.phone, B.phone + 0.4) - span(t, B.tap + 0.3, B.tap + 0.7);
  const push = span(t, B.flat, B.slide, ease.glide);
  const scale = mix(1, 2.4, push);
  const [cx, cy] = [mix(CORNER[0], MIDDLE[0], push), mix(CORNER[1], MIDDLE[1], push)];
  const left = DATA - SENT.reduce((s, r, i) => s + r.to * span(t, TICKS[i] + FLY - 0.05, TICKS[i] + FLY, ease.standard), 0);
  // The ghost swings out from the needle as the camera finds the tower, to what the heavy photo would leave.
  const ghost = mix(DATA, DATA - HEAVY, span(t, B.tries[0] - 0.5, B.tries[0], ease.glide));
  const ghostShown = span(t, B.tries[0] - 0.5, B.tries[0] - 0.4);
  const from = press.onStack(p, 0, 0.5, 0); // the print's middle, lying on the plate
  const needle = (bytes: number, dash?: string, color = '#fff') => {
    const [x, y] = onDial(bytes, 0.78);
    return <line x1={0} y1={0} x2={x} y2={y} stroke={color} strokeWidth={0.035} strokeLinecap="round" strokeDasharray={dash} />;
  };
  const arc = (a: number, b: number) => { const [x0, y0] = onDial(a, 0.92), [x1, y1] = onDial(b, 0.92); return `M${x0} ${y0}A0.92 0.92 0 ${b - a > DATA * 0.75 ? 1 : 0} 1 ${x1} ${y1}`; };
  return (
    <>
      {SENT.map((r, i) => {
        const k = span(t, TICKS[i], TICKS[i] + FLY, ease.exit);
        return k > 0 && k < 1 && (
          <Img key={r.file} src={i === 0 ? press.photos[0].after : staticFile(r.file)} style={{ position: 'absolute', ...at([mix(from[0], cx, k), mix(from[1], cy, k)], [0.5, 0.5]),
            width: px(200) * (1 - k * 0.85), height: px(150) * (1 - k * 0.85), objectFit: 'cover', borderRadius: px(10), opacity: 1 - span(k, 0.75, 1) }} />
        );
      })}
      <div style={{ position: 'absolute', ...at([cx, cy], [0.5, 0.5]), width: R * 2, height: R * 2, transform: `${at([cx, cy], [0.5, 0.5]).transform} scale(${scale})`,
        opacity: land * (1 - away) * (1 - span(t, B.sink, B.find, ease.exit)), color: 'var(--ink)' }}>
        <svg viewBox="-1 -1 2 2" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {/* The dial's face: the prints slip in behind it. */}
          <circle r={0.97} fill="#000" fillOpacity={0.92} />
          <path d={arc(0, DATA)} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={0.02} />
          <path d={arc(0, LOW)} fill="none" stroke={RED} strokeWidth={0.05} />
          {Array.from({ length: 11 }, (_, mb) => {
            const [a, b] = [onDial(mb * 1e6, mb % 5 === 0 ? 0.74 : 0.8), onDial(mb * 1e6, 0.88)];
            return <line key={mb} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#fff" strokeOpacity={mb % 5 === 0 ? 0.9 : 0.5} strokeWidth={0.02} />;
          })}
          {ghostShown > 0 && <g opacity={ghostShown}>{needle(ghost, '0.06 0.05', RED)}</g>}
          {needle(left)}
          <circle r={0.05} fill="#fff" />
        </svg>
        {/* Mobile data: the signal bars, and what is left of it. */}
        <Signal bars={4} unit={px(2.2)} color="currentColor" style={{ position: 'absolute', left: '50%', top: '24%', transform: 'translateX(-50%)', opacity: 0.85 }} />
        <Size bytes={left} size={px(30)} style={{ left: '50%', top: '66%', transform: 'translateX(-50%)' }} />
      </div>
    </>
  );
}
