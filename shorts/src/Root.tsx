import { Composition } from 'remotion';
import en from '../locales/en.json';
import { CanYouTell, TELL } from './shorts/CanYouTell';
import { FileTooLarge, TOO_LARGE } from './shorts/FileTooLarge';
import { PRESS, ThePress } from './shorts/ThePress';
import { FPS, H, W } from './system';

const frame = { fps: FPS, width: W, height: H };

/**
 * The first wave. The Press and Can you tell? are wordless, one master for
 * every market. File too large. gets one cut per language, from locales/.
 */
export function Root() {
  return (
    <>
      <Composition id="the-press" component={ThePress} durationInFrames={PRESS.duration} {...frame} />
      <Composition id="can-you-tell" component={CanYouTell} durationInFrames={TELL.duration} {...frame} />
      <Composition id="file-too-large-en" component={FileTooLarge} durationInFrames={TOO_LARGE.duration} {...frame}
        defaultProps={{ copy: en.tooLarge, locale: 'en' }} />
    </>
  );
}
