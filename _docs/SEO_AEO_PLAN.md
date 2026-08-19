# Compresso SEO/AEO Growth Plan

**Status:** Implemented (Sprints 1–3) — 2026-08-19  
**Constraint:** Do not change existing UI (layout, components, visual design of `/`, `/docs/`, `/tool/`)  
**Goal:** Exponential product-led growth via SEO + AEO across all 7 product locales  
**Prepared by:** Consolidated audit from two SEO/AEO specialist advisors + codebase review

---

## Executive Summary

Compresso has **strong product differentiation** (privacy-by-architecture, HEIC-in-browser, never-bigger guarantee, 3.6 KB library) but **weak discoverability infrastructure**:

| Strength | Gap |
|---|---|
| Solid technical SEO foundation (sitemap, robots, OG, JSON-LD) | Only 3 indexable URLs on marketing domain |
| 7-language UI (client-side) | Crawlers see English-only HTML; no hreflang |
| Rich FAQ + comparison content in README | Zero FAQ/AEO content on indexable site |
| Dual PLG funnel (app + npm) | Domain split fragments link equity |
| Unique privacy/HEIC positioning | No programmatic landing pages for high-intent queries |

**Strategic bet:** Compresso wins by owning the intersection of *private · browser-native · HEIC · developer-embeddable* — a wedge no upload-based compressor (TinyPNG) or Mac-only tool (ImageOptim) or abandoned web tool (Squoosh) can copy.

**Growth model:**

```
Programmatic SEO (7 locales × intent pages)
        ↓
Free tool usage (izaias.xyz/compresso)
        ↓
PWA install · share · word-of-mouth
        ↓
Developer discovery (npm / docs / GitHub)
        ↓
Shipped integrations → backlinks + citations
        ↓
AEO citations (FAQ, HowTo, llms.txt, benchmarks)
        ↓
(loop compounds)
```

---

## Part 0 — Strategic Decisions (Must Resolve First)

These are **business/architecture choices** that block everything else. Approve before implementation.

### 0.1 Canonical Domain Architecture

**Current state (problematic):**

| Surface | URL | Role |
|---|---|---|
| Marketing + docs | `compresso.izaias.xyz` | Landing, API docs, legacy `/tool/` |
| Primary app | `izaias.xyz/compresso` | All CTAs point here |
| Legacy tool | `compresso.izaias.xyz/tool/` | In sitemap but canonical → external app |
| npm homepage | `compresso.izaias.xyz` | Package discovery |

**Recommended canonical model:**

| Entity | Canonical URL | Rationale |
|---|---|---|
| **Brand / marketing** | `compresso.izaias.xyz` | Dedicated product domain; npm homepage already points here |
| **Consumer app (tool queries)** | `izaias.xyz/compresso` | Already chosen as product home; PWA lives here |
| **Developer docs** | `compresso.izaias.xyz/docs/` | npm + GitHub link here |
| **Legacy `/tool/`** | `noindex, follow` + remove from sitemap | Stop duplicate signals; keep for bookmarks/PWA installs |

**Cross-domain linking rules:**
- Marketing CTAs → `izaias.xyz/compresso` (unchanged)
- App footer/header → link back to `compresso.izaias.xyz/docs/` and `/`
- `sameAs` schema connects both domains + GitHub + npm
- Sitemap on `compresso.izaias.xyz` includes app URL as external entry OR app deploys its own sitemap (see 0.2)

### 0.2 App-Side SEO (Separate Repo — `izaias-landing`)

The primary app at `izaias.xyz/compresso` is **not in this repo** but receives all tool-intent traffic. Implementation session must include (or coordinate):

- [ ] Dedicated `layout` metadata: title, description, OG tuned for *consumer* queries ("compress images online free", "private image compressor")
- [ ] `WebApplication` JSON-LD (not just `DeveloperApplication`)
- [ ] `robots.txt` + sitemap including app URL
- [ ] Locale routes mirroring marketing site (7 languages)
- [ ] PWA manifest `start_url` aligned with canonical
- [ ] Cross-link to docs/npm from app shell (footer — not a visual redesign, just links)

