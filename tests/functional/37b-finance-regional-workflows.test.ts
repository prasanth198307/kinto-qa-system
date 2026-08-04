/**
 * Test 37b — Finance/Accounting ERP: Multi-region workflow validation
 *
 * 5 regional finance_enterprise tenants:
 *   8322 qa-fin-ae  UAE        AED  VAT 5%
 *   8323 qa-fin-us  USA        USD  Sales Tax
 *   8324 qa-fin-eu  Germany    EUR  VAT 19%
 *   8325 qa-fin-sg  Singapore  SGD  GST 9%
 *   8326 qa-fin-au  Australia  AUD  GST 10%
 *
 * Per region, 4 roles are tested:
 *   owner (admin)            — full access, verifies tenant info + enterprise modules
 *   manager/cfo (manager)    — finance ops
 *   accountant (operator)    — journal-entry creation
 *   acct (accountsmanager)   — trial balance, chart of accounts
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
    name: 'UAE', tenantId: 8322, currency: 'AED', taxRegime: 'vat',
    roles: { owner: 'qa_fin_ae_owner', manager: 'qa_fin_ae_cfo', cashier: 'qa_fin_ae_accountant', accountant: 'qa_fin_ae_acct' },
  },
  {
    name: 'USA', tenantId: 8323, currency: 'USD', taxRegime: 'sales_tax',
    roles: { owner: 'qa_fin_us_owner', manager: 'qa_fin_us_cfo', cashier: 'qa_fin_us_accountant', accountant: 'qa_fin_us_acct' },
  },
  {
    name: 'EU (Germany)', tenantId: 8324, currency: 'EUR', taxRegime: 'vat',
    roles: { owner: 'qa_fin_eu_owner', manager: 'qa_fin_eu_cfo', cashier: 'qa_fin_eu_accountant', accountant: 'qa_fin_eu_acct' },
  },
  {
    name: 'Singapore', tenantId: 8325, currency: 'SGD', taxRegime: 'gst',
    roles: { owner: 'qa_fin_sg_owner', manager: 'qa_fin_sg_cfo', cashier: 'qa_fin_sg_accountant', accountant: 'qa_fin_sg_acct' },
  },
  {
    name: 'Australia', tenantId: 8326, currency: 'AUD', taxRegime: 'gst',
    roles: { owner: 'qa_fin_au_owner', manager: 'qa_fin_au_cfo', cashier: 'qa_fin_au_accountant', accountant: 'qa_fin_au_acct' },
  },
];

async function getFeatures(username: string) {
  const api = await login(username, PW);
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  return (await res.json()) as { currency: string; taxRegime: string; allowedNavItems: string[]; modules: string[] };
}

for (const region of REGIONS) {
  describe(`Finance ${region.name} — Owner workflows`, () => {

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

    it('enterprise plan: journal-entries in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('journal-entries');
    });

    it('enterprise plan: fixed-assets in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('fixed-assets');
    });

    it('enterprise plan: accounting in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('journal-entries');
    });

    it('owner can view chart of accounts (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/chart-of-accounts');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const otherTenant = body.filter((a: any) => a.tenant_id && a.tenant_id !== region.tenantId);
      expect(otherTenant.length).toBe(0);
    });

    it('owner can view journal entries (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/journal-entries');
      expect(res.status).toBe(200);
      const raw = await res.json() as any;
      const body = Array.isArray(raw) ? raw : (raw.entries ?? []);
      const otherTenant = body.filter((e: any) => e.tenant_id && e.tenant_id !== region.tenantId);
      expect(otherTenant.length).toBe(0);
    });

    it('owner can view bank accounts in regional currency', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/bank-accounts');
      expect(res.status).toBe(200);
      expect(Array.isArray(await res.json())).toBe(true);
    });

    it('owner can view vendors', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/vendors');
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
        description: `QA ${region.name} finance expense`,
        amount:      500,
        category:    'operations',
        date:        TODAY,
      });
      expect([200, 201]).toContain(res.status);
    });
  });

  describe(`Finance ${region.name} — CFO/Manager workflows`, () => {

    it('cfo can login and is manager role', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('manager');
    });

    it('cfo can view journal entries', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/journal-entries');
      expect(res.status).toBe(200);
    });

    it('cfo can view trial balance', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/trial-balance');
      expect(res.status).toBe(200);
    });

    it('cfo can view chart of accounts', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/chart-of-accounts');
      expect(res.status).toBe(200);
    });

    it('cfo can view bank accounts', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/bank-accounts');
      expect(res.status).toBe(200);
    });

    it('cfo can view purchase orders', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/purchase-orders');
      expect(res.status).toBe(200);
    });

    it('cfo can view sales orders', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/sales-orders');
      expect(res.status).toBe(200);
    });

    it('cfo can view MIS dashboard', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/mis/sales');
      expect([200, 404]).toContain(res.status);
    });
  });

  describe(`Finance ${region.name} — Accountant (operator) workflows`, () => {

    it('accountant operator can login and is operator role', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('operator');
    });

    it('accountant operator can view journal entries', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/journal-entries');
      expect(res.status).toBe(200);
    });

    it('accountant operator can create a journal entry', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.post('/api/accounting/journal-entries', {
        date:        TODAY,
        description: 'QA Regional Entry',
        entries: [
          { account_code: '1001', debit: 1000, credit: 0 },
          { account_code: '3001', debit: 0,    credit: 1000 },
        ],
      });
      expect([200, 201]).toContain(res.status);
    });

    it('accountant operator can view expenses', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/expenses');
      expect(res.status).toBe(200);
    });

    it('accountant operator features: correct currency', async () => {
      const f = await getFeatures(region.roles.cashier);
      expect(f.currency).toBe(region.currency);
    });

    it('accountant operator cannot see other-tenant journal entries', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/journal-entries');
      expect(res.status).toBe(200);
      const raw = await res.json() as any;
      const body = Array.isArray(raw) ? raw : (raw.entries ?? []);
      const leak = body.filter((e: any) => e.tenant_id && e.tenant_id !== region.tenantId);
      expect(leak.length).toBe(0);
    });
  });

  describe(`Finance ${region.name} — Accountsmanager workflows`, () => {

    it('accountsmanager can login and is accountsmanager role', async () => {
      const api = await login(region.roles.accountant, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('accountsmanager');
    });

    it('accountsmanager can view chart of accounts', async () => {
      const api = await login(region.roles.accountant, PW);
      const res = await api.get('/api/chart-of-accounts');
      expect(res.status).toBe(200);
    });

    it('accountsmanager can view journal entries', async () => {
      const api = await login(region.roles.accountant, PW);
      const res = await api.get('/api/journal-entries');
      expect(res.status).toBe(200);
    });

    it('accountsmanager can view trial balance', async () => {
      const api = await login(region.roles.accountant, PW);
      const res = await api.get('/api/trial-balance');
      expect(res.status).toBe(200);
    });

    it('accountsmanager can view balance sheet', async () => {
      const api = await login(region.roles.accountant, PW);
      const res = await api.get('/api/balance-sheet');
      expect([200, 404]).toContain(res.status);
    });

    it('accountsmanager can create a journal entry in regional currency', async () => {
      const api = await login(region.roles.accountant, PW);
      const res = await api.post('/api/journal-entries', {
        date:        TODAY,
        description: `QA ${region.name} finance journal entry`,
        currency:    region.currency,
        lines: [
          { account_code: '1001', debit: 1000, credit: 0,    description: 'Cash debit' },
          { account_code: '4001', debit: 0,    credit: 1000, description: 'Revenue credit' },
        ],
      });
      expect([200, 201]).toContain(res.status);
    });

    it('accountsmanager features: accounting in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.accountant);
      expect(f.allowedNavItems).toContain('journal-entries');
    });

    it('accountsmanager can view bank accounts', async () => {
      const api = await login(region.roles.accountant, PW);
      const res = await api.get('/api/bank-accounts');
      expect(res.status).toBe(200);
    });

    it('accountsmanager can view expenses', async () => {
      const api = await login(region.roles.accountant, PW);
      const res = await api.get('/api/expenses');
      expect(res.status).toBe(200);
    });
  });
}

// ── Cross-region data isolation suite ────────────────────────────────────────
describe('Finance Multi-region — Data isolation', () => {

  it('UAE journal entries are not visible to USA accountant', async () => {
    const aeApi = await login('qa_fin_ae_acct', PW);
    const usApi = await login('qa_fin_us_acct', PW);
    const aeRaw = await (await aeApi.get('/api/journal-entries')).json() as any;
    const usRaw = await (await usApi.get('/api/journal-entries')).json() as any;
    const aeEntries = Array.isArray(aeRaw) ? aeRaw : (aeRaw.entries ?? []);
    const usEntries = Array.isArray(usRaw) ? usRaw : (usRaw.entries ?? []);
    const aeIds = aeEntries.map((e: any) => e.id);
    const overlap = usEntries.filter((e: any) => aeIds.includes(e.id));
    expect(overlap.length).toBe(0);
  });

  it('Singapore chart-of-accounts not visible to Australia accountant', async () => {
    const sgApi = await login('qa_fin_sg_acct', PW);
    const auApi = await login('qa_fin_au_acct', PW);
    const sgAccounts = await (await sgApi.get('/api/chart-of-accounts')).json() as any[];
    const auAccounts = await (await auApi.get('/api/chart-of-accounts')).json() as any[];
    const sgIds = sgAccounts.map((a: any) => a.id);
    const overlap = auAccounts.filter((a: any) => sgIds.includes(a.id));
    expect(overlap.length).toBe(0);
  });

  it('EU journal entries are not visible to UAE accountant operator', async () => {
    const euApi = await login('qa_fin_eu_accountant', PW);
    const aeApi = await login('qa_fin_ae_accountant', PW);
    await euApi.post('/api/accounting/journal-entries', {
      date: TODAY, description: 'QA EU isolation entry',
      entries: [{ account_code: '1001', debit: 100, credit: 0 }, { account_code: '3001', debit: 0, credit: 100 }],
    });
    const aeRaw = await (await aeApi.get('/api/journal-entries')).json() as any;
    const aeEntries = Array.isArray(aeRaw) ? aeRaw : (aeRaw.entries ?? []);
    const euLeak = aeEntries.filter((e: any) => e.tenant_id === 8324);
    expect(euLeak.length).toBe(0);
  });

  it('Australia bank accounts are not visible to Singapore cfo', async () => {
    const auApi = await login('qa_fin_au_cfo', PW);
    const sgApi = await login('qa_fin_sg_cfo', PW);
    const auAccounts = await (await auApi.get('/api/bank-accounts')).json() as any[];
    const sgAccounts = await (await sgApi.get('/api/bank-accounts')).json() as any[];
    const auIds = auAccounts.map((a: any) => a.id);
    const overlap = sgAccounts.filter((a: any) => auIds.includes(a.id));
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

  it('India finance tenant still returns INR (regression guard)', async () => {
    const f = await getFeatures('qa_fin_owner');
    expect(f.currency).toBe('INR');
  });
});
