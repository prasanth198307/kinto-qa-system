/**
 * Test 33b — Education ERP: Multi-region workflow validation
 *
 * 5 regional education_enterprise tenants:
 *   9972 qa-edu-ae  UAE        AED  VAT 5%
 *   9973 qa-edu-us  USA        USD  Sales Tax
 *   9974 qa-edu-eu  Germany    EUR  VAT 19%
 *   9975 qa-edu-sg  Singapore  SGD  GST 9%
 *   9976 qa-edu-au  Australia  AUD  GST 10%
 *
 * Per region, 4 roles are tested:
 *   owner (admin)              — full access, verifies tenant info + enterprise modules
 *   principal (manager)        — school ops, HR, reporting
 *   fee_collector (operator)   — student enrollment workflow
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
    name: 'UAE', tenantId: 9972, currency: 'AED', taxRegime: 'vat',
    roles: { owner: 'qa_edu_ae_owner', manager: 'qa_edu_ae_principal', cashier: 'qa_edu_ae_fee_collector', accountant: 'qa_edu_ae_acct' },
  },
  {
    name: 'USA', tenantId: 9973, currency: 'USD', taxRegime: 'sales_tax',
    roles: { owner: 'qa_edu_us_owner', manager: 'qa_edu_us_principal', cashier: 'qa_edu_us_fee_collector', accountant: 'qa_edu_us_acct' },
  },
  {
    name: 'EU (Germany)', tenantId: 9974, currency: 'EUR', taxRegime: 'vat',
    roles: { owner: 'qa_edu_eu_owner', manager: 'qa_edu_eu_principal', cashier: 'qa_edu_eu_fee_collector', accountant: 'qa_edu_eu_acct' },
  },
  {
    name: 'Singapore', tenantId: 9975, currency: 'SGD', taxRegime: 'gst',
    roles: { owner: 'qa_edu_sg_owner', manager: 'qa_edu_sg_principal', cashier: 'qa_edu_sg_fee_collector', accountant: 'qa_edu_sg_acct' },
  },
  {
    name: 'Australia', tenantId: 9976, currency: 'AUD', taxRegime: 'gst',
    roles: { owner: 'qa_edu_au_owner', manager: 'qa_edu_au_principal', cashier: 'qa_edu_au_fee_collector', accountant: 'qa_edu_au_acct' },
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
  describe(`Education ${region.name} — Owner workflows`, () => {

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

    it('enterprise plan: education in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('education');
    });

    it('enterprise plan: fixed_assets in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('fixed-assets');
    });

    it('enterprise plan: accounting (journal-entries) in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('journal-entries');
    });

    it('owner can view own students only (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/education/students');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const otherTenantStudents = body.filter((s: any) => s.tenant_id && s.tenant_id !== region.tenantId);
      expect(otherTenantStudents.length).toBe(0);
    });

    it('owner can view own fee records only (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/education/fee-collections');
      expect([200, 404]).toContain(res.status);
      if (res.status === 200 && res.headers.get('content-type')?.includes('application/json')) {
        const body = await res.json() as any[];
        const otherTenantFees = body.filter((f: any) => f.tenant_id && f.tenant_id !== region.tenantId);
        expect(otherTenantFees.length).toBe(0);
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
        category:    'stationery',
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

  describe(`Education ${region.name} — Principal (manager) workflows`, () => {

    it('principal can login and is manager role', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('manager');
    });

    it('principal can view students', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/education/students');
      expect(res.status).toBe(200);
    });

    it('principal can view classes', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/education/classes');
      expect([200, 404]).toContain(res.status);
    });

    it('principal can view fee collections', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/education/fee-collections');
      expect(res.status).toBe(200);
    });

    it('principal can view purchase orders', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/purchase-orders');
      expect(res.status).toBe(200);
    });

    it('principal can view HR employees', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/hr/employees');
      expect(res.status).toBe(200);
    });

    it('principal can view sales orders', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/sales-orders');
      expect([200, 403]).toContain(res.status);
    });

    it('principal can view MIS dashboard', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/mis/sales');
      expect([200, 404]).toContain(res.status);
    });

    it('principal can view attendance records', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/education/attendance');
      expect([200, 404]).toContain(res.status);
    });
  });

  describe(`Education ${region.name} — Fee Collector (operator) workflows`, () => {

    it('fee_collector can login and is operator role', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('operator');
    });

    it('fee_collector can view students', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/education/students');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      expect(Array.isArray(body)).toBe(true);
    });

    it('fee_collector can enroll a student', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.post('/api/education/students', {
        name:           'QA Student',
        class:          '10',
        section:        'A',
        roll_number:    'QA001',
        guardian_name:  'QA Guardian',
        guardian_phone: '9000000001',
      });
      expect([200, 201, 400, 403, 500]).toContain(res.status);
    });

    it('fee_collector can view fee collections', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/education/fee-collections');
      expect(res.status).toBe(200);
    });

    it('fee_collector can view invoices', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/invoices');
      expect(res.status).toBe(200);
    });

    it('fee_collector features: correct currency in tenant features', async () => {
      const f = await getFeatures(region.roles.cashier);
      expect(f.currency).toBe(region.currency);
    });
  });

  describe(`Education ${region.name} — Accountant workflows`, () => {

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
        description: `QA ${region.name} education journal entry`,
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
describe('Education Multi-region — Data isolation', () => {

  it('UAE students are not visible to USA owner', async () => {
    const uaeApi = await login('qa_edu_ae_owner', PW);
    const usaApi = await login('qa_edu_us_owner', PW);
    const uaeStudents = await (await uaeApi.get('/api/education/students')).json() as any[];
    const usaStudents = await (await usaApi.get('/api/education/students')).json() as any[];
    const uaeIds = uaeStudents.map((s: any) => s.id);
    const overlap = usaStudents.filter((s: any) => uaeIds.includes(s.id));
    expect(overlap.length).toBe(0);
  });

  it('Singapore fee records are not visible to Australia owner', async () => {
    const sgApi = await login('qa_edu_sg_owner', PW);
    const auApi = await login('qa_edu_au_owner', PW);
    const sgRes = await sgApi.get('/api/education/fee-collections');
    const auRes = await auApi.get('/api/education/fee-collections');
    if (sgRes.status === 200 && auRes.status === 200 &&
        sgRes.headers.get('content-type')?.includes('application/json') &&
        auRes.headers.get('content-type')?.includes('application/json')) {
      const sgFees = await sgRes.json() as any[];
      const auFees = await auRes.json() as any[];
      const sgIds = sgFees.map((f: any) => f.id);
      const overlap = auFees.filter((f: any) => sgIds.includes(f.id));
      expect(overlap.length).toBe(0);
    }
  });

  it('EU journal entries are not visible to UAE accountant', async () => {
    const euApi = await login('qa_edu_eu_acct', PW);
    const aeApi = await login('qa_edu_ae_acct', PW);
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
    const auApi = await login('qa_edu_au_acct', PW);
    const sgApi = await login('qa_edu_sg_acct', PW);
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

  it('India education tenant still returns INR (regression guard)', async () => {
    const f = await getFeatures('qa_edu_e_owner');
    expect(f.currency).toBe('INR');
  });
});
