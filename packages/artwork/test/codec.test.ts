import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeCommands, encodeCommands } from '../src/codec.ts';
import type { PathCommand } from '../src/commands.ts';

const DIR = resolve(import.meta.dirname, '../drawings');
const files = readdirSync(DIR).filter((f) => f.endsWith('-commands.json'));

describe('drawing codec', () => {
  it.each(files)('round-trips %s exactly', (file) => {
    const original = JSON.parse(readFileSync(resolve(DIR, file), 'utf8')) as PathCommand[];
    const text = encodeCommands(original);
    expect(decodeCommands(text)).toStrictEqual(original);
    expect(text.length).toBeLessThan(JSON.stringify(original).length * 0.6);
  });

  it('refuses values it cannot store exactly', () => {
    expect(() => encodeCommands([['M', 1.25, 0]])).toThrow(RangeError);
  });
});
