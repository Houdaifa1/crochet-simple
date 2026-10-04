// Site search in the browser: the index is built with the site and loaded only when someone searches.
export type Hit = {
  url: string;
  excerpt: string;
  title: string;
  image?: string | undefined;
  type: string;
};

type Result = {
  url: string;
  excerpt: string;
  meta: { title?: string; image?: string };
  filters: { type?: string[] };
};
type Pagefind = {
  options(o: object): Promise<void>;
  debouncedSearch(
    q: string,
    o?: object,
    ms?: number,
  ): Promise<{ results: { data(): Promise<Result> }[] } | null>;
};

let engine: Promise<Pagefind> | null = null;

export const loadSearch = (): Promise<Pagefind> =>
  (engine ??= import(/* @vite-ignore */ `${location.origin}/pagefind/pagefind.js`).then(
    async (m: Pagefind) => {
      await m.options({ excerptLength: 18 });
      return m;
    },
  ));

// results as you type; null when a newer search has already started
export async function search(q: string, limit = 30): Promise<Hit[] | null> {
  const found = await (await loadSearch()).debouncedSearch(q, {}, 120);
  if (!found) return null;
  const data = await Promise.all(found.results.slice(0, limit).map((r) => r.data()));
  return data.map((r) => ({
    url: r.url,
    excerpt: r.excerpt,
    title: r.meta.title ?? '',
    image: r.meta.image,
    type: r.filters.type?.[0] ?? '',
  }));
}

export const escapeHtml = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

// the excerpt comes from the index with <mark> around the matching words
export const hitHtml = (r: Hit): string =>
  `<li><a href="${escapeHtml(r.url)}">${
    r.image
      ? `<img src="${escapeHtml(r.image)}" alt="" width="80" height="100" loading="lazy">`
      : '<span class="ph"></span>'
  }<span><span class="kind">${escapeHtml(r.type)}</span><strong>${escapeHtml(r.title)}</strong><span class="ex">${r.excerpt}</span></span></a></li>`;

export const resultWords = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;