### 0.3 Locale URL Strategy (Required for All 7 Languages)

**Current:** Client-side i18n only; crawlers always see English.

**Recommended:** Static per-locale routes at build time (compatible with `output: 'export'`):

```
/en/          → English (default, or redirect / → /en/)
/es/          → Español
/fr/          → Français
/de/          → Deutsch
/it/          → Italiano
/pt-br/       → Português (Brazil)
/zh-hans/     → 简体中文
```

**Implementation pattern (no UI change to components):**
- Extract existing marketing components; wrap in locale layout that sets `lang`, `metadata`, and passes `t` dict
- `generateStaticParams()` for all 7 locales
- Root `/` → 301 redirect to `/en/` (or serve English with `x-default` hreflang)
- Wire existing `meta.*` keys from each locale JSON (already written, currently dead)
- Update stale "2.50 KB" → "3.6 KB" in all locale `meta.*` strings

**hreflang matrix (every indexable page):**

```html
<link rel="alternate" hreflang="en" href="https://compresso.izaias.xyz/en/" />
<link rel="alternate" hreflang="es" href="https://compresso.izaias.xyz/es/" />
<!-- ... all 7 ... -->
<link rel="alternate" hreflang="x-default" href="https://compresso.izaias.xyz/en/" />
```

Apply to: homepage, docs, FAQ, every programmatic page, app (cross-domain hreflang allowed).

---

## Part 1 — Phase 1: Foundation Fixes (Week 1 equivalent)

**Impact:** Stop bleeding crawl budget and duplicate signals. Low effort, high leverage.

### 1.1 Sitemap Consolidation

**File:** `website/src/app/sitemap.js`

| Action | Detail |
|---|---|
| Remove | `/tool/` (legacy duplicate) |
| Add | `https://izaias.xyz/compresso` (priority 1.0, weekly) |
| Add | All locale homepage URLs once routes exist |
| Fix | `lastModified` → git commit timestamp or build date, not `new Date()` |
| Add | New content URLs as they ship (FAQ, landing pages) |

### 1.2 Legacy `/tool/` De-indexation

**File:** `website/src/app/tool/layout.jsx`

```js
robots: { index: false, follow: true }
```

Keep page functional for bookmarks; stop competing with canonical app.

### 1.3 Manifest Alignment

**File:** `website/public/manifest.json`

- Consider whether PWA on marketing domain is still needed vs app domain
- If kept: update `start_url` to match canonical app OR keep `/tool/` but accept it's a legacy install path
- Add `screenshots[]` (1200×630 or platform-required sizes) — metadata only, no UI change

### 1.4 Metadata Hygiene

| File | Fix |
|---|---|
| `website/src/i18n/*.json` → `meta.*` | Update "2.50 KB" → "3.6 KB"; wire to locale layouts |
| `website/src/app/layout.jsx` | Add `Organization` + `WebSite` schema; add second `WebApplication` block for consumer app |
| `website/src/app/docs/layout.jsx` | Add `TechArticle` or `WebPage` with `about` entity |

### 1.5 Structured Data Expansion

**Root layout — add `@graph` with multiple entities:**

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "name": "Compresso",
      "url": "https://compresso.izaias.xyz",
      "logo": "https://compresso.izaias.xyz/logo.svg",
      "sameAs": ["https://github.com/iziuqo/compresso", "https://www.npmjs.com/package/compresso.js"]
    },
    {
      "@type": "WebSite",
      "name": "Compresso",
      "url": "https://compresso.izaias.xyz"
    },
    {
      "@type": "SoftwareApplication",
      "name": "compresso.js",
      "applicationCategory": "DeveloperApplication",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
    },
    {
      "@type": "WebApplication",
      "name": "Compresso Image Optimizer",
      "url": "https://izaias.xyz/compresso",
      "applicationCategory": "UtilitiesApplication",
      "browserRequirements": "Requires JavaScript",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
    }
  ]
}
```

### 1.6 llms.txt (AEO Foundation)

**New file:** `website/public/llms.txt`

Purpose: Guide AI crawlers (ChatGPT, Perplexity, Claude, Google AI) to authoritative sources.

```txt
# Compresso

