import { expect, test, type Page } from '@playwright/test';

const THIRD_PARTY = /googlesyndication|cloudflareinsights|pinterest\.com|etsy\.com/;
async function visit(page: Page, path: string) {
  await page.route(THIRD_PARTY, (route) =>
    route.fulfill({ contentType: 'text/javascript', body: '' }),
  );
  await page.goto(path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
}
const scrollTo = async (page: Page, y: number) => {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(y);
};
const tab = (page: Page, name: string) => page.locator(`.dock a[data-tab="${name}"]`);

for (const [device, width] of [
  ['phone', 375],
  ['desktop', 1280],
] as const) {
  test(`tapping a category keeps the page exactly where it is (${device})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await visit(page, '/patterns/');
    await page.evaluate(() => window.scrollTo(0, 180));
    const card = page.locator('.chips a[data-category="bags"]');
    await card.evaluate((a) => a.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
    const before = { box: (await card.boundingBox())! };
    await card.click();
    await expect(page).toHaveURL(/\/patterns\/category\/bags\/$/);
    await expect(page.locator('.chips a[data-category="bags"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
    const after = (await page.locator('.chips a[data-category="bags"]').boundingBox())!;
    expect(Math.abs(after.x - before.box.x)).toBeLessThanOrEqual(1);
    // the open card lifts a few pixels; otherwise it is in the same place
    expect(Math.abs(after.y - before.box.y)).toBeLessThanOrEqual(4);
  });
}

test('categories are plain links that work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  await page.goto('/patterns/');
  await page.locator('.chips a[data-category="hats"]').click();
  await expect(page).toHaveURL(/\/patterns\/category\/hats\/$/);
  await expect(page.locator('h1')).toHaveText('Hats');
  await context.close();
});

test('a category tap brings in its own write-up and removes the one before', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await visit(page, '/patterns/category/hats/');
  await expect(page.locator('.guide')).toHaveCount(0);
  await page.locator('.chips a[data-category="bags"]').click();
  await expect(page).toHaveURL(/\/patterns\/category\/bags\/$/);
  await expect(page.locator('.guide h2')).toHaveText('Test fixture: choosing a bag');
  await page.locator('.chips a[data-category="hats"]').click();
  await expect(page).toHaveURL(/\/patterns\/category\/hats\/$/);
  await expect(page.locator('.guide')).toHaveCount(0);
});

test('the next page of patterns opens at the list', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await visit(page, '/patterns/');
  await page.locator('.pager a[aria-label="Page 2"]').click();
  await expect(page).toHaveURL(/\/patterns\/page\/2\/$/);
  expect(
    await page.evaluate(() => document.querySelector('.filters')!.getBoundingClientRect().top),
  ).toBeCloseTo(0, 0);
});

test('categories are fetched ahead in every browser, other pages only where the browser reuses them', async ({
  page,
  browserName,
}) => {
  const pages: string[] = [];
  page.on('request', (r) => {
    if (/^\/(patterns|journal|about)\/[a-z0-9/-]*$/.test(new URL(r.url()).pathname))
      pages.push(new URL(r.url()).pathname);
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await visit(page, '/patterns/');
  const categories = await page
    .locator('.chips a, .bar a.toggle')
    .evaluateAll((all) =>
      all
        .map((a) => new URL((a as HTMLAnchorElement).href).pathname)
        .filter((u) => u !== '/patterns/'),
    );
  // a category or the free switch shows the patterns in place, so each is fetched once the page is up
  for (const url of categories) await expect.poll(() => pages).toContain(url);
  const ahead = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLLinkElement>('link[rel=prefetch]')].map(
      (l) => new URL(l.href).pathname,
    ),
  );
  for (const url of categories) expect(ahead).not.toContain(url);
  const reusable = await page.evaluate(() =>
    document.createElement('link').relList.supports('prefetch'),
  );
  if (!reusable) {
    // Safari opens a page from its own loads only, so no other page is fetched ahead to be thrown away
    expect(browserName).toBe('webkit');
    expect(ahead).toEqual([]);
    expect(pages.filter((p) => p !== '/patterns/' && !categories.includes(p))).toEqual([]);
    return;
  }
  for (const url of ['/journal/', '/about/']) expect(ahead).toContain(url);
  const first = new URL(
    await page
      .locator('.grid a.card')
      .first()
      .evaluate((a) => (a as HTMLAnchorElement).href),
  ).pathname;
  const last = new URL(
    await page
      .locator('.grid a.card')
      .last()
      .evaluate((a) => (a as HTMLAnchorElement).href),
  ).pathname;
  expect(ahead).toContain(first);
  expect(ahead).not.toContain(last);
  await page.locator('.grid a.card').last().scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll<HTMLLinkElement>('link[rel=prefetch]')].map(
          (l) => new URL(l.href).pathname,
        ),
      ),
    )
    .toContain(last);
});

test.describe('categories change in place', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  // the category pages are fetched once the page is up; a tap is measured once they are here
  const ready = async (page: Page, path = '/patterns/') => {
    const fetched = page.waitForResponse((r) => r.url().endsWith('/patterns/category/hats/'));
    await visit(page, path);
    await fetched;
  };

  test('a tap shows the category in the very next frame, without loading a new page', async ({
    page,
    request,
  }) => {
    await ready(page);
    await page.evaluate(() => ((window as unknown as { stay: boolean }).stay = true));
    const chip = page.locator('.chips a[data-category="bags"]');
    await chip.evaluate((a) => a.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
    // what the screen holds in the first frame after the tap
    const next = page.evaluate(
      () =>
        new Promise<object>((done) =>
          addEventListener(
            'click',
            () =>
              requestAnimationFrame(() =>
                done({
                  heading: document.querySelector('h1')!.textContent!.trim(),
                  cards: document.querySelectorAll('.grid a.card').length,
                  open: document
                    .querySelector('.chip[aria-current="page"]')
                    ?.getAttribute('data-category'),
                  address: location.pathname,
                }),
              ),
            { once: true },
          ),
        ),
    );
    const box = (await chip.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    expect(await next).toEqual({
      heading: 'Bags',
      cards: 1,
      open: 'bags',
      address: '/patterns/category/bags/',
    });
    // the same title, description and address for sharing as the real category page
    const real = await (await request.get('/patterns/category/bags/')).text();
    expect(await page.title()).toBe(
      real.match(/<title>([^<]*)<\/title>/)![1]!.replace(/&amp;/g, '&'),
    );
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
      'href',
      'https://example.com/patterns/category/bags/',
    );
    await expect(page.locator('.count')).toHaveText('1 pattern');
    // Back and Forward step through the categories, still without loading a page
    await page.goBack();
    await expect(page).toHaveURL(/\/patterns\/$/);
    await expect(page.locator('h1')).toHaveText('Patterns');
    await expect(page.locator('.grid a.card')).toHaveCount(6);
    await expect(page.locator('.chip[aria-current="page"]')).toHaveAttribute(
      'data-category',
      'all',
    );
    await page.goForward();
    await expect(page.locator('h1')).toHaveText('Bags');
    expect(await page.evaluate(() => (window as unknown as { stay?: boolean }).stay)).toBe(true);
  });

  test('a card keeps its size under the finger', async ({ page }) => {
    await ready(page);
    const chip = page.locator('.chips a[data-category="bags"]');
    await chip.evaluate((a) => a.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
    const box = (await chip.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(chip).toHaveCSS('transform', 'none');
    await page.mouse.up();
    await expect(page.locator('h1')).toHaveText('Bags');
  });

  test('the last tap wins when a category is slow to arrive', async ({ page }) => {
    // a phone saving data fetches a category only once it is touched
    await page.addInitScript(() =>
      Object.defineProperty(navigator, 'connection', { value: { saveData: true } }),
    );
    await page.route('**/patterns/category/tech-cases/', async (route) => {
      await new Promise((r) => setTimeout(r, 1200));
      await route.continue().catch(() => undefined);
    });
    await visit(page, '/patterns/');
    const tap = async (id: string) => {
      const chip = page.locator(`.chips a[data-category="${id}"]`);
      await chip.evaluate((a) => a.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
      const box = (await chip.boundingBox())!;
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    };
    await tap('tech-cases');
    // marked at once while its patterns are still on the way
    await expect(page.locator('.chip[aria-current="page"]')).toHaveAttribute(
      'data-category',
      'tech-cases',
    );
    await expect(page.locator('.grid')).toHaveAttribute('aria-busy', 'true');
    await tap('hats');
    await expect(page.locator('h1')).toHaveText('Hats');
    await page.waitForTimeout(1500);
    await expect(page.locator('h1')).toHaveText('Hats');
    await expect(page).toHaveURL(/\/category\/hats\/$/);
    await expect(page.locator('.grid')).not.toHaveAttribute('aria-busy', 'true');
  });

  test('the free switch and the search keep working after a category changes in place', async ({
    page,
  }) => {
    await ready(page);
    await page.locator('.chips a[data-category="bags"]').click();
    await expect(page.locator('h1')).toHaveText('Bags');
    await page.locator('.chips a[data-category="all"]').click();
    await expect(page.locator('h1')).toHaveText('Patterns');
    await page.locator('a.toggle').click();
    await expect(page).toHaveURL(/\/patterns\/free\/$/);
    await expect(page.locator('a.toggle')).toHaveClass(/on/);
    await expect(page.locator('.grid .card')).toHaveCount(4);
    expect(await page.locator('.grid .card .badge').allTextContents()).toEqual(
      Array(4).fill('Free PDF'),
    );
    // the category cards now lead to the free pages where they have one
    await expect(page.locator('.chips a[data-category="all"]')).toHaveAttribute(
      'href',
      '/patterns/free/',
    );
    const input = page.locator('#q');
    await input.click();
    await input.pressSequentially('ba');
    await expect(page.locator('.count')).toHaveText('1 pattern for “ba”');
    await expect(page.locator('.grid a.card:visible')).toHaveCount(1);
    await input.fill('');
    await expect(page.locator('.grid a.card:visible')).toHaveCount(4);
  });
});

test.describe('opening a pattern or a story', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('a finger on a pattern starts its big photo, so the page opens with it in place', async ({
    page,
  }) => {
    await visit(page, '/patterns/');
    const reusable = await page.evaluate(() =>
      document.createElement('link').relList.supports('prefetch'),
    );
    test.skip(
      !reusable,
      'Safari loads pages only when they are opened, so nothing is started early',
    );
    const card = page.locator('.grid a.card').nth(1);
    const photos: string[] = [];
    page.on('request', (r) => r.resourceType() === 'image' && photos.push(r.url()));
    const box = (await card.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 40);
    await page.mouse.down();
    await expect.poll(() => photos.length).toBeGreaterThan(0);
    const early = [...photos];
    await page.mouse.up();
    await expect(page).toHaveURL(/\/patterns\/daisy-clip\/$/);
    const shown = await page
      .locator('img[fetchpriority="high"]')
      .evaluate((i) => (i as HTMLImageElement).currentSrc);
    expect(early).toContain(shown);
  });

  test('cards answer a touch at once, with no leftover delay from an old fade-in', async ({
    page,
  }) => {
    await visit(page, '/patterns/');
    const delays = await page
      .locator('.grid a.card')
      .evaluateAll((all) => all.map((a) => getComputedStyle(a).transitionDelay));
    for (const d of delays) expect(d.split(', ').every((x) => x === '0s')).toBe(true);
  });

  test('stories in the journal are loaded ahead once seen, like patterns', async ({ page }) => {
    await visit(page, '/journal/');
    const reusable = await page.evaluate(() =>
      document.createElement('link').relList.supports('prefetch'),
    );
    test.skip(!reusable, 'Safari loads pages only when they are opened');
    const story = new URL(
      await page.locator('a.featured').evaluate((a) => (a as HTMLAnchorElement).href),
    ).pathname;
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.querySelectorAll<HTMLLinkElement>('link[rel=prefetch]')].map(
            (l) => new URL(l.href).pathname,
          ),
        ),
      )
      .toContain(story);
  });
});

test.describe('the menu remembers where each section was left', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('Patterns comes back to the same pattern at the same spot', async ({ page }) => {
    await visit(page, '/patterns/');
    await expect(tab(page, 'patterns')).toHaveAttribute('href', '/patterns/');
    await scrollTo(page, 500);
    await page.locator('.grid a.card').nth(2).click();
    await expect(page).toHaveURL(/\/patterns\/[a-z-]+\/$/);
    const pattern = new URL(page.url()).pathname;
    await scrollTo(page, 900);
    await tab(page, 'journal').click();
    await expect(page).toHaveURL(/\/journal\/$/);
    await expect(tab(page, 'patterns')).toHaveAttribute('href', pattern);
    await tab(page, 'patterns').click();
    await expect(page).toHaveURL(new RegExp(`${pattern}$`));
    expect(await page.evaluate(() => Math.round(scrollY))).toBe(900);
    // tapping the open section again starts it over
    await tab(page, 'patterns').click();
    await expect(page).toHaveURL(/\/patterns\/$/);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });

  test('Patterns comes back to the same spot in the list, and a second tap scrolls to the top in place', async ({
    page,
  }) => {
    await visit(page, '/patterns/');
    await scrollTo(page, 800);
    await tab(page, 'journal').click();
    await expect(page).toHaveURL(/\/journal\/$/);
    await tab(page, 'patterns').click();
    await expect(page).toHaveURL(/\/patterns\/$/);
    expect(await page.evaluate(() => Math.round(scrollY))).toBe(800);
    await page.evaluate(() => ((window as unknown as { stay: boolean }).stay = true));
    await tab(page, 'patterns').click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    expect(await page.evaluate(() => (window as unknown as { stay?: boolean }).stay)).toBe(true);
  });

  test('a chosen category is remembered too', async ({ page }) => {
    await visit(page, '/patterns/');
    // slide the row like a finger would, let it settle, then tap the card that is showing
    const card = page.locator('.chips a[data-category="bags"]');
    await card.evaluate((a) => a.scrollIntoView({ block: 'nearest', inline: 'center' }));
    await expect
      .poll(async () => {
        const a = await page.locator('.chips').evaluate((r) => r.scrollLeft);
        await page.waitForTimeout(120);
        return a === (await page.locator('.chips').evaluate((r) => r.scrollLeft));
      })
      .toBe(true);
    await card.click();
    await expect(page).toHaveURL(/\/patterns\/category\/bags\/$/);
    const y = await page.evaluate(() => scrollY);
    await tab(page, 'about').click();
    await expect(page).toHaveURL(/\/about\/$/);
    await tab(page, 'patterns').click();
    await expect(page).toHaveURL(/\/patterns\/category\/bags\/$/);
    // this spot comes from the page layout, so other fonts can leave it between two pixels
    expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThanOrEqual(1);
  });

  test('Journal comes back to the same story at the same spot', async ({ page }) => {
    await visit(page, '/journal/how-to-read-a-crochet-pattern/');
    await scrollTo(page, 600);
    await tab(page, 'patterns').click();
    await expect(page).toHaveURL(/\/patterns\/$/);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await tab(page, 'journal').click();
    await expect(page).toHaveURL(/\/journal\/how-to-read-a-crochet-pattern\/$/);
    expect(await page.evaluate(() => Math.round(scrollY))).toBe(600);
  });

  test('Home always starts at the beginning of the story', async ({ page }) => {
    await visit(page, '/');
    await scrollTo(page, 700);
    await tab(page, 'patterns').click();
    await expect(page).toHaveURL(/\/patterns\/$/);
    // the home address itself, not just any address ending in a slash
    await Promise.all([
      page.waitForURL((url) => url.pathname === '/', { timeout: 15_000 }),
      page.locator('.dock a.home').click(),
    ]);
    await page.waitForLoadState('domcontentloaded');
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });
});

test.describe('category cards', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('every card has a picture, a name, a count and its own colour', async ({ page }) => {
    await visit(page, '/patterns/');
    const cards = await page.locator('.chips a.chip').evaluateAll((all) =>
      all.map((a) => ({
        id: (a as HTMLElement).dataset['category'],
        picture: a.querySelector('img.pic')?.getAttribute('src') ?? '',
        name: a.querySelector('.name')?.textContent?.trim() ?? '',
        count: a.querySelector('.sum')?.textContent?.trim() ?? '',
        colour: getComputedStyle(a).getPropertyValue('--c').trim(),
        alt: a.querySelector('img.pic')?.getAttribute('alt'),
      })),
    );
    expect(cards.length).toBeGreaterThan(2);
    for (const c of cards) {
      expect(c.picture, c.id).not.toBe('');
      expect(c.name, c.id).not.toBe('');
      expect(c.count, c.id).toMatch(/^\d+ patterns?$/);
      expect(c.colour, c.id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(c.alt, c.id).toBe('');
    }
    // a category with its own picture shows it whole; one without uses a pattern photo
    await expect(page.locator('.chip[data-category="hats"]')).toHaveClass(/scene/);
    await expect(page.locator('.chip[data-category="bags"]')).toHaveClass(/photo/);
  });

  test('the cards slide sideways in one row and the open one is marked', async ({ page }) => {
    await visit(page, '/patterns/category/bags/');
    const row = page.locator('.chips');
    expect(await row.evaluate((r) => r.scrollWidth > r.clientWidth)).toBe(true);
    const tops = await page
      .locator('.chips a.chip')
      .evaluateAll((all) => all.map((a) => a.getBoundingClientRect().top));
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(4);
    const open = page.locator('.chip[aria-current="page"]');
    await expect(open).toHaveAttribute('data-category', 'bags');
    const box = (await open.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
  });

  test('on a wide screen the arrows slide the row', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await visit(page, '/patterns/');
    const next = page.locator('.slide.next');
    await expect(next).toBeVisible();
    await expect(page.locator('.slide.prev')).toBeHidden();
    await next.click();
    await expect
      .poll(() => page.locator('.chips').evaluate((r) => r.scrollLeft))
      .toBeGreaterThan(100);
    await expect(page.locator('.slide.prev')).toBeVisible();
  });
});

test.describe('pictures are ready before they are needed', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('sliding rows and nearby photos start loading once the page is up', async ({ page }) => {
    await visit(page, '/patterns/');
    // every card in the sliding category row, even those still off to the side
    await expect
      .poll(() =>
        page
          .locator('.chips img.pic')
          .evaluateAll(
            (all) => all.filter((i) => (i as HTMLImageElement).loading === 'lazy').length,
          ),
      )
      .toBe(0);
    // photos a screen below are already on their way, the far end of the page is not
    const states = await page.locator('.grid .card img').evaluateAll((all) =>
      all.map((i) => ({
        top: i.getBoundingClientRect().top,
        lazy: (i as HTMLImageElement).loading === 'lazy',
      })),
    );
    for (const s of states.filter((x) => x.top < 844 * 2)) expect(s.lazy).toBe(false);
    await visit(page, '/patterns/blue-market-bag/');
    await expect
      .poll(() =>
        page
          .locator('.gallery .track img')
          .evaluateAll(
            (all) => all.filter((i) => (i as HTMLImageElement).loading === 'lazy').length,
          ),
      )
      .toBe(0);
  });

  test('a phone that asks to save data keeps loading pictures only when they are seen', async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() =>
      Object.defineProperty(navigator, 'connection', { value: { saveData: true } }),
    );
    const page = await context.newPage();
    await visit(page, '/patterns/');
    await page.waitForTimeout(1500);
    const lazy = await page
      .locator('.chips img.pic')
      .evaluateAll((all) => all.filter((i) => (i as HTMLImageElement).loading === 'lazy').length);
    expect(lazy).toBeGreaterThan(0);
    await context.close();
  });
});

test.describe('the menu', () => {
  for (const [device, width] of [
    ['phone', 390],
    ['desktop', 1440],
  ] as const) {
    test(`sits in the middle of the screen (${device})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await visit(page, '/patterns/');
      const box = (await page.locator('.dock').boundingBox())!;
      expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThanOrEqual(1);
      if (device === 'phone') expect(box.y).toBeGreaterThan(700);
      else expect(box.y).toBeLessThan(40);
    });
  }

  test('the touched item lights up at once, even when the next page is slow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, '/patterns/');
    await page.route('**/journal/', async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    const journal = page.locator('.dock a[data-tab="journal"]');
    const box = (await journal.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(journal).toHaveClass(/going/, { timeout: 200 });
    await expect(journal).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('.dock a[data-tab="patterns"]')).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    );
    await page.mouse.up();
    await expect(page).toHaveURL(/\/journal\/$/);
    await expect(journal).toHaveAttribute('aria-current', 'page');
  });

  test('a touch moves the white pill in one frame, with no fade, no shrink and no square highlight', async ({
    browser,
  }) => {
    // a touch screen, so the styles phones get are the ones measured
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const page = await context.newPage();
    await visit(page, '/patterns/');
    await page.route('**/journal/', async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue().catch(() => undefined);
    });
    // a touch screen keeps the last touched spot as hovered, which must not leave a tint behind
    const about = (await tab(page, 'about').boundingBox())!;
    await page.mouse.move(about.x + about.width / 2, about.y + about.height / 2);
    await expect(tab(page, 'about')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    const box = (await tab(page, 'journal').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const pressed = await page.evaluate(() => ({
      fading: document.querySelector('.dock')!.getAnimations({ subtree: true }).length,
      tabs: [...document.querySelectorAll<HTMLElement>('.dock a[data-tab]')].map((a) => {
        const s = getComputedStyle(a);
        return { name: a.dataset['tab'], background: s.backgroundColor, transform: s.transform };
      }),
      // phones draw their own square tint over a touched link unless it is switched off
      highlight: CSS.supports('-webkit-tap-highlight-color', 'red')
        ? getComputedStyle(document.querySelector('.dock a')!).getPropertyValue(
            '-webkit-tap-highlight-color',
          )
        : 'rgba(0, 0, 0, 0)',
    }));
    expect(pressed.fading).toBe(0);
    expect(pressed.highlight).toBe('rgba(0, 0, 0, 0)');
    for (const t of pressed.tabs) {
      expect(t.transform, t.name).toBe('none');
      expect(t.background, t.name).toBe(
        t.name === 'journal' ? 'rgb(255, 255, 255)' : 'rgba(0, 0, 0, 0)',
      );
    }
    await page.mouse.up();
    await expect(page).toHaveURL(/\/journal\/$/);
    await context.close();
  });

  test('tapping the open section while another page is on its way stays on the open section', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, '/patterns/');
    let asked = false;
    await page.route('**/journal/', async (route) => {
      asked = true;
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue().catch(() => undefined);
    });
    // plain taps at spots measured beforehand, so nothing waits for the journal to arrive
    const spots = new Map<string, { x: number; y: number }>();
    for (const name of ['journal', 'patterns']) {
      const box = (await tab(page, name).boundingBox())!;
      spots.set(name, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    }
    const tap = (name: string) => page.mouse.click(spots.get(name)!.x, spots.get(name)!.y);
    await tap('journal');
    await expect.poll(() => asked).toBe(true);
    // a change of mind before the journal has arrived: the last tap wins
    expect(new URL(page.url()).pathname).toBe('/patterns/');
    await tap('patterns');
    await page.waitForTimeout(2500);
    await expect(page).toHaveURL(/\/patterns\/$/);
    await expect(tab(page, 'patterns')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(tab(page, 'journal')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    // and the journal opens normally afterwards
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await tab(page, 'journal').click();
    await expect(page).toHaveURL(/\/journal\/$/);
  });

  test('tapping Home on the homepage goes back to the start without reloading', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, '/');
    await scrollTo(page, 900);
    await page.evaluate(() => ((window as unknown as { stay: boolean }).stay = true));
    await page.locator('.dock a.home').click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    expect(await page.evaluate(() => (window as unknown as { stay?: boolean }).stay)).toBe(true);
  });

  for (const width of [320, 360]) {
    test(`fits whole on a narrow phone, with every item still easy to tap (${width} px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 640 });
      await visit(page, '/patterns/');
      const box = (await page.locator('.dock').boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThanOrEqual(1);
      for (const a of await page.locator('.dock a').all()) {
        const item = (await a.boundingBox())!;
        expect(item.height).toBeGreaterThanOrEqual(44);
        expect(item.width).toBeGreaterThanOrEqual(44);
        // the word is never cut short
        expect(await a.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      }
    });
  }

  test('going back shows the open page in the menu, never the item tapped before leaving', async ({
    browserName,
    playwright,
    launchOptions,
    baseURL,
  }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can be told to keep pages for going back');
    // the full browser: the lighter headless one never keeps pages for going back
    const browser = await playwright.chromium.launch({
      ...launchOptions,
      channel: 'chromium',
      ignoreDefaultArgs: ['--disable-back-forward-cache'],
    });
    const page = await browser.newPage({
      baseURL: baseURL!,
      viewport: { width: 390, height: 844 },
    });
    // what the kept page shows the moment it comes back, before any of its own code has run
    await page.addInitScript(() =>
      addEventListener('pageshow', (e) => {
        (window as unknown as { back: object }).back = {
          kept: e.persisted,
          lit: document.querySelector('.dock .going')?.textContent?.trim() ?? null,
        };
      }),
    );
    await visit(page, '/patterns/');
    await tab(page, 'journal').click();
    await expect(page).toHaveURL(/\/journal\/$/);
    await page.goBack({ waitUntil: 'commit' });
    await expect(page).toHaveURL(/\/patterns\/$/);
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { back?: object }).back))
      .toEqual({ kept: true, lit: null });
    await expect(tab(page, 'patterns')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await browser.close();
  });
});

test.describe('a category tap on a phone, at the very top of the list', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('the row stays put even when the description above it is shorter or longer', async ({
    page,
  }) => {
    await visit(page, '/patterns/');
    const top = () => page.locator('.chips').evaluate((r) => r.getBoundingClientRect().top);
    const lines = () =>
      page
        .locator('.page-head .intro')
        .evaluate((p) =>
          Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight)),
        );
    const start = await top();
    const long = await lines();
    for (const [id, path] of [
      ['bags', /\/category\/bags\/$/],
      ['all', /\/patterns\/$/],
      ['tech-cases', /\/category\/tech-cases\/$/],
    ] as const) {
      await page.locator(`.chip[data-category="${id}"]`).click();
      await expect(page).toHaveURL(path);
      await expect(page.locator(`.chip[data-category="${id}"]`)).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(Math.abs((await top()) - start)).toBeLessThanOrEqual(1);
    }
    // the descriptions really are of different lengths here, and the page did not scroll away
    await page.locator('.chip[data-category="bags"]').click();
    await expect(page).toHaveURL(/\/category\/bags\/$/);
    expect(await page.locator('.page-head .intro').textContent()).toContain('bags');
    expect(long).toBeGreaterThan(1);
    expect(Math.abs((await top()) - start)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });

  test('the touched card is marked in one frame, with no slow lift', async ({ page }) => {
    await visit(page, '/patterns/');
    const card = page.locator('.chip[data-category="bags"]');
    // a mouse has already lifted the card on the way in; a finger gets the whole mark at once
    test.skip(
      await page.evaluate(() => matchMedia('(hover: hover)').matches),
      'this browser cannot pretend to have a touch screen',
    );
    await expect(card).toHaveCSS('transition-duration', '0s');
    const marked = await card.evaluate((a) => {
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
      return getComputedStyle(a).transform;
    });
    expect(marked).toBe('matrix(1, 0, 0, 1, 0, -3)');
  });
});

test('tapping a category keeps the row exactly where it was', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, '/patterns/');
  const row = page.locator('.chips');
  await row.evaluate((r) => (r.scrollLeft = 300));
  const before = await row.evaluate((r) => r.scrollLeft);
  const card = page.locator('.chip[data-category="bags"]');
  await card.scrollIntoViewIfNeeded();
  const x = await row.evaluate((r) => r.scrollLeft);
  const left = (await card.boundingBox())!.x;
  await card.click();
  await expect(page).toHaveURL(/\/category\/bags\/$/);
  expect(await page.locator('.chips').evaluate((r) => r.scrollLeft)).toBe(x);
  expect(
    Math.abs((await page.locator('.chip[data-category="bags"]').boundingBox())!.x - left),
  ).toBeLessThanOrEqual(1);
  expect(before).toBeGreaterThan(0);
  // arriving from a link elsewhere still shows the open card
  await visit(page, '/patterns/category/tech-cases/');
  const open = (await page.locator('.chip[aria-current="page"]').boundingBox())!;
  expect(open.x).toBeGreaterThanOrEqual(0);
  expect(open.x + open.width).toBeLessThanOrEqual(390);
});
