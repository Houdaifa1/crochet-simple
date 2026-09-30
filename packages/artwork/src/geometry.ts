export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const point = (x: number, y: number): Point => ({ x, y });

export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });

export const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });

export const scale = (v: Point, k: number): Point => ({ x: v.x * k, y: v.y * k });

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export const magnitude = (v: Point): number => Math.hypot(v.x, v.y);

export function normalize(v: Point): Point {
  const m = magnitude(v);
  if (!(m > 0)) throw new RangeError('Cannot normalise a zero-length vector');
  return { x: v.x / m, y: v.y / m };
}

// screen space: y down, positive angle is clockwise
export function rotate(v: Point, radians: number): Point {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

export const boxRight = (b: Box): number => b.x + b.width;

export const boxBottom = (b: Box): number => b.y + b.height;

export const boxCenter = (b: Box): Point => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

export function assertFinite(...values: number[]): void {
  for (const v of values) {
    if (!Number.isFinite(v)) throw new RangeError(`Expected a finite coordinate, got ${v}`);
  }
}
