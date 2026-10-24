// the sitemap gains each page's last change and its photos, read back from the built pages
export interface PageExtras {
  lastmod?: string;
  images: string[];
}

const attr = (tag: string, name: string): string | undefined =>
  tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

const xml = (s: string): string =>
  s.replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;').replace(/</g, '&lt;');

// photos described for readers in the page itself; the cards of other patterns are left out
export function pageExtras(html: string, site: string): PageExtras {
  const lastmod = html.match(/<meta property="article:modified_time" content="([^"]+)"/)?.[1];
  const main = (html.split('<main')[1] ?? '').split(/<section class="[^"]*\brelated\b|<\/main>/)[0];
  const images = [
    ...new Set(
      [...(main ?? '').matchAll(/<img\b[^>]*>/g)]
        .filter(([tag]) => attr(tag, 'alt')?.trim())
        .map(([tag]) => attr(tag, 'src'))
        .filter((src): src is string => Boolean(src))
        .map((src) => new URL(src.replace(/&amp;/g, '&'), site).href),
    ),
  ];
  return { ...(lastmod ? { lastmod } : {}), images };
}

export function enrichSitemap(
  sitemap: string,
  extras: (loc: string) => PageExtras | undefined,
): string {
  return sitemap.replace(
    /<url><loc>([^<]+)<\/loc>(.*?)<\/url>/g,
    (whole, loc: string, rest: string) => {
      const e = extras(loc.replace(/&amp;/g, '&'));
      if (!e) return whole;
      const lastmod =
        e.lastmod && !rest.includes('<lastmod>') ? `<lastmod>${xml(e.lastmod)}</lastmod>` : '';
      const images = e.images
        .slice(0, 1000)
        .map((src) => `<image:image><image:loc>${xml(src)}</image:loc></image:image>`)
        .join('');
      return `<url><loc>${loc}</loc>${lastmod}${rest}${images}</url>`;
    },
  );
}
