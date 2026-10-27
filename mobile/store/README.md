# Store kit

Everything the App Store and Google Play listings need, generated from the app
itself so it never drifts from what ships.

| What | Source | Command |
|---|---|---|
| Listing copy, 7 languages | `listing.json` | `npm run store:metadata` writes `store.config.json` (App Store, `eas metadata:push`) and `fastlane/metadata/android` (Play) |
| Sample photos | `make-sample-photos.py` | `npm run store:photos` |
| Raw screens | `capture.mjs` | `npm run store:capture` |
| Store images | `compose.mjs` | `npm run store:compose` |
| Flow recording | `record.mjs` | `npm run store:record` |
| Reel + App Store preview | `reel.mjs` | `npm run store:reel` |

Capture, compose, record and reel drive the web build, so first run
`npx expo export --platform web` and serve `dist/` on port 8765. They need
Playwright and ffmpeg on the machine, and Noto Sans SC installed for Chinese.

Each language is published to every store locale that speaks it: 13 App Store
locales and 17 Play locales (see `scripts/store-metadata.mjs`).

Rules the kit follows so review passes first time:

- Screenshots and the App Store preview show only real app screens. Headlines
  sit outside the device; nothing inside the screen is mocked.
- No other company's app names in the name, subtitle, keywords or screenshots.
- The privacy policy URL points at the website's per-language privacy page,
  which has a section for the mobile app.
- Before submission, re-shoot the raw screens on simulators from the EAS build
  so status bars and system fonts are exact.
