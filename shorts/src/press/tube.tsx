/**
 * One Bar's duct (wave three, 04): the proof as a flip book, the pressed
 * prints full frame one per 8th note, each with its size; then the prints
 * shoot through the glass duct one per 8th note, bottom first, each lighting
 * the glass with its colours, and arc onto a stack of their own past its far
 * end, in the same order, so the deck arrives as it left.
 */
import { AbsoluteFill, Img } from 'remotion';
import { ease, px } from '../system';
import { at, B, mix, Size, span } from './ritual';
import { GAP, PLATE, TUBE, type Pose, type Press } from './scene';

/** The flip book, a print per 8th note from just after the lift; the last hands over to the standing stack. */
export const FLIPS = [18.5, 18.75, 19, 19.25, 19.5, 19.75];
/** The shots, a print per 8th note from the slide, bottom first; each takes FLIGHT seconds from the deck to the new stack. */
export const SHOTS = [B.slide, B.slide + 0.25, B.slide + 0.5, B.slide + 0.75, B.slide + 1, B.slide + 1.25];
const FLIGHT = 0.6;
export const LANDED = SHOTS[SHOTS.length - 1] + FLIGHT;

/**
 * The prints on their way, from a deck lying at `deckX` against the mouth:
 * each one's offset from its place in the deck, and the light of the one in
 * the glass. A print drops onto the rail as each one under it leaves, flies
 * through the duct, then arcs up over the new stack and lands on it at the
 * height it had in the deck. Its height follows how far across the arc it
 * is, so it clears the stack whatever the timing.
 */
export function flight(press: Press, deckX: number, t: number): { shift: [number, number][]; courier?: Pose['courier'] } {
  const exit = press.gateX - TUBE - PLATE.tip / 2; // a print's centre as it leaves the duct
  let below = 0, courier: Pose['courier'];
  const shift = press.photos.map(({ to }, i): [number, number] => {
    const go = SHOTS[i], under = below;
    below += press.heightOf(to);
    const drop = press.photos.slice(0, i).reduce((d, b, j) => d + press.heightOf(b.to) * span(t, SHOTS[j] + 0.08, SHOTS[j] + 0.2, ease.exit), 0);
    const x = mix(deckX, press.landX, span(t, go, go + FLIGHT, ease.entrance));
    const u = span(exit - x, 0, exit - press.landX); // across the arc
    const glass = span(deckX - x, 0, deckX - exit); // through the duct
    if (glass > 0 && glass < 1) courier = { band: i, x, k: Math.sin(glass * Math.PI) };
    return [x - deckX, -drop + under * u + (0.6 * under + 0.15) * 4 * u * (1 - u)];
  });
  return { shift, courier };
}

/** Where the light opens from: the new stack. */
export const landing = (press: Press, p: Pose) => press.project(p, press.landX, PLATE.tall + GAP / 2, 0);

/** The proof as a flip book: the pressed prints full frame, one per 8th note, each with its size. */
export function Flip({ press, t }: { press: Press; t: number }) {
  const i = FLIPS.filter((a) => t >= a).length - 1;
  if (i < 0) return null;
  const { after, to } = press.photos[i];
  return (
    <AbsoluteFill style={{ opacity: span(t, FLIPS[0] - 0.15, FLIPS[0]) - span(t, B.shown - 0.1, B.shown + 0.2) }}>
      <Img src={after} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <Size bytes={to} size={px(78)} style={at([0.5, 0.84], [0.5, 0])} />
    </AbsoluteFill>
  );
}
