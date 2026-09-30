# CLAUDE.md — Crochet Simple

Production website for a crochet pattern and journal brand, with a cinematic one-thread
homepage. Read `docs/plan.md` (approved plan), `docs/audit.md` (measured problems in the old
prototype) and `docs/decisions.md` before changing anything.

## Non-negotiable rules

1. **Route invariant.** The homepage yarn route has exactly one `M` and no `Z`/`z`, no pen
   lifts, and the seven products in this order: bag, daisy, cozy, pouch, laptop, hat, panda.
   Both rendered paths (guide and drawn line) obey it. Tests enforce it; never weaken them.
2. **Approved assets are read-only.** `packages/artwork/drawings/*` and
   `apps/web/src/assets/story/*` are verified by `pnpm check:assets`
   (`packages/artwork/approved-assets.sha256`). Never redraw, regenerate, recompress in place,
   or replace them. New or replacement artwork/photos come from the owner: stop and ask with
   an exact brief (subject, angle, light, background, colours, aspect ratio, size).
3. **One geometry source.** Line, guide and tip come from one flattened polyline and one
   cumulative length table. No `getPointAtLength()` in the scroll path, no offsets that hide a
   coordinate mismatch, no time-based easing of the drawing.
4. **Native scrolling only.** No wheel/touch interception, `preventDefault` on scroll input,
   scroll snapping, smooth-scroll libraries or pinning in the story.
5. **No fake content.** No placeholder patterns, invented reviews, ratings, prices or claims.
   Homepage photos are AI-generated designs; copy must not call them photos of finished
   handmade pieces. Test fixtures never ship to production.
6. **Phone first.** Design and verify at 360–430 px before desktop.
7. **Evidence over claims.** Report measured results (screenshots, videos, frame timings,
   Lighthouse) and list anything not verified.

## Workflow with the owner

- Work strictly step by step (see `docs/plan.md`). After each step: stop, report what was
  done with evidence and what is not good enough, and wait for the owner's "go".
- Show a design preview and get approval before building any major visual piece.
- Be strict and candid about quality; say plainly when something is not good and fix it.
- Explain in plain English; the owner is not a developer.
- Branch per step, open a pull request, keep `main` releasable. Commit messages end with the
  attribution line required by the environment.

## Layout

```
apps/web/            Astro 7 public site (static output)
apps/cms/            Payload 3 admin + SQLite (runs locally)
packages/artwork/    approved drawings, route builder, geometry, invariant checks
packages/shared/     content types and validation shared by web and cms
scripts/             export, publish, backup, measurement
tests/               Vitest + Playwright
docs/                plan, audit, decisions, reference prototype, evidence
```

Folders appear as their step is built; this map is the target.

## Commands

| Command                             | Purpose                                                |
| ----------------------------------- | ------------------------------------------------------ |
| `pnpm install`                      | Install dependencies (Node 24, pnpm 12)                |
| `pnpm check:assets`                 | Verify approved photos and drawings are byte-identical |
| `pnpm format` / `pnpm format:check` | Prettier                                               |

More commands are added as each step lands; keep this table current.

## Status

| Step                                    | State           |
| --------------------------------------- | --------------- |
| 0 — Clean-up, repo, structure, docs     | Done 2026-09-30 |
| 1 — Geometry engine and invariant tests | Next            |
| 2 — Homepage design preview             | —               |
| 3 — Homepage build                      | —               |
| 4 — Admin                               | —               |
| 5 — Content pages, SEO, ads             | —               |
| 6 — Deploy                              | —               |
| 7 — Full test report                    | —               |

## Work log

- **2026-09-30** — Step 0. Moved ~445 MB of unused prototypes, images and videos to the macOS
  Trash (`docs/cleanup-2026-09-30.md`). Relocated the 8 approved photos and 7 approved drawings,
  added checksums, root tooling, docs, `AGENTS.md`, private GitHub repo `Houdaifa1/crochet-simple`.