> Free browser-native image optimizer and 3.6 KB JavaScript library.
> 100% client-side — images never leave the device until the user uploads them.

## Product
- Web app: https://izaias.xyz/compresso
- Marketing: https://compresso.izaias.xyz
- npm: https://www.npmjs.com/package/compresso.js
- GitHub: https://github.com/iziuqo/compresso

## Documentation
- API reference: https://compresso.izaias.xyz/docs/
- Quick start: https://compresso.izaias.xyz/docs/#quick-start
- Browser support: https://compresso.izaias.xyz/docs/#browser
- Why client-side: https://compresso.izaias.xyz/docs/#why-browser

## Key differentiators
- Zero server upload (privacy by architecture)
- HEIC/HEIF input in browser (unique among browser compressors)
- Never-bigger guarantee on lossy output
- 3.6 KB gzipped, zero required dependencies
- Web Worker parallel batching via compresso.js/pool

## FAQ
- https://compresso.izaias.xyz/faq/

## License
MIT — https://opensource.org/licenses/MIT
```

Also add `llms-full.txt` with expanded FAQ + comparison summary for deep-indexing bots.

---

## Part 2 — Phase 2: AEO Content Layer (Highest ROI)

**Impact:** Capture AI Overview citations and long-tail question queries. Content exists in README — port to indexable pages.

### 2.1 FAQ Page (`/faq/` × 7 locales)

**Source:** `README.md` §FAQ (7 questions)

| # | Question (EN) | AEO intent |
|---|---|---|
| 1 | How do I compress an image in the browser before uploading? | Developer + consumer |
| 2 | How do I convert HEIC to JPEG/WebP in JavaScript? | Unique HEIC wedge |
| 3 | Why did my compressed image get bigger than the original? | Trust / differentiation |
| 4 | Does it need a server or backend? | Architecture question |
| 5 | Does it work with React, Vue, and Next.js? | Framework PLG |
| 6 | How do I compress many images in parallel without blocking the UI? | Pool API |
| 7 | My site has a strict CSP — why does HEIC input fail? | Niche developer pain |

**Implementation:**
- New route: `website/src/app/[locale]/faq/page.jsx`
- `FAQPage` JSON-LD mirroring visible Q&A
- Translate all 7 Q&As into all 7 locales (professional translation or LLM-assisted with native review)
- Internal links: each answer links to relevant docs anchor + app CTA
- No change to existing page UI — new page only

**Schema example:**

```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I compress an image in the browser before uploading?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "..."
      }
    }
  ]
}
```

### 2.2 HowTo Schema (Embedded in FAQ + Docs)

Target queries:
- "how to compress image before upload javascript"
- "how to convert heic to jpeg in browser"
- "how to compress image under 2mb"

Add `HowTo` JSON-LD to relevant FAQ answers and docs quick-start section.

### 2.3 Comparison Page (`/compare/` × 7 locales)

**Source:** `README.md` §Comparison table + `_docs/PRODUCT_CONTEXT.md` §2

Named competitors (indexable, high-intent):
- compresso vs tinypng
- compresso vs squoosh
- compresso vs compressorjs
- compresso vs browser-image-compression
- compresso vs imageoptim

**Structure per page:**
- Factual comparison table (already verified in README)
- "When not to use Compresso" (sharp, Jimp, pica) — builds E-E-A-T
- CTA to app + npm

**Schema:** `WebPage` with `about` entities for each product compared.

### 2.4 Docs Restructuring (SEO, Not UI)

**Current:** Single long `/docs/` page — good for devs, weak for crawl depth.

**Recommended:** Split into indexable sub-pages (same prose, same styling — route split only):

| Route | Content source | Target keywords |
|---|---|---|
| `/docs/` | Overview + install | javascript image compressor |
| `/docs/api/` | API reference | compresso.js API |
| `/docs/quick-start/` | Quick start | compress image before upload |
| `/docs/formats/` | Formats + HEIC | heic to jpeg javascript |
| `/docs/workers/` | Pool/batch | web worker image compression |
| `/docs/frameworks/` | React/Vue/Next examples | react image compression before upload |
| `/docs/csp/` | CSP troubleshooting | csp wasm-unsafe-eval heic |
| `/docs/why-browser/` | Server vs client table | client-side vs server-side image compression |

**Note:** `#why-browser` section exists in docs but is missing from sidebar nav — add nav entry (navigation link only, not a visual redesign).

