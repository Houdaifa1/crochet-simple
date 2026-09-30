# AGENTS.md — rules for any coding agent in this repository

This repository is maintained primarily with Claude Code; `CLAUDE.md` is the source of truth
for rules, layout, commands and status. Read it, plus `docs/plan.md`, before any change.

Agents other than the primary builder (for example Codex) act as **reviewers** unless the
owner assigns a specific, isolated task. For an assigned task: work on its own branch, touch
only what the task needs, and open a pull request.

## Hard rules (summary of `CLAUDE.md`)

- The homepage yarn route has exactly one `M`, no `Z`/`z`, no gaps, and the products in order:
  bag, daisy, cozy, pouch, laptop, hat, panda. The faint guide renders it as one path; the
  dark line renders it as ≤ 128-point pieces with shared joints (iOS Safari limit). Never
  weaken the tests that enforce this.
- `packages/artwork/drawings/*` and `apps/web/src/assets/story/*` are approved and read-only;
  `pnpm check:assets` must pass.
- Guide, line pieces and tip share one flattened geometry and one length table. No
  `getPointAtLength()` in the scroll path, no compensating offsets, no time-based easing, no
  single long dashed path.
- Native scrolling only: no scroll interception, snapping, smooth-scroll libraries or pinning.
- No fake or placeholder content in production output.
- Phone-first; WCAG AA; no layout shift; performance budgets in `docs/plan.md`.

## Before opening a pull request

- `pnpm check` passes (assets, formatting, types, unit and browser tests).
- Describe what changed, how it was verified, and anything not verified.
