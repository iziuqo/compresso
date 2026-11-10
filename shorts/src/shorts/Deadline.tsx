import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import en from '../../locales/en.json';
import measured from '../measured.json';
import { Name, Plates, pressGap } from '../Plates';
import { Bed, Cue, semitones } from '../sound';
import { Bytes, Drop, Glyph, keys, Phone, recAt, Recording, Room, SCREEN, shake, StatusBar, Swipe, tone, Touch } from '../story';
import { ease, H, mono, px, sec, ui } from '../system';
import { CardFace, TOP } from './AppStore';

/**
 * The 2 MB limit, 30 s, loops; wordless. 23:57, a form due at 23:59, and it
 * keeps refusing the photo: 11 MB, the limit is 2 MB. Again. Again. The clock
 * turns, the heart speeds up. Then Compresso, "Upload form", one tap, and
 * the size falls. Back on the form it goes through with a minute to spare.
 *
 * The form is drawn here, generic and wordless: no brand, no real site.
 * Everything inside the app is the app, recorded by scripts/measure.mjs.
 */
export const DEADLINE = { duration: sec(30) };

const m = measured.deadline;
const rec = m.flows.en;

// The beats, in frames. The first refusal is already on screen at frame 0.
const TRIES = [0, 2.2, 5.6, 7.8, 8.8].map(sec); //   each refusal lands here; the tap comes 0.6 s before
const MINUTE = sec(6.6); //                          23:57 turns 23:58
const APP = sec(11.5); //                            swipe to Compresso, the recording from 0.4 s in
const CUTS = [{ start: 0.4, end: 99 }]; //           the app in real time, from just before the tap
const DONE = recAt(CUTS, APP, rec.at.done); //      the app's result: the size drops, big
const BACK = sec(17); //                             swipe back to the form
const SEND = sec(18); //                             tap; the upload runs
const SENT = sec(18.9); //                           through, at 23:59
const OUT = sec(21.5); //                            the phone leaves, the room goes dark
const PLATES = sec(23); //                           the icon closes on the card
const CLAMP = sec(24.5);

