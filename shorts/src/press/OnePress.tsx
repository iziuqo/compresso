import type { ReactNode, RefObject } from 'react';
import { AbsoluteFill, Img, useCurrentFrame } from 'remotion';
import en from '../../locales/en.json';
import measured from '../measured.json';
import { Bed, Cue, semitones, type Sound } from '../sound';
import { Glyph, Phone, Signal } from '../story';
import { ease, FPS, formatBytes, px, sec } from '../system';
import { Chat, CHAT_LIGHT, CHAT_OPEN, REPLIES, SENDING, Sending, SENT } from './chat';
import { PressCanvas, usePress } from './Press';
import { ANSWER, Game, Looking, LOOKS, READ, SWAPS, TELL_OUT } from './tell';
import { STAMPS, stamping } from './batch';
import { App, Screens } from './screens';
import { GAUGE_LIGHT, MEET, Meter, TICKS } from './meter';
import { Flip, FLIPS, flight, LANDED, landing, SHOTS } from './tube';
import { onScreen, Question, SWEEPS, TAPS } from './question';
import { at, B, type Cam, Find, Grain, GUTTER, jolt, mix, Signature, Size, span, travel, Wordmark } from './ritual';
import { type Band, DEPTH, distanceFor, GAP, NEAR, PLATE, RED, type Pose, type Press, type PressSetup } from './scene';

/**
 * A one-press Short (wave three), 30 s, loops; wordless. Heavy photos are a
 * glass tower many times too tall for what they are for. One tap in the app,
 * the plate falls, the air goes, the tower is the icon's gap, and the name.
 * The photos stand up, the same pictures, light, and do what they could
 * not. Then the name is typed into a search field and the store answers.
 *
 * Timed to the plan's sheets (shorts/wave-three/plan/ in the project files).
 * Every number is the app's: a measured result (measured.json) with its
 * recording, the count read off the stack's height, and the photos after
 * the press are the files the app wrote.
 *
 * Each Short is an act (ACTS): what the photos play against, and how it ends.
 * 01 The Limit (slot): one photo, an upload form's slot in a white wall.
 * 02 The Envelope (envelope): three photos, one email: the bands fan like
 *    cards, and the deck goes into the envelope's mouth before its flap seals.
 * 03 The Bubble (bubble): one photo for a chat, stuck on a send that never
 *    moves; pressed, it fits its bubble, the send completes, replies come in.
 * 04 One Bar (tube): six photos for a chat on one bar of signal, a glass duct
 *    with a sliver of a mouth; the proof a flip book, then the prints shoot
 *    through one per 8th note and land as a stack at the far end.
 * 05 The Batch (batch): forty photos in one tower; the plate stamps it forty
 *    times, top band first, faster and faster; the forty fan into one arc.
 * 06 The Meter (meter): one photo on a mobile data meter, its ghost needle
 *    showing what sending it would leave; pressed, it goes in, and a whole
 *    roll's light prints follow until the needle meets the ghost.
 * 07 Can You Tell? (tell): a loupe reads the photo before the press; after,
 *    the original and the print are shuffled like shells, and glass answers.
 * 08 Airplane Mode (dome): a glass dome seals the studio and nothing is
 *    uploaded, ever; the press runs as always and the dome fills with colour.
 * 09 One Question (question): the app holds the frame, one real take: five
 *    purposes tapped on five beats, a glass slice beside it snapping to each
 *    one's result; the studio for the press, then the app's result screen.
 * 10 Everywhere (everywhere): one press on a phone, a tablet and a browser at
 *    once, in sync to the frame; at dead front the three slide into one.
 */
export const ONE_PRESS = { duration: sec(30) };

export type Kind = keyof typeof ACTS;

export type OnePressProps = {
  /** A result in measured.json, measured with a `preselected` purpose and an English recording. */
  result: 'limit-lake' | 'envelope' | 'bubble-cat' | 'trip' | 'batch' | 'harbour' | 'everywhere' | 'airplane-room' | 'tell-fruit' | 'question';
  kind: Kind;
  /** Google Play is public: the ending shows its badge beside the App Store's. */
  play?: boolean;
  /** What the gate allows, in bytes, as the app's purpose defines it (a gate's act only): for all the photos, or for each in an `each` act. */
  limit?: number;
};

