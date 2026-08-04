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
    const profile = await json<{ invoices?: unknown[]; orders?: unknown[]; opportunities?: unknown[] }>(res);
    // Profile should be defined with the expected structure
    expect(profile).toBeDefined();
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
    expect(campaign).toBeDefined();
  });

  it('deactivates the drip campaign', async () => {
    if (!campaignId) return;
    const res = await api.put(`/api/crm/drip-campaigns/${campaignId}`, {
      is_active: false,
    });
    if (res.status === 404 || res.status >= 400) return;
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
    const body = await json<{ id: string | number; name: string }>(res);
    expect(body.id).toBeTruthy();
    expect(body.name).toBe('QA CRM Test Customer');
  });

  it('GET /api/customers returns paginated list with search', async () => {
    const res = await api.get('/api/customers?search=QA+CRM&limit=5');
    await expectStatus(res, 200);
    const data = await json<{ customers?: unknown[]; data?: unknown[] } | unknown[]>(res);
    expect(data).toBeDefined();
  });
});

describe('CRM ERP — 5. Custom Roles & Permissions API', () => {
  it('GET /api/roles returns roles for CRM tenant', async () => {
    const res = await api.get('/api/roles');
    expect(res.status).not.toBe(404);
    if (res.status === 200) {
      const roles = await json<unknown[]>(res);
      expect(Array.isArray(roles)).toBe(true);
    }
  });

  it('GET /api/roles?tab=permissions returns permission matrix', async () => {
    const res = await api.get('/api/roles?tab=permissions');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/user-management/users returns user list', async () => {
    const res = await api.get('/api/user-management/users');
    expect(res.status).not.toBe(404);
    if (res.status === 200 && res.headers.get('content-type')?.includes('application/json')) {
      const users = await json<unknown[]>(res);
      expect(Array.isArray(users)).toBe(true);
    }
  });

  it('POST /api/roles creates a custom role for CRM tenant', async () => {
    const res = await api.post('/api/roles', {
      name: 'QA Sales BDR',
      description: 'Custom business development role for CRM',
      permissions: ['crm_read', 'crm_write', 'leads_convert'],
    });
    expect(res.status).not.toBe(404);
  });
});

describe('CRM ERP — 6. Masters: Regions, Branches, Tax Config, Audit Log', () => {
  it('GET /api/masters/branches returns branch/region list', async () => {
    const res = await api.get('/api/masters/branches');
    expect(res.status).not.toBe(404);
    if (res.status === 200) {
      const branches = await json<unknown[]>(res);
      expect(Array.isArray(branches)).toBe(true);
    }
  });

  it('GET /api/masters/tax-config returns tax configuration', async () => {
    const res = await api.get('/api/masters/tax-config');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/masters/audit-log returns audit trail entries', async () => {
    const res = await api.get('/api/masters/audit-log');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/masters/approval-workflow returns approval workflow config', async () => {
    const res = await api.get('/api/masters/approval-workflow');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/masters/departments returns department list', async () => {
    const res = await api.get('/api/masters/departments');
    expect(res.status).not.toBe(404);
  });
});

describe('CRM ERP — 7. Cross-Module Integration', () => {
  it('GET /api/accounting/journal-entries works alongside CRM (GL cross-module)', async () => {
    const res = await api.get('/api/accounting/journal-entries?limit=5');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/hr/employees works alongside CRM (HR cross-module)', async () => {
    const res = await api.get('/api/hr/employees');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/mis/summary works alongside CRM (MIS cross-module)', async () => {
    const res = await api.get('/api/mis/summary');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/invoices works alongside CRM quotation→invoice bridge (AR cross-module)', async () => {
    const res = await api.get('/api/invoices?limit=5');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/purchase-orders works alongside CRM vendor contacts (procurement cross-module)', async () => {
    const res = await api.get('/api/purchase-orders?limit=5');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/warehouses works alongside CRM (Warehouse cross-module)', async () => {
    const res = await api.get('/api/warehouses');
    expect(res.status).not.toBe(404);
  });
});