/** The form: a few filled fields, the photo, its size against the limit, and the upload button. */
function Form({ t, bytes, failed, progress, sent }: { t: number; bytes: number; failed: number | null; progress: number; sent: boolean }) {
  const jolt = failed === null ? 0 : shake(t, failed, 9);
  const over = failed !== null && !sent;
  const bar = (w: number, dark = false) => <div style={{ width: w, height: 9, borderRadius: 5, background: dark ? '#3A3A3C' : '#D1D1D6' }} />;
  return (
    <AbsoluteFill style={{ background: tone.paper, fontFamily: ui, color: tone.text }}>
      <StatusBar time={t < MINUTE ? '23:57' : t < SENT ? '23:58' : '23:59'} ink="#000" />
      {/* The browser's address pill: a lock and an address too small to matter. */}
      <div style={{ position: 'absolute', top: 60, left: 24, right: 24, height: 38, borderRadius: 12, background: '#E3E3E8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <div style={{ width: 9, height: 11, borderRadius: 2, background: '#8E8E93' }} />{bar(120)}
      </div>
      <div style={{ position: 'absolute', top: 118, left: 24, right: 24 }}>
        {/* The deadline the form states, in red: everyone reads a clock. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{bar(170, true)}{bar(110)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 18, background: 'rgb(255 69 58 / 0.12)', color: tone.red, fontFamily: mono, fontSize: 17, fontWeight: 500 }}>
            <Glyph name="clock" size={18} color={tone.red} />23:59
          </div>
        </div>
        {[150, 210].map((w) => (
          <div key={w} style={{ marginTop: 16, height: 46, borderRadius: 12, background: tone.card, display: 'flex', alignItems: 'center', padding: '0 14px' }}>{bar(w, true)}</div>
        ))}
        <div style={{ marginTop: 16, borderRadius: 16, background: tone.card, padding: 12, transform: `translateX(${jolt}px)`,
          boxShadow: over ? `0 0 0 2px ${tone.red}` : sent ? `0 0 0 2px ${tone.green}` : 'none' }}>
          <Img src={staticFile(`photos/${m.photo}.jpg`)} style={{ width: '100%', height: 190, objectFit: 'cover', borderRadius: 10, display: 'block' }} />
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Glyph name={over ? 'cross' : 'check'} size={20} color={over ? tone.red : tone.green} />
              <Bytes bytes={bytes} size={20} color={over ? tone.red : tone.text} style={{ fontWeight: 500 }} />
            </div>
            <div style={{ fontFamily: mono, fontSize: 16, color: tone.mute }}>≤ <Bytes bytes={m.limit} size={16} /></div>
          </div>
        </div>
        {/* The refusal: the size against the limit, said in symbols. */}
        <div style={{ marginTop: 14, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: tone.red, color: '#fff', fontFamily: mono, fontSize: 18, opacity: over ? 1 : 0, transform: `translateX(${jolt * 1.3}px)` }}>
          <Glyph name="cross" size={20} color="#fff" /><Bytes bytes={bytes} size={18} /> &gt; <Bytes bytes={m.limit} size={18} />
        </div>
        <div style={{ marginTop: 14, height: 54, borderRadius: 27, background: sent ? tone.green : tone.blue, position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, background: 'rgb(255 255 255 / 0.28)' }} />
          <Glyph name={sent ? 'check' : 'up'} size={26} color="#fff" />
        </div>
      </div>
      {sent && (
        // Accepted: one big tick over the page.
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `rgb(242 242 247 / ${0.75 * keys(t, [[SENT, 0], [SENT + 18, 1]])})` }}>
          <div style={{ width: 132, height: 132, borderRadius: 66, background: tone.green, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${keys(t, [[SENT, 0.6], [SENT + 20, 1]], ease.entrance)})`, opacity: keys(t, [[SENT, 0], [SENT + 10, 1]]) }}>
            <Glyph name="check" size={84} color="#fff" />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

/** Where the upload button sits on the form, in points: the taps land there. */
const BUTTON = { x: SCREEN.w / 2, y: 646 };

export function Deadline() {
  const t = useCurrentFrame();
  const failed = [...TRIES].reverse().find((f) => t >= f) ?? null;
  const fixed = t >= BACK;
  const form = (
    <Form t={t} bytes={fixed ? m.to : m.from} failed={fixed ? null : failed} sent={t >= SENT}
      progress={keys(t, [[SEND, 0], [SENT, 1]], ease.glide)} />
  );
  const app = <Recording flow={rec.flow} from={APP} cuts={CUTS} time="23:58" />;
  const taps = [...TRIES.slice(1).map((f) => f - sec(0.6)), SEND];

  // The camera: close and tilted on the refusals, pushing in as the minute turns;
  // pulled back and lower for the drop, so the size has the room above; level on the tick.
  const pose = {
    k: keys(t, [[0, 1.75], [sec(10.5), 2.05], [APP, 1.6], [DONE, 1.35], [BACK, 1.6], [SENT, 1.7], [OUT, 1.6]], ease.glide),
    y: keys(t, [[0, px(40)], [APP, px(60)], [DONE, px(520)], [BACK - sec(0.3), px(520)], [BACK, px(40)], [OUT, px(40)], [OUT + sec(1.2), H]], ease.glide),
    rx: keys(t, [[0, 10], [sec(10.5), 4], [DONE, 14], [BACK, 6], [SENT, 0]], ease.glide),
    ry: keys(t, [[0, -14], [sec(10.5), -6], [APP, 8], [BACK, -8], [SENT + sec(2), 0]], ease.glide),
    rz: keys(t, [[0, -3], [sec(10.5), -1], [SENT, 0]], ease.glide),
  };

  if (t >= CLAMP) return <><CardFace {...en.appStore} locale="en" /><Score /></>;
  return (
    <AbsoluteFill>
      <Room photo="desk-night" t={t} light="rgb(255 150 70 / 0.35)" dim={keys(t, [[sec(9), 0], [sec(11), 0.35], [APP + sec(1), 0.1], [OUT, 0], [PLATES, 1]])} />
      {/* The refusals flash the room red, a little harder each time. */}
      {TRIES.map((f, i) => t >= f && t < f + 30 && (
        <AbsoluteFill key={f} style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 30%, rgb(255 40 40 / ${(0.1 + i * 0.05) * (1 - (t - f) / 30)}))` }} />
      ))}
      {t < OUT + sec(1.2) && (
        <Phone {...pose}>
          {t < BACK ? <Swipe t={t} at={APP} from={form} to={app} /> : <Swipe t={t} at={BACK} from={app} to={form} />}
          {taps.map((at) => <Touch key={at} {...BUTTON} at={at} t={t} />)}
        </Phone>
      )}
      {t >= DONE - 12 && t < BACK && <Drop from={m.from} to={m.to} at={DONE} t={t} y={px(250)} />}
      {t >= PLATES && <Plates gap={pressGap(t - PLATES, CLAMP - PLATES)} y={TOP} />}
      {t >= PLATES && t >= CLAMP - 1 && <Name y={TOP} />}
      <Score />
    </AbsoluteFill>
  );
}

/**
 * The sound tells it with eyes closed: a quiet room at night and a clock;
 * every refusal a phone buzzing on the desk, the heartbeat coming in under
 * them; silence when the app opens; the size falls on one long exhale and
 * lands in glass; the upload zips through and the room breathes again.
 */
function Score() {
  return (
    <>
      <Bed sound="night" levels={[[0, -24], [APP, -30], [SENT, -22], [PLATES, -30], [DEADLINE.duration, -40]]} />
      <Bed sound="clock" levels={[[0, -26], [MINUTE, -20], [APP, -34], [SENT, -60]]} />
      <Bed sound="heartbeat" levels={[[0, -60], [TRIES[2], -60], [TRIES[2] + 1, -22], [sec(10.5), -12], [DONE, -60]]} />
      {TRIES.map((f, i) => <Cue key={f} sound="error" at={f} volume={0.55 + i * 0.08} />)}
      {TRIES.slice(1).map((f) => <Cue key={`t${f}`} sound="tap" at={f - sec(0.6)} volume={0.7} />)}
      <Cue sound="knock" at={MINUTE} volume={0.5} pitch={semitones(-5)} />
      <Cue sound="flick" at={APP} volume={0.5} />
      <Cue sound="tap" at={recAt(CUTS, APP, rec.at.tap)} volume={0.7} />
      <Cue sound="tap" at={recAt(CUTS, APP, rec.at.go)} volume={0.7} />
      <Cue sound="exhale" at={DONE} volume={0.9} />
      {[0, 4, 7].map((n) => <Cue key={n} sound="glass-tick" at={DONE + 48} volume={0.3} pitch={semitones(n)} />)}
      <Cue sound="flick" at={BACK} volume={0.5} />
      <Cue sound="tap" at={SEND} volume={0.7} />
      <Cue sound="zip" at={SEND + sec(0.2)} volume={0.6} />
      <Cue sound="chime" at={SENT} volume={0.8} />
      <Cue sound="press-logo" at={CLAMP - sec(2)} />
    </>
  );
}
