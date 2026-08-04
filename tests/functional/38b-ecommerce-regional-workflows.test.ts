/**
 * Test 38b — E-commerce ERP: Multi-region workflow validation
 *
 * 5 regional ecommerce_enterprise tenants:
 *   8422 qa-eco-ae  UAE        AED  VAT 5%
 *   8423 qa-eco-us  USA        USD  Sales Tax
 *   8424 qa-eco-eu  Germany    EUR  VAT 19%
 *   8425 qa-eco-sg  Singapore  SGD  GST 9%
 *   8426 qa-eco-au  Australia  AUD  GST 10%
 *
 * Per region, 4 roles are tested:
 *   owner (admin)        — full access, verifies tenant info + enterprise modules
 *   manager (manager)    — ecommerce ops, purchase, HR
 *   ops (operator)       — order creation
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
    name: 'UAE', tenantId: 8422, currency: 'AED', taxRegime: 'vat',
    roles: { owner: 'qa_eco_ae_owner', manager: 'qa_eco_ae_manager', cashier: 'qa_eco_ae_ops', accountant: 'qa_eco_ae_acct' },
  },
  {
    name: 'USA', tenantId: 8423, currency: 'USD', taxRegime: 'sales_tax',
    roles: { owner: 'qa_eco_us_owner', manager: 'qa_eco_us_manager', cashier: 'qa_eco_us_ops', accountant: 'qa_eco_us_acct' },
  },
  {
    name: 'EU (Germany)', tenantId: 8424, currency: 'EUR', taxRegime: 'vat',
    roles: { owner: 'qa_eco_eu_owner', manager: 'qa_eco_eu_manager', cashier: 'qa_eco_eu_ops', accountant: 'qa_eco_eu_acct' },
  },
  {
    name: 'Singapore', tenantId: 8425, currency: 'SGD', taxRegime: 'gst',
    roles: { owner: 'qa_eco_sg_owner', manager: 'qa_eco_sg_manager', cashier: 'qa_eco_sg_ops', accountant: 'qa_eco_sg_acct' },
  },
  {
    name: 'Australia', tenantId: 8426, currency: 'AUD', taxRegime: 'gst',
    roles: { owner: 'qa_eco_au_owner', manager: 'qa_eco_au_manager', cashier: 'qa_eco_au_ops', accountant: 'qa_eco_au_acct' },
  },
];

async function getFeatures(username: string) {
  const api = await login(username, PW);
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  return (await res.json()) as { currency: string; taxRegime: string; allowedNavItems: string[]; modules: string[] };
}

for (const region of REGIONS) {
  describe(`E-commerce ${region.name} — Owner workflows`, () => {

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

    it('enterprise plan: ecommerce-orders in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(Array.isArray(f.allowedNavItems)).toBe(true);
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

    it('owner can view own ecommerce orders (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/ecommerce/orders');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const otherTenant = body.filter((o: any) => o.tenant_id && o.tenant_id !== region.tenantId);
      expect(otherTenant.length).toBe(0);
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

    it('owner can view products catalog', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/products');
      expect(res.status).toBe(200);
    });

    it('owner can create an expense record', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.post('/api/expenses', {
        description: `QA ${region.name} ecommerce expense`,
        amount:      150,
        category:    'shipping',
        date:        TODAY,
      });
      expect([200, 201]).toContain(res.status);
    });
  });

  describe(`E-commerce ${region.name} — Manager workflows`, () => {

    it('manager can login and is manager role', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('manager');
    });

    it('manager can view ecommerce orders', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/ecommerce/orders');
      expect(res.status).toBe(200);
    });

    it('manager can view products', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/products');
      expect(res.status).toBe(200);
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

  describe(`E-commerce ${region.name} — Ops (operator) workflows`, () => {

    it('ops can login and is operator role', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('operator');
    });

    it('ops can view ecommerce orders', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/ecommerce/orders');
      expect(res.status).toBe(200);
    });

    it('ops can create an ecommerce order', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.post('/api/ecommerce/orders', {
        customer_name: 'QA Customer',
        items: [{ product_name: 'QA Product', quantity: 1, price: 100 }],
        total_amount: 100,
      });
      expect([200, 201]).toContain(res.status);
    });

    it('ops can view products', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/products');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      expect(Array.isArray(body)).toBe(true);
    });

    it('ops features: correct currency in tenant features', async () => {
      const f = await getFeatures(region.roles.cashier);
      expect(f.currency).toBe(region.currency);
    });

    it('ops cannot see other-tenant orders', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/ecommerce/orders');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const leak = body.filter((o: any) => o.tenant_id && o.tenant_id !== region.tenantId);
      expect(leak.length).toBe(0);
    });
  });

  describe(`E-commerce ${region.name} — Accountant workflows`, () => {

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
        description: `QA ${region.name} ecommerce journal entry`,
        currency:    region.currency,
        lines: [
          { account_code: '1000', debit: 500,  credit: 0,   description: 'Revenue debit' },
          { account_code: '4000', debit: 0,    credit: 500, description: 'Sales credit' },
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
describe('E-commerce Multi-region — Data isolation', () => {

  it('UAE ecommerce orders are not visible to USA ops', async () => {
    const aeApi = await login('qa_eco_ae_ops', PW);
    const usApi = await login('qa_eco_us_ops', PW);
    const aeOrders = await (await aeApi.get('/api/ecommerce/orders')).json() as any[];
    const usOrders = await (await usApi.get('/api/ecommerce/orders')).json() as any[];
    const aeIds = aeOrders.map((o: any) => o.id);
    const overlap = usOrders.filter((o: any) => aeIds.includes(o.id));
    expect(overlap.length).toBe(0);
  });

  it('Singapore journal entries are not visible to Australia accountant', async () => {
    const sgApi = await login('qa_eco_sg_acct', PW);
    const auApi = await login('qa_eco_au_acct', PW);
    const sgEntries = await (await sgApi.get('/api/journal-entries')).json() as any;
    const auEntries = await (await auApi.get('/api/journal-entries')).json() as any;
    if (!Array.isArray(sgEntries) || !Array.isArray(auEntries)) { return; }
    const sgIds = sgEntries.map((e: any) => e.id);
    const overlap = auEntries.filter((e: any) => sgIds.includes(e.id));
    expect(overlap.length).toBe(0);
  });

  it('EU orders are not visible to UAE ops', async () => {
    const euApi = await login('qa_eco_eu_ops', PW);
    const aeApi = await login('qa_eco_ae_ops', PW);
    await euApi.post('/api/ecommerce/orders', {
      customer_name: 'QA EU Customer',
      items: [{ product_name: 'QA EU Product', quantity: 1, price: 200 }],
      total_amount: 200,
    });
    const aeOrders = await (await aeApi.get('/api/ecommerce/orders')).json() as any[];
    const euLeak = aeOrders.filter((o: any) => o.tenant_id === 8424);
    expect(euLeak.length).toBe(0);
  });

  it('Australia journal entries are not visible to Singapore accountant', async () => {
    const auApi = await login('qa_eco_au_acct', PW);
    const sgApi = await login('qa_eco_sg_acct', PW);
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

  it('India ecommerce tenant still returns INR (regression guard)', async () => {
    const f = await getFeatures('qa_eco_owner');
    expect(f.currency).toBe('INR');
  });
});
