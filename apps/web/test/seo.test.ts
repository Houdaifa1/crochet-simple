import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  freeHeading,
  freeRedirects,
  hasItems,
  listTitle,
  needsFreePage,
  pagedDescription,
  patternTitle,
  shareTitle,
  titleCase,
  withBrand,
} from '../src/lib/seo.ts';

describe('page titles', () => {
  it('adds the site name only while the title fits in 60 characters', () => {
    expect(withBrand('Free Crochet Bat Pattern')).toBe(
      'Free Crochet Bat Pattern | Crochet Simplified',
    );
    const long = 'Easy Cotton Crochet Cardigan Pattern for Women in Six Sizes';
    expect(withBrand(long)).toBe(long);
    expect(withBrand('Crochet Simplified | Free crochet PDFs')).toBe(
      'Crochet Simplified | Free crochet PDFs',
    );
    expect(withBrand('Free Panda Christmas Stocking Crochet Pattern PDF')).toBe(
      'Free Panda Christmas Stocking Crochet Pattern PDF',
    );
  });

  it('describes numbered list pages differently from the first', () => {
    expect(pagedDescription('Free keychain patterns.', 1, 4)).toBe('Free keychain patterns.');
    expect(pagedDescription('Free keychain patterns.', 3, 4)).toBe(
      'Free keychain patterns. Page 3 of 4.',
    );
  });

  it('shares the page words without the site name', () => {
    expect(shareTitle('Free Crochet Bat Pattern | Crochet Simplified')).toBe(
      'Free Crochet Bat Pattern',
    );
    expect(shareTitle('Crochet Simplified | Free crochet PDFs')).toBe(
      'Crochet Simplified | Free crochet PDFs',
    );
  });

  it('uses the Google title from the admin, otherwise names the pattern and says free', () => {
    expect(patternTitle({ title: 'Baby Bat', free: true })).toBe(
      'Baby Bat | Free Crochet Pattern | Crochet Simplified',
    );
    expect(patternTitle({ title: 'Laptop sleeve', free: false })).toBe(
      'Laptop sleeve | Crochet Pattern | Crochet Simplified',
    );
    expect(
      patternTitle({
        title: 'Baby Bat',
        seoTitle: 'Free Crochet Bat Pattern for Halloween',
        free: true,
      }),
    ).toBe('Free Crochet Bat Pattern for Halloween | Crochet Simplified');
  });

  it('writes category titles without repeating crochet', () => {
    expect(titleCase('amigurumi and keychains')).toBe('Amigurumi and Keychains');
    expect(listTitle({ name: 'Baby clothing', allFree: true, freeOnly: false, page: 1 })).toBe(
      'Free Baby Clothing Crochet Patterns | Crochet Simplified',
    );
    expect(
      listTitle({ name: 'Crochet stitch guides', allFree: true, freeOnly: false, page: 1 }),
    ).toBe('Free Crochet Stitch Guides | Crochet Simplified');
    expect(listTitle({ name: 'Tech cases', allFree: false, freeOnly: false, page: 2 })).toBe(
      'Tech Cases Crochet Patterns, Page 2 | Crochet Simplified',
    );
    expect(listTitle({ allFree: false, freeOnly: true, page: 1 })).toBe(
      'Free Crochet Patterns | Crochet Simplified',
    );
  });

  it('uses the admin title on the full list but not on its free only page', () => {
    const seoTitle = 'Free Amigurumi Patterns: Crochet Animals';
    expect(
      listTitle({ name: 'Amigurumi', seoTitle, allFree: true, freeOnly: false, page: 1 }),
    ).toBe(seoTitle);
    expect(
      listTitle({ name: 'Amigurumi', seoTitle, allFree: false, freeOnly: true, page: 1 }),
    ).toBe('Free Amigurumi Crochet Patterns | Crochet Simplified');
  });

  it('heads free only pages in plain words', () => {
    expect(freeHeading()).toBe('Free crochet patterns');
    expect(freeHeading('Baby shoes')).toBe('Free baby shoes crochet patterns');
    expect(freeHeading('Crochet stitch guides')).toBe('Free crochet stitch guides');
  });
});

describe('free only pages', () => {
  it('exist only when the list mixes free and paid patterns', () => {
    expect(needsFreePage([true, true])).toBe(false);
    expect(needsFreePage([false, false])).toBe(false);
    expect(needsFreePage([true, false])).toBe(true);
    expect(needsFreePage([])).toBe(false);
  });

  it('send old addresses that were not built to the full list', () => {
    const pages = [
      '',
      'patterns/',
      'patterns/free/',
      'patterns/category/bags/',
      'patterns/category/tech-cases/',
      'patterns/category/tech-cases/free/',
      'patterns/blue-market-bag/',
      'journal/',
    ];
    expect(freeRedirects(pages)).toEqual([
      '/patterns/category/bags/free/ /patterns/category/bags/ 301',
      '/patterns/category/bags/free/* /patterns/category/bags/ 301',
    ]);
    expect(freeRedirects(['patterns', 'patterns/category/hats'])).toEqual([
      '/patterns/free/ /patterns/ 301',
      '/patterns/free/* /patterns/ 301',
      '/patterns/category/hats/free/ /patterns/category/hats/ 301',
      '/patterns/category/hats/free/* /patterns/category/hats/ 301',
    ]);
  });
});

describe('export contents', () => {
  it('knows whether a folder of the export holds any item', () => {
    const dir = mkdtempSync(join(tmpdir(), 'seo-'));
    expect(hasItems(join(dir, 'articles'))).toBe(false);
    mkdirSync(join(dir, 'articles'));
    expect(hasItems(join(dir, 'articles'))).toBe(false);
    writeFileSync(join(dir, 'articles', 'first.json'), '{}');
    expect(hasItems(join(dir, 'articles'))).toBe(true);
  });
});
