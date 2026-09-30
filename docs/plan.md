# Production plan (approved 2026-09-30)

## Product

**Crochet Simple** (working brand name; one setting). A visually led crochet site:

- **Home**: one yarn line starts at the yarn photo and traces seven approved pieces in order:
  blue market bag → daisy clip → olive cup cozy → AirPods pouch → laptop sleeve → bucket hat
  with wooden stand → crochet panda. The homepage photos are AI-generated designs, so copy
  calls them designs, never photos of finished handmade pieces.
- **Patterns**: grid (cover, title, short description), search, category and Free/Paid
  filters, category pages. Pattern pages are mini blog posts: photos, text, PDF download for
  free patterns, optional Etsy link on any pattern. No difficulty field. Nothing is sold on
  the site; paid patterns link to Etsy.
- **Journal**: studio news and posts, separate from patterns.
- **About**, **Contact** (hidden until an email is set), **Privacy**, **Terms**, **Cookies**,
  **Disclosure** (US-focused drafts; not legal advice).
- English (en-US). Audience mostly on phones: phone-first design and testing.

## Homepage motion (owner decisions)

- Lemonade style: nothing pins; drawings scroll with the page while traced.
- Drawn length is a pure, monotonic function of scroll position: fast scroll draws fast,
  slow scroll traces slowly, reverse rewinds exactly. No easing, lag or catch-up.
- Faint guide of the whole route under the dark line.
- Dark line stays when scrolling down; retracts into the guide (soft fade at its end) when
  scrolling up.
- Yarn wraps two sides of each photo; a different decorative connector between each pair of
  products (chain stitch loops, cursive swirl, magic ring spiral, bow/knot, …).
- Photos fade in once and stay shown.
- Per-product background tints with soft accent shapes, short smooth blends (homepage only):

| Section | Main      | Accents                       |
| ------- | --------- | ----------------------------- |
| Intro   | `#EDE3D3` | `#D9D3E8` `#E6C9B6`           |
| Bag     | `#CFDDF7` | `#B7CBF1` `#F4B9B9` `#F0C7B0` |
| Daisy   | `#FBEAB0` | `#F7DC8C` `#D4E3B5` `#CFE2F0` |
| Cozy    | `#D6E2BE` | `#C3D3A4` `#F3E7CC` `#E9CFAE` |
| Pouch   | `#E8D5BB` | `#DCC3A2` `#EFD9A0`           |
| Laptop  | `#D3D9E0` | `#BFC8D3` `#EACDA8`           |
| Hat     | `#F8CBD6` | `#F5B3C8` `#FBD0B0`           |
| Panda   | `#F1ECE2` | `#DCD8D1` `#E8D3BD`           |
| Ending  | `#EDE3D3` | —                             |

Tip: pink `#ff2f83` dot with a thin white ring so it reads on the pink section.

## Geometry model

1. One SVG in normal flow over the whole story; 1 SVG unit = 1 CSS px. No panes, no `<use>`.
2. One route built from layout: yarn strand → per product (connector, approved drawing scaled
   uniformly "meet" into its box, two-sided photo wrap) → tail. Build fails unless: exactly
   one `M`, no `Z`/`z`, seven products in order, no gaps, all coordinates finite.
3. Flatten to straight segments (≤ 0.12 CSS px from the curves) + cumulative length table.
   Guide, dark line (single path, one `M`, dash-revealed) and tip all use this table.
4. Scroll map: piecewise-linear table from scroll position to drawn length, built at layout
   time; each drawing is fully traced while it crosses the middle band of the viewport.
   Per frame: two binary searches, one style write, one attribute write.
5. Width changes rebuild geometry and restore the reader's story position; height-only
   changes (mobile address bar) do not rebuild.
6. Reduced motion / no JavaScript: complete static drawings, no tip, no effects; all text and
   photos are HTML.

## Architecture

pnpm monorepo, TypeScript throughout.

