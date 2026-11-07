// Renders the key frames each Short is reviewed on to out/stills/, as JPEG.
//
//   node scripts/stills.mjs [scale] [id ...]     scale 1 = the 2160×3840 master
//
// Set REMOTION_BROWSER to an installed Chrome headless shell to skip the
// download. Dark mode matches remotion.config.ts (the CLI's config).
import { bundle } from '@remotion/bundler';
import { getCompositions, renderStill } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './shared.mjs';

/** Seconds into each series' episodes: the moments its story turns on. */
const KEY = {
  'the-press': [0.2, 1.2, 1.7, 3.3, 4.4, 6.2],
  'can-you-tell': [0.5, 5.2, 6.8, 8.4],
  'file-too-large': [0.0, 4.6, 6.2, 8.2, 9.6, 12.4],
};

const [scaleArg = '1', ...ids] = process.argv.slice(2);
const scale = Number(scaleArg);
const out = join(root, 'out/stills');
mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: join(root, 'src/index.ts') });
const options = { serveUrl, browserExecutable: process.env.REMOTION_BROWSER ?? null, chromiumOptions: { darkMode: true } };
for (const composition of await getCompositions(serveUrl, options)) {
  if (ids.length && !ids.includes(composition.id)) continue;
  for (const s of Object.entries(KEY).find(([series]) => composition.id.startsWith(series))[1]) {
    const output = join(out, `${composition.id}-${s.toFixed(1)}s.jpg`);
    await renderStill({ ...options, composition, frame: Math.round(s * composition.fps), output, imageFormat: 'jpeg', jpegQuality: 92, scale });
    console.log(output);
  }
}