Each sub-page: own title, description, canonical, hreflang × 7, `BreadcrumbList` schema.

---

## Part 3 — Phase 3: Programmatic SEO (Exponential Lever)

**Impact:** This is the compounding engine. Template × locale × intent = hundreds of indexable URLs.

### 3.1 Landing Page Templates

Build **one reusable template** (reuse existing marketing CSS/components — Hero-like structure with intent-specific H1/copy). No changes to existing homepage UI.

#### Tier A — Ship first (highest volume + differentiation)

| Slug (EN) | Primary keyword cluster | Unique angle |
|---|---|---|
| `/compress-images-online-free/` | compress images online free | No upload, offline |
| `/compress-images-without-uploading/` | compress images without uploading | Privacy proof |
| `/private-image-compressor/` | private image compressor | 0 bytes uploaded |
| `/heic-to-jpeg/` | heic to jpeg, convert heic online | Browser-native HEIC |
| `/heic-to-webp/` | heic to webp | Same |
| `/compress-heic-online/` | compress heic online | Same |
| `/compress-image-under-2mb/` | compress image under 2mb | maxSizeMB feature |
| `/compress-image-for-email/` | compress image for email attachment | Use-case |
| `/offline-image-compressor/` | offline image compressor | PWA |
| `/batch-compress-images/` | batch compress images | Pool API |

#### Tier B — Developer PLG

| Slug | Keywords |
|---|---|
| `/compress-image-before-upload/` | compress image before upload |
| `/javascript-image-compressor/` | javascript image compressor |
| `/client-side-image-compression/` | client side image compression |
| `/react-image-compression/` | react image compression |
| `/nextjs-image-compression/` | nextjs compress before upload |
| `/web-worker-image-compression/` | web worker image compression |

#### Tier C — Competitor intercept

| Slug | Keywords |
|---|---|
| `/alternatives/tinypng/` | tinypng alternative |
| `/alternatives/squoosh/` | squoosh alternative |
| `/alternatives/imageoptim/` | imageoptim alternative free |
| `/alternatives/iloveimg/` | iloveimg alternative private |

#### Tier D — Vertical/use-case (long-tail, high conversion)

| Slug | Keywords |
|---|---|
| `/compress-image-for-passport-photo/` | passport photo size limit |
| `/compress-image-for-government-form/` | government portal upload limit |
| `/compress-image-for-discord/` | discord file size limit |
| `/compress-image-for-linkedin/` | linkedin image size |
| `/compress-png-without-losing-quality/` | compress png without losing quality |

### 3.2 Locale Expansion Formula

Every Tier A/B page × 7 locales = **70+ URLs** from first batch alone.

**URL pattern:**
```
/en/heic-to-jpeg/
/es/heic-a-jpeg/
/de/heic-zu-jpeg/
/pt-br/heic-para-jpeg/
/zh-hans/heic转jpeg/
```

**Content rules per locale:**
- H1, title, meta description, OG — fully translated
- Body: translated with locale-specific keyword research (not literal EN translation)
- CTA: same app URL; UTM `?utm_source=seo&utm_medium=landing&utm_campaign={slug}&utm_content={locale}`
- hreflang cluster on every page

### 3.3 Keyword Research by Locale

| Locale | Example high-volume queries | Notes |
|---|---|---|
| `en` | compress images online, heic to jpeg, image compressor no upload | Baseline |
| `es` | comprimir imagenes online, convertir heic a jpg, comprimir fotos gratis | es.json complete |
| `pt-BR` | comprimir imagens online, converter heic para jpg | pt-BR.json complete |
| `de` | bilder komprimieren online, heic in jpeg umwandeln | Partial translations |
| `fr` | compresser image en ligne, convertir heic en jpeg | Partial translations |
| `it` | comprimere immagini online, convertire heic in jpg | Partial translations |
| `zh-Hans` | 在线压缩图片, heic转jpg, 图片压缩工具 | Partial translations; huge mobile photo market |

