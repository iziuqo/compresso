# Contributing to Compresso

Thank you for considering a contribution to Compresso! This project exists to make image uploads easier for everyone — especially users who shouldn't have to think about file formats and compression.

## Getting Started

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Build the library: `npm run build:lib`
4. Start the website dev server: `npm run dev`

## Project Structure

```
compresso/
├── packages/compresso/    # The npm library
│   ├── src/               # Library source code
│   ├── types/             # TypeScript declarations
│   ├── test/              # Unit tests (Node) + test/browser/ (Playwright)
│   └── dist/              # Built output (generated)
├── website/               # Next.js marketing site + docs
├── examples/              # Framework integration examples
└── _articles/             # Research papers
```

## Development Workflow

### Library

```bash
npm run build:lib        # Build the library
npm run test:lib         # Unit tests (plain Node — pure logic, no browser needed)
npm run test:lib:browser # Integration tests in real Chromium/Firefox/WebKit via Playwright
npm run size:lib         # Check the built bundle against its size-limit budget
```

`test:lib:browser` needs Playwright's browsers installed once per machine:
`npx playwright install chromium firefox webkit` (run inside `packages/compresso`).

Unit tests cover pure logic (byte parsing, dimension math, format tables) and run in
plain Node. Browser tests cover anything that touches real image decode/encode —
Node has no implementation of `Image`/`createImageBitmap`/`OffscreenCanvas` at all, so
those can only be tested in an actual engine. See `packages/compresso/test/browser/README.md`
for how the two suites relate, and how the personal-photo corpus at `_assets/`
(gitignored, local-only) adds optional extra coverage on top of the committed fixtures.

### Website

```bash
npm run dev              # Start Next.js dev server
npm run build:web        # Production build
```

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Add TypeScript types for any new API surface
- Update documentation if you change the API
- Run `npm run test:lib` and `npm run test:lib:browser` when touching compression
  logic — CI runs both (Chromium, Firefox, and WebKit) plus a bundle-size check on
  every push, but catching a regression locally first is faster for everyone
- Write clear commit messages

## Reporting Issues

- Use the issue templates on GitHub
- Include browser version and OS when reporting bugs
- Include a minimal reproduction if possible

## Code Style

- Plain JavaScript (no TypeScript in the library source — types are maintained separately)
- No comments unless the "why" is non-obvious
- Prefer simplicity over abstraction

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
