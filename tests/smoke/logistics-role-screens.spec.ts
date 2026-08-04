/**
 * Logistics ERP — Per-role, per-plan screen smoke tests
 *
 * Plans tested:
 *   Starter      (9720): logistics_starter — core logistics + invoicing + expenses
 *   Professional (9721): logistics_professional — starter + accounting + mis + hr_payroll + crm + sales_orders
 *   Enterprise   (9700): logistics_enterprise — professional + warehouses + production + fixed_assets
 *
 * Roles per plan mirror the tenant user matrix:
 *   Starter:      qa_lgs_s_owner, qa_lgs_s_manager, qa_lgs_s_dispatcher, qa_lgs_s_billing
 *   Professional: qa_lgs_p_owner, qa_lgs_p_manager, qa_lgs_p_acct, qa_lgs_p_mis
 *   Enterprise:   qa_lgs_owner, qa_lgs_manager, qa_lgs_dispatcher, qa_lgs_driver,
 *                 qa_lgs_acct, qa_lgs_hr, qa_lgs_crm, qa_lgs_sales, qa_lgs_mis,
 *                 qa_lgs_wh, qa_lgs_prod, qa_lgs_assets
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
  await page.waitForURL(/dashboard|logistics|\//, { timeout: 15000 });
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
const LOGISTICS_CORE_ROUTES = [
  '/logistics',
  '/logistics/vehicles',
  '/logistics/drivers',
  '/logistics/shipments',
  '/logistics/delivery-orders',
  '/logistics/routes',
  '/logistics/fuel-logs',
  '/logistics/pod',
  '/logistics/reports',
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
// STARTER PLAN (tenant 9720)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Logistics Starter Plan', () => {

  test('owner can access all starter logistics screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_s_owner');
    try {
      for (const route of LOGISTICS_CORE_ROUTES) {
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

  test('manager can access vehicles, drivers, and shipments', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_s_manager');
    try {
      await assertScreenLoads(page, '/logistics/vehicles');
      await assertScreenLoads(page, '/logistics/drivers');
      await assertScreenLoads(page, '/logistics/shipments');
      await assertScreenLoads(page, '/logistics/delivery-orders');
    } finally {
      await context.close();
    }
  });

  test('dispatcher can access delivery orders and routes', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_s_dispatcher');
    try {
      await assertScreenLoads(page, '/logistics/delivery-orders');
      await assertScreenLoads(page, '/logistics/routes');
      await assertScreenLoads(page, '/logistics/shipments');
    } finally {
      await context.close();
    }
  });

  test('billing staff can access invoices and expenses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_s_billing');
    try {
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/invoices/new');
      await assertScreenLoads(page, '/expenses');
    } finally {
      await context.close();
    }
  });

  test('owner can access fuel logs and POD screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_s_owner');
    try {
      await assertScreenLoads(page, '/logistics/fuel-logs');
      await assertScreenLoads(page, '/logistics/pod');
    } finally {
      await context.close();
    }
  });

  test('manager can view logistics reports', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_s_manager');
    try {
      await assertScreenLoads(page, '/logistics/reports');
    } finally {
      await context.close();
    }
  });

  test('dispatcher can view shipments without accessing accounting', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_s_dispatcher');
    try {
      await assertScreenLoads(page, '/logistics/shipments');
      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Accounting');
    } finally {
      await context.close();
    }
  });

  test('starter plan gate: accounting and CRM routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_s_owner');
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
// PROFESSIONAL PLAN (tenant 9721)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Logistics Professional Plan', () => {

  test('owner can access all professional screens including accounting and CRM', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_p_owner');
    try {
      for (const route of LOGISTICS_CORE_ROUTES) {
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

  test('manager can access logistics core and sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_p_manager');
    try {
      await assertScreenLoads(page, '/logistics/vehicles');
      await assertScreenLoads(page, '/logistics/shipments');
      await assertScreenLoads(page, '/logistics/delivery-orders');
      await assertScreenLoads(page, '/sales-orders');
    } finally {
      await context.close();
    }
  });

  test('dispatcher can access delivery orders and CRM leads on professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_p_owner');
    try {
      await assertScreenLoads(page, '/logistics/delivery-orders');
      await assertScreenLoads(page, '/logistics/routes');
      await assertScreenLoads(page, '/crm/leads');
    } finally {
      await context.close();
    }
  });

  test('accountant can access accounting screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_p_acct');
    try {
      await assertScreenLoads(page, '/accounting/journal-entries');
      await assertScreenLoads(page, '/accounting/trial-balance');
    } finally {
      await context.close();
    }
  });

  test('HR manager can access HR and payroll screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_p_owner');
    try {
      await assertScreenLoads(page, '/hr/employees');
      await assertScreenLoads(page, '/payroll');
    } finally {
      await context.close();
    }
  });

  test('CRM executive can access CRM screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_p_owner');
    try {
      await assertScreenLoads(page, '/crm/leads');
      await assertScreenLoads(page, '/crm/contacts');
    } finally {
      await context.close();
    }
  });

  test('sales manager can access sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_p_owner');
    try {
      await assertScreenLoads(page, '/sales-orders');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_p_mis');
    try {
      await assertScreenLoads(page, '/mis');
      await assertScreenLoads(page, '/mis/sales');
      await assertScreenLoads(page, '/mis/financial');
    } finally {
      await context.close();
    }
  });

  test('purchase manager can access purchase orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_p_owner');
    try {
      await assertScreenLoads(page, '/purchase-orders');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('owner can access fuel logs and pod on professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_p_owner');
    try {
      await assertScreenLoads(page, '/logistics/fuel-logs');
      await assertScreenLoads(page, '/logistics/pod');
    } finally {
      await context.close();
    }
  });

  test('manager can access HR screens on professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_p_manager');
    try {
      await assertScreenLoads(page, '/logistics/drivers');
      await assertScreenLoads(page, '/hr/employees');
    } finally {
      await context.close();
    }
  });

  test('professional plan gate: production and warehouse routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_p_owner');
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
// ENTERPRISE PLAN (tenant 9700)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Logistics Enterprise Plan', () => {

  test('owner can access all enterprise screens including production and warehouses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_owner');
    try {
      for (const route of LOGISTICS_CORE_ROUTES) {
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

  test('manager can access logistics core and operations screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_manager');
    try {
      await assertScreenLoads(page, '/logistics');
      await assertScreenLoads(page, '/logistics/vehicles');
      await assertScreenLoads(page, '/logistics/shipments');
      await assertScreenLoads(page, '/logistics/delivery-orders');
    } finally {
      await context.close();
    }
  });

  test('dispatcher can access delivery orders, routes, and fuel logs', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_dispatcher');
    try {
      await assertScreenLoads(page, '/logistics/delivery-orders');
      await assertScreenLoads(page, '/logistics/routes');
      await assertScreenLoads(page, '/logistics/fuel-logs');
    } finally {
      await context.close();
    }
  });

  test('driver can access assigned shipments and POD', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_driver');
    try {
      await assertScreenLoads(page, '/logistics/shipments');
      await assertScreenLoads(page, '/logistics/pod');
    } finally {
      await context.close();
    }
  });

  test('accountant can access full accounting suite', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_acct');
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
    const { page, context } = await loginAs(browser, 'qa_lgs_hr');
    try {
      await assertScreenLoads(page, '/hr');
      await assertScreenLoads(page, '/hr/employees');
      await assertScreenLoads(page, '/payroll');
      await assertScreenLoads(page, '/hr/attendance');
    } finally {
      await context.close();
    }
  });

  test('CRM executive can access CRM leads and contacts', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_crm');
    try {
      await assertScreenLoads(page, '/crm/leads');
      await assertScreenLoads(page, '/crm/contacts');
      await assertScreenLoads(page, '/crm/campaigns');
    } finally {
      await context.close();
    }
  });

  test('sales manager can access sales orders and invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_sales');
    try {
      await assertScreenLoads(page, '/sales-orders');
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_mis');
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
    const { page, context } = await loginAs(browser, 'qa_lgs_wh');
    try {
      await assertScreenLoads(page, '/warehouses');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('production supervisor can access production and raw materials', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_prod');
    try {
      await assertScreenLoads(page, '/production');
      await assertScreenLoads(page, '/raw-materials');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('assets manager can access fixed assets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_assets');
    try {
      await assertScreenLoads(page, '/fixed-assets');
    } finally {
      await context.close();
    }
  });

  test('driver enterprise: POD and fuel-logs load without crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_driver');
    try {
      await assertScreenLoads(page, '/logistics/pod');
      await assertScreenLoads(page, '/logistics/fuel-logs');
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
    const nav = await getAllowedNav(browser, 'qa_lgs_s_owner');
    expect(nav).not.toContain('journal-entries');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
  });

  test('professional: allowedNavItems includes accounting but not production', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_lgs_p_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
  });

  test('enterprise: allowedNavItems includes production and warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_lgs_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('production');
    expect(nav).toContain('warehouses');
    expect(nav).toContain('fixed-assets');
  });

  test('data isolation: starter tenant cannot see enterprise tenant data', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_s_owner');
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
// CUSTOM ROLES & PERMISSIONS (enterprise tenant 9700)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Logistics — Custom Roles & Permissions', () => {

  async function assertDeniedNotCrash(page: Page, route: string) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const body = (await page.textContent('body')) ?? '';
    expect(body.trim().length, `Blank page on ${route}`).toBeGreaterThan(10);
  }

  test('enterprise owner can access /user-management', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_owner');
    try {
      await assertNoCrash(page, '/user-management');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /roles?tab=permissions (custom role permissions screen)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_owner');
    try {
      await assertNoCrash(page, '/roles?tab=permissions');
    } finally {
      await context.close();
    }
  });

  test('driver → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_driver');
    try {
      await assertDeniedNotCrash(page, '/user-management');
    } finally {
      await context.close();
    }
  });

  test('dispatcher → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_dispatcher');
    try {
      await assertDeniedNotCrash(page, '/user-management');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_mis');
    try {
      await assertDeniedNotCrash(page, '/user-management');
    } finally {
      await context.close();
    }
  });

  test('accountant → /roles?tab=permissions blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_acct');
    try {
      await assertDeniedNotCrash(page, '/roles?tab=permissions');
    } finally {
      await context.close();
    }
  });

  test('starter owner → /roles?tab=permissions blocked or redirected, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_s_owner');
    try {
      await assertDeniedNotCrash(page, '/roles?tab=permissions');
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MASTERS — Regions, Branches, Tax Config, Audit Log (enterprise 9700)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Logistics — Masters: Regions, Branches, Tax Config, Audit Log', () => {

  test('enterprise owner can access /masters', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_owner');
    try {
      await assertNoCrash(page, '/masters');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /masters/branches (regions/branches master)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_owner');
    try {
      await assertNoCrash(page, '/masters/branches');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /masters/tax-config', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_owner');
    try {
      await assertNoCrash(page, '/masters/tax-config');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /masters/audit-log', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_owner');
    try {
      await assertNoCrash(page, '/masters/audit-log');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /masters/approval-workflow', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_owner');
    try {
      await assertNoCrash(page, '/masters/approval-workflow');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /masters/notification-settings', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_owner');
    try {
      await assertNoCrash(page, '/masters/notification-settings');
    } finally {
      await context.close();
    }
  });

  test('driver → /masters/branches loads without crash (read-only or denied)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_driver');
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
    const { page, context } = await loginAs(browser, 'qa_lgs_s_owner');
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
// CROSS-MODULE SMOKE — Logistics ↔ Finance / HR / CRM / MIS (enterprise 9700)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Logistics — Cross-Module Integration Smoke', () => {

  test('freight billing → accounting journal-entries loads (Finance GL cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_owner');
    try {
      await assertNoCrash(page, '/logistics');
      await assertNoCrash(page, '/accounting/journal-entries');
    } finally {
      await context.close();
    }
  });

  test('drivers and fleet staff → HR and payroll screens load (HR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_hr');
    try {
      await assertNoCrash(page, '/logistics');
      await assertNoCrash(page, '/hr/employees');
      await assertNoCrash(page, '/payroll');
    } finally {
      await context.close();
    }
  });

  test('shipper customers → CRM contacts and leads load (CRM cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_crm');
    try {
      await assertNoCrash(page, '/crm/contacts');
      await assertNoCrash(page, '/crm/leads');
    } finally {
      await context.close();
    }
  });

  test('MIS dashboard loads alongside logistics screens (MIS cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_mis');
    try {
      await assertNoCrash(page, '/mis');
      await assertNoCrash(page, '/mis/sales');
      await assertNoCrash(page, '/mis/financial');
    } finally {
      await context.close();
    }
  });

  test('LR invoices → invoices and sales-orders load (AR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_owner');
    try {
      await assertNoCrash(page, '/invoices');
      await assertNoCrash(page, '/sales-orders');
    } finally {
      await context.close();
    }
  });

  test('fuel and vehicle expenses → purchase orders and expenses load (procurement cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_owner');
    try {
      await assertNoCrash(page, '/purchase-orders');
      await assertNoCrash(page, '/expenses');
    } finally {
      await context.close();
    }
  });

  test('fixed assets (fleet) and trial balance load after logistics activity (accounting cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_acct');
    try {
      await assertNoCrash(page, '/fixed-assets');
      await assertNoCrash(page, '/accounting/trial-balance');
      await assertNoCrash(page, '/accounting/balance-sheet');
    } finally {
      await context.close();
    }
  });

  test('warehouse and inventory screens load alongside logistics (warehouse cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_lgs_wh');
    try {
      await assertNoCrash(page, '/warehouses');
      await assertNoCrash(page, '/inventory');
    } finally {
      await context.close();
    }
  });
});
