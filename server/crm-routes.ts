import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { storage } from "./storage";

const router = Router();

const FULL_ACCESS_ROLES = ["admin", "manager", "accountsmanager"];

function getTenantId(req: any): number {
  return req.session?.tenantId ?? req.user?.tenantId;
}

function requireCRM(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

/**
 * Returns true if the current user has full (unrestricted) access to all leads.
 * Full access is granted when:
 *   (a) the user's role name is in FULL_ACCESS_ROLES (admin/manager/accountsmanager), OR
 *   (b) the user's role has can_edit = 1 for the crm_leads screen in role_permissions
 *       — this makes any custom role with edit rights automatically get full access.
 */
async function hasFullAccess(req: any): Promise<boolean> {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || !user.roleId) return false;
    const role = await storage.getUserRole(user.roleId);
    if (!role) return false;

    // Standard full-access roles bypass DB permission checks
    if (FULL_ACCESS_ROLES.includes(role.name.toLowerCase())) return true;

    // Custom roles: check if they have can_edit on crm_leads
    const perm = await db.execute(sql`
      SELECT can_edit FROM role_permissions
      WHERE role_id=${user.roleId} AND screen_key='crm_leads' AND record_status=1
      LIMIT 1
    `);
    if (perm.rows.length && Number((perm.rows[0] as any).can_edit) === 1) return true;

    return false;
  } catch {
    return false;
  }
}

