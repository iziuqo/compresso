# M8 — Tailwind CSS v4 migration (marketing website)

**Status:** done, 2026-08-04. Implemented in the very next session per the handoff
below. Pushed directly to PR #13's branch (it wasn't stale — 0 commits behind main,
no conflicts — so updating in place kept izaias's existing approval rather than
opening a fresh PR). All 8 CI checks green, including `website` (the one that was
actually failing). PR **not yet merged** — implementation + verification only, merge
is a separate step. See `_docs/M9_DOCS_UPDATE.md` for the doc-hygiene follow-up this
session's context feeds into.

The `@config` bridge recommendation below (§2) held up exactly as expected — zero
changes to `tailwind.config.js`. One thing this doc did *not* anticipate, found only
by actually running the build: Tailwind v4's `@apply` stopped resolving custom
`@layer components` classes referenced from other classes (only real utilities or
`@utility`-registered ones). Fixed by promoting the 8 affected base classes
(`band-dark`, `band-light`, `band-soft`, `section-block`, `btn`, `btn-primary-dark`,
`btn-secondary`, `btn-outline`) to `@utility` blocks — every call site was unchanged.
Worth expecting on any v3→v4 migration using that "shared base class" pattern.

Original scoping below, kept as-written for the historical record of what was known
*before* implementation — the outcome notes above are what actually happened.

---

**Status (original, pre-implementation):** scoped, not started. Written 2026-08-04, in
the same session that found and reverted the break this exists to eventually resolve
properly. Handed off per this project's explore-then-implement workflow: this doc is
the context a fresh session needs to implement directly, at high reasoning effort,
without re-deriving what's below from scratch.

**Not part of the M0–M7 worker-backend track** (`LIB_V1_WORKERS_PLAN.md`). Different
subsystem entirely — this is the marketing website's build tooling
(`website/`), not the `compresso.js` library. "M8" is just this project's
continuing the same milestone-numbering habit for a new, unrelated piece of work.

---

## 0. Why this exists

A Dependabot grouped update (`c69b8f3`, "Bump the npm-dependencies group with 8
updates") bumped `tailwindcss` 3.4.19→4.3.3 bundled together with two other
majors (`next` 14.2.35→16.2.12, `react`/`react-dom` 18.3.1→19.2.8) and
`@rollup/plugin-terser` 0.4.4→1.0.0, all in one ungoverned commit, be cause
`.github/dependabot.yml` grouped `patterns: ['*']` with no `update-types` filter.
It merged straight to `main` with no individual review and broke the `website`
CI job and Vercel deploys outright — nothing in the codebase was updated for
Tailwind v4's actual breaking change (its PostCSS integration moved to a
separate `@tailwindcss/postcss` package; `website/postcss.config.mjs` was still
using the v3 pattern of `tailwindcss` as a direct PostCSS plugin).

That commit was reverted whole ([PR #11](https://github.com/iziuqo/compresso/pull/11),
merged) to restore a working `main`, and `dependabot.yml` was fixed alongside it
to stop grouping majors with minor/patch bumps. That fix is already working:
the same four majors now each have their own individual PR instead of hiding in
a group — **#13** (tailwindcss 3.4.19→4.3.3), **#14** (`@rollup/plugin-terser`
0.4.4→1.0.0), **#15** (react 18.3.1→19.2.8), **#16** (next 14.2.35→16.2.12).
\#13 already has an approval from izaias, but is blocked by real merge conflicts
against `main` (its branch predates the revert) and — conflicts aside — would
still fail the `website` CI job for the exact same reason as before, because
none of the migration work below has happened yet.

**This doc scopes #13 specifically** — the Tailwind v4 migration. #14/#15/#16
(terser, React 19, Next 16) are explicitly **out of scope** here; see §7.

## 1. Current state, verified this session

