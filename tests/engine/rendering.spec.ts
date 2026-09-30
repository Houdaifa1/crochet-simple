import { buildSync } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { expect, test, type Page } from '@playwright/test';

/**
 * Real-browser checks of the rendering technique (Chromium, WebKit, Firefox; 1×–3×):
 *
 * 1. Tip vs line end: the browser draws the line piece under the tip with a dash; the
 *    tip is a disc at the engine's point. In screenshots we locate the line's end with
 *    sub-pixel edge integration and the tip's centre, and compare them.
 * 2. Engine vs browser geometry: how far the browser's line end for length L is from
 *    the engine's point (the scroll map relies on the engine's table).
 * 3. The guide is one path (one M, no Z), every piece is one M; tip stays on screen.
 */
const bundle = buildSync({
  entryPoints: [resolve(import.meta.dirname, 'browser-entry.ts')],
  bundle: true,
  format: 'iife',
  write: false,
  target: 'es2022',
}).outputFiles[0]!.text;

const TIP_TOLERANCE_PX = 0.75;
const GEOMETRY_TOLERANCE_PX = 2;
const SAMPLES = 30;
const HALF = 30;
const REPORT_DIR = resolve(import.meta.dirname, '../../test-results/engine');
const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
} as const;

type Harness = {
  total: number;
  points: number;
  pieces: number;
  first: number;
  last: number;
  samples(count: number): number[];
  focus(l: number): { x: number; y: number; tx: number; ty: number };
  showTip(l: number): void;
  showLineEnd(l: number): void;
  tipAt(s: number): { y: number; length: number; total: number };
};

async function open(page: Page, story: 'phone' | 'desktop') {
  await page.setContent(
    '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>',
  );
  await page.addScriptTag({ content: bundle });
  return page.evaluate((name) => {
    const m = window.__engine.mount(name);
    (window as unknown as { __m: typeof m }).__m = m;
    return { total: m.total, points: m.points, pieces: m.pieces, first: m.first, last: m.last };
  }, story);
}

const call = <K extends 'focus' | 'showTip' | 'showLineEnd' | 'tipAt'>(
  page: Page,
  method: K,
  arg: number,
) =>
  page.evaluate(
    ([m, a]) => ((window as unknown as { __m: Harness }).__m[m] as (x: number) => unknown)(a),
    [method, arg] as const,
  ) as Promise<ReturnType<Harness[K]>>;

interface Weights {
  readonly w: Float32Array;
  readonly width: number;
  readonly height: number;
}

/** Darkness (0–1) of every pixel against the white page. */
function readWeights(buffer: Buffer): Weights {
  const img = PNG.sync.read(buffer);
  const w = new Float32Array(img.width * img.height);
  for (let i = 0; i < w.length; i++) {
    const lum =
      0.2126 * img.data[i * 4]! + 0.7152 * img.data[i * 4 + 1]! + 0.0722 * img.data[i * 4 + 2]!;
    w[i] = (255 - lum) / 255;
  }
  return { w, width: img.width, height: img.height };
}

function centroid(img: Weights) {
  let sx = 0;
  let sy = 0;
  let sw = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const v = img.w[y * img.width + x]!;
      if (v > 0.03) {
        sx += (x + 0.5) * v;
        sy += (y + 0.5) * v;
        sw += v;
      }
    }
  }
  return { x: sx / sw, y: sy / sw, weight: sw };
}

function bilinear(img: Weights, x: number, y: number): number {
  const fx = x - 0.5;
  const fy = y - 0.5;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const ax = fx - x0;
  const ay = fy - y0;
  const at = (ix: number, iy: number) =>
    ix < 0 || iy < 0 || ix >= img.width || iy >= img.height ? 0 : img.w[iy * img.width + ix]!;
  return (
    at(x0, y0) * (1 - ax) * (1 - ay) +
    at(x0 + 1, y0) * ax * (1 - ay) +
    at(x0, y0 + 1) * (1 - ax) * ay +
    at(x0 + 1, y0 + 1) * ax * ay
  );
}

const stat = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  return { median: +s[Math.floor(s.length / 2)]!.toFixed(3), max: +s.at(-1)!.toFixed(3) };
};

