import { expect, test } from 'vitest';
import { categoryIds, sharesCategory } from '../src/lib/category-membership.ts';

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
