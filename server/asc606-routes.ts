import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

export const asc606Router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
};
const tid = (req: any): number => req.session?.tenantId ?? req.user?.tenantId ?? 1;

// ── Table bootstrap ──────────────────────────────────────────────────────────
async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS asc606_arrangements (
      id SERIAL PRIMARY KEY, tenant_id INT,
      arrangement_no VARCHAR(100), customer_name VARCHAR(300), customer_id INT,
      contract_date DATE, description TEXT,
      total_arrangement_value NUMERIC(14,2),
      standard VARCHAR(10) DEFAULT 'ASC606',
      step1_identified BOOLEAN DEFAULT FALSE,
      step2_identified BOOLEAN DEFAULT FALSE,
      step3_determined BOOLEAN DEFAULT FALSE,
      step4_allocated BOOLEAN DEFAULT FALSE,
      step5_complete BOOLEAN DEFAULT FALSE,
      total_recognized NUMERIC(14,2) DEFAULT 0,
      total_deferred NUMERIC(14,2) DEFAULT 0,
      contract_asset NUMERIC(12,2) DEFAULT 0,
      contract_liability NUMERIC(12,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      modification_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS asc606_performance_obligations (
      id SERIAL PRIMARY KEY, tenant_id INT, arrangement_id INT,
      name VARCHAR(300), description TEXT,
      pob_type VARCHAR(50),
      is_distinct BOOLEAN DEFAULT TRUE,
      standalone_selling_price NUMERIC(12,2),
      allocated_transaction_price NUMERIC(12,2),
      recognition_method VARCHAR(30),
      start_date DATE, end_date DATE,
      milestones JSONB DEFAULT '[]',
      units_total INT, units_delivered INT DEFAULT 0,
      completion_pct NUMERIC(5,2) DEFAULT 0,
      revenue_recognized NUMERIC(12,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'not_started',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS asc606_revenue_schedules (
      id SERIAL PRIMARY KEY, tenant_id INT, arrangement_id INT, pob_id INT,
      recognition_date DATE, amount NUMERIC(12,2),
      gl_posted BOOLEAN DEFAULT FALSE, journal_id INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS asc606_ssp_library (
      id SERIAL PRIMARY KEY, tenant_id INT,
      product_name VARCHAR(300), pob_type VARCHAR(50),
      ssp_method VARCHAR(50),
      ssp_amount NUMERIC(12,2), currency VARCHAR(3) DEFAULT 'USD',
      effective_from DATE, effective_to DATE,
      notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

let tablesReady = false;
async function bootstrap() {
  if (tablesReady) return;
  await ensureTables();
  tablesReady = true;
}

// ── GL fire-and-forget ───────────────────────────────────────────────────────
function postGL(tenantId: number, memo: string, lines: { account: string; debit?: number; credit?: number }[]) {
  db.execute(sql`
    INSERT INTO journal_entries (tenant_id, memo, entry_date, status, created_at)
    VALUES (${tenantId}, ${memo}, NOW(), 'posted', NOW())
    RETURNING id
  `).then((r: any) => {
    const jid = r.rows?.[0]?.id;
    if (!jid) return;
    for (const ln of lines) {
      db.execute(sql`
        INSERT INTO journal_lines (journal_id, account_code, debit, credit)
        VALUES (${jid}, ${ln.account}, ${ln.debit ?? 0}, ${ln.credit ?? 0})
      `).catch(() => {});
    }
  }).catch(() => {});
}

// ── Helper: refresh arrangement totals ──────────────────────────────────────
async function refreshArrangementTotals(arrId: number, tenantId: number) {
  await db.execute(sql`
    UPDATE asc606_arrangements SET
      total_recognized = (
        SELECT COALESCE(SUM(revenue_recognized),0) FROM asc606_performance_obligations
        WHERE arrangement_id=${arrId} AND tenant_id=${tenantId}
      ),
      updated_at = NOW()
    WHERE id=${arrId} AND tenant_id=${tenantId}
  `);
  const allRes = await db.execute(sql`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as done
    FROM asc606_performance_obligations WHERE arrangement_id=${arrId} AND tenant_id=${tenantId}
  `);
  const row = (allRes.rows as any[])[0];
  if (row && row.total > 0 && row.total === row.done) {
    await db.execute(sql`
      UPDATE asc606_arrangements SET step5_complete=true, status='completed', updated_at=NOW()
      WHERE id=${arrId} AND tenant_id=${tenantId}
    `);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SSP LIBRARY
// ════════════════════════════════════════════════════════════════════════════
asc606Router.get("/ssp-library", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const rows = await db.execute(sql`SELECT * FROM asc606_ssp_library WHERE tenant_id=${t} ORDER BY id DESC`);
  res.json(rows.rows);
});

asc606Router.post("/ssp-library", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const { product_name, pob_type, ssp_method, ssp_amount, currency, effective_from, effective_to, notes } = req.body;
  const r = await db.execute(sql`
    INSERT INTO asc606_ssp_library (tenant_id, product_name, pob_type, ssp_method, ssp_amount, currency, effective_from, effective_to, notes)
    VALUES (${t}, ${product_name}, ${pob_type ?? null}, ${ssp_method ?? null}, ${ssp_amount}, ${currency ?? 'USD'}, ${effective_from ?? null}, ${effective_to ?? null}, ${notes ?? null})
    RETURNING *`);
  res.json(r.rows[0]);
});

asc606Router.put("/ssp-library/:id", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const { product_name, pob_type, ssp_method, ssp_amount, currency, effective_from, effective_to, notes } = req.body;
  const r = await db.execute(sql`
    UPDATE asc606_ssp_library SET product_name=${product_name}, pob_type=${pob_type ?? null},
      ssp_method=${ssp_method ?? null}, ssp_amount=${ssp_amount}, currency=${currency ?? 'USD'},
      effective_from=${effective_from ?? null}, effective_to=${effective_to ?? null}, notes=${notes ?? null}
    WHERE id=${Number(req.params.id)} AND tenant_id=${t} RETURNING *`);
  res.json(r.rows[0] ?? { message: "Not found" });
});

asc606Router.get("/ssp-library/lookup", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const product = `%${req.query.product ?? ''}%`;
  const r = await db.execute(sql`
    SELECT * FROM asc606_ssp_library WHERE tenant_id=${t} AND product_name ILIKE ${product} ORDER BY created_at DESC LIMIT 10`);
  res.json(r.rows);
});

// ════════════════════════════════════════════════════════════════════════════
// ARRANGEMENTS (Steps 1-4)
// ════════════════════════════════════════════════════════════════════════════
asc606Router.get("/arrangements", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const rows = await db.execute(sql`SELECT * FROM asc606_arrangements WHERE tenant_id=${t} ORDER BY id DESC`);
  res.json(rows.rows);
});

asc606Router.post("/arrangements", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const { arrangement_no, customer_name, customer_id, contract_date, description, total_arrangement_value, standard } = req.body;
  const r = await db.execute(sql`
    INSERT INTO asc606_arrangements (tenant_id, arrangement_no, customer_name, customer_id, contract_date, description, total_arrangement_value, standard, step1_identified)
    VALUES (${t}, ${arrangement_no ?? null}, ${customer_name}, ${customer_id ?? null}, ${contract_date ?? null}, ${description ?? null}, ${total_arrangement_value}, ${standard ?? 'ASC606'}, true)
    RETURNING *`);
  res.json(r.rows[0]);
});

asc606Router.get("/arrangements/:id", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const id = Number(req.params.id);
  const [arr, pobs, schedules] = await Promise.all([
    db.execute(sql`SELECT * FROM asc606_arrangements WHERE id=${id} AND tenant_id=${t}`),
    db.execute(sql`SELECT * FROM asc606_performance_obligations WHERE arrangement_id=${id} AND tenant_id=${t} ORDER BY id`),
    db.execute(sql`SELECT * FROM asc606_revenue_schedules WHERE arrangement_id=${id} AND tenant_id=${t} ORDER BY recognition_date`),
  ]);
  if (!arr.rows[0]) return res.status(404).json({ message: "Not found" });
  res.json({ arrangement: arr.rows[0], pobs: pobs.rows, schedules: schedules.rows });
});

asc606Router.put("/arrangements/:id", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const { customer_name, description, total_arrangement_value, status } = req.body;
  const r = await db.execute(sql`
    UPDATE asc606_arrangements SET customer_name=${customer_name ?? null}, description=${description ?? null},
      total_arrangement_value=${total_arrangement_value ?? null}, status=${status ?? 'active'}, updated_at=NOW()
    WHERE id=${Number(req.params.id)} AND tenant_id=${t} RETURNING *`);
  res.json(r.rows[0] ?? { message: "Not found" });
});

