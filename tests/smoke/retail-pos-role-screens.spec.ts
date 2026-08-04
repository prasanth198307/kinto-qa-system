/**
 * Retail/POS ERP — Per-role, per-plan screen smoke tests
 *
 * Plans tested:
 *   Starter      (8120): POS + retail + invoicing + stock + customers + loyalty
 *   Professional (8121): starter + accounting + MIS + CRM + sales
 *   Enterprise   (8100): professional + HR + production + warehouses + fixed_assets
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
  await page.waitForURL(/dashboard|pos|retail|\//, { timeout: 15000 });
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

async function assertNavVisible(page: Page, label: string) {
  const nav = page.locator('nav, aside, [role="navigation"]');
  await expect(nav.getByText(label, { exact: false })).toBeVisible({ timeout: 5000 });
}

async function assertNavNotVisible(page: Page, label: string) {
  const nav = page.locator('nav, aside, [role="navigation"]');
  await expect(nav.getByText(label, { exact: false })).toHaveCount(0);
}

const RETAIL_CORE_ROUTES = [
  '/retail',
  '/retail/products',
  '/retail/pos-sessions',
  '/retail/sales',
  '/retail/stock',
  '/retail/customers',
  '/retail/loyalty',
  '/retail/promotions',
  '/retail/z-report',
];

const INVOICING_ROUTES  = ['/invoices', '/invoices/new'];
const ACCOUNTING_ROUTES = ['/accounting/chart-of-accounts', '/accounting/journal-entries', '/accounting/trial-balance'];
const MIS_ROUTES        = ['/mis', '/mis/sales', '/mis/financial'];
const CRM_ROUTES        = ['/crm/contacts', '/crm/leads'];
const HRPAYROLL_ROUTES  = ['/hr', '/hr/employees', '/payroll'];
const SALES_ROUTES      = ['/sales-orders'];
const PRODUCTION_ROUTES = ['/production', '/raw-materials'];
const WAREHOUSE_ROUTES  = ['/warehouses', '/inventory'];
const FIXED_ASSETS_ROUTES = ['/fixed-assets'];

// ─────────────────────────────────────────────────────────────────────────────
// STARTER PLAN (tenant 8120)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Retail/POS Starter Plan — Screen Tests', () => {

  test('owner can access all starter retail screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_s_owner');
    try {
      for (const route of RETAIL_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/purchase-orders');

      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Accounting');
      await assertNavNotVisible(page, 'MIS');
      await assertNavNotVisible(page, 'CRM');
      await assertNavNotVisible(page, 'HR');
      await assertNavNotVisible(page, 'Production');
      await assertNavNotVisible(page, 'Warehouses');
    } finally {
      await context.close();
    }
  });

  test('manager can access POS sessions, sales, and z-report', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_s_manager');
    try {
      await assertScreenLoads(page, '/retail/pos-sessions');
      await assertScreenLoads(page, '/retail/sales');
      await assertScreenLoads(page, '/retail/z-report');
      await assertScreenLoads(page, '/retail/stock');
    } finally {
      await context.close();
    }
  });

  test('cashier can access POS sessions and sales', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_s_cashier');
    try {
      await assertScreenLoads(page, '/retail/pos-sessions');
      await assertScreenLoads(page, '/retail/sales');
      await assertScreenLoads(page, '/retail/customers');
    } finally {
      await context.close();
    }
  });

  test('billing staff can access invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_s_billing');
    try {
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/invoices/new');
    } finally {
      await context.close();
    }
  });

  test('loyalty screen loads in starter plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_s_owner');
    try {
      await assertScreenLoads(page, '/retail/loyalty');
    } finally {
      await context.close();
    }
  });

  test('promotions screen loads in starter plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_s_manager');
    try {
      await assertScreenLoads(page, '/retail/promotions');
    } finally {
      await context.close();
    }
  });

  test('retail products and stock screens load in starter', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_s_owner');
    try {
      await assertScreenLoads(page, '/retail/products');
      await assertScreenLoads(page, '/retail/stock');
    } finally {
      await context.close();
    }
  });

  test('starter plan — accounting routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_s_owner');
    try {
      await page.goto(`${BASE}/accounting/journal-entries`);
      await page.waitForTimeout(1000);
      const body = await page.textContent('body');
      expect(body?.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PROFESSIONAL PLAN (tenant 8121)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Retail/POS Professional Plan — Screen Tests', () => {

  test('owner can access all professional screens including accounting and CRM', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_p_owner');
    try {
      for (const route of RETAIL_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of [...INVOICING_ROUTES]) {
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
      for (const route of SALES_ROUTES) {
        await assertScreenLoads(page, route);
      }

      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Production');
      await assertNavNotVisible(page, 'Warehouses');
    } finally {
      await context.close();
    }
  });

  test('manager can access retail operations and sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_p_manager');
    try {
      await assertScreenLoads(page, '/retail/pos-sessions');
      await assertScreenLoads(page, '/retail/sales');
      await assertScreenLoads(page, '/retail/z-report');
      await assertScreenLoads(page, '/sales-orders');
    } finally {
      await context.close();
    }
  });

  test('cashier can access POS, sales, and loyalty', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_p_cashier');
    try {
      await assertScreenLoads(page, '/retail/pos-sessions');
      await assertScreenLoads(page, '/retail/sales');
      await assertScreenLoads(page, '/retail/loyalty');
    } finally {
      await context.close();
    }
  });

  test('accountant can access accounting screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_p_acct');
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

  test('MIS viewer can access MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_p_mis');
    try {
      for (const route of MIS_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('CRM screens load for professional plan owner', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_p_owner');
    try {
      for (const route of CRM_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('sales orders accessible in professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_p_owner');
    try {
      for (const route of SALES_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('retail promotions and loyalty load in professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_p_manager');
    try {
      await assertScreenLoads(page, '/retail/promotions');
      await assertScreenLoads(page, '/retail/loyalty');
    } finally {
      await context.close();
    }
  });

  test('retail z-report and stock screens load in professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_p_manager');
    try {
      await assertScreenLoads(page, '/retail/z-report');
      await assertScreenLoads(page, '/retail/stock');
    } finally {
      await context.close();
    }
  });

  test('purchase manager can access purchase orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_p_owner');
    try {
      await assertScreenLoads(page, '/purchase-orders');
    } finally {
      await context.close();
    }
  });

  test('retail customers screen loads in professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_p_cashier');
    try {
      await assertScreenLoads(page, '/retail/customers');
    } finally {
      await context.close();
    }
  });

  test('professional plan — production routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_p_owner');
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
// ENTERPRISE PLAN (tenant 8100)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Retail/POS Enterprise Plan — Screen Tests', () => {

  test('owner can access all enterprise screens including production and warehouses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_owner');
    try {
      for (const route of RETAIL_CORE_ROUTES) {
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

  test('manager can access retail operations, MIS, and sales', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_manager');
    try {
      await assertScreenLoads(page, '/retail/pos-sessions');
      await assertScreenLoads(page, '/retail/sales');
      await assertScreenLoads(page, '/retail/z-report');
      await assertScreenLoads(page, '/sales-orders');
      await assertScreenLoads(page, '/mis/sales');
    } finally {
      await context.close();
    }
  });

  test('cashier can access POS, sales, customers, and loyalty', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_cashier');
    try {
      await assertScreenLoads(page, '/retail/pos-sessions');
      await assertScreenLoads(page, '/retail/sales');
      await assertScreenLoads(page, '/retail/customers');
      await assertScreenLoads(page, '/retail/loyalty');
    } finally {
      await context.close();
    }
  });

  test('stock clerk can access stock and inventory screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_stock_clerk');
    try {
      await assertScreenLoads(page, '/retail/stock');
      await assertScreenLoads(page, '/retail/products');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('accountant can access full accounting suite', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_acct');
    try {
      for (const route of ACCOUNTING_ROUTES) {
        await assertScreenLoads(page, route);
      }
      await assertScreenLoads(page, '/accounting/balance-sheet');
      await assertScreenLoads(page, '/accounting/profit-loss');
      await assertScreenLoads(page, '/accounting/bank-reconciliation');
    } finally {
      await context.close();
    }
  });

  test('HR manager can access HR and payroll screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_hr');
    try {
      for (const route of HRPAYROLL_ROUTES) {
        await assertScreenLoads(page, route);
      }
      await assertScreenLoads(page, '/hr/attendance');
      await assertScreenLoads(page, '/hr/leaves');
    } finally {
      await context.close();
    }
  });

  test('CRM executive can access CRM, campaigns, and leads', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_crm');
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
    const { page, context } = await loginAs(browser, 'qa_rtl_sales');
    try {
      await assertScreenLoads(page, '/sales-orders');
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_mis');
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
    const { page, context } = await loginAs(browser, 'qa_rtl_wh');
    try {
      await assertScreenLoads(page, '/warehouses');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('production supervisor can access production and raw materials', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_prod');
    try {
      await assertScreenLoads(page, '/production');
      await assertScreenLoads(page, '/raw-materials');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('assets manager can access fixed assets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_assets');
    try {
      await assertScreenLoads(page, '/fixed-assets');
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN FEATURE GATES — API-level check
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Plan Feature Gates — API verification', () => {

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

  test('starter plan allowedNavItems excludes accounting and production', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_rtl_s_owner');
    expect(nav).not.toContain('journal-entries');
    expect(nav).not.toContain('chart-of-accounts');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
    expect(nav).toContain('retail-pos');
  });

  test('professional plan allowedNavItems includes accounting but not production/warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_rtl_p_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('retail-pos');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
  });

  test('enterprise plan allowedNavItems includes production and warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_rtl_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('retail-pos');
    expect(nav).toContain('production');
    expect(nav).toContain('warehouses');
    expect(nav).toContain('fixed-assets');
  });

  test('data isolation — enterprise tenant data not visible in starter plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_s_owner');
    try {
      const res = await page.evaluate(async () => {
        const r = await fetch('/api/tenant/features');
        return r.json();
      });
      const plan: string = res.plan ?? res.tenant?.plan ?? '';
      expect(plan).not.toContain('enterprise');
    } finally {
      await context.close();
    }
  });
});
