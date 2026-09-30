import { describe, expect, it } from 'vitest';
import { cardKind, readMeta, resolveLinkCard, resolveProfile } from '../src/cards.ts';

type Route = (url: string, init?: RequestInit) => Response | undefined;
const fake = (route: Route): typeof fetch =>
  (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const res = route(url, init);
    if (!res) return new Response('missing', { status: 404 });
    Object.defineProperty(res, 'url', { value: url });
    return res;
  }) as typeof fetch;
const html = (meta: Record<string, string>, title = '') =>
  new Response(
    `<html><head><title>${title}</title>${Object.entries(meta)
      .map(([k, v]) => `<meta property="${k}" content="${v}">`)
      .join('')}</head></html>`,
  );

describe('link cards', () => {
  it('knows Pinterest, Etsy and other links apart', () => {
    expect(cardKind('https://www.pinterest.com/pin/123/')).toBe('pinterest');
    expect(cardKind('https://pin.it/abc')).toBe('pinterest');
    expect(cardKind('https://www.pinterest.co.uk/pin/9/')).toBe('pinterest');
    expect(cardKind('https://www.etsy.com/listing/42/blue-bag')).toBe('etsy');
    expect(cardKind('https://example.com/a')).toBe('link');
  });

  it('reads open graph tags, decoding entities', () => {
    const meta = readMeta(
      '<meta content="Tom &amp; Jerry&#39;s" property="og:title"><meta name="description" content="Plain">',
    );
    expect(meta).toEqual({ 'og:title': "Tom & Jerry's", description: 'Plain' });
  });

  it('builds a Pinterest card from oEmbed and the pin page', async () => {
    const card = await resolveLinkCard('https://www.pinterest.com/pin/123/', {
      fetch: fake((url) =>
        url.includes('oembed')
          ? Response.json({
              title: 'Blue bag pattern',
              thumbnail_url: 'https://i.pinimg.com/1.jpg',
            })
          : html({ 'og:title': 'Blue bag pattern', 'og:description': 'Free crochet tote' }),
      ),
    });
    expect(card).toEqual({
      kind: 'pinterest',
      url: 'https://www.pinterest.com/pin/123/',
      title: 'Blue bag pattern',
      description: 'Free crochet tote',
      image: 'https://i.pinimg.com/1.jpg',
      siteName: 'Pinterest',
    });
  });

  it('falls back to the pin page when oEmbed is unavailable', async () => {
    const card = await resolveLinkCard('https://www.pinterest.com/pin/9/', {
      fetch: fake((url) =>
        url.includes('oembed')
          ? undefined
          : html({ 'og:title': 'Daisy', 'og:image': 'https://i/d.jpg' }),
      ),
    });
    expect(card).toMatchObject({ kind: 'pinterest', title: 'Daisy', image: 'https://i/d.jpg' });
  });

  it('builds an Etsy card with the real price and shop rating from the API', async () => {
    const seen: string[] = [];
    const card = await resolveLinkCard('https://www.etsy.com/listing/42/blue-bag?ref=x', {
      etsyApiKey: 'key:secret',
      fetch: fake((url, init) => {
        seen.push(`${url} ${(init?.headers as Record<string, string>)['x-api-key']}`);
        if (url.endsWith('/listings/42?includes=Images'))
          return Response.json({
            shop_id: 7,
            url: 'https://www.etsy.com/listing/42/blue-bag?utm=1',
            title: 'Blue Market Bag Pattern &amp; Charms',
            price: { amount: 650, divisor: 100, currency_code: 'USD' },
            images: [{ url_570xN: 'https://i.etsystatic.com/1.jpg' }],
          });
        if (url.endsWith('/shops/7'))
          return Response.json({
            shop_name: 'CrochetSimple',
            review_average: 4.87,
            review_count: 212,
          });
        return undefined;
      }),
    });
    expect(seen.every((s) => s.endsWith(' key:secret'))).toBe(true);
    expect(card).toEqual({
      kind: 'etsy',
      url: 'https://www.etsy.com/listing/42/blue-bag',
      title: 'Blue Market Bag Pattern & Charms',
      image: 'https://i.etsystatic.com/1.jpg',
      siteName: 'CrochetSimple',
      price: { amount: 6.5, currency: 'USD' },
      rating: { value: 4.9, count: 212 },
    });
  });

  it('leaves the rating out when the shop has no reviews', async () => {
    const card = await resolveLinkCard('https://www.etsy.com/listing/5/x', {
      etsyApiKey: 'k',
      fetch: fake((url) =>
        url.includes('/listings/')
          ? Response.json({
              shop_id: 1,
              title: 'X',
              price: { amount: 100, divisor: 100, currency_code: 'USD' },
            })
          : Response.json({ shop_name: 'S', review_average: null, review_count: 0 }),
      ),
    });
    expect(card.rating).toBeUndefined();
  });

  it('refuses a page with nothing to show instead of making a blank card', async () => {
    await expect(
      resolveLinkCard('https://example.com/x', { fetch: fake(() => html({})) }),
    ).rejects.toThrow('no title');
    await expect(
      resolveLinkCard('https://example.com/y', { fetch: fake(() => undefined) }),
    ).rejects.toThrow('404');
  });

  it('tidies real Pinterest pins: blank titles, save dates and small thumbnails', async () => {
    const card = await resolveLinkCard('https://www.pinterest.com/pin/7/', {
      fetch: fake((url) =>
        url.includes('oembed')
          ? Response.json({ title: ' ', thumbnail_url: 'https://i.pinimg.com/236x/13/80/db/a.jpg' })
          : html({
              'og:description': 'Sep 7, 2026 — Over 65 free crochet bag patterns. Pick one today!',
            }),
      ),
    });
    expect(card).toEqual({
      kind: 'pinterest',
      url: 'https://www.pinterest.com/pin/7/',
      title: 'Over 65 free crochet bag patterns.',
      description: 'Over 65 free crochet bag patterns. Pick one today!',
      image: 'https://i.pinimg.com/736x/13/80/db/a.jpg',
      siteName: 'Pinterest',
    });
  });

  it('leaves out Pinterest filler text and the default logo on a profile', async () => {
    const p = await resolveProfile('https://www.pinterest.com/hdrahm/', {
      fetch: fake(() =>
        html({
          'og:title': 'hdrahm - Profile | Pinterest',
          'og:description':
            'See what hdrahm (hdrahm) has discovered on Pinterest, the world&#x27;s biggest collection of ideas.',
          'og:image': 'https://s.pinimg.com/images/default_open_graph_1200.png',
        }),
      ),
    });
    expect(p).toEqual({ url: 'https://www.pinterest.com/hdrahm/', name: 'hdrahm' });
  });

  it('reads a Pinterest profile', async () => {
    const p = await resolveProfile('https://www.pinterest.com/crochetsimple/', {
      fetch: fake(() =>
        html({
          'og:title': 'Crochet Simple (crochetsimple) - Profile | Pinterest',
          'og:image': 'https://i/p.jpg',
        }),
      ),
    });
    expect(p).toEqual({
      url: 'https://www.pinterest.com/crochetsimple/',
      name: 'Crochet Simple',
      image: 'https://i/p.jpg',
    });
  });
});
