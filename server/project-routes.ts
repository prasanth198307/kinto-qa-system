import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
};

// ─── Projects ─────────────────────────────────────────────────────────────────
router.get("/projects", requireAuth, async (req: any, res) => {
  const tid = req.session?.tenantId;
  const { status } = req.query;
  let q = `SELECT p.*, e.first_name||' '||e.last_name AS manager_name
           FROM projects p
           LEFT JOIN hr_employees e ON e.id = p.project_manager_id
           WHERE p.tenant_id=${tid} AND p.record_status=1`;
  if (status) q += ` AND p.status='${status}'`;
  q += ` ORDER BY p.created_at DESC`;
  const rows = await db.execute(sql.raw(q));
  res.json(rows.rows);
});

router.get("/projects/:id", requireAuth, async (req: any, res) => {
  const tid = req.session?.tenantId;
  const project = await db.execute(sql`SELECT p.*, e.first_name||' '||e.last_name AS manager_name
    FROM projects p LEFT JOIN hr_employees e ON e.id = p.project_manager_id
    WHERE p.id=${req.params.id} AND p.tenant_id=${tid}`);
  if (!project.rows.length) return res.status(404).json({ message: "Not found" });

  const boq = await db.execute(sql`SELECT * FROM boq_items WHERE project_id=${req.params.id} AND tenant_id=${tid} AND record_status=1 ORDER BY id`);
  const milestones = await db.execute(sql`SELECT * FROM billing_milestones WHERE project_id=${req.params.id} AND tenant_id=${tid} AND record_status=1 ORDER BY due_date`);
  const timesheets = await db.execute(sql`SELECT ts.*, e.first_name||' '||e.last_name AS employee_name
    FROM timesheets ts JOIN hr_employees e ON e.id=ts.employee_id
    WHERE ts.project_id=${req.params.id} AND ts.tenant_id=${tid} AND ts.record_status=1 ORDER BY ts.work_date DESC LIMIT 100`);
  const invoices = await db.execute(sql`SELECT id, invoice_number, invoice_date, total_amount, status FROM invoices WHERE project_id=${req.params.id} AND tenant_id=${tid} AND record_status=1 ORDER BY invoice_date DESC`);
  const pos = await db.execute(sql`SELECT id, po_number, po_date, total_amount, status FROM purchase_orders WHERE project_id=${req.params.id} AND tenant_id=${tid} AND record_status!=0 ORDER BY po_date DESC`);

  res.json({ project: project.rows[0], boq: boq.rows, milestones: milestones.rows, timesheets: timesheets.rows, invoices: invoices.rows, purchaseOrders: pos.rows });
});

router.post("/projects", requireAuth, async (req: any, res) => {
  const tid = req.session?.tenantId;
  const { name, code, clientName, clientGstin, startDate, endDate, contractValue, projectManagerId, description } = req.body;
  if (!name) return res.status(400).json({ message: "Name required" });
  const r = await db.execute(sql`INSERT INTO projects
    (tenant_id, name, code, client_name, client_gstin, start_date, end_date, contract_value, project_manager_id, description)
    VALUES (${tid}, ${name}, ${code||null}, ${clientName||null}, ${clientGstin||null}, ${startDate||null}, ${endDate||null}, ${contractValue||0}, ${projectManagerId||null}, ${description||null})
    RETURNING *`);
  res.json(r.rows[0]);
});