const SHOW = 4.3; // where the light prints stand to face the camera
const ROOM = 10.5; // the dome's radius: over the whole studio, the camera always outside it
const SEAL = [B.through + 0.1, B.through + 1.1]; // an envelope's flap swings shut

type Act = {
  /** The gate the photos must pass, which they try twice and go through. */
  gate?: NonNullable<PressSetup['gate']>;
  /** The limit is for every photo on its own. */
  each?: boolean;
  /** Where the prints' centre ends once through, from the gate's x, and when it moves (by default, from the slide to through). */
  gone?: (gateX: number) => number;
  slide?: [number, number];
  /** The prints go through one by one, departing at these seconds, instead of as one deck. */
  shots?: readonly number[];
  /** The proof is a flip book, a print per 8th note, instead of a fanned hand. */
  flip?: boolean;
  /** The plate stamps the bands one by one, top first, at these seconds, instead of one squeeze. */
  stamps?: readonly number[];
  /** The prints hold the proof, standing, until the light opens. */
  hold?: boolean;
  /** The press is shown on three screens, which slide together into the one press for the name. */
  screens?: boolean;
  /** The camera's stops from the flat beat, if not the slot's one stop at the gate. */
  flat?: [Cam, number, number][];
  /** A glass dome over the studio. */
  dome?: boolean;
  /** No crane at the start: the photo fills the frame until the phone comes. */
  still?: boolean;
  /** The app holds the frame, before the press and after it, instead of the phone that comes for the tap. */
  app?: boolean;
  /** When the light opens: beyond the gate, from `light` (a point in the frame) if it isn't the gate's opening; or in the dome's glass. */
  open: number;
  light?: (press: Press, p: Pose) => [number, number];
  /** When the scene leaves the frame: once the light covers it, or as the colour sinks. */
  out: [number, number];
  /** Its own sounds, in seconds. */
  cues: readonly (readonly [sound: Sound, at: number, volume: number, pitch?: number])[];
};

