// usage: pnpm --filter @crochet-simple/cms preview  (drafts included, shown at http://127.0.0.1:4330)
// PREVIEW_BUILD_ONLY=1 builds without starting the viewer
import { spawn } from 'node:child_process';
import path from 'node:path';
import { getPayload } from 'payload';
import config from '../src/payload.config.ts';
import { WEB_ROOT } from '../src/paths.ts';
import { buildPreview } from '../src/publish/preview.ts';

const payload = await getPayload({ config });
const r = await buildPreview(payload, (line) => console.log(line));
console.log(`Preview built with drafts: ${r.patterns} patterns and ${r.articles} articles.`);
if (process.env['PREVIEW_BUILD_ONLY'] !== '1') {
  console.log('Open http://127.0.0.1:4330 to see it. Nothing is published. Press Ctrl+C to stop.');
  const astro = path.join(WEB_ROOT, 'node_modules/astro/bin/astro.mjs');
  const child = spawn(
    process.execPath,
    [astro, 'preview', '--host', '127.0.0.1', '--port', '4330', '--ignore-lock'],
    {
      cwd: WEB_ROOT,
      env: { ...process.env, OUT_DIR: r.outDir },
      stdio: 'inherit',
    },
  );
  await new Promise((done) => child.on('close', done));
}
process.exit(0);
