import { PRODUCT_ORDER } from './catalog.ts';
import { RouteInvariantError, countPathLetters } from './commands.ts';
import type { Route } from './route.ts';

/** SVG path data drawn as one yarn: exactly one `M`, no `Z`/`z`, only absolute M/L/Q/C. */
export function assertSingleLinePathData(d: string, label = 'path'): void {
  const letters = countPathLetters(d);
  const unexpected = Object.keys(letters).filter((l) => !['M', 'L', 'Q', 'C'].includes(l));
  if (unexpected.length)
    throw new RouteInvariantError(`${label}: unexpected commands ${unexpected.join(', ')}`);
  if (letters.M !== 1)
    throw new RouteInvariantError(`${label}: expected exactly one M, found ${letters.M ?? 0}`);
  if (!d.trimStart().startsWith('M')) throw new RouteInvariantError(`${label}: must start with M`);
}

/** Segments appear as connector → drawing → wrap for each product in the approved order, then a tail. */
export function assertRouteStructure(route: Route): void {
  const expected = [
    ...PRODUCT_ORDER.flatMap((id) => [`connector:${id}`, `drawing:${id}`, `wrap:${id}`]),
    'tail:',
  ];
  const actual = route.segments.map((s) => `${s.kind}:${s.chapter ?? ''}`);
  if (actual.join('|') !== expected.join('|')) {
    throw new RouteInvariantError(`Route order mismatch: ${actual.join(' → ')}`);
  }
  const moves = route.commands.filter((c) => c[0] === 'M').length;
  if (moves !== 1 || route.commands[0]?.[0] !== 'M') {
    throw new RouteInvariantError(`Route must have exactly one leading M, found ${moves}`);
  }
  for (const drawing of route.segments.filter((s) => s.kind === 'drawing')) {
    if (drawing.endCommand <= drawing.startCommand) {
      throw new RouteInvariantError(`${drawing.chapter}: drawing is empty`);
    }
  }
}