// Auto-generate lead number
async function nextLeadNo(tid: number): Promise<string> {
  const r = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM crm_leads WHERE tenant_id=${tid}
  `);
  const cnt = Number((r.rows[0] as any)?.cnt || 0) + 1;
  return `LEAD-${String(cnt).padStart(4, "0")}`;
}

// List leads — full access roles see all; others see only their assigned leads
router.get("/leads", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const full = await hasFullAccess(req);
    let rows;
    if (full) {
      rows = await db.execute(sql`
        SELECT l.*, u.username as assigned_to_name
        FROM crm_leads l
        LEFT JOIN users u ON l.assigned_to = u.id
        WHERE l.tenant_id=${tid} AND l.record_status=1
        ORDER BY l.created_at DESC
      `);
    } else {
      rows = await db.execute(sql`
        SELECT l.*, u.username as assigned_to_name
        FROM crm_leads l
        LEFT JOIN users u ON l.assigned_to = u.id
        WHERE l.tenant_id=${tid} AND l.record_status=1
          AND l.assigned_to=${req.user.id}
        ORDER BY l.created_at DESC
      `);
    }
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Create lead — any CRM user can create
router.post("/leads", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  const { name, company, phone, email, source, productInterest, assignedTo, status, notes, nextFollowUp } = req.body;
  try {
    const leadNo = await nextLeadNo(tid);
    const r = await db.execute(sql`
      INSERT INTO crm_leads (tenant_id, lead_no, name, company, phone, email, source, product_interest, assigned_to, status, notes, next_follow_up)
      VALUES (${tid}, ${leadNo}, ${name}, ${company ?? null}, ${phone ?? null}, ${email ?? null},
        ${source ?? null}, ${productInterest ?? null}, ${assignedTo || null}, ${status ?? 'new'},
        ${notes || null}, ${nextFollowUp || null})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Update lead — full access roles can update any lead;
// others can only update leads assigned to them
router.put("/leads/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  const { name, company, phone, email, source, productInterest, assignedTo, status, notes, nextFollowUp } = req.body;
  try {
    const full = await hasFullAccess(req);

    if (!full) {
      // Confirm this lead is actually assigned to the current user
      const check = await db.execute(sql`
        SELECT id FROM crm_leads
        WHERE id=${req.params.id} AND tenant_id=${tid}
          AND assigned_to=${req.user.id} AND record_status=1
      `);
      if (!check.rows.length) {
        return res.status(403).json({ message: "You can only update leads assigned to you." });
      }
    }

    const r = await db.execute(sql`
      UPDATE crm_leads SET
        name=${name}, company=${company ?? null}, phone=${phone ?? null}, email=${email ?? null},
        source=${source ?? null}, product_interest=${productInterest ?? null},
        assigned_to=${assignedTo || null}, status=${status ?? 'new'},
        notes=${notes || null}, next_follow_up=${nextFollowUp || null},
        updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Delete lead (soft) — full access roles only
router.delete("/leads/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const full = await hasFullAccess(req);
    if (!full) {
      return res.status(403).json({ message: "Only admins and managers can delete leads." });
    }
    await db.execute(sql`UPDATE crm_leads SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Pipeline stats — filtered to match lead visibility
router.get("/leads/stats", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const full = await hasFullAccess(req);
    let rows;
    if (full) {
      rows = await db.execute(sql`
        SELECT status, COUNT(*) as count
        FROM crm_leads WHERE tenant_id=${tid} AND record_status=1
        GROUP BY status
      `);
    } else {
      rows = await db.execute(sql`
        SELECT status, COUNT(*) as count
        FROM crm_leads WHERE tenant_id=${tid} AND record_status=1
          AND assigned_to=${req.user.id}
        GROUP BY status
      `);
    }
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Surveys ───────────────────────────────────────────────────────────────────
router.get("/surveys", requireCRM, async (req: any, res) => {
  try {
    const t = getTenantId(req);
    const rows = await db.execute(sql`SELECT * FROM crm_surveys WHERE tenant_id=${t} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/surveys", requireCRM, async (req: any, res) => {
  try {
    const t = getTenantId(req);
    const { title, description, status, target_audience } = req.body;
    const code = "SRV-" + Date.now().toString().slice(-6);
    const row = await db.execute(sql`
      INSERT INTO crm_surveys (tenant_id, survey_code, title, description, status, target_audience)
      VALUES (${t}, ${code}, ${title}, ${description||null}, ${status||'active'}, ${target_audience||'all'})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/surveys/:id", requireCRM, async (req: any, res) => {
  try {
    const { title, description, status, target_audience } = req.body;
    const row = await db.execute(sql`
      UPDATE crm_surveys SET title=${title}, description=${description||null}, status=${status}, target_audience=${target_audience}
      WHERE id=${req.params.id} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/surveys/:id", requireCRM, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM crm_surveys WHERE id=${req.params.id}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/survey-questions", requireCRM, async (req: any, res) => {
  try {
    const sid = req.query.survey_id;
    const rows = await db.execute(sql`SELECT * FROM crm_survey_questions WHERE survey_id=${sid} ORDER BY order_no`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/survey-questions", requireCRM, async (req: any, res) => {
  try {
    const { survey_id, question, question_type, options, is_required, order_no } = req.body;
    const row = await db.execute(sql`
      INSERT INTO crm_survey_questions (survey_id, question, question_type, options, is_required, order_no)
      VALUES (${survey_id}, ${question}, ${question_type||'rating'}, ${JSON.stringify(options||[])}::jsonb, ${is_required!==false}, ${order_no||1})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/survey-responses", requireCRM, async (req: any, res) => {
  try {
    const sid = req.query.survey_id;
    const rows = await db.execute(sql`SELECT * FROM crm_survey_responses WHERE survey_id=${sid} ORDER BY submitted_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/survey-responses", requireCRM, async (req: any, res) => {
  try {
    const { survey_id, respondent_name, respondent_phone, respondent_email, answers } = req.body;
    const row = await db.execute(sql`
      INSERT INTO crm_survey_responses (survey_id, respondent_name, respondent_phone, respondent_email, answers)
      VALUES (${survey_id}, ${respondent_name||null}, ${respondent_phone||null}, ${respondent_email||null}, ${JSON.stringify(answers||{})}::jsonb)
      RETURNING *`);
    await db.execute(sql`UPDATE crm_surveys SET response_count = response_count + 1 WHERE id=${survey_id}`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
