import { Router } from "express";

import { sql } from "drizzle-orm";
import { db } from "./db";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── POS Sessions ─────────────────────────────────────────────────────────────
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

router.post("/sessions/open", requireAuth, async (req: any, res) => {
  try {
    const { counter_name, opening_balance } = req.body;
    const userId = String(req.user?.id || "");
    const rows = await db.execute(sql`
      INSERT INTO pos_sessions (tenant_id, user_id, counter_name, opening_balance)
      VALUES (${tid(req)}, ${userId}, ${counter_name || 'Counter 1'}, ${opening_balance || 0})
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
        closing_balance=${closing_balance || 0},
        total_sales=${stats.rows[0]?.total || 0},
        total_transactions=${stats.rows[0]?.cnt || 0}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POS Transactions ─────────────────────────────────────────────────────────
router.get("/transactions", requireAuth, async (req: any, res) => {
  try {
    const { session_id, date } = req.query;
    if (session_id) {
      const rows = await db.execute(sql`SELECT * FROM pos_transactions WHERE tenant_id=${tid(req)} AND session_id=${String(session_id)} ORDER BY created_at DESC`);
      return res.json(rows.rows);
    }
    const rows = await db.execute(sql`SELECT * FROM pos_transactions WHERE tenant_id=${tid(req)} ORDER BY created_at DESC LIMIT 100`);
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
    const { session_id, customer_name, customer_phone, items, payment_mode, amount_paid } = req.body;
    const no = "POS-" + Date.now();
    let subtotal = 0, tax_amount = 0, discount_amount = 0;
    for (const item of items) {
      const lineTotal = item.quantity * item.unit_price * (1 - (item.discount_pct || 0) / 100);
      subtotal += lineTotal;
      tax_amount += lineTotal * (item.tax_rate || 0) / 100;
      discount_amount += item.quantity * item.unit_price * (item.discount_pct || 0) / 100;
    }
    const total = subtotal + tax_amount;
    const change = (amount_paid || total) - total;

    const txn = await db.execute(sql`
      INSERT INTO pos_transactions (tenant_id, session_id, transaction_no, customer_name, customer_phone, subtotal, tax_amount, discount_amount, total_amount, payment_mode, amount_paid, change_given)
      VALUES (${tid(req)}, ${session_id || null}, ${no}, ${customer_name || null},
              ${customer_phone || null}, ${subtotal}, ${tax_amount}, ${discount_amount},
              ${total}, ${payment_mode || 'cash'}, ${amount_paid || total}, ${Math.max(0, change)})
      RETURNING *`);

    const txnId = txn.rows[0].id;
    for (const item of items) {
      const lineTotal = item.quantity * item.unit_price * (1 - (item.discount_pct || 0) / 100) * (1 + (item.tax_rate || 0) / 100);
      await db.execute(sql`
        INSERT INTO pos_transaction_items (transaction_id, product_id, product_name, sku, quantity, unit_price, discount_pct, tax_rate, total)
        VALUES (${txnId}, ${item.product_id || null}, ${item.product_name}, ${item.sku || null},
                ${item.quantity}, ${item.unit_price}, ${item.discount_pct || 0}, ${item.tax_rate || 0}, ${lineTotal})`);
    }

    if (session_id) {
      await db.execute(sql`
        UPDATE pos_sessions SET total_sales=total_sales+${total}, total_transactions=total_transactions+1
        WHERE id=${session_id}`);
    }
    res.json(txn.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Stats ────────────────────────────────────────────────────────────────────
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const [today, month, sessions] = await Promise.all([
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as total, COUNT(*) as cnt FROM pos_transactions WHERE tenant_id=${tid(req)} AND DATE(created_at)=CURRENT_DATE`),
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as total FROM pos_transactions WHERE tenant_id=${tid(req)} AND EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM CURRENT_DATE)`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM pos_sessions WHERE tenant_id=${tid(req)} AND status='open'`),
    ]);
    res.json({
      todaySales: Number(today.rows[0]?.total || 0),
      todayTransactions: Number(today.rows[0]?.cnt || 0),
      monthlySales: Number(month.rows[0]?.total || 0),
      openSessions: Number(sessions.rows[0]?.cnt || 0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
