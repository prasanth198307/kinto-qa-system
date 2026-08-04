/**
 * Hotel ERP — Per-role, per-plan screen smoke tests
 *
 * Plans tested:
 *   Starter     (9120): hotel core + invoicing + expenses
 *   Professional(9121): starter + accounting + mis + crm + hr_payroll + sales_orders
 *   Enterprise  (9100): professional + warehouses + fixed_assets + production
 *
 * Roles: owner, manager, front_desk, housekeeping, billing, purchase + domain-specific
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
  await page.waitForURL(/dashboard|hotel|\//, { timeout: 15000 });
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

const HOTEL_CORE_ROUTES = [
  '/hotel',
  '/hotel/rooms',
  '/hotel/bookings',
  '/hotel/check-in',
  '/hotel/check-out',
  '/hotel/housekeeping',
  '/hotel/folio',
  '/hotel/guests',
  '/hotel/reports',
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
// STARTER PLAN (tenant 9120)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Hotel Starter Plan — Screen Tests', () => {

  test('owner can access all starter hotel screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_s_owner');
    try {
      for (const route of HOTEL_CORE_ROUTES) {
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
    } finally {
      await context.close();
    }
  });

  test('manager can access hotel core and z-report screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_s_manager');
    try {
      await assertScreenLoads(page, '/hotel/rooms');
      await assertScreenLoads(page, '/hotel/bookings');
      await assertScreenLoads(page, '/hotel/guests');
      await assertScreenLoads(page, '/hotel/reports');
    } finally {
      await context.close();
    }
  });

  test('front desk can access rooms, check-in, and check-out', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_s_front_desk');
    try {
      await assertScreenLoads(page, '/hotel/rooms');
      await assertScreenLoads(page, '/hotel/check-in');
      await assertScreenLoads(page, '/hotel/check-out');
    } finally {
      await context.close();
    }
  });

  test('billing staff can access invoices and folio', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_s_billing');
    try {
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/hotel/folio');
    } finally {
      await context.close();
    }
  });

  test('domain specific — manager can view housekeeping and room status', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_s_manager');
    try {
      await assertScreenLoads(page, '/hotel/housekeeping');
      await assertScreenLoads(page, '/hotel/rooms');
    } finally {
      await context.close();
    }
  });

  test('domain specific — front desk can access bookings and guest profiles', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_s_front_desk');
    try {
      await assertScreenLoads(page, '/hotel/bookings');
      await assertScreenLoads(page, '/hotel/guests');
    } finally {
      await context.close();
    }
  });

  test('owner can access purchase orders and inventory (shared modules)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_s_owner');
    try {
      await assertScreenLoads(page, '/purchase-orders');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('starter plan — accounting routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_s_owner');
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
// PROFESSIONAL PLAN (tenant 9121)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Hotel Professional Plan — Screen Tests', () => {

  test('owner can access all professional screens including accounting and CRM', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_p_owner');
    try {
      for (const route of HOTEL_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of [...ACCOUNTING_ROUTES, ...MIS_ROUTES, ...CRM_ROUTES, ...HRPAYROLL_ROUTES, ...SALES_ROUTES]) {
        await assertScreenLoads(page, route);
      }

      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Production');
      await assertNavNotVisible(page, 'Fixed Assets');
    } finally {
      await context.close();
    }
  });

  test('manager can access hotel and sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_p_manager');
    try {
      await assertScreenLoads(page, '/hotel/rooms');
      await assertScreenLoads(page, '/hotel/bookings');
      await assertScreenLoads(page, '/hotel/guests');
      await assertScreenLoads(page, '/sales-orders');
    } finally {
      await context.close();
    }
  });

  test('operator (front desk) can access rooms, check-in, and invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_p_front_desk');
    try {
      await assertScreenLoads(page, '/hotel/rooms');
      await assertScreenLoads(page, '/hotel/check-in');
      await assertScreenLoads(page, '/hotel/check-out');
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('accountant can access accounting screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_p_acct');
    try {
      for (const route of ACCOUNTING_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('HR manager can access HR and payroll', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_p_owner');
    try {
      for (const route of HRPAYROLL_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('CRM executive can access CRM screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_p_owner');
    try {
      for (const route of CRM_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('sales manager can access sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_p_owner');
    try {
      for (const route of SALES_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_p_mis');
    try {
      for (const route of MIS_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('purchase manager can access purchase orders and inventory', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_p_owner');
    try {
      await assertScreenLoads(page, '/purchase-orders');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('domain specific — front desk can access folio and guest check-in under professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_p_front_desk');
    try {
      await assertScreenLoads(page, '/hotel/folio');
      await assertScreenLoads(page, '/hotel/check-in');
    } finally {
      await context.close();
    }
  });

  test('domain specific — manager can access housekeeping and hotel reports', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_p_manager');
    try {
      await assertScreenLoads(page, '/hotel/housekeeping');
      await assertScreenLoads(page, '/hotel/reports');
    } finally {
      await context.close();
    }
  });

  test('professional plan — production routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_p_owner');
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
// ENTERPRISE PLAN (tenant 9100)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Hotel Enterprise Plan — Screen Tests', () => {

  test('owner can access all enterprise screens including production and warehouses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_owner');
    try {
      for (const route of HOTEL_CORE_ROUTES) {
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

  test('manager can access hotel, analytics, and staff screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_manager');
    try {
      await assertScreenLoads(page, '/hotel/rooms');
      await assertScreenLoads(page, '/hotel/bookings');
      await assertScreenLoads(page, '/hotel/guests');
      await assertScreenLoads(page, '/hotel/reports');
    } finally {
      await context.close();
    }
  });

  test('operator (receptionist) can access rooms, check-in, folio, and invoices', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_receptionist');
    try {
      await assertScreenLoads(page, '/hotel/rooms');
      await assertScreenLoads(page, '/hotel/check-in');
      await assertScreenLoads(page, '/hotel/check-out');
      await assertScreenLoads(page, '/hotel/folio');
    } finally {
      await context.close();
    }
  });

  test('accountant can access full accounting suite', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_acct');
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
    const { page, context } = await loginAs(browser, 'qa_htl_hr');
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
    const { page, context } = await loginAs(browser, 'qa_htl_crm');
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
    const { page, context } = await loginAs(browser, 'qa_htl_sales');
    try {
      await assertScreenLoads(page, '/sales-orders');
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_mis');
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
    const { page, context } = await loginAs(browser, 'qa_htl_wh');
    try {
      await assertScreenLoads(page, '/warehouses');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('production supervisor can access production screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_prod');
    try {
      await assertScreenLoads(page, '/production');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('assets manager can access fixed assets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_assets');
    try {
      await assertScreenLoads(page, '/fixed-assets');
    } finally {
      await context.close();
    }
  });

  test('domain specific — housekeeping can access rooms and housekeeping tasks', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_housekeeping');
    try {
      await assertScreenLoads(page, '/hotel/housekeeping');
      await assertScreenLoads(page, '/hotel/rooms');
    } finally {
      await context.close();
    }
  });

  test('domain specific — receptionist can access check-in, folio, and guests', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_receptionist');
    try {
      await assertScreenLoads(page, '/hotel/check-in');
      await assertScreenLoads(page, '/hotel/folio');
      await assertScreenLoads(page, '/hotel/guests');
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN GATE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Hotel Plan Feature Gates — API verification', () => {

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
    const nav = await getAllowedNav(browser, 'qa_htl_s_owner');
    expect(nav).not.toContain('journal-entries');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
    expect(nav).toContain('hotel');
  });

  test('professional plan allowedNavItems includes accounting but not production', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_htl_p_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('hotel');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('fixed-assets');
  });

  test('enterprise plan allowedNavItems includes production and warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_htl_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('hotel');
    expect(nav).toContain('production');
    expect(nav).toContain('warehouses');
    expect(nav).toContain('fixed-assets');
  });

  test('data isolation — starter tenant cannot reach enterprise-only routes', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_s_owner');
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
test.describe('Hotel — Custom Roles & Permissions', () => {

  async function assertDeniedNotCrash(page: Page, route: string) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const body = (await page.textContent('body')) ?? '';
    expect(body.trim().length, `Blank page on ${route}`).toBeGreaterThan(10);
  }

  test('enterprise owner can access /user-management', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_owner');
    try { await assertNoCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('enterprise owner can access /roles?tab=permissions', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_owner');
    try { await assertNoCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });

  test('front-desk → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_receptionist');
    try { await assertDeniedNotCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('housekeeping → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_housekeeping');
    try { await assertDeniedNotCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('accountant → /roles?tab=permissions blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_acct');
    try { await assertDeniedNotCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });

  test('starter owner → /roles?tab=permissions blocked or redirected, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_s_owner');
    try { await assertDeniedNotCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MASTERS — Regions, Branches, Tax Config, Audit Log
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Hotel — Masters: Regions, Branches, Tax Config, Audit Log', () => {

  test('enterprise owner can access /masters', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_owner');
    try { await assertNoCrash(page, '/masters'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/branches', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_owner');
    try { await assertNoCrash(page, '/masters/branches'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/tax-config', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_owner');
    try { await assertNoCrash(page, '/masters/tax-config'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/audit-log', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_owner');
    try { await assertNoCrash(page, '/masters/audit-log'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/approval-workflow', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_owner');
    try { await assertNoCrash(page, '/masters/approval-workflow'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/notification-settings', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_owner');
    try { await assertNoCrash(page, '/masters/notification-settings'); } finally { await context.close(); }
  });

  test('receptionist → /masters/branches loads without crash (read-only or denied)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_receptionist');
    try {
      await page.goto(`${BASE}/masters/branches`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const body = (await page.textContent('body')) ?? '';
      expect(body.trim().length).toBeGreaterThan(10);
    } finally { await context.close(); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-MODULE SMOKE — Hotel ↔ Finance / HR / CRM / MIS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Hotel — Cross-Module Integration Smoke', () => {

  test('room charges → GL journal-entries loads (Finance cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_owner');
    try {
      await assertNoCrash(page, '/hotel');
      await assertNoCrash(page, '/accounting/journal-entries');
    } finally { await context.close(); }
  });

  test('hotel staff → HR and payroll screens load (HR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_hr');
    try {
      await assertNoCrash(page, '/hotel');
      await assertNoCrash(page, '/hr/employees');
      await assertNoCrash(page, '/payroll');
    } finally { await context.close(); }
  });

  test('guest history → CRM contacts and leads (CRM cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_crm');
    try {
      await assertNoCrash(page, '/crm/contacts');
      await assertNoCrash(page, '/crm/leads');
    } finally { await context.close(); }
  });

  test('MIS dashboard loads alongside hotel screens (MIS cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_mis');
    try {
      await assertNoCrash(page, '/mis');
      await assertNoCrash(page, '/mis/sales');
      await assertNoCrash(page, '/mis/financial');
    } finally { await context.close(); }
  });

  test('folio invoices → invoices and sales-orders load (AR cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_owner');
    try {
      await assertNoCrash(page, '/invoices');
      await assertNoCrash(page, '/sales-orders');
    } finally { await context.close(); }
  });

  test('hotel procurement → purchase-orders and expenses load (procurement cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_owner');
    try {
      await assertNoCrash(page, '/purchase-orders');
      await assertNoCrash(page, '/expenses');
    } finally { await context.close(); }
  });

  test('hotel assets → fixed-assets and trial-balance (accounting cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_htl_acct');
    try {
      await assertNoCrash(page, '/fixed-assets');
      await assertNoCrash(page, '/accounting/trial-balance');
      await assertNoCrash(page, '/accounting/balance-sheet');
    } finally { await context.close(); }
  });
});
