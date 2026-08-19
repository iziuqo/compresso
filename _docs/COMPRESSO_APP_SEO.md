# App-Side SEO — `compresso.izaias.xyz/compresso`

The consumer app is vendored at `website/compresso-app/` and **deploys automatically** with every marketing-site Vercel build.

## Pipeline (fully automatic)

1. `vercel.json` runs `npm run build:app` then `website` build
2. `embed-app-in-out.mjs` copies `dist/compresso` → `website/out/compresso`
3. App postbuild: locale SEO shells, sitemap, robots, IndexNow ping
4. Marketing postbuild: IndexNow for `compresso.izaias.xyz` URLs

No separate repo push required.

## Live URLs

| Resource | URL |
|---|---|
| App (en) | https://compresso.izaias.xyz/compresso/ |
| Locales | `/compresso/es/`, `/compresso/fr/`, … |
| Sitemap | https://compresso.izaias.xyz/compresso/sitemap.xml |
| robots.txt | https://compresso.izaias.xyz/compresso/robots.txt |

## Optional: mirror to `iziuqo/compresso-app`

GitHub Action `.github/workflows/compresso-app.yml` can mirror to the standalone repo and deploy to `izaias.xyz/compresso` when these secrets are set:

- `COMPRESSO_APP_DEPLOY_TOKEN`
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_COMPRESSO_APP`

## Local dev

```bash
npm run build:app
cd website/compresso-app && npm run dev
```
