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
import { buildScrollMap } from '../src/scroll-map.ts';
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

  it('never crosses the text under a photo', () => {
    for (const { id, text } of story.layout.chapters) {
      if (!text) continue;
      for (let i = 0; i < poly.count; i++) {
        const x = poly.xs[i] as number;
        const y = poly.ys[i] as number;
        const inside =
          x > text.x - 2 &&
          x < text.x + text.width + 2 &&
          y > text.y - 2 &&
          y < text.y + text.height + 2;
        expect(inside, `${id} text crossed at (${x}, ${y})`).toBe(false);
      }
    }
  });

  it('decorates each transition with its own crochet flourish', () => {
    expect(PRODUCT_ORDER.map((id) => loopsIn(route, id))).toEqual([0, 1, 4, 3, 2, 1, 1]);
  });
});

describe('route start', () => {
  it('drops past the scroll cue when the cue reaches under the yarn start', () => {
    const story = phoneStory();
    const cue = { x: 24, y: 560, width: 300, height: 44 };
    const route = buildRoute({ ...story.layout, startClear: cue });
    const poly = flatten(route.commands);
    for (let i = 0; i < poly.count; i++) {
      const x = poly.xs[i] as number;
      const y = poly.ys[i] as number;
      const inside = x > cue.x && x < cue.x + cue.width && y > cue.y && y < cue.y + cue.height;
      expect(inside, `cue crossed at ${x},${y}`).toBe(false);
    }
    assertRouteStructure(route);
    expect(() => buildScrollMap(poly, route, story.policy)).not.toThrow();
  });

  it('leaves the start alone when the cue is well to the side', () => {
    const story = phoneStory();
    const plain = buildRoute(story.layout);
    const withCue = buildRoute({
      ...story.layout,
      startClear: { x: 24, y: 560, width: 120, height: 44 },
    });
    expect(withCue.commands).toEqual(plain.commands);
  });
});

describe('route leaving a sideways strand', () => {
  // the sharpest bend in any 40 px of the first curve out of the strand, in degrees
  function sharpestStartBend(route: Route): number {
    const poly = flatten(route.commands);
    const end = poly.commandEnds[1] as number;
    const heading: number[] = [];
    const at: number[] = [];
    for (let i = 1; i < poly.count && (poly.lengths[i] as number) <= end; i++) {
      const dx = (poly.xs[i] as number) - (poly.xs[i - 1] as number);
      const dy = (poly.ys[i] as number) - (poly.ys[i - 1] as number);
      if (Math.hypot(dx, dy) < 1e-6) continue;
      heading.push(Math.atan2(dy, dx));
      at.push(poly.lengths[i] as number);
    }
    let worst = 0;
    for (let i = 0; i < heading.length; i++) {
      let turn = 0;
      for (let j = i + 1; j < heading.length && (at[j] as number) - (at[i] as number) <= 40; j++) {
        let d = (heading[j] as number) - (heading[j - 1] as number);
        d = Math.atan2(Math.sin(d), Math.cos(d));
        turn += d;
        worst = Math.max(worst, Math.abs(turn));
      }
    }
    return (worst * 180) / Math.PI;
  }

  it.each(TEST_STORIES.map((make) => make()))(
    'carries on from it and bends gently on $name',
    (story) => {
      const layout = { ...story.layout, yarnDirection: { x: 0.94, y: -0.34 } };
      const route = buildRoute(layout);
      const [dx, dy] = leaving(route.commands, 1);
      expect(dx * 0.94 + dy * -0.34).toBeGreaterThan(0.99);
      expect(sharpestStartBend(route)).toBeLessThan(90);
      expect(() => buildScrollMap(flatten(route.commands), route, story.policy)).not.toThrow();
    },
  );
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
