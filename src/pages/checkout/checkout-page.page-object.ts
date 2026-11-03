import type { Page } from '@playwright/test';
import type { Country } from '../../api/types';
import { Button, Checkbox, Input, Select, Text } from '../../e2e-controls';
import { BasePageObject } from '../base-page-object';

export interface CheckoutOrder {
  name: string;
  country?: Country;
  vatId?: string;
  trial?: boolean;
}

/** Order form for the selected plan (`/checkout?plan=<id>`). */
export class CheckoutPage extends BasePageObject {
  readonly heading = new Text(this.page, { parent: this }, this.page.getByRole('heading', { level: 1 }));
  readonly companyNameInput = new Input(this.page, { parent: this }, 'checkout-company-name-input');
  readonly countrySelect = new Select(this.page, { parent: this }, 'checkout-country-select');
  readonly vatIdInput = new Input(this.page, { parent: this }, 'checkout-vat-id-input');
  readonly trialCheckbox = new Checkbox(this.page, { parent: this }, 'checkout-trial-checkbox');
  readonly submitButton = new Button(this.page, { parent: this }, 'checkout-submit-button');
  readonly errorMessage = new Text(this.page, { parent: this }, this.page.getByRole('alert'));

  constructor(page: Page) {
    super(page, null, 'checkout-page');
  }

  async placeOrder(order: CheckoutOrder): Promise<void> {
    await this.waitForLoad();
    await this.companyNameInput.fill(order.name);
    if (order.country) await this.countrySelect.select(order.country);
    if (order.vatId) await this.vatIdInput.fill(order.vatId);
    if (order.trial) await this.trialCheckbox.setChecked(true);
    await this.submitButton.click();
  }
}
