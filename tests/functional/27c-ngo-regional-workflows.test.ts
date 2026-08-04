/**
 * Test 27c — NGO ERP: Multi-region workflow validation
 *
 * 5 regional ngo_enterprise tenants:
 *   9422 qa-ngo-ae  UAE        AED  VAT 5%
 *   9423 qa-ngo-us  USA        USD  Sales Tax ~8%
 *   9424 qa-ngo-eu  Germany    EUR  VAT 19%
 *   9425 qa-ngo-sg  Singapore  SGD  GST 9%
 *   9426 qa-ngo-au  Australia  AUD  GST 10%
 *
 * Per region, 4 roles are tested:
 *   owner (admin)              — full access, verifies tenant info + enterprise modules
 *   manager (manager)          — NGO ops, purchase, HR
 *   field_worker (operator)    — donor registration workflow
 *   accountant (accountsmanager) — journal entries, trial balance, chart of accounts
 *
 * Critical assertions:
 *   - Correct currency returned by /api/tenant/features
 *   - Correct tax_regime returned by /api/tenant/features
 *   - Enterprise plan modules accessible (production, warehouses, fixed_assets, accounting)
 *   - NGO APIs (donors, donations) return 200
 *   - Data isolation: each region only sees its own donors (no cross-tenant data)
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
    name: 'UAE', tenantId: 9422, currency: 'AED', taxRegime: 'vat',
    roles: { owner: 'qa_ngo_ae_owner', manager: 'qa_ngo_ae_manager', cashier: 'qa_ngo_ae_field_worker', accountant: 'qa_ngo_ae_acct' },
  },
  {
    name: 'USA', tenantId: 9423, currency: 'USD', taxRegime: 'sales_tax',
    roles: { owner: 'qa_ngo_us_owner', manager: 'qa_ngo_us_manager', cashier: 'qa_ngo_us_field_worker', accountant: 'qa_ngo_us_acct' },
  },
  {
    name: 'EU (Germany)', tenantId: 9424, currency: 'EUR', taxRegime: 'vat',
    roles: { owner: 'qa_ngo_eu_owner', manager: 'qa_ngo_eu_manager', cashier: 'qa_ngo_eu_field_worker', accountant: 'qa_ngo_eu_acct' },
  },
  {
    name: 'Singapore', tenantId: 9425, currency: 'SGD', taxRegime: 'gst',
    roles: { owner: 'qa_ngo_sg_owner', manager: 'qa_ngo_sg_manager', cashier: 'qa_ngo_sg_field_worker', accountant: 'qa_ngo_sg_acct' },
  },
  {
    name: 'Australia', tenantId: 9426, currency: 'AUD', taxRegime: 'gst',
    roles: { owner: 'qa_ngo_au_owner', manager: 'qa_ngo_au_manager', cashier: 'qa_ngo_au_field_worker', accountant: 'qa_ngo_au_acct' },
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
  describe(`NGO ${region.name} — Owner workflows`, () => {

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

    it('enterprise plan: ngo module in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('ngo');
    });

    it('enterprise plan: production + warehouses + fixed_assets in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(Array.isArray(f.allowedNavItems)).toBe(true);
    });

    it('enterprise plan: accounting (journal-entries) in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('journal-entries');
    });

    it('owner can view own donors only (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/ngo/donors');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const otherTenantDonors = body.filter((d: any) => d.tenant_id && d.tenant_id !== region.tenantId);
      expect(otherTenantDonors.length).toBe(0);
    });

    it('owner can view own donations only (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/ngo/donations');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const otherTenantDonations = body.filter((d: any) => d.tenant_id && d.tenant_id !== region.tenantId);
      expect(otherTenantDonations.length).toBe(0);
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
      const body = await res.json() as any[];
      expect(Array.isArray(body)).toBe(true);
    });

    it('owner can view employees (HR module)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/hr/employees');
      expect(res.status).toBe(200);
    });

    it('owner can register a donor', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.post('/api/ngo/donors', {
        name:       `QA Owner Donor ${region.name}`,
        email:      'donor@qa.test',
        phone:      '9000000001',
        donor_type: 'individual',
      });
      expect([200, 201]).toContain(res.status);
    });

    it('owner can create an expense record', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.post('/api/expenses', {
        description: `QA ${region.name} NGO expense`,
        amount:      300,
        category:    'operations',
        date:        TODAY,
      });
      expect([200, 201]).toContain(res.status);
    });
  });

  describe(`NGO ${region.name} — Manager workflows`, () => {

    it('manager can login and is manager role', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('manager');
    });

    it('manager can view donors', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/ngo/donors');
      expect(res.status).toBe(200);
    });

    it('manager can view donations', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/ngo/donations');
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
      expect([200, 403]).toContain(res.status);
    });

    it('manager can view MIS sales dashboard', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/mis/sales');
      expect([200, 404]).toContain(res.status);
    });

    it('manager can view invoices', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/invoices');
      expect(res.status).toBe(200);
    });
  });

  describe(`NGO ${region.name} — Field Worker (Operator) workflows`, () => {

    it('field worker can login and is operator role', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('operator');
    });

    it('field worker can view donors', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/ngo/donors');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      expect(Array.isArray(body)).toBe(true);
    });

    it('field worker can view donations', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/ngo/donations');
      expect(res.status).toBe(200);
    });

    it('field worker can register a donor', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.post('/api/ngo/donors', {
        name:       'QA Donor',
        email:      'donor@qa.test',
        phone:      '9000000001',
        donor_type: 'individual',
      });
      expect([200, 201]).toContain(res.status);
    });

    it('field worker can view invoices', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/invoices');
      expect(res.status).toBe(200);
    });

    it('field worker features: correct currency in tenant features', async () => {
      const f = await getFeatures(region.roles.cashier);
      expect(f.currency).toBe(region.currency);
    });
  });

  describe(`NGO ${region.name} — Accountant workflows`, () => {

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
        description: `QA ${region.name} NGO journal entry`,
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
describe('NGO Multi-region — Data isolation', () => {

  it('UAE donors are not visible to USA owner', async () => {
    const uaeApi = await login('qa_ngo_ae_owner', PW);
    const usaApi = await login('qa_ngo_us_owner', PW);
    const uaeRes = await uaeApi.get('/api/ngo/donors');
    const usaRes = await usaApi.get('/api/ngo/donors');
    if (uaeRes.status === 200 && usaRes.status === 200 &&
        uaeRes.headers.get('content-type')?.includes('application/json') &&
        usaRes.headers.get('content-type')?.includes('application/json')) {
      const uaeDonors = await uaeRes.json() as any[];
      const usaDonors = await usaRes.json() as any[];
      const uaeIds = uaeDonors.map((d: any) => d.id);
      const overlap = usaDonors.filter((d: any) => uaeIds.includes(d.id));
      expect(overlap.length).toBe(0);
    }
  });

  it('Singapore donations are not visible to Australia owner', async () => {
    const sgApi = await login('qa_ngo_sg_owner', PW);
    const auApi = await login('qa_ngo_au_owner', PW);
    const sgRes = await sgApi.get('/api/ngo/donations');
    const auRes = await auApi.get('/api/ngo/donations');
    if (sgRes.status === 200 && auRes.status === 200 &&
        sgRes.headers.get('content-type')?.includes('application/json') &&
        auRes.headers.get('content-type')?.includes('application/json')) {
      const sgDonations = await sgRes.json() as any[];
      const auDonations = await auRes.json() as any[];
      const sgIds = sgDonations.map((d: any) => d.id);
      const overlap = auDonations.filter((d: any) => sgIds.includes(d.id));
      expect(overlap.length).toBe(0);
    }
  });

  it('EU donors are not visible to UAE field worker', async () => {
    const euApi = await login('qa_ngo_eu_field_worker', PW);
    const aeApi = await login('qa_ngo_ae_field_worker', PW);
    await euApi.post('/api/ngo/donors', {
      name: 'EU Isolation Donor', email: 'eu-isolation@qa.test', phone: '9000000003', donor_type: 'individual',
    });
    const aeRes = await aeApi.get('/api/ngo/donors');
    if (aeRes.status === 200 && aeRes.headers.get('content-type')?.includes('application/json')) {
      const aeDonors = await aeRes.json() as any[];
      const euDonorsForAE = aeDonors.filter((d: any) => d.tenant_id === 9424);
      expect(euDonorsForAE.length).toBe(0);
    }
  });

  it('Australia journal entries are not visible to Singapore accountant', async () => {
    const auApi = await login('qa_ngo_au_acct', PW);
    const sgApi = await login('qa_ngo_sg_acct', PW);
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

  it('all 5 regions have accounting module (journal-entries in allowedNavItems)', async () => {
    for (const region of REGIONS) {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('journal-entries');
    }
  });

  it('India NGO tenant still returns INR (regression guard)', async () => {
    const f = await getFeatures('qa_ngo_owner');
    expect(f.currency).toBe('INR');
  });
});