| Path               | Role                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`         | Astro 7, fully pre-rendered public site; homepage story script in TypeScript; modern scoped CSS                                         |
| `apps/cms`         | Payload 3 (Next.js 16) admin, SQLite via `@payloadcms/db-sqlite`, Lexical rich text; runs on the owner's Mac, portable to hosting later |
| `packages/artwork` | Approved drawings, route builder, flattening, scroll map, invariant checks                                                              |
| `packages/shared`  | Content types and validation shared by web and cms                                                                                      |
| `scripts/`         | Export, publish, backup, measurement                                                                                                    |
| `tests/`           | Vitest (geometry) and Playwright (browsers)                                                                                             |

Libraries: astro, @astrojs/sitemap, sharp, pagefind, payload + @payloadcms/{next,db-sqlite,
richtext-lexical}, wrangler, typescript, vitest, @playwright/test, @axe-core/playwright,
lighthouse, prettier, Fraunces (self-hosted font package), Lucide icons (per-icon import).
Not used: scroll-hijacking or smooth-scroll libraries, scroll snapping, React on public pages,
UI templates.

Hosting: Cloudflare Workers static assets (Cloudflare's recommendation for new projects;
free; 20,000 files, 25 MiB per file). Publish: export content → build → checks → deploy.
Backups: database and original media after each publish and nightly (iCloud Drive until
Cloudflare R2 is connected).

## SEO, performance, accessibility, ads

- Targets (Lighthouse mobile): LCP < 2.0 s, CLS < 0.02, INP < 100 ms, no > 50 ms tasks while
  scrolling under 4× CPU throttle; 60 fps (120 fps on 120 Hz screens).
- AVIF/WebP responsive images with explicit dimensions; prefetch; cross-document view
  transitions where supported; only third-party script on the homepage is Cloudflare Web
  Analytics.
- Titles/descriptions, canonical URLs (after domain), Open Graph, sitemap, robots, RSS,
  JSON-LD (WebSite, Organization, Article/BlogPosting, BreadcrumbList). No HowTo (not
  supported by Google), no fabricated ratings, reviews or prices.
- WCAG AA contrast, semantic landmarks, skip link, keyboard navigation, visible focus,
  required alt text, reduced motion, 44 px touch targets, ≥ 16 px body text on phones.
- AdSense-ready: slots only on pattern and journal pages, reserved space, never on the
  homepage story or next to download/Etsy buttons; Google-certified consent for EEA/UK/CH;
  `ads.txt`; off until a publisher ID is set. Approval is Google's decision.

## Steps (one at a time; stop, report with evidence, wait for "go")

| Step | Work                                                              |
| ---- | ----------------------------------------------------------------- |
| 0    | Clean-up, repo, structure, CLAUDE.md, AGENTS.md                   |
| 1    | Geometry engine and invariant tests                               |
| 2    | Homepage design preview → owner approval                          |
| 3    | Homepage build                                                    |
| 4    | Admin (Payload)                                                   |
| 5    | Patterns, Journal, About, legal pages, SEO outputs, ad components |
| 6    | Deploy to Cloudflare                                              |
| 7    | Full browser test pass and report                                 |

Owner-provided later: domain, Cloudflare account, AdSense publisher ID, contact email, Etsy
shop URL, real patterns and posts. Each is a setting; the features are built and tested
before handover.

## Browser test plan

Chromium, WebKit and Firefox (Playwright), the owner's Chrome, Safari in the iOS Simulator,
Android emulation with 4× CPU throttle, and the owner's phone on the preview URL. Widths 360,
390, 430, 768, 1280, 1440, 1920; DPR 1/2/3; both orientations. Slow, fast and reverse
scrolling through the intro, all seven products and the ending. Automated: tip-to-line error
≤ 1 CSS px, determinism (same position down vs up), frame timing and long tasks, CLS, resize
mid-drawing, address-bar height changes, one `M`/no `Z` on both paths, product order, no
console errors, axe, Lighthouse, sitemap/head/JSON-LD validation. Evidence: screenshots and
videos.