- `website/package.json`: `"tailwindcss": "^3.4.0"` (post-revert; PR #13 wants `^4.3.3`).
- `website/postcss.config.mjs`:
  ```js
  const config = {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  };
  export default config;
  ```
- `website/src/app/globals.css` opens with the classic v3 three-directive form:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```
- `website/tailwind.config.js` — real, substantial custom theming, all under
  `theme.extend`: `colors` (`cobalt`, `canvas`, `cream`, `lavender`, `plum`,
  `brand`, `ink`, `line` — each a small palette of shades), `fontFamily`
  (`sans`/`display`/`mono`, each referencing CSS custom properties set by
  `next/font`), `fontSize` (`hero`, `hero-lead`, `section-title`, `stat` — each
  a `clamp()` value paired with `lineHeight`/`letterSpacing`/`fontWeight`),
  `maxWidth` (`site`/`demo`/`narrow`), `boxShadow` (5 named shadows),
  `borderRadius` (5 named radii), `spacing` (`band`/`section`). Plus
  `content: ['./src/**/*.{js,jsx,mdx}']` and one plugin:
  `require('@tailwindcss/typography')`.
- `@tailwindcss/typography` (`^0.5.0`) is **actually used**, not dead weight —
  real `.prose`-class usage in `website/src/app/globals.css` and
  `website/src/app/docs/page.jsx` (the docs page's content wrapper). Any
  migration path must keep it working.
- **Two parallel styling systems coexist on this site**, and this migration's
  blast radius differs between them:
  - The `tailwind.config.js` token system above — used by `globals.css` and,
    per the typography-plugin hit, the `/docs` page. This is what actually
    needs migrating.
  - `website/src/app/marketing.css` — the newer homepage-specific system, its
    own hand-rolled CSS custom properties (`--void`, `--surface`, `--ink`,
    etc.), explicitly documented in its own header comment as "true black,
    white ink, and no accent colour anywhere," deliberately **not** using
    Tailwind's theme tokens. It likely still consumes Tailwind's plain
    utility classes (`flex`, `grid`, `hover:`, breakpoints) via the same
    `@tailwind`/`@import` pipeline, but none of the custom `theme.extend`
    tokens above apply to it. Don't assume marketing.css needs the same
    verification depth as globals.css — it wasn't built against those tokens
    in the first place.
- The `website` CI job (`.github/workflows/ci.yml`) pins a single Node version
  (22, not matrixed) — no Node-version-compatibility axis to worry about here,
  unlike the library's build matrix.
- The real error hit in CI, verbatim (from PR #10 and #11's `website` job logs
  before the revert):
  ```
  Error: It looks like you're trying to use `tailwindcss` directly as a
  PostCSS plugin. The PostCSS plugin has moved to a separate package, so to
  continue using Tailwind CSS with PostCSS you'll need to install
  `@tailwindcss/postcss` and update your PostCSS configuration.
  ```

## 2. What the migration actually requires

**Mechanical, not in question:**
1. `npm install -D @tailwindcss/postcss -w website` (or add directly to
   `website/package.json`'s devDependencies).
2. `website/postcss.config.mjs`: replace `tailwindcss: {}` with
   `'@tailwindcss/postcss': {}`.
3. `website/src/app/globals.css`: replace the three `@tailwind` directives
   with `@import "tailwindcss";`.
4. Re-bump `website/package.json`'s `tailwindcss` to `^4.3.3` (or whatever
   PR #13's target/current-latest is by the time this is implemented —
   check `npm view tailwindcss version` fresh, don't assume 4.3.3 is still
   current).

**The real judgment call — how to carry `tailwind.config.js`'s tokens forward:**

Tailwind v4's primary configuration model moved from the JS `tailwind.config.js`
+ `theme.extend` pattern to CSS-first `@theme` blocks declared directly in your
CSS entry point. Given the size of this project's custom theme (listed in full
in §1 — 8 color groups, 4 custom font sizes with clamp() math, custom spacing/
radius/shadow scales), a full hand-rewrite into `@theme` syntax is real,
error-prone work with a lot of surface area for a subtle mistake (a dropped
shade, a mistyped clamp value) to slip through unnoticed until someone spots
a visual regression days later.

Tailwind v4 ships a documented backward-compatibility path for exactly this
situation — a `@config "../../tailwind.config.js";` directive that lets v4
keep reading the existing JS config file as-is, unchanged, while still getting
v4's new engine/PostCSS plugin/performance. **Recommended default: use the
`@config` bridge, don't hand-rewrite the token file.** It's a smaller, safer
diff, and this project's actual problem (Dependabot silently broke the build)
was never "we need v4's new authoring model," it was "the PostCSS plugin
package changed." Only fall back to a full `@theme` rewrite if `@config` turns
out to be deprecated/removed by whatever v4.x is current at implementation
time (verify first — see §5).

**Needs live verification against whatever Tailwind version is actually current
at implementation time (this plan's knowledge of v4's exact API may be stale by
then — v4 was a fast-moving major at time of writing):**
- Is `@tailwindcss/typography@^0.5.0` (the version already pinned) v4-compatible
  as-is, or does it need its own bump? Check its own changelog/peerDependencies.
- Does the `@config` compatibility directive still exist and work the same way
  in whatever 4.x version this lands on, or has it been removed/changed?
- Does `autoprefixer` still need to run alongside Tailwind v4, or does v4's
  built-in Lightning CSS layer make it redundant (possibly actively harmful —
  double-prefixing)? Tailwind's own v4 upgrade guidance has historically said
  to drop it; confirm against current docs before deciding.
- Does `content: [...]` in the bridged JS config still control file scanning
  under `@config`, or does v4's automatic content detection need reconciling
  with it (e.g. duplicate/conflicting scanning)?

## 3. Files touched (expected)

| File | Change |
|---|---|
| `website/package.json` | `tailwindcss` → v4, add `@tailwindcss/postcss`, evaluate dropping `autoprefixer` |
| `website/postcss.config.mjs` | swap plugin key per §2 |
| `website/src/app/globals.css` | swap `@tailwind` directives for `@import "tailwindcss";` (+ `@config` line, placement TBD by what v4's docs currently say) |
| `website/tailwind.config.js` | likely **unchanged** if the `@config` bridge is viable (that's the point) |
| `package-lock.json` | regenerate via `npm install`, don't hand-edit |

`website/src/app/marketing.css` is **not expected to need changes** — see the
dual-system note in §1 — but confirm nothing in it breaks as a side effect
during verification.

## 4. Acceptance criteria

- `npm run build:web` succeeds locally and in CI (`website` job green).
- `npm run build` (both packages) still succeeds — sanity check nothing about
  the workspace-level build wiring regressed.
- Visual QA, compared against the site as it looked immediately before this
  migration (screenshot or just careful side-by-side): homepage (spot-check
  at least 2–3 of the 7 locales, not just English — colors, spacing, and
  responsive breakpoints are what's actually at risk here, not translated
  text), `/docs` (this is the one page confirmed to use the typography
  plugin — check it renders with working `.prose` styling, not unstyled
  fallback text), `/tool`. Check at minimum: mobile (375px), and desktop
  (1280px) — matches the widths already established as this project's real
  verification convention this session.
- No new console errors in a fresh browser tab (watch for the usual
  service-worker/stale-tab false positives this project's dev server is
  prone to — see the note in §6 before treating a console warning as real).
- PR #13 (or a fresh branch/PR replacing it, if #13's branch is too stale to
  rebase cleanly) merges with CI green, superseding the open Dependabot PR.

## 5. First steps for the implementing session

1. `npm view tailwindcss version` and check the current Tailwind v4 upgrade
   guide — confirm the four "needs live verification" items in §2 against
   whatever's actually current, before writing any code. This plan's specifics
   may already be stale.
2. Read `website/tailwind.config.js` and `website/src/app/globals.css` in full
   (both already read into this doc's context in §1, but read the live files —
   don't trust this summary blindly, per this project's own stated norm about
   re-verifying before acting on recalled state).
3. Implement the `@config`-bridge path from §2 first, since it's the smaller
   diff. If and only if that proves genuinely unworkable, escalate to a full
   `@theme` rewrite of the token file — and if it comes to that, do it as its
   own reviewable step, not folded silently into "finish the migration."

## 6. Known noise to not mistake for new bugs

Two things this session hit repeatedly while verifying unrelated changes on
this same website — both confirmed benign, both likely to reappear:

- **A long-lived dev-server browser tab will show stale hydration-mismatch
  warnings** (`Server: X Client: Y`) that don't reflect the real, current
  server output — confirmed via `curl` against the raw dev server twice this
  session. The service worker (`ServiceWorker.jsx`/`sw.js`, for the site's
  offline/PWA support) caches origin-wide, not per-tab, so even a *new* tab on
  the same origin can show this if the SW's cache predates your latest edit.
  Verify real content via `curl localhost:PORT` or a fully unregistered
  service worker (`navigator.serviceWorker.getRegistrations()` +
  `.unregister()`, plus `caches.keys()` + `.delete()`), not by trusting one
  browser tab's console.
- **`test-browser` (Playwright, unrelated to this migration)** has hit a
  one-off "Browser connection was closed while running tests" WebKit failure
  in CI before — resolved on a plain re-run (`gh run rerun <id> --failed`),
  not a real bug. Don't spend time root-causing this specific symptom again
  unless it becomes reproducible.

## 7. Non-goals

- **`#14` (`@rollup/plugin-terser` 0.4.4→1.0.0), `#15` (React 18→19), `#16`
  (Next 14→16) are explicitly out of scope for M8.** Each is its own major
  version with its own independent breaking-changes surface (React 19 alone
  has real API removals). Bundling any of them into this migration would
  reintroduce exactly the problem M8 exists to clean up — untangling what
  broke what. Evaluate and migrate each separately, on its own PR, on its own
  merits, whenever someone deliberately picks it up.
- No attempt to adopt Tailwind v4's newer authoring conveniences (container
  queries, the new color-mix-based opacity syntax, etc.) beyond what's needed
  to build successfully. This is a compatibility migration, not a redesign.