const ACTS = {
  slot: {
    gate: 'slot', gone: (x) => x - PLATE.tip / 2 - 0.3, open: B.through, out: [B.through + 1, B.through + 1.1],
    cues: [],
  },
  envelope: {
    gate: 'envelope', gone: (x) => x - PLATE.tip / 2 - 0.25, open: SEAL[1] + 0.25, out: [SEAL[1] + 1.25, SEAL[1] + 1.35],
    cues: [['flick', SEAL[0], 0.35, -7], ['knock', SEAL[1], 0.3, 7]],
  },
  // A chat photo stays in its bubble, and the scene gives way to the chat as it goes in.
  bubble: {
    gate: 'bubble', gone: (x) => x, open: CHAT_OPEN, light: () => CHAT_LIGHT, out: [B.through, B.through + 0.45],
    cues: [['send', B.line, 0.25], ...SENDING.map(([a], i) => ['counter-tick', a, 0.14 - i * 0.02, 9] as const), ['counter-tick', SENT, 0.45, 12],
      ...REPLIES.map((a, i) => ['pop', a, 0.3, [0, 3, 7][i]] as const)],
  },
  // The deck goes to the duct's mouth as it lies down; a whoosh per shot, a soft landing.
  tube: {
    gate: 'tube', each: true, gone: (x) => x + PLATE.tip / 2, slide: [B.flat, B.slide], shots: SHOTS, flip: true,
    flat: [[{ az: 0.82, el: 0.34, dist: 19, tx: -3.4, ty: 1.3 }, B.flat, B.flat + 0.6], [{ az: 0.82, el: 0.34, dist: 19, tx: -9.4, ty: 1.3 }, B.slide + 0.2, LANDED + 0.2]], // the mouth, then along with the prints
    open: LANDED + 0.1, light: landing, out: [LANDED + 1.1, LANDED + 1.2],
    cues: [...FLIPS.map((a, i) => ['flick', a, 0.28, i] as const), ...SHOTS.map((a, i) => ['send', a, 0.3, 2 * i] as const), ['thud', LANDED, 0.3, 5]],
  },
  // A stamp per band, each a thump that lightens as the run speeds up; the fan holds, then the light opens from it.
  batch: {
    stamps: STAMPS, hold: true, flat: [[{ az: 0, el: 0, dist: (NEAR * 1.45 + GAP / 2) * 0.9, ty: SHOW }, B.shown, B.sink - 1.5]],
    open: B.sink - 1.5, light: (press, p) => press.project(p, 0, SHOW, 0), out: [B.sink - 0.5, B.sink - 0.4],
    cues: STAMPS.slice(1).map((a, i) => ['press-hit', a, Math.max(0.12, 0.4 - i * 0.012), Math.min(7, i / 5)] as const),
  },
  // A thin dial lands with the limit's clack; a low double warning as its ghost swings; a tiny tick per print in; a soft click as the needles meet.
  meter: {
    open: MEET + 0.05, light: () => GAUGE_LIGHT, out: [MEET + 1, MEET + 1.1],
    cues: [['knock', B.line + 0.2, 0.5, 5], ['counter-tick', B.tries[0], 0.4, -12], ['counter-tick', B.tries[0] + 0.15, 0.4, -12],
      ...TICKS.map((a, i) => ['counter-tick', a + 0.28, 0.12, Math.min(12, i / 3)] as const), ['glass-tick', MEET, 0.4, 5]],
  },
  // Three soft arrivals on one beat; three taps as one; the light opens over the three as they show the print.
  everywhere: {
    screens: true, hold: true, flat: [], open: B.flat, light: () => [0.5, 0.45], out: [B.flat + 1, B.flat + 1.1],
    cues: [['glass-tick', B.line + 0.3, 0.3, 0], ['glass-tick', B.line + 0.32, 0.25, 4], ['glass-tick', B.line + 0.34, 0.2, 7], ['tap', B.tap + 0.012, 0.35, 3], ['tap', B.tap + 0.024, 0.3, -3]],
  },
  // Airplane mode switched on, the dome lands and seals, the room closes in.
  dome: {
    dome: true, open: B.flat + 0.6, out: [B.sink, B.find],
    cues: [['tap', B.line, 0.45, 5], ['thud', B.wide + 3, 0.4, -5], ['swell', B.flat + 0.6, 0.4]],
  },
  // The loupe's glass on each stop, a card's flick on each swap, the two blocks rising.
  tell: {
    still: true, open: B.sink, out: [TELL_OUT, TELL_OUT + 0.4],
    cues: [...LOOKS.map((a) => ['glass-tick', a, 0.25, 7] as const), ...SWAPS.map((a, i) => ['flick', a, 0.32, 2 * i] as const),
      ...READ.map((a) => ['glass-tick', a, 0.25, 7] as const), ['rise', ANSWER + 0.5, 0.35], ['glass-tick', ANSWER + 0.75, 0.3, -5]],
  },
  // A tap on each purpose, the glass ticking as the slice snaps; a soft zip on each sweep of the slider.
  question: {
    still: true, app: true, hold: true, flat: [], open: B.sink, out: [B.sink, B.find],
    cues: [...TAPS.flatMap(({ at: a }, i) => [['tap', a, 0.4, i] as const, ['glass-tick', a + 0.05, 0.2, 2 * i] as const]),
      ...SWEEPS.map((a, i) => ['zip', a, 0.2, i % 2 ? 3 : 0] as const)],
  },
} satisfies Record<string, Act>;

/** When the camera leaves the photo for the studio: on the crane, or for a still opening, as the phone comes. */
const craneAt = (act: Act) => (act.still ? B.phone : B.crane);

/** A measured result as the scene's bands, bottom to top, with its recording. */
function bandsOf(result: OnePressProps['result']) {
  const m = measured[result];
  const bands: Band[] = 'items' in m
    ? m.items.map((item) => ({ before: `photos/${item.photo}.jpg`, after: item.file, from: item.from, to: item.to }))
    : [{ before: `photos/${m.photo}.jpg`, after: m.file, from: m.from, to: m.to }];
  return { bands, rec: m.flows.en };
}

