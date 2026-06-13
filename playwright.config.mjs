// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:   './tests/e2e',
  testMatch: '**/*.spec.{js,mjs}',
  timeout:   120_000,   // per-test timeout (AI responses can take ~30s)
  retries:   1,         // one retry on flaky network
  reporter:  [['list'], ['json', { outputFile: 'docs/STRESS-TEST-ARCH-E2E-RESULTS.json' }]],
  use: {
    baseURL:        'https://visioncoreai.pages.dev',
    headless:       true,
    ignoreHTTPSErrors: true,
    viewport:       { width: 1280, height: 900 },
    actionTimeout:  15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name:  'chromium',
      use:   { ...devices['Desktop Chrome'] },
    },
  ],
});
