/**
 * One Question (wave three, 09): the app itself holds the frame, one real
 * take on a clock (measure.mjs `tour`): the one question, five purposes
 * tapped on five beats, back to Message, "Make it lighter" on the tap. Beside
 * the phone a slim glass slice snaps to each purpose's real result. The
 * phone gives way to the studio for the press, comes back for the result
 * screen with its big saved figure, and the before/after slider sweeps on
 * the beats.
 */
import { AbsoluteFill } from 'remotion';
import photos from '../../photos.json';
import measured from '../measured.json';
import { Phone, Recording, Touch } from '../story';
import { ease, px, sec } from '../system';
import { B, Glass, mix, Size, span } from './ritual';

const take = measured.question.flows.en;
const { tour } = photos.results.question;
/** What each purpose makes of the photo, measured one by one. */
const MADE: Record<string, number> = {
  message: measured.question.to, email: measured['question-email'].to, upload: measured['question-upload'].to,
  space: measured['question-space'].to, web: measured['question-web'].to,
};
/** The taps on the purposes, as filmed, and the slider's sweeps. */
export const TAPS = tour.taps.map(([purpose], i) => ({ purpose: purpose as string, at: take.at[`tap${i}` as keyof typeof take.at] }));
export const SWEEPS = tour.compare.map((_, i) => take.at[`compare${i}` as keyof typeof take.at]);
/** The take runs on the Short's own clock: its "Make it lighter" falls on the tap. */
const OFFSET = B.tap - take.at.go;

/** 1 while the phone holds the frame: from the start to the tap, and from the lift until the colour sinks. */
export const onScreen = (t: number) => 1 - span(t, B.tap + 0.05, B.tap + 0.6, ease.glide) + span(t, B.lift, B.lift + 0.6, ease.glide) - span(t, B.sink, B.find, ease.exit);

const PHONE = { k: 1.75, x: -px(110) };
/** The slice: where its foot stands, and how tall the heaviest purpose's result is. */
const SLICE = { x: px(930), bottom: px(1380), w: px(64), tallest: px(560) };

/** The phone with the take, and the slice beside it. */
export function Question({ t, src, from }: { t: number; src: string; from: number }) {
  const shown = onScreen(t);
  if (shown <= 0.001) return null;
  // Out through the screen on the tap; back up from below for the result.
  const through = span(t, B.tap + 0.05, B.tap + 0.6, ease.glide), back = 1 - span(t, B.lift, B.lift + 0.6, ease.glide);
  const [scale, fade, y] = t < B.lift ? [mix(1, 2.6, through), through, 0] : [1, 0, px(2600) * back];
  // The slice: the original, towering out of the frame, until the first tap; then each purpose's result, snapping on its tap.
  const tall = (bytes: number) => SLICE.tallest * bytes / MADE.space;
  const tapped = TAPS.filter((tap) => t >= tap.at);
  const bytes = tapped.length ? MADE[tapped[tapped.length - 1].purpose] : from;
  const height = tapped.reduce((h, tap) => mix(h, tall(MADE[tap.purpose]), span(t, tap.at, tap.at + 0.18, ease.entrance)), tall(from));
  const slice = span(t, 0, 0.3) * (1 - span(t, B.tap - 0.4, B.tap));
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, shown * 1.2) }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, opacity: 1 - fade }}>
        <Phone k={PHONE.k} x={PHONE.x} y={y} neutral>
          <Recording flow={take.flow} from={sec(OFFSET)} cuts={[{ start: 0, end: 99 }]} time="9:41" />
          <Touch x={196} y={813} at={sec(B.tap)} t={sec(t)} />
        </Phone>
      </AbsoluteFill>
      {height > 0.5 && <Glass src={src} style={{ left: SLICE.x - SLICE.w / 2, top: SLICE.bottom - height, width: SLICE.w, height, opacity: slice }} />}
      <Size bytes={bytes} size={px(34)} style={{ left: SLICE.x, top: SLICE.bottom + px(18), transform: 'translateX(-50%)', opacity: slice }} />
    </AbsoluteFill>
  );
}
