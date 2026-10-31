import { describe, expect, it } from 'vitest';

import type { Source } from '../engine/types';
import { appendSources, samePhoto } from './selection';

const photo = (uri: string, name = uri, size = 1000, width = 400, height = 300): Source =>
  ({ uri, name, size, width, height });

describe('appendSources', () => {
  it('keeps the photos already there and adds the new ones after them, in picked order', () => {
    const list = [photo('a'), photo('b')];
    expect(appendSources(list, [photo('c'), photo('d')]).map((s) => s.uri)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('skips a photo that is already in the list', () => {
    expect(appendSources([photo('a')], [photo('a'), photo('b')]).map((s) => s.uri)).toEqual(['a', 'b']);
  });

  it('skips a re-pick that came back under a new URI', () => {
    const first = photo('file:///cache/1.heic', 'IMG_0830', 1_200_000, 4032, 3024);
    const again = photo('file:///cache/2.heic', 'IMG_0830', 1_200_000, 4032, 3024);
    expect(appendSources([first], [again])).toEqual([first]);
  });

  it('skips duplicates within one pick too', () => {
    expect(appendSources([], [photo('a'), photo('a')]).map((s) => s.uri)).toEqual(['a']);
  });

  it('does not touch the list it was given', () => {
    const list = [photo('a')];
    appendSources(list, [photo('b')]);
    expect(list.map((s) => s.uri)).toEqual(['a']);
  });
});

describe('samePhoto', () => {
  it('tells apart two photos with the same name but different sizes', () => {
    expect(samePhoto(photo('x', 'IMG_1', 1000), photo('y', 'IMG_1', 2000))).toBe(false);
  });

  it('only trusts the URI when the picker gave no byte size', () => {
    expect(samePhoto(photo('x', 'photo-1', 0), photo('y', 'photo-1', 0))).toBe(false);
  });
});