**Action:** Before writing Tier A pages, run keyword volume validation per locale (Ahrefs, Semrush, or Google Keyword Planner). Prioritize locales with complete translations (es, pt-BR) first.

### 3.4 Programmatic Page Anatomy (Template)

Each page includes (no new UI components — content + metadata only):

1. **H1** — intent-matched, locale-specific
2. **Answer paragraph** — 2-3 sentences directly answering the query (AEO-first)
3. **Proof block** — reuse existing Proof component data (0 bytes, 3.6 KB)
4. **How it works** — 3-4 steps
5. **FAQ mini-section** — 2-3 page-specific questions + `FAQPage` schema
6. **CTA** — link to app
7. **Related pages** — internal links to 3-5 sibling intent pages
8. **Developer callout** — npm install snippet (PLG bridge)

---

## Part 4 — Phase 4: International SEO Completion

### 4.1 Translation Backlog

**Complete these sections in de, fr, it, zh-Hans** (currently fall back to English for unused sections, but new pages will need full coverage):

- All `meta.*` strings (update 3.6 KB claim)
- FAQ content (7 Q&As × 4 locales)
- Tier A landing pages (10 pages × 4 locales = 40 translations)
- Docs sub-pages (developer-facing; English may suffice initially, but consumer pages must be localized)

**Priority order:** es + pt-BR (already complete) → de + fr → zh-Hans → it

### 4.2 hreflang Implementation Checklist

For every indexable URL family (home, docs, faq, compare, each landing template):

- [ ] 7 `alternate` links + `x-default`
- [ ] Reciprocal (every page lists all siblings)
- [ ] Consistent locale slugs (`pt-br`, not `pt-BR` in URLs)
- [ ] Cross-domain hreflang for app pages (marketing locale ↔ app locale)

### 4.3 Technical i18n for Static Export

**Recommended architecture:**

```
website/src/app/
├── [locale]/
│   ├── layout.jsx          # sets lang, metadata from i18n meta.*
│   ├── page.jsx            # homepage (existing components)
│   ├── faq/page.jsx
│   ├── compare/page.jsx
│   └── [intent]/page.jsx   # programmatic pages
├── docs/
│   └── [locale]/...        # or docs with locale prefix
```

Use `generateStaticParams()` returning all locale codes. Pass dictionary via context or props. **Do not change component visuals** — only wire existing `t()` strings.

### 4.4 Future Locales (Not in Product Today)

Document as Phase 5 candidates (requires product i18n work first):
- `zh-Hant` (Traditional Chinese) — noted gap in `i18n/index.js`
- `ja` (Japanese) — large photo compression market
- `ko` (Korean) — same
- `ru`, `ar`, `hi` — evaluate by search volume vs effort

---

## Part 5 — Phase 5: Authority & PLG Compounding

### 5.1 Benchmarks Page (`/benchmarks/`)

**Source:** `benchmark/` directory, `packages/compresso/test/browser/benchmark.test.js`

Publish reproducible comparison data:
- Bundle size vs competitors (already in README)
- Compression ratio by corpus image type
- HEIC decode performance
- Worker pool throughput

**Why:** "Best browser image compressor" queries; AI citations love numeric data.

### 5.2 Research / E-E-A-T Page (`/research/`)

**Source:** `_articles/[Izaias] Cognitive Distance in Document Submission Systems.pdf`

- Summary of cognitive distance thesis
- Link to PDF
- `ScholarlyArticle` or `Article` schema with author entity
- Targets gov/enterprise/education vertical keywords

### 5.3 Examples Hub (`/examples/`)

**Source:** `examples/` folder (React, Vue, Svelte, Angular, Next.js, vanilla)

Index each framework example as its own page:
- `/examples/react/`
- `/examples/nextjs/`
- `/examples/vue/`
- etc.

