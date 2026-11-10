import { AbsoluteFill, Freeze, Img, Sequence, useCurrentFrame } from 'remotion';
import en from '../../locales/en.json';
import measured from '../measured.json';
import { Bed, Cue, semitones } from '../sound';
import { Phone, Recording, Touch } from '../story';
import { ease, FPS, formatBytes, H, px, sec, W } from '../system';
import { PressCanvas, usePress } from './Press';
import { at, type Cam, Find, Grain, jolt, mix, Signature, Size, span, travel, Wordmark } from './ritual';
import { type Band, DEPTH, distanceFor, GAP, NEAR, PLATE, RED, type Pose, type Press, type PressSetup } from './scene';

/**
 * A gate Short (wave three), 30 s, loops; wordless. Heavy photos and a limit
 * with an opening exactly its size: the photos are a glass tower many times
 * too tall, and it can't get in. One tap in the app, the plate falls, the air
 * goes, the tower is the icon's gap, and the name. The photos stand up, the
 * same pictures, light, and go through. Then the name is typed into a search
 * field and the store answers.
 *
 * Timed to the plan's sheets (shorts/wave-three/plan/ in the project files).
 * Every number is the app's: a measured result (measured.json) with its
 * recording, the count read off the stack's height, and the photos after
 * the press are the files the app wrote.
 *
 * 01 The Limit: one photo, an upload form's slot in a white wall.
 * 02 The Envelope: three photos, one email: the bands fan like cards, and
 *    the deck goes into the envelope's mouth before its flap seals.
 * 03 The Bubble: one photo for a chat, stuck on a send that never moves;
 *    pressed, it fits its bubble, the send completes, and replies come in.
 */
export const GATE_SHORT = { duration: sec(30) };

export type GateShortProps = {
  /** A result in measured.json, measured with a `preselected` purpose and an English recording. */
  result: 'limit-lake' | 'envelope' | 'bubble-cat';
  /** What the gate allows, in bytes, as the app's purpose defines it. */
  limit: number;
  gate: NonNullable<PressSetup['gate']>;
};

/** The beats, in seconds (a beat is 0.5 s, a bar 2 s, at 120 BPM). */
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

const SHOW = 4.3; // where the light prints stand to face the camera
const SEAL = [B.through + 0.1, B.through + 1.1]; // an envelope's flap swings shut
/** A chat's send: the share sent at each second while the photo is too heavy (it stalls), all of it in a quarter second once it fits. */
const SENDING: [number, number][] = [[0.5, 0.03], [1, 0.06], [1.5, 0.09], [3, 0.11], [5, 0.12]];
const SENT = B.through + 0.25;
const REPLIES = [24, 24.5, 25]; // the answers that come in once it is sent
const GUTTER = 96 / 1080; // the frame's side margin, as a share of its width
/** When the light beyond the gate opens: at once past a slot; for an envelope, a beat after it is sealed; after a chat's last reply. */
const openAt = (gate: GateShortProps['gate']) => ({ slot: B.through, envelope: SEAL[1] + 0.25, bubble: REPLIES[2] + 0.45 })[gate];
const CUT = [{ start: 0, end: 99 }];

/** A measured result as the scene's bands, bottom to top, with its recording. */
function bandsOf(result: GateShortProps['result']) {
  const m = measured[result];
  const bands: Band[] = 'items' in m
    ? m.items.map((item) => ({ before: `photos/${item.photo}.jpg`, after: item.file, from: item.from, to: item.to }))
    : [{ before: `photos/${m.photo}.jpg`, after: m.file, from: m.from, to: m.to }];
  return { bands, rec: m.flows.en };
}

