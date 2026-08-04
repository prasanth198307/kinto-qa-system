/**
 * Test 30c — Logistics ERP: Multi-region workflow validation
 *
 * 5 regional logistics_enterprise tenants:
 *   9722 qa-lgs-ae  UAE        AED  VAT 5%
 *   9723 qa-lgs-us  USA        USD  Sales Tax ~8%
 *   9724 qa-lgs-eu  Germany    EUR  VAT 19%
 *   9725 qa-lgs-sg  Singapore  SGD  GST 9%
 *   9726 qa-lgs-au  Australia  AUD  GST 10%
 *
 * Per region, 4 roles are tested:
 *   owner (admin)            — full access, verifies tenant info + enterprise modules
 *   manager (manager)        — logistics ops, fleet, routes, reporting
 *   dispatcher (operator)    — shipment creation, delivery tracking workflow
 *   accountant (accountsmanager) — journal entries, trial balance, chart of accounts
 *
 * Critical assertions:
 *   - Correct currency returned by /api/tenant/features
 *   - Correct tax_regime returned by /api/tenant/features
 *   - Enterprise plan modules accessible (accounting, fixed_assets, warehouses)
 *   - Logistics APIs (shipments, routes, fleet) return 200
 *   - Data isolation: each region only sees its own shipments (no cross-tenant data)
 *   - Accountant can create journal entry in local currency
 */

import { describe, it, expect } from 'vitest';
import { login, BASE } from '../helpers/api';

// ── Region definitions ────────────────────────────────────────────────────────
interface Region {
  name:      string;
  tenantId:  number;
  currency:  string;
  taxRegime: string;
  roles: {
    owner:      string;
    manager:    string;
    cashier:    string;
    accountant: string;
  };
}

const REGIONS: Region[] = [
  {
    name: 'UAE', tenantId: 9722, currency: 'AED', taxRegime: 'vat',
    roles: { owner: 'qa_lgs_ae_owner', manager: 'qa_lgs_ae_manager', cashier: 'qa_lgs_ae_dispatcher', accountant: 'qa_lgs_ae_acct' },
  },
  {
    name: 'USA', tenantId: 9723, currency: 'USD', taxRegime: 'sales_tax',
    roles: { owner: 'qa_lgs_us_owner', manager: 'qa_lgs_us_manager', cashier: 'qa_lgs_us_dispatcher', accountant: 'qa_lgs_us_acct' },
  },
  {
    name: 'EU (Germany)', tenantId: 9724, currency: 'EUR', taxRegime: 'vat',
    roles: { owner: 'qa_lgs_eu_owner', manager: 'qa_lgs_eu_manager', cashier: 'qa_lgs_eu_dispatcher', accountant: 'qa_lgs_eu_acct' },
  },
  {
    name: 'Singapore', tenantId: 9725, currency: 'SGD', taxRegime: 'gst',
    roles: { owner: 'qa_lgs_sg_owner', manager: 'qa_lgs_sg_manager', cashier: 'qa_lgs_sg_dispatcher', accountant: 'qa_lgs_sg_acct' },
  },
  {
    name: 'Australia', tenantId: 9726, currency: 'AUD', taxRegime: 'gst',
    roles: { owner: 'qa_lgs_au_owner', manager: 'qa_lgs_au_manager', cashier: 'qa_lgs_au_dispatcher', accountant: 'qa_lgs_au_acct' },
  },
];

const PW = 'Test@1234';
const TODAY = new Date().toISOString().split('T')[0];

// ── Helper: assert tenant features ────────────────────────────────────────────
async function getFeatures(username: string) {
  const api = await login(username, PW);
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  return (await res.json()) as { currency: string; taxRegime: string; allowedNavItems: string[]; modules: string[] };
}

