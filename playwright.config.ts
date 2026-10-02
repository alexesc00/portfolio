import { defineConfig, devices } from '@playwright/test';

const port = 4399;

/*
 * Browser tests run against the built site, not the dev server: the build
 * minifies CSS (durations become seconds, for one), and motion has broken
 * on the live site while working in development.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  // Two browsers at a time: more starve the machine, and timing checks
  // get flaky when frames are late.
  workers: 2,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    // A fresh profile per run, and no macOS keychain prompt.
    launchOptions: { args: ['--use-mock-keychain'] },
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    {
      name: 'desktop-firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'desktop-safari',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 },
      },
    },
    { name: 'phone-safari', use: { ...devices['iPhone 15'] } },
  ],
  // --ignore-lock keeps the preview server in the foreground, where
  // Playwright can see it; Astro otherwise moves it to the background
  // when it detects a coding agent running it.
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --ignore-lock`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
