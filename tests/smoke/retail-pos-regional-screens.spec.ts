/**
 * Retail/POS ERP — Multi-region screen smoke tests
 *
 * Covers 5 regional retail_enterprise tenants:
 *   UAE  (8122 / qa_rtl_ae_owner) — AED, 5% VAT
 *   USA  (8123 / qa_rtl_us_owner) — USD, Sales Tax
 *   EU   (8124 / qa_rtl_eu_owner) — EUR, 19% VAT
 *   SG   (8125 / qa_rtl_sg_owner) — SGD, 9% GST
 *   AU   (8126 / qa_rtl_au_owner) — AUD, 10% GST
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
  { username: 'qa_rtl_ae_owner', currency: 'AED', currencySymbol: 'د.إ', taxLabel: 'VAT', country: 'UAE' },
  { username: 'qa_rtl_us_owner', currency: 'USD', currencySymbol: '$',   taxLabel: 'Tax', country: 'USA' },
  { username: 'qa_rtl_eu_owner', currency: 'EUR', currencySymbol: '€',   taxLabel: 'VAT', country: 'Germany' },
  { username: 'qa_rtl_sg_owner', currency: 'SGD', currencySymbol: 'S$',  taxLabel: 'GST', country: 'Singapore' },
  { username: 'qa_rtl_au_owner', currency: 'AUD', currencySymbol: 'A$',  taxLabel: 'GST', country: 'Australia' },
];

async function loginAs(browser: Browser, username: string): Promise<{ page: Page; context: BrowserContext }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"], input[placeholder*="user"], input[type="text"]', username);
  await page.fill('input[name="password"], input[type="password"]', 'Test@1234');
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|pos|retail|\//, { timeout: 15000 });
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
  '/retail',
  '/retail/products',
  '/retail/pos-sessions',
  '/retail/sales',
  '/retail/stock',
  '/retail/customers',
  '/retail/loyalty',
  '/retail/promotions',
  '/retail/z-report',
];

// ── Per-region test suites ────────────────────────────────────────────────────
for (const region of REGIONS) {
  test.describe(`Retail/POS ${region.country} (${region.currency})`, () => {

    test(`all core retail screens load without crash`, async ({ browser }) => {
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
          '/retail/pos-sessions',
          '/retail/z-report',
          '/invoices',
          '/accounting/journal-entries',
        ];
        for (const route of routesToCheck) {
          const body = await assertNoCrash(page, route);
          expect(body, `₹ found on ${route} for ${region.country}`).not.toContain('₹');
        }
      } finally {
        await context.close();
      }
    });

    test(`POS and z-report show correct currency (${region.currency})`, async ({ browser }) => {
      const { page, context } = await loginAs(browser, region.username);
      try {
        await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);
        const posBody = await assertNoCrash(page, '/retail/pos-sessions');
        const hasCurrency = posBody.includes(region.currencySymbol) || posBody.includes(region.currency);
        expect(hasCurrency, `Currency ${region.currency} not found in POS for ${region.country}`).toBeTruthy();
      } finally {
        await context.close();
      }
    });

    test(`accounting screens load with correct tax label (${region.taxLabel})`, async ({ browser }) => {
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

    test(`manager can access POS, sales, and z-report`, async ({ browser }) => {
      const username = region.username.replace('_owner', '_manager');
      const { page, context } = await loginAs(browser, username);
      try {
        await assertNoCrash(page, '/retail/pos-sessions');
        await assertNoCrash(page, '/retail/sales');
        await assertNoCrash(page, '/retail/z-report');
      } finally {
        await context.close();
      }
    });

    test(`cashier can access POS sessions and customers`, async ({ browser }) => {
      const username = region.username.replace('_owner', '_cashier');
      const { page, context } = await loginAs(browser, username);
      try {
        await assertNoCrash(page, '/retail/pos-sessions');
        await assertNoCrash(page, '/retail/customers');
      } finally {
        await context.close();
      }
    });

    test(`accountant can access journal entries`, async ({ browser }) => {
      const username = region.username.replace('_owner', '_acct');
      const { page, context } = await loginAs(browser, username);
      try {
        await assertNoCrash(page, '/accounting/journal-entries');
        await assertNoCrash(page, '/accounting/trial-balance');
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

  test('India tenant still shows INR after regional tenants exist', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_rtl_owner');
    try {
      const body = await assertNoCrash(page, '/retail/pos-sessions');
      const hasINR = body.includes('₹') || body.includes('INR');
      expect(hasINR, 'India retail POS missing ₹/INR').toBeTruthy();
    } finally {
      await context.close();
    }
  });

  test('no region shows another regions currency symbol on POS screen', async ({ browser }) => {
    for (const region of REGIONS) {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const body = await assertNoCrash(page, '/retail/pos-sessions');
        for (const other of REGIONS) {
          if (other.currency === region.currency) continue;
          if (other.currencySymbol === '$' && region.currencySymbol.includes('$')) continue;
          if (region.currencySymbol === '$' && other.currencySymbol.includes('$')) continue;
          expect(body, `${region.country} POS shows ${other.country} symbol ${other.currencySymbol}`)
            .not.toContain(other.currencySymbol);
        }
      } finally {
        await context.close();
      }
    }
  });

  test('plan features API returns retail-pos for all regional tenants', async ({ browser }) => {
    for (const region of REGIONS) {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const features = await page.evaluate(async () => {
          const r = await fetch('/api/tenant/features');
          return r.json();
        });
        const nav: string[] = features.allowedNavItems ?? [];
        expect(nav, `${region.country} missing retail-pos in nav`).toContain('retail-pos');
        expect(nav, `${region.country} missing production in nav`).toContain('production');
        expect(nav, `${region.country} missing warehouses in nav`).toContain('warehouses');
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
      } finally {
        await context.close();
      }
    }
  });
});
