# Audit of the approval prototype — 2026-09-30

Subject: `docs/reference/prototype-line-story.html` (the approved look, not production code).
Browsers: the owner's Google Chrome (1470 px wide window) and the Claude in-app Chromium
browser at 1440 × 900 and 390 × 844. Safari, Firefox and physical phones were not part of
this audit; they are part of the production test plan.

## Verified problems (measured)

### 1. The pink tip drifts away from the visible line

Method: render the route's own dash as a tiny dot at a given length (SVG rasterised to a
canvas), find its centroid, and compare it with `getPointAtLength()` for the same length,
which is where the prototype places the tip. Validated on a straight line and a single cubic
curve: 0 px error.

| Route prefix           | Error between rendered line end and tip |
| ---------------------- | --------------------------------------- |
| first 20 commands      | < 1 px                                  |
| first 100 commands     | ~3 px                                   |
| first 400 commands     | 10–16 px                                |
| first 3,000 commands   | 23–38 px                                |
| full route, 40 samples | median 14–23 px, max > 40 px            |

The error changes with raster scale (1× vs 2×), so device pixel ratio, zoom and resizing
change it. Screenshots: `audit/01-tip-off-line-airpods-desktop.jpg`,
`audit/02-tip-off-line-airpods-zoom.png` (tip ~50 px from the line end, inside the lid),
`audit/05-tip-off-line-phone.jpg` (same at phone size).

### 2. Scrolling stutters and feels blocked

- `getPointAtLength()` on the 8,605-command route costs 16–30 ms per call in Chrome, growing
  with distance along the path. The prototype calls it every scroll frame (budget: 16.7 ms).
- Real mouse-wheel scrolling through the AirPods → hat chapters: 12 long tasks of 55–121 ms,
  median frame interval 83 ms (~12 fps).
- Captured unpainted frames: `audit/03-scroll-jank-unpainted-header.jpg`,
  `audit/04-scroll-jank-blank-frame.jpg`.

### 3. Resizing freezes the page and moves the reader

- One resize (1440 → 390 px): a single 229 ms long task.
- The whole route is regenerated (length 85,189 → 49,054 px).
- The pixel scroll position is kept (7,295 px) while the document height changes
  (15,734 → 15,192 px), so the reader lands elsewhere in the story.

### 4. Stationary scrolling

Chapters are 200svh/250svh tall with a ~100svh sticky stage: the picture stays still for 54%
of a chapter's scroll distance (63% for the pouch and panda).

### 5. Image weight

Photos are 2.4–2.7 MB PNGs (~18 MB total); no responsive sizes or modern formats. The panda
`<img>` has no width/height (its box has an aspect ratio, so first-view CLS measured 0).

### 6. Route invariants (pass)

Exactly one `M`, zero `Z`, 8,605 commands, seven products in the approved order. The page
uses the newer AirPods (690 commands) and panda (1,025 commands) drawings, not the legacy
files; `artwork/INTEGRATION_HANDOFF.md` was stale on this.

### 7. Not a website yet

Single HTML file; no routes, sitemap, robots, social previews, structured data, package
manifest, tests or version control.

## Hypotheses (not proven)

- Drift mechanism: Chrome flattens curves with different precision for dash rendering than
  for `getPointAtLength()`; the difference accumulates over thousands of small curves and
  depends on raster scale.
- Each frame also repaints the full dashed route in two overlapping pane SVGs (`<use>`); this
  raster cost was not isolated.

## Lemonade Giveback 2019 (motion reference, measured in Chrome)

- Native scroll, no pinning, no snapping; one static SVG (viewBox 1440 × 10820).
- One 303-command path. The pink tip is a second copy of the same path (1 px dash, 12 px
  round cap), so the tip cannot drift from the line.
- A faint full-route guide sits under the dark line.
- Weaknesses: the drawing updates one scroll step late; the same scroll position produced
  different drawn lengths going down (15,709) and up (25,560); on fast scrolls the tip ended
  300–1,500 px off-screen.

## Proof of the production approach (measured in the owner's Chrome)

Route flattened to straight segments (tolerance 0.12 CSS px): 50,582 points in 6 ms.
Line and tip both derived from one cumulative length table:

| Raster scale | Median error | Max error |
| ------------ | ------------ | --------- |
| 1×           | 0.07 px      | 0.75 px   |
| 2×           | 0.05 px      | 0.78 px   |
| 3×           | 0.06 px      | 0.78 px   |

Rendering benchmark, one path with exactly one `M` (dash updated every frame while
scrolling): p50 16.7 ms, p95 17.6 ms, 0 long tasks, 0.3 ms JavaScript per frame.
Phone hardware remains to be measured.
