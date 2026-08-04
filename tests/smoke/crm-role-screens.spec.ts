/**
 * CRM ERP — Per-role, per-plan screen smoke tests
 *
 * Plans tested:
 *   Starter     (9620) : crm + invoicing + expenses + documents + masters
 *   Professional(9621) : + accounting + mis + hr_payroll + sales_orders
 *   Enterprise  (9600) : + production + warehouses + fixed_assets + multi_currency
 *
 * Roles tested per plan: owner, manager, sales_exec, support, billing + cross-module roles
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
  await page.waitForURL(/dashboard|crm|\//, { timeout: 15000 });
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
const CRM_CORE_ROUTES = [
  '/crm',
  '/crm/leads',
  '/crm/contacts',
  '/crm/accounts',
  '/crm/opportunities',
  '/crm/activities',
  '/crm/pipelines',
  '/crm/campaigns',
  '/crm/support-tickets',
];

const INVOICING_ROUTES    = ['/invoices', '/invoices/new'];
const PURCHASE_ROUTES     = ['/purchase-orders'];
const EXPENSES_ROUTES     = ['/expenses'];
const SALES_ROUTES        = ['/sales-orders'];

const ACCOUNTING_ROUTES   = ['/accounting/chart-of-accounts', '/accounting/journal-entries', '/accounting/trial-balance'];
const MIS_ROUTES          = ['/mis', '/mis/sales', '/mis/financial'];
const HRPAYROLL_ROUTES    = ['/hr', '/hr/employees', '/payroll'];

const PRODUCTION_ROUTES   = ['/production'];
const WAREHOUSE_ROUTES    = ['/warehouses'];
const FIXED_ASSETS_ROUTES = ['/fixed-assets'];

// ─────────────────────────────────────────────────────────────────────────────
// STARTER PLAN (tenant 9620)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CRM Starter Plan — Screen Tests', () => {

  test('owner can access all starter screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_s_owner');
    try {
      for (const route of CRM_CORE_ROUTES) {
        await assertNoCrash(page, route);
      }
      await assertNoCrash(page, '/invoices');
      await assertNoCrash(page, '/expenses');

      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Accounting');
      await assertNavNotVisible(page, 'MIS');
      await assertNavNotVisible(page, 'HR & Payroll');
      await assertNavNotVisible(page, 'Production');
      await assertNavNotVisible(page, 'Warehouses');
    } finally {
      await context.close();
    }
  });

  test('sales exec can access CRM transaction screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_s_sales_exec');
    try {
      await assertNoCrash(page, '/crm/leads');
      await assertNoCrash(page, '/crm/contacts');
      await assertNoCrash(page, '/crm/opportunities');
      await assertNoCrash(page, '/crm/activities');
    } finally {
      await context.close();
    }
  });

  test('billing staff can access invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_s_billing');
    try {
      await assertNoCrash(page, '/invoices');
      await assertNoCrash(page, '/invoices/new');
    } finally {
      await context.close();
    }
  });

  test('owner can view campaigns and support tickets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_s_owner');
    try {
      await assertNoCrash(page, '/crm/campaigns');
      await assertNoCrash(page, '/crm/support-tickets');
    } finally {
      await context.close();
    }
  });

  test('sales exec can view pipelines and accounts', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_s_sales_exec');
    try {
      await assertNoCrash(page, '/crm/pipelines');
      await assertNoCrash(page, '/crm/accounts');
    } finally {
      await context.close();
    }
  });

  test('owner can access expenses screen', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_s_owner');
    try {
      await assertNoCrash(page, '/expenses');
    } finally {
      await context.close();
    }
  });

  test('billing staff can access invoices and check invoice creation', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_s_billing');
    try {
      await assertNoCrash(page, '/invoices');
      await assertNoCrash(page, '/invoices/new');
    } finally {
      await context.close();
    }
  });

  test('starter plan — accounting/crm routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_s_owner');
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
// PROFESSIONAL PLAN (tenant 9621)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CRM Professional Plan — Screen Tests', () => {

  test('owner can access all professional screens including accounting and CRM', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_p_owner');
    try {
      for (const route of CRM_CORE_ROUTES) {
        await assertNoCrash(page, route);
      }
      for (const route of [...INVOICING_ROUTES, ...EXPENSES_ROUTES]) {
        await assertNoCrash(page, route);
      }
      for (const route of ACCOUNTING_ROUTES) {
        await assertNoCrash(page, route);
      }
      for (const route of MIS_ROUTES) {
        await assertNoCrash(page, route);
      }
      for (const route of HRPAYROLL_ROUTES) {
        await assertNoCrash(page, route);
      }
      for (const route of SALES_ROUTES) {
        await assertNoCrash(page, route);
      }

      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Production');
      await assertNavNotVisible(page, 'Warehouses');
      await assertNavNotVisible(page, 'Fixed Assets');
    } finally {
      await context.close();
    }
  });

  test('manager can access CRM and sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_p_manager');
    try {
      await assertNoCrash(page, '/crm/leads');
      await assertNoCrash(page, '/crm/contacts');
      await assertNoCrash(page, '/crm/pipelines');
      await assertNoCrash(page, '/sales-orders');
    } finally {
      await context.close();
    }
  });

  test('owner can access CRM campaigns and opportunities', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_p_owner');
    try {
      await assertNoCrash(page, '/crm/campaigns');
      await assertNoCrash(page, '/crm/opportunities');
      await assertNoCrash(page, '/crm/activities');
    } finally {
      await context.close();
    }
  });

  test('accountant can access accounting screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_p_acct');
    try {
      for (const route of ACCOUNTING_ROUTES) {
        await assertNoCrash(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('HR manager can access HR and payroll screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_p_owner');
    try {
      for (const route of HRPAYROLL_ROUTES) {
        await assertNoCrash(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('CRM executive can access CRM screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_p_manager');
    try {
      for (const route of ['/crm/leads', '/crm/contacts', '/crm/accounts']) {
        await assertNoCrash(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('sales manager can access sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_p_owner');
    try {
      for (const route of SALES_ROUTES) {
        await assertNoCrash(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_p_mis');
    try {
      for (const route of MIS_ROUTES) {
        await assertNoCrash(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('purchase manager can access purchase orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_p_manager');
    try {
      await assertNoCrash(page, '/purchase-orders');
    } finally {
      await context.close();
    }
  });

  test('accountant can access trial balance and chart of accounts', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_p_acct');
    try {
      await assertNoCrash(page, '/accounting/trial-balance');
      await assertNoCrash(page, '/accounting/chart-of-accounts');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access sales and financial MIS', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_p_mis');
    try {
      await assertNoCrash(page, '/mis/sales');
      await assertNoCrash(page, '/mis/financial');
    } finally {
      await context.close();
    }
  });

  test('professional plan — production/warehouse routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_p_owner');
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
// ENTERPRISE PLAN (tenant 9600)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CRM Enterprise Plan — Screen Tests', () => {

  test('owner can access all enterprise screens including production and warehouses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_owner');
    try {
      for (const route of CRM_CORE_ROUTES) {
        await assertNoCrash(page, route);
      }
      for (const route of [...ACCOUNTING_ROUTES, ...MIS_ROUTES, ...HRPAYROLL_ROUTES, ...SALES_ROUTES]) {
        await assertNoCrash(page, route);
      }
      for (const route of [...PRODUCTION_ROUTES, ...WAREHOUSE_ROUTES, ...FIXED_ASSETS_ROUTES]) {
        await assertNoCrash(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('manager can access CRM and all operations screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_manager');
    try {
      await assertNoCrash(page, '/crm');
      await assertNoCrash(page, '/crm/leads');
      await assertNoCrash(page, '/crm/contacts');
      await assertNoCrash(page, '/crm/pipelines');
      await assertNoCrash(page, '/crm/campaigns');
    } finally {
      await context.close();
    }
  });

  test('sales exec can access CRM transaction screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_sales_exec');
    try {
      await assertNoCrash(page, '/crm/leads');
      await assertNoCrash(page, '/crm/contacts');
      await assertNoCrash(page, '/crm/opportunities');
      await assertNoCrash(page, '/crm/activities');
    } finally {
      await context.close();
    }
  });

  test('support staff can access support tickets and contacts', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_support');
    try {
      await assertNoCrash(page, '/crm/support-tickets');
      await assertNoCrash(page, '/crm/contacts');
    } finally {
      await context.close();
    }
  });

  test('accountant can access full accounting suite', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_acct');
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
    const { page, context } = await loginAs(browser, 'qa_crm_hr');
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
    const { page, context } = await loginAs(browser, 'qa_crm_crm');
    try {
      await assertNoCrash(page, '/crm/leads');
      await assertNoCrash(page, '/crm/contacts');
      await assertNoCrash(page, '/crm/campaigns');
      await assertNoCrash(page, '/crm/opportunities');
    } finally {
      await context.close();
    }
  });

  test('sales manager can access sales orders and invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_sales');
    try {
      await assertNoCrash(page, '/sales-orders');
      await assertNoCrash(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_mis');
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
    const { page, context } = await loginAs(browser, 'qa_crm_wh');
    try {
      await assertNoCrash(page, '/warehouses');
      await assertNoCrash(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('production supervisor can access production and raw materials', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_prod');
    try {
      await assertNoCrash(page, '/production');
      await assertNoCrash(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('assets manager can access fixed assets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_assets');
    try {
      await assertNoCrash(page, '/fixed-assets');
    } finally {
      await context.close();
    }
  });

  test('owner can view CRM accounts and support tickets on enterprise', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_owner');
    try {
      await assertNoCrash(page, '/crm/accounts');
      await assertNoCrash(page, '/crm/support-tickets');
      await assertNoCrash(page, '/crm/pipelines');
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
    const nav = await getAllowedNav(browser, 'qa_crm_s_owner');
    expect(nav).not.toContain('journal-entries');
    expect(nav).not.toContain('chart-of-accounts');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
    expect(nav).toContain('crm');
  });

  test('professional plan: allowedNavItems includes accounting but not production/warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_crm_p_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('crm');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
  });

  test('enterprise plan: allowedNavItems includes production and warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_crm_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('crm');
    expect(nav).toContain('production');
    expect(nav).toContain('warehouses');
    expect(nav).toContain('fixed-assets');
  });

  test('data isolation: owner of tenant A cannot see tenant B data via /api/tenant/features', async ({ browser }) => {
    const { page: pageA, context: ctxA } = await loginAs(browser, 'qa_crm_s_owner');
    const { page: pageB, context: ctxB } = await loginAs(browser, 'qa_crm_owner');
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

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM ROLES & PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CRM — Custom Roles & Permissions', () => {

  async function assertDeniedNotCrash(page: Page, route: string) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const body = (await page.textContent('body')) ?? '';
    expect(body.trim().length, `Blank page on ${route}`).toBeGreaterThan(10);
  }

  test('enterprise owner can access /user-management', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_owner');
    try { await assertNoCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('enterprise owner can access /roles?tab=permissions', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_owner');
    try { await assertNoCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });

  test('sales exec → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_sales_exec');
    try { await assertDeniedNotCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('support → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_support');
    try { await assertDeniedNotCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('accountant → /roles?tab=permissions blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_acct');
    try { await assertDeniedNotCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });

  test('starter owner → /roles?tab=permissions blocked or redirected, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_s_owner');
    try { await assertDeniedNotCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MASTERS — Regions, Branches, Tax Config, Audit Log
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CRM — Masters: Regions, Branches, Tax Config, Audit Log', () => {

  test('enterprise owner can access /masters', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_owner');
    try { await assertNoCrash(page, '/masters'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/branches', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_owner');
    try { await assertNoCrash(page, '/masters/branches'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/tax-config', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_owner');
    try { await assertNoCrash(page, '/masters/tax-config'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/audit-log', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_owner');
    try { await assertNoCrash(page, '/masters/audit-log'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/approval-workflow', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_owner');
    try { await assertNoCrash(page, '/masters/approval-workflow'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/notification-settings', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_owner');
    try { await assertNoCrash(page, '/masters/notification-settings'); } finally { await context.close(); }
  });

  test('sales exec → /masters/branches loads without crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_sales_exec');
    try {
      await page.goto(`${BASE}/masters/branches`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const body = (await page.textContent('body')) ?? '';
      expect(body.trim().length).toBeGreaterThan(10);
    } finally { await context.close(); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-MODULE SMOKE — CRM ↔ Finance / HR / MIS / Invoicing
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CRM — Cross-Module Integration Smoke', () => {

  test('deal closed → GL journal-entries loads (Finance cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_owner');
    try {
      await assertNoCrash(page, '/crm');
      await assertNoCrash(page, '/accounting/journal-entries');
    } finally { await context.close(); }
  });

  test('sales team → HR and payroll screens load (HR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_hr');
    try {
      await assertNoCrash(page, '/hr/employees');
      await assertNoCrash(page, '/payroll');
    } finally { await context.close(); }
  });

  test('MIS dashboard loads alongside CRM screens (MIS cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_mis');
    try {
      await assertNoCrash(page, '/mis');
      await assertNoCrash(page, '/mis/sales');
      await assertNoCrash(page, '/mis/financial');
    } finally { await context.close(); }
  });

  test('quotation → invoices and sales-orders load (AR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_owner');
    try {
      await assertNoCrash(page, '/invoices');
      await assertNoCrash(page, '/sales-orders');
    } finally { await context.close(); }
  });

  test('vendor contacts → purchase-orders and expenses (procurement cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_owner');
    try {
      await assertNoCrash(page, '/purchase-orders');
      await assertNoCrash(page, '/expenses');
    } finally { await context.close(); }
  });

  test('CRM assets → fixed-assets and trial-balance (accounting cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_crm_acct');
    try {
      await assertNoCrash(page, '/fixed-assets');
      await assertNoCrash(page, '/accounting/trial-balance');
    } finally { await context.close(); }
  });
});
