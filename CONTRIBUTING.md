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
│   └── dist/              # Built output (generated)
├── website/               # Next.js marketing site + docs
├── examples/              # Framework integration examples
└── _articles/             # Research papers
```

## Development Workflow

### Library

```bash
npm run build:lib        # Build the library
```

### Website

```bash
npm run dev              # Start Next.js dev server
npm run build:web        # Production build
```

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Add TypeScript types for any new API surface
- Update documentation if you change the API
- Test across browsers when touching compression logic
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