// ── Step 2: Add POB ──────────────────────────────────────────────────────────
asc606Router.post("/arrangements/:id/pobs", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const arrId = Number(req.params.id);
  const { name, description, pob_type, is_distinct, standalone_selling_price, recognition_method, start_date, end_date, milestones, units_total } = req.body;
  const r = await db.execute(sql`
    INSERT INTO asc606_performance_obligations (tenant_id, arrangement_id, name, description, pob_type, is_distinct, standalone_selling_price, recognition_method, start_date, end_date, milestones, units_total)
    VALUES (${t}, ${arrId}, ${name}, ${description ?? null}, ${pob_type ?? null}, ${is_distinct !== false}, ${standalone_selling_price ?? null}, ${recognition_method ?? 'point_in_time'}, ${start_date ?? null}, ${end_date ?? null}, ${JSON.stringify(milestones ?? [])}::jsonb, ${units_total ?? null})
    RETURNING *`);
  // Check if all POBs have SSP — mark step2
  const check = await db.execute(sql`
    SELECT COUNT(*) as total, SUM(CASE WHEN standalone_selling_price IS NOT NULL THEN 1 ELSE 0 END) as has_ssp
    FROM asc606_performance_obligations WHERE arrangement_id=${arrId} AND tenant_id=${t}`);
  const cr = (check.rows as any[])[0];
  if (cr && cr.total > 0 && Number(cr.total) === Number(cr.has_ssp)) {
    await db.execute(sql`UPDATE asc606_arrangements SET step2_identified=true, updated_at=NOW() WHERE id=${arrId} AND tenant_id=${t}`);
  }
  res.json(r.rows[0]);
});

