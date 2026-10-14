import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
test.describe.configure({ mode: 'serial' });

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'CPU throttling needs Chromium DevTools Protocol',
);

test('the homepage scrolls smoothly on a 4× slower CPU (phone, 3×)', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.route(/googlesyndication|cloudflareinsights|pinterest\.com|etsy\.com/, (r) =>
    r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }),
  );
  await page.goto('/');
  await page.locator('.story.ready').waitFor();
  const steps = await page.evaluate(() =>
    performance.getEntriesByName('story-step').map((e) => Math.round(e.duration)),
  );
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __long: number[] };
    w.__frames = [];
    w.__long = [];
    new PerformanceObserver((l) =>
      l.getEntries().forEach((e) => w.__long.push(Math.round(e.duration))),
    ).observe({ type: 'longtask' });
    let last = performance.now();
    const tick = (t: number) => {
      w.__frames.push(t - last);
      last = t;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.mouse.move(195, 400);
  const phases: Record<string, { p50: number; p95: number; max: number; frames: number }> = {};
  const measure = async (name: string, deltas: number[]) => {
    await page.evaluate(() => {
      (window as unknown as { __frames: number[] }).__frames = [];
    });
    for (const dy of deltas) {
      await page.mouse.wheel(0, dy);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(300);
    const frames = await page.evaluate(() =>
      (window as unknown as { __frames: number[] }).__frames.slice(1),
    );
    const s = [...frames].sort((a, b) => a - b);
    phases[name] = {
      frames: s.length,
      p50: +s[Math.floor(s.length * 0.5)]!.toFixed(1),
      p95: +s[Math.floor(s.length * 0.95)]!.toFixed(1),
      max: +s.at(-1)!.toFixed(1),
    };
  };
  await measure('slow down', Array(200).fill(24));
  await measure('fast down', Array(60).fill(180));
  await measure('fast up', Array(60).fill(-180));
  await measure('slow up', Array(120).fill(-24));
  const longTasks = await page.evaluate(() => (window as unknown as { __long: number[] }).__long);
  await context.close();
  const summary = {
    cpuThrottle: 4,
    dpr: 3,
    buildStepsMs: steps,
    phases,
    longTasksWhileScrolling: longTasks,
  };
  mkdirSync(resolve(import.meta.dirname, '../../test-results/web'), { recursive: true });
  writeFileSync(
    resolve(import.meta.dirname, '../../test-results/web/performance-chromium-phone.json'),
    JSON.stringify(summary, null, 2),
  );
  console.info(JSON.stringify(summary));
  // the yarn is built in short tasks, none long enough to hold up a tap
  expect(steps.length).toBeGreaterThanOrEqual(5);
  for (const ms of steps) expect(ms).toBeLessThan(50);
  for (const phase of Object.values(phases)) expect(phase.p95).toBeLessThan(20);
  expect(longTasks.filter((d) => d > 50)).toHaveLength(0);
});

