# Crochet Simple

Crochet patterns, a studio journal, and a homepage where one yarn line draws seven pieces as
you scroll.

## Requirements

- Node.js 24 (`nvm use`)
- pnpm 12

## Getting started

```bash
pnpm install
npx playwright install chromium webkit
pnpm check
```

`pnpm check` verifies the approved assets, formatting and types, then runs the unit tests
and the real-browser tests. With a booted iOS Simulator, `pnpm measure:ios` measures the
drawing's tip against the line end in iOS Safari.

Run, build, publish and backup instructions are added here as each part of the site is
built.
