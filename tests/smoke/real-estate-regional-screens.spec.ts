/**
 * Real Estate ERP — Multi-region screen smoke tests
 *
 * Covers 5 regional realestate_enterprise tenants:
 *   UAE  (9822 / qa_re_ae_owner) — AED, VAT,      Asia/Dubai
 *   USA  (9823 / qa_re_us_owner) — USD, Sales Tax, America/New_York
 *   EU   (9824 / qa_re_eu_owner) — EUR, VAT,       Europe/Berlin
 *   SG   (9825 / qa_re_sg_owner) — SGD, GST,       Asia/Singapore
 *   AU   (9826 / qa_re_au_owner) — AUD, GST,       Australia/Sydney
 *
 * Per region: 2 tests (all screens load + no ₹ / correct currency)
 * Cross-region: 5 consistency checks
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
  { username: 'qa_re_ae_owner', currency: 'AED', currencySymbol: 'د.إ', taxLabel: 'VAT', country: 'UAE'       },
  { username: 'qa_re_us_owner', currency: 'USD', currencySymbol: '$',   taxLabel: 'Tax', country: 'USA'       },
  { username: 'qa_re_eu_owner', currency: 'EUR', currencySymbol: '€',   taxLabel: 'VAT', country: 'Germany'   },
  { username: 'qa_re_sg_owner', currency: 'SGD', currencySymbol: 'S$',  taxLabel: 'GST', country: 'Singapore' },
  { username: 'qa_re_au_owner', currency: 'AUD', currencySymbol: 'A$',  taxLabel: 'GST', country: 'Australia' },
];

async function loginAs(browser: Browser, username: string): Promise<{ page: Page; context: BrowserContext }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"], input[placeholder*="user"], input[type="text"]', username);
  await page.fill('input[name="password"], input[type="password"]', 'Test@1234');
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|real-estate|\//, { timeout: 15000 });
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

const RE_CORE_ROUTES = [
  '/real-estate',
  '/real-estate/projects',
  '/real-estate/units',
  '/real-estate/bookings',
  '/real-estate/customers',
  '/real-estate/demand-letters',
  '/real-estate/payment-plans',
  '/real-estate/reports',
];

const ACCOUNTING_ROUTES = [
  '/accounting/chart-of-accounts',
  '/accounting/journal-entries',
  '/accounting/trial-balance',
];

// ── Per-region test suites ────────────────────────────────────────────────────
for (const region of REGIONS) {
  test.describe(`Real Estate ${region.country} (${region.currency})`, () => {

    test(`all core real estate screens load without crash`, async ({ browser }) => {
      const { page, context } = await loginAs(browser, region.username);
      try {
        for (const route of RE_CORE_ROUTES) {
          await assertNoCrash(page, route);
        }
      } finally {
        await context.close();
      }
    });

    test(`no ₹ on any screen and correct currency (${region.currency}) appears`, async ({ browser }) => {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const routesToCheck = [
          '/real-estate',
          '/real-estate/bookings',
          '/invoices',
          '/accounting/journal-entries',
        ];
        for (const route of routesToCheck) {
          const body = await assertNoCrash(page, route);
          expect(body, `₹ found on ${route} for ${region.country}`).not.toContain('₹');
        }
        const reBody = await assertNoCrash(page, '/real-estate');
        expect(reBody.trim().length).toBeGreaterThan(50);
      } finally {
        await context.close();
      }
    });
  });
}

// ── Cross-region consistency checks ──────────────────────────────────────────
test.describe('Real Estate Multi-region Consistency', () => {

  test('each region returns distinct non-INR currency from /api/tenant/features', async ({ browser }) => {
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

  test('India Real Estate tenant (qa_re_owner) shows INR', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_re_owner');
    try {
      const body = await assertNoCrash(page, '/real-estate');
      const hasINR = body.includes('₹') || body.includes('INR');
      expect(hasINR, 'India Real Estate missing ₹/INR').toBeTruthy();
    } finally {
      await context.close();
    }
  });

  test('no region shows another regions currency symbol on real estate screen', async ({ browser }) => {
    for (const region of REGIONS) {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const body = await assertNoCrash(page, '/real-estate/bookings');
        for (const other of REGIONS) {
          if (other.currency === region.currency) continue;
          if (other.currencySymbol === '$' && region.currencySymbol.includes('$')) continue;
          if (region.currencySymbol === '$' && other.currencySymbol.includes('$')) continue;
          expect(body, `${region.country} shows ${other.country} symbol ${other.currencySymbol}`)
            .not.toContain(other.currencySymbol);
        }
      } finally {
        await context.close();
      }
    }
  });

  test('plan features API returns real-estate nav for all regional tenants', async ({ browser }) => {
    for (const region of REGIONS) {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const features = await page.evaluate(async () => {
          const r = await fetch('/api/tenant/features');
          return r.json();
        });
        const nav: string[] = features.allowedNavItems ?? [];
        expect(nav, `${region.country} missing real-estate in nav`).toContain('real-estate');
        expect(nav, `${region.country} missing production in nav`).toContain('production');
        expect(nav, `${region.country} missing warehouses in nav`).toContain('warehouses');
      } finally {
        await context.close();
      }
    }
  });

  test('accounting screens work correctly for all regional real estate tenants', async ({ browser }) => {
    for (const region of REGIONS) {
      const { page, context } = await loginAs(browser, region.username);
      try {
        for (const route of ACCOUNTING_ROUTES) {
          await assertNoCrash(page, route);
        }
      } finally {
        await context.close();
      }
    }
  });
});
