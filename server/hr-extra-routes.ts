import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
};

const tid = (req: any): number => req.session?.tenantId ?? req.user?.tenantId ?? 1;

// ── Onboarding ─────────────────────────────────────────────────────────────────
router.get("/onboarding", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM hr_onboarding_checklists WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/onboarding", requireAuth, async (req: any, res) => {
  try {
    const { employee_name, employee_id, department, designation, joining_date, checklist, status, assigned_to, notes } = req.body;
    const row = await db.execute(sql`
      INSERT INTO hr_onboarding_checklists (tenant_id, employee_name, employee_id, department, designation, joining_date, checklist, status, assigned_to, notes)
      VALUES (${tid(req)}, ${employee_name}, ${employee_id||null}, ${department||null}, ${designation||null}, ${joining_date||null}, ${JSON.stringify(checklist||[])}::jsonb, ${status||'pending'}, ${assigned_to||null}, ${notes||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/onboarding/:id", requireAuth, async (req: any, res) => {
  try {
    const { employee_name, department, designation, joining_date, checklist, status, assigned_to, notes } = req.body;
    const computedStatus = status || (Array.isArray(checklist) && checklist.every((c: any) => c.done) ? 'completed' : checklist?.some((c: any) => c.done) ? 'in_progress' : 'pending');
    const row = await db.execute(sql`
      UPDATE hr_onboarding_checklists SET employee_name=${employee_name}, department=${department||null}, designation=${designation||null}, joining_date=${joining_date||null}, checklist=${JSON.stringify(checklist||[])}::jsonb, status=${computedStatus}, assigned_to=${assigned_to||null}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/onboarding/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM hr_onboarding_checklists WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── HR Letters ────────────────────────────────────────────────────────────────
router.get("/letters", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM hr_letters WHERE tenant_id=${tid(req)} ORDER BY issued_date DESC, id DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/letters", requireAuth, async (req: any, res) => {
  try {
    const { employee_name, employee_id, letter_type, subject, content, issued_date, status } = req.body;
    const row = await db.execute(sql`
      INSERT INTO hr_letters (tenant_id, employee_name, employee_id, letter_type, subject, content, issued_date, status)
      VALUES (${tid(req)}, ${employee_name}, ${employee_id||null}, ${letter_type}, ${subject}, ${content}, ${issued_date||new Date().toISOString().slice(0,10)}, ${status||'draft'})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/letters/:id", requireAuth, async (req: any, res) => {
  try {
    const { employee_name, letter_type, subject, content, issued_date, status } = req.body;
    const row = await db.execute(sql`
      UPDATE hr_letters SET employee_name=${employee_name}, letter_type=${letter_type}, subject=${subject}, content=${content}, issued_date=${issued_date}, status=${status}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/letters/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM hr_letters WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── HR Support Desk ───────────────────────────────────────────────────────────
router.get("/support-tickets", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM hr_support_tickets WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/support-tickets", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const { employee_name, employee_id, subject, description, category, priority, assigned_to } = req.body;
    const count = await db.execute(sql`SELECT COUNT(*) AS cnt FROM hr_support_tickets WHERE tenant_id=${t}`);
    const no = "TKT-" + String(Number((count.rows[0] as any).cnt) + 1).padStart(4, "0");
    const row = await db.execute(sql`
      INSERT INTO hr_support_tickets (tenant_id, ticket_no, employee_name, employee_id, subject, description, category, priority, status, assigned_to)
      VALUES (${t}, ${no}, ${employee_name}, ${employee_id||null}, ${subject}, ${description||null}, ${category||'general'}, ${priority||'medium'}, 'open', ${assigned_to||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/support-tickets/:id", requireAuth, async (req: any, res) => {
  try {
    const { employee_name, subject, description, category, priority, status, assigned_to, resolution } = req.body;
    const resolvedAt = status === 'resolved' || status === 'closed' ? new Date().toISOString() : null;
    const row = await db.execute(sql`
      UPDATE hr_support_tickets SET employee_name=${employee_name}, subject=${subject}, description=${description||null}, category=${category}, priority=${priority}, status=${status}, assigned_to=${assigned_to||null}, resolution=${resolution||null}, resolved_at=${resolvedAt}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
