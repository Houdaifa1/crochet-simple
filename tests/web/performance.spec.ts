import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

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
