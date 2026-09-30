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
pnpm --filter @crochet-simple/web dev:sample  # local server with the sample content from the tests
pnpm --filter @crochet-simple/web dev         # local server with the admin's content
pnpm build                                    # static site in apps/web/dist
pnpm --filter @crochet-simple/web preview     # serve the built site
```

The site is built from a content folder (`apps/web/.content/`, written by the admin): settings,
categories, patterns, articles and pages as JSON with their media. The format is described in
`packages/shared/src/content.ts`, and every file is validated when the site builds. Empty
fields simply leave their part of the page out.

Set `SITE_URL` (for example `https://example.com`) when building for the live domain. It turns
on canonical links, share images, Pinterest Save buttons, structured data, the sitemap and the
RSS feed. `pnpm build:test` builds the sample content into `apps/web/dist-test` for the
browser tests; that folder is never deployed.

Headings use Fraunces (SIL Open Font License), trimmed to the characters and styles the site
uses by `scripts/subset-fonts.sh`.

## The admin

The admin (`apps/cms`, Payload with SQLite) runs only on this Mac, at
http://127.0.0.1:3000/admin. Everything on the site is edited there: patterns, categories and
their icons, the journal, About, Privacy and Terms, the homepage and list page words, photos,
PDFs, Etsy and Pinterest links, social accounts, ads and site settings.

```bash
pnpm --filter @crochet-simple/cms setup:mac   # once: build the admin, start it at login, back up nightly
pnpm --filter @crochet-simple/cms remove:mac  # undo the above (content is kept)
pnpm --filter @crochet-simple/cms backup      # back up now
pnpm --filter @crochet-simple/cms reset-password <username> <new password>
```

The first visit asks you to create the admin user. **Publish now** on the dashboard backs up,
collects everything that is published (drafts stay private), checks it, and builds the site
into `apps/web/dist`. Problems are explained in plain words and stop the publish without
touching the last good build.

Your data lives in `apps/cms/data` (database) and `apps/cms/media` (uploads); neither is in git.
Backups are dated folders in `~/Crochet Simple Backups` (or `BACKUP_DIR`), one per publish and
one every night at 3:00; unchanged files are shared between backups, and the last 30 are kept.
Copy that folder somewhere else (an external drive or Time Machine) as well.

## Going online

The site is served by Cloudflare (Workers static assets, `apps/web/wrangler.jsonc`). Publish
puts it online when both are set:

1. **Website address** in the admin's Site settings (for example `https://crochet.houdaifa.dev`),
   which is also the address Cloudflare serves.
2. A Cloudflare API token (template "Edit Cloudflare Workers", limited to your account and
   domain), saved with `pnpm --filter @crochet-simple/cms cloudflare-key` after copying it.
   It is stored in `apps/cms/.env`, never in git or on the website.

Until "Show in Google" is switched on in Site settings, every page says `noindex` and
`robots.txt` keeps crawlers out, so a test address is never indexed. GitHub runs `check` on
every push (Chromium, WebKit, Firefox and the admin); timing tests run locally.

Changing the admin's fields needs a migration: `pnpm --filter @crochet-simple/cms payload
migrate:create <name>`; the admin applies it on its next start.
