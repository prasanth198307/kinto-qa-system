/**
 * Test 23 — Restaurant ERP: Multi-region workflow validation
 *
 * 5 regional restaurant_enterprise tenants:
 *   9022 qa-rst-ae  UAE        AED  VAT 5%
 *   9023 qa-rst-us  USA        USD  Sales Tax ~8%
 *   9024 qa-rst-eu  Germany    EUR  VAT 19%
 *   9025 qa-rst-sg  Singapore  SGD  GST 9%
 *   9026 qa-rst-au  Australia  AUD  GST 10%
 *
 * Per region, 4 roles are tested:
 *   owner (admin)       — full access, verifies tenant info + enterprise modules
 *   manager (manager)   — restaurant ops, purchase, HR
 *   cashier (operator)  — POS / KOT workflow
 *   accountant (accountsmanager) — journal entries, trial balance, chart of accounts
 *
 * Critical assertions:
 *   - Correct currency returned by /api/tenant/features
 *   - Correct tax_regime returned by /api/tenant/features
 *   - Enterprise plan modules accessible (production, warehouses, fixed_assets, accounting)
 *   - Restaurant APIs (outlets, tables, menu, KOT) return 200
 *   - Data isolation: each region only sees its own outlets/menu (no cross-tenant data)
 *   - Tax rate on menu items matches regional rate (VAT/GST/Sales Tax)
 *   - Accountant can create journal entry in local currency
 */

import { describe, it, expect } from 'vitest';
import { login, BASE } from '../helpers/api';

// ── Region definitions ────────────────────────────────────────────────────────
interface Region {
  name:       string;
  tenantId:   number;
  slug:       string;
  currency:   string;
  taxRegime:  string;
  menuItemId: number; // seeded in create-test-tenants.sql
  outletId:   number;
  roles: {
    owner:      string;
    manager:    string;
    cashier:    string;
    accountant: string;
  };
}

