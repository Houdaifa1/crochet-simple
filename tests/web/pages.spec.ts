import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';

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
  test('a pattern links to its published pin and still offers a new save', async ({ page }) => {
    await visit(page, '/patterns/blue-market-bag/');
    const pin = page.locator('.share').getByRole('link', { name: /^View on Pinterest/ });
    await expect(pin).toHaveAttribute('href', 'https://www.pinterest.com/pin/123456789/');
    await expect(pin).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('link', { name: /^Save to Pinterest/ })).toHaveAttribute(
      'href',
      /pin\/create\/button/,
    );
    await visit(page, '/patterns/crochet-panda/');
    await expect(page.getByRole('link', { name: /^View on Pinterest/ })).toHaveCount(0);
  });

  test('featured products link to the same pattern and its published pin', async ({ page }) => {
    await visit(page, '/about/');
    const links = page.getByRole('navigation', { name: 'Blue market bag links' });
    await expect(links).toHaveCount(2);
    for (const product of await links.all()) {
      await expect(
        product.getByRole('link', { name: 'Get the pattern', exact: true }),
      ).toHaveAttribute('href', '/patterns/blue-market-bag/');
      await expect(product.getByRole('link', { name: /^View on Pinterest/ })).toHaveAttribute(
        'href',
        'https://www.pinterest.com/pin/123456789/',
      );
    }
    await visit(page, '/journal/how-to-read-a-crochet-pattern/');
    const cover = page.getByRole('navigation', { name: 'Laptop sleeve links' });
    await expect(cover.getByRole('link', { name: 'Get the pattern', exact: true })).toHaveAttribute(
      'href',
      '/patterns/laptop-sleeve/',
    );
    await expect(cover.getByRole('link', { name: /^View on Pinterest/ })).toHaveAttribute(
      'href',
      'https://www.pinterest.com/pin/987654321/',
    );
  });
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

  test('Google titles and descriptions from the admin are used, and shared without the site name', async ({
    page,
  }) => {
    await visit(page, '/patterns/blue-market-bag/');
    await expect(page).toHaveTitle('Free Crochet Market Bag Pattern (PDF) | Crochet Simplified');
    expect(await page.locator('meta[name=description]').getAttribute('content')).toBe(
      'Crochet a sturdy cobalt market bag with this free pattern: written rounds, photos and a printable PDF.',
    );
    expect(await page.locator('meta[property="og:title"]').getAttribute('content')).toBe(
      'Free Crochet Market Bag Pattern (PDF)',
    );
    await visit(page, '/patterns/category/bags/');
    await expect(page).toHaveTitle(
      'Free Crochet Bag Patterns: Totes and Market Bags | Crochet Simplified',
    );
    // without an admin title a category is named once, with free first when every pattern is free
    await visit(page, '/patterns/category/hats/');
    await expect(page).toHaveTitle('Free Hats Crochet Patterns | Crochet Simplified');
    await visit(page, '/patterns/daisy-clip/');
    await expect(page).toHaveTitle('Daisy clip | Free Crochet Pattern | Crochet Simplified');
  });

  test('a free only page exists only where it shows something different', async ({
    page,
    request,
  }) => {
    // the full list mixes free and paid patterns, so its free page is real and has its switch
    await visit(page, '/patterns/');
    await expect(page.locator('a.toggle')).toHaveAttribute('href', '/patterns/free/');
    await visit(page, '/patterns/free/');
    expect(await page.locator('link[rel=canonical]').getAttribute('href')).toBe(
      `${SITE}/patterns/free/`,
    );
    // every bag pattern is free: no copy of its page, no switch, and the chip leads to the real page
    await expect(page.locator('.chips a', { hasText: 'Bags' })).toHaveAttribute(
      'href',
      '/patterns/category/bags/',
    );
    expect((await request.get('/patterns/category/bags/free/')).status()).toBe(404);
    await visit(page, '/patterns/category/bags/');
    await expect(page.locator('a.toggle')).toHaveCount(0);
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).toContain(`${SITE}/patterns/free/`);
    expect(sitemap).not.toContain('/category/bags/free/');
    // old free addresses that are no longer built move to the full list for good
    const redirects = readFileSync(
      resolve(import.meta.dirname, '../../apps/web/dist-test/_redirects'),
      'utf8',
    );
    expect(redirects).toContain('/patterns/category/bags/free/ /patterns/category/bags/ 301\n');
    expect(redirects).not.toContain('/patterns/free/ ');
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

  test('a pattern has its own big heading, and step photos in a row sit side by side, whole', async ({
    page,
  }) => {
    await visit(page, '/patterns/blue-market-bag/');
    await expect(page.locator('h1')).toHaveText('Blue Market Bag Crochet Pattern');
    const article = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').first().textContent())!,
    );
    expect(article.headline).toBe('Blue Market Bag Crochet Pattern');
    const pair = page.locator('.prose .photos.pair');
    await pair.scrollIntoViewIfNeeded();
    await expect(pair.locator('figure')).toHaveCount(2);
    await expect(pair.locator('figcaption').first()).toHaveText(
      'Sew the cherries to the left handle.',
    );
    await expect
      .poll(() =>
        pair
          .locator('img')
          .evaluateAll((imgs) =>
            imgs.every(
              (i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    const shown = await pair.locator('img').evaluateAll((imgs) =>
      imgs.map((i) => {
        const r = i.getBoundingClientRect();
        const img = i as HTMLImageElement;
        return {
          top: Math.round(r.top),
          ratio: r.width / r.height,
          own: img.naturalWidth / img.naturalHeight,
        };
      }),
    );
    expect(shown[0]!.top).toBe(shown[1]!.top);
    for (const p of shown) expect(Math.abs(p.ratio - p.own)).toBeLessThan(0.02);
    // a photo on its own keeps the full width, and cards keep the short title
    await expect(page.locator('.prose > figure:not(.chart)')).toHaveCount(1);
    await visit(page, '/patterns/category/bags/');
    await expect(page.locator('.grid')).toContainText('Blue market bag');
  });

  test('a size chart shows every size as a row and fits a small phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await visit(page, '/patterns/blue-market-bag/');
    const chart = page.locator('.prose .chart');
    await expect(chart.locator('figcaption')).toHaveText('Finished size');
    await expect(chart.locator('thead th')).toHaveText(['Size', 'Width', 'Height', 'Handles']);
    await expect(chart.locator('tbody th')).toHaveText(['Regular', 'Large']);
    await expect(chart.locator('.chart-scroll')).toHaveAttribute('tabindex', '0');
    await expect(chart.locator('.chart-scroll')).toHaveAttribute('aria-label', 'Finished size');
    const fits = await chart.evaluate((c) => c.getBoundingClientRect().right <= innerWidth);
    expect(fits).toBe(true);
    // four columns fit without scrolling sideways, and a measurement never splits over two lines
    const scroll = chart.locator('.chart-scroll');
    const extra = await scroll.evaluate((s) => s.scrollWidth - s.clientWidth);
    expect(extra).toBeLessThanOrEqual(0);
    await expect(chart.locator('tbody td').first()).toHaveText('34\u00a0cm (13.4\u00a0in)');
  });

  test('a paid pattern ends with its Etsy listing as a full card', async ({ page }) => {
    await visit(page, '/patterns/airpods-pouch/');
    const card = page.locator('.get .link-card');
    await expect(card).toHaveAttribute(
      'href',
      'https://www.etsy.com/listing/9999913/airpods-pouch',
    );
    await expect(card).toContainText('Test fixture Etsy listing: AirPods pouch pattern');
    await expect(card).toContainText('$4.50');
    await expect(card.locator('.title')).toHaveCSS('color', 'rgb(42, 41, 37)');
  });

  test('the homepage declares the site, open pages allow big previews, search stays out', async ({
    page,
  }) => {
    await visit(page, '/');
    const types = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(
      (t) => JSON.parse(t)['@type'],
    );
    expect(types).toEqual(['WebSite', 'Organization']);
    // open pages allow large photo previews in search results
    expect(await page.locator('meta[name=robots]').getAttribute('content')).toBe(
      'max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    );
    await visit(page, '/patterns/blue-market-bag/');
    expect(await page.locator('meta[name=robots]').getAttribute('content')).toContain(
      'max-image-preview:large',
    );
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

test.describe('information pages and journal guides', () => {
  for (const width of [360, 430, 1280]) {
    test(`policy and guide contents work at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/privacy/', '/terms/', '/journal/how-to-read-a-crochet-pattern/']) {
        await visit(page, path);
        const nav = page.locator('main nav.contents');
        await expect(nav).toBeVisible();
        const links = nav.locator('a');
        expect(await links.count()).toBeGreaterThan(0);
        const hrefs = await links.evaluateAll((elements) =>
          elements.map((el) => el.getAttribute('href')),
        );
        expect(new Set(hrefs).size).toBe(hrefs.length);
        for (const href of hrefs) await expect(page.locator(href!)).toHaveCount(1);
        await links.first().focus();
        await expect(links.first()).toBeFocused();
        await page.keyboard.press('Enter');
        await expect.poll(() => new URL(page.url()).hash).toBe(hrefs[0]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          width,
        );
      }
    });
  }

  test('the About introduction and story remain editable content', async ({ page }) => {
    await visit(page, '/about/');
    await expect(page.locator('h1')).toContainText('Test fixture: patterns');
    await expect(page.locator('.hero .lede')).toContainText('Test fixture story paragraph');
    await expect(page.locator('.story')).toContainText('A second test paragraph.');
    await expect(page.locator('.hero picture source[type="image/avif"]')).toHaveCount(3);
    await expect(page.locator('.main-photo img')).toHaveAttribute('fetchpriority', 'high');
    await expect(page.locator('.small-photo img')).toHaveCount(2);
    for (const image of await page.locator('.small-photo img, .work-photo img').all())
      await expect(image).toHaveAttribute('loading', 'lazy');
    await expect(page.locator('.work-photo figcaption')).toHaveText(['Cup cozy', 'Pouch']);
  });

  test('the Journal links to real guides and the pattern collection', async ({ page }) => {
    await visit(page, '/journal/');
    const featured = page.locator('a.featured');
    await expect(featured).toBeVisible();
    const destination = await featured.getAttribute('href');
    expect(destination).toMatch(/^\/journal\/[^/]+\/$/);
    await expect(page.locator('.practice .btn')).toHaveAttribute('href', '/patterns/');
    await featured.click();
    await expect(page.locator('article.prose')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute('content', /noindex/);
  });

  test('the photo board stops movement when reduced motion is selected', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await visit(page, '/about/');
    for (const element of await page.locator('.photo, .thread path').all())
      await expect(element).toHaveCSS('animation-name', 'none');
    await expect(page.locator('.main-photo')).toBeVisible();
    await page.goto('/journal/');
    await expect(page.locator('.featured .media img')).toHaveCSS('transition-duration', '0s');
  });

  test('the photo board and story work without scripts', async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 360, height: 800 },
    });
    const page = await context.newPage();
    await page.goto('/about/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.small-photo')).toHaveCount(2);
    await page.locator('.story').scrollIntoViewIfNeeded();
    await expect(page.locator('.story')).toBeVisible();
    await expect(page.locator('.story')).toHaveCSS('opacity', '1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      360,
    );
    await context.close();
  });

  test('the default privacy policy describes storage and video playback', async ({ page }) => {
    await visit(page, '/privacy/');
    await expect(page.locator('main')).toContainText('browser session');
    await expect(page.locator('main')).toContainText('only after you press play');
    await visit(page, '/terms/');
    await expect(page.locator('main')).toContainText('sell finished items you make by hand');
    await expect(page.locator('main')).toContainText('consumer rights');
  });
});

test.describe('patterns', () => {
  test.use(SIZES.phone);

  test('the download card uses its chosen picture or the cover photo', async ({ page }) => {
    for (const [slug, filename] of [
      ['blue-market-bag', 'blue-market-bag-download'],
      ['daisy-clip', '02-daisy-clip'],
    ]) {
      await visit(page, `/patterns/${slug}/`);
      const card = page.locator('[data-get]');
      await expect(page.locator('#download')).toHaveCount(1);
      const picture = card.locator('picture');
      const photo = picture.locator('img');
      await expect(photo).toHaveAttribute('alt', '');
      await expect(photo).toHaveAttribute('loading', 'lazy');
      await expect(photo).toHaveAttribute('src', new RegExp(filename!));
      await expect(picture.locator('source[type="image/avif"]')).toHaveAttribute('srcset', /1600w/);
      await expect(picture.locator('source[type="image/webp"]')).toHaveAttribute('srcset', /480w/);
      await expect(photo).toHaveAttribute('sizes', /100vw - 48px/);
      await card.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
        )
        .toBe(true);
    }
  });

  for (const width of [360, 1280]) {
    test(`download buttons fit inside the picture card at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const slug of ['blue-market-bag', 'daisy-clip', 'laptop-sleeve']) {
        await visit(page, `/patterns/${slug}/`);
        const card = page.locator('[data-get]');
        await card.scrollIntoViewIfNeeded();
        const button = card.locator('.btn');
        await expect(button).toBeVisible();
        const cardBox = (await card.boundingBox())!;
        const buttonBox = (await button.boundingBox())!;
        expect(buttonBox.height).toBeGreaterThanOrEqual(48);
        expect(buttonBox.x).toBeGreaterThanOrEqual(cardBox.x);
        expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width);
        expect(buttonBox.y).toBeGreaterThanOrEqual(cardBox.y);
        expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(cardBox.y + cardBox.height);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          width,
        );
      }
    });

    test(`download text has readable contrast over its picture at ${width} px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const luminance = (color: number[]) =>
        color.reduce((sum, channel, i) => {
          const value = channel / 255;
          return (
            sum +
            (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) *
              [0.2126, 0.7152, 0.0722][i]!
          );
        }, 0);
      const contrast = (a: number[], b: number[]) => {
        const values = [luminance(a), luminance(b)].sort((x, y) => x - y);
        return (values[1]! + 0.05) / (values[0]! + 0.05);
      };
      for (const slug of ['blue-market-bag', 'daisy-clip', 'airpods-pouch', 'laptop-sleeve']) {
        await visit(page, `/patterns/${slug}/`);
        const card = page.locator('[data-get]');
        await card.scrollIntoViewIfNeeded();
        await card.evaluate((section) =>
          window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY - 90),
        );
        await expect
          .poll(() =>
            card
              .locator('img.background')
              .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
          )
          .toBe(true);
        await page.evaluate(() => document.fonts.ready);
        const text = await card.evaluate((section) => {
          const card = section.getBoundingClientRect();
          return [...section.querySelectorAll<HTMLElement>('h2, .lead, .fine')].map((element) => {
            const box = element.getBoundingClientRect();
            const color = getComputedStyle(element)
              .color.match(/[\d.]+/g)!
              .map(Number);
            element.style.visibility = 'hidden';
            return {
              x: box.x - card.x,
              y: box.y - card.y,
              width: box.width,
              height: box.height,
              color,
            };
          });
        });
        const pixels = PNG.sync.read(await card.screenshot({ scale: 'css' }));
        for (const box of text) {
          let lowest = Infinity;
          for (let y = Math.ceil(box.y); y < Math.floor(box.y + box.height); y += 2) {
            for (let x = Math.ceil(box.x); x < Math.floor(box.x + box.width); x += 2) {
              const i = (y * pixels.width + x) * 4;
              lowest = Math.min(
                lowest,
                contrast(box.color.slice(0, 3), [...pixels.data.subarray(i, i + 3)]),
              );
            }
          }
          expect(lowest, `${slug} text over the photograph`).toBeGreaterThanOrEqual(4.5);
        }
        const button = card.locator('.btn');
        if (await button.count()) {
          const colors = await button.evaluate((element) => {
            const css = getComputedStyle(element);
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            const context = canvas.getContext('2d')!;
            const sample = (color: string) => {
              context.clearRect(0, 0, 1, 1);
              context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
                '--sheet',
              );
              context.fillRect(0, 0, 1, 1);
              context.fillStyle = color;
              context.fillRect(0, 0, 1, 1);
              return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
            };
            return [css.color, css.backgroundColor, css.borderTopColor].map(sample);
          });
          expect(contrast(colors[0]!, colors[1]!)).toBeGreaterThanOrEqual(4.5);
          expect(contrast(colors[2]!, [255, 254, 252])).toBeGreaterThanOrEqual(3);
        }
      }
    });
  }

  test('the picture card preserves both paid pattern choices', async ({ page }) => {
    await visit(page, '/patterns/airpods-pouch/');
    await expect(page.locator('[data-get] .link-card')).toBeVisible();
    await expect(page.locator('[data-get] h2')).toHaveText('Get the pattern');
    await visit(page, '/patterns/laptop-sleeve/');
    await expect(page.locator('[data-get] .btn')).toHaveText(/Get the pattern on Etsy/);
    await expect(page.locator('[data-get] .btn')).toHaveAttribute('target', '_blank');
    await expect(page.locator('[data-get] .lead')).toHaveText(
      'The full pattern is available on Etsy.',
    );
  });

  test('the download button keeps its address, icon and keyboard focus', async ({ page }) => {
    await visit(page, '/patterns/blue-market-bag/');
    const card = page.locator('[data-get]');
    await expect(card).toHaveAttribute('aria-labelledby', 'download-title');
    await expect(card).toHaveCSS('scroll-margin-top', '90px');
    const button = card.locator('.btn');
    await expect(button).toHaveAttribute('href', '/downloads/blue-market-bag.pdf');
    await expect(button).toHaveAttribute('download', '');
    await expect(button.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    await button.focus();
    await expect(button).toHaveCSS('outline-style', 'solid');
    await expect(button).toHaveCSS('outline-width', '3px');
    const shadow = await button.evaluate((element) => getComputedStyle(element).boxShadow);
    await button.hover();
    await expect
      .poll(() => button.evaluate((element) => getComputedStyle(element).boxShadow))
      .not.toBe(shadow);
    await expect(button).toHaveCSS('color', 'rgb(255, 255, 255)');
  });

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
    await expect(page.locator('[data-get] h2')).toHaveText('Get the pattern');
    const cta = page.locator('[data-get] a').first();
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

  test('the download sits once, at the end of the pattern, and nothing floats over the text', async ({
    page,
  }) => {
    await visit(page, '/patterns/blue-market-bag/');
    await expect(page.locator('[data-get]')).toHaveCount(1);
    await expect(page.locator('[data-get] h2')).toHaveText('Download the free PDF');
    const afterThePattern = await page.evaluate(() =>
      Boolean(
        document
          .querySelector('article.body')!
          .compareDocumentPosition(document.querySelector('[data-get]')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    );
    expect(afterThePattern).toBe(true);
    await expect(page.locator('.toc a').last()).toHaveAttribute('href', '#download');
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight / 2));
    const floating = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('body *')]
        .filter(
          (el) =>
            getComputedStyle(el).position === 'fixed' &&
            el.getBoundingClientRect().height > 1 &&
            !el.closest('.dock'),
        )
        .map((el) => el.className),
    );
    expect(floating).toEqual([]);
  });

  test('on a wide screen the details and contents stay beside the pattern, centered', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await visit(page, '/patterns/blue-market-bag/');
    const side = page.locator('aside.side');
    const body = (await page.locator('article.body').boundingBox())!;
    expect((await side.boundingBox())!.x).toBeGreaterThan(body.x + body.width);
    await page.evaluate(() => document.querySelector('#finishing')!.scrollIntoView());
    const box = (await side.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeLessThan(100);
    const main = (await page.locator('.layout .main').boundingBox())!;
    expect(Math.abs(main.x - (1280 - box.x - box.width))).toBeLessThan(40);
  });

  test('on a phone no detail is cut off', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await visit(page, '/patterns/blue-market-bag/');
    const cut = await page
      .locator('dl.facts dd')
      .evaluateAll((dds) =>
        dds.filter((d) => d.scrollWidth > d.clientWidth + 1).map((d) => d.textContent),
      );
    expect(cut).toEqual([]);
  });

  test('the gallery thumbnails switch photos', async ({ page }) => {
    await visit(page, '/patterns/blue-market-bag/');
    await page.locator('.thumbs button').nth(2).click();
    await expect(page.locator('.count b')).toHaveText('3');
    await expect(page.locator('.thumbs button').nth(2)).toHaveAttribute('aria-current', 'true');
  });

  test('the photos never move by themselves', async ({ page }) => {
    await visit(page, '/patterns/blue-market-bag/');
    await page.locator('.gallery').scrollIntoViewIfNeeded();
    await page.waitForTimeout(6000);
    await expect(page.locator('.count b')).toHaveText('1');
    expect(await page.locator('.gallery .track').evaluate((t) => t.scrollLeft)).toBe(0);
    await expect(page.locator('.gallery button', { hasText: /pause|play/i })).toHaveCount(0);
    await expect(page.locator('.gallery .play')).toHaveCount(0);
  });

  test('step names never run into their instructions, on any screen', async ({ page }) => {
    for (const width of [360, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await visit(page, '/patterns/blue-market-bag/');
      const overlaps = await page.locator('.rounds li').evaluateAll(
        (items) =>
          items.filter((li) => {
            const a = li.querySelector('b')!.getBoundingClientRect();
            const b = li.querySelector(':scope > span')!.getBoundingClientRect();
            return a.right > b.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1;
          }).length,
      );
      expect(overlaps, `at ${width}px`).toBe(0);
      // a short step name like "Round 12" stays on one line
      const wrapped = await page
        .locator('.rounds:not(.long) li b')
        .evaluateAll((labels) =>
          labels
            .filter(
              (b) =>
                b.getBoundingClientRect().height > parseFloat(getComputedStyle(b).lineHeight) * 1.5,
            )
            .map((b) => b.textContent),
        );
      expect(wrapped, `at ${width}px`).toEqual([]);
    }
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

  test('the pattern list narrows while typing, without pressing Enter', async ({ page }) => {
    await visit(page, '/patterns/');
    const cards = page.locator('.grid a.card:visible');
    const all = await cards.count();
    const input = page.locator('#q');
    await input.click();
    await input.pressSequentially('ba');
    await expect(page.locator('.count')).toHaveText('1 pattern for “ba”');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toHaveAttribute('href', '/patterns/blue-market-bag/');
    await expect(page.locator('.pager')).toBeHidden();
    expect(new URL(page.url()).searchParams.get('q')).toBe('ba');
    // a pattern on the next page is listed below the cards
    await input.fill('panda');
    await expect(page.locator('.more')).toBeVisible();
    await expect(page.locator('.more li a').first()).toHaveAttribute(
      'href',
      '/patterns/crochet-panda/',
    );
    await input.fill('zzzz');
    await expect(page.locator('.count')).toContainText('Nothing found');
    await expect(cards).toHaveCount(0);
    // clearing the box brings the whole list back
    await input.fill('');
    await expect(cards).toHaveCount(all);
    await expect(page.locator('.more')).toBeHidden();
    // a shared link opens with the search already done
    await visit(page, '/patterns/?q=cozy');
    await expect(page.locator('.count')).toHaveText('1 pattern for “cozy”');
  });

  test('search says so when it cannot load, and works again once it can', async ({ page }) => {
    await page.route('**/pagefind/**', (r) => r.abort());
    await visit(page, '/patterns/');
    const input = page.locator('#q');
    await input.click();
    await input.pressSequentially('bag');
    await expect(page.locator('.count')).toHaveText(
      'Search could not load. Check your connection and type again.',
    );
    await page.unroute('**/pagefind/**');
    await input.pressSequentially('s');
    await expect(page.locator('.count')).toHaveText('1 pattern for “bags”');
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

  test('the Journal link is in the menu and the footer on every page', async ({ page }) => {
    for (const path of PAGES) {
      await visit(page, path);
      await expect(page.locator('.dock a[href="/journal/"]'), path).toBeVisible();
      await expect(page.locator('.dock a[href="/journal/"]'), path).toHaveText('Journal');
      await expect(page.locator('footer a[href="/journal/"]'), path).toHaveText('Journal');
    }
    await visit(page, '/');
    await expect(page.locator('.ending .actions a.quiet')).toHaveAttribute('href', '/journal/');
    await visit(page, '/about/');
    await expect(page.locator('main a[href="/journal/"]')).toHaveText('Read the journal');
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
