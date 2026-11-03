import { type APIRequestContext, type APIResponse, expect } from '@playwright/test';
import type { Invoice, License, NewOrganisation, Organisation, Plan, PlanId, Subscription } from './types';

/**
 * Typed client for the shop backend. Tests talk to the domain through this layer,
 * so an endpoint change is fixed in one place, not in every spec.
 */
export class ShopApi {
  constructor(private readonly request: APIRequestContext) {}

  private async json<T>(res: APIResponse, expectedStatus = 200): Promise<T> {
    expect(res.status(), `${res.url()} -> ${await res.text()}`).toBe(expectedStatus);
    return res.json() as Promise<T>;
  }

  // ---- raw calls (for negative tests that assert on status codes) ----
  createOrgRaw(data: object) {
    return this.request.post('/api/orgs', { data });
  }
  createSubscriptionRaw(data: object) {
    return this.request.post('/api/subscriptions', { data });
  }

  // ---- happy-path helpers ----
  async plans() {
    return this.json<Plan[]>(await this.request.get('/api/plans'));
  }
  async createOrg(data: NewOrganisation) {
    return this.json<Organisation>(await this.createOrgRaw(data), 201);
  }
  async subscribe(orgId: string, planId: PlanId, opts: { trial?: boolean } = {}) {
    return this.json<Subscription>(await this.createSubscriptionRaw({ orgId, planId, trial: !!opts.trial }), 201);
  }
  async subscription(id: string) {
    return this.json<Subscription>(await this.request.get(`/api/subscriptions/${id}`));
  }
  async changePlan(id: string, planId: PlanId) {
    return this.json<{ subscription: Subscription; invoice: Invoice | null }>(
      await this.request.post(`/api/subscriptions/${id}/change-plan`, { data: { planId } }),
    );
  }
  async cancel(id: string) {
    return this.json<Subscription>(await this.request.post(`/api/subscriptions/${id}/cancel`));
  }
  async reactivate(id: string) {
    return this.json<Subscription>(await this.request.post(`/api/subscriptions/${id}/reactivate`));
  }
  async updatePaymentMethod(orgId: string) {
    return this.json<Organisation>(await this.request.post(`/api/orgs/${orgId}/payment-method`));
  }
  async license(orgId: string) {
    return this.json<License>(await this.request.get(`/api/orgs/${orgId}/license`));
  }
  async invoices(orgId: string) {
    return this.json<Invoice[]>(await this.request.get(`/api/orgs/${orgId}/invoices`));
  }

  // ---- test hooks: only available on test environments ----
  async advanceClock(orgId: string, days: number) {
    return this.json<{ now: string }>(
      await this.request.post(`/api/test/orgs/${orgId}/clock/advance`, { data: { days } }),
    );
  }
  async setPaymentOutcome(orgId: string, outcome: 'approve' | 'decline') {
    return this.json<Organisation>(
      await this.request.post(`/api/test/orgs/${orgId}/payment-outcome`, { data: { outcome } }),
    );
  }
}
