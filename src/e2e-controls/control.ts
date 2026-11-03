import { expect, type Locator, type Page } from '@playwright/test';
import type { ControlOptions, ControlParent, ControlSelector } from '../test-base/control-options';

/** Base wrapper around a Playwright locator. Owns waiting and assertions so specs never touch locators. */
export class Control implements ControlParent {
  readonly control: Locator;

  constructor(
    protected readonly page: Page,
    options: ControlOptions | null,
    selector: ControlSelector,
  ) {
    const parent = options?.parent?.control;
    if (typeof selector === 'string') this.control = (parent ?? page).getByTestId(selector);
    else this.control = parent ? parent.locator(selector) : selector;
  }

  async click(): Promise<void> {
    await this.isAvailable();
    await this.isEnabled();
    await this.control.click();
  }

  async isAvailable(): Promise<void> {
    await expect(this.control).toBeVisible();
  }

  async isHidden(): Promise<void> {
    await expect(this.control).toBeHidden();
  }

  async isEnabled(): Promise<void> {
    await expect(this.control).toBeEnabled();
  }

  /** Full-text match; pass a RegExp for a partial or pattern match. */
  async hasText(expected: string | RegExp): Promise<void> {
    await expect(this.control).toHaveText(expected);
  }

  async containsText(expected: string | RegExp): Promise<void> {
    await expect(this.control).toContainText(expected);
  }

  async text(): Promise<string> {
    return ((await this.control.textContent()) ?? '').trim();
  }
}
