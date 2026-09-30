import { RouteInvariantError, type PathCommand } from './commands.ts';

/**
 * The route as straight segments plus its cumulative length table. This is the single
 * geometry source for the guide, the drawn line and the tip: straight segments are
 * measured identically by every browser, so a dash length and a point computed from
 * `lengths` land on the same spot.
 */
export interface Polyline {
  readonly xs: Float64Array;
  readonly ys: Float64Array;
  /** Cumulative length at each point; `lengths[0] === 0`, strictly increasing. */
  readonly lengths: Float64Array;
  readonly count: number;
  readonly total: number;
  /** Cumulative length at the end of each source command (index-aligned with the commands). */
  readonly commandEnds: Float64Array;
  /** Decimal places used for the coordinates (they are stored already rounded). */
  readonly fractionDigits: number;
}

export interface FlattenOptions {
  /** Maximum distance between the true curve and its segments, in CSS px. */
  readonly tolerance: number;
  /** Coordinates are rounded to this many decimals before lengths are measured. */
  readonly fractionDigits: number;
}

export const DEFAULT_FLATTEN: FlattenOptions = { tolerance: 0.1, fractionDigits: 2 };

const MAX_SUBDIVISIONS = 4096;

/**
 * Uniform subdivision count that keeps a curve within `tolerance` of its chords.
 * For a Bézier of degree n the chord error is at most |B''|max / (8 k²), with
 * |B''| ≤ n(n−1)·max second difference of the control points.
 */
function subdivisions(secondDifference: number, degree: 2 | 3, tolerance: number): number {
  const bound = ((degree * (degree - 1)) / 8) * secondDifference;
  return Math.min(MAX_SUBDIVISIONS, Math.max(1, Math.ceil(Math.sqrt(bound / tolerance))));
}

/** Flatten a single continuous path (exactly one `M`, no `Z`) into a polyline. */
export function flatten(
  commands: readonly PathCommand[],
  options: FlattenOptions = DEFAULT_FLATTEN,
): Polyline {
  const { tolerance, fractionDigits } = options;
  if (!(tolerance > 0)) throw new RangeError('tolerance must be positive');
  const first = commands[0];
  if (!first || first[0] !== 'M') throw new RouteInvariantError('A route must start with M');

  // Pass 1: exact capacity.
  let capacity = 1;
  const steps = new Int32Array(commands.length);
  let cx = first[1];
  let cy = first[2];
  for (let i = 1; i < commands.length; i++) {
    const c = commands[i] as PathCommand;
    let k = 1;
    if (c[0] === 'M') throw new RouteInvariantError(`Second M at command ${i}: pen lift`);
    if (c[0] === 'Q') {
      k = subdivisions(Math.hypot(cx - 2 * c[1] + c[3], cy - 2 * c[2] + c[4]), 2, tolerance);
    } else if (c[0] === 'C') {
      const d1 = Math.hypot(cx - 2 * c[1] + c[3], cy - 2 * c[2] + c[4]);
      const d2 = Math.hypot(c[1] - 2 * c[3] + c[5], c[2] - 2 * c[4] + c[6]);
      k = subdivisions(Math.max(d1, d2), 3, tolerance);
    }
    steps[i] = k;
    capacity += k;
    cx = c[c.length - 2] as number;
    cy = c[c.length - 1] as number;
  }

  const factor = 10 ** fractionDigits;
  const q = (v: number): number => {
    const r = Math.round(v * factor) / factor;
    return Object.is(r, -0) ? 0 : r;
  };
  const xs = new Float64Array(capacity);
  const ys = new Float64Array(capacity);
  const lengths = new Float64Array(capacity);
  const commandEnds = new Float64Array(commands.length);
  let n = 0;
  const push = (x: number, y: number): void => {
    const qx = q(x);
    const qy = q(y);
    if (n > 0) {
      const px = xs[n - 1] as number;
      const py = ys[n - 1] as number;
      if (qx === px && qy === py) return; // zero-length after rounding
      lengths[n] = (lengths[n - 1] as number) + Math.hypot(qx - px, qy - py);
    }
    xs[n] = qx;
    ys[n] = qy;
    n++;
  };

  // Pass 2: points.
  cx = first[1];
  cy = first[2];
  push(cx, cy);
  for (let i = 1; i < commands.length; i++) {
    const c = commands[i] as PathCommand;
    const k = steps[i] as number;
    if (c[0] === 'L') {
      push(c[1], c[2]);
    } else if (c[0] === 'Q') {
      for (let s = 1; s <= k; s++) {
        const t = s / k;
        const u = 1 - t;
        push(
          u * u * cx + 2 * u * t * c[1] + t * t * c[3],
          u * u * cy + 2 * u * t * c[2] + t * t * c[4],
        );
      }
    } else if (c[0] === 'C') {
      for (let s = 1; s <= k; s++) {
        const t = s / k;
        const u = 1 - t;
        const a = u * u * u;
        const b = 3 * u * u * t;
        const d = 3 * u * t * t;
        const e = t * t * t;
        push(a * cx + b * c[1] + d * c[3] + e * c[5], a * cy + b * c[2] + d * c[4] + e * c[6]);
      }
    }
    commandEnds[i] = lengths[n - 1] as number;
    cx = c[c.length - 2] as number;
    cy = c[c.length - 1] as number;
  }

  if (n < 2) throw new RouteInvariantError('Route has no length');
  return {
    xs: xs.slice(0, n),
    ys: ys.slice(0, n),
    lengths: lengths.slice(0, n),
    count: n,
    total: lengths[n - 1] as number,
    commandEnds,
    fractionDigits,
  };
}

/** Index `i` with lengths[i] ≤ length ≤ lengths[i + 1] (clamped). */
export function segmentAt(poly: Polyline, length: number): number {
  const { lengths, count } = poly;
  if (length <= 0) return 0;
  if (length >= poly.total) return count - 2;
  let lo = 0;
  let hi = count - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((lengths[mid] as number) <= length) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** The point at `length` along the polyline (clamped to its ends). */
export function pointAtLength(poly: Polyline, length: number): { x: number; y: number } {
  const i = segmentAt(poly, length);
  const l0 = poly.lengths[i] as number;
  const l1 = poly.lengths[i + 1] as number;
  const t = Math.min(1, Math.max(0, (length - l0) / (l1 - l0)));
  const x0 = poly.xs[i] as number;
  const y0 = poly.ys[i] as number;
  return {
    x: x0 + ((poly.xs[i + 1] as number) - x0) * t,
    y: y0 + ((poly.ys[i + 1] as number) - y0) * t,
  };
}

/**
 * SVG path data for the polyline: one `M`, one `L` and implicit repeated line-tos.
 * The coordinates are the exact rounded values the length table was measured on.
 */
export function polylinePathData(poly: Polyline): string {
  const parts: string[] = new Array(poly.count);
  for (let i = 0; i < poly.count; i++) parts[i] = `${poly.xs[i]},${poly.ys[i]}`;
  return `M${parts[0]}L${parts.slice(1).join(' ')}`;
}

/** Point index at which the cumulative length first reaches `length`. */
export function indexAtLength(poly: Polyline, length: number): number {
  const i = segmentAt(poly, length);
  return (poly.lengths[i + 1] as number) - length < length - (poly.lengths[i] as number)
    ? i + 1
    : i;
}