/** The Short's choreography: a pose for any second. */
function choreography(press: Press, kind: Kind) {
  const act: Act = ACTS[kind];
  const heavy = press.heightOf(press.total.from);
  const top = PLATE.tall + heavy;
  const hover = heavy + 0.95;
  const many = press.photos.length > 1;
  const fanned = many && !act.flip;
  const hand = fanned && press.photos.length <= 8; // a small hand opens fanned too; a big one opens as a deck, its top photo filling the frame
  const wallX = press.gateX + PLATE.tip / 2; // the tower's centre when it touches the gate
  const near = NEAR * (fanned ? 1.45 : 1); // a fanned hand needs more width
  // Under a dome the upper plate goes up only as far as the glass.
  const leave = act.dome ? ROOM - 3.1 - GAP : 12;
  const framed = Math.max(top + 1, 7.5); // what the tap's shot holds: a short tower still leaves room for its size

  const gx = act.gate ? 1 : 0; // the studio shots look a little left, to hold the gate too
  const close: Cam = { az: 0, el: Math.PI / 2, dist: NEAR * (hand ? 1.45 : 1) * 1.01, ty: top };
  const stops: [Cam, number, number][] = [
    [{ ...close, dist: close.dist / 1.01 }, 0, act.still ? B.phone : B.crane], // the slow drift that keeps frame 0 alive
    ...(act.still ? [] : [[{ az: 0.55, el: 0.3, dist: distanceFor(top + 2.63, 0.78), tx: -1.1 * gx, ty: PLATE.tall + heavy * 0.5 }, B.crane, B.wide] as [Cam, number, number]]),
    [{ az: 0.42, el: 0.12, dist: distanceFor(top, 0.9), tx: -0.5 * gx, ty: PLATE.tall + heavy * 0.42 }, B.phone, B.app],
    [{ az: 0.5, el: 0.26, dist: distanceFor(framed, 0.8), tx: -0.9 * gx, ty: PLATE.tall + heavy * 0.5 }, B.tap, B.touch],
    [{ az: 0, el: 0, dist: 27.5, ty: PLATE.tall + GAP / 2 - 0.5 }, B.front, B.name],
    [{ az: 0, el: 0, dist: 27.5 * 0.97, ty: PLATE.tall + GAP / 2 - 0.5 }, B.name, B.lift], // the push-in on the name
    [{ az: 0, el: 0, dist: near + GAP / 2, ty: SHOW }, B.lift, B.shown],
    ...(act.flat ?? [act.gate
      ? [{ az: 0.82, el: 0.3, dist: 19, tx: -1.5, ty: 1.45 }, B.flat, B.flat + 0.6] // to the gate
      : [{ az: 0.35, el: 0.22, dist: 20, ty: PLATE.tall }, B.flat, B.flat + 0.6]] as [Cam, number, number][]), // down with the print as it lies back on the plate
    ...(!act.dome ? [] : [[{ az: 0.6, el: 0.32, dist: distanceFor(ROOM * 1.25, 0.8), ty: ROOM * 0.45 }, B.flat + 0.6, B.sink] as [Cam, number, number]]), // then out, slowly, to see the whole dome
  ];

  return (t: number): Pose => {
    const up = (a: number, b: number, curve = ease.standard) => span(t, a, b, curve);
    // One squeeze, or a stamp per band.
    const stamped = act.stamps ? stamping(press, t) : undefined;
    const h = stamped ? press.photos.reduce((n, b, i) => n + press.heightOf(mix(b.from, b.to, stamped.squeeze[i])), 0) : mix(heavy, GAP, up(B.touch, B.pressed, ease.entrance));
    // The upper plate: out of the dark while the camera finds the phone, the fall on the tap, the squeeze (or the stamps), away.
    const upper = (t < B.tap ? mix(hover + 16, hover, up(B.phone, B.app, ease.entrance)) : t < B.touch ? mix(hover, heavy, up(B.tap, B.touch, ease.exit)) : h + (stamped?.hop ?? 0))
      + leave * up(B.lift, B.lift + 0.75, ease.entrance);
    // The prints lie down again at the flat beat, unless they hold the proof to the end.
    const down = act.hold ? 0 : up(B.flat, B.flat + 0.5, ease.glide);
    // The stack tries the gate twice; then it rises to face us; then it lies down and goes through.
    const tries = act.gate ? B.tries.reduce((x, hit) => x + up(hit - 0.5, hit) - up(hit, hit + 0.5), 0) : 0;
    const x = mix(0, wallX, tries) + (act.gone ? mix(0, act.gone(press.gateX), up(...act.slide ?? [B.slide, B.through])) : 0);
    const y = mix(mix(PLATE.tall + h / 2, SHOW, up(B.lift, B.shown, ease.glide)), PLATE.tall + GAP / 2, down);
    const tilt = (up(B.lift + 0.3, B.shown, ease.glide) - down) * Math.PI / 2;
    // Several photos fan like a hand of cards while they fill the frame, and square into a deck for the gate.
    const fan = fanned ? (hand ? 1 - up(B.crane, B.crane + 1, ease.glide) : 0) + up(B.lift + 0.6, B.shown, ease.glide) - down : 0;
    const cam = travel(t, close, stops);
    cam.shake = jolt(t, B.touch, 0.03);
    const seal = kind === 'envelope' ? up(SEAL[0], SEAL[1], ease.glide) : 0;
    const { shift, courier } = act.shots ? flight(press, x, t) : {};
    return {
      cam,
      stack: { h, x, y, tilt, fan, after: t >= B.touch, shift, squeeze: stamped?.squeeze },
      courier,
      upper,
      studio: up(craneAt(act), craneAt(act) + 1) - up(B.lift, B.lift + 1) + up(B.flat, B.flat + 0.6) - 0.7 * up(act.open, act.open + 1),
      gauge: up(B.crane + 0.5, B.wide) - up(B.pressed - 0.5, B.pressed),
      gate: 1 - up(B.front, B.front + 1.5, ease.exit) + up(B.flat - 0.4, B.flat + 0.4, ease.entrance),
      glint: B.tries.reduce((g, hit) => g + (t >= hit ? Math.exp(-(t - hit) * 7) : 0), 0),
      bytes: press.bytesOf(h),
      pour: up(B.through - 0.25, B.through + 0.5) * (1 - up(B.sink, B.find, ease.exit)) * (1 - seal),
      seal,
      dome: kind === 'dome' ? { down: up(B.wide, B.wide + 3, ease.entrance), fill: up(act.open, act.open + 2.5, ease.glide) } : undefined,
      air: t >= B.touch ? { age: t - B.touch, length: 2.5 } : undefined,
    };
  };
}

