import { expect, test, type Page } from '@playwright/test';

const THIRD_PARTY = /googlesyndication|cloudflareinsights|pinterest\.com|etsy\.com/;
async function visit(page: Page, path = '/patterns/') {
  await page.route(THIRD_PARTY, (route) =>
    route.fulfill({ contentType: 'text/javascript', body: '' }),
  );
  await page.goto(path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
}
const category = (page: Page, id: string) =>
  page.locator(`.filters .chips a[data-category="${id}"]`);

for (const width of [360, 375, 430]) {
  test(`categories sit side by side in one row and stick to the top at ${width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await visit(page);
    const chips = page.locator('.filters .chip');
    const tops = await chips.evaluateAll((all) =>
      all.map((c) => Math.round(c.getBoundingClientRect().top)),
    );
    expect(new Set(tops).size).toBe(1);
    // the row is only as tall as one chip, so it never pushes the patterns down
    expect((await page.locator('.filters').boundingBox())!.height).toBeLessThan(90);
    for (const control of [page.locator('.header-search'), chips.first()]) {
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.evaluate(() => window.scrollTo(0, 900));
    await expect(page.locator('.filters')).toHaveClass(/stuck/);
    expect(Math.round((await page.locator('.filters').boundingBox())!.y)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    const dock = (await page.locator('.dock').boundingBox())!;
    expect(dock.y).toBeGreaterThan(700);
    expect(dock.x).toBeGreaterThanOrEqual(0);
    expect(dock.x + dock.width).toBeLessThanOrEqual(width);
  });
}

test('nothing on the page blurs what is behind it, so phones scroll smoothly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/patterns/', '/patterns/blue-market-bag/']) {
    await visit(page, path);
    const blurred = await page.evaluate(
      () =>
        [...document.querySelectorAll('*')].filter((e) => {
          const s = getComputedStyle(e);
          return s.backdropFilter !== 'none' && s.backdropFilter !== '';
        }).length,
    );
    expect(blurred, path).toBe(0);
    expect(await page.locator('filter').count(), path).toBe(0);
    // the menu is solid, so nothing behind it shows through its labels
    await expect(page.locator('.dock')).toHaveCSS('background-color', 'rgb(255, 254, 252)');
  }
});

test('the menu stays still when moving between pages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, '/');
  await page.waitForTimeout(1500);
  const before = (await page.locator('.dock').boundingBox())!;
  await page.locator('.dock a[href="/patterns/"]').click();
  await expect(page).toHaveURL(/\/patterns\/$/);
  await expect(page.locator('.dock a[href="/patterns/"]')).toHaveAttribute('aria-current', 'page');
  const moving = await page.evaluate(
    () =>
      document
        .querySelector('.dock')!
        .getAnimations({ subtree: true })
        .filter((a) => a.playState === 'running').length,
  );
  expect(moving).toBe(0);
  const after = (await page.locator('.dock').boundingBox())!;
  expect(Math.abs(after.y - before.y)).toBeLessThan(1);
  expect(Math.abs(after.x + after.width / 2 - (before.x + before.width / 2))).toBeLessThan(1);
});

test('categories are complete ordinary links without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/patterns/');
  await category(page, 'bags').click();
  await expect(page).toHaveURL(/category\/bags\/$/);
  await expect(page.locator('h1')).toHaveText('Bags');
  await expect(page.locator('.grid .card')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://example.com/patterns/category/bags/',
  );
  await context.close();
});

test('mobile photos and captions precede the drawings while desktop drawings keep their size', async ({
  page,
}) => {
  for (const width of [360, 375, 430, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await visit(page, '/');
    await expect(page.locator('.story')).toHaveClass(/ready/);
    const chapters = await page.locator('.chapter').evaluateAll((nodes) =>
      nodes.map((node) => {
        const stage = node.querySelector('.stage')!.getBoundingClientRect();
        const meta = node.querySelector('.meta')!.getBoundingClientRect();
        const art = node.querySelector('.art')!.getBoundingClientRect();
        return { stage: stage.bottom, meta: meta.bottom, art: art.top, height: art.height };
      }),
    );
    for (const chapter of chapters) {
      if (width < 900) {
        expect(chapter.stage).toBeLessThan(chapter.art);
        expect(chapter.meta).toBeLessThan(chapter.art);
      } else expect(chapter.height).toBeCloseTo(414, 0);
    }
    await expect(page.locator('.hero .cue')).toHaveCount(1);
    await expect(page.locator('.hero .cue a,.hero .cue button')).toHaveCount(0);
    await expect(page.locator('.hero .bead')).toHaveCSS('width', '5px');
    await expect(page.locator('.hero .cue')).toHaveCSS('font-size', '13px');
    await expect(page.locator('.hero .bead')).toHaveCSS('animation-name', 'bead');
  }
});

test('reduced motion and increased contrast keep content and controls visible', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce', contrast: 'more' });
  await visit(page, '/');
  await expect(page.locator('.hero .bead')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.dock')).toHaveCSS('backdrop-filter', 'none');
  await expect(page.locator('.dock a').first()).toHaveCSS('color', 'rgb(42, 41, 37)');
  for (const path of ['/journal/', '/about/', '/journal/how-to-read-a-crochet-pattern/']) {
    await visit(page, path);
    for (const content of await page
      .locator('.contact h2,.contact p,.practice h2,.practice p,.keep-going h2,.keep-going p')
      .all()) {
      await expect(content).toHaveCSS('color', 'rgb(42, 41, 37)');
      await expect(content).toHaveCSS('opacity', '1');
    }
  }
});