for (const story of ['phone', 'desktop'] as const) {
  for (const dpr of [1, 2, 3]) {
    test(`tip sits on the drawn line end — ${story} @${dpr}x`, async ({ browser, browserName }) => {
      const viewport = VIEWPORTS[story];
      const context = await browser.newContext({ viewport, deviceScaleFactor: dpr });
      const page = await context.newPage();
      const info = await open(page, story);
      const lengths = await page.evaluate(
        (n) => (window as unknown as { __m: Harness }).__m.samples(n),
        SAMPLES,
      );
      const tipErrors: number[] = [];
      const geometryErrors: number[] = [];
      for (const length of lengths) {
        const f = await call(page, 'focus', length);
        const clip = {
          x: Math.min(Math.max(0, Math.floor(f.x - HALF)), viewport.width - HALF * 2),
          y: Math.min(Math.max(0, Math.floor(f.y - HALF)), viewport.height - HALF * 2),
          width: HALF * 2,
          height: HALF * 2,
        };
        await call(page, 'showTip', length);
        const tipImg = readWeights(await page.screenshot({ clip }));
        const scale = tipImg.width / (HALF * 2);
        const c = centroid(tipImg);
        expect(c.weight, `tip not rendered at ${Math.round(length)}`).toBeGreaterThan(0);
        const tip = { x: clip.x + c.x / scale, y: clip.y + c.y / scale };

        await call(page, 'showLineEnd', length);
        const lineImg = readWeights(await page.screenshot({ clip }));
        // Coverage along the local direction: ≈ constant inside the stroke, 0 past its
        // butt end. The integral locates the end edge to a fraction of a pixel.
        const sample = (s: number) =>
          bilinear(lineImg, (f.x + s * f.tx - clip.x) * scale, (f.y + s * f.ty - clip.y) * scale);
        let inside = 0;
        for (let s = -14; s < -8; s += 0.05) inside += sample(s) * 0.05;
        inside /= 6;
        let area = 0;
        for (let s = -8; s < 8; s += 0.02) area += sample(s) * 0.02;
        const endAlong = -8 + area / inside;
        const lineEnd = { x: f.x + endAlong * f.tx, y: f.y + endAlong * f.ty };

        if (process.env.DEBUG_SAMPLES && Math.hypot(tip.x - lineEnd.x, tip.y - lineEnd.y) > 1) {
          console.info('outlier', JSON.stringify({ length, f, clip, inside, area, endAlong, tip }));
        }
        tipErrors.push(Math.hypot(tip.x - lineEnd.x, tip.y - lineEnd.y));
        geometryErrors.push(Math.hypot(lineEnd.x - f.x, lineEnd.y - f.y));
      }
      await context.close();
      const summary = {
        browser: browserName,
        story,
        dpr,
        points: info.points,
        pieces: info.pieces,
        routeLength: Math.round(info.total),
        samples: tipErrors.length,
        tipToLineEnd: stat(tipErrors),
        browserToEngine: stat(geometryErrors),
      };
      mkdirSync(REPORT_DIR, { recursive: true });
      writeFileSync(
        resolve(REPORT_DIR, `accuracy-${browserName}-${story}-${dpr}x.json`),
        JSON.stringify(summary, null, 2),
      );
      console.info(JSON.stringify(summary));
      expect(tipErrors.length).toBeGreaterThanOrEqual(20);
      expect(summary.tipToLineEnd.max).toBeLessThanOrEqual(TIP_TOLERANCE_PX);
      expect(summary.browserToEngine.max).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);
    });
  }
}

for (const story of ['phone', 'desktop'] as const) {
  test(`one M, no Z in every rendered path; tip on screen while scrolling — ${story}`, async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize(VIEWPORTS[story]);
    const info = await open(page, story);
    const letters = await page.evaluate(() =>
      [...document.querySelectorAll('path:not([data-probe])')].map((p) =>
        window.__engine.letters(p.getAttribute('d') ?? ''),
      ),
    );
    // letters[0] is the guide: the whole yarn as ONE path. The rest are its pieces.
    expect(letters.length).toBe(info.pieces + 1);
    for (const l of letters) expect(l).toEqual({ M: 1, L: 1 });
    for (let s = info.first; s < info.last; s += (info.last - info.first) / 80) {
      const tip = await call(page, 'tipAt', s);
      if (tip.length <= 0 || tip.length >= tip.total) continue;
      expect(
        tip.y,
        `${browserName} ${story} tip off screen at scroll ${Math.round(s)}`,
      ).toBeGreaterThan(0);
      expect(tip.y).toBeLessThan(VIEWPORTS[story].height);
    }
  });
}
