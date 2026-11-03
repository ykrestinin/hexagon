export type PlanId = 'basic' | 'pro';
export type Country = 'DE' | 'AT' | 'FR' | 'SE';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'canceled';

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  seats: number;
}

export interface NewOrganisation {
  name: string;
  country: Country;
  vatId?: string;
}

export interface Organisation {
  id: string;
  name: string;
  country: Country;
  vatId: string | null;
  paymentMethodValid: boolean;
}

export interface Subscription {
  id: string;
  orgId: string;
  planId: PlanId;
  plan: Plan;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  graceEnd: string | null;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  reason: 'initial' | 'trial_conversion' | 'renewal' | 'proration';
  net: number;
  vatRate: number;
  vat: number;
  total: number;
  reverseCharge: boolean;
  status: 'open' | 'paid' | 'failed';
}

export interface License {
  key: string;
  active: boolean;
  seats: number;
  planId: PlanId;
}
