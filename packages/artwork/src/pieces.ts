import { RouteInvariantError } from './commands.ts';
import type { Polyline } from './polyline.ts';

/**
 * The drawn (dark) line is rendered as consecutive pieces of the one route.
 *
 * Why: WebKit (every iPhone browser) restarts a dash pattern roughly every 256 path
 * points, so a single long path cannot be revealed with a dash on iOS (measured in
 * iOS Safari; see docs/evidence/step-1). Pieces well under that limit dash correctly
 * everywhere, and only the piece under the tip changes per frame.
 *
 * The route itself, and the faint guide drawn from it, remain one path with exactly
 * one `M` and no `Z`. Each piece starts at the exact point where the previous one
 * ends (they share the same polyline vertex), so the drawn line has no gaps.
 */
export const MAX_PIECE_POINTS = 128;

export interface Piece {
  /** First and last polyline point indices (inclusive); `start` equals the previous piece's `end`. */
  readonly start: number;
  readonly end: number;
  readonly startLength: number;
  readonly endLength: number;
  /** SVG path data for this piece: one `M`, one `L`, implicit repeated line-tos. */
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

/** The pieces tile the route exactly: contiguous, shared joints, nothing missing. */
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

/** How much of a piece is drawn for a total drawn length. */
export type PieceState =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'full' }
  | { readonly kind: 'partial'; readonly length: number };

export function pieceState(piece: Piece, drawn: number): PieceState {
  if (drawn <= piece.startLength) return { kind: 'hidden' };
  if (drawn >= piece.endLength) return { kind: 'full' };
  return { kind: 'partial', length: drawn - piece.startLength };
}

/**
 * Tracks which pieces changed between frames so the renderer touches only those.
 * Scrolling a little changes one piece; a fast jump changes the pieces it crosses.
 */
export class PieceReveal {
  readonly #pieces: readonly Piece[];
  /** Index of the first piece that is not fully drawn after the last update. */
  #frontier = 0;
  #drawn = 0;

  constructor(pieces: readonly Piece[]) {
    this.#pieces = pieces;
  }

  /** Index of the piece containing `length` (binary search). */
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

  /** Report every piece whose state differs between the previous and the new drawn length. */
  update(drawn: number, apply: (index: number, state: PieceState) => void): void {
    const before = this.pieceAt(this.#drawn);
    const after = this.pieceAt(drawn);
    const from = Math.min(before, after);
    const to = Math.max(before, after);
    for (let i = from; i <= to; i++) apply(i, pieceState(this.#pieces[i] as Piece, drawn));
    this.#drawn = drawn;
    this.#frontier = after;
  }

  /** Apply the full state for `drawn` to every piece (first paint, rebuilds). */
  reset(drawn: number, apply: (index: number, state: PieceState) => void): void {
    this.#pieces.forEach((piece, i) => apply(i, pieceState(piece, drawn)));
    this.#drawn = drawn;
    this.#frontier = this.pieceAt(drawn);
  }

  get frontier(): number {
    return this.#frontier;
  }
}
