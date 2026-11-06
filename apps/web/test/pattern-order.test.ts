import { expect, test } from 'vitest';
import { comparePatterns } from '../src/lib/pattern-order.ts';

const pattern = (id: string, date: string, etsyUrl?: string, pdf?: object) => ({
  id,
  data: { published: new Date(date), etsyUrl, pdf },
});

test('both live Etsy products appear before newer unlisted patterns on the first page', () => {
  const all = [
    pattern('new-unlisted', '2026-11-06'),
    pattern('hexagon', '2026-10-19', 'https://www.etsy.com/listing/1'),
    pattern('pocket', '2026-10-20', 'https://www.etsy.com/listing/2'),
    pattern('older-unlisted', '2026-10-01'),
  ];
  const sorted = all.sort(comparePatterns);
  expect(sorted.slice(0, 2).map((p) => p.id)).toEqual(['pocket', 'hexagon']);
  expect(sorted.slice(2).map((p) => p.id)).toEqual(['new-unlisted', 'older-unlisted']);
});

test('free patterns keep their date order even when they also have an Etsy link', () => {
  const all = [
    pattern('free-older', '2026-10-01', 'https://www.etsy.com/listing/3', {}),
    pattern('paid', '2026-09-01', 'https://www.etsy.com/listing/1'),
    pattern('free-newer', '2026-11-01', undefined, {}),
  ];
  expect(
    all
      .sort(comparePatterns)
      .filter((p) => p.data.pdf)
      .map((p) => p.id),
  ).toEqual(['free-newer', 'free-older']);
});

test('patterns with the same availability and date retain their existing order', () => {
  expect(comparePatterns(pattern('first', '2026-10-01'), pattern('second', '2026-10-01'))).toBe(0);
});
