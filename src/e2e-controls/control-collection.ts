import { expect, type Locator, type Page } from '@playwright/test';
import type { ControlOptions, ControlSelector } from '../test-base/control-options';
import { Control } from './control';

type ItemFactory<T extends Control> = (page: Page, item: Locator) => T;

/**
 * A list of repeated items (table rows, cards). Items are picked by content, not by index,
 * so a test keeps working when ordering or unrelated items change.
 */
export class ControlCollection<T extends Control> extends Control {
  constructor(
    page: Page,
    options: ControlOptions | null,
    selector: ControlSelector,
    private readonly createItem: ItemFactory<T>,
  ) {
    super(page, options, selector);
  }

  async hasCount(expected: number): Promise<void> {
    await expect(this.control).toHaveCount(expected);
  }

  /** The single item containing `text`; fails on assertion if none or several match. */
  itemWithText(text: string | RegExp): T {
    return this.createItem(this.page, this.control.filter({ hasText: text }));
  }
}
