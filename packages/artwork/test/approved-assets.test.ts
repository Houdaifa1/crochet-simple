import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DRAWINGS, PRODUCT_ORDER } from '../src/catalog.ts';
import { parsePathData } from '../src/commands.ts';

const ROOT = resolve(import.meta.dirname, '../../..');
const DRAWINGS_DIR = resolve(import.meta.dirname, '../drawings');

describe('approved assets', () => {
  const manifest = readFileSync(resolve(import.meta.dirname, '../approved-assets.sha256'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => {
      const [hash, file] = line.split(/\s+/);
      return { hash: hash as string, file: file as string };
    });

  it('covers the 8 homepage photos and 7 × 3 drawing files', () => {
    expect(manifest.filter((m) => m.file.startsWith('apps/web/src/assets/story/'))).toHaveLength(8);
    expect(manifest.filter((m) => m.file.startsWith('packages/artwork/drawings/'))).toHaveLength(
      21,
    );
  });

  it.each(manifest)('$file is byte-identical to the approved version', ({ hash, file }) => {
    const actual = createHash('sha256')
      .update(readFileSync(join(ROOT, file)))
      .digest('hex');
    expect(actual).toBe(hash);
  });
});

describe('approved drawings', () => {
  it('are the seven products in the approved order', () => {
    expect(DRAWINGS.map((d) => d.id)).toEqual([...PRODUCT_ORDER]);
  });

  it('keep their approved command counts (newer AirPods and panda drawings)', () => {
    expect(Object.fromEntries(DRAWINGS.map((d) => [d.id, d.commands.length]))).toEqual({
      bag: 1988,
      daisy: 597,
      cozy: 1230,
      pouch: 690,
      laptop: 1893,
      hat: 1158,
      panda: 1025,
    });
  });

  it.each(DRAWINGS)('$id has one leading M and only L/Q/C after it', ({ commands }) => {
    expect(commands[0]?.[0]).toBe('M');
    expect(commands.filter((c) => c[0] === 'M')).toHaveLength(1);
    expect(new Set(commands.slice(1).map((c) => c[0]))).toSatisfy((s: Set<string>) =>
      [...s].every((t) => ['L', 'Q', 'C'].includes(t)),
    );
  });

  it.each(DRAWINGS)(
    '$id SVG matches its command file and viewBox',
    ({ file, commands, viewBox }) => {
      const svg = readFileSync(join(DRAWINGS_DIR, `${file}-one-line.svg`), 'utf8');
      const paths = svg.match(/<path\b[^>]*\bd="([^"]+)"/g) ?? [];
      expect(paths).toHaveLength(1);
      const d = /\bd="([^"]+)"/.exec(paths[0] as string)?.[1] as string;
      expect(parsePathData(d)).toEqual(commands);
      const vb = /viewBox="([^"]+)"/.exec(svg)?.[1]?.split(/\s+/).map(Number);
      expect(vb).toEqual([viewBox.x, viewBox.y, viewBox.width, viewBox.height]);
    },
  );

  it.each(DRAWINGS)('$id generator reproduces the approved files exactly', ({ file }) => {
    const dir = mkdtempSync(join(tmpdir(), 'artwork-'));
    try {
      copyFileSync(join(DRAWINGS_DIR, `${file}-preview.mjs`), join(dir, 'generator.mjs'));
      execFileSync(process.execPath, [join(dir, 'generator.mjs')], { cwd: dir, stdio: 'pipe' });
      for (const suffix of ['commands.json', 'one-line.svg']) {
        expect(readFileSync(join(dir, `${file}-${suffix}`))).toEqual(
          readFileSync(join(DRAWINGS_DIR, `${file}-${suffix}`)),
        );
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
