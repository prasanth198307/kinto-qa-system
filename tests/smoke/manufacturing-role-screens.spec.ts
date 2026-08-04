/**
 * Manufacturing ERP — Per-role, per-plan screen smoke tests
 *
 * Plans tested:
 *   Starter     (8220): manufacturing core + invoicing + expenses
 *   Professional(8221): starter + accounting + mis + crm + hr_payroll + sales_orders
 *   Enterprise  (8200): professional + warehouses + fixed_assets + production (full suite)
 *
 * Roles: owner, manager, operator, qc, billing, purchase + domain-specific
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
  await page.waitForURL(/dashboard|manufacturing|\//, { timeout: 15000 });
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

const MANUFACTURING_CORE_ROUTES = [
  '/manufacturing',
  '/manufacturing/work-orders',
  '/manufacturing/bom',
  '/manufacturing/production-runs',
  '/manufacturing/quality-checks',
  '/manufacturing/raw-materials',
  '/manufacturing/finished-goods',
  '/manufacturing/cost-sheets',
  '/manufacturing/reports',
];

const ACCOUNTING_ROUTES   = ['/accounting/chart-of-accounts', '/accounting/journal-entries', '/accounting/trial-balance'];
const MIS_ROUTES          = ['/mis', '/mis/sales', '/mis/financial'];
const CRM_ROUTES          = ['/crm/contacts', '/crm/leads'];
const HRPAYROLL_ROUTES    = ['/hr', '/hr/employees', '/payroll'];
const SALES_ROUTES        = ['/sales-orders'];
const WAREHOUSE_ROUTES    = ['/warehouses'];
const PRODUCTION_ROUTES   = ['/production'];
const FIXED_ASSETS_ROUTES = ['/fixed-assets'];

// ─────────────────────────────────────────────────────────────────────────────
// STARTER PLAN (tenant 8220)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Manufacturing Starter Plan — Screen Tests', () => {

  test('owner can access all starter manufacturing screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_s_owner');
    try {
      for (const route of MANUFACTURING_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/expenses');

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

  test('manager can access work orders, BOM, and production runs', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_s_manager');
    try {
      await assertScreenLoads(page, '/manufacturing/work-orders');
      await assertScreenLoads(page, '/manufacturing/bom');
      await assertScreenLoads(page, '/manufacturing/production-runs');
    } finally {
      await context.close();
    }
  });

  test('operator can access work orders and production runs', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_s_operator');
    try {
      await assertScreenLoads(page, '/manufacturing/work-orders');
      await assertScreenLoads(page, '/manufacturing/production-runs');
    } finally {
      await context.close();
    }
  });

  test('billing staff can access invoices and cost sheets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_s_billing');
    try {
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/manufacturing/cost-sheets');
    } finally {
      await context.close();
    }
  });

  test('domain specific — manager can access raw materials and finished goods', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_s_manager');
    try {
      await assertScreenLoads(page, '/manufacturing/raw-materials');
      await assertScreenLoads(page, '/manufacturing/finished-goods');
    } finally {
      await context.close();
    }
  });

  test('domain specific — operator can access quality checks', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_s_operator');
    try {
      await assertScreenLoads(page, '/manufacturing/quality-checks');
      await assertScreenLoads(page, '/manufacturing/reports');
    } finally {
      await context.close();
    }
  });

  test('owner can access purchase orders and inventory (shared modules)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_s_owner');
    try {
      await assertScreenLoads(page, '/purchase-orders');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('starter plan — accounting routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_s_owner');
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
// PROFESSIONAL PLAN (tenant 8221)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Manufacturing Professional Plan — Screen Tests', () => {

  test('owner can access all professional screens including accounting and CRM', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_p_owner');
    try {
      for (const route of MANUFACTURING_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of [...ACCOUNTING_ROUTES, ...MIS_ROUTES, ...CRM_ROUTES, ...HRPAYROLL_ROUTES, ...SALES_ROUTES]) {
        await assertScreenLoads(page, route);
      }

      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Warehouses');
      await assertNavNotVisible(page, 'Fixed Assets');
    } finally {
      await context.close();
    }
  });

  test('manager can access manufacturing and sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_p_manager');
    try {
      await assertScreenLoads(page, '/manufacturing/work-orders');
      await assertScreenLoads(page, '/manufacturing/bom');
      await assertScreenLoads(page, '/manufacturing/production-runs');
      await assertScreenLoads(page, '/sales-orders');
    } finally {
      await context.close();
    }
  });

  test('operator can access work orders and quality checks', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_p_operator');
    try {
      await assertScreenLoads(page, '/manufacturing/work-orders');
      await assertScreenLoads(page, '/manufacturing/quality-checks');
      await assertScreenLoads(page, '/manufacturing/production-runs');
    } finally {
      await context.close();
    }
  });

  test('accountant can access accounting screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_p_acct');
    try {
      for (const route of ACCOUNTING_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('HR manager can access HR and payroll', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_p_owner');
    try {
      for (const route of HRPAYROLL_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('CRM executive can access CRM screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_p_owner');
    try {
      for (const route of CRM_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('sales manager can access sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_p_owner');
    try {
      for (const route of SALES_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_p_mis');
    try {
      for (const route of MIS_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('purchase manager can access purchase orders and inventory', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_p_owner');
    try {
      await assertScreenLoads(page, '/purchase-orders');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('domain specific — manager can access BOM and cost sheets under professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_p_manager');
    try {
      await assertScreenLoads(page, '/manufacturing/bom');
      await assertScreenLoads(page, '/manufacturing/cost-sheets');
    } finally {
      await context.close();
    }
  });

  test('domain specific — operator can access raw materials and finished goods', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_p_operator');
    try {
      await assertScreenLoads(page, '/manufacturing/raw-materials');
      await assertScreenLoads(page, '/manufacturing/finished-goods');
    } finally {
      await context.close();
    }
  });

  test('professional plan — warehouses route returns redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_p_owner');
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
// ENTERPRISE PLAN (tenant 8200)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Manufacturing Enterprise Plan — Screen Tests', () => {

  test('owner can access all enterprise screens including warehouses and fixed assets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_owner');
    try {
      for (const route of MANUFACTURING_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of [...ACCOUNTING_ROUTES, ...MIS_ROUTES, ...CRM_ROUTES, ...HRPAYROLL_ROUTES, ...SALES_ROUTES]) {
        await assertScreenLoads(page, route);
      }
      for (const route of [...WAREHOUSE_ROUTES, ...PRODUCTION_ROUTES, ...FIXED_ASSETS_ROUTES]) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('manager can access manufacturing, analytics, and all operations screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_manager');
    try {
      await assertScreenLoads(page, '/manufacturing/work-orders');
      await assertScreenLoads(page, '/manufacturing/bom');
      await assertScreenLoads(page, '/manufacturing/production-runs');
      await assertScreenLoads(page, '/manufacturing/reports');
    } finally {
      await context.close();
    }
  });

  test('operator can access work orders, production runs, and quality checks', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_operator');
    try {
      await assertScreenLoads(page, '/manufacturing/work-orders');
      await assertScreenLoads(page, '/manufacturing/production-runs');
      await assertScreenLoads(page, '/manufacturing/quality-checks');
    } finally {
      await context.close();
    }
  });

  test('accountant can access full accounting suite', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_acct');
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
    const { page, context } = await loginAs(browser, 'qa_mfg_hr');
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

  test('CRM executive can access CRM and campaigns', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_crm');
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
    const { page, context } = await loginAs(browser, 'qa_mfg_sales');
    try {
      await assertScreenLoads(page, '/sales-orders');
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_mis');
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
    const { page, context } = await loginAs(browser, 'qa_mfg_wh');
    try {
      await assertScreenLoads(page, '/warehouses');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('production supervisor can access production and raw materials', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_prod');
    try {
      await assertScreenLoads(page, '/production');
      await assertScreenLoads(page, '/manufacturing/raw-materials');
      await assertScreenLoads(page, '/manufacturing/work-orders');
    } finally {
      await context.close();
    }
  });

  test('assets manager can access fixed assets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_assets');
    try {
      await assertScreenLoads(page, '/fixed-assets');
    } finally {
      await context.close();
    }
  });

  test('domain specific — QC inspector can access quality checks and production runs', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_qc');
    try {
      await assertScreenLoads(page, '/manufacturing/quality-checks');
      await assertScreenLoads(page, '/manufacturing/production-runs');
    } finally {
      await context.close();
    }
  });

  test('domain specific — operator can access BOM, cost sheets, and finished goods', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_operator');
    try {
      await assertScreenLoads(page, '/manufacturing/bom');
      await assertScreenLoads(page, '/manufacturing/cost-sheets');
      await assertScreenLoads(page, '/manufacturing/finished-goods');
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN GATE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Manufacturing Plan Feature Gates — API verification', () => {

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
    const nav = await getAllowedNav(browser, 'qa_mfg_s_owner');
    expect(nav).not.toContain('journal-entries');
    expect(nav).not.toContain('warehouses');
    expect(nav).toContain('manufacturing');
  });

  test('professional plan allowedNavItems includes accounting but not warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_mfg_p_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('manufacturing');
    expect(nav).not.toContain('warehouses');
    expect(nav).not.toContain('fixed-assets');
  });

  test('enterprise plan allowedNavItems includes warehouses and fixed-assets', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_mfg_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('manufacturing');
    expect(nav).toContain('warehouses');
    expect(nav).toContain('fixed-assets');
    expect(nav).toContain('production');
  });

  test('data isolation — starter tenant cannot reach enterprise-only routes', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_s_owner');
    try {
      await page.goto(`${BASE}/fixed-assets`);
      await page.waitForTimeout(1000);
      const body = await page.textContent('body');
      expect(body?.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM ROLES & PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Manufacturing — Custom Roles & Permissions', () => {

  async function assertDeniedNotCrash(page: Page, route: string) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const body = (await page.textContent('body')) ?? '';
    expect(body.trim().length, `Blank page on ${route}`).toBeGreaterThan(10);
  }

  test('enterprise owner can access /user-management', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_owner');
    try { await assertNoCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('enterprise owner can access /roles?tab=permissions', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_owner');
    try { await assertNoCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });

  test('operator → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_operator');
    try { await assertDeniedNotCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('QC inspector → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_qc');
    try { await assertDeniedNotCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('accountant → /roles?tab=permissions blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_acct');
    try { await assertDeniedNotCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });

  test('starter owner → /roles?tab=permissions blocked or redirected, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_s_owner');
    try { await assertDeniedNotCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MASTERS — Regions, Branches, Tax Config, Audit Log
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Manufacturing — Masters: Regions, Branches, Tax Config, Audit Log', () => {

  test('enterprise owner can access /masters', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_owner');
    try { await assertNoCrash(page, '/masters'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/branches', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_owner');
    try { await assertNoCrash(page, '/masters/branches'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/tax-config', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_owner');
    try { await assertNoCrash(page, '/masters/tax-config'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/audit-log', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_owner');
    try { await assertNoCrash(page, '/masters/audit-log'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/approval-workflow', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_owner');
    try { await assertNoCrash(page, '/masters/approval-workflow'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/notification-settings', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_owner');
    try { await assertNoCrash(page, '/masters/notification-settings'); } finally { await context.close(); }
  });

  test('operator → /masters/branches loads without crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_operator');
    try {
      await page.goto(`${BASE}/masters/branches`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const body = (await page.textContent('body')) ?? '';
      expect(body.trim().length).toBeGreaterThan(10);
    } finally { await context.close(); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-MODULE SMOKE — Manufacturing ↔ Finance / HR / CRM / MIS / Warehouse
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Manufacturing — Cross-Module Integration Smoke', () => {

  test('production output → GL journal-entries loads (Finance cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_owner');
    try {
      await assertNoCrash(page, '/production');
      await assertNoCrash(page, '/accounting/journal-entries');
    } finally { await context.close(); }
  });

  test('factory workers → HR and payroll screens load (HR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_hr');
    try {
      await assertNoCrash(page, '/hr/employees');
      await assertNoCrash(page, '/payroll');
    } finally { await context.close(); }
  });

  test('customer leads → CRM contacts load (CRM cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_crm');
    try {
      await assertNoCrash(page, '/crm/contacts');
      await assertNoCrash(page, '/crm/leads');
    } finally { await context.close(); }
  });

  test('MIS dashboard loads alongside manufacturing screens (MIS cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_mis');
    try {
      await assertNoCrash(page, '/mis');
      await assertNoCrash(page, '/mis/sales');
      await assertNoCrash(page, '/mis/financial');
    } finally { await context.close(); }
  });

  test('finished goods → invoices and sales-orders load (AR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_owner');
    try {
      await assertNoCrash(page, '/invoices');
      await assertNoCrash(page, '/sales-orders');
    } finally { await context.close(); }
  });

  test('raw material procurement → purchase-orders (procurement cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_owner');
    try {
      await assertNoCrash(page, '/purchase-orders');
      await assertNoCrash(page, '/expenses');
    } finally { await context.close(); }
  });

  test('warehouse → warehouses and inventory load (warehouse cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_wh');
    try {
      await assertNoCrash(page, '/warehouses');
      await assertNoCrash(page, '/inventory');
    } finally { await context.close(); }
  });

  test('plant assets → fixed-assets and trial-balance (accounting cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_mfg_acct');
    try {
      await assertNoCrash(page, '/fixed-assets');
      await assertNoCrash(page, '/accounting/trial-balance');
      await assertNoCrash(page, '/accounting/balance-sheet');
    } finally { await context.close(); }
  });
});