/** The Short's choreography: a pose for any second. */
function choreography(press: Press, { gate }: GateShortProps) {
  const heavy = press.heightOf(press.total.from);
  const top = PLATE.tall + heavy;
  const hover = heavy + 0.95;
  const many = press.photos.length > 1;
  const wallX = press.gateX + PLATE.tip / 2; // the tower's centre when it touches the gate
  // The prints' centre once they are through; a chat photo stays in its bubble.
  const goneX = gate === 'bubble' ? press.gateX : press.gateX - PLATE.tip / 2 - (gate === 'envelope' ? 0.25 : 0.3);
  const near = NEAR * (many ? 1.45 : 1); // a fanned hand needs more width
  const open = openAt(gate);

  const close: Cam = { az: 0, el: Math.PI / 2, dist: near * 1.01, ty: top };
  const stops: [Cam, number, number][] = [
    [{ ...close, dist: near }, 0, B.crane], // the slow drift that keeps frame 0 alive
    [{ az: 0.55, el: 0.3, dist: distanceFor(top + 2.63, 0.78), tx: -1.1, ty: PLATE.tall + heavy * 0.5 }, B.crane, B.wide],
    [{ az: 0.42, el: 0.12, dist: distanceFor(top, 0.9), tx: -0.5, ty: PLATE.tall + heavy * 0.42 }, B.phone, B.app],
    [{ az: 0.5, el: 0.26, dist: distanceFor(top + 1, 0.8), tx: -0.9, ty: PLATE.tall + heavy * 0.5 }, B.tap, B.touch],
    [{ az: 0, el: 0, dist: 27.5, ty: PLATE.tall + GAP / 2 - 0.5 }, B.front, B.name],
    [{ az: 0, el: 0, dist: 27.5 * 0.97, ty: PLATE.tall + GAP / 2 - 0.5 }, B.name, B.lift], // the push-in on the name
    [{ az: 0, el: 0, dist: near + GAP / 2, ty: SHOW }, B.lift, B.shown],
    [{ az: 0.82, el: 0.3, dist: 19, tx: -1.5, ty: 1.45 }, B.flat, B.flat + 0.6],
  ];

  return (t: number): Pose => {
    const up = (a: number, b: number, curve = ease.standard) => span(t, a, b, curve);
    const squeeze = up(B.touch, B.pressed, ease.entrance);
    const h = mix(heavy, GAP, squeeze);
    // The upper plate: out of the dark while the camera finds the phone, the fall on the tap, the squeeze, away.
    const upper = (t < B.tap ? mix(hover + 16, hover, up(B.phone, B.app, ease.entrance)) : t < B.touch ? mix(hover, heavy, up(B.tap, B.touch, ease.exit)) : h)
      + 12 * up(B.lift, B.lift + 0.75, ease.entrance);
    // The stack tries the gate twice; then it rises to face us; then it lies down and goes through.
    const tries = B.tries.reduce((x, hit) => x + up(hit - 0.5, hit) - up(hit, hit + 0.5), 0);
    const x = mix(0, wallX, tries) + mix(0, goneX, up(B.slide, B.through));
    const y = mix(mix(PLATE.tall + h / 2, SHOW, up(B.lift, B.shown, ease.glide)), PLATE.tall + GAP / 2, up(B.flat, B.flat + 0.5, ease.glide));
    const tilt = (up(B.lift + 0.3, B.shown, ease.glide) - up(B.flat, B.flat + 0.5, ease.glide)) * Math.PI / 2;
    // Several photos fan like a hand of cards while they fill the frame, and square into a deck for the gate.
    const fan = many ? 1 - up(B.crane, B.crane + 1, ease.glide) + up(B.lift + 0.6, B.shown, ease.glide) - up(B.flat, B.flat + 0.5, ease.glide) : 0;
    const cam = travel(t, close, stops);
    const seal = gate === 'envelope' ? up(SEAL[0], SEAL[1], ease.glide) : 0;
    cam.shake = jolt(t, B.touch, 0.03);
    return {
      cam,
      stack: { h, x, y, tilt, fan, after: t >= B.touch },
      upper,
      studio: up(B.crane, B.crane + 1) - up(B.lift, B.lift + 1) + up(B.flat, B.flat + 0.6) - 0.7 * up(open, open + 1),
      gauge: up(B.crane + 0.5, B.wide) - up(B.pressed - 0.5, B.pressed),
      gate: 1 - up(B.front, B.front + 1.5, ease.exit) + up(B.flat - 0.4, B.flat + 0.4, ease.entrance),
      glint: B.tries.reduce((g, hit) => g + (t >= hit ? Math.exp(-(t - hit) * 7) : 0), 0),
      bytes: press.bytesOf(h),
      pour: up(B.through - 0.25, B.through + 0.5) * (1 - up(B.sink, B.find, ease.exit)) * (1 - seal),
      seal,
      air: t >= B.touch ? { age: t - B.touch, length: 2.5 } : undefined,
    };
  };
}

