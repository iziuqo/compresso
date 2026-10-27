import { describe, expect, it } from 'vitest';

import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it_ from './locales/it.json';
import ptBR from './locales/pt-BR.json';
import zhHans from './locales/zh-Hans.json';

const others = { de, es, fr, it: it_, 'pt-BR': ptBR, 'zh-Hans': zhHans } as Record<string, Record<string, string>>;
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

// A missing key would silently render in English; a missing {placeholder}
// would show a raw number with no words around it. Both fail the build.
describe.each(Object.entries(others))('%s', (_, dict) => {
  it('has exactly the English keys', () => {
    expect(Object.keys(dict).sort()).toEqual(Object.keys(en).sort());
  });
  it('keeps every placeholder', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(placeholders(dict[key] ?? ''), key).toBe(placeholders(value));
    }
  });
});
