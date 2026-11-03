import { expect, test } from '../src/fixtures';
import { AccountPage, CheckoutPage, PlansPage } from '../src/pages';
import { buildOrg } from '../src/test-data';
import {
  AccountPageWithoutControls,
  CheckoutPageWithoutControls,
  PlansPageWithoutControls,
} from './pages-without-controls';

/**
 * The same journey written three ways. All pass today; the comments say what goes wrong in the other two.
 * This file breaks the repository rules on purpose, so it lives outside src/tests.
 */
test.describe('Page objects with controls vs without vs raw locators', () => {
  test('page objects', async ({ page }) => {
    const plansPage = new PlansPage(page);
    const accountPage = new AccountPage(page);

    await plansPage.open();
    await plansPage.selectPlan('basic');
    await new CheckoutPage(page).placeOrder(buildOrg({ country: 'DE' }));

    await accountPage.subscriptionStatus.hasText('active');
    await accountPage.licenseSeats.hasText('1');
    await accountPage.invoiceFor('initial').total.hasText('58.31');
  });

  test('page objects without controls', async ({ page }) => {
    const plansPage = new PlansPageWithoutControls(page);
    const checkoutPage = new CheckoutPageWithoutControls(page);
    const accountPage = new AccountPageWithoutControls(page);

    await plansPage.open();
    await plansPage.selectPlanLink('basic').click();

    // The spec drives Playwright directly: one spec waits, another forgets to, a third uses force: true
    await checkoutPage.companyNameInput.fill(buildOrg().name);
    await checkoutPage.countrySelect.selectOption('DE');
    await checkoutPage.submitButton.click();

    // Assertions are written against bare locators in every spec, instead of once in a control
    await expect(accountPage.subscriptionStatus).toHaveText('active');
    await expect(accountPage.licenseSeats).toHaveText('1');
    // Picking the row and the cell is repeated in every spec; the page object knows nothing about invoices
    const initialInvoice = accountPage.invoiceRows.filter({ hasText: 'initial' });
    await expect(initialInvoice.getByTestId('invoice-total')).toHaveText('58.31');
  });

  test('raw locators', async ({ page }) => {
    await page.goto('/');
    // XPath on position and button text: breaks when cards are reordered or the label changes
    await page.locator("xpath=//main/article[1]/a[text()='Select basic']").click();

    // CSS on an implementation id: breaks when the form id is renamed
    await page.locator('#f input[name="name"]').fill(buildOrg().name);
    // CSS on structure: breaks when the field order changes
    await page.locator('form > label:nth-child(2) select').selectOption('DE');
    // Visible text: breaks on any copy change or translation
    await page.getByText('Place order').click();

    // Index: breaks when another <strong> is added above; then it silently reads the wrong value
    await expect(page.locator('strong').nth(1)).toHaveText('active');
    // Absolute XPath: breaks when any wrapper is added
    await expect(page.locator('xpath=/html/body/main/div[2]/p[2]/span')).toHaveText('1');
    // Column number: breaks when columns are reordered, may then read the VAT instead of the total
    await expect(page.locator('xpath=//table/tbody/tr[1]/td[4]')).toHaveText('58.31');
  });
});