// ── Steps 3+4: Allocate transaction price ───────────────────────────────────
asc606Router.post("/arrangements/:id/allocate", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const arrId = Number(req.params.id);
  const arr = await db.execute(sql`SELECT * FROM asc606_arrangements WHERE id=${arrId} AND tenant_id=${t}`);
  if (!arr.rows[0]) return res.status(404).json({ message: "Arrangement not found" });
  const arrangement = arr.rows[0] as any;
  const totalValue = Number(arrangement.total_arrangement_value);
  const pobs = await db.execute(sql`SELECT * FROM asc606_performance_obligations WHERE arrangement_id=${arrId} AND tenant_id=${t}`);
  const pobList = pobs.rows as any[];
  if (!pobList.length) return res.status(400).json({ message: "No POBs found" });

  const withSSP = pobList.filter(p => p.standalone_selling_price != null);
  const withoutSSP = pobList.filter(p => p.standalone_selling_price == null);
  if (withoutSSP.length > 1) return res.status(400).json({ message: "Residual approach only supports one POB without SSP" });

  const totalSSP = withSSP.reduce((s: number, p: any) => s + Number(p.standalone_selling_price), 0);
  const residualAmount = withoutSSP.length === 1 ? totalValue - withSSP.reduce((s: number, p: any) => s + (Number(p.standalone_selling_price) / totalSSP) * totalValue, 0) : 0;

  const result: any[] = [];
  for (const pob of pobList) {
    let allocated: number;
    if (pob.standalone_selling_price == null) {
      allocated = residualAmount;
    } else {
      allocated = totalSSP > 0 ? (Number(pob.standalone_selling_price) / totalSSP) * totalValue : 0;
    }
    const pct = totalValue > 0 ? (allocated / totalValue) * 100 : 0;
    await db.execute(sql`UPDATE asc606_performance_obligations SET allocated_transaction_price=${allocated} WHERE id=${pob.id} AND tenant_id=${t}`);
    result.push({ id: pob.id, name: pob.name, ssp: pob.standalone_selling_price, allocation_pct: pct.toFixed(4), allocated_amount: allocated });
  }
  await db.execute(sql`UPDATE asc606_arrangements SET step3_determined=true, step4_allocated=true, updated_at=NOW() WHERE id=${arrId} AND tenant_id=${t}`);
  res.json({ pobs: result });
});

