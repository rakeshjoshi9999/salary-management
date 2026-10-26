import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end happy paths (task 7.7, ADR-051): the real frontend against a real backend and Postgres
 * seeded with the `seed` profile. Each path runs at desktop width and again at phone width, where the
 * Catalog shows cards and the drawer is full screen.
 *
 * The backend must already be running on :8081 (CI starts it; locally see the CLAUDE.md commands table). The
 * frontend is built and served here with the `e2e` configuration: production build options, but
 * environment.ts, which points at localhost:8081.
 */
export default defineConfig({
  testDir: './e2e',
  // *.e2e.ts, so the unit-test runner (which picks up *.spec.ts) never sees these.
  testMatch: '**/*.e2e.ts',
  // One database, and the paths change it: run them one after another.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'phone',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    // The e2e configuration is an optimised production build, without the production
    // environment file, so it talks to the local API.
    command: 'npx ng serve --configuration e2e --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
