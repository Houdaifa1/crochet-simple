// usage: boot a simulator, then pnpm measure:ios
import { chromium } from '@playwright/test';
import { buildSync } from 'esbuild';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PNG } from 'pngjs';

const ROOT = resolve(import.meta.dirname, '..');
const run = promisify(execFile);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SCALE = 3;
const TOLERANCE_PX = 0.75;

const booted = execFileSync('xcrun', ['simctl', 'list', 'devices', 'booted'], { encoding: 'utf8' });
const sim = /\(([0-9A-F-]{36})\) \(Booted\)/.exec(booted)?.[1];
if (!sim) throw new Error('Boot an iOS Simulator first, e.g. xcrun simctl boot "iPhone 17"');

const bundle = buildSync({
  entryPoints: [join(ROOT, 'tests/engine/browser-entry.ts')],
  bundle: true,
  format: 'iife',
  write: false,
  target: 'es2020',
}).outputFiles[0]!.text;
const page = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
<script src="engine.js"></script><script>
const q = new URLSearchParams(location.search);
const m = window.__engine.mount('phone');
const L = m.samples(30)[Number(q.get('i'))];
m.focus(L);
if (q.get('mode') === 'tip') m.showTip(L); else m.showLineEnd(L);
const mk = document.createElement('div');
mk.style.cssText = 'position:fixed;left:0;top:0;width:6px;height:6px;background:#0000ff;z-index:9';
document.body.appendChild(mk);
</script></body></html>`;
const server = createServer((req, res) => {
  const js = req.url?.startsWith('/engine.js');
  res.writeHead(200, {
    'content-type': js ? 'text/javascript' : 'text/html',
    'cache-control': 'no-store',
  });
  res.end(js ? bundle : page);
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const port = (server.address() as AddressInfo).port;

const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 402, height: 700 } });
await tab.setContent('<!doctype html><body></body>');
await tab.addScriptTag({ content: bundle });
const plan = await tab.evaluate(() => {
  const m = window.__engine.mount('phone');
  return m.samples(30).map((L) => {
    const f = m.focus(L);
    return { L, tx: f.tx, ty: f.ty };
  });
});
await browser.close();

const shotsDir = mkdtempSync(join(tmpdir(), 'ios-tip-'));
const weight = (img: PNG, x: number, y: number) => {
  const i = (y * img.width + x) * 4;
  return (
    (255 - (0.2126 * img.data[i]! + 0.7152 * img.data[i + 1]! + 0.0722 * img.data[i + 2]!)) / 255
  );
};
const origin = (img: PNG) => {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = 0; y < img.height / 3; y++) {
    for (let x = 0; x < 200; x++) {
      const i = (y * img.width + x) * 4;
      if (img.data[i + 2]! > 200 && img.data[i]! < 60 && img.data[i + 1]! < 60) {
        sx += x + 0.5;
        sy += y + 0.5;
        n++;
      }
    }
  }
  return { x: sx / n - 3 * SCALE, y: sy / n - 3 * SCALE }; // marker centre is CSS (3, 3)
};
// async so the local server can answer
const shot = async (i: number, mode: 'tip' | 'line'): Promise<PNG> => {
  for (let attempt = 0; attempt < 4; attempt++) {
    await run('xcrun', [
      'simctl',
      'openurl',
      sim,
      `http://127.0.0.1:${port}/?i=${i}&mode=${mode}&r=${Date.now()}`,
    ]);
    await wait(3000);
    const file = join(shotsDir, `${i}-${mode}.png`);
    await run('xcrun', ['simctl', 'io', sim, 'screenshot', file]);
    const img = PNG.sync.read(readFileSync(file));
    if (Number.isFinite(origin(img).x)) return img;
  }
  throw new Error(`Calibration marker not found for sample ${i} (${mode})`);
};

const errors: number[] = [];
for (const [i, p] of plan.entries()) {
  const tipImg = await shot(i, 'tip');
  const o1 = origin(tipImg);
  let sx = 0;
  let sy = 0;
  let sw = 0;
  for (let y = Math.floor(o1.y); y < tipImg.height * 0.8; y++) {
    for (let x = 0; x < tipImg.width; x++) {
      const k = (y * tipImg.width + x) * 4;
      const red = tipImg.data[k]! > 150 && tipImg.data[k + 1]! < 120 && tipImg.data[k + 2]! < 120;
      if (red) {
        const w = weight(tipImg, x, y);
        sx += (x + 0.5) * w;
        sy += (y + 0.5) * w;
        sw += w;
      }
    }
  }
  const tip = { x: (sx / sw - o1.x) / SCALE, y: (sy / sw - o1.y) / SCALE };

  const lineImg = await shot(i, 'line');
  const o2 = origin(lineImg);
  const at = (s: number, o: number) => {
    const X = o2.x + (tip.x + s * p.tx - o * p.ty) * SCALE - 0.5;
    const Y = o2.y + (tip.y + s * p.ty + o * p.tx) * SCALE - 0.5;
    const x0 = Math.floor(X);
    const y0 = Math.floor(Y);
    const ax = X - x0;
    const ay = Y - y0;
    return (
      weight(lineImg, x0, y0) * (1 - ax) * (1 - ay) +
      weight(lineImg, x0 + 1, y0) * ax * (1 - ay) +
      weight(lineImg, x0, y0 + 1) * (1 - ax) * ay +
      weight(lineImg, x0 + 1, y0 + 1) * ax * ay
    );
  };
  let inside = 0;
  for (let s = -14; s < -8; s += 0.05) inside += at(s, 0) * 0.05;
  inside /= 6;
  let area = 0;
  for (let s = -8; s < 8; s += 0.02) area += at(s, 0) * 0.02;
  const along = -8 + area / inside;
  let across = 0;
  let wsum = 0;
  for (let s = -6; s <= -2; s += 0.5) {
    for (let o = -3; o <= 3; o += 0.1) {
      const w = at(s, o);
      across += o * w;
      wsum += w;
    }
  }
  const err = Math.hypot(along, across / wsum);
  errors.push(err);
  console.info(`sample ${i} length ${Math.round(p.L)}: tip to line end ${err.toFixed(3)} px`);
}
server.close();

const sorted = [...errors].sort((a, b) => a - b);
const summary = {
  browser: 'iOS Safari (iOS Simulator)',
  device: sim,
  dpr: SCALE,
  samples: errors.length,
  tipToLineEnd: {
    median: +sorted[Math.floor(sorted.length / 2)]!.toFixed(3),
    max: +sorted.at(-1)!.toFixed(3),
  },
  tolerancePx: TOLERANCE_PX,
};
mkdirSync(join(ROOT, 'test-results/engine'), { recursive: true });
writeFileSync(
  join(ROOT, 'test-results/engine/accuracy-ios-safari.json'),
  JSON.stringify(summary, null, 2),
);
console.info(JSON.stringify(summary));
if (summary.tipToLineEnd.max > TOLERANCE_PX) process.exitCode = 1;
