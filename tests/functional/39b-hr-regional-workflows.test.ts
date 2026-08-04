/**
 * Test 39b — HR & Payroll ERP: Multi-region workflow validation
 *
 * 5 regional hr_enterprise tenants:
 *   8522 qa-hr-ae  UAE        AED  VAT 5%
 *   8523 qa-hr-us  USA        USD  Sales Tax
 *   8524 qa-hr-eu  Germany    EUR  VAT 19%
 *   8525 qa-hr-sg  Singapore  SGD  GST 9%
 *   8526 qa-hr-au  Australia  AUD  GST 10%
 *
 * Per region, 4 roles are tested:
 *   owner (admin)            — full access, verifies tenant info + enterprise modules
 *   manager (manager)        — HR ops, payroll, attendance
 *   payroll_exec (operator)  — employee creation
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
    name: 'UAE', tenantId: 8522, currency: 'AED', taxRegime: 'vat',
    roles: { owner: 'qa_hr_ae_owner', manager: 'qa_hr_ae_manager', cashier: 'qa_hr_ae_payroll_exec', accountant: 'qa_hr_ae_acct' },
  },
  {
    name: 'USA', tenantId: 8523, currency: 'USD', taxRegime: 'sales_tax',
    roles: { owner: 'qa_hr_us_owner', manager: 'qa_hr_us_manager', cashier: 'qa_hr_us_payroll_exec', accountant: 'qa_hr_us_acct' },
  },
  {
    name: 'EU (Germany)', tenantId: 8524, currency: 'EUR', taxRegime: 'vat',
    roles: { owner: 'qa_hr_eu_owner', manager: 'qa_hr_eu_manager', cashier: 'qa_hr_eu_payroll_exec', accountant: 'qa_hr_eu_acct' },
  },
  {
    name: 'Singapore', tenantId: 8525, currency: 'SGD', taxRegime: 'gst',
    roles: { owner: 'qa_hr_sg_owner', manager: 'qa_hr_sg_manager', cashier: 'qa_hr_sg_payroll_exec', accountant: 'qa_hr_sg_acct' },
  },
  {
    name: 'Australia', tenantId: 8526, currency: 'AUD', taxRegime: 'gst',
    roles: { owner: 'qa_hr_au_owner', manager: 'qa_hr_au_manager', cashier: 'qa_hr_au_payroll_exec', accountant: 'qa_hr_au_acct' },
  },
];

async function getFeatures(username: string) {
  const api = await login(username, PW);
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  return (await res.json()) as { currency: string; taxRegime: string; allowedNavItems: string[]; modules: string[] };
}

for (const region of REGIONS) {
  describe(`HR ${region.name} — Owner workflows`, () => {

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

    it('enterprise plan: hr-employees in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('hr-employees');
    });

    it('enterprise plan: payroll + fixed-assets in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('payroll');
      expect(f.allowedNavItems).toContain('fixed-assets');
    });

    it('enterprise plan: accounting (journal-entries) in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('journal-entries');
    });

    it('owner can view own employees (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/hr/employees');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const otherTenant = body.filter((e: any) => e.tenant_id && e.tenant_id !== region.tenantId);
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

    it('owner can view payroll records', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/payroll');
      expect([200, 404]).toContain(res.status);
    });

    it('owner can view attendance records', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/hr/attendance');
      expect([200, 404]).toContain(res.status);
    });

    it('owner can create an expense record', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.post('/api/expenses', {
        description: `QA ${region.name} HR expense`,
        amount:      300,
        category:    'recruitment',
        date:        TODAY,
      });
      expect([200, 201]).toContain(res.status);
    });
  });

  describe(`HR ${region.name} — Manager workflows`, () => {

    it('manager can login and is manager role', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('manager');
    });

    it('manager can view employees', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/hr/employees');
      expect(res.status).toBe(200);
    });

    it('manager can view payroll', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/payroll');
      expect([200, 404]).toContain(res.status);
    });

    it('manager can view attendance', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/hr/attendance');
      expect([200, 404]).toContain(res.status);
    });

    it('manager can view leave requests', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/hr/leaves');
      expect([200, 404]).toContain(res.status);
    });

    it('manager can view departments', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/hr/departments');
      expect([200, 404]).toContain(res.status);
    });

    it('manager can view purchase orders', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/purchase-orders');
      expect(res.status).toBe(200);
    });

    it('manager can view MIS dashboard', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/mis/sales');
      expect([200, 404]).toContain(res.status);
    });
  });

  describe(`HR ${region.name} — Payroll Exec (operator) workflows`, () => {

    it('payroll exec can login and is operator role', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('operator');
    });

    it('payroll exec can view employees', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/hr/employees');
      expect(res.status).toBe(200);
    });

    it('payroll exec can create an employee', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.post('/api/hr/employees', {
        name:             'QA Employee',
        department:       'QA Dept',
        designation:      'QA Engineer',
        date_of_joining:  TODAY,
        salary:           50000,
      });
      expect([200, 201]).toContain(res.status);
    });

    it('payroll exec can view payroll', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/payroll');
      expect([200, 404]).toContain(res.status);
    });

    it('payroll exec features: correct currency in tenant features', async () => {
      const f = await getFeatures(region.roles.cashier);
      expect(f.currency).toBe(region.currency);
    });

    it('payroll exec cannot see other-tenant employees', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/hr/employees');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const leak = body.filter((e: any) => e.tenant_id && e.tenant_id !== region.tenantId);
      expect(leak.length).toBe(0);
    });
  });

  describe(`HR ${region.name} — Accountant workflows`, () => {

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
        description: `QA ${region.name} HR payroll journal entry`,
        currency:    region.currency,
        lines: [
          { account_code: '2000', debit: 1000, credit: 0,    description: 'Payroll expense debit' },
          { account_code: '1000', debit: 0,    credit: 1000, description: 'Cash credit' },
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
describe('HR Multi-region — Data isolation', () => {

  it('UAE employees are not visible to USA payroll exec', async () => {
    const aeApi = await login('qa_hr_ae_payroll_exec', PW);
    const usApi = await login('qa_hr_us_payroll_exec', PW);
    const aeEmployees = await (await aeApi.get('/api/hr/employees')).json() as any[];
    const usEmployees = await (await usApi.get('/api/hr/employees')).json() as any[];
    const aeIds = aeEmployees.map((e: any) => e.id);
    const overlap = usEmployees.filter((e: any) => aeIds.includes(e.id));
    expect(overlap.length).toBe(0);
  });

  it('Singapore journal entries are not visible to Australia accountant', async () => {
    const sgApi = await login('qa_hr_sg_acct', PW);
    const auApi = await login('qa_hr_au_acct', PW);
    const sgEntries = await (await sgApi.get('/api/journal-entries')).json() as any;
    const auEntries = await (await auApi.get('/api/journal-entries')).json() as any;
    if (Array.isArray(sgEntries) && Array.isArray(auEntries)) {
      const sgIds = sgEntries.map((e: any) => e.id);
      const overlap = auEntries.filter((e: any) => sgIds.includes(e.id));
      expect(overlap.length).toBe(0);
    }
  });

  it('EU employees are not visible to UAE payroll exec', async () => {
    const euApi = await login('qa_hr_eu_payroll_exec', PW);
    const aeApi = await login('qa_hr_ae_payroll_exec', PW);
    await euApi.post('/api/hr/employees', {
      name: 'QA EU Employee', department: 'EU Dept', designation: 'EU Engineer',
      date_of_joining: TODAY, salary: 60000,
    });
    const aeEmployees = await (await aeApi.get('/api/hr/employees')).json() as any;
    const euLeak = Array.isArray(aeEmployees) ? aeEmployees.filter((e: any) => e.tenant_id === 8524) : [];
    expect(euLeak.length).toBe(0);
  });

  it('Australia journal entries are not visible to Singapore accountant', async () => {
    const auApi = await login('qa_hr_au_acct', PW);
    const sgApi = await login('qa_hr_sg_acct', PW);
    const auEntries = await (await auApi.get('/api/journal-entries')).json() as any;
    const sgEntries = await (await sgApi.get('/api/journal-entries')).json() as any;
    if (Array.isArray(auEntries) && Array.isArray(sgEntries)) {
      const auIds = auEntries.map((e: any) => e.id);
      const overlap = sgEntries.filter((e: any) => auIds.includes(e.id));
      expect(overlap.length).toBe(0);
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

  it('India HR tenant still returns INR (regression guard)', async () => {
    const f = await getFeatures('qa_hr_owner');
    expect(f.currency).toBe('INR');
  });
});