// ════════════════════════════════════════════════════════════════════════════
// Step 5: Recognize Revenue
// ════════════════════════════════════════════════════════════════════════════
asc606Router.post("/arrangements/:id/pobs/:pobId/recognize", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const arrId = Number(req.params.id);
  const pobId = Number(req.params.pobId);
  const pob = await db.execute(sql`SELECT * FROM asc606_performance_obligations WHERE id=${pobId} AND arrangement_id=${arrId} AND tenant_id=${t}`);
  if (!pob.rows[0]) return res.status(404).json({ message: "POB not found" });
  const p = pob.rows[0] as any;
  const allocated = Number(p.allocated_transaction_price ?? 0);
  const alreadyRecognized = Number(p.revenue_recognized ?? 0);
  let newRecognized = alreadyRecognized;
  let recognitionDate = new Date().toISOString().split('T')[0];
  let method = p.recognition_method;

  if (method === 'point_in_time') {
    recognitionDate = req.body.recognized_date ?? recognitionDate;
    newRecognized = allocated;
  } else if (method === 'over_time_straight_line') {
    const asOf = new Date(req.body.as_of_date ?? Date.now());
    const start = new Date(p.start_date);
    const end = new Date(p.end_date);
    const totalDays = Math.max((end.getTime() - start.getTime()) / 86400000, 1);
    const elapsed = Math.min(Math.max((asOf.getTime() - start.getTime()) / 86400000, 0), totalDays);
    newRecognized = allocated * (elapsed / totalDays);
    recognitionDate = req.body.as_of_date ?? recognitionDate;
  } else if (method === 'over_time_percentage') {
    const pct = Number(req.body.completion_pct ?? 0);
    newRecognized = allocated * pct / 100;
    await db.execute(sql`UPDATE asc606_performance_obligations SET completion_pct=${pct} WHERE id=${pobId} AND tenant_id=${t}`);
  } else if (method === 'milestone') {
    const { milestone_name, completed_at } = req.body;
    const milestones: any[] = p.milestones ?? [];
    const ms = milestones.find((m: any) => m.name === milestone_name);
    if (!ms) return res.status(400).json({ message: `Milestone '${milestone_name}' not found` });
    ms.completed_at = completed_at ?? new Date().toISOString();
    newRecognized = alreadyRecognized + Number(ms.value ?? 0);
    recognitionDate = completed_at ?? recognitionDate;
    await db.execute(sql`UPDATE asc606_performance_obligations SET milestones=${JSON.stringify(milestones)}::jsonb WHERE id=${pobId} AND tenant_id=${t}`);
  }

  const incremental = newRecognized - alreadyRecognized;
  const newStatus = newRecognized >= allocated ? 'completed' : 'in_progress';
  await db.execute(sql`
    UPDATE asc606_performance_obligations SET revenue_recognized=${newRecognized}, status=${newStatus}, updated_at=NOW()
    WHERE id=${pobId} AND tenant_id=${t}`);
  await db.execute(sql`
    INSERT INTO asc606_revenue_schedules (tenant_id, arrangement_id, pob_id, recognition_date, amount)
    VALUES (${t}, ${arrId}, ${pobId}, ${recognitionDate}, ${incremental})`);
  postGL(t, `ASC606 Revenue - POB ${pobId}`, [
    { account: '1100', debit: incremental },
    { account: '4000', credit: incremental },
  ]);
  await refreshArrangementTotals(arrId, t);
  res.json({ recognized: newRecognized, incremental, status: newStatus });
});

// ── Invoice / Billing ────────────────────────────────────────────────────────
asc606Router.post("/arrangements/:id/invoice", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const arrId = Number(req.params.id);
  const { amount, invoice_date } = req.body;
  const arr = await db.execute(sql`SELECT * FROM asc606_arrangements WHERE id=${arrId} AND tenant_id=${t}`);
  if (!arr.rows[0]) return res.status(404).json({ message: "Not found" });
  const a = arr.rows[0] as any;
  const recognized = Number(a.total_recognized ?? 0);
  const invoiceAmt = Number(amount);
  const newAsset = invoiceAmt < recognized ? recognized - invoiceAmt : 0;
  const newLiab = invoiceAmt > recognized ? invoiceAmt - recognized : 0;
  await db.execute(sql`
    UPDATE asc606_arrangements SET contract_asset=${newAsset}, contract_liability=${newLiab}, updated_at=NOW()
    WHERE id=${arrId} AND tenant_id=${t}`);
  if (invoiceAmt > recognized) {
    postGL(t, `ASC606 Advance Billing - Arr ${arrId}`, [
      { account: '1100', debit: invoiceAmt },
      { account: '2300', credit: invoiceAmt },
    ]);
  }
  res.json({ contract_asset: newAsset, contract_liability: newLiab });
});

