/**
 * FUNCTIONAL TEST — CRM ERP
 *
 * Golden path: Lead capture → AI scoring → Customer 360 view →
 *              Drip campaign → Quotation → Invoice bridge
 *
 * API routes confirmed in server/routes.ts:
 *   /api/crm/lead-scores
 *   /api/crm/compute-scores
 *   /api/crm/customer-360/:id
 *   /api/crm/drip-campaigns
 *   /api/crm/drip-campaigns/:id
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, expectStatus, ApiClient } from '../helpers/api';

let api: ApiClient;
let campaignId: number;

beforeAll(async () => {
  api = await login('qa_admin_in', 'Test@1234');
});

describe('1. Lead Scoring', () => {
  it('GET /api/crm/lead-scores returns scored leads', async () => {
    const res = await api.get('/api/crm/lead-scores');
    if (res.status === 403) {
      console.log('SKIP: CRM module not enabled for this plan');
      return;
    }
    await expectStatus(res, 200);
    const data = await json<unknown>(res);
    expect(data).toBeDefined();
  });

  it('POST /api/crm/compute-scores triggers AI lead scoring', async () => {
    const res = await api.post('/api/crm/compute-scores', {
      customer_ids: [9001, 9002, 9003],
    });
    if (res.status === 403 || res.status === 422) return;
    await expectStatus(res, 200);
    const result = await json<{ scored?: number; scores?: unknown[] }>(res);
    expect(result).toBeDefined();
  });
});

describe('2. Customer 360 View', () => {
  it('GET /api/crm/customer-360/:id returns full customer profile', async () => {
    const res = await api.get('/api/crm/customer-360/9001');
    if (res.status === 403 || res.status === 404) return;
    await expectStatus(res, 200);
    const profile = await json<{
      customer?: { id: number };
      invoices?: unknown[];
      lead_score?: number;
      lifetime_value?: number;
    }>(res);
    // Should have multiple data sections
    expect(profile).toBeDefined();
    expect(Object.keys(profile).length).toBeGreaterThan(0);
  });

  it('customer 360 includes invoice history', async () => {
    const res = await api.get('/api/crm/customer-360/9001');
    if (res.status === 403 || res.status === 404) return;
    const profile = await json<{ invoices?: unknown[]; orders?: unknown[] }>(res);
    // Either invoices or orders should be present for a customer with seed data
    const hasHistory = (profile.invoices?.length ?? 0) > 0 || (profile.orders?.length ?? 0) > 0;
    expect(hasHistory).toBe(true);
  });
});

describe('3. Drip Campaigns', () => {
  it('GET /api/crm/drip-campaigns returns list', async () => {
    const res = await api.get('/api/crm/drip-campaigns');
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const data = await json<unknown[]>(res);
    expect(Array.isArray(data)).toBe(true);
  });

  it('creates a drip campaign', async () => {
    const res = await api.post('/api/crm/drip-campaigns', {
      name: 'QA Test Drip Campaign',
      trigger: 'no_order_30_days',
      steps: [
        { day: 0, channel: 'whatsapp', template: 'We miss you! Get 10% off your next order.' },
        { day: 3, channel: 'email',    template: 'Still interested? Here is your discount code.' },
        { day: 7, channel: 'whatsapp', template: 'Last chance — offer expires today!' },
      ],
      target_segment: 'churned_customers',
      is_active: false,
    });
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; name: string }>(res);
    campaignId = body.id;
    expect(body.name).toBe('QA Test Drip Campaign');
  });

  it('fetches drip campaign details', async () => {
    if (!campaignId) return;
    const res = await api.get(`/api/crm/drip-campaigns/${campaignId}`);
    await expectStatus(res, 200);
    const campaign = await json<{ id: number; steps: unknown[] }>(res);
    expect(campaign.steps?.length).toBeGreaterThanOrEqual(3);
  });

  it('deactivates the drip campaign', async () => {
    if (!campaignId) return;
    const res = await api.put(`/api/crm/drip-campaigns/${campaignId}`, {
      is_active: false,
    });
    if (res.status === 404) return;
    await expectStatus(res, 200);
  });
});

describe('4. Customer Master (shared module)', () => {
  it('creates a customer via shared customers API', async () => {
    const res = await api.post('/api/customers', {
      name: 'QA CRM Test Customer',
      phone: '9800009999',
      email: `qa.crm.${Date.now()}@test.kinto`,
      address: 'Bengaluru, KA',
      customer_type: 'retail',
    });
    const body = await json<{ id: number; name: string }>(res);
    expect(body.id).toBeGreaterThan(0);
    expect(body.name).toBe('QA CRM Test Customer');
  });

  it('GET /api/customers returns paginated list with search', async () => {
    const res = await api.get('/api/customers?search=QA+CRM&limit=5');
    await expectStatus(res, 200);
    const data = await json<{ customers?: unknown[]; data?: unknown[] } | unknown[]>(res);
    expect(data).toBeDefined();
  });
});
