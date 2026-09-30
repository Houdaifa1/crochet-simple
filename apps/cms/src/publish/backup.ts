import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, link, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const KEEP = 30;

export interface BackupResult {
  folder: string;
  files: number;
}

// a complete dated copy; unchanged files are hard links, so only new files take space
export async function backup(
  dbFile: string,
  mediaDir: string,
  root: string,
  reason: string,
): Promise<BackupResult> {
  await mkdir(root, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const folder = path.join(root, `${stamp} ${reason}`);
  const previous = (await readdir(root))
    .filter((n) => !n.startsWith('.'))
    .sort()
    .at(-1);
  await mkdir(path.join(folder, 'media'), { recursive: true });
  if (existsSync(dbFile))
    await run('/usr/bin/sqlite3', [
      dbFile,
      `.backup '${path.join(folder, 'cms.db').replace(/'/g, "''")}'`,
    ]);
  let files = 0;
  if (existsSync(mediaDir)) {
    for (const name of await readdir(mediaDir)) {
      const src = path.join(mediaDir, name);
      const s = await stat(src);
      if (!s.isFile()) continue;
      const dest = path.join(folder, 'media', name);
      const prev = previous ? path.join(root, previous, 'media', name) : '';
      const p = prev && existsSync(prev) ? await stat(prev) : null;
      if (p && p.size === s.size && p.mtimeMs >= s.mtimeMs) await link(prev, dest);
      else await copyFile(src, dest);
      files++;
    }
  }
  const all = (await readdir(root)).filter((n) => !n.startsWith('.')).sort();
  for (const old of all.slice(0, Math.max(0, all.length - KEEP)))
    await rm(path.join(root, old), { recursive: true, force: true });
  return { folder, files };
}
