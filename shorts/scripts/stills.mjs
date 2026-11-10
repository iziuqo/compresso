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
  'can-you-tell': [0.2, 1.0, 4.0, 8.0, 10.6, 12.6, 19.2, 21.0, 22.0, 25.5],
  'file-too-large': [0.0, 4.6, 6.2, 8.2, 9.6, 12.4],
  'app-store': [0.2, 1.7, 3.3, 4.4, 6.6, 7.6, 10.2],
  'the-2mb-limit': [0.1, 2.3, 8.9, 10.6, 12.6, 14.6, 17.4, 19.6, 22.2, 26],
  'one-bar': [0.1, 3.0, 5.8, 7.4, 11.0, 14.6, 16.0, 16.8, 19.4, 22.2, 26],
  'the-limit': [0.2, 8.0, 14.5, 23.8, 26.3, 29.6, 29.9],
  'the-envelope': [0.2, 3.6, 12.6, 20.5, 22.4, 23.2, 23.9, 24.3, 24.8, 25.5],
  'the-bubble': [0.2, 3.6, 12.6, 20.5, 23.2, 23.6, 23.9, 24.6, 25.2, 25.8],
  'can-you-tell': [0.2, 1.0, 4.0, 8.0, 10.6, 12.6, 19.2, 21.0, 22.0, 25.5],
  'airplane-mode': [0.2, 3.6, 5.2, 8.0, 12.6, 20.5, 22.8, 24.5, 25.8, 29.9],
  'photos-for-grandma': [0.2, 1.0, 3.5, 7.6, 10.0, 12.5, 15.0, 16.3, 18.0, 19.6, 22.0, 27],
};

const [scaleArg = '1', ...ids] = process.argv.slice(2);
const scale = Number(scaleArg);
const out = join(root, 'out/stills');
mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: join(root, 'src/index.ts') });
// The press builds its scene in software in every tab before its first frame, which can take minutes.
const options = { serveUrl, browserExecutable: process.env.REMOTION_BROWSER ?? null, chromiumOptions: { darkMode: true, gl: 'swangle' }, timeoutInMilliseconds: 300000 };
for (const composition of await getCompositions(serveUrl, options)) {
  if (ids.length && !ids.includes(composition.id)) continue;
  for (const s of Object.entries(KEY).find(([series]) => composition.id.startsWith(series))[1]) {
    const output = join(out, `${composition.id}-${s.toFixed(1)}s.jpg`);
    await renderStill({ ...options, composition, frame: Math.round(s * composition.fps), output, imageFormat: 'jpeg', jpegQuality: 92, scale });
    console.log(output);
  }
}
