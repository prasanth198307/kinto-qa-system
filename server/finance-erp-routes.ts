import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
};
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── CFO Dashboard ─────────────────────────────────────────────────────────────
router.get("/cfo-dashboard", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const [
      revenueData, expenseData,
      arData, apData,
      bankBalance,
      topCustomers, topVendors,
    ] = await Promise.all([
      // Revenue from invoices
      db.execute(sql`
        SELECT
          COALESCE(SUM(CASE WHEN DATE(invoice_date)>=DATE_TRUNC('month',CURRENT_DATE) THEN total_amount ELSE 0 END),0) as mtd,
          COALESCE(SUM(CASE WHEN DATE(invoice_date)>=DATE_TRUNC('year',CURRENT_DATE) THEN total_amount ELSE 0 END),0) as ytd,
          COALESCE(SUM(CASE WHEN DATE(invoice_date)>=DATE_TRUNC('month',CURRENT_DATE) AND status NOT IN ('cancelled','draft') THEN total_amount ELSE 0 END),0) as mtd_confirmed
        FROM invoices WHERE tenant_id=${t} AND record_status=1`),
      // Expenses from expense_vouchers
      db.execute(sql`
        SELECT
          COALESCE(SUM(CASE WHEN DATE(expense_date)>=DATE_TRUNC('month',CURRENT_DATE) THEN total_amount ELSE 0 END),0) as mtd,
          COALESCE(SUM(CASE WHEN DATE(expense_date)>=DATE_TRUNC('year',CURRENT_DATE) THEN total_amount ELSE 0 END),0) as ytd
        FROM expense_vouchers WHERE tenant_id=${t} AND record_status=1`),
      // AR: total outstanding from invoices
      db.execute(sql`
        SELECT
          COALESCE(SUM(balance_due),0) as total_ar,
          COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE THEN balance_due ELSE 0 END),0) as overdue_ar,
          COUNT(CASE WHEN due_date < CURRENT_DATE THEN 1 END) as overdue_count
        FROM invoices WHERE tenant_id=${t} AND record_status=1 AND balance_due > 0 AND status NOT IN ('cancelled','draft')`),
      // AP: total outstanding from expense vouchers
      db.execute(sql`
        SELECT
          COALESCE(SUM(CASE WHEN payment_status='pending' OR payment_status='partial' THEN total_amount ELSE 0 END),0) as total_ap,
          COALESCE(SUM(CASE WHEN (payment_status='pending' OR payment_status='partial') AND expense_date < CURRENT_DATE - INTERVAL '30 days' THEN total_amount ELSE 0 END),0) as overdue_ap
        FROM expense_vouchers WHERE tenant_id=${t} AND record_status=1`),
      // Cash & Bank balance from bank_transactions
      db.execute(sql`
        SELECT COALESCE(SUM(CASE WHEN transaction_type='credit' THEN amount ELSE -amount END),0) as balance
        FROM bank_transactions WHERE tenant_id=${t} AND record_status=1`),
      // Top 5 customers by AR outstanding
      db.execute(sql`
        SELECT customer_name, COALESCE(SUM(balance_due),0) as outstanding
        FROM invoices WHERE tenant_id=${t} AND record_status=1 AND balance_due>0 AND status NOT IN ('cancelled','draft')
        GROUP BY customer_name ORDER BY outstanding DESC LIMIT 5`),
      // Top 5 vendors by AP
      db.execute(sql`
        SELECT vendor_name, COALESCE(SUM(total_amount),0) as outstanding
        FROM expense_vouchers WHERE tenant_id=${t} AND record_status=1 AND (payment_status='pending' OR payment_status='partial')
        GROUP BY vendor_name ORDER BY outstanding DESC LIMIT 5`),
    ]);
    const rev = revenueData.rows[0] as any;
    const exp = expenseData.rows[0] as any;
    const ar = arData.rows[0] as any;
    const ap = apData.rows[0] as any;
    const bank = bankBalance.rows[0] as any;
    // DSO: AR / (Revenue/365)
    const ytdRevenue = Number(rev.ytd || 0);
    const totalAR = Number(ar.total_ar || 0);
    const dso = ytdRevenue > 0 ? Math.round((totalAR / (ytdRevenue / 365)) * 10) / 10 : 0;
    const totalAP = Number(ap.total_ap || 0);
    const ytdExpenses = Number(exp.ytd || 0);
    const dpo = ytdExpenses > 0 ? Math.round((totalAP / (ytdExpenses / 365)) * 10) / 10 : 0;
    res.json({
      revenue: { mtd: Number(rev.mtd || 0), ytd: ytdRevenue },
      expenses: { mtd: Number(exp.mtd || 0), ytd: ytdExpenses },
      netProfit: { mtd: Number(rev.mtd || 0) - Number(exp.mtd || 0), ytd: ytdRevenue - ytdExpenses },
      cashAndBank: Number(bank.balance || 0),
      ar: { total: totalAR, overdue: Number(ar.overdue_ar || 0), overdueCount: Number(ar.overdue_count || 0) },
      ap: { total: totalAP, overdue: Number(ap.overdue_ap || 0) },
      dso,
      dpo,
      topCustomers: topCustomers.rows,
      topVendors: topVendors.rows,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── AR Aging ──────────────────────────────────────────────────────────────────
router.get("/ar-aging", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        customer_name,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 0 AND 30 THEN balance_due ELSE 0 END),0) as bucket_0_30,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60 THEN balance_due ELSE 0 END),0) as bucket_31_60,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 61 AND 90 THEN balance_due ELSE 0 END),0) as bucket_61_90,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - due_date > 90 THEN balance_due ELSE 0 END),0) as bucket_90_plus,
        COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE THEN balance_due ELSE 0 END),0) as not_due,
        COALESCE(SUM(balance_due),0) as total_outstanding,
        COUNT(*) as invoice_count
      FROM invoices
      WHERE tenant_id=${tid(req)} AND record_status=1 AND balance_due > 0 AND status NOT IN ('cancelled','draft')
      GROUP BY customer_name ORDER BY total_outstanding DESC`);
    const totals = rows.rows.reduce((acc: any, r: any) => {
      acc.bucket_0_30 += Number(r.bucket_0_30 || 0);
      acc.bucket_31_60 += Number(r.bucket_31_60 || 0);
      acc.bucket_61_90 += Number(r.bucket_61_90 || 0);
      acc.bucket_90_plus += Number(r.bucket_90_plus || 0);
      acc.not_due += Number(r.not_due || 0);
      acc.total += Number(r.total_outstanding || 0);
      return acc;
    }, { bucket_0_30: 0, bucket_31_60: 0, bucket_61_90: 0, bucket_90_plus: 0, not_due: 0, total: 0 });
    res.json({ rows: rows.rows, totals });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Outstanding invoices for a customer
router.get("/ar-invoices", requireAuth, async (req: any, res) => {
  try {
    const { customer_name } = req.query as any;
    let q = sql`SELECT * FROM invoices WHERE tenant_id=${tid(req)} AND record_status=1 AND balance_due>0 AND status NOT IN ('cancelled','draft')`;
    if (customer_name) q = sql`${q} AND customer_name=${customer_name}`;
    const rows = await db.execute(sql`${q} ORDER BY due_date ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Record payment against invoice
