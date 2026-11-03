import type { Page } from '@playwright/test';
import type { PlanId } from '../../api/types';
import { Hyperlink, Text } from '../../e2e-controls';
import { BasePageObject } from '../base-page-object';

/** Public plan catalogue (`/`). */
export class PlansPage extends BasePageObject {
  readonly heading = new Text(this.page, { parent: this }, this.page.getByRole('heading', { level: 1 }));

  constructor(page: Page) {
    super(page, null, 'plans-page');
  }

  async open(): Promise<void> {
    await this.page.goto('/');
    await this.waitForLoad();
  }

  selectPlanLink(planId: PlanId): Hyperlink {
    return new Hyperlink(this.page, { parent: this }, `plan-card-${planId}-select-link`);
  }

  async selectPlan(planId: PlanId): Promise<void> {
    await this.selectPlanLink(planId).click();
  }
}
