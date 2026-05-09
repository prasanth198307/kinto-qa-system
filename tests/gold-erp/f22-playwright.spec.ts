import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import { login } from "./login-helper";

// ── helpers ────────────────────────────────────────────────────────────────────
async function apiGet(page: any, url: string) {
  const resp = await page.request.get(url);
  if (!resp.ok()) throw new Error(`GET ${url} → ${resp.status()} ${await resp.text()}`);
  return resp.json();
}
async function apiPatch(page: any, url: string, body: any) {
  const resp = await page.request.patch(url, { data: body });
  if (!resp.ok()) throw new Error(`PATCH ${url} → ${resp.status()} ${await resp.text()}`);
  return resp.json();
}
async function apiPost(page: any, url: string, body: any) {
  const resp = await page.request.post(url, { data: body });
  if (!resp.ok()) throw new Error(`POST ${url} → ${resp.status()} ${await resp.text()}`);
  return resp.json();
}
function psql(sql: string): string {
  const raw = execSync(`psql $DATABASE_URL -t -c "${sql.replace(/"/g, '\\"')}"`, { encoding: "utf-8" });
  // -t gives one data row per line; grab the first non-empty line (skips command-tag like "INSERT 0 1")
  const firstLine = raw.split("\n").map(l => l.trim()).find(l => l.length > 0 && !l.startsWith("INSERT") && !l.startsWith("UPDATE") && !l.startsWith("DELETE") && !l.startsWith("SELECT"));
  return firstLine ?? raw.trim();
}
async function goFresh(page: any, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
}

const today = new Date().toISOString().slice(0, 10);
// HDFC bank COA in tenant 1 — used as bank_account_id FK (column is not tenant-scoped)
const BANK_COA_ID = "8cb70090-96ce-49d9-8156-cbd01a7f506b";

