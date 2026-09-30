# Decision log

Newest first. Each entry: date, decision, reason.

- **2026-09-30 — The dark line is rendered in short pieces; the guide stays one path.**
  Measured in iOS Safari (iPhone 17 simulator): WebKit restarts a dash pattern every ~256
  path points, so revealing one long path with a dash draws the line in the wrong places on
  every iPhone (`docs/evidence/step-1/ios-safari-01…03`). Owner chose: route and faint guide
  = one path with one `M` and no `Z`; dark line = ≤ 128-point pieces of that route sharing
  exact joint vertices. Bonus: only the piece under the tip repaints per frame.
- **2026-09-30 — The tip is a disc placed from the length table, not a dash.** Within a
  ≤ 128-point piece, browser and table agree to hundredths of a pixel. Measured
  tip-to-line-end: iOS Safari median 0.013 px, max 0.58 px (23 samples); Playwright WebKit
  ≤ 0.43 px at 1×, ≤ 0.19 px at 2–3×; Chromium ≤ 0.39 px at 1×, ≤ 0.18 px at 2–3×.
- **2026-09-30 — Rejected: a single dashed path with finer or coarser flattening.** Even in
  Chromium, float32 length accumulation along a ~100k px route put the dash end up to 1.6 px
  from the table's point; changing the tolerance only moved the error around.
- **2026-09-30 — Scroll map = visibility corridor + projection, capped at 48 px of line per
  px of scroll.** A first clamp-only version produced jumps of up to 6,387 px of line at a
  single scroll position; the projection makes jumps impossible by construction.
- **2026-09-30 — TypeScript pinned to 6.0.** `@astrojs/check` supports TypeScript 5–6 only.
- **2026-09-30 — Firefox browser tests run in CI, not locally.** Playwright 1.63's Firefox
  fails to launch on macOS 27 ("Could not find profile folder").

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
