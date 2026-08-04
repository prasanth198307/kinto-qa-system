/**
 * Restaurant ERP — Per-role, per-plan screen smoke tests
 *
 * For every plan × role combination:
 *   1. Login and verify the sidebar contains allowed restaurant nav items
 *   2. Verify blocked module nav items are NOT visible in the sidebar
 *   3. Navigate to each allowed screen → no JS crash, no blank page
 *
 * Plans tested:
 *   Starter     (9020 / qa-rst-s): restaurant + invoicing + purchase + basic_inventory + expenses + documents + masters
 *   Professional(9021 / qa-rst-p): starter + accounting + mis + crm + whatsapp + hr_payroll + sales_orders
 *   Enterprise  (9001 / qa-in  ): professional + production + warehouses + fixed_assets + multi_currency + ...
 *
 * Roles tested per plan: owner, manager, cashier, steward, chef + cross-module roles
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:5050';

// ── Ignorable console errors ────────────────────────────────────────────────
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

// ── Login helper ─────────────────────────────────────────────────────────────
async function loginAs(browser: Browser, username: string, slug: string): Promise<{ page: Page; context: BrowserContext }> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE}/auth`);
  await page.fill('input[placeholder*="acme"]', slug);
  await page.fill('input[placeholder*="username"]', username);
  await page.fill('input[type="password"]', 'Test@1234');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 15000 });

  return { page, context };
}

// ── Screen assertion helpers ──────────────────────────────────────────────────
async function assertScreenLoads(page: Page, route: string) {
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error' && !isIgnorable(msg.text())) {
      errors.push(msg.text());
    }
  });

  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  // Wait for lazy chunk to load and React to render (spinner has no text, so poll until body has content)
  await page.waitForFunction(() => (document.body.textContent ?? '').trim().length > 50, { timeout: 8000 }).catch(() => {});

  const body = await page.textContent('body');
  expect(body?.trim().length, `Blank page on ${route}`).toBeGreaterThan(50);
  expect(errors.length, `JS error on ${route}: ${errors[0]}`).toBe(0);
}

async function assertNavVisible(page: Page, label: string) {
  const nav = page.locator('nav, aside, [role="navigation"]');
  await expect(nav.getByText(label, { exact: false })).toBeVisible({ timeout: 5000 });
}

async function assertNavNotVisible(page: Page, label: string) {
  const nav = page.locator('nav, aside, [role="navigation"]');
  await expect(nav.getByText(label, { exact: false })).toHaveCount(0);
}

// ── Plan module maps ──────────────────────────────────────────────────────────
const RESTAURANT_CORE_ROUTES = [
  '/restaurant',
  '/restaurant/pos',
  '/restaurant/tables',
  '/restaurant/menu',
  '/restaurant/kitchen-display',
  '/restaurant/z-report',
  '/restaurant/settings',
];

const INVOICING_ROUTES    = ['/invoices', '/invoices/new'];
const PURCHASE_ROUTES     = ['/purchase-orders'];
const INVENTORY_ROUTES    = ['/inventory'];
const EXPENSES_ROUTES     = ['/expenses'];

const ACCOUNTING_ROUTES   = ['/accounting/chart-of-accounts', '/accounting/journal-entries', '/accounting/trial-balance'];
const MIS_ROUTES          = ['/mis', '/mis/sales', '/mis/financial'];
const CRM_ROUTES          = ['/crm/contacts', '/crm/leads'];
const HRPAYROLL_ROUTES    = ['/hr', '/hr/employees', '/payroll'];
const SALES_ROUTES        = ['/sales-orders'];

const PRODUCTION_ROUTES   = ['/production'];
const WAREHOUSE_ROUTES    = ['/warehouses'];
const FIXED_ASSETS_ROUTES = ['/fixed-assets'];

// ─────────────────────────────────────────────────────────────────────────────
// STARTER PLAN (tenant 9101)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Restaurant Starter Plan — Screen Tests', () => {

  test('owner can access all starter screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_s_owner', 'qa-rst-s');
    try {
      // Restaurant core
      for (const route of RESTAURANT_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      // Shared modules in starter
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/purchase-orders');
      await assertScreenLoads(page, '/inventory');
      await assertScreenLoads(page, '/expenses');

      // Blocked in starter — verify nav does not show them
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

  test('manager can access restaurant POS and menu', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_s_manager', 'qa-rst-s');
    try {
      await assertScreenLoads(page, '/restaurant/pos');
      await assertScreenLoads(page, '/restaurant/menu');
      await assertScreenLoads(page, '/restaurant/tables');
      await assertScreenLoads(page, '/restaurant/z-report');
    } finally {
      await context.close();
    }
  });

  test('cashier can access POS and tables', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_s_cashier', 'qa-rst-s');
    try {
      await assertScreenLoads(page, '/restaurant/pos');
      await assertScreenLoads(page, '/restaurant/tables');
    } finally {
      await context.close();
    }
  });

  test('steward can access POS and KOT screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_s_steward', 'qa-rst-s');
    try {
      await assertScreenLoads(page, '/restaurant/pos');
      await assertScreenLoads(page, '/restaurant/kot');
    } finally {
      await context.close();
    }
  });

  test('chef can access kitchen display', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_s_chef', 'qa-rst-s');
    try {
      await assertScreenLoads(page, '/restaurant/kitchen-display');
    } finally {
      await context.close();
    }
  });

  test('billing staff can access invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_s_billing', 'qa-rst-s');
    try {
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/invoices/new');
    } finally {
      await context.close();
    }
  });

  test('purchase staff can access purchase orders and inventory', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_s_purchase', 'qa-rst-s');
    try {
      await assertScreenLoads(page, '/purchase-orders');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('starter plan — accounting routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_s_owner', 'qa-rst-s');
    try {
      await page.goto(`${BASE}/accounting/journal-entries`);
      await page.waitForTimeout(1000);
      // Should redirect to dashboard or show access denied — must NOT crash
      const body = await page.textContent('body');
      expect(body?.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PROFESSIONAL PLAN (tenant 9102)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Restaurant Professional Plan — Screen Tests', () => {

  test('owner can access all professional screens including accounting and CRM', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_p_owner', 'qa-rst-p');
    try {
      // Restaurant core
      for (const route of RESTAURANT_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      // Shared modules available on professional
      for (const route of [...INVOICING_ROUTES, ...PURCHASE_ROUTES, ...INVENTORY_ROUTES]) {
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

      // Blocked in professional
      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Production');
      await assertNavNotVisible(page, 'Warehouses');
      await assertNavNotVisible(page, 'Fixed Assets');
    } finally {
      await context.close();
    }
  });

  test('manager can access restaurant and sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_p_manager', 'qa-rst-p');
    try {
      await assertScreenLoads(page, '/restaurant/pos');
      await assertScreenLoads(page, '/restaurant/tables');
      await assertScreenLoads(page, '/restaurant/menu');
      await assertScreenLoads(page, '/sales-orders');
    } finally {
      await context.close();
    }
  });

  test('cashier can access POS and invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_p_cashier', 'qa-rst-p');
    try {
      await assertScreenLoads(page, '/restaurant/pos');
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('steward can access POS and reservations', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_p_steward', 'qa-rst-p');
    try {
      await assertScreenLoads(page, '/restaurant/pos');
      await assertScreenLoads(page, '/restaurant/reservations');
    } finally {
      await context.close();
    }
  });

  test('chef can access kitchen display and recipe costing', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_p_chef', 'qa-rst-p');
    try {
      await assertScreenLoads(page, '/restaurant/kitchen-display');
      await assertScreenLoads(page, '/restaurant/recipe-costing');
    } finally {
      await context.close();
    }
  });

  test('accountant can access accounting screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_p_acct', 'qa-rst-p');
    try {
      for (const route of ACCOUNTING_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('HR manager can access HR and payroll screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_p_hr', 'qa-rst-p');
    try {
      for (const route of HRPAYROLL_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('CRM executive can access CRM screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_p_crm', 'qa-rst-p');
    try {
      for (const route of CRM_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('sales manager can access sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_p_sales', 'qa-rst-p');
    try {
      for (const route of SALES_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_p_mis', 'qa-rst-p');
    try {
      for (const route of MIS_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('purchase manager can access purchase orders and inventory', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_p_purchase', 'qa-rst-p');
    try {
      await assertScreenLoads(page, '/purchase-orders');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('professional plan — production routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_p_owner', 'qa-rst-p');
    try {
      await page.goto(`${BASE}/production`);
      await page.waitForTimeout(1000);
      const body = await page.textContent('body');
      expect(body?.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ENTERPRISE PLAN (tenant 9001 / qa-in)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Restaurant Enterprise Plan — Screen Tests', () => {

  test('owner can access all enterprise screens including production and warehouses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_e_owner', 'qa-in');
    try {
      // Restaurant core
      for (const route of RESTAURANT_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      // Professional modules
      for (const route of [...ACCOUNTING_ROUTES, ...MIS_ROUTES, ...CRM_ROUTES, ...HRPAYROLL_ROUTES, ...SALES_ROUTES]) {
        await assertScreenLoads(page, route);
      }
      // Enterprise-only
      for (const route of [...PRODUCTION_ROUTES, ...WAREHOUSE_ROUTES, ...FIXED_ASSETS_ROUTES]) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('manager can access restaurant and all operations screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_e_manager', 'qa-in');
    try {
      await assertScreenLoads(page, '/restaurant/pos');
      await assertScreenLoads(page, '/restaurant/tables');
      await assertScreenLoads(page, '/restaurant/menu');
      await assertScreenLoads(page, '/restaurant/analytics');
      await assertScreenLoads(page, '/restaurant/staff');
    } finally {
      await context.close();
    }
  });

  test('cashier can access POS, tables, and z-report', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_e_cashier', 'qa-in');
    try {
      await assertScreenLoads(page, '/restaurant/pos');
      await assertScreenLoads(page, '/restaurant/tables');
      await assertScreenLoads(page, '/restaurant/z-report');
    } finally {
      await context.close();
    }
  });

  test('steward can access POS, tables, reservations, and loyalty', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_e_steward', 'qa-in');
    try {
      await assertScreenLoads(page, '/restaurant/pos');
      await assertScreenLoads(page, '/restaurant/tables');
      await assertScreenLoads(page, '/restaurant/reservations');
      await assertScreenLoads(page, '/restaurant/loyalty');
    } finally {
      await context.close();
    }
  });

  test('chef can access kitchen display, recipe costing, and menu', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_e_chef', 'qa-in');
    try {
      await assertScreenLoads(page, '/restaurant/kitchen-display');
      await assertScreenLoads(page, '/restaurant/recipe-costing');
      await assertScreenLoads(page, '/restaurant/menu');
    } finally {
      await context.close();
    }
  });

  test('accountant can access full accounting suite', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_e_acct', 'qa-in');
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
    const { page, context } = await loginAs(browser, 'qa_e_hr', 'qa-in');
    try {
      for (const route of HRPAYROLL_ROUTES) {
        await assertScreenLoads(page, route);
      }
      await assertScreenLoads(page, '/hr/attendance');
      await assertScreenLoads(page, '/hr/leave');
    } finally {
      await context.close();
    }
  });

  test('CRM executive can access CRM, campaigns, and leads', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_e_crm', 'qa-in');
    try {
      for (const route of CRM_ROUTES) {
        await assertScreenLoads(page, route);
      }
      await assertScreenLoads(page, '/crm/campaigns');
    } finally {
      await context.close();
    }
  });

  test('sales manager can access sales orders and invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_e_sales', 'qa-in');
    try {
      await assertScreenLoads(page, '/sales-orders');
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_e_mis', 'qa-in');
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
    const { page, context } = await loginAs(browser, 'qa_e_wh', 'qa-in');
    try {
      await assertScreenLoads(page, '/warehouses');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('production supervisor can access production and raw materials', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_e_prod', 'qa-in');
    try {
      await assertScreenLoads(page, '/production');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('assets manager can access fixed assets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_e_assets', 'qa-in');
    try {
      await assertScreenLoads(page, '/fixed-assets');
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN GATE VALIDATION — API-level check
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Plan Feature Gates — API verification', () => {

  const PLAN_SLUGS: Record<string, string> = {
    qa_s_owner: 'qa-rst-s',
    qa_p_owner: 'qa-rst-p',
    qa_e_owner: 'qa-in',
  };

  async function getAllowedNav(browser: Browser, username: string): Promise<string[]> {
    const slug = PLAN_SLUGS[username] ?? '';
    const { page, context } = await loginAs(browser, username, slug);
    try {
      const res = await page.evaluate(async () => {
        const r = await fetch('/api/tenant/features');
        return r.json();
      });
      await context.close();
      return (res.allowedNavItems as string[]) ?? [];
    } catch {
      await context.close();
      return [];
    }
  }

  test('starter plan allowedNavItems excludes accounting and production', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_s_owner');
    expect(nav).not.toContain('journal-entries');
    expect(nav).not.toContain('chart-of-accounts');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
    // Must include restaurant
    expect(nav).toContain('restaurant-pos');
  });

  test('professional plan allowedNavItems includes accounting but not production', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_p_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('restaurant-pos');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
  });

  test('enterprise plan allowedNavItems includes production and warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_e_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('restaurant-pos');
    // production module nav items (not a single 'production' item — check actual items)
    expect(nav).toContain('production-entries');
    expect(nav).toContain('warehouses');
    expect(nav).toContain('fixed-assets');
  });
});
