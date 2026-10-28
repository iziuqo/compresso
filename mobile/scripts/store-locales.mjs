// Which store locales each of the seven app languages is published to, so
// Mexico, Canada, Portugal and the rest get a native listing too. Shared by
// store-metadata.mjs (writes the files) and play-publish.mjs (pushes them).

export const APPLE = {
  en: ['en-US', 'en-GB', 'en-AU', 'en-CA'],
  es: ['es-ES', 'es-MX'],
  fr: ['fr-FR', 'fr-CA'],
  de: ['de-DE'],
  it: ['it'],
  'pt-BR': ['pt-BR', 'pt-PT'],
  'zh-Hans': ['zh-Hans'],
};

export const PLAY = {
  en: ['en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN', 'en-SG', 'en-ZA'],
  es: ['es-ES', 'es-419', 'es-US'],
  fr: ['fr-FR', 'fr-CA'],
  de: ['de-DE'],
  it: ['it-IT'],
  'pt-BR': ['pt-BR', 'pt-PT'],
  'zh-Hans': ['zh-CN'],
};
