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

for (const width of [360, 375, 430, 1280]) {
  test(`glass controls fit and each category starts below search at ${width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await visit(page);
    await page.evaluate(() => {
      (window as Window & { retained?: object }).retained = {};
      window.scrollTo(0, 650);
    });
    const navigation = await page.evaluate(() => performance.timeOrigin);
    await page.locator('.category-trigger').click();
    await page.locator('.category-panel a[data-category="bags"]').click();
    await expect(page).toHaveURL(/\/patterns\/category\/bags\/$/);
    await expect(category(page, 'bags')).toHaveAttribute('aria-current', 'page');
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(navigation);
    expect(
      await page.evaluate(() => Boolean((window as Window & { retained?: object }).retained)),
    ).toBe(true);
    await expect
      .poll(async () =>
        Math.abs((await page.locator('.search').boundingBox())!.y - (width >= 900 ? 96 : 20)),
      )
      .toBeLessThan(1);
    await expect(page.locator('.category-panel')).toBeHidden();
    await expect(category(page, 'bags')).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    for (const control of [
      page.locator('.header-search'),
      category(page, 'bags'),
      page.locator('.dock a').first(),
    ]) {
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    }
    await page.keyboard.press('Tab');
    await category(page, 'bags').focus();
    await expect(category(page, 'bags')).toHaveCSS('outline-style', 'solid');
    const dock = (await page.locator('.dock').boundingBox())!;
    if (width >= 900) expect(dock.y).toBeLessThan(100);
    else expect(dock.y).toBeGreaterThan(750);
  });
}

test('category changes retain loaded pictures and match the crawlable page metadata', async ({
  page,
  request,
}) => {
  await visit(page);
  const photo = page.locator('.grid a[href="/patterns/blue-market-bag/"] img');
  await photo.evaluate((image) => image.setAttribute('data-retained', 'true'));
  await category(page, 'bags').click();
  await expect(page).toHaveURL(/category\/bags\/$/);
  await expect(photo).toHaveAttribute('data-retained', 'true');
  const response = await request.get('/patterns/category/bags/');
  const source = await response.text();
  const actual = await page.evaluate(() => ({
    title: document.title,
    canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href,
    description: document.querySelector<HTMLMetaElement>('meta[name="description"]')!.content,
    json: [...document.querySelectorAll('script[type="application/ld+json"]')].map(
      (node) => node.textContent,
    ),
  }));
  expect(source).toContain(`<title>${actual.title}</title>`);
  expect(actual.canonical).toBe('https://example.com/patterns/category/bags/');
  expect(source).toContain(actual.description);
  for (const json of actual.json) expect(source).toContain(json!);
  await expect(page.locator('h1')).toHaveText('Bags');
  await expect(page.locator('.grid .card')).toHaveCount(1);
});

test('the latest category wins when earlier responses arrive late', async ({ page }) => {
  await visit(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/patterns/category/bags/', async (route) => {
    await pending;
    await route.continue();
  });
  await category(page, 'bags').click();
  await category(page, 'accessories').click();
  await expect(page).toHaveURL(/category\/accessories\/$/);
  release();
  await expect(page.locator('.grid')).not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('h1')).toHaveText('Accessories');
  await expect(category(page, 'accessories')).toHaveAttribute('aria-current', 'page');
});

test('query, scroll and categories survive browser back and forward', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await visit(page);
  await page.locator('#q').fill('bag');
  await expect(page.locator('.count')).toContainText('for “bag”');
  await page.evaluate(() => window.scrollTo(0, 260));
  await page.locator('.category-trigger').click();
  await page.locator('.category-panel a[data-category="bags"]').click();
  await expect(page).toHaveURL(/category\/bags\/\?q=bag$/);
  await expect(category(page, 'bags')).toBeFocused();
  await expect
    .poll(async () => Math.abs((await page.locator('.search').boundingBox())!.y - 20))
    .toBeLessThan(1);
  const bagY = await page.evaluate(() => scrollY);
  await category(page, 'accessories').click();
  await expect(page).toHaveURL(/category\/accessories\/\?q=bag$/);
  await page.goBack();
  await expect(page).toHaveURL(/category\/bags\/\?q=bag$/);
  await expect(page.locator('#q')).toHaveValue('bag');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(bagY, 0);
  await page.goForward();
  await expect(page).toHaveURL(/category\/accessories\/\?q=bag$/);
  await expect(page.locator('h1')).toHaveText('Accessories');
});

test('failed category enhancement falls back to the ordinary page', async ({ page }) => {
  await visit(page);
  await page.route('**/patterns/category/bags/', (route) =>
    route.request().isNavigationRequest() ? route.continue() : route.abort(),
  );
  await category(page, 'bags').click();
  await expect(page).toHaveURL(/category\/bags\/$/);
  await expect(page.locator('h1')).toHaveText('Bags');
  await expect(page.locator('.grid .card')).toHaveCount(1);
});

test('Back restores the reading position when category introductions have different heights', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 812 });
  await page.route('**/patterns/category/amigurumi/', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      'Test category: amigurumi patterns.',
      'Crochet small animals and keepsakes. Choose a pattern, gather your yarn and take your time with each stitch. Make something to keep or give to someone you love.',
    );
    await route.fulfill({ response, body });
  });
  await visit(page, '/patterns/category/amigurumi/');
  await page.evaluate(() => scrollTo(0, 500));
  await page.locator('.category-trigger').click();
  const y = await page.evaluate(() => scrollY);
  await page.locator('.category-panel a[data-category="bags"]').click();
  await expect(page).toHaveURL(/category\/bags\/$/);
  await expect(category(page, 'bags')).toBeFocused();
  await page.goBack();
  await expect(page.locator('h1')).toHaveText('Amigurumi');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(y, 0);
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

test('categories condense and unfold as glass controls without a background panel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await visit(page);
  await page.evaluate(() => scrollTo(0, 650));
  await expect(page.locator('.category-trigger')).toBeVisible();
  await expect(page.locator('.filters')).toHaveJSProperty('inert', true);
  await page.locator('.category-trigger').click();
  await expect(page.locator('.category-panel')).toBeVisible();
  await expect(page.locator('.category-panel a')).toHaveCount(7);
  await expect(page.locator('.category-panel')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('.category-panel')).toHaveCSS('box-shadow', 'none');
  await expect(page.locator('.category-panel a').first()).toHaveClass(/liquid/);
  await expect(page.locator('.category-panel a[data-category="all"]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.category-panel')).toBeHidden();
  await expect(page.locator('.category-trigger')).toBeFocused();
  await page.locator('.category-trigger').click();
  await page.locator('.category-panel a[data-category="all"]').click();
  await expect(page.locator('.category-panel')).toBeHidden();
  await expect(page.locator('.category-trigger')).toBeFocused();
  await page.evaluate(() => scrollTo(0, 0));
  await expect(page.locator('.category-control')).toBeHidden();
  await expect(page.locator('.filters')).toHaveJSProperty('inert', false);
  await expect(category(page, 'bags')).toBeVisible();
  await expect(page.locator('.dock')).toHaveClass(/ribbon/);
  await expect(page.locator('.dock > .liquid-layer')).toHaveCount(1);
  await expect(page.locator('.dock a .liquid-layer')).toHaveCount(0);
});

test('category motion never adds duplicate links or keyboard stops', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await visit(page);
  await page.evaluate(() => {
    new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes)
          if (node instanceof HTMLElement && node.matches('.category-ghost'))
            node.getAnimations().forEach((animation) => animation.pause());
    }).observe(document.body, { childList: true });
    const filters = document.querySelector('.filters')!;
    scrollTo(0, scrollY + filters.getBoundingClientRect().top - 50);
  });
  await page.locator('.category-ghost').first().waitFor({ state: 'attached' });
  await expect(page.getByRole('link').and(page.locator('.category-ghost'))).toHaveCount(0);
  await page.locator('.header-search').focus();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    expect(
      await page
        .locator('.category-ghost')
        .evaluateAll((copies) => copies.some((copy) => copy === document.activeElement)),
    ).toBe(false);
  }
});

test('opening can be interrupted without jumping and reduced motion remains static', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await visit(page);
  await page.evaluate(() => scrollTo(0, 650));
  await expect(page.locator('.category-trigger')).toBeVisible();
  await page.evaluate(() =>
    (document.querySelector('.category-trigger') as HTMLButtonElement).click(),
  );
  await page.waitForTimeout(70);
  await page.evaluate(() =>
    (document.querySelector('.category-close') as HTMLButtonElement).click(),
  );
  await page.waitForTimeout(35);
  const values = await page.evaluate(() => {
    const el = document.querySelector('.category-panel a')!;
    const before = Number(getComputedStyle(el).opacity);
    (document.querySelector('.category-trigger') as HTMLButtonElement).click();
    return { before, after: Number(getComputedStyle(el).opacity) };
  });
  expect(Math.abs(values.before - values.after)).toBeLessThan(0.02);
  await expect(page.locator('.category-panel a').first()).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'reduce', contrast: 'more' });
  await page.keyboard.press('Escape');
  await page.locator('.category-trigger').click();
  await expect(page.locator('.category-trigger')).toHaveCSS(
    'background-color',
    'rgb(251, 248, 242)',
  );
  expect(
    await page
      .locator('.category-panel')
      .evaluate(
        (el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length,
      ),
  ).toBe(0);
  await expect(page.locator('.category-panel a').first()).toHaveCSS('color', 'rgb(42, 41, 37)');
});

test('category choices fit short phones, landscape, tablets and wide screens', async ({ page }) => {
  for (const [width, height] of [
    [360, 640],
    [812, 375],
    [768, 1024],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    await visit(page);
    await page.evaluate(() => scrollTo(0, 650));
    await page.locator('.category-trigger').click();
    const panel = (await page.locator('.category-panel').boundingBox())!;
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(width!);
    expect(panel.y + panel.height).toBeLessThanOrEqual(height!);
    const last = page.locator('.category-panel a').last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width!,
    );
    await page.keyboard.press('Escape');
    await expect(page.locator('.category-panel')).toBeHidden();
  }
});
