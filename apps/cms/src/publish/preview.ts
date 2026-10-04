import path from 'node:path';
import type { Payload } from 'payload';
import { DATA_DIR, MEDIA_DIR, WEB_ROOT } from '../paths.ts';
import { buildSite } from './build.ts';
import { exportContent, type ExportResult } from './export.ts';

export const PREVIEW_DIR = path.join(DATA_DIR, 'preview');

// the site with drafts included, built on this Mac only: never saved to Cloudflare or put online
export async function buildPreview(
  payload: Payload,
  log: (line: string) => void,
): Promise<ExportResult & { outDir: string }> {
  const contentDir = path.join(PREVIEW_DIR, 'content');
  const outDir = path.join(PREVIEW_DIR, 'site');
  const result = await exportContent({
    payload,
    mediaDir: MEDIA_DIR,
    dataDir: DATA_DIR,
    contentDir,
    drafts: true,
    log,
  });
  await buildSite({ webRoot: WEB_ROOT, contentDir, outDir, log });
  return { ...result, outDir };
}
