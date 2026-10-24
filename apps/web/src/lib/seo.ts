// titles, duplicate pages and redirects: plain functions shared by the pages, the build and the tests
import { existsSync, readdirSync } from 'node:fs';

export const BRAND = 'Crochet Simplified';
const SUFFIX = ` | ${BRAND}`;
// Google shows about 60 characters and names the site above each result anyway,
// so the site name is added only while the whole title still fits
export const TITLE_MAX = 60;

export function withBrand(title: string): string {
  const t = title.trim();
  return t.includes(BRAND) || t.length + SUFFIX.length > TITLE_MAX ? t : `${t}${SUFFIX}`;
}

// what Pinterest and other sites show as the title: the page's own words, without the site name
export const shareTitle = (title: string): string =>
  title.endsWith(SUFFIX) ? title.slice(0, -SUFFIX.length) : title;

const SMALL = new Set(['a', 'an', 'and', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
export const titleCase = (s: string): string =>
  s
    .trim()
    .split(/\s+/)
    .map((w, i) =>
      i > 0 && SMALL.has(w.toLowerCase())
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(' ');

const saysCrochet = (s: string) => /\bcrochet\b/i.test(s);

export function patternTitle(o: { title: string; seoTitle?: string | undefined; free: boolean }) {
  return withBrand(
    o.seoTitle ?? `${o.title} | ${o.free ? 'Free Crochet Pattern' : 'Crochet Pattern'}`,
  );
}

// the pattern list and category pages; "free" leads whenever every pattern shown is free
export function listTitle(o: {
  name?: string | undefined;
  seoTitle?: string | undefined;
  allFree: boolean;
  freeOnly: boolean;
  page: number;
  // fills "{count}" in the admin's title, so the number stays right as patterns are added
  count?: number;
}): string {
  const label = o.name
    ? saysCrochet(o.name)
      ? titleCase(o.name)
      : `${titleCase(o.name)} Crochet Patterns`
    : 'Crochet Patterns';
  const base =
    o.seoTitle && !o.freeOnly
      ? o.seoTitle
          .replace(/\{count\}/g, o.count ? String(o.count) : '')
          .replace(/\s+/g, ' ')
          .trim()
      : `${o.allFree || o.freeOnly ? 'Free ' : ''}${label}`;
  return withBrand(`${base}${o.page > 1 ? `, Page ${o.page}` : ''}`);
}

// every numbered page of a list describes itself differently in search results
export const pagedDescription = (description: string, page: number, pages: number): string =>
  page > 1 ? `${description} Page ${page} of ${pages}.` : description;

export function freeHeading(name?: string): string {
  if (!name) return 'Free crochet patterns';
  const n = name.toLowerCase();
  return saysCrochet(n) ? `Free ${n}` : `Free ${n} crochet patterns`;
}

// a "free only" page is built only when it shows something different from the full list
export const needsFreePage = (free: boolean[]): boolean =>
  free.some(Boolean) && free.some((f) => !f);

// old "free only" addresses that were not built this time send visitors to the full list
export function freeRedirects(pathnames: string[]): string[] {
  const built = new Set(
    pathnames.map((p) => `/${p.replace(/^\/+/, '')}`.replace(/([^/])$/, '$1/')),
  );
  return [...built]
    .filter((p) => p === '/patterns/' || /^\/patterns\/category\/[a-z0-9-]+\/$/.test(p))
    .filter((p) => !built.has(`${p}free/`))
    .sort()
    .flatMap((p) => [`${p}free/ ${p} 301`, `${p}free/* ${p} 301`]);
}

// true when the admin's export holds at least one item of this kind
export const hasItems = (dir: string): boolean =>
  existsSync(dir) && readdirSync(dir).some((f) => f.endsWith('.json'));
