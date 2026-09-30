import bag from '../drawings/blue-market-bag-commands.json' with { type: 'json' };
import daisy from '../drawings/daisy-clip-commands.json' with { type: 'json' };
import cozy from '../drawings/olive-cup-cozy-commands.json' with { type: 'json' };
import pouch from '../drawings/airpods-pouch-commands.json' with { type: 'json' };
import laptop from '../drawings/laptop-sleeve-commands.json' with { type: 'json' };
import hat from '../drawings/bucket-hat-commands.json' with { type: 'json' };
import panda from '../drawings/crochet-panda-commands.json' with { type: 'json' };
import { validateCommands, type PathCommand } from './commands.ts';
import type { Box } from './geometry.ts';

export const PRODUCT_ORDER = ['bag', 'daisy', 'cozy', 'pouch', 'laptop', 'hat', 'panda'] as const;

export type DrawingId = (typeof PRODUCT_ORDER)[number];

export interface Drawing {
  readonly id: DrawingId;
  readonly title: string;
  readonly file: string;
  // drawing frame in its reference photo pixels
  readonly viewBox: Box;
  readonly commands: readonly PathCommand[];
}

const define = (
  id: DrawingId,
  title: string,
  file: string,
  viewBox: readonly [number, number, number, number],
  raw: unknown,
): Drawing => ({
  id,
  title,
  file,
  viewBox: { x: viewBox[0], y: viewBox[1], width: viewBox[2], height: viewBox[3] },
  commands: validateCommands(raw, file),
});

export const DRAWINGS: readonly Drawing[] = [
  define('bag', 'Blue market bag', 'blue-market-bag', [440, 0, 790, 930], bag),
  define('daisy', 'Daisy clip', 'daisy-clip', [330, 130, 1000, 700], daisy),
  define('cozy', 'Olive cup cozy', 'olive-cup-cozy', [590, -50, 620, 930], cozy),
  define('pouch', 'AirPods pouch', 'airpods-pouch', [455, 95, 1120, 800], pouch),
  define('laptop', 'Laptop sleeve', 'laptop-sleeve', [185, 215, 1310, 480], laptop),
  define('hat', 'Bucket hat', 'bucket-hat', [385, 75, 870, 805], hat),
  define('panda', 'Crochet panda', 'crochet-panda', [925, 180, 930, 1270], panda),
];

export function getDrawing(id: DrawingId): Drawing {
  const drawing = DRAWINGS.find((d) => d.id === id);
  if (!drawing) throw new Error(`Unknown drawing ${id}`);
  return drawing;
}
