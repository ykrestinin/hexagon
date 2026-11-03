import type { Page } from '@playwright/test';
import type { Invoice } from '../../api/types';
import { Button, Control, ControlCollection, Text } from '../../e2e-controls';
import { BasePageObject } from '../base-page-object';
import { InvoiceRow } from './invoice-row';

/** Customer self-service portal (`/account?org=<id>`). */
export class AccountPage extends BasePageObject {
  readonly heading = new Text(this.page, { parent: this }, this.page.getByRole('heading', { level: 1 }));

  readonly subscriptionStatus = new Text(this.page, { parent: this }, 'subscription-status');
  readonly planName = new Text(this.page, { parent: this }, 'subscription-plan-name');
  readonly cancelNotice = new Text(this.page, { parent: this }, 'subscription-cancel-notice');
  readonly upgradeButton = new Button(this.page, { parent: this }, 'account-upgrade-button');
  readonly cancelButton = new Button(this.page, { parent: this }, 'account-cancel-button');
  readonly reactivateButton = new Button(this.page, { parent: this }, 'account-reactivate-button');

  readonly licenseKey = new Text(this.page, { parent: this }, 'license-key');
  readonly licenseSeats = new Text(this.page, { parent: this }, 'license-seats');
  readonly licenseActive = new Text(this.page, { parent: this }, 'license-active');

  private readonly invoicesTable = new Control(this.page, { parent: this }, 'invoices-table');
  /** Data rows only: the header row has column headers, not cells. */
  readonly invoices = new ControlCollection(
    this.page,
    { parent: this.invoicesTable },
    this.page.getByRole('row').filter({ has: this.page.getByRole('cell') }),
    (page, row) => new InvoiceRow(page, row),
  );

  constructor(page: Page) {
    super(page, null, 'account-page');
  }

  async open(orgId: string): Promise<void> {
    await this.page.goto(`/account?org=${encodeURIComponent(orgId)}`);
    await this.waitForLoad();
  }

  /** The organisation the portal is showing, e.g. after a UI checkout created it. */
  async orgId(): Promise<string> {
    await this.waitForLoad();
    const orgId = new URL(this.page.url()).searchParams.get('org');
    if (!orgId) throw new Error(`No org in account page URL: ${this.page.url()}`);
    return orgId;
  }

  invoiceFor(reason: Invoice['reason']): InvoiceRow {
    return this.invoices.itemWithText(reason);
  }

  async upgradeToPro(): Promise<void> {
    await this.upgradeButton.click();
  }

  /** Cancels via the button and accepts the browser confirmation dialog. */
  async cancelSubscription(): Promise<void> {
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.cancelButton.click();
  }

  async keepSubscription(): Promise<void> {
    await this.reactivateButton.click();
  }
}
