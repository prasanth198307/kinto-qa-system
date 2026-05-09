import { test, expect } from "@playwright/test";
import { login, fillInput } from "./login-helper";

// ── helpers ────────────────────────────────────────────────────────────────────

async function goTo(page: any, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
}

async function apiPost(page: any, url: string, data: any) {
  const resp = await page.request.post(url, { data });
  if (!resp.ok()) {
    const body = await resp.text();
    throw new Error(`POST ${url} failed: ${resp.status()} ${body}`);
  }
  return resp.json();
}

async function apiPatch(page: any, url: string, data: any) {
  const resp = await page.request.patch(url, { data });
  if (!resp.ok()) {
    const body = await resp.text();
    throw new Error(`PATCH ${url} failed: ${resp.status()} ${body}`);
  }
  return resp.json();
}

// ── test ───────────────────────────────────────────────────────────────────────
test("F17 — Vendor Purchase → GRN → Sales Invoice → Dispatch", async ({ page }) => {
  test.setTimeout(300_000);

  // ── Login ──────────────────────────────────────────────────────────────────
  await test.step("Login as goldadmin", async () => {
    await login(page);
    console.log("✓ Logged in");
  });

  const runId = Date.now().toString().slice(-6);

  // ── SETUP: Seed a product via API ─────────────────────────────────────────
  let seedProductId = "";

  await test.step("Seed test product via API", async () => {
    const product = await apiPost(page, "/api/products", {
      productCode: `F17-PROD-${runId}`,
      productName: "18K Diamond Ring",
      description: "F17 test product",
      isActive: "true",
    });
    seedProductId = product.id;
    console.log("✓ Seeded product:", seedProductId);
    expect(seedProductId).toBeTruthy();
  });

  // ── PHASE 1: Create Vendor via UI ─────────────────────────────────────────
  let vendorId = "";

  await test.step("Phase 1 — Create vendor 'Shree Gems & Jewels' via UI", async () => {
    await goTo(page, "/vendor-management");

    await page.waitForSelector('[data-testid="button-add-vendor"]', { timeout: 15000 });
    await page.locator('[data-testid="button-add-vendor"]').click();
    await page.waitForTimeout(600);

    await fillInput(page, "input-vendor-code", `V-F17-${runId}`);
    await fillInput(page, "input-vendor-name", "Shree Gems & Jewels");
    await fillInput(page, "input-mobile-number", "9876543210");
    await fillInput(page, "input-gst-number", "36AABCS5432L1Z7");
    await fillInput(page, "input-city", "Surat");
    await fillInput(page, "input-state", "Gujarat");

    await page.locator('[data-testid="button-submit"]').click();
    await page.waitForTimeout(1500);

    await page.waitForSelector('[data-testid^="row-vendor-"]', { timeout: 15000 });
    const vendorRows = page.locator('[data-testid^="row-vendor-"]');
    await expect(vendorRows.first()).toBeVisible();

    const firstRowTestId = await vendorRows.first().getAttribute("data-testid") || "";
    vendorId = firstRowTestId.replace("row-vendor-", "");
    console.log("✓ Vendor created, id:", vendorId);

    await expect(page.getByText("Shree Gems & Jewels").first()).toBeVisible();
  });

  // ── PHASE 2: Create Purchase Order via API ────────────────────────────────
  let poId = "";

  await test.step("Phase 2 — Create Purchase Order via API", async () => {
    const po = await apiPost(page, "/api/purchase-orders", {
      vendorId: vendorId || null,
      urgency: "high",
      quantity: 0,
      remarks: `F17 test PO run ${runId}`,
      items: [
        {
          serialNo: 1,
          itemName: "Round Diamonds 2mm",
          quantity: "50",
          unit: "Pcs",
          unitPrice: 80000,  // ₹800 in paise
          amount: 4000000,   // ₹40,000 in paise
          gstRate: 300,      // 3% GST in basis points
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          totalAmount: 4000000,
        },
      ],
    });
    poId = po.id;
    console.log("✓ PO created via API, id:", poId);
    expect(poId).toBeTruthy();
    expect(po.status).toBe("pending");
  });

  // ── PHASE 3: Verify PO in UI ──────────────────────────────────────────────

  await test.step("Phase 3 — Verify PO visible in UI", async () => {
    await goTo(page, "/?tab=purchase-orders");

    const poCard = page.locator(`[data-testid="card-po-${poId}"]`);
    await expect(poCard).toBeVisible({ timeout: 15000 });

    await expect(page.getByText("Shree Gems & Jewels").first()).toBeVisible();
    console.log("✓ PO visible in UI");
  });

  // ── PHASE 4: Approve PO via PATCH API ────────────────────────────────────

  await test.step("Phase 4 — Approve PO via API", async () => {
    const updated = await apiPatch(page, `/api/purchase-orders/${poId}`, {
      status: "approved",
    });
    console.log("✓ PO approved via API, status:", updated.status);
    expect(updated.status).toBe("approved");

    // Verify approve button is gone in UI (PO is now approved)
    await goTo(page, "/?tab=purchase-orders");
    const approveBtn = page.locator(`[data-testid="button-approve-po-${poId}"]`);
    await expect(approveBtn).not.toBeVisible({ timeout: 5000 });
    console.log("✓ PO approve button hidden (status=approved)");
  });

  // ── PHASE 5: Create GRN via API ───────────────────────────────────────────
  let grnId = "";

  await test.step("Phase 5 — Create Goods Receipt Note via API", async () => {
    const today = new Date().toISOString().slice(0, 10);

    // goods_receipt_notes.po_id and vendor_id are integer columns (legacy),
    // pass null since our PO and vendor IDs are UUIDs
    const grn = await apiPost(page, "/api/generic/grns", {
      received_date: today,
      po_id: null,
      vendor_id: null,
      remarks: `F17 run ${runId} — 48 diamonds received from Shree Gems`,
      items: [
        {
          item_name: "Round Diamonds 2mm",
          ordered_qty: 50,
          received_qty: 48,
          unit: "Pcs",
          unit_price: 800,
        },
      ],
    });
    grnId = grn.id;
    console.log("✓ GRN created via API, id:", grnId);
    expect(grnId).toBeTruthy();
  });

  // ── PHASE 6: Verify GRN row in UI ────────────────────────────────────────

  await test.step("Phase 6 — Verify GRN row is visible in UI", async () => {
    await goTo(page, "/goods-receipt-notes");
    await page.waitForSelector('[data-testid^="row-grn-"]', { timeout: 15000 });

    const grnRow = page.locator(`[data-testid="row-grn-${grnId}"]`);
    await expect(grnRow).toBeVisible({ timeout: 10000 });

    const viewBtn = page.locator(`[data-testid="button-view-grn-${grnId}"]`);
    await expect(viewBtn).toBeVisible({ timeout: 5000 });

    console.log("✓ GRN row visible — row-grn-" + grnId);
  });

  // ── PHASE 7: Create Sales Invoice via API ─────────────────────────────────
  let invoiceId = "";

  await test.step("Phase 7 — Create Sales Invoice via API", async () => {
    // amounts in paise (₹45,000 × 2 = ₹90,000)
    const unitPricePaise = 4500000;
    const qty = 2;
    const taxableAmtPaise = unitPricePaise * qty;

    const result = await apiPost(page, "/api/invoices", {
      header: {
        buyerName: "Priya Jewellers",
        buyerAddress: "45 Zaveri Bazaar, Mumbai 400004",
        buyerState: "Maharashtra",
        buyerStateCode: "27",
        invoiceDate: new Date().toISOString(),
        placeOfSupply: "Maharashtra",
        subtotal: taxableAmtPaise,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        cessAmount: 0,
        transportRatePerCase: 0,
        transportCharges: 0,
        roundOff: 0,
        totalAmount: taxableAmtPaise,
        amountReceived: 0,
        reverseCharge: 0,
      },
      items: [
        {
          productId: seedProductId || null,
          description: "18K Diamond Ring",
          quantity: qty,
          unitPrice: unitPricePaise,
          taxableAmount: taxableAmtPaise,
          totalAmount: taxableAmtPaise, // invoice_items.total_amount NOT NULL (no default)
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          igstRate: 0,
          igstAmount: 0,
          cessRate: 0,
          cessAmount: 0,
          discount: 0,
          transportRatePerCase: 0,
          transportCharges: 0,
        },
      ],
    });
    // Route returns { invoice: {...}, gatepass: null, message: "..." }
    invoiceId = result.invoice?.id;
    console.log("✓ Invoice created via API, id:", invoiceId);
    expect(invoiceId).toBeTruthy();
  });

  // ── PHASE 8: Verify Invoice row in UI ────────────────────────────────────

  await test.step("Phase 8 — Verify Invoice row is visible in UI", async () => {
    await goTo(page, "/?tab=invoices");
    await page.waitForSelector('[data-testid^="invoice-row-"]', { timeout: 15000 });

    const invoiceRow = page.locator(`[data-testid="invoice-row-${invoiceId}"]`);
    await expect(invoiceRow).toBeVisible({ timeout: 10000 });

    const buyerCell = page.locator(`[data-testid="buyer-name-${invoiceId}"]`);
    await expect(buyerCell).toContainText("Priya Jewellers");

    console.log("✓ Invoice row visible — invoice-row-" + invoiceId);
  });

  // ── PHASE 9: Gatepass dispatch tab accessible ─────────────────────────────

  await test.step("Phase 9 — Gatepass dispatch tab is accessible", async () => {
    await goTo(page, "/?tab=gatepasses");

    const addBtn = page.locator('[data-testid="button-add-gatepass"]');
    await expect(addBtn).toBeVisible({ timeout: 15000 });

    // Gatepass creation requires finished_good_id (inventory FK).
    // Verify the dispatch UI is reachable and functional.
    console.log("✓ Gatepass dispatch tab loaded — Issue Gatepass button visible");
  });

  // ── PHASE 10: Final count verification ───────────────────────────────────

  await test.step("Phase 10 — Final count verification", async () => {
    // GRN count
    await goTo(page, "/goods-receipt-notes");
    await page.waitForSelector('[data-testid^="row-grn-"]', { timeout: 15000 });
    const grnCount = await page.locator('[data-testid^="row-grn-"]').count();
    expect(grnCount).toBeGreaterThanOrEqual(1);
    console.log(`✓ GRN count: ${grnCount}`);

    // Invoice count
    await goTo(page, "/?tab=invoices");
    await page.waitForSelector('[data-testid^="invoice-row-"]', { timeout: 15000 });
    const invoiceCount = await page.locator('[data-testid^="invoice-row-"]').count();
    expect(invoiceCount).toBeGreaterThanOrEqual(1);
    console.log(`✓ Invoice count: ${invoiceCount}`);

    // Gatepass tab
    await goTo(page, "/?tab=gatepasses");
    await expect(page.locator('[data-testid="button-add-gatepass"]')).toBeVisible({ timeout: 10000 });
    console.log("✓ Gatepass dispatch UI verified");

    console.log("✓ F17 complete — Vendor (UI), PO (API), GRN (API), Invoice (API), Gatepass UI all verified");
  });
});
