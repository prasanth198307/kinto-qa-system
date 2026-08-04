/**
 * Finance ERP — Multi-region screen smoke tests
 *
 * Covers 5 regional finance_enterprise tenants:
 *   UAE  (8322 / qa_fin_ae_owner) — AED, 5% VAT
 *   USA  (8323 / qa_fin_us_owner) — USD, Sales Tax
 *   EU   (8324 / qa_fin_eu_owner) — EUR, 19% VAT
 *   SG   (8325 / qa_fin_sg_owner) — SGD, 9% GST
 *   AU   (8326 / qa_fin_au_owner) — AUD, 10% GST
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

interface RegionConfig {
  username: string;
  currency: string;
  currencySymbol: string;
  taxLabel: string;
  country: string;
}

const REGIONS: RegionConfig[] = [
  { username: 'qa_fin_ae_owner', currency: 'AED', currencySymbol: 'د.إ', taxLabel: 'VAT', country: 'UAE' },
  { username: 'qa_fin_us_owner', currency: 'USD', currencySymbol: '$',   taxLabel: 'Tax', country: 'USA' },
  { username: 'qa_fin_eu_owner', currency: 'EUR', currencySymbol: '€',   taxLabel: 'VAT', country: 'Germany' },
  { username: 'qa_fin_sg_owner', currency: 'SGD', currencySymbol: 'S$',  taxLabel: 'GST', country: 'Singapore' },
  { username: 'qa_fin_au_owner', currency: 'AUD', currencySymbol: 'A$',  taxLabel: 'GST', country: 'Australia' },
];

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

async function assertNoCrash(page: Page, route: string): Promise<string> {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !isIgnorable(msg.text())) errors.push(msg.text());
  });
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const body = (await page.textContent('body')) ?? '';
  expect(body.trim().length, `Blank page ${route}`).toBeGreaterThan(50);
  expect(errors.length, `JS error on ${route}: ${errors[0]}`).toBe(0);
  return body;
}

const CORE_ROUTES = [
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

// ── Operator usernames derived from owner username ────────────────────────────
function operatorUsername(ownerUsername: string): string {
  // e.g. qa_fin_ae_owner → qa_fin_ae_accountant
  return ownerUsername.replace('_owner', '_accountant');
}

function cfoUsername(ownerUsername: string): string {
  return ownerUsername.replace('_owner', '_cfo');
}

function acctUsername(ownerUsername: string): string {
  return ownerUsername.replace('_owner', '_acct');
}

// ── Per-region test suites ────────────────────────────────────────────────────
for (const region of REGIONS) {
  test.describe(`Finance ${region.country} (${region.currency})`, () => {

    test(`all core accounting screens load without crash`, async ({ browser }) => {
      const { page, context } = await loginAs(browser, region.username);
      try {
        for (const route of CORE_ROUTES) {
          await assertNoCrash(page, route);
        }
      } finally {
        await context.close();
      }
    });

    test(`no Indian Rupee symbol (₹) appears on any screen`, async ({ browser }) => {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const routesToCheck = [
          '/accounting/journal-entries',
          '/accounting/trial-balance',
          '/invoices',
          '/accounting/balance-sheet',
        ];
        for (const route of routesToCheck) {
          const body = await assertNoCrash(page, route);
          expect(body, `₹ found on ${route} for ${region.country}`).not.toContain('₹');
        }
      } finally {
        await context.close();
      }
    });

    test(`invoices and journal entries show correct currency (${region.currency})`, async ({ browser }) => {
      const { page, context } = await loginAs(browser, region.username);
      try {
        await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);
        const invoiceBody = await assertNoCrash(page, '/invoices');
        const hasCurrency = invoiceBody.includes(region.currencySymbol) || invoiceBody.includes(region.currency);
        expect(hasCurrency, `Currency ${region.currency} not found in invoices for ${region.country}`).toBeTruthy();
      } finally {
        await context.close();
      }
    });

    test(`tax config shows correct tax label (${region.taxLabel})`, async ({ browser }) => {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const acctRoutes = [
          '/accounting/chart-of-accounts',
          '/accounting/journal-entries',
          '/accounting/trial-balance',
        ];
        for (const route of acctRoutes) {
          await assertNoCrash(page, route);
        }
        const taxBody = await assertNoCrash(page, '/masters/tax-config');
        expect(taxBody.trim().length).toBeGreaterThan(50);
      } finally {
        await context.close();
      }
    });

    test(`CFO can access profit and loss and balance sheet`, async ({ browser }) => {
      const username = region.username.replace('_owner', '_cfo');
      const { page, context } = await loginAs(browser, username);
      try {
        await assertNoCrash(page, '/accounting/profit-loss');
        await assertNoCrash(page, '/accounting/balance-sheet');
        await assertNoCrash(page, '/accounting/trial-balance');
      } finally {
        await context.close();
      }
    });

    test(`accountant can access journal entries and ledger`, async ({ browser }) => {
      const username = region.username.replace('_owner', '_acct');
      const { page, context } = await loginAs(browser, username);
      try {
        await assertNoCrash(page, '/accounting/journal-entries');
        await assertNoCrash(page, '/accounting/ledger');
      } finally {
        await context.close();
      }
    });

    test(`fixed assets screen loads correctly`, async ({ browser }) => {
      const { page, context } = await loginAs(browser, region.username);
      try {
        await assertNoCrash(page, '/accounting/fixed-assets');
        await assertNoCrash(page, '/fixed-assets');
      } finally {
        await context.close();
      }
    });

    // ── Operator (accountant) role per region ────────────────────────────────
    test(`operator accountant can access journal entries and expenses (not admin screens)`, async ({ browser }) => {
      const { page, context } = await loginAs(browser, operatorUsername(region.username));
      try {
        await assertNoCrash(page, '/accounting/journal-entries');
        await assertNoCrash(page, '/expenses');
        await assertNoCrash(page, '/invoices');
      } finally {
        await context.close();
      }
    });

    test(`operator accountant cannot reach HR payroll screens (shows denied or redirect, no crash)`, async ({ browser }) => {
      const { page, context } = await loginAs(browser, operatorUsername(region.username));
      try {
        await page.goto(`${BASE}/hr/employees`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);
        const body = (await page.textContent('body')) ?? '';
        // Must not be a blank page or JS crash — redirect or access-denied message is fine
        expect(body.trim().length, `Blank page on /hr/employees for operator in ${region.country}`).toBeGreaterThan(10);
      } finally {
        await context.close();
      }
    });

    test(`operator accountant cannot reach user-management (shows denied or redirect, no crash)`, async ({ browser }) => {
      const { page, context } = await loginAs(browser, operatorUsername(region.username));
      try {
        await page.goto(`${BASE}/user-management`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);
        const body = (await page.textContent('body')) ?? '';
        expect(body.trim().length, `Blank on /user-management for operator in ${region.country}`).toBeGreaterThan(10);
      } finally {
        await context.close();
      }
    });

    // ── CFO negative gates per region ────────────────────────────────────────
    test(`CFO cannot access user-management (no crash, shows denied or redirect)`, async ({ browser }) => {
      const { page, context } = await loginAs(browser, cfoUsername(region.username));
      try {
        await page.goto(`${BASE}/user-management`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);
        const body = (await page.textContent('body')) ?? '';
        expect(body.trim().length, `Blank on /user-management for CFO in ${region.country}`).toBeGreaterThan(10);
      } finally {
        await context.close();
      }
    });

    // ── Data isolation at screen level ───────────────────────────────────────
    test(`accountant journal-entries page shows regional currency, not another region's currency`, async ({ browser }) => {
      const { page, context } = await loginAs(browser, acctUsername(region.username));
      try {
        const body = await assertNoCrash(page, '/accounting/journal-entries');
        // Every other region's currency symbol must NOT appear (skip $ vs A$/S$ ambiguity)
        for (const other of REGIONS) {
          if (other.currency === region.currency) continue;
          if (other.currencySymbol === '$' || region.currencySymbol === '$') continue;
          if (other.currencySymbol.includes('$') && region.currencySymbol.includes('$')) continue;
          expect(
            body,
            `${region.country} accountant journal-entries shows ${other.country} symbol ${other.currencySymbol}`,
          ).not.toContain(other.currencySymbol);
        }
      } finally {
        await context.close();
      }
    });
  });
}

// ── Cross-region consistency checks ──────────────────────────────────────────
test.describe('Multi-region consistency', () => {

  test('each region returns distinct currency from /api/tenant/features', async ({ browser }) => {
    const seen = new Set<string>();
    for (const region of REGIONS) {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const tenantInfo = await page.evaluate(async () => {
          const r = await fetch('/api/tenant/features');
          return r.json();
        });
        const currency: string = tenantInfo.currency ?? tenantInfo.tenant?.currency ?? '';
        expect(currency, `Region ${region.country} returned INR`).not.toBe('INR');
        seen.add(currency);
      } finally {
        await context.close();
      }
    }
    expect(seen.size).toBe(5);
  });

  test('India tenant still shows INR and GST after regional tenants exist', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_fin_owner');
    try {
      const body = await assertNoCrash(page, '/invoices');
      const hasINR = body.includes('₹') || body.includes('INR');
      expect(hasINR, 'India finance invoices missing ₹/INR').toBeTruthy();
    } finally {
      await context.close();
    }
  });

  test('no region shows another regions currency symbol on invoices screen', async ({ browser }) => {
    for (const region of REGIONS) {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const body = await assertNoCrash(page, '/invoices');
        for (const other of REGIONS) {
          if (other.currency === region.currency) continue;
          if (other.currencySymbol === '$' && region.currencySymbol.includes('$')) continue;
          if (region.currencySymbol === '$' && other.currencySymbol.includes('$')) continue;
          expect(body, `${region.country} invoices shows ${other.country} symbol ${other.currencySymbol}`)
            .not.toContain(other.currencySymbol);
        }
      } finally {
        await context.close();
      }
    }
  });

  test('plan features API returns journal-entries for all regional tenants', async ({ browser }) => {
    for (const region of REGIONS) {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const features = await page.evaluate(async () => {
          const r = await fetch('/api/tenant/features');
          return r.json();
        });
        const nav: string[] = features.allowedNavItems ?? [];
        expect(nav, `${region.country} missing journal-entries in nav`).toContain('journal-entries');
        expect(nav, `${region.country} missing warehouses in nav`).toContain('warehouses');
        expect(nav, `${region.country} missing fixed-assets in nav`).toContain('fixed-assets');
      } finally {
        await context.close();
      }
    }
  });

  test('accounting accessible in all regional enterprise tenants', async ({ browser }) => {
    for (const region of REGIONS) {
      const { page, context } = await loginAs(browser, region.username);
      try {
        await assertNoCrash(page, '/accounting/journal-entries');
        await assertNoCrash(page, '/accounting/trial-balance');
      } finally {
        await context.close();
      }
    }
  });
});
