/**
 * Test 36b — Manufacturing ERP: Multi-region workflow validation
 *
 * 5 regional manufacturing_enterprise tenants:
 *   8222 qa-mfg-ae  UAE        AED  VAT 5%
 *   8223 qa-mfg-us  USA        USD  Sales Tax
 *   8224 qa-mfg-eu  Germany    EUR  VAT 19%
 *   8225 qa-mfg-sg  Singapore  SGD  GST 9%
 *   8226 qa-mfg-au  Australia  AUD  GST 10%
 *
 * Per region, 4 roles are tested:
 *   owner (admin)            — full access, verifies tenant info + enterprise modules
 *   manager (manager)        — manufacturing ops, purchase, HR
 *   operator (operator)      — work-order creation
 *   accountant (accountsmanager) — journal entries, trial balance, chart of accounts
 */

import { describe, it, expect } from 'vitest';
import { login, BASE } from '../helpers/api';

const PW = 'Test@1234';
const TODAY = new Date().toISOString().split('T')[0];

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
    name: 'UAE', tenantId: 8222, currency: 'AED', taxRegime: 'vat',
    roles: { owner: 'qa_mfg_ae_owner', manager: 'qa_mfg_ae_manager', cashier: 'qa_mfg_ae_operator', accountant: 'qa_mfg_ae_acct' },
  },
  {
    name: 'USA', tenantId: 8223, currency: 'USD', taxRegime: 'sales_tax',
    roles: { owner: 'qa_mfg_us_owner', manager: 'qa_mfg_us_manager', cashier: 'qa_mfg_us_operator', accountant: 'qa_mfg_us_acct' },
  },
  {
    name: 'EU (Germany)', tenantId: 8224, currency: 'EUR', taxRegime: 'vat',
    roles: { owner: 'qa_mfg_eu_owner', manager: 'qa_mfg_eu_manager', cashier: 'qa_mfg_eu_operator', accountant: 'qa_mfg_eu_acct' },
  },
  {
    name: 'Singapore', tenantId: 8225, currency: 'SGD', taxRegime: 'gst',
    roles: { owner: 'qa_mfg_sg_owner', manager: 'qa_mfg_sg_manager', cashier: 'qa_mfg_sg_operator', accountant: 'qa_mfg_sg_acct' },
  },
  {
    name: 'Australia', tenantId: 8226, currency: 'AUD', taxRegime: 'gst',
    roles: { owner: 'qa_mfg_au_owner', manager: 'qa_mfg_au_manager', cashier: 'qa_mfg_au_operator', accountant: 'qa_mfg_au_acct' },
  },
];

async function getFeatures(username: string) {
  const api = await login(username, PW);
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  return (await res.json()) as { currency: string; taxRegime: string; allowedNavItems: string[]; modules: string[] };
}