// ── Contract Modifications ───────────────────────────────────────────────────
asc606Router.post("/arrangements/:id/modify", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const arrId = Number(req.params.id);
  const { modification_type, new_goods_services, price_change, reason } = req.body;
  await db.execute(sql`UPDATE asc606_arrangements SET modification_reason=${reason ?? null}, status='modified', updated_at=NOW() WHERE id=${arrId} AND tenant_id=${t}`);
  if (modification_type === 'prospective' && new_goods_services?.length) {
    for (const ns of new_goods_services) {
      await db.execute(sql`
        INSERT INTO asc606_performance_obligations (tenant_id, arrangement_id, name, pob_type, standalone_selling_price, allocated_transaction_price, recognition_method)
        VALUES (${t}, ${arrId}, ${ns.name}, ${ns.pob_type ?? null}, ${ns.ssp ?? null}, ${ns.ssp ?? null}, ${ns.recognition_method ?? 'point_in_time'})`);
    }
  } else if (modification_type === 'cumulative_catch_up' && price_change) {
    const catchUp = Number(price_change);
    postGL(t, `ASC606 Cumulative Catch-Up - Arr ${arrId}`, [
      { account: catchUp > 0 ? '1100' : '4000', debit: Math.abs(catchUp) },
      { account: catchUp > 0 ? '4000' : '1100', credit: Math.abs(catchUp) },
    ]);
  }
  res.json({ message: "Modification recorded", modification_type });
});

// ════════════════════════════════════════════════════════════════════════════
// DEFERRED REVENUE WATERFALL + ROLLFORWARD
// ════════════════════════════════════════════════════════════════════════════
asc606Router.get("/deferred-revenue/waterfall", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const months = Number(req.query.months ?? 12);
  const rows = await db.execute(sql`
    SELECT DATE_TRUNC('month', recognition_date) as period, SUM(amount) as expected_revenue, COUNT(DISTINCT arrangement_id) as arrangements_count
    FROM asc606_revenue_schedules WHERE tenant_id=${t} AND gl_posted=false AND recognition_date >= NOW()
    GROUP BY period ORDER BY period LIMIT ${months}`);
  const total = (rows.rows as any[]).reduce((s: number, r: any) => s + Number(r.expected_revenue ?? 0), 0);
  res.json({ periods: rows.rows, total_backlog: total });
});

asc606Router.get("/deferred-revenue/rollforward", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const month = Number(req.query.month ?? new Date().getMonth() + 1);
  const year = Number(req.query.year ?? new Date().getFullYear());
  const start = `${year}-${String(month).padStart(2,'0')}-01`;
  const end = new Date(year, month, 0).toISOString().split('T')[0];
  const [opening, added, recognized] = await Promise.all([
    db.execute(sql`SELECT COALESCE(SUM(contract_liability),0) as val FROM asc606_arrangements WHERE tenant_id=${t} AND created_at < ${start}`),
    db.execute(sql`SELECT COALESCE(SUM(amount),0) as val FROM asc606_revenue_schedules WHERE tenant_id=${t} AND recognition_date BETWEEN ${start} AND ${end} AND gl_posted=false`),
    db.execute(sql`SELECT COALESCE(SUM(amount),0) as val FROM asc606_revenue_schedules WHERE tenant_id=${t} AND recognition_date BETWEEN ${start} AND ${end} AND gl_posted=true`),
  ]);
  const op = Number((opening.rows[0] as any)?.val ?? 0);
  const ad = Number((added.rows[0] as any)?.val ?? 0);
  const re = Number((recognized.rows[0] as any)?.val ?? 0);
  res.json({ opening: op, added: ad, recognized: re, ending: op + ad - re, net_change: ad - re });
});

asc606Router.get("/contract-assets/rollforward", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const r = await db.execute(sql`
    SELECT COALESCE(SUM(contract_asset),0) as total_unbilled, COUNT(*) as count FROM asc606_arrangements WHERE tenant_id=${t} AND contract_asset > 0`);
  res.json(r.rows[0]);
});

