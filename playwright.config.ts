import { defineConfig } from '@playwright/test';

const PERF = /performance\.spec\.ts/;

export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results/playwright',
  fullyParallel: true,
  reporter: [['list']],
  timeout: 180_000,
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