// ─────────────────────────────────────────────────────────────────────────────
test("F22 — Bank Reconciliation: Import Statement → Categorize → Auto-Reconcile → Verify", async ({ page }) => {
  test.setTimeout(120000);

  let importId = "";
  const txnIds: Record<string, string> = {};   // label → UUID

  // ── Login ─────────────────────────────────────────────────────────────────

  await test.step("Login as goldadmin", async () => {
    await login(page, "gold-erp-demo", "goldadmin", "Gold@1234");
    console.log("✓ Logged in as goldadmin");
  });

  // ── PHASE 1: Seed Bank Statement Import via SQL ───────────────────────────

  await test.step("Phase 1 — Create bank statement import via SQL", async () => {
    importId = psql(
      `INSERT INTO bank_statement_imports (file_name, bank_account_id, bank_name, account_number, start_date, end_date, total_rows, duplicate_count, tenant_id) ` +
      `VALUES ('HDFC_F22_${Date.now()}.xls', '${BANK_COA_ID}', 'HDFC Bank', '12345678901', '${today}', '${today}', 5, 0, 13) RETURNING id;`
    );
    expect(importId).toBeTruthy();
    console.log(`✓ Bank statement import created — id: ${importId}`);
  });

  // ── PHASE 2: Seed 5 Bank Transactions ────────────────────────────────────

  await test.step("Phase 2 — Seed 5 bank transactions via SQL", async () => {
    const rows = [
      { label: "priya",    debit: "0",      credit: "20370",  desc: "Priya Jewellers NEFT",       ref: "NEFT001", status: "needs_review" },
      { label: "meena",    debit: "0",      credit: "111473", desc: "Meena Reddy UPI Transfer",   ref: "UPI002",  status: "needs_review" },
      { label: "sms",      debit: "25",     credit: "0",      desc: "HDFC SMS Alert Charges",     ref: "SMS003",  status: "unmatched"    },
      { label: "riddhi",   debit: "741600", credit: "0",      desc: "Riddhi Siddhi Bullion NEFT", ref: "NEFT004", status: "unmatched"    },
      { label: "interest", debit: "0",      credit: "500",    desc: "Interest Credit Unknown",    ref: "INT005",  status: "unmatched"    },
    ];

    for (const r of rows) {
      const uid = psql(
        `INSERT INTO bank_transactions (import_id, bank_account_id, txn_date, value_date, description, reference, debit, credit, balance, status, tenant_id) ` +
        `VALUES ('${importId}', '${BANK_COA_ID}', '${today}', '${today}', '${r.desc}', '${r.ref}', ${r.debit}, ${r.credit}, 0, '${r.status}', 13) RETURNING id;`
      );
      txnIds[r.label] = uid;
      expect(uid).toBeTruthy();
      console.log(`  ✓ ${r.label}: ${uid} (debit:₹${r.debit} credit:₹${r.credit})`);
    }
    console.log(`✓ 5 bank transactions seeded`);
  });

  // ── PHASE 3: Verify Transactions via API ──────────────────────────────────

  await test.step("Phase 3 — Verify transactions via API GET", async () => {
    const txns = await apiGet(page, `/api/bank-transactions?importId=${importId}`);
    expect(Array.isArray(txns)).toBe(true);
    // Filter to our import
    const ours = txns.filter((t: any) => t.importId === importId);
    expect(ours.length).toBe(5);
    const total = ours.reduce((s: number, t: any) => s + parseFloat(t.credit || "0"), 0);
    console.log(`✓ 5 transactions found via API — total credits: ₹${total.toFixed(2)}`);
  });

  // ── PHASE 4: Categorize — Priya & Meena as payment_received ──────────────

  await test.step("Phase 4 — Categorize Priya Jewellers as payment received", async () => {
    const updated = await apiPatch(page, `/api/bank-transactions/${txnIds.priya}`, {
      category:           "payment_received",
      matchedAccountName: "Sundry Debtors",
      memo:               "Priya Jewellers invoice payment received via NEFT",
      status:             "needs_review",
    });
    expect(updated.category).toBe("payment_received");
    console.log(`✓ Priya transaction categorized as payment_received`);
  });

  await test.step("Phase 4b — Categorize Meena Reddy as payment received", async () => {
    const updated = await apiPatch(page, `/api/bank-transactions/${txnIds.meena}`, {
      category:           "payment_received",
      matchedAccountName: "Sundry Debtors",
      memo:               "Meena Reddy UPI payment received",
      status:             "needs_review",
    });
    expect(updated.category).toBe("payment_received");
    console.log(`✓ Meena Reddy transaction categorized as payment_received`);
  });

  // ── PHASE 5: Categorize Bank Charge ──────────────────────────────────────

  await test.step("Phase 5 — Record HDFC SMS charge as bank_charge", async () => {
    const updated = await apiPatch(page, `/api/bank-transactions/${txnIds.sms}`, {
      category:           "bank_charges",
      matchedAccountName: "Bank Charges / Fees",
      memo:               "HDFC SMS alert charges — bank fee",
      status:             "approved",
    });
    expect(updated.category).toBe("bank_charges");
    expect(updated.status).toBe("approved");
    console.log(`✓ ₹25 SMS charge categorized as bank_charges`);
  });

  // ── PHASE 6: Categorize Outward Payment ──────────────────────────────────

  await test.step("Phase 6 — Categorize Riddhi Siddhi advance as payment_sent", async () => {
    const updated = await apiPatch(page, `/api/bank-transactions/${txnIds.riddhi}`, {
      category:           "payment_sent",
      matchedAccountName: "Sundry Creditors",
      memo:               "Riddhi Siddhi Bullion advance payment NEFT",
      status:             "approved",
    });
    expect(updated.category).toBe("payment_sent");
    console.log(`✓ ₹7,41,600 Riddhi Siddhi categorized as payment_sent`);
  });

  // ── PHASE 7: Leave Unknown Interest as Outstanding ────────────────────────

  await test.step("Phase 7 — Leave ₹500 interest credit as outstanding (unmatched)", async () => {
    const updated = await apiPatch(page, `/api/bank-transactions/${txnIds.interest}`, {
      category: null,
      memo:     "Unknown credit — pending investigation with bank",
      status:   "unmatched",
    });
    expect(updated.status).toBe("unmatched");
    console.log(`✓ ₹500 unknown credit remains unmatched/outstanding`);
  });

  // ── PHASE 8: Auto-Reconcile ───────────────────────────────────────────────

  await test.step("Phase 8 — Run auto-reconcile", async () => {
    const result = await apiPost(page, "/api/bank-transactions/reconcile", {
      bankAccountId: BANK_COA_ID,
    });
    expect(result).toHaveProperty("matched");
    expect(result).toHaveProperty("total");
    console.log(`✓ Auto-reconcile: ${result.matched} of ${result.total} matched — ${result.message}`);
  });

  // ── PHASE 9: UI Verification ──────────────────────────────────────────────

  await test.step("Phase 9 — Verify bank transactions page loads with testids", async () => {
    await goFresh(page, "/bank-transactions");
    await expect(page.locator('[data-testid="text-page-title"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid="button-auto-reconcile"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="button-upload-statement"]')).toBeVisible({ timeout: 10000 });
    console.log(`✓ Bank Statement Import page loaded with all action buttons`);
  });

  await test.step("Phase 9b — Verify Priya Jewellers transaction row in UI", async () => {
    await goFresh(page, "/bank-transactions");
    // Filter to our import
    await page.locator('[data-testid="select-import"]').click();
    await page.waitForTimeout(400);
    await page.locator(`[data-value="${importId}"], [data-radix-collection-item]`).first().click().catch(() => {});
    await page.waitForTimeout(600);

    // Transaction rows should be visible by testid
    const priyaRow = page.locator(`[data-testid="row-txn-${txnIds.priya}"]`);
    const riddhi   = page.locator(`[data-testid="row-txn-${txnIds.riddhi}"]`);
    await expect(priyaRow).toBeVisible({ timeout: 20000 });
    await expect(riddhi).toBeVisible({ timeout: 10000 });
    console.log(`✓ Transaction rows visible — Priya: row-txn-${txnIds.priya}`);
    console.log(`  ✓ Riddhi Siddhi: row-txn-${txnIds.riddhi}`);
  });

  // ── PHASE 10: Final Summary Verification ─────────────────────────────────

  await test.step("Phase 10 — Final summary count verification via API", async () => {
    const txns = await apiGet(page, `/api/bank-transactions?importId=${importId}`);
    const ours = txns.filter((t: any) => t.importId === importId);
    expect(ours.length).toBe(5);

    // Category assertions
    const priya  = ours.find((t: any) => t.id === txnIds.priya);
    const meena  = ours.find((t: any) => t.id === txnIds.meena);
    const sms    = ours.find((t: any) => t.id === txnIds.sms);
    const riddhi = ours.find((t: any) => t.id === txnIds.riddhi);
    const intTxn = ours.find((t: any) => t.id === txnIds.interest);

    expect(priya?.category).toBe("payment_received");
    expect(meena?.category).toBe("payment_received");
    expect(sms?.category).toBe("bank_charges");
    expect(riddhi?.category).toBe("payment_sent");
    expect(intTxn?.status).toBe("unmatched");

    // Financial summary
    const totalCredits  = ours.reduce((s: number, t: any) => s + parseFloat(t.credit || "0"), 0);
    const totalDebits   = ours.reduce((s: number, t: any) => s + parseFloat(t.debit  || "0"), 0);
    const reconciled    = ours.filter((t: any) => t.status === "reconciled").length;
    const approved      = ours.filter((t: any) => t.status === "approved").length;
    const unmatched     = ours.filter((t: any) => t.status === "unmatched").length;

    console.log(`✓ Financial summary:`);
    console.log(`  Total credits : ₹${totalCredits.toLocaleString("en-IN")} (₹20,370 + ₹1,11,473 + ₹500)`);
    console.log(`  Total debits  : ₹${totalDebits.toLocaleString("en-IN")} (₹25 + ₹7,41,600)`);
    console.log(`  Reconciled    : ${reconciled} | Approved: ${approved} | Unmatched: ${unmatched}`);

    // Outstanding unmatched = ₹500 unknown credit
    expect(unmatched).toBeGreaterThanOrEqual(1);
    expect(intTxn?.memo).toContain("pending investigation");

    console.log(
      "✓ F22 complete — Bank statement imported (5 txns), Priya & Meena categorized as payment_received, " +
      "₹25 SMS charge as bank_charges, ₹7,41,600 Riddhi Siddhi as payment_sent, " +
      "₹500 unknown credit left as outstanding, auto-reconcile run, UI verified via testids"
    );
  });
});
