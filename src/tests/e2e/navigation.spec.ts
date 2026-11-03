import { expect, type TestArgs, test } from '../../fixtures';
import { AccountPage, PlansPage } from '../../pages';

test.describe('Navigation', () => {
  test('TC-NAV-001: customer moves between the portal and the plan catalogue @navigation', customerNavigatesBack);

  test('TC-NAV-002: new visitor is not offered an account link @navigation', async ({ page }) => {
    const plansPage = new PlansPage(page);
    await plansPage.open();

    await plansPage.header.plansLink.isAvailable();
    await plansPage.header.accountLink.isHidden();
  });
});

async function customerNavigatesBack({ page, api, org }: TestArgs) {
  const accountPage = new AccountPage(page);
  const plansPage = new PlansPage(page);

  await test.step('Given a customer with an active subscription is in the portal', async () => {
    await api.subscribe(org.id, 'basic');
    await accountPage.open(org.id);
  });

  await test.step('When they open the plans from the navigation', () => accountPage.header.goToPlans());

  await test.step('Then the plan catalogue is shown', () => plansPage.waitForLoad());

  await test.step('When they go to their account from the navigation', () => plansPage.header.goToAccount());

  await test.step('Then the portal shows their own active subscription', async () => {
    expect(await accountPage.orgId()).toBe(org.id);
    await accountPage.subscriptionStatus.hasText('active');
  });
}