router.put("/projects/:id", requireAuth, async (req: any, res) => {
  const tid = req.session?.tenantId;
  const { name, code, clientName, clientGstin, startDate, endDate, contractValue, projectManagerId, description, status } = req.body;
  const r = await db.execute(sql`UPDATE projects SET
    name=${name}, code=${code||null}, client_name=${clientName||null}, client_gstin=${clientGstin||null},
    start_date=${startDate||null}, end_date=${endDate||null}, contract_value=${contractValue||0},
    project_manager_id=${projectManagerId||null}, description=${description||null}, status=${status||'active'}
    WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
  res.json(r.rows[0]);
});

router.delete("/projects/:id", requireAuth, async (req: any, res) => {
  const tid = req.session?.tenantId;
  await db.execute(sql`UPDATE projects SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
  res.json({ success: true });
});

// ─── BOQ Items ────────────────────────────────────────────────────────────────
router.get("/projects/:id/boq", requireAuth, async (req: any, res) => {
  const tid = req.session?.tenantId;
  const rows = await db.execute(sql`SELECT * FROM boq_items WHERE project_id=${req.params.id} AND tenant_id=${tid} AND record_status=1 ORDER BY id`);
  res.json(rows.rows);
});

router.post("/projects/:id/boq", requireAuth, async (req: any, res) => {
  const tid = req.session?.tenantId;
  const { description, uom, quantity, rate } = req.body;
  const amount = (Number(quantity)||0) * (Number(rate)||0);
  const r = await db.execute(sql`INSERT INTO boq_items (tenant_id, project_id, description, uom, quantity, rate, amount)
    VALUES (${tid}, ${req.params.id}, ${description}, ${uom||null}, ${quantity||null}, ${rate||null}, ${amount}) RETURNING *`);
  res.json(r.rows[0]);
});

router.put("/boq-items/:id", requireAuth, async (req: any, res) => {
  const tid = req.session?.tenantId;
  const { description, uom, quantity, rate, actualQty, actualAmount } = req.body;
  const amount = (Number(quantity)||0) * (Number(rate)||0);
  const r = await db.execute(sql`UPDATE boq_items SET description=${description}, uom=${uom||null},
    quantity=${quantity||null}, rate=${rate||null}, amount=${amount},
    actual_qty=${actualQty||0}, actual_amount=${actualAmount||0}
    WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
  res.json(r.rows[0]);
});

router.delete("/boq-items/:id", requireAuth, async (req: any, res) => {
  const tid = req.session?.tenantId;
  await db.execute(sql`UPDATE boq_items SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
  res.json({ success: true });
});

// ─── Billing Milestones ───────────────────────────────────────────────────────
router.get("/projects/:id/milestones", requireAuth, async (req: any, res) => {
  const tid = req.session?.tenantId;
  const rows = await db.execute(sql`SELECT * FROM billing_milestones WHERE project_id=${req.params.id} AND tenant_id=${tid} AND record_status=1 ORDER BY due_date`);
  res.json(rows.rows);
});

router.post("/projects/:id/milestones", requireAuth, async (req: any, res) => {
  const tid = req.session?.tenantId;
  const { title, dueDate, amount, percentage } = req.body;
  const r = await db.execute(sql`INSERT INTO billing_milestones (tenant_id, project_id, title, due_date, amount, percentage)
    VALUES (${tid}, ${req.params.id}, ${title}, ${dueDate||null}, ${amount}, ${percentage||null}) RETURNING *`);
  res.json(r.rows[0]);
});

router.put("/milestones/:id", requireAuth, async (req: any, res) => {
  const tid = req.session?.tenantId;
  const { title, dueDate, amount, percentage, status, invoiceId } = req.body;
  const r = await db.execute(sql`UPDATE billing_milestones SET title=${title}, due_date=${dueDate||null},
    amount=${amount}, percentage=${percentage||null}, status=${status||'pending'},
    invoice_id=${invoiceId||null}, invoiced_at=${invoiceId ? sql`NOW()::date` : sql`invoiced_at`}
    WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
  res.json(r.rows[0]);
});

router.delete("/milestones/:id", requireAuth, async (req: any, res) => {
  const tid = req.session?.tenantId;
  await db.execute(sql`UPDATE billing_milestones SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
  res.json({ success: true });
});

// ─── Project P&L Summary ──────────────────────────────────────────────────────
router.get("/projects/:id/pnl", requireAuth, async (req: any, res) => {
  const tid = req.session?.tenantId;
  const projectId = req.params.id;

  const [invoiceSum, poSum, tsSum, boqSum] = await Promise.all([
    db.execute(sql`SELECT COALESCE(SUM(total_amount),0) AS revenue FROM invoices WHERE project_id=${projectId} AND tenant_id=${tid} AND record_status=1 AND status NOT IN ('cancelled','draft')`),
    db.execute(sql`SELECT COALESCE(SUM(total_amount),0) AS cost FROM purchase_orders WHERE project_id=${projectId} AND tenant_id=${tid} AND record_status!=0 AND status NOT IN ('cancelled','draft')`),
    db.execute(sql`SELECT COALESCE(SUM(hours),0) AS total_hours FROM timesheets WHERE project_id=${projectId} AND tenant_id=${tid} AND record_status=1`),
    db.execute(sql`SELECT COALESCE(SUM(amount),0) AS boq_value, COALESCE(SUM(actual_amount),0) AS actual_cost FROM boq_items WHERE project_id=${projectId} AND tenant_id=${tid} AND record_status=1`),
  ]);

  const revenue = Number((invoiceSum.rows[0] as any).revenue);
  const cost = Number((poSum.rows[0] as any).cost);
  const hours = Number((tsSum.rows[0] as any).total_hours);
  const boqValue = Number((boqSum.rows[0] as any).boq_value);
  const actualCost = Number((boqSum.rows[0] as any).actual_cost);

  res.json({ revenue, cost, gross_profit: revenue - cost, total_hours: hours, boq_value: boqValue, actual_cost: actualCost });
});

export default router;
