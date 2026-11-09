import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import en from '../../locales/en.json';
import measured from '../measured.json';
import { Name, Plates, pressGap } from '../Plates';
import { Bed, Cue, semitones } from '../sound';
import { Bytes, Drop, Glyph, keys, Phone, recAt, Recording, Room, SCREEN, shake, StatusBar, Swipe, tone, Touch } from '../story';
import { ease, H, mono, px, sec, ui } from '../system';
import { CardFace, TOP } from './AppStore';

/**
 * Photos for Grandma, 30 s, loops; wordless. Twelve holiday photos go into an
 * email and it bounces: 77 MB, the limit is 25 MB. You take out the best ones,
 * one by one, and it still bounces. Then Compresso, "Email", all twelve back,
 * 3.3 MB together, and they fly. Cut to a kitchen table in the morning: they
 * land on Grandma's phone, one after another, and she sends a heart.
 *
 * The mail screen is drawn here, generic and wordless: no brand. The limit is
 * the common 25 MB of the big mail services. Everything inside the app is the
 * app, recorded by scripts/measure.mjs.
 */
export const GRANDMA = { duration: sec(30) };

const m = measured.grandma;
const rec = m.flows.en;
const LIMIT = 25_000_000;
/** The best ones, taken out first: the biggest photos are the ones you love most. */
const DROPPED = [...m.items.keys()].sort((a, b) => m.items[b].from - m.items[a].from).slice(0, 4);

const BOUNCES = [sec(0.6), sec(7.2)]; //               the mail comes back
const SENDS = [0, sec(6.4)]; //                        each send flies up first
const REMOVE = [2, 3, 4, 5].map(sec); //               one photo out each second
const APP = sec(9); //                                 swipe to Compresso
// The real app from just before the tap; its encode of all twelve runs six times faster than life.
const CUTS = [{ start: 0.4, end: 1.6 }, { start: 1.6, end: rec.at.done, rate: 6 }, { start: rec.at.done, end: 99 }];
const DONE = recAt(CUTS, APP, rec.at.done);
const BACK = sec(14.6); //                             back in the mail, all twelve, light
const SEND = sec(15.8); //                             and away
const AWAY = SEND + sec(0.3);
const KITCHEN = sec(17.3); //                          Grandma's table, next morning
const LAND = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => sec(18.4) + i * 9);
const HEART = sec(21.4);
const OUT = sec(23.4);
const PLATES = sec(24);
const CLAMP = sec(25.5);

/** The photos in the job, in order, at a size the screens can draw. */
const photo = (i: number) => staticFile(`photos/${m.items[i].photo}.jpg`);

/** The compose screen: Grandma as the recipient, the photos, their total against the limit, and send. */
function Mail({ t, kept, light, flying, bounced }: { t: number; kept: (i: number) => number; light: boolean; flying: number; bounced: number | null }) {
  const total = light ? m.to : m.items.reduce((sum, item, i) => sum + item.from * (kept(i) > 0.5 ? 1 : 0), 0);
  const over = !light && total > LIMIT;
  const jolt = bounced === null ? 0 : shake(t, bounced, 10);
  return (
    <AbsoluteFill style={{ background: tone.card, fontFamily: ui, color: tone.text }}>
      <StatusBar time="19:42" ink="#000" />
      <div style={{ position: 'absolute', top: 62, left: 20, right: 20 }}>
        {/* To: Grandma, an avatar with a heart. Then a subject too small to read. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #E5E5EA' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: '#FFE3E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Glyph name="heart" size={22} color="#FF375F" />
            </div>
            <div style={{ width: 120, height: 10, borderRadius: 5, background: '#3A3A3C' }} />
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 19, background: tone.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Glyph name="up" size={22} color="#fff" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 16, transform: `translateX(${jolt}px)` }}>
          {m.items.map((item, i) => (
            <div key={item.photo} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: '#F2F2F7' }}>
              <Img src={photo(i)} style={{
                width: '100%', height: '100%', objectFit: 'cover',
                opacity: kept(i), transform: `scale(${0.6 + 0.4 * kept(i)}) translateY(${-flying * 400}px)`,
              }} />
            </div>
          ))}
        </div>
        {/* What the mail weighs: a paperclip and the total, red over the limit. */}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12,
          background: over ? 'rgb(255 69 58 / 0.1)' : 'rgb(48 209 88 / 0.1)', transform: `translateX(${jolt * 1.3}px)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Glyph name="clip" size={20} color={over ? tone.red : tone.green} />
            <Bytes bytes={total} size={20} color={over ? tone.red : tone.green} style={{ fontWeight: 500 }} />
          </div>
          <div style={{ fontFamily: mono, fontSize: 16, color: tone.mute }}>≤ <Bytes bytes={LIMIT} size={16} /></div>
        </div>
      </div>
      {bounced !== null && (
        // The bounce: the envelope comes back with a cross, then settles as a banner.
        <div style={{ position: 'absolute', left: 20, right: 20, bottom: 70, height: 56, borderRadius: 14, background: tone.red, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: mono, fontSize: 18,
          opacity: keys(t, [[bounced, 0], [bounced + 8, 1]]), transform: `translateY(${keys(t, [[bounced, -300], [bounced + 14, 0]], ease.entrance)}px) translateX(${jolt}px)` }}>
          <Glyph name="mail" size={24} color="#fff" /><Glyph name="cross" size={18} color="#fff" />
          <Bytes bytes={total} size={18} /> &gt; <Bytes bytes={LIMIT} size={18} />
        </div>
      )}
      {light && t >= AWAY && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `rgb(255 255 255 / ${0.8 * keys(t, [[AWAY, 0], [AWAY + 12, 1]])})` }}>
          <div style={{ width: 120, height: 120, borderRadius: 60, background: tone.green, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${keys(t, [[AWAY, 0.6], [AWAY + 20, 1]], ease.entrance)})`, opacity: keys(t, [[AWAY, 0], [AWAY + 10, 1]]) }}>
            <Glyph name="check" size={76} color="#fff" />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

