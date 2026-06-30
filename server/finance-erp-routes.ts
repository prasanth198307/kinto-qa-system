import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
const router = Router();

function getTenantId(req: any): number {
  return req.session?.tenantId ?? req.user?.tenantId;
}

// Finance ERP dashboard summary — AR, AP, Cash, Revenue MTD
router.get("/summary", async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    // AR total (unpaid invoices)
    const arRes = await db.execute(sql`
      SELECT
        COALESCE(SUM(total_amount - COALESCE(paid_amount,0)),0) AS ar_total,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND status NOT IN ('paid','cancelled')
          THEN total_amount - COALESCE(paid_amount,0) ELSE 0 END), 0) AS ar_overdue,
        COUNT(CASE WHEN status NOT IN ('paid','cancelled') THEN 1 END) AS outstanding_invoices
      FROM invoices
      WHERE tenant_id = ${tenantId}
        AND type = 'invoice'
        AND status NOT IN ('cancelled')
    `);

    // Cash & Bank balance
    const cashRes = await db.execute(sql`
      SELECT COALESCE(SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END), 0) AS cash_balance
      FROM bank_transactions
      WHERE tenant_id = ${tenantId}
    `);

    // Revenue & Expense this month (from journal entries)
    const mtsRes = await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN ac.account_type='income' AND jl.debit_credit='C' THEN jl.amount ELSE 0 END),0) AS revenue_mtd,
        COALESCE(SUM(CASE WHEN ac.account_type='expense' AND jl.debit_credit='D' THEN jl.amount ELSE 0 END),0) AS expense_mtd
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.tenant_id = ${tenantId}
      JOIN chart_of_accounts ac ON ac.id = jl.account_id AND ac.tenant_id = ${tenantId}
      WHERE date_trunc('month', je.entry_date) = date_trunc('month', CURRENT_DATE)
    `);

    // AP — expense vouchers pending
    const apRes = await db.execute(sql`
      SELECT
        COALESCE(SUM(amount),0) AS ap_total,
        COUNT(*) AS pending_payments
      FROM expense_vouchers
      WHERE tenant_id = ${tenantId}
        AND status IN ('pending','approved')
    `);

    const ar = (arRes.rows?.[0] ?? {}) as any;
    const cash = (cashRes.rows?.[0] ?? {}) as any;
    const mts = (mtsRes.rows?.[0] ?? {}) as any;
    const ap = (apRes.rows?.[0] ?? {}) as any;

    res.json({
      ar_total: Number(ar.ar_total ?? 0),
      ar_overdue: Number(ar.ar_overdue ?? 0),
      outstanding_invoices: Number(ar.outstanding_invoices ?? 0),
      cash_balance: Number(cash.cash_balance ?? 0),
      revenue_mtd: Number(mts.revenue_mtd ?? 0),
      expense_mtd: Number(mts.expense_mtd ?? 0),
      ap_total: Number(ap.ap_total ?? 0),
      pending_payments: Number(ap.pending_payments ?? 0),
    });
  } catch (err) {
    console.error("finance-erp summary:", err);
    res.json({ ar_total: 0, ar_overdue: 0, cash_balance: 0, revenue_mtd: 0, expense_mtd: 0, ap_total: 0, outstanding_invoices: 0, pending_payments: 0 });
  }
});

export default router;
