import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

function getTenantId(req: any): number {
  return req.session?.tenantId ?? req.user?.tenantId;
}

function requireCRM(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

// Auto-generate lead number
async function nextLeadNo(tid: number): Promise<string> {
  const r = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM crm_leads WHERE tenant_id=${tid}
  `);
  const cnt = Number((r.rows[0] as any)?.cnt || 0) + 1;
  return `LEAD-${String(cnt).padStart(4, "0")}`;
}

// List all leads
router.get("/leads", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`
      SELECT l.*, u.username as assigned_to_name
      FROM crm_leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.tenant_id=${tid} AND l.record_status=1
      ORDER BY l.created_at DESC
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Create lead
router.post("/leads", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  const { name, company, phone, email, source, productInterest, assignedTo, status, notes, nextFollowUp } = req.body;
  try {
    const leadNo = await nextLeadNo(tid);
    const r = await db.execute(sql`
      INSERT INTO crm_leads (tenant_id, lead_no, name, company, phone, email, source, product_interest, assigned_to, status, notes, next_follow_up)
      VALUES (${tid}, ${leadNo}, ${name}, ${company ?? null}, ${phone ?? null}, ${email ?? null},
        ${source ?? null}, ${productInterest ?? null}, ${assignedTo || null}, ${status ?? 'new'},
        ${notes ?? null}, ${nextFollowUp ?? null})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Update lead
router.put("/leads/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  const { name, company, phone, email, source, productInterest, assignedTo, status, notes, nextFollowUp } = req.body;
  try {
    const r = await db.execute(sql`
      UPDATE crm_leads SET
        name=${name}, company=${company ?? null}, phone=${phone ?? null}, email=${email ?? null},
        source=${source ?? null}, product_interest=${productInterest ?? null},
        assigned_to=${assignedTo || null}, status=${status ?? 'new'},
        notes=${notes ?? null}, next_follow_up=${nextFollowUp ?? null},
        updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Delete lead (soft)
router.delete("/leads/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE crm_leads SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Pipeline stats
router.get("/leads/stats", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`
      SELECT status, COUNT(*) as count
      FROM crm_leads WHERE tenant_id=${tid} AND record_status=1
      GROUP BY status
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