router.post("/ar-payment/:invoice_id", requireAuth, async (req: any, res) => {
  try {
    const { amount, payment_date, payment_mode, reference } = req.body;
    const amt = Number(amount || 0);
    const invRows = await db.execute(sql`SELECT * FROM invoices WHERE id=${req.params.invoice_id} AND tenant_id=${tid(req)}`);
    const inv = invRows.rows[0] as any;
    if (!inv) return res.status(404).json({ error: "Invoice not found" });
    const newBalance = Math.max(0, Number(inv.balance_due) - amt);
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';
    await db.execute(sql`
      UPDATE invoices SET balance_due=${newBalance}, payment_status=${newStatus}, updated_at=NOW()
      WHERE id=${req.params.invoice_id} AND tenant_id=${tid(req)}`);
    res.json({ success: true, balance_due: newBalance, status: newStatus });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── AP Aging ──────────────────────────────────────────────────────────────────
router.get("/ap-aging", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        COALESCE(vendor_name, 'Unknown') as vendor_name,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - expense_date BETWEEN 0 AND 30 THEN total_amount ELSE 0 END),0) as bucket_0_30,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - expense_date BETWEEN 31 AND 60 THEN total_amount ELSE 0 END),0) as bucket_31_60,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - expense_date BETWEEN 61 AND 90 THEN total_amount ELSE 0 END),0) as bucket_61_90,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - expense_date > 90 THEN total_amount ELSE 0 END),0) as bucket_90_plus,
        COALESCE(SUM(total_amount),0) as total_outstanding,
        COUNT(*) as bill_count
      FROM expense_vouchers
      WHERE tenant_id=${tid(req)} AND record_status=1 AND (payment_status='pending' OR payment_status='partial')
      GROUP BY vendor_name ORDER BY total_outstanding DESC`);
    const totals = rows.rows.reduce((acc: any, r: any) => {
      acc.bucket_0_30 += Number(r.bucket_0_30 || 0);
      acc.bucket_31_60 += Number(r.bucket_31_60 || 0);
      acc.bucket_61_90 += Number(r.bucket_61_90 || 0);
      acc.bucket_90_plus += Number(r.bucket_90_plus || 0);
      acc.total += Number(r.total_outstanding || 0);
      return acc;
    }, { bucket_0_30: 0, bucket_31_60: 0, bucket_61_90: 0, bucket_90_plus: 0, total: 0 });
    res.json({ rows: rows.rows, totals });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/ap-bills", requireAuth, async (req: any, res) => {
  try {
    const { vendor_name } = req.query as any;
    let q = sql`SELECT * FROM expense_vouchers WHERE tenant_id=${tid(req)} AND record_status=1 AND (payment_status='pending' OR payment_status='partial')`;
    if (vendor_name) q = sql`${q} AND vendor_name=${vendor_name}`;
    const rows = await db.execute(sql`${q} ORDER BY expense_date ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── General Ledger ────────────────────────────────────────────────────────────
