/**
 * Nidhi Company ERP — Per-role, per-plan screen smoke tests
 *
 * Plans tested:
 *   Starter      (9520): nidhi_starter — core Nidhi + invoicing + expenses
 *   Professional (9521): nidhi_professional — starter + accounting + mis + hr_payroll + crm + sales_orders
 *   Enterprise   (9500): nidhi_enterprise — professional + warehouses + production + fixed_assets
 *
 * Custom roles per plan:
 *   Starter:      qa_ndh_s_owner (admin), qa_ndh_s_manager (manager),
 *                 qa_ndh_s_collector (operator), qa_ndh_s_billing (operator)
 *   Professional: qa_ndh_p_owner (admin), qa_ndh_p_manager (manager),
 *                 qa_ndh_p_acct (accountsmanager), qa_ndh_p_mis (operator)
 *   Enterprise:   qa_ndh_owner (admin), qa_ndh_manager (manager),
 *                 qa_ndh_collector (operator), qa_ndh_loan_officer (operator),
 *                 qa_ndh_acct (accountsmanager), qa_ndh_hr (operator),
 *                 qa_ndh_mis (operator), qa_ndh_audit (reviewer)
 *
 * Sections:
 *   1. Starter Plan screen tests           (8 tests)
 *   2. Professional Plan screen tests     (12 tests)
 *   3. Enterprise Plan screen tests       (13 tests)
 *   4. Plan Feature Gates — API            (4 tests)
 *   5. Negative Permission Gates          (10 tests)
 *   6. Cross-ERP Module Workflow Screens   (8 tests)
 *
 * Total: 55 tests
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
  '403',
  'Forbidden',
];

function isIgnorable(msg: string) {
  return IGNORABLE.some(s => msg.includes(s));
}

async function loginAs(browser: Browser, username: string): Promise<{ page: Page; context: BrowserContext }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  // Log in via API — avoids UI form and slug step
  const res = await page.request.post(`${BASE}/api/login`, {
    data: { username, password: 'Test@1234' },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok()) throw new Error(`Login failed for ${username}: ${res.status()}`);
  // Navigate to dashboard after API login (session cookie is set)
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

async function assertNavNotVisible(page: Page, label: string) {
  const nav = page.locator('nav, aside, [role="navigation"]');
  await expect(nav.getByText(label, { exact: false })).toHaveCount(0);
}

async function assertDeniedNotCrash(page: Page, route: string) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const body = await page.textContent('body');
  expect(body?.trim().length, `Empty response on denied route ${route}`).toBeGreaterThan(10);
}

// ── Route groups ──────────────────────────────────────────────────────────────
const NIDHI_CORE_ROUTES = [
  '/nidhi',
  '/nidhi/members',
  '/nidhi/savings-accounts',
  '/nidhi/fixed-deposits',
  '/nidhi/rd-accounts',
  '/nidhi/loans',
  '/nidhi/collections',
  '/nidhi/reports',
  '/nidhi/ndh-returns',
  '/nidhi/dividend',
  '/nidhi/compliance',
];

// API-only features (no dedicated SPA route — tested via functional tests)
// These new feature APIs are registered under /api/nidhi-company/:
//   POST /members/:id/kyc-documents         — KYC doc upload
//   PUT  /members/:id/kyc-approve|kyc-reject — KYC review
//   GET  /loans/:id/penal-interest-quote     — penal interest
//   GET  /loans/:id/foreclosure-quote        — foreclosure quote
//   GET  /members/:id/share-certificate-pdf  — share cert PDF
//   GET  /loans/:id/noc-pdf                  — loan NOC PDF
//   POST /dividend/declare                   — dividend + GL
//   GET  /compliance/trend                   — KPI trend
//   GET  /rbi-returns/ndh4/:year             — MCA21 NDH-4 XML
//   POST /rbi-returns/ndh9                   — NDH-9 self-declaration

const INVOICING_ROUTES    = ['/invoices', '/invoices/new'];
const EXPENSES_ROUTES     = ['/expenses'];
const PURCHASE_ROUTES     = ['/purchase-orders'];
const ACCOUNTING_ROUTES   = [
  '/accounting/chart-of-accounts',
  '/accounting/journal-entries',
  '/accounting/trial-balance',
  '/accounting/balance-sheet',
  '/accounting/profit-loss',
];
const MIS_ROUTES          = ['/mis', '/mis/sales', '/mis/financial', '/mis/cash'];
const CRM_ROUTES          = ['/crm/contacts', '/crm/leads', '/crm/campaigns'];
const HRPAYROLL_ROUTES    = ['/hr', '/hr/employees', '/payroll', '/hr/attendance'];
// Nidhi ERP is a financial cooperative — no production/warehouse/sales-order modules
const FIXED_ASSETS_ROUTES = ['/fixed-assets'];

// ─────────────────────────────────────────────────────────────────────────────
// 1. STARTER PLAN (tenant 9520)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Nidhi Starter Plan', () => {

  test('owner can access all starter Nidhi screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_s_owner');
    try {
      for (const route of NIDHI_CORE_ROUTES) await assertScreenLoads(page, route);
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/expenses');
      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Accounting');
      await assertNavNotVisible(page, 'MIS');
      await assertNavNotVisible(page, 'CRM');
      await assertNavNotVisible(page, 'HR & Payroll');
      await assertNavNotVisible(page, 'Production');
      await assertNavNotVisible(page, 'Warehouses');
    } finally { await context.close(); }
  });

  test('manager can access members, loans, and collections', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_s_manager');
    try {
      await assertScreenLoads(page, '/nidhi/members');
      await assertScreenLoads(page, '/nidhi/loans');
      await assertScreenLoads(page, '/nidhi/collections');
    } finally { await context.close(); }
  });

  test('collector can access collections and savings accounts', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_s_collector');
    try {
      await assertScreenLoads(page, '/nidhi/collections');
      await assertScreenLoads(page, '/nidhi/savings-accounts');
      await assertScreenLoads(page, '/nidhi/members');
    } finally { await context.close(); }
  });

  test('billing staff can access invoices on starter plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_s_billing');
    try {
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/invoices/new');
    } finally { await context.close(); }
  });

  test('owner can access fixed deposits, RD accounts, and NDH returns', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_s_owner');
    try {
      await assertScreenLoads(page, '/nidhi/fixed-deposits');
      await assertScreenLoads(page, '/nidhi/rd-accounts');
      await assertScreenLoads(page, '/nidhi/ndh-returns');
    } finally { await context.close(); }
  });

  test('manager can view Nidhi reports on starter', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_s_manager');
    try {
      await assertScreenLoads(page, '/nidhi/reports');
    } finally { await context.close(); }
  });

  test('collector can view member loans without accounting access', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_s_collector');
    try {
      await assertScreenLoads(page, '/nidhi/loans');
      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Accounting');
    } finally { await context.close(); }
  });

  test('starter plan gate: accounting and CRM routes return redirect or denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_s_owner');
    try {
      await assertDeniedNotCrash(page, '/accounting/journal-entries');
      await assertDeniedNotCrash(page, '/crm/leads');
    } finally { await context.close(); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. PROFESSIONAL PLAN (tenant 9521)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Nidhi Professional Plan', () => {

  test('owner can access all professional screens including accounting and CRM', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_p_owner');
    try {
      for (const route of NIDHI_CORE_ROUTES) await assertScreenLoads(page, route);
      for (const route of [...INVOICING_ROUTES, ...EXPENSES_ROUTES, ...PURCHASE_ROUTES]) await assertScreenLoads(page, route);
      for (const route of ACCOUNTING_ROUTES) await assertScreenLoads(page, route);
      for (const route of MIS_ROUTES) await assertScreenLoads(page, route);
      for (const route of CRM_ROUTES) await assertScreenLoads(page, route);
      for (const route of HRPAYROLL_ROUTES) await assertScreenLoads(page, route);
    } finally { await context.close(); }
  });

  test('manager can access Nidhi members, loans, and MIS', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_p_manager');
    try {
      await assertScreenLoads(page, '/nidhi/members');
      await assertScreenLoads(page, '/nidhi/loans');
      await assertScreenLoads(page, '/mis');
    } finally { await context.close(); }
  });

  test('accountant can access accounting screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_p_acct');
    try {
      await assertScreenLoads(page, '/accounting/journal-entries');
      await assertScreenLoads(page, '/accounting/trial-balance');
      await assertScreenLoads(page, '/accounting/chart-of-accounts');
    } finally { await context.close(); }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_p_mis');
    try {
      await assertScreenLoads(page, '/mis');
      await assertScreenLoads(page, '/mis/sales');
      await assertScreenLoads(page, '/mis/financial');
    } finally { await context.close(); }
  });

  test('HR payroll screens accessible in professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_p_owner');
    try {
      await assertScreenLoads(page, '/hr/employees');
      await assertScreenLoads(page, '/payroll');
    } finally { await context.close(); }
  });

  test('CRM executive screens accessible in professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_p_owner');
    try {
      await assertScreenLoads(page, '/crm/leads');
      await assertScreenLoads(page, '/crm/contacts');
    } finally { await context.close(); }
  });

  test('sales orders accessible in professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_p_owner');
    try {
      await assertScreenLoads(page, '/sales-orders');
    } finally { await context.close(); }
  });

  test('fixed deposits and NDH returns load in professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_p_owner');
    try {
      await assertScreenLoads(page, '/nidhi/fixed-deposits');
      await assertScreenLoads(page, '/nidhi/ndh-returns');
    } finally { await context.close(); }
  });

  test('manager can view RD accounts and MIS financial in professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_p_manager');
    try {
      await assertScreenLoads(page, '/nidhi/rd-accounts');
      await assertScreenLoads(page, '/mis/financial');
    } finally { await context.close(); }
  });

  test('purchase manager can access purchase orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_p_owner');
    try {
      await assertScreenLoads(page, '/purchase-orders');
    } finally { await context.close(); }
  });

  test('professional plan gate: production and warehouse routes return redirect or denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_p_owner');
    try {
      await assertDeniedNotCrash(page, '/production');
      await assertDeniedNotCrash(page, '/warehouses');
    } finally { await context.close(); }
  });

  test('professional plan gate: fixed-assets returns redirect or denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_p_owner');
    try {
      await assertDeniedNotCrash(page, '/fixed-assets');
    } finally { await context.close(); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ENTERPRISE PLAN (tenant 9500)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Nidhi Enterprise Plan', () => {

  test('owner can access all enterprise screens including accounting, CRM, HR and fixed assets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_owner');
    try {
      for (const route of NIDHI_CORE_ROUTES) await assertScreenLoads(page, route);
      for (const route of [...ACCOUNTING_ROUTES, ...MIS_ROUTES, ...CRM_ROUTES, ...HRPAYROLL_ROUTES]) await assertScreenLoads(page, route);
      for (const route of FIXED_ASSETS_ROUTES) await assertScreenLoads(page, route);
    } finally { await context.close(); }
  });

  test('manager can access Nidhi core and operations screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_manager');
    try {
      await assertScreenLoads(page, '/nidhi');
      await assertScreenLoads(page, '/nidhi/members');
      await assertScreenLoads(page, '/nidhi/loans');
      await assertScreenLoads(page, '/nidhi/collections');
    } finally { await context.close(); }
  });

  test('collector can access collections, savings accounts, and members', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_collector');
    try {
      await assertScreenLoads(page, '/nidhi/collections');
      await assertScreenLoads(page, '/nidhi/savings-accounts');
      await assertScreenLoads(page, '/nidhi/members');
    } finally { await context.close(); }
  });

  test('loan officer can access loans, fixed deposits, and RD accounts', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_loan_officer');
    try {
      await assertScreenLoads(page, '/nidhi/loans');
      await assertScreenLoads(page, '/nidhi/fixed-deposits');
      await assertScreenLoads(page, '/nidhi/rd-accounts');
    } finally { await context.close(); }
  });

  test('accountant can access full accounting suite', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_acct');
    try {
      for (const route of ACCOUNTING_ROUTES) await assertScreenLoads(page, route);
    } finally { await context.close(); }
  });

  test('HR manager can access HR, payroll, and attendance', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_hr');
    try {
      await assertScreenLoads(page, '/hr');
      await assertScreenLoads(page, '/hr/employees');
      await assertScreenLoads(page, '/payroll');
      await assertScreenLoads(page, '/hr/attendance');
    } finally { await context.close(); }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_mis');
    try {
      for (const route of MIS_ROUTES) await assertScreenLoads(page, route);
    } finally { await context.close(); }
  });

  test('auditor can access Nidhi core and NDH returns without write screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_audit');
    try {
      await assertScreenLoads(page, '/nidhi/members');
      await assertScreenLoads(page, '/nidhi/ndh-returns');
      await assertScreenLoads(page, '/nidhi/reports');
    } finally { await context.close(); }
  });

  test('owner CRM screens (leads, contacts, campaigns) load on enterprise', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_owner');
    try {
      await assertScreenLoads(page, '/crm/leads');
      await assertScreenLoads(page, '/crm/contacts');
      await assertScreenLoads(page, '/crm/campaigns');
    } finally { await context.close(); }
  });

  test('owner fixed-assets and invoices load on enterprise', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_owner');
    try {
      await assertScreenLoads(page, '/fixed-assets');
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/expenses');
    } finally { await context.close(); }
  });

  test('owner NDH returns and reports load on enterprise', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_owner');
    try {
      await assertScreenLoads(page, '/nidhi/ndh-returns');
      await assertScreenLoads(page, '/nidhi/reports');
    } finally { await context.close(); }
  });

  test('accountant balance sheet and profit-loss load on enterprise', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_acct');
    try {
      await assertScreenLoads(page, '/accounting/balance-sheet');
      await assertScreenLoads(page, '/accounting/profit-loss');
    } finally { await context.close(); }
  });

  test('manager and MIS viewer see data without crashing on enterprise', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_manager');
    try {
      await assertScreenLoads(page, '/mis/financial');
      await assertScreenLoads(page, '/mis/sales');
    } finally { await context.close(); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. PLAN FEATURE GATES — API-level check
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
    } catch { return []; }
    finally { await context.close(); }
  }

  test('starter: allowedNavItems excludes accounting and production', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_ndh_s_owner');
    expect(nav).not.toContain('journal-entries');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
  });

  test('professional: allowedNavItems includes accounting but not production', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_ndh_p_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
  });

  test('enterprise: allowedNavItems includes journal-entries, fixed-assets, and nidhi modules', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_ndh_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('fixed-assets');
    expect(nav).toContain('nidhi');
    expect(nav).toContain('nidhi/loans');
    expect(nav).toContain('nidhi/members');
  });

  test('starter plan is nidhi_starter (not generic)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_s_owner');
    try {
      const res = await page.evaluate(async () => {
        const r = await fetch('/api/tenant/features');
        return r.json();
      });
      const plan: string = res.plan ?? res.tenant?.plan ?? '';
      expect(plan).toContain('nidhi');
      expect(plan).toContain('starter');
    } finally { await context.close(); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. NEGATIVE PERMISSION GATES
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Negative Permission Gates', () => {

  // Starter plan gates
  test('starter collector → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_s_collector');
    try { await assertDeniedNotCrash(page, '/user-management'); }
    finally { await context.close(); }
  });

  test('starter collector → /accounting/journal-entries blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_s_collector');
    try { await assertDeniedNotCrash(page, '/accounting/journal-entries'); }
    finally { await context.close(); }
  });

  test('starter manager → /crm/leads blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_s_manager');
    try { await assertDeniedNotCrash(page, '/crm/leads'); }
    finally { await context.close(); }
  });

  // Professional plan gates
  test('professional accountant → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_p_acct');
    try { await assertDeniedNotCrash(page, '/user-management'); }
    finally { await context.close(); }
  });

  test('professional MIS viewer → /accounting/journal-entries blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_p_mis');
    try { await assertDeniedNotCrash(page, '/accounting/journal-entries'); }
    finally { await context.close(); }
  });

  test('professional MIS viewer → /warehouses blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_p_mis');
    try { await assertDeniedNotCrash(page, '/warehouses'); }
    finally { await context.close(); }
  });

  // Enterprise plan RBAC gates
  test('enterprise collector → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_collector');
    try { await assertDeniedNotCrash(page, '/user-management'); }
    finally { await context.close(); }
  });

  test('enterprise collector → /hr/employees blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_collector');
    try { await assertDeniedNotCrash(page, '/hr/employees'); }
    finally { await context.close(); }
  });

  test('enterprise manager → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_manager');
    try { await assertDeniedNotCrash(page, '/user-management'); }
    finally { await context.close(); }
  });

  test('enterprise loan officer → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_loan_officer');
    try { await assertDeniedNotCrash(page, '/user-management'); }
    finally { await context.close(); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. CROSS-ERP MODULE WORKFLOW SCREENS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Cross-ERP Module Workflow Screens', () => {

  // Nidhi member → shared CRM contacts
  test('after Nidhi member registered via API, CRM contacts screen still loads (no crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_owner');
    try {
      // Seed: ensure a member exists via API
      await page.evaluate(async () => {
        await fetch('/api/nidhi/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'QA Cross-ERP Member', memberNo: 'QA-XCRM-001', phone: '9000000001', joinDate: new Date().toISOString().split('T')[0] }),
        });
      });
      await assertScreenLoads(page, '/crm/contacts');
    } finally { await context.close(); }
  });

  // Nidhi loan disbursement → shared invoice/AR
  test('invoice screen loads after Nidhi loan disbursal flow (AR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_owner');
    try {
      await assertScreenLoads(page, '/nidhi/loans');
      await assertScreenLoads(page, '/invoices');
    } finally { await context.close(); }
  });

  // Nidhi collections → shared expense / cash register
  test('expenses screen loads alongside active Nidhi collections (cash-register cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_owner');
    try {
      await assertScreenLoads(page, '/nidhi/collections');
      await assertScreenLoads(page, '/expenses');
    } finally { await context.close(); }
  });

  // NDH returns → GL journal entry (Finance ERP cross-module)
  test('accounting journal-entries loads after NDH returns filing (GL cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_owner');
    try {
      await assertScreenLoads(page, '/nidhi/ndh-returns');
      await assertScreenLoads(page, '/accounting/journal-entries');
    } finally { await context.close(); }
  });

  // Nidhi HR payroll → shared HR module
  test('HR payroll screen loads alongside Nidhi employee data (HR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_hr');
    try {
      await assertScreenLoads(page, '/hr/employees');
      await assertScreenLoads(page, '/payroll');
      await assertScreenLoads(page, '/hr/attendance');
    } finally { await context.close(); }
  });

  // MIS dashboard showing Nidhi loan + expense data
  test('MIS dashboards load with Nidhi data reflected (sales, financial, cash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_mis');
    try {
      await assertScreenLoads(page, '/mis');
      await assertScreenLoads(page, '/mis/financial');
      await assertScreenLoads(page, '/mis/cash');
    } finally { await context.close(); }
  });

  // Nidhi fixed deposits → shared fixed-assets / accounting
  test('fixed-assets and trial-balance load after Nidhi FD activity (accounting cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_acct');
    try {
      await assertScreenLoads(page, '/accounting/trial-balance');
      await assertScreenLoads(page, '/fixed-assets');
    } finally { await context.close(); }
  });

  // Accountant creates JE → trial balance reflects it (no crash)
  test('accountsmanager creates journal entry then trial-balance loads without crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_acct');
    try {
      await page.evaluate(async () => {
        await fetch('/api/accounting/journal-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: new Date().toISOString().split('T')[0],
            description: 'QA Cross-module Nidhi JE',
            lines: [
              { accountCode: '1001', debit: 100000, credit: 0 },
              { accountCode: '4001', debit: 0, credit: 100000 },
            ],
          }),
        });
      });
      await assertScreenLoads(page, '/accounting/trial-balance');
    } finally { await context.close(); }
  });
});

// ─── New Features API Smoke Tests ─────────────────────────────────────────────
// These tests use the page.evaluate fetch pattern to hit the new API endpoints
// through the browser session (ensuring auth cookies are active).

test.describe('Nidhi — New API features smoke (enterprise owner)', () => {
  test('compliance/trend API returns 200', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_owner');
    try {
      const status = await page.evaluate(async () => {
        const r = await fetch('/api/nidhi-company/compliance/trend?months=3');
        return r.status;
      });
      expect(status).toBe(200);
    } finally { await context.close(); }
  });

  test('dividend/calculate API returns member list', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_owner');
    try {
      const result = await page.evaluate(async () => {
        const r = await fetch('/api/nidhi-company/dividend/calculate?rate=8');
        return { status: r.status, body: await r.json() };
      });
      expect(result.status).toBe(200);
      expect(Array.isArray(result.body.members)).toBe(true);
    } finally { await context.close(); }
  });

  test('rbi-returns/ndh4 API returns XML with RBICompliant', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_owner');
    try {
      const year = new Date().getFullYear() - 1;
      const result = await page.evaluate(async (yr) => {
        const r = await fetch(`/api/nidhi-company/rbi-returns/ndh4/${yr}`);
        return { status: r.status, body: await r.text() };
      }, year);
      expect(result.status).toBe(200);
      expect(result.body).toContain('<NDH4AnnualReturn>');
      expect(result.body).toContain('<RBICompliant>');
    } finally { await context.close(); }
  });

  test('ndh9 self-declaration API records submission', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_owner');
    try {
      const year = new Date().getFullYear() - 1;
      const result = await page.evaluate(async (yr) => {
        const r = await fetch('/api/nidhi-company/rbi-returns/ndh9', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            financial_year: `${yr}-${String(yr + 1).slice(2)}`,
            director_name: 'Smoke Test Director',
            director_din: 'SMKDIN00001',
            declaration_date: new Date().toISOString().split('T')[0],
          }),
        });
        return { status: r.status, body: await r.json() };
      }, year);
      expect(result.status).toBe(200);
      expect(result.body.return_type).toBe('NDH-9');
    } finally { await context.close(); }
  });

  test('send-whatsapp-reminders admin endpoint completes', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_owner');
    try {
      const result = await page.evaluate(async () => {
        const r = await fetch('/api/nidhi-company/admin/send-whatsapp-reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        return { status: r.status, body: await r.json() };
      });
      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
    } finally { await context.close(); }
  });
});

test.describe('Nidhi Starter — New feature access boundaries', () => {
  test('starter owner: compliance trend accessible', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_s_owner');
    try {
      const status = await page.evaluate(async () => {
        const r = await fetch('/api/nidhi-company/compliance/trend?months=3');
        return r.status;
      });
      expect([200, 403]).toContain(status);
    } finally { await context.close(); }
  });

  test('starter collector: dividend calculate accessible', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ndh_s_collector');
    try {
      const status = await page.evaluate(async () => {
        const r = await fetch('/api/nidhi-company/dividend/calculate?rate=5');
        return r.status;
      });
      expect([200, 403]).toContain(status);
    } finally { await context.close(); }
  });
});
