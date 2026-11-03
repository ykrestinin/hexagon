import type { Locator, Page } from '@playwright/test';

/**
 * Page objects without controls: good locators, but exposed as bare Locators.
 * Every spec then decides itself how to wait, assert and pick a row, and the locators are
 * searched on the whole page instead of inside the page root.
 */
export class PlansPageWithoutControls {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/');
  }

  selectPlanLink(planId: string): Locator {
    return this.page.getByTestId(`plan-card-${planId}-select-link`);
  }
}

export class CheckoutPageWithoutControls {
  readonly companyNameInput: Locator;
  readonly countrySelect: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.companyNameInput = page.getByTestId('checkout-company-name-input');
    this.countrySelect = page.getByTestId('checkout-country-select');
    this.submitButton = page.getByTestId('checkout-submit-button');
  }
}

export class AccountPageWithoutControls {
  readonly subscriptionStatus: Locator;
  readonly licenseSeats: Locator;
  readonly invoiceRows: Locator;

  constructor(page: Page) {
    this.subscriptionStatus = page.getByTestId('subscription-status');
    this.licenseSeats = page.getByTestId('license-seats');
    this.invoiceRows = page.getByRole('row');
  }
}
