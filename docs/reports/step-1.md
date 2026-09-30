# Step 1 report — drawing engine

Date: 2026-09-30. Branch: `step-1-drawing-engine`.

## What was built

`packages/artwork` (TypeScript, no runtime dependencies):

| Module          | Role                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `catalog.ts`    | The seven approved drawings (commands, viewBox) in approved order, validated on load                                                                   |
| `commands.ts`   | `PathBuilder` (a second `M` or a `Z` cannot be expressed), path parsing and formatting                                                                 |
| `placement.ts`  | Uniform "meet" fit of a drawing into its layout box (never stretched or clipped)                                                                       |
| `connectors.ts` | Crochet flourishes between products: sweep, loop, chain, rosette, bow, swirl; every join tangent-continuous; control points kept inside the page edges |
| `route.ts`      | One route: yarn strand → per product (connector, drawing, two-sided photo wrap) → tail                                                                 |
| `polyline.ts`   | Flattening (≤ 0.1 px from the curves), cumulative length table, point lookup                                                                           |
| `scroll-map.ts` | Drawn length as a pure function of scroll position                                                                                                     |
| `pieces.ts`     | Dark-line pieces (≤ 128 points, shared joints) and minimal per-frame updates                                                                           |
| `invariants.ts` | One `M` / no `Z` checks, route structure and product order                                                                                             |

## Measured results

### Rules (unit tests, 104 passing)

- The 8 photos and 21 drawing files are byte-identical to the approved versions; each
  drawing's generator reproduces its files exactly; command counts unchanged (AirPods 690,
  panda 1,025).
- Route: exactly one `M`, no `Z`, products in order, every approved drawing contained
  unchanged apart from its uniform fit, all seams smooth (< 1° turn), never outside the page
  edges, never crossing a product photo.
- Guide path: one `M`, no `Z`. Pieces: ≤ 128 points each, joints identical to 0 px, together
  exactly the route's points and length.
- Scroll map: nothing drawn before the start, all drawn at the end, never moves backwards
  while scrolling down, identical drawing for the same position regardless of direction or
  order (4,000 random positions), tip always on screen, no jumps (max 48 px of line per px of
  scroll).
- Scroll per drawing on the phone test layout: 443–553 px; desktop: 378–511 px.
- Rebuild of route + flattening + scroll map: ~4 ms (phone 48,109 points; desktop 54,946).

### Tip against the end of the drawn line (real screenshots)

Sub-pixel edge integration on straight stretches; 23 samples spread along the whole route.

| Browser                          | Density      | Median         | Max                   |
| -------------------------------- | ------------ | -------------- | --------------------- |
| iOS Safari (iPhone 17 simulator) | 3×           | 0.013 px       | 0.578 px              |
| WebKit (Playwright)              | 1× / 2× / 3× | 0.010–0.034 px | 0.43 / 0.19 / 0.18 px |
| Chromium (Playwright)            | 1× / 2× / 3× | 0.019–0.076 px | 0.39 / 0.18 / 0.07 px |

Tolerance: 0.75 px. The old prototype measured 14–40+ px (see `docs/audit.md`).

### Scrolling cost (Chromium, 4× CPU throttle, phone at 3×, wheel input)

| Phase     | p50     | p95     | max     |
| --------- | ------- | ------- | ------- |
| slow down | 16.7 ms | 16.7 ms | 16.8 ms |
| fast down | 16.7 ms | 16.7 ms | 16.8 ms |
| fast up   | 16.7 ms | 16.7 ms | 33.3 ms |
| slow up   | 16.7 ms | 16.7 ms | 16.8 ms |

Long tasks while scrolling: none. First build (all geometry + DOM) took 126 ms at 4×
throttle.

## Findings

1. **iOS Safari cannot dash-reveal a long path.** WebKit restarts the dash pattern roughly
   every 256 path points (`evidence/step-1/ios-safari-02-dash-limit-256-points.png`). A single
   dashed route, as in the old prototype and Lemonade, draws in the wrong places on iPhones.
   Fix, chosen by the owner: guide = one path; dark line = short pieces.
2. **A single dashed path also drifts in Chromium** on a long route (up to 1.6 px) because
   lengths accumulate in 32-bit floats. The pieces keep each dash short.
3. **Layout rule:** at the 48 px/px speed limit, the densest drawings need their box to be at
   most ≈ 51 % of the viewport height on desktop and ≈ 52 % on phones. The engine rejects a
   layout that breaks it, naming the product.

## Not yet verified / limitations

- Firefox: cannot launch locally (Playwright 1.63 on macOS 27); covered in CI in step 7.
- Performance is measured in headless Chromium with CPU throttling; real-phone GPU raster and
  Safari scrolling smoothness will be measured on the real homepage in step 3.
- Geometry was tested on representative phone and desktop test layouts, not the final
  design; step 3 derives the boxes from the real page.
- The 126 ms first build is acceptable at load but would be a noticeable pause on an
  orientation change on slow phones; step 3 will rebuild without blocking.
- The white-ringed 9 px tip can cover small details (for example the pouch button); its size
  is a step 2 design decision.

## Evidence

`docs/evidence/step-1/`: iOS Safari screenshots (dash failure, 256-point limit, pieces
drawing correctly, bag and pouch mid-drawing) and the accuracy JSON reports.
