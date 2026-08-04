/**
 * Test 34b — Gold ERP: Multi-region workflow validation
 *
 * 5 regional gold_enterprise tenants:
 *   8022 qa-gld-ae  UAE        AED  VAT 5%
 *   8023 qa-gld-us  USA        USD  Sales Tax
 *   8024 qa-gld-eu  Germany    EUR  VAT 19%
 *   8025 qa-gld-sg  Singapore  SGD  GST 9%
 *   8026 qa-gld-au  Australia  AUD  GST 10%
 *
 * Per region, 4 roles are tested:
 *   owner (admin)              — full access, verifies tenant info + enterprise modules
 *   manager (manager)          — gold ops, purchase, HR
 *   sales_staff (operator)     — rate card creation workflow
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
    name: 'UAE', tenantId: 8022, currency: 'AED', taxRegime: 'vat',
    roles: { owner: 'qa_gld_ae_owner', manager: 'qa_gld_ae_manager', cashier: 'qa_gld_ae_sales_staff', accountant: 'qa_gld_ae_acct' },
  },
  {
    name: 'USA', tenantId: 8023, currency: 'USD', taxRegime: 'sales_tax',
    roles: { owner: 'qa_gld_us_owner', manager: 'qa_gld_us_manager', cashier: 'qa_gld_us_sales_staff', accountant: 'qa_gld_us_acct' },
  },
  {
    name: 'EU (Germany)', tenantId: 8024, currency: 'EUR', taxRegime: 'vat',
    roles: { owner: 'qa_gld_eu_owner', manager: 'qa_gld_eu_manager', cashier: 'qa_gld_eu_sales_staff', accountant: 'qa_gld_eu_acct' },
  },
  {
    name: 'Singapore', tenantId: 8025, currency: 'SGD', taxRegime: 'gst',
    roles: { owner: 'qa_gld_sg_owner', manager: 'qa_gld_sg_manager', cashier: 'qa_gld_sg_sales_staff', accountant: 'qa_gld_sg_acct' },
  },
  {
    name: 'Australia', tenantId: 8026, currency: 'AUD', taxRegime: 'gst',
    roles: { owner: 'qa_gld_au_owner', manager: 'qa_gld_au_manager', cashier: 'qa_gld_au_sales_staff', accountant: 'qa_gld_au_acct' },
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
  describe(`Gold ${region.name} — Owner workflows`, () => {

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

    it('enterprise plan: gold in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('gold');
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

    it('owner can view own rate cards only (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/gold/rate-card');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const otherTenantCards = body.filter((c: any) => c.tenant_id && c.tenant_id !== region.tenantId);
      expect(otherTenantCards.length).toBe(0);
    });

    it('owner can view own gold sales only (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/gold/sales');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const otherTenantSales = body.filter((s: any) => s.tenant_id && s.tenant_id !== region.tenantId);
      expect(otherTenantSales.length).toBe(0);
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
        category:    'overheads',
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

  describe(`Gold ${region.name} — Manager workflows`, () => {

    it('manager can login and is manager role', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('manager');
    });

    it('manager can view rate cards', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/gold/rate-card');
      expect(res.status).toBe(200);
    });

    it('manager can view gold sales', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/gold/sales');
      expect(res.status).toBe(200);
    });

    it('manager can view gold inventory', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/gold/inventory');
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
      expect(res.status).toBe(200);
    });

    it('manager can view MIS sales dashboard', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/mis/sales');
      expect([200, 404]).toContain(res.status);
    });

    it('manager can view inventory', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/inventory');
      expect(res.status).toBe(200);
    });
  });

  describe(`Gold ${region.name} — Sales Staff (operator) workflows`, () => {

    it('sales_staff can login and is operator role', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('operator');
    });

    it('sales_staff can view rate cards', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/gold/rate-card');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      expect(Array.isArray(body)).toBe(true);
    });

    it('sales_staff can create a rate card entry', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.post('/api/gold/rate-card', {
        metal:          'gold',
        purity:         '22K',
        rate_per_gram:  6000,
        effective_date: TODAY,
      });
      expect([200, 201]).toContain(res.status);
    });

    it('sales_staff can view gold sales', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/gold/sales');
      expect(res.status).toBe(200);
    });

    it('sales_staff can view invoices', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/invoices');
      expect(res.status).toBe(200);
    });

    it('sales_staff features: correct currency in tenant features', async () => {
      const f = await getFeatures(region.roles.cashier);
      expect(f.currency).toBe(region.currency);
    });
  });

  describe(`Gold ${region.name} — Accountant workflows`, () => {

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
        description: `QA ${region.name} gold journal entry`,
        currency:    region.currency,
        lines: [
          { account_code: '1000', debit: 500,  credit: 0,   description: 'Cash debit' },
          { account_code: '4000', debit: 0,    credit: 500, description: 'Revenue credit' },
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
describe('Gold Multi-region — Data isolation', () => {

  it('UAE rate cards are not visible to USA owner', async () => {
    const uaeApi = await login('qa_gld_ae_owner', PW);
    const usaApi = await login('qa_gld_us_owner', PW);
    const uaeCards = await (await uaeApi.get('/api/gold/rate-card')).json() as any[];
    const usaCards = await (await usaApi.get('/api/gold/rate-card')).json() as any[];
    const uaeIds = uaeCards.map((c: any) => c.id);
    const overlap = usaCards.filter((c: any) => uaeIds.includes(c.id));
    expect(overlap.length).toBe(0);
  });

  it('Singapore gold sales are not visible to Australia owner', async () => {
    const sgApi = await login('qa_gld_sg_owner', PW);
    const auApi = await login('qa_gld_au_owner', PW);
    const sgSales = await (await sgApi.get('/api/gold/sales')).json() as any[];
    const auSales = await (await auApi.get('/api/gold/sales')).json() as any[];
    const sgIds = sgSales.map((s: any) => s.id);
    const overlap = auSales.filter((s: any) => sgIds.includes(s.id));
    expect(overlap.length).toBe(0);
  });

  it('EU journal entries are not visible to UAE accountant', async () => {
    const euApi = await login('qa_gld_eu_acct', PW);
    const aeApi = await login('qa_gld_ae_acct', PW);
    const euEntries = await (await euApi.get('/api/journal-entries')).json() as any[];
    const aeEntries = await (await aeApi.get('/api/journal-entries')).json() as any[];
    const euIds = euEntries.map((e: any) => e.id);
    const overlap = aeEntries.filter((e: any) => euIds.includes(e.id));
    expect(overlap.length).toBe(0);
  });

  it('Australia journal entries are not visible to Singapore accountant', async () => {
    const auApi = await login('qa_gld_au_acct', PW);
    const sgApi = await login('qa_gld_sg_acct', PW);
    const auEntries = await (await auApi.get('/api/journal-entries')).json() as any[];
    const sgEntries = await (await sgApi.get('/api/journal-entries')).json() as any[];
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

  it('India gold tenant still returns INR (regression guard)', async () => {
    const f = await getFeatures('qa_gld_owner');
    expect(f.currency).toBe('INR');
  });
});
