import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Endpoint, PayloadRequest } from 'payload';
import { SITE_OUT, WEB_ROOT } from '../paths.ts';
import { publishState, startPublish } from '../publish/run.ts';

const PREVIEW_PORT = 4321;
let preview: ChildProcess | null = null;

const signedIn = (req: PayloadRequest): Response | null =>
  req.user ? null : Response.json({ error: 'Please log in again.' }, { status: 401 });

export const publishEndpoints: Endpoint[] = [
  {
    path: '/publish',
    method: 'get',
    handler: (req) => signedIn(req) ?? Response.json(publishState()),
  },
  {
    path: '/publish',
    method: 'post',
    handler: (req) => signedIn(req) ?? Response.json(startPublish(req.payload)),
  },
  {
    // serves the last built site on this Mac, to check it before it goes online
    path: '/publish/preview',
    method: 'post',
    handler: async (req) => {
      const denied = signedIn(req);
      if (denied) return denied;
      if (!existsSync(path.join(SITE_OUT, 'index.html')))
        return Response.json({ error: 'Publish once first.' }, { status: 409 });
      if (!preview || preview.exitCode !== null) {
        preview = spawn(
          process.execPath,
          [
            path.join(WEB_ROOT, 'node_modules/astro/bin/astro.mjs'),
            'preview',
            '--port',
            String(PREVIEW_PORT),
            '--ignore-lock',
          ],
          { cwd: WEB_ROOT, env: { ...process.env, OUT_DIR: SITE_OUT }, stdio: 'ignore' },
        );
        await new Promise((r) => setTimeout(r, 1500));
      }
      return Response.json({ url: `http://127.0.0.1:${PREVIEW_PORT}/` });
    },
  },
];
