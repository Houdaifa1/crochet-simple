import { describe, expect, it } from 'vitest';
import { countPathLetters, parsePathData } from '../src/commands.ts';
import { assertSingleLinePathData } from '../src/invariants.ts';
import {
  MAX_PIECE_POINTS,
  PieceReveal,
  pieceState,
  splitIntoPieces,
  type PieceState,
} from '../src/pieces.ts';
import { flatten, polylinePathData } from '../src/polyline.ts';
import { buildRoute } from '../src/route.ts';
import { TEST_STORIES } from './fixtures/layouts.ts';

function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const same = (a: PieceState, b: PieceState) =>
  a.kind === b.kind && (a.kind !== 'partial' || (b.kind === 'partial' && a.length === b.length));

describe.each(TEST_STORIES.map((make) => make()))('pieces on $name', (story) => {
  const poly = flatten(buildRoute(story.layout).commands);
  const pieces = splitIntoPieces(poly);

  it('keeps the guide as one path: exactly one M, no Z', () => {
    assertSingleLinePathData(polylinePathData(poly), 'guide');
  });

  it(`uses pieces of at most ${MAX_PIECE_POINTS} points, well under the iOS Safari limit of ~256`, () => {
    for (const piece of pieces) {
      expect(piece.end - piece.start + 1).toBeLessThanOrEqual(MAX_PIECE_POINTS);
      expect(countPathLetters(piece.d)).toEqual({ M: 1, L: 1 });
    }
    console.info(`[${story.name}] ${poly.count} points → ${pieces.length} pieces`);
  });

  it('joins every piece exactly where the previous one ends (0 px gap)', () => {
    for (let i = 1; i < pieces.length; i++) {
      const prev = parsePathData(pieces[i - 1]!.d).at(-1)!;
      const next = parsePathData(pieces[i]!.d)[0]!;
      expect([next[1], next[2]]).toEqual([prev[1], prev[2]]);
    }
  });

  it('together they are exactly the route: same points, same total length', () => {
    const points: number[] = [];
    pieces.forEach((piece, i) => {
      const cmds = parsePathData(piece.d);
      (i === 0 ? cmds : cmds.slice(1)).forEach((c) => points.push(c[1] as number, c[2] as number));
    });
    expect(points.length / 2).toBe(poly.count);
    for (let i = 0; i < poly.count; i++) {
      expect(points[2 * i]).toBe(poly.xs[i]);
      expect(points[2 * i + 1]).toBe(poly.ys[i]);
    }
    expect(pieces.at(-1)!.endLength).toBe(poly.total);
  });

  it('updates only changed pieces, and always matches a full recalculation (slow, fast, reverse)', () => {
    const reveal = new PieceReveal(pieces);
    const state: PieceState[] = [];
    reveal.reset(0, (i, s) => (state[i] = s));
    const rnd = random(11);
    let drawn = 0;
    let touched = 0;
    for (let step = 0; step < 3000; step++) {
      const r = rnd();
      if (r < 0.6)
        drawn += rnd() * 40 - 12; // slow, mostly forward
      else if (r < 0.8)
        drawn += (rnd() - 0.3) * 8000; // fast flick either way
      else drawn = rnd() * poly.total; // jump (anchor link, scrollbar drag)
      drawn = Math.min(poly.total, Math.max(0, drawn));
      reveal.update(drawn, (i, s) => {
        state[i] = s;
        touched++;
      });
      pieces.forEach((piece, i) => {
        expect(same(state[i]!, pieceState(piece, drawn)), `piece ${i} at ${drawn}`).toBe(true);
      });
    }
    console.info(
      `[${story.name}] average pieces touched per update: ${(touched / 3000).toFixed(1)} of ${pieces.length}`,
    );
  });
});
