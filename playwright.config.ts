import { defineConfig, devices } from '@playwright/test';
import { E2E_CONFIG } from './src/fixtures/e2e-config';

export default defineConfig({
  testDir: './src/tests',
  fullyParallel: true,
  forbidOnly: E2E_CONFIG.isCI,
  retries: E2E_CONFIG.isCI ? 1 : 0,
  workers: E2E_CONFIG.isCI ? 4 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: E2E_CONFIG.baseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    testIdAttribute: 'test-id',
  },
  // The folder under src/tests selects the project.
  projects: [
    // Fast, browser-less layer: billing, licensing and lifecycle rules
    { name: 'api', testDir: './src/tests/api' },
    // Thin UI layer: critical customer journeys only
    {
      name: 'e2e',
      testDir: './src/tests/e2e',
      use: { ...devices['Desktop Chrome'] },
    },
    // Cross-browser check of the cheapest, most important journeys
    {
      name: 'e2e-webkit',
      testDir: './src/tests/e2e',
      grep: /@smoke/,
      use: { ...devices['Desktop Safari'] },
    },
    // Demo: the same journey with raw locators vs page objects (npm run example:locators)
    { name: 'examples', testDir: './examples', use: { ...devices['Desktop Chrome'] } },
  ],
  // Starts the mock shop locally; with BASE_URL set the suite runs against that environment instead.
  webServer: E2E_CONFIG.externalBaseUrl
    ? undefined
    : {
        command: 'node mock-app/server.mjs',
        url: `${E2E_CONFIG.baseUrl}/health`,
        reuseExistingServer: !E2E_CONFIG.isCI,
        env: { PORT: String(E2E_CONFIG.port) },
      },
});
