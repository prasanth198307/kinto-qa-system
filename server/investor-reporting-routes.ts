import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import PDFDocument from "pdfkit";

export const investorRouter = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
};
const tid = (req: any): number => req.session?.tenantId ?? req.user?.tenantId ?? 1;

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Ensure Tables ────────────────────────────────────────────────────────────
async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inv_metrics (
      id SERIAL PRIMARY KEY, tenant_id INT,
      period_month INT, period_year INT,
      mrr NUMERIC(14,2) DEFAULT 0,
      arr NUMERIC(14,2) DEFAULT 0,
      new_mrr NUMERIC(12,2) DEFAULT 0,
      expansion_mrr NUMERIC(12,2) DEFAULT 0,
      churn_mrr NUMERIC(12,2) DEFAULT 0,
      contraction_mrr NUMERIC(12,2) DEFAULT 0,
      net_new_mrr NUMERIC(12,2) DEFAULT 0,
      total_customers INT DEFAULT 0,
      new_customers INT DEFAULT 0,
      churned_customers INT DEFAULT 0,
      customer_churn_rate NUMERIC(6,4) DEFAULT 0,
      cac NUMERIC(10,2) DEFAULT 0,
      ltv NUMERIC(10,2) DEFAULT 0,
      ltv_cac_ratio NUMERIC(6,2) DEFAULT 0,
      payback_months NUMERIC(5,1) DEFAULT 0,
      cash_balance NUMERIC(14,2) DEFAULT 0,
      burn_rate NUMERIC(12,2) DEFAULT 0,
      runway_months NUMERIC(5,1) DEFAULT 0,
      revenue NUMERIC(14,2) DEFAULT 0,
      cogs NUMERIC(12,2) DEFAULT 0,
      gross_profit NUMERIC(14,2) DEFAULT 0,
      gross_margin_pct NUMERIC(5,2) DEFAULT 0,
      ebitda NUMERIC(14,2) DEFAULT 0,
      ebitda_margin_pct NUMERIC(5,2) DEFAULT 0,
      net_loss NUMERIC(14,2) DEFAULT 0,
      sales_spend NUMERIC(12,2) DEFAULT 0,
      marketing_spend NUMERIC(12,2) DEFAULT 0,
      r_and_d_spend NUMERIC(12,2) DEFAULT 0,
      g_and_a_spend NUMERIC(12,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, period_month, period_year)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inv_cap_table (
      id SERIAL PRIMARY KEY, tenant_id INT,
      shareholder_name VARCHAR(300),
      shareholder_type VARCHAR(50),
      share_class VARCHAR(50) DEFAULT 'equity',
      shares_held BIGINT DEFAULT 0,
      paid_up_amount NUMERIC(14,2) DEFAULT 0,
      cost_per_share NUMERIC(10,4) DEFAULT 0,
      anti_dilution VARCHAR(30),
      liquidation_preference NUMERIC(5,2) DEFAULT 1.0,
      participation BOOLEAN DEFAULT FALSE,
      voting_rights NUMERIC(5,2) DEFAULT 1.0,
      round VARCHAR(50),
      investment_date DATE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inv_cohort_data (
      id SERIAL PRIMARY KEY, tenant_id INT,
      cohort_month INT, cohort_year INT,
      months_since_acquisition INT,
      customers_at_start INT, active_customers INT,
      revenue NUMERIC(12,2), avg_revenue_per_customer NUMERIC(10,2),
      retention_rate NUMERIC(6,4),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inv_investor_updates (
      id SERIAL PRIMARY KEY, tenant_id INT,
      title VARCHAR(300), period_month INT, period_year INT,
      highlights TEXT, key_metrics JSONB DEFAULT '{}',
      challenges TEXT, asks TEXT,
      next_month_goals TEXT,
      status VARCHAR(20) DEFAULT 'draft',
      sent_at TIMESTAMPTZ, recipients JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

let tablesReady = false;
async function ensureOnce() {
  if (tablesReady) return;
  await ensureTables();
  tablesReady = true;
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

investorRouter.get('/metrics', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const result = await db.execute(sql`
      SELECT * FROM inv_metrics WHERE tenant_id=${t} AND period_month=${month} AND period_year=${year} LIMIT 1
    `);
    res.json(result.rows[0] || null);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

investorRouter.post('/metrics', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const b = req.body;
    const mrr = parseFloat(b.mrr || 0);
    const arr = mrr * 12;
    const net_new_mrr = parseFloat(b.new_mrr || 0) + parseFloat(b.expansion_mrr || 0) - parseFloat(b.churn_mrr || 0) - parseFloat(b.contraction_mrr || 0);
    const ltv = parseFloat(b.ltv || 0);
    const cac = parseFloat(b.cac || 0);
    const ltv_cac_ratio = cac > 0 ? ltv / cac : 0;
    const cash_balance = parseFloat(b.cash_balance || 0);
    const burn_rate = parseFloat(b.burn_rate || 0);
    const runway_months = burn_rate > 0 ? cash_balance / burn_rate : 0;

    const result = await db.execute(sql`
      INSERT INTO inv_metrics (
        tenant_id, period_month, period_year,
        mrr, arr, new_mrr, expansion_mrr, churn_mrr, contraction_mrr, net_new_mrr,
        total_customers, new_customers, churned_customers, customer_churn_rate,
        cac, ltv, ltv_cac_ratio, payback_months,
        cash_balance, burn_rate, runway_months,
        revenue, cogs, gross_profit, gross_margin_pct, ebitda, ebitda_margin_pct, net_loss,
        sales_spend, marketing_spend, r_and_d_spend, g_and_a_spend
      ) VALUES (
        ${t}, ${b.period_month}, ${b.period_year},
        ${mrr}, ${arr}, ${b.new_mrr||0}, ${b.expansion_mrr||0}, ${b.churn_mrr||0}, ${b.contraction_mrr||0}, ${net_new_mrr},
        ${b.total_customers||0}, ${b.new_customers||0}, ${b.churned_customers||0}, ${b.customer_churn_rate||0},
        ${cac}, ${ltv}, ${ltv_cac_ratio}, ${b.payback_months||0},
        ${cash_balance}, ${burn_rate}, ${runway_months},
        ${b.revenue||0}, ${b.cogs||0}, ${b.gross_profit||0}, ${b.gross_margin_pct||0},
        ${b.ebitda||0}, ${b.ebitda_margin_pct||0}, ${b.net_loss||0},
        ${b.sales_spend||0}, ${b.marketing_spend||0}, ${b.r_and_d_spend||0}, ${b.g_and_a_spend||0}
      )
      ON CONFLICT (tenant_id, period_month, period_year) DO UPDATE SET
        mrr=EXCLUDED.mrr, arr=EXCLUDED.arr, new_mrr=EXCLUDED.new_mrr,
        expansion_mrr=EXCLUDED.expansion_mrr, churn_mrr=EXCLUDED.churn_mrr,
        contraction_mrr=EXCLUDED.contraction_mrr, net_new_mrr=EXCLUDED.net_new_mrr,
        total_customers=EXCLUDED.total_customers, new_customers=EXCLUDED.new_customers,
        churned_customers=EXCLUDED.churned_customers, customer_churn_rate=EXCLUDED.customer_churn_rate,
        cac=EXCLUDED.cac, ltv=EXCLUDED.ltv, ltv_cac_ratio=EXCLUDED.ltv_cac_ratio,
        payback_months=EXCLUDED.payback_months, cash_balance=EXCLUDED.cash_balance,
        burn_rate=EXCLUDED.burn_rate, runway_months=EXCLUDED.runway_months,
        revenue=EXCLUDED.revenue, cogs=EXCLUDED.cogs, gross_profit=EXCLUDED.gross_profit,
        gross_margin_pct=EXCLUDED.gross_margin_pct, ebitda=EXCLUDED.ebitda,
        ebitda_margin_pct=EXCLUDED.ebitda_margin_pct, net_loss=EXCLUDED.net_loss,
        sales_spend=EXCLUDED.sales_spend, marketing_spend=EXCLUDED.marketing_spend,
        r_and_d_spend=EXCLUDED.r_and_d_spend, g_and_a_spend=EXCLUDED.g_and_a_spend,
        updated_at=NOW()
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

investorRouter.post('/metrics/auto-calculate', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const { period_month, period_year } = req.body;
    const m = parseInt(period_month);
    const y = parseInt(period_year);

    // Revenue from GL (account 4xxx credits)
    const revenueRes = await db.execute(sql`
      SELECT COALESCE(SUM(jl.credit - jl.debit), 0) as revenue
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      JOIN chart_of_accounts coa ON coa.id = jl.account_id
      WHERE je.tenant_id = ${t}
        AND EXTRACT(MONTH FROM je.entry_date) = ${m}
        AND EXTRACT(YEAR FROM je.entry_date) = ${y}
        AND coa.account_code LIKE '4%'
    `);
    const revenue = parseFloat((revenueRes.rows[0] as any)?.revenue || 0);

    // COGS from GL (account 5xxx debits)
    const cogsRes = await db.execute(sql`
      SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as cogs
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      JOIN chart_of_accounts coa ON coa.id = jl.account_id
      WHERE je.tenant_id = ${t}
        AND EXTRACT(MONTH FROM je.entry_date) = ${m}
        AND EXTRACT(YEAR FROM je.entry_date) = ${y}
        AND coa.account_code LIKE '5%'
    `);
    const cogs = parseFloat((cogsRes.rows[0] as any)?.cogs || 0);

    // OpEx by category
    const opexRes = await db.execute(sql`
      SELECT coa.account_code,
             COALESCE(SUM(jl.debit - jl.credit), 0) as amount
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      JOIN chart_of_accounts coa ON coa.id = jl.account_id
      WHERE je.tenant_id = ${t}
        AND EXTRACT(MONTH FROM je.entry_date) = ${m}
        AND EXTRACT(YEAR FROM je.entry_date) = ${y}
        AND coa.account_code BETWEEN '6000' AND '6999'
      GROUP BY coa.account_code
    `);
    const opexRows = opexRes.rows as any[];
    let sales_spend = 0, marketing_spend = 0, r_and_d_spend = 0, g_and_a_spend = 0;
    for (const r of opexRows) {
      const code = parseInt(r.account_code);
      const amt = parseFloat(r.amount || 0);
      if (code >= 6100 && code <= 6199) sales_spend += amt;
      else if (code >= 6200 && code <= 6299) g_and_a_spend += amt;
      else if (code >= 6300 && code <= 6399) r_and_d_spend += amt;
      else marketing_spend += amt;
    }

    // Cash from GL (accounts 1001-1003)
    const cashRes = await db.execute(sql`
      SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as cash
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      JOIN chart_of_accounts coa ON coa.id = jl.account_id
      WHERE je.tenant_id = ${t}
        AND coa.account_code IN ('1001', '1002', '1003')
    `);
    const cash_balance = parseFloat((cashRes.rows[0] as any)?.cash || 0);

    const gross_profit = revenue - cogs;
    const gross_margin_pct = revenue > 0 ? (gross_profit / revenue) * 100 : 0;
    const total_opex = sales_spend + marketing_spend + r_and_d_spend + g_and_a_spend;
    const ebitda = gross_profit - total_opex;
    const ebitda_margin_pct = revenue > 0 ? (ebitda / revenue) * 100 : 0;
    const net_loss = ebitda < 0 ? Math.abs(ebitda) : 0;

    // Burn rate = avg last 3 months cash outflows
    const burnRes = await db.execute(sql`
      SELECT COALESCE(SUM(jl.credit - jl.debit), 0) / 3 as avg_burn
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      JOIN chart_of_accounts coa ON coa.id = jl.account_id
      WHERE je.tenant_id = ${t}
        AND je.entry_date >= (DATE_TRUNC('month', MAKE_DATE(${y}, ${m}, 1)) - INTERVAL '3 months')
        AND je.entry_date < DATE_TRUNC('month', MAKE_DATE(${y}, ${m}, 1))
        AND coa.account_code IN ('1001', '1002', '1003')
        AND jl.credit > jl.debit
    `);
    const burn_rate = parseFloat((burnRes.rows[0] as any)?.avg_burn || 0);
    const runway_months = burn_rate > 0 ? cash_balance / burn_rate : 0;

    const upsertRes = await db.execute(sql`
      INSERT INTO inv_metrics (
        tenant_id, period_month, period_year,
        revenue, cogs, gross_profit, gross_margin_pct,
        ebitda, ebitda_margin_pct, net_loss,
        sales_spend, marketing_spend, r_and_d_spend, g_and_a_spend,
        cash_balance, burn_rate, runway_months
      ) VALUES (
        ${t}, ${m}, ${y},
        ${revenue}, ${cogs}, ${gross_profit}, ${gross_margin_pct},
        ${ebitda}, ${ebitda_margin_pct}, ${net_loss},
        ${sales_spend}, ${marketing_spend}, ${r_and_d_spend}, ${g_and_a_spend},
        ${cash_balance}, ${burn_rate}, ${runway_months}
      )
      ON CONFLICT (tenant_id, period_month, period_year) DO UPDATE SET
        revenue=EXCLUDED.revenue, cogs=EXCLUDED.cogs, gross_profit=EXCLUDED.gross_profit,
        gross_margin_pct=EXCLUDED.gross_margin_pct, ebitda=EXCLUDED.ebitda,
        ebitda_margin_pct=EXCLUDED.ebitda_margin_pct, net_loss=EXCLUDED.net_loss,
        sales_spend=EXCLUDED.sales_spend, marketing_spend=EXCLUDED.marketing_spend,
        r_and_d_spend=EXCLUDED.r_and_d_spend, g_and_a_spend=EXCLUDED.g_and_a_spend,
        cash_balance=EXCLUDED.cash_balance, burn_rate=EXCLUDED.burn_rate,
        runway_months=EXCLUDED.runway_months, updated_at=NOW()
      RETURNING *
    `);
    res.json({ success: true, metrics: upsertRes.rows[0] });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

investorRouter.get('/metrics/trend', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const months = parseInt(req.query.months as string) || 12;
    const result = await db.execute(sql`
      SELECT * FROM inv_metrics
      WHERE tenant_id = ${t}
      ORDER BY period_year DESC, period_month DESC
      LIMIT ${months}
    `);
    res.json(result.rows.reverse());
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

investorRouter.get('/metrics/ytd', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const result = await db.execute(sql`
      SELECT
        SUM(revenue) as total_revenue,
        SUM(cogs) as total_cogs,
        SUM(gross_profit) as total_gross_profit,
        AVG(gross_margin_pct) as avg_gross_margin_pct,
        SUM(ebitda) as total_ebitda,
        AVG(ebitda_margin_pct) as avg_ebitda_margin_pct,
        MAX(arr) as latest_arr,
        MAX(mrr) as latest_mrr,
        SUM(net_new_mrr) as total_net_new_mrr,
        SUM(new_customers) as total_new_customers,
        SUM(churned_customers) as total_churned_customers,
        MAX(cash_balance) as latest_cash_balance,
        AVG(burn_rate) as avg_burn_rate,
        MIN(runway_months) as min_runway
      FROM inv_metrics
      WHERE tenant_id = ${t} AND period_year = ${year}
    `);
    res.json(result.rows[0] || {});
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── EBITDA Bridge ────────────────────────────────────────────────────────────

investorRouter.get('/ebitda-bridge', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const priorMonth = month === 1 ? 12 : month - 1;
    const priorYear = month === 1 ? year - 1 : year;

    const [cur, prior] = await Promise.all([
      db.execute(sql`SELECT * FROM inv_metrics WHERE tenant_id=${t} AND period_month=${month} AND period_year=${year} LIMIT 1`),
      db.execute(sql`SELECT * FROM inv_metrics WHERE tenant_id=${t} AND period_month=${priorMonth} AND period_year=${priorYear} LIMIT 1`),
    ]);

    const c = (cur.rows[0] as any) || {};
    const p = (prior.rows[0] as any) || {};

    const revenue_change = parseFloat(c.revenue || 0) - parseFloat(p.revenue || 0);
    const cogs_change = parseFloat(p.cogs || 0) - parseFloat(c.cogs || 0);
    const opex_change = (parseFloat(p.sales_spend || 0) + parseFloat(p.marketing_spend || 0) + parseFloat(p.r_and_d_spend || 0) + parseFloat(p.g_and_a_spend || 0))
      - (parseFloat(c.sales_spend || 0) + parseFloat(c.marketing_spend || 0) + parseFloat(c.r_and_d_spend || 0) + parseFloat(c.g_and_a_spend || 0));

    const bridge_items = [
      { label: 'Revenue growth', amount: revenue_change, is_positive: revenue_change >= 0 },
      { label: 'COGS reduction', amount: cogs_change, is_positive: cogs_change >= 0 },
      { label: 'S&M spend change', amount: parseFloat(p.sales_spend || 0) - parseFloat(c.sales_spend || 0), is_positive: parseFloat(p.sales_spend || 0) >= parseFloat(c.sales_spend || 0) },
      { label: 'R&D spend change', amount: parseFloat(p.r_and_d_spend || 0) - parseFloat(c.r_and_d_spend || 0), is_positive: parseFloat(p.r_and_d_spend || 0) >= parseFloat(c.r_and_d_spend || 0) },
      { label: 'G&A spend change', amount: parseFloat(p.g_and_a_spend || 0) - parseFloat(c.g_and_a_spend || 0), is_positive: parseFloat(p.g_and_a_spend || 0) >= parseFloat(c.g_and_a_spend || 0) },
    ];

    res.json({
      prior_ebitda: parseFloat(p.ebitda || 0),
      revenue_change,
      cogs_change,
      opex_change,
      current_ebitda: parseFloat(c.ebitda || 0),
      bridge_items,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── MRR / ARR ────────────────────────────────────────────────────────────────

investorRouter.get('/mrr/waterfall', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const months = parseInt(req.query.months as string) || 6;
    const result = await db.execute(sql`
      SELECT period_month, period_year, mrr, new_mrr, expansion_mrr, churn_mrr, contraction_mrr,
             customer_churn_rate
      FROM inv_metrics
      WHERE tenant_id = ${t}
      ORDER BY period_year DESC, period_month DESC
      LIMIT ${months}
    `);
    const rows = result.rows.reverse() as any[];
    const periods = rows.map((r, i) => {
      const prev_mrr = i > 0 ? parseFloat(rows[i-1].mrr || 0) : 0;
      return {
        month: r.period_month,
        year: r.period_year,
        opening_mrr: prev_mrr,
        new_mrr: parseFloat(r.new_mrr || 0),
        expansion_mrr: parseFloat(r.expansion_mrr || 0),
        churn_mrr: parseFloat(r.churn_mrr || 0),
        contraction_mrr: parseFloat(r.contraction_mrr || 0),
        closing_mrr: parseFloat(r.mrr || 0),
        net_churn_rate: parseFloat(r.customer_churn_rate || 0),
      };
    });
    res.json({ periods });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

investorRouter.get('/arr/trend', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const result = await db.execute(sql`
      SELECT period_month, period_year, arr, mrr
      FROM inv_metrics
      WHERE tenant_id = ${t}
      ORDER BY period_year ASC, period_month ASC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Cohort Analysis ──────────────────────────────────────────────────────────

investorRouter.post('/cohorts/calculate', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const { cohort_month, cohort_year } = req.body;
    const cm = parseInt(cohort_month);
    const cy = parseInt(cohort_year);

    // Count customers acquired in cohort month from CRM
    const startRes = await db.execute(sql`
      SELECT COUNT(*) as cnt
      FROM crm_contacts
      WHERE tenant_id = ${t}
        AND EXTRACT(MONTH FROM created_at) = ${cm}
        AND EXTRACT(YEAR FROM created_at) = ${cy}
    `).catch(() => ({ rows: [{ cnt: 0 }] }));
    const customers_at_start = parseInt((startRes.rows[0] as any)?.cnt || 0);

    // For each subsequent month up to now, calculate retention
    const now = new Date();
    const cohortDate = new Date(cy, cm - 1, 1);
    const monthsToCalc = Math.min(
      Math.floor((now.getTime() - cohortDate.getTime()) / (1000 * 60 * 60 * 24 * 30)),
      24
    );

    const insertedRows = [];
    for (let offset = 0; offset <= monthsToCalc; offset++) {
      const targetDate = new Date(cy, cm - 1 + offset, 1);
      const targetMonth = targetDate.getMonth() + 1;
      const targetYear = targetDate.getFullYear();

      // Revenue for this cohort in this month (from invoices if available)
      const revRes = await db.execute(sql`
        SELECT COALESCE(SUM(total_amount), 0) as rev, COUNT(DISTINCT customer_id) as active_cnt
        FROM invoices
        WHERE tenant_id = ${t}
          AND EXTRACT(MONTH FROM invoice_date) = ${targetMonth}
          AND EXTRACT(YEAR FROM invoice_date) = ${targetYear}
          AND customer_id IN (
            SELECT id FROM crm_contacts
            WHERE tenant_id = ${t}
              AND EXTRACT(MONTH FROM created_at) = ${cm}
              AND EXTRACT(YEAR FROM created_at) = ${cy}
          )
      `).catch(() => ({ rows: [{ rev: 0, active_cnt: 0 }] }));

      const row = revRes.rows[0] as any;
      const active_customers = parseInt(row?.active_cnt || 0);
      const revenue = parseFloat(row?.rev || 0);
      const avg_revenue_per_customer = active_customers > 0 ? revenue / active_customers : 0;
      const retention_rate = customers_at_start > 0 ? active_customers / customers_at_start : 0;

      await db.execute(sql`
        INSERT INTO inv_cohort_data (
          tenant_id, cohort_month, cohort_year, months_since_acquisition,
          customers_at_start, active_customers, revenue, avg_revenue_per_customer, retention_rate
        ) VALUES (
          ${t}, ${cm}, ${cy}, ${offset},
          ${customers_at_start}, ${active_customers}, ${revenue}, ${avg_revenue_per_customer}, ${retention_rate}
        )
        ON CONFLICT DO NOTHING
      `);
      insertedRows.push({ months_since_acquisition: offset, active_customers, retention_rate });
    }

    res.json({ success: true, cohort_month: cm, cohort_year: cy, customers_at_start, data: insertedRows });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

investorRouter.get('/cohorts/table', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const result = await db.execute(sql`
      SELECT cohort_month, cohort_year, months_since_acquisition,
             customers_at_start, active_customers, retention_rate
      FROM inv_cohort_data
      WHERE tenant_id = ${t}
      ORDER BY cohort_year ASC, cohort_month ASC, months_since_acquisition ASC
    `);
    // Build matrix
    const matrix: Record<string, any> = {};
    for (const row of result.rows as any[]) {
      const key = `${row.cohort_year}-${String(row.cohort_month).padStart(2,'0')}`;
      if (!matrix[key]) matrix[key] = { cohort: key, customers_at_start: row.customers_at_start, months: {} };
      matrix[key].months[row.months_since_acquisition] = parseFloat(row.retention_rate || 0);
    }
    res.json(Object.values(matrix));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

investorRouter.get('/cohorts/ltv', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const cm = parseInt(req.query.cohort_month as string) || 1;
    const cy = parseInt(req.query.cohort_year as string) || new Date().getFullYear();
    const result = await db.execute(sql`
      SELECT months_since_acquisition,
             avg_revenue_per_customer,
             SUM(avg_revenue_per_customer) OVER (ORDER BY months_since_acquisition) as cumulative_ltv
      FROM inv_cohort_data
      WHERE tenant_id = ${t} AND cohort_month = ${cm} AND cohort_year = ${cy}
      ORDER BY months_since_acquisition ASC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Cap Table ────────────────────────────────────────────────────────────────

investorRouter.get('/cap-table', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const result = await db.execute(sql`
      SELECT * FROM inv_cap_table WHERE tenant_id = ${t} AND is_active = true ORDER BY shares_held DESC
    `);
    const rows = result.rows as any[];
    const totalShares = rows.reduce((s, r) => s + parseInt(r.shares_held || 0), 0);
    const esopShares = rows.filter(r => r.share_class === 'esop').reduce((s, r) => s + parseInt(r.shares_held || 0), 0);
    const fullyDiluted = totalShares;
    const withPct = rows.map(r => ({
      ...r,
      ownership_pct: totalShares > 0 ? (parseInt(r.shares_held) / totalShares * 100).toFixed(4) : '0',
      diluted_pct: fullyDiluted > 0 ? (parseInt(r.shares_held) / fullyDiluted * 100).toFixed(4) : '0',
    }));
    res.json({ shareholders: withPct, total_shares: totalShares, esop_pool_shares: esopShares });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

investorRouter.post('/cap-table', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const b = req.body;
    const result = await db.execute(sql`
      INSERT INTO inv_cap_table (
        tenant_id, shareholder_name, shareholder_type, share_class, shares_held,
        paid_up_amount, cost_per_share, anti_dilution, liquidation_preference,
        participation, voting_rights, round, investment_date, is_active
      ) VALUES (
        ${t}, ${b.shareholder_name}, ${b.shareholder_type}, ${b.share_class || 'equity'}, ${b.shares_held || 0},
        ${b.paid_up_amount || 0}, ${b.cost_per_share || 0}, ${b.anti_dilution || null}, ${b.liquidation_preference || 1.0},
        ${b.participation || false}, ${b.voting_rights || 1.0}, ${b.round || null}, ${b.investment_date || null}, true
      ) RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

investorRouter.put('/cap-table/:id', requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const { id } = req.params;
    const b = req.body;
    const result = await db.execute(sql`
      UPDATE inv_cap_table SET
        shareholder_name = COALESCE(${b.shareholder_name || null}, shareholder_name),
        shareholder_type = COALESCE(${b.shareholder_type || null}, shareholder_type),
        share_class = COALESCE(${b.share_class || null}, share_class),
        shares_held = COALESCE(${b.shares_held ?? null}, shares_held),
        paid_up_amount = COALESCE(${b.paid_up_amount ?? null}, paid_up_amount),
        cost_per_share = COALESCE(${b.cost_per_share ?? null}, cost_per_share),
        anti_dilution = COALESCE(${b.anti_dilution || null}, anti_dilution),
        liquidation_preference = COALESCE(${b.liquidation_preference ?? null}, liquidation_preference),
        participation = COALESCE(${b.participation ?? null}, participation),
        voting_rights = COALESCE(${b.voting_rights ?? null}, voting_rights),
        round = COALESCE(${b.round || null}, round),
        investment_date = COALESCE(${b.investment_date || null}, investment_date),
        is_active = COALESCE(${b.is_active ?? null}, is_active)
      WHERE id = ${parseInt(id)} AND tenant_id = ${t}
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

investorRouter.get('/cap-table/summary', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const result = await db.execute(sql`
      SELECT
        SUM(shares_held) as total_shares,
        SUM(CASE WHEN shareholder_type = 'founder' THEN shares_held ELSE 0 END) as founder_shares,
        SUM(CASE WHEN shareholder_type IN ('vc','pe','angel') THEN shares_held ELSE 0 END) as investor_shares,
        SUM(CASE WHEN share_class = 'esop' OR shareholder_type = 'employee' THEN shares_held ELSE 0 END) as esop_shares
      FROM inv_cap_table
      WHERE tenant_id = ${t} AND is_active = true
    `);
    const r = result.rows[0] as any;
    const total = parseInt(r?.total_shares || 0);
    res.json({
      total_shares: total,
      fully_diluted_shares: total,
      founder_pct: total > 0 ? (parseInt(r.founder_shares || 0) / total * 100).toFixed(2) : '0',
      investor_pct: total > 0 ? (parseInt(r.investor_shares || 0) / total * 100).toFixed(2) : '0',
      esop_pct: total > 0 ? (parseInt(r.esop_shares || 0) / total * 100).toFixed(2) : '0',
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

investorRouter.post('/cap-table/dilution-model', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const { new_shares, new_investor_name, investment_amount, pre_money_valuation } = req.body;
    const existing = await db.execute(sql`
      SELECT * FROM inv_cap_table WHERE tenant_id = ${t} AND is_active = true ORDER BY shares_held DESC
    `);
    const rows = existing.rows as any[];
    const existingTotal = rows.reduce((s, r) => s + parseInt(r.shares_held || 0), 0);
    const newSharesInt = parseInt(new_shares || 0);
    const postTotal = existingTotal + newSharesInt;
    const post_money = parseFloat(pre_money_valuation || 0) + parseFloat(investment_amount || 0);
    const price_per_share = newSharesInt > 0 ? parseFloat(investment_amount || 0) / newSharesInt : 0;

    const before = rows.map(r => ({
      name: r.shareholder_name,
      shares: parseInt(r.shares_held),
      ownership_pct_before: existingTotal > 0 ? (parseInt(r.shares_held) / existingTotal * 100).toFixed(2) : '0',
      ownership_pct_after: postTotal > 0 ? (parseInt(r.shares_held) / postTotal * 100).toFixed(2) : '0',
    }));

    res.json({
      pre_money_valuation: parseFloat(pre_money_valuation || 0),
      post_money_valuation: post_money,
      price_per_share,
      existing_shares: existingTotal,
      new_shares: newSharesInt,
      total_shares_post: postTotal,
      new_investor: {
        name: new_investor_name,
        shares: newSharesInt,
        ownership_pct_after: postTotal > 0 ? (newSharesInt / postTotal * 100).toFixed(2) : '0',
        investment_amount: parseFloat(investment_amount || 0),
      },
      existing_shareholders: before,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Investor Updates ─────────────────────────────────────────────────────────

investorRouter.get('/updates', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const result = await db.execute(sql`
      SELECT * FROM inv_investor_updates WHERE tenant_id = ${t} ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

investorRouter.post('/updates', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const b = req.body;
    const result = await db.execute(sql`
      INSERT INTO inv_investor_updates (
        tenant_id, title, period_month, period_year,
        highlights, key_metrics, challenges, asks, next_month_goals, status, recipients
      ) VALUES (
        ${t}, ${b.title}, ${b.period_month}, ${b.period_year},
        ${b.highlights || null}, ${JSON.stringify(b.key_metrics || {})}::jsonb,
        ${b.challenges || null}, ${b.asks || null}, ${b.next_month_goals || null},
        'draft', ${JSON.stringify(b.recipients || [])}::jsonb
      ) RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

investorRouter.put('/updates/:id', requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const { id } = req.params;
    const b = req.body;
    const result = await db.execute(sql`
      UPDATE inv_investor_updates SET
        title = COALESCE(${b.title || null}, title),
        highlights = COALESCE(${b.highlights || null}, highlights),
        key_metrics = COALESCE(${b.key_metrics ? JSON.stringify(b.key_metrics) : null}::jsonb, key_metrics),
        challenges = COALESCE(${b.challenges || null}, challenges),
        asks = COALESCE(${b.asks || null}, asks),
        next_month_goals = COALESCE(${b.next_month_goals || null}, next_month_goals)
      WHERE id = ${parseInt(id)} AND tenant_id = ${t}
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

investorRouter.post('/updates/:id/send', requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const { id } = req.params;
    const result = await db.execute(sql`
      UPDATE inv_investor_updates
      SET status = 'sent', sent_at = NOW()
      WHERE id = ${parseInt(id)} AND tenant_id = ${t}
      RETURNING *
    `);
    res.json({ success: true, update: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Runway & Burn ────────────────────────────────────────────────────────────

investorRouter.get('/runway', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const cashRes = await db.execute(sql`
      SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as cash
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      JOIN chart_of_accounts coa ON coa.id = jl.account_id
      WHERE je.tenant_id = ${t} AND coa.account_code IN ('1001', '1002', '1003')
    `).catch(() => ({ rows: [{ cash: 0 }] }));
    const cash_balance = parseFloat((cashRes.rows[0] as any)?.cash || 0);

    const burnRes = await db.execute(sql`
      SELECT COALESCE(AVG(monthly_burn), 0) as avg_burn
      FROM (
        SELECT EXTRACT(YEAR FROM je.entry_date) as y, EXTRACT(MONTH FROM je.entry_date) as m,
               SUM(jl.credit - jl.debit) as monthly_burn
        FROM journal_lines jl
        JOIN journal_entries je ON je.id = jl.journal_entry_id
        JOIN chart_of_accounts coa ON coa.id = jl.account_id
        WHERE je.tenant_id = ${t}
          AND coa.account_code IN ('1001', '1002', '1003')
          AND jl.credit > jl.debit
          AND je.entry_date >= NOW() - INTERVAL '3 months'
        GROUP BY y, m
      ) sub
    `).catch(() => ({ rows: [{ avg_burn: 0 }] }));
    const avg_monthly_burn = parseFloat((burnRes.rows[0] as any)?.avg_burn || 0);
    const runway_months = avg_monthly_burn > 0 ? cash_balance / avg_monthly_burn : 0;
    const critical_date = avg_monthly_burn > 0
      ? new Date(Date.now() + runway_months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null;

    res.json({ cash_balance, avg_monthly_burn, runway_months, critical_date });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

investorRouter.get('/burn-breakdown', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const result = await db.execute(sql`
      SELECT coa.account_code,
             COALESCE(SUM(jl.debit - jl.credit), 0) as amount
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      JOIN chart_of_accounts coa ON coa.id = jl.account_id
      WHERE je.tenant_id = ${t}
        AND EXTRACT(MONTH FROM je.entry_date) = ${month}
        AND EXTRACT(YEAR FROM je.entry_date) = ${year}
        AND coa.account_code BETWEEN '6000' AND '6999'
      GROUP BY coa.account_code
    `).catch(() => ({ rows: [] }));

    const categoryMap: Record<string, number> = { 'S&M': 0, 'G&A': 0, 'R&D': 0, 'Other OpEx': 0 };
    for (const r of result.rows as any[]) {
      const code = parseInt(r.account_code);
      const amt = parseFloat(r.amount || 0);
      if (code >= 6100 && code <= 6199) categoryMap['S&M'] += amt;
      else if (code >= 6200 && code <= 6299) categoryMap['G&A'] += amt;
      else if (code >= 6300 && code <= 6399) categoryMap['R&D'] += amt;
      else categoryMap['Other OpEx'] += amt;
    }
    const total = Object.values(categoryMap).reduce((s, v) => s + v, 0);
    const breakdown = Object.entries(categoryMap).map(([category, amount]) => ({
      category,
      amount,
      pct_of_burn: total > 0 ? (amount / total * 100).toFixed(2) : '0',
    }));
    res.json({ month, year, total_burn: total, breakdown });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Investor Pack PDF ────────────────────────────────────────────────────────

investorRouter.get('/pack/pdf', requireAuth, async (req: any, res) => {
  try {
    await ensureOnce();
    const t = tid(req);
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const [metrics, capTable] = await Promise.all([
      db.execute(sql`SELECT * FROM inv_metrics WHERE tenant_id=${t} AND period_month=${month} AND period_year=${year} LIMIT 1`),
      db.execute(sql`SELECT * FROM inv_cap_table WHERE tenant_id=${t} AND is_active=true ORDER BY shares_held DESC`),
    ]);

    const m = metrics.rows[0] as any || {};

    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    doc.on('data', (c: Buffer) => chunks.push(c));

    // Cover page
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#1e3a5f').text('Investor Update', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).font('Helvetica').fillColor('#374151').text(`${monthNames[month-1]} ${year}`, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(12).fillColor('#6b7280').text('CONFIDENTIAL — NOT FOR DISTRIBUTION', { align: 'center' });
    doc.addPage();

    // Key metrics
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#111827').text('Key Metrics');
    doc.moveDown(0.5);
    const formatINR = (v: any) => `₹${Math.round(parseFloat(String(v || 0)) / 100000).toLocaleString('en-IN')}L`;
    const fmtPct = (v: any) => `${parseFloat(String(v || 0)).toFixed(1)}%`;

    const kvPairs: [string, string][] = [
      ['ARR', `₹${Math.round(parseFloat(String(m.arr || 0)) / 100000).toLocaleString('en-IN')}L`],
      ['MRR', `₹${Math.round(parseFloat(String(m.mrr || 0)) / 100000).toLocaleString('en-IN')}L`],
      ['Gross Margin', fmtPct(m.gross_margin_pct)],
      ['EBITDA Margin', fmtPct(m.ebitda_margin_pct)],
      ['Cash Balance', formatINR(m.cash_balance)],
      ['Runway', `${parseFloat(String(m.runway_months || 0)).toFixed(1)} months`],
      ['Total Customers', String(m.total_customers || 0)],
      ['LTV:CAC', `${parseFloat(String(m.ltv_cac_ratio || 0)).toFixed(1)}x`],
    ];
    kvPairs.forEach(([k, v]) => {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#374151').text(k + ': ', { continued: true })
         .font('Helvetica').fillColor('#111827').text(v);
    });

    doc.addPage();
    // P&L Summary
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#111827').text('P&L Summary');
    doc.moveDown(0.5);
    const plLines: [string, any][] = [
      ['Revenue', m.revenue],
      ['COGS', m.cogs],
      ['Gross Profit', m.gross_profit],
      ['EBITDA', m.ebitda],
      ['Net Profit / (Loss)', m.net_loss ? `-${m.net_loss}` : m.ebitda],
    ];
    plLines.forEach(([k, v]) => {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#374151').text(String(k) + ': ', { continued: true })
         .font('Helvetica').fillColor('#111827').text(formatINR(String(parseFloat(String(v || 0)))));
    });

    // Cap table page
    if (capTable.rows.length > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#111827').text('Cap Table Summary');
      doc.moveDown(0.5);
      const totalShares = (capTable.rows as any[]).reduce((s, r) => s + parseInt(r.shares_held || 0), 0);
      (capTable.rows as any[]).forEach(row => {
        const pct = totalShares > 0 ? (parseInt(row.shares_held) / totalShares * 100).toFixed(2) : '0';
        doc.fontSize(10).fillColor('#374151').text(
          `${row.shareholder_name} (${row.share_class}): ${parseInt(row.shares_held).toLocaleString()} shares — ${pct}%`
        );
      });
    }

    // Page numbers
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#9ca3af').text(
        `Confidential | Page ${i + 1} of ${range.count}`,
        50,
        doc.page.height - 30,
        { align: 'center' }
      );
    }

    doc.end();
    doc.on('end', () => {
      const buf = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="investor-pack-${monthNames[month-1]}-${year}.pdf"`);
      res.send(buf);
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});
