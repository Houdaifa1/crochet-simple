import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests only; browser tests in tests/ run with Playwright.
    include: ['packages/*/test/**/*.test.ts', 'apps/*/test/**/*.test.ts'],
  },
});
