import { expect, type TestArgs, test } from '../../fixtures';
import { AccountPage, CheckoutPage, PlansPage } from '../../pages';
import { checkoutSteps } from '../../steps/checkout-steps';
import { Billing, buildOrg, VatIds } from '../../test-data';

test.describe('Checkout', () => {
  test('TC-CHK-001: customer buys the Basic plan and gets an active license @checkout @smoke', basicPurchaseIsActive);

  test('TC-CHK-002: customer starts a free trial without being invoiced @checkout', trialPurchaseIsNotInvoiced);

  test('TC-CHK-003: Austrian business customer sees reverse charge on the invoice @checkout', reverseChargeIsShown);

  test('TC-CHK-004: invalid VAT ID is reported and no order is placed @checkout', invalidVatIdIsRejected);
});

async function basicPurchaseIsActive({ page, api }: TestArgs) {
  const accountPage = new AccountPage(page);
  const expectedTotal = Billing.gross(Billing.price.basic, Billing.vat.DE);

  await test.step('Given the customer is on the plan catalogue', () => new PlansPage(page).open());

  await test.step('When they order the Basic plan as a German company', () =>
    checkoutSteps.orderPlan(page, 'basic', buildOrg({ country: 'DE' })));

  await test.step('Then the portal shows an active Basic subscription', async () => {
    await accountPage.subscriptionStatus.hasText('active');
    await accountPage.planName.hasText(/Basic$/);
  });

  await test.step('And the license has 1 seat and a license key', async () => {
    await accountPage.licenseSeats.hasText(String(Billing.seats.basic));
    await accountPage.licenseKey.hasText(/^LIC_\d+$/);
  });

  await test.step('And one invoice of 58.31 including 19% VAT is shown', async () => {
    await accountPage.invoices.hasCount(1);
    await accountPage.invoiceFor('initial').total.hasText(Billing.money(expectedTotal));
  });

  await test.step('And the shown invoice matches what was billed', async () => {
    const [invoice] = await api.invoices(await accountPage.orgId());
    expect(invoice.total).toBe(expectedTotal);
  });
}

async function trialPurchaseIsNotInvoiced({ page }: TestArgs) {
  const accountPage = new AccountPage(page);

  await test.step('Given the customer is on the plan catalogue', () => new PlansPage(page).open());

  await test.step('When they order the PRO plan with a free trial', () =>
    checkoutSteps.orderPlan(page, 'pro', { ...buildOrg(), trial: true }));

  await test.step('Then the portal shows a trialing subscription with 5 seats', async () => {
    await accountPage.subscriptionStatus.hasText('trialing');
    await accountPage.licenseSeats.hasText(String(Billing.seats.pro));
  });

  await test.step('And no invoice is shown', () => accountPage.invoices.hasCount(0));
}

async function reverseChargeIsShown({ page }: TestArgs) {
  const accountPage = new AccountPage(page);

  await test.step('Given the customer is on the plan catalogue', () => new PlansPage(page).open());

  await test.step('When they order the PRO plan as an Austrian company with a VAT ID', () =>
    checkoutSteps.orderPlan(page, 'pro', buildOrg({ country: 'AT', vatId: VatIds.AT })));

  const invoice = accountPage.invoiceFor('initial');
  await test.step('Then the invoice shows reverse charge instead of a VAT amount', () =>
    invoice.vat.hasText('reverse charge'));

  await test.step('And the invoice total is 149.00', () => invoice.total.hasText(Billing.money(Billing.price.pro)));
}

async function invalidVatIdIsRejected({ page }: TestArgs) {
  const checkoutPage = new CheckoutPage(page);

  await test.step('Given the customer is on the plan catalogue', () => new PlansPage(page).open());

  await test.step('When they order the Basic plan with a malformed VAT ID', () =>
    checkoutSteps.orderPlan(page, 'basic', { ...buildOrg(), vatId: 'not-a-vat-id' }));

  await test.step('Then the checkout shows "invalid VAT ID"', () =>
    checkoutPage.errorMessage.hasText('invalid VAT ID'));

  await test.step('And the customer stays on the checkout', async () => {
    await checkoutPage.isAvailable();
    await expect(page).toHaveURL(/\/checkout/);
  });
}
