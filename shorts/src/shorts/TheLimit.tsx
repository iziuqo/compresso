import { AbsoluteFill, Freeze, Img, Sequence, staticFile, useCurrentFrame } from 'remotion';
import en from '../../locales/en.json';
import measured from '../measured.json';
import { PressCanvas, usePress } from '../press/Press';
import { at, type Cam, Find, Grain, jolt, mix, Signature, Size, span, travel, Wordmark } from '../press/ritual';
import { DEPTH, distanceFor, GAP, NEAR, PLATE, RED, type Pose, type Press } from '../press/scene';
import { Bed, Cue, semitones } from '../sound';
import { Phone, Recording, Touch } from '../story';
import { ease, FPS, formatBytes, px, sec } from '../system';

/**
 * The Limit (wave three, 01), 30 s, loops; wordless. A 14 MB photo and an
 * upload form that takes 1 MB: the photo is a glass tower twenty times the
 * slot's height, and it can't get through. One tap in the app, the plate
 * falls, the air goes, the tower is the icon's gap, and the name. The
 * photo stands up, the same picture at 692 KB, and slides through the
 * slot. Then the name is typed into a search field and the store answers.
 *
 * Timed to the plan's sheet (shorts/wave-three/plan/01-the-limit.md in the
 * project files). Every number is the app's: the lake through "Upload form"
 * at 1 MB (measured.json, limit-lake), the count read off the stack's
 * height, and the photo after the press is the file the app wrote.
 */
export const LIMIT = { duration: sec(30) };

const m = measured['limit-lake'];
const LIMIT_BYTES = 1e6; // the app's default upload limit, which the recording shows selected
const rec = m.flows.en;

/** The beats, in seconds (a beat is 0.5 s, a bar 2 s, at 120 BPM). */
export const B = {
  line: 0.3, //      the red limit drops onto the photo
  crane: 2, //       the photo is a tower, the line is a slot's top edge
  wide: 3.5,
  tries: [4, 5], //  it glides to the slot and stops against the wall, twice
  phone: 5.5, //     the camera finds the phone: the real app, Upload form, 1 MB
  app: 7,
  tap: 9, //         "Make it lighter": the plate is released
  touch: 10, //      Com
  pressed: 12.5, //  …press…
  front: 12, //      the camera turns square to the icon
  name: 14, //       …o
  lift: 18, //       the plate goes, the print stands up
  shown: 20, //      the same picture, full frame
  slide: 22.75, //   flat again, and through the slot
  through: 23.5,
  sink: 26, //       the colour sinks to black
  find: 26.5, //     the name typed into a search field; the store row; the badge
  loop: 29.75, //    the lake again, as at frame 0
};

const SHOW = 4.3; // where the light print stands to face the camera

