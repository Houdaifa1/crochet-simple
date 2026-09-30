import { describe, expect, it } from 'vitest';
import { flatten, pointAtLength } from '../src/polyline.ts';
import { buildRoute } from '../src/route.ts';
import { buildScrollMap, maxDrawRate } from '../src/scroll-map.ts';
import { TEST_STORIES } from './fixtures/layouts.ts';

// seeded so failures reproduce
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe.each(TEST_STORIES.map((make) => make()))('scroll map on $name', (story) => {
  const route = buildRoute(story.layout);
  const poly = flatten(route.commands);
  const map = buildScrollMap(poly, route, story.policy);
  const first = map.scrolls[0] as number;
  const last = map.scrolls[map.scrolls.length - 1] as number;
  const { viewportHeight: vh, topInset, marginTop, marginBottom, storyTop } = story.policy;

  it('starts with nothing drawn and ends fully drawn', () => {
    expect(map.lengthAt(-1000)).toBe(0);
    expect(map.lengthAt(first)).toBe(0);
    expect(map.lengthAt(last)).toBe(poly.total);
    expect(map.lengthAt(last + 10_000)).toBe(poly.total);
  });

  it('only moves forward as the page moves down', () => {
    let previous = -1;
    for (let s = first - 50; s <= last + 50; s += 0.5) {
      const l = map.lengthAt(s);
      expect(l).toBeGreaterThanOrEqual(previous);
      previous = l;
    }
  });

  it('gives the same drawing for the same position, in any order (reverse scroll rewinds exactly)', () => {
    const rnd = random(7);
    const positions = Array.from({ length: 4000 }, () => first + rnd() * (last - first));
    const down = [...positions].sort((a, b) => a - b).map((s) => [s, map.lengthAt(s)] as const);
    const up = [...positions].sort((a, b) => b - a).map((s) => [s, map.lengthAt(s)] as const);
    const byPos = new Map(down);
    for (const [s, l] of up) expect(l).toBe(byPos.get(s));
  });

  it('keeps the tip on screen whenever the line is drawing', () => {
    for (let s = first; s <= last; s += 2) {
      const l = map.lengthAt(s);
      if (l <= 0 || l >= poly.total) continue;
      const tipY = storyTop + pointAtLength(poly, l).y - s;
      expect(tipY).toBeGreaterThanOrEqual(topInset + marginTop - 0.5);
      expect(tipY).toBeLessThanOrEqual(vh - marginBottom + 0.5);
    }
  });

  it('never jumps: every scroll pixel draws a bounded amount of line', () => {
    const rate = maxDrawRate(map);
    console.info(`[${story.name}] fastest drawing: ${rate.toFixed(1)} px of line per px of scroll`);
    expect(rate).toBeLessThanOrEqual(story.policy.maxDrawRate + 1e-6);
  });

  it('gives each detailed drawing a generous stretch of scrolling', () => {
    const spans: Record<string, number> = {};
    for (const seg of route.segments.filter((s) => s.kind === 'drawing')) {
      const a = poly.commandEnds[seg.startCommand - 1] as number;
      const b = poly.commandEnds[seg.endCommand - 1] as number;
      const index = (l: number) => poly.lengths.findIndex((v) => v >= l);
      spans[seg.chapter as string] =
        (map.scrolls[index(b)] as number) - (map.scrolls[index(a)] as number);
    }
    console.info(
      `[${story.name}] scroll per drawing (px):`,
      Object.fromEntries(Object.entries(spans).map(([k, v]) => [k, Math.round(v)])),
    );
    for (const span of Object.values(spans)) expect(span).toBeGreaterThan(vh * 0.4);
  });

  it('is fast enough to rebuild on resize and to query every frame', () => {
    const t0 = performance.now();
    const r = buildRoute(story.layout);
    const p = flatten(r.commands);
    buildScrollMap(p, r, story.policy);
    const build = performance.now() - t0;
    const t1 = performance.now();
    let sink = 0;
    for (let i = 0; i < 100_000; i++)
      sink += pointAtLength(p, map.lengthAt(first + ((last - first) * i) / 100_000)).x;
    const perQuery = ((performance.now() - t1) / 100_000) * 1000;
    console.info(
      `[${story.name}] ${p.count} points; rebuild ${build.toFixed(1)} ms; per-frame lookup ${perQuery.toFixed(2)} µs`,
    );
    expect(sink).toBeGreaterThan(0);
    expect(build).toBeLessThan(100);
    expect(perQuery).toBeLessThan(20);
  });
});