export function OnePress({ result, kind, limit = Infinity, play = false }: OnePressProps) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const act: Act = ACTS[kind];
  const { bands, rec } = bandsOf(result);
  const press = usePress({ photos: bands, limit, each: act.each, gate: act.gate, dome: act.dome ? ROOM : undefined });
  const poseAt = press.press && choreography(press.press, kind);
  // Find covers the scene from its start until the first frame comes back for the loop.
  const finding = t >= B.find && t < B.loop;
  const st = t >= B.loop ? 0 : t; // the last quarter second is frame 0 again, fading in
  const p = poseAt && !finding ? poseAt(st) : null;
  const shown = t >= B.loop ? span(t, B.loop, 30, ease.standard) : finding ? 0 : 1 - span(t, ...act.out);
  const over = press.press && p && overlay(press.press, press.canvas, p, st, kind, limit, rec);
  return (
    <AbsoluteFill style={{ background: 'var(--void)' }}>
      <AbsoluteFill style={{ opacity: shown * (act.app ? 1 - 0.8 * onScreen(t) : 1), filter: blurAt(t, act) }}>
        <PressCanvas {...press} pose={p} />
        {over?.type}
      </AbsoluteFill>
      {over?.front}
      {finding && <Find t={t - B.find} legal={en.appStore.legal} play={play ? en.googlePlay.legal : undefined} />}
      <Grain seed={frame} />
      <Score act={act} many={bands.length > 1} />
    </AbsoluteFill>
  );
}

/**
 * Eyes closed it still tells the story: the limit set down on the photo, two
 * knocks against the gate, the tap, then the name in three sounds; the
 * prints through the gate, the air opening, nine keys. Paper for an
 * envelope, glass on a painted panel for a wall; under a dome the room
 * closes in once it seals.
 */
