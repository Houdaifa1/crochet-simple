import { spawn } from 'node:child_process';
import path from 'node:path';

export interface BuildOptions {
  webRoot: string;
  contentDir: string;
  outDir: string;
  siteUrl?: string | undefined;
  log: (line: string) => void;
}

function node(
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  log: (l: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '';
    const take = (chunk: Buffer) => {
      const s = chunk.toString();
      tail = (tail + s).slice(-6000);
      for (const line of s.split('\n')) {
        // an empty journal or page folder is normal, not worth a note
        if (
          !/error|warn/i.test(line) ||
          /No files found matching|does not exist or is empty|does not exist\./.test(line)
        )
          continue;
        if (line.trim()) log(line.trim());
      }
    };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve(tail) : reject(new Error(tail.trim().split('\n').slice(-12).join('\n'))),
    );
  });
}

// the site's own build (Astro, then the search index), run with node directly
export async function buildSite(o: BuildOptions): Promise<void> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'production',
    CONTENT_DIR: o.contentDir,
    OUT_DIR: o.outDir,
    ...(o.siteUrl ? { SITE_URL: o.siteUrl } : {}),
  };
  delete env['PAGE_SIZE'];
  if (!o.siteUrl) delete env['SITE_URL'];
  await node(
    [path.join(o.webRoot, 'node_modules/astro/bin/astro.mjs'), 'build'],
    o.webRoot,
    env,
    o.log,
  );
  await node(
    [
      path.join(o.webRoot, 'node_modules/pagefind/lib/runner/bin.cjs'),
      '--site',
      o.outDir,
      '--quiet',
    ],
    o.webRoot,
    env,
    o.log,
  );
}

export interface DeployOptions {
  webRoot: string;
  domain: string;
  log: (line: string) => void;
}

// uploads apps/web/dist to Cloudflare and points the domain at it (key and account from .env)
export async function deploySite(o: DeployOptions): Promise<void> {
  await node(
    [path.join(o.webRoot, 'node_modules/wrangler/bin/wrangler.js'), 'deploy', '--domain', o.domain],
    o.webRoot,
    { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' },
    o.log,
  );
}
