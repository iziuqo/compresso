# M9 — Documentation audit and update

**Status:** scoped, not started. Written 2026-08-04, in the session that implemented
M8 (Tailwind v4 migration). Handed off per this project's explore-then-implement
workflow: this doc is the context a fresh session needs to implement directly, at
high reasoning effort, without re-deriving what's below from scratch.

**Not a code change.** Every file this touches is a `.md` file. No build, no CI, no
visual QA needed — the verification bar here is "does this doc's status line match
reality," not "does the site render."

---

## 0. Why this exists

M8 just shipped: `website/` migrated to Tailwind CSS v4, PR #13 open with all 8 CI
checks green (not yet merged — see `M8_TAILWIND_V4_MIGRATION.md`, updated in place
this session with a "done" status and outcome notes once implementation finished).

While closing out M8, a light pass over the repo's other docs (not a full audit)
turned up a **recurring pattern, not a one-off**: this project's planning docs
(`_docs/*.md`) are written with an honest "not started yet" status line at the top
(a deliberate, good convention — see `LIB_V1_WORKERS_PLAN.md`'s and
`PRODUCT_CONTEXT.md`'s own headers for how carefully they separate verified fact
from framing/ideas). But those status lines don't get revisited once the work
actually ships. M8_TAILWIND_V4_MIGRATION.md had exactly this problem until this
session updated it by hand. This doc exists so someone deliberately goes through
*every* planning doc and does the same check, rather than each one only getting
fixed incidentally by whichever session happens to notice.

## 1. Current state, verified this session (light pass — not exhaustive, that's M9's job)

Full inventory of markdown docs in the repo:

```
CHANGELOG.md
CODE_OF_CONDUCT.md
CONTRIBUTING.md
README.md
SECURITY.md
.github/PULL_REQUEST_TEMPLATE.md
_docs/LIB_V1_WORKERS_CONTEXT.md
_docs/LIB_V1_WORKERS_PLAN.md
_docs/M8_TAILWIND_V4_MIGRATION.md
_docs/M9_DOCS_UPDATE.md          (this file)
_docs/PRODUCT_CONTEXT.md
_docs/PWA_PLAN.md
```

**High-confidence, concrete finding — fix this first:**

- `_docs/LIB_V1_WORKERS_CONTEXT.md` header still says *"Status: research + framing
  only. No plan, no code."* and `_docs/LIB_V1_WORKERS_PLAN.md` header still says
  *"Ready to hand to an implementation session"* — both written 2026-08-03. But per
  this project's own memory record (`compresso_v1_workers_initiative`), that work
  **actually shipped**: compresso.js v1 is live on npm, M0–M6 done, only M7 (a WICG
  explainer writeup) is outstanding, on hold pending real adoption. These two docs'
  status lines describe a pre-implementation state for work that's since completed
  and published — same category of staleness M8's doc had, just not yet fixed.
  Confirm against current reality (npm version, CHANGELOG.md's `[1.0.1]` entry,
  `git log`) before rewriting the status lines — don't take the memory record's word
  alone per this project's own "verify before trusting recalled state" norm (see
  `M8_TAILWIND_V4_MIGRATION.md` §5 for how the previous session applied that same
  norm to itself).

**Open question — needs investigation, not just a status-line fix:**

- `_docs/PRODUCT_CONTEXT.md` (*"Status: research + framing only... written
  2026-07-31"*) and its companion `_docs/PWA_PLAN.md` (*"Nothing here has been
  built"*, also 2026-07-31) scope a **separate** initiative from the two tracks
  above: turning `/tool` into a standalone installable PWA, explicitly in a
  **fresh repo** (`PWA_PLAN.md` §0: "fresh repo, fresh Vercel project... Clean
  break" from `website/`). Checked this session: no PWA-named or otherwise
  obviously-matching repo exists anywhere under `/Users/Shared/Projects` (only
  `compresso` and `compresso-app` — and `compresso-app` is a pre-existing
  reference/demo app used as validation input for the *workers* track, per
  `LIB_V1_WORKERS_PLAN.md`'s own description of it, not the PWA). So: did this
  initiative stall after planning, get picked up somewhere not on this machine,
  get abandoned, or get renamed/folded into something else? Unknown from what's
  visible in this workspace. **Ask the user rather than guessing** — this is a
  factual question about work status, not something inferable from the repo.

**Checked, not stale:**

- `CHANGELOG.md` is explicitly scoped to `compresso.js` only (its own header:
  "All notable changes to `compresso.js` are documented here"). The Tailwind v4
  website migration doesn't belong here by the doc's own stated convention — don't
  add an entry for M8. Has real entries through `[1.0.1]`, looks maintained.
- `README.md` — spot-checked the top (badges, bundle-size claim of "3.6 KB") against
  `CHANGELOG.md`'s `[1.0.1]` entry, which documents that exact number as verified.
  Consistent. Not fully read end-to-end though.
- `PRODUCT_CONTEXT.md` / `PWA_PLAN.md` — zero mentions of tailwind/postcss/build
  tooling, so M8 didn't introduce any staleness here specifically (separate from
  the open question above about whether the PWA content itself is current).

**Not checked at all this session:** `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
`SECURITY.md`, `.github/PULL_REQUEST_TEMPLATE.md`. `CONTRIBUTING.md`'s "Getting
Started" section (`npm install`, `npm run build:lib`, `npm run dev`) looked correct
at a glance against the root `package.json` scripts but wasn't verified command-by-
command.

## 2. What M9 actually needs to do

1. For each doc with a status/header line claiming a stage of completeness
   (`_docs/LIB_V1_WORKERS_CONTEXT.md`, `_docs/LIB_V1_WORKERS_PLAN.md`,
   `_docs/PRODUCT_CONTEXT.md`, `_docs/PWA_PLAN.md`): verify the claim against
   current reality, then update the status line (and any body content that
   assumed the old status) to match — same shape of edit this session made to
   `M8_TAILWIND_V4_MIGRATION.md`.
2. Resolve the PWA open question above (ask the user) before deciding what, if
   anything, to change in `PRODUCT_CONTEXT.md` / `PWA_PLAN.md` — don't guess at an
   answer and don't mark it stale/current without knowing which it is.
3. Do the full pass this session only spot-checked: `CONTRIBUTING.md`,
   `CODE_OF_CONDUCT.md`, `SECURITY.md`, `README.md` end-to-end, PR template.
4. Not in scope: rewriting doc *content* for style/clarity, or restructuring how
   this project organizes `_docs/`. This is a staleness pass — fix what's factually
   wrong or out of date, don't redesign the documentation system.

## 3. First steps for the implementing session

1. Re-verify the "high-confidence finding" in §1 yourself (`npm view compresso.js
   version`, check the live CHANGELOG.md, maybe `git log --oneline` for the
   workers-track merge commits) before editing anything — this doc's claims may
   already be stale by the time you read it, same caveat every doc in this
   project carries.
2. Ask the user about the PWA open question early — it blocks a real decision
   (§2.2) and there's no way to resolve it from the repo alone.
3. Work doc-by-doc, smallest/most-certain fix first (the two workers-track status
   lines), same order this doc lists them in.
