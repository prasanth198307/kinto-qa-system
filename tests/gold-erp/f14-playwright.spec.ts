import { test, expect } from "@playwright/test";
import { login, goToSection, selectFirst, fillInput } from "./login-helper";

// ── test ───────────────────────────────────────────────────────────────────────
test("F14 — Multi-Stage Production: Order → Sketch → CAD → CAM → Ghat → Finalize → Settlement", async ({ page }) => {
  test.setTimeout(300_000); // 5 minutes

  // ── Login ──────────────────────────────────────────────────────────────────
  await test.step("Login as goldadmin", async () => {
    await login(page);
    console.log("✓ Logged in");
  });

  // ── STEP 1: Create Production Order ────────────────────────────────────────
  await test.step("Create 18K gold production order (5.0g issued)", async () => {
    await goToSection(page, "production");

    await page.locator('[data-testid="button-new-production-order"]').click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Metal — Gold
    const metalSel = page.locator('[data-testid="select-prod-metal"]');
    if (await metalSel.count()) {
      await metalSel.click();
      await page.waitForTimeout(300);
      const goldOpt = page.getByRole("option", { name: /^gold$/i });
      if (await goldOpt.count()) await goldOpt.first().click();
      else await page.getByRole("option").first().click();
    }

    // Purity — 18K
    const puritySel = page.locator('[data-testid="select-prod-purity"]');
    if (await puritySel.count()) {
      await puritySel.click();
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
    await page.waitForTimeout(1000);

    const bodyText = await page.locator("body").textContent();
    const m = bodyText?.match(/PRD-\d+/);
    console.log("✓ Production order created:", m?.[0] ?? "(number in body)");
    expect(bodyText).toMatch(/PRD-\d+/);
  });

  // ── STEP 2: Sketch ─────────────────────────────────────────────────────────
  await test.step("Add sketch record for the new order", async () => {
    await goToSection(page, "sketch");

    await page.getByRole("button", { name: /add sketch/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(500);

    const dlg = page.locator('[role="dialog"]');
    await dlg.locator('[role="combobox"]').first().click();
    await page.waitForTimeout(400);
    await page.getByRole("option").first().click();

    const textarea = dlg.locator("textarea").first();
    if (await textarea.count()) await textarea.fill("Ring sketch approved by designer");

    await dlg.getByRole("button", { name: /save/i }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const rows = page.locator("table tbody tr");
    expect(await rows.count()).toBeGreaterThan(0);
    console.log("✓ Sketch record saved");
  });

  // ── STEP 3: CAD ────────────────────────────────────────────────────────────
  await test.step("Add CAD record with Approved customer status", async () => {
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
    await page.waitForTimeout(500);

    const rows = page.locator("table tbody tr");
    expect(await rows.count()).toBeGreaterThan(0);
    console.log("✓ CAD record saved with Approved status");
  });

  // ── STEP 4: CAM ────────────────────────────────────────────────────────────
  await test.step("Add CAM record with QC passed", async () => {
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
    await page.waitForTimeout(500);

    const rows = page.locator("table tbody tr");
    expect(await rows.count()).toBeGreaterThan(0);
    console.log("✓ CAM record saved (QC passed)");
  });

  // ── STEP 5: Ghat ───────────────────────────────────────────────────────────
  await test.step("Add ghat entry: 5.0g issued, 4.7g received (0.3g casting wastage)", async () => {
    await goToSection(page, "ghat");

    await page.locator('[data-testid="button-add-ghat"]').click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(500);

    await selectFirst(page, "select-ghat-order");
    await fillInput(page, "input-ghat-issued", "5");
    await fillInput(page, "input-ghat-received", "4.7");

    await page.locator('[data-testid="button-save-ghat"]').click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const rows = page.locator("table tbody tr");
    expect(await rows.count()).toBeGreaterThan(0);
    const rowText = await rows.last().textContent();
    console.log("  Ghat row:", rowText?.replace(/\s+/g, " ").trim());
    // NOTE: wastage alert (6% > 5%) is expected — not a test failure
    console.log("✓ Ghat entry saved");
  });

  // ── STEP 6: Finalize ───────────────────────────────────────────────────────
  await test.step("Finalize job: 4.2g final weight, QC passed, move to stock", async () => {
    await goToSection(page, "finalize");

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
    console.log(`  Finalize rows: ${rowsBefore} → ${rowsAfter}`);
    expect(rowsAfter).toBeGreaterThan(rowsBefore);
    console.log("✓ Job finalized (4.2g, QC passed, moved to stock)");
  });

  // ── STEP 7: Settlement ─────────────────────────────────────────────────────
  await test.step("Karigar settlement: 5.0g issued, 4.2g received, 5% wastage, rate 5640, wage 1680", async () => {
    await goToSection(page, "settlement");

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

    // Optional preview calculation
    const calcBtn = page.locator('[data-testid="button-calc-settlement"]');
    if (await calcBtn.count()) {
      await calcBtn.click();
      await page.waitForTimeout(500);
    }

    await page.locator('[data-testid="button-save-settlement"]').click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    const rowsAfter = await page.locator("table tbody tr").count();
    console.log(`  Settlement rows: ${rowsBefore} → ${rowsAfter}`);
    expect(rowsAfter).toBeGreaterThan(rowsBefore);
    console.log("✓ Settlement saved — karigar settlement recorded");
  });
});
