import type { Country } from '../../api/types';
import { expect, test } from '../../fixtures';
import { Billing, buildOrg, VatIds } from '../../test-data';

test.describe('Billing and EU VAT', () => {
  for (const [country, rate] of Object.entries(Billing.vat) as [Country, number][]) {
    test(`TC-BIL-001: customer without VAT ID in ${country} is charged ${rate * 100}% VAT @billing`, async ({
      api,
    }) => {
      const org = await api.createOrg(buildOrg({ country }));
      await api.subscribe(org.id, 'basic');

      const [invoice] = await api.invoices(org.id);
      expect(invoice).toMatchObject({
        net: Billing.price.basic,
        vatRate: rate,
        total: Billing.gross(Billing.price.basic, rate),
        reverseCharge: false,
      });
    });
  }

  test('TC-BIL-002: EU business customer outside Germany gets reverse charge @billing', async ({ api }) => {
    const org = await api.createOrg(buildOrg({ country: 'AT', vatId: VatIds.AT }));
    await api.subscribe(org.id, 'pro');

    const [invoice] = await api.invoices(org.id);
    expect(invoice).toMatchObject({ reverseCharge: true, vat: 0, total: Billing.price.pro });
  });

  test('TC-BIL-003: domestic business customer still pays German VAT @billing', async ({ api }) => {
    const org = await api.createOrg(buildOrg({ country: 'DE', vatId: VatIds.DE }));
    await api.subscribe(org.id, 'basic');

    const [invoice] = await api.invoices(org.id);
    expect(invoice).toMatchObject({ vatRate: Billing.vat.DE, reverseCharge: false });
  });
});
