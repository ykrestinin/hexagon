import { expect } from '@playwright/test';
import { Control } from './control';

export class Checkbox extends Control {
  async setChecked(checked: boolean): Promise<void> {
    await this.isEnabled();
    await this.control.setChecked(checked);
  }

  async isChecked(): Promise<void> {
    await expect(this.control).toBeChecked();
  }
}
