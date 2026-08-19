# App-Side SEO — `izaias.xyz/compresso`

Implementation lives in the **`iziuqo/compresso-app`** repository (not this monorepo).

## Status

A complete app-side SEO implementation is ready on branch `cursor/app-side-seo-3795` in `compresso-app`. Apply it via the patch in this repo or merge the branch after pushing from a machine with write access to `compresso-app`.

## Apply the patch

```bash
git clone https://github.com/iziuqo/compresso-app.git
cd compresso-app
git apply /path/to/compresso/_docs/patches/0001-Add-app-side-SEO-for-izaias.xyz-compresso.patch
npm ci && npm run build
git checkout -b cursor/app-side-seo-3795
git add -A && git commit -m "Add app-side SEO for izaias.xyz/compresso"
git push -u origin cursor/app-side-seo-3795
```

Then merge and deploy (Vercel / `izaias-landing` per `_docs/PWA_PLAN.md` §15.2).

## What it adds

| Item | Detail |
|---|---|
| Consumer meta | Title, description, OG, Twitter — tuned for tool queries in all 7 locales |
| `WebApplication` JSON-LD | Static in build output + live updates on language switch |
| Locale URLs | `/compresso/` (en), `/compresso/es/`, … `/compresso/zh-hans/` |
| hreflang | 7 app locale alternates + `x-default` in each static HTML shell |
| `sitemap.xml` | 7 URLs at `https://izaias.xyz/compresso/sitemap.xml` |
| `robots.txt` | At `https://izaias.xyz/compresso/robots.txt` |
| Footer links | Docs, FAQ (locale-aware), npm — in status bar |
| Post-build | `npm run postbuild` → `scripts/generate-seo.mjs` on every deploy |

PWA `start_url` remains `/compresso` (unchanged, already canonical).

## After deploy — manual (~10 min)

1. **Google Search Console** — add URL-prefix property `https://izaias.xyz/compresso/`
2. Submit sitemap: `https://izaias.xyz/compresso/sitemap.xml`
3. **Bing Webmaster Tools** — add the same path prefix and submit the sitemap
4. **URL inspection** — request indexing for `/compresso/` and `/compresso/es/`

IndexNow for the marketing domain (`compresso.izaias.xyz`) does **not** include external `izaias.xyz` URLs (422 from Bing). App URLs need their own GSC/Bing property.

## Files touched (compresso-app)

- `scripts/generate-seo.mjs` — post-build locale HTML, sitemap, robots
- `src/seo/*` — constants, document meta, locale paths, footer links
- `src/i18n/locales/*.json` — `meta.*` and `footer.*` keys
- `src/i18n/index.tsx` — path locale + live meta sync
- `src/ui/Chrome.tsx` — footer cross-links
- `index.html`, `public/robots.txt`, `vercel.json`, `package.json`
