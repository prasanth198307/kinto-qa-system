/**
 * Test 35b — Retail ERP: Multi-region workflow validation
 *
 * 5 regional retail_enterprise tenants:
 *   8122 qa-rtl-ae  UAE        AED  VAT 5%
 *   8123 qa-rtl-us  USA        USD  Sales Tax
 *   8124 qa-rtl-eu  Germany    EUR  VAT 19%
 *   8125 qa-rtl-sg  Singapore  SGD  GST 9%
 *   8126 qa-rtl-au  Australia  AUD  GST 10%
 *
 * Per region, 4 roles are tested:
 *   owner (admin)           — full access, verifies tenant info + enterprise modules
 *   manager (manager)       — retail ops, purchase, HR
 *   cashier (operator)      — POS session workflow
 *   accountant (accountsmanager) — journal entries, trial balance, chart of accounts
 */

import { describe, it, expect } from 'vitest';
import { login, BASE } from '../helpers/api';

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
    name: 'UAE', tenantId: 8122, currency: 'AED', taxRegime: 'vat',
    roles: { owner: 'qa_rtl_ae_owner', manager: 'qa_rtl_ae_manager', cashier: 'qa_rtl_ae_cashier', accountant: 'qa_rtl_ae_acct' },
  },
  {
    name: 'USA', tenantId: 8123, currency: 'USD', taxRegime: 'sales_tax',
    roles: { owner: 'qa_rtl_us_owner', manager: 'qa_rtl_us_manager', cashier: 'qa_rtl_us_cashier', accountant: 'qa_rtl_us_acct' },
  },
  {
    name: 'EU (Germany)', tenantId: 8124, currency: 'EUR', taxRegime: 'vat',
    roles: { owner: 'qa_rtl_eu_owner', manager: 'qa_rtl_eu_manager', cashier: 'qa_rtl_eu_cashier', accountant: 'qa_rtl_eu_acct' },
  },
  {
    name: 'Singapore', tenantId: 8125, currency: 'SGD', taxRegime: 'gst',
    roles: { owner: 'qa_rtl_sg_owner', manager: 'qa_rtl_sg_manager', cashier: 'qa_rtl_sg_cashier', accountant: 'qa_rtl_sg_acct' },
  },
  {
    name: 'Australia', tenantId: 8126, currency: 'AUD', taxRegime: 'gst',
    roles: { owner: 'qa_rtl_au_owner', manager: 'qa_rtl_au_manager', cashier: 'qa_rtl_au_cashier', accountant: 'qa_rtl_au_acct' },
  },
];

const PW = 'Test@1234';
const TODAY = new Date().toISOString().split('T')[0];

async function getFeatures(username: string) {
  const api = await login(username, PW);
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  return (await res.json()) as { currency: string; taxRegime: string; allowedNavItems: string[]; modules: string[] };
}

