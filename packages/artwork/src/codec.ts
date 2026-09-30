import type { PathCommand } from './commands.ts';

// drawings ship as text: tenths, each point relative to the previous one
const SCALE = 10;

export function encodeCommands(commands: readonly PathCommand[]): string {
  let px = 0;
  let py = 0;
  let out = '';
  for (const [type, ...n] of commands) {
    out += type;
    const parts: number[] = [];
    for (let i = 0; i < n.length; i += 2) {
      const x = Math.round((n[i] as number) * SCALE);
      const y = Math.round((n[i + 1] as number) * SCALE);
      if (x / SCALE !== n[i] || y / SCALE !== n[i + 1]) {
        throw new RangeError(`Cannot encode ${n[i]},${n[i + 1]} losslessly`);
      }
      parts.push(x - px, y - py);
      px = x;
      py = y;
    }
    out += parts.map((v, i) => (i && v >= 0 ? ',' : '') + v).join('');
  }
  return out;
}

export function decodeCommands(text: string): PathCommand[] {
  const commands: PathCommand[] = [];
  let px = 0;
  let py = 0;
  for (const m of text.matchAll(/([MLQC])([^MLQC]*)/g)) {
    const deltas = (m[2]!.match(/-?\d+/g) ?? []).map(Number);
    const n: number[] = [];
    for (let i = 0; i < deltas.length; i += 2) {
      px += deltas[i]!;
      py += deltas[i + 1]!;
      n.push(px / SCALE, py / SCALE);
    }
    commands.push([m[1], ...n] as unknown as PathCommand);
  }
  return commands;
}