test('the category row and patterns scroll smoothly on a 4× slower CPU (phone, 3×)', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.route(/googlesyndication|cloudflareinsights/, (r) => r.fulfill({ body: '' }));
  await page.goto('/patterns/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const w = window as unknown as { frames: number[]; long: number[]; sampling: boolean };
    w.frames = [];
    w.long = [];
    w.sampling = true;
    new PerformanceObserver((list) =>
      list.getEntries().forEach((e) => w.long.push(e.duration)),
    ).observe({ type: 'longtask' });
    let last = performance.now();
    const tick = (t: number) => {
      w.frames.push(t - last);
      last = t;
      if (w.sampling) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  for (let i = 0; i < 14; i++) {
    await page.mouse.wheel(0, 50);
    await page.waitForTimeout(35);
  }
  await page.locator('.filters .chips').evaluate((row) => row.scrollBy({ left: 240 }));
  await page.waitForTimeout(450);
  for (let i = 0; i < 14; i++) {
    await page.mouse.wheel(0, -50);
    await page.waitForTimeout(35);
  }
  await page.waitForTimeout(600);
  const summary = await page.evaluate(() => {
    const w = window as unknown as { frames: number[]; long: number[]; sampling: boolean };
    w.sampling = false;
    const frames = w.frames.slice(1).sort((a, b) => a - b);
    return {
      cpuThrottle: 4,
      dpr: 3,
      p95: frames[Math.floor(frames.length * 0.95)],
      longTasks: w.long,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  mkdirSync(resolve(import.meta.dirname, '../../test-results/web'), { recursive: true });
  writeFileSync(
    resolve(import.meta.dirname, '../../test-results/web/performance-categories.json'),
    JSON.stringify(summary, null, 2),
  );
  console.info(JSON.stringify(summary));
  expect(summary.p95).toBeLessThan(20);
  expect(summary.longTasks.filter((n) => n > 50)).toHaveLength(0);
  expect(summary.overflow).toBe(false);
  await context.close();
});

// every kind of page, so a slow or jumpy page can never slip through unnoticed
const EVERY_PAGE = [
  '/',
  '/patterns/',
  '/patterns/category/bags/',
  '/patterns/blue-market-bag/',
  '/patterns/laptop-sleeve/',
  '/journal/',
  '/journal/how-to-read-a-crochet-pattern/',
  '/about/',
  '/privacy/',
  '/terms/',
  '/search/?q=bag',
  '/no-such-page/',
];
const DEVICES = {
  phone: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 },
};
// only moving and fading are cheap for phones to animate over a large area
const CHEAP = new Set(['transform', 'translate', 'scale', 'rotate', 'opacity', 'offsetDistance']);

for (const [device, options] of Object.entries(DEVICES)) {
  for (const path of EVERY_PAGE) {
    test(`${path} loads without jumps and scrolls smoothly on a 4× slower CPU (${device})`, async ({
      browser,
    }) => {
      const context = await browser.newContext(options);
      const page = await context.newPage();
      await page.route(/googlesyndication|cloudflareinsights|pinterest\.com|etsy\.com/, (r) =>
        r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }),
      );
      await page.addInitScript(() => {
        const w = window as unknown as { __shift: number };
        w.__shift = 0;
        new PerformanceObserver((list) =>
          list.getEntries().forEach((e) => {
            const shift = e as PerformanceEntry & { value: number; hadRecentInput: boolean };
            if (!shift.hadRecentInput) w.__shift += shift.value;
          }),
        ).observe({ type: 'layout-shift', buffered: true });
      });
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.goto(path, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1200);
      await page.evaluate(() => {
        const w = window as unknown as { __frames: number[]; __long: number[] };
        w.__frames = [];
        w.__long = [];
        new PerformanceObserver((l) =>
          l.getEntries().forEach((e) => w.__long.push(Math.round(e.duration))),
        ).observe({ type: 'longtask' });
        let last = performance.now();
        const tick = (t: number) => {
          w.__frames.push(t - last);
          last = t;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await page.mouse.move(options.viewport.width / 2, options.viewport.height / 2);
      for (let i = 0; i < 70; i++) {
        await page.mouse.wheel(0, 60);
        await page.waitForTimeout(16);
      }
      for (let i = 0; i < 20; i++) {
        await page.mouse.wheel(0, -150);
        await page.waitForTimeout(16);
      }
      await page.waitForTimeout(400);
      const result = await page.evaluate(
        (cheap) => {
          const w = window as unknown as { __frames: number[]; __long: number[]; __shift: number };
          const frames = w.__frames.slice(1).sort((a, b) => a - b);
          const area = innerWidth * innerHeight;
          const costly = document
            .getAnimations()
            .filter((a) => a.playState === 'running')
            .flatMap((a) => {
              const effect = a.effect as KeyframeEffect | null;
              const el = effect?.target as Element | null;
              if (!effect || !el) return [];
              const box = el.getBoundingClientRect();
              if (box.width * box.height < area * 0.1) return [];
              const props = effect
                .getKeyframes()
                .flatMap((k) => Object.keys(k))
                .filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k));
              const css = getComputedStyle(el);
              // a large colour fade is only cheap on a plain layer with nothing painted on it
              const plain = css.backgroundImage === 'none' && css.boxShadow === 'none';
              return props
                .filter((p) => !cheap.includes(p) && !(p === 'backgroundColor' && plain))
                .map((p) => `${el.className}: ${p}`);
            });
          const blurred = [...document.querySelectorAll('*')]
            .filter((e) => {
              const s = getComputedStyle(e);
              return (
                (s.backdropFilter !== '' && s.backdropFilter !== 'none') ||
                /blur|drop-shadow/.test(s.filter)
              );
            })
            .map((e) => e.className || e.tagName);
          return {
            p95: frames[Math.floor(frames.length * 0.95)] ?? 0,
            longTasks: w.__long.filter((d) => d > 50),
            shift: +w.__shift.toFixed(3),
            costly,
            blurred,
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        },
        [...CHEAP],
      );
      await context.close();
      console.info(`${device} ${path} ${JSON.stringify(result)}`);
      expect(result.p95, 'frame time p95 in ms').toBeLessThan(20);
      expect(result.longTasks, 'tasks over 50 ms').toEqual([]);
      expect(result.shift, 'layout shift').toBeLessThan(0.02);
      expect(result.costly, 'large animations that repaint').toEqual([]);
      expect(result.blurred, 'blurred layers').toEqual([]);
      expect(result.overflow, 'wider than the screen').toBe(false);
    });
  }
}
