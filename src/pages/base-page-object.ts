import type { Page } from '@playwright/test';
import { Control } from '../e2e-controls';
import type { ControlOptions } from '../test-base/control-options';
import { AppHeader } from './layout/app-header';

/**
 * Root of every page object: the page's root `test-id` is the boundary all child controls are scoped to.
 * Declare child controls as readonly fields with `{ parent: this }`.
 */
export abstract class BasePageObject extends Control {
  /** Shared navigation; it renders outside the page root, so it is not scoped to it. */
  readonly header = new AppHeader(this.page);

  constructor(page: Page, options: ControlOptions | null, rootTestId: string) {
    super(page, options, rootTestId);
  }

  /** Waits until the page root has rendered, i.e. the app actually navigated here. */
  async waitForLoad(): Promise<void> {
    await this.isAvailable();
  }
}
