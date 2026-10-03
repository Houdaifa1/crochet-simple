import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type Pattern = CollectionEntry<'patterns'>;
export type Article = CollectionEntry<'articles'>;
export type Category = CollectionEntry<'categories'>;
export type Blocks = Pattern['data']['body'];

export const SKILL = {
  beginner: 'Beginner',
  easy: 'Easy',
  intermediate: 'Intermediate',
  experienced: 'Experienced',
} as const;
export type Settings = CollectionEntry<'settings'>['data'];

export const PAGE_SIZE = Number(process.env.PAGE_SIZE ?? 24);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const newest = <T extends { data: { published: Date } }>(a: T, b: T) =>
  b.data.published.getTime() - a.data.published.getTime();

function checkSlugs(kind: string, entries: { id: string }[]): void {
  for (const { id } of entries) {
    if (!SLUG.test(id))
      throw new Error(`${kind} "${id}": file names must be lowercase words joined by hyphens`);
  }
}

// these names are taken by the list pages
const RESERVED = new Set(['free', 'page', 'category']);

export async function patterns(): Promise<Pattern[]> {
  const all = await getCollection('patterns');
  checkSlugs('Pattern', all);
  for (const { id } of all) {
    if (RESERVED.has(id))
      throw new Error(`Pattern "${id}": this name is reserved, please choose another`);
  }
  return all.sort(newest);
}

export async function articles(): Promise<Article[]> {
  const all = await getCollection('articles');
  checkSlugs('Article', all);
  return all.sort(newest);
}

// categories in the admin's order, each with its patterns; empty ones are left out
export async function categories(): Promise<{ category: Category; patterns: Pattern[] }[]> {
  const [cats, all] = await Promise.all([getCollection('categories'), patterns()]);
  checkSlugs('Category', cats);
  return cats
    .sort((a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name))
    .map((category) => ({
      category,
      patterns: all.filter((p) => p.data.category.id === category.id),
    }))
    .filter((c) => c.patterns.length > 0);
}

export async function categoryOf(p: Pattern): Promise<Category> {
  const c = await getEntry(p.data.category);
  if (!c)
    throw new Error(`Pattern "${p.id}" uses a category that does not exist: ${p.data.category.id}`);
  return c;
}

const DEFAULT_SETTINGS: Settings = {
  adsense: { enabled: false, slots: {} },
  verification: {},
  social: [],
  indexable: false,
};

export type Homepage = CollectionEntry<'homepage'>['data'];
export type Heading = CollectionEntry<'listings'>['data']['patterns'];

export async function homepage(): Promise<Homepage> {
  return (await getEntry('homepage', 'homepage'))?.data ?? { products: [] };
}

export async function listing(which: 'patterns' | 'journal'): Promise<Heading> {
  return (await getEntry('listings', 'listings'))?.data[which] ?? {};
}

export async function settings(): Promise<Settings> {
  return (await getEntry('settings', 'settings'))?.data ?? DEFAULT_SETTINGS;
}

export const isFree = (p: Pattern): boolean => Boolean(p.data.pdf);

export function related(p: Pattern, all: Pattern[], count = 4): Pattern[] {
  const others = all.filter((o) => o.id !== p.id);
  const same = others.filter((o) => o.data.category.id === p.data.category.id);
  return [...same, ...others.filter((o) => !same.includes(o))].slice(0, count);
}

export interface PdfInfo {
  readonly path: string;
  readonly bytes: number;
  readonly pages?: number;
}

// the file the pattern points at, checked at build time
export function pdfInfo(p: Pattern): PdfInfo | null {
  if (!p.data.pdf || !p.filePath) return null;
  const path = resolve(process.cwd(), dirname(p.filePath), p.data.pdf.file);
  if (!existsSync(path)) throw new Error(`Pattern "${p.id}": PDF not found at ${p.data.pdf.file}`);
  const raw = readFileSync(path, 'latin1');
  if (!raw.startsWith('%PDF-'))
    throw new Error(`Pattern "${p.id}": ${p.data.pdf.file} is not a PDF`);
  const counted = raw.match(/\/Type\s*\/Page(?![a-z])/g)?.length;
  const pages = p.data.pdf.pages ?? (counted && counted > 0 ? counted : undefined);
  return { path, bytes: statSync(path).size, ...(pages ? { pages } : {}) };
}

export const fileSize = (bytes: number): string =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function readingMinutes(body: Blocks, extra = ''): number {
  const words = [
    extra,
    ...body.map((b) => {
      if (b.type === 'paragraph' || b.type === 'tip') return b.content.map((i) => i.text).join(' ');
      if (b.type === 'list')
        return b.items
          .flat()
          .map((i) => i.text)
          .join(' ');
      if (b.type === 'rounds') return b.items.map((i) => i.text).join(' ');
      if (b.type === 'heading' || b.type === 'quote') return b.text;
      return '';
    }),
  ]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 225));
}

export const formatDate = (d: Date): string =>
  d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

// absolute urls exist only once the domain is set
export const absolute = (path: string, site: URL | undefined): string | undefined =>
  site ? new URL(path, site).href : undefined;

export const pageCount = (n: number): number => Math.max(1, Math.ceil(n / PAGE_SIZE));

export const headingId = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// headings a reader can jump to, in order
export const sections = (body: Blocks): { id: string; text: string }[] =>
  body.flatMap((b) =>
    b.type === 'heading' && b.level === 2 ? [{ id: headingId(b.text), text: b.text }] : [],
  );
