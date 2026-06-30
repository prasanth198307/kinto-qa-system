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

// ── Contacts ──────────────────────────────────────────────────────────────────
router.get("/contacts", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`SELECT c.*, a.name as account_name FROM crm_contacts c LEFT JOIN crm_accounts a ON a.id=c.account_id WHERE c.tenant_id=${tid} AND c.record_status=1 ORDER BY c.name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/contacts", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const { name, account_id, title, email, phone, department, notes } = req.body;
    const code = "CON-" + Date.now();
    const r = await db.execute(sql`INSERT INTO crm_contacts (tenant_id, contact_code, name, account_id, title, email, phone, department, notes) VALUES (${tid}, ${code}, ${name}, ${account_id||null}, ${title||null}, ${email||null}, ${phone||null}, ${department||null}, ${notes||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/contacts/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const { name, account_id, title, email, phone, department, notes } = req.body;
    const r = await db.execute(sql`UPDATE crm_contacts SET name=${name}, account_id=${account_id||null}, title=${title||null}, email=${email||null}, phone=${phone||null}, department=${department||null}, notes=${notes||null}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/contacts/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE crm_contacts SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Accounts ──────────────────────────────────────────────────────────────────
router.get("/accounts", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM crm_accounts WHERE tenant_id=${tid} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/accounts", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const { name, industry, website, phone, email, address, annual_revenue, employee_count, notes } = req.body;
    const code = "ACC-" + Date.now();
    const r = await db.execute(sql`INSERT INTO crm_accounts (tenant_id, account_code, name, industry, website, phone, email, address, annual_revenue, employee_count, notes) VALUES (${tid}, ${code}, ${name}, ${industry||null}, ${website||null}, ${phone||null}, ${email||null}, ${address||null}, ${annual_revenue||0}, ${employee_count||0}, ${notes||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/accounts/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const { name, industry, website, phone, email, address, annual_revenue, employee_count, notes } = req.body;
    const r = await db.execute(sql`UPDATE crm_accounts SET name=${name}, industry=${industry||null}, website=${website||null}, phone=${phone||null}, email=${email||null}, address=${address||null}, annual_revenue=${annual_revenue||0}, employee_count=${employee_count||0}, notes=${notes||null}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/accounts/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE crm_accounts SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Pipelines ─────────────────────────────────────────────────────────────────
router.get("/pipelines", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM crm_pipelines WHERE tenant_id=${tid} ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/pipelines", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const { name, description } = req.body;
    const r = await db.execute(sql`INSERT INTO crm_pipelines (tenant_id, name, description) VALUES (${tid}, ${name}, ${description||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/pipelines/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const { name, description } = req.body;
    const r = await db.execute(sql`UPDATE crm_pipelines SET name=${name}, description=${description||null} WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/pipelines/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`DELETE FROM crm_pipelines WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Stages ────────────────────────────────────────────────────────────────────
router.get("/stages", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const pid = req.query.pipeline_id;
    const rows = pid
      ? await db.execute(sql`SELECT * FROM crm_stages WHERE tenant_id=${tid} AND pipeline_id=${pid} ORDER BY sort_order`)
      : await db.execute(sql`SELECT * FROM crm_stages WHERE tenant_id=${tid} ORDER BY pipeline_id, sort_order`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/stages", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const { pipeline_id, name, sort_order, probability, color } = req.body;
    const r = await db.execute(sql`INSERT INTO crm_stages (tenant_id, pipeline_id, name, sort_order, probability, color) VALUES (${tid}, ${pipeline_id}, ${name}, ${sort_order||0}, ${probability||0}, ${color||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/stages/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const { name, sort_order, probability, color } = req.body;
    const r = await db.execute(sql`UPDATE crm_stages SET name=${name}, sort_order=${sort_order||0}, probability=${probability||0}, color=${color||null} WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/stages/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`DELETE FROM crm_stages WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Opportunities ─────────────────────────────────────────────────────────────
router.get("/opportunities", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`
      SELECT o.*, s.name as stage_name, s.color as stage_color, s.probability,
             c.name as contact_name, a.name as account_name, p.name as pipeline_name
      FROM crm_opportunities o
      LEFT JOIN crm_stages s ON s.id=o.stage_id
      LEFT JOIN crm_contacts c ON c.id=o.contact_id
      LEFT JOIN crm_accounts a ON a.id=o.account_id
      LEFT JOIN crm_pipelines p ON p.id=o.pipeline_id
      WHERE o.tenant_id=${tid} AND o.record_status=1
      ORDER BY o.expected_close_date ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/opportunities", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const { name, pipeline_id, stage_id, contact_id, account_id, amount, expected_close_date, probability, assigned_to, notes } = req.body;
    const code = "OPP-" + Date.now();
    const r = await db.execute(sql`INSERT INTO crm_opportunities (tenant_id, opportunity_code, name, pipeline_id, stage_id, contact_id, account_id, amount, expected_close_date, probability, assigned_to, notes) VALUES (${tid}, ${code}, ${name}, ${pipeline_id||null}, ${stage_id||null}, ${contact_id||null}, ${account_id||null}, ${amount||0}, ${expected_close_date||null}, ${probability||0}, ${assigned_to||null}, ${notes||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/opportunities/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const { name, pipeline_id, stage_id, contact_id, account_id, amount, expected_close_date, probability, assigned_to, status, notes } = req.body;
    const r = await db.execute(sql`UPDATE crm_opportunities SET name=${name}, pipeline_id=${pipeline_id||null}, stage_id=${stage_id||null}, contact_id=${contact_id||null}, account_id=${account_id||null}, amount=${amount||0}, expected_close_date=${expected_close_date||null}, probability=${probability||0}, assigned_to=${assigned_to||null}, status=${status||'open'}, notes=${notes||null}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch("/opportunities/:id/stage", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const { stage_id } = req.body;
    const r = await db.execute(sql`UPDATE crm_opportunities SET stage_id=${stage_id}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/opportunities/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE crm_opportunities SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Activities ────────────────────────────────────────────────────────────────
router.get("/activities", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`
      SELECT a.*, c.name as contact_name, o.name as opportunity_name
      FROM crm_activities a
      LEFT JOIN crm_contacts c ON c.id=a.contact_id
      LEFT JOIN crm_opportunities o ON o.id=a.opportunity_id
      WHERE a.tenant_id=${tid} ORDER BY a.activity_date DESC LIMIT 200`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/activities", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const { contact_id, opportunity_id, activity_type, subject, description, activity_date, duration_minutes, outcome } = req.body;
    const r = await db.execute(sql`INSERT INTO crm_activities (tenant_id, contact_id, opportunity_id, activity_type, subject, description, activity_date, duration_minutes, outcome, created_by) VALUES (${tid}, ${contact_id||null}, ${opportunity_id||null}, ${activity_type||'call'}, ${subject}, ${description||null}, ${activity_date||null}, ${duration_minutes||0}, ${outcome||null}, ${req.user?.id||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/activities/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const { activity_type, subject, description, activity_date, duration_minutes, outcome } = req.body;
    const r = await db.execute(sql`UPDATE crm_activities SET activity_type=${activity_type||'call'}, subject=${subject}, description=${description||null}, activity_date=${activity_date||null}, duration_minutes=${duration_minutes||0}, outcome=${outcome||null} WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/activities/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`DELETE FROM crm_activities WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Tasks ─────────────────────────────────────────────────────────────────────
router.get("/tasks", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`SELECT t.*, c.name as contact_name, o.name as opportunity_name FROM crm_tasks t LEFT JOIN crm_contacts c ON c.id=t.contact_id LEFT JOIN crm_opportunities o ON o.id=t.opportunity_id WHERE t.tenant_id=${tid} ORDER BY t.due_date ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/tasks", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const { title, contact_id, opportunity_id, due_date, priority, assigned_to, description } = req.body;
    const r = await db.execute(sql`INSERT INTO crm_tasks (tenant_id, title, contact_id, opportunity_id, due_date, priority, assigned_to, description) VALUES (${tid}, ${title}, ${contact_id||null}, ${opportunity_id||null}, ${due_date||null}, ${priority||'medium'}, ${assigned_to||null}, ${description||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/tasks/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const { title, due_date, priority, assigned_to, status, description } = req.body;
    const r = await db.execute(sql`UPDATE crm_tasks SET title=${title}, due_date=${due_date||null}, priority=${priority||'medium'}, assigned_to=${assigned_to||null}, status=${status||'open'}, description=${description||null}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/tasks/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`DELETE FROM crm_tasks WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Email Templates ───────────────────────────────────────────────────────────
router.get("/email-templates", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM crm_email_templates WHERE tenant_id=${tid} ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/email-templates", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const { name, subject, body, category } = req.body;
    const r = await db.execute(sql`INSERT INTO crm_email_templates (tenant_id, name, subject, body, category) VALUES (${tid}, ${name}, ${subject}, ${body}, ${category||'general'}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/email-templates/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const { name, subject, body, category } = req.body;
    const r = await db.execute(sql`UPDATE crm_email_templates SET name=${name}, subject=${subject}, body=${body}, category=${category||'general'} WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/email-templates/:id", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`DELETE FROM crm_email_templates WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── CRM Pipeline Stats ────────────────────────────────────────────────────────
router.get("/pipeline-stats", requireCRM, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const [contacts, accounts, opps, tasks] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM crm_contacts WHERE tenant_id=${tid} AND record_status=1`),
      db.execute(sql`SELECT COUNT(*) as count FROM crm_accounts WHERE tenant_id=${tid} AND record_status=1`),
      db.execute(sql`SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total_value FROM crm_opportunities WHERE tenant_id=${tid} AND record_status=1 AND status='open'`),
      db.execute(sql`SELECT COUNT(*) as count FROM crm_tasks WHERE tenant_id=${tid} AND status='open'`),
    ]);
    res.json({
      contacts: Number(contacts.rows[0]?.count || 0),
      accounts: Number(accounts.rows[0]?.count || 0),
      openOpportunities: Number(opps.rows[0]?.count || 0),
      pipelineValue: Number(opps.rows[0]?.total_value || 0),
      openTasks: Number(tasks.rows[0]?.count || 0),
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
