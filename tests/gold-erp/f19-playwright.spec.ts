import { test, expect } from "@playwright/test";
import { login } from "./login-helper";

// ── helpers ────────────────────────────────────────────────────────────────────
async function apiGet(page: any, url: string) {
  const resp = await page.request.get(url);
  if (!resp.ok()) {
    const body = await resp.text();
    throw new Error(`GET ${url} failed: ${resp.status()} ${body}`);
  }
  return resp.json();
}
async function apiPost(page: any, url: string, body: any) {
  const resp = await page.request.post(url, { data: body });
  if (!resp.ok()) {
    const text = await resp.text();
    throw new Error(`POST ${url} failed: ${resp.status()} ${text}`);
  }
  return resp.json();
}
async function apiPut(page: any, url: string, body: any) {
  const resp = await page.request.put(url, { data: body });
  if (!resp.ok()) {
    const text = await resp.text();
    throw new Error(`PUT ${url} failed: ${resp.status()} ${text}`);
  }
  return resp.json();
}
async function goTo(page: any, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
}

const runId = Date.now().toString().slice(-6);
const year = new Date().getFullYear();

// ─────────────────────────────────────────────────────────────────────────────
test("F19 — E-Commerce Full Flow: Store Config → Customer → Coupon → Rate → Order → OMS → Sync → ERP", async ({ page }) => {
  test.setTimeout(120000);
  let customerId = 0;
  let couponId = 0;
  let rateId = 0;
  let ecomOrderId = 0;
  let omsOrderId = 0;

  // ── Login ─────────────────────────────────────────────────────────────────

  await test.step("Login as goldadmin", async () => {
    await login(page, "gold-erp-demo", "goldadmin", "Gold@1234");
    console.log("✓ Logged in as goldadmin (tenant 13)");
  });

  // ── PHASE 1: Configure E-Commerce Store ──────────────────────────────────

  await test.step("Phase 1 — Configure E-Commerce Store via API", async () => {
    const cfg = await apiPut(page, "/api/gold-erp/ecom-config", {
      store_name: `F19 Gold Shop ${runId}`,
      rate_source: "manual",
      price_validity_mins: 30,
      cod_enabled: 1,
      return_policy: "7-day return on manufacturing defects",
      seo_title: `F19 Gold Shop ${runId} — Fine Jewellery`,
      seo_description: "Premium 22K and 18K gold jewellery with certified purity",
    });
    expect(cfg.store_name).toBe(`F19 Gold Shop ${runId}`);
    console.log(`✓ Store config saved — name: ${cfg.store_name}`);

    // Verify in UI
    await page.goto(`/gold-erp?section=ecommerce`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="tab-ecom-config"]')).toBeVisible({ timeout: 15000 });
    console.log("✓ E-Commerce Store page loaded — config tab visible");
  });

  // ── PHASE 2: Create E-Commerce Customer ──────────────────────────────────

  await test.step("Phase 2 — Create E-Commerce Customer via API", async () => {
    const customer = await apiPost(page, "/api/gold-erp/ecom-customers", {
      customer_name: `Priya F19 ${runId}`,
      phone: `9900${runId}`,
      email: `priya${runId}@example.com`,
      city: "Mumbai",
      preferred_metal: "gold",
    });
    customerId = Number(customer.id);
    expect(customerId).toBeGreaterThan(0);
    console.log(`✓ E-Commerce customer created, id: ${customerId}`);

    // Fresh page load so query cache picks up new data
    await page.goto("/gold-erp?section=ecommerce");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    // Click Customers tab
    await page.locator('[data-testid="tab-ecom-customers"]').click();
    await expect(page.locator(`[data-testid="row-ecom-customer-${customerId}"]`)).toBeVisible({ timeout: 20000 });
    console.log(`✓ Customer visible in UI — row-ecom-customer-${customerId}`);
  });

  // ── PHASE 3: Create Coupon ────────────────────────────────────────────────

  await test.step("Phase 3 — Create E-Commerce Coupon via API", async () => {
    const code = `F19${runId}`;
    const coupon = await apiPost(page, "/api/gold-erp/ecom-coupons", {
      coupon_code: code,
      discount_type: "pct",
      discount_pct: 5,
      discount_value: 0,
      min_order_value: 10000,
      usage_limit: 100,
      valid_from: `${year}-01-01`,
      valid_to: `${year}-12-31`,
    });
    couponId = Number(coupon.id);
    expect(couponId).toBeGreaterThan(0);
    expect(coupon.coupon_code).toBe(code);
    console.log(`✓ Coupon created, id: ${couponId} code: ${code}`);

    // Fresh page load so query cache picks up new data
    await page.goto("/gold-erp?section=ecommerce");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    // Click Coupons tab
    await page.locator('[data-testid="tab-ecom-coupons"]').click();
    await expect(page.locator(`[data-testid="card-coupon-${couponId}"]`)).toBeVisible({ timeout: 20000 });
    console.log(`✓ Coupon visible in UI — card-coupon-${couponId}`);
  });

  // ── PHASE 4: Record Metal Rate ────────────────────────────────────────────

  await test.step("Phase 4 — Record Metal Rate via API", async () => {
    const rate = await apiPost(page, "/api/gold-erp/ecom-rate-history", {
      metal_type: "gold",
      purity_name: "22K (916)",
      rate_per_gram: 6850,
      source: "manual",
    });
    rateId = Number(rate.id);
    expect(rateId).toBeGreaterThan(0);
    console.log(`✓ Metal rate recorded, id: ${rateId} rate: ₹6850/g`);

    // Fresh page load so query cache picks up new data
    await page.goto("/gold-erp?section=ecommerce");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    // Click Rate History tab
    await page.locator('[data-testid="tab-ecom-rates"]').click();
    await expect(page.locator(`[data-testid="row-rate-${rateId}"]`)).toBeVisible({ timeout: 20000 });
    console.log(`✓ Rate visible in UI — row-rate-${rateId}`);
  });

  // ── PHASE 5: Create E-Commerce Order ─────────────────────────────────────

  await test.step("Phase 5 — Create E-Commerce Order via API", async () => {
    // 22K necklace: 8g × ₹6850 = ₹54,800 + making ₹2,000 = ₹56,800 + 3% GST ₹1,704 = ₹58,504
    const subtotal = 54800;
    const making  = 2000;
    const gst     = Math.round((subtotal + making) * 0.03);
    const total   = subtotal + making + gst;

    const order = await apiPost(page, "/api/gold-erp/ecom-orders", {
      customer_name: `Priya F19 ${runId}`,
      customer_phone: `9900${runId}`,
      customer_email: `priya${runId}@example.com`,
      customer_id: customerId,
      items: [
        { name: "22K Gold Necklace", weight_gm: 8, rate: 6850, metal_value: subtotal },
      ],
      subtotal,
      making_charges: making,
      gst_amount: gst,
      shipping_charges: 0,
      discount_amount: 0,
      total_amount: total,
      payment_mode: "online",
      gold_rate_locked: 6850,
    });
    ecomOrderId = Number(order.id);
    expect(ecomOrderId).toBeGreaterThan(0);
    console.log(`✓ E-Commerce order created, id: ${ecomOrderId} total: ₹${total}`);

    // Fresh page load so query cache picks up new data
    await page.goto("/gold-erp?section=ecommerce");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    // Click Orders tab
    await page.locator('[data-testid="tab-ecom-orders"]').click();
    await expect(page.locator(`[data-testid="row-ecom-order-${ecomOrderId}"]`)).toBeVisible({ timeout: 20000 });
    console.log(`✓ E-Commerce order visible in UI — row-ecom-order-${ecomOrderId}`);
  });

  // ── PHASE 6: Sync Ecom Order → ERP Invoice ───────────────────────────────

  await test.step("Phase 6 — Sync E-Commerce Order to ERP Invoice", async () => {
    const syncResult = await apiPost(page, `/api/gold-erp/ecom-orders/${ecomOrderId}/sync`, {});
    expect(syncResult.success).toBe(true);
    expect(syncResult.invoice).toBeTruthy();
    console.log(`✓ Ecom order synced to ERP invoice — invoice id: ${syncResult.invoice?.id}`);
  });

  // ── PHASE 7: Create OMS Order ─────────────────────────────────────────────

  await test.step("Phase 7 — Create OMS (Counter) Order via API", async () => {
    const deliveryDate = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
    const oms = await apiPost(page, "/api/gold-erp/oms-orders", {
      customer_name: `Ramesh F19 ${runId}`,
      customer_phone: `9800${runId}`,
      customer_email: `ramesh${runId}@example.com`,
      order_type: "new_design",
      metal_type: "gold",
      purity_name: "22K (916)",
      approx_weight_gm: 12,
      making_charges_quoted: 3000,
      advance_paid: 20000,
      advance_mode: "upi",
      expected_delivery: deliveryDate,
      counter_staff: "F19 Staff",
      customisation_notes: "Peacock motif with ruby inlay",
    });
    omsOrderId = Number(oms.id);
    expect(omsOrderId).toBeGreaterThan(0);
    console.log(`✓ OMS order created, id: ${omsOrderId} no: ${oms.order_no}`);
  });

  // ── PHASE 8: Advance OMS Order Through All Statuses ──────────────────────

  await test.step("Phase 8 — Advance OMS Order: booked → dispatched", async () => {
    const statuses = ["design_approved", "in_production", "qc", "ready", "dispatched"];
    for (const status of statuses) {
      await apiPut(page, `/api/gold-erp/oms-orders/${omsOrderId}`, {
        status,
        changed_by: "goldadmin",
        notes: `F19 test — advancing to ${status}`,
      });
      console.log(`  → OMS order advanced to: ${status}`);
    }
    console.log(`✓ OMS order fully dispatched`);
  });

  // ── PHASE 9: Verify OMS Order in UI ──────────────────────────────────────

  await test.step("Phase 9 — Verify OMS Order in UI", async () => {
    await page.goto("/gold-erp?section=oms-orders");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await expect(page.locator(`[data-testid="card-oms-order-${omsOrderId}"]`)).toBeVisible({ timeout: 15000 });
    console.log(`✓ OMS order visible in UI — card-oms-order-${omsOrderId}`);

    // Timeline button should be visible (no advance button since dispatched is final in advance chain)
    await expect(page.locator(`[data-testid="button-timeline-${omsOrderId}"]`)).toBeVisible({ timeout: 10000 });
    console.log(`✓ OMS order timeline button visible`);
  });

  // ── PHASE 10: Final Count Verification ───────────────────────────────────

  await test.step("Phase 10 — Final count verification", async () => {
    // Ecom orders count
    const ecomOrders = await apiGet(page, "/api/gold-erp/ecom-orders");
    expect(Array.isArray(ecomOrders)).toBe(true);
    expect(ecomOrders.length).toBeGreaterThanOrEqual(1);
    console.log(`✓ E-Commerce order count: ${ecomOrders.length}`);

    // OMS orders count
    const omsOrders = await apiGet(page, "/api/gold-erp/oms-orders");
    expect(Array.isArray(omsOrders)).toBe(true);
    expect(omsOrders.length).toBeGreaterThanOrEqual(1);
    console.log(`✓ OMS order count: ${omsOrders.length}`);

    // Coupons count
    const coupons = await apiGet(page, "/api/gold-erp/ecom-coupons");
    expect(Array.isArray(coupons)).toBe(true);
    expect(coupons.length).toBeGreaterThanOrEqual(1);
    console.log(`✓ Coupon count: ${coupons.length}`);

    // Ecom customers count
    const customers = await apiGet(page, "/api/gold-erp/ecom-customers");
    expect(Array.isArray(customers)).toBe(true);
    expect(customers.length).toBeGreaterThanOrEqual(1);
    console.log(`✓ E-Commerce customer count: ${customers.length}`);

    // Rate history count
    const rates = await apiGet(page, "/api/gold-erp/ecom-rate-history");
    expect(Array.isArray(rates)).toBe(true);
    expect(rates.length).toBeGreaterThanOrEqual(1);
    console.log(`✓ Metal rate history count: ${rates.length}`);

    // Verify synced ecom order has synced_to_erp=1
    const syncedOrder = ecomOrders.find((o: any) => Number(o.id) === ecomOrderId);
    expect(syncedOrder?.synced_to_erp).toBe(1);
    console.log(`✓ Ecom order id=${ecomOrderId} synced_to_erp=1 confirmed`);

    // Verify OMS order is dispatched
    const dispatchedOms = omsOrders.find((o: any) => Number(o.id) === omsOrderId);
    expect(dispatchedOms?.status).toBe("dispatched");
    console.log(`✓ OMS order id=${omsOrderId} status=dispatched confirmed`);

    console.log(
      "✓ F19 complete — Store Config (API+UI), Customer (API+UI), Coupon (API+UI), " +
      "Rate (API+UI), Ecom Order (API+UI), Sync→ERP (API), OMS Order (API+UI), " +
      "Status Advance (API), Final counts (API)"
    );
  });
});
