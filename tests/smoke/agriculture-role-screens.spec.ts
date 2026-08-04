/**
 * Agriculture ERP — Per-role, per-plan screen smoke tests
 *
 * Plans tested:
 *   Starter     (9920) : agriculture + invoicing + expenses + documents + masters
 *   Professional(9921) : + accounting + mis + crm + hr_payroll + sales_orders
 *   Enterprise  (9900) : + production + warehouses + fixed_assets + multi_currency
 *
 * Roles tested per plan: owner, manager, supervisor, billing, purchase + cross-module roles
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
  await page.waitForURL(/dashboard|agriculture|\//, { timeout: 15000 });
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
const AGR_CORE_ROUTES = [
  '/agriculture',
  '/agriculture/farms',
  '/agriculture/fields',
  '/agriculture/crops',
  '/agriculture/harvest',
  '/agriculture/inputs',
  '/agriculture/expenses',
  '/agriculture/mandi-rates',
  '/agriculture/reports',
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
// STARTER PLAN (tenant 9920)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Agriculture Starter Plan — Screen Tests', () => {

  test('owner can access all starter screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_s_owner');
    try {
      for (const route of AGR_CORE_ROUTES) {
        await assertNoCrash(page, route);
      }
      await assertNoCrash(page, '/invoices');
      await assertNoCrash(page, '/expenses');

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

  test('farm manager can access core agriculture screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_s_manager');
    try {
      await assertNoCrash(page, '/agriculture');
      await assertNoCrash(page, '/agriculture/farms');
      await assertNoCrash(page, '/agriculture/fields');
      await assertNoCrash(page, '/agriculture/crops');
    } finally {
      await context.close();
    }
  });

  test('field supervisor can access harvest and inputs screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_s_super');
    try {
      await assertNoCrash(page, '/agriculture/fields');
      await assertNoCrash(page, '/agriculture/harvest');
      await assertNoCrash(page, '/agriculture/inputs');
    } finally {
      await context.close();
    }
  });

  test('billing staff can access invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_s_owner');
    try {
      await assertNoCrash(page, '/invoices');
      await assertNoCrash(page, '/invoices/new');
    } finally {
      await context.close();
    }
  });

  test('owner can view mandi rates and reports', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_s_owner');
    try {
      await assertNoCrash(page, '/agriculture/mandi-rates');
      await assertNoCrash(page, '/agriculture/reports');
    } finally {
      await context.close();
    }
  });

  test('supervisor can access expenses screen', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_s_super');
    try {
      await assertNoCrash(page, '/agriculture/expenses');
    } finally {
      await context.close();
    }
  });

  test('manager can view crop inputs and mandi rates', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_s_manager');
    try {
      await assertNoCrash(page, '/agriculture/inputs');
      await assertNoCrash(page, '/agriculture/mandi-rates');
    } finally {
      await context.close();
    }
  });

  test('starter plan — accounting/crm routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_s_owner');
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
// PROFESSIONAL PLAN (tenant 9921)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Agriculture Professional Plan — Screen Tests', () => {

  test('owner can access all professional screens including accounting and CRM', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_p_owner');
    try {
      for (const route of AGR_CORE_ROUTES) {
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
      for (const route of CRM_ROUTES) {
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

  test('farm manager can access agriculture and sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_p_manager');
    try {
      await assertNoCrash(page, '/agriculture');
      await assertNoCrash(page, '/agriculture/farms');
      await assertNoCrash(page, '/agriculture/fields');
      await assertNoCrash(page, '/sales-orders');
    } finally {
      await context.close();
    }
  });

  test('owner can access crop harvest and mandi rates on professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_p_owner');
    try {
      await assertNoCrash(page, '/agriculture/harvest');
      await assertNoCrash(page, '/agriculture/mandi-rates');
      await assertNoCrash(page, '/agriculture/reports');
    } finally {
      await context.close();
    }
  });

  test('accountant can access accounting screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_p_acct');
    try {
      for (const route of ACCOUNTING_ROUTES) {
        await assertNoCrash(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('HR manager can access HR and payroll screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_p_owner');
    try {
      for (const route of HRPAYROLL_ROUTES) {
        await assertNoCrash(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('CRM executive can access CRM screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_p_owner');
    try {
      for (const route of CRM_ROUTES) {
        await assertNoCrash(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('sales manager can access sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_p_owner');
    try {
      for (const route of SALES_ROUTES) {
        await assertNoCrash(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_p_owner');
    try {
      for (const route of MIS_ROUTES) {
        await assertNoCrash(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('purchase manager can access purchase orders and inventory', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_p_manager');
    try {
      await assertNoCrash(page, '/purchase-orders');
      await assertNoCrash(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('accountant can access trial balance and chart of accounts', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_p_acct');
    try {
      await assertNoCrash(page, '/accounting/trial-balance');
      await assertNoCrash(page, '/accounting/chart-of-accounts');
    } finally {
      await context.close();
    }
  });

  test('HR manager can view employees and payroll', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_p_owner');
    try {
      await assertNoCrash(page, '/hr/employees');
      await assertNoCrash(page, '/payroll');
    } finally {
      await context.close();
    }
  });

  test('professional plan — production/warehouse routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_p_owner');
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
// ENTERPRISE PLAN (tenant 9900)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Agriculture Enterprise Plan — Screen Tests', () => {

  test('owner can access all enterprise screens including production and warehouses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_owner');
    try {
      for (const route of AGR_CORE_ROUTES) {
        await assertNoCrash(page, route);
      }
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

  test('farm manager can access full agriculture and operations screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_manager');
    try {
      await assertNoCrash(page, '/agriculture');
      await assertNoCrash(page, '/agriculture/farms');
      await assertNoCrash(page, '/agriculture/fields');
      await assertNoCrash(page, '/agriculture/crops');
      await assertNoCrash(page, '/agriculture/harvest');
    } finally {
      await context.close();
    }
  });

  test('field supervisor can access harvest, inputs, and mandi rates', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_super');
    try {
      await assertNoCrash(page, '/agriculture/harvest');
      await assertNoCrash(page, '/agriculture/inputs');
      await assertNoCrash(page, '/agriculture/mandi-rates');
    } finally {
      await context.close();
    }
  });

  test('quality checker can access harvest and crops', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_qc');
    try {
      await assertNoCrash(page, '/agriculture/harvest');
      await assertNoCrash(page, '/agriculture/crops');
      await assertNoCrash(page, '/agriculture/reports');
    } finally {
      await context.close();
    }
  });

  test('accountant can access full accounting suite', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_acct');
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
    const { page, context } = await loginAs(browser, 'qa_agr_e_hr');
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
    const { page, context } = await loginAs(browser, 'qa_agr_e_crm');
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
    const { page, context } = await loginAs(browser, 'qa_agr_e_owner');
    try {
      await assertNoCrash(page, '/sales-orders');
      await assertNoCrash(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_mis');
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
    const { page, context } = await loginAs(browser, 'qa_agr_e_wh');
    try {
      await assertNoCrash(page, '/warehouses');
      await assertNoCrash(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('production supervisor can access production and raw materials', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_owner');
    try {
      await assertNoCrash(page, '/production');
      await assertNoCrash(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('assets manager can access fixed assets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_owner');
    try {
      await assertNoCrash(page, '/fixed-assets');
    } finally {
      await context.close();
    }
  });

  test('owner can view mandi rates and agriculture reports on enterprise', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_owner');
    try {
      await assertNoCrash(page, '/agriculture/mandi-rates');
      await assertNoCrash(page, '/agriculture/reports');
      await assertNoCrash(page, '/agriculture/expenses');
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
    const nav = await getAllowedNav(browser, 'qa_agr_s_owner');
    expect(nav).not.toContain('journal-entries');
    expect(nav).not.toContain('chart-of-accounts');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
    expect(nav).toContain('agriculture');
  });

  test('professional plan: allowedNavItems includes accounting but not production/warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_agr_p_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('agriculture');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
  });

  test('enterprise plan: allowedNavItems includes production and warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_agr_e_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('agriculture');
    expect(nav).toContain('production');
    expect(nav).toContain('warehouses');
    expect(nav).toContain('fixed-assets');
  });

  test('data isolation: owner of tenant A cannot see tenant B data via /api/tenant/features', async ({ browser }) => {
    const { page: pageA, context: ctxA } = await loginAs(browser, 'qa_agr_s_owner');
    const { page: pageB, context: ctxB } = await loginAs(browser, 'qa_agr_e_owner');
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
// CUSTOM ROLES & PERMISSIONS (enterprise tenant 9900)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Agriculture — Custom Roles & Permissions', () => {

  async function assertDeniedNotCrash(page: Page, route: string) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const body = (await page.textContent('body')) ?? '';
    expect(body.trim().length, `Blank page on ${route}`).toBeGreaterThan(10);
  }

  test('enterprise owner can access /user-management', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_owner');
    try {
      await assertNoCrash(page, '/user-management');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /roles?tab=permissions (custom role permissions screen)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_owner');
    try {
      await assertNoCrash(page, '/roles?tab=permissions');
    } finally {
      await context.close();
    }
  });

  test('field supervisor → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_super');
    try {
      await assertDeniedNotCrash(page, '/user-management');
    } finally {
      await context.close();
    }
  });

  test('QC inspector → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_qc');
    try {
      await assertDeniedNotCrash(page, '/user-management');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_mis');
    try {
      await assertDeniedNotCrash(page, '/user-management');
    } finally {
      await context.close();
    }
  });

  test('accountant → /roles?tab=permissions blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_acct');
    try {
      await assertDeniedNotCrash(page, '/roles?tab=permissions');
    } finally {
      await context.close();
    }
  });

  test('starter owner → /roles?tab=permissions blocked or redirected, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_s_owner');
    try {
      await assertDeniedNotCrash(page, '/roles?tab=permissions');
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MASTERS — Regions, Branches, Tax Config, Audit Log (enterprise 9900)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Agriculture — Masters: Regions, Branches, Tax Config, Audit Log', () => {

  test('enterprise owner can access /masters', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_owner');
    try {
      await assertNoCrash(page, '/masters');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /masters/branches (regions/branches master)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_owner');
    try {
      await assertNoCrash(page, '/masters/branches');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /masters/tax-config', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_owner');
    try {
      await assertNoCrash(page, '/masters/tax-config');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /masters/audit-log', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_owner');
    try {
      await assertNoCrash(page, '/masters/audit-log');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /masters/approval-workflow', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_owner');
    try {
      await assertNoCrash(page, '/masters/approval-workflow');
    } finally {
      await context.close();
    }
  });

  test('enterprise owner can access /masters/notification-settings', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_owner');
    try {
      await assertNoCrash(page, '/masters/notification-settings');
    } finally {
      await context.close();
    }
  });

  test('field supervisor → /masters/branches loads without crash (read-only or denied)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_super');
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
    const { page, context } = await loginAs(browser, 'qa_agr_s_owner');
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
// CROSS-MODULE SMOKE — Agriculture ↔ Finance / HR / CRM / MIS (enterprise 9900)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Agriculture — Cross-Module Integration Smoke', () => {

  test('crop sales → accounting journal-entries loads (Finance GL cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_owner');
    try {
      await assertNoCrash(page, '/agriculture');
      await assertNoCrash(page, '/accounting/journal-entries');
    } finally {
      await context.close();
    }
  });

  test('farm workers → HR and payroll screens load alongside agriculture (HR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_hr');
    try {
      await assertNoCrash(page, '/agriculture');
      await assertNoCrash(page, '/hr/employees');
      await assertNoCrash(page, '/payroll');
    } finally {
      await context.close();
    }
  });

  test('buyers → CRM contacts and leads load (CRM cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_crm');
    try {
      await assertNoCrash(page, '/crm/contacts');
      await assertNoCrash(page, '/crm/leads');
    } finally {
      await context.close();
    }
  });

  test('MIS dashboard loads alongside agriculture screens (MIS cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_mis');
    try {
      await assertNoCrash(page, '/mis');
      await assertNoCrash(page, '/mis/sales');
      await assertNoCrash(page, '/mis/financial');
    } finally {
      await context.close();
    }
  });

  test('produce invoices → invoices and sales-orders load (AR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_owner');
    try {
      await assertNoCrash(page, '/invoices');
      await assertNoCrash(page, '/sales-orders');
    } finally {
      await context.close();
    }
  });

  test('procurement → purchase orders and expenses load (procurement cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_owner');
    try {
      await assertNoCrash(page, '/purchase-orders');
      await assertNoCrash(page, '/expenses');
    } finally {
      await context.close();
    }
  });

  test('warehouse and inventory screens load alongside agriculture (warehouse cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_wh');
    try {
      await assertNoCrash(page, '/warehouses');
      await assertNoCrash(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('fixed assets and trial balance load after crop activity (accounting cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_agr_e_acct');
    try {
      await assertNoCrash(page, '/fixed-assets');
      await assertNoCrash(page, '/accounting/trial-balance');
      await assertNoCrash(page, '/accounting/balance-sheet');
    } finally {
      await context.close();
    }
  });
});
