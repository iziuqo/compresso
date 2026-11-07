import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { Ground } from '../parts';
import { below, Name, Plates, pressGap } from '../Plates';
import { Cue, semitones } from '../sound';
import { H, px, sec } from '../system';
import { Groove, Press, PRESS, PressScore, type Shot } from './ThePress';

/**
 * On the App Store, 10.5 s, loops; English. One press, as in The Press: a
 * heavy photo, the clamp, the same photo at a tenth of the size. Then the
 * plates come down once more and close on the news: the name, the devices,
 * and Apple's badge.
 *
 * The card follows Apple's App Store marketing guidelines: the official
 * black badge (website/public/badges/app-store/), unmodified and still,
 * smaller than the icon, with a quarter of its height clear all round; the
 * app named "for iPhone and iPad"; Apple's credit lines at the end.
 */
export const APP_STORE = { duration: sec(10.5), lead: PRESS.lead };

export type Card = { devices: string; legal: string };

const AGAIN = sec(6); //  the size leaves and the plates come down again over the light photo
const CARD = sec(8); //   and close on the card, held to the loop's cut
const TOP = H * 0.38; //  the card's icon sits high, so all of it clears YouTube's captions
const BADGE = px(84);

/** The closed icon and, under it, what to get and where. Everything cuts in on the hit; nothing on the card moves. */
function CardFace({ devices, legal, locale }: Card & { locale: string }) {
  return (
    <Ground lang={locale}>
      <Plates gap={40} y={TOP} />
      <Name y={TOP} />
      <AbsoluteFill style={{ top: below(TOP) + px(130), alignItems: 'center' }}>
        <div style={{ fontSize: px(40), color: 'var(--ink-2)', letterSpacing: '-0.01em' }}>{devices}</div>
        <Img src={staticFile(`badges/app-store-${locale}.svg`)} style={{ height: BADGE, marginTop: px(64) }} />
        <div style={{ marginTop: px(72), width: px(840), textAlign: 'center', textWrap: 'balance', fontSize: px(18), lineHeight: 1.45, color: 'var(--ink-3)' }}>{legal}</div>
      </AbsoluteFill>
    </Ground>
  );
}

export function AppStore({ shot, card, locale }: { shot: Shot; card: Card; locale: string }) {
  const t = (useCurrentFrame() + APP_STORE.lead) % APP_STORE.duration;
  // The press starts on the photo's cut; once more at the end, so the sound loops too.
  const [first, loop] = [0, APP_STORE.duration].map((s) => s - APP_STORE.lead);
  return (
    <>
      {t < CARD ? (
        <>
          <Press shot={shot} wordmark t={t} until={AGAIN} />
          {t >= AGAIN && <Plates gap={pressGap(t - AGAIN, CARD - AGAIN)} y={TOP} />}
        </>
      ) : <CardFace {...card} locale={locale} />}
      {[first, loop].map((s) => <PressScore key={s} shot={shot} s={s} />)}
      {/* The second press lands a major chord in glass, then the groove carries the card into the loop. */}
      <Cue sound="press-logo" at={first + AGAIN} />
      {[0, 4, 7].map((n) => <Cue key={n} sound="glass-tick" at={first + CARD} volume={0.3} pitch={semitones(n)} />)}
      <Groove from={first + CARD + sec(0.5)} to={loop} />
    </>
  );
}
