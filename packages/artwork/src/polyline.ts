import { RouteInvariantError, type PathCommand } from './commands.ts';

// route as straight segments + length table, the one geometry source
export interface Polyline {
  readonly xs: Float64Array;
  readonly ys: Float64Array;
  readonly lengths: Float64Array;
  readonly count: number;
  readonly total: number;
  readonly commandEnds: Float64Array;
  readonly fractionDigits: number;
}

export interface FlattenOptions {
  readonly tolerance: number;
  readonly fractionDigits: number;
}

export const DEFAULT_FLATTEN: FlattenOptions = { tolerance: 0.1, fractionDigits: 2 };

const MAX_SUBDIVISIONS = 4096;

// chord error <= n(n-1)/8 * max second difference / k^2
function subdivisions(secondDifference: number, degree: 2 | 3, tolerance: number): number {
  const bound = ((degree * (degree - 1)) / 8) * secondDifference;
  return Math.min(MAX_SUBDIVISIONS, Math.max(1, Math.ceil(Math.sqrt(bound / tolerance))));
}

export function flatten(
  commands: readonly PathCommand[],
  options: FlattenOptions = DEFAULT_FLATTEN,
): Polyline {
  const { tolerance, fractionDigits } = options;
  if (!(tolerance > 0)) throw new RangeError('tolerance must be positive');
  const first = commands[0];
  if (!first || first[0] !== 'M') throw new RouteInvariantError('A route must start with M');

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

// same rounded coords the lengths were measured on
export function polylinePathData(poly: Polyline): string {
  const parts: string[] = new Array(poly.count);
  for (let i = 0; i < poly.count; i++) parts[i] = `${poly.xs[i]},${poly.ys[i]}`;
  return `M${parts[0]}L${parts.slice(1).join(' ')}`;
}

export function indexAtLength(poly: Polyline, length: number): number {
  const i = segmentAt(poly, length);
  return (poly.lengths[i + 1] as number) - length < length - (poly.lengths[i] as number)
    ? i + 1
    : i;
}
