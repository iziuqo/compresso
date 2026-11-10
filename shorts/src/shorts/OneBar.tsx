import type { ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import en from '../../locales/en.json';
import measured from '../measured.json';
import { Name, Plates, pressGap } from '../Plates';
import { Bed, Cue, semitones } from '../sound';
import { Bytes, Drop, Glyph, keys, Phone, recAt, Recording, Room, SCREEN, shake, StatusBar, Swipe, tone, Touch } from '../story';
import { ease, H, mono, px, sec, ui } from '../system';
import { CardFace, TOP } from './AppStore';

/**
 * One bar, 30 s, loops; wordless. The beach at sunset, one bar of signal, 9 %
 * battery, and eight photos for the group chat stuck at a few percent while
 * the light goes. It fails; again. Then Compresso, "Message", one tap, and
 * the batch falls to a sliver. Back in the chat it zips through and the
 * hearts come back before the sun is down.
 *
 * The chat is drawn here, generic and wordless: no brand, no real app.
 * Everything inside Compresso is the app, recorded by scripts/measure.mjs.
 */
export const ONE_BAR = { duration: sec(30) };

const m = measured['one-bar'];
const rec = m.flows.en;

// The beats, in frames. The photos are already crawling up at frame 0.
const FAIL = sec(5.4); //                             the upload gives up
const RETRY = sec(6.6); //                            tap the alert; it crawls again
const APP = sec(9.5); //                              swipe to Compresso, the recording from 0.4 s in
const CUTS = [{ start: 0.4, end: 99 }]; //            the app in real time, from just before the tap
const DONE = recAt(CUTS, APP, rec.at.done); //       the batch drops, big
const BACK = sec(15.6); //                            swipe back to the chat
const SEND = sec(16.4); //                            tap send; it zips
const SENT = sec(17.1); //                            through: ✓✓
const REPLIES = [17.7, 18.3, 18.9].map(sec); //       the friends answer in hearts
const OUT = sec(21.5); //                             the phone leaves, the sun is down
const PLATES = sec(23);
const CLAMP = sec(24.5);

/** One bar of four, in the bubble beside the stalled percentage: why it's stuck. */
function Signal() {
  return (
    <span style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
      {[0, 1, 2, 3].map((i) => <span key={i} style={{ width: 4, height: 6 + i * 3.5, borderRadius: 1, background: i ? '#48484A' : '#FF9F0A' }} />)}
    </span>
  );
}

/** The chat bubble's photos: the first four of the batch, the rest a "+4". */
const SHOWN = m.items.slice(0, 4);

/** The group chat: two friends' bubbles, the batch going out, its progress and size, and the composer. */
function Chat({ t, bytes, progress, failed, sent }: { t: number; bytes: number; progress: number; failed: boolean; sent: boolean }) {
  const jolt = failed ? shake(t, FAIL, 8) : 0;
  const skeleton = (w: number, color = '#8E8E93') => <div style={{ width: w, height: 9, borderRadius: 5, background: color }} />;
  const bubble = (side: 'in' | 'out', children: ReactNode, at?: number) => (
    <div style={{ alignSelf: side === 'in' ? 'flex-start' : 'flex-end', maxWidth: 270, padding: '11px 14px', borderRadius: 20,
      background: side === 'in' ? '#26252A' : tone.blue, display: 'flex', alignItems: 'center', gap: 6,
      ...(at === undefined ? {} : { opacity: keys(t, [[at, 0], [at + 6, 1]]), transform: `scale(${keys(t, [[at, 0.5], [at + 14, 1]], ease.entrance)})`, transformOrigin: 'left bottom' }) }}>
      {children}
    </div>
  );
  return (
    <AbsoluteFill style={{ background: '#000', fontFamily: ui, color: '#fff' }}>
      <StatusBar time={t < APP ? '19:12' : '19:13'} bars={1} battery={keys(t, [[0, 0.12], [OUT, 0.08]])} />
      {/* The group: three avatars and a name too small to read. */}
      <div style={{ position: 'absolute', top: 56, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingBottom: 10, borderBottom: '1px solid #1C1C1E' }}>
        <div style={{ display: 'flex' }}>
          {['#FF9F0A', '#64D2FF', '#BF5AF2'].map((c, i) => <div key={c} style={{ width: 30, height: 30, borderRadius: 15, background: c, border: '2px solid #000', marginLeft: i ? -9 : 0 }} />)}
        </div>
        {skeleton(70, '#636366')}
      </div>
      <div style={{ position: 'absolute', top: 140, left: 14, right: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {bubble('in', <>{skeleton(150)}</>)}
        {bubble('in', <>{skeleton(90)}<Glyph name="heart" size={18} color="#FF375F" /></>)}
        {/* The batch: four photos and the rest, then its size and how far it has got. */}
        <div style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, transform: `translateX(${jolt}px)` }}>
          {failed && <div style={{ transform: `scale(${keys(t, [[FAIL, 0.3], [FAIL + 14, 1]], ease.entrance)})` }}><Glyph name="alert" size={30} color={tone.red} /></div>}
          <div style={{ width: 300, borderRadius: 20, overflow: 'hidden', background: '#1C1C1E', opacity: sent ? 1 : 0.85 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              {SHOWN.map((item, i) => (
                <div key={item.photo} style={{ position: 'relative', aspectRatio: '1' }}>
                  <Img src={staticFile(`photos/${item.photo}.jpg`)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {i === SHOWN.length - 1 && (
                    <AbsoluteFill style={{ background: 'rgb(0 0 0 / 0.45)', alignItems: 'center', justifyContent: 'center', fontSize: 38, fontWeight: 600 }}>+{m.items.length - SHOWN.length}</AbsoluteFill>
                  )}
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: mono, fontSize: 17 }}>
              <Bytes bytes={bytes} size={17} color={failed ? tone.red : '#fff'} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: failed ? tone.red : '#8E8E93' }}>
                {progress < 0.1 && !sent && <Signal />}{Math.round(progress * 100)} %
              </span>
            </div>
            <div style={{ height: 4, background: '#2C2C2E' }}>
              <div style={{ height: '100%', width: `${progress * 100}%`, background: failed ? tone.red : sent ? tone.green : tone.blue }} />
            </div>
          </div>
        </div>
        {sent && (
          // Delivered, then the answers: a tick pair and hearts.
          <div style={{ alignSelf: 'flex-end', display: 'flex', marginTop: -2, opacity: keys(t, [[SENT, 0], [SENT + 8, 1]]) }}>
            <Glyph name="check" size={18} color={tone.green} /><Glyph name="check" size={18} color={tone.green} style={{ marginLeft: -10 }} />
          </div>
        )}
        {t >= REPLIES[0] && bubble('in', <>{[0, 1, 2].map((i) => <Glyph key={i} name="heart" size={22} color="#FF375F" />)}</>, REPLIES[0])}
        {t >= REPLIES[1] && bubble('in', <>{skeleton(110)}</>, REPLIES[1])}
        {t >= REPLIES[2] && bubble('in', <><Glyph name="heart" size={34} color="#FF375F" /></>, REPLIES[2])}
      </div>
      {/* The composer: a field and the send button. */}
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 34, height: 40, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 38, borderRadius: 19, border: '1px solid #3A3A3C' }} />
        <div style={{ width: 34, height: 34, borderRadius: 17, background: tone.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Glyph name="up" size={20} color="#fff" />
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Where the taps land, in points: the alert beside the bubble, and send. */
const ALERT = { x: 54, y: 395 };
const SEND_BUTTON = { x: SCREEN.w - 31, y: SCREEN.h - 54 };

export function OneBar() {
  const t = useCurrentFrame();
  const fixed = t >= BACK;
  const failed = !fixed && t >= FAIL && t < RETRY;
  // Stuck: a crawl that never gets far, then a fresh crawl after the retry; after Compresso, a zip.
  const progress = fixed ? keys(t, [[SEND, 0], [SENT, 1]], ease.glide)
    : t < RETRY ? keys(t, [[0, 0.02], [FAIL, 0.04]]) : keys(t, [[RETRY, 0], [APP, 0.01]]);
  const chat = <Chat t={t} bytes={fixed ? m.to : m.from} progress={progress} failed={failed} sent={t >= SENT} />;
  const app = <Recording flow={rec.flow} from={APP} cuts={CUTS} time="19:13" />;

  // Held low and tilted towards the sea; pulled back for the drop; level on the hearts.
  const pose = {
    k: keys(t, [[0, 1.75], [sec(9), 2.0], [APP, 1.6], [DONE, 1.35], [BACK, 1.6], [SENT, 1.7], [OUT, 1.6]], ease.glide),
    y: keys(t, [[0, px(40)], [APP, px(60)], [DONE, px(520)], [BACK - sec(0.3), px(520)], [BACK, px(40)], [OUT, px(40)], [OUT + sec(1.2), H]], ease.glide),
    rx: keys(t, [[0, 10], [sec(9), 5], [DONE, 14], [BACK, 6], [SENT, 0]], ease.glide),
    ry: keys(t, [[0, 14], [sec(9), 6], [APP, -8], [BACK, 8], [SENT + sec(2), 0]], ease.glide),
    rz: keys(t, [[0, 3], [sec(9), 1], [SENT, 0]], ease.glide),
  };

  if (t >= CLAMP) return <><CardFace {...en.appStore} locale="en" /><Score /></>;
  return (
    <AbsoluteFill>
      {/* The light goes while it waits; it's nearly dark by the end. */}
      <Room photo="beach-dusk" t={t} light="rgb(255 140 80 / 0.35)" dim={keys(t, [[0, 0], [APP, 0.3], [OUT, 0.45], [PLATES, 1]])} />
      {failed && t < FAIL + 30 && (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 30%, rgb(255 40 40 / ${0.15 * (1 - (t - FAIL) / 30)}))` }} />
      )}
      {t < OUT + sec(1.2) && (
        <Phone {...pose}>
          {t < BACK ? <Swipe t={t} at={APP} from={chat} to={app} /> : <Swipe t={t} at={BACK} from={app} to={chat} />}
          <Touch {...ALERT} at={RETRY - 4} t={t} />
          <Touch {...SEND_BUTTON} at={SEND - 4} t={t} />
        </Phone>
      )}
      {t >= DONE - 12 && t < BACK && <Drop from={m.from} to={m.to} at={DONE} t={t} y={px(250)} />}
      {t >= PLATES && <Plates gap={pressGap(t - PLATES, CLAMP - PLATES)} y={TOP} />}
      {t >= CLAMP - 1 && <Name y={TOP} />}
      <Score />
    </AbsoluteFill>
  );
}

/**
 * Waves and wind at dusk under everything; the upload gives up with a buzz
 * and a falling note; silence for the app; the exhale and the glass as the
 * size lands; then the zip, and the answers pop in like bubbles.
 */
function Score() {
  return (
    <>
      <Bed sound="beach" levels={[[0, -20], [APP, -28], [SENT, -20], [PLATES, -30], [ONE_BAR.duration, -40]]} />
      <Cue sound="error" at={FAIL} volume={0.6} />
      <Cue sound="deflate" at={FAIL + 4} volume={0.4} />
      <Cue sound="tap" at={RETRY - 4} volume={0.7} />
      <Cue sound="flick" at={APP} volume={0.5} />
      <Cue sound="tap" at={recAt(CUTS, APP, rec.at.tap)} volume={0.7} />
      <Cue sound="tap" at={recAt(CUTS, APP, rec.at.go)} volume={0.7} />
      <Cue sound="exhale" at={DONE} volume={0.9} />
      {[0, 4, 7].map((n) => <Cue key={n} sound="glass-tick" at={DONE + 48} volume={0.3} pitch={semitones(n)} />)}
      <Cue sound="flick" at={BACK} volume={0.5} />
      <Cue sound="tap" at={SEND - 4} volume={0.7} />
      <Cue sound="zip" at={SEND} volume={0.6} />
      <Cue sound="send" at={SENT} volume={0.5} />
      {REPLIES.map((f, i) => <Cue key={f} sound="pop" at={f} volume={0.5} pitch={semitones(i * 2)} />)}
      <Cue sound="chime" at={REPLIES[2]} volume={0.7} />
      <Cue sound="press-logo" at={CLAMP - sec(2)} />
    </>
  );
}
