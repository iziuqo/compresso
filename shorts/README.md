# Shorts

The Compresso YouTube Shorts, rendered with [Remotion](https://www.remotion.dev)
from the app's own design system, so they never drift from what ships:
colours and type from `website/compresso-app/src/design/tokens.css`, curves and
timings from its `motion.ts`, sizes printed by the app's formatter
(`mobile/src/i18n/format.ts`), and the icon's two plates from `logo.svg`.

| Short | Length | Cuts |
|---|---|---|
| `the-press-<n>`: the icon presses a heavy photo; the bytes go, the photo stays | 12 s loop | one wordless master per episode |
| `can-you-tell-<n>`: original or Compresso? Guess, then the reveal | 10 s loop | one wordless master per episode |
| `file-too-large-<lang>`: the limits pile up, one tap ends them | 13 s loop | one per language in `locales/` |
| `app-store-en`: one press, then the plates close on the App Store badge | 10.5 s loop | English |

## Rules every frame follows

- Real photos only, from Wikimedia Commons under CC0 or public domain
  (`photos.json`). Every size and app screen comes from running the photo
  through the real app (`scripts/measure.mjs`), never typed in.
- The photo is the only colour. Numbers in Geist Mono, statements in Geist.
- The app's curves and durations, so nothing can overshoot or bounce.
- Cuts land on a 120 BPM grid. No outros: the icon's clamp is the brand moment.
  The one card, in `app-store-en`, is the clamp: it cuts in on the hit.
- Apple's badge only as Apple draws it, per the App Store marketing
  guidelines: the official artwork, still, one per video, smaller than the
  icon, with clear space a quarter of its height, Apple's credit lines on
  the card and in the description, and "for iPhone and iPad", never "iOS".
- Type stays out of the areas YouTube covers (`safe` in `src/system.ts`).

## Make them

Needs Node, ffmpeg, Playwright's Chromium, and Python 3 with numpy and scipy.
For the zh-Hans cut, install Noto Sans SC (the CJK face Android ships) and
make it the only Chinese font fontconfig offers, so the app recording and the
Short both set Chinese as a phone does.

```sh
npm ci
npm run photos                    # checks the originals against Commons' SHA-1
(cd ../mobile && npx expo export --platform web && python3 -m http.server 8765 -d dist) &
npm run measure                   # real sizes and screens from the app; `npm run measure app-store-lofoten` for one
npm run sound                     # the press, from sound/src
npm run stills                    # key frames to out/stills
npm run render                    # 4K masters to out/, loud as the press allows; `npm run render 0.5 the-press-1` for a quick look
npm run youtube                   # every title and description, in each language, to out/youtube.json
npm run studio                    # preview and scrub
```

Commons answers 429 to busy shared addresses, cloud machines included, and
`npm run photos` then waits it out. If it never gets through, run it on
another network (a GitHub Actions runner works) and copy the files into
`public/photos`: it skips any file whose SHA-1 already matches.

Set `REMOTION_BROWSER` to an installed Chrome headless shell to skip
Remotion's download.

## Upload

Each master goes to the channel as private, with the title, description and
video language from `out/youtube.json`; the other languages go under Studio's
Languages, as title and description translations. Upload the 4K masters:
YouTube makes 2160p60 VP9 and AV1 from them, so phones get those codecs at
1080p too, and it measures the masters at their real loudness (about −17 LUFS)
and doesn't raise them.
