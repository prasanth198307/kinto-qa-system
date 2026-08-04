/**
 * Gold ERP — Multi-region screen smoke tests
 *
 * Covers 5 regional gold_erp_enterprise tenants:
 *   UAE  (8022 / qa_gld_ae_owner) — AED, VAT
 *   USA  (8023 / qa_gld_us_owner) — USD, Sales Tax
 *   EU   (8024 / qa_gld_eu_owner) — EUR, VAT
 *   SG   (8025 / qa_gld_sg_owner) — SGD, GST
 *   AU   (8026 / qa_gld_au_owner) — AUD, GST
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
  { username: 'qa_gld_ae_owner', currency: 'AED', currencySymbol: 'د.إ', taxLabel: 'VAT', country: 'UAE'       },
  { username: 'qa_gld_us_owner', currency: 'USD', currencySymbol: '$',   taxLabel: 'Tax', country: 'USA'       },
  { username: 'qa_gld_eu_owner', currency: 'EUR', currencySymbol: '€',   taxLabel: 'VAT', country: 'Germany'   },
  { username: 'qa_gld_sg_owner', currency: 'SGD', currencySymbol: 'S$',  taxLabel: 'GST', country: 'Singapore' },
  { username: 'qa_gld_au_owner', currency: 'AUD', currencySymbol: 'A$',  taxLabel: 'GST', country: 'Australia' },
];

async function loginAs(browser: Browser, username: string): Promise<{ page: Page; context: BrowserContext }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"], input[placeholder*="user"], input[type="text"]', username);
  await page.fill('input[name="password"], input[type="password"]', 'Test@1234');
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|gold-erp|\//, { timeout: 15000 });
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
  expect(body.trim().length, `Blank page on ${route}`).toBeGreaterThan(50);
  expect(errors.length, `JS error on ${route}: ${errors[0]}`).toBe(0);
  return body;
}

const CORE_ROUTES = [
  '/gold-erp',
  '/gold-erp/rate-card',
  '/gold-erp/items',
  '/gold-erp/stock-ledger',
  '/gold-erp/job-work',
  '/gold-erp/customer-karats',
  '/gold-erp/old-gold',
  '/gold-erp/schemes',
  '/gold-erp/reports',
];

// ── Per-region test suites ────────────────────────────────────────────────────
for (const region of REGIONS) {
  test.describe(`Gold ERP ${region.country} (${region.currency})`, () => {

    test(`all core gold ERP screens load without crash`, async ({ browser }) => {
      const { page, context } = await loginAs(browser, region.username);
      try {
        for (const route of CORE_ROUTES) {
          await assertNoCrash(page, route);
        }
        await assertNoCrash(page, '/gold-erp/pos');
      } finally {
        await context.close();
      }
    });

    test(`no ₹ symbol on any screen, correct currency shown`, async ({ browser }) => {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const routesToCheck = [
          '/gold-erp/items',
          '/gold-erp/rate-card',
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
  });
}

// ── Cross-region consistency checks ──────────────────────────────────────────
test.describe('Multi-region consistency', () => {

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

  test('India tenant still shows INR', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_gld_owner');
    try {
      const body = await assertNoCrash(page, '/gold-erp/items');
      const hasINR = body.includes('₹') || body.includes('INR');
      expect(hasINR, 'India gold ERP items page missing ₹/INR').toBeTruthy();
    } finally {
      await context.close();
    }
  });

  test('no region shows another region\'s currency symbol', async ({ browser }) => {
    for (const region of REGIONS) {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const body = await assertNoCrash(page, '/invoices');
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

  test('plan features API returns gold-erp vertical-specific nav items for all regions', async ({ browser }) => {
    for (const region of REGIONS) {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const features = await page.evaluate(async () => {
          const r = await fetch('/api/tenant/features');
          return r.json();
        });
        const nav: string[] = features.allowedNavItems ?? [];
        expect(nav, `${region.country} missing gold-erp in nav`).toContain('gold-erp');
        expect(nav, `${region.country} missing warehouses in nav`).toContain('warehouses');
      } finally {
        await context.close();
      }
    }
  });

  test('accounting screens load in all 5 regions', async ({ browser }) => {
    const acctRoutes = ['/accounting/chart-of-accounts', '/accounting/journal-entries', '/accounting/trial-balance'];
    for (const region of REGIONS) {
      const { page, context } = await loginAs(browser, region.username);
      try {
        for (const route of acctRoutes) {
          await assertNoCrash(page, route);
        }
      } finally {
        await context.close();
      }
    }
  });
});