/** The Short's choreography: a pose for any second. */
function choreography(press: Press) {
  const heavy = press.heightOf(m.from);
  const top = PLATE.tall + heavy;
  const hover = heavy + 0.95;
  const wallX = press.gateX + PLATE.tip / 2; // the tower's centre when it touches the wall
  const goneX = press.gateX - PLATE.tip / 2 - 0.3; // the print's centre once it is through

  const close: Cam = { az: 0, el: Math.PI / 2, dist: NEAR * 1.01, ty: top };
  const stops: [Cam, number, number][] = [
    [{ ...close, dist: NEAR }, 0, B.crane], // the slow drift that keeps frame 0 alive
    [{ az: 0.55, el: 0.3, dist: distanceFor(top + 2.63, 0.78), tx: -1.1, ty: PLATE.tall + heavy * 0.5 }, B.crane, B.wide],
    [{ az: 0.42, el: 0.12, dist: distanceFor(top, 0.9), tx: -0.5, ty: PLATE.tall + heavy * 0.42 }, B.phone, B.app],
    [{ az: 0.5, el: 0.26, dist: distanceFor(top + 1, 0.8), tx: -0.9, ty: PLATE.tall + heavy * 0.5 }, B.tap, B.touch],
    [{ az: 0, el: 0, dist: 27.5, ty: PLATE.tall + GAP / 2 - 0.5 }, B.front, B.name],
    [{ az: 0, el: 0, dist: 27.5 * 0.97, ty: PLATE.tall + GAP / 2 - 0.5 }, B.name, B.lift], // the push-in on the name
    [{ az: 0, el: 0, dist: NEAR + GAP / 2, ty: SHOW }, B.lift, B.shown],
    [{ az: 0.82, el: 0.3, dist: 19, tx: -1.5, ty: 1.45 }, 22, 22.6],
  ];

  return (t: number): Pose => {
    const up = (a: number, b: number, curve = ease.standard) => span(t, a, b, curve);
    const squeeze = up(B.touch, B.pressed, ease.entrance);
    const h = mix(heavy, GAP, squeeze);
    // The upper plate: out of the dark while the camera finds the phone, the fall on the tap, the squeeze, away.
    const upper = (t < B.tap ? mix(hover + 16, hover, up(B.phone, B.app, ease.entrance)) : t < B.touch ? mix(hover, heavy, up(B.tap, B.touch, ease.exit)) : h)
      + 12 * up(B.lift, B.lift + 0.75, ease.entrance);
    // The stack tries the slot twice; then it rises to face us; then it lies down and goes through.
    const tries = B.tries.reduce((x, hit) => x + up(hit - 0.5, hit) - up(hit, hit + 0.5), 0);
    const x = mix(0, wallX, tries) + mix(0, goneX, up(B.slide, B.through));
    const y = mix(mix(PLATE.tall + h / 2, SHOW, up(B.lift, B.shown, ease.glide)), PLATE.tall + GAP / 2, up(22, 22.5, ease.glide));
    const tilt = (up(B.lift + 0.3, B.shown, ease.glide) - up(22, 22.5, ease.glide)) * Math.PI / 2;
    const cam = travel(t, close, stops);
    cam.shake = jolt(t, B.touch, 0.03);
    return {
      cam,
      stack: { h, x, y, tilt, after: t >= B.touch },
      upper,
      studio: up(B.crane, B.crane + 1) - up(B.lift, B.lift + 1) + up(22, 22.6) - 0.7 * up(B.through, B.through + 1),
      gauge: up(B.crane + 0.5, B.wide) - up(B.pressed - 0.5, B.pressed),
      gate: 1 - up(B.front, B.front + 1.5, ease.exit) + up(21.6, 22.4, ease.entrance),
      glint: B.tries.reduce((g, hit) => g + (t >= hit ? Math.exp(-(t - hit) * 7) : 0), 0),
      bytes: press.bytesOf(h),
      pour: up(B.through - 0.25, B.through + 0.5) * (1 - up(B.sink, B.find, ease.exit)),
      air: t >= B.touch ? { age: t - B.touch, length: 2.5 } : undefined,
    };
  };
}

export function TheLimit() {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const press = usePress({ before: `photos/${m.photo}.jpg`, after: m.file, from: m.from, to: m.to, limit: LIMIT_BYTES, gate: true });
  const poseAt = press.press && choreography(press.press);
  // Find covers the scene from its start until the lake comes back for the loop.
  const finding = t >= B.find && t < B.loop;
  const st = t >= B.loop ? 0 : t; // the last quarter second is frame 0 again, fading in
  const p = poseAt && !finding ? poseAt(st) : null;
  return (
    <AbsoluteFill style={{ background: 'var(--void)' }}>
      <AbsoluteFill style={{ opacity: t >= B.loop ? span(t, B.loop, 30, ease.standard) : 1, filter: blurAt(t) }}>
        <PressCanvas {...press} pose={p} />
      </AbsoluteFill>
      {press.press && p && <Overlay press={press.press} p={p} t={st} fade={t >= B.loop ? span(t, B.loop, 30, ease.standard) : 1} />}
      {t >= B.find && t < B.loop && <Find t={t - B.find} legal={en.appStore.legal} />}
      <Grain seed={frame} />
      <Score />
    </AbsoluteFill>
  );
}