function Score({ act, many }: { act: Act; many: boolean }) {
  const s = sec;
  const paper = act.gate === 'envelope';
  const tail: [number, number][] = [[s(B.find) + 1, -50], [s(B.loop), -50], [s(30), -40]];
  // Under a dome the room's tone drops once it is down.
  const room: [number, number][] = act.dome ? [[0, -40], [s(B.wide + 3), -40], [s(B.wide + 3.5), -46], [s(B.find), -46], ...tail] : [[0, -40], [s(B.find), -40], ...tail];
  return (
    <>
      <Bed sound="room" levels={room} />
      {many && <Cue sound="flick" at={0} volume={0.3} />}
      {act.gate && <Cue sound="knock" at={s(B.line + 0.2)} volume={0.5} pitch={semitones(5)} />}
      <Cue sound="swell" at={s(craneAt(act))} volume={0.35} />
      {act.gate && B.tries.flatMap((hit) => [
        <Cue key={hit} sound="knock" at={s(hit)} volume={paper ? 0.4 : 0.55} pitch={semitones(paper ? 2 : -4)} />,
        <Cue key={`glass${hit}`} sound="glass-tick" at={s(hit)} volume={0.22} pitch={semitones(-12)} />,
      ])}
      <Cue sound="tap" at={s(B.tap)} volume={0.7} />
      <Cue sound="counter-tick" at={s(B.tap) + 1} volume={0.4} pitch={semitones(-5)} />
      <Cue sound="rise" at={s(B.tap)} volume={0.25} />
      <Signature touch={B.touch} name={B.name} find={B.find} />
      <Cue sound="flick" at={s(B.lift)} volume={0.3} pitch={semitones(-5)} />
      <Cue sound="flick" at={s(B.lift + 0.6)} volume={0.25} />
      {act.gone && !act.shots && <Cue sound="send" at={s(B.slide)} volume={0.35} pitch={semitones(-3)} />}
      {act.gone && !act.shots && <Cue sound="counter-tick" at={s(B.through)} volume={0.5} pitch={semitones(-7)} />}
      {act.cues.map(([sound, a, volume, pitch = 0]) => <Cue key={`${sound}${a}`} sound={sound} at={s(a)} volume={volume} pitch={semitones(pitch)} />)}
      <Cue sound="bloom" at={s(act.open)} volume={0.5} />
    </>
  );
}

/** The focus rack: the press goes soft while the phone is in front of it. */
const blurAt = (t: number, act: Act) => {
  const soft = act.app ? onScreen(t) : span(t, B.phone + 0.5, B.app, ease.glide) - span(t, B.tap, B.tap + 0.6, ease.glide);
  return soft > 0.001 ? `blur(${px(22) * soft}px)` : undefined;
};

/** The phone's window: it rises in as the camera finds it and drops away after the tap. */
const phoneY = (t: number) => mix(px(2600), 0, span(t, B.phone + 0.3, B.app, ease.glide)) + px(2600) * span(t, B.tap + 0.05, B.tap + 0.6, ease.glide);

