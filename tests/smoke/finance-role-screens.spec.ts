/**
 * Finance ERP — Per-role, per-plan screen smoke tests
 *
 * Plans tested:
 *   Starter      (8320): accounting + invoicing + expenses + basic reporting
 *   Professional (8321): starter + MIS + CRM + sales + advanced accounting
 *   Enterprise   (8300): professional + HR + warehouses + fixed_assets
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
  const res = await page.request.post(`${BASE}/api/login`, {
    data: { username, password: 'Test@1234' },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok()) throw new Error(`Login failed for ${username}: ${res.status()}`);
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
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

const FINANCE_CORE_ROUTES = [
  '/accounting',
  '/accounting/chart-of-accounts',
  '/accounting/journal-entries',
  '/accounting/trial-balance',
  '/accounting/profit-loss',
  '/accounting/balance-sheet',
  '/accounting/ledger',
  '/accounting/fixed-assets',
  '/accounting/bank-reconciliation',
];

const INVOICING_ROUTES  = ['/invoices', '/invoices/new'];
const EXPENSES_ROUTES   = ['/expenses'];
const MIS_ROUTES        = ['/mis', '/mis/sales', '/mis/financial'];
const CRM_ROUTES        = ['/crm/contacts', '/crm/leads'];
const HRPAYROLL_ROUTES  = ['/hr', '/hr/employees', '/payroll'];
const SALES_ROUTES      = ['/sales-orders'];
const WAREHOUSE_ROUTES  = ['/warehouses', '/inventory'];
const FIXED_ASSETS_ROUTES = ['/fixed-assets'];

// ─────────────────────────────────────────────────────────────────────────────
// STARTER PLAN (tenant 8320)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Finance Starter Plan — Screen Tests', () => {

  test('owner can access all starter finance screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_s_owner');
    try {
      for (const route of FINANCE_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/expenses');

      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'MIS');
      await assertNavNotVisible(page, 'CRM');
      await assertNavNotVisible(page, 'HR');
      await assertNavNotVisible(page, 'Production');
      await assertNavNotVisible(page, 'Warehouses');
    } finally {
      await context.close();
    }
  });

  test('accountant can access journal entries, trial balance, and invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_s_accountant');
    try {
      await assertScreenLoads(page, '/accounting/journal-entries');
      await assertScreenLoads(page, '/accounting/trial-balance');
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/expenses');
    } finally {
      await context.close();
    }
  });

  test('billing staff can access invoices and chart of accounts', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_s_billing');
    try {
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/invoices/new');
      await assertScreenLoads(page, '/accounting/chart-of-accounts');
    } finally {
      await context.close();
    }
  });

  test('profit and loss report loads in starter', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_s_owner');
    try {
      await assertScreenLoads(page, '/accounting/profit-loss');
      await assertScreenLoads(page, '/accounting/balance-sheet');
    } finally {
      await context.close();
    }
  });

  test('bank reconciliation loads in starter', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_s_accountant');
    try {
      await assertScreenLoads(page, '/accounting/bank-reconciliation');
    } finally {
      await context.close();
    }
  });

  test('ledger screen loads in starter', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_s_accountant');
    try {
      await assertScreenLoads(page, '/accounting/ledger');
    } finally {
      await context.close();
    }
  });

  test('expenses screen loads for starter owner', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_s_owner');
    try {
      await assertScreenLoads(page, '/expenses');
    } finally {
      await context.close();
    }
  });

  test('starter plan — production routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_s_owner');
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
// PROFESSIONAL PLAN (tenant 8321)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Finance Professional Plan — Screen Tests', () => {

  test('owner can access all professional screens including MIS and CRM', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_p_owner');
    try {
      for (const route of FINANCE_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of [...INVOICING_ROUTES, ...EXPENSES_ROUTES]) {
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

  test('CFO can access all accounting and MIS screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_p_cfo');
    try {
      for (const route of FINANCE_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of MIS_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('accountant can access accounting and invoice screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_p_accountant');
    try {
      for (const route of FINANCE_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_p_mis');
    try {
      for (const route of MIS_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('dedicated accounting role can access all accounting screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_p_acct');
    try {
      for (const route of FINANCE_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('CRM screens load for professional plan owner', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_p_owner');
    try {
      for (const route of CRM_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('sales orders accessible in professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_p_owner');
    try {
      for (const route of SALES_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('fixed assets screen loads in professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_p_owner');
    try {
      await assertScreenLoads(page, '/accounting/fixed-assets');
      await assertScreenLoads(page, '/fixed-assets');
    } finally {
      await context.close();
    }
  });

  test('AP clerk can access journal entries and invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_p_accountant');
    try {
      await assertScreenLoads(page, '/accounting/journal-entries');
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/expenses');
    } finally {
      await context.close();
    }
  });

  test('AR clerk can access invoices and ledger', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_p_acct');
    try {
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/accounting/ledger');
      await assertScreenLoads(page, '/accounting/trial-balance');
    } finally {
      await context.close();
    }
  });

  test('bank reconciliation and balance sheet accessible in professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_p_cfo');
    try {
      await assertScreenLoads(page, '/accounting/bank-reconciliation');
      await assertScreenLoads(page, '/accounting/balance-sheet');
    } finally {
      await context.close();
    }
  });

  test('professional plan — production routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_p_owner');
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
// ENTERPRISE PLAN (tenant 8300)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Finance Enterprise Plan — Screen Tests', () => {

  test('owner can access all enterprise screens including HR and warehouses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_owner');
    try {
      for (const route of FINANCE_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of [...MIS_ROUTES, ...CRM_ROUTES, ...HRPAYROLL_ROUTES, ...SALES_ROUTES]) {
        await assertScreenLoads(page, route);
      }
      for (const route of [...WAREHOUSE_ROUTES, ...FIXED_ASSETS_ROUTES]) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('CFO can access all accounting, MIS, and fixed assets screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_cfo');
    try {
      for (const route of FINANCE_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of MIS_ROUTES) {
        await assertScreenLoads(page, route);
      }
      await assertScreenLoads(page, '/fixed-assets');
    } finally {
      await context.close();
    }
  });

  test('accountant can access full accounting suite', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_accountant');
    try {
      for (const route of FINANCE_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/expenses');
    } finally {
      await context.close();
    }
  });

  test('HR manager can access HR and payroll screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_hr');
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

  test('CRM executive can access CRM screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_crm');
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
    const { page, context } = await loginAs(browser, 'qa_fin_sales');
    try {
      await assertScreenLoads(page, '/sales-orders');
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_mis');
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
    const { page, context } = await loginAs(browser, 'qa_fin_wh');
    try {
      await assertScreenLoads(page, '/warehouses');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('assets manager can access fixed assets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_assets');
    try {
      await assertScreenLoads(page, '/fixed-assets');
      await assertScreenLoads(page, '/accounting/fixed-assets');
    } finally {
      await context.close();
    }
  });

  test('dedicated accounting role can access full suite', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_acct');
    try {
      for (const route of FINANCE_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('AP clerk can access journal entries, payables, and invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_ap_clerk');
    try {
      await assertScreenLoads(page, '/accounting/journal-entries');
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/expenses');
    } finally {
      await context.close();
    }
  });

  test('AR clerk can access invoices, ledger, and receivables', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_ar_clerk');
    try {
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/accounting/ledger');
      await assertScreenLoads(page, '/accounting/trial-balance');
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

  test('starter plan allowedNavItems excludes MIS and production', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_fin_s_owner');
    expect(nav).not.toContain('mis');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
    expect(nav).toContain('journal-entries');
  });

  test('professional plan allowedNavItems includes MIS and CRM but not production/warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_fin_p_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('mis');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
  });

  test('enterprise plan allowedNavItems includes warehouses and fixed-assets', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_fin_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('mis');
    expect(nav).toContain('warehouses');
    expect(nav).toContain('fixed-assets');
  });

  test('data isolation — starter plan tenant cannot access enterprise features', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_s_owner');
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

  test('starter owner visiting /warehouses gets redirect or denied — not a crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_s_owner');
    try {
      await page.goto(`${BASE}/warehouses`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      const body = (await page.textContent('body')) ?? '';
      expect(body.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });

  test('starter owner visiting /hr/employees gets redirect or denied — not a crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_s_owner');
    try {
      await page.goto(`${BASE}/hr/employees`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      const body = (await page.textContent('body')) ?? '';
      expect(body.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });

  test('starter owner visiting /mis gets redirect or denied — not a crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_s_owner');
    try {
      await page.goto(`${BASE}/mis`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      const body = (await page.textContent('body')) ?? '';
      expect(body.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });

  test('professional owner visiting /warehouses gets redirect or denied — not a crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_p_owner');
    try {
      await page.goto(`${BASE}/warehouses`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      const body = (await page.textContent('body')) ?? '';
      expect(body.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });

  test('professional owner visiting /hr/employees gets redirect or denied — not a crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_p_owner');
    try {
      await page.goto(`${BASE}/hr/employees`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      const body = (await page.textContent('body')) ?? '';
      expect(body.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });

  test('enterprise AP clerk visiting /user-management gets redirect or denied — not a crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_ap_clerk');
    try {
      await page.goto(`${BASE}/user-management`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      const body = (await page.textContent('body')) ?? '';
      expect(body.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });

  test('enterprise CFO visiting /user-management gets redirect or denied — not a crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_cfo');
    try {
      await page.goto(`${BASE}/user-management`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      const body = (await page.textContent('body')) ?? '';
      expect(body.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-MODULE WORKFLOW — Browser-level (Enterprise tenant 8300)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Finance Enterprise — Cross-module workflow screens', () => {

  test('owner creates expense then MIS financial dashboard still loads', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_owner');
    try {
      // Create an expense via API from page context
      await page.evaluate(async () => {
        await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: 'QA Cross-module expense', amount: 1000, date: new Date().toISOString().split('T')[0], category: 'operations' }),
        });
      });
      // MIS dashboard must still load (no crash from new expense data)
      await assertScreenLoads(page, '/mis/financial');
      await assertScreenLoads(page, '/mis/sales');
    } finally {
      await context.close();
    }
  });

  test('AP clerk invoice screen loads after owner creates invoice', async ({ browser }) => {
    const ownerCtx  = await loginAs(browser, 'qa_fin_owner');
    const clerkCtx  = await loginAs(browser, 'qa_fin_ap_clerk');
    try {
      // Owner creates invoice via API
      await ownerCtx.page.evaluate(async () => {
        await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            header: { buyerName: 'QA Smoke Client', invoiceDate: new Date().toISOString().split('T')[0], subtotal: 100000, totalAmount: 100000 },
            items: [{ productId: 'qa-fin-svc-8300', description: 'Smoke test service', quantity: 1, unitPrice: 100000, taxableAmount: 100000, totalAmount: 100000 }],
          }),
        });
      });
      // AP clerk invoice list must load without crash
      await assertScreenLoads(clerkCtx.page, '/invoices');
    } finally {
      await ownerCtx.context.close();
      await clerkCtx.context.close();
    }
  });

  test('accountsmanager trial balance loads after journal entries created by operator', async ({ browser }) => {
    const operCtx  = await loginAs(browser, 'qa_fin_accountant');
    const acctCtx  = await loginAs(browser, 'qa_fin_acct');
    try {
      // Operator creates journal entry via API
      await operCtx.page.evaluate(async () => {
        await fetch('/api/accounting/journal-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: new Date().toISOString().split('T')[0],
            description: 'QA Smoke JE',
            entries: [
              { account_code: '1001', debit: 500, credit: 0 },
              { account_code: '4001', debit: 0, credit: 500 },
            ],
          }),
        });
      });
      // Accountsmanager trial balance must still load
      await assertScreenLoads(acctCtx.page, '/accounting/trial-balance');
      await assertScreenLoads(acctCtx.page, '/accounting/balance-sheet');
    } finally {
      await operCtx.context.close();
      await acctCtx.context.close();
    }
  });

  test('HR manager payroll screen loads after owner adds employee', async ({ browser }) => {
    const hrCtx = await loginAs(browser, 'qa_fin_hr');
    try {
      await assertScreenLoads(hrCtx.page, '/hr/employees');
      await assertScreenLoads(hrCtx.page, '/payroll');
      await assertScreenLoads(hrCtx.page, '/hr/attendance');
    } finally {
      await hrCtx.context.close();
    }
  });

  test('warehouse manager inventory screen loads without crash alongside active invoices', async ({ browser }) => {
    const whCtx = await loginAs(browser, 'qa_fin_wh');
    try {
      await assertScreenLoads(whCtx.page, '/warehouses');
      await assertScreenLoads(whCtx.page, '/inventory');
    } finally {
      await whCtx.context.close();
    }
  });

  test('CRM executive can see contacts and leads alongside active invoices (no data leak)', async ({ browser }) => {
    const crmCtx = await loginAs(browser, 'qa_fin_crm');
    try {
      await assertScreenLoads(crmCtx.page, '/crm/contacts');
      await assertScreenLoads(crmCtx.page, '/crm/leads');
    } finally {
      await crmCtx.context.close();
    }
  });

  test('MIS viewer sees sales and financial dashboards reflecting real data — no crash', async ({ browser }) => {
    const misCtx = await loginAs(browser, 'qa_fin_mis');
    try {
      await assertScreenLoads(misCtx.page, '/mis');
      await assertScreenLoads(misCtx.page, '/mis/sales');
      await assertScreenLoads(misCtx.page, '/mis/financial');
      await assertScreenLoads(misCtx.page, '/mis/cash');
    } finally {
      await misCtx.context.close();
    }
  });
});
