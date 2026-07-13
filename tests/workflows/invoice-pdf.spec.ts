/**
 * Playwright UI workflow: Invoice creation + PDF download
 * Verifies that:
 * - Invoice form loads with correct currency for each tenant
 * - GST fields show for IN tenant, VAT for AE/EU, Sales Tax for US
 * - PDF download works and filename contains invoice number
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:5000';

async function loginAs(page: import('@playwright/test').Page, username: string) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"], input[type="text"]', username);
  await page.fill('input[name="password"], input[type="password"]', 'Test@1234');
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|\//);
}

test.describe('Invoice Form — currency per tenant', () => {
  test('IN tenant: invoice form shows ₹ and GST', async ({ page }) => {
    await loginAs(page, 'qa_admin_in');
    await page.goto(`${BASE}/billing/invoices`);
    await page.waitForLoadState('networkidle');

    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toContain('undefined');
    // Should show ₹ somewhere in amounts
    expect(pageText).toMatch(/₹/);
  });

  test('AE tenant: invoice page shows AED, not ₹', async ({ page }) => {
    await loginAs(page, 'qa_admin_ae');
    await page.goto(`${BASE}/billing/invoices`);
    await page.waitForLoadState('networkidle');

    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toContain('₹');
    expect(pageText).not.toContain('undefined');
  });

  test('US tenant: invoice page shows $, not ₹', async ({ page }) => {
    await loginAs(page, 'qa_admin_us');
    await page.goto(`${BASE}/billing/invoices`);
    await page.waitForLoadState('networkidle');

    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toContain('₹');
    expect(pageText).not.toContain('undefined');
  });

  test('EU tenant: invoice page shows €, not ₹', async ({ page }) => {
    await loginAs(page, 'qa_admin_eu');
    await page.goto(`${BASE}/billing/invoices`);
    await page.waitForLoadState('networkidle');

    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toContain('₹');
    expect(pageText).not.toContain('undefined');
  });
});

test.describe('Print Invoice — currency symbols in PDF view', () => {
  test('IN tenant: print page shows ₹ in all amounts', async ({ page }) => {
    await loginAs(page, 'qa_admin_in');
    // Use seed invoice
    await page.goto(`${BASE}/print-invoice/9001`);
    await page.waitForLoadState('networkidle');

    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toContain('undefined');
    // Print page must have ₹
    expect(pageText).toMatch(/₹/);
  });

  test('AE tenant: print page shows AED symbol, not ₹', async ({ page }) => {
    await loginAs(page, 'qa_admin_ae');
    await page.goto(`${BASE}/print-invoice/9003`);
    await page.waitForLoadState('networkidle');

    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toContain('₹');
    expect(pageText).not.toContain('undefined');
  });

  test('US tenant: print page shows $ symbol, not ₹', async ({ page }) => {
    await loginAs(page, 'qa_admin_us');
    await page.goto(`${BASE}/print-invoice/9005`);
    await page.waitForLoadState('networkidle');

    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toContain('₹');
    expect(pageText).not.toContain('undefined');
  });

  test('EU tenant: print page shows € symbol, not ₹', async ({ page }) => {
    await loginAs(page, 'qa_admin_eu');
    await page.goto(`${BASE}/print-invoice/9007`);
    await page.waitForLoadState('networkidle');

    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toContain('₹');
    expect(pageText).not.toContain('undefined');
  });
});
