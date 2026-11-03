import { expect, type TestArgs, test } from '../../fixtures';
import { Billing } from '../../test-data';

test.describe('Plan changes and licensing', () => {
  test(
    'TC-PLN-001: mid-period upgrade charges the prorated difference and raises seats @plans @smoke',
    upgradeIsProrated,
  );

  test('TC-PLN-002: downgrade does not create a negative invoice @plans', async ({ api, org }) => {
    const sub = await api.subscribe(org.id, 'pro');

    const { invoice } = await api.changePlan(sub.id, 'basic');

    expect(invoice).toBeNull();
    expect((await api.license(org.id)).seats).toBe(Billing.seats.basic);
  });

  test('TC-PLN-003: license key stays the same across plan changes @plans', async ({ api, org }) => {
    const sub = await api.subscribe(org.id, 'basic');
    const { key } = await api.license(org.id);

    await api.changePlan(sub.id, 'pro');

    expect((await api.license(org.id)).key).toBe(key);
  });
});

async function upgradeIsProrated({ api, org }: TestArgs) {
  const elapsedDays = 15;
  const sub =
    await test.step('Given an organisation with an active Basic subscription and a 1-seat license', async () => {
      const sub = await api.subscribe(org.id, 'basic');
      expect((await api.license(org.id)).seats).toBe(Billing.seats.basic);
      return sub;
    });

  await test.step(`And ${elapsedDays} of ${Billing.periodDays} days of the billing period have passed`, () =>
    api.advanceClock(org.id, elapsedDays));

  const { subscription, invoice } = await test.step('When it upgrades to PRO', () => api.changePlan(sub.id, 'pro'));

  await test.step('Then a paid proration invoice of 50.00 net is created', () => {
    const net = Billing.proration('basic', 'pro', Billing.periodDays - elapsedDays);
    expect(net).toBe(50);
    expect(invoice).toMatchObject({
      reason: 'proration',
      net,
      total: Billing.gross(net, Billing.vat.DE),
      status: 'paid',
    });
    expect(subscription.planId).toBe('pro');
  });

  await test.step('And the license has 5 seats on the PRO plan', async () => {
    expect(await api.license(org.id)).toMatchObject({ seats: Billing.seats.pro, planId: 'pro', active: true });
  });
}