/**
 * Eyes closed it still tells the story: a ruler set down on the photo, two
 * knocks of glass on a painted panel, the tap, then the name in three
 * sounds; paper through a slot, the air opening, nine keys.
 */
function Score() {
  const s = sec;
  return (
    <>
      <Bed sound="room" levels={[[0, -40], [s(B.find), -40], [s(B.find) + 1, -50], [s(B.loop), -50], [s(30), -40]]} />
      <Cue sound="knock" at={s(B.line + 0.2)} volume={0.5} pitch={semitones(5)} />
      <Cue sound="swell" at={s(B.crane)} volume={0.35} />
      {B.tries.flatMap((hit) => [
        <Cue key={hit} sound="knock" at={s(hit)} volume={0.55} pitch={semitones(-4)} />,
        <Cue key={`glass${hit}`} sound="glass-tick" at={s(hit)} volume={0.22} pitch={semitones(-12)} />,
      ])}
      <Cue sound="tap" at={s(B.tap)} volume={0.7} />
      <Cue sound="counter-tick" at={s(B.tap) + 1} volume={0.4} pitch={semitones(-5)} />
      <Cue sound="rise" at={s(B.tap)} volume={0.25} />
      <Signature touch={B.touch} name={B.name} find={B.find} />
      <Cue sound="flick" at={s(B.lift)} volume={0.3} pitch={semitones(-5)} />
      <Cue sound="flick" at={s(B.lift + 0.6)} volume={0.25} />
      <Cue sound="send" at={s(B.slide)} volume={0.35} pitch={semitones(-3)} />
      <Cue sound="counter-tick" at={s(B.through)} volume={0.5} pitch={semitones(-7)} />
      <Cue sound="bloom" at={s(B.through)} volume={0.5} />
    </>
  );
}

/** The focus rack: the press goes soft while the phone is in front of it. */
const blurAt = (t: number) => {
  const soft = span(t, B.phone + 0.5, B.app, ease.glide) - span(t, B.tap, B.tap + 0.6, ease.glide);
  return soft > 0.001 ? `blur(${px(22) * soft}px)` : undefined;
};