export function GateShort(props: GateShortProps) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const { bands, rec } = bandsOf(props.result);
  const press = usePress({ photos: bands, limit: props.limit, gate: props.gate });
  const poseAt = press.press && choreography(press.press, props);
  // Find covers the scene from its start until the first frame comes back for the loop.
  const finding = t >= B.find && t < B.loop;
  const st = t >= B.loop ? 0 : t; // the last quarter second is frame 0 again, fading in
  const p = poseAt && !finding ? poseAt(st) : null;
  // The scene goes once the flood covers it (the flood alone sinks to black), stays hidden under Find, and fades back in as frame 0.
  const open = openAt(props.gate);
  // A chat's scene gives way to the chat itself as the photo goes into its bubble.
  const gone = props.gate === 'bubble' ? span(t, B.through, B.through + 0.45) : span(t, open + 1, open + 1.1);
  const shown = t >= B.loop ? span(t, B.loop, 30, ease.standard) : finding ? 0 : 1 - gone;
  const over = press.press && p && overlay(press.press, p, st, props, rec);
  return (
    <AbsoluteFill style={{ background: 'var(--void)' }}>
      <AbsoluteFill style={{ opacity: shown, filter: blurAt(t) }}>
        <PressCanvas {...press} pose={p} />
        {over?.type}
      </AbsoluteFill>
      {over?.front}
      {finding && <Find t={t - B.find} legal={en.appStore.legal} />}
      <Grain seed={frame} />
      <Score gate={props.gate} many={bands.length > 1} />
    </AbsoluteFill>
  );
}

/**
 * Eyes closed it still tells the story: the limit set down on the photo, two
 * knocks against the gate, the tap, then the name in three sounds; the
 * prints through the gate, the air opening, nine keys. Paper for an
 * envelope, glass on a painted panel for a wall.
 */
