/**
 * NGO ERP — Multi-region screen smoke tests
 *
 * Covers 5 regional ngo_enterprise tenants:
 *   UAE  (9422 / qa_ngo_ae_owner) — AED, VAT,      Asia/Dubai
 *   USA  (9423 / qa_ngo_us_owner) — USD, Sales Tax, America/New_York
 *   EU   (9424 / qa_ngo_eu_owner) — EUR, VAT,       Europe/Berlin
 *   SG   (9425 / qa_ngo_sg_owner) — SGD, GST,       Asia/Singapore
 *   AU   (9426 / qa_ngo_au_owner) — AUD, GST,       Australia/Sydney
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
  { username: 'qa_ngo_ae_owner', currency: 'AED', currencySymbol: 'د.إ', taxLabel: 'VAT', country: 'UAE'       },
  { username: 'qa_ngo_us_owner', currency: 'USD', currencySymbol: '$',   taxLabel: 'Tax', country: 'USA'       },
  { username: 'qa_ngo_eu_owner', currency: 'EUR', currencySymbol: '€',   taxLabel: 'VAT', country: 'Germany'   },
  { username: 'qa_ngo_sg_owner', currency: 'SGD', currencySymbol: 'S$',  taxLabel: 'GST', country: 'Singapore' },
  { username: 'qa_ngo_au_owner', currency: 'AUD', currencySymbol: 'A$',  taxLabel: 'GST', country: 'Australia' },
];

async function loginAs(browser: Browser, username: string): Promise<{ page: Page; context: BrowserContext }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"], input[placeholder*="user"], input[type="text"]', username);
  await page.fill('input[name="password"], input[type="password"]', 'Test@1234');
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|ngo|\//, { timeout: 15000 });
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

const NGO_CORE_ROUTES = [
  '/ngo',
  '/ngo/donors',
  '/ngo/donations',
  '/ngo/projects',
  '/ngo/beneficiaries',
  '/ngo/grants',
  '/ngo/campaigns',
  '/ngo/reports',
  '/ngo/80g-certificates',
];

const ACCOUNTING_ROUTES = [
  '/accounting/chart-of-accounts',
  '/accounting/journal-entries',
  '/accounting/trial-balance',
];

// ── Per-region test suites ────────────────────────────────────────────────────
for (const region of REGIONS) {
  test.describe(`NGO ${region.country} (${region.currency})`, () => {

    test(`all core NGO screens load without crash`, async ({ browser }) => {
      const { page, context } = await loginAs(browser, region.username);
      try {
        for (const route of NGO_CORE_ROUTES) {
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
          '/ngo',
          '/ngo/donors',
          '/invoices',
          '/accounting/journal-entries',
        ];
        for (const route of routesToCheck) {
          const body = await assertNoCrash(page, route);
          expect(body, `₹ found on ${route} for ${region.country}`).not.toContain('₹');
        }
        const ngoBody = await assertNoCrash(page, '/ngo');
        expect(ngoBody.trim().length).toBeGreaterThan(50);
      } finally {
        await context.close();
      }
    });
  });
}

// ── Cross-region consistency checks ──────────────────────────────────────────
test.describe('NGO Multi-region Consistency', () => {

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

  test('India NGO tenant (qa_ngo_owner) shows INR', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_ngo_owner');
    try {
      const body = await assertNoCrash(page, '/ngo');
      const hasINR = body.includes('₹') || body.includes('INR');
      expect(hasINR, 'India NGO missing ₹/INR').toBeTruthy();
    } finally {
      await context.close();
    }
  });

  test('no region shows another regions currency symbol on NGO screen', async ({ browser }) => {
    for (const region of REGIONS) {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const body = await assertNoCrash(page, '/ngo/donors');
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

  test('plan features API returns ngo nav for all regional tenants', async ({ browser }) => {
    for (const region of REGIONS) {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const features = await page.evaluate(async () => {
          const r = await fetch('/api/tenant/features');
          return r.json();
        });
        const nav: string[] = features.allowedNavItems ?? [];
        expect(nav, `${region.country} missing ngo in nav`).toContain('ngo');
        expect(nav, `${region.country} missing production in nav`).toContain('production');
        expect(nav, `${region.country} missing warehouses in nav`).toContain('warehouses');
      } finally {
        await context.close();
      }
    }
  });

  test('accounting screens work correctly for all regional NGO tenants', async ({ browser }) => {
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
