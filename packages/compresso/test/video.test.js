import { describe, expect, it } from 'vitest';
import { fitVideo, planVideo, resolveFormat } from '../src/plan.js';

const MB = 1024 * 1024;

/** A 60 s, 4K, 30 fps phone clip with sound, at about 50 Mbps (H.264, as many Android phones record). */
const clip = (extra) => ({
  width: 3840,
  height: 2160,
  fps: 30,
  durationMs: 60_000,
  hasAudio: true,
  originalSize: 360 * MB,
  ...extra,
});
const h264 = (extra) => ({ codecs: ['h264'], ...extra });

/**
 * A fake encoder whose output is `overshoot(pass)` times what the bitrates it
 * is given add up to, the way a hardware encoder misses its bitrate.
 */
function fakeHost(source, { codecs = ['h264'], overshoot = () => 1 } = {}) {
  const calls = { encodes: [], keeps: 0, discards: 0 };
  const host = {
    source,
    codecs,
    async encode(settings) {
      calls.encodes.push(settings);
      const nominal = ((settings.videoBitrate + settings.audioBitrate) * source.durationMs) / 8000;
      const bytes = Math.round(nominal * overshoot(calls.encodes.length));
      return { result: { bytes, ...settings }, bytes };
    },
    async keep() {
      calls.keeps++;
      return { bytes: source.originalSize };
    },
    discard() {
      calls.discards++;
    },
  };
  return { host, calls };
}

describe('resolveFormat for codecs', () => {
  it('takes the first preferred codec the host writes, the fallback otherwise', () => {
    expect(resolveFormat(['hevc', 'h264'], ['h264'], 'h264')).toBe('h264');
    expect(resolveFormat(['av1'], ['hevc'], 'h264')).toBe('h264');
  });
});

describe('fitVideo', () => {
  it('without a target, keeps the size and frame rate and sets bits by quality', () => {
    const out = fitVideo(clip({ width: 1920, height: 1080 }), h264({ quality: 0.8 }));
    expect(out).toMatchObject({ codec: 'h264', width: 1920, height: 1080, fps: 30, audioBitrate: 96_000 });
    expect(out.videoBitrate).toBe(Math.round(0.15 * 0.8 * 1920 * 1080 * 30));
  });

  it('caps the long edge and frame rate, keeping even dimensions and the aspect ratio', () => {
    const out = fitVideo(clip({ width: 1080, height: 1920, fps: 60 }), h264({ maxLongEdge: 1281, maxFps: 30 }));
    expect(out).toMatchObject({ width: 720, height: 1280, fps: 30 });
  });

  it('never upscales', () => {
    const out = fitVideo(clip({ width: 640, height: 360, originalSize: 50 * MB }), h264({ targetBytes: 40 * MB }));
    expect(out).toMatchObject({ width: 640, height: 360 });
  });

  it('asks HEVC for fewer bits than H.264 for the same picture', () => {
    const source = clip();
    expect(fitVideo(source, { codecs: ['hevc'] }).videoBitrate).toBeLessThan(fitVideo(source, h264()).videoBitrate);
  });

  it('returns null (keep the source) when nothing smaller is possible without a target', () => {
    expect(fitVideo(clip({ originalSize: 5 * MB }), h264())).toBeNull();
  });

  it('meets a target: bitrate from the budget, a step down the ladder, 30 fps', () => {
    const out = fitVideo(clip({ fps: 60 }), h264({ targetBytes: 10 * MB }));
    const seconds = 60;
    expect(out.bytes).toBeLessThanOrEqual(10 * MB);
    expect(out.fps).toBe(30);
    expect(out.audioBitrate).toBe(96_000);
    expect(((out.videoBitrate + out.audioBitrate) * seconds) / 8).toBeLessThanOrEqual(10 * MB * 0.92);
    // ~1.2 Mbps of video: 720p is too few bits per pixel for H.264, 540p is enough.
    expect(out).toMatchObject({ width: 960, height: 540 });
    expect(fitVideo(clip(), { codecs: ['hevc'], targetBytes: 10 * MB })).toMatchObject({ height: 720 });
  });

  it('drops audio to the tight rate, or entirely when asked', () => {
    expect(fitVideo(clip(), h264({ targetBytes: 3 * MB })).audioBitrate).toBe(64_000);
    expect(fitVideo(clip(), h264({ targetBytes: 3 * MB, audio: false })).audioBitrate).toBe(0);
    expect(fitVideo(clip({ hasAudio: false }), h264()).audioBitrate).toBe(0);
  });

  it('bottoms out at the smallest rung and a floor bitrate when the target is out of reach', () => {
    const out = fitVideo(clip({ durationMs: 600_000 }), h264({ targetBytes: MB }));
    expect(out).toMatchObject({ height: 360, videoBitrate: 100_000 });
    expect(out.bytes).toBeGreaterThan(MB);
  });

  it('prices in an overshoot by asking for proportionally fewer bits', () => {
    const first = fitVideo(clip(), h264({ targetBytes: 10 * MB }));
    const second = fitVideo(clip(), h264({ targetBytes: 10 * MB }), 1.1);
    expect(second.videoBitrate).toBeLessThan(first.videoBitrate / 1.09);
    expect(second.bytes).toBeLessThanOrEqual(10 * MB);
  });

  it('needs the duration', () => {
    expect(() => fitVideo(clip({ durationMs: 0 }), h264())).toThrow(RangeError);
  });
});

