import type { CardKind, LinkCard, Price, Rating } from './content.ts';

export interface ResolveOptions {
  readonly fetch?: typeof fetch;
  // "keystring" or "keystring:secret", from the Etsy developer page
  readonly etsyApiKey?: string;
}

export interface Profile {
  readonly url: string;
  readonly name: string;
  readonly description?: string;
  readonly image?: string;
}

const UA = 'Mozilla/5.0 (compatible; CrochetSimpleCards/1.0)';

const decode = (s: string): string =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)));

// Pinterest puts the save date in front of descriptions, and serves small thumbnails
const tidy = (s: string | undefined): string | undefined =>
  s
    ?.replace(/^[A-Z][a-z]{2} \d{1,2}, \d{4}\s*[—–-]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim() || undefined;
const larger = (url: string | undefined): string | undefined =>
  url?.replace(/(i\.pinimg\.com\/)(\d+x|\d+x\d+)\//, '$1736x/');
// the first sentence of a description, for pins that have no title
const headline = (d: string | undefined): string | undefined => {
  const first = d?.split(/(?<=[.!?])\s/)[0]?.trim();
  if (!first) return undefined;
  return first.length > 90 ? `${first.slice(0, 87).replace(/\s+\S*$/, '')}…` : first;
};

// open graph and twitter tags, with the <title> as a last resort
export function readMeta(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    const value = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (key && value !== undefined && !(key in meta)) meta[key] = decode(value.trim());
  }
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1];
  if (title && !meta['og:title']) meta['og:title'] = decode(title.trim());
  return meta;
}

export function cardKind(url: string): CardKind {
  const host = new URL(url).hostname.replace(/^www\./, '');
  if (/(^|\.)pinterest\.[a-z.]+$/.test(host) || host === 'pin.it') return 'pinterest';
  if (host === 'etsy.com' || host.endsWith('.etsy.com')) return 'etsy';
  return 'link';
}

// empty values are dropped, so a card never shows a blank line
type Defined<T> = { [K in keyof T as undefined extends T[K] ? never : K]: T[K] } & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
};
const clean = <T extends object>(o: T): Defined<T> =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== ''),
  ) as Defined<T>;

async function page(
  url: string,
  f: typeof fetch,
): Promise<{ url: string; meta: Record<string, string> }> {
  const res = await f(url, {
    headers: { 'user-agent': UA, accept: 'text/html' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return { url: res.url || url, meta: readMeta(await res.text()) };
}

function fromMeta(kind: CardKind, url: string, meta: Record<string, string>): LinkCard {
  const title = meta['og:title'] ?? meta['twitter:title'];
  if (!title) throw new Error(`${url} has no title to show`);
  const amount = Number(meta['product:price:amount'] ?? meta['og:price:amount']);
  const currency = meta['product:price:currency'] ?? meta['og:price:currency'];
  const price: Price | undefined =
    Number.isFinite(amount) && amount > 0 && currency ? { amount, currency } : undefined;
  return clean({
    kind,
    url,
    title,
    description: meta['og:description'] ?? meta['description'],
    image: meta['og:image'] ?? meta['twitter:image'],
    siteName: meta['og:site_name'],
    price,
  });
}

const etsyListingId = (url: string): string | undefined => /\/listing\/(\d+)/.exec(url)?.[1];

async function etsy(url: string, key: string, f: typeof fetch): Promise<LinkCard> {
  const id = etsyListingId(url);
  if (!id) throw new Error(`${url} is not an Etsy listing link`);
  const api = 'https://openapi.etsy.com/v3/application';
  const get = async (path: string) => {
    const res = await f(`${api}${path}`, {
      headers: { 'x-api-key': key, accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Etsy answered ${res.status} for ${path}`);
    return (await res.json()) as Record<string, unknown>;
  };
  const listing = await get(`/listings/${id}?includes=Images`);
  const shop = await get(`/shops/${String(listing['shop_id'])}`);
  const p = listing['price'] as
    { amount: number; divisor: number; currency_code: string } | undefined;
  const images = listing['images'] as { url_570xN?: string; url_fullxfull?: string }[] | undefined;
  const average = Number(shop['review_average']);
  const count = Number(shop['review_count']);
  const rating: Rating | undefined =
    Number.isFinite(average) && count > 0
      ? { value: Math.round(average * 10) / 10, count }
      : undefined;
  return clean({
    kind: 'etsy' as const,
    url: String(listing['url'] ?? url).split('?')[0]!,
    title: decode(String(listing['title'])),
    description: listing['description']
      ? decode(String(listing['description'])).slice(0, 240)
      : undefined,
    image: images?.[0]?.url_570xN ?? images?.[0]?.url_fullxfull,
    siteName: shop['shop_name'] ? String(shop['shop_name']) : 'Etsy',
    price: p ? { amount: p.amount / p.divisor, currency: p.currency_code } : undefined,
    rating,
  });
}

async function pinterest(url: string, f: typeof fetch): Promise<LinkCard> {
  const res = await f(`https://www.pinterest.com/oembed.json?url=${encodeURIComponent(url)}`, {
    headers: { 'user-agent': UA },
  }).catch(() => null);
  const o = res?.ok ? ((await res.json().catch(() => ({}))) as Record<string, unknown>) : {};
  const p = await page(url, f).catch(() => null);
  const description = tidy(p?.meta['og:description'] ?? p?.meta['description']);
  // Pinterest adds keyword lists after a "|"; the pin's own title comes first
  const title =
    tidy(String(o['title'] ?? ''))?.split(' | ')[0] ??
    tidy(p?.meta['og:title'])?.split(' | ')[0] ??
    headline(description);
  if (!title) throw new Error(`${url} has no title to show`);
  return clean({
    kind: 'pinterest' as const,
    url: p?.url ?? url,
    title,
    description: description === title ? undefined : description,
    image: larger(o['thumbnail_url'] ? String(o['thumbnail_url']) : p?.meta['og:image']),
    siteName: 'Pinterest',
  });
}

// turns a pasted link into what the card shows; real data only, never typed in by hand
export async function resolveLinkCard(
  url: string,
  options: ResolveOptions = {},
): Promise<LinkCard> {
  const f = options.fetch ?? fetch;
  const kind = cardKind(url);
  if (kind === 'etsy' && options.etsyApiKey) return etsy(url, options.etsyApiKey, f);
  if (kind === 'pinterest') return pinterest(url, f);
  const p = await page(url, f);
  return fromMeta(kind, p.url, p.meta);
}

export async function resolveProfile(url: string, options: ResolveOptions = {}): Promise<Profile> {
  const p = await page(url, options.fetch ?? fetch);
  const name = p.meta['og:title']
    ?.replace(/\s*\|\s*Pinterest.*$/i, '')
    .replace(/\s*-\s*Profile$/i, '')
    .replace(/\s*on Pinterest$/i, '')
    .replace(/\s*\([^)]*\)$/, '');
  if (!name) throw new Error(`${url} has no profile name`);
  // Pinterest's own filler text and logo are not the owner's; leave them out
  const description = tidy(p.meta['og:description']);
  const image = p.meta['og:image'];
  return clean({
    url: p.url,
    name,
    description:
      description && !/has discovered on Pinterest/i.test(description) ? description : undefined,
    image:
      image && !/default_open_graph|\/images\/(?:user\/)?default/i.test(image) ? image : undefined,
  });
}
