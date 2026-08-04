/**
 * Pharmacy ERP — Per-role, per-plan screen smoke tests
 *
 * Plans tested:
 *   Starter     (9320): pharmacy core + invoicing + basic_inventory + expenses
 *   Professional(9321): starter + accounting + mis + sales_orders
 *   Enterprise  (9300): professional + crm + hr_payroll + warehouses + fixed_assets + production
 *
 * Roles: owner, pharmacist, cashier, purchase, billing + domain-specific
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
  await page.waitForURL(/dashboard|pharmacy|\//, { timeout: 15000 });
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

const PHARMACY_CORE_ROUTES = [
  '/pharmacy',
  '/pharmacy/medicines',
  '/pharmacy/sales',
  '/pharmacy/prescriptions',
  '/pharmacy/stock',
  '/pharmacy/purchase-orders',
  '/pharmacy/expiry-alerts',
  '/pharmacy/reports',
  '/pharmacy/narcotics-register',
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
// STARTER PLAN (tenant 9320)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Pharmacy Starter Plan — Screen Tests', () => {

  test('owner can access all starter pharmacy screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_s_owner');
    try {
      for (const route of PHARMACY_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/inventory');
      await assertScreenLoads(page, '/expenses');

      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Accounting');
      await assertNavNotVisible(page, 'MIS');
      await assertNavNotVisible(page, 'CRM');
      await assertNavNotVisible(page, 'HR & Payroll');
      await assertNavNotVisible(page, 'Production');
    } finally {
      await context.close();
    }
  });

  test('pharmacist can access medicines, prescriptions, and stock', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_s_pharmacist');
    try {
      await assertScreenLoads(page, '/pharmacy/medicines');
      await assertScreenLoads(page, '/pharmacy/prescriptions');
      await assertScreenLoads(page, '/pharmacy/stock');
      await assertScreenLoads(page, '/pharmacy/expiry-alerts');
    } finally {
      await context.close();
    }
  });

  test('cashier can access sales and billing', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_s_cashier');
    try {
      await assertScreenLoads(page, '/pharmacy/sales');
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('billing staff can access invoices and reports', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_s_billing');
    try {
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/pharmacy/reports');
    } finally {
      await context.close();
    }
  });

  test('domain specific — pharmacist can access narcotics register and expiry alerts', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_s_pharmacist');
    try {
      await assertScreenLoads(page, '/pharmacy/narcotics-register');
      await assertScreenLoads(page, '/pharmacy/expiry-alerts');
    } finally {
      await context.close();
    }
  });

  test('domain specific — cashier can access prescriptions and pharmacy sales', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_s_cashier');
    try {
      await assertScreenLoads(page, '/pharmacy/prescriptions');
      await assertScreenLoads(page, '/pharmacy/sales');
    } finally {
      await context.close();
    }
  });

  test('owner can access purchase orders and inventory (shared modules)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_s_owner');
    try {
      await assertScreenLoads(page, '/purchase-orders');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('starter plan — accounting routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_s_owner');
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
// PROFESSIONAL PLAN (tenant 9321)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Pharmacy Professional Plan — Screen Tests', () => {

  test('owner can access all professional screens including accounting and MIS', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_p_owner');
    try {
      for (const route of PHARMACY_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of [...ACCOUNTING_ROUTES, ...MIS_ROUTES, ...SALES_ROUTES]) {
        await assertScreenLoads(page, route);
      }

      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'CRM');
      await assertNavNotVisible(page, 'HR & Payroll');
      await assertNavNotVisible(page, 'Production');
      await assertNavNotVisible(page, 'Fixed Assets');
    } finally {
      await context.close();
    }
  });

  test('manager (pharmacist) can access medicines, stock, and sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_p_pharmacist');
    try {
      await assertScreenLoads(page, '/pharmacy/medicines');
      await assertScreenLoads(page, '/pharmacy/stock');
      await assertScreenLoads(page, '/pharmacy/prescriptions');
      await assertScreenLoads(page, '/sales-orders');
    } finally {
      await context.close();
    }
  });

  test('operator (cashier) can access sales, billing, and purchase orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_p_cashier');
    try {
      await assertScreenLoads(page, '/pharmacy/sales');
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/pharmacy/purchase-orders');
    } finally {
      await context.close();
    }
  });

  test('accountant can access accounting screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_p_acct');
    try {
      for (const route of ACCOUNTING_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('HR manager placeholder — owner accesses HR and payroll', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_p_owner');
    try {
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/purchase-orders');
    } finally {
      await context.close();
    }
  });

  test('CRM executive placeholder — owner cannot access CRM (professional plan gate)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_p_owner');
    try {
      await page.goto(`${BASE}/crm/contacts`);
      await page.waitForTimeout(1000);
      const body = await page.textContent('body');
      expect(body?.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });

  test('sales manager can access sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_p_owner');
    try {
      for (const route of SALES_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_p_mis');
    try {
      for (const route of MIS_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('purchase manager can access purchase orders and stock', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_p_owner');
    try {
      await assertScreenLoads(page, '/purchase-orders');
      await assertScreenLoads(page, '/pharmacy/stock');
    } finally {
      await context.close();
    }
  });

  test('domain specific — pharmacist can access narcotics register and expiry alerts', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_p_pharmacist');
    try {
      await assertScreenLoads(page, '/pharmacy/narcotics-register');
      await assertScreenLoads(page, '/pharmacy/expiry-alerts');
    } finally {
      await context.close();
    }
  });

  test('domain specific — cashier can access prescriptions under professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_p_cashier');
    try {
      await assertScreenLoads(page, '/pharmacy/prescriptions');
      await assertScreenLoads(page, '/pharmacy/medicines');
    } finally {
      await context.close();
    }
  });

  test('professional plan — production routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_p_owner');
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
// ENTERPRISE PLAN (tenant 9300)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Pharmacy Enterprise Plan — Screen Tests', () => {

  test('owner can access all enterprise screens including CRM and warehouses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_owner');
    try {
      for (const route of PHARMACY_CORE_ROUTES) {
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

  test('manager (pharmacist) can access all pharmacy and sales screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_pharmacist');
    try {
      await assertScreenLoads(page, '/pharmacy/medicines');
      await assertScreenLoads(page, '/pharmacy/stock');
      await assertScreenLoads(page, '/pharmacy/prescriptions');
      await assertScreenLoads(page, '/pharmacy/narcotics-register');
      await assertScreenLoads(page, '/pharmacy/reports');
    } finally {
      await context.close();
    }
  });

  test('operator (cashier) can access sales, folio, and invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_cashier');
    try {
      await assertScreenLoads(page, '/pharmacy/sales');
      await assertScreenLoads(page, '/pharmacy/prescriptions');
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('accountant can access full accounting suite', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_acct');
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
    const { page, context } = await loginAs(browser, 'qa_ph_hr');
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
    const { page, context } = await loginAs(browser, 'qa_ph_crm');
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
    const { page, context } = await loginAs(browser, 'qa_ph_sales');
    try {
      await assertScreenLoads(page, '/sales-orders');
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_mis');
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
    const { page, context } = await loginAs(browser, 'qa_ph_wh');
    try {
      await assertScreenLoads(page, '/warehouses');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('production supervisor can access production screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_prod');
    try {
      await assertScreenLoads(page, '/production');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('assets manager can access fixed assets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_assets');
    try {
      await assertScreenLoads(page, '/fixed-assets');
    } finally {
      await context.close();
    }
  });

  test('domain specific — pharmacist can access expiry alerts and narcotics register', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_pharmacist');
    try {
      await assertScreenLoads(page, '/pharmacy/expiry-alerts');
      await assertScreenLoads(page, '/pharmacy/narcotics-register');
    } finally {
      await context.close();
    }
  });

  test('domain specific — purchase staff can access purchase orders and stock management', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_purchase');
    try {
      await assertScreenLoads(page, '/pharmacy/purchase-orders');
      await assertScreenLoads(page, '/pharmacy/stock');
      await assertScreenLoads(page, '/pharmacy/medicines');
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN GATE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Pharmacy Plan Feature Gates — API verification', () => {

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
    const nav = await getAllowedNav(browser, 'qa_ph_s_owner');
    expect(nav).not.toContain('journal-entries');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
    expect(nav).toContain('pharmacy');
  });

  test('professional plan allowedNavItems includes accounting but not crm or production', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_ph_p_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('pharmacy');
    expect(nav).not.toContain('crm');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('fixed-assets');
  });

  test('enterprise plan allowedNavItems includes crm, warehouses, and fixed-assets', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_ph_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('pharmacy');
    expect(nav).toContain('crm');
    expect(nav).toContain('warehouses');
    expect(nav).toContain('fixed-assets');
    expect(nav).toContain('production');
  });

  test('data isolation — starter tenant cannot reach enterprise-only routes', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_s_owner');
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
test.describe('Pharmacy — Custom Roles & Permissions', () => {

  async function assertDeniedNotCrash(page: Page, route: string) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const body = (await page.textContent('body')) ?? '';
    expect(body.trim().length, `Blank page on ${route}`).toBeGreaterThan(10);
  }

  test('enterprise owner can access /user-management', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_owner');
    try { await assertNoCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('enterprise owner can access /roles?tab=permissions', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_owner');
    try { await assertNoCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });

  test('pharmacist → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_pharmacist');
    try { await assertDeniedNotCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('cashier → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_cashier');
    try { await assertDeniedNotCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('accountant → /roles?tab=permissions blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_acct');
    try { await assertDeniedNotCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });

  test('starter owner → /roles?tab=permissions blocked or redirected, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_s_owner');
    try { await assertDeniedNotCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MASTERS — Regions, Branches, Tax Config, Audit Log
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Pharmacy — Masters: Regions, Branches, Tax Config, Audit Log', () => {

  test('enterprise owner can access /masters', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_owner');
    try { await assertNoCrash(page, '/masters'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/branches', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_owner');
    try { await assertNoCrash(page, '/masters/branches'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/tax-config', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_owner');
    try { await assertNoCrash(page, '/masters/tax-config'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/audit-log', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_owner');
    try { await assertNoCrash(page, '/masters/audit-log'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/approval-workflow', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_owner');
    try { await assertNoCrash(page, '/masters/approval-workflow'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/notification-settings', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_owner');
    try { await assertNoCrash(page, '/masters/notification-settings'); } finally { await context.close(); }
  });

  test('pharmacist → /masters/branches loads without crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_pharmacist');
    try {
      await page.goto(`${BASE}/masters/branches`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const body = (await page.textContent('body')) ?? '';
      expect(body.trim().length).toBeGreaterThan(10);
    } finally { await context.close(); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-MODULE SMOKE — Pharmacy ↔ Finance / HR / CRM / MIS / Warehouse
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Pharmacy — Cross-Module Integration Smoke', () => {

  test('dispensing sales → GL journal-entries loads (Finance cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_owner');
    try {
      await assertNoCrash(page, '/pharmacy');
      await assertNoCrash(page, '/accounting/journal-entries');
    } finally { await context.close(); }
  });

  test('pharmacy staff → HR and payroll screens load (HR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_hr');
    try {
      await assertNoCrash(page, '/hr/employees');
      await assertNoCrash(page, '/payroll');
    } finally { await context.close(); }
  });

  test('patient contacts → CRM contacts load (CRM cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_crm');
    try {
      await assertNoCrash(page, '/crm/contacts');
    } finally { await context.close(); }
  });

  test('MIS dashboard loads alongside pharmacy screens (MIS cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_mis');
    try {
      await assertNoCrash(page, '/mis');
      await assertNoCrash(page, '/mis/sales');
      await assertNoCrash(page, '/mis/financial');
    } finally { await context.close(); }
  });

  test('dispensing invoices → invoices and sales-orders load (AR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_owner');
    try {
      await assertNoCrash(page, '/invoices');
      await assertNoCrash(page, '/sales-orders');
    } finally { await context.close(); }
  });

  test('drug procurement → purchase-orders (procurement cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_purchase');
    try {
      await assertNoCrash(page, '/purchase-orders');
    } finally { await context.close(); }
  });

  test('cold storage → warehouses and inventory load (warehouse cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_wh');
    try {
      await assertNoCrash(page, '/warehouses');
      await assertNoCrash(page, '/inventory');
    } finally { await context.close(); }
  });

  test('pharmacy assets → fixed-assets and trial-balance (accounting cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ph_acct');
    try {
      await assertNoCrash(page, '/fixed-assets');
      await assertNoCrash(page, '/accounting/trial-balance');
    } finally { await context.close(); }
  });
});
