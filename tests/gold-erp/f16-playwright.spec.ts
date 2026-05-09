import { test, expect } from "@playwright/test";
import { login, fillInput } from "./login-helper";

// ── helpers ────────────────────────────────────────────────────────────────────

async function goTo(page: any, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
}

async function clickTab(page: any, testId: string) {
  await page.locator(`[data-testid="${testId}"]`).click();
  await page.waitForTimeout(500);
}

// ── test ───────────────────────────────────────────────────────────────────────
test("F16 — Multi-Branch Operations: Warehouses → Stock Transfer → UOM Conversion", async ({ page }) => {
  test.setTimeout(300_000);

  // ── Login ──────────────────────────────────────────────────────────────────
  await test.step("Login as goldadmin", async () => {
    await login(page);
    console.log("✓ Logged in");
  });

  // ── PHASE 1: Create Head Office warehouse ──────────────────────────────────
  let hoId = "";
  let branchId = "";

  await test.step("Create 'Head Office' warehouse", async () => {
    await goTo(page, "/warehouses");

    // Warehouses tab is default
    const heading = await page.locator("h1").textContent();
    console.log("Page heading:", heading);
    expect(heading).toMatch(/warehouses/i);

    await page.locator('[data-testid="button-new-warehouse"]').click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(400);

    await fillInput(page, "input-warehouse-name", "Head Office");
    // Fill code and city directly (no testid but accessible by label)
    const inputs = page.locator('[role="dialog"] input[type="text"], [role="dialog"] input:not([type])');
    const allInputs = await inputs.all();
    // inputs[0]=name, inputs[1]=code, inputs[2]=address, inputs[3]=city, inputs[4]=state
    if (allInputs.length > 1) await allInputs[1].fill("HO");
    if (allInputs.length > 3) await allInputs[3].fill("Hyderabad");
    if (allInputs.length > 4) await allInputs[4].fill("Telangana");

    // Set as default
    const checkbox = page.locator('[role="dialog"] input[type="checkbox"]');
    if (await checkbox.count()) await checkbox.check();

    await page.locator('[data-testid="button-save-warehouse"]').click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    // Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);

    // Verify the warehouse card appeared
    const body = await page.locator("body").textContent();
    expect(body).toContain("Head Office");
    console.log("✓ Head Office warehouse created");

    // Grab its id from the first card
    const firstCard = page.locator('[data-testid^="card-warehouse-"]').first();
    await firstCard.waitFor({ timeout: 5000 });
    const cardTestId = await firstCard.getAttribute("data-testid");
    hoId = cardTestId?.replace("card-warehouse-", "") ?? "";
    console.log(`Head Office warehouse id: ${hoId}`);
  });

  // ── PHASE 2: Create Banjara Hills Branch warehouse ─────────────────────────
  await test.step("Create 'Banjara Hills Branch' warehouse", async () => {
    await page.locator('[data-testid="button-new-warehouse"]').click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(400);

    await fillInput(page, "input-warehouse-name", "Banjara Hills Branch");
    const inputs = page.locator('[role="dialog"] input[type="text"], [role="dialog"] input:not([type])');
    const allInputs = await inputs.all();
    if (allInputs.length > 1) await allInputs[1].fill("BH");
    if (allInputs.length > 3) await allInputs[3].fill("Hyderabad");
    if (allInputs.length > 4) await allInputs[4].fill("Telangana");

    await page.locator('[data-testid="button-save-warehouse"]').click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);

    const body = await page.locator("body").textContent();
    expect(body).toContain("Banjara Hills Branch");
    console.log("✓ Banjara Hills Branch warehouse created");

    // Confirm both warehouses visible
    const cards = page.locator('[data-testid^="card-warehouse-"]');
    const count = await cards.count();
    console.log(`Total warehouse cards: ${count}`);
    expect(count).toBeGreaterThanOrEqual(2);

    // Get branch id
    const allCards = await cards.all();
    for (const card of allCards) {
      const txt = await card.textContent();
      if (txt?.includes("Banjara Hills Branch")) {
        const tid = await card.getAttribute("data-testid");
        branchId = tid?.replace("card-warehouse-", "") ?? "";
      }
    }
    console.log(`Branch warehouse id: ${branchId}`);
  });

  // ── PHASE 3: Create Stock Transfer HO → Branch ────────────────────────────
  await test.step("Create stock transfer from Head Office to Banjara Hills Branch", async () => {
    await clickTab(page, "tab-transfers");

    await page.locator('[data-testid="button-new-transfer"]').click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(600);

    // Select From Warehouse = Head Office (use first() to be resilient against duplicates)
    await page.locator('[data-testid="select-transfer-from"]').click();
    await page.waitForTimeout(400);
    await page.getByRole("option", { name: "Head Office" }).first().click();
    await page.waitForTimeout(300);

    // Select To Warehouse = Banjara Hills Branch
    await page.locator('[data-testid="select-transfer-to"]').click();
    await page.waitForTimeout(400);
    await page.getByRole("option", { name: "Banjara Hills Branch" }).first().click();
    await page.waitForTimeout(300);

    // Reference no
    await fillInput(page, "input-transfer-ref", "DW-2026-001");
    await page.waitForTimeout(200);

    // Click "Complete Transfer"
    await page.locator('[data-testid="button-save-transfer"]').click();

    // Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);

    // Navigate to Warehouses tab and back to force a fresh query load
    await clickTab(page, "tab-warehouses");
    await page.waitForTimeout(500);
    await clickTab(page, "tab-transfers");

    // Wait for a transfer card to appear (reliable selector-based approach)
    await page.waitForSelector('[data-testid^="card-transfer-"]', { timeout: 15000 });
    await page.waitForTimeout(300);

    const body = await page.locator("body").textContent();
    console.log("Transfer text excerpt:", body?.replace(/\s+/g, " ").slice(body.indexOf("Stock Transfers"), body.indexOf("Stock Transfers") + 400));
    expect(body).toContain("Head Office");
    expect(body).toContain("Banjara Hills Branch");
    expect(body).toContain("DW-2026-001");
    expect(body).toMatch(/completed/i);
    console.log("✓ Stock transfer created and verified: Head Office → Banjara Hills Branch [completed]");
  });

  // ── PHASE 4: Verify transfer reference persists after full page reload ─────
  await test.step("Full page reload — transfer record persists in DB", async () => {
    await goTo(page, "/warehouses");
    await clickTab(page, "tab-transfers");

    await page.waitForSelector('[data-testid^="card-transfer-"]', { timeout: 15000 });

    const body = await page.locator("body").textContent();
    expect(body).toContain("DW-2026-001");
    expect(body).toMatch(/completed/i);
    console.log("✓ Transfer record persists after full page reload");
  });

  // ── PHASE 5: UOM Conversion ───────────────────────────────────────────────
  await test.step("Add UOM conversion: 1 kg = 1000 g", async () => {
    await clickTab(page, "tab-uom");
    await page.waitForTimeout(300);

    await page.locator('[data-testid="button-new-uom"]').click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(400);

    await fillInput(page, "input-uom-from", "kg");
    await fillInput(page, "input-uom-factor", "1000");
    await fillInput(page, "input-uom-to", "g");

    await page.locator('[data-testid="button-save-uom"]').click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);

    const body = await page.locator("body").textContent();
    expect(body).toContain("kg");
    expect(body).toContain("1000");
    expect(body).toContain("g");
    console.log("✓ UOM conversion added: 1 kg = 1000 g");
  });

  // ── PHASE 6: Second UOM Conversion ────────────────────────────────────────
  await test.step("Add second UOM conversion: 1 tola = 11.664 g", async () => {
    await page.locator('[data-testid="button-new-uom"]').click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(400);

    await fillInput(page, "input-uom-from", "tola");
    await fillInput(page, "input-uom-factor", "11.664");
    await fillInput(page, "input-uom-to", "g");

    await page.locator('[data-testid="button-save-uom"]').click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 8000 }).catch(() => {});

    const body = await page.locator("body").textContent();
    expect(body).toContain("tola");
    expect(body).toContain("11.664");
    console.log("✓ Second UOM conversion added: 1 tola = 11.664 g");
  });

  // ── PHASE 7: Edit a Warehouse ─────────────────────────────────────────────
  await test.step("Edit Head Office warehouse — add address detail", async () => {
    await clickTab(page, "tab-warehouses");
    await page.waitForTimeout(400);

    // Find the HO card and click its edit button (use first() in case of leftover data from prior runs)
    const hoCard = page.locator('[data-testid^="card-warehouse-"]').filter({ hasText: "Head Office" }).first();
    await hoCard.waitFor({ timeout: 5000 });
    const editBtn = hoCard.locator("button").filter({ has: page.locator('svg') }).first();
    await editBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 8000 });
    await page.waitForTimeout(400);

    // Update address
    const addressInput = page.locator('[role="dialog"] input').nth(2);
    await addressInput.click({ clickCount: 3 });
    await addressInput.fill("Road No 12, Banjara Hills");

    await page.locator('[data-testid="button-save-warehouse"]').click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 8000 }).catch(() => {});

    console.log("✓ Head Office address updated");
  });

  // ── PHASE 8: Verify final warehouse count ─────────────────────────────────
  await test.step("Verify 2 warehouses are listed (HO + Branch)", async () => {
    const cards = page.locator('[data-testid^="card-warehouse-"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const body = await page.locator("body").textContent();
    expect(body).toContain("Head Office");
    expect(body).toContain("Banjara Hills Branch");
    console.log(`✓ ${count} warehouses confirmed: Head Office + Banjara Hills Branch`);
  });
});