Each page: code snippet + link to docs + npm install. Developer PLG funnel.

### 5.4 Changelog Page (`/changelog/`)

**Source:** `CHANGELOG.md`

Indexable version history — signals active maintenance (beats stale competitors like browser-image-compression 2023 release).

### 5.5 "Built with Compresso" Badge Program

- Provide embeddable SVG badge linking to compresso.izaias.xyz
- `/showcase/` page listing sites using compresso.js (manual curation initially)
- npm downloaders → submit PR to add themselves → backlinks

---

## Part 6 — Technical SEO Checklist

### 6.1 Crawl & Index

| Item | Action |
|---|---|
| robots.txt | Keep allow-all; add sitemap reference |
| Sitemap index | Split if >50 URLs: `sitemap.xml` → `sitemap-pages.xml`, `sitemap-docs.xml`, `sitemap-locales.xml` |
| Canonical tags | Every page self-canonical; legacy `/tool/` → noindex |
| Pagination | N/A initially |
| 404 page | Ensure branded 404 with links to home, app, docs |

### 6.2 Performance (CWV)

| Item | Current | Action |
|---|---|---|
| LCP | Hero AVIF optimized | Maintain; monitor after locale routes |
| CLS | width/height set | Maintain |
| INP | Client-heavy pages | Monitor; no UI change requested |
| Contentsquare script | In `<head>` | Evaluate deferral or self-host; privacy messaging alignment |
| PNG fallbacks | ~3.7 MB total | Optional: strip PNG fallbacks for bots via `picture` (advanced) |

### 6.3 Analytics & Measurement

| Tool | Status | Recommendation |
|---|---|---|
| Vercel Analytics | ✅ | Keep |
| Vercel Speed Insights | ✅ | Keep |
| Contentsquare | ✅ | Keep; consider privacy policy disclosure |
| Google Search Console | ❌ | **Add** — essential for index monitoring |
| Bing Webmaster Tools | ❌ | **Add** |
| IndexNow | ❌ | **Add** for faster indexing of new programmatic pages |
| Custom events | ❌ | Add `utm_*` tracking on all SEO CTAs; consider privacy-preserving click tracking on app handoff |

**KPIs to track:**
- Organic sessions by locale
- Impressions/clicks by page template
- App handoff rate (SEO landing → izaias.xyz/compresso)
- npm installs attributed to docs/examples traffic
- AI citation monitoring (manual: search Perplexity/ChatGPT for "best browser image compressor")

### 6.4 npm / GitHub SEO (Off-Site but Critical for PLG)

| Surface | Action |
|---|---|
| `packages/compresso/package.json` keywords | Already strong (28 terms); review quarterly |
| npm README | Ensure links point to locale-aware docs once available |
| GitHub README | Add links to on-site FAQ, compare, benchmarks (reduce GitHub-only SEO) |
| GitHub topics | `image-compression`, `heic`, `web-worker`, `privacy`, `pwa` |

---

## Part 7 — Content Moats (Hard to Copy)

These differentiate Compresso in SERPs and AI answers:

| Moat | Content expression |
|---|---|
| **Privacy verification** | "Open DevTools → Network → compress → 0 requests" guide |
| **Never-bigger guarantee** | Technical explainer (already in docs + FAQ) |
| **HEIC everywhere** | Only browser compressor with HEIC input — say it on every HEIC page |
| **Upload-failure economics** | Cognitive distance calculator (revive `impact` i18n as `/calculator/` — new page, not homepage UI change) |
| **Open benchmarks** | Reproducible data with links to run your own |
| **3.6 KB proof** | Bundlephobia link, live size badge |

---

## Part 8 — Implementation Roadmap

### Sprint 1 — Foundation (Do First)
1. Resolve domain/canonical decisions (Part 0)
2. Sitemap + `/tool/` noindex + manifest fixes (1.1–1.3)
3. Schema expansion + llms.txt (1.5–1.6)
4. Locale route architecture + wire `meta.*` (0.3, 4.3)
5. hreflang on homepage (7 URLs)

