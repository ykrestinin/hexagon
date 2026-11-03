import { expect } from '@playwright/test';
import { Control } from './control';

export class Input extends Control {
  async fill(value: string): Promise<void> {
    await this.isEnabled();
    await this.control.fill(value);
  }

  async hasValue(expected: string | RegExp): Promise<void> {
    await expect(this.control).toHaveValue(expected);
  }
}
