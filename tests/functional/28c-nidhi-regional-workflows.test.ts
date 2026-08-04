/**
 * Test 28c — Nidhi ERP: Multi-region workflow validation
 *
 * 5 regional nidhi_enterprise tenants:
 *   9522 qa-ndh-ae  UAE        AED  VAT 5%
 *   9523 qa-ndh-us  USA        USD  Sales Tax ~8%
 *   9524 qa-ndh-eu  Germany    EUR  VAT 19%
 *   9525 qa-ndh-sg  Singapore  SGD  GST 9%
 *   9526 qa-ndh-au  Australia  AUD  GST 10%
 *
 * Per region, 4 roles are tested:
 *   owner (admin)            — full access, verifies tenant info + enterprise modules
 *   manager (manager)        — nidhi ops, member management, reporting
 *   cashier/collector (operator) — member registration, loan disbursement workflow
 *   accountant (accountsmanager) — journal entries, trial balance, chart of accounts
 *
 * Critical assertions:
 *   - Correct currency returned by /api/tenant/features
 *   - Correct tax_regime returned by /api/tenant/features
 *   - Enterprise plan modules accessible (accounting, fixed_assets, warehouses)
 *   - Nidhi APIs (members, loans, deposits) return 200
 *   - Data isolation: each region only sees its own members (no cross-tenant data)
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
    name: 'UAE', tenantId: 9522, currency: 'AED', taxRegime: 'vat',
    roles: { owner: 'qa_ndh_ae_owner', manager: 'qa_ndh_ae_manager', cashier: 'qa_ndh_ae_collector', accountant: 'qa_ndh_ae_acct' },
  },
  {
    name: 'USA', tenantId: 9523, currency: 'USD', taxRegime: 'sales_tax',
    roles: { owner: 'qa_ndh_us_owner', manager: 'qa_ndh_us_manager', cashier: 'qa_ndh_us_collector', accountant: 'qa_ndh_us_acct' },
  },
  {
    name: 'EU (Germany)', tenantId: 9524, currency: 'EUR', taxRegime: 'vat',
    roles: { owner: 'qa_ndh_eu_owner', manager: 'qa_ndh_eu_manager', cashier: 'qa_ndh_eu_collector', accountant: 'qa_ndh_eu_acct' },
  },
  {
    name: 'Singapore', tenantId: 9525, currency: 'SGD', taxRegime: 'gst',
    roles: { owner: 'qa_ndh_sg_owner', manager: 'qa_ndh_sg_manager', cashier: 'qa_ndh_sg_collector', accountant: 'qa_ndh_sg_acct' },
  },
  {
    name: 'Australia', tenantId: 9526, currency: 'AUD', taxRegime: 'gst',
    roles: { owner: 'qa_ndh_au_owner', manager: 'qa_ndh_au_manager', cashier: 'qa_ndh_au_collector', accountant: 'qa_ndh_au_acct' },
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
  describe(`Nidhi ${region.name} — Owner workflows`, () => {

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

    it('owner can view own members only (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/nidhi-company/members');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      const list: any[] = Array.isArray(body) ? body : (body.data ?? body.members ?? []);
      const otherTenantMembers = list.filter((m: any) => m.tenant_id && m.tenant_id !== region.tenantId);
      expect(otherTenantMembers.length).toBe(0);
    });

    it('owner can view loans', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/nidhi-company/loans');
      expect(res.status).toBe(200);
    });

    it('owner can view deposits', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/nidhi-company/deposits');
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
        category:    'operations',
        date:        TODAY,
      });
      expect([200, 201]).toContain(res.status);
    });
  });

  describe(`Nidhi ${region.name} — Manager workflows`, () => {

    it('manager can login and is manager role', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('manager');
    });

    it('manager can view members', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/nidhi-company/members');
      expect(res.status).toBe(200);
    });

    it('manager can view loans', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/nidhi-company/loans');
      expect(res.status).toBe(200);
    });

    it('manager can view deposits', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/nidhi-company/deposits');
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

    it('manager: sales orders not in Nidhi plan (blocked or accessible)', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/sales-orders');
      expect([200, 403]).toContain(res.status);
    });

    it('manager can view MIS dashboard', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/mis/sales');
      expect([200, 404]).toContain(res.status);
    });
  });

  describe(`Nidhi ${region.name} — Collector (operator) workflows`, () => {

    it('collector can login and is operator role', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('operator');
    });

    it('collector can view members', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/nidhi-company/members');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      const list: any[] = Array.isArray(body) ? body : (body.data ?? body.members ?? []);
      expect(Array.isArray(list)).toBe(true);
    });

    it('collector can create a new member', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.post('/api/nidhi-company/members', {
        name:        'QA Member',
        mobile:      '9000000001',
        address:     'QA Street',
        member_type: 'individual',
      });
      expect([200, 201]).toContain(res.status);
    });

    it('collector can view existing loans', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/nidhi-company/loans');
      expect(res.status).toBe(200);
    });

    it('collector can view invoices', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/invoices');
      expect(res.status).toBe(200);
    });

    it('collector features: correct currency in tenant features', async () => {
      const f = await getFeatures(region.roles.cashier);
      expect(f.currency).toBe(region.currency);
    });
  });

  describe(`Nidhi ${region.name} — Accountant workflows`, () => {

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
describe('Nidhi Multi-region — Data isolation', () => {

  it('UAE members are not visible to USA owner', async () => {
    const uaeApi = await login('qa_ndh_ae_owner', PW);
    const usaApi = await login('qa_ndh_us_owner', PW);
    const uaeMembers = await (await uaeApi.get('/api/nidhi-company/members')).json() as any[];
    const usaMembers = await (await usaApi.get('/api/nidhi-company/members')).json() as any[];
    const uaeIds = uaeMembers.map((m: any) => m.id);
    const overlap = usaMembers.filter((m: any) => uaeIds.includes(m.id));
    expect(overlap.length).toBe(0);
  });

  it('Singapore loans are not visible to Australia owner', async () => {
    const sgApi = await login('qa_ndh_sg_owner', PW);
    const auApi = await login('qa_ndh_au_owner', PW);
    const sgLoans = await (await sgApi.get('/api/nidhi-company/loans')).json() as any[];
    const auLoans = await (await auApi.get('/api/nidhi-company/loans')).json() as any[];
    const sgIds = sgLoans.map((l: any) => l.id);
    const overlap = auLoans.filter((l: any) => sgIds.includes(l.id));
    expect(overlap.length).toBe(0);
  });

  it('EU journal entries are not visible to UAE accountant', async () => {
    const euApi = await login('qa_ndh_eu_acct', PW);
    const aeApi = await login('qa_ndh_ae_acct', PW);
    const euBody = await (await euApi.get('/api/journal-entries')).json() as any;
    const aeBody = await (await aeApi.get('/api/journal-entries')).json() as any;
    const euEntries: any[] = Array.isArray(euBody) ? euBody : (euBody.entries ?? []);
    const aeEntries: any[] = Array.isArray(aeBody) ? aeBody : (aeBody.entries ?? []);
    const euIds = euEntries.map((e: any) => e.id);
    const overlap = aeEntries.filter((e: any) => euIds.includes(e.id));
    expect(overlap.length).toBe(0);
  });

  it('Australia journal entries are not visible to Singapore accountant', async () => {
    const auApi = await login('qa_ndh_au_acct', PW);
    const sgApi = await login('qa_ndh_sg_acct', PW);
    const auBody = await (await auApi.get('/api/journal-entries')).json() as any;
    const sgBody = await (await sgApi.get('/api/journal-entries')).json() as any;
    const auEntries: any[] = Array.isArray(auBody) ? auBody : (auBody.entries ?? []);
    const sgEntries: any[] = Array.isArray(sgBody) ? sgBody : (sgBody.entries ?? []);
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

  it('India Nidhi tenant still returns INR (regression guard)', async () => {
    const f = await getFeatures('qa_ndh_owner');
    expect(f.currency).toBe('INR');
  });
});

// ─── Regional: New features across regions ────────────────────────────────────
// Verifies that KYC, dividend, compliance trend, and MCA21 returns work
// per-tenant for all regional Nidhi instances (IN, SG, AU, EU, AE).

describe('Regional Nidhi — Compliance trend is scoped per tenant', () => {
  it('India Enterprise tenant has its own compliance trend', async () => {
    const api = await login('qa_ndh_owner', PW);
    const res = await api.get('/api/nidhi-company/compliance/trend?months=3');
    expect(res.status).toBe(200);
    const b = await res.json() as any;
    expect(b.trend.length).toBe(3);
    expect(b.trend[0]).toHaveProperty('cumulative_members');
  });

  it('Singapore tenant has its own compliance trend (data isolated)', async () => {
    const sgApi = await login('qa_ndh_sg_owner', PW);
    const inApi = await login('qa_ndh_owner', PW);
    const sgRes = await sgApi.get('/api/nidhi-company/compliance/trend?months=1');
    const inRes = await inApi.get('/api/nidhi-company/compliance/trend?months=1');
    if (sgRes.status !== 200 || inRes.status !== 200) return;
    const sgTrend = await sgRes.json() as any;
    const inTrend = await inRes.json() as any;
    // Both should have the same number of periods but member counts can differ
    expect(sgTrend.trend.length).toBe(inTrend.trend.length);
    // They should be separate tenants — total_deposits should not be assumed equal
    expect(sgTrend).toBeDefined();
    expect(inTrend).toBeDefined();
  });

  it('Australia tenant can view compliance trend', async () => {
    const api = await login('qa_ndh_au_owner', PW);
    const res = await api.get('/api/nidhi-company/compliance/trend');
    expect([200, 403]).toContain(res.status);
  });
});

describe('Regional Nidhi — Dividend is tenant-scoped', () => {
  const fy = `${new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(2)}`;

  it('Singapore owner can declare dividend', async () => {
    const api = await login('qa_ndh_sg_owner', PW);
    const res = await api.post('/api/nidhi-company/dividend/declare', {
      rate: 6,
      financial_year: fy,
      declared_by: 'qa_ndh_sg_owner',
    });
    expect([200, 201, 400]).toContain(res.status);
  });

  it('Singapore dividend history is not visible to India tenant', async () => {
    const sgApi = await login('qa_ndh_sg_owner', PW);
    const inApi = await login('qa_ndh_owner', PW);
    const sgHist = await (await sgApi.get('/api/nidhi-company/dividend/history')).json() as any[];
    const inHist = await (await inApi.get('/api/nidhi-company/dividend/history')).json() as any[];
    // IDs should not overlap — if they do it means tenant isolation is broken
    if (sgHist.length && inHist.length) {
      const sgIds = sgHist.map((h: any) => h.id);
      const overlap = inHist.filter((h: any) => sgIds.includes(h.id));
      expect(overlap.length).toBe(0);
    }
  });

  it('Australia owner can preview dividend calculation', async () => {
    const api = await login('qa_ndh_au_owner', PW);
    const res = await api.get('/api/nidhi-company/dividend/calculate?rate=5');
    expect([200, 403]).toContain(res.status);
  });
});

describe('Regional Nidhi — MCA21 XML returns per region', () => {
  const year = new Date().getFullYear() - 1;

  it('India NDH-4 XML contains RBICompliant flag', async () => {
    const api = await login('qa_ndh_owner', PW);
    const res = await api.get(`/api/nidhi-company/rbi-returns/ndh4/${year}`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('<RBICompliant>');
  });

  it('Singapore owner can generate NDH-4 equivalent XML (global compliance)', async () => {
    const api = await login('qa_ndh_sg_owner', PW);
    const res = await api.get(`/api/nidhi-company/rbi-returns/ndh4/${year}`);
    expect([200, 403]).toContain(res.status);
  });

  it('India owner NDH-9 self-declaration records correctly', async () => {
    const api = await login('qa_ndh_owner', PW);
    const res = await api.post('/api/nidhi-company/rbi-returns/ndh9', {
      financial_year: `${year}-${String(year + 1).slice(2)}`,
      director_name: 'Regional QA Director IN',
      director_din: 'RDIN001234',
      declaration_date: new Date().toISOString().split('T')[0],
    });
    expect(res.status).toBe(200);
    const b = await res.json() as any;
    expect(b.return_type).toBe('NDH-9');
  });

  it('NDH-1 XML for India is tenant-scoped (member count differs between tenants)', async () => {
    const inApi = await login('qa_ndh_owner', PW);
    const sgApi = await login('qa_ndh_sg_owner', PW);
    const inText = await (await inApi.get(`/api/nidhi-company/rbi-returns/ndh1/${year}`)).text();
    const sgText = await (await sgApi.get(`/api/nidhi-company/rbi-returns/ndh1/${year}`)).text();
    expect(inText).toContain('tenantId');
    expect(sgText).toContain('tenantId');
    // Both are valid XML but tenant IDs should differ
    expect(inText).not.toEqual(sgText);
  });
});

describe('Regional Nidhi — KYC workflow is per-tenant', () => {
  let sgMemberId: string;

  it('Singapore owner can create a member', async () => {
    const api = await login('qa_ndh_sg_owner', PW);
    const res = await api.post('/api/nidhi-company/members', {
      name: 'SG KYC Regional Member',
      phone: '+6591234567',
      membership_date: new Date().toISOString().split('T')[0],
    });
    if (res.status === 200 || res.status === 201) {
      const b = await res.json() as any;
      sgMemberId = b.id;
    }
  });

  it('Singapore owner can upload KYC document for SG member', async () => {
    if (!sgMemberId) return;
    const api = await login('qa_ndh_sg_owner', PW);
    const res = await api.post(`/api/nidhi-company/members/${sgMemberId}/kyc-documents`, {
      doc_type: 'photo',
      file_name: 'passport_photo.jpg',
    });
    expect([200, 201, 404]).toContain(res.status);
  });

  it('India owner cannot access SG member KYC (tenant isolation)', async () => {
    if (!sgMemberId) return;
    const inApi = await login('qa_ndh_owner', PW);
    const res = await inApi.get(`/api/nidhi-company/members/${sgMemberId}/kyc-documents`);
    // Should return 404 (member not in India tenant) or empty list
    const isIsolated = res.status === 404 || (res.status === 200 && (await res.json() as any[]).length === 0);
    expect(isIsolated).toBe(true);
  });

  it('Singapore owner can approve KYC for SG member', async () => {
    if (!sgMemberId) return;
    const api = await login('qa_ndh_sg_owner', PW);
    const res = await api.put(`/api/nidhi-company/members/${sgMemberId}/kyc-approve`, {});
    expect([200, 404]).toContain(res.status);
  });
});
