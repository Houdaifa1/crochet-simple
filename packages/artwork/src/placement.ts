import { endPoint, type DrawCommand, type PathCommand } from './commands.ts';
import type { Drawing, DrawingId } from './catalog.ts';
import { normalize, sub, type Box, type Point } from './geometry.ts';

export interface Fit {
  readonly scale: number;
  readonly dx: number;
  readonly dy: number;
}

// uniform scale, centred, never stretched
export function fitContain(source: Box, target: Box): Fit {
  if (!(source.width > 0 && source.height > 0 && target.width > 0 && target.height > 0)) {
    throw new RangeError('Boxes must have positive size');
  }
  const scale = Math.min(target.width / source.width, target.height / source.height);
  return {
    scale,
    dx: target.x + (target.width - source.width * scale) / 2 - source.x * scale,
    dy: target.y + (target.height - source.height * scale) / 2 - source.y * scale,
  };
}

export const applyFit = (p: Point, f: Fit): Point => ({
  x: f.dx + p.x * f.scale,
  y: f.dy + p.y * f.scale,
});

export function transformCommand<T extends PathCommand>(command: T, f: Fit): T {
  const [type, ...n] = command;
  const out: number[] = [];
  for (let i = 0; i < n.length; i += 2) {
    const p = applyFit({ x: n[i] as number, y: n[i + 1] as number }, f);
    out.push(p.x, p.y);
  }
  return [type, ...out] as unknown as T;
}

function leavingDirection(from: Point, command: DrawCommand): Point {
  const n = command.slice(1) as number[];
  for (let i = 0; i < n.length; i += 2) {
    const d = sub({ x: n[i] as number, y: n[i + 1] as number }, from);
    if (Math.hypot(d.x, d.y) > 1e-9) return normalize(d);
  }
  throw new RangeError('Degenerate first command');
}

function arrivingDirection(from: Point, command: DrawCommand): Point {
  const n = command.slice(1) as number[];
  const end = endPoint(command);
  for (let i = n.length - 4; i >= -2; i -= 2) {
    const prev = i >= 0 ? { x: n[i] as number, y: n[i + 1] as number } : from;
    const d = sub(end, prev);
    if (Math.hypot(d.x, d.y) > 1e-9) return normalize(d);
  }
  throw new RangeError('Degenerate last command');
}

export interface PlacedDrawing {
  readonly id: DrawingId;
  readonly fit: Fit;
  readonly entry: Point;
  readonly entryDirection: Point;
  readonly exit: Point;
  readonly exitDirection: Point;
  // drawing without its first M, starting at entry
  readonly body: readonly DrawCommand[];
  readonly frame: Box;
}

// the drawing's M becomes a waypoint, not a pen lift
export function placeDrawing(drawing: Drawing, target: Box): PlacedDrawing {
  const fit = fitContain(drawing.viewBox, target);
  const [move, ...rest] = drawing.commands;
  if (!move || move[0] !== 'M' || rest.length === 0)
    throw new RangeError(`${drawing.id}: bad drawing`);
  const entry = applyFit({ x: move[1], y: move[2] }, fit);
  const body = rest.map((c) => transformCommand(c as DrawCommand, fit));
  const beforeLast = body.length > 1 ? endPoint(body[body.length - 2] as DrawCommand) : entry;
  const last = body[body.length - 1] as DrawCommand;
  return {
    id: drawing.id,
    fit,
    entry,
    entryDirection: leavingDirection(entry, body[0] as DrawCommand),
    exit: endPoint(last),
    exitDirection: arrivingDirection(beforeLast, last),
    body,
    frame: {
      x: fit.dx + drawing.viewBox.x * fit.scale,
      y: fit.dy + drawing.viewBox.y * fit.scale,
      width: drawing.viewBox.width * fit.scale,
      height: drawing.viewBox.height * fit.scale,
    },
  };
}