function Score({ gate, many }: { gate: GateShortProps['gate']; many: boolean }) {
  const s = sec;
  const paper = gate === 'envelope', chat = gate === 'bubble';
  return (
    <>
      <Bed sound="room" levels={[[0, -40], [s(B.find), -40], [s(B.find) + 1, -50], [s(B.loop), -50], [s(30), -40]]} />
      {many && <Cue sound="flick" at={0} volume={0.3} />}
      <Cue sound="knock" at={s(B.line + 0.2)} volume={0.5} pitch={semitones(5)} />
      <Cue sound="swell" at={s(B.crane)} volume={0.35} />
      {B.tries.flatMap((hit) => [
        <Cue key={hit} sound="knock" at={s(hit)} volume={paper ? 0.4 : 0.55} pitch={semitones(paper ? 2 : -4)} />,
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
      {paper && <Cue sound="flick" at={s(SEAL[0])} volume={0.35} pitch={semitones(-7)} />}
      {paper && <Cue sound="knock" at={s(SEAL[1])} volume={0.3} pitch={semitones(7)} />}
      {chat && <Cue sound="send" at={s(B.line)} volume={0.25} />}
      {chat && SENDING.map(([a], i) => <Cue key={a} sound="counter-tick" at={s(a)} volume={0.14 - i * 0.02} pitch={semitones(9)} />)}
      {chat && <Cue sound="counter-tick" at={s(SENT)} volume={0.45} pitch={semitones(12)} />}
      {chat && REPLIES.map((a, i) => <Cue key={a} sound="pop" at={s(a)} volume={0.3} pitch={semitones([0, 3, 7][i])} />)}
      <Cue sound="bloom" at={s(openAt(gate))} volume={0.5} />
    </>
  );
}

/** Where a chat's photo lands, in shares of the frame: right-aligned as sent messages are, cropped 4:3. */
const SENT_PHOTO = { w: 0.62, top: 0.3, h: (0.62 * W) / H * 0.75 };

/**
 * A chat's payoff: the pressed photo leaves the bubble in the scene as the
 * photo in a sent message with its new size, its send completes in a quarter
 * second, and the answers come in, empty bubbles from the left, the last
 * with a heart.
 */
function Chat({ press, p, t }: { press: Press; p: Pose; t: number }) {
  const k = span(t, B.through - 0.1, B.through + 0.45, ease.glide);
  // From the bubble's outline in the scene (its bounds in the frame) to the message.
  const corners = [press.slot.top, press.slot.bottom].flatMap((y) => [-1, 1].map((z) => press.project(p, press.gateX, y, z * press.slot.half)));
  const [x0, y0] = [Math.min(...corners.map((c) => c[0])), Math.min(...corners.map((c) => c[1]))];
  const [x1, y1] = [Math.max(...corners.map((c) => c[0])), Math.max(...corners.map((c) => c[1]))];
  const { w, top, h } = SENT_PHOTO, left = 1 - GUTTER - w;
  const box = { left: mix(x0, left, k) * W, top: mix(y0, top, k) * H, width: mix(x1 - x0, w, k) * W, height: mix(y1 - y0, h, k) * H };
  return (
    <AbsoluteFill>
      <Img src={press.photos[press.photos.length - 1].after} style={{ position: 'absolute', ...box, objectFit: 'cover', opacity: span(t, B.through - 0.1, B.through + 0.15),
        borderRadius: px(40), borderBottomRightRadius: px(10) }} />
      <Size bytes={press.total.to} size={px(36)} style={{ ...at([left + 0.01, top + h + 0.012]), opacity: k }} />
      <div style={{ position: 'absolute', ...at([1 - GUTTER, top + h + 0.012], [1, 0]), fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: px(36), letterSpacing: '0.06em', color: 'var(--ink)', opacity: k }}>
        <Sending t={t} />
      </div>
      {REPLIES.map((a, i) => {
        const r = span(t, a, a + 0.35, ease.entrance);
        return r > 0 && (
          <div key={a} style={{ position: 'absolute', ...at([GUTTER, top + h + 0.06 + i * 0.048]), width: px([340, 240, 290][i]), height: px(72), borderRadius: px(36), borderBottomLeftRadius: px(10),
            background: 'rgb(255 255 255 / 0.1)', boxShadow: `inset 0 0 0 ${px(1.5)}px rgb(255 255 255 / 0.14)`, opacity: r, marginLeft: -(1 - r) * px(420) }}>
            {i === REPLIES.length - 1 && <Heart k={span(t, a + 0.2, a + 0.45, ease.entrance)} />}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** A chat's send: a ring that fills with the share sent, the share in figures, and a tick once it is all sent. */
function Sending({ t }: { t: number }) {
  const stalled = SENDING.reduce((k, [a, share]) => (t >= a ? share : k), 0);
  const share = mix(stalled, 1, span(t, B.through, SENT, ease.standard));
  const tick = span(t, SENT, SENT + 0.2, ease.standard);
  const r = 9, c = 2 * Math.PI * r;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: px(12), fontVariantNumeric: 'tabular-nums' }}>
      <svg width={px(40)} height={px(40)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r={r} opacity={0.25} />
        <circle cx="12" cy="12" r={r} strokeDasharray={`${c * share} ${c}`} transform="rotate(-90 12 12)" />
        {tick > 0 && <path d="M8 12.4 10.9 15.3 16.2 9.6" pathLength={1} strokeDasharray={`${tick} 1`} />}
      </svg>
      {Math.round(share * 100)}%
    </span>
  );
}

/** The small heart a reply carries, popping onto its corner. */
const Heart = ({ k }: { k: number }) => (
  <div style={{ position: 'absolute', right: -px(14), bottom: -px(18), width: px(44), height: px(44), borderRadius: '50%', background: '#1c1c1e',
    boxShadow: `0 0 0 ${px(3)}px var(--void)`, display: 'grid', placeItems: 'center', transform: `scale(${k})` }}>
    <svg width={px(24)} height={px(24)} viewBox="0 0 24 24" fill="#fff"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" /></svg>
  </div>
);

/** The focus rack: the press goes soft while the phone is in front of it. */
const blurAt = (t: number) => {
  const soft = span(t, B.phone + 0.5, B.app, ease.glide) - span(t, B.tap, B.tap + 0.6, ease.glide);
  return soft > 0.001 ? `blur(${px(22) * soft}px)` : undefined;
};

/** The type that rides on the scene (it goes soft with it), and in front of it the flood beyond the gate and the phone. */
function overlay(press: Press, p: Pose, t: number, { limit, gate }: GateShortProps, rec: ReturnType<typeof bandsOf>['rec']) {
  const under = p.bytes <= limit;
  const ink = under ? 'var(--ink)' : RED;
  const up = (a: number, b: number, curve = ease.standard) => span(t, a, b, curve);
  const many = press.photos.length > 1;
  // 1 while the photos fill the frame: lying at the start, standing for the proof.
  const close = 1 - up(B.crane, B.wide, ease.glide) + up(B.lift + 1, B.shown, ease.glide) - up(B.flat, B.flat + 0.5, ease.glide);
  const proof = t > B.lift;

  // The size: under the top photo's right edge when it fills the frame; in the studio, right of its top face, riding the plate down.
  // Fanned for the proof, each print carries its own size and the total sits under the hand.
  const corner = press.onStack(p, 0.5, 0.5, 0.5);
  corner[0] = Math.max(corner[0], press.onStack(p, 0.5, 0.5, -0.5)[0]); // clear of the far edge too, which a tall tower swings right
  const foot = many && proof ? press.onStack(p, 0, 0.5, 0.5, 0) : corner;
  const sizeAt: [number, number] = many && proof ? [0.5, foot[1] + 0.07] : [corner[0] + mix(0.03, 0, close), corner[1] + mix(0, 0.022, close)];
  const sizeShown = 1 - up(B.pressed + 0.4, B.pressed + 0.9) + up(B.shown - 0.4, B.shown) - up(B.flat, B.flat + 0.3);
  const each = many && proof ? press.photos.map((b, i) => ({ b, at: press.onStack(p, 0, 0.5, 0.5, i) })) : [];

  // The limit: a red hairline over the photo's top edge, which the crane turns into the opening's top edge.
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
  const chat = gate === 'bubble';
  const tagShown = Math.min(1, (t < B.wide ? (chat ? drop : 1) : 0) + up(B.wide - 0.5, B.wide) * (1 - up(B.front, B.front + 0.5)) + up(B.flat, B.flat + 0.6) * (1 - up(B.through, B.through + 0.3)));

  const name = up(B.name, B.name + 0.25) - up(B.lift, B.lift + 0.5);
  const nameAt = press.project(p, 0, -0.62, DEPTH / 2);
  const slot = chat ? [1 - GUTTER - SENT_PHOTO.w / 2, SENT_PHOTO.top + SENT_PHOTO.h / 2] : press.project(p, press.gateX, (press.slot.top + press.slot.bottom) / 2, 0);
  const flood = up(openAt(gate), openAt(gate) + 1);
  const phoneY = mix(px(2600), 0, up(B.phone + 0.3, B.app, ease.glide)) + px(2600) * up(B.tap + 0.05, B.tap + 0.6, ease.glide);
  const type = (
    <>
      <Size bytes={p.bytes} size={px(78)} style={{ ...at(sizeAt, many && proof ? [0.5, 0] : [close > 0.5 ? 1 : 0, close > 0.5 ? 0 : 0.5]), opacity: Math.max(0, Math.min(1, sizeShown)) }} />
      {each.map(({ b, at: a }) => (
        <Size key={b.after} bytes={b.to} size={px(40)} style={{ ...at([a[0], a[1] + 0.012], [0.5, 0]), opacity: Math.max(0, Math.min(1, sizeShown)) * up(B.shown - 0.4, B.shown) }} />
      ))}
      {lineShown > 0 && (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: lineShown }} viewBox="0 0 1 1" preserveAspectRatio="none">
          <line x1={line[0]} y1={line[1] - (1 - drop) * 0.04} x2={line[2]} y2={line[3] - (1 - drop) * 0.04} stroke={RED} strokeWidth={px(3)} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      <div style={{ position: 'absolute', ...at(tagAt, [mix(1, gate === 'envelope' && t < B.lift ? 1 : 0, k), 1]), marginTop: -px(14), fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: px(36), letterSpacing: '0.06em',
        color: ink, opacity: tagShown, whiteSpace: 'nowrap' }}>
        {chat ? <Sending t={t} /> : t < B.wide ? typed : label}
      </div>
      <Wordmark style={{ ...at([0.5, nameAt[1]], [0.5, 0]), opacity: name, marginTop: (1 - up(B.name, B.name + 0.25)) * px(19) }} />
    </>
  );
  // The flood: the top photo's own colours, blurred, opening from the gate on a soft edge.
  const r = flood * 180;
  const front = (
    <>
      {chat && t > B.through - 0.1 && <Chat press={press} p={p} t={t} />}
      {flood > 0 && (
        <Img src={press.photos[press.photos.length - 1].after} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          filter: `blur(${px(70)}px) saturate(1.3) brightness(${1 + 0.08 * Math.sin(Math.max(0, t - B.through - 1) * 2.4)})`, transform: 'scale(1.2)',
          opacity: 1 - up(B.sink, B.find, ease.exit), WebkitMaskImage: `radial-gradient(circle at ${slot[0] * 100}% ${slot[1] * 100}%, #000 ${r * 0.6}%, transparent ${r}%)` }} />
      )}
      {t >= B.phone && t < B.tap + 0.6 && (
        <Phone k={1.4} y={phoneY} neutral>
          {/* The recording opens on the purpose already chosen; it holds its first frame until it runs into the tap. */}
          <Sequence from={sec(B.phone)} durationInFrames={sec(B.tap - rec.at.go - B.phone)} layout="none"><Freeze frame={0}><Recording flow={rec.flow} from={0} cuts={CUT} time="9:41" /></Freeze></Sequence>
          {t >= B.tap - rec.at.go && <Recording flow={rec.flow} from={sec(B.tap - rec.at.go)} cuts={CUT} time="9:41" />}
          <Touch x={196} y={813} at={sec(B.tap)} t={sec(t)} />
        </Phone>
      )}
    </>
  );
  return { type, front };
}
