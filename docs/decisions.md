# Decision log

Newest first. Each entry: date, decision, reason.

- **2026-09-30 — Hosting target is Cloudflare Workers static assets, not Pages.** Cloudflare's
  current docs recommend Workers for new projects; static requests are free and unlimited.
- **2026-09-30 — Admin runs locally on the owner's Mac (Payload + SQLite), built to move to
  hosting without a rewrite.** Owner edits from the Mac; public site never depends on it.
- **2026-09-30 — Route is rendered from a flattened polyline and one length table.** Measured
  tip error fell from 14–40+ px to < 1 px; one path with one `M` renders at 60 fps.
- **2026-09-30 — Lemonade-style homepage (no pinning).** Owner preference; drawing tied
  directly to scroll position.
- **2026-09-30 — Brand name "Crochet Simple" (working).** Owner choice; similar existing
  names (Simply Crochet magazine, Simple Things Crochet) noted. Check domain, Etsy and USPTO
  before launch.
- **2026-09-30 — Homepage photos are AI-generated designs.** Copy must not present them as
  photos of finished handmade pieces.
- **2026-09-30 — Headings use Fraunces (self-hosted); body uses the system UI font.** Brand
  character for ~35 KB, no layout shift; body text stays native and fast.
- **2026-09-30 — Codex, if used, reviews pull requests; it does not co-build.** One geometry
  core and one design system need one owner.
