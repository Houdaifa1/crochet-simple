import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// the test build: fixtures from tests/fixtures/content, SITE_URL=https://example.com, 6 per page
const SITE = 'https://example.com';
const THIRD_PARTY = /googlesyndication|cloudflareinsights|pinterest\.com|etsy\.com/;
const PAGES = [
  '/',
  '/patterns/',
  '/patterns/page/2/',
  '/patterns/free/',
  '/patterns/category/tech-cases/',
  '/patterns/blue-market-bag/',
  '/patterns/crochet-panda/',
  '/journal/',
  '/journal/how-to-read-a-crochet-pattern/',
  '/about/',
  '/privacy/',
  '/terms/',
  '/search/?q=bag',
];
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 },
  small: { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
} as const;

async function visit(page: Page, path: string) {
  const problems: string[] = [];
  await page.route(THIRD_PARTY, (r) =>
    r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }),
  );
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('response', (r) => r.status() >= 400 && problems.push(`${r.status()} ${r.url()}`));
  await page.goto(path, { waitUntil: 'networkidle' });
  return problems;
}

for (const [name, size] of Object.entries(SIZES)) {
  test.describe(`every page on ${name}`, () => {
    test.use(size);
    for (const path of PAGES) {
      test(`${path} loads cleanly, fits the screen and passes accessibility checks`, async ({
        page,
      }) => {
        const problems = await visit(page, path);
        expect(problems).toEqual([]);
        expect(await page.locator('h1').count()).toBe(1);
        // content may be clipped on purpose; what matters is that the page never scrolls sideways
        const sideways = await page.evaluate(() => {
          window.scrollTo(400, window.scrollY);
          return window.scrollX;
        });
        expect(sideways).toBe(0);
        // let fade-ins finish, so colours are checked as readers see them
        await page.evaluate(() =>
          document.querySelectorAll('.rise').forEach((e) => e.classList.add('in')),
        );
        await page.waitForTimeout(1000);
        const axe = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(
          axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`),
        ).toEqual([]);
      });
    }
  });
}

test.describe('search engines and Pinterest', () => {
  test('every page has its own title, a description and the right canonical address', async ({
    page,
  }) => {
    const titles = new Set<string>();
    for (const path of PAGES.filter((p) => !p.startsWith('/search/'))) {
      await visit(page, path);
      const title = await page.title();
      expect(titles.has(title), `duplicate title ${title}`).toBe(false);
      titles.add(title);
      expect(title.length).toBeLessThanOrEqual(70);
      expect(
        (await page.locator('meta[name=description]').getAttribute('content'))!.length,
      ).toBeGreaterThan(40);
      expect(await page.locator('link[rel=canonical]').getAttribute('href')).toBe(SITE + path);
      expect(title).not.toMatch(/[—–]/);
      // every page shows a picture when shared on Pinterest, Facebook or in messages
      expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toMatch(
        new RegExp(`^${SITE}/_astro/.+\\.(jpg|png|webp)$`),
      );
    }
  });

  test('pattern pages describe themselves for Google and Rich Pins', async ({ page }) => {
    await visit(page, '/patterns/blue-market-bag/');
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = ld.map((t) => JSON.parse(t)['@type']);
    expect(types).toEqual(['Article', 'VideoObject', 'BreadcrumbList']);
    const article = JSON.parse(ld[0]!);
    expect(article.image[1]).toBe(`${SITE}/pins/blue-market-bag.jpg`);
    expect(article.educationalLevel).toBe('Easy');
    const video = JSON.parse(ld[1]!);
    expect(video).toMatchObject({
      name: 'Test fixture video: blue market bag',
      uploadDate: '2026-09-01T10:00:00Z',
      duration: 'PT8M36S',
      embedUrl: 'https://www.youtube.com/embed/aAxGTnVNJiE',
    });
    expect(video.thumbnailUrl[0]).toMatch(/^https:\/\/example\.com\/_astro\/.+\.jpg$/);
    expect(article.dateModified).toBe('2026-09-29');
    expect(await page.locator('meta[property="og:type"]').getAttribute('content')).toBe('article');
    expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toMatch(
      /^https:\/\/example\.com\/_astro\/.+\.jpg$/,
    );
    expect(await page.locator('meta[property="article:published_time"]').count()).toBe(1);
    expect(await page.locator('meta[name="p:domain_verify"]').getAttribute('content')).toBe(
      'test-pinterest-token',
    );
    const save = await page.locator('a.save').getAttribute('href');
    expect(save).toContain('pinterest.com/pin/create/button/');
    expect(decodeURIComponent(save!)).toContain(`${SITE}/pins/blue-market-bag.jpg`);
  });

  test('a pattern shows its skill level, time and video, and YouTube loads only on play', async ({
    page,
  }) => {
    await visit(page, '/patterns/blue-market-bag/');
    await expect(page.locator('.tags')).toContainText('Easy');
    await expect(page.locator('dl.facts')).toContainText('About 6 hours');
    const frame = page.locator('.video .frame');
    await expect(frame.locator('iframe')).toHaveCount(0);
    await frame.getByRole('button', { name: /Play the video/ }).click();
    await expect(frame.locator('iframe')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/aAxGTnVNJiE?autoplay=1&rel=0',
    );
  });

  test('a paid pattern ends with its Etsy listing as a full card', async ({ page }) => {
    await visit(page, '/patterns/airpods-pouch/');
    const card = page.locator('.get.end .link-card');
    await expect(card).toHaveAttribute(
      'href',
      'https://www.etsy.com/listing/9999913/airpods-pouch',
    );
    await expect(card).toContainText('Test fixture Etsy listing: AirPods pouch pattern');
    await expect(card).toContainText('$4.50');
    await expect(card.locator('.title')).toHaveCSS('color', 'rgb(42, 41, 37)');
  });

  test('the homepage declares the site, and the search page stays out of the index', async ({
    page,
  }) => {
    await visit(page, '/');
    const types = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(
      (t) => JSON.parse(t)['@type'],
    );
    expect(types).toEqual(['WebSite', 'Organization']);
    await visit(page, '/search/');
    expect(await page.locator('meta[name=robots]').getAttribute('content')).toBe('noindex, follow');
  });

  test('sitemap, robots, feed and ads.txt are published', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).toContain(`${SITE}/patterns/blue-market-bag/`);
    expect(sitemap).toContain(`${SITE}/journal/how-to-read-a-crochet-pattern/`);
    expect(sitemap).not.toContain('/search/');
    expect(await (await request.get('/robots.txt')).text()).toContain(
      `Sitemap: ${SITE}/sitemap-index.xml`,
    );
    const feed = await (await request.get('/rss.xml')).text();
    expect(feed.match(/<item>/g)).toHaveLength(12);
    expect(await (await request.get('/ads.txt')).text()).toBe(
      'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n',
    );
  });

  test('each pattern gets a 1000 × 1500 Pinterest image', async ({ page }) => {
    await visit(page, '/patterns/');
    const size = await page.evaluate(async () => {
      const img = new Image();
      img.src = '/pins/daisy-clip.jpg';
      await img.decode();
      return [img.naturalWidth, img.naturalHeight];
    });
    expect(size).toEqual([1000, 1500]);
  });
});

test.describe('patterns', () => {
  test.use(SIZES.phone);

  test('lists six per page with numbered pages', async ({ page }) => {
    await visit(page, '/patterns/');
    await expect(page.locator('.grid .card')).toHaveCount(6);
    await expect(page.locator('.pager a[aria-current=page]')).toHaveText('1');
    await visit(page, '/patterns/page/2/');
    await expect(page.locator('.grid .card')).toHaveCount(1);
  });

  test('"Free only" shows only free patterns, on its own address', async ({ page }) => {
    await visit(page, '/patterns/');
    await page.locator('a.toggle').click();
    await expect(page).toHaveURL(/\/patterns\/free\/$/);
    await expect(page.locator('.grid .card')).toHaveCount(4);
    expect(await page.locator('.grid .card .badge').allTextContents()).toEqual(
      Array(4).fill('Free PDF'),
    );
  });

  test('categories without free patterns have no "Free only" switch', async ({ page }) => {
    await visit(page, '/patterns/category/tech-cases/');
    await expect(page.locator('.grid .card')).toHaveCount(2);
    await expect(page.locator('a.toggle')).toHaveCount(0);
  });

  test('a pattern with only the required fields leaves no empty boxes', async ({ page }) => {
    await visit(page, '/patterns/crochet-panda/');
    for (const selector of [
      '[data-get]',
      '.facts',
      '.toc',
      'article',
      '.thumbs',
      '.count',
      '.ad',
      '.pill',
      '.tag.free',
      '.tag.etsy',
    ]) {
      await expect(page.locator(selector), selector).toHaveCount(0);
    }
    await expect(page.locator('h1')).toHaveText('Crochet panda');
    await expect(page.locator('.related .card')).toHaveCount(4);
  });

  test('details show only what was filled in', async ({ page }) => {
    await visit(page, '/patterns/olive-cup-cozy/');
    await expect(page.locator('dl.facts dt')).toHaveText(['Yarn']);
    await visit(page, '/patterns/blue-market-bag/');
    await expect(page.locator('dl.facts dt')).toHaveText([
      'Skill level',
      'Time to make',
      'Hook',
      'Yarn',
      'Finished size',
    ]);
  });

  test('the free PDF downloads from a clean address', async ({ page, request }) => {
    await visit(page, '/patterns/blue-market-bag/');
    await expect(page.locator('[data-get] .fine').first()).toContainText('PDF · 2 pages · 31 KB');
    const res = await request.get('/downloads/blue-market-bag.pdf');
    expect(res.headers()['content-type']).toContain('application/pdf');
    expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('Etsy patterns send people to Etsy in a new tab', async ({ page }) => {
    await visit(page, '/patterns/airpods-pouch/');
    const cta = page.locator('[data-get] a.btn').first();
    await expect(cta).toContainText('Get the pattern on Etsy');
    expect(await cta.getAttribute('target')).toBe('_blank');
    expect(await cta.getAttribute('href')).toMatch(/^https:\/\/www\.etsy\.com\/listing\//);
  });

  test('link cards show real details: Pinterest pin, Etsy price and rating', async ({ page }) => {
    await visit(page, '/patterns/blue-market-bag/');
    const cards = page.locator('.link-card');
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText('View on Pinterest');
    await expect(cards.nth(1)).toContainText('$6.50');
    await expect(cards.nth(1).locator('.rating')).toHaveAttribute(
      'aria-label',
      'Rated 4.9 out of 5 from 212 reviews',
    );
  });

  test('a small download button follows the reader between the two download cards', async ({
    page,
  }) => {
    await visit(page, '/patterns/blue-market-bag/');
    const pill = page.locator('.pill');
    await expect(pill).not.toHaveClass(/on/);
    await page.evaluate(() =>
      window.scrollTo(
        0,
        document.querySelector('#abbreviations')!.getBoundingClientRect().top + scrollY - 200,
      ),
    );
    await expect(pill).toHaveClass(/on/);
    await page.locator('.get.end').scrollIntoViewIfNeeded();
    await expect(pill).not.toHaveClass(/on/);
  });

  test('the gallery thumbnails switch photos', async ({ page }) => {
    await visit(page, '/patterns/blue-market-bag/');
    await page.locator('.thumbs button').nth(2).click();
    await expect(page.locator('.count b')).toHaveText('3');
    await expect(page.locator('.thumbs button').nth(2)).toHaveAttribute('aria-current', 'true');
  });

  test('search finds patterns and stories', async ({ page }) => {
    await visit(page, '/search/');
    await page.locator('#q').fill('panda');
    await expect(page.locator('.results a').first()).toHaveAttribute(
      'href',
      '/patterns/crochet-panda/',
    );
    await page.locator('#q').fill('zzzz');
    await expect(page.locator('.status')).toContainText('Nothing found');
  });
});

test.describe('ads', () => {
  for (const [name, size] of [
    ['phone', SIZES.phone],
    ['desktop', SIZES.desktop],
  ] as const) {
    test(`stay well away from download buttons on ${name}`, async ({ page }) => {
      await page.setViewportSize(size.viewport);
      await visit(page, '/patterns/blue-market-bag/');
      await expect(page.locator('.ad ins.adsbygoogle')).toHaveCount(1);
      const gap = await page.evaluate(() => {
        const ads = [...document.querySelectorAll('.ad')].map((a) => a.getBoundingClientRect());
        const buttons = [...document.querySelectorAll('[data-get]')].map((b) =>
          b.getBoundingClientRect(),
        );
        return Math.min(
          ...ads.flatMap((a) => buttons.map((b) => Math.max(b.top - a.bottom, a.top - b.bottom))),
        );
      });
      expect(gap).toBeGreaterThan(300);
    });
  }

  test('follow the admin switches: page off, homepage never', async ({ page }) => {
    await visit(page, '/patterns/bucket-hat/');
    await expect(page.locator('.ad')).toHaveCount(0);
    await expect(page.locator('script[src*="adsbygoogle"]')).toHaveCount(0);
    await visit(page, '/');
    await expect(page.locator('script[src*="adsbygoogle"]')).toHaveCount(0);
    await visit(page, '/patterns/blue-market-bag/');
    await expect(page.locator('script[src*="adsbygoogle"]')).toHaveAttribute(
      'src',
      /client=ca-pub-0000000000000000/,
    );
  });

  test('hold their space so the page never jumps', async ({ page }) => {
    await visit(page, '/journal/how-to-read-a-crochet-pattern/');
    const h = await page
      .locator('.ad')
      .first()
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(300);
  });
});

test.describe('touch and links', () => {
  test.use(SIZES.phone);

  test('the menu stays in place from page to page, with no slide-in after the first page', async ({
    page,
  }) => {
    await visit(page, '/about/');
    await page.locator('.dock a[href="/patterns/"]').click();
    await page.waitForURL('**/patterns/');
    const dock = await page.locator('.dock').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        animation: getComputedStyle(el).animationName,
        onScreen: r.top >= 0 && r.bottom <= innerHeight,
      };
    });
    expect(dock).toEqual({ animation: 'none', onScreen: true });
  });

  test('the menu pages are loaded ahead, so a tap opens them at once', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'WebKit loads ahead without link tags');
    await visit(page, '/patterns/');
    await expect
      .poll(() =>
        page
          .locator('link[rel="prefetch"]')
          .evaluateAll((ls) => ls.map((l) => new URL((l as HTMLLinkElement).href).pathname)),
      )
      .toEqual(expect.arrayContaining(['/', '/journal/', '/about/']));
  });

  test('controls are at least 44 px tall on phones', async ({ page }) => {
    for (const path of ['/patterns/', '/patterns/blue-market-bag/', '/journal/', '/about/']) {
      await visit(page, path);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('a, button, input')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            const inText = el.closest('p, li, figcaption, td') && !el.matches('.btn, .chip');
            return (
              r.width > 0 &&
              r.height > 0 &&
              !inText &&
              !el.closest('.skip, .card, .link-card, .post, .featured, .profile, .next, .pill')
            );
          })
          .filter((el) => el.getBoundingClientRect().height < 44)
          .map(
            (el) =>
              `${el.tagName} ${el.className} "${el.textContent?.trim().slice(0, 20)}" ${Math.round(el.getBoundingClientRect().height)}`,
          ),
      );
      expect(small, path).toEqual([]);
    }
  });

  test('the Pinterest profile card is in the footer', async ({ page }) => {
    await visit(page, '/journal/');
    const card = page.locator('footer a.profile');
    await expect(card).toHaveAttribute('href', 'https://www.pinterest.com/crochetsimple/');
    await expect(card).toContainText('Crochet Simplified');
  });
});
