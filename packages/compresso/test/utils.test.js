import { describe, expect, it } from 'vitest';
import {
  canonicalFormat, detectFormat, formatToMime, generateFileName, getBestFormat, isFormatSupported, mimeToExtension, resultFile,
} from '../src/utils.js';

describe('canonicalFormat', () => {
  it('gives one name for each format, in any case or spelling (API-02)', () => {
    expect(canonicalFormat('JPG')).toBe('jpeg');
    expect(canonicalFormat('jpeg')).toBe('jpeg');
    expect(canonicalFormat('HEIF')).toBe('heic');
    expect(canonicalFormat('WebP')).toBe('webp');
  });
});

describe('formatToMime / mimeToExtension', () => {
  it('maps known format names to their MIME type', () => {
    expect(formatToMime('jpeg')).toBe('image/jpeg');
    expect(formatToMime('jpg')).toBe('image/jpeg');
    expect(formatToMime('PNG')).toBe('image/png'); // case-insensitive
    expect(formatToMime('webp')).toBe('image/webp');
    expect(formatToMime('avif')).toBe('image/avif');
  });

  it('falls back to jpeg for an unknown format name', () => {
    expect(formatToMime('made-up-format')).toBe('image/jpeg');
  });

  it('round-trips MIME type back to a file extension', () => {
    expect(mimeToExtension('image/png')).toBe('png');
    expect(mimeToExtension('image/jpeg')).toBe('jpg'); // not "jpeg"
    expect(mimeToExtension('image/unknown')).toBe('jpg'); // documented fallback
    expect(mimeToExtension('image/heif')).toBe('heic');
    expect(mimeToExtension('image/svg+xml')).toBe('svg');
  });
});

describe('detectFormat', () => {
  it('detects from a File-like object\'s MIME type first', () => {
    expect(detectFormat({ type: 'image/webp', name: 'photo.png' })).toBe('webp');
  });

  it('falls back to the filename extension when there is no MIME type', () => {
    expect(detectFormat({ type: '', name: 'photo.AVIF' })).toBe('avif');
  });

  it('detects from a bare URL string', () => {
    expect(detectFormat('https://example.com/path/photo.jpeg')).toBe('jpeg');
  });

  it('names every format canonically, whatever the source calls it (API-02)', () => {
    expect(detectFormat({ type: 'image/jpeg' })).toBe('jpeg');
    expect(detectFormat({ type: '', name: 'photo.JPG' })).toBe('jpeg');
    expect(detectFormat('https://example.com/photo.jpg')).toBe('jpeg');
    expect(detectFormat({ type: 'image/heif' })).toBe('heic');
    expect(detectFormat({ type: '', name: 'IMG_0001.HEIC' })).toBe('heic');
    expect(detectFormat({ type: 'image/gif' })).toBe('gif');
    expect(detectFormat({ type: 'image/svg+xml' })).toBe('svg');
  });

  it('returns null when nothing is recognizable', () => {
    expect(detectFormat({ type: '', name: 'noextension' })).toBeNull();
    expect(detectFormat('https://example.com/photo')).toBeNull();
  });
});

describe('generateFileName', () => {
  it('replaces the extension, keeping the base name', () => {
    expect(generateFileName({ name: 'vacation.png' }, 'webp')).toBe('vacation.webp');
  });

  it('strips only the last extension from a multi-dot name', () => {
    expect(generateFileName({ name: 'archive.tar.png' }, 'jpeg')).toBe('archive.tar.jpg');
  });

  it('falls back to a generic base name when the source has none', () => {
    expect(generateFileName({}, 'png')).toBe('image.png');
    expect(generateFileName('https://example.com/photo.jpg', 'png')).toBe('image.png');
  });
});

describe('resultFile', () => {
  const blob = new Blob(['x'], { type: 'image/webp' });

  it('names new bytes after the source, with the output format\'s extension', () => {
    const file = resultFile({ name: 'beach.png' }, blob, { kept: false, format: 'webp', mimeType: 'image/webp' });
    expect([file.name, file.type]).toEqual(['beach.webp', 'image/webp']);
  });

  it('gives a kept source back under its own name (COR-06)', () => {
    const file = resultFile({ name: 'scan.jpeg' }, blob, { kept: true, format: 'jpeg', mimeType: 'image/jpeg' });
    expect([file.name, file.type]).toEqual(['scan.jpeg', 'image/jpeg']);
  });

  it('names a kept URL source generically, since it has no file name', () => {
    expect(resultFile('https://example.com/a.png', blob, { kept: true, format: 'png', mimeType: 'image/png' }).name).toBe('image.png');
  });
});

describe('isFormatSupported / getBestFormat (plain Node — no real canvas probe available)', () => {
  it('always reports jpeg and png as supported', () => {
    expect(isFormatSupported('jpeg')).toBe(true);
    expect(isFormatSupported('png')).toBe(true);
  });

  it('resolves to a supported format, never to an unsupported one', () => {
    // platform.js has no DOM here, so it reports no modern-format encode
    // capability (the same "assume nothing rather than guess wrong" default it
    // uses inside a real, not-yet-probed worker) — getBestFormat's fallback
    // chain is what's actually under test, not a specific browser's real caps.
    expect(getBestFormat()).toBe('jpeg');
  });
});
