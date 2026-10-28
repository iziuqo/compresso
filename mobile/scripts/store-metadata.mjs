// Builds the store metadata from store/listing.json, the one place the copy lives.
//
//   store.config.json            App Store, read by `eas metadata:push`
//   fastlane/metadata/android/*  Google Play, read by `fastlane supply` or pasted into Play Console
//
// Each of the seven app languages is published to every store locale that
// speaks it (see store-locales.mjs).
// Run: node scripts/store-metadata.mjs
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { APPLE, PLAY } from './store-locales.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const listing = JSON.parse(readFileSync(join(root, 'store/listing.json'), 'utf8'));
const site = 'https://compresso.izaias.xyz';
const slug = { en: 'en', es: 'es', fr: 'fr', de: 'de', it: 'it', 'pt-BR': 'pt-br', 'zh-Hans': 'zh-hans' };

const LIMITS = { name: 30, subtitle: 30, shortDescription: 80, promotionalText: 170, description: 4000, releaseNotes: 500 };
for (const [lang, copy] of Object.entries(listing)) {
  for (const [field, max] of Object.entries(LIMITS)) {
    if ([...copy[field]].length > max) throw new Error(`${lang}.${field} is over ${max} characters`);
  }
  if (Buffer.byteLength(copy.keywords) > 100) throw new Error(`${lang}.keywords is over 100 bytes`);
}

const info = {};
for (const [lang, locales] of Object.entries(APPLE)) {
  const c = listing[lang];
  for (const locale of locales) {
    info[locale] = {
      title: c.name,
      subtitle: c.subtitle,
      description: c.description,
      keywords: c.keywords.split(','),
      releaseNotes: c.releaseNotes,
      promoText: c.promotionalText,
      marketingUrl: `${site}/${slug[lang]}/`,
      supportUrl: 'https://github.com/iziuqo/compresso/issues',
      privacyPolicyUrl: `${site}/${slug[lang]}/privacy/`,
    };
  }
}

const config = {
  configVersion: 0,
  apple: {
    categories: ['PHOTO_AND_VIDEO', 'UTILITIES'],
    info,
    advisory: {
      alcoholTobaccoOrDrugUseOrReferences: 'NONE',
      contests: 'NONE',
      gamblingSimulated: 'NONE',
      horrorOrFearThemes: 'NONE',
      matureOrSuggestiveThemes: 'NONE',
      medicalOrTreatmentInformation: 'NONE',
      profanityOrCrudeHumor: 'NONE',
      sexualContentGraphicAndNudity: 'NONE',
      sexualContentOrNudity: 'NONE',
      violenceCartoonOrFantasy: 'NONE',
      violenceRealistic: 'NONE',
      violenceRealisticProlongedGraphicOrSadistic: 'NONE',
      gambling: false,
      unrestrictedWebAccess: false,
      seventeenPlus: false,
    },
    review: {
      demoRequired: false,
      notes: [
        'Compresso needs no account or sign-in.',
        'To test: tap Choose photos, pick any photos, choose a purpose such as Message, then tap Make them lighter. Save all to Photos adds the smaller copies to the library.',
        'Photos are chosen with the system photo picker, so the app never asks for library read access. Saving asks for add-only access (NSPhotoLibraryAddUsageDescription).',
        'All processing happens on the device. The app makes no network requests and collects no data.',
      ].join('\n\n'),
    },
  },
};
writeFileSync(join(root, 'store.config.json'), `${JSON.stringify(config, null, 2)}\n`);

const play = join(root, 'fastlane/metadata/android');
rmSync(play, { recursive: true, force: true });
for (const [lang, locales] of Object.entries(PLAY)) {
  const c = listing[lang];
  for (const locale of locales) {
    const dir = join(play, locale);
    mkdirSync(join(dir, 'changelogs'), { recursive: true });
    writeFileSync(join(dir, 'title.txt'), `${c.name}\n`);
    writeFileSync(join(dir, 'short_description.txt'), `${c.shortDescription}\n`);
    writeFileSync(join(dir, 'full_description.txt'), `${c.description}\n`);
    writeFileSync(join(dir, 'changelogs', '1.txt'), `${c.releaseNotes}\n`);
  }
}

console.log(`App Store: ${Object.keys(info).length} locales. Google Play: ${Object.values(PLAY).flat().length} locales.`);
