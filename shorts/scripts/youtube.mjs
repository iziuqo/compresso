// Writes out/youtube.json: every Short's title and description in its
// languages, from the same numbers and photo credits the Shorts show, for
// the upload in YouTube Studio. The Press and Can you tell? episodes are one
// upload each in all seven languages (English first, the rest added as
// translations); each File too large. cut is one upload in its own language.
//
//   node scripts/youtube.mjs [--stores]     --stores once both stores list the app
import { bundle } from '@remotion/bundler';
import { getCompositions } from '@remotion/renderer';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { formatBytes, formatPercent } from '../../mobile/src/i18n/format.ts';
import { photos, root } from './shared.mjs';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const measured = read(join(root, 'src/measured.json'));
const listing = read(join(root, '../mobile/store/listing.json'));
const locales = readdirSync(join(root, 'locales')).map((f) => basename(f, '.json'));
const copy = Object.fromEntries(locales.map((l) => [l, read(join(root, 'locales', `${l}.json`)).youtube]));
const stores = process.argv.includes('--stores');
const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, k) => values[k]);

/** The description: the store's promotional line, where to get the app, and the photo credits. */
function describe(locale, shots) {
  const y = copy[locale];
  const credits = [...new Set(shots.map((s) => measured[s].photo))]
    .map((id) => fill(y.by, { ...photos[id], title: photos[id].commons.replace(/\.jpe?g$/i, '') }));
  const list = new Intl.ListFormat(locale, { type: 'conjunction' }).format(credits);
  return [listing[locale].promotionalText, stores ? y.stores : y.web, fill(credits.length > 1 ? y.credits : y.credit, { list })].join('\n\n');
}

/** Title and description of one composition in one language. */
function text(composition, locale) {
  const { id, props } = composition;
  const y = copy[locale];
  if (id.startsWith('the-press')) {
    const m = measured[props.shots[0]];
    return { title: fill(y.press, { from: formatBytes(locale, m.from), to: formatBytes(locale, m.to) }), description: describe(locale, props.shots) };
  }
  if (id.startsWith('can-you-tell')) {
    const m = measured[props.shot];
    return { title: fill(y.tell, { pct: formatPercent(locale, 1 - m.to / m.from) }), description: describe(locale, [props.shot]) };
  }
  return { title: y.tooLarge, description: describe(locale, ['too-large']) };
}

const serveUrl = await bundle({ entryPoint: join(root, 'src/index.ts') });
const options = { browserExecutable: process.env.REMOTION_BROWSER ?? null, chromiumOptions: { darkMode: true } };
const youtube = {};
for (const composition of await getCompositions(serveUrl, options)) {
  const languages = composition.props.locale ? [composition.props.locale] : ['en', ...locales.filter((l) => l !== 'en')];
  youtube[composition.id] = Object.fromEntries(languages.map((l) => [l, text(composition, l)]));
}
mkdirSync(join(root, 'out'), { recursive: true });
writeFileSync(join(root, 'out/youtube.json'), `${JSON.stringify(youtube, null, 2)}\n`);
console.log(Object.keys(youtube).join(' '));