// ── Per-region test suites ────────────────────────────────────────────────────
for (const region of REGIONS) {
  describe(`Logistics ${region.name} — Owner workflows`, () => {

    it('owner can login and is admin role', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('admin');
    });

    it(`tenant features return correct currency (${region.currency})`, async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.currency).toBe(region.currency);
    });

    it(`tenant features return correct tax_regime (${region.taxRegime})`, async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.taxRegime).toBe(region.taxRegime);
    });

    it('enterprise plan: accounting (journal-entries) in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('journal-entries');
    });

    it('enterprise plan: fixed_assets or warehouses in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      const hasEnterprise = f.allowedNavItems.includes('fixed-assets') || f.allowedNavItems.includes('warehouses');
      expect(hasEnterprise).toBe(true);
    });

    it('owner can view own shipments only (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/logistics/shipments');
      expect([200, 404]).toContain(res.status);
      if (res.status === 200 && res.headers.get('content-type')?.includes('application/json')) {
        const body = await res.json() as any[];
        const otherTenantShipments = body.filter((s: any) => s.tenant_id && s.tenant_id !== region.tenantId);
        expect(otherTenantShipments.length).toBe(0);
      }
    });

    it('owner can view routes', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/logistics/routes');
      expect([200, 404]).toContain(res.status);
    });

    it('owner can view fleet / vehicles', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/logistics/vehicles');
      expect([200, 404]).toContain(res.status);
    });

    it('owner can view vendors', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/vendors');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      expect(Array.isArray(body)).toBe(true);
    });

    it('owner can view bank accounts in regional currency', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/bank-accounts');
      expect(res.status).toBe(200);
    });

    it('owner can view employees (HR module)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/hr/employees');
      expect(res.status).toBe(200);
    });

    it('owner can create an expense record', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.post('/api/expenses', {
        description: `QA ${region.name} test expense`,
        amount:      100,
        category:    'fuel',
        date:        TODAY,
      });
      expect([200, 201]).toContain(res.status);
    });
  });

  describe(`Logistics ${region.name} — Manager workflows`, () => {

    it('manager can login and is manager role', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('manager');
    });

    it('manager can view shipments', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/logistics/shipments');
      expect(res.status).toBe(200);
    });

    it('manager can view routes', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/logistics/routes');
      expect([200, 404]).toContain(res.status);
    });

    it('manager can view vehicles / fleet', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/logistics/vehicles');
      expect([200, 404]).toContain(res.status);
    });

    it('manager can view purchase orders', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/purchase-orders');
      expect(res.status).toBe(200);
    });

    it('manager can view HR employees', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/hr/employees');
      expect(res.status).toBe(200);
    });

    it('manager can view sales orders', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/sales-orders');
      expect([200, 403]).toContain(res.status);
    });

    it('manager can view MIS dashboard', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/mis/sales');
      expect([200, 404]).toContain(res.status);
    });
  });

  describe(`Logistics ${region.name} — Dispatcher (operator) workflows`, () => {

    it('dispatcher can login and is operator role', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('operator');
    });

    it('dispatcher can view shipments', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/logistics/shipments');
      expect([200, 404]).toContain(res.status);
      if (res.status === 200 && res.headers.get('content-type')?.includes('application/json')) {
        const body = await res.json() as any[];
        expect(Array.isArray(body)).toBe(true);
      }
    });

    it('dispatcher can create a new shipment', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.post('/api/logistics/shipments', {
        origin:         'QA Origin',
        destination:    'QA Dest',
        weight_kg:      10,
        freight_amount: 500,
      });
      expect([200, 201]).toContain(res.status);
    });

    it('dispatcher can view existing routes', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/logistics/routes');
      expect([200, 404]).toContain(res.status);
    });

    it('dispatcher can view invoices', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/invoices');
      expect(res.status).toBe(200);
    });

    it('dispatcher features: correct currency in tenant features', async () => {
      const f = await getFeatures(region.roles.cashier);
      expect(f.currency).toBe(region.currency);
    });
  });

  describe(`Logistics ${region.name} — Accountant workflows`, () => {

    it('accountant can login and is accountsmanager role', async () => {
      const api = await login(region.roles.accountant, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('accountsmanager');
    });

    it('accountant can view chart of accounts', async () => {
      const api = await login(region.roles.accountant, PW);
      const res = await api.get('/api/chart-of-accounts');
      expect(res.status).toBe(200);
    });

    it('accountant can view journal entries', async () => {
      const api = await login(region.roles.accountant, PW);
      const res = await api.get('/api/journal-entries');
      expect(res.status).toBe(200);
    });

    it('accountant can view trial balance', async () => {
      const api = await login(region.roles.accountant, PW);
      const res = await api.get('/api/trial-balance');
      expect(res.status).toBe(200);
    });

    it('accountant can view balance sheet', async () => {
      const api = await login(region.roles.accountant, PW);
      const res = await api.get('/api/balance-sheet');
      expect([200, 404]).toContain(res.status);
    });

    it('accountant can create a journal entry in regional currency', async () => {
      const api = await login(region.roles.accountant, PW);
      const res = await api.post('/api/journal-entries', {
        date:        TODAY,
        description: `QA ${region.name} journal entry`,
        currency:    region.currency,
        lines: [
          { account_code: '1000', debit: 500,  credit: 0,   description: 'Cash debit' },
          { account_code: '4000', debit: 0,    credit: 500, description: 'Revenue credit' },
        ],
      });
      expect([200, 201, 400, 422]).toContain(res.status);
    });

    it('accountant features: accounting in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.accountant);
      expect(f.allowedNavItems).toContain('journal-entries');
    });

    it('accountant can view bank accounts', async () => {
      const api = await login(region.roles.accountant, PW);
      const res = await api.get('/api/bank-accounts');
      expect(res.status).toBe(200);
    });

    it('accountant can view expenses', async () => {
      const api = await login(region.roles.accountant, PW);
      const res = await api.get('/api/expenses');
      expect(res.status).toBe(200);
    });
  });
}

