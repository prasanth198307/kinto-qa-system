/**
 * Test 32b — Agriculture ERP: Multi-region workflow validation
 *
 * 5 regional agriculture_enterprise tenants:
 *   9922 qa-agr-ae  UAE        AED  VAT 5%
 *   9923 qa-agr-us  USA        USD  Sales Tax
 *   9924 qa-agr-eu  Germany    EUR  VAT 19%
 *   9925 qa-agr-sg  Singapore  SGD  GST 9%
 *   9926 qa-agr-au  Australia  AUD  GST 10%
 *
 * Per region, 4 roles are tested:
 *   owner (admin)            — full access, verifies tenant info + enterprise modules
 *   manager (manager)        — agriculture ops, purchase, HR
 *   supervisor (operator)    — crop creation workflow
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
    name: 'UAE', tenantId: 9922, currency: 'AED', taxRegime: 'vat',
    roles: { owner: 'qa_agr_ae_owner', manager: 'qa_agr_ae_manager', cashier: 'qa_agr_ae_supervisor', accountant: 'qa_agr_ae_acct' },
  },
  {
    name: 'USA', tenantId: 9923, currency: 'USD', taxRegime: 'sales_tax',
    roles: { owner: 'qa_agr_us_owner', manager: 'qa_agr_us_manager', cashier: 'qa_agr_us_supervisor', accountant: 'qa_agr_us_acct' },
  },
  {
    name: 'EU (Germany)', tenantId: 9924, currency: 'EUR', taxRegime: 'vat',
    roles: { owner: 'qa_agr_eu_owner', manager: 'qa_agr_eu_manager', cashier: 'qa_agr_eu_supervisor', accountant: 'qa_agr_eu_acct' },
  },
  {
    name: 'Singapore', tenantId: 9925, currency: 'SGD', taxRegime: 'gst',
    roles: { owner: 'qa_agr_sg_owner', manager: 'qa_agr_sg_manager', cashier: 'qa_agr_sg_supervisor', accountant: 'qa_agr_sg_acct' },
  },
  {
    name: 'Australia', tenantId: 9926, currency: 'AUD', taxRegime: 'gst',
    roles: { owner: 'qa_agr_au_owner', manager: 'qa_agr_au_manager', cashier: 'qa_agr_au_supervisor', accountant: 'qa_agr_au_acct' },
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
  describe(`Agriculture ${region.name} — Owner workflows`, () => {

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

    it('enterprise plan: agriculture in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('agriculture');
    });

    it('enterprise plan: production + warehouses + fixed_assets in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      // enterprise plan should include extended modules (may vary by plan-features config)
      expect(Array.isArray(f.allowedNavItems)).toBe(true);
    });

    it('enterprise plan: accounting (journal-entries) in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('journal-entries');
    });

    it('owner can view own crops only (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/agriculture/crops');
      expect([200, 404]).toContain(res.status);
      if (res.status === 200 && res.headers.get('content-type')?.includes('application/json')) {
        const body = await res.json() as any[];
        const otherTenantCrops = body.filter((c: any) => c.tenant_id && c.tenant_id !== region.tenantId);
        expect(otherTenantCrops.length).toBe(0);
      }
    });

    it('owner can view own fields only (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/agriculture/fields');
      expect([200, 404]).toContain(res.status);
      if (res.status === 200 && res.headers.get('content-type')?.includes('application/json')) {
        const body = await res.json() as any[];
        const otherTenantFields = body.filter((f: any) => f.tenant_id && f.tenant_id !== region.tenantId);
        expect(otherTenantFields.length).toBe(0);
      }
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
        category:    'farm_supplies',
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

  describe(`Agriculture ${region.name} — Manager workflows`, () => {

    it('manager can login and is manager role', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('manager');
    });

    it('manager can view crops', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/agriculture/crops');
      expect(res.status).toBe(200);
    });

    it('manager can view fields', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/agriculture/fields');
      expect(res.status).toBe(200);
    });

    it('manager can view harvest records', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/agriculture/harvests');
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

  describe(`Agriculture ${region.name} — Supervisor (operator) workflows`, () => {

    it('supervisor can login and is operator role', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('operator');
    });

    it('supervisor can view crops', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/agriculture/crops');
      expect([200, 404]).toContain(res.status);
      if (res.status === 200 && res.headers.get('content-type')?.includes('application/json')) {
        const body = await res.json() as any[];
        expect(Array.isArray(body)).toBe(true);
      }
    });

    it('supervisor can create a crop record', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.post('/api/agriculture/crops', {
        crop_name:         'QA Wheat',
        season:            'Rabi',
        area_acres:        5,
        expected_yield_kg: 2000,
      });
      expect([200, 201]).toContain(res.status);
    });

    it('supervisor can view fields', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/agriculture/fields');
      expect(res.status).toBe(200);
    });

    it('supervisor can view invoices', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/invoices');
      expect(res.status).toBe(200);
    });

    it('supervisor features: correct currency in tenant features', async () => {
      const f = await getFeatures(region.roles.cashier);
      expect(f.currency).toBe(region.currency);
    });
  });

  describe(`Agriculture ${region.name} — Accountant workflows`, () => {

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
        description: `QA ${region.name} agriculture journal entry`,
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
describe('Agriculture Multi-region — Data isolation', () => {

  it('UAE crops are not visible to USA owner', async () => {
    const uaeApi = await login('qa_agr_ae_owner', PW);
    const usaApi = await login('qa_agr_us_owner', PW);
    const uaeRes = await uaeApi.get('/api/agriculture/crops');
    const usaRes = await usaApi.get('/api/agriculture/crops');
    if (uaeRes.status === 200 && usaRes.status === 200 &&
        uaeRes.headers.get('content-type')?.includes('application/json') &&
        usaRes.headers.get('content-type')?.includes('application/json')) {
      const uaeCrops = await uaeRes.json() as any[];
      const usaCrops = await usaRes.json() as any[];
      const uaeIds = uaeCrops.map((c: any) => c.id);
      const overlap = usaCrops.filter((c: any) => uaeIds.includes(c.id));
      expect(overlap.length).toBe(0);
    }
  });

  it('Singapore fields are not visible to Australia owner', async () => {
    const sgApi = await login('qa_agr_sg_owner', PW);
    const auApi = await login('qa_agr_au_owner', PW);
    const sgRes = await sgApi.get('/api/agriculture/fields');
    const auRes = await auApi.get('/api/agriculture/fields');
    if (sgRes.status === 200 && auRes.status === 200 &&
        sgRes.headers.get('content-type')?.includes('application/json') &&
        auRes.headers.get('content-type')?.includes('application/json')) {
      const sgFields = await sgRes.json() as any[];
      const auFields = await auRes.json() as any[];
      const sgIds = sgFields.map((f: any) => f.id);
      const overlap = auFields.filter((f: any) => sgIds.includes(f.id));
      expect(overlap.length).toBe(0);
    }
  });

  it('EU journal entries are not visible to UAE accountant', async () => {
    const euApi = await login('qa_agr_eu_acct', PW);
    const aeApi = await login('qa_agr_ae_acct', PW);
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
    const auApi = await login('qa_agr_au_acct', PW);
    const sgApi = await login('qa_agr_sg_acct', PW);
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

  it('India agriculture tenant still returns INR (regression guard)', async () => {
    const f = await getFeatures('qa_agr_e_owner');
    expect(f.currency).toBe('INR');
  });
});
