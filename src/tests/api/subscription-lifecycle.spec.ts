import { expect, type TestArgs, test } from '../../fixtures';
import { Billing } from '../../test-data';

/**
 * State transitions of a subscription over time. Time moves with a per-organisation test clock
 * instead of real days, so these run in parallel and in milliseconds.
 *
 *   trialing ──▶ active ──▶ (renewal) active
 *      │           │  └──▶ past_due ──▶ suspended
 *      ▼           ▼            └──(payment fixed)──▶ active
 *   canceled ◀── cancel at period end
 */
test.describe('Subscription lifecycle', () => {
  test('TC-LIF-001: trial converts to a paid subscription when the trial ends @lifecycle @smoke', trialConvertsToPaid);

  test('TC-LIF-002: cancelling a trial revokes access immediately @lifecycle', async ({ api, org }) => {
    const sub = await api.subscribe(org.id, 'pro', { trial: true });

    const canceled = await api.cancel(sub.id);

    expect(canceled.status).toBe('canceled');
    expect((await api.license(org.id)).active).toBe(false);
  });

  test('TC-LIF-003: active subscription renews every billing period @lifecycle', async ({ api, org }) => {
    const sub = await api.subscribe(org.id, 'basic');

    await api.advanceClock(org.id, Billing.periodDays * 2);

    const invoices = await api.invoices(org.id);
    expect(invoices.map((i) => i.reason)).toEqual(['initial', 'renewal', 'renewal']);
    expect(invoices.map((i) => i.status)).toEqual(['paid', 'paid', 'paid']);
    expect((await api.subscription(sub.id)).status).toBe('active');
  });

  test('TC-LIF-004: cancel at period end keeps access until the paid period is over @lifecycle', cancelAtPeriodEnd);

  test('TC-LIF-005: reactivating before period end continues the subscription @lifecycle', async ({ api, org }) => {
    const sub = await api.subscribe(org.id, 'basic');
    await api.cancel(sub.id);

    await api.reactivate(sub.id);
    await api.advanceClock(org.id, Billing.periodDays);

    expect((await api.subscription(sub.id)).status).toBe('active');
    expect((await api.invoices(org.id)).at(-1)?.reason).toBe('renewal');
  });

  test.describe('dunning', () => {
    test(
      'TC-LIF-006: failed renewal goes past due and recovers after payment method update @lifecycle',
      dunningRecovers,
    );

    test('TC-LIF-007: unpaid subscription is suspended after the grace period @lifecycle', unpaidIsSuspended);
  });
});

async function trialConvertsToPaid({ api, org }: TestArgs) {
  const sub = await test.step('Given an organisation that started a 14-day Basic trial', () =>
    api.subscribe(org.id, 'basic', { trial: true }));

  await test.step('Then the subscription is trialing with an active license and no invoices', async () => {
    expect(sub.status).toBe('trialing');
    expect((await api.license(org.id)).active).toBe(true);
    expect(await api.invoices(org.id)).toHaveLength(0);
  });

  await test.step('When 13 days have passed', () => api.advanceClock(org.id, Billing.trialDays - 1));

  await test.step('Then the subscription is still trialing and nothing is billed', async () => {
    expect((await api.subscription(sub.id)).status).toBe('trialing');
    expect(await api.invoices(org.id)).toHaveLength(0);
  });

  await test.step('When the trial end is reached', () => api.advanceClock(org.id, 1));

  await test.step('Then the subscription is active and a paid trial conversion invoice exists', async () => {
    expect((await api.subscription(sub.id)).status).toBe('active');
    const invoices = await api.invoices(org.id);
    expect(invoices).toHaveLength(1);
    expect(invoices[0]).toMatchObject({ reason: 'trial_conversion', status: 'paid', net: Billing.price.basic });
  });
}

async function cancelAtPeriodEnd({ api, org }: TestArgs) {
  const daysIntoPeriod = 10;
  const sub =
    await test.step('Given an organisation with an active Basic subscription, 10 days into the period', async () => {
      const sub = await api.subscribe(org.id, 'basic');
      await api.advanceClock(org.id, daysIntoPeriod);
      return sub;
    });

  const afterCancel = await test.step('When it cancels the subscription', () => api.cancel(sub.id));

  await test.step('Then the subscription stays active and is marked to cancel at period end', () => {
    expect(afterCancel).toMatchObject({ status: 'active', cancelAtPeriodEnd: true });
  });

  await test.step('And the license stays active', async () => {
    expect((await api.license(org.id)).active).toBe(true);
  });

  await test.step('When the billing period ends', () => api.advanceClock(org.id, Billing.periodDays - daysIntoPeriod));

  await test.step('Then the subscription is canceled and the license is inactive', async () => {
    expect((await api.subscription(sub.id)).status).toBe('canceled');
    expect((await api.license(org.id)).active).toBe(false);
  });

  await test.step('And no renewal invoice is created', async () => {
    expect((await api.invoices(org.id)).map((i) => i.reason)).toEqual(['initial']);
  });
}

async function dunningRecovers({ api, org }: TestArgs) {
  const sub =
    await test.step('Given an organisation with an active Basic subscription and a payment method that declines', async () => {
      const sub = await api.subscribe(org.id, 'basic');
      await api.setPaymentOutcome(org.id, 'decline');
      return sub;
    });

  await test.step('When the renewal is due', () => api.advanceClock(org.id, Billing.periodDays));

  await test.step('Then the subscription is past due', async () => {
    expect((await api.subscription(sub.id)).status).toBe('past_due');
  });

  await test.step('And the license stays active during the grace period', async () => {
    expect((await api.license(org.id)).active).toBe(true);
  });

  await test.step('When the customer updates the payment method', () => api.updatePaymentMethod(org.id));

  await test.step('Then the subscription is active and the failed renewal is paid', async () => {
    expect((await api.subscription(sub.id)).status).toBe('active');
    expect((await api.invoices(org.id)).at(-1)).toMatchObject({ reason: 'renewal', status: 'paid' });
  });
}

async function unpaidIsSuspended({ api, org }: TestArgs) {
  const sub = await test.step('Given an organisation whose renewal payment failed', async () => {
    const sub = await api.subscribe(org.id, 'basic');
    await api.setPaymentOutcome(org.id, 'decline');
    await api.advanceClock(org.id, Billing.periodDays);
    return sub;
  });

  await test.step('When the 7-day grace period has almost passed', () =>
    api.advanceClock(org.id, Billing.graceDays - 1));

  await test.step('Then the subscription is still past due', async () => {
    expect((await api.subscription(sub.id)).status).toBe('past_due');
  });

  await test.step('When the grace period ends', () => api.advanceClock(org.id, 1));

  await test.step('Then the subscription is suspended and the license is inactive', async () => {
    expect((await api.subscription(sub.id)).status).toBe('suspended');
    expect((await api.license(org.id)).active).toBe(false);
  });
}
