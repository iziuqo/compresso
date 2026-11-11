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
// below -1 dBTP. The picture renders in parts of PART frames, each kept as it
// finishes, so a render started again (the cloud container restarts every few
// hours) picks up at the first missing part; the sound renders whole, then
// the parts are joined without re-encoding. Set REMOTION_BROWSER to an installed Chrome headless shell to
// skip the download.
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import { root } from './shared.mjs';

const LUFS = -14;
const LIMIT = 10 ** (-1.5 / 20); // sample peaks; AAC adds a little, the check below holds -1 dBTP
const MAX_TRUE_PEAK = -1;
const PART = 300; // frames: a 4K part is about twenty minutes

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
// The press builds its scene in software in every tab before its first frame, which can take minutes.
const options = { serveUrl, browserExecutable: process.env.REMOTION_BROWSER ?? null, chromiumOptions: { darkMode: true, gl: 'swangle' }, timeoutInMilliseconds: 300000,
  // The recordings' frames cache below what the tabs leave free: unbounded, it grew until the compositor was killed (09).
  offthreadVideoCacheSizeInBytes: 1e9 };
const all = await getCompositions(serveUrl, options);

for (const composition of all.filter((c) => !ids.length || ids.includes(c.id))) {
  const mix = join(out, `${composition.id}.mix.mp4`);
  const file = join(out, `${composition.id}${scale === 1 ? '' : `@${scale}`}.mp4`);
  const parts = join(out, 'parts', `${composition.id}@${scale}`);
  mkdirSync(parts, { recursive: true });
  const started = Date.now();
  // Each part goes to a temporary name first, so only a finished one counts.
  const keep = async (name, render) => {
    const done = join(parts, name);
    if (existsSync(done)) return done;
    const doing = join(parts, `doing-${name}`);
    await render(doing);
    renameSync(doing, done);
    return done;
  };
  const pictures = [];
  for (let from = 0; from < composition.durationInFrames; from += PART) {
    const to = Math.min(from + PART, composition.durationInFrames) - 1;
    pictures.push(await keep(`${String(from).padStart(5, '0')}.mp4`, (outputLocation) => renderMedia({
      ...options, composition, codec: 'h264', outputLocation, scale, frameRange: [from, to], muted: true,
      crf: scale === 1 ? 14 : 20, pixelFormat: 'yuv420p',
      // Every core: the wave-three press draws in software, one frame per tab at a time. CONCURRENCY
      // lowers it where the tabs together run out of memory: 05's forty photos lose their WebGL context.
      concurrency: Number(process.env.CONCURRENCY) || availableParallelism(),
      onProgress: ({ renderedFrames }) => {
        if (renderedFrames % 60 === 0) console.log(`${composition.id}: ${from + renderedFrames}/${composition.durationInFrames} frames, ${((Date.now() - started) / 1000).toFixed(0)} s`);
      },
    })));
  }
  // A Short that can play its sound alone (`sound`) skips drawing every frame for it.
  const alone = { ...composition.props, sound: true };
  const sound = await keep('sound.m4a', (outputLocation) => renderMedia({ ...options, composition: { ...composition, props: alone }, inputProps: alone, codec: 'aac', outputLocation, audioBitrate: '320k' }));
  const list = join(parts, 'parts.txt');
  writeFileSync(list, pictures.map((f) => `file '${f}'\n`).join(''));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-i', sound, '-map', '0:v', '-map', '1:a', '-c', 'copy', '-shortest', mix]);
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
  rmSync(parts, { recursive: true });
  console.log(file, `${before.lufs.toFixed(1)} → ${after.lufs.toFixed(1)} LUFS, ${after.peak.toFixed(1)} dBTP`);
  if (after.peak > MAX_TRUE_PEAK) throw new Error(`${composition.id}: true peak ${after.peak} dBTP is over ${MAX_TRUE_PEAK}`);
}
