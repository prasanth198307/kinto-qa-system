/**
 * Healthcare ERP — Multi-region screen smoke tests
 *
 * 5 regional healthcare_enterprise tenants:
 *   UAE  (9222 / qa_hc_ae_owner) — AED, VAT
 *   USA  (9223 / qa_hc_us_owner) — USD, Sales Tax
 *   EU   (9224 / qa_hc_eu_owner) — EUR, VAT, Germany
 *   SG   (9225 / qa_hc_sg_owner) — SGD, GST
 *   AU   (9226 / qa_hc_au_owner) — AUD, GST
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
  username:       string;
  currency:       string;
  currencySymbol: string;
  taxLabel:       string;
  country:        string;
}

const REGIONS: RegionConfig[] = [
  { username: 'qa_hc_ae_owner', currency: 'AED', currencySymbol: 'د.إ', taxLabel: 'VAT', country: 'UAE'       },
  { username: 'qa_hc_us_owner', currency: 'USD', currencySymbol: '$',    taxLabel: 'Tax', country: 'USA'       },
  { username: 'qa_hc_eu_owner', currency: 'EUR', currencySymbol: '€',    taxLabel: 'VAT', country: 'Germany'   },
  { username: 'qa_hc_sg_owner', currency: 'SGD', currencySymbol: 'S$',   taxLabel: 'GST', country: 'Singapore' },
  { username: 'qa_hc_au_owner', currency: 'AUD', currencySymbol: 'A$',   taxLabel: 'GST', country: 'Australia' },
];

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

// ── Per-region test suites ────────────────────────────────────────────────────
for (const region of REGIONS) {
  test.describe(`Healthcare ${region.country} (${region.currency})`, () => {

    test('all core healthcare screens load without crash', async ({ browser }) => {
      const { page, context } = await loginAs(browser, region.username);
      try {
        for (const route of CORE_ROUTES) {
          await assertNoCrash(page, route);
        }
      } finally {
        await context.close();
      }
    });

    test(`no Indian Rupee symbol (₹) appears and correct currency (${region.currency}) shown`, async ({ browser }) => {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const routesToCheck = [
          '/healthcare/patients',
          '/healthcare/reports',
          '/invoices',
          '/accounting/journal-entries',
        ];
        for (const route of routesToCheck) {
          const body = await assertNoCrash(page, route);
          expect(body, `₹ found on ${route} for ${region.country}`).not.toContain('₹');
        }
        // Billing/invoices should reflect tenant currency
        const invoiceBody = await assertNoCrash(page, '/invoices');
        const hasCurrency = invoiceBody.includes(region.currencySymbol) || invoiceBody.includes(region.currency);
        expect(hasCurrency, `Currency ${region.currency} not found for ${region.country}`).toBeTruthy();
      } finally {
        await context.close();
      }
    });

    test('accounting screens load (enterprise plan)', async ({ browser }) => {
      const { page, context } = await loginAs(browser, region.username);
      try {
        await assertNoCrash(page, '/accounting/chart-of-accounts');
        await assertNoCrash(page, '/accounting/journal-entries');
        await assertNoCrash(page, '/accounting/trial-balance');
      } finally {
        await context.close();
      }
    });
  });
}

// ── Cross-region consistency checks ──────────────────────────────────────────
test.describe('Healthcare Multi-region consistency', () => {

  test('each region returns distinct non-INR currency from /api/tenant/features', async ({ browser }) => {
    const seen = new Set<string>();
    for (const region of REGIONS) {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const info = await page.evaluate(async () => {
          const r = await fetch('/api/tenant/features');
          return r.json();
        });
        const currency: string = info.currency ?? info.tenant?.currency ?? '';
        expect(currency, `Region ${region.country} returned INR`).not.toBe('INR');
        seen.add(currency);
      } finally {
        await context.close();
      }
    }
    expect(seen.size).toBe(5);
  });

  test('India healthcare tenant still shows INR after regional tenants exist', async ({ browser }) => {
    const { page, context } = await loginAs(browser, 'qa_hc_owner');
    try {
      const body = await assertNoCrash(page, '/healthcare/reports');
      const hasINR = body.includes('₹') || body.includes('INR');
      expect(hasINR, 'India healthcare missing ₹/INR').toBeTruthy();
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
          expect(body, `${region.country} shows ${other.country} symbol ${other.currencySymbol}`)
            .not.toContain(other.currencySymbol);
        }
      } finally {
        await context.close();
      }
    }
  });

  test('plan features API returns healthcare module for all regional tenants', async ({ browser }) => {
    for (const region of REGIONS) {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const features = await page.evaluate(async () => {
          const r = await fetch('/api/tenant/features');
          return r.json();
        });
        const nav: string[] = features.allowedNavItems ?? [];
        expect(nav, `${region.country} missing healthcare in nav`).toContain('healthcare');
        expect(nav, `${region.country} missing accounting in nav`).toContain('journal-entries');
      } finally {
        await context.close();
      }
    }
  });

  test('enterprise plan features include production and warehouses for all regional tenants', async ({ browser }) => {
    for (const region of REGIONS) {
      const { page, context } = await loginAs(browser, region.username);
      try {
        const features = await page.evaluate(async () => {
          const r = await fetch('/api/tenant/features');
          return r.json();
        });
        const nav: string[] = features.allowedNavItems ?? [];
        expect(nav, `${region.country} missing production in nav`).toContain('production');
        expect(nav, `${region.country} missing warehouses in nav`).toContain('warehouses');
      } finally {
        await context.close();
      }
    }
  });
});
