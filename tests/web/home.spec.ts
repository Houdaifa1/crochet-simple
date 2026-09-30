import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 },
  small: { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
} as const;

type Rect = { name: string; x: number; y: number; w: number; h: number };

async function open(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // tests never talk to outside services
  await page.route(/googlesyndication|cloudflareinsights|pinterest\.com|etsy\.com/, (r) =>
    r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }),
  );
  await page.goto('/');
  await page.locator('.story.ready').waitFor();
  return errors;
}

const settle = (page: Page) =>
  page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))),
  );

// guide points plus every box the yarn must stay out of, in story coordinates
function geometry(page: Page) {
  return page.evaluate(() => {
    const story = document.querySelector('.story') as HTMLElement;
    story.classList.add('measuring');
    const o = story.getBoundingClientRect();
    const rect = (name: string, el: Element): Rect => {
      const r = el.getBoundingClientRect();
      return { name, x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
    };
    const keepOut: Rect[] = [];
    story
      .querySelectorAll('h1, .cue > span:last-child, .meta > *, .ending > :not(.knot)')
      .forEach((el) => keepOut.push(rect(`text ${el.textContent?.trim().slice(0, 24)}`, el)));
    story.querySelectorAll('.chapter').forEach((ch) => {
      const id = (ch as HTMLElement).dataset.id;
      keepOut.push(rect(`${id} photo`, ch.querySelector('.photo')!));
      ch.querySelectorAll('.float').forEach((f, k) =>
        keepOut.push(rect(`${id} close-up ${k + 1}`, f)),
      );
    });
    story.classList.remove('measuring');
    const d = story.querySelector('.guide')!.getAttribute('d')!;
    const pts = d
      .slice(1)
      .replace('L', ' ')
      .trim()
      .split(' ')
      .map((p) => p.split(',').map(Number) as [number, number]);
    return { d, pts, keepOut, width: o.width };
  });
}

for (const [name, size] of Object.entries(SIZES)) {
  test.describe(`homepage on ${name}`, () => {
    test.use(size);

    test('renders one yarn line with the seven products in order', async ({ page }) => {
      const errors = await open(page);
      const g = await geometry(page);
      expect(g.d.match(/M/g)).toHaveLength(1);
      expect(g.d).not.toMatch(/[Zz]/);
      expect(
        await page
          .locator('.chapter')
          .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id)),
      ).toEqual(['bag', 'daisy', 'cozy', 'pouch', 'laptop', 'hat', 'panda']);
      expect(await page.locator('.line path').count()).toBeGreaterThan(10);
      expect(errors).toEqual([]);
    });

    test('keeps the yarn clear of every text block, photo and close-up', async ({ page }) => {
      await open(page);
      const g = await geometry(page);
      const hits: string[] = [];
      for (const r of g.keepOut) {
        for (const [x, y] of g.pts) {
          if (x > r.x + 1 && x < r.x + r.w - 1 && y > r.y + 1 && y < r.y + r.h - 1) {
            hits.push(`${r.name} at ${x.toFixed(0)},${y.toFixed(0)}`);
            break;
          }
        }
      }
      expect(hits).toEqual([]);
      const xs = g.pts.map(([x]) => x);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...xs)).toBeLessThanOrEqual(g.width);
    });

    test('puts the tip exactly on the end of the drawn line while scrolling', async ({ page }) => {
      await open(page);
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const errors: number[] = [];
      for (let i = 1; i <= 24; i++) {
        await page.evaluate((y) => window.scrollTo(0, y), (max * i) / 25);
        await settle(page);
        const gap = await page.evaluate(() => {
          const tip = document.querySelector('.tip')!;
          if (tip.getAttribute('visibility') === 'hidden') return null;
          const [, tx, ty] = tip
            .getAttribute('transform')!
            .match(/translate\(([-\d.]+) ([-\d.]+)\)/)!
            .map(Number);
          const visible = [...document.querySelectorAll<SVGPathElement>('.line path')].filter(
            (p) => p.getAttribute('visibility') === 'visible',
          );
          const last = visible.at(-1)!;
          const dash = last.style.strokeDasharray;
          const len = dash && dash !== 'none' ? parseFloat(dash) : last.getTotalLength();
          const end = last.getPointAtLength(len);
          return Math.hypot(end.x - tx!, end.y - ty!);
        });
        if (gap !== null) errors.push(gap);
      }
      expect(errors.length).toBeGreaterThan(15);
      expect(Math.max(...errors)).toBeLessThan(0.75);
    });

    test('finishes the whole line at the knot above the ending', async ({ page }) => {
      await open(page);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await settle(page);
      const state = await page.evaluate(() => {
        const paths = [...document.querySelectorAll<SVGPathElement>('.line path')];
        const knot = document.querySelector('.knot')!.getBoundingClientRect();
        const tip = document.querySelector('.tip')!.getBoundingClientRect();
        return {
          allFull: paths.every(
            (p) => p.getAttribute('visibility') === 'visible' && p.style.strokeDasharray === 'none',
          ),
          gap: Math.hypot(
            tip.left + tip.width / 2 - knot.left,
            tip.top + tip.height / 2 - knot.top,
          ),
        };
      });
      expect(state.allFull).toBe(true);
      expect(state.gap).toBeLessThan(1.5);
    });

    test('passes automated accessibility checks', async ({ page }) => {
      await open(page);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    });
  });
}

test.describe('homepage behaviour', () => {
  test.use(SIZES.phone);

  test('redraws the line after a resize without a long pause', async ({ page }) => {
    await open(page);
    const before = await page.locator('.guide').getAttribute('d');
    await page.setViewportSize({ width: 430, height: 932 });
    await expect.poll(() => page.locator('.guide').getAttribute('d')).not.toBe(before);
    const builds = await page.evaluate(() =>
      performance.getEntriesByName('story-build').map((e) => e.duration),
    );
    expect(builds.length).toBe(2);
    expect(Math.max(...builds)).toBeLessThan(120);
    expect(await page.locator('.thread').count()).toBe(1);
  });

  test('keeps drawing with reduced motion but holds everything else still', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 3));
    await settle(page);
    const state = await page.evaluate(() => ({
      drawn: document.querySelectorAll('.line path[visibility="visible"]').length,
      moved: [...document.querySelectorAll<HTMLElement>('.photo, .float, .meta > *')].filter(
        (e) => e.style.transform !== '',
      ).length,
    }));
    expect(state.drawn).toBeGreaterThan(0);
    expect(state.moved).toBe(0);
  });

  test('shows the page without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ ...SIZES.phone, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.chapter .photo img').first()).toBeVisible();
    await context.close();
  });
});
