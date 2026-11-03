import { randomUUID } from 'node:crypto';
import type { NewOrganisation } from '../api/types';

/** Valid VAT IDs per country, for business-customer scenarios. */
export const VatIds = {
  DE: 'DE123456789',
  AT: 'ATU12345678',
} as const;

/** Unique, readable organisation data: every test owns its organisation, no shared state between tests. */
export function buildOrg(overrides: Partial<NewOrganisation> = {}): NewOrganisation {
  return {
    name: `QA Metrology GmbH ${randomUUID().slice(0, 8)}`,
    country: 'DE',
    ...overrides,
  };
}
