import { expect, test } from 'vitest';
import { enrichSitemap, pageExtras } from '../src/lib/sitemap.ts';

const SITE = 'https://example.com';
const page = `<html><head><meta property="article:modified_time" content="2026-10-20T00:00:00.000Z"></head>
<body><header><img src="/logo.png" alt="Logo"></header><main>
<picture><img src="/_astro/frog.jpg" alt="A green crochet frog"></picture>
<img src="/_astro/frog.jpg" alt="A green crochet frog">
<img src="/_astro/thumb.jpg" alt="">
<img src="/_astro/legs.jpg?w=1&amp;h=2" alt="Two frog legs">
<section class="wrap related"><img src="/_astro/cat.jpg" alt="A cat"></section>
</main></body></html>`;

test('reads the last change and the described photos of the page, once each', () => {
  expect(pageExtras(page, SITE)).toEqual({
    lastmod: '2026-10-20T00:00:00.000Z',
    images: [`${SITE}/_astro/frog.jpg`, `${SITE}/_astro/legs.jpg?w=1&h=2`],
  });
});

test('pages without a date get photos only', () => {
  expect(pageExtras('<main><img src="/a.jpg" alt="A"></main>', SITE)).toEqual({
    images: [`${SITE}/a.jpg`],
  });
});

test('adds the date and photos to each listed page and leaves the others as they were', () => {
  const sitemap =
    '<urlset><url><loc>https://example.com/patterns/frog/</loc></url><url><loc>https://example.com/about/</loc></url></urlset>';
  const out = enrichSitemap(sitemap, (loc) =>
    loc.endsWith('/frog/') ? pageExtras(page, SITE) : undefined,
  );
  expect(out).toBe(
    '<urlset><url><loc>https://example.com/patterns/frog/</loc><lastmod>2026-10-20T00:00:00.000Z</lastmod>' +
      '<image:image><image:loc>https://example.com/_astro/frog.jpg</image:loc></image:image>' +
      '<image:image><image:loc>https://example.com/_astro/legs.jpg?w=1&amp;h=2</image:loc></image:image></url>' +
      '<url><loc>https://example.com/about/</loc></url></urlset>',
  );
});
