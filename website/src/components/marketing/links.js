/** The app is the product now. Every primary action points here. */
export const APP_URL = 'https://compresso.izaias.xyz/compresso';
export const GITHUB_URL = 'https://github.com/iziuqo/compresso';
export const NPM_URL = 'https://www.npmjs.com/package/compresso.js';

/** The iPhone app. Apple redirects this to the visitor's own storefront. */
export const APP_STORE_URL = 'https://apps.apple.com/app/id6829326032';

/**
 * The Google Apps Script web app that stores an early-access signup and emails
 * the invite (website/early-access/). Set in Vercel; public by nature, since
 * the browser posts to it directly.
 */
export const EARLY_ACCESS_URL = process.env.NEXT_PUBLIC_EARLY_ACCESS_URL;
