// Renders Shorts to out/<id>.mp4 with mastered sound.
//
//   node scripts/render.mjs [scale] [id ...]     scale 1 = the 2160×3840 master
//
// Remotion mixes the cues; this then raises the mix by what would put it at
// -14 LUFS, the level YouTube plays at, into a limiter whose 2 ms attack keeps
// the press's transient. The Shorts are mostly silence and one hit, and the
// hit is the loudness, so the limiter takes some back and they land between
// -16 and -17.5 LUFS: flattening the press to reach -14 would cost the sound
// its point. Each master is measured again after encoding and must stay at or
// below -1 dBTP. Set REMOTION_BROWSER to an installed Chrome headless shell to
// skip the download.
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './shared.mjs';

const LUFS = -14;
const LIMIT = 10 ** (-1.5 / 20); // sample peaks; AAC adds a little, the check below holds -1 dBTP
const MAX_TRUE_PEAK = -1;

/** Integrated loudness and true peak, from ffmpeg's ebur128 summary (on stderr). */
function loudness(file) {
  const { stderr } = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const summary = stderr.split('Summary:')[1];
  return { lufs: Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)[1]), peak: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary)[1]) };
}

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
  const before = loudness(mix);
  // A quiet mix raised a long way can overshoot the limiter's ceiling once
  // encoded; then master again with the ceiling lowered by the overshoot.
  let after;
  for (let ceiling = LIMIT, tries = 0; tries < 3; tries++) {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mix, '-c:v', 'copy',
      '-af', `volume=${(LUFS - before.lufs).toFixed(2)}dB,alimiter=limit=${ceiling.toFixed(3)}:attack=2:release=80:level=false`,
      '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', file]);
    after = loudness(file);
    if (after.peak <= MAX_TRUE_PEAK) break;
    ceiling *= 10 ** ((MAX_TRUE_PEAK - after.peak - 0.3) / 20);
  }
  rmSync(mix);
  console.log(file, `${before.lufs.toFixed(1)} → ${after.lufs.toFixed(1)} LUFS, ${after.peak.toFixed(1)} dBTP`);
  if (after.peak > MAX_TRUE_PEAK) throw new Error(`${composition.id}: true peak ${after.peak} dBTP is over ${MAX_TRUE_PEAK}`);
}
