// Renders Shorts to out/<id>.mp4 with mastered sound.
//
//   node scripts/render.mjs [scale] [id ...]     scale 1 = the 2160×3840 master
//
// Remotion mixes the cues; this then sets the mix to -16 LUFS with a
// -1.5 dBTP ceiling. The limiter's 2 ms attack keeps the press's transient,
// and the level stays under YouTube's -14 LUFS, which only ever turns down.
// Set REMOTION_BROWSER to an installed Chrome headless shell to skip the download.
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './shared.mjs';

const LUFS = -16;
const CEILING = 10 ** (-1.5 / 20);

const [scaleArg = '1', ...ids] = process.argv.slice(2);
const scale = Number(scaleArg);
const out = join(root, 'out');
mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: join(root, 'src/index.ts') });
const options = { serveUrl, browserExecutable: process.env.REMOTION_BROWSER ?? null, chromiumOptions: { darkMode: true } };
const all = await getCompositions(serveUrl, options);

for (const composition of all.filter((c) => !ids.length || ids.includes(c.id))) {
  const mix = join(out, `${composition.id}.mix.mp4`);
  const file = join(out, `${composition.id}${scale === 1 ? '' : `@${scale}`}.mp4`);
  await renderMedia({
    ...options, composition, codec: 'h264', outputLocation: mix, scale,
    crf: scale === 1 ? 14 : 20, audioCodec: 'aac', audioBitrate: '320k', pixelFormat: 'yuv420p',
  });
  // ebur128 reports on stderr; its summary's I: is the integrated loudness.
  const { stderr } = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', mix, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
  const measured = Number(/I:\s+(-?[\d.]+) LUFS/.exec(stderr.split('Summary:')[1])[1]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mix, '-c:v', 'copy',
    '-af', `volume=${(LUFS - measured).toFixed(2)}dB,alimiter=limit=${CEILING.toFixed(3)}:attack=2:release=80:level=false`,
    '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', file]);
  rmSync(mix);
  console.log(file, `${measured.toFixed(1)} → ${LUFS} LUFS`);
}
