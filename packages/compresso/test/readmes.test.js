import { describe, expect, it } from 'vitest';
import { anchors, ownAnchorLinks, readme } from './support/readmes.js';

/**
 * Anchors that search results, other sites and the npm page link to. A
 * reworded heading changes its anchor, so these must survive every edit.
 */
const LINKED_FROM_OUTSIDE = {
  repository: ['comparison', 'batch--parallel-compression'],
  package: ['batch--workers'],
};

/** Links between the two READMEs, by the README they point into. */
const CROSS_LINKS = {
  repository: { from: 'package', pattern: /https:\/\/github\.com\/iziuqo\/compresso#([\w-]+)/g },
  package: { from: 'repository', pattern: /packages\/compresso\/README\.md#([\w-]+)/g },
};

describe('README anchors', () => {
  it('names headings the way GitHub does', () => {
    expect(anchors('## Batch & Parallel Compression\n## HEIC/HEIF input\n## Content-Security-Policy (CSP)\n## FAQ\n## FAQ')).toEqual([
      'batch--parallel-compression',
      'heicheif-input',
      'content-security-policy-csp',
      'faq',
      'faq-1',
    ]);
    expect(anchors('```sh\n# not a heading\n```\n## Real')).toEqual(['real']);
  });

  for (const [name, required] of Object.entries(LINKED_FROM_OUTSIDE)) {
    it(`keeps the ${name} README's anchors that outside links use`, () => {
      expect(anchors(readme(name))).toEqual(expect.arrayContaining(required));
    });

    it(`resolves every link within the ${name} README`, () => {
      const own = new Set(anchors(readme(name)));
      const missing = ownAnchorLinks(readme(name)).filter((anchor) => !own.has(anchor));
      expect(missing).toEqual([]);
    });

    it(`resolves every link into the ${name} README from the other one`, () => {
      const { from, pattern } = CROSS_LINKS[name];
      const own = new Set(anchors(readme(name)));
      const missing = [...readme(from).matchAll(pattern)].map((m) => m[1]).filter((anchor) => !own.has(anchor));
      expect(missing).toEqual([]);
    });
  }
});
