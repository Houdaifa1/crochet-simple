import { describe, expect, it } from 'vitest';
import { DRAWINGS } from '../src/catalog.ts';
import { PathBuilder, parsePathData, type PathCommand } from '../src/commands.ts';
import { assertSingleLinePathData } from '../src/invariants.ts';
import { placeDrawing } from '../src/placement.ts';
import {
  DEFAULT_FLATTEN,
  flatten,
  indexAtLength,
  pointAtLength,
  polylinePathData,
} from '../src/polyline.ts';

function distanceToPolyline(
  xs: Float64Array,
  ys: Float64Array,
  from: number,
  to: number,
  px: number,
  py: number,
): number {
  let best = Infinity;
  for (let i = from; i < to; i++) {
    const ax = xs[i] as number;
    const ay = ys[i] as number;
    const bx = xs[i + 1] as number;
    const by = ys[i + 1] as number;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    best = Math.min(best, Math.hypot(px - (ax + t * dx), py - (ay + t * dy)));
  }
  return best;
}

function curvePoint(prev: [number, number], c: PathCommand, t: number): [number, number] {
  const u = 1 - t;
  if (c[0] === 'C') {
    return [
      u * u * u * prev[0] + 3 * u * u * t * c[1] + 3 * u * t * t * c[3] + t * t * t * c[5],
      u * u * u * prev[1] + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t * t * t * c[6],
    ];
  }
  if (c[0] === 'Q') {
    return [
      u * u * prev[0] + 2 * u * t * c[1] + t * t * c[3],
      u * u * prev[1] + 2 * u * t * c[2] + t * t * c[4],
    ];
  }
  return [prev[0] + (c[1] - prev[0]) * t, prev[1] + (c[2] - prev[1]) * t];
}

describe('flatten', () => {
  it('measures straight segments exactly', () => {
    const cmds = new PathBuilder()
      .moveTo({ x: 0, y: 0 })
      .lineTo({ x: 30, y: 40 })
      .lineTo({ x: 30, y: 100 })
      .toCommands();
    const poly = flatten(cmds);
    expect(poly.total).toBe(110);
    expect([...poly.lengths]).toEqual([0, 50, 110]);
    expect(pointAtLength(poly, 25)).toEqual({ x: 15, y: 20 });
    expect(pointAtLength(poly, 80)).toEqual({ x: 30, y: 70 });
    expect(pointAtLength(poly, -5)).toEqual({ x: 0, y: 0 });
    expect(pointAtLength(poly, 999)).toEqual({ x: 30, y: 100 });
  });

  it('rejects a second M (pen lift)', () => {
    expect(() =>
      flatten([
        ['M', 0, 0],
        ['L', 1, 1],
        ['M', 5, 5],
        ['L', 6, 6],
      ]),
    ).toThrow(/pen lift/);
  });

  it.each(DRAWINGS)(
    '$id stays within tolerance of the approved curves at homepage scale',
    (drawing) => {
      const placed = placeDrawing(drawing, { x: 0, y: 0, width: 420, height: 420 });
      const commands: PathCommand[] = [['M', placed.entry.x, placed.entry.y], ...placed.body];
      const poly = flatten(commands);
      const rounding = 0.5 * 10 ** -DEFAULT_FLATTEN.fractionDigits * Math.SQRT2;
      let worst = 0;
      let prev: [number, number] = [placed.entry.x, placed.entry.y];
      for (let i = 1; i < commands.length; i++) {
        const c = commands[i] as PathCommand;
        const from = indexAtLength(poly, poly.commandEnds[i - 1] as number);
        const to = indexAtLength(poly, poly.commandEnds[i] as number);
        for (let s = 0; s <= 32; s++) {
          const [px, py] = curvePoint(prev, c, s / 32);
          worst = Math.max(
            worst,
            distanceToPolyline(poly.xs, poly.ys, from, Math.max(to, from + 1), px, py),
          );
        }
        prev = [c[c.length - 2] as number, c[c.length - 1] as number];
      }
      expect(worst).toBeLessThanOrEqual(DEFAULT_FLATTEN.tolerance + rounding + 1e-9);
    },
  );

  it('serialises to one M, and the text measures exactly like the table', () => {
    const drawing = DRAWINGS[0]!;
    const placed = placeDrawing(drawing, { x: 10, y: 10, width: 400, height: 400 });
    const poly = flatten([['M', placed.entry.x, placed.entry.y], ...placed.body]);
    const d = polylinePathData(poly);
    assertSingleLinePathData(d, 'polyline');
    const parsed = parsePathData(d);
    expect(parsed).toHaveLength(poly.count);
    let length = 0;
    for (let i = 1; i < parsed.length; i++) {
      const a = parsed[i - 1] as PathCommand;
      const b = parsed[i] as PathCommand;
      length += Math.hypot(
        (b[1] as number) - (a[1] as number),
        (b[2] as number) - (a[2] as number),
      );
      expect(length).toBeCloseTo(poly.lengths[i] as number, 9);
    }
  });
});