/** The type that rides on the scene (it goes soft with it), and in front of it the light, the act's own payoff and the phone. */
function overlay(press: Press, canvas: RefObject<HTMLCanvasElement | null>, p: Pose, t: number, kind: Kind, limit: number, rec: ReturnType<typeof bandsOf>['rec']) {
  const act: Act = ACTS[kind];
  const up = (a: number, b: number, curve = ease.standard) => span(t, a, b, curve);
  const fanned = press.photos.length > 1 && !act.flip;
  // 1 while the photos fill the frame: lying at the start, standing for the proof.
  const close = 1 - up(craneAt(act), craneAt(act) + 1.5, ease.glide) + up(B.lift + 1, B.shown, ease.glide) - up(B.flat, B.flat + 0.5, ease.glide);
  const proof = t > B.lift;

  // The size: under the top photo's right edge when it fills the frame; in the studio, right of its top face, riding the plate down.
  // Fanned for the proof, each print carries its own size and the total sits under the hand.
  const corner = press.onStack(p, 0.5, 0.5, 0.5);
  corner[0] = Math.max(corner[0], press.onStack(p, 0.5, 0.5, -0.5)[0]); // clear of the far edge too, which a tall tower swings right
  const foot = fanned && proof ? press.onStack(p, 0, 0.5, 0.5, 0) : corner;
  const sizeAt: [number, number] = fanned && proof ? [0.5, foot[1] + 0.07] : [corner[0] + mix(0.03, 0, close), corner[1] + mix(0, 0.022, close)];
  // A flip book carries its own sizes.
  const sizeShown = Math.max(0, Math.min(1, 1 - up(B.pressed + 0.4, B.pressed + 0.9) + (act.flip ? 0 : up(B.shown - 0.4, B.shown) - up(B.flat, B.flat + 0.3))));
  const each = fanned && proof && press.photos.length <= 8 ? press.photos.map((b, i) => ({ b, at: press.onStack(p, 0, 0.5, 0.5, i) })) : [];

  const name = up(B.name, B.name + 0.25) - up(B.lift, B.lift + 0.5);
  const nameAt = press.project(p, 0, -0.62, DEPTH / 2);
  const light = act.light?.(press, p) ?? press.project(p, press.gateX, (press.slot.top + press.slot.bottom) / 2, 0);
  const type = (
    <>
      <Size bytes={p.bytes} size={px(78)} style={{ ...at(sizeAt, fanned && proof ? [0.5, 0] : [close > 0.5 ? 1 : 0, close > 0.5 ? 0 : 0.5]), opacity: sizeShown }} />
      {each.map(({ b, at: a }) => (
        <Size key={b.after} bytes={b.to} size={px(40)} style={{ ...at([a[0], a[1] + 0.012], [0.5, 0]), opacity: sizeShown * up(B.shown - 0.4, B.shown) }} />
      ))}
      {act.gate && <Limit press={press} p={p} t={t} kind={kind} limit={limit} />}
      <Wordmark style={{ ...at([0.5, nameAt[1]], [0.5, 0]), opacity: name, marginTop: (1 - up(B.name, B.name + 0.25)) * px(19) }} />
    </>
  );
  const front = (
    <>
      {kind === 'bubble' && t > B.through - 0.1 && <Chat press={press} p={p} t={t} />}
      {kind === 'dome' && <Offline t={t} />}
      {kind === 'meter' && <Meter press={press} p={p} t={t} />}
      {kind === 'tell' && t < B.phone && <Looking press={press} p={p} t={t} />}
      {kind === 'tell' && t > B.lift && <Game press={press} t={t} />}
      {act.flip && t > B.lift && t < B.shown + 0.2 && <Flip press={press} t={t} />}
      {act.screens && <Screens source={canvas} t={t} bytes={p.bytes} rec={rec} />}
      {(act.gate || act.light) && <Flood src={press.photos[press.photos.length - 1].after} t={t} open={act.open} from={light} />}
      {act.app && <Question t={t} src={press.photos[0].after} from={press.total.from} />}
      {!act.screens && !act.app && t >= B.phone && t < B.tap + 0.6 && (
        <Phone k={1.4} y={phoneY(t)} neutral><App rec={rec} t={t} airplane={kind === 'dome'} /></Phone>
      )}
    </>
  );
  return { type, front };
}

/**
 * The limit: a red hairline over the photo's top edge, which the crane turns
 * into the opening's top edge, with its tag: the size it allows (typed as
 * the line lands), for a chat the send that stalls, or for a duct its one
 * bar of signal. White once under.
 */
