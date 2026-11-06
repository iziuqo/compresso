// Renders the key frames each Short is reviewed on to out/stills/, as JPEG.
//
//   node scripts/stills.mjs [scale]      scale 1 = the 2160×3840 master
//
// Set REMOTION_BROWSER to an installed Chrome headless shell to skip the
// download. Dark mode matches remotion.config.ts (the CLI's config).
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './shared.mjs';

/** Seconds into each Short: the moments its story turns on. */
const KEY = {
  'the-press': [0.2, 1.2, 1.7, 3.3, 4.4],
  'can-you-tell': [0.5, 5.2, 6.8, 8.4],
  'file-too-large-en': [0.4, 4.8, 5.8, 7.0, 10],
};

const scale = Number(process.argv[2] ?? 1);
const out = join(root, 'out/stills');
mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: join(root, 'src/index.ts') });
const options = { serveUrl, browserExecutable: process.env.REMOTION_BROWSER ?? null, chromiumOptions: { darkMode: true } };
for (const [id, times] of Object.entries(KEY)) {
  const composition = await selectComposition({ ...options, id });
  for (const s of times) {
    const output = join(out, `${id}-${s.toFixed(1)}s.jpg`);
    await renderStill({ ...options, composition, frame: Math.round(s * composition.fps), output, imageFormat: 'jpeg', jpegQuality: 92, scale });
    console.log(output);
  }
}
