import { defineConfig } from '@playwright/test';

const baseURL = process.env.CIALPA_APP_URL || 'https://censoescuelaspy.github.io/CIALPAappencuesta/';

export default defineConfig({
  testDir: '.',
  outputDir: 'test-results',
  timeout: 90000,
  expect: { timeout: 15000 },
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { browserName: 'chromium', viewport: { width: 1366, height: 900 } },
    },
    {
      name: 'tablet-touch',
      use: {
        browserName: 'chromium',
        viewport: { width: 1024, height: 768 },
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
  ],
});