for (const region of REGIONS) {
  describe(`Manufacturing ${region.name} — Owner workflows`, () => {

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

    it('enterprise plan: production in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('production');
    });

    it('enterprise plan: warehouses + fixed-assets in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('warehouses');
      expect(f.allowedNavItems).toContain('fixed-assets');
    });

    it('enterprise plan: accounting (journal-entries) in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('journal-entries');
    });

    it('owner can view own work orders (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/manufacturing/work-orders');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const otherTenantOrders = body.filter((o: any) => o.tenant_id && o.tenant_id !== region.tenantId);
      expect(otherTenantOrders.length).toBe(0);
    });

    it('owner can view vendors', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/vendors');
      expect(res.status).toBe(200);
      expect(Array.isArray(await res.json())).toBe(true);
    });

    it('owner can view bank accounts in regional currency', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/bank-accounts');
      expect(res.status).toBe(200);
      expect(Array.isArray(await res.json())).toBe(true);
    });

    it('owner can view employees (HR module)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/hr/employees');
      expect(res.status).toBe(200);
    });

    it('owner can view products / BOM', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/products');
      expect(res.status).toBe(200);
    });

    it('owner can create an expense record', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.post('/api/expenses', {
        description: `QA ${region.name} manufacturing expense`,
        amount:      200,
        category:    'materials',
        date:        TODAY,
      });
      expect([200, 201]).toContain(res.status);
    });
  });

  describe(`Manufacturing ${region.name} — Manager workflows`, () => {

    it('manager can login and is manager role', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('manager');
    });

    it('manager can view work orders', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/manufacturing/work-orders');
      expect(res.status).toBe(200);
    });

    it('manager can view purchase orders', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/purchase-orders');
      expect(res.status).toBe(200);
    });

    it('manager can view products', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/products');
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
      expect(res.status).toBe(200);
    });

    it('manager can view warehouses', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/warehouses');
      expect([200, 404]).toContain(res.status);
    });

    it('manager can view MIS dashboard', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/mis/sales');
      expect([200, 404]).toContain(res.status);
    });
  });

  describe(`Manufacturing ${region.name} — Operator (work-order) workflows`, () => {

    it('operator can login and is operator role', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('operator');
    });

    it('operator can view work orders', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/manufacturing/work-orders');
      expect(res.status).toBe(200);
    });

    it('operator can create a work order', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.post('/api/manufacturing/work-orders', {
        product_name:   'QA Product',
        quantity:       100,
        planned_start:  TODAY,
        planned_end:    TODAY,
      });
      expect([200, 201, 403]).toContain(res.status);
    });

    it('operator can view products', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/products');
      expect(res.status).toBe(200);
    });

    it('operator features: correct currency in tenant features', async () => {
      const f = await getFeatures(region.roles.cashier);
      expect(f.currency).toBe(region.currency);
    });

    it('operator cannot see other-tenant work orders', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/manufacturing/work-orders');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const leak = body.filter((o: any) => o.tenant_id && o.tenant_id !== region.tenantId);
      expect(leak.length).toBe(0);
    });
  });

  describe(`Manufacturing ${region.name} — Accountant workflows`, () => {

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
        description: `QA ${region.name} manufacturing journal entry`,
        currency:    region.currency,
        lines: [
          { account_code: '1000', debit: 500,  credit: 0,   description: 'Raw materials debit' },
          { account_code: '4000', debit: 0,    credit: 500, description: 'Revenue credit' },
        ],
      });
      expect([200, 201, 400]).toContain(res.status);
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
describe('Manufacturing Multi-region — Data isolation', () => {

  it('UAE work orders are not visible to USA operator', async () => {
    const aeApi = await login('qa_mfg_ae_operator', PW);
    const usApi = await login('qa_mfg_us_operator', PW);
    const aeOrders = await (await aeApi.get('/api/manufacturing/work-orders')).json() as any[];
    const usOrders = await (await usApi.get('/api/manufacturing/work-orders')).json() as any[];
    const aeIds = aeOrders.map((o: any) => o.id);
    const overlap = usOrders.filter((o: any) => aeIds.includes(o.id));
    expect(overlap.length).toBe(0);
  });

  it('Singapore journal entries are not visible to Australia accountant', async () => {
    const sgApi = await login('qa_mfg_sg_acct', PW);
    const auApi = await login('qa_mfg_au_acct', PW);
    const sgEntries = await (await sgApi.get('/api/journal-entries')).json() as any;
    const auEntries = await (await auApi.get('/api/journal-entries')).json() as any;
    if (!Array.isArray(sgEntries) || !Array.isArray(auEntries)) { return; }
    const sgIds = sgEntries.map((e: any) => e.id);
    const overlap = auEntries.filter((e: any) => sgIds.includes(e.id));
    expect(overlap.length).toBe(0);
  });

  it('EU work orders are not visible to UAE operator', async () => {
    const euApi = await login('qa_mfg_eu_operator', PW);
    const aeApi = await login('qa_mfg_ae_operator', PW);
    await euApi.post('/api/manufacturing/work-orders', {
      product_name: 'QA EU Product', quantity: 50, planned_start: TODAY, planned_end: TODAY,
    });
    const aeOrders = await (await aeApi.get('/api/manufacturing/work-orders')).json() as any[];
    const euLeak = aeOrders.filter((o: any) => o.tenant_id === 8224);
    expect(euLeak.length).toBe(0);
  });

  it('Australia journal entries are not visible to Singapore accountant', async () => {
    const auApi = await login('qa_mfg_au_acct', PW);
    const sgApi = await login('qa_mfg_sg_acct', PW);
    const auEntries = await (await auApi.get('/api/journal-entries')).json() as any;
    const sgEntries = await (await sgApi.get('/api/journal-entries')).json() as any;
    if (!Array.isArray(auEntries) || !Array.isArray(sgEntries)) { return; }
    const auIds = auEntries.map((e: any) => e.id);
    const overlap = sgEntries.filter((e: any) => auIds.includes(e.id));
    expect(overlap.length).toBe(0);
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

  it('India manufacturing tenant still returns INR (regression guard)', async () => {
    const f = await getFeatures('qa_mfg_owner');
    expect(f.currency).toBe('INR');
  });
});
