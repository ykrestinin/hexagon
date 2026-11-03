import type { Page } from '@playwright/test';
import type { PlanId } from '../api/types';
import { type CheckoutOrder, CheckoutPage, PlansPage } from '../pages';

export const checkoutSteps = {
  /** From the plan catalogue: picks a plan and submits the checkout form. Does not wait for the outcome. */
  async orderPlan(page: Page, planId: PlanId, order: CheckoutOrder): Promise<void> {
    await new PlansPage(page).selectPlan(planId);
    await new CheckoutPage(page).placeOrder(order);
  },
};
