import { expect, test } from 'vitest';
import { categoryIds, relatedTo, sharesCategory } from '../src/lib/category-membership.ts';

const pants = {
  data: {
    category: { id: 'baby-clothing' },
    additionalCategories: [{ id: 'christmas' }, { id: 'baby-clothing' }, { id: 'christmas' }],
  },
};

test('one pattern belongs to both categories without duplicate membership or a new URL', () => {
  expect(categoryIds(pants)).toEqual(['baby-clothing', 'christmas']);
  const all = [pants];
  expect(all.filter((p) => categoryIds(p).includes('baby-clothing'))).toEqual([pants]);
  expect(all.filter((p) => categoryIds(p).includes('christmas'))).toEqual([pants]);
});

test('older patterns need no additional categories', () => {
  expect(categoryIds({ data: { category: { id: 'hats' } } })).toEqual(['hats']);
});

test('related patterns can share an additional category without matching the primary', () => {
  expect(sharesCategory(pants, { data: { category: { id: 'christmas' } } })).toBe(true);
  expect(sharesCategory(pants, { data: { category: { id: 'bags' } } })).toBe(false);
});

const item = (id: string, category: string, extra: string[] = []) => ({
  id,
  data: { category: { id: category }, additionalCategories: extra.map((e) => ({ id: e })) },
});

test('related patterns come from the same main category, starting after the pattern itself', () => {
  const all = [
    item('bear', 'christmas', ['keychains']),
    item('frog', 'keychains'),
    item('cat', 'keychains'),
    item('owl', 'keychains'),
    item('elf', 'christmas', ['keychains']),
    item('rose', 'flowers'),
  ];
  const ids = (id: string, count = 4) =>
    relatedTo(
      all.find((p) => p.id === id)!,
      all,
      count,
    ).map((p) => p.id);
  expect(ids('frog')).toEqual(['cat', 'owl', 'elf', 'bear']);
  expect(ids('owl')).toEqual(['frog', 'cat', 'elf', 'bear']);
  expect(ids('rose')).toEqual(['bear', 'frog', 'cat', 'owl']);
});

test('every pattern in a category is shown as related on another pattern', () => {
  const all = Array.from({ length: 9 }, (_, i) => item(`p${i}`, 'animals'));
  const linked = new Set(all.flatMap((p) => relatedTo(p, all, 2).map((r) => r.id)));
  expect(linked.size).toBe(all.length);
});
