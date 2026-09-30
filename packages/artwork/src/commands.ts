import { assertFinite, type Point } from './geometry.ts';

export type MoveCommand = readonly ['M', number, number];
export type LineCommand = readonly ['L', number, number];
export type QuadCommand = readonly ['Q', number, number, number, number];
export type CubicCommand = readonly ['C', number, number, number, number, number, number];
export type DrawCommand = LineCommand | QuadCommand | CubicCommand;
export type PathCommand = MoveCommand | DrawCommand;

/** Thrown whenever the one-continuous-line rules would be broken. */
export class RouteInvariantError extends Error {
  override name = 'RouteInvariantError';
}

const ARITY = { M: 2, L: 2, Q: 4, C: 6 } as const;

/** End point of a command. */
export function endPoint(command: PathCommand): Point {
  const n = command.length;
  return { x: command[n - 2] as number, y: command[n - 1] as number };
}

/**
 * Builds a single continuous path. It permits exactly one move (the yarn's first
 * touch) and has no way to close a subpath, so a pen lift or `Z` cannot be expressed.
 */
export class PathBuilder {
  readonly #commands: PathCommand[] = [];
  #current: Point | null = null;

  get current(): Point {
    if (!this.#current) throw new RouteInvariantError('The yarn has not started yet');
    return this.#current;
  }

  /** Number of commands so far; used to mark segment boundaries. */
  get size(): number {
    return this.#commands.length;
  }

  moveTo(p: Point): this {
    if (this.#commands.length > 0) {
      throw new RouteInvariantError('The yarn may start only once; a second M would lift the pen');
    }
    assertFinite(p.x, p.y);
    this.#commands.push(['M', p.x, p.y]);
    this.#current = p;
    return this;
  }

  lineTo(p: Point): this {
    return this.#push(['L', p.x, p.y]);
  }

  quadTo(c: Point, p: Point): this {
    return this.#push(['Q', c.x, c.y, p.x, p.y]);
  }

  cubicTo(c1: Point, c2: Point, p: Point): this {
    return this.#push(['C', c1.x, c1.y, c2.x, c2.y, p.x, p.y]);
  }

  /** Continue the line with drawing commands that start at the current point. */
  append(commands: readonly DrawCommand[]): this {
    for (const command of commands) this.#push(command);
    return this;
  }

  toCommands(): readonly PathCommand[] {
    return this.#commands.slice();
  }

  #push(command: DrawCommand): this {
    if (!this.#current) throw new RouteInvariantError('Draw commands need a starting M');
    assertFinite(...(command.slice(1) as number[]));
    this.#commands.push(command);
    this.#current = endPoint(command);
    return this;
  }
}

/** Validates raw command data (for example parsed JSON) against the single-line rules. */
export function validateCommands(raw: unknown, label: string): readonly PathCommand[] {
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new RouteInvariantError(`${label}: expected at least two commands`);
  }
  const out: PathCommand[] = [];
  raw.forEach((entry, index) => {
    if (!Array.isArray(entry)) throw new RouteInvariantError(`${label}[${index}]: not a command`);
    const [type, ...numbers] = entry as [unknown, ...unknown[]];
    if (type !== 'M' && type !== 'L' && type !== 'Q' && type !== 'C') {
      throw new RouteInvariantError(`${label}[${index}]: unsupported command ${String(type)}`);
    }
    if ((type === 'M') !== (index === 0)) {
      throw new RouteInvariantError(`${label}[${index}]: M is allowed only as the first command`);
    }
    if (numbers.length !== ARITY[type] || numbers.some((n) => typeof n !== 'number')) {
      throw new RouteInvariantError(`${label}[${index}]: ${type} needs ${ARITY[type]} numbers`);
    }
    assertFinite(...(numbers as number[]));
    out.push([type, ...(numbers as number[])] as unknown as PathCommand);
  });
  return out;
}

/** Format a coordinate with at most `fractionDigits` decimals and no trailing zeros. */
export function formatNumber(value: number, fractionDigits = 2): string {
  const factor = 10 ** fractionDigits;
  const rounded = Math.round(value * factor) / factor;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

/** Serialise commands as SVG path data. */
export function toPathData(commands: readonly PathCommand[], fractionDigits = 2): string {
  return commands
    .map(
      ([type, ...numbers]) => type + numbers.map((n) => formatNumber(n, fractionDigits)).join(','),
    )
    .join(' ');
}

/** Counts of each command letter in SVG path data (case-sensitive). */
export function countPathLetters(d: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const letter of d.match(/[A-Za-z]/g) ?? []) counts[letter] = (counts[letter] ?? 0) + 1;
  return counts;
}

/**
 * Parse absolute M/L/Q/C path data (with implicit command repetition). Any other
 * command, including Z, is rejected: it cannot be part of the approved yarn.
 */
export function parsePathData(d: string): readonly PathCommand[] {
  const tokens = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  const out: PathCommand[] = [];
  let type: keyof typeof ARITY | null = null;
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i] as string;
    if (/^[A-Za-z]$/.test(token)) {
      if (token !== 'M' && token !== 'L' && token !== 'Q' && token !== 'C') {
        throw new RouteInvariantError(`Unsupported path command ${token}`);
      }
      type = token;
      i += 1;
      continue;
    }
    if (!type) throw new RouteInvariantError('Path data must start with a command');
    const arity = ARITY[type];
    const numbers = tokens.slice(i, i + arity).map(Number);
    if (numbers.length !== arity || numbers.some((n) => !Number.isFinite(n))) {
      throw new RouteInvariantError(`Incomplete ${type} command in path data`);
    }
    out.push([type, ...numbers] as unknown as PathCommand);
    i += arity;
    if (type === 'M') type = 'L';
  }
  return out;
}
