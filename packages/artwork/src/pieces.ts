import { RouteInvariantError } from './commands.ts';
import type { Polyline } from './polyline.ts';

// ios safari restarts a dash every ~256 points, so the dark line is drawn in pieces
export const MAX_PIECE_POINTS = 128;

export interface Piece {
  // start is the previous piece's end
  readonly start: number;
  readonly end: number;
  readonly startLength: number;
  readonly endLength: number;
  readonly d: string;
}

export function splitIntoPieces(poly: Polyline, maxPoints = MAX_PIECE_POINTS): readonly Piece[] {
  if (maxPoints < 2) throw new RangeError('A piece needs at least two points');
  const pieces: Piece[] = [];
  for (let start = 0; start < poly.count - 1; start += maxPoints - 1) {
    const end = Math.min(poly.count - 1, start + maxPoints - 1);
    const coords: string[] = [];
    for (let i = start + 1; i <= end; i++) coords.push(`${poly.xs[i]},${poly.ys[i]}`);
    pieces.push({
      start,
      end,
      startLength: poly.lengths[start] as number,
      endLength: poly.lengths[end] as number,
      d: `M${poly.xs[start]},${poly.ys[start]}L${coords.join(' ')}`,
    });
  }
  assertPiecesCoverRoute(poly, pieces, maxPoints);
  return pieces;
}

export function assertPiecesCoverRoute(
  poly: Polyline,
  pieces: readonly Piece[],
  maxPoints = MAX_PIECE_POINTS,
): void {
  if (pieces[0]?.start !== 0 || pieces.at(-1)?.end !== poly.count - 1) {
    throw new RouteInvariantError('Pieces must start at the yarn start and end at its end');
  }
  pieces.forEach((piece, i) => {
    if (piece.end - piece.start + 1 > maxPoints) {
      throw new RouteInvariantError(
        `Piece ${i} has ${piece.end - piece.start + 1} points (max ${maxPoints})`,
      );
    }
    const previous = pieces[i - 1];
    if (previous && previous.end !== piece.start) {
      throw new RouteInvariantError(`Piece ${i} does not start where piece ${i - 1} ends`);
    }
  });
}

export type PieceState =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'full' }
  | { readonly kind: 'partial'; readonly length: number };

export function pieceState(piece: Piece, drawn: number): PieceState {
  if (drawn <= piece.startLength) return { kind: 'hidden' };
  if (drawn >= piece.endLength) return { kind: 'full' };
  return { kind: 'partial', length: drawn - piece.startLength };
}

export class PieceReveal {
  readonly #pieces: readonly Piece[];
  #frontier = 0;
  #drawn = 0;

  constructor(pieces: readonly Piece[]) {
    this.#pieces = pieces;
  }

  pieceAt(length: number): number {
    const p = this.#pieces;
    let lo = 0;
    let hi = p.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((p[mid] as Piece).endLength < length) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  update(drawn: number, apply: (index: number, state: PieceState) => void): void {
    const before = this.pieceAt(this.#drawn);
    const after = this.pieceAt(drawn);
    const from = Math.min(before, after);
    const to = Math.max(before, after);
    for (let i = from; i <= to; i++) apply(i, pieceState(this.#pieces[i] as Piece, drawn));
    this.#drawn = drawn;
    this.#frontier = after;
  }

  reset(drawn: number, apply: (index: number, state: PieceState) => void): void {
    this.#pieces.forEach((piece, i) => apply(i, pieceState(piece, drawn)));
    this.#drawn = drawn;
    this.#frontier = this.pieceAt(drawn);
  }

  get frontier(): number {
    return this.#frontier;
  }
}
