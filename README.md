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

`pnpm check` verifies the approved assets, formatting and types, runs the unit tests,
builds the site, then runs the real-browser tests against the built pages. With a booted iOS
Simulator, `pnpm measure:ios` measures the drawing's tip against the line end in iOS Safari.

## The website

```bash
pnpm --filter @crochet-simple/web dev      # local development server
pnpm build                                 # static site in apps/web/dist
pnpm --filter @crochet-simple/web preview  # serve the built site
```

Set `SITE_URL` (for example `https://example.com`) when building for the live domain to turn
on canonical links and share images.

Headings use Fraunces (SIL Open Font License), trimmed to the characters and styles the site
uses by `scripts/subset-fonts.sh`.

Publish and backup instructions are added here as each part of the site is built.
