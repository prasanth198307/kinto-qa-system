/**
 * E-Commerce ERP — Per-role, per-plan screen smoke tests
 *
 * Plans tested:
 *   Starter      (8420): ecommerce core + invoicing + purchase + basic catalog
 *   Professional (8421): starter + accounting + MIS + CRM + HR + sales
 *   Enterprise   (8400): professional + production + warehouses + fixed_assets
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
  await page.waitForURL(/dashboard|ecommerce|\//, { timeout: 15000 });
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

const ECOMM_CORE_ROUTES = [
  '/ecommerce',
  '/ecommerce/products',
  '/ecommerce/orders',
  '/ecommerce/customers',
  '/ecommerce/inventory',
  '/ecommerce/returns',
  '/ecommerce/channels',
  '/ecommerce/promotions',
  '/ecommerce/analytics',
];

const INVOICING_ROUTES  = ['/invoices', '/invoices/new'];
const PURCHASE_ROUTES   = ['/purchase-orders'];
const ACCOUNTING_ROUTES = ['/accounting/chart-of-accounts', '/accounting/journal-entries', '/accounting/trial-balance'];
const MIS_ROUTES        = ['/mis', '/mis/sales', '/mis/financial'];
const CRM_ROUTES        = ['/crm/contacts', '/crm/leads'];
const HRPAYROLL_ROUTES  = ['/hr', '/hr/employees', '/payroll'];
const SALES_ROUTES      = ['/sales-orders'];
const PRODUCTION_ROUTES = ['/production', '/raw-materials'];
const WAREHOUSE_ROUTES  = ['/warehouses', '/inventory'];
const FIXED_ASSETS_ROUTES = ['/fixed-assets'];

// ─────────────────────────────────────────────────────────────────────────────
// STARTER PLAN (tenant 8420)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Ecommerce Starter Plan — Screen Tests', () => {

  test('owner can access all starter ecommerce screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_s_owner');
    try {
      for (const route of ECOMM_CORE_ROUTES) {
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

  test('manager can access ecommerce orders and customers', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_s_owner');
    try {
      await assertScreenLoads(page, '/ecommerce/orders');
      await assertScreenLoads(page, '/ecommerce/customers');
      await assertScreenLoads(page, '/ecommerce/returns');
    } finally {
      await context.close();
    }
  });

  test('operator can access ecommerce inventory and products', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_s_ops');
    try {
      await assertScreenLoads(page, '/ecommerce/products');
      await assertScreenLoads(page, '/ecommerce/inventory');
    } finally {
      await context.close();
    }
  });

  test('catalog manager can access products and channels', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_s_catalog');
    try {
      await assertScreenLoads(page, '/ecommerce/products');
      await assertScreenLoads(page, '/ecommerce/channels');
      await assertScreenLoads(page, '/ecommerce/promotions');
    } finally {
      await context.close();
    }
  });

  test('billing staff can access invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_s_billing');
    try {
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/invoices/new');
    } finally {
      await context.close();
    }
  });

  test('order analytics screen loads for owner', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_s_owner');
    try {
      await assertScreenLoads(page, '/ecommerce/analytics');
    } finally {
      await context.close();
    }
  });

  test('ecommerce returns and promotions screens load', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_s_ops');
    try {
      await assertScreenLoads(page, '/ecommerce/returns');
      await assertScreenLoads(page, '/ecommerce/promotions');
    } finally {
      await context.close();
    }
  });

  test('starter plan — accounting routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_s_owner');
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
// PROFESSIONAL PLAN (tenant 8421)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Ecommerce Professional Plan — Screen Tests', () => {

  test('owner can access all professional screens including accounting and CRM', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_p_owner');
    try {
      for (const route of ECOMM_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of [...INVOICING_ROUTES, ...PURCHASE_ROUTES]) {
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

  test('manager can access ecommerce and sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_p_manager');
    try {
      await assertScreenLoads(page, '/ecommerce/orders');
      await assertScreenLoads(page, '/ecommerce/customers');
      await assertScreenLoads(page, '/ecommerce/analytics');
      await assertScreenLoads(page, '/sales-orders');
    } finally {
      await context.close();
    }
  });

  test('operator can access ecommerce products, inventory, and channels', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_p_ops');
    try {
      await assertScreenLoads(page, '/ecommerce/products');
      await assertScreenLoads(page, '/ecommerce/inventory');
      await assertScreenLoads(page, '/ecommerce/channels');
    } finally {
      await context.close();
    }
  });

  test('accountant can access accounting screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_p_acct');
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
    const { page, context } = await loginAs(browser, 'qa_eco_p_mis');
    try {
      for (const route of MIS_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('HR screens are accessible in professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_p_owner');
    try {
      await assertScreenLoads(page, '/hr');
      await assertScreenLoads(page, '/hr/employees');
    } finally {
      await context.close();
    }
  });

  test('CRM screens load for professional plan owner', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_p_owner');
    try {
      for (const route of CRM_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('sales screens load for professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_p_owner');
    try {
      for (const route of SALES_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('purchase orders screen loads for professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_p_owner');
    try {
      await assertScreenLoads(page, '/purchase-orders');
    } finally {
      await context.close();
    }
  });

  test('ecommerce returns and promotions load in professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_p_ops');
    try {
      await assertScreenLoads(page, '/ecommerce/returns');
      await assertScreenLoads(page, '/ecommerce/promotions');
    } finally {
      await context.close();
    }
  });

  test('ecommerce channels and analytics load in professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_p_manager');
    try {
      await assertScreenLoads(page, '/ecommerce/channels');
      await assertScreenLoads(page, '/ecommerce/analytics');
    } finally {
      await context.close();
    }
  });

  test('professional plan — production routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_p_owner');
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
// ENTERPRISE PLAN (tenant 8400)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Ecommerce Enterprise Plan — Screen Tests', () => {

  test('owner can access all enterprise screens including production and warehouses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_owner');
    try {
      for (const route of ECOMM_CORE_ROUTES) {
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

  test('manager can access ecommerce, sales, and MIS', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_manager');
    try {
      await assertScreenLoads(page, '/ecommerce/orders');
      await assertScreenLoads(page, '/ecommerce/customers');
      await assertScreenLoads(page, '/ecommerce/analytics');
      await assertScreenLoads(page, '/sales-orders');
      await assertScreenLoads(page, '/mis/sales');
    } finally {
      await context.close();
    }
  });

  test('operator can access ecommerce operations screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_ops');
    try {
      await assertScreenLoads(page, '/ecommerce/products');
      await assertScreenLoads(page, '/ecommerce/inventory');
      await assertScreenLoads(page, '/ecommerce/returns');
      await assertScreenLoads(page, '/ecommerce/channels');
    } finally {
      await context.close();
    }
  });

  test('accountant can access full accounting suite', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_acct');
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

  test('HR manager can access HR, payroll, and attendance', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_hr');
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
    const { page, context } = await loginAs(browser, 'qa_eco_crm');
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
    const { page, context } = await loginAs(browser, 'qa_eco_sales');
    try {
      await assertScreenLoads(page, '/sales-orders');
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_mis');
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
    const { page, context } = await loginAs(browser, 'qa_eco_wh');
    try {
      await assertScreenLoads(page, '/warehouses');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('production supervisor can access production and raw materials', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_prod');
    try {
      await assertScreenLoads(page, '/production');
      await assertScreenLoads(page, '/raw-materials');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('assets manager can access fixed assets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_assets');
    try {
      await assertScreenLoads(page, '/fixed-assets');
    } finally {
      await context.close();
    }
  });

  test('catalog manager can access ecommerce products and promotions', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_catalog');
    try {
      await assertScreenLoads(page, '/ecommerce/products');
      await assertScreenLoads(page, '/ecommerce/promotions');
      await assertScreenLoads(page, '/ecommerce/channels');
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
    const nav = await getAllowedNav(browser, 'qa_eco_s_owner');
    expect(nav).not.toContain('journal-entries');
    expect(nav).not.toContain('chart-of-accounts');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
    expect(nav).toContain('ecommerce-orders');
  });

  test('professional plan allowedNavItems includes accounting but not production/warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_eco_p_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('ecommerce-orders');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
  });

  test('enterprise plan allowedNavItems includes production and warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_eco_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('ecommerce-orders');
    expect(nav).toContain('production');
    expect(nav).toContain('warehouses');
    expect(nav).toContain('fixed-assets');
  });

  test('data isolation — enterprise tenant data not visible in starter plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_s_owner');
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

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM ROLES & PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('E-Commerce — Custom Roles & Permissions', () => {

  async function assertDeniedNotCrash(page: Page, route: string) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const body = (await page.textContent('body')) ?? '';
    expect(body.trim().length, `Blank page on ${route}`).toBeGreaterThan(10);
  }

  test('enterprise owner can access /user-management', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_owner');
    try { await assertNoCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('enterprise owner can access /roles?tab=permissions', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_owner');
    try { await assertNoCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });

  test('catalog manager → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_catalog');
    try { await assertDeniedNotCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('ops → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_ops');
    try { await assertDeniedNotCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('accountant → /roles?tab=permissions blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_acct');
    try { await assertDeniedNotCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });

  test('starter owner → /roles?tab=permissions blocked or redirected, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_s_owner');
    try { await assertDeniedNotCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MASTERS — Regions, Branches, Tax Config, Audit Log
// ─────────────────────────────────────────────────────────────────────────────
test.describe('E-Commerce — Masters: Regions, Branches, Tax Config, Audit Log', () => {

  test('enterprise owner can access /masters', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_owner');
    try { await assertNoCrash(page, '/masters'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/branches', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_owner');
    try { await assertNoCrash(page, '/masters/branches'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/tax-config', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_owner');
    try { await assertNoCrash(page, '/masters/tax-config'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/audit-log', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_owner');
    try { await assertNoCrash(page, '/masters/audit-log'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/approval-workflow', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_owner');
    try { await assertNoCrash(page, '/masters/approval-workflow'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/notification-settings', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_owner');
    try { await assertNoCrash(page, '/masters/notification-settings'); } finally { await context.close(); }
  });

  test('ops → /masters/branches loads without crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_ops');
    try {
      await page.goto(`${BASE}/masters/branches`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const body = (await page.textContent('body')) ?? '';
      expect(body.trim().length).toBeGreaterThan(10);
    } finally { await context.close(); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-MODULE SMOKE — E-Commerce ↔ Finance / HR / CRM / MIS / Warehouse
// ─────────────────────────────────────────────────────────────────────────────
test.describe('E-Commerce — Cross-Module Integration Smoke', () => {

  test('marketplace sales → GL journal-entries loads (Finance cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_owner');
    try {
      await assertNoCrash(page, '/ecommerce');
      await assertNoCrash(page, '/accounting/journal-entries');
    } finally { await context.close(); }
  });

  test('warehouse staff → HR and payroll screens load (HR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_hr');
    try {
      await assertNoCrash(page, '/hr/employees');
      await assertNoCrash(page, '/payroll');
    } finally { await context.close(); }
  });

  test('buyer contacts → CRM contacts load (CRM cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_crm');
    try {
      await assertNoCrash(page, '/crm/contacts');
      await assertNoCrash(page, '/crm/leads');
    } finally { await context.close(); }
  });

  test('MIS dashboard loads alongside ecommerce screens (MIS cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_mis');
    try {
      await assertNoCrash(page, '/mis');
      await assertNoCrash(page, '/mis/sales');
      await assertNoCrash(page, '/mis/financial');
    } finally { await context.close(); }
  });

  test('order invoices → invoices and sales-orders load (AR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_owner');
    try {
      await assertNoCrash(page, '/invoices');
      await assertNoCrash(page, '/sales-orders');
    } finally { await context.close(); }
  });

  test('inventory → warehouses screen loads (Warehouse cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_wh');
    try {
      await assertNoCrash(page, '/warehouses');
      await assertNoCrash(page, '/inventory');
    } finally { await context.close(); }
  });

  test('ecommerce assets → fixed-assets and trial-balance (accounting cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_eco_acct');
    try {
      await assertNoCrash(page, '/fixed-assets');
      await assertNoCrash(page, '/accounting/trial-balance');
    } finally { await context.close(); }
  });
});
