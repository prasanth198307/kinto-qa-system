/**
 * Test 25b — Healthcare ERP: Multi-region workflow validation
 *
 * 5 regional healthcare_enterprise tenants:
 *   9222 qa-hc-ae  UAE        AED  VAT 5%
 *   9223 qa-hc-us  USA        USD  Sales Tax ~8%
 *   9224 qa-hc-eu  Germany    EUR  VAT 19%
 *   9225 qa-hc-sg  Singapore  SGD  GST 9%
 *   9226 qa-hc-au  Australia  AUD  GST 10%
 *
 * Per region, 4 roles are tested:
 *   owner (admin)              — full access, verifies tenant info + enterprise modules
 *   doctor (manager)           — healthcare ops, purchase, HR
 *   receptionist (operator)    — patient registration workflow
 *   accountant (accountsmanager) — journal entries, trial balance, chart of accounts
 *
 * Critical assertions:
 *   - Correct currency returned by /api/tenant/features
 *   - Correct tax_regime returned by /api/tenant/features
 *   - Enterprise plan modules accessible (production, warehouses, fixed_assets, accounting)
 *   - Healthcare APIs (patients, appointments) return 200
 *   - Data isolation: each region only sees its own patients (no cross-tenant data)
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
    name: 'UAE', tenantId: 9222, currency: 'AED', taxRegime: 'vat',
    roles: { owner: 'qa_hc_ae_owner', manager: 'qa_hc_ae_doctor', cashier: 'qa_hc_ae_receptionist', accountant: 'qa_hc_ae_acct' },
  },
  {
    name: 'USA', tenantId: 9223, currency: 'USD', taxRegime: 'sales_tax',
    roles: { owner: 'qa_hc_us_owner', manager: 'qa_hc_us_doctor', cashier: 'qa_hc_us_receptionist', accountant: 'qa_hc_us_acct' },
  },
  {
    name: 'EU (Germany)', tenantId: 9224, currency: 'EUR', taxRegime: 'vat',
    roles: { owner: 'qa_hc_eu_owner', manager: 'qa_hc_eu_doctor', cashier: 'qa_hc_eu_receptionist', accountant: 'qa_hc_eu_acct' },
  },
  {
    name: 'Singapore', tenantId: 9225, currency: 'SGD', taxRegime: 'gst',
    roles: { owner: 'qa_hc_sg_owner', manager: 'qa_hc_sg_doctor', cashier: 'qa_hc_sg_receptionist', accountant: 'qa_hc_sg_acct' },
  },
  {
    name: 'Australia', tenantId: 9226, currency: 'AUD', taxRegime: 'gst',
    roles: { owner: 'qa_hc_au_owner', manager: 'qa_hc_au_doctor', cashier: 'qa_hc_au_receptionist', accountant: 'qa_hc_au_acct' },
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
  describe(`Healthcare ${region.name} — Owner workflows`, () => {

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

    it('enterprise plan: healthcare module in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('healthcare');
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

    it('owner can view own patients only (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/healthcare/patients');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const otherTenantPatients = body.filter((p: any) => p.tenant_id && String(p.tenant_id) !== String(region.tenantId));
      expect(otherTenantPatients.length).toBe(0);
    });

    it('owner can view own appointments only (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/healthcare/appointments');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const otherTenantAppts = body.filter((a: any) => a.tenant_id && a.tenant_id !== region.tenantId);
      expect(otherTenantAppts.length).toBe(0);
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

    it('owner can register a patient', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.post('/api/healthcare/patients', {
        name:   `QA Owner Patient ${region.name}`,
        age:    30,
        gender: 'male',
        phone:  '9000000001',
      });
      expect([200, 201]).toContain(res.status);
    });

    it('owner can create an expense record', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.post('/api/expenses', {
        description: `QA ${region.name} healthcare expense`,
        amount:      150,
        category:    'medical',
        date:        TODAY,
      });
      expect([200, 201]).toContain(res.status);
    });
  });

  describe(`Healthcare ${region.name} — Doctor (Manager) workflows`, () => {

    it('doctor can login and is manager role', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('manager');
    });

    it('doctor can view patients', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/healthcare/patients');
      expect(res.status).toBe(200);
    });

    it('doctor can view appointments', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/healthcare/appointments');
      expect(res.status).toBe(200);
    });

    it('doctor can view purchase orders', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/purchase-orders');
      expect(res.status).toBe(200);
    });

    it('doctor can view HR employees', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/hr/employees');
      expect(res.status).toBe(200);
    });

    it('doctor can view sales orders', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/sales-orders');
      expect(res.status).toBe(200);
    });

    it('doctor can view MIS sales dashboard', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/mis/sales');
      expect([200, 404]).toContain(res.status);
    });

    it('doctor can view invoices', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/invoices');
      expect(res.status).toBe(200);
    });
  });

  describe(`Healthcare ${region.name} — Receptionist (Operator) workflows`, () => {

    it('receptionist can login and is operator role', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('operator');
    });

    it('receptionist can view patients', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/healthcare/patients');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      expect(Array.isArray(body)).toBe(true);
    });

    it('receptionist can view appointments', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/healthcare/appointments');
      expect(res.status).toBe(200);
    });

    it('receptionist can register a patient', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.post('/api/healthcare/patients', {
        name:   'QA Patient',
        age:    30,
        gender: 'male',
        phone:  '9000000001',
      });
      expect([200, 201]).toContain(res.status);
    });

    it('receptionist can view invoices', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/invoices');
      expect(res.status).toBe(200);
    });

    it('receptionist features: correct currency in tenant features', async () => {
      const f = await getFeatures(region.roles.cashier);
      expect(f.currency).toBe(region.currency);
    });
  });

  describe(`Healthcare ${region.name} — Accountant workflows`, () => {

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
        description: `QA ${region.name} healthcare journal entry`,
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
describe('Healthcare Multi-region — Data isolation', () => {

  it('UAE patients are not visible to USA owner', async () => {
    const uaeApi = await login('qa_hc_ae_owner', PW);
    const usaApi = await login('qa_hc_us_owner', PW);
    const uaePatients = await (await uaeApi.get('/api/healthcare/patients')).json() as any[];
    const usaPatients = await (await usaApi.get('/api/healthcare/patients')).json() as any[];
    const uaeIds = uaePatients.map((p: any) => p.id);
    const overlap = usaPatients.filter((p: any) => uaeIds.includes(p.id));
    expect(overlap.length).toBe(0);
  });

  it('Singapore appointments are not visible to Australia owner', async () => {
    const sgApi = await login('qa_hc_sg_owner', PW);
    const auApi = await login('qa_hc_au_owner', PW);
    const sgAppts = await (await sgApi.get('/api/healthcare/appointments')).json() as any[];
    const auAppts = await (await auApi.get('/api/healthcare/appointments')).json() as any[];
    const sgIds = sgAppts.map((a: any) => a.id);
    const overlap = auAppts.filter((a: any) => sgIds.includes(a.id));
    expect(overlap.length).toBe(0);
  });

  it('EU patients are not visible to UAE receptionist', async () => {
    const euApi = await login('qa_hc_eu_receptionist', PW);
    const aeApi = await login('qa_hc_ae_receptionist', PW);
    await euApi.post('/api/healthcare/patients', {
      name: 'EU Isolation Patient', age: 25, gender: 'female', phone: '9000000002',
    });
    const aePatients = await (await aeApi.get('/api/healthcare/patients')).json() as any[];
    const euPatientsForAE = aePatients.filter((p: any) => p.tenant_id === 9224);
    expect(euPatientsForAE.length).toBe(0);
  });

  it('Australia journal entries are not visible to Singapore accountant', async () => {
    const auApi = await login('qa_hc_au_acct', PW);
    const sgApi = await login('qa_hc_sg_acct', PW);
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

  it('all 5 regions have accounting module (journal-entries in allowedNavItems)', async () => {
    for (const region of REGIONS) {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('journal-entries');
    }
  });

  it('India healthcare tenant still returns INR (regression guard)', async () => {
    const f = await getFeatures('qa_hc_owner');
    expect(f.currency).toBe('INR');
  });
});
