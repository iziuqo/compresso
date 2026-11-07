import { APP_STORE_URL } from './links';

/** Every badge is drawn at the same height; widths follow each artwork's viewBox. */
const BADGE_HEIGHT = 48;

/**
 * The official store badges, unmodified, in the visitor's language. Apple ships
 * one artwork per language and its width changes with the wording, so each
 * locale records its own viewBox width: declaring the real size up front keeps
 * the row from shifting when the SVG arrives.
 *
 * Artwork: Apple's "Download on the App Store" black badges, from
 * https://tools.applemediaservices.com (files in /public/badges/app-store).
 * Apple's rules: never recolour, crop or redraw them; at least 40px tall on
 * screen; clear space of a quarter of the height on every side (the row's gap
 * and margin below provide it). Google Play joins this list once it is public.
 */
const STORES = [
  {
    id: 'app-store',
    href: APP_STORE_URL,
    label: (t) => t.stores.appStore,
    widths: { en: 119.66407, es: 119.66407, fr: 126.50751, de: 119.66407, it: 119.66407, 'pt-BR': 119.66407, 'zh-Hans': 108.85157 },
  },
];

export default function StoreBadges({ t, locale, loading = 'lazy' }) {
  return (
    <ul className="mk-stores">
      {STORES.map((store) => {
        const lang = store.widths[locale] ? locale : 'en';
        return (
          <li key={store.id}>
            <a className="mk-store" href={store.href} target="_blank" rel="noopener noreferrer">
              <img
                src={`/badges/${store.id}/${lang}.svg`}
                alt={store.label(t)}
                width={Math.round((store.widths[lang] * BADGE_HEIGHT) / 40)}
                height={BADGE_HEIGHT}
                loading={loading}
                decoding="async"
              />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