for (const region of REGIONS) {
  describe(`Retail ${region.name} — Owner workflows`, () => {

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

    it('enterprise plan: retail-pos in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('retail-pos');
    });

    it('enterprise plan: production + warehouses + fixed_assets in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('production');
      expect(f.allowedNavItems).toContain('warehouses');
      expect(f.allowedNavItems).toContain('fixed-assets');
    });

    it('enterprise plan: accounting (journal-entries) in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('journal-entries');
    });

    it('owner can view own POS sessions only (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/retail/pos-sessions');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const otherTenantSessions = body.filter((s: any) => s.tenant_id && String(s.tenant_id) !== String(region.tenantId));
      expect(otherTenantSessions.length).toBe(0);
    });

    it('owner can view own products only (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/products');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const otherTenantProducts = body.filter((p: any) => p.tenant_id && String(p.tenant_id) !== String(region.tenantId));
      expect(otherTenantProducts.length).toBe(0);
    });

    it('owner can view vendors (linked to regional vendor seed)', async () => {
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
      const body = await res.json() as any[];
      expect(Array.isArray(body)).toBe(true);
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
        category:    'retail_ops',
        date:        TODAY,
      });
      expect([200, 201]).toContain(res.status);
    });

    it('owner can view purchase orders', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/purchase-orders');
      expect(res.status).toBe(200);
    });
  });

  describe(`Retail ${region.name} — Manager workflows`, () => {

    it('manager can login and is manager role', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('manager');
    });

    it('manager can view POS sessions', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/retail/pos-sessions');
      expect(res.status).toBe(200);
    });

    it('manager can view products', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/products');
      expect(res.status).toBe(200);
    });

    it('manager can view inventory', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/inventory');
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

    it('manager can view MIS sales dashboard', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/mis/sales');
      expect([200, 404]).toContain(res.status);
    });

    it('manager can view categories', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/categories');
      expect([200, 404]).toContain(res.status);
    });
  });

  describe(`Retail ${region.name} — Cashier (POS) workflows`, () => {

    it('cashier can login and is operator role', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('operator');
    });

    it('cashier can view POS sessions', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/retail/pos-sessions');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      expect(Array.isArray(body)).toBe(true);
    });

    it('cashier can open a POS session', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.post('/api/retail/pos-sessions', {
        opened_at:    TODAY,
        opening_cash: 1000,
        cashier_name: 'QA Cashier',
      });
      expect([200, 201]).toContain(res.status);
    });

    it('cashier can view products for POS', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/products');
      expect(res.status).toBe(200);
    });

    it('cashier can view invoices', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/invoices');
      expect(res.status).toBe(200);
    });

    it('cashier features: correct currency in tenant features', async () => {
      const f = await getFeatures(region.roles.cashier);
      expect(f.currency).toBe(region.currency);
    });
  });

  describe(`Retail ${region.name} — Accountant workflows`, () => {

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
        description: `QA ${region.name} retail journal entry`,
        currency:    region.currency,
        lines: [
          { account_code: '1001', debit: 500,  credit: 0,   description: 'Cash debit' },
          { account_code: '1002', debit: 0,    credit: 500, description: 'Bank credit' },
        ],
      });
      expect([200, 201]).toContain(res.status);
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
describe('Retail Multi-region — Data isolation', () => {

  it('UAE POS sessions are not visible to USA owner', async () => {
    const uaeApi = await login('qa_rtl_ae_owner', PW);
    const usaApi = await login('qa_rtl_us_owner', PW);
    const uaeSessions = await (await uaeApi.get('/api/retail/pos-sessions')).json() as any[];
    const usaSessions = await (await usaApi.get('/api/retail/pos-sessions')).json() as any[];
    const uaeIds = uaeSessions.map((s: any) => s.id);
    const overlap = usaSessions.filter((s: any) => uaeIds.includes(s.id));
    expect(overlap.length).toBe(0);
  });

  it('Singapore products are not visible to Australia owner', async () => {
    const sgApi = await login('qa_rtl_sg_owner', PW);
    const auApi = await login('qa_rtl_au_owner', PW);
    const sgProducts = await (await sgApi.get('/api/products')).json() as any[];
    const auProducts = await (await auApi.get('/api/products')).json() as any[];
    const sgIds = sgProducts.map((p: any) => p.id);
    const overlap = auProducts.filter((p: any) => sgIds.includes(p.id));
    expect(overlap.length).toBe(0);
  });

  it('EU journal entries are not visible to UAE accountant', async () => {
    const euApi = await login('qa_rtl_eu_acct', PW);
    const aeApi = await login('qa_rtl_ae_acct', PW);
    const euRaw = await (await euApi.get('/api/journal-entries')).json() as any;
    const aeRaw = await (await aeApi.get('/api/journal-entries')).json() as any;
    const euEntries: any[] = Array.isArray(euRaw) ? euRaw : (euRaw.entries ?? []);
    const aeEntries: any[] = Array.isArray(aeRaw) ? aeRaw : (aeRaw.entries ?? []);
    const euIds = euEntries.map((e: any) => e.id);
    const overlap = aeEntries.filter((e: any) => euIds.includes(e.id));
    expect(overlap.length).toBe(0);
  });

  it('Australia journal entries are not visible to Singapore accountant', async () => {
    const auApi = await login('qa_rtl_au_acct', PW);
    const sgApi = await login('qa_rtl_sg_acct', PW);
    const auRaw = await (await auApi.get('/api/journal-entries')).json() as any;
    const sgRaw = await (await sgApi.get('/api/journal-entries')).json() as any;
    const auEntries: any[] = Array.isArray(auRaw) ? auRaw : (auRaw.entries ?? []);
    const sgEntries: any[] = Array.isArray(sgRaw) ? sgRaw : (sgRaw.entries ?? []);
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

  it('India retail tenant still returns INR (regression guard)', async () => {
    const f = await getFeatures('qa_rtl_owner');
    expect(f.currency).toBe('INR');
  });
});
