import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import multer from "multer";
import { parse } from "csv-parse/sync";

const router = Router();

function tid(req: any): number { return req.session?.tenantId ?? req.user?.tenantId ?? 1; }
function auth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── CFO Dashboard ─────────────────────────────────────────────────────────────
router.get("/cfo-dashboard", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const now = new Date();
    const mtdStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const ytdStart = `${now.getFullYear()}-04-01`;

    const [rev, exp, cash, ar, ap, coa] = await Promise.all([
      db.execute(sql`SELECT
        COALESCE(SUM(CASE WHEN invoice_date >= ${mtdStart} THEN total_amount END),0) as mtd,
        COALESCE(SUM(CASE WHEN invoice_date >= ${ytdStart} THEN total_amount END),0) as ytd,
        COUNT(CASE WHEN invoice_date >= ${mtdStart} THEN 1 END) as mtd_count
        FROM invoices WHERE tenant_id=${t} AND record_status=1 AND invoice_status!='cancelled'`),
      db.execute(sql`SELECT
        COALESCE(SUM(CASE WHEN voucher_date >= ${mtdStart} THEN total_amount END),0) as mtd,
        COALESCE(SUM(CASE WHEN voucher_date >= ${ytdStart} THEN total_amount END),0) as ytd
        FROM expense_vouchers WHERE tenant_id=${t} AND record_status=1`),
      db.execute(sql`SELECT
        COALESCE(SUM(CASE WHEN payment_mode='cash' THEN amount END),0) as cash_bal,
        COALESCE(SUM(CASE WHEN payment_mode!='cash' THEN amount END),0) as bank_bal
        FROM bank_transactions WHERE tenant_id=${t}`),
      db.execute(sql`SELECT
        COALESCE(SUM(balance_due),0) as total,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE THEN balance_due END),0) as overdue,
        COALESCE(AVG(CURRENT_DATE - invoice_date),0) as dso
        FROM invoices WHERE tenant_id=${t} AND record_status=1 AND balance_due > 0`),
      db.execute(sql`SELECT
        COALESCE(SUM(total_amount - COALESCE(paid_amount,0)),0) as total,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE THEN total_amount - COALESCE(paid_amount,0) END),0) as overdue,
        COALESCE(AVG(CURRENT_DATE - voucher_date),0) as dpo
        FROM expense_vouchers WHERE tenant_id=${t} AND record_status=1 AND payment_status IN ('pending','partial')`),
      db.execute(sql`SELECT account_type, COALESCE(SUM(opening_balance),0) as total FROM chart_of_accounts WHERE tenant_id=${t} AND record_status=1 GROUP BY account_type`),
    ]);

    const coaMap: Record<string,number> = {};
    for (const r of (coa.rows as any[])) coaMap[r.account_type] = Number(r.total);

    const revenueR = rev.rows[0] as any;
    const expR = exp.rows[0] as any;
    const cashR = cash.rows[0] as any;
    const arR = ar.rows[0] as any;
    const apR = ap.rows[0] as any;

    const totalRevMtd = Number(revenueR.mtd);
    const totalExpMtd = Number(expR.mtd);

    // Top overdue customers
    const topCust = await db.execute(sql`SELECT customer_name, SUM(balance_due) as overdue_amount,
      MAX(CURRENT_DATE - due_date) as max_days_overdue, COUNT(*) as invoice_count
      FROM invoices WHERE tenant_id=${t} AND record_status=1 AND balance_due>0 AND due_date < CURRENT_DATE
      GROUP BY customer_name ORDER BY overdue_amount DESC LIMIT 5`);

    const topVend = await db.execute(sql`SELECT vendor_name, SUM(total_amount - COALESCE(paid_amount,0)) as overdue_amount,
      MAX(CURRENT_DATE - due_date) as max_days_overdue, COUNT(*) as bill_count
      FROM expense_vouchers WHERE tenant_id=${t} AND record_status=1 AND payment_status IN ('pending','partial') AND due_date < CURRENT_DATE
      GROUP BY vendor_name ORDER BY overdue_amount DESC LIMIT 5`);

    res.json({
      totalRevenueMtd: totalRevMtd,
      totalRevenueYtd: Number(revenueR.ytd),
      totalExpensesMtd: totalExpMtd,
      totalExpensesYtd: Number(expR.ytd),
      netProfitMtd: totalRevMtd - totalExpMtd,
      cashBalance: Number(cashR.cash_bal),
      bankBalance: Number(cashR.bank_bal),
      totalCashBank: Number(cashR.cash_bal) + Number(cashR.bank_bal),
      arTotal: Number(arR.total),
      arOverdue: Number(arR.overdue),
      dso: Math.round(Number(arR.dso)),
      apTotal: Number(apR.total),
      apOverdue: Number(apR.overdue),
      dpo: Math.round(Number(apR.dpo)),
      topOverdueCustomers: topCust.rows,
      topOverdueVendors: topVend.rows,
      invoiceCountMtd: Number(revenueR.mtd_count),
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Financial Ratios ──────────────────────────────────────────────────────────
router.get("/ratio-analysis", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const coa = await db.execute(sql`SELECT account_type, account_name, COALESCE(opening_balance,0) as bal FROM chart_of_accounts WHERE tenant_id=${t} AND record_status=1`);
    const rows = coa.rows as any[];
    const sum = (type: string) => rows.filter(r => r.account_type === type).reduce((s, r) => s + Number(r.bal), 0);
    const currentAssets = sum('current_asset');
    const currentLiabilities = sum('current_liability');
    const inventory = rows.filter(r => r.account_name?.toLowerCase().includes('inventory') || r.account_name?.toLowerCase().includes('stock')).reduce((s, r) => s + Number(r.bal), 0);
    const totalAssets = sum('current_asset') + sum('fixed_asset');
    const totalLiabilities = sum('current_liability') + sum('long_term_liability');
    const equity = sum('equity') || (totalAssets - totalLiabilities);
    const grossProfit = sum('income') - sum('cogs');
    const revenue = sum('income');

    res.json({
      currentRatio: currentLiabilities > 0 ? (currentAssets / currentLiabilities).toFixed(2) : null,
      quickRatio: currentLiabilities > 0 ? ((currentAssets - inventory) / currentLiabilities).toFixed(2) : null,
      debtEquityRatio: equity > 0 ? (totalLiabilities / equity).toFixed(2) : null,
      returnOnAssets: totalAssets > 0 ? ((grossProfit / totalAssets) * 100).toFixed(2) : null,
      returnOnEquity: equity > 0 ? ((grossProfit / equity) * 100).toFixed(2) : null,
      grossMargin: revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(2) : null,
      currentAssets, currentLiabilities, inventory, totalAssets, totalLiabilities, equity,
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── AR Aging ─────────────────────────────────────────────────────────────────
router.get("/ar-aging", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`SELECT
      id, invoice_number, customer_name, customer_phone,
      invoice_date, due_date, total_amount, balance_due,
      payment_status,
      COALESCE(CURRENT_DATE - due_date, 0) as days_overdue
      FROM invoices WHERE tenant_id=${t} AND record_status=1 AND balance_due > 0
      ORDER BY days_overdue DESC`);

    const invoices = rows.rows as any[];
    const bucket = (inv: any) => {
      const d = Number(inv.days_overdue);
      if (d <= 0) return '0-30';
      if (d <= 30) return '0-30';
      if (d <= 60) return '31-60';
      if (d <= 90) return '61-90';
      return '90+';
    };

    const summary = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    const byCustomer: Record<string, any> = {};
    for (const inv of invoices) {
      const b = bucket(inv);
      summary[b] = (summary[b] || 0) + Number(inv.balance_due);
      if (!byCustomer[inv.customer_name]) byCustomer[inv.customer_name] = { customer_name: inv.customer_name, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 };
      byCustomer[inv.customer_name][b] += Number(inv.balance_due);
      byCustomer[inv.customer_name].total += Number(inv.balance_due);
    }

    res.json({ summary, customers: Object.values(byCustomer).sort((a: any, b: any) => b.total - a.total), invoices });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── AP Aging ─────────────────────────────────────────────────────────────────
router.get("/ap-aging", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`SELECT
      id, voucher_number, vendor_name,
      voucher_date, due_date, total_amount,
      COALESCE(paid_amount, 0) as paid_amount,
      (total_amount - COALESCE(paid_amount,0)) as balance_due,
      payment_status,
      COALESCE(CURRENT_DATE - COALESCE(due_date, voucher_date), 0) as days_overdue
      FROM expense_vouchers WHERE tenant_id=${t} AND record_status=1
      AND payment_status IN ('pending','partial')
      ORDER BY days_overdue DESC`);

    const bills = rows.rows as any[];
    const bucket = (b: any) => {
      const d = Number(b.days_overdue);
      if (d <= 30) return '0-30';
      if (d <= 60) return '31-60';
      if (d <= 90) return '61-90';
      return '90+';
    };

    const summary = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    const byVendor: Record<string, any> = {};
    for (const b of bills) {
      const bk = bucket(b);
      summary[bk] = (summary[bk] || 0) + Number(b.balance_due);
      if (!byVendor[b.vendor_name]) byVendor[b.vendor_name] = { vendor_name: b.vendor_name, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 };
      byVendor[b.vendor_name][bk] += Number(b.balance_due);
      byVendor[b.vendor_name].total += Number(b.balance_due);
    }

    res.json({ summary, vendors: Object.values(byVendor).sort((a: any, b: any) => b.total - a.total), bills });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Record AR Payment ─────────────────────────────────────────────────────────
router.post("/ar-payment/:invoice_id", auth, async (req: any, res) => {
  const t = tid(req);
  const { amount, payment_mode, reference, payment_date } = req.body;
  try {
    const inv = await db.execute(sql`SELECT * FROM invoices WHERE id=${req.params.invoice_id} AND tenant_id=${t}`);
    if (!inv.rows.length) return res.status(404).json({ message: "Invoice not found" });
    const invoice = inv.rows[0] as any;
    const newBalance = Math.max(0, Number(invoice.balance_due) - Number(amount));
    const status = newBalance <= 0 ? 'paid' : 'partial';
    await db.execute(sql`UPDATE invoices SET balance_due=${newBalance}, payment_status=${status} WHERE id=${req.params.invoice_id} AND tenant_id=${t}`);
    await db.execute(sql`INSERT INTO bank_transactions (tenant_id, transaction_date, description, amount, payment_mode, reference_number, transaction_type)
      VALUES (${t}, ${payment_date || new Date().toISOString().slice(0,10)}, ${'Payment from ' + invoice.customer_name + ' for ' + invoice.invoice_number}, ${amount}, ${payment_mode || 'bank'}, ${reference || null}, 'receipt')`);
    res.json({ success: true, balance_due: newBalance, payment_status: status });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── AP Payment Batch ──────────────────────────────────────────────────────────
router.post("/ap-payment/batch", auth, async (req: any, res) => {
  const t = tid(req);
  const { voucher_ids, payment_date, payment_mode, bank_name, reference_number, narration } = req.body;
  try {
    const ids = Array.isArray(voucher_ids) ? voucher_ids : [];
    if (!ids.length) return res.status(400).json({ message: "No vouchers selected" });

    const vouchers = await db.execute(sql`SELECT id, total_amount, paid_amount, vendor_name FROM expense_vouchers WHERE tenant_id=${t} AND id = ANY(${ids}::text[])`);
    const total = (vouchers.rows as any[]).reduce((s, v) => s + Number(v.total_amount) - Number(v.paid_amount || 0), 0);

    const batch = await db.execute(sql`INSERT INTO ap_payments (tenant_id, payment_date, payment_mode, total_amount, reference_number, bank_name, narration, voucher_ids, status)
      VALUES (${t}, ${payment_date || new Date().toISOString().slice(0,10)}, ${payment_mode || 'bank_transfer'}, ${total}, ${reference_number || null}, ${bank_name || null}, ${narration || null}, ${JSON.stringify(ids)}, 'approved')
      RETURNING *`);

    // Mark vouchers as paid
    for (const id of ids) {
      await db.execute(sql`UPDATE expense_vouchers SET payment_status='paid', paid_amount=total_amount WHERE id=${id} AND tenant_id=${t}`);
    }

    res.json(batch.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/ap-payment/list", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM ap_payments WHERE tenant_id=${t} AND record_status=1 ORDER BY created_at DESC LIMIT 100`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── AP Bills list ─────────────────────────────────────────────────────────────
router.get("/ap-bills", auth, async (req: any, res) => {
  const t = tid(req);
  const search = req.query.vendor_name as string;
  try {
    const rows = await db.execute(sql`SELECT id, voucher_number, vendor_name, voucher_date, due_date,
      total_amount, COALESCE(paid_amount,0) as paid_amount,
      (total_amount - COALESCE(paid_amount,0)) as balance_due, payment_status
      FROM expense_vouchers WHERE tenant_id=${t} AND record_status=1
      AND payment_status IN ('pending','partial')
      ${search ? sql`AND vendor_name ILIKE ${'%'+search+'%'}` : sql``}
      ORDER BY due_date ASC LIMIT 200`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── AR Reminders ──────────────────────────────────────────────────────────────
router.post("/ar-reminder", auth, async (req: any, res) => {
  const t = tid(req);
  const { invoice_id, customer_name, customer_phone, amount_due, days_overdue, reminder_type } = req.body;
  try {
    await db.execute(sql`INSERT INTO ar_reminders (tenant_id, invoice_id, customer_name, customer_phone, amount_due, days_overdue, reminder_type, sent_by)
      VALUES (${t}, ${invoice_id || null}, ${customer_name}, ${customer_phone || null}, ${amount_due}, ${days_overdue || 0}, ${reminder_type || 'whatsapp'}, ${req.user?.username || null})`);

    // Attempt WhatsApp if phone available
    if (customer_phone && reminder_type === 'whatsapp') {
      const msg = `Dear ${customer_name}, your payment of ₹${Number(amount_due).toLocaleString('en-IN')} is overdue by ${days_overdue} days. Please clear immediately. Thank you.`;
      try {
        const { whatsappService } = await import("./whatsappService");
        await whatsappService.sendMessage(customer_phone, msg);
      } catch {}
    }

    res.json({ success: true, message: "Reminder recorded" });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Period Lock ───────────────────────────────────────────────────────────────
router.get("/period-lock", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT * FROM finance_period_locks WHERE tenant_id=${t} AND is_active=1 LIMIT 1`);
    res.json(r.rows[0] || null);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/period-lock", auth, async (req: any, res) => {
  const t = tid(req);
  const { period_lock_date, reason } = req.body;
  try {
    if (!period_lock_date) {
      await db.execute(sql`UPDATE finance_period_locks SET is_active=0 WHERE tenant_id=${t}`);
      return res.json({ success: true, cleared: true });
    }
    await db.execute(sql`INSERT INTO finance_period_locks (tenant_id, lock_date, locked_by, reason)
      VALUES (${t}, ${period_lock_date}, ${req.user?.username || null}, ${reason || null})
      ON CONFLICT (tenant_id) DO UPDATE SET lock_date=${period_lock_date}, locked_by=${req.user?.username || null}, reason=${reason || null}, locked_at=NOW(), is_active=1`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Petty Cash ────────────────────────────────────────────────────────────────
router.get("/petty-cash", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const [config, vouchers] = await Promise.all([
      db.execute(sql`SELECT * FROM petty_cash_config WHERE tenant_id=${t}`),
      db.execute(sql`SELECT * FROM petty_cash_vouchers WHERE tenant_id=${t} AND record_status=1 ORDER BY created_at DESC LIMIT 100`),
    ]);
    res.json({ config: config.rows[0] || { float_amount: 5000, current_balance: 0, replenishment_threshold: 1000 }, vouchers: vouchers.rows });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/petty-cash/balance", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT * FROM petty_cash_config WHERE tenant_id=${t}`);
    res.json(r.rows[0] || { current_balance: 0 });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/petty-cash/voucher", auth, async (req: any, res) => {
  const t = tid(req);
  const { voucher_type, amount, purpose, category, paid_to, received_from, approved_by } = req.body;
  try {
    // Get/init config
    let config = await db.execute(sql`SELECT * FROM petty_cash_config WHERE tenant_id=${t}`);
    if (!config.rows.length) {
      await db.execute(sql`INSERT INTO petty_cash_config (tenant_id, float_amount, current_balance) VALUES (${t}, 5000, 5000)`);
      config = await db.execute(sql`SELECT * FROM petty_cash_config WHERE tenant_id=${t}`);
    }
    const cfg = config.rows[0] as any;
    const current = Number(cfg.current_balance);
    const newBalance = voucher_type === 'payment' ? current - Number(amount) : current + Number(amount);

    const count = await db.execute(sql`SELECT COUNT(*) as cnt FROM petty_cash_vouchers WHERE tenant_id=${t}`);
    const num = `PCV-${String(Number((count.rows[0] as any).cnt) + 1).padStart(4, '0')}`;

    const r = await db.execute(sql`INSERT INTO petty_cash_vouchers (tenant_id, voucher_number, voucher_type, amount, purpose, category, paid_to, received_from, approved_by, balance_after)
      VALUES (${t}, ${num}, ${voucher_type}, ${amount}, ${purpose}, ${category || null}, ${paid_to || null}, ${received_from || null}, ${approved_by || null}, ${newBalance})
      RETURNING *`);

    await db.execute(sql`UPDATE petty_cash_config SET current_balance=${newBalance}, updated_at=NOW() WHERE tenant_id=${t}`);
    res.json({ ...r.rows[0], newBalance, needsReplenishment: newBalance < Number(cfg.replenishment_threshold) });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/petty-cash/replenish", auth, async (req: any, res) => {
  const t = tid(req);
  const { amount } = req.body;
  try {
    await db.execute(sql`UPDATE petty_cash_config SET current_balance = current_balance + ${amount}, updated_at=NOW() WHERE tenant_id=${t}`);
    const cfg = await db.execute(sql`SELECT current_balance FROM petty_cash_config WHERE tenant_id=${t}`);
    const newBalance = Number((cfg.rows[0] as any).current_balance);
    const num = `PCV-REP-${Date.now()}`;
    await db.execute(sql`INSERT INTO petty_cash_vouchers (tenant_id, voucher_number, voucher_type, amount, purpose, balance_after)
      VALUES (${t}, ${num}, 'receipt', ${amount}, 'Replenishment', ${newBalance})`);
    res.json({ success: true, current_balance: newBalance });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── PDC Register ──────────────────────────────────────────────────────────────
router.get("/pdc", auth, async (req: any, res) => {
  const t = tid(req);
  const { pdc_type, status } = req.query;
  try {
    const rows = await db.execute(sql`SELECT * FROM pdc_register WHERE tenant_id=${t} AND record_status=1
      ${pdc_type ? sql`AND pdc_type=${pdc_type}` : sql``}
      ${status ? sql`AND status=${status}` : sql``}
      ORDER BY cheque_date ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/pdc", auth, async (req: any, res) => {
  const t = tid(req);
  const { pdc_type, cheque_number, bank_name, branch_name, cheque_date, amount, party_name, party_type, party_id, purpose, linked_invoice_id } = req.body;
  try {
    const r = await db.execute(sql`INSERT INTO pdc_register (tenant_id, pdc_type, cheque_number, bank_name, branch_name, cheque_date, amount, party_name, party_type, party_id, purpose, linked_invoice_id)
      VALUES (${t}, ${pdc_type}, ${cheque_number}, ${bank_name || null}, ${branch_name || null}, ${cheque_date}, ${amount}, ${party_name || null}, ${party_type || null}, ${party_id || null}, ${purpose || null}, ${linked_invoice_id || null})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/pdc/:id/status", auth, async (req: any, res) => {
  const t = tid(req);
  const { status, presented_date, cleared_date, bounce_reason } = req.body;
  try {
    const r = await db.execute(sql`UPDATE pdc_register SET status=${status},
      presented_date=${presented_date || null}, cleared_date=${cleared_date || null},
      bounce_reason=${bounce_reason || null}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${t} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── GSTR-2B Upload ────────────────────────────────────────────────────────────
router.post("/gstr2b/upload", auth, csvUpload.single("file"), async (req: any, res) => {
  const t = tid(req);
  const { period } = req.body;
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const content = req.file.buffer.toString('utf8');
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });

    const imp = await db.execute(sql`INSERT INTO gstr2b_imports (tenant_id, period, total_records, file_name, status, created_by)
      VALUES (${t}, ${period || ''}, ${records.length}, ${req.file.originalname}, 'processing', ${req.user?.username || null})
      RETURNING *`);
    const importId = (imp.rows[0] as any).id;

    let matched = 0, unmatched = 0;
    for (const rec of records as any[]) {
      const gstin = rec['Supplier GSTIN'] || rec['supplier_gstin'] || '';
      const invoiceNo = rec['Invoice Number'] || rec['invoice_number'] || '';
      const invoiceDate = rec['Invoice Date'] || rec['invoice_date'] || null;
      const taxableVal = parseFloat(rec['Taxable Value'] || rec['taxable_value'] || '0');
      const igst = parseFloat(rec['IGST'] || rec['igst'] || '0');
      const cgst = parseFloat(rec['CGST'] || rec['cgst'] || '0');
      const sgst = parseFloat(rec['SGST'] || rec['sgst'] || '0');
      const invoiceVal = parseFloat(rec['Invoice Value'] || rec['invoice_value'] || '0');
      const supplierName = rec['Supplier Name'] || rec['supplier_name'] || '';

      // Try to match vs purchase invoices
      let matchStatus = 'unmatched', matchedId = null;
      const match = await db.execute(sql`SELECT id FROM expense_vouchers WHERE tenant_id=${t} AND (vendor_gstin=${gstin} OR voucher_number ILIKE ${invoiceNo}) AND record_status=1 LIMIT 1`);
      if (match.rows.length) { matchStatus = 'matched'; matchedId = (match.rows[0] as any).id; matched++; }
      else unmatched++;

      await db.execute(sql`INSERT INTO gstr2b_records (tenant_id, import_id, supplier_gstin, supplier_name, invoice_number, invoice_date, invoice_value, taxable_value, igst, cgst, sgst, matched_invoice_id, match_status)
        VALUES (${t}, ${importId}, ${gstin}, ${supplierName}, ${invoiceNo}, ${invoiceDate || null}, ${invoiceVal}, ${taxableVal}, ${igst}, ${cgst}, ${sgst}, ${matchedId}, ${matchStatus})`);
    }

    await db.execute(sql`UPDATE gstr2b_imports SET matched=${matched}, unmatched=${unmatched}, status='completed' WHERE id=${importId}`);
    res.json({ importId, total: records.length, matched, unmatched });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/gstr2b/list", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT * FROM gstr2b_imports WHERE tenant_id=${t} AND record_status=1 ORDER BY import_date DESC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/gstr2b/:importId/records", auth, async (req: any, res) => {
  const t = tid(req);
  const { match_status } = req.query;
  try {
    const r = await db.execute(sql`SELECT * FROM gstr2b_records WHERE tenant_id=${t} AND import_id=${req.params.importId}
      ${match_status ? sql`AND match_status=${match_status}` : sql``}
      ORDER BY created_at`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── ITC Utilization ───────────────────────────────────────────────────────────
router.get("/itc-utilization", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const itcIn = await db.execute(sql`SELECT
      COALESCE(SUM(cgst_amount),0) as cgst_input,
      COALESCE(SUM(sgst_amount),0) as sgst_input,
      COALESCE(SUM(igst_amount),0) as igst_input
      FROM expense_vouchers WHERE tenant_id=${t} AND record_status=1`);

    const taxOut = await db.execute(sql`SELECT
      COALESCE(SUM(cgst_amount),0) as cgst_output,
      COALESCE(SUM(sgst_amount),0) as sgst_output,
      COALESCE(SUM(igst_amount),0) as igst_output
      FROM invoices WHERE tenant_id=${t} AND record_status=1 AND invoice_status != 'cancelled'`);

    const itc = itcIn.rows[0] as any;
    const out = taxOut.rows[0] as any;

    res.json({
      cgstInput: Number(itc.cgst_input), cgstOutput: Number(out.cgst_output), cgstNet: Number(itc.cgst_input) - Number(out.cgst_output),
      sgstInput: Number(itc.sgst_input), sgstOutput: Number(out.sgst_output), sgstNet: Number(itc.sgst_input) - Number(out.sgst_output),
      igstInput: Number(itc.igst_input), igstOutput: Number(out.igst_output), igstNet: Number(itc.igst_input) - Number(out.igst_output),
      totalInput: Number(itc.cgst_input) + Number(itc.sgst_input) + Number(itc.igst_input),
      totalOutput: Number(out.cgst_output) + Number(out.sgst_output) + Number(out.igst_output),
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── GSTR-9 Summary ────────────────────────────────────────────────────────────
router.get("/gstr9-data", auth, async (req: any, res) => {
  const t = tid(req);
  const { fy } = req.query;
  const fyStart = fy ? `${String(fy).split('-')[0]}-04-01` : `${new Date().getFullYear() - 1}-04-01`;
  const fyEnd = fy ? `${String(fy).split('-')[1] || (Number(String(fy).split('-')[0]) + 1)}-03-31` : `${new Date().getFullYear()}-03-31`;
  try {
    const [outward, inward] = await Promise.all([
      db.execute(sql`SELECT
        COALESCE(SUM(taxable_amount),0) as taxable,
        COALESCE(SUM(cgst_amount),0) as cgst,
        COALESCE(SUM(sgst_amount),0) as sgst,
        COALESCE(SUM(igst_amount),0) as igst,
        COALESCE(SUM(total_amount),0) as total,
        COUNT(*) as invoice_count
        FROM invoices WHERE tenant_id=${t} AND record_status=1
        AND invoice_date BETWEEN ${fyStart} AND ${fyEnd}
        AND invoice_status != 'cancelled'`),
      db.execute(sql`SELECT
        COALESCE(SUM(taxable_amount),0) as taxable,
        COALESCE(SUM(cgst_amount),0) as cgst,
        COALESCE(SUM(sgst_amount),0) as sgst,
        COALESCE(SUM(igst_amount),0) as igst,
        COALESCE(SUM(total_amount),0) as total
        FROM expense_vouchers WHERE tenant_id=${t} AND record_status=1
        AND voucher_date BETWEEN ${fyStart} AND ${fyEnd}`),
    ]);
    const out = outward.rows[0] as any;
    const inv = inward.rows[0] as any;
    res.json({ fy: fy || 'Current', outwardSupplies: out, inwardSupplies: inv, itcClaimed: inv });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── TDS Return ────────────────────────────────────────────────────────────────
router.post("/tds-return/compile", auth, async (req: any, res) => {
  const t = tid(req);
  const { return_type, quarter, financial_year } = req.body;
  try {
    const quarterDates: Record<string, [string, string]> = {
      Q1: [`${financial_year?.split('-')[0]}-04-01`, `${financial_year?.split('-')[0]}-06-30`],
      Q2: [`${financial_year?.split('-')[0]}-07-01`, `${financial_year?.split('-')[0]}-09-30`],
      Q3: [`${financial_year?.split('-')[0]}-10-01`, `${financial_year?.split('-')[0]}-12-31`],
      Q4: [`${Number(financial_year?.split('-')[0]) + 1}-01-01`, `${Number(financial_year?.split('-')[0]) + 1}-03-31`],
    };
    const [from, to] = quarterDates[quarter] || [null, null];

    let tdsData: any[] = [];
    if (return_type === '26Q') {
      const rows = await db.execute(sql`SELECT vendor_name as deductee_name, vendor_pan as deductee_pan,
        tds_section as section_code, payment_date, total_amount as payment_amount, tds_amount
        FROM expense_vouchers WHERE tenant_id=${t} AND tds_applicable=1
        AND payment_date BETWEEN ${from} AND ${to}
        ORDER BY payment_date`);
      tdsData = rows.rows as any[];
    } else if (return_type === '24Q') {
      const rows = await db.execute(sql`SELECT employee_name as deductee_name, employee_pan as deductee_pan,
        '192' as section_code, salary_month as payment_date, gross_salary as payment_amount, tds_amount
        FROM salary_details WHERE tenant_id=${t} AND salary_status='paid'
        AND salary_month BETWEEN ${from} AND ${to}`);
      tdsData = rows.rows as any[];
    }

    // Insert compiled records
    if (tdsData.length) {
      for (const d of tdsData) {
        await db.execute(sql`INSERT INTO tds_return_data (tenant_id, return_type, quarter, financial_year, deductee_name, deductee_pan, section_code, payment_date, payment_amount, tds_amount)
          VALUES (${t}, ${return_type}, ${quarter}, ${financial_year}, ${d.deductee_name || null}, ${d.deductee_pan || null}, ${d.section_code || null}, ${d.payment_date || null}, ${d.payment_amount || 0}, ${d.tds_amount || 0})
          ON CONFLICT DO NOTHING`);
      }
    }

    res.json({ quarter, financial_year, return_type, records: tdsData, total: tdsData.length });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/tds-return/:quarter/:fy", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT * FROM tds_return_data WHERE tenant_id=${t}
      AND quarter=${req.params.quarter} AND financial_year=${req.params.fy} AND record_status=1 ORDER BY payment_date`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Bank Statement Upload ─────────────────────────────────────────────────────
router.post("/bank-statement/upload", auth, csvUpload.single("file"), async (req: any, res) => {
  const t = tid(req);
  const { bank_account, statement_from, statement_to } = req.body;
  try {
    if (!req.file) return res.status(400).json({ message: "No file" });
    const content = req.file.buffer.toString('utf8');
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });

    const upload = await db.execute(sql`INSERT INTO bank_statement_uploads (tenant_id, bank_account, statement_from, statement_to, total_records, file_name, status)
      VALUES (${t}, ${bank_account || ''}, ${statement_from || null}, ${statement_to || null}, ${records.length}, ${req.file.originalname}, 'processing')
      RETURNING *`);
    const uploadId = (upload.rows[0] as any).id;

    let matched = 0, unmatched = 0;
    for (const rec of records as any[]) {
      const txDate = rec['Date'] || rec['transaction_date'] || rec['Txn Date'] || null;
      const desc = rec['Description'] || rec['Narration'] || rec['description'] || '';
      const debit = parseFloat(rec['Debit'] || rec['Withdrawal'] || rec['debit_amount'] || '0') || 0;
      const credit = parseFloat(rec['Credit'] || rec['Deposit'] || rec['credit_amount'] || '0') || 0;
      const balance = parseFloat(rec['Balance'] || rec['balance'] || '0') || 0;
      const ref = rec['Ref No'] || rec['reference_number'] || rec['Chq No'] || '';

      // Try to match vs bank_transactions
      const amt = debit || credit;
      const match = await db.execute(sql`SELECT id FROM bank_transactions WHERE tenant_id=${t}
        AND amount=${amt} AND ABS(EXTRACT(EPOCH FROM (transaction_date::timestamp - ${txDate || new Date().toISOString().slice(0,10)}::timestamp))) < 86400
        LIMIT 1`);
      const matchStatus = match.rows.length ? 'matched' : 'unmatched';
      const matchedId = match.rows.length ? (match.rows[0] as any).id : null;
      if (matchStatus === 'matched') matched++; else unmatched++;

      await db.execute(sql`INSERT INTO bank_statement_lines (tenant_id, upload_id, transaction_date, description, debit_amount, credit_amount, balance, reference_number, matched_journal_id, match_status)
        VALUES (${t}, ${uploadId}, ${txDate || null}, ${desc}, ${debit}, ${credit}, ${balance}, ${ref || null}, ${matchedId}, ${matchStatus})`);
    }

    await db.execute(sql`UPDATE bank_statement_uploads SET matched=${matched}, unmatched=${unmatched}, status='completed' WHERE id=${uploadId}`);
    res.json({ uploadId, total: records.length, matched, unmatched });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/bank-statement/list", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT * FROM bank_statement_uploads WHERE tenant_id=${t} ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/bank-statement/:uploadId/lines", auth, async (req: any, res) => {
  const t = tid(req);
  const { match_status } = req.query;
  try {
    const r = await db.execute(sql`SELECT * FROM bank_statement_lines WHERE tenant_id=${t} AND upload_id=${req.params.uploadId}
      ${match_status ? sql`AND match_status=${match_status}` : sql``}
      ORDER BY transaction_date`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Currency Rates ────────────────────────────────────────────────────────────
router.get("/currency-rates", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT DISTINCT ON (currency_code) * FROM currency_rates WHERE tenant_id=${t} ORDER BY currency_code, rate_date DESC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/currency-rates", auth, async (req: any, res) => {
  const t = tid(req);
  const { currency_code, currency_name, rate_to_inr, rate_date } = req.body;
  try {
    const r = await db.execute(sql`INSERT INTO currency_rates (tenant_id, currency_code, currency_name, rate_to_inr, rate_date)
      VALUES (${t}, ${currency_code}, ${currency_name || null}, ${rate_to_inr}, ${rate_date || new Date().toISOString().slice(0,10)}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Forex Transactions ────────────────────────────────────────────────────────
router.get("/forex-transactions", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT * FROM forex_transactions WHERE tenant_id=${t} ORDER BY created_at DESC LIMIT 100`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/forex-transactions", auth, async (req: any, res) => {
  const t = tid(req);
  const { transaction_type, foreign_currency, foreign_amount, exchange_rate, inr_amount, forex_gain_loss } = req.body;
  try {
    const r = await db.execute(sql`INSERT INTO forex_transactions (tenant_id, transaction_type, foreign_currency, foreign_amount, exchange_rate, inr_amount, forex_gain_loss)
      VALUES (${t}, ${transaction_type}, ${foreign_currency || null}, ${foreign_amount || 0}, ${exchange_rate || 0}, ${inr_amount || 0}, ${forex_gain_loss || 0}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Income Tax Computation ────────────────────────────────────────────────────
router.get("/income-tax-computation", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const [rev, exp, tds] = await Promise.all([
      db.execute(sql`SELECT COALESCE(SUM(taxable_amount),0) as total FROM invoices WHERE tenant_id=${t} AND record_status=1 AND invoice_status!='cancelled'`),
      db.execute(sql`SELECT COALESCE(SUM(taxable_amount),0) as total FROM expense_vouchers WHERE tenant_id=${t} AND record_status=1`),
      db.execute(sql`SELECT COALESCE(SUM(tds_amount),0) as total FROM expense_vouchers WHERE tenant_id=${t} AND tds_applicable=1 AND record_status=1`),
    ]);
    const taxableProfit = Number((rev.rows[0] as any).total) - Number((exp.rows[0] as any).total);
    const taxRate = 0.25; // 25% default corporate tax
    const estimatedTax = Math.max(0, taxableProfit * taxRate);
    const tdsCredit = Number((tds.rows[0] as any).total);

    const now = new Date();
    const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const advanceTaxDates = [
      { due: `${fy}-06-15`, percent: 15, amount: estimatedTax * 0.15 },
      { due: `${fy}-09-15`, percent: 45, amount: estimatedTax * 0.30 },
      { due: `${fy}-12-15`, percent: 75, amount: estimatedTax * 0.30 },
      { due: `${fy+1}-03-15`, percent: 100, amount: estimatedTax * 0.25 },
    ];

    res.json({ taxableProfit, estimatedTax, tdsCredit, netTaxPayable: Math.max(0, estimatedTax - tdsCredit), advanceTaxDates });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Deferred Revenue ─────────────────────────────────────────────────────────
router.get("/deferred-revenue", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    // Future-dated invoices or partial delivery
    const r = await db.execute(sql`SELECT customer_name, invoice_number, invoice_date, total_amount, balance_due, due_date
      FROM invoices WHERE tenant_id=${t} AND record_status=1
      AND (invoice_date > CURRENT_DATE OR payment_status = 'advance')
      ORDER BY invoice_date DESC LIMIT 50`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Cash Flow Summary ─────────────────────────────────────────────────────────
router.get("/cash-flow-summary", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT payment_mode,
      COALESCE(SUM(CASE WHEN transaction_type='receipt' OR amount > 0 THEN amount END),0) as total_inflow,
      COALESCE(SUM(CASE WHEN transaction_type='payment' THEN amount END),0) as total_outflow,
      COALESCE(SUM(CASE WHEN transaction_type='receipt' OR amount > 0 THEN amount ELSE -amount END),0) as net_flow
      FROM bank_transactions WHERE tenant_id=${t}
      GROUP BY payment_mode ORDER BY net_flow DESC`);
    res.json({ modes: r.rows });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── AR Invoices list ──────────────────────────────────────────────────────────
router.get("/ar-invoices", auth, async (req: any, res) => {
  const t = tid(req);
  const search = req.query.customer_name as string;
  try {
    const r = await db.execute(sql`SELECT id, invoice_number, customer_name, customer_phone, invoice_date, due_date, total_amount, balance_due, payment_status
      FROM invoices WHERE tenant_id=${t} AND record_status=1 AND balance_due > 0
      ${search ? sql`AND customer_name ILIKE ${'%'+search+'%'}` : sql``}
      ORDER BY due_date ASC LIMIT 200`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
