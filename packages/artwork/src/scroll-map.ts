import { RouteInvariantError } from './commands.ts';
import { indexAtLength, type Polyline } from './polyline.ts';
import type { Route } from './route.ts';

export interface ScrollPolicy {
  // svh in css px
  readonly viewportHeight: number;
  readonly topInset: number;
  readonly marginTop: number;
  readonly marginBottom: number;
  readonly travelAnchor: number;
  readonly entryAnchor: number;
  readonly drawingSpan: number;
  // line px per scroll px
  readonly maxDrawRate: number;
  readonly storyTop: number;
}

export const DEFAULT_POLICY: Omit<ScrollPolicy, 'viewportHeight' | 'topInset' | 'storyTop'> = {
  marginTop: 24,
  marginBottom: 32,
  travelAnchor: 0.58,
  entryAnchor: 0.72,
  drawingSpan: 0.9,
  maxDrawRate: 48,
};

export interface ScrollMap {
  readonly scrolls: Float64Array;
  readonly lengths: Float64Array;
  readonly total: number;
  lengthAt(scroll: number): number;
}

class PiecewiseScrollMap implements ScrollMap {
  readonly scrolls: Float64Array;
  readonly lengths: Float64Array;
  readonly total: number;

  constructor(scrolls: Float64Array, lengths: Float64Array) {
    this.scrolls = scrolls;
    this.lengths = lengths;
    this.total = lengths[lengths.length - 1] as number;
  }

  lengthAt(scroll: number): number {
    const s = this.scrolls;
    const n = s.length;
    if (!(scroll > (s[0] as number))) return 0;
    if (scroll >= (s[n - 1] as number)) return this.total;
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if ((s[mid] as number) <= scroll) lo = mid;
      else hi = mid;
    }
    const s0 = s[lo] as number;
    const l0 = this.lengths[lo] as number;
    return l0 + ((scroll - s0) / ((s[hi] as number) - s0)) * ((this.lengths[hi] as number) - l0);
  }
}

// visibility corridor, preferred pacing, then a projection capped at maxDrawRate
export function buildScrollMap(poly: Polyline, route: Route, policy: ScrollPolicy): ScrollMap {
  const n = poly.count;
  const { ys, lengths } = poly;
  const vh = policy.viewportHeight;
  const rate = policy.maxDrawRate;
  if (!(vh - policy.marginBottom > policy.topInset + policy.marginTop)) {
    throw new RangeError('Viewport too small for the margins');
  }
  if (!(rate > 0)) throw new RangeError('maxDrawRate must be positive');
  const entersOffset = policy.storyTop - (vh - policy.marginBottom);
  const leavesOffset = policy.storyTop - policy.topInset - policy.marginTop;
  const anchorScroll = (i: number, anchor: number): number =>
    policy.storyTop + (ys[i] as number) - anchor * vh;

  const P = new Float64Array(n);
  const S = new Float64Array(n);
  let run = -Infinity;
  for (let i = 0; i < n; i++) P[i] = run = Math.max(run, (ys[i] as number) + entersOffset);
  run = Infinity;
  for (let i = n - 1; i >= 0; i--) S[i] = run = Math.min(run, (ys[i] as number) + leavesOffset);

  const D = new Float64Array(n);
  const owner = new Array<string>(n).fill('start');
  D[0] = Math.max(0, anchorScroll(0, policy.travelAnchor));
  let covered = 0;
  const ranges = route.segments
    .map((segment) => {
      const startLength =
        segment.startCommand > 0 ? (poly.commandEnds[segment.startCommand - 1] as number) : 0;
      const endLength = poly.commandEnds[segment.endCommand - 1] as number;
      return { segment, a: indexAtLength(poly, startLength), b: indexAtLength(poly, endLength) };
    })
    .filter((r) => r.b > r.a);
  ranges.forEach(({ segment, a, b }, k) => {
    if (a !== covered) throw new RouteInvariantError('Route segments are not contiguous');
    const la = lengths[a] as number;
    const span = (lengths[b] as number) - la;
    const da = D[a] as number;
    let desired: number;
    if (segment.kind === 'drawing') {
      desired = da + policy.drawingSpan * ((S[a] as number) - da);
    } else if (segment.kind === 'connector') {
      // arrive at the entry anchor or once the whole drawing is visible
      desired = anchorScroll(b, policy.entryAnchor);
      const next = ranges[k + 1];
      if (next?.segment.kind === 'drawing') {
        let lowest = -Infinity;
        for (let i = next.a; i <= next.b; i++) lowest = Math.max(lowest, ys[i] as number);
        desired = Math.min(desired, lowest + entersOffset);
      }
    } else {
      desired = anchorScroll(b, policy.travelAnchor);
    }
    const db = Math.max(desired, da + span / rate);
    const label = segment.chapter ? `${segment.kind} of ${segment.chapter}` : segment.kind;
    for (let i = a + 1; i <= b; i++) {
      D[i] = da + (((lengths[i] as number) - la) / span) * (db - da);
      owner[i] = label;
    }
    covered = b;
  });
  if (covered !== n - 1)
    throw new RouteInvariantError('Route segments do not cover the whole line');

  const lo = new Float64Array(n);
  const hi = new Float64Array(n);
  lo[0] = Math.max(P[0] as number, 0);
  for (let i = 1; i < n; i++) {
    const step = ((lengths[i] as number) - (lengths[i - 1] as number)) / rate;
    lo[i] = Math.max(P[i] as number, (lo[i - 1] as number) + step);
  }
  hi[n - 1] = S[n - 1] as number;
  for (let i = n - 2; i >= 0; i--) {
    const step = ((lengths[i + 1] as number) - (lengths[i] as number)) / rate;
    hi[i] = Math.min(S[i] as number, (hi[i + 1] as number) - step);
  }
  const scrolls = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if ((lo[i] as number) > (hi[i] as number) + 1e-6) {
      throw new RouteInvariantError(
        `Not enough scroll room for the ${owner[i]} (length ${Math.round(lengths[i] as number)}, ` +
          `y ${Math.round(ys[i] as number)}) to be drawn with the tip on screen within ` +
          `${rate} px of line per px of scroll; make that box shorter or give it more space.`,
      );
    }
    let s = Math.min(Math.max(D[i] as number, lo[i] as number), hi[i] as number);
    if (i > 0) {
      const step = ((lengths[i] as number) - (lengths[i - 1] as number)) / rate;
      s = Math.max(s, (scrolls[i - 1] as number) + step);
    }
    scrolls[i] = s;
  }
  return new PiecewiseScrollMap(scrolls, lengths);
}

export function maxDrawRate(map: ScrollMap): number {
  let rate = 0;
  for (let i = 1; i < map.scrolls.length; i++) {
    const ds = (map.scrolls[i] as number) - (map.scrolls[i - 1] as number);
    const dl = (map.lengths[i] as number) - (map.lengths[i - 1] as number);
    rate = Math.max(rate, ds > 0 ? dl / ds : Infinity);
  }
  return rate;
}
