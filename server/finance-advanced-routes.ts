import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { createJournalWithLines } from "./journal-service";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
};
const tid = (req: any): number => req.session?.tenantId ?? req.user?.tenantId ?? 1;

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS fin_recurring_journals (
      id SERIAL PRIMARY KEY, tenant_id INT,
      name VARCHAR(300), description TEXT,
      frequency VARCHAR(20),
      day_of_month INT DEFAULT 1,
      next_run_date DATE,
      last_run_date DATE,
      is_active BOOLEAN DEFAULT TRUE,
      template_lines JSONB DEFAULT '[]',
      auto_post BOOLEAN DEFAULT FALSE,
      runs_count INT DEFAULT 0,
      max_runs INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS fin_recurring_runs (
      id SERIAL PRIMARY KEY, tenant_id INT,
      recurring_id INT, run_date DATE,
      journal_id INT, status VARCHAR(20),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS fin_gstr_filings (
      id SERIAL PRIMARY KEY, tenant_id INT,
      gstin VARCHAR(15), return_type VARCHAR(20),
      period_month INT, period_year INT,
      status VARCHAR(20) DEFAULT 'draft',
      b2b_data JSONB DEFAULT '[]',
      b2c_data JSONB DEFAULT '[]',
      cdnr_data JSONB DEFAULT '[]',
      tax_summary JSONB DEFAULT '{}',
      filed_at TIMESTAMPTZ, ack_number VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS fin_company_group (
      id SERIAL PRIMARY KEY, owner_tenant_id INT,
      member_tenant_id INT, company_name VARCHAR(200),
      is_active BOOLEAN DEFAULT TRUE
    )
  `);
}

function calcNextRunDate(frequency: string, dayOfMonth: number, from?: Date): string {
  const base = from ? new Date(from) : new Date();
  let next = new Date(base);
  const day = Math.max(1, Math.min(28, dayOfMonth || 1));
  if (frequency === 'weekly') {
    next.setDate(base.getDate() + 7);
  } else if (frequency === 'monthly') {
    next.setMonth(base.getMonth() + 1);
    next.setDate(day);
  } else if (frequency === 'quarterly') {
    next.setMonth(base.getMonth() + 3);
    next.setDate(day);
  } else if (frequency === 'yearly') {
    next.setFullYear(base.getFullYear() + 1);
    next.setDate(day);
  } else {
    next.setMonth(base.getMonth() + 1);
    next.setDate(day);
  }
  return next.toISOString().slice(0, 10);
}

async function seedRecurringTemplates(tenantId: number) {
  const existing = await db.execute(sql`SELECT COUNT(*) as c FROM fin_recurring_journals WHERE tenant_id=${tenantId}`);
  if (Number(existing.rows[0]?.c) > 0) return;
  const templates = [
    {
      name: 'Monthly Office Rent',
      description: 'DR Rent Expense / CR Accounts Payable',
      frequency: 'monthly',
      day_of_month: 1,
      template_lines: JSON.stringify([
        { account_code: '5101', debit_amount: 50000, credit_amount: 0, description: 'Office Rent Expense' },
        { account_code: '2001', debit_amount: 0, credit_amount: 50000, description: 'Rent Payable (AP)' }
      ])
    },
    {
      name: 'Monthly Depreciation',
      description: 'DR Depreciation / CR Accumulated Depreciation',
      frequency: 'monthly',
      day_of_month: 28,
      template_lines: JSON.stringify([
        { account_code: '5103', debit_amount: 10000, credit_amount: 0, description: 'Depreciation Expense' },
        { account_code: '1500', debit_amount: 0, credit_amount: 10000, description: 'Accumulated Depreciation' }
      ])
    },
    {
      name: 'Monthly Salary Accrual',
      description: 'DR Salary Expense / CR Salary Payable',
      frequency: 'monthly',
      day_of_month: 31,
      template_lines: JSON.stringify([
        { account_code: '5100', debit_amount: 200000, credit_amount: 0, description: 'Salary Expense Accrual' },
        { account_code: '2501', debit_amount: 0, credit_amount: 200000, description: 'Salary Payable' }
      ])
    }
  ];
  for (const t of templates) {
    const nextRun = calcNextRunDate(t.frequency, t.day_of_month);
    await db.execute(sql`
      INSERT INTO fin_recurring_journals (tenant_id, name, description, frequency, day_of_month, next_run_date, template_lines)
      VALUES (${tenantId}, ${t.name}, ${t.description}, ${t.frequency}, ${t.day_of_month}, ${nextRun}, ${t.template_lines}::jsonb)
    `);
  }
}

// ── Recurring Journals ────────────────────────────────────────────────────────

router.get('/recurring-journals', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const t = tid(req);
    await seedRecurringTemplates(t);
    const rows = await db.execute(sql`SELECT * FROM fin_recurring_journals WHERE tenant_id=${t} ORDER BY next_run_date`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/recurring-journals', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const t = tid(req);
    const { name, description, frequency, day_of_month, template_lines, auto_post, max_runs } = req.body;
    const nextRun = calcNextRunDate(frequency, day_of_month);
    const linesJson = JSON.stringify(template_lines || []);
    const rows = await db.execute(sql`
      INSERT INTO fin_recurring_journals (tenant_id, name, description, frequency, day_of_month, next_run_date, template_lines, auto_post, max_runs)
      VALUES (${t}, ${name}, ${description||null}, ${frequency||'monthly'}, ${day_of_month||1}, ${nextRun}, ${linesJson}::jsonb, ${auto_post||false}, ${max_runs||null})
      RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/recurring-journals/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const rows = await db.execute(sql`SELECT * FROM fin_recurring_journals WHERE id=${parseInt(req.params.id)} AND tenant_id=${tid(req)}`);
    if (!rows.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/recurring-journals/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const { name, description, frequency, day_of_month, template_lines, auto_post, max_runs, is_active } = req.body;
    const linesJson = JSON.stringify(template_lines || []);
    const rows = await db.execute(sql`
      UPDATE fin_recurring_journals SET
        name=${name}, description=${description||null}, frequency=${frequency||'monthly'},
        day_of_month=${day_of_month||1}, template_lines=${linesJson}::jsonb,
        auto_post=${auto_post||false}, max_runs=${max_runs||null}, is_active=${is_active !== false}
      WHERE id=${parseInt(req.params.id)} AND tenant_id=${tid(req)}
      RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/recurring-journals/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    await db.execute(sql`UPDATE fin_recurring_journals SET is_active=false WHERE id=${parseInt(req.params.id)} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

async function runRecurringJournal(rec: any, tenantId: number) {
  const lines = Array.isArray(rec.template_lines) ? rec.template_lines : JSON.parse(rec.template_lines || '[]');
  const glLines = lines.map((l: any) => ({
    accountCode: String(l.account_code),
    debit: Math.round((parseFloat(l.debit_amount) || 0) * 100),
    credit: Math.round((parseFloat(l.credit_amount) || 0) * 100),
    memo: l.description || rec.name
  }));
  const today = new Date().toISOString().slice(0, 10);
  const je = await createJournalWithLines(
    today,
    `${rec.name} — Recurring (${today})`,
    glLines,
    { sourceType: 'recurring', sourceId: String(rec.id), isAutoGenerated: true }
  );
  const journalId = (je as any)?.id || null;
  const nextRun = calcNextRunDate(rec.frequency, rec.day_of_month);
  await db.execute(sql`
    UPDATE fin_recurring_journals SET
      last_run_date=${today}, next_run_date=${nextRun},
      runs_count=COALESCE(runs_count,0)+1
    WHERE id=${rec.id}
  `);
  await db.execute(sql`
    INSERT INTO fin_recurring_runs (tenant_id, recurring_id, run_date, journal_id, status)
    VALUES (${tenantId}, ${rec.id}, ${today}, ${journalId}, 'posted')
  `);
  return { journal_id: journalId, status: 'posted', recurring_id: rec.id };
}

router.post('/recurring-journals/:id/run-now', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const t = tid(req);
    const rows = await db.execute(sql`SELECT * FROM fin_recurring_journals WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    const rec = rows.rows[0];
    if (!rec) return res.status(404).json({ error: 'Not found' });
    const result = await runRecurringJournal(rec, t);
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/recurring-journals/process-due', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const t = tid(req);
    const today = new Date().toISOString().slice(0, 10);
    const due = await db.execute(sql`
      SELECT * FROM fin_recurring_journals
      WHERE tenant_id=${t} AND is_active=true AND next_run_date <= ${today}
      AND (max_runs IS NULL OR runs_count < max_runs)
    `);
    const results = [];
    for (const rec of due.rows) {
      try {
        const r = await runRecurringJournal(rec, t);
        results.push(r);
      } catch (err: any) {
        results.push({ recurring_id: rec.id, status: 'failed', error: err.message });
      }
    }
    res.json({ processed: results.length, journals: results });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/recurring-journals/:id/history', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const rows = await db.execute(sql`
      SELECT * FROM fin_recurring_runs WHERE tenant_id=${tid(req)} AND recurring_id=${parseInt(req.params.id)}
      ORDER BY created_at DESC
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GSTR Data Preparation ─────────────────────────────────────────────────────

router.get('/gstr/summary', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const t = tid(req);
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    // Try to fetch from invoices table
    let invoices: any[] = [];
    try {
      const invRows = await db.execute(sql`
        SELECT * FROM invoices WHERE tenant_id=${t}
        AND EXTRACT(MONTH FROM invoice_date)=${month}
        AND EXTRACT(YEAR FROM invoice_date)=${year}
        AND status != 'cancelled'
      `);
      invoices = invRows.rows;
    } catch { invoices = []; }
    const b2b = invoices.filter((i: any) => i.buyer_gstin || i.gstin);
    const b2c = invoices.filter((i: any) => !i.buyer_gstin && !i.gstin);
    const totalTax = invoices.reduce((s: number, i: any) => s + parseFloat(i.total_gst || i.tax_amount || 0), 0);
    const totalTaxable = invoices.reduce((s: number, i: any) => s + parseFloat(i.subtotal || i.taxable_amount || 0), 0);
    res.json({
      period: { month, year },
      b2b_invoices: b2b.map((i: any) => ({
        invoice_no: i.invoice_number, invoice_date: i.invoice_date,
        gstin: i.buyer_gstin || i.gstin, buyer_name: i.customer_name || i.buyer_name,
        taxable_value: parseFloat(i.subtotal || 0), tax: parseFloat(i.total_gst || i.tax_amount || 0),
        total: parseFloat(i.total_amount || 0)
      })),
      b2c_summary: { count: b2c.length, taxable_value: b2c.reduce((s: number, i: any) => s + parseFloat(i.subtotal || 0), 0) },
      tax_summary: { total_taxable: totalTaxable, total_tax: totalTax }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/gstr/prepare', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const t = tid(req);
    const { return_type, period_month, period_year, gstin } = req.body;
    let invoices: any[] = [];
    try {
      const invRows = await db.execute(sql`
        SELECT * FROM invoices WHERE tenant_id=${t}
        AND EXTRACT(MONTH FROM invoice_date)=${period_month}
        AND EXTRACT(YEAR FROM invoice_date)=${period_year}
        AND status != 'cancelled'
      `);
      invoices = invRows.rows;
    } catch { invoices = []; }
    const b2b = invoices.filter((i: any) => i.buyer_gstin || i.gstin);
    const b2c = invoices.filter((i: any) => !i.buyer_gstin && !i.gstin);
    const b2bJson = JSON.stringify(b2b);
    const b2cJson = JSON.stringify(b2c);
    const taxSummary = JSON.stringify({
      total_taxable: invoices.reduce((s: number, i: any) => s + parseFloat(i.subtotal || 0), 0),
      total_gst: invoices.reduce((s: number, i: any) => s + parseFloat(i.total_gst || i.tax_amount || 0), 0)
    });
    const rows = await db.execute(sql`
      INSERT INTO fin_gstr_filings (tenant_id, gstin, return_type, period_month, period_year, b2b_data, b2c_data, tax_summary)
      VALUES (${t}, ${gstin||null}, ${return_type||'GSTR-1'}, ${period_month}, ${period_year}, ${b2bJson}::jsonb, ${b2cJson}::jsonb, ${taxSummary}::jsonb)
      RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/gstr/filings', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const rows = await db.execute(sql`SELECT * FROM fin_gstr_filings WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/gstr/filings/:id/download', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const rows = await db.execute(sql`SELECT * FROM fin_gstr_filings WHERE id=${parseInt(req.params.id)} AND tenant_id=${tid(req)}`);
    const filing = rows.rows[0];
    if (!filing) return res.status(404).json({ error: 'Not found' });
    res.setHeader('Content-Disposition', `attachment; filename=GSTR-${filing.return_type}-${filing.period_month}-${filing.period_year}.json`);
    res.json(filing);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/gstr/file/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const { ack_number } = req.body;
    const ack = ack_number || `SIM-ACK-${Date.now()}`;
    await db.execute(sql`
      UPDATE fin_gstr_filings SET status='filed', ack_number=${ack}, filed_at=NOW()
      WHERE id=${parseInt(req.params.id)} AND tenant_id=${tid(req)}
    `);
    res.json({ success: true, ack_number: ack, note: 'Simulation: Direct GSTN API requires DSC/EVC auth' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/gstr-3b/summary', requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    let outwardTaxable = 0, outwardTax = 0, itcAvailable = 0;
    try {
      const sales = await db.execute(sql`
        SELECT SUM(COALESCE(subtotal,0)) as taxable, SUM(COALESCE(total_gst,tax_amount,0)) as tax
        FROM invoices WHERE tenant_id=${t}
        AND EXTRACT(MONTH FROM invoice_date)=${month}
        AND EXTRACT(YEAR FROM invoice_date)=${year}
        AND status != 'cancelled'
      `);
      outwardTaxable = parseFloat(String(sales.rows[0]?.taxable || '0'));
      outwardTax = parseFloat(String(sales.rows[0]?.tax || '0'));
    } catch { /* no invoices table or no data */ }
    const netTaxPayable = Math.max(0, outwardTax - itcAvailable);
    res.json({ period: { month, year }, outward_supplies: { taxable_value: outwardTaxable, tax: outwardTax }, itc_available: itcAvailable, net_tax_payable: netTaxPayable });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Company Group & Consolidation ─────────────────────────────────────────────

router.get('/company-group', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const rows = await db.execute(sql`SELECT * FROM fin_company_group WHERE owner_tenant_id=${tid(req)} AND is_active=true`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/company-group', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const { member_tenant_id, company_name } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO fin_company_group (owner_tenant_id, member_tenant_id, company_name)
      VALUES (${tid(req)}, ${member_tenant_id}, ${company_name})
      RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/company-group/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    await db.execute(sql`UPDATE fin_company_group SET is_active=false WHERE id=${parseInt(req.params.id)} AND owner_tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/consolidation/pnl', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const t = tid(req);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const group = await db.execute(sql`SELECT * FROM fin_company_group WHERE owner_tenant_id=${t} AND is_active=true`);
    const memberIds: number[] = [t, ...group.rows.map((r: any) => r.member_tenant_id)];
    const entities = [];
    let totalRevenue = 0, totalExpenses = 0;
    for (const memberId of memberIds) {
      let revenue = 0, expenses = 0, name = `Tenant ${memberId}`;
      try {
        const nameRow = await db.execute(sql`SELECT company_name FROM tenants WHERE id=${memberId}`);
        if (nameRow.rows[0]) name = (nameRow.rows[0] as any).company_name || name;
      } catch { /* tenants table may differ */ }
      try {
        const rev = await db.execute(sql`
          SELECT COALESCE(SUM(ABS(jl.credit_paise - jl.debit_paise)),0) as total
          FROM journal_lines jl
          JOIN journal_entries je ON je.id=jl.journal_entry_id
          JOIN chart_of_accounts coa ON coa.id=jl.account_id
          WHERE je.tenant_id=${memberId}
          AND EXTRACT(YEAR FROM je.entry_date)=${year}
          AND coa.account_code LIKE '4%'
        `);
        revenue = Math.round(parseFloat(String(rev.rows[0]?.total || '0'))) / 100;
        const exp = await db.execute(sql`
          SELECT COALESCE(SUM(ABS(jl.debit_paise - jl.credit_paise)),0) as total
          FROM journal_lines jl
          JOIN journal_entries je ON je.id=jl.journal_entry_id
          JOIN chart_of_accounts coa ON coa.id=jl.account_id
          WHERE je.tenant_id=${memberId}
          AND EXTRACT(YEAR FROM je.entry_date)=${year}
          AND (coa.account_code LIKE '5%' OR coa.account_code LIKE '6%')
        `);
        expenses = Math.round(parseFloat(String(exp.rows[0]?.total || '0'))) / 100;
      } catch { /* GL tables may differ */ }
      totalRevenue += revenue;
      totalExpenses += expenses;
      entities.push({ tenant_id: memberId, name, revenue, expenses, net_profit: revenue - expenses });
    }
    res.json({ entities, consolidated: { total_revenue: totalRevenue, total_expenses: totalExpenses, net_profit: totalRevenue - totalExpenses } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/consolidation/balance-sheet', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const t = tid(req);
    const group = await db.execute(sql`SELECT * FROM fin_company_group WHERE owner_tenant_id=${t} AND is_active=true`);
    const memberIds: number[] = [t, ...group.rows.map((r: any) => r.member_tenant_id)];
    const entities = [];
    let totalAssets = 0, totalLiabilities = 0, totalEquity = 0;
    for (const memberId of memberIds) {
      let assets = 0, liabilities = 0, equity = 0;
      try {
        const a = await db.execute(sql`
          SELECT COALESCE(SUM(jl.debit_paise - jl.credit_paise),0) as total
          FROM journal_lines jl
          JOIN journal_entries je ON je.id=jl.journal_entry_id
          JOIN chart_of_accounts coa ON coa.id=jl.account_id
          WHERE je.tenant_id=${memberId} AND coa.account_code LIKE '1%'
        `);
        assets = Math.round(parseFloat(String(a.rows[0]?.total || '0'))) / 100;
        const l = await db.execute(sql`
          SELECT COALESCE(SUM(jl.credit_paise - jl.debit_paise),0) as total
          FROM journal_lines jl
          JOIN journal_entries je ON je.id=jl.journal_entry_id
          JOIN chart_of_accounts coa ON coa.id=jl.account_id
          WHERE je.tenant_id=${memberId} AND coa.account_code LIKE '2%'
        `);
        liabilities = Math.round(parseFloat(String(l.rows[0]?.total || '0'))) / 100;
        const e = await db.execute(sql`
          SELECT COALESCE(SUM(jl.credit_paise - jl.debit_paise),0) as total
          FROM journal_lines jl
          JOIN journal_entries je ON je.id=jl.journal_entry_id
          JOIN chart_of_accounts coa ON coa.id=jl.account_id
          WHERE je.tenant_id=${memberId} AND coa.account_code LIKE '3%'
        `);
        equity = Math.round(parseFloat(String(e.rows[0]?.total || '0'))) / 100;
      } catch { /* GL not available */ }
      totalAssets += assets;
      totalLiabilities += liabilities;
      totalEquity += equity;
      entities.push({ tenant_id: memberId, assets, liabilities, equity });
    }
    res.json({ entities, consolidated: { total_assets: totalAssets, total_liabilities: totalLiabilities, total_equity: totalEquity } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
