import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { PixelRatio, useColorScheme } from 'react-native';

import type { Appearance } from '../state/prefs.types';

/**
 * The web app's darkroom tokens (website/compresso-app/src/design/tokens.css),
 * restated for a phone held at arm's length:
 *
 *   - The photograph is the only colour. Black, white and greys; one red for
 *     "this got bigger"; one white pill for the one action.
 *   - Type floors are higher than the web's: body 17, nothing under 13. The
 *     10px tracked label becomes 13. Every size scales with the system text
 *     size setting, and layouts grow instead of truncating.
 *   - Secondary text never drops under 7:1 on its ground (AAA); the faint
 *     greys exist only for hairlines.
 */

const dark = {
  void: '#000000',
  surface: '#111111',
  surface2: '#1C1C1C',
  ink: '#FFFFFF',
  ink2: '#A6A6A6', // 8.6:1 on black
  line: 'rgba(255,255,255,0.16)',
  line2: 'rgba(255,255,255,0.32)',
  alert: '#FF6369',
  pill: '#FFFFFF',
  pillInk: '#000000',
};

const light: typeof dark = {
  void: '#FFFFFF',
  surface: '#F3F3F3',
  surface2: '#E8E8E8',
  ink: '#000000',
  ink2: '#545454', // 7.5:1 on white
  line: 'rgba(0,0,0,0.14)',
  line2: 'rgba(0,0,0,0.30)',
  alert: '#C4262C',
  pill: '#000000',
  pillInk: '#FFFFFF',
};

type Colors = typeof dark;

export const font = {
  regular: 'Geist-Regular',
  medium: 'Geist-Medium',
  semibold: 'Geist-SemiBold',
  mono: 'GeistMono-Regular',
};

export const type = {
  label: 13,
  meta: 15,
  body: 17,
  lead: 20,
  title: 34,
  hero: 64,
};

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 };

/**
 * Text grows with the system text size up to this multiple, so a single word
 * can't outgrow the screen. Layouts that reserve room for text before it is
 * drawn use `fontScale()`, so they reserve exactly what the text will take.
 */
export const MAX_FONT_SCALE = 2;
export const fontScale = () => Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE);

/** Primary actions are 56pt tall, everything tappable at least 48. */
export const target = { min: 48, primary: 56 };

/** Same curves as motion.ts on the web: none can overshoot. No springs. */
export const motion = {
  micro: 120,
  standard: 240,
  entrance: 360,
  ceremony: 520,
  easeStandard: [0.32, 0.72, 0, 1] as const,
  easeEntrance: [0.16, 1, 0.3, 1] as const,
};

type Theme = { scheme: 'dark' | 'light'; c: Colors };
const ThemeContext = createContext<Theme>({ scheme: 'dark', c: dark });

export function ThemeProvider({ appearance, children }: { appearance: Appearance; children: ReactNode }) {
  const system = useColorScheme();
  const scheme = appearance === 'system' ? (system === 'light' ? 'light' : 'dark') : appearance;
  const value = useMemo<Theme>(() => ({ scheme, c: scheme === 'light' ? light : dark }), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
