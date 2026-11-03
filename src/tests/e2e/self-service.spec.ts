import { type TestArgs, test } from '../../fixtures';
import { AccountPage } from '../../pages';
import { Billing } from '../../test-data';

/**
 * Hybrid tests: state is arranged via API (fast, stable), only the customer-facing
 * self-service behaviour under test goes through the browser.
 */
test.describe('Self-service portal', () => {
  test('TC-SSP-001: customer upgrades from Basic to PRO @self-service @smoke', customerUpgradesToPro);

  test('TC-SSP-002: customer cancels and then keeps the subscription @self-service', customerCancelsAndKeeps);

  test('TC-SSP-003: suspended account is shown as suspended @self-service', suspendedAccountIsShown);
});

async function customerUpgradesToPro({ page, api, org }: TestArgs) {
  const accountPage = new AccountPage(page);

  await test.step('Given a customer with an active Basic subscription is in the portal', async () => {
    await api.subscribe(org.id, 'basic');
    await accountPage.open(org.id);
  });

  await test.step('When they upgrade to PRO', () => accountPage.upgradeToPro());

  await test.step('Then the portal shows the PRO plan with 5 seats', async () => {
    await accountPage.planName.hasText(/PRO$/);
    await accountPage.licenseSeats.hasText(String(Billing.seats.pro));
  });

  await test.step('And a proration invoice is added', async () => {
    await accountPage.invoices.hasCount(2);
    await accountPage.invoiceFor('proration').status.hasText('paid');
  });
}

async function customerCancelsAndKeeps({ page, api, org }: TestArgs) {
  const accountPage = new AccountPage(page);

  const sub = await test.step('Given a customer with an active Basic subscription is in the portal', async () => {
    const sub = await api.subscribe(org.id, 'basic');
    await accountPage.open(org.id);
    return sub;
  });

  await test.step('When they cancel the subscription', () => accountPage.cancelSubscription());

  await test.step('Then the portal shows the end date of the period', () =>
    accountPage.cancelNotice.hasText(`Ends on ${sub.periodEnd?.slice(0, 10)}`));

  await test.step('And the subscription stays active until then', () =>
    accountPage.subscriptionStatus.hasText('active'));

  await test.step('When they choose to keep the subscription', () => accountPage.keepSubscription());

  await test.step('Then the end date is no longer shown', () => accountPage.cancelNotice.isHidden());
}

async function suspendedAccountIsShown({ page, api, org }: TestArgs) {
  const accountPage = new AccountPage(page);

  await test.step('Given a customer whose subscription was suspended for non-payment', async () => {
    await api.subscribe(org.id, 'basic');
    await api.setPaymentOutcome(org.id, 'decline');
    await api.advanceClock(org.id, Billing.periodDays + Billing.graceDays);
  });

  await test.step('When they open the portal', () => accountPage.open(org.id));

  await test.step('Then the subscription is shown as suspended', () =>
    accountPage.subscriptionStatus.hasText('suspended'));

  await test.step('And the license is shown as inactive', () => accountPage.licenseActive.hasText('false'));

  await test.step('And the failed renewal invoice is shown', () =>
    accountPage.invoiceFor('renewal').status.hasText('failed'));
}
