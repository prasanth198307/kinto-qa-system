import { test, expect } from "@playwright/test";
import { login, fillInput } from "./login-helper";

// ── helpers ────────────────────────────────────────────────────────────────────

async function goTo(page: any, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
}

// ── test ───────────────────────────────────────────────────────────────────────
test("F15 — CRM Full Flow: Lead → Status Progression → Table Search → Survey → Response", async ({ page }) => {
  test.setTimeout(300_000);

  // ── Login ──────────────────────────────────────────────────────────────────
  await test.step("Login as goldadmin", async () => {
    await login(page);
    console.log("✓ Logged in");
  });

  // ── PHASE 1: Create Lead ───────────────────────────────────────────────────
  let leadName = "";
  await test.step("Create new lead — Sunita Agarwal", async () => {
    await goTo(page, "/crm/leads");

    await page.locator('[data-testid="btn-add-lead"]').click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(500);

    leadName = `Sunita Agarwal ${Date.now().toString().slice(-4)}`;
    await fillInput(page, "input-lead-name", leadName);
    await fillInput(page, "input-lead-phone", "9977665544");
    await fillInput(page, "input-lead-email", "sunita@example.com");
    await fillInput(page, "input-lead-product", "22K Necklace Set, budget ₹1.5L");
    await page.locator('[data-testid="textarea-lead-notes"]').fill("Interested in 22K necklace set");

    // Source — walk-in
    await page.locator('[data-testid="select-lead-source"]').click();
    await page.waitForTimeout(300);
    await page.getByRole("option", { name: "Walk-in" }).click();

    await page.locator('[data-testid="btn-save-lead"]').click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify in kanban (default view) — card or body text
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toContain(leadName);
    console.log(`✓ Lead created: ${leadName}`);
  });

  // ── PHASE 2: Status Progression via inline buttons ─────────────────────────
  await test.step("Progress lead: New → Contacted → Interested via inline status buttons", async () => {
    // Already on /crm/leads kanban view; find the new lead's card
    const cardLocator = page.locator(`[data-testid^="card-lead-"]`).filter({ hasText: leadName });
    await cardLocator.waitFor({ timeout: 8000 });

    // Click "→ Contacted"
    const contactedBtn = cardLocator.locator("button", { hasText: /contacted/i });
    await contactedBtn.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    console.log("✓ Status → Contacted");

    // Re-find card in Contacted column
    const card2 = page.locator(`[data-testid^="card-lead-"]`).filter({ hasText: leadName });
    await card2.waitFor({ timeout: 8000 });
    const interestedBtn = card2.locator("button", { hasText: /interested/i });
    await interestedBtn.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    console.log("✓ Status → Interested");

    // Re-find card in Interested column → Qualified
    const card3 = page.locator(`[data-testid^="card-lead-"]`).filter({ hasText: leadName });
    await card3.waitFor({ timeout: 8000 });
    const qualifiedBtn = card3.locator("button", { hasText: /qualified/i });
    await qualifiedBtn.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    console.log("✓ Status → Qualified");

    // Verify the lead appears in Qualified column
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toContain(leadName);
    console.log("✓ Lead progressed through statuses: New → Contacted → Interested → Qualified");
  });

  // ── PHASE 3: Switch to Table View and Search ───────────────────────────────
  await test.step("Switch to table view and search for the lead", async () => {
    // Click the Table view toggle
    await page.getByRole("button", { name: /table/i }).click();
    await page.waitForTimeout(500);

    // Search for the lead
    const searchInput = page.locator('[data-testid="input-search-leads"]');
    await searchInput.fill("Sunita");
    await page.waitForTimeout(500);

    // Verify row appears
    const row = page.locator(`[data-testid^="row-lead-"]`).filter({ hasText: leadName });
    await row.waitFor({ timeout: 8000 });
    const rowText = await row.textContent();
    console.log("Table row:", rowText?.replace(/\s+/g, " ").trim().slice(0, 120));
    expect(rowText).toContain(leadName);
    expect(rowText).toMatch(/qualified/i);
    console.log("✓ Lead visible in table view with Qualified status");
  });

  // ── PHASE 4: Edit Lead — mark Converted ────────────────────────────────────
  await test.step("Edit lead and mark as Converted", async () => {
    // Open edit from table row
    const row = page.locator(`[data-testid^="row-lead-"]`).filter({ hasText: leadName });
    const editBtn = row.locator("button").first();
    await editBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 8000 });
    await page.waitForTimeout(500);

    // Change status to converted
    await page.locator('[data-testid="select-lead-status"]').click();
    await page.waitForTimeout(300);
    await page.getByRole("option", { name: /converted/i }).click();

    await page.locator('[data-testid="btn-save-lead"]').click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    // Verify converted in table
    await page.locator('[data-testid="input-search-leads"]').fill("Sunita");
    await page.waitForTimeout(400);
    const updatedRow = page.locator(`[data-testid^="row-lead-"]`).filter({ hasText: leadName });
    await updatedRow.waitFor({ timeout: 8000 });
    const rowText = await updatedRow.textContent();
    expect(rowText).toMatch(/converted/i);
    console.log("✓ Lead status updated to Converted");
  });

  // ── PHASE 5: Create Survey with 2 questions ────────────────────────────────
  let surveyTitle = "";
  await test.step("Create feedback survey with 2 questions", async () => {
    await goTo(page, "/crm/surveys");
    await page.waitForTimeout(600);

    const countBefore = await page.locator('[data-testid^="card-survey-"]').count();

    await page.locator('[data-testid="button-add-survey"]').click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(600);

    surveyTitle = `Post-Purchase Satisfaction ${Date.now().toString().slice(-4)}`;
    // Use fill() directly since it's a controlled input inside a dialog
    const titleInput = page.locator('[data-testid="input-survey-title"]');
    await titleInput.click({ clickCount: 3 });
    await titleInput.fill(surveyTitle);
    await page.waitForTimeout(200);

    await page.locator('[data-testid="textarea-survey-desc"]').fill("Help us improve your experience");
    await page.waitForTimeout(200);

    // Q1 — fill text, keep rating type
    const q1Input = page.locator('[data-testid="input-question-0"]');
    await q1Input.click({ clickCount: 3 });
    await q1Input.fill("How satisfied are you with your purchase? (1-5 stars)");
    await page.waitForTimeout(200);

    // Add Q2 — click the Add button scoped inside the dialog
    const addQBtn = page.locator('[role="dialog"]').getByRole("button", { name: "Add" });
    await addQBtn.click();
    await page.waitForTimeout(500);

    const q1Input2 = page.locator('[data-testid="input-question-1"]');
    await q1Input2.waitFor({ timeout: 5000 });
    await q1Input2.click({ clickCount: 3 });
    await q1Input2.fill("Any suggestions for improvement?");
    await page.waitForTimeout(200);

    // Change Q2 type to text — the 3rd combobox in the dialog (after Target Audience, Status, Q1 type)
    const comboboxes = page.locator('[role="dialog"] [role="combobox"]');
    const cbCount = await comboboxes.count();
    console.log(`Comboboxes in dialog: ${cbCount}`);
    if (cbCount >= 4) {
      await comboboxes.nth(3).click();
      await page.waitForTimeout(300);
      const textOpt = page.getByRole("option", { name: /^text$/i });
      if (await textOpt.count()) await textOpt.click();
    }

    await page.locator('[data-testid="button-save-survey"]').click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(800);

    const countAfter = await page.locator('[data-testid^="card-survey-"]').count();
    console.log(`Survey cards: ${countBefore} → ${countAfter}`);
    // Confirm the title appears in the page body
    const bodyText = await page.locator("body").textContent();
    console.log("Body contains survey title?", bodyText?.includes(surveyTitle));
    expect(bodyText).toContain(surveyTitle);
    console.log(`✓ Survey created: ${surveyTitle}`);
  });

  // ── PHASE 6: Record a Response ─────────────────────────────────────────────
  await test.step("Record a response for the survey", async () => {
    // Click the "Record Response" button on the new survey card
    const surveyCard = page.locator('[data-testid^="card-survey-"]').filter({ hasText: surveyTitle });
    await surveyCard.waitFor({ timeout: 8000 });

    // The response count before
    const countText = await surveyCard.locator("text=/responses/").textContent().catch(() => "0 responses");
    console.log("Before response:", countText?.trim());

    const recordBtn = surveyCard.locator("button", { hasText: /record response/i });
    await recordBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Fill respondent details
    await fillInput(page, "input-response-name", "Sunita Agarwal");
    await fillInput(page, "input-response-phone", "9977665544");

    // If there are star-rating questions, click 4 stars on the first
    const stars = page.locator('[role="dialog"]').locator('svg.lucide-star, svg[class*="star"]');
    const starCount = await stars.count();
    if (starCount >= 4) {
      await stars.nth(3).click(); // 4th star = 4/5
      await page.waitForTimeout(300);
    }

    // If there are textarea questions, fill the first one
    const textAreas = page.locator('[role="dialog"]').locator("textarea");
    if (await textAreas.count()) {
      await textAreas.first().fill("Beautiful necklace, fast delivery");
    }

    await page.locator('[data-testid="button-submit-response"]').click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify response count increased on the card
    const updatedCard = page.locator('[data-testid^="card-survey-"]').filter({ hasText: surveyTitle });
    await updatedCard.waitFor({ timeout: 8000 });
    const updatedCountText = await updatedCard.locator("text=/responses/").textContent().catch(() => "");
    console.log("After response:", updatedCountText?.trim());
    expect(updatedCountText).toMatch(/[1-9]\d* response/);
    console.log("✓ Response recorded — response count increased");
  });
});
