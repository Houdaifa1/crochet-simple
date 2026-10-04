import { describe, expect, it } from 'vitest';
import { keepCounts, keepMeasures } from '../src/lib/text.ts';

const NB = ' ';

describe('line breaks in patterns', () => {
  it('keeps a measurement and its inches together in chart cells', () => {
    expect(keepMeasures('8.5 cm (3.3 in)')).toBe(`8.5${NB}cm (3.3${NB}in)`);
    expect(keepMeasures('18 ch')).toBe(`18${NB}ch`);
    expect(keepMeasures('0 to 3 months')).toBe('0 to 3 months');
  });

  it('keeps a stitch and its count together in instructions', () => {
    expect(keepCounts('Ch 2, dc inc 4 times, dc 16, sl st to join.')).toBe(
      `Ch${NB}2, dc inc${NB}4${NB}times, dc${NB}16, sl st to join.`,
    );
    expect(keepCounts('(sc 2, inc) 6 times.')).toBe(`(sc${NB}2, inc) 6${NB}times.`);
  });

  it('leaves long brackets free to wrap', () => {
    const s = 'Ch 2, 2 dc in the 18th ch (the same chain the ch 2 comes from).';
    expect(keepCounts(s).match(/ /g)!.length).toBeGreaterThan(8);
  });
});
