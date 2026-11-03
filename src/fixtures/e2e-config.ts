/** Single source of environment settings. Specs and page objects never hardcode hosts or ports. */
const port = Number(process.env.PORT ?? 3100);

export const E2E_CONFIG = {
  /** When unset, Playwright starts the local mock shop on `port`. */
  externalBaseUrl: process.env.BASE_URL,
  port,
  baseUrl: process.env.BASE_URL ?? `http://localhost:${port}`,
  isCI: !!process.env.CI,
} as const;
