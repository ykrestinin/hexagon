import { expect, test } from '../../fixtures';
import { Billing, buildOrg } from '../../test-data';

test.describe('Shop API contract and validation', () => {
  test('TC-API-001: plans endpoint returns the sellable catalogue @contract', async ({ api }) => {
    expect(await api.plans()).toEqual([
      expect.objectContaining({ id: 'basic', price: Billing.price.basic, seats: Billing.seats.basic }),
      expect.objectContaining({ id: 'pro', price: Billing.price.pro, seats: Billing.seats.pro }),
    ]);
  });

  const invalidOrgs = [
    { problem: 'missing company name', data: { country: 'DE' }, status: 400 },
    { problem: 'missing country', data: { name: 'ACME' }, status: 400 },
    { problem: 'malformed VAT ID', data: { ...buildOrg(), vatId: '123' }, status: 422 },
  ];
  for (const { problem, data, status } of invalidOrgs) {
    test(`TC-API-002: organisation with ${problem} is rejected @contract`, async ({ api }) => {
      const res = await api.createOrgRaw(data);

      expect(res.status()).toBe(status);
      expect(await res.json()).toHaveProperty('error');
    });
  }

  test('TC-API-003: unknown plan is rejected @contract', async ({ api, org }) => {
    const res = await api.createSubscriptionRaw({ orgId: org.id, planId: 'enterprise' });

    expect(res.status()).toBe(400);
  });

  test('TC-API-004: second active subscription for the same organisation is rejected @contract', async ({
    api,
    org,
  }) => {
    await api.subscribe(org.id, 'basic');

    const res = await api.createSubscriptionRaw({ orgId: org.id, planId: 'pro' });

    expect(res.status()).toBe(409);
  });

  test('TC-API-005: organisation can subscribe again after cancelling @contract', async ({ api, org }) => {
    const trial = await api.subscribe(org.id, 'basic', { trial: true });
    await api.cancel(trial.id);

    const second = await api.subscribe(org.id, 'pro');

    expect(second.status).toBe('active');
  });
});
