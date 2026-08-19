# Compresso SEO — Manual Steps Only

Everything else from the SEO/AEO plan is implemented in code or deploys automatically.
**Only these steps require you** (accounts, credentials, or a separate repository).

---

## 1. Google Search Console (~10 min)

**Why manual:** Google must verify you own the domain. We added build-time support; you supply the token.

1. [search.google.com/search-console](https://search.google.com/search-console) → add property `https://compresso.izaias.xyz`
2. Choose **HTML tag** verification → copy the `content="..."` value
3. Vercel → Project → **Settings → Environment Variables**
   - Name: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
   - Value: (paste the content value only, not the full meta tag)
   - Apply to Production → **Redeploy**
4. Click **Verify** in GSC
5. **Sitemaps** → submit `https://compresso.izaias.xyz/sitemap.xml`
6. **URL inspection** → request indexing for `/en/faq/`, `/en/heic-to-jpeg/`, `/en/compare/`

---

## 2. Bing Webmaster Tools (~5 min)

**Why manual:** Bing account + click Verify.

1. [bing.com/webmasters](https://www.bing.com/webmasters) → add site
2. Verification file is already deployed: `https://compresso.izaias.xyz/BingSiteAuth.xml`
3. Click **Verify**
4. Submit sitemap: `https://compresso.izaias.xyz/sitemap.xml`
5. Optional: enable **IndexNow** in Bing UI (key file already at `https://compresso.izaias.xyz/339cfae15c2d4a1fb8e9076521bc8f8a.txt`)

IndexNow runs **automatically on every Vercel deploy** via `npm postbuild`. Manual re-ping (optional):

```bash
cd website && npm run ping:indexnow
```

---

## 3. App domain SEO — `compresso.izaias.xyz/compresso`

**Status: automated.** App builds and deploys with every Vercel push to `main`.

See `_docs/COMPRESSO_APP_SEO.md`. IndexNow pings run on every deploy.

**Optional:** Submit `https://compresso.izaias.xyz/compresso/sitemap.xml` in GSC (same property as marketing site).

---

## 4. GitHub repository topics (~2 min)

**Why manual:** GitHub has no repo file for topics.

Repo → **Settings → General → Topics** → add:
`image-compression`, `heic`, `web-worker`, `privacy`, `pwa`, `javascript`, `browser-extension`

---

## 5. Native translation review (optional, ongoing)

**Why manual:** Quality judgment.

Have native speakers skim `/es/`, `/pt-br/`, `/de/` FAQ and top landing pages. Edit `website/src/content/*.js` if copy needs fixing.

---

## 6. Keyword validation (optional)

**Why manual:** Requires Ahrefs / Semrush / Keyword Planner subscriptions.

Validate volume for locale-specific titles in `landing-pages.js` and adjust meta titles if data contradicts assumptions.

---

## 7. Monitoring (ongoing, ~15 min/week)

**Why manual:** No free API for “are we cited in ChatGPT?”

| Task | Where |
|---|---|
| Index coverage, hreflang errors | Google Search Console |
| Impressions by page | GSC Performance |
| Traffic by locale | Vercel Analytics |
| AEO spot-check | Ask Perplexity/ChatGPT: “best browser image compressor no upload” |

---

## 8. Community & backlinks (ongoing)

**Why manual:** Human outreach, not code.

- Product Hunt, HN, dev blogs
- “Built with Compresso” showcase (curate submissions)
- Encourage npm users to link back

---

## Already done in code (no action needed)

| Item | Status |
|---|---|
| 98+ locale URLs, hreflang, schema | ✅ |
| FAQ, compare, examples, privacy pages | ✅ |
| Tier A + B + C landing pages | ✅ |
| `llms.txt`, `llms-full.txt` | ✅ |
| BingSiteAuth.xml | ✅ |
| IndexNow key file + ping script | ✅ |
| Sitemap, tool noindex, manifest | ✅ |
| README + npm README site links | ✅ |
| Footer internal links (FAQ, compare, examples) | ✅ |
| HowTo schema on FAQ | ✅ |
| IndexNow auto on deploy (postbuild) | ✅ |
| App-side SEO (vendored in monorepo + CI) | ✅ |