router.get("/gl-ledger", requireAuth, async (req: any, res) => {
  try {
    const { account_id, from_date, to_date } = req.query as any;
    const fd = from_date || new Date(new Date().getFullYear(), 3, 1).toISOString().slice(0, 10); // Apr 1
    const td = to_date || new Date().toISOString().slice(0, 10);
    // Get chart of accounts with balances from journal_entries
    const accounts = await db.execute(sql`
      SELECT ca.id, ca.code, ca.name, ca.account_type, ca.normal_balance,
        COALESCE(SUM(CASE WHEN jl.debit_amount > 0 THEN jl.debit_amount ELSE 0 END),0) as total_debits,
        COALESCE(SUM(CASE WHEN jl.credit_amount > 0 THEN jl.credit_amount ELSE 0 END),0) as total_credits
      FROM chart_of_accounts ca
      LEFT JOIN journal_lines jl ON jl.account_id=ca.id AND jl.tenant_id=${tid(req)}
      LEFT JOIN journal_entries je ON je.id=jl.journal_entry_id AND je.entry_date BETWEEN ${fd} AND ${td}
      WHERE ca.tenant_id=${tid(req)} AND ca.record_status=1
      ${account_id ? sql`AND ca.id=${account_id}` : sql``}
      GROUP BY ca.id, ca.code, ca.name, ca.account_type, ca.normal_balance
      ORDER BY ca.code`);
    res.json(accounts.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/gl-transactions/:account_id", requireAuth, async (req: any, res) => {
  try {
    const { from_date, to_date } = req.query as any;
    const fd = from_date || new Date(new Date().getFullYear(), 3, 1).toISOString().slice(0, 10);
    const td = to_date || new Date().toISOString().slice(0, 10);
    const rows = await db.execute(sql`
      SELECT jl.*, je.entry_date, je.reference_number, je.narration as je_narration, je.entry_type
      FROM journal_lines jl
      JOIN journal_entries je ON je.id=jl.journal_entry_id
      WHERE jl.account_id=${req.params.account_id} AND jl.tenant_id=${tid(req)}
        AND je.entry_date BETWEEN ${fd} AND ${td}
      ORDER BY je.entry_date DESC LIMIT 200`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Period Lock ───────────────────────────────────────────────────────────────
router.get("/period-lock", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM module_settings WHERE tenant_id=${tid(req)} AND module_key='finance_period_lock' LIMIT 1`);
    res.json(rows.rows[0] || { module_key: 'finance_period_lock', setting_value: null });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/period-lock", requireAuth, async (req: any, res) => {
  try {
    const { lock_date, financial_year } = req.body;
    const existing = await db.execute(sql`SELECT id FROM module_settings WHERE tenant_id=${tid(req)} AND module_key='finance_period_lock'`);
    if (existing.rows.length > 0) {
      await db.execute(sql`UPDATE module_settings SET setting_value=${JSON.stringify({ lock_date, financial_year })}, updated_at=NOW() WHERE tenant_id=${tid(req)} AND module_key='finance_period_lock'`);
    } else {
      await db.execute(sql`INSERT INTO module_settings (tenant_id, module_key, setting_value) VALUES (${tid(req)}, 'finance_period_lock', ${JSON.stringify({ lock_date, financial_year })})`);
    }
    res.json({ success: true, lock_date, financial_year });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Cash Flow summary ─────────────────────────────────────────────────────────
router.get("/cash-flow-summary", requireAuth, async (req: any, res) => {
  try {
    const { from_date, to_date } = req.query as any;
    const fd = from_date || new Date(new Date().getFullYear(), 3, 1).toISOString().slice(0, 10);
    const td = to_date || new Date().toISOString().slice(0, 10);
    const [inflow, outflow] = await Promise.all([
      db.execute(sql`
        SELECT payment_mode, COALESCE(SUM(CASE WHEN transaction_type='credit' THEN amount ELSE 0 END),0) as total
        FROM bank_transactions WHERE tenant_id=${tid(req)} AND record_status=1
          AND transaction_date BETWEEN ${fd} AND ${td}
        GROUP BY payment_mode ORDER BY total DESC`),
      db.execute(sql`
        SELECT payment_mode, COALESCE(SUM(CASE WHEN transaction_type='debit' THEN amount ELSE 0 END),0) as total
        FROM bank_transactions WHERE tenant_id=${tid(req)} AND record_status=1
          AND transaction_date BETWEEN ${fd} AND ${td}
        GROUP BY payment_mode ORDER BY total DESC`),
    ]);
    const totalIn = inflow.rows.reduce((s: number, r: any) => s + Number(r.total || 0), 0);
    const totalOut = outflow.rows.reduce((s: number, r: any) => s + Number(r.total || 0), 0);
    res.json({ inflow: inflow.rows, outflow: outflow.rows, totalInflow: totalIn, totalOutflow: totalOut, net: totalIn - totalOut });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
