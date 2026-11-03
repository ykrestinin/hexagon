import type { Page } from '@playwright/test';
import { Control, Hyperlink } from '../../e2e-controls';

/** Main navigation shown above every page of the shop. */
export class AppHeader extends Control {
  readonly plansLink = new Hyperlink(this.page, { parent: this }, 'header-plans-link');
  /** Visible only once the browser knows the customer's organisation. */
  readonly accountLink = new Hyperlink(this.page, { parent: this }, 'header-account-link');

  constructor(page: Page) {
    super(page, null, 'app-header');
  }

  async goToPlans(): Promise<void> {
    await this.plansLink.click();
  }

  async goToAccount(): Promise<void> {
    await this.accountLink.click();
  }
}
