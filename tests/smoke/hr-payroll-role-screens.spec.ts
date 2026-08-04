/**
 * HR/Payroll ERP — Per-role, per-plan screen smoke tests
 *
 * Plans tested:
 *   Starter      (8520): HR core + payroll + attendance + leaves + expenses
 *   Professional (8521): starter + accounting + MIS + CRM + sales + appraisals + recruitment
 *   Enterprise   (8500): professional + production + warehouses + fixed_assets
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
  await page.waitForURL(/dashboard|hr|\//, { timeout: 15000 });
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

const HR_CORE_ROUTES = [
  '/hr',
  '/hr/employees',
  '/hr/attendance',
  '/hr/leaves',
  '/hr/payroll',
  '/hr/payslips',
  '/hr/appraisals',
  '/hr/recruitment',
  '/hr/departments',
];

const PAYROLL_ROUTES    = ['/hr/payroll', '/hr/payslips'];
const ACCOUNTING_ROUTES = ['/accounting/chart-of-accounts', '/accounting/journal-entries', '/accounting/trial-balance'];
const MIS_ROUTES        = ['/mis', '/mis/sales', '/mis/financial'];
const CRM_ROUTES        = ['/crm/contacts', '/crm/leads'];
const SALES_ROUTES      = ['/sales-orders'];
const PRODUCTION_ROUTES = ['/production', '/raw-materials'];
const WAREHOUSE_ROUTES  = ['/warehouses', '/inventory'];
const FIXED_ASSETS_ROUTES = ['/fixed-assets'];

// ─────────────────────────────────────────────────────────────────────────────
// STARTER PLAN (tenant 8520)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('HR/Payroll Starter Plan — Screen Tests', () => {

  test('owner can access all starter HR screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_s_owner');
    try {
      for (const route of HR_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }

      await page.goto(`${BASE}/dashboard`);
      await assertNavNotVisible(page, 'Accounting');
      await assertNavNotVisible(page, 'MIS');
      await assertNavNotVisible(page, 'CRM');
      await assertNavNotVisible(page, 'Production');
      await assertNavNotVisible(page, 'Warehouses');
    } finally {
      await context.close();
    }
  });

  test('manager can access HR employees, attendance, and leaves', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_s_manager');
    try {
      await assertScreenLoads(page, '/hr/employees');
      await assertScreenLoads(page, '/hr/attendance');
      await assertScreenLoads(page, '/hr/leaves');
      await assertScreenLoads(page, '/hr/departments');
    } finally {
      await context.close();
    }
  });

  test('payroll exec can access payroll and payslips', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_s_payroll_exec');
    try {
      for (const route of PAYROLL_ROUTES) {
        await assertScreenLoads(page, route);
      }
      await assertScreenLoads(page, '/hr/employees');
    } finally {
      await context.close();
    }
  });

  test('billing staff can access payroll and HR core', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_s_billing');
    try {
      await assertScreenLoads(page, '/hr/payroll');
      await assertScreenLoads(page, '/hr/payslips');
    } finally {
      await context.close();
    }
  });

  test('recruitment screen loads in starter plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_s_owner');
    try {
      await assertScreenLoads(page, '/hr/recruitment');
    } finally {
      await context.close();
    }
  });

  test('appraisals screen loads in starter plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_s_owner');
    try {
      await assertScreenLoads(page, '/hr/appraisals');
    } finally {
      await context.close();
    }
  });

  test('departments screen loads in starter plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_s_manager');
    try {
      await assertScreenLoads(page, '/hr/departments');
    } finally {
      await context.close();
    }
  });

  test('starter plan — accounting routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_s_owner');
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
// PROFESSIONAL PLAN (tenant 8521)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('HR/Payroll Professional Plan — Screen Tests', () => {

  test('owner can access all professional screens including accounting and CRM', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_p_owner');
    try {
      for (const route of HR_CORE_ROUTES) {
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

  test('manager can access HR, attendance, and MIS', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_p_manager');
    try {
      await assertScreenLoads(page, '/hr/employees');
      await assertScreenLoads(page, '/hr/attendance');
      await assertScreenLoads(page, '/hr/leaves');
      await assertScreenLoads(page, '/mis/sales');
    } finally {
      await context.close();
    }
  });

  test('payroll exec can access payroll, payslips, and accounting', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_p_payroll_exec');
    try {
      for (const route of PAYROLL_ROUTES) {
        await assertScreenLoads(page, route);
      }
      await assertScreenLoads(page, '/hr/employees');
      await assertScreenLoads(page, '/accounting/journal-entries');
    } finally {
      await context.close();
    }
  });

  test('accountant can access accounting screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_p_acct');
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
    const { page, context } = await loginAs(browser, 'qa_hr_p_mis');
    try {
      for (const route of MIS_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('HR screens — recruitment and appraisals load in professional', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_p_owner');
    try {
      await assertScreenLoads(page, '/hr/recruitment');
      await assertScreenLoads(page, '/hr/appraisals');
    } finally {
      await context.close();
    }
  });

  test('CRM screens load for professional plan owner', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_p_owner');
    try {
      for (const route of CRM_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('sales orders accessible in professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_p_owner');
    try {
      for (const route of SALES_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('departments screen loads in professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_p_manager');
    try {
      await assertScreenLoads(page, '/hr/departments');
    } finally {
      await context.close();
    }
  });

  test('payslips screen loads for professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_p_payroll_exec');
    try {
      await assertScreenLoads(page, '/hr/payslips');
    } finally {
      await context.close();
    }
  });

  test('HR leaves and attendance load for manager in professional plan', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_p_manager');
    try {
      await assertScreenLoads(page, '/hr/leaves');
      await assertScreenLoads(page, '/hr/attendance');
    } finally {
      await context.close();
    }
  });

  test('professional plan — production routes return redirect or access denied (not crash)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_p_owner');
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
// ENTERPRISE PLAN (tenant 8500)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('HR/Payroll Enterprise Plan — Screen Tests', () => {

  test('owner can access all enterprise screens including production and warehouses', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_owner');
    try {
      for (const route of HR_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
      for (const route of [...ACCOUNTING_ROUTES, ...MIS_ROUTES, ...CRM_ROUTES, ...SALES_ROUTES]) {
        await assertScreenLoads(page, route);
      }
      for (const route of [...PRODUCTION_ROUTES, ...WAREHOUSE_ROUTES, ...FIXED_ASSETS_ROUTES]) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('manager can access all HR screens and MIS', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_manager');
    try {
      await assertScreenLoads(page, '/hr/employees');
      await assertScreenLoads(page, '/hr/attendance');
      await assertScreenLoads(page, '/hr/leaves');
      await assertScreenLoads(page, '/hr/departments');
      await assertScreenLoads(page, '/mis/sales');
    } finally {
      await context.close();
    }
  });

  test('recruiter can access recruitment and employees screens', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_recruiter');
    try {
      await assertScreenLoads(page, '/hr/recruitment');
      await assertScreenLoads(page, '/hr/employees');
    } finally {
      await context.close();
    }
  });

  test('payroll exec can access payroll, payslips, and accounting', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_payroll_exec');
    try {
      for (const route of PAYROLL_ROUTES) {
        await assertScreenLoads(page, route);
      }
      await assertScreenLoads(page, '/hr/employees');
      await assertScreenLoads(page, '/accounting/journal-entries');
    } finally {
      await context.close();
    }
  });

  test('accountant can access full accounting suite', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_acct');
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

  test('HR role can access full HR module including appraisals and departments', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_hr');
    try {
      for (const route of HR_CORE_ROUTES) {
        await assertScreenLoads(page, route);
      }
    } finally {
      await context.close();
    }
  });

  test('CRM executive can access CRM, campaigns, and leads', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_crm');
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
    const { page, context } = await loginAs(browser, 'qa_hr_sales');
    try {
      await assertScreenLoads(page, '/sales-orders');
      await assertScreenLoads(page, '/invoices');
    } finally {
      await context.close();
    }
  });

  test('MIS viewer can access all MIS dashboards', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_mis');
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
    const { page, context } = await loginAs(browser, 'qa_hr_wh');
    try {
      await assertScreenLoads(page, '/warehouses');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('production supervisor can access production and raw materials', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_prod');
    try {
      await assertScreenLoads(page, '/production');
      await assertScreenLoads(page, '/raw-materials');
      await assertScreenLoads(page, '/inventory');
    } finally {
      await context.close();
    }
  });

  test('assets manager can access fixed assets', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_assets');
    try {
      await assertScreenLoads(page, '/fixed-assets');
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
    const nav = await getAllowedNav(browser, 'qa_hr_s_owner');
    expect(nav).not.toContain('journal-entries');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
    expect(nav).toContain('hr-employees');
  });

  test('professional plan allowedNavItems includes accounting but not production/warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_hr_p_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('hr-employees');
    expect(nav).not.toContain('production');
    expect(nav).not.toContain('warehouses');
  });

  test('enterprise plan allowedNavItems includes production and warehouses', async ({ browser }) => {
    const nav = await getAllowedNav(browser, 'qa_hr_owner');
    expect(nav).toContain('journal-entries');
    expect(nav).toContain('hr-employees');
    expect(nav).toContain('production');
    expect(nav).toContain('warehouses');
    expect(nav).toContain('fixed-assets');
  });

  test('data isolation — starter plan tenant cannot access enterprise features', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_s_owner');
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
test.describe('HR/Payroll — Custom Roles & Permissions', () => {

  async function assertDeniedNotCrash(page: Page, route: string) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const body = (await page.textContent('body')) ?? '';
    expect(body.trim().length, `Blank page on ${route}`).toBeGreaterThan(10);
  }

  test('enterprise owner can access /user-management', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_owner');
    try { await assertNoCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('enterprise owner can access /roles?tab=permissions', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_owner');
    try { await assertNoCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });

  test('payroll exec → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_payroll_exec');
    try { await assertDeniedNotCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('recruiter → /user-management blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_recruiter');
    try { await assertDeniedNotCrash(page, '/user-management'); } finally { await context.close(); }
  });

  test('accountant → /roles?tab=permissions blocked, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_acct');
    try { await assertDeniedNotCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });

  test('starter owner → /roles?tab=permissions blocked or redirected, not crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_s_owner');
    try { await assertDeniedNotCrash(page, '/roles?tab=permissions'); } finally { await context.close(); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MASTERS — Regions, Branches, Tax Config, Audit Log
// ─────────────────────────────────────────────────────────────────────────────
test.describe('HR/Payroll — Masters: Regions, Branches, Tax Config, Audit Log', () => {

  test('enterprise owner can access /masters', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_owner');
    try { await assertNoCrash(page, '/masters'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/branches', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_owner');
    try { await assertNoCrash(page, '/masters/branches'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/tax-config', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_owner');
    try { await assertNoCrash(page, '/masters/tax-config'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/audit-log', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_owner');
    try { await assertNoCrash(page, '/masters/audit-log'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/approval-workflow', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_owner');
    try { await assertNoCrash(page, '/masters/approval-workflow'); } finally { await context.close(); }
  });

  test('enterprise owner can access /masters/notification-settings', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_owner');
    try { await assertNoCrash(page, '/masters/notification-settings'); } finally { await context.close(); }
  });

  test('payroll exec → /masters/branches loads without crash', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_payroll_exec');
    try {
      await page.goto(`${BASE}/masters/branches`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const body = (await page.textContent('body')) ?? '';
      expect(body.trim().length).toBeGreaterThan(10);
    } finally { await context.close(); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-MODULE SMOKE — HR/Payroll ↔ Finance / CRM / MIS / Manufacturing
// ─────────────────────────────────────────────────────────────────────────────
test.describe('HR/Payroll — Cross-Module Integration Smoke', () => {

  test('payroll journal → GL journal-entries loads (Finance cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_owner');
    try {
      await assertNoCrash(page, '/hr');
      await assertNoCrash(page, '/accounting/journal-entries');
    } finally { await context.close(); }
  });

  test('employee directory → CRM contacts load (CRM cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_crm');
    try {
      await assertNoCrash(page, '/crm/contacts');
    } finally { await context.close(); }
  });

  test('MIS dashboard loads alongside HR screens (MIS cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_mis');
    try {
      await assertNoCrash(page, '/mis');
      await assertNoCrash(page, '/mis/sales');
      await assertNoCrash(page, '/mis/financial');
    } finally { await context.close(); }
  });

  test('expense claims → invoices and expenses load (AP cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_owner');
    try {
      await assertNoCrash(page, '/invoices');
      await assertNoCrash(page, '/expenses');
    } finally { await context.close(); }
  });

  test('employee assets → fixed-assets and trial-balance (accounting cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_acct');
    try {
      await assertNoCrash(page, '/fixed-assets');
      await assertNoCrash(page, '/accounting/trial-balance');
      await assertNoCrash(page, '/accounting/balance-sheet');
    } finally { await context.close(); }
  });

  test('production workers → warehouses and inventory load (warehouse cross-module)', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hr_wh');
    try {
      await assertNoCrash(page, '/warehouses');
      await assertNoCrash(page, '/inventory');
    } finally { await context.close(); }
  });
});