### Sprint 2 — AEO Quick Wins
1. FAQ page × 7 locales + FAQPage schema (2.1)
2. Comparison page × 7 locales (2.3)
3. Docs split into sub-pages (2.4)
4. Google Search Console + IndexNow setup (6.3)

### Sprint 3 — Programmatic Tier A
1. Landing page template
2. 10 Tier A pages × 7 locales = 70 URLs
3. Sitemap update
4. Internal linking mesh

### Sprint 4 — Programmatic Tier B/C + Authority
1. Developer + competitor pages
2. Benchmarks + research + examples hub (5.1–5.3)
3. Translation backlog for de/fr/it/zh-Hans

### Sprint 5 — App-Side + Compounding
1. Coordinate app repo SEO (0.2)
2. Cross-domain hreflang
3. Badge program + showcase
4. Tier D vertical pages
5. Evaluate ja/ko/zh-Hant expansion

---

## Part 9 — What We Explicitly Will NOT Do

Per user constraint and advisor consensus:

| Excluded | Reason |
|---|---|
| Change existing page UI/layout/visual design | User constraint |
| Re-embed playground on homepage | UI change; defer to future session |
| Add server-side rendering beyond static export | Architecture constraint; locale routes solve crawl issue |
| Add blog CMS | High maintenance; programmatic pages higher ROI |
| Buy backlinks or engage in black-hat SEO | PLG model requires earned links |
| Add Google Analytics (privacy conflict) | Use Search Console + Vercel Analytics instead |

---

## Part 10 — Success Metrics & Targets

### 90-Day Targets (Conservative)

| Metric | Target |
|---|---|
| Indexable URLs | 3 → 100+ |
| Locales with full hreflang | 0 → 7 |
| FAQ + HowTo rich results | 0 → eligible on all locales |
| Organic impressions (GSC) | Baseline → 10× |
| App handoffs from SEO | Track via UTM |

### 12-Month Vision (Exponential PLG)

| Metric | Target |
|---|---|
| Indexable URLs | 500+ (template expansion + verticals) |
| Organic traffic share | Primary acquisition channel |
| npm downloads from docs/examples | Measurable funnel |
| AI citations | Appear in top-3 answers for "browser image compressor", "heic to jpeg browser", "compress without uploading" |
| Locale traffic | ES + PT-BR + DE each >10% of organic |

---

## Appendix A — File Change Map (Implementation Reference)

| File / Area | Changes |
|---|---|
| `website/src/app/sitemap.js` | Expand URLs, fix lastModified |
| `website/src/app/robots.js` | Optional sitemap index reference |
| `website/src/app/layout.jsx` | Schema @graph; remove or defer Contentsquare if needed |
| `website/src/app/tool/layout.jsx` | Add noindex |
| `website/src/app/[locale]/` | **New** — locale routes |
| `website/src/app/faq/` | **New** — FAQ pages |
| `website/src/app/compare/` | **New** — comparison |
| `website/src/app/docs/` | Split into sub-routes |
| `website/public/llms.txt` | **New** |
| `website/public/llms-full.txt` | **New** |
| `website/src/i18n/*.json` | Update meta.* (3.6 KB), add faq/compare/landing keys |
| `website/public/manifest.json` | Screenshots, start_url review |
| `packages/compresso/package.json` | Review keywords quarterly |
| `README.md` | Point FAQ/compare links to on-site pages |
| App repo (`izaias-landing`) | Part 0.2 items |

## Appendix B — Advisor Sign-Off Criteria

Both SEO/AEO advisors agree this plan is ready for approval when:

- [x] All 7 product locales addressed
- [x] No existing UI changes required
- [x] Domain/canonical strategy documented
- [x] AEO layer (FAQ, HowTo, llms.txt, schema) specified
- [x] Programmatic SEO template strategy defined
- [x] PLG loop explicitly connected to SEO
- [x] Implementation phases prioritized
- [x] Success metrics defined
- [x] Exclusions documented

**Status: READY FOR APPROVAL**

---

*This plan was synthesized from dual SEO/AEO specialist audits of the `/workspace` codebase on 2026-08-19. Implementation should proceed in a separate session per owner approval.*
