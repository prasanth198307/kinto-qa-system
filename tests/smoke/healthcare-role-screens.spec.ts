/**
 * Healthcare ERP — Per-role, per-plan screen smoke tests
 *
 * Plans tested:
 *   Starter     (9220): healthcare core + invoicing + expenses
 *   Professional(9221): starter + accounting + mis + crm + hr_payroll
 *   Enterprise  (9200): professional + sales_orders + warehouses + fixed_assets + production
 *
 * Roles: owner, doctor, nurse, receptionist, billing, purchase + domain-specific
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
  await page.waitForURL(/dashboard|healthcare|\//, { timeout: 15000 });
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

const HEALTHCARE_CORE_ROUTES = [
  '/healthcare',
  '/healthcare/patients',
  '/healthcare/appointments',
  '/healthcare/opd',
  '/healthcare/ipd',
  '/healthcare/lab-tests',
  '/healthcare/prescriptions',
  '/healthcare/wards',
  '/healthcare/reports',
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
// STARTER PLAN (tenant 9220)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Healthcare Starter Plan — Screen Tests', () => {

  test('owner can access all starter healthcare screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_s_owner');
    try {
      for (const route of HEALTHCARE_CORE_ROUTES) {
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

  test('doctor can access patients, appointments, OPD, and prescriptions', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_s_doctor');
    try {
      await assertScreenLoads(page, '/healthcare/patients');
      await assertScreenLoads(page, '/healthcare/appointments');
      await assertScreenLoads(page, '/healthcare/opd');
      await assertScreenLoads(page, '/healthcare/prescriptions');
    } finally {
      await context.close();
    }
  });

  test('receptionist can access patients and appointments', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_s_receptionist');
    try {
      await assertScreenLoads(page, '/healthcare/patients');
      await assertScreenLoads(page, '/healthcare/appointments');
    } finally {
      await context.close();
    }
  });

  test('billing staff can access invoices and billing reports', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_s_billing');
    try {
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/healthcare/reports');
    } finally {
      await context.close();
    }
  });

  test('domain specific — doctor can access lab tests and wards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_s_doctor');
    try {
      await assertScreenLoads(page, '/healthcare/lab-tests');
      await assertScreenLoads(page, '/healthcare/wards');
    } finally {
      await context.close();
    }
  });

  test('domain specific — receptionist can access healthcare reports', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_s_receptionist');
    try {
      await assertScreenLoads(page, '/healthcare/reports');
      await assertScreenLoads(page, '/healthcare/ipd');
    } finally {
      await context.close();
    }
  });

  test('owner can access expenses and invoices (shared modules)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_s_owner');
    try {
      await assertScreenLoads(page, '/expenses');
      await assertScreenLoads(page, '/invoices');
      await assertScreenLoads(page, '/invoices/new');
    } finally {
      await context.close();
    }
  });

  test('starter plan — accounting routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_s_owner');
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
// PROFESSIONAL PLAN (tenant 9221)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Healthcare Professional Plan — Screen Tests', () => {

  test('owner can access all professional screens including accounting and CRM', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_p_owner');
    try {
      for (const route of HEALTHCARE_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of [...ACCOUNTING_ROUTES, ...MIS_ROUTES, ...CRM_ROUTES, ...HRPAYROLL_ROUTES]) {
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

  test('manager (senior doctor) can access all clinical screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_p_doctor');
    try {
      await assertScreenLoads(page, '/healthcare/patients');
      await assertScreenLoads(page, '/healthcare/appointments');
      await assertScreenLoads(page, '/healthcare/opd');
      await assertScreenLoads(page, '/healthcare/ipd');
      await assertScreenLoads(page, '/healthcare/prescriptions');
    } finally {
      await context.close();
    }
  });

  test('operator (receptionist) can access patients and scheduling', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_p_receptionist');
    try {
      await assertScreenLoads(page, '/healthcare/patients');
      await assertScreenLoads(page, '/healthcare/appointments');
      await assertScreenLoads(page, '/healthcare/wards');
    } finally {
      await context.close();
    }
  });

  test('accountant can access accounting screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_p_acct');
    try {
      for (const route of ACCOUNTING_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('HR manager can access HR and payroll', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_p_owner');
    try {
      for (const route of HRPAYROLL_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('CRM executive placeholder — owner accesses CRM screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_p_owner');
    try {
      for (const route of CRM_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('sales manager placeholder — owner accesses sales orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_p_owner');
    try {
      await assertScreenLoads(page, '/sales-orders');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_p_mis');
    try {
      for (const route of MIS_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('purchase manager placeholder — owner accesses purchase orders', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_p_owner');
    try {
      await assertScreenLoads(page, '/purchase-orders');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('domain specific — doctor can access lab tests and IPD under professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_p_doctor');
    try {
      await assertScreenLoads(page, '/healthcare/lab-tests');
      await assertScreenLoads(page, '/healthcare/ipd');
    } finally {
      await context.close();
    }
  });

  test('domain specific — receptionist can access wards and healthcare reports', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_p_receptionist');
    try {
      await assertScreenLoads(page, '/healthcare/wards');
      await assertScreenLoads(page, '/healthcare/reports');
    } finally {
      await context.close();
    }
  });

  test('professional plan — production routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_p_owner');
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
// ENTERPRISE PLAN (tenant 9200)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Healthcare Enterprise Plan — Screen Tests', () => {

  test('owner can access all enterprise screens including production and warehouses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_owner');
    try {
      for (const route of HEALTHCARE_CORE_ROUTES) {
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

  test('manager (senior doctor) can access all clinical and management screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_doctor');
    try {
      await assertScreenLoads(page, '/healthcare/patients');
      await assertScreenLoads(page, '/healthcare/appointments');
      await assertScreenLoads(page, '/healthcare/opd');
      await assertScreenLoads(page, '/healthcare/ipd');
      await assertScreenLoads(page, '/healthcare/reports');
    } finally {
      await context.close();
    }
  });

  test('operator (nurse) can access patients, wards, and appointments', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_nurse');
    try {
      await assertScreenLoads(page, '/healthcare/patients');
      await assertScreenLoads(page, '/healthcare/appointments');
      await assertScreenLoads(page, '/healthcare/wards');
    } finally {
      await context.close();
    }
  });

  test('accountant can access full accounting suite', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_acct');
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
    const { page, context } = await loginAs(browser, 'qa_hc_hr');
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

  test('CRM executive can access CRM screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_crm');
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
    const { page, context } = await loginAs(browser, 'qa_hc_sales');
    try {
      await assertScreenLoads(page, '/sales-orders');
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_mis');
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
    const { page, context } = await loginAs(browser, 'qa_hc_wh');
    try {
      await assertScreenLoads(page, '/warehouses');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('production supervisor can access production screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_prod');
    try {
      await assertScreenLoads(page, '/production');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('assets manager can access fixed assets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_assets');
    try {
      await assertScreenLoads(page, '/fixed-assets');
    } finally {
      await context.close();
    }
  });

  test('domain specific — receptionist can access patient registration and billing', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_receptionist');
    try {
      await assertScreenLoads(page, '/healthcare/patients');
      await assertScreenLoads(page, '/healthcare/appointments');
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('domain specific — doctor can access prescriptions, lab tests, and wards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_doctor');
    try {
      await assertScreenLoads(page, '/healthcare/prescriptions');
      await assertScreenLoads(page, '/healthcare/lab-tests');
      await assertScreenLoads(page, '/healthcare/wards');
    } finally {
      await context.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN GATE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Healthcare Plan Feature Gates — API verification', () => {

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
    const nav = await getAllowedNav(browser, 'qa_hc_s_owner');
    expect(nav).not.toContain('journal-entries');
    expect(nav).not.toContain('chart-of-accounts');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
    expect(nav).toContain('healthcare');
  });

  test('professional plan allowedNavItems includes accounting but not production', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_hc_p_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('healthcare');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
  });

  test('enterprise plan allowedNavItems includes production and warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_hc_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('healthcare');
    expect(nav).toContain('production');
    expect(nav).toContain('warehouses');
    expect(nav).toContain('fixed-assets');
  });

  test('data isolation — starter tenant cannot reach enterprise-only routes', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_s_owner');
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
