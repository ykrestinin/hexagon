import { test as base, expect, type PlaywrightTestArgs } from '@playwright/test';
import { ShopApi } from '../api/shop-api';
import type { Organisation } from '../api/types';
import { buildOrg } from '../test-data';

type Fixtures = {
  api: ShopApi;
  /** A fresh organisation per test, created via API (fast, no UI dependency). */
  org: Organisation;
};

export const test = base.extend<Fixtures>({
  api: async ({ request }, use) => {
    await use(new ShopApi(request));
  },
  org: async ({ api }, use) => {
    await use(await api.createOrg(buildOrg()));
  },
});

/** Arguments of a test body; lets named scenario functions be typed outside `test()`. */
export type TestArgs = Fixtures & PlaywrightTestArgs;

export { E2E_CONFIG } from './e2e-config';
export { expect };
