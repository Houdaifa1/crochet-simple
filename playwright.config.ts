import { defineConfig } from '@playwright/test';

const PERF = /performance\.spec\.ts/;

export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results/playwright',
  fullyParallel: true,
  reporter: [['list']],
  timeout: 180_000,
  use: { baseURL: 'http://127.0.0.1:4321' },
  // the built site, so tests see exactly what ships
  webServer: {
    command: 'pnpm --filter @crochet-simple/web preview --port 4321 --ignore-lock',
    url: 'http://127.0.0.1:4321/',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium', testIgnore: PERF, use: { browserName: 'chromium' } },
    { name: 'webkit', testIgnore: PERF, use: { browserName: 'webkit' } },
    { name: 'firefox', testIgnore: PERF, use: { browserName: 'firefox' } },
    // timing tests run alone, after the others, so nothing competes for the cpu
    {
      name: 'performance',
      testMatch: PERF,
      dependencies: ['chromium', 'webkit'],
      use: { browserName: 'chromium' },
    },
  ],
});
