import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';

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
  test(`categories sit side by side in one row and stay in their place while scrolling at ${width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await visit(page);
    const chips = page.locator('.filters .chip');
    // the open card lifts a little, so the row is level within a few pixels
    const tops = await chips.evaluateAll((all) => all.map((c) => c.getBoundingClientRect().top));
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(4);
    // one row of cards, so it never pushes the patterns far down
    expect((await page.locator('.filters').boundingBox())!.height).toBeLessThan(180);
    for (const control of [page.locator('.header-search'), chips.first()]) {
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    // the row moves up with the page instead of staying on screen
    const before = (await page.locator('.filters').boundingBox())!.y;
    await page.evaluate(() => window.scrollTo(0, 900));
    await expect(page.locator('.filters')).not.toHaveCSS('position', 'sticky');
    expect(Math.round((await page.locator('.filters').boundingBox())!.y)).toBe(
      Math.round(before - 900),
    );
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
    // the menu is solid brand blue, so nothing behind it shows through its labels
    await expect(page.locator('.dock')).toHaveCSS('background-color', 'rgb(31, 76, 156)');
  }
});

test('the homepage colour fade stays plain so phones never repaint the soft colours', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await visit(page, '/');
  const layers = await page.locator('.tint').evaluate((tint) => ({
    fade: getComputedStyle(tint).backgroundImage,
    colours: getComputedStyle(tint, '::after').backgroundImage,
    own: getComputedStyle(tint, '::after').transform,
  }));
  expect(layers.fade).toBe('none');
  expect(layers.colours).toContain('radial-gradient');
  expect(layers.own).not.toBe('none');
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

test('on phones the page fades out above the menu, so nothing shows around or under it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, '/journal/');
  const dock = (await page.locator('.dock').boundingBox())!;
  // a photo slides right under the menu
  const photo = page.locator('.post img').first();
  await photo.evaluate(
    (img, middle) => {
      const r = img.getBoundingClientRect();
      window.scrollTo(0, window.scrollY + r.top + r.height / 2 - middle);
    },
    dock.y + dock.height / 2,
  );
  await expect
    .poll(() => photo.evaluate((i) => (i as HTMLImageElement).complete && i.clientHeight > 0))
    .toBe(true);
  const shoot = async () => PNG.sync.read(await page.screenshot({ scale: 'css' }));
  const shown = await shoot();
  await page.addStyleTag({ content: 'main, .site-footer { visibility: hidden !important; }' });
  const empty = await shoot();
  // in the gap under the menu the screen looks the same with or without the page behind it
  const below = dock.y + dock.height;
  for (const [x, y] of [
    [120, below + 7],
    [195, below + 4],
    [195, below + 10],
    [270, below + 7],
  ] as const) {
    const i = (Math.round(y) * shown.width + x) * 4;
    for (let c = 0; c < 3; c++)
      expect(Math.abs(shown.data[i + c]! - empty.data[i + c]!), `${x},${y}`).toBeLessThanOrEqual(6);
  }
  await page.reload();
  // the fade never takes a tap, and the end of the page stays clear of it
  const edge = page.locator('.edge');
  await expect(edge).toHaveCSS('pointer-events', 'none');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const footer = (await page.locator('.site-footer .footer-row').boundingBox())!;
  expect(footer.y + footer.height).toBeLessThanOrEqual((await edge.boundingBox())!.y + 1);
  // the homepage drawing stays whole, and wide screens have the menu at the top instead
  await visit(page, '/');
  await expect(page.locator('.edge')).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await visit(page, '/journal/');
  await expect(page.locator('.edge')).toBeHidden();
});

test('photos are drawn with the page and are already at rest when they come into view', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // the pictures on screen when a page opens are drawn with it once they are at hand, not a frame later
  for (const path of ['/', '/patterns/', '/journal/', '/about/', '/patterns/blue-market-bag/']) {
    const html = await (await request.get(path)).text();
    const first = html.match(/<img [^>]*loading="eager"[^>]*>/g) ?? [];
    expect(first.length, path).toBeGreaterThan(0);
    for (const img of first) expect(img, path).toContain('decoding="auto"');
  }
  // a photo further down is not zoomed in, waiting to settle once it is seen
  await visit(page, '/patterns/');
  const waiting = page.locator('.grid a.card:not(.in) img').last();
  await expect(waiting).toHaveCSS('transform', 'none');
  await visit(page, '/journal/');
  await page.locator('.featured').evaluate((f) => f.classList.remove('in'));
  await expect(page.locator('.featured img')).toHaveCSS('transform', 'none');
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
  // a touched item takes the outlined pill at once and the open page keeps readable words
  await visit(page, '/patterns/');
  await page.route('**/journal/', () => undefined);
  const box = (await page.locator('.dock a[data-tab="journal"]').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (const name of ['journal', 'patterns']) {
    await expect(page.locator(`.dock a[data-tab="${name}"]`)).toHaveCSS('color', 'rgb(42, 41, 37)');
  }
  await expect(page.locator('.dock a[data-tab="journal"]')).toHaveCSS(
    'box-shadow',
    /rgb\(42, 41, 37\) 0px 0px 0px 1\.5px inset/,
  );
  await page.unrouteAll({ behavior: 'ignoreErrors' });
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
