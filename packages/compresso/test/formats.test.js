import { describe, expect, it } from 'vitest';
import { sniffFormat } from './support/formats.js';

/** Edge cases of the signature reader behind the honesty check; the fixtures cover the common ones. */
const bytes = (text) => new TextEncoder().encode(text);
const ftyp = (major, ...compatible) => {
  const brands = [major, '\0\0\0\0', ...compatible].join('');
  const size = 8 + brands.length;
  return Uint8Array.from([0, 0, 0, size, ...bytes('ftyp'), ...bytes(brands)]);
};

describe('sniffFormat()', () => {
  it('reads SVG after a BOM, an XML declaration, comments and a DOCTYPE', () => {
    expect(sniffFormat(bytes('﻿<?xml version="1.0"?>\n<!-- Generator: an editor -->\n<!DOCTYPE svg>\n<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe('svg');
    expect(sniffFormat(bytes('<html><svg/></html>'))).toBeNull();
  });

  it('lets the major brand decide between AVIF and HEIC', () => {
    expect(sniffFormat(ftyp('heic', 'mif1', 'avif'))).toBe('heic');
    expect(sniffFormat(ftyp('avif', 'mif1', 'heic'))).toBe('avif');
    expect(sniffFormat(ftyp('mif1', 'avif'))).toBe('avif');
    expect(sniffFormat(ftyp('mif1', 'heic'))).toBe('heic');
    expect(sniffFormat(ftyp('isom', 'mp41'))).toBeNull();
  });
});
