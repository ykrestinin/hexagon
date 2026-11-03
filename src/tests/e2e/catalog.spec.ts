import { test } from '../../fixtures';
import { PlansPage } from '../../pages';

test.describe('Plan catalogue', () => {
  test('TC-CAT-001: catalogue shows every plan the shop sells @catalog', async ({ page, api }) => {
    const plansPage = new PlansPage(page);
    const plans = await api.plans();

    await plansPage.open();

    await plansPage.planNames.hasText(plans.map((plan) => plan.name));
  });
});
