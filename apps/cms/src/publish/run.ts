import { existsSync, readFileSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Payload } from 'payload';
import {
  BACKUP_DIR,
  CMS_ROOT,
  CONTENT_DIR,
  DATA_DIR,
  MEDIA_DIR,
  SITE_OUT,
  WEB_ROOT,
} from '../paths.ts';
import { backup } from './backup.ts';
import { buildSite, deploySite } from './build.ts';
import { PublishError, exportContent } from './export.ts';
import { pushContent } from './store.ts';

export type Step = 'backup' | 'export' | 'build' | 'deploy';
export interface PublishState {
  status: 'idle' | 'running' | 'done' | 'failed';
  step?: Step;
  startedAt?: string;
  finishedAt?: string;
  summary?: string;
  error?: string;
  warnings: string[];
  log: string[];
  lastSuccess?: string;
  liveUrl?: string;
}

const STATE_FILE = () => path.join(DATA_DIR, 'publish.json');
let state: PublishState = load();

function load(): PublishState {
  try {
    if (existsSync(STATE_FILE())) {
      const saved = JSON.parse(readFileSync(STATE_FILE(), 'utf8')) as PublishState;
      // a publish cannot survive a restart of the admin
      return saved.status === 'running'
        ? {
            ...saved,
            status: 'failed',
            error: 'The admin was restarted during publishing. Please publish again.',
          }
        : saved;
    }
  } catch {}
  return { status: 'idle', warnings: [], log: [] };
}

const save = () =>
  mkdir(DATA_DIR, { recursive: true }).then(() =>
    writeFile(STATE_FILE(), JSON.stringify(state, null, 2)),
  );

export const publishState = (): PublishState => state;

export function databaseFile(): string {
  const url = process.env['DATABASE_URL'] ?? 'file:./data/cms.db';
  return path.resolve(CMS_ROOT, url.replace(/^file:/, ''));
}

// one publish at a time: backup, export the content, build the site
export function startPublish(payload: Payload): PublishState {
  if (state.status === 'running') return state;
  const log = (line: string) => {
    state.log.push(`${new Date().toLocaleTimeString('en-US', { hour12: false })}  ${line}`);
    if (state.log.length > 400) state.log.splice(0, state.log.length - 400);
  };
  state = {
    status: 'running',
    startedAt: new Date().toISOString(),
    warnings: [],
    log: [],
    ...(state.lastSuccess ? { lastSuccess: state.lastSuccess } : {}),
  };
  void (async () => {
    try {
      state.step = 'backup';
      log('Backing up the database and files');
      const b = await backup(databaseFile(), MEDIA_DIR, BACKUP_DIR, 'publish');
      log(`Backup saved: ${b.folder}`);

      state.step = 'export';
      log('Collecting published content');
      const r = await exportContent({
        payload,
        mediaDir: MEDIA_DIR,
        dataDir: DATA_DIR,
        contentDir: CONTENT_DIR,
        log,
      });
      state.warnings = r.warnings;
      log(
        `Patterns ${r.patterns}, articles ${r.articles}, categories ${r.categories}, files ${r.files}`,
      );

      state.step = 'build';
      log('Building the website');
      const settings = (await payload.findGlobal({
        slug: 'settings',
        depth: 0,
      })) as unknown as Record<string, unknown>;
      const siteUrl =
        typeof settings['siteUrl'] === 'string' && settings['siteUrl']
          ? settings['siteUrl']
          : undefined;
      await buildSite({
        webRoot: WEB_ROOT,
        contentDir: CONTENT_DIR,
        outDir: SITE_OUT,
        siteUrl,
        log,
      });
      log('Website built');

      // online only with a Cloudflare key and an address; otherwise the build stays on this Mac
      let live: string | undefined;
      if (
        process.env['CLOUDFLARE_API_TOKEN'] &&
        process.env['CLOUDFLARE_ACCOUNT_ID'] &&
        siteUrl &&
        SITE_OUT === path.join(WEB_ROOT, 'dist')
      ) {
        state.step = 'deploy';
        // GitHub rebuilds from this copy after a code change, so it goes up before the site does
        log('Saving a copy of the content to Cloudflare');
        const saved = await pushContent(CONTENT_DIR, siteUrl, {
          accountId: process.env['CLOUDFLARE_ACCOUNT_ID'],
          token: process.env['CLOUDFLARE_API_TOKEN'],
        });
        log(`Content copy saved (${saved.uploaded} of ${saved.files} files were new or changed)`);
        log(`Putting the website online at ${siteUrl}`);
        await deploySite({ webRoot: WEB_ROOT, siteUrl, log });
        live = siteUrl;
        log('Website is online');
      } else {
        log(
          siteUrl
            ? 'Built on this Mac only: add the Cloudflare key to go online.'
            : 'Built on this Mac only: add the website address in Site settings to go online.',
        );
      }

      state.status = 'done';
      state.lastSuccess = new Date().toISOString();
      if (live) state.liveUrl = live;
      else delete state.liveUrl;
      const n = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
      state.summary = `${n(r.patterns, 'pattern')} and ${n(r.articles, 'article')} are ${live ? `live at ${live}` : 'ready on this Mac'}${r.warnings.length ? `, with ${n(r.warnings.length, 'note')} below` : ''}.`;
    } catch (e) {
      state.status = 'failed';
      state.error =
        e instanceof PublishError
          ? e.message
          : state.step === 'build'
            ? `The website could not be built. Details:\n${(e as Error).message}`
            : state.step === 'deploy'
              ? `The website was built but could not be put online (check the internet connection and the Cloudflare key). The live site is unchanged. Details:\n${(e as Error).message}`
              : `Something went wrong: ${(e as Error).message}`;
      log(`Stopped: ${state.error}`);
    } finally {
      state.finishedAt = new Date().toISOString();
      delete state.step;
      await save();
    }
  })();
  return state;
}
