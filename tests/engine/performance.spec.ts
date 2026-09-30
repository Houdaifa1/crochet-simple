import { buildSync } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const bundle = buildSync({
  entryPoints: [resolve(import.meta.dirname, 'browser-entry.ts')],
  bundle: true,
  format: 'iife',
  write: false,
  target: 'es2022',
}).outputFiles[0]!.text;

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'CPU throttling needs Chromium DevTools Protocol',
);

test('scrolling stays smooth on a 4× slower CPU (phone, 3×)', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.setContent(
    '<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body></body></html>',
  );
  await page.addScriptTag({ content: bundle });
  const t0 = Date.now();
  await page.evaluate(() => {
    window.__engine.mount('phone');
  });
  const mountMs = Date.now() - t0;
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
  await measure('slow down', Array(160).fill(20));
  await measure('fast down', Array(40).fill(160));
  await measure('fast up', Array(40).fill(-160));
  await measure('slow up', Array(120).fill(-20));
  const longTasks = await page.evaluate(() => (window as unknown as { __long: number[] }).__long);
  await context.close();
  const summary = { cpuThrottle: 4, dpr: 3, mountMs, phases, longTasksWhileScrolling: longTasks };
  mkdirSync(resolve(import.meta.dirname, '../../test-results/engine'), { recursive: true });
  writeFileSync(
    resolve(import.meta.dirname, '../../test-results/engine/performance-chromium-phone.json'),
    JSON.stringify(summary, null, 2),
  );
  console.info(JSON.stringify(summary));
  for (const phase of Object.values(phases)) expect(phase.p95).toBeLessThan(20);
  expect(longTasks.filter((d) => d > 50)).toHaveLength(0);
});