describe('planVideo', () => {
  it('encodes once when the encoder lands on target', async () => {
    const { host, calls } = fakeHost(clip(), { codecs: ['hevc', 'h264'] });
    const out = await planVideo(host, { codecs: ['hevc'], targetBytes: 10 * MB });
    expect(out).toMatchObject({ kept: false, missedTarget: false, settings: { codec: 'hevc' } });
    expect(calls.encodes).toHaveLength(1);
  });

  it('runs one correction pass when the encoder overshoots, discarding the miss', async () => {
    const { host, calls } = fakeHost(clip(), { overshoot: () => 1.15 });
    const out = await planVideo(host, h264({ targetBytes: 10 * MB }));
    expect(calls.encodes).toHaveLength(2);
    expect(calls.discards).toBe(1);
    expect(out.result.bytes).toBeLessThanOrEqual(10 * MB);
    expect(out.missedTarget).toBe(false);
  });

  it('gives the smaller miss and says so after two passes over the target', async () => {
    // The encoder misses by more on the second pass than on the first.
    const { host, calls } = fakeHost(clip(), { overshoot: (pass) => (pass === 1 ? 1.2 : 1.5) });
    const out = await planVideo(host, h264({ targetBytes: 10 * MB }));
    expect(out).toMatchObject({ kept: false, missedTarget: true });
    expect(out.result.bytes).toBeLessThan(clip().originalSize);
    expect(calls.encodes).toHaveLength(2);
  });

  it('skips the correction when the plan already expected to miss', async () => {
    const { host, calls } = fakeHost(clip({ durationMs: 600_000 }));
    const out = await planVideo(host, h264({ targetBytes: MB }));
    expect(out).toMatchObject({ kept: false, missedTarget: true });
    expect(calls.encodes).toHaveLength(1);
  });

  it('keeps the source, and says the target was missed, when a miss is also bigger', async () => {
    const { host } = fakeHost(clip(), { overshoot: () => 1e3 });
    expect(await planVideo(host, h264({ targetBytes: 10 * MB }))).toMatchObject({ kept: true, missedTarget: true });
  });

  it('never returns a bigger file: keeps the source', async () => {
    const small = clip({ originalSize: 5 * MB });
    const { host, calls } = fakeHost(small);
    expect(await planVideo(host, h264())).toMatchObject({ kept: true, settings: null, missedTarget: false });
    expect(calls.encodes).toHaveLength(0);

    // The plan looked smaller, but the encode came out bigger: keep the source.
    const { host: wild, calls: wildCalls } = fakeHost(clip(), { overshoot: () => 1e3 });
    expect(await planVideo(wild, h264())).toMatchObject({ kept: true, missedTarget: false });
    expect(wildCalls.discards).toBe(1);
  });

  it('ends its progress at 1', async () => {
    const { host } = fakeHost(clip());
    const progress = [];
    await planVideo(host, h264(), { onProgress: (p) => progress.push(p) });
    expect(progress.at(-1)).toBe(1);
  });

  it('honours an abort signal', async () => {
    const { host, calls } = fakeHost(clip());
    await expect(planVideo(host, h264(), { signal: AbortSignal.abort() })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(calls.encodes).toHaveLength(0);
  });
});
