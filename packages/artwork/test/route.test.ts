import { describe, expect, it } from 'vitest';
import { PRODUCT_ORDER } from '../src/catalog.ts';
import {
  PathBuilder,
  endPoint,
  parsePathData,
  toPathData,
  type PathCommand,
} from '../src/commands.ts';
import { assertRouteStructure, assertSingleLinePathData } from '../src/invariants.ts';
import { flatten, polylinePathData } from '../src/polyline.ts';
import { buildRoute, type Route } from '../src/route.ts';
import { TEST_STORIES, phoneStory } from './fixtures/layouts.ts';

function leaving(commands: readonly PathCommand[], i: number): [number, number] {
  const from = endPoint(commands[i - 1] as PathCommand);
  const c = commands[i] as PathCommand;
  const [x, y] = [c[1] as number, c[2] as number];
  const m = Math.hypot(x - from.x, y - from.y);
  return [(x - from.x) / m, (y - from.y) / m];
}

function arriving(commands: readonly PathCommand[], i: number): [number, number] {
  const c = commands[i] as PathCommand;
  const n = c.length;
  const end = [c[n - 2] as number, c[n - 1] as number];
  const prev =
    n > 3
      ? [c[n - 4] as number, c[n - 3] as number]
      : [endPoint(commands[i - 1] as PathCommand).x, endPoint(commands[i - 1] as PathCommand).y];
  const m = Math.hypot(end[0]! - prev[0]!, end[1]! - prev[1]!);
  return [(end[0]! - prev[0]!) / m, (end[1]! - prev[1]!) / m];
}

const loopsIn = (route: Route, chapter: string): number => {
  const seg = route.segments.find((s) => s.kind === 'connector' && s.chapter === chapter)!;
  let loops = 0;
  for (let i = seg.startCommand; i < seg.endCommand; i++) {
    const c = route.commands[i] as PathCommand;
    const start = endPoint(route.commands[i - 1] as PathCommand);
    const end = endPoint(c);
    if (c[0] === 'C' && Math.hypot(start.x - end.x, start.y - end.y) < 1e-9) loops++;
  }
  return loops;
};

describe.each(TEST_STORIES.map((make) => make()))('route on $name', (story) => {
  const route = buildRoute(story.layout);
  const poly = flatten(route.commands);

  it('is one line: exactly one M, no Z, products in order', () => {
    assertRouteStructure(route);
    assertSingleLinePathData(toPathData(route.commands), 'route');
    assertSingleLinePathData(polylinePathData(poly), 'polyline');
    expect(route.placements.map((p) => p.id)).toEqual([...PRODUCT_ORDER]);
  });

  it('contains every approved drawing unchanged apart from its uniform fit', () => {
    for (const placed of route.placements) {
      const seg = route.segments.find((s) => s.kind === 'drawing' && s.chapter === placed.id)!;
      expect(route.commands.slice(seg.startCommand, seg.endCommand)).toEqual(placed.body);
      const before = endPoint(route.commands[seg.startCommand - 1] as PathCommand);
      expect(before).toEqual(placed.entry);
    }
  });

  it('joins every segment smoothly (no corners at connector, drawing and wrap seams)', () => {
    for (const seg of route.segments.slice(1)) {
      if (seg.endCommand === seg.startCommand) continue;
      const a = arriving(route.commands, seg.startCommand - 1);
      const b = leaving(route.commands, seg.startCommand);
      const angle = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1]));
      expect(angle, `${seg.kind}:${seg.chapter}`).toBeLessThan((1 * Math.PI) / 180);
    }
  });

  it('stays inside the story width', () => {
    const { edgeMargin, width } = story.layout;
    for (let i = 0; i < poly.count; i++) {
      expect(poly.xs[i]).toBeGreaterThanOrEqual(edgeMargin - 0.01);
      expect(poly.xs[i]).toBeLessThanOrEqual(width - edgeMargin + 0.01);
    }
  });

  it('never crosses a product photo', () => {
    for (const { id, photo } of story.layout.chapters) {
      for (let i = 0; i < poly.count; i++) {
        const x = poly.xs[i] as number;
        const y = poly.ys[i] as number;
        const inside =
          x > photo.x + 0.5 &&
          x < photo.x + photo.width - 0.5 &&
          y > photo.y + 0.5 &&
          y < photo.y + photo.height - 0.5;
        expect(inside, `${id} photo crossed at (${x}, ${y})`).toBe(false);
      }
    }
  });

  it('decorates each transition with its own crochet flourish', () => {
    expect(PRODUCT_ORDER.map((id) => loopsIn(route, id))).toEqual([0, 1, 4, 3, 2, 1, 1]);
  });
});

describe('route rules', () => {
  it('refuses products out of order', () => {
    const story = phoneStory();
    const chapters = [...story.layout.chapters];
    [chapters[0], chapters[1]] = [chapters[1]!, chapters[0]!];
    expect(() => buildRoute({ ...story.layout, chapters })).toThrow(/Products must be/);
  });

  it('refuses a missing product', () => {
    const story = phoneStory();
    expect(() =>
      buildRoute({ ...story.layout, chapters: story.layout.chapters.slice(0, 6) }),
    ).toThrow(/Products must be/);
  });

  it('refuses a wrap on the far side of the photo', () => {
    const story = phoneStory();
    const chapters = story.layout.chapters.map((c, i) =>
      i === 0
        ? {
            ...c,
            art: { ...c.art, x: 0, width: 20 },
            photo: { ...c.photo, x: 200 },
            wrapSide: 'right' as const,
          }
        : c,
    );
    expect(() => buildRoute({ ...story.layout, chapters })).toThrow(/wrap the left side/);
  });

  it('makes a second M impossible', () => {
    const ink = new PathBuilder().moveTo({ x: 0, y: 0 }).lineTo({ x: 1, y: 1 });
    expect(() => ink.moveTo({ x: 5, y: 5 })).toThrow(/only once/);
  });

  it('rejects Z and relative commands in path data', () => {
    expect(() => parsePathData('M0,0 L10,10 Z')).toThrow(/Unsupported/);
    expect(() => parsePathData('M0,0 l10,10')).toThrow(/Unsupported/);
    expect(() => assertSingleLinePathData('M0,0 L1,1 M2,2 L3,3')).toThrow(/exactly one M/);
    expect(() => assertSingleLinePathData('M0,0 L1,1 z')).toThrow(/unexpected/);
  });
});