function Limit({ press, p, t, kind, limit }: { press: Press; p: Pose; t: number; kind: Kind; limit: number }) {
  const up = (a: number, b: number, curve = ease.standard) => span(t, a, b, curve);
  const act: Act = ACTS[kind];
  const chat = kind === 'bubble', signal = kind === 'tube';
  const edgeL = press.onStack(p, -0.5, 0.5, -0.5), edgeR = press.onStack(p, 0.5, 0.5, -0.5);
  const slotL = press.project(p, press.gateX, press.slot.top, -press.slot.half), slotR = press.project(p, press.gateX, press.slot.top, press.slot.half);
  const k = up(B.crane, B.wide, ease.glide);
  const line = [mix(edgeL[0], slotL[0], k), mix(edgeL[1] - 0.012, slotL[1], k), mix(edgeR[0], slotR[0], k), mix(edgeR[1] - 0.012, slotR[1], k)];
  const drop = up(B.line, B.line + 0.2, ease.exit);
  const lineShown = t < B.crane ? drop : 1 - up(B.wide - 0.4, B.wide);
  const label = 'max ' + formatBytes('en', limit);
  const typed = label.slice(0, Math.round(label.length * up(B.line + 0.2, B.line + 0.45)));
  const tagEnd = press.project(p, press.gateX, press.slot.top + 0.14, press.slot.half);
  const tagAt: [number, number] = [mix(line[2], tagEnd[0], k), mix(line[3] - 0.004, tagEnd[1], k)];
  // An envelope's tag sits over the envelope, clear of the tower beside it, until the prints come back to it.
  const tagAnchor = mix(1, kind === 'envelope' && t < B.lift ? 1 : 0, k);
  const gone = act.shots ? LANDED : B.through;
  const tagShown = Math.min(1, (t < B.wide ? (chat || signal ? drop : 1) : 0) + up(B.wide - 0.5, B.wide) * (1 - up(B.front, B.front + 0.5)) + up(B.flat, B.flat + 0.6) * (1 - up(gone, gone + 0.3)));
  return (
    <>
      {lineShown > 0 && (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: lineShown }} viewBox="0 0 1 1" preserveAspectRatio="none">
          <line x1={line[0]} y1={line[1] - (1 - drop) * 0.04} x2={line[2]} y2={line[3] - (1 - drop) * 0.04} stroke={RED} strokeWidth={px(3)} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      <div style={{ position: 'absolute', ...at(tagAt, [tagAnchor, 1]), marginTop: -px(14), fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: px(36), letterSpacing: '0.06em',
        color: press.fits(p) ? 'var(--ink)' : RED, opacity: tagShown, whiteSpace: 'nowrap' }}>
        {chat ? <Sending t={t} /> : signal ? <Signal bars={1} unit={px(4)} color="currentColor" /> : t < B.wide ? typed : label}
      </div>
    </>
  );
}

/** The light beyond the gate: the top photo's own colours, blurred, opening from `from` on a soft edge, then sinking to black. */
function Flood({ src, t, open, from }: { src: string; t: number; open: number; from: [number, number] }) {
  const r = span(t, open, open + 1) * 180;
  return r > 0 && (
    <Img src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
      filter: `blur(${px(70)}px) saturate(1.3) brightness(${1 + 0.08 * Math.sin(Math.max(0, t - open - 1) * 2.4)})`, transform: 'scale(1.2)',
      opacity: 1 - span(t, B.sink, B.find, ease.exit), WebkitMaskImage: `radial-gradient(circle at ${from[0] * 100}% ${from[1] * 100}%, #000 ${r * 0.6}%, transparent ${r}%)` }} />
  );
}

/**
 * Airplane mode, top right from the moment it switches on: the plane, and
 * what has been uploaded, 0 B, never moving. For the payoff the camera pushes
 * in on it while the dome fills with colour; it goes with the scene.
 */
function Offline({ t }: { t: number }): ReactNode {
  const on = span(t, B.line, B.line + 0.2, ease.entrance);
  const push = span(t, B.flat + 0.6, B.sink, ease.glide);
  const away = Math.max(span(t, B.phone, B.phone + 0.4) - span(t, B.tap + 0.3, B.tap + 0.7), span(t, B.sink, B.find, ease.exit));
  const place = at([mix(1 - GUTTER, 0.5, push), mix(0.06, 0.42, push)], [mix(1, 0.5, push), 0]);
  return (
    <div style={{ position: 'absolute', ...place, transform: `${place.transform} scale(${mix(1, 2.2, push)})`, transformOrigin: 'top center',
      width: 'max-content', display: 'flex', alignItems: 'center', gap: px(22), padding: `${px(14)}px ${px(26)}px`, borderRadius: px(40), background: `rgb(0 0 0 / ${0.3 * push})`,
      color: 'var(--ink)', opacity: on * (1 - away) }}>
      <Glyph name="plane" size={px(44)} color="currentColor" />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: px(8), opacity: 0.9 }}>
        <Glyph name="up" size={px(36)} color="currentColor" />
        <Size bytes={0} size={px(44)} style={{ position: 'relative' }} />
      </span>
    </div>
  );
}