/** Grandma's phone: her text is set large, the photos land one by one, and her heart answers. */
function Received({ t }: { t: number }) {
  return (
    <AbsoluteFill style={{ background: tone.paper, fontFamily: ui, color: tone.text }}>
      <StatusBar time="09:12" ink="#000" />
      <div style={{ position: 'absolute', top: 64, left: 18, right: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Glyph name="mail" size={34} color={tone.blue} />
          <div style={{ width: 150, height: 14, borderRadius: 7, background: '#3A3A3C' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {LAND.slice(0, 8).map((at, i) => (
            <div key={at} style={{ aspectRatio: '4 / 3', borderRadius: 12, overflow: 'hidden', background: '#E5E5EA' }}>
              <Img src={photo(i)} style={{ width: '100%', height: '100%', objectFit: 'cover',
                opacity: keys(t, [[at, 0], [at + 10, 1]]), transform: `scale(${keys(t, [[at, 1.12], [at + 16, 1]], ease.entrance)})` }} />
            </div>
          ))}
        </div>
      </div>
      {t >= HEART && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: `scale(${keys(t, [[HEART, 0.4], [HEART + 18, 1]], ease.entrance)})`, opacity: keys(t, [[HEART, 0], [HEART + 8, 1]]),
            filter: 'drop-shadow(0 10px 30px rgb(255 55 95 / 0.55))' }}>
            <Glyph name="heart" size={170} color="#FF375F" />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

/** Where the send button sits on the compose screen, in points. */
const SEND_BUTTON = { x: SCREEN.w - 39, y: 81 };

export function Grandma() {
  const t = useCurrentFrame();
  const light = t >= BACK;
  // A dropped photo shrinks away as it's taken out; after Compresso, all twelve are back.
  const kept = (i: number) => {
    const out = DROPPED.indexOf(i);
    return light || out < 0 ? 1 : 1 - keys(t, [[REMOVE[out], 0], [REMOVE[out] + 14, 1]], ease.exit);
  };
  const send = [...SENDS, SEND].reverse().find((f) => t >= f) ?? 0;
  const flying = light ? keys(t, [[SEND, 0], [AWAY + 10, 1]], ease.exit) : keys(t, [[send, 0], [send + 14, 0.6], [send + 36, 0]], ease.glide);
  const bounced = light ? null : [...BOUNCES].reverse().find((f) => t >= f) ?? null;
  const mail = <Mail t={t} kept={kept} light={light} flying={flying} bounced={bounced} />;
  const app = <Recording flow={rec.flow} from={APP} cuts={CUTS} time="19:43" />;
  const kitchen = t >= KITCHEN;

  // The sender's phone held up and tilted; at Grandma's it lies flat on the table, seen from above.
  const pose = kitchen
    ? { k: keys(t, [[KITCHEN, 1.9], [HEART + sec(1), 1.75]], ease.glide), y: keys(t, [[KITCHEN, px(-200)], [KITCHEN + sec(0.6), 0], [OUT, 0], [OUT + sec(1), H]], ease.glide), rz: keys(t, [[KITCHEN, -18], [HEART, -8]], ease.glide) }
    : {
      k: keys(t, [[0, 1.8], [APP, 1.6], [DONE, 1.35], [BACK, 1.7]], ease.glide),
      y: keys(t, [[0, px(30)], [DONE, px(520)], [BACK - sec(0.3), px(520)], [BACK, px(30)]], ease.glide),
      rx: keys(t, [[0, 9], [APP, 4], [DONE, 14], [BACK, 6]], ease.glide),
      ry: keys(t, [[0, 12], [APP, -8], [BACK, 10], [KITCHEN, 0]], ease.glide),
      rz: keys(t, [[0, 2], [KITCHEN, 0]], ease.glide),
    };

  if (t >= CLAMP) return <><CardFace {...en.appStore} locale="en" /><Score /></>;
  return (
    <AbsoluteFill>
      {kitchen
        ? <Room photo="fruit-table" t={t} light="rgb(255 200 120 / 0.3)" dim={keys(t, [[OUT, 0], [PLATES, 1]])} />
        : <Room photo="living-room" t={t} light="rgb(255 170 100 / 0.3)" dim={keys(t, [[sec(7.5), 0], [APP, 0.3], [BACK, 0]])} />}
      {t < OUT + sec(1) && (
        <Phone {...pose}>
          {kitchen ? <Received t={t} /> : t < BACK ? <Swipe t={t} at={APP} from={mail} to={app} /> : <Swipe t={t} at={BACK} from={app} to={mail} />}
          {!kitchen && [SENDS[1], SEND].map((at) => <Touch key={at} {...SEND_BUTTON} at={at - 4} t={t} />)}
        </Phone>
      )}
      {/* A white flash carries the cut from the sender's room to the kitchen. */}
      <AbsoluteFill style={{ background: '#fff', opacity: keys(t, [[KITCHEN - 8, 0], [KITCHEN, 0.85], [KITCHEN + 14, 0]]) }} />
      {t >= DONE - 12 && t < BACK && <Drop from={m.from} to={m.to} at={DONE} t={t} y={px(250)} />}
      {t >= PLATES && <Plates gap={pressGap(t - PLATES, CLAMP - PLATES)} y={TOP} />}
      {t >= CLAMP - 1 && <Name y={TOP} />}
      <Score />
    </AbsoluteFill>
  );
}

/**
 * A living room in the evening; each bounce a dull thud and a falling glass
 * note, each photo taken out a softer one. Silence for the app, the exhale
 * and the glass as the size lands, the send that doesn't come back. Then
 * morning in a kitchen: a kettle, birds, photos landing like cards on a
 * table, and the heart in glass.
 */
function Score() {
  return (
    <>
      <Bed sound="night" levels={[[0, -26], [APP, -32], [KITCHEN - 1, -26], [KITCHEN, -60]]} />
      <Bed sound="kitchen" levels={[[KITCHEN - 1, -60], [KITCHEN, -18], [OUT, -20], [GRANDMA.duration, -40]]} />
      {[SENDS[1], SEND].map((f) => <Cue key={`t${f}`} sound="tap" at={f - 4} volume={0.7} />)}
      {[...SENDS, SEND].map((f) => <Cue key={`s${f}`} sound="send" at={f} volume={0.5} />)}
      {BOUNCES.map((f, i) => <Cue key={f} sound="thud" at={f} volume={0.6 + i * 0.15} />)}
      {BOUNCES.map((f, i) => <Cue key={`d${f}`} sound="deflate" at={f + 4} volume={0.35 + i * 0.15} />)}
      {BOUNCES.map((f) => <Cue key={`e${f}`} sound="error" at={f} volume={0.4} />)}
      {REMOVE.map((f, i) => <Cue key={f} sound="flick" at={f} volume={0.5} pitch={semitones(-i)} />)}
      <Cue sound="flick" at={APP} volume={0.5} />
      <Cue sound="tap" at={recAt(CUTS, APP, rec.at.tap)} volume={0.7} />
      <Cue sound="tap" at={recAt(CUTS, APP, rec.at.go)} volume={0.7} />
      <Cue sound="exhale" at={DONE} volume={0.9} />
      {[0, 4, 7].map((n) => <Cue key={n} sound="glass-tick" at={DONE + 48} volume={0.3} pitch={semitones(n)} />)}
      <Cue sound="flick" at={BACK} volume={0.5} />
      <Cue sound="zip" at={KITCHEN - 10} volume={0.5} />
      <Cue sound="pop" at={LAND[0] - sec(0.4)} volume={0.6} />
      {LAND.slice(0, 8).map((f, i) => <Cue key={`l${f}`} sound="flick" at={f} volume={0.35} pitch={semitones(i % 3)} />)}
      <Cue sound="chime" at={HEART} volume={0.8} />
      <Cue sound="pop" at={HEART} volume={0.5} />
      <Cue sound="press-logo" at={CLAMP - sec(2)} />
    </>
  );
}
