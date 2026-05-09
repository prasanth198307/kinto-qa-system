import { test, expect } from "@playwright/test";
import { login, goToSection, selectFirst, fillInput } from "./login-helper";

test("F14-S1: Create Production Order", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await goToSection(page, "production");

  await page.locator('[data-testid="button-new-production-order"]').click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page.waitForTimeout(500);

  // Metal — pick Gold
  const metalSel = page.locator('[data-testid="select-prod-metal"]');
  if (await metalSel.count()) {
    await metalSel.click();
    await page.waitForTimeout(300);
    const goldOpt = page.getByRole("option", { name: /^gold$/i });
    if (await goldOpt.count()) await goldOpt.first().click();
    else await page.getByRole("option").first().click();
  }

  // Purity — 18K
  const puritSel = page.locator('[data-testid="select-prod-purity"]');
  if (await puritSel.count()) {
    await puritSel.click();
    await page.waitForTimeout(300);
    const opt18k = page.getByRole("option", { name: /18K/i });
    if (await opt18k.count()) await opt18k.first().click();
    else await page.getByRole("option").first().click();
  }

  await fillInput(page, "input-prod-qty", "1");
  await fillInput(page, "input-prod-issued-weight", "5");

  const d = new Date(); d.setDate(d.getDate() + 7);
  await page.locator('[data-testid="input-prod-target-date"]').fill(d.toISOString().slice(0, 10));

  await page.locator('[data-testid="button-create-production-order"]').click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  const bodyText = await page.locator("body").textContent();
  const match = bodyText?.match(/PRD-\d+/);
  console.log("Order created:", match?.[0] ?? "PRD-not-found");
  expect(match?.[0]).toMatch(/PRD-\d+/);
});

test("F14-S2: Add Sketch", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await goToSection(page, "sketch");

  await page.getByRole("button", { name: /add sketch/i }).click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page.waitForTimeout(500);

  const dlg = page.locator('[role="dialog"]');
  await dlg.locator('[role="combobox"]').first().click();
  await page.waitForTimeout(400);
  await page.getByRole("option").first().click();

  const textarea = dlg.locator("textarea").first();
  if (await textarea.count()) await textarea.fill("Ring sketch for 18K 5g production");

  await dlg.getByRole("button", { name: /save/i }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  const rows = page.locator("table tbody tr");
  const cnt = await rows.count();
  console.log("Sketch rows:", cnt);
  expect(cnt).toBeGreaterThan(0);
});

test("F14-S3: Add CAD Record", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await goToSection(page, "cad");

  await page.locator('[data-testid="button-add-cad"]').click();
  await page.waitForTimeout(1000);

  await selectFirst(page, "select-cad-order");
  await page.locator('[data-testid="input-cad-operator"]').fill("Test Operator");
  await selectFirst(page, "select-cad-software");
  await fillInput(page, "input-weight-estimate", "4.2");

  const approved = page.locator('[data-testid="status-approved"]');
  if (await approved.count()) await approved.click();
  await page.waitForTimeout(300);

  await page.locator('[data-testid="button-cad-draft"]').click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  const rows = page.locator("table tbody tr");
  const cnt = await rows.count();
  console.log("CAD rows:", cnt);
  expect(cnt).toBeGreaterThan(0);
});

test("F14-S4: Add CAM Record", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await goToSection(page, "cam");

  await page.locator('[data-testid="button-add-cam"]').click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page.waitForTimeout(500);

  await selectFirst(page, "select-cam-order");
  await page.locator('[data-testid="input-cam-operator"]').fill("Test Operator");
  await fillInput(page, "input-cam-est-hrs", "2");
  await fillInput(page, "input-cam-act-hrs", "2.5");
  await fillInput(page, "input-cam-proto-wt", "4.2");

  const qcBox = page.locator('[data-testid="checkbox-cam-qc"]');
  if (await qcBox.count() && !(await qcBox.isChecked())) await qcBox.click();

  await page.locator('[data-testid="button-save-cam"]').click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  const rows = page.locator("table tbody tr");
  const cnt = await rows.count();
  console.log("CAM rows:", cnt);
  expect(cnt).toBeGreaterThan(0);
});

test("F14-S5: Add Ghat Entry", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await goToSection(page, "ghat");

  await page.locator('[data-testid="button-add-ghat"]').click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page.waitForTimeout(500);

  await selectFirst(page, "select-ghat-order");
  await fillInput(page, "input-ghat-issued", "5");
  await fillInput(page, "input-ghat-received", "4.7");

  await page.locator('[data-testid="button-save-ghat"]').click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  const rows = page.locator("table tbody tr");
  const cnt = await rows.count();
  expect(cnt).toBeGreaterThan(0);
  const lastText = await rows.last().textContent();
  console.log("Ghat last row:", lastText?.replace(/\s+/g, " ").trim());
});

test("F14-S6: Finalize Job", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await goToSection(page, "finalize");

  // Count existing rows before saving
  const rowsBefore = await page.locator("table tbody tr").count();

  await page.locator('[data-testid="button-add-finalize"]').click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page.waitForTimeout(500);

  await selectFirst(page, "select-finalize-order");
  await fillInput(page, "input-finalize-weight", "4.2");

  const qcBox = page.locator('[data-testid="check-finalize-qc"]');
  if (await qcBox.count() && !(await qcBox.isChecked())) await qcBox.click();
  const stockBox = page.locator('[data-testid="check-finalize-stock"]');
  if (await stockBox.count() && !(await stockBox.isChecked())) await stockBox.click();

  await page.locator('[data-testid="button-save-finalize"]').click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  const rowsAfter = await page.locator("table tbody tr").count();
  console.log(`Finalize rows: ${rowsBefore} → ${rowsAfter}`);
  expect(rowsAfter).toBeGreaterThan(rowsBefore);
  console.log("✓ Finalize record saved successfully");
});

test("F14-S7: Karigar Settlement", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await goToSection(page, "settlement");

  // Count existing rows before saving
  const rowsBefore = await page.locator("table tbody tr").count();

  await page.locator('[data-testid="button-add-settlement"]').click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page.waitForTimeout(500);

  await selectFirst(page, "select-settlement-order");
  await selectFirst(page, "select-settlement-karigar");

  await fillInput(page, "input-settlement-issued", "5");
  await fillInput(page, "input-settlement-received", "4.2");
  await fillInput(page, "input-settlement-wastage-pct", "5");
  await fillInput(page, "input-settlement-rate", "5640");
  await fillInput(page, "input-settlement-wage", "1680");

  // Optional preview
  const calcBtn = page.locator('[data-testid="button-calc-settlement"]');
  if (await calcBtn.count()) {
    await calcBtn.click();
    await page.waitForTimeout(500);
  }

  await page.locator('[data-testid="button-save-settlement"]').click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  const rowsAfter = await page.locator("table tbody tr").count();
  console.log(`Settlement rows: ${rowsBefore} → ${rowsAfter}`);
  expect(rowsAfter).toBeGreaterThan(rowsBefore);
  console.log("✓ Settlement record saved successfully");
});
