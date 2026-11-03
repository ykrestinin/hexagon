import type { Country, PlanId } from '../api/types';

/**
 * Prices and billing rules mirrored from the product spec. This is the test oracle:
 * expected amounts are computed from here, never copied from the application's output.
 */
export const Billing = {
  trialDays: 14,
  periodDays: 30,
  graceDays: 7,
  price: { basic: 49, pro: 149 } satisfies Record<PlanId, number>,
  seats: { basic: 1, pro: 5 } satisfies Record<PlanId, number>,
  vat: { DE: 0.19, AT: 0.2, FR: 0.2, SE: 0.25 } satisfies Record<Country, number>,

  gross: (net: number, rate: number) => round2(net * (1 + rate)),

  /** Upgrade charge for the rest of the current period. */
  proration: (from: PlanId, to: PlanId, remainingDays: number) =>
    round2((Billing.price[to] - Billing.price[from]) * (remainingDays / Billing.periodDays)),

  /** Amounts as the UI renders them. */
  money: (amount: number) => amount.toFixed(2),
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
