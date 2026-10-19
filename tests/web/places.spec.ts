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

// the row sits at the very top on phones and just under the menu on wide screens
for (const [device, width, rowTop] of [
  ['phone', 375, 0],
  ['desktop', 1280, 94],
] as const) {
  test(`a chosen category opens at its first patterns, not the top of the page (${device})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 812 });
    await visit(page, '/patterns/');
    await page.locator('.chips a[data-category="bags"]').click();
    await expect(page).toHaveURL(/\/patterns\/category\/bags\/$/);
    await expect(page.locator('.chips a[data-category="bags"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
    const at = await page.evaluate(() => ({
      row: Math.round(document.querySelector('.filters')!.getBoundingClientRect().top),
      title: document.querySelector('h1')!.getBoundingClientRect().bottom,
      card: document.querySelector('.grid .card')!.getBoundingClientRect().top,
      height: innerHeight,
    }));
    expect(Math.abs(at.row - rowTop)).toBeLessThanOrEqual(2);
    expect(at.title).toBeLessThanOrEqual(at.row + 1);
    expect(at.card).toBeGreaterThan(at.row);
    expect(at.card).toBeLessThan(at.height * 0.5);
    // then it scrolls away with the patterns, it does not stay on screen
    const moved = await page.evaluate(() => {
      const y = scrollY;
      window.scrollBy(0, 200);
      return scrollY - y;
    });
    expect(moved).toBeGreaterThan(0);
    expect(
      Math.round(
        await page.evaluate(() => document.querySelector('.filters')!.getBoundingClientRect().top),
      ),
    ).toBe(Math.round(at.row - moved));
  });
}

test('categories open at their patterns even without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  await page.goto('/patterns/');
  await page.locator('.chips a[data-category="hats"]').click();
  await expect(page).toHaveURL(/\/patterns\/category\/hats\/#patterns$/);
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector('.filters')!.getBoundingClientRect().top),
    )
    .toBeCloseTo(0, 0);
  await context.close();
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

test('categories load ahead at once and patterns once seen, only where the browser reuses them', async ({
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
  await page.waitForTimeout(500);
  const ahead = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLLinkElement>('link[rel=prefetch]')].map(
      (l) => new URL(l.href).pathname,
    ),
  );
  const reusable = await page.evaluate(() =>
    document.createElement('link').relList.supports('prefetch'),
  );
  if (!reusable) {
    // Safari opens a page from its own loads only, so nothing is fetched ahead to be thrown away
    expect(browserName).toBe('webkit');
    expect(ahead).toEqual([]);
    expect(pages.filter((p) => p !== '/patterns/')).toEqual([]);
    return;
  }
  const categories = await page
    .locator('.chips a')
    .evaluateAll((all) => all.map((a) => new URL((a as HTMLAnchorElement).href).pathname));
  for (const url of categories.filter((u) => u !== '/patterns/')) expect(ahead).toContain(url);
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
    await page.locator('.chips a[data-category="bags"]').click();
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
