import { defineConfig } from '@playwright/test';

const PERF = /performance\.spec\.ts/;
const ADMIN = /tests\/admin\//;
const SITE_ONLY = [PERF, ADMIN];
// the admin under test gets a fresh database and folders on every run, never the real ones
const ADMIN_DIR = 'test-results/admin';
// its own port, so a preview the owner has open on 4321 is never mistaken for the test build
const SITE_PORT = 4390;

export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results/playwright',
  fullyParallel: true,
  reporter: [['list']],
  timeout: 180_000,
  use: { baseURL: `http://127.0.0.1:${SITE_PORT}` },
  webServer: [
    {
      // the built site, so tests see exactly what ships; started directly so it stops cleanly
      command: `cd apps/web && OUT_DIR=dist-test exec ./node_modules/.bin/astro preview --port ${SITE_PORT} --ignore-lock`,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 3000 },
      url: `http://127.0.0.1:${SITE_PORT}/`,
      reuseExistingServer: false,
    },
    {
      command: [
        `rm -rf ${ADMIN_DIR} && mkdir -p ${ADMIN_DIR}/data ${ADMIN_DIR}/media && cd apps/cms &&`,
        `ADMIN_URL=http://127.0.0.1:3100 DATABASE_URL=file:../../${ADMIN_DIR}/data/cms.db`,
        `DATA_DIR=../../${ADMIN_DIR}/data MEDIA_DIR=../../${ADMIN_DIR}/media CONTENT_OUT=../../${ADMIN_DIR}/content`,
        `SITE_OUT=../../${ADMIN_DIR}/site BACKUP_DIR=../../${ADMIN_DIR}/backups PAYLOAD_SECRET=test-only-secret`,
        'exec node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100',
      ].join(' '),
      gracefulShutdown: { signal: 'SIGTERM', timeout: 3000 },
      url: 'http://127.0.0.1:3100/admin/login',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    { name: 'chromium', testIgnore: SITE_ONLY, use: { browserName: 'chromium' } },
    { name: 'webkit', testIgnore: SITE_ONLY, use: { browserName: 'webkit' } },
    { name: 'firefox', testIgnore: SITE_ONLY, use: { browserName: 'firefox' } },
    { name: 'admin', testMatch: ADMIN, use: { browserName: 'chromium' } },
    // timing tests run alone, after the others, so nothing competes for the cpu
    {
      name: 'performance',
      testMatch: PERF,
      dependencies: process.env['CI'] ? [] : ['chromium', 'webkit', 'admin'],
      use: { browserName: 'chromium' },
      workers: 1,
    },
  ],
});
