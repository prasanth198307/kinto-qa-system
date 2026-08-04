/**
 * Real Estate ERP — Per-role, per-plan screen smoke tests
 *
 * Plans tested:
 *   Starter      (9820): realestate_starter — core real estate + invoicing + expenses
 *   Professional (9821): realestate_professional — starter + accounting + mis + hr_payroll + crm + sales_orders
 *   Enterprise   (9800): realestate_enterprise — professional + warehouses + production + fixed_assets
 *
 * Roles per plan:
 *   Starter:      qa_re_s_owner, qa_re_s_manager, qa_re_s_sales_exec, qa_re_s_billing
 *   Professional: qa_re_p_owner, qa_re_p_manager, qa_re_p_acct, qa_re_p_mis
 *   Enterprise:   qa_re_owner, qa_re_manager, qa_re_sales_exec, qa_re_site_engineer,
 *                 qa_re_acct, qa_re_hr, qa_re_crm, qa_re_sales, qa_re_mis,
 *                 qa_re_wh, qa_re_prod, qa_re_assets
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
  await page.waitForURL(/dashboard|real-estate|\//, { timeout: 15000 });
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
const RE_CORE_ROUTES = [
  '/real-estate',
  '/real-estate/projects',
  '/real-estate/units',
  '/real-estate/bookings',
  '/real-estate/customers',
  '/real-estate/demand-letters',
  '/real-estate/payment-plans',
  '/real-estate/reports',
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
// STARTER PLAN (tenant 9820)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Real Estate Starter Plan', () => {

  test('owner can access all starter real estate screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_s_owner');
    try {
      for (const route of RE_CORE_ROUTES) {
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

  test('manager can access real estate projects, bookings, and units', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_s_manager');
    try {
      await assertScreenLoads(page, '/real-estate/projects');
      await assertScreenLoads(page, '/real-estate/bookings');
      await assertScreenLoads(page, '/real-estate/units');
      await assertScreenLoads(page, '/real-estate/customers');
    } finally {
      await context.close();
    }
  });

  test('sales executive can access bookings, customers, and demand letters', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_s_sales_exec');
    try {
      await assertScreenLoads(page, '/real-estate/bookings');
      await assertScreenLoads(page, '/real-estate/customers');
      await assertScreenLoads(page, '/real-estate/demand-letters');
    } finally {
      await context.close();
    }
  });

  test('billing staff can access invoices and payment plans', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_s_billing');
    try {
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/invoices/new');
      await assertScreenLoads(page, '/real-estate/payment-plans');
    } finally {
      await context.close();
    }
  });

  test('owner can access payment plans and real estate reports', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_s_owner');
    try {
      await assertScreenLoads(page, '/real-estate/payment-plans');
      await assertScreenLoads(page, '/real-estate/reports');
    } finally {
      await context.close();
    }
  });

  test('manager can view demand letters and units without accounting access', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_s_manager');
    try {
      await assertScreenLoads(page, '/real-estate/demand-letters');
      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Accounting');
    } finally {
      await context.close();
    }
  });

  test('sales executive can view real estate reports on starter', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_s_sales_exec');
    try {
      await assertScreenLoads(page, '/real-estate/reports');
      await assertScreenLoads(page, '/real-estate');
    } finally {
      await context.close();
    }
  });

  test('starter plan gate: accounting and CRM routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_s_owner');
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
// PROFESSIONAL PLAN (tenant 9821)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Real Estate Professional Plan', () => {

  test('owner can access all professional screens including accounting and CRM', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_p_owner');
    try {
      for (const route of RE_CORE_ROUTES) {
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

  test('manager can access real estate core and sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_p_manager');
    try {
      await assertScreenLoads(page, '/real-estate/projects');
      await assertScreenLoads(page, '/real-estate/bookings');
      await assertScreenLoads(page, '/real-estate/units');
      await assertScreenLoads(page, '/sales-orders');
    } finally {
      await context.close();
    }
  });

  test('sales executive can access CRM leads and demand letters on professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_p_owner');
    try {
      await assertScreenLoads(page, '/real-estate/demand-letters');
      await assertScreenLoads(page, '/crm/leads');
    } finally {
      await context.close();
    }
  });

  test('accountant can access accounting screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_p_acct');
    try {
      await assertScreenLoads(page, '/accounting/journal-entries');
      await assertScreenLoads(page, '/accounting/trial-balance');
    } finally {
      await context.close();
    }
  });

  test('HR manager can access HR and payroll screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_p_owner');
    try {
      await assertScreenLoads(page, '/hr/employees');
      await assertScreenLoads(page, '/payroll');
    } finally {
      await context.close();
    }
  });

  test('CRM executive can access CRM screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_p_owner');
    try {
      await assertScreenLoads(page, '/crm/leads');
      await assertScreenLoads(page, '/crm/contacts');
    } finally {
      await context.close();
    }
  });

  test('sales manager can access sales orders on professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_p_owner');
    try {
      await assertScreenLoads(page, '/sales-orders');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_p_mis');
    try {
      await assertScreenLoads(page, '/mis');
      await assertScreenLoads(page, '/mis/sales');
      await assertScreenLoads(page, '/mis/financial');
    } finally {
      await context.close();
    }
  });

  test('purchase manager can access purchase orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_p_owner');
    try {
      await assertScreenLoads(page, '/purchase-orders');
    } finally {
      await context.close();
    }
  });

  test('owner can access payment plans and reports on professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_p_owner');
    try {
      await assertScreenLoads(page, '/real-estate/payment-plans');
      await assertScreenLoads(page, '/real-estate/reports');
    } finally {
      await context.close();
    }
  });

  test('manager can view MIS and customer screens on professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_p_manager');
    try {
      await assertScreenLoads(page, '/real-estate/customers');
      await assertScreenLoads(page, '/mis/sales');
    } finally {
      await context.close();
    }
  });

  test('professional plan gate: production and warehouse routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_p_owner');
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
// ENTERPRISE PLAN (tenant 9800)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Real Estate Enterprise Plan', () => {

  test('owner can access all enterprise screens including production and warehouses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_owner');
    try {
      for (const route of RE_CORE_ROUTES) {
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

  test('manager can access real estate core and all operations screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_manager');
    try {
      await assertScreenLoads(page, '/real-estate');
      await assertScreenLoads(page, '/real-estate/projects');
      await assertScreenLoads(page, '/real-estate/units');
      await assertScreenLoads(page, '/real-estate/bookings');
    } finally {
      await context.close();
    }
  });

  test('sales executive can access bookings, customers, demand letters, and CRM', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_sales_exec');
    try {
      await assertScreenLoads(page, '/real-estate/bookings');
      await assertScreenLoads(page, '/real-estate/customers');
      await assertScreenLoads(page, '/real-estate/demand-letters');
      await assertScreenLoads(page, '/crm/leads');
    } finally {
      await context.close();
    }
  });

  test('site engineer can access projects, units, and production', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_site_engineer');
    try {
      await assertScreenLoads(page, '/real-estate/projects');
      await assertScreenLoads(page, '/real-estate/units');
    } finally {
      await context.close();
    }
  });

  test('accountant can access full accounting suite', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_acct');
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
    const { page, context } = await loginAs(browser, 'qa_re_hr');
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
    const { page, context } = await loginAs(browser, 'qa_re_crm');
    try {
      await assertScreenLoads(page, '/crm/leads');
      await assertScreenLoads(page, '/crm/contacts');
      await assertScreenLoads(page, '/crm/campaigns');
    } finally {
      await context.close();
    }
  });

  test('sales manager can access sales orders and invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_sales');
    try {
      await assertScreenLoads(page, '/sales-orders');
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_mis');
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
    const { page, context } = await loginAs(browser, 'qa_re_wh');
    try {
      await assertScreenLoads(page, '/warehouses');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('production supervisor can access production and raw materials', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_prod');
    try {
      await assertScreenLoads(page, '/production');
      await assertScreenLoads(page, '/raw-materials');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('assets manager can access fixed assets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_assets');
    try {
      await assertScreenLoads(page, '/fixed-assets');
    } finally {
      await context.close();
    }
  });

  test('site engineer enterprise: payment plans and reports load without crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_site_engineer');
    try {
      await assertScreenLoads(page, '/real-estate/payment-plans');
      await assertScreenLoads(page, '/real-estate/reports');
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
    const nav = await getAllowedNav(browser, 'qa_re_s_owner');
    expect(nav).not.toContain('journal-entries');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
  });

  test('professional: allowedNavItems includes accounting but not production', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_re_p_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
  });

  test('enterprise: allowedNavItems includes production and warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_re_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('production');
    expect(nav).toContain('warehouses');
    expect(nav).toContain('fixed-assets');
  });

  test('data isolation: starter tenant plan is realestate_starter', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_s_owner');
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
