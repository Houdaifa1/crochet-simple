import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { FRAME, copyPhoto } from '../src/publish/unframe.ts';

const dir = mkdtempSync(join(tmpdir(), 'unframe-'));
const photo = (w: number, h: number, color: { r: number; g: number; b: number }) =>
  sharp({ create: { width: w, height: h, channels: 3, background: color } })
    .png()
    .toBuffer();

async function framed(file: string): Promise<void> {
  const inner = await photo(240, 180, { r: 120, g: 110, b: 100 });
  await sharp({ create: { width: 400, height: 400, channels: 3, background: FRAME } })
    .composite([{ input: inner, left: 80, top: 110 }])
    .jpeg({ quality: 95 })
    .toFile(file);
}

describe('cover photos for the website', () => {
  it('lose the cream frame they were delivered with, and the original stays as it is', async () => {
    const from = join(dir, 'framed.jpg');
    const to = join(dir, 'framed-out.jpg');
    await framed(from);
    const before = readFileSync(from);
    expect(await copyPhoto(from, to)).toBe(true);
    const size = await sharp(to).metadata();
    expect(Math.abs(size.width! - 240)).toBeLessThanOrEqual(2);
    expect(Math.abs(size.height! - 180)).toBeLessThanOrEqual(2);
    expect(readFileSync(from).equals(before)).toBe(true);
  });

  it('keep a white studio background, which is not the frame', async () => {
    const from = join(dir, 'white.png');
    const to = join(dir, 'white-out.png');
    const inner = await photo(100, 100, { r: 40, g: 90, b: 160 });
    await sharp({ create: { width: 300, height: 300, channels: 3, background: '#ffffff' } })
      .composite([{ input: inner, left: 100, top: 100 }])
      .png()
      .toFile(from);
    expect(await copyPhoto(from, to)).toBe(false);
    expect(readFileSync(to).equals(readFileSync(from))).toBe(true);
  });

  it('copy other files exactly as they are', async () => {
    const from = join(dir, 'pattern.pdf');
    writeFileSync(from, '%PDF-1.7 test');
    expect(await copyPhoto(from, join(dir, 'pattern-out.pdf'))).toBe(false);
    expect(readFileSync(join(dir, 'pattern-out.pdf'), 'utf8')).toBe('%PDF-1.7 test');
  });
});
