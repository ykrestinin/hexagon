import { expect } from '@playwright/test';
import { Control } from './control';

/** Native `<select>`. */
export class Select extends Control {
  async select(value: string): Promise<void> {
    await this.isEnabled();
    await this.control.selectOption(value);
  }

  async hasValue(expected: string | RegExp): Promise<void> {
    await expect(this.control).toHaveValue(expected);
  }
}
