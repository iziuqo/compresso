# App-Side SEO — `izaias.xyz/compresso`

The consumer app is **vendored in this monorepo** at `website/compresso-app/`.  
Source of truth lives here; CI mirrors to `iziuqo/compresso-app` on every merge to `main`.

## Automated pipeline (no manual patch)

On push to `main` (paths under `website/compresso-app/`):

1. **Build** — `npm run build:app` (Vite + SEO locale shells + sitemap + robots)
2. **IndexNow** — pings Bing/Yandex for all `izaias.xyz/compresso/*` URLs (postbuild)
3. **Mirror** — `scripts/sync-compresso-app-repo.mjs` → `iziuqo/compresso-app` (if secret set)
4. **Deploy** — Vercel prod deploy of `website/compresso-app` (if secrets set)

Workflow: `.github/workflows/compresso-app.yml`

## One-time GitHub secrets (enables full automation)

Add in **compresso** repo → Settings → Secrets → Actions:

| Secret | Purpose |
|---|---|
| `COMPRESSO_APP_DEPLOY_TOKEN` | PAT with `contents:write` on `iziuqo/compresso-app` — mirrors source on every main merge |
| `VERCEL_TOKEN` | Vercel deploy token |
| `VERCEL_ORG_ID` | Vercel team/user id |
| `VERCEL_PROJECT_ID_COMPRESSO_APP` | Vercel project id for the app (serves `izaias.xyz/compresso`) |

After secrets are set, merging to `main` builds, syncs, deploys, and pings IndexNow with zero manual steps.

## Local development

```bash
npm run build:app          # from monorepo root
cd website/compresso-app && npm run dev
```

## What ships in the build

| Item | URL |
|---|---|
| App (en) | `https://izaias.xyz/compresso/` |
| Locale routes | `/compresso/es/`, `/compresso/fr/`, … |
| Sitemap | `https://izaias.xyz/compresso/sitemap.xml` |
| robots.txt | `https://izaias.xyz/compresso/robots.txt` |
| IndexNow key | `https://izaias.xyz/compresso/339cfae15c2d4a1fb8e9076521bc8f8a.txt` |

## SEO features

- Consumer-focused meta / OG / Twitter in all 7 locales
- `WebApplication` JSON-LD
- hreflang across app locale URLs
- Footer links → docs, FAQ, npm on `compresso.izaias.xyz`
- Path-based locale URLs synced on language switch

## GSC / Bing (optional one-time)

IndexNow runs automatically after each app deploy. For Google Search Console:

1. Add URL-prefix property `https://izaias.xyz/compresso/` (if not already)
2. Submit sitemap: `https://izaias.xyz/compresso/sitemap.xml`

No env vars required if domain is already verified at path level.
