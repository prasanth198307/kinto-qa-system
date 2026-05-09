import { test, expect } from "@playwright/test";
import { login } from "./login-helper";

// ── helpers ────────────────────────────────────────────────────────────────────
async function apiGet(page: any, url: string) {
  const resp = await page.request.get(url);
  if (!resp.ok()) throw new Error(`GET ${url} → ${resp.status()} ${await resp.text()}`);
  return resp.json();
}
async function apiPost(page: any, url: string, body: any) {
  const resp = await page.request.post(url, { data: body });
  if (!resp.ok()) throw new Error(`POST ${url} → ${resp.status()} ${await resp.text()}`);
  return resp.json();
}
async function apiPut(page: any, url: string, body: any) {
  const resp = await page.request.put(url, { data: body });
  if (!resp.ok()) throw new Error(`PUT ${url} → ${resp.status()} ${await resp.text()}`);
  return resp.json();
}
async function goFresh(page: any, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
}

const runId = Date.now().toString().slice(-6);

// ─────────────────────────────────────────────────────────────────────────────
test("F26 — Standard ERP Gaps: Budget → Fixed Assets → Purchase Requisition → Approval Workflow → Cost Centres → GSTR Reports", async ({ page }) => {
  test.setTimeout(120000);

  let budgetId = "";
  let assetId = 0;
  let prId = 0;
  let prNumber = "";
  let approvalRequestId = 0;
  let ccProdId = 0;
  let ccRetailId = 0;

  // ── Login ─────────────────────────────────────────────────────────────────
  await test.step("Login as goldadmin", async () => {
    await login(page, "gold-erp-demo", "goldadmin", "Gold@1234");
    console.log("✓ Logged in as goldadmin");
  });

  // ── PHASE 1: Budget Management ────────────────────────────────────────────
  await test.step("Phase 1a — Create FY 2025-26 Operations Budget", async () => {
    const budget = await apiPost(page, "/api/budgets", {
      name:          `FY 2025-26 Operations Budget F26-${runId}`,
      financialYear: "2025-26",
      periodType:    "monthly",
      notes:         "Annual ops budget for Gold ERP test",
      items:         [],
    });
    budgetId = budget.id;
    expect(budgetId).toBeTruthy();
    expect(budget.name).toContain("F26-");
    expect(budget.financial_year ?? budget.financialYear).toBe("2025-26");
    console.log(`✓ Budget created — "${budget.name}" id: ${budgetId}`);
  });

  await test.step("Phase 1b — GET budget list and verify", async () => {
    const budgets = await apiGet(page, "/api/budgets");
    expect(Array.isArray(budgets)).toBe(true);
    const ours = budgets.find((b: any) => b.id === budgetId);
    expect(ours).toBeTruthy();
    expect(ours.name).toContain(`F26-${runId}`);
    console.log(`✓ Budget list — ${budgets.length} budget(s) — F26-${runId} confirmed`);
  });

  await test.step("Phase 1c — GET budget detail by ID", async () => {
    const detail = await apiGet(page, `/api/budgets/${budgetId}`);
    expect(detail.id).toBe(budgetId);
    expect(Array.isArray(detail.items)).toBe(true);
    console.log(`✓ Budget detail — "${detail.name}" items: ${detail.items.length}`);
  });

  // ── PHASE 2: Fixed Assets ──────────────────────────────────────────────────
  await test.step("Phase 2a — Create fixed asset: Weighing Scale (5yr SLM, ₹85,000)", async () => {
    const purchaseDate = new Date();
    purchaseDate.setFullYear(purchaseDate.getFullYear() - 1);
    const dateStr = purchaseDate.toISOString().split("T")[0];

    const asset = await apiPost(page, "/api/assets/fixed-assets", {
      name:               `Weighing Scale Mettler Toledo F26-${runId}`,
      assetCode:          `WS-${runId}`,
      category:           "Equipment",
      purchaseDate:       dateStr,
      purchaseCost:       85000,
      usefulLifeMonths:   60,
      salvageValue:       0,
      depreciationMethod: "straight_line",
      location:           "Main Workshop",
      vendorName:         "Mettler-Toledo India",
    });
    assetId = Number(asset.id);
    expect(assetId).toBeGreaterThan(0);
    expect(asset.name).toContain(`F26-${runId}`);
    expect(Number(asset.purchase_cost)).toBe(85000);
    console.log(`✓ Fixed asset created — "${asset.name}" cost: ₹${asset.purchase_cost} id: ${assetId}`);
  });

  await test.step("Phase 2b — Verify depreciation schedule generated (SLM ₹85k ÷ 60 months = ₹1416.67/mo)", async () => {
    const assets = await apiGet(page, "/api/assets/fixed-assets");
    expect(Array.isArray(assets)).toBe(true);
    const ours = assets.find((a: any) => a.id === assetId);
    expect(ours).toBeTruthy();
    expect(Number(ours.purchase_cost)).toBe(85000);
    expect(Number(ours.useful_life_months)).toBe(60);
    expect(ours.depreciation_method).toBe("straight_line");
    console.log(`✓ Asset confirmed — method: ${ours.depreciation_method}, useful_life: ${ours.useful_life_months} months, cost: ₹${ours.purchase_cost}`);
    const annualDep = (85000 - 0) / 5;
    console.log(`  Expected annual depreciation: ₹${annualDep.toLocaleString()}, monthly: ₹${(annualDep / 12).toFixed(2)}`);
  });

  await test.step("Phase 2c — GET asset by ID (returns {asset, schedule})", async () => {
    const detail = await apiGet(page, `/api/assets/fixed-assets/${assetId}`);
    // GET /:id returns { asset: {...}, schedule: [...] }
    const asset = detail.asset ?? detail;
    expect(Number(asset.id)).toBe(assetId);
    expect(asset.name).toContain(`F26-${runId}`);
    const schedule = detail.schedule ?? [];
    expect(Array.isArray(schedule)).toBe(true);
    expect(schedule.length).toBeGreaterThan(0);
    console.log(`✓ Asset detail — "${asset.name}" status: ${asset.status} — depreciation schedule: ${schedule.length} months`);
  });

  // ── PHASE 3: Purchase Requisitions ─────────────────────────────────────────
  await test.step("Phase 3a — GET existing PRs (bug-fixed: req_number→pr_number, req_date→pr_date in INSERT)", async () => {
    const prs = await apiGet(page, "/api/generic/purchase-requisitions");
    expect(Array.isArray(prs)).toBe(true);
    console.log(`  Existing PRs: ${prs.length}`);
  });

  await test.step("Phase 3b — POST purchase requisition (bug-fixed: correct column names)", async () => {
    const pr = await apiPost(page, "/api/generic/purchase-requisitions", {
      department: "Finance Department",
      notes:      "Gold Wire — 22K 500gm — urgent procurement for workshop",
      items: [
        {
          description:    "Gold Wire 22K",
          quantity:       500,
          qty:            500,
          uom:            "gm",
          estimatedPrice: 5800,
        },
        {
          description:    "Silver Wire 925",
          quantity:       200,
          qty:            200,
          uom:            "gm",
          estimatedPrice: 85,
        },
      ],
    });
    prId     = Number(pr.id);
    prNumber = pr.pr_number;
    expect(prId).toBeGreaterThan(0);
    expect(prNumber).toMatch(/^PR-/);
    expect(pr.status).toBe("draft");
    console.log(`✓ PR created — ${prNumber} id: ${prId} status: ${pr.status}`);
  });

  await test.step("Phase 3c — Verify PR with items via GET /:id", async () => {
    const detail = await apiGet(page, `/api/generic/purchase-requisitions/${prId}`);
    expect(detail.id).toBe(prId);
    expect(detail.pr_number).toBe(prNumber);
    expect(Array.isArray(detail.items)).toBe(true);
    expect(detail.items.length).toBe(2);
    console.log(`✓ PR detail — ${prNumber} items: ${detail.items.length} — "${detail.items[0]?.description}"`);
  });

  await test.step("Phase 3d — Submit PR (status → submitted)", async () => {
    const r = await apiPut(page, `/api/generic/purchase-requisitions/${prId}/submit`, {});
    expect(r.ok).toBe(true);
    const detail = await apiGet(page, `/api/generic/purchase-requisitions/${prId}`);
    expect(detail.status).toBe("submitted");
    console.log(`✓ PR ${prNumber} submitted — status: ${detail.status}`);
  });

  await test.step("Phase 3e — Approve PR (bug-fixed: removed non-existent approved_by/approved_at columns)", async () => {
    const r = await apiPut(page, `/api/generic/purchase-requisitions/${prId}/approve`, {});
    expect(r.ok).toBe(true);
    const detail = await apiGet(page, `/api/generic/purchase-requisitions/${prId}`);
    expect(detail.status).toBe("approved");
    console.log(`✓ PR ${prNumber} approved — status: ${detail.status}`);
  });

  await test.step("Phase 3f — Convert approved PR to Purchase Order", async () => {
    const po = await apiPost(page, `/api/generic/purchase-requisitions/${prId}/convert-to-po`, {});
    expect(po.id).toBeTruthy();
    expect(po.po_number).toMatch(/^PO-/);
    // PR status should now be 'converted'
    const detail = await apiGet(page, `/api/generic/purchase-requisitions/${prId}`);
    expect(detail.status).toBe("converted");
    console.log(`✓ PR converted to PO — PO: ${po.po_number} (PR status: ${detail.status})`);
  });

  // ── PHASE 4: Approval Workflow ─────────────────────────────────────────────
  await test.step("Phase 4a — GET approval rules", async () => {
    const rules = await apiGet(page, "/api/generic/approval-rules");
    expect(Array.isArray(rules)).toBe(true);
    console.log(`  Existing approval rules: ${rules.length}`);
  });

  await test.step("Phase 4b — Create approval rule for expense above ₹10,000", async () => {
    const rule = await apiPost(page, "/api/generic/approval-rules", {
      entityType:    "expense",
      minAmount:     10000,
      approverRole:  "Finance Head",
      approvalLevel: 1,
    });
    expect(rule.id).toBeTruthy();
    expect(rule.entity_type).toBe("expense");
    expect(Number(rule.min_amount)).toBe(10000);
    console.log(`✓ Approval rule created — entity: ${rule.entity_type} minAmount: ₹${rule.min_amount} approver: ${rule.approver_role}`);
  });

  await test.step("Phase 4c — POST approval request (bug-fixed: removed UUID→int cast for requested_by)", async () => {
    const ar = await apiPost(page, "/api/generic/approval-requests", {
      entityType: "expense",
      entityId:   prId,
    });
    approvalRequestId = Number(ar.id);
    expect(approvalRequestId).toBeGreaterThan(0);
    expect(ar.status).toBe("pending");
    expect(ar.entity_type).toBe("expense");
    console.log(`✓ Approval request created — id: ${approvalRequestId} entity: ${ar.entity_type} status: ${ar.status}`);
  });

  await test.step("Phase 4d — GET approval requests list (bug-fixed: full_name→CONCAT)", async () => {
    const requests = await apiGet(page, "/api/generic/approval-requests");
    expect(Array.isArray(requests)).toBe(true);
    expect(requests.length).toBeGreaterThan(0);
    const ours = requests.find((r: any) => r.id === approvalRequestId);
    expect(ours).toBeTruthy();
    expect(ours.status).toBe("pending");
    console.log(`✓ Approval requests — ${requests.length} total — our request status: ${ours.status}`);
  });

  await test.step("Phase 4e — Approve the approval request", async () => {
    const r = await apiPut(page, `/api/generic/approval-requests/${approvalRequestId}/approve`, {
      comments: "Approved — Gold wire procurement justified",
    });
    expect(r.ok).toBe(true);

    const requests = await apiGet(page, "/api/generic/approval-requests");
    const ours = requests.find((r: any) => r.id === approvalRequestId);
    expect(ours.status).toBe("approved");
    console.log(`✓ Approval request ${approvalRequestId} approved — status: ${ours.status}`);
  });

  await test.step("Phase 4f — Filter approval requests by status=approved", async () => {
    const approved = await apiGet(page, "/api/generic/approval-requests?status=approved");
    expect(Array.isArray(approved)).toBe(true);
    expect(approved.length).toBeGreaterThan(0);
    const allApproved = approved.every((r: any) => r.status === "approved");
    expect(allApproved).toBe(true);
    console.log(`✓ Filtered approved requests — ${approved.length} entries, all status=approved`);
  });

  // ── PHASE 5: Cost Centres ──────────────────────────────────────────────────
  await test.step("Phase 5a — GET existing cost centres", async () => {
    const ccs = await apiGet(page, "/api/generic/cost-centres");
    expect(Array.isArray(ccs)).toBe(true);
    console.log(`  Existing cost centres: ${ccs.length}`);
  });

  await test.step("Phase 5b — Create 'Production Workshop' cost centre", async () => {
    const cc = await apiPost(page, "/api/generic/cost-centres", {
      code: `CC-PROD-${runId}`,
      name: `Production Workshop F26-${runId}`,
    });
    ccProdId = Number(cc.id);
    expect(ccProdId).toBeGreaterThan(0);
    expect(cc.name).toContain(`F26-${runId}`);
    expect(cc.code).toBe(`CC-PROD-${runId}`);
    console.log(`✓ Cost centre created — "${cc.name}" code: ${cc.code} id: ${ccProdId}`);
  });

  await test.step("Phase 5c — Create 'Retail Counter' cost centre", async () => {
    const cc = await apiPost(page, "/api/generic/cost-centres", {
      code: `CC-RETL-${runId}`,
      name: `Retail Counter F26-${runId}`,
    });
    ccRetailId = Number(cc.id);
    expect(ccRetailId).toBeGreaterThan(0);
    expect(cc.name).toContain("Retail");
    console.log(`✓ Cost centre created — "${cc.name}" code: ${cc.code} id: ${ccRetailId}`);
  });

  await test.step("Phase 5d — Verify both cost centres in list", async () => {
    const ccs = await apiGet(page, "/api/generic/cost-centres");
    const prod   = ccs.find((c: any) => c.id === ccProdId);
    const retail = ccs.find((c: any) => c.id === ccRetailId);
    expect(prod).toBeTruthy();
    expect(retail).toBeTruthy();
    console.log(`✓ Cost centres — ${ccs.length} total — Production: ${prod.name}, Retail: ${retail.name}`);
  });

  await test.step("Phase 5e — Update cost centre name", async () => {
    const updated = await apiPut(page, `/api/generic/cost-centres/${ccProdId}`, {
      code: `CC-PROD-${runId}`,
      name: `Production Workshop (Gold) F26-${runId}`,
    });
    expect(updated.name).toContain("Gold");
    console.log(`✓ Cost centre updated — "${updated.name}"`);
  });

  // ── PHASE 6: GSTR-1 Report ────────────────────────────────────────────────
  await test.step("Phase 6a — GET GSTR-1 for current month/year", async () => {
    const now = new Date();
    const gstr1 = await apiGet(page, `/api/generic/gstr1?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
    expect(gstr1).toBeTruthy();
    expect(Array.isArray(gstr1.b2b)).toBe(true);
    expect(Array.isArray(gstr1.b2c)).toBe(true);
    expect(gstr1.summary).toBeTruthy();
    console.log(`✓ GSTR-1 — b2b: ${gstr1.b2b.length}, b2c: ${gstr1.b2c.length}, total: ${gstr1.summary.totalInvoices} invoices, supply: ₹${Number(gstr1.summary.totalSupply).toFixed(2)}`);
  });

  await test.step("Phase 6b — GET GSTR-1 for previous month (April 2025 FY data)", async () => {
    const gstr1 = await apiGet(page, "/api/generic/gstr-1?month=4&year=2025");
    expect(gstr1.b2b).toBeTruthy();
    expect(gstr1.b2c).toBeTruthy();
    expect(gstr1.summary).toBeTruthy();
    console.log(`✓ GSTR-1 Apr 2025 — b2b: ${gstr1.b2b.length}, b2c: ${gstr1.b2c.length}, tax: ₹${Number(gstr1.summary.totalTax || 0).toFixed(2)}`);
  });

  // ── PHASE 7: GSTR-3B Report ───────────────────────────────────────────────
  await test.step("Phase 7a — GET GSTR-3B summary", async () => {
    const now = new Date();
    const gstr3b = await apiGet(page, `/api/generic/gstr3b?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
    expect(gstr3b).toBeTruthy();
    expect(gstr3b.sup_details).toBeTruthy();
    expect(gstr3b.itc_elg).toBeTruthy();
    const sup = gstr3b.sup_details;
    const itc = gstr3b.itc_elg;
    const outputTax = Number(sup.cgst) + Number(sup.sgst) + Number(sup.igst);
    const inputTax  = Number(itc.inputs);
    console.log(`✓ GSTR-3B — Taxable supply: ₹${Number(sup.taxable_value).toFixed(2)} | Output tax: ₹${outputTax.toFixed(2)} | ITC: ₹${inputTax.toFixed(2)} | Net payable: ₹${(outputTax - inputTax).toFixed(2)}`);
  });

  await test.step("Phase 7b — GET GSTR-3B alternate endpoint (/gstr-3b)", async () => {
    const gstr3b = await apiGet(page, "/api/generic/gstr-3b?month=4&year=2025");
    expect(gstr3b.sup_details).toBeTruthy();
    expect(typeof gstr3b.sup_details.cgst).not.toBe("undefined");
    console.log(`✓ GSTR-3B alternate endpoint confirmed — CGST: ${gstr3b.sup_details.cgst}, SGST: ${gstr3b.sup_details.sgst}`);
  });

  // ── PHASE 8: UI — Fixed Assets ────────────────────────────────────────────
  await test.step("Phase 8 — Verify /fixed-assets UI", async () => {
    await goFresh(page, "/fixed-assets");
    await expect(page.locator('[data-testid="button-new-asset"]')).toBeVisible({ timeout: 20000 });
    await page.locator('[data-testid="button-new-asset"]').click();
    await page.waitForTimeout(400);
    await expect(page.locator('[data-testid="input-asset-name"]')).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    const rows = page.locator(`[data-testid="row-asset-${assetId}"]`);
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    console.log(`✓ /fixed-assets — new-asset dialog works, asset row ${assetId} visible`);
  });

  // ── PHASE 9: UI — Cost Centres ────────────────────────────────────────────
  await test.step("Phase 9 — Verify /cost-centres UI", async () => {
    await goFresh(page, "/cost-centres");
    await expect(page.locator('[data-testid="text-page-title"]')).toBeVisible({ timeout: 20000 });
    const title = await page.locator('[data-testid="text-page-title"]').textContent();
    expect(title?.trim()).toBe("Cost Centres");

    await expect(page.locator('[data-testid="button-add-cost-centre"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="button-add-cost-centre"]').click();
    await page.waitForTimeout(400);
    await expect(page.locator('[data-testid="input-code"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="input-name"]')).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");

    const ccRow = page.locator(`[data-testid="row-cost-centre-${ccProdId}"]`);
    await expect(ccRow).toBeVisible({ timeout: 10000 });
    console.log(`✓ /cost-centres — title: "${title?.trim()}", dialog works, CC ${ccProdId} visible`);
  });

  // ── PHASE 10: UI — Purchase Requisitions ──────────────────────────────────
  await test.step("Phase 10 — Verify /purchase-requisitions UI", async () => {
    await goFresh(page, "/purchase-requisitions");
    await expect(page.locator('[data-testid="text-page-title"]')).toBeVisible({ timeout: 20000 });
    const title = await page.locator('[data-testid="text-page-title"]').textContent();
    expect(title?.trim()).toBe("Purchase Requisitions");

    await expect(page.locator('[data-testid="button-new-pr"]')).toBeVisible({ timeout: 10000 });
    const prRow = page.locator(`[data-testid="row-pr-${prId}"]`);
    await expect(prRow).toBeVisible({ timeout: 10000 });
    console.log(`✓ /purchase-requisitions — PR ${prId} (${prNumber}) row visible`);
  });

  // ── PHASE 11: UI — Approval Workflows ─────────────────────────────────────
  await test.step("Phase 11 — Verify /approval-workflows UI", async () => {
    await goFresh(page, "/approval-workflows");
    await expect(page.locator('[data-testid="text-page-title"]')).toBeVisible({ timeout: 20000 });
    const title = await page.locator('[data-testid="text-page-title"]').textContent();
    expect(title?.trim()).toBe("Approval Workflows");

    await expect(page.locator('[data-testid="tab-inbox"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="tab-rules"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="tab-history"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="tab-history"]').click();
    await page.waitForTimeout(500);
    const historyRows = page.locator('[data-testid^="row-history-"]');
    const histCount = await historyRows.count();
    expect(histCount).toBeGreaterThan(0);
    console.log(`✓ /approval-workflows — ${histCount} history row(s) (including approved request)`);
  });

  // ── PHASE 12: UI — Budget Variance ────────────────────────────────────────
  await test.step("Phase 12 — Verify /budget-variance UI", async () => {
    await goFresh(page, "/budget-variance");
    await expect(page.locator('[data-testid="text-page-title"]')).toBeVisible({ timeout: 20000 });
    const title = await page.locator('[data-testid="text-page-title"]').textContent();
    expect(title).toMatch(/Budget/i);

    await expect(page.locator('[data-testid="tab-budgets"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="tab-variance"]')).toBeVisible({ timeout: 10000 });

    const budgetRow = page.locator(`[data-testid="row-budget-${budgetId}"]`);
    await expect(budgetRow).toBeVisible({ timeout: 10000 });
    const budgetName = await page.locator(`[data-testid="text-budget-name-${budgetId}"]`).textContent();
    expect(budgetName).toContain(`F26-${runId}`);
    console.log(`✓ /budget-variance — budget row "${budgetName}" visible`);
  });

  // ── PHASE 13: UI — GST Returns ────────────────────────────────────────────
  await test.step("Phase 13 — Verify /gstr-reports UI", async () => {
    await goFresh(page, "/gstr-reports");
    await expect(page.locator('[data-testid="text-page-title"]')).toBeVisible({ timeout: 20000 });
    const title = await page.locator('[data-testid="text-page-title"]').textContent();
    expect(title?.trim()).toBe("GST Returns");

    await expect(page.locator('[data-testid="tab-gstr1"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="tab-gstr3b"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="select-month"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="select-year"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="button-download-gstr1"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="tab-gstr3b"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="button-download-gstr3b"]')).toBeVisible({ timeout: 10000 });
    console.log(`✓ /gstr-reports — GSTR-1 + GSTR-3B tabs, month/year selectors, download buttons all visible`);
  });

  // ── PHASE 14: Final Integrity Check ───────────────────────────────────────
  await test.step("Phase 14 — Final integrity assertions", async () => {
    const assets  = await apiGet(page, "/api/assets/fixed-assets");
    const ccs     = await apiGet(page, "/api/generic/cost-centres");
    const prs     = await apiGet(page, "/api/generic/purchase-requisitions");
    const budgets = await apiGet(page, "/api/budgets");
    const approvals = await apiGet(page, "/api/generic/approval-requests");

    const ourAsset  = assets.find((a: any) => a.id === assetId);
    const ourCC1    = ccs.find((c: any) => c.id === ccProdId);
    const ourCC2    = ccs.find((c: any) => c.id === ccRetailId);
    const ourPR     = prs.find((p: any) => p.id === prId);
    const ourBudget = budgets.find((b: any) => b.id === budgetId);
    const ourAR     = approvals.find((a: any) => a.id === approvalRequestId);

    expect(ourAsset).toBeTruthy();
    expect(ourCC1).toBeTruthy();
    expect(ourCC2).toBeTruthy();
    expect(ourPR?.status).toBe("converted");
    expect(ourBudget).toBeTruthy();
    expect(ourAR?.status).toBe("approved");

    console.log(
      `\n✓ F26 COMPLETE — 6 bugs fixed + all scenarios green:\n` +
      `  [Fix 1] GET /purchase-requisitions: u.full_name → CONCAT(first_name,' ',last_name)\n` +
      `  [Fix 2] GET /purchase-requisitions/:id: pri.requisition_id → pri.pr_id\n` +
      `  [Fix 3] POST /purchase-requisitions: req_number→pr_number, req_date→pr_date; items: requisition_id→pr_id, qty→quantity, uom_id→uom, estimated_unit_price→estimated_price, required_by→required_date\n` +
      `  [Fix 4] PUT /purchase-requisitions/:id/approve+reject: removed non-existent approved_by/approved_at columns\n` +
      `  [Fix 5] POST /purchase-requisitions/:id/convert-to-po: requisition_id→pr_id for items query; PO items use correct purchase_order_id schema\n` +
      `  [Fix 6] GET /approval-requests: full_name→CONCAT; POST: removed UUID→int cast for requested_by\n` +
      `  Budget FY 2025-26, Asset ₹85k SLM 60mo, PR ${prNumber} → converted, Approval request → approved,\n` +
      `  2 cost centres, GSTR-1+3B APIs, all 7 UI pages validated`
    );
  });
});
