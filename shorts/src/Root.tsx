import { Composition } from 'remotion';
import de from '../locales/de.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import it from '../locales/it.json';
import ptBR from '../locales/pt-BR.json';
import zhHans from '../locales/zh-Hans.json';
import { APP_STORE, AppStore } from './shorts/AppStore';
import { CanYouTell, TELL } from './shorts/CanYouTell';
import { DEADLINE, Deadline } from './shorts/Deadline';
import { FileTooLarge, TOO_LARGE } from './shorts/FileTooLarge';
import { GRANDMA, Grandma } from './shorts/Grandma';
import { ONE_BAR, OneBar } from './shorts/OneBar';
import { PRESS, ThePress } from './shorts/ThePress';
import { ONE_PRESS, OnePress, type OnePressProps } from './press/OnePress';
import { FPS, H, W } from './system';

const frame = { fps: FPS, width: W, height: H };
// The site's seven languages; scripts/measure.mjs films the app in each.
const LOCALES = { en, 'pt-BR': ptBR, es, fr, de, it, 'zh-Hans': zhHans };

// The episodes, by their results in photos.json.
const PRESSES = [['press-lake', 'press-milky-way'], ['press-jagged', 'press-reflect']] as const;
const TELLS = [
  { shot: 'tell-cat', focus: '50% 47%' },
  { shot: 'tell-couscous', focus: '33% 43%' },
  { shot: 'tell-edie', focus: '28% 56%' },
] as const;
// The third wave, one press: each Short's measured result, and what it plays against.
const ONE_PRESSES: (OnePressProps & { id: string })[] = [
  { id: 'the-limit', result: 'limit-lake', kind: 'slot', limit: 1e6 },
  { id: 'the-envelope', result: 'envelope', kind: 'envelope', limit: 5e6 },
  { id: 'the-bubble', result: 'bubble-cat', kind: 'bubble', limit: 4e5 },
  { id: 'the-one-bar', result: 'trip', kind: 'tube', limit: 4e5 },
  { id: 'can-you-tell', result: 'tell-fruit', kind: 'tell' },
  { id: 'airplane-mode', result: 'airplane-room', kind: 'dome' },
];

/**
 * The first wave. The Press and Can you tell? are wordless series, one
 * master per episode for every market. File too large. gets one cut per
 * language, from locales/. On the App Store announces the iPhone and iPad
 * app, in English. The second wave is the three stories after it; the
 * third is the one press, each gate Short a limit a photo must pass.
 */
export function Root() {
  return (
    <>
      {PRESSES.map((shots, i) => (
        <Composition key={i} id={`the-press-${i + 1}`} component={ThePress} durationInFrames={PRESS.duration} {...frame} defaultProps={{ shots }} />
      ))}
      {TELLS.map((episode, i) => (
        <Composition key={i} id={`can-you-tell-${i + 1}`} component={CanYouTell} durationInFrames={TELL.duration} {...frame} defaultProps={episode} />
      ))}
      {Object.entries(LOCALES).map(([locale, { tooLarge }]) => (
        <Composition key={locale} id={`file-too-large-${locale}`} component={FileTooLarge} durationInFrames={TOO_LARGE.duration} {...frame}
          defaultProps={{ copy: tooLarge, locale }} />
      ))}
      <Composition id="app-store-en" component={AppStore} durationInFrames={APP_STORE.duration} {...frame}
        defaultProps={{ shot: 'app-store-lofoten', card: en.appStore, locale: 'en' }} />
      <Composition id="the-2mb-limit" component={Deadline} durationInFrames={DEADLINE.duration} {...frame} />
      <Composition id="photos-for-grandma" component={Grandma} durationInFrames={GRANDMA.duration} {...frame} />
      <Composition id="one-bar" component={OneBar} durationInFrames={ONE_BAR.duration} {...frame} />
      {ONE_PRESSES.map(({ id, ...props }) => (
        <Composition key={id} id={id} component={OnePress} durationInFrames={ONE_PRESS.duration} {...frame} defaultProps={props} />
      ))}
    </>
  );
}