// ════════════════════════════════════════════════════════════════════════════
// REPORTING
// ════════════════════════════════════════════════════════════════════════════
asc606Router.get("/dashboard", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-01`;
  const yearStart = `${now.getFullYear()}-01-01`;
  const [backlog, thisMonth, ytd, deferred, assets, byStatus, byMethod] = await Promise.all([
    db.execute(sql`SELECT COALESCE(SUM(allocated_transaction_price - revenue_recognized),0) as val FROM asc606_performance_obligations WHERE tenant_id=${t} AND status != 'completed'`),
    db.execute(sql`SELECT COALESCE(SUM(amount),0) as val FROM asc606_revenue_schedules WHERE tenant_id=${t} AND recognition_date >= ${monthStart} AND gl_posted=true`),
    db.execute(sql`SELECT COALESCE(SUM(amount),0) as val FROM asc606_revenue_schedules WHERE tenant_id=${t} AND recognition_date >= ${yearStart} AND gl_posted=true`),
    db.execute(sql`SELECT COALESCE(SUM(contract_liability),0) as val FROM asc606_arrangements WHERE tenant_id=${t}`),
    db.execute(sql`SELECT COALESCE(SUM(contract_asset),0) as val FROM asc606_arrangements WHERE tenant_id=${t}`),
    db.execute(sql`SELECT status, COUNT(*) as count FROM asc606_arrangements WHERE tenant_id=${t} GROUP BY status`),
    db.execute(sql`SELECT recognition_method, COUNT(*) as count, COALESCE(SUM(allocated_transaction_price),0) as amount FROM asc606_performance_obligations WHERE tenant_id=${t} GROUP BY recognition_method`),
  ]);
  res.json({
    total_backlog: Number((backlog.rows[0] as any)?.val ?? 0),
    recognized_this_month: Number((thisMonth.rows[0] as any)?.val ?? 0),
    recognized_ytd: Number((ytd.rows[0] as any)?.val ?? 0),
    deferred_revenue_total: Number((deferred.rows[0] as any)?.val ?? 0),
    contract_assets_total: Number((assets.rows[0] as any)?.val ?? 0),
    arrangements_by_status: byStatus.rows,
    pobs_by_method: byMethod.rows,
  });
});

asc606Router.get("/disaggregated-revenue", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const month = Number(req.query.month ?? new Date().getMonth() + 1);
  const year = Number(req.query.year ?? new Date().getFullYear());
  const start = `${year}-${String(month).padStart(2,'0')}-01`;
  const end = new Date(year, month, 0).toISOString().split('T')[0];
  const byType = await db.execute(sql`
    SELECT p.pob_type, COALESCE(SUM(s.amount),0) as revenue
    FROM asc606_revenue_schedules s
    JOIN asc606_performance_obligations p ON s.pob_id=p.id
    WHERE s.tenant_id=${t} AND s.recognition_date BETWEEN ${start} AND ${end}
    GROUP BY p.pob_type`);
  const byCustomer = await db.execute(sql`
    SELECT a.customer_name, COALESCE(SUM(s.amount),0) as revenue
    FROM asc606_revenue_schedules s
    JOIN asc606_arrangements a ON s.arrangement_id=a.id
    WHERE s.tenant_id=${t} AND s.recognition_date BETWEEN ${start} AND ${end}
    GROUP BY a.customer_name ORDER BY revenue DESC LIMIT 20`);
  res.json({ period: { month, year }, by_pob_type: byType.rows, by_customer: byCustomer.rows });
});

asc606Router.get("/post-schedule", requireAuth, async (req: any, res: any) => {
  await bootstrap();
  const t = tid(req);
  const month = Number(req.query.month ?? new Date().getMonth() + 1);
  const year = Number(req.query.year ?? new Date().getFullYear());
  const end = new Date(year, month, 0).toISOString().split('T')[0];
  const pending = await db.execute(sql`
    SELECT * FROM asc606_revenue_schedules WHERE tenant_id=${t} AND gl_posted=false AND recognition_date <= ${end}`);
  const rows = pending.rows as any[];
  let totalAmount = 0;
  for (const row of rows) {
    const amt = Number(row.amount ?? 0);
    totalAmount += amt;
    postGL(t, `ASC606 Auto-Post Schedule ${row.id}`, [
      { account: '1100', debit: amt },
      { account: '4000', credit: amt },
    ]);
    await db.execute(sql`UPDATE asc606_revenue_schedules SET gl_posted=true WHERE id=${row.id} AND tenant_id=${t}`);
  }
  res.json({ posted_count: rows.length, total_amount: totalAmount });
});
