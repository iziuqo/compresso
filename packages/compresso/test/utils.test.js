import { describe, expect, it } from 'vitest';
import {
  detectFormat, formatToMime, generateFileName, getBestFormat, isFormatSupported, mimeToExtension,
} from '../src/utils.js';

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
