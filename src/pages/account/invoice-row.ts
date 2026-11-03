import type { Locator, Page } from '@playwright/test';
import { Control, Text } from '../../e2e-controls';

/** One row of the invoices table on the account page. */
export class InvoiceRow extends Control {
  readonly reason = new Text(this.page, { parent: this }, 'invoice-reason');
  readonly net = new Text(this.page, { parent: this }, 'invoice-net');
  /** Amount, or "reverse charge" when no VAT is charged. */
  readonly vat = new Text(this.page, { parent: this }, 'invoice-vat');
  readonly total = new Text(this.page, { parent: this }, 'invoice-total');
  readonly status = new Text(this.page, { parent: this }, 'invoice-status');

  constructor(page: Page, row: Locator) {
    super(page, null, row);
  }
}