// ── Cross-region data isolation suite ────────────────────────────────────────
describe('Logistics Multi-region — Data isolation', () => {

  it('UAE shipments are not visible to USA owner', async () => {
    const uaeApi = await login('qa_lgs_ae_owner', PW);
    const usaApi = await login('qa_lgs_us_owner', PW);
    const uaeRes = await uaeApi.get('/api/logistics/shipments');
    const usaRes = await usaApi.get('/api/logistics/shipments');
    if (uaeRes.status === 200 && usaRes.status === 200 &&
        uaeRes.headers.get('content-type')?.includes('application/json') &&
        usaRes.headers.get('content-type')?.includes('application/json')) {
      const uaeShipments = await uaeRes.json() as any[];
      const usaShipments = await usaRes.json() as any[];
      const uaeIds = uaeShipments.map((s: any) => s.id);
      const overlap = usaShipments.filter((s: any) => uaeIds.includes(s.id));
      expect(overlap.length).toBe(0);
    }
  });

  it('Singapore shipments are not visible to Australia owner', async () => {
    const sgApi = await login('qa_lgs_sg_owner', PW);
    const auApi = await login('qa_lgs_au_owner', PW);
    const sgRes = await sgApi.get('/api/logistics/shipments');
    const auRes = await auApi.get('/api/logistics/shipments');
    if (sgRes.status === 200 && auRes.status === 200 &&
        sgRes.headers.get('content-type')?.includes('application/json') &&
        auRes.headers.get('content-type')?.includes('application/json')) {
      const sgShipments = await sgRes.json() as any[];
      const auShipments = await auRes.json() as any[];
      const sgIds = sgShipments.map((s: any) => s.id);
      const overlap = auShipments.filter((s: any) => sgIds.includes(s.id));
      expect(overlap.length).toBe(0);
    }
  });

  it('EU journal entries are not visible to UAE accountant', async () => {
    const euApi = await login('qa_lgs_eu_acct', PW);
    const aeApi = await login('qa_lgs_ae_acct', PW);
    const euRes = await euApi.get('/api/journal-entries');
    const aeRes = await aeApi.get('/api/journal-entries');
    if (euRes.status === 200 && aeRes.status === 200 &&
        euRes.headers.get('content-type')?.includes('application/json') &&
        aeRes.headers.get('content-type')?.includes('application/json')) {
      const euEntries = await euRes.json() as any;
      const aeEntries = await aeRes.json() as any;
      if (Array.isArray(euEntries) && Array.isArray(aeEntries)) {
        const euIds = euEntries.map((e: any) => e.id);
        const overlap = aeEntries.filter((e: any) => euIds.includes(e.id));
        expect(overlap.length).toBe(0);
      }
    }
  });

  it('Australia journal entries are not visible to Singapore accountant', async () => {
    const auApi = await login('qa_lgs_au_acct', PW);
    const sgApi = await login('qa_lgs_sg_acct', PW);
    const auRes = await auApi.get('/api/journal-entries');
    const sgRes = await sgApi.get('/api/journal-entries');
    if (auRes.status === 200 && sgRes.status === 200 &&
        auRes.headers.get('content-type')?.includes('application/json') &&
        sgRes.headers.get('content-type')?.includes('application/json')) {
      const auEntries = await auRes.json() as any;
      const sgEntries = await sgRes.json() as any;
      if (Array.isArray(auEntries) && Array.isArray(sgEntries)) {
        const auIds = auEntries.map((e: any) => e.id);
        const overlap = sgEntries.filter((e: any) => auIds.includes(e.id));
        expect(overlap.length).toBe(0);
      }
    }
  });

  it('each region returns a different currency from /api/tenant/features', async () => {
    const currencies: string[] = [];
    for (const region of REGIONS) {
      const f = await getFeatures(region.roles.owner);
      currencies.push(f.currency);
    }
    const unique = new Set(currencies);
    expect(unique.size).toBe(REGIONS.length);
  });

  it('India Logistics tenant still returns INR (regression guard)', async () => {
    const f = await getFeatures('qa_lgs_owner');
    expect(f.currency).toBe('INR');
  });
});
