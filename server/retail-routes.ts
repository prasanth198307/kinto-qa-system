import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import crypto from "crypto";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── POS Sessions ──────────────────────────────────────────────────────────────
router.get("/sessions", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM pos_sessions WHERE tenant_id=${tid(req)} ORDER BY opened_at DESC LIMIT 50`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/sessions/active", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM pos_sessions WHERE tenant_id=${tid(req)} AND status='open' ORDER BY opened_at DESC LIMIT 1`);
    res.json(rows.rows[0] || null);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// List distinct counter names from past sessions (for dropdown)
router.get("/sessions/counters", requireAuth, async (req: any, res) => {
  try {
    // Merge counter names from both pre-configured terminals AND past sessions
    const rows = await db.execute(sql`
      SELECT counter_name FROM (
        SELECT DISTINCT counter_name FROM pos_terminals
        WHERE tenant_id=${tid(req)} AND counter_name IS NOT NULL AND is_active = true
        UNION
        SELECT DISTINCT counter_name FROM pos_sessions
        WHERE tenant_id=${tid(req)} AND counter_name IS NOT NULL
      ) combined
      ORDER BY counter_name`);
    res.json(rows.rows.map((r: any) => r.counter_name));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Last closed session (optionally filtered by counter_name)
router.get("/sessions/last", requireAuth, async (req: any, res) => {
  try {
    const { counter_name } = req.query as any;
    const rows = counter_name
      ? await db.execute(sql`SELECT * FROM pos_sessions WHERE tenant_id=${tid(req)} AND status='closed' AND counter_name=${counter_name} ORDER BY closed_at DESC LIMIT 1`)
      : await db.execute(sql`SELECT * FROM pos_sessions WHERE tenant_id=${tid(req)} AND status='closed' ORDER BY closed_at DESC LIMIT 1`);
    res.json(rows.rows[0] || null);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Manager credential verification for approval gate
router.post("/sessions/verify-manager", requireAuth, async (req: any, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ ok: false, message: "Username and password required" });
    const userRows = await db.execute(sql`
      SELECT u.id, u.password, r.name as role_name
      FROM users u LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.username = ${username} AND u.tenant_id = ${Number(tid(req))} AND u.record_status = 1
      LIMIT 1`);
    const user = userRows.rows[0] as any;
    if (!user) return res.status(401).json({ ok: false, message: "User not found" });
    const { comparePasswords } = await import('./auth');
    const ok = await comparePasswords(password, user.password as string);
    if (!ok) return res.status(401).json({ ok: false, message: "Incorrect password" });
    res.json({ ok: true, approvedBy: username, role: user.role_name });
  } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post("/sessions/open", requireAuth, async (req: any, res) => {
  try {
    const { counter_name, opening_balance, opening_upi_float, approved_by, shift_type, shift_name, opening_denomination } = req.body;
    const userId = String(req.user?.id || "");
    const rows = await db.execute(sql`
      INSERT INTO pos_sessions (tenant_id, user_id, counter_name, opening_balance, opening_upi_float, approved_by, shift_type, shift_name, opening_denomination)
      VALUES (${tid(req)}, ${userId}, ${counter_name||'Counter 1'}, ${opening_balance||0},
              ${opening_upi_float||0}, ${approved_by||null}, ${shift_type||'new'}, ${shift_name||'Morning'},
              ${JSON.stringify(opening_denomination||{})})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/sessions/:id/close", requireAuth, async (req: any, res) => {
  try {
    const { closing_balance, closing_denomination } = req.body;
    const stats = await db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as total, COUNT(*) as cnt FROM pos_transactions WHERE session_id=${req.params.id}`);
    const rows = await db.execute(sql`
      UPDATE pos_sessions SET status='closed', closed_at=NOW(),
        closing_balance=${closing_balance||0},
        closing_denomination=${JSON.stringify(closing_denomination||{})},
        total_sales=${stats.rows[0]?.total||0},
        total_transactions=${stats.rows[0]?.cnt||0}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Cross-counter Daily Summary ───────────────────────────────────────────────
router.get("/sessions/daily-summary", requireAuth, async (req: any, res) => {
  try {
    const date = String(req.query.date || new Date().toISOString().split("T")[0]);
    const t = req.session?.tenantId;

    // Per-counter aggregates
    const counterRows = await db.execute(sql`
      SELECT
        s.counter_name,
        COUNT(DISTINCT s.id)                                    AS session_count,
        COUNT(txn.id)                                           AS txn_count,
        COALESCE(SUM(txn.total_amount), 0)                      AS gross_sales,
        COALESCE(SUM(txn.discount_amount), 0)                   AS total_discount,
        COALESCE(SUM(txn.tax_amount), 0)                        AS total_tax,
        COALESCE(SUM(txn.total_amount - COALESCE(txn.tax_amount,0)), 0) AS net_sales
      FROM pos_sessions s
      LEFT JOIN pos_transactions txn
        ON txn.session_id = s.id::text AND txn.tenant_id = ${t}
      WHERE s.tenant_id = ${t}
        AND DATE(s.opened_at) = ${date}::date
      GROUP BY s.counter_name
      ORDER BY s.counter_name`);

    // Payment-mode breakdown across all counters for the day
    const modeRows = await db.execute(sql`
      SELECT
        txn.payment_mode,
        COUNT(*) AS txn_count,
        COALESCE(SUM(txn.total_amount), 0) AS total
      FROM pos_sessions s
      JOIN pos_transactions txn
        ON txn.session_id = s.id::text AND txn.tenant_id = ${t}
      WHERE s.tenant_id = ${t}
        AND DATE(s.opened_at) = ${date}::date
      GROUP BY txn.payment_mode
      ORDER BY txn.payment_mode`);

    // Day-level totals
    const totals = (counterRows.rows as any[]).reduce(
      (acc, r) => ({
        session_count:  acc.session_count  + Number(r.session_count),
        txn_count:      acc.txn_count      + Number(r.txn_count),
        gross_sales:    acc.gross_sales    + Number(r.gross_sales),
        total_discount: acc.total_discount + Number(r.total_discount),
        total_tax:      acc.total_tax      + Number(r.total_tax),
        net_sales:      acc.net_sales      + Number(r.net_sales),
      }),
      { session_count: 0, txn_count: 0, gross_sales: 0, total_discount: 0, total_tax: 0, net_sales: 0 }
    );

    res.json({ date, counters: counterRows.rows, paymentBreakdown: modeRows.rows, totals });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Z-Report (EOD session summary) ───────────────────────────────────────────
router.get("/sessions/:id/z-report", requireAuth, async (req: any, res) => {
  try {
    const sessionRows = await db.execute(sql`
      SELECT * FROM pos_sessions WHERE id=${req.params.id} AND tenant_id=${tid(req)} LIMIT 1`);
    const session: any = sessionRows.rows[0];
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Payment breakdown by mode
    const breakdown = await db.execute(sql`
      SELECT payment_mode, SUM(total_amount) AS total, COUNT(*) AS txn_count
      FROM pos_transactions
      WHERE session_id=${req.params.id}
      GROUP BY payment_mode ORDER BY payment_mode`);

    // Cash sales specifically (for reconciliation)
    const cashRow = breakdown.rows.find((r: any) => r.payment_mode === 'cash');
    const cashSales = Number(cashRow?.total || 0);

    // For split payments — sum cash component from payment_splits JSONB
    const splitCashRow = await db.execute(sql`
      SELECT COALESCE(SUM((split_item->>'amount')::numeric),0) AS split_cash
      FROM pos_transactions,
        jsonb_array_elements(CASE WHEN payment_splits IS NOT NULL AND payment_splits::text <> '[]'
          THEN payment_splits ELSE '[]'::jsonb END) AS split_item
      WHERE session_id=${req.params.id}
        AND (split_item->>'mode') = 'cash'
        AND payment_mode <> 'cash'`);
    const splitCash = Number((splitCashRow.rows[0] as any)?.split_cash || 0);

    const totalCashSales = cashSales + splitCash;
    const openingFloat   = Number(session.opening_balance || 0);
    const expectedCash   = openingFloat + totalCashSales;
    const physicalCash   = Number(session.closing_balance || 0);
    const variance       = physicalCash - expectedCash;

    res.json({
      session,
      paymentBreakdown: breakdown.rows,
      cashReconciliation: {
        openingFloat,
        cashSales: totalCashSales,
        expectedCash,
        physicalCash,
        variance,
      },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POS Transactions ──────────────────────────────────────────────────────────
router.get("/transactions", requireAuth, async (req: any, res) => {
  try {
    const { session_id } = req.query;
    const rows = await db.execute(
      session_id
        ? sql`SELECT t.*, c.name as customer_name_ref FROM pos_transactions t LEFT JOIN pos_customers c ON c.id=t.customer_id WHERE t.tenant_id=${tid(req)} AND t.session_id=${String(session_id)} ORDER BY t.created_at DESC`
        : sql`SELECT t.*, c.name as customer_name_ref FROM pos_transactions t LEFT JOIN pos_customers c ON c.id=t.customer_id WHERE t.tenant_id=${tid(req)} ORDER BY t.created_at DESC LIMIT 200`
    );
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/transactions/:id/items", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM pos_transaction_items WHERE transaction_id=${req.params.id}`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/transactions", requireAuth, async (req: any, res) => {
  try {
    const { session_id, customer_id, customer_name, customer_phone, items, payment_mode, payment_splits, amount_paid, promotion_id, discount_amount: manualDiscount, loyalty_points_redeemed: loyaltyPtsRedeemed, loyalty_discount: loyaltyDisc, razorpay_payment_id, terminal_id: txnTerminalId, card_ref } = req.body;
    
    // MRP Lock — validate selling price does not exceed MRP for any item
    const mrpViolations: string[] = [];
    for (const item of items) {
      if (item.mrp && item.unit_price > item.mrp) {
        mrpViolations.push(`${item.product_name}: selling price ₹${item.unit_price} exceeds MRP ₹${item.mrp}`);
      }
    }
    if (mrpViolations.length > 0) {
      return res.status(422).json({ 
        error: "MRP_VIOLATION", 
        message: "Selling price cannot exceed MRP", 
        violations: mrpViolations 
      });
    }

    const no = "POS-" + Date.now();
    let subtotal = 0, tax_amount = 0, discount_amount = 0;
    for (const item of items) {
      const lineTotal = item.quantity * item.unit_price * (1 - (item.discount_pct||0)/100);
      subtotal += lineTotal;
      tax_amount += lineTotal * (item.tax_rate||0)/100;
      discount_amount += item.quantity * item.unit_price * (item.discount_pct||0)/100;
    }
    discount_amount += (manualDiscount||0);
    const total = Math.max(0, subtotal + tax_amount - (manualDiscount||0) - (loyaltyDisc||0));
    const change = (amount_paid||total) - total;
    const pts = Math.floor(total / 100);

    const txn = await db.execute(sql`
      INSERT INTO pos_transactions (tenant_id, session_id, transaction_no, customer_id, customer_name, customer_phone, subtotal, tax_amount, discount_amount, total_amount, payment_mode, payment_splits, amount_paid, change_given, promotion_id, loyalty_points_earned, loyalty_points_redeemed, loyalty_discount, razorpay_payment_id, terminal_id, card_ref)
      VALUES (${tid(req)}, ${session_id||null}, ${no}, ${customer_id||null},
              ${customer_name||null}, ${customer_phone||null}, ${subtotal}, ${tax_amount},
              ${discount_amount}, ${total}, ${payment_mode||'cash'}, ${JSON.stringify(payment_splits||[])}, ${amount_paid||total},
              ${Math.max(0, change)}, ${promotion_id||null}, ${pts},
              ${loyaltyPtsRedeemed||0}, ${loyaltyDisc||0},
              ${razorpay_payment_id||null}, ${txnTerminalId||null}, ${card_ref||null})
      RETURNING *`);

    const txnId = txn.rows[0].id;
    for (const item of items) {
      const lineTotal = item.quantity * item.unit_price * (1-(item.discount_pct||0)/100) * (1+(item.tax_rate||0)/100);
      await db.execute(sql`
        INSERT INTO pos_transaction_items (transaction_id, product_id, product_name, sku, quantity, unit_price, discount_pct, tax_rate, total)
        VALUES (${txnId}, ${item.product_id||null}, ${item.product_name}, ${item.sku||null},
                ${item.quantity}, ${item.unit_price}, ${item.discount_pct||0}, ${item.tax_rate||0}, ${lineTotal})`);
    }

    if (session_id) {
      await db.execute(sql`UPDATE pos_sessions SET total_sales=total_sales+${total}, total_transactions=total_transactions+1 WHERE id=${session_id}`);
    }
    if (customer_id) {
      const netPts = pts - (loyaltyPtsRedeemed || 0);
      await db.execute(sql`UPDATE pos_customers SET loyalty_points=GREATEST(0, loyalty_points+${netPts}), outstanding_balance=outstanding_balance-${total} WHERE id=${customer_id}`);
    }
    res.json(txn.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Parked Bills (Hold Cart) ────────────────────────────────────────────────────
router.get("/parked-bills", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM pos_parked_bills WHERE tenant_id=${tid(req)} ORDER BY parked_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/parked-bills", requireAuth, async (req: any, res) => {
  try {
    const { session_id, counter_name, cart_items, customer_id, customer_name, notes } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO pos_parked_bills (tenant_id, session_id, counter_name, cart_items, customer_id, customer_name, notes)
      VALUES (${tid(req)}, ${session_id||null}, ${counter_name||''}, ${JSON.stringify(cart_items||[])}, ${customer_id||null}, ${customer_name||null}, ${notes||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/parked-bills/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM pos_parked_bills WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POS Customers ─────────────────────────────────────────────────────────────
router.get("/customers", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM pos_customers WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/customers", requireAuth, async (req: any, res) => {
  try {
    const { name, phone, email, address, credit_limit, date_of_birth, anniversary_date } = req.body;
    const code = "CUST-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO pos_customers (tenant_id, customer_code, name, phone, email, address, credit_limit, date_of_birth, anniversary_date)
      VALUES (${tid(req)}, ${code}, ${name}, ${phone||null}, ${email||null}, ${address||null},
              ${credit_limit||0}, ${date_of_birth||null}, ${anniversary_date||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/customers/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, phone, email, address, credit_limit, date_of_birth, anniversary_date } = req.body;
    const rows = await db.execute(sql`
      UPDATE pos_customers SET name=${name}, phone=${phone||null}, email=${email||null},
        address=${address||null}, credit_limit=${credit_limit||0},
        date_of_birth=${date_of_birth||null}, anniversary_date=${anniversary_date||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/customers/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE pos_customers SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Returns ───────────────────────────────────────────────────────────────────
router.get("/returns", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT r.*, c.name as customer_name_ref
      FROM pos_returns r LEFT JOIN pos_customers c ON c.id=r.customer_id
      WHERE r.tenant_id=${tid(req)} AND r.record_status=1 ORDER BY r.return_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/returns/:id/items", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM pos_return_items WHERE return_id=${req.params.id}`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/returns", requireAuth, async (req: any, res) => {
  try {
    const { original_transaction_id, customer_id, return_date, return_amount, reason, refund_mode, processed_by, notes, items } = req.body;
    const no = "RET-" + Date.now();
    const ret = await db.execute(sql`
      INSERT INTO pos_returns (tenant_id, return_number, original_transaction_id, customer_id, return_date, return_amount, reason, refund_mode, processed_by, notes)
      VALUES (${tid(req)}, ${no}, ${original_transaction_id||null}, ${customer_id||null},
              ${return_date}, ${return_amount||0}, ${reason||null}, ${refund_mode||'cash'},
              ${processed_by||null}, ${notes||null}) RETURNING *`);
    const rId = ret.rows[0].id;
    if (items?.length) {
      for (const it of items) {
        await db.execute(sql`
          INSERT INTO pos_return_items (return_id, product_id, product_name, quantity, unit_price, amount)
          VALUES (${rId}, ${it.product_id||null}, ${it.product_name||null}, ${it.quantity||1}, ${it.unit_price||0}, ${it.amount||0})`);
      }
    }
    res.json(ret.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/returns/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE pos_returns SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Promotions ────────────────────────────────────────────────────────────────
router.get("/promotions", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM pos_promotions WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/promotions", requireAuth, async (req: any, res) => {
  try {
    const { promo_code, name, promo_type, discount_value, min_purchase_amount, max_discount_amount, start_date, end_date, usage_limit, is_active } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO pos_promotions (tenant_id, promo_code, name, promo_type, discount_value, min_purchase_amount, max_discount_amount, start_date, end_date, usage_limit, is_active)
      VALUES (${tid(req)}, ${promo_code||null}, ${name}, ${promo_type||'percentage'},
              ${discount_value||0}, ${min_purchase_amount||0}, ${max_discount_amount||null},
              ${start_date||null}, ${end_date||null}, ${usage_limit||null}, ${is_active!==false})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/promotions/:id", requireAuth, async (req: any, res) => {
  try {
    const { promo_code, name, promo_type, discount_value, min_purchase_amount, max_discount_amount, start_date, end_date, usage_limit, is_active } = req.body;
    const rows = await db.execute(sql`
      UPDATE pos_promotions SET promo_code=${promo_code||null}, name=${name},
        promo_type=${promo_type||'percentage'}, discount_value=${discount_value||0},
        min_purchase_amount=${min_purchase_amount||0}, max_discount_amount=${max_discount_amount||null},
        start_date=${start_date||null}, end_date=${end_date||null},
        usage_limit=${usage_limit||null}, is_active=${is_active!==false}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/promotions/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE pos_promotions SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── UPI QR Payments ───────────────────────────────────────────────────────────
async function getRazorpayAuth(): Promise<string | null> {
  // Try DB platform settings first, fall back to env vars
  try {
    const rows = await db.execute(sql`SELECT key, value FROM platform_settings WHERE key IN ('razorpay_key_id','razorpay_key_secret')`);
    const map: Record<string, string> = {};
    for (const r of rows.rows as any[]) map[r.key] = r.value;
    const keyId = map['razorpay_key_id'] || process.env.RAZORPAY_KEY_ID;
    const keySecret = map['razorpay_key_secret'] || process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    return Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  } catch {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    return Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  }
}

// POST /api/pos/payments/create-qr — Create Razorpay QR for the bill amount
router.post("/payments/create-qr", requireAuth, async (req: any, res) => {
  try {
    const { amount, session_id, description } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: "Invalid amount" });

    const auth = await getRazorpayAuth();
    if (!auth) return res.status(503).json({ error: "Razorpay not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." });

    const amountPaise = Math.round(Number(amount) * 100);
    const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5 min

    const rzpRes = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
      method: "POST",
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "upi_qr",
        name: "SwachERP POS",
        description: description || "Bill Payment",
        usage: "single_use",
        fixed_amount: true,
        payment_amount: amountPaise,
        close_by: expiresAt,
      }),
    });

    if (!rzpRes.ok) {
      const err = await rzpRes.json() as any;
      return res.status(502).json({ error: err?.error?.description || "Razorpay QR creation failed" });
    }

    const qrData = await rzpRes.json() as any;

    // Store pending payment record
    await db.execute(sql`
      INSERT INTO pos_upi_payments (tenant_id, session_id, qr_id, amount, amount_paise, status, expires_at)
      VALUES (${tid(req)}, ${session_id || null}, ${qrData.id}, ${amount}, ${amountPaise}, 'pending',
              TO_TIMESTAMP(${expiresAt}))`);

    res.json({
      qr_id: qrData.id,
      image_url: qrData.image_url,
      amount,
      amount_paise: amountPaise,
      expires_at: expiresAt,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/pos/payments/:qrId/status — Poll QR payment status
router.get("/payments/:qrId/status", requireAuth, async (req: any, res) => {
  try {
    // Check our DB record first
    const local = await db.execute(sql`
      SELECT * FROM pos_upi_payments WHERE qr_id=${req.params.qrId} AND tenant_id=${tid(req)} LIMIT 1`);
    const record = local.rows[0] as any;
    if (!record) return res.status(404).json({ error: "QR not found" });

    if (record.status === 'paid') {
      return res.json({ status: 'paid', razorpay_payment_id: record.razorpay_payment_id, customer_vpa: record.customer_vpa });
    }

    // Check expiry
    if (record.expires_at && new Date(record.expires_at) < new Date()) {
      await db.execute(sql`UPDATE pos_upi_payments SET status='expired' WHERE qr_id=${req.params.qrId}`);
      return res.json({ status: 'expired' });
    }

    // Poll Razorpay for payment status
    const auth = await getRazorpayAuth();
    if (!auth) return res.json({ status: record.status });

    const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/qr_codes/${req.params.qrId}`, {
      headers: { "Authorization": `Basic ${auth}` },
    });
    if (!rzpRes.ok) return res.json({ status: record.status });

    const qrData = await rzpRes.json() as any;

    if (qrData.payments_count_received > 0 && qrData.status === 'paid') {
      // Fetch latest payment for this QR
      const paymentsRes = await fetch(`https://api.razorpay.com/v1/payments/qr_codes/${req.params.qrId}/payments`, {
        headers: { "Authorization": `Basic ${auth}` },
      });
      let paymentId = null, customerVpa = null;
      if (paymentsRes.ok) {
        const pd = await paymentsRes.json() as any;
        const p = pd?.items?.[0];
        paymentId = p?.id || null;
        customerVpa = p?.vpa || null;
      }

      await db.execute(sql`
        UPDATE pos_upi_payments
        SET status='paid', razorpay_payment_id=${paymentId}, customer_vpa=${customerVpa}, paid_at=NOW()
        WHERE qr_id=${req.params.qrId}`);

      return res.json({ status: 'paid', razorpay_payment_id: paymentId, customer_vpa: customerVpa });
    }

    res.json({ status: 'pending' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/pos/payments/webhook — Razorpay fires this on qr_code.credited
router.post("/payments/webhook", async (req: any, res) => {
  try {
    // Verify Razorpay webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-razorpay-signature'];
      const body = JSON.stringify(req.body);
      const expected = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
      if (signature !== expected) return res.status(400).json({ error: "Invalid signature" });
    }

    const event = req.body?.event;
    if (event === 'qr_code.credited') {
      const payment = req.body?.payload?.payment?.entity;
      const qrId = payment?.qr_code?.id || req.body?.payload?.qr_code?.entity?.id;
      if (qrId) {
        await db.execute(sql`
          UPDATE pos_upi_payments
          SET status='paid', razorpay_payment_id=${payment?.id || null},
              customer_vpa=${payment?.vpa || null}, paid_at=NOW()
          WHERE qr_id=${qrId} AND status='pending'`);
      }
    }
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Hardware Terminals ────────────────────────────────────────────────────────
router.get("/terminals", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM pos_terminals WHERE tenant_id=${tid(req)} ORDER BY counter_name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/terminals/by-counter/:counter", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM pos_terminals WHERE tenant_id=${tid(req)} AND counter_name=${req.params.counter} AND is_active=true ORDER BY created_at DESC LIMIT 1`);
    res.json(rows.rows[0] || {});
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/terminals", requireAuth, async (req: any, res) => {
  try {
    const { counter_name, terminal_name, terminal_type, terminal_id, ip_address, port, api_key, merchant_id, description } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO pos_terminals (tenant_id, counter_name, terminal_name, terminal_type, terminal_id, ip_address, port, api_key, merchant_id, description)
      VALUES (${tid(req)}, ${counter_name}, ${terminal_name||null}, ${terminal_type||'manual'},
              ${terminal_id||null}, ${ip_address||null}, ${port||80}, ${api_key||null},
              ${merchant_id||null}, ${description||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/terminals/:id", requireAuth, async (req: any, res) => {
  try {
    const { counter_name, terminal_name, terminal_type, terminal_id, ip_address, port, api_key, merchant_id, description, is_active } = req.body;
    const rows = await db.execute(sql`
      UPDATE pos_terminals SET
        counter_name=${counter_name}, terminal_name=${terminal_name||null}, terminal_type=${terminal_type||'manual'},
        terminal_id=${terminal_id||null}, ip_address=${ip_address||null}, port=${port||80},
        api_key=${api_key||null}, merchant_id=${merchant_id||null}, description=${description||null},
        is_active=${is_active !== false}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/terminals/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM pos_terminals WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Card Terminal Payments ────────────────────────────────────────────────────
router.post("/payments/initiate-card", requireAuth, async (req: any, res) => {
  try {
    const { amount, session_id, terminal_id } = req.body;
    const tRows = await db.execute(sql`SELECT * FROM pos_terminals WHERE id=${terminal_id} AND tenant_id=${tid(req)}`);
    const terminal = tRows.rows[0] as any;
    if (!terminal) return res.status(404).json({ error: "Terminal not found" });

    const amountPaise = Math.round(Number(amount) * 100);
    const chargeId = terminal.terminal_type.toUpperCase().slice(0, 4) + "-" + Date.now();

    if (terminal.terminal_type === "razorpay_pos") {
      const auth = await getRazorpayAuth();
      if (!auth) return res.status(503).json({ error: "Razorpay keys not configured" });
      // Store pending record; real terminal push requires Razorpay POS SDK on hardware
      await db.execute(sql`
        INSERT INTO pos_upi_payments (tenant_id, session_id, qr_id, amount, amount_paise, status, expires_at)
        VALUES (${tid(req)}, ${session_id||null}, ${chargeId}, ${amount}, ${amountPaise}, 'pending', NOW()+INTERVAL '10 minutes')`);
      return res.json({ charge_id: chargeId, type: "razorpay_pos", terminal_name: terminal.terminal_name });
    }

    if (terminal.terminal_type === "pine_labs") {
      try {
        const resp = await fetch(`http://${terminal.ip_address}:${terminal.port||8080}/api/pay`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Header: { ApplicationId: terminal.merchant_id||"1", UserId: "1", MethodId: "1001", VersionNo: "1.0" },
            Detail: { TransactionType: "4001", BillingRefNo: chargeId, PaymentAmount: String(amountPaise) }
          }),
          signal: AbortSignal.timeout(60000),
        });
        const data = await resp.json() as any;
        const paid = data?.Response?.ResponseCode === "00";
        const cardRef = data?.Response?.RRN || data?.Response?.ApprovalCode || null;
        await db.execute(sql`
          INSERT INTO pos_upi_payments (tenant_id, session_id, qr_id, amount, amount_paise, status, razorpay_payment_id, expires_at)
          VALUES (${tid(req)}, ${session_id||null}, ${chargeId}, ${amount}, ${amountPaise}, ${paid?"paid":"failed"}, ${cardRef||null}, NOW()+INTERVAL '5 minutes')`);
        return res.json({ charge_id: chargeId, status: paid ? "paid" : "failed", card_ref: cardRef, type: "pine_labs" });
      } catch (e: any) {
        return res.status(503).json({ error: `Pine Labs terminal unreachable at ${terminal.ip_address}:${terminal.port}. ${e.message}` });
      }
    }

    if (terminal.terminal_type === "ingenico") {
      try {
        const resp = await fetch(`http://${terminal.ip_address}:${terminal.port||8080}/sale`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountPaise, currency: "356", reference: chargeId }),
          signal: AbortSignal.timeout(60000),
        });
        const data = await resp.json() as any;
        const paid = data?.responseCode === "00";
        const cardRef = data?.rrn || data?.approvalCode || null;
        await db.execute(sql`
          INSERT INTO pos_upi_payments (tenant_id, session_id, qr_id, amount, amount_paise, status, razorpay_payment_id, expires_at)
          VALUES (${tid(req)}, ${session_id||null}, ${chargeId}, ${amount}, ${amountPaise}, ${paid?"paid":"failed"}, ${cardRef||null}, NOW()+INTERVAL '5 minutes')`);
        return res.json({ charge_id: chargeId, status: paid ? "paid" : "failed", card_ref: cardRef, type: "ingenico" });
      } catch (e: any) {
        return res.status(503).json({ error: `Ingenico terminal unreachable. ${e.message}` });
      }
    }

    if (terminal.terminal_type === "generic_http") {
      try {
        const resp = await fetch(`http://${terminal.ip_address}:${terminal.port||80}/payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(terminal.api_key ? { Authorization: `Bearer ${terminal.api_key}` } : {}) },
          body: JSON.stringify({ amount: amountPaise, reference: chargeId }),
          signal: AbortSignal.timeout(60000),
        });
        const data = await resp.json() as any;
        const paid = data?.status === "success" || data?.responseCode === "00";
        const cardRef = data?.reference || data?.rrn || null;
        return res.json({ charge_id: chargeId, status: paid ? "paid" : "failed", card_ref: cardRef, type: "generic_http" });
      } catch (e: any) {
        return res.status(503).json({ error: `Terminal unreachable. ${e.message}` });
      }
    }

    // manual — no hardware, frontend handles confirmation
    return res.json({ charge_id: null, type: "manual" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/payments/card-status/:chargeId", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT status, razorpay_payment_id as card_ref FROM pos_upi_payments
      WHERE qr_id=${req.params.chargeId} AND tenant_id=${tid(req)} LIMIT 1`);
    const rec = rows.rows[0] as any;
    res.json(rec ? { status: rec.status, card_ref: rec.card_ref } : { status: "pending" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Barcode / SKU lookup ──────────────────────────────────────────────────────
router.get("/products/barcode/:code", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT * FROM products
      WHERE tenant_id=${tid(req)} AND (barcode=${req.params.code} OR sku=${req.params.code}) AND record_status=1
      LIMIT 1`);
    if (!rows.rows.length) return res.status(404).json({ error: "Product not found" });
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Transaction lookup by txn-no (for returns) ────────────────────────────────
router.get("/transactions/:txnNo", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT * FROM pos_transactions
      WHERE tenant_id=${tid(req)} AND (transaction_no=${req.params.txnNo} OR id::text=${req.params.txnNo})
      LIMIT 1`);
    if (!rows.rows.length) return res.status(404).json({ error: "Transaction not found" });
    const txn = rows.rows[0] as any;
    const items = await db.execute(sql`SELECT * FROM pos_transaction_items WHERE transaction_id=${txn.id}`);
    res.json({ ...txn, items: items.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Cashier / Per-Session Report ──────────────────────────────────────────────
router.get("/reports/cashier", requireAuth, async (req: any, res) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const [byCashier, hourly] = await Promise.all([
      db.execute(sql`
        SELECT s.counter_name, s.shift_name, s.shift_type, u.username as cashier,
               COUNT(t.id) as txn_count,
               COALESCE(SUM(t.total_amount),0) as total_sales,
               COALESCE(SUM(t.discount_amount),0) as total_discounts,
               COALESCE(SUM(t.tax_amount),0) as total_tax,
               s.opening_balance, s.id as session_id,
               s.opened_at
        FROM pos_sessions s
        LEFT JOIN pos_transactions t ON t.session_id = s.id
        LEFT JOIN users u ON u.id::text = s.user_id
        WHERE s.tenant_id=${tid(req)}
          AND DATE(s.opened_at AT TIME ZONE 'Asia/Kolkata')=${date}
        GROUP BY s.id, s.counter_name, s.shift_name, s.shift_type, u.username, s.opening_balance, s.opened_at
        ORDER BY s.opened_at`),
      db.execute(sql`
        SELECT EXTRACT(HOUR FROM t.created_at AT TIME ZONE 'Asia/Kolkata')::int as hour,
               COUNT(*) as txn_count, COALESCE(SUM(t.total_amount),0) as amount,
               COALESCE(AVG(t.total_amount),0) as avg_ticket
        FROM pos_transactions t
        WHERE t.tenant_id=${tid(req)}
          AND DATE(t.created_at AT TIME ZONE 'Asia/Kolkata')=${date}
        GROUP BY hour ORDER BY hour`),
    ]);
    res.json({ date, byCashier: byCashier.rows, hourly: hourly.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── EOD Z-Report ──────────────────────────────────────────────────────────────
router.get("/reports/eod", requireAuth, async (req: any, res) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const [summary, byMode, topItems, hourly, sessions] = await Promise.all([
      db.execute(sql`
        SELECT COALESCE(SUM(total_amount),0) as total_sales, COUNT(*) as total_txns,
               COALESCE(SUM(discount_amount),0) as total_discounts,
               COALESCE(SUM(tax_amount),0) as total_tax,
               COALESCE(SUM(loyalty_discount),0) as total_loyalty_discount
        FROM pos_transactions WHERE tenant_id=${tid(req)} AND DATE(created_at AT TIME ZONE 'Asia/Kolkata')=${date}`),
      db.execute(sql`
        SELECT payment_mode, COUNT(*) as txn_count, COALESCE(SUM(total_amount),0) as amount
        FROM pos_transactions WHERE tenant_id=${tid(req)} AND DATE(created_at AT TIME ZONE 'Asia/Kolkata')=${date}
        GROUP BY payment_mode ORDER BY amount DESC`),
      db.execute(sql`
        SELECT pti.product_name, COALESCE(SUM(pti.quantity),0) as qty, COALESCE(SUM(pti.total),0) as amount
        FROM pos_transaction_items pti JOIN pos_transactions pt ON pt.id=pti.transaction_id
        WHERE pt.tenant_id=${tid(req)} AND DATE(pt.created_at AT TIME ZONE 'Asia/Kolkata')=${date}
        GROUP BY pti.product_name ORDER BY amount DESC LIMIT 10`),
      db.execute(sql`
        SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Kolkata')::int as hour,
               COUNT(*) as txn_count, COALESCE(SUM(total_amount),0) as amount
        FROM pos_transactions WHERE tenant_id=${tid(req)} AND DATE(created_at AT TIME ZONE 'Asia/Kolkata')=${date}
        GROUP BY hour ORDER BY hour`),
      db.execute(sql`
        SELECT counter_name, opening_balance, closing_balance, total_sales, total_transactions, status
        FROM pos_sessions WHERE tenant_id=${tid(req)} AND DATE(opened_at AT TIME ZONE 'Asia/Kolkata')=${date}`),
    ]);
    res.json({ date, summary: summary.rows[0], byMode: byMode.rows, topItems: topItems.rows, hourly: hourly.rows, sessions: sessions.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Stats ────────────────────────────────────────────────────────────────────
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const [today, month, sessions, customers] = await Promise.all([
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as total, COUNT(*) as cnt FROM pos_transactions WHERE tenant_id=${tid(req)} AND DATE(created_at)=CURRENT_DATE`),
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as total FROM pos_transactions WHERE tenant_id=${tid(req)} AND EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM CURRENT_DATE)`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM pos_sessions WHERE tenant_id=${tid(req)} AND status='open'`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM pos_customers WHERE tenant_id=${tid(req)} AND record_status=1`),
    ]);
    res.json({
      todaySales: Number(today.rows[0]?.total||0),
      todayTransactions: Number(today.rows[0]?.cnt||0),
      monthlySales: Number(month.rows[0]?.total||0),
      openSessions: Number(sessions.rows[0]?.cnt||0),
      totalCustomers: Number(customers.rows[0]?.cnt||0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Phase 7N: Franchise ───────────────────────────────────────────────────────
router.get("/franchises", async (_req: any, res) => { res.json([]); });
router.post("/franchises", async (req: any, res) => { res.json({ id: Date.now(), compliance_score: 85, actual_sales: 0, ...req.body }); });

// ── Phase 7N: B2B Portal ──────────────────────────────────────────────────────
router.get("/b2b-orders", async (_req: any, res) => { res.json([]); });
router.post("/b2b-orders", async (req: any, res) => { res.json({ id: Date.now(), status: "Processing", ...req.body }); });

export default router;
