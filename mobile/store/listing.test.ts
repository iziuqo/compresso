import { describe, expect, it } from 'vitest';

import listing from './listing.json';

// The app's seven languages (src/i18n); importing that module would pull in Expo.
const LOCALE_LIST = ['en', 'es', 'fr', 'de', 'it', 'pt-BR', 'zh-Hans'];

/** Store limits, checked here so a copy edit can't fail at upload time. */
const LIMITS = { name: 30, appStoreName: 30, subtitle: 30, shortDescription: 80, promotionalText: 170, description: 4000, releaseNotes: 500 };
// Apple guideline 2.3.7: no other apps' names in metadata.
const BANNED = /whatsapp|imessage|instagram|facebook|telegram|微信/i;

describe.each(LOCALE_LIST)('store listing (%s)', (locale) => {
  const copy = (listing as Record<string, Record<string, unknown>>)[locale] as Record<string, string> & {
    screenshots: { headline: string; sub: string }[];
  };

  it('exists for every app language', () => expect(copy).toBeDefined());

  it.each(Object.entries(LIMITS))('%s fits its limit', (field, max) => {
    expect([...(copy[field] ?? '')].length).toBeLessThanOrEqual(max);
  });

  it('keywords fit in 100 bytes', () => expect(new TextEncoder().encode(copy.keywords).length).toBeLessThanOrEqual(100));

  it('names no other apps', () => {
    for (const field of ['name', 'appStoreName', 'subtitle', 'keywords', 'description', 'shortDescription', 'promotionalText']) {
      expect(copy[field] ?? '').not.toMatch(BANNED);
    }
  });

  it('has the same six screenshot captions as English', () => {
    expect(copy.screenshots.map((s) => (s as unknown as { screen: string }).screen))
      .toEqual(listing.en.screenshots.map((s) => s.screen));
  });
});
