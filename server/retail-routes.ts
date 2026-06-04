import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

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
    const rows = await db.execute(sql`
      SELECT DISTINCT counter_name FROM pos_sessions
      WHERE tenant_id=${tid(req)} AND counter_name IS NOT NULL
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
    const { counter_name, opening_balance, opening_upi_float, approved_by, shift_type } = req.body;
    const userId = String(req.user?.id || "");
    const rows = await db.execute(sql`
      INSERT INTO pos_sessions (tenant_id, user_id, counter_name, opening_balance, opening_upi_float, approved_by, shift_type)
      VALUES (${tid(req)}, ${userId}, ${counter_name||'Counter 1'}, ${opening_balance||0},
              ${opening_upi_float||0}, ${approved_by||null}, ${shift_type||'new'})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/sessions/:id/close", requireAuth, async (req: any, res) => {
  try {
    const { closing_balance } = req.body;
    const stats = await db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as total, COUNT(*) as cnt FROM pos_transactions WHERE session_id=${req.params.id}`);
    const rows = await db.execute(sql`
      UPDATE pos_sessions SET status='closed', closed_at=NOW(),
        closing_balance=${closing_balance||0},
        total_sales=${stats.rows[0]?.total||0},
        total_transactions=${stats.rows[0]?.cnt||0}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
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
    const { session_id, customer_id, customer_name, customer_phone, items, payment_mode, amount_paid, promotion_id, discount_amount: manualDiscount } = req.body;
    const no = "POS-" + Date.now();
    let subtotal = 0, tax_amount = 0, discount_amount = 0;
    for (const item of items) {
      const lineTotal = item.quantity * item.unit_price * (1 - (item.discount_pct||0)/100);
      subtotal += lineTotal;
      tax_amount += lineTotal * (item.tax_rate||0)/100;
      discount_amount += item.quantity * item.unit_price * (item.discount_pct||0)/100;
    }
    discount_amount += (manualDiscount||0);
    const total = subtotal + tax_amount - (manualDiscount||0);
    const change = (amount_paid||total) - total;
    const pts = Math.floor(total / 100);

    const txn = await db.execute(sql`
      INSERT INTO pos_transactions (tenant_id, session_id, transaction_no, customer_id, customer_name, customer_phone, subtotal, tax_amount, discount_amount, total_amount, payment_mode, amount_paid, change_given, promotion_id, loyalty_points_earned)
      VALUES (${tid(req)}, ${session_id||null}, ${no}, ${customer_id||null},
              ${customer_name||null}, ${customer_phone||null}, ${subtotal}, ${tax_amount},
              ${discount_amount}, ${total}, ${payment_mode||'cash'}, ${amount_paid||total},
              ${Math.max(0, change)}, ${promotion_id||null}, ${pts})
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
      await db.execute(sql`UPDATE pos_customers SET loyalty_points=loyalty_points+${pts}, outstanding_balance=outstanding_balance-${total} WHERE id=${customer_id}`);
    }
    res.json(txn.rows[0]);
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

export default router;
