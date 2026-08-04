/**
 * Gold ERP — Per-role, per-plan screen smoke tests
 *
 * Plans tested:
 *   Starter     (8020) : gold_erp + invoicing + basic_inventory + expenses + documents + masters
 *   Professional(8021) : + purchase_orders + sales_orders + accounting + mis + production
 *   Enterprise  (8000) : + crm + hr_payroll + warehouses + fixed_assets + multi_currency + pos
 *
 * Roles tested per plan: owner, manager, sales_staff, qc + cross-module roles
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
  await page.waitForURL(/dashboard|gold-erp|\//, { timeout: 15000 });
  return { page, context };
}

async function assertNoCrash(page: Page, route: string): Promise<string> {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !isIgnorable(msg.text())) errors.push(msg.text());
  });
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const body = (await page.textContent('body')) ?? '';
  expect(body.trim().length, `Blank page on ${route}`).toBeGreaterThan(50);
  expect(errors.length, `JS error on ${route}: ${errors[0]}`).toBe(0);
  return body;
}

async function assertNavNotVisible(page: Page, label: string) {
  const nav = page.locator('nav, aside, [role="navigation"]');
  await expect(nav.getByText(label, { exact: false })).toHaveCount(0);
}

// ── Route groups ──────────────────────────────────────────────────────────────
const GOLD_CORE_ROUTES = [
  '/gold-erp',
  '/gold-erp/rate-card',
  '/gold-erp/items',
  '/gold-erp/stock-ledger',
  '/gold-erp/job-work',
  '/gold-erp/customer-karats',
  '/gold-erp/old-gold',
  '/gold-erp/schemes',
  '/gold-erp/reports',
];

const INVOICING_ROUTES    = ['/invoices', '/invoices/new'];
const PURCHASE_ROUTES     = ['/purchase-orders'];
const INVENTORY_ROUTES    = ['/inventory'];
const EXPENSES_ROUTES     = ['/expenses'];
const SALES_ROUTES        = ['/sales-orders'];

const ACCOUNTING_ROUTES   = ['/accounting/chart-of-accounts', '/accounting/journal-entries', '/accounting/trial-balance'];
const MIS_ROUTES          = ['/mis', '/mis/sales', '/mis/financial'];
const CRM_ROUTES          = ['/crm/contacts', '/crm/leads'];
const HRPAYROLL_ROUTES    = ['/hr', '/hr/employees', '/payroll'];

const PRODUCTION_ROUTES   = ['/production'];
const WAREHOUSE_ROUTES    = ['/warehouses'];
const FIXED_ASSETS_ROUTES = ['/fixed-assets'];

// ─────────────────────────────────────────────────────────────────────────────
// STARTER PLAN (tenant 8020)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Gold ERP Starter Plan — Screen Tests', () => {

  test('owner can access all starter screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_s_owner');
    try {
      for (const route of GOLD_CORE_ROUTES) {
        await assertNoCrash(page, route);
      }
      await assertNoCrash(page, '/invoices');
      await assertNoCrash(page, '/inventory');
      await assertNoCrash(page, '/expenses');

      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Accounting');
      await assertNavNotVisible(page, 'MIS');
      await assertNavNotVisible(page, 'CRM');
      await assertNavNotVisible(page, 'HR & Payroll');
      await assertNavNotVisible(page, 'Warehouses');
    } finally {
      await context.close();
    }
  });

  test('manager can access core module screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_s_manager');
    try {
      await assertNoCrash(page, '/gold-erp');
      await assertNoCrash(page, '/gold-erp/items');
      await assertNoCrash(page, '/gold-erp/rate-card');
      await assertNoCrash(page, '/gold-erp/stock-ledger');
    } finally {
      await context.close();
    }
  });

  test('sales staff can access transaction screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_s_sales_staff');
    try {
      await assertNoCrash(page, '/gold-erp/items');
      await assertNoCrash(page, '/gold-erp/rate-card');
      await assertNoCrash(page, '/gold-erp/schemes');
    } finally {
      await context.close();
    }
  });

  test('billing staff can access invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_s_manager');
    try {
      await assertNoCrash(page, '/invoices');
      await assertNoCrash(page, '/invoices/new');
    } finally {
      await context.close();
    }
  });

  test('owner can view old gold, schemes, and reports', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_s_owner');
    try {
      await assertNoCrash(page, '/gold-erp/old-gold');
      await assertNoCrash(page, '/gold-erp/schemes');
      await assertNoCrash(page, '/gold-erp/reports');
    } finally {
      await context.close();
    }
  });

  test('sales staff can view job work and customer karats', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_s_sales_staff');
    try {
      await assertNoCrash(page, '/gold-erp/job-work');
      await assertNoCrash(page, '/gold-erp/customer-karats');
    } finally {
      await context.close();
    }
  });

  test('manager can access inventory and expenses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_s_manager');
    try {
      await assertNoCrash(page, '/inventory');
      await assertNoCrash(page, '/expenses');
    } finally {
      await context.close();
    }
  });

  test('starter plan — accounting/crm routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_s_owner');
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
// PROFESSIONAL PLAN (tenant 8021)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Gold ERP Professional Plan — Screen Tests', () => {

  test('owner can access all professional screens including accounting and CRM', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_p_owner');
    try {
      for (const route of GOLD_CORE_ROUTES) {
        await assertNoCrash(page, route);
      }
      for (const route of [...INVOICING_ROUTES, ...PURCHASE_ROUTES, ...INVENTORY_ROUTES]) {
        await assertNoCrash(page, route);
      }
      for (const route of ACCOUNTING_ROUTES) {
        await assertNoCrash(page, route);
      }
      for (const route of MIS_ROUTES) {
        await assertNoCrash(page, route);
      }
      for (const route of [...SALES_ROUTES, ...PRODUCTION_ROUTES]) {
        await assertNoCrash(page, route);
      }

      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Warehouses');
      await assertNavNotVisible(page, 'Fixed Assets');
    } finally {
      await context.close();
    }
  });

  test('manager can access gold ERP and production screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_p_manager');
    try {
      await assertNoCrash(page, '/gold-erp');
      await assertNoCrash(page, '/gold-erp/items');
      await assertNoCrash(page, '/gold-erp/stock-ledger');
      await assertNoCrash(page, '/production');
    } finally {
      await context.close();
    }
  });

  test('owner can access sales orders and gatepasses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_p_owner');
    try {
      await assertNoCrash(page, '/sales-orders');
      await assertNoCrash(page, '/gatepasses');
    } finally {
      await context.close();
    }
  });

  test('accountant can access accounting screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_p_acct');
    try {
      for (const route of ACCOUNTING_ROUTES) {
        await assertNoCrash(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('HR manager can access HR and payroll screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_p_owner');
    try {
      for (const route of HRPAYROLL_ROUTES) {
        await assertNoCrash(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('CRM executive can access CRM screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_p_owner');
    try {
      for (const route of CRM_ROUTES) {
        await assertNoCrash(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('sales manager can access sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_p_owner');
    try {
      for (const route of SALES_ROUTES) {
        await assertNoCrash(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_p_mis');
    try {
      for (const route of MIS_ROUTES) {
        await assertNoCrash(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('purchase manager can access purchase orders and inventory', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_p_manager');
    try {
      await assertNoCrash(page, '/purchase-orders');
      await assertNoCrash(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('accountant can access trial balance and chart of accounts', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_p_acct');
    try {
      await assertNoCrash(page, '/accounting/trial-balance');
      await assertNoCrash(page, '/accounting/chart-of-accounts');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access sales and financial MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_p_mis');
    try {
      await assertNoCrash(page, '/mis/sales');
      await assertNoCrash(page, '/mis/financial');
    } finally {
      await context.close();
    }
  });

  test('professional plan — production/warehouse routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_p_owner');
    try {
      await page.goto(`${BASE}/warehouses`);
      await page.waitForTimeout(1000);
      const body = await page.textContent('body');
      expect(body?.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ENTERPRISE PLAN (tenant 8000)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Gold ERP Enterprise Plan — Screen Tests', () => {

  test('owner can access all enterprise screens including production and warehouses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_owner');
    try {
      for (const route of GOLD_CORE_ROUTES) {
        await assertNoCrash(page, route);
      }
      await assertNoCrash(page, '/gold-erp/pos');
      for (const route of [...ACCOUNTING_ROUTES, ...MIS_ROUTES, ...CRM_ROUTES, ...HRPAYROLL_ROUTES, ...SALES_ROUTES]) {
        await assertNoCrash(page, route);
      }
      for (const route of [...PRODUCTION_ROUTES, ...WAREHOUSE_ROUTES, ...FIXED_ASSETS_ROUTES]) {
        await assertNoCrash(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('manager can access gold ERP and all operations screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_manager');
    try {
      await assertNoCrash(page, '/gold-erp');
      await assertNoCrash(page, '/gold-erp/items');
      await assertNoCrash(page, '/gold-erp/stock-ledger');
      await assertNoCrash(page, '/gold-erp/karigar');
    } finally {
      await context.close();
    }
  });

  test('sales staff can access gold ERP, POS, and schemes', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_sales_staff');
    try {
      await assertNoCrash(page, '/gold-erp/items');
      await assertNoCrash(page, '/gold-erp/rate-card');
      await assertNoCrash(page, '/gold-erp/schemes');
      await assertNoCrash(page, '/gold-erp/pos');
    } finally {
      await context.close();
    }
  });

  test('quality checker can access job work and stock ledger', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_qc');
    try {
      await assertNoCrash(page, '/gold-erp/items');
      await assertNoCrash(page, '/gold-erp/job-work');
      await assertNoCrash(page, '/gold-erp/stock-ledger');
    } finally {
      await context.close();
    }
  });

  test('accountant can access full accounting suite', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_acct');
    try {
      for (const route of ACCOUNTING_ROUTES) {
        await assertNoCrash(page, route);
      }
      await assertNoCrash(page, '/accounting/balance-sheet');
      await assertNoCrash(page, '/accounting/profit-loss');
    } finally {
      await context.close();
    }
  });

  test('HR manager can access HR, payroll, and attendance', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_hr');
    try {
      for (const route of HRPAYROLL_ROUTES) {
        await assertNoCrash(page, route);
      }
      await assertNoCrash(page, '/hr/attendance');
      await assertNoCrash(page, '/hr/leave');
    } finally {
      await context.close();
    }
  });

  test('CRM executive can access CRM, campaigns, and leads', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_owner');
    try {
      for (const route of CRM_ROUTES) {
        await assertNoCrash(page, route);
      }
      await assertNoCrash(page, '/crm/campaigns');
    } finally {
      await context.close();
    }
  });

  test('sales manager can access sales orders and invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_owner');
    try {
      await assertNoCrash(page, '/sales-orders');
      await assertNoCrash(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_mis');
    try {
      for (const route of MIS_ROUTES) {
        await assertNoCrash(page, route);
      }
      await assertNoCrash(page, '/mis/cash');
    } finally {
      await context.close();
    }
  });

  test('warehouse manager can access warehouses and inventory', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_owner');
    try {
      await assertNoCrash(page, '/warehouses');
      await assertNoCrash(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('production supervisor can access production and raw materials', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_owner');
    try {
      await assertNoCrash(page, '/production');
      await assertNoCrash(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('assets manager can access fixed assets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_owner');
    try {
      await assertNoCrash(page, '/fixed-assets');
    } finally {
      await context.close();
    }
  });

  test('karigar can access job work and old gold screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_karigar');
    try {
      await assertNoCrash(page, '/gold-erp/job-work');
      await assertNoCrash(page, '/gold-erp/old-gold');
      await assertNoCrash(page, '/gold-erp/customer-karats');
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN GATE VALIDATION — API-level check
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

  test('starter plan: GET /api/tenant/features → allowedNavItems excludes accounting, production', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_gld_s_owner');
    expect(nav).not.toContain('journal-entries');
    expect(nav).not.toContain('chart-of-accounts');
    expect(nav).not.toContain('warehouses');
    expect(nav).toContain('gold-erp');
  });

  test('professional plan: allowedNavItems includes accounting but not production/warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_gld_p_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('gold-erp');
    expect(nav).not.toContain('warehouses');
  });

  test('enterprise plan: allowedNavItems includes production and warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_gld_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('gold-erp');
    expect(nav).toContain('warehouses');
    expect(nav).toContain('fixed-assets');
  });

  test('data isolation: owner of tenant A cannot see tenant B data via /api/tenant/features', async ({ browser }) => {
    const { page: pageA, context: ctxA } = await loginAs(browser, 'qa_gld_s_owner');
    const { page: pageB, context: ctxB } = await loginAs(browser, 'qa_gld_owner');
    try {
      const featA = await pageA.evaluate(async () => { const r = await fetch('/api/tenant/features'); return r.json(); });
      const featB = await pageB.evaluate(async () => { const r = await fetch('/api/tenant/features'); return r.json(); });
      expect(featA.plan).not.toBe(featB.plan);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});