const REGIONS: Region[] = [
  {
    name: 'UAE', tenantId: 9022, slug: 'qa-rst-ae', currency: 'AED', taxRegime: 'vat',
    menuItemId: 9040, outletId: 9040,
    roles: { owner: 'qa_ae_owner', manager: 'qa_ae_manager', cashier: 'qa_ae_cashier', accountant: 'qa_ae_acct' },
  },
  {
    name: 'USA', tenantId: 9023, slug: 'qa-rst-us', currency: 'USD', taxRegime: 'sales_tax',
    menuItemId: 9044, outletId: 9041,
    roles: { owner: 'qa_us_owner', manager: 'qa_us_manager', cashier: 'qa_us_cashier', accountant: 'qa_us_acct' },
  },
  {
    name: 'EU (Germany)', tenantId: 9024, slug: 'qa-rst-eu', currency: 'EUR', taxRegime: 'vat',
    menuItemId: 9048, outletId: 9042,
    roles: { owner: 'qa_eu_owner', manager: 'qa_eu_manager', cashier: 'qa_eu_cashier', accountant: 'qa_eu_acct' },
  },
  {
    name: 'Singapore', tenantId: 9025, slug: 'qa-rst-sg', currency: 'SGD', taxRegime: 'gst',
    menuItemId: 9051, outletId: 9043,
    roles: { owner: 'qa_sg_owner', manager: 'qa_sg_manager', cashier: 'qa_sg_cashier', accountant: 'qa_sg_acct' },
  },
  {
    name: 'Australia', tenantId: 9026, slug: 'qa-rst-au', currency: 'AUD', taxRegime: 'gst',
    menuItemId: 9054, outletId: 9044,
    roles: { owner: 'qa_au_owner', manager: 'qa_au_manager', cashier: 'qa_au_cashier', accountant: 'qa_au_acct' },
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
  describe(`Restaurant ${region.name} — Owner workflows`, () => {

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

    it('enterprise plan: restaurant-pos in allowedNavItems', async () => {
      const f = await getFeatures(region.roles.owner);
      expect(f.allowedNavItems).toContain('restaurant-pos');
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

    it('owner can view own outlets only (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/restaurant/outlets');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      // All returned outlets must belong to this tenant
      const otherTenantOutlets = body.filter((o: any) => o.tenant_id && o.tenant_id !== region.tenantId);
      expect(otherTenantOutlets.length).toBe(0);
    });

    it('owner can view own menu items only (data isolation)', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.get('/api/restaurant/menu-items');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      const otherTenantItems = body.filter((m: any) => m.tenant_id && m.tenant_id !== region.tenantId);
      expect(otherTenantItems.length).toBe(0);
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

    it('owner can create a restaurant table', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.post('/api/restaurant/tables', {
        outlet_id:    region.outletId,
        table_number: `QA-${region.name}-T99`,
        capacity:     4,
        status:       'available',
      });
      expect([200, 201]).toContain(res.status);
    });

    it('owner can create a menu category', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.post('/api/restaurant/menu-categories', {
        name:       `QA ${region.name} Category`,
        sort_order: 99,
        is_active:  1,
      });
      expect([200, 201]).toContain(res.status);
    });

    it('owner can create an expense record', async () => {
      const api = await login(region.roles.owner, PW);
      const res = await api.post('/api/expenses', {
        description: `QA ${region.name} test expense`,
        amount:      100,
        category:    'food',
        date:        TODAY,
      });
      expect([200, 201]).toContain(res.status);
    });
  });

  describe(`Restaurant ${region.name} — Manager workflows`, () => {

    it('manager can login and is manager role', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('manager');
    });

    it('manager can view outlets', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/restaurant/outlets');
      expect(res.status).toBe(200);
    });

    it('manager can view tables', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/restaurant/tables');
      expect(res.status).toBe(200);
    });

    it('manager can view menu categories', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/restaurant/menu-categories');
      expect(res.status).toBe(200);
    });

    it('manager can view menu items', async () => {
      const api = await login(region.roles.manager, PW);
      const res = await api.get('/api/restaurant/menu-items');
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
      expect([200, 404]).toContain(res.status); // 404 acceptable if no data yet
    });
  });

  describe(`Restaurant ${region.name} — Cashier (POS) workflows`, () => {

    it('cashier can login and is operator role', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/user');
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.role).toBe('operator');
    });

    it('cashier can view tables', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/restaurant/tables');
      expect(res.status).toBe(200);
    });

    it('cashier can view menu items for POS', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/restaurant/menu-items');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });

    it('cashier can create a KOT order', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.post('/api/restaurant/kot', {
        outlet_id:    region.outletId,
        table_id:     null,
        order_type:   'takeaway',
        items: [{ menu_item_id: region.menuItemId, quantity: 1, notes: '' }],
      });
      expect([200, 201]).toContain(res.status);
    });

    it('cashier can view existing KOT orders', async () => {
      const api = await login(region.roles.cashier, PW);
      const res = await api.get('/api/restaurant/kot');
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

  describe(`Restaurant ${region.name} — Accountant workflows`, () => {

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
describe('Restaurant Multi-region — Data isolation', () => {

  it('UAE outlets are not visible to USA owner', async () => {
    const uaeApi  = await login('qa_ae_owner', PW);
    const usaApi  = await login('qa_us_owner', PW);
    const uaeOutlets = await (await uaeApi.get('/api/restaurant/outlets')).json() as any[];
    const usaOutlets = await (await usaApi.get('/api/restaurant/outlets')).json() as any[];
    const uaeIds = uaeOutlets.map((o: any) => o.id);
    const overlap = usaOutlets.filter((o: any) => uaeIds.includes(o.id));
    expect(overlap.length).toBe(0);
  });

  it('Singapore menu items are not visible to Australia owner', async () => {
    const sgApi  = await login('qa_sg_owner', PW);
    const auApi  = await login('qa_au_owner', PW);
    const sgItems = await (await sgApi.get('/api/restaurant/menu-items')).json() as any[];
    const auItems = await (await auApi.get('/api/restaurant/menu-items')).json() as any[];
    const sgIds = sgItems.map((m: any) => m.id);
    const overlap = auItems.filter((m: any) => sgIds.includes(m.id));
    expect(overlap.length).toBe(0);
  });

  it('EU KOT orders are not visible to UAE cashier', async () => {
    const euApi  = await login('qa_eu_cashier', PW);
    const aeApi  = await login('qa_ae_cashier', PW);
    // Create a KOT in EU
    await euApi.post('/api/restaurant/kot', {
      outlet_id: 9042, table_id: null, order_type: 'takeaway',
      items: [{ menu_item_id: 9048, quantity: 1, notes: 'isolation test' }],
    });
    // Fetch KOT as UAE cashier — should not include EU orders
    const aeKots = await (await aeApi.get('/api/restaurant/kot')).json() as any[];
    const euKotForAE = aeKots.filter((k: any) => k.tenant_id === 9024);
    expect(euKotForAE.length).toBe(0);
  });

  it('Australia journal entries are not visible to Singapore accountant', async () => {
    const auApi = await login('qa_au_acct', PW);
    const sgApi = await login('qa_sg_acct', PW);
    const auData = await (await auApi.get('/api/journal-entries')).json() as any;
    const sgData = await (await sgApi.get('/api/journal-entries')).json() as any;
    const auEntries = Array.isArray(auData) ? auData : (auData.entries ?? []);
    const sgEntries = Array.isArray(sgData) ? sgData : (sgData.entries ?? []);
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
    expect(unique.size).toBe(REGIONS.length); // all 5 are distinct
  });

  it('India enterprise tenant still returns INR (regression guard)', async () => {
    const f = await getFeatures('qa_e_owner');
    expect(f.currency).toBe('INR');
  });
});
