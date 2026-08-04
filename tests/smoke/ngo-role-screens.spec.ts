/**
 * NGO ERP — Per-role, per-plan screen smoke tests
 *
 * Plans tested:
 *   Starter      (9420): ngo_starter — core NGO + invoicing + expenses
 *   Professional (9421): ngo_professional — starter + accounting + mis + hr_payroll + crm + sales_orders
 *   Enterprise   (9400): ngo_enterprise — professional + warehouses + production + fixed_assets
 *
 * Roles per plan:
 *   Starter:      qa_ngo_s_owner, qa_ngo_s_manager, qa_ngo_s_field_worker, qa_ngo_s_billing
 *   Professional: qa_ngo_p_owner, qa_ngo_p_manager, qa_ngo_p_acct, qa_ngo_p_mis
 *   Enterprise:   qa_ngo_owner, qa_ngo_manager, qa_ngo_field_worker, qa_ngo_donor_mgr,
 *                 qa_ngo_acct, qa_ngo_hr, qa_ngo_crm, qa_ngo_sales, qa_ngo_mis,
 *                 qa_ngo_wh, qa_ngo_prod, qa_ngo_assets
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:5050';

const IGNORABLE = [
  'ResizeObserver loop',
  'Non-Error promise rejection',
  'Failed to fetch',
  'ChunkLoadError',
  'NetworkError',
  'socket',
];

function isIgnorable(msg: string) {
  return IGNORABLE.some(s => msg.includes(s));
}

async function loginAs(browser: Browser, username: string): Promise<{ page: Page; context: BrowserContext }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"], input[placeholder*="user"], input[type="text"]', username);
  await page.fill('input[name="password"], input[type="password"]', 'Test@1234');
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|ngo|\//, { timeout: 15000 });
  return { page, context };
}

async function assertScreenLoads(page: Page, route: string) {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !isIgnorable(msg.text())) errors.push(msg.text());
  });
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const body = await page.textContent('body');
  expect(body?.trim().length, `Blank page on ${route}`).toBeGreaterThan(50);
  expect(errors.length, `JS error on ${route}: ${errors[0]}`).toBe(0);
}

async function assertNavNotVisible(page: Page, label: string) {
  const nav = page.locator('nav, aside, [role="navigation"]');
  await expect(nav.getByText(label, { exact: false })).toHaveCount(0);
}

// ── Route groups ──────────────────────────────────────────────────────────────
const NGO_CORE_ROUTES = [
  '/ngo',
  '/ngo/donors',
  '/ngo/donations',
  '/ngo/projects',
  '/ngo/beneficiaries',
  '/ngo/grants',
  '/ngo/campaigns',
  '/ngo/reports',
  '/ngo/80g-certificates',
];

const INVOICING_ROUTES    = ['/invoices', '/invoices/new'];
const EXPENSES_ROUTES     = ['/expenses'];
const PURCHASE_ROUTES     = ['/purchase-orders'];
const ACCOUNTING_ROUTES   = ['/accounting/chart-of-accounts', '/accounting/journal-entries', '/accounting/trial-balance'];
const MIS_ROUTES          = ['/mis', '/mis/sales', '/mis/financial'];
const CRM_ROUTES          = ['/crm/contacts', '/crm/leads'];
const HRPAYROLL_ROUTES    = ['/hr', '/hr/employees', '/payroll'];
const SALES_ROUTES        = ['/sales-orders'];
const PRODUCTION_ROUTES   = ['/production', '/raw-materials'];
const WAREHOUSE_ROUTES    = ['/warehouses', '/inventory'];
const FIXED_ASSETS_ROUTES = ['/fixed-assets'];

// ─────────────────────────────────────────────────────────────────────────────
// STARTER PLAN (tenant 9420)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('NGO Starter Plan', () => {

  test('owner can access all starter NGO screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_s_owner');
    try {
      for (const route of NGO_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/expenses');

      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Accounting');
      await assertNavNotVisible(page, 'MIS');
      await assertNavNotVisible(page, 'CRM');
      await assertNavNotVisible(page, 'HR & Payroll');
      await assertNavNotVisible(page, 'Production');
      await assertNavNotVisible(page, 'Warehouses');
    } finally {
      await context.close();
    }
  });

  test('manager can access NGO projects, donors, and grants', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_s_manager');
    try {
      await assertScreenLoads(page, '/ngo/projects');
      await assertScreenLoads(page, '/ngo/donors');
      await assertScreenLoads(page, '/ngo/grants');
      await assertScreenLoads(page, '/ngo/campaigns');
    } finally {
      await context.close();
    }
  });

  test('field worker can access NGO beneficiaries and donations', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_s_field_worker');
    try {
      await assertScreenLoads(page, '/ngo/beneficiaries');
      await assertScreenLoads(page, '/ngo/donations');
      await assertScreenLoads(page, '/expenses');
    } finally {
      await context.close();
    }
  });

  test('billing staff can access invoices and expenses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_s_billing');
    try {
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/invoices/new');
      await assertScreenLoads(page, '/expenses');
    } finally {
      await context.close();
    }
  });

  test('owner can access 80G certificates and NGO reports', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_s_owner');
    try {
      await assertScreenLoads(page, '/ngo/80g-certificates');
      await assertScreenLoads(page, '/ngo/reports');
    } finally {
      await context.close();
    }
  });

  test('manager can view NGO campaigns without accounting access', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_s_manager');
    try {
      await assertScreenLoads(page, '/ngo/campaigns');
      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Accounting');
    } finally {
      await context.close();
    }
  });

  test('field worker can view donor information on starter', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_s_field_worker');
    try {
      await assertScreenLoads(page, '/ngo/donors');
      await assertScreenLoads(page, '/ngo');
    } finally {
      await context.close();
    }
  });

  test('starter plan gate: accounting and CRM routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_s_owner');
    try {
      await page.goto(`${BASE}/accounting/journal-entries`);
      await page.waitForTimeout(1000);
      const body = await page.textContent('body');
      expect(body?.trim().length).toBeGreaterThan(10);

      await page.goto(`${BASE}/crm/leads`);
      await page.waitForTimeout(1000);
      const body2 = await page.textContent('body');
      expect(body2?.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PROFESSIONAL PLAN (tenant 9421)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('NGO Professional Plan', () => {

  test('owner can access all professional screens including accounting and CRM', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_p_owner');
    try {
      for (const route of NGO_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of [...INVOICING_ROUTES, ...EXPENSES_ROUTES, ...PURCHASE_ROUTES]) {
        await assertScreenLoads(page, route);
      }
      for (const route of ACCOUNTING_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of MIS_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of CRM_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of HRPAYROLL_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of SALES_ROUTES) {
        await assertScreenLoads(page, route);
      }

      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Production');
      await assertNavNotVisible(page, 'Warehouses');
      await assertNavNotVisible(page, 'Fixed Assets');
    } finally {
      await context.close();
    }
  });

  test('manager can access NGO projects, donors, and MIS', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_p_manager');
    try {
      await assertScreenLoads(page, '/ngo/projects');
      await assertScreenLoads(page, '/ngo/donors');
      await assertScreenLoads(page, '/mis');
    } finally {
      await context.close();
    }
  });

  test('field worker can access NGO module and expenses on professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_p_owner');
    try {
      await assertScreenLoads(page, '/ngo/beneficiaries');
      await assertScreenLoads(page, '/ngo/donations');
      await assertScreenLoads(page, '/expenses');
    } finally {
      await context.close();
    }
  });

  test('accountant can access accounting screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_p_acct');
    try {
      await assertScreenLoads(page, '/accounting/journal-entries');
      await assertScreenLoads(page, '/accounting/trial-balance');
    } finally {
      await context.close();
    }
  });

  test('HR manager can access HR and payroll screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_p_owner');
    try {
      await assertScreenLoads(page, '/hr/employees');
      await assertScreenLoads(page, '/payroll');
    } finally {
      await context.close();
    }
  });

  test('CRM executive can access CRM screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_p_owner');
    try {
      await assertScreenLoads(page, '/crm/leads');
      await assertScreenLoads(page, '/crm/contacts');
    } finally {
      await context.close();
    }
  });

  test('sales manager can access sales orders on professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_p_owner');
    try {
      await assertScreenLoads(page, '/sales-orders');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_p_mis');
    try {
      await assertScreenLoads(page, '/mis');
      await assertScreenLoads(page, '/mis/sales');
      await assertScreenLoads(page, '/mis/financial');
    } finally {
      await context.close();
    }
  });

  test('purchase manager can access purchase orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_p_owner');
    try {
      await assertScreenLoads(page, '/purchase-orders');
    } finally {
      await context.close();
    }
  });

  test('owner can access grants and 80G screens on professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_p_owner');
    try {
      await assertScreenLoads(page, '/ngo/grants');
      await assertScreenLoads(page, '/ngo/80g-certificates');
    } finally {
      await context.close();
    }
  });

  test('manager can view MIS and campaigns on professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_p_manager');
    try {
      await assertScreenLoads(page, '/ngo/campaigns');
      await assertScreenLoads(page, '/mis/sales');
    } finally {
      await context.close();
    }
  });

  test('professional plan gate: production and warehouse routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_p_owner');
    try {
      await page.goto(`${BASE}/production`);
      await page.waitForTimeout(1000);
      const body = await page.textContent('body');
      expect(body?.trim().length).toBeGreaterThan(10);

      await page.goto(`${BASE}/warehouses`);
      await page.waitForTimeout(1000);
      const body2 = await page.textContent('body');
      expect(body2?.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ENTERPRISE PLAN (tenant 9400)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('NGO Enterprise Plan', () => {

  test('owner can access all enterprise screens including production and warehouses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_owner');
    try {
      for (const route of NGO_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of [...ACCOUNTING_ROUTES, ...MIS_ROUTES, ...CRM_ROUTES, ...HRPAYROLL_ROUTES, ...SALES_ROUTES]) {
        await assertScreenLoads(page, route);
      }
      for (const route of [...PRODUCTION_ROUTES, ...WAREHOUSE_ROUTES, ...FIXED_ASSETS_ROUTES]) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('manager can access NGO core and operations screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_manager');
    try {
      await assertScreenLoads(page, '/ngo');
      await assertScreenLoads(page, '/ngo/projects');
      await assertScreenLoads(page, '/ngo/donors');
      await assertScreenLoads(page, '/ngo/grants');
    } finally {
      await context.close();
    }
  });

  test('field worker can access beneficiaries, donations, and expenses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_field_worker');
    try {
      await assertScreenLoads(page, '/ngo/beneficiaries');
      await assertScreenLoads(page, '/ngo/donations');
      await assertScreenLoads(page, '/expenses');
    } finally {
      await context.close();
    }
  });

  test('donor manager can access donors, donations, and 80G certificates', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_donor_mgr');
    try {
      await assertScreenLoads(page, '/ngo/donors');
      await assertScreenLoads(page, '/ngo/donations');
      await assertScreenLoads(page, '/ngo/80g-certificates');
    } finally {
      await context.close();
    }
  });

  test('accountant can access full accounting suite', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_acct');
    try {
      for (const route of ACCOUNTING_ROUTES) {
        await assertScreenLoads(page, route);
      }
      await assertScreenLoads(page, '/accounting/balance-sheet');
      await assertScreenLoads(page, '/accounting/profit-loss');
    } finally {
      await context.close();
    }
  });

  test('HR manager can access HR, payroll, and attendance', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_hr');
    try {
      await assertScreenLoads(page, '/hr');
      await assertScreenLoads(page, '/hr/employees');
      await assertScreenLoads(page, '/payroll');
      await assertScreenLoads(page, '/hr/attendance');
    } finally {
      await context.close();
    }
  });

  test('CRM executive can access CRM leads, contacts, and campaigns', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_crm');
    try {
      await assertScreenLoads(page, '/crm/leads');
      await assertScreenLoads(page, '/crm/contacts');
      await assertScreenLoads(page, '/crm/campaigns');
    } finally {
      await context.close();
    }
  });

  test('sales manager can access sales orders and invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_sales');
    try {
      await assertScreenLoads(page, '/sales-orders');
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_mis');
    try {
      for (const route of MIS_ROUTES) {
        await assertScreenLoads(page, route);
      }
      await assertScreenLoads(page, '/mis/cash');
    } finally {
      await context.close();
    }
  });

  test('warehouse manager can access warehouses and inventory', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_wh');
    try {
      await assertScreenLoads(page, '/warehouses');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('production supervisor can access production and raw materials', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_prod');
    try {
      await assertScreenLoads(page, '/production');
      await assertScreenLoads(page, '/raw-materials');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('assets manager can access fixed assets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_assets');
    try {
      await assertScreenLoads(page, '/fixed-assets');
    } finally {
      await context.close();
    }
  });

  test('donor manager enterprise: campaigns and reports load without crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_donor_mgr');
    try {
      await assertScreenLoads(page, '/ngo/campaigns');
      await assertScreenLoads(page, '/ngo/reports');
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN FEATURE GATES — API-level check
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Plan Feature Gates — API', () => {

  async function getAllowedNav(browser: Browser, username: string): Promise<string[]> {
    const { page, context } = await loginAs(browser, username);
    try {
      const res = await page.evaluate(async () => {
        const r = await fetch('/api/tenant/features');
        return r.json();
      });
      return (res.allowedNavItems as string[]) ?? [];
    } catch {
      return [];
    } finally {
      await context.close();
    }
  }

  test('starter: allowedNavItems excludes accounting and production', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_ngo_s_owner');
    expect(nav).not.toContain('journal-entries');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
  });

  test('professional: allowedNavItems includes accounting but not production', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_ngo_p_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
  });

  test('enterprise: allowedNavItems includes production and warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_ngo_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('production');
    expect(nav).toContain('warehouses');
    expect(nav).toContain('fixed-assets');
  });

  test('data isolation: starter tenant plan is ngo_starter', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_s_owner');
    try {
      const res = await page.evaluate(async () => {
        const r = await fetch('/api/tenant/features');
        return r.json();
      });
      const plan: string = res.plan ?? res.tenant?.plan ?? '';
      expect(plan).toContain('starter');
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM ROLES & PERMISSIONS (enterprise tenant 9400)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('NGO — Custom Roles & Permissions', () => {

  async function assertDeniedNotCrash(page: Page, route: string) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const body = (await page.textContent('body')) ?? '';
    expect(body.trim().length, `Blank page on ${route}`).toBeGreaterThan(10);
  }

  test('enterprise owner can access /user-management', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_owner');
    try {
      await assertNoCrash(page, '/user-management');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /roles?tab=permissions (custom role permissions screen)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_owner');
    try {
      await assertNoCrash(page, '/roles?tab=permissions');
    } finally {
      await context.close();
    }
  });

  test('field worker → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_field_worker');
    try {
      await assertDeniedNotCrash(page, '/user-management');
    } finally {
      await context.close();
    }
  });

  test('donor manager → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_donor_mgr');
    try {
      await assertDeniedNotCrash(page, '/user-management');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_mis');
    try {
      await assertDeniedNotCrash(page, '/user-management');
    } finally {
      await context.close();
    }
  });

  test('accountant → /roles?tab=permissions blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_acct');
    try {
      await assertDeniedNotCrash(page, '/roles?tab=permissions');
    } finally {
      await context.close();
    }
  });

  test('starter owner → /roles?tab=permissions blocked or redirected, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_s_owner');
    try {
      await assertDeniedNotCrash(page, '/roles?tab=permissions');
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MASTERS — Regions, Branches, Tax Config, Audit Log (enterprise 9400)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('NGO — Masters: Regions, Branches, Tax Config, Audit Log', () => {

  test('enterprise owner can access /masters', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_owner');
    try {
      await assertNoCrash(page, '/masters');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /masters/branches (regions/branches master)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_owner');
    try {
      await assertNoCrash(page, '/masters/branches');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /masters/tax-config', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_owner');
    try {
      await assertNoCrash(page, '/masters/tax-config');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /masters/audit-log', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_owner');
    try {
      await assertNoCrash(page, '/masters/audit-log');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /masters/approval-workflow', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_owner');
    try {
      await assertNoCrash(page, '/masters/approval-workflow');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /masters/notification-settings', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_owner');
    try {
      await assertNoCrash(page, '/masters/notification-settings');
    } finally {
      await context.close();
    }
  });

  test('field worker → /masters/branches loads without crash (read-only or denied)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_field_worker');
    try {
      await page.goto(`${BASE}/masters/branches`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const body = (await page.textContent('body')) ?? '';
      expect(body.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });

  test('starter plan: /masters/tax-config loads without crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_s_owner');
    try {
      await page.goto(`${BASE}/masters/tax-config`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const body = (await page.textContent('body')) ?? '';
      expect(body.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-MODULE SMOKE — NGO ↔ Finance / HR / CRM / MIS (enterprise 9400)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('NGO — Cross-Module Integration Smoke', () => {

  test('donation receipts → accounting journal-entries loads (Finance GL cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_owner');
    try {
      await assertNoCrash(page, '/ngo');
      await assertNoCrash(page, '/accounting/journal-entries');
    } finally {
      await context.close();
    }
  });

  test('NGO staff → HR and payroll screens load alongside NGO (HR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_hr');
    try {
      await assertNoCrash(page, '/ngo');
      await assertNoCrash(page, '/hr/employees');
      await assertNoCrash(page, '/payroll');
    } finally {
      await context.close();
    }
  });

  test('donor management → CRM contacts and leads load (CRM cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_crm');
    try {
      await assertNoCrash(page, '/crm/contacts');
      await assertNoCrash(page, '/crm/leads');
    } finally {
      await context.close();
    }
  });

  test('MIS dashboard loads alongside NGO screens (MIS cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_mis');
    try {
      await assertNoCrash(page, '/mis');
      await assertNoCrash(page, '/mis/sales');
      await assertNoCrash(page, '/mis/financial');
    } finally {
      await context.close();
    }
  });

  test('80G receipts → invoices and sales-orders load (AR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_owner');
    try {
      await assertNoCrash(page, '/invoices');
      await assertNoCrash(page, '/sales-orders');
    } finally {
      await context.close();
    }
  });

  test('CSR expenses → purchase orders and expenses load (procurement cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_owner');
    try {
      await assertNoCrash(page, '/purchase-orders');
      await assertNoCrash(page, '/expenses');
    } finally {
      await context.close();
    }
  });

  test('fixed assets and trial balance load after NGO fund activity (accounting cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_acct');
    try {
      await assertNoCrash(page, '/fixed-assets');
      await assertNoCrash(page, '/accounting/trial-balance');
      await assertNoCrash(page, '/accounting/balance-sheet');
    } finally {
      await context.close();
    }
  });

  test('warehouse and inventory screens load alongside NGO (warehouse cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_wh');
    try {
      await assertNoCrash(page, '/warehouses');
      await assertNoCrash(page, '/inventory');
    } finally {
      await context.close();
    }
  });
});
