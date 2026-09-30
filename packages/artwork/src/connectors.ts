import type { PathBuilder } from './commands.ts';
import { add, distance, normalize, rotate, scale, sub, type Point } from './geometry.ts';

// every style is one smooth stroke, cubic curves only
export const CONNECTOR_STYLES = ['sweep', 'loop', 'chain', 'rosette', 'bow', 'swirl'] as const;

export type ConnectorStyle = (typeof CONNECTOR_STYLES)[number];

export interface XBounds {
  readonly minX: number;
  readonly maxX: number;
}

export interface ConnectorSpec extends XBounds {
  readonly to: Point;
  readonly fromDirection: Point;
  readonly toDirection: Point;
  readonly style: ConnectorStyle;
  readonly size: number;
}

const LOOP_ANGLE = Math.PI / 4;
const TENSION = 0.4;

// a cubic stays inside its control points, so bound those
function reachWithin(p: Point, vectors: readonly Point[], b: XBounds): number {
  let k = Infinity;
  for (const v of vectors) {
    if (v.x > 1e-12) k = Math.min(k, (b.maxX - p.x) / v.x);
    else if (v.x < -1e-12) k = Math.min(k, (p.x - b.minX) / -v.x);
  }
  return Math.max(0, k);
}

// handles only get shorter, never turned, to stay in bounds
export function curveTo(
  ink: PathBuilder,
  to: Point,
  fromDir: Point,
  toDir: Point,
  b: XBounds,
): void {
  const from = ink.current;
  const d = distance(from, to);
  if (d < 1e-6) return;
  const h1 = Math.min(d * TENSION, reachWithin(from, [fromDir], b));
  const h2 = Math.min(d * TENSION, reachWithin(to, [scale(toDir, -1)], b));
  ink.cubicTo(add(from, scale(fromDir, h1)), sub(to, scale(toDir, h2)), to);
}

function loopHere(ink: PathBuilder, out: Point, back: Point, size: number): void {
  const p = ink.current;
  ink.cubicTo(add(p, scale(out, size)), sub(p, scale(back, size)), p);
}

const loopVectors = (out: Point, back: Point): Point[] => [out, scale(back, -1)];

function roomierSide(spec: ConnectorSpec, p: Point, travel: Point): 1 | -1 {
  const side = rotate(travel, -Math.PI / 2);
  const roomPositive = side.x >= 0 ? spec.maxX - p.x : p.x - spec.minX;
  const roomNegative = side.x >= 0 ? p.x - spec.minX : spec.maxX - p.x;
  return roomPositive >= roomNegative ? 1 : -1;
}

export function drawConnector(ink: PathBuilder, spec: ConnectorSpec): void {
  const from = ink.current;
  const chord = distance(from, spec.to);
  if (chord < 1e-6) return;
  const travel = normalize(sub(spec.to, from));
  const mid = add(from, scale(sub(spec.to, from), 0.5));
  const plain = (): void => curveTo(ink, spec.to, spec.fromDirection, spec.toDirection, spec);
  const cap = chord * 0.35;

  switch (spec.style) {
    case 'sweep': {
      plain();
      return;
    }
    case 'loop':
    case 'swirl': {
      const hand = roomierSide(spec, mid, travel);
      const out = rotate(travel, -hand * LOOP_ANGLE);
      const back = rotate(travel, hand * LOOP_ANGLE);
      const knot =
        spec.style === 'swirl'
          ? add(mid, scale(rotate(travel, -hand * (Math.PI / 2)), -chord * 0.12))
          : mid;
      const wanted = spec.style === 'swirl' ? spec.size * 1.6 : spec.size;
      const size = Math.min(wanted, cap, reachWithin(knot, loopVectors(out, back), spec));
      if (size < 4) return plain();
      curveTo(ink, knot, spec.fromDirection, out, spec);
      loopHere(ink, out, back, size);
      curveTo(ink, spec.to, back, spec.toDirection, spec);
      return;
    }
    case 'chain': {
      const count = 4;
      const start = add(from, scale(sub(spec.to, from), 0.28));
      const end = add(from, scale(sub(spec.to, from), 0.72));
      const hand = roomierSide(spec, mid, travel);
      const out = rotate(travel, -hand * LOOP_ANGLE);
      const back = rotate(travel, hand * LOOP_ANGLE);
      const knots = Array.from({ length: count }, (_, i) =>
        add(start, scale(sub(end, start), i / (count - 1))),
      );
      const size = Math.min(
        spec.size * 0.55,
        cap,
        (distance(start, end) / (count - 1)) * 1.1,
        ...knots.map((k) => reachWithin(k, loopVectors(out, back), spec)),
      );
      if (size < 3) return plain();
      curveTo(ink, start, spec.fromDirection, out, spec);
      knots.forEach((_, i) => {
        loopHere(ink, out, back, size);
        const next = knots[i + 1];
        if (next) curveTo(ink, next, back, out, spec);
      });
      curveTo(ink, spec.to, back, spec.toDirection, spec);
      return;
    }
    case 'rosette': {
      const hand = roomierSide(spec, mid, travel);
      const petals = 3;
      const turn = hand * ((2 * Math.PI) / petals);
      const directions = Array.from({ length: petals + 1 }, (_, i) =>
        rotate(rotate(travel, -hand * LOOP_ANGLE), i * turn),
      );
      const vectors = directions.flatMap((d, i) =>
        i < petals ? loopVectors(d, directions[i + 1] as Point) : [],
      );
      const size = Math.min(spec.size, cap, reachWithin(mid, vectors, spec));
      if (size < 4) return plain();
      curveTo(ink, mid, spec.fromDirection, directions[0] as Point, spec);
      for (let i = 0; i < petals; i++)
        loopHere(ink, directions[i] as Point, directions[i + 1] as Point, size);
      curveTo(ink, spec.to, directions[petals] as Point, spec.toDirection, spec);
      return;
    }
    case 'bow': {
      const a = rotate(travel, -LOOP_ANGLE);
      const b = rotate(travel, LOOP_ANGLE);
      const size = Math.min(
        spec.size,
        cap,
        reachWithin(mid, [...loopVectors(a, b), ...loopVectors(b, a)], spec),
      );
      if (size < 4) return plain();
      curveTo(ink, mid, spec.fromDirection, a, spec);
      loopHere(ink, a, b, size);
      loopHere(ink, b, a, size);
      curveTo(ink, spec.to, a, spec.toDirection, spec);
      return;
    }
  }
}
