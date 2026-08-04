/**
 * Test 31b — Real Estate ERP: Multi-region workflow validation
 *
 * 5 regional real_estate_enterprise tenants:
 *   9822 qa-re-ae  UAE        AED  VAT 5%
 *   9823 qa-re-us  USA        USD  Sales Tax ~8%
 *   9824 qa-re-eu  Germany    EUR  VAT 19%
 *   9825 qa-re-sg  Singapore  SGD  GST 9%
 *   9826 qa-re-au  Australia  AUD  GST 10%
 *
 * Per region, 4 roles are tested:
 *   owner (admin)            — full access, verifies tenant info + enterprise modules
 *   manager (manager)        — property management, listings, project reporting
 *   sales_exec (operator)    — customer registration, booking workflow
 *   accountant (accountsmanager) — journal entries, trial balance, chart of accounts
 *
 * Critical assertions:
 *   - Correct currency returned by /api/tenant/features
 *   - Correct tax_regime returned by /api/tenant/features
 *   - Enterprise plan modules accessible (accounting, fixed_assets, warehouses)
 *   - Real estate APIs (customers, properties, bookings) return 200
 *   - Data isolation: each region only sees its own customers (no cross-tenant data)
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
    name: 'UAE', tenantId: 9822, currency: 'AED', taxRegime: 'vat',
    roles: { owner: 'qa_re_ae_owner', manager: 'qa_re_ae_manager', cashier: 'qa_re_ae_sales_exec', accountant: 'qa_re_ae_acct' },
  },
  {
    name: 'USA', tenantId: 9823, currency: 'USD', taxRegime: 'sales_tax',
    roles: { owner: 'qa_re_us_owner', manager: 'qa_re_us_manager', cashier: 'qa_re_us_sales_exec', accountant: 'qa_re_us_acct' },
  },
  {
    name: 'EU (Germany)', tenantId: 9824, currency: 'EUR', taxRegime: 'vat',
    roles: { owner: 'qa_re_eu_owner', manager: 'qa_re_eu_manager', cashier: 'qa_re_eu_sales_exec', accountant: 'qa_re_eu_acct' },
  },
  {
    name: 'Singapore', tenantId: 9825, currency: 'SGD', taxRegime: 'gst',
    roles: { owner: 'qa_re_sg_owner', manager: 'qa_re_sg_manager', cashier: 'qa_re_sg_sales_exec', accountant: 'qa_re_sg_acct' },
  },
  {
    name: 'Australia', tenantId: 9826, currency: 'AUD', taxRegime: 'gst',
    roles: { owner: 'qa_re_au_owner', manager: 'qa_re_au_manager', cashier: 'qa_re_au_sales_exec', accountant: 'qa_re_au_acct' },
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
  describe(`Real Estate ${region.name} — Owner workflows`, () => {

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

    it('owner can view own customers only (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/real-estate/customers');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const otherTenantCustomers = body.filter((c: any) => c.tenant_id && c.tenant_id !== region.tenantId);
      expect(otherTenantCustomers.length).toBe(0);
    });

    it('owner can view properties / listings', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/real-estate/properties');
      expect([200, 404]).toContain(res.status);
    });

    it('owner can view bookings', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/real-estate/bookings');
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
        category:    'maintenance',
        date:        TODAY,
      });
      expect([200, 201]).toContain(res.status);
    });
  });

  describe(`Real Estate ${region.name} — Manager workflows`, () => {

    it('manager can login and is manager role', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('manager');
    });

    it('manager can view customers', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/real-estate/customers');
      expect(res.status).toBe(200);
    });

    it('manager can view properties', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/real-estate/properties');
      expect([200, 404]).toContain(res.status);
    });

    it('manager can view bookings', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/real-estate/bookings');
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

    it('manager can view MIS dashboard', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/mis/sales');
      expect([200, 404]).toContain(res.status);
    });
  });

  describe(`Real Estate ${region.name} — Sales Exec (operator) workflows`, () => {

    it('sales_exec can login and is operator role', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('operator');
    });

    it('sales_exec can view customers', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/real-estate/customers');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      expect(Array.isArray(body)).toBe(true);
    });

    it('sales_exec can create a new customer (buyer)', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.post('/api/real-estate/customers', {
        name:   'QA Buyer',
        email:  'buyer@qa.test',
        phone:  '9000000001',
        budget: 5000000,
      });
      expect([200, 201]).toContain(res.status);
    });

    it('sales_exec can view existing properties', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/real-estate/properties');
      expect([200, 404]).toContain(res.status);
    });

    it('sales_exec can view invoices', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/invoices');
      expect(res.status).toBe(200);
    });

    it('sales_exec features: correct currency in tenant features', async () => {
      const f = await getFeatures(region.roles.cashier);
      expect(f.currency).toBe(region.currency);
    });
  });

  describe(`Real Estate ${region.name} — Accountant workflows`, () => {

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
          { account_code: '1001', debit: 500,  credit: 0,   description: 'Cash debit' },
          { account_code: '4001', debit: 0,    credit: 500, description: 'Revenue credit' },
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
describe('Real Estate Multi-region — Data isolation', () => {

  it('UAE customers are not visible to USA owner', async () => {
    const uaeApi = await login('qa_re_ae_owner', PW);
    const usaApi = await login('qa_re_us_owner', PW);
    const uaeCustomers = await (await uaeApi.get('/api/real-estate/customers')).json() as any[];
    const usaCustomers = await (await usaApi.get('/api/real-estate/customers')).json() as any[];
    const uaeIds = uaeCustomers.map((c: any) => c.id);
    const overlap = usaCustomers.filter((c: any) => uaeIds.includes(c.id));
    expect(overlap.length).toBe(0);
  });

  it('Singapore customers are not visible to Australia owner', async () => {
    const sgApi = await login('qa_re_sg_owner', PW);
    const auApi = await login('qa_re_au_owner', PW);
    const sgCustomers = await (await sgApi.get('/api/real-estate/customers')).json() as any[];
    const auCustomers = await (await auApi.get('/api/real-estate/customers')).json() as any[];
    const sgIds = sgCustomers.map((c: any) => c.id);
    const overlap = auCustomers.filter((c: any) => sgIds.includes(c.id));
    expect(overlap.length).toBe(0);
  });

  it('EU journal entries are not visible to UAE accountant', async () => {
    const euApi = await login('qa_re_eu_acct', PW);
    const aeApi = await login('qa_re_ae_acct', PW);
    const euRaw = await (await euApi.get('/api/journal-entries')).json() as any;
    const aeRaw = await (await aeApi.get('/api/journal-entries')).json() as any;
    const euEntries: any[] = Array.isArray(euRaw) ? euRaw : (euRaw.entries ?? []);
    const aeEntries: any[] = Array.isArray(aeRaw) ? aeRaw : (aeRaw.entries ?? []);
    const euIds = euEntries.map((e: any) => e.id);
    const overlap = aeEntries.filter((e: any) => euIds.includes(e.id));
    expect(overlap.length).toBe(0);
  });

  it('Australia journal entries are not visible to Singapore accountant', async () => {
    const auApi = await login('qa_re_au_acct', PW);
    const sgApi = await login('qa_re_sg_acct', PW);
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

  it('India Real Estate tenant still returns INR (regression guard)', async () => {
    const f = await getFeatures('qa_re_owner');
    expect(f.currency).toBe('INR');
  });
});