/** The type that rides on the scene, the flood beyond the slot, and the phone. */
function Overlay({ press, p, t, fade }: { press: Press; p: Pose; t: number; fade: number }) {
  const under = p.bytes <= LIMIT_BYTES;
  const ink = under ? 'var(--ink)' : RED;
  const up = (a: number, b: number, curve = ease.standard) => span(t, a, b, curve);
  // 1 while the photo fills the frame: lying at the start, standing for the proof.
  const close = 1 - up(B.crane, B.wide, ease.glide) + up(B.lift + 1, B.shown, ease.glide) - up(22, 22.5, ease.glide);

  // The size: under the photo's right edge when it fills the frame; in the studio, right of its top face, riding the plate down.
  const corner = press.onStack(p, 0.5, 0.5, 0.5);
  const sizeAt: [number, number] = [corner[0] + mix(0.03, 0, close), corner[1] + mix(0, 0.022, close)];
  const sizeShown = 1 - up(B.pressed + 0.4, B.pressed + 0.9) + up(B.shown - 0.4, B.shown) - up(22, 22.3);

  // The limit: a red hairline over the photo's top edge, which the crane turns into the slot's top edge.
  const edgeL = press.onStack(p, -0.5, 0.5, -0.5), edgeR = press.onStack(p, 0.5, 0.5, -0.5);
  const slotL = press.project(p, press.gateX, press.slot.top, -press.slot.half), slotR = press.project(p, press.gateX, press.slot.top, press.slot.half);
  const k = up(B.crane, B.wide, ease.glide);
  const line = [mix(edgeL[0], slotL[0], k), mix(edgeL[1] - 0.012, slotL[1], k), mix(edgeR[0], slotR[0], k), mix(edgeR[1] - 0.012, slotR[1], k)];
  const drop = up(B.line, B.line + 0.2, ease.exit);
  const lineShown = t < B.crane ? drop : 1 - up(B.wide - 0.4, B.wide);
  const label = 'max ' + formatBytes('en', LIMIT_BYTES);
  const typed = label.slice(0, Math.round(label.length * up(B.line + 0.2, B.line + 0.45)));
  const tagAt: [number, number] = [mix(line[2], press.project(p, press.gateX, press.slot.top + 0.14, press.slot.half)[0], k), mix(line[3] - 0.004, press.project(p, press.gateX, press.slot.top + 0.14, press.slot.half)[1], k)];
  const tagShown = Math.min(1, (t < B.wide ? 1 : 0) + up(B.wide - 0.5, B.wide) * (1 - up(B.front, B.front + 0.5)) + up(22, 22.6));

  const name = up(B.name, B.name + 0.25) - up(B.lift, B.lift + 0.5);
  const nameAt = press.project(p, 0, -0.62, DEPTH / 2);
  const slot = press.project(p, press.gateX, (press.slot.top + press.slot.bottom) / 2, 0);
  const flood = up(B.through, B.through + 1);
  const phoneY = mix(px(2600), 0, up(B.phone + 0.3, B.app, ease.glide)) + px(2600) * up(B.tap + 0.05, B.tap + 0.6, ease.glide);
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <Size bytes={p.bytes} size={px(78)} style={{ ...at(sizeAt, [close > 0.5 ? 1 : 0, close > 0.5 ? 0 : 0.5]), opacity: Math.max(0, Math.min(1, sizeShown)) }} />
      {lineShown > 0 && (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: lineShown }} viewBox="0 0 1 1" preserveAspectRatio="none">
          <line x1={line[0]} y1={line[1] - (1 - drop) * 0.04} x2={line[2]} y2={line[3] - (1 - drop) * 0.04} stroke={RED} strokeWidth={px(3)} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      <div style={{ position: 'absolute', ...at(tagAt, [1 - k, 1]), marginTop: -px(14), fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: px(36), letterSpacing: '0.06em',
        color: ink, opacity: tagShown, whiteSpace: 'nowrap', transition: 'none' }}>
        {t < B.wide ? typed : label}
      </div>
      <Wordmark style={{ ...at([0.5, nameAt[1]], [0.5, 0]), opacity: name, marginTop: (1 - up(B.name, B.name + 0.25)) * px(19) }} />
      {flood > 0 && (
        <Img src={staticFile(m.file)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          filter: `blur(${px(70)}px) saturate(1.3) brightness(${1 + 0.08 * Math.sin(Math.max(0, t - B.through - 1) * 2.4)})`, transform: 'scale(1.2)',
          opacity: 1 - up(B.sink, B.find, ease.exit), clipPath: `circle(${flood * 130}% at ${slot[0] * 100}% ${slot[1] * 100}%)` }} />
      )}
      {t >= B.phone && t < B.tap + 0.6 && (
        <Phone k={1.4} y={phoneY} neutral>
          {/* The recording opens on the purpose already chosen; it holds its first frame until it runs into the tap. */}
          <Sequence from={sec(B.phone)} durationInFrames={sec(B.tap - rec.at.go - B.phone)} layout="none"><Freeze frame={0}><Recording flow={rec.flow} from={0} cuts={CUT} time="9:41" /></Freeze></Sequence>
          {t >= B.tap - rec.at.go && <Recording flow={rec.flow} from={sec(B.tap - rec.at.go)} cuts={CUT} time="9:41" />}
          <Touch x={196} y={813} at={sec(B.tap)} t={sec(t)} />
        </Phone>
      )}
    </AbsoluteFill>
  );
}

const CUT = [{ start: 0, end: 99 }];
