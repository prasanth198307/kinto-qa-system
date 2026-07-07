import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

export const swachdeskRouter = Router();
const tid = (req: any): number => req.session?.tenantId ?? req.user?.tenantId ?? 1;
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
};

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS desk_tickets (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, ticket_no VARCHAR(20) NOT NULL,
      subject VARCHAR(500) NOT NULL, description TEXT,
      status VARCHAR(30) DEFAULT 'open', priority VARCHAR(20) DEFAULT 'medium',
      channel VARCHAR(30) DEFAULT 'portal', category VARCHAR(100), tags TEXT[],
      customer_id INT, customer_name VARCHAR(200), customer_email VARCHAR(200), customer_phone VARCHAR(20),
      assigned_agent_id INT, assigned_team VARCHAR(100), sla_policy_id INT,
      sla_due_at TIMESTAMPTZ, first_response_at TIMESTAMPTZ,
      resolved_at TIMESTAMPTZ, closed_at TIMESTAMPTZ, sla_breached BOOLEAN DEFAULT FALSE,
      csat_score INT, csat_comment TEXT, csat_sent_at TIMESTAMPTZ, source_ref VARCHAR(200),
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), record_status INT DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS desk_ticket_comments (
      id SERIAL PRIMARY KEY, ticket_id INT NOT NULL, tenant_id INT NOT NULL,
      author_id INT, author_name VARCHAR(200), author_type VARCHAR(20) DEFAULT 'agent',
      content TEXT NOT NULL, is_internal BOOLEAN DEFAULT FALSE, attachments JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS desk_sla_policies (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, name VARCHAR(200) NOT NULL,
      priority VARCHAR(20) NOT NULL, first_response_hours INT NOT NULL, resolution_hours INT NOT NULL,
      business_hours_only BOOLEAN DEFAULT TRUE, escalate_after_hours INT, escalate_to_agent_id INT,
      is_default BOOLEAN DEFAULT FALSE
    );
    CREATE TABLE IF NOT EXISTS desk_agents (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, user_id INT,
      name VARCHAR(200) NOT NULL, email VARCHAR(200), team VARCHAR(100),
      is_active BOOLEAN DEFAULT TRUE, max_tickets INT DEFAULT 20, skills TEXT[]
    );
    CREATE TABLE IF NOT EXISTS desk_canned_responses (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, title VARCHAR(200) NOT NULL,
      content TEXT NOT NULL, category VARCHAR(100), shortcut VARCHAR(50), record_status INT DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS desk_reports_daily (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, report_date DATE NOT NULL,
      tickets_opened INT DEFAULT 0, tickets_resolved INT DEFAULT 0, tickets_closed INT DEFAULT 0,
      avg_first_response_mins DECIMAL(10,2), avg_resolution_hours DECIMAL(10,2),
      sla_breached INT DEFAULT 0, csat_avg DECIMAL(3,2),
      UNIQUE(tenant_id, report_date)
    );
  `);
}

async function seedSLAPolicies(tenantId: number) {
  const existing = await db.execute(sql`SELECT id FROM desk_sla_policies WHERE tenant_id=${tenantId} LIMIT 1`);
  if (existing.rows.length > 0) return;
  await db.execute(sql`
    INSERT INTO desk_sla_policies (tenant_id, name, priority, first_response_hours, resolution_hours, is_default)
    VALUES
      (${tenantId}, 'Critical SLA', 'critical', 1, 4, FALSE),
      (${tenantId}, 'High SLA', 'high', 4, 8, FALSE),
      (${tenantId}, 'Medium SLA', 'medium', 8, 24, TRUE),
      (${tenantId}, 'Low SLA', 'low', 24, 72, FALSE)
  `);
}

async function getNextTicketNo(tenantId: number): Promise<string> {
  const year = new Date().getFullYear();
  const res = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM desk_tickets WHERE tenant_id=${tenantId} AND ticket_no LIKE ${'TKT-' + year + '-%'}
  `);
  const cnt = parseInt((res.rows[0] as any).cnt) + 1;
  return `TKT-${year}-${String(cnt).padStart(5, '0')}`;
}

// GET tickets
swachdeskRouter.get('/tickets', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const { status, priority, agent, from, to, search } = req.query;
    let conditions = [`t.tenant_id = ${tenantId}`, `t.record_status = 1`];
    if (status) conditions.push(`t.status = '${status}'`);
    if (priority) conditions.push(`t.priority = '${priority}'`);
    if (agent) conditions.push(`t.assigned_agent_id = ${agent}`);
    if (from) conditions.push(`t.created_at >= '${from}'`);
    if (to) conditions.push(`t.created_at <= '${to}'`);
    if (search) conditions.push(`(t.subject ILIKE '%${search}%' OR t.ticket_no ILIKE '%${search}%' OR t.customer_name ILIKE '%${search}%')`);
    const where = conditions.join(' AND ');
    const rows = await db.execute(sql.raw(`
      SELECT t.*, a.name as agent_name,
        CASE WHEN t.sla_due_at IS NOT NULL AND NOW() > t.sla_due_at AND t.status NOT IN ('resolved','closed') THEN TRUE ELSE t.sla_breached END as sla_status
      FROM desk_tickets t
      LEFT JOIN desk_agents a ON a.id = t.assigned_agent_id
      WHERE ${where}
      ORDER BY t.created_at DESC LIMIT 200
    `));
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST create ticket
swachdeskRouter.post('/tickets', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    await seedSLAPolicies(tenantId);
    const { subject, description, customer_name, customer_email, customer_phone, priority = 'medium', category, channel = 'portal', source_ref, assigned_agent_id } = req.body;
    const ticketNo = await getNextTicketNo(tenantId);
    // Find SLA policy
    const slaRes = await db.execute(sql`SELECT * FROM desk_sla_policies WHERE tenant_id=${tenantId} AND priority=${priority} LIMIT 1`);
    let slaData: any = { sla_policy_id: null, sla_due_at: null };
    if (slaRes.rows.length > 0) {
      const sla = slaRes.rows[0] as any;
      slaData.sla_policy_id = sla.id;
      slaData.sla_due_at = new Date(Date.now() + sla.resolution_hours * 3600000).toISOString();
    }
    const result = await db.execute(sql`
      INSERT INTO desk_tickets (tenant_id, ticket_no, subject, description, customer_name, customer_email, customer_phone, priority, category, channel, source_ref, assigned_agent_id, sla_policy_id, sla_due_at)
      VALUES (${tenantId}, ${ticketNo}, ${subject}, ${description ?? null}, ${customer_name ?? null}, ${customer_email ?? null}, ${customer_phone ?? null}, ${priority}, ${category ?? null}, ${channel}, ${source_ref ?? null}, ${assigned_agent_id ?? null}, ${slaData.sla_policy_id}, ${slaData.sla_due_at})
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET ticket by id
swachdeskRouter.get('/tickets/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const { id } = req.params;
    const tRow = await db.execute(sql`SELECT t.*, a.name as agent_name FROM desk_tickets t LEFT JOIN desk_agents a ON a.id=t.assigned_agent_id WHERE t.id=${parseInt(id)} AND t.tenant_id=${tenantId}`);
    if (!tRow.rows.length) return res.status(404).json({ message: 'Not found' });
    const comments = await db.execute(sql`SELECT * FROM desk_ticket_comments WHERE ticket_id=${parseInt(id)} AND tenant_id=${tenantId} ORDER BY created_at ASC`);
    const ticket = tRow.rows[0] as any;
    ticket.comments = comments.rows;
    ticket.sla_overdue = ticket.sla_due_at && new Date() > new Date(ticket.sla_due_at) && !['resolved','closed'].includes(ticket.status);
    res.json(ticket);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PUT update ticket
swachdeskRouter.put('/tickets/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const { id } = req.params;
    const { status, priority, assigned_agent_id, category, tags, assigned_team } = req.body;
    const slaBreached = await db.execute(sql`SELECT sla_due_at FROM desk_tickets WHERE id=${parseInt(id)} AND tenant_id=${tenantId}`);
    let breached = false;
    if (slaBreached.rows.length) {
      const due = (slaBreached.rows[0] as any).sla_due_at;
      if (due && new Date() > new Date(due)) breached = true;
    }
    const result = await db.execute(sql`
      UPDATE desk_tickets SET
        status=COALESCE(${status ?? null}, status),
        priority=COALESCE(${priority ?? null}, priority),
        assigned_agent_id=COALESCE(${assigned_agent_id ?? null}, assigned_agent_id),
        category=COALESCE(${category ?? null}, category),
        assigned_team=COALESCE(${assigned_team ?? null}, assigned_team),
        sla_breached=${breached},
        updated_at=NOW()
      WHERE id=${parseInt(id)} AND tenant_id=${tenantId} RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST reply/comment
swachdeskRouter.post('/tickets/:id/reply', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const { id } = req.params;
    const { content, is_internal = false, author_name, author_type = 'agent' } = req.body;
    const userId = req.user?.id;
    // Set first_response_at if not set
    await db.execute(sql`UPDATE desk_tickets SET first_response_at=COALESCE(first_response_at, NOW()), updated_at=NOW() WHERE id=${parseInt(id)} AND tenant_id=${tenantId} AND status NOT IN ('resolved','closed')`);
    const result = await db.execute(sql`
      INSERT INTO desk_ticket_comments (ticket_id, tenant_id, author_id, author_name, author_type, content, is_internal)
      VALUES (${parseInt(id)}, ${tenantId}, ${userId ?? null}, ${author_name ?? null}, ${author_type}, ${content}, ${is_internal})
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST resolve
swachdeskRouter.post('/tickets/:id/resolve', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const { id } = req.params;
    const result = await db.execute(sql`
      UPDATE desk_tickets SET status='resolved', resolved_at=NOW(), csat_sent_at=NOW(), updated_at=NOW()
      WHERE id=${parseInt(id)} AND tenant_id=${tenantId} RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST close
swachdeskRouter.post('/tickets/:id/close', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const { id } = req.params;
    const result = await db.execute(sql`
      UPDATE desk_tickets SET status='closed', closed_at=NOW(), updated_at=NOW()
      WHERE id=${parseInt(id)} AND tenant_id=${tenantId} RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST reopen
swachdeskRouter.post('/tickets/:id/reopen', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const { id } = req.params;
    const result = await db.execute(sql`
      UPDATE desk_tickets SET status='open', resolved_at=NULL, closed_at=NULL, updated_at=NOW()
      WHERE id=${parseInt(id)} AND tenant_id=${tenantId} RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST csat
swachdeskRouter.post('/tickets/:id/csat', async (req: any, res) => {
  try {
    await ensureTables();
    const { id } = req.params;
    const { score, comment } = req.body;
    if (!score || score < 1 || score > 5) return res.status(400).json({ message: 'Score must be 1-5' });
    const result = await db.execute(sql`
      UPDATE desk_tickets SET csat_score=${score}, csat_comment=${comment ?? null}, updated_at=NOW()
      WHERE id=${parseInt(id)} RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// SLA Policies
swachdeskRouter.get('/sla-policies', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const rows = await db.execute(sql`SELECT * FROM desk_sla_policies WHERE tenant_id=${tenantId} ORDER BY first_response_hours ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.post('/sla-policies', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const { name, priority, first_response_hours, resolution_hours, business_hours_only = true, escalate_after_hours, escalate_to_agent_id, is_default = false } = req.body;
    const result = await db.execute(sql`
      INSERT INTO desk_sla_policies (tenant_id, name, priority, first_response_hours, resolution_hours, business_hours_only, escalate_after_hours, escalate_to_agent_id, is_default)
      VALUES (${tenantId}, ${name}, ${priority}, ${first_response_hours}, ${resolution_hours}, ${business_hours_only}, ${escalate_after_hours ?? null}, ${escalate_to_agent_id ?? null}, ${is_default})
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.put('/sla-policies/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const { id } = req.params;
    const { name, priority, first_response_hours, resolution_hours, business_hours_only, is_default } = req.body;
    const result = await db.execute(sql`
      UPDATE desk_sla_policies SET
        name=COALESCE(${name ?? null}, name), priority=COALESCE(${priority ?? null}, priority),
        first_response_hours=COALESCE(${first_response_hours ?? null}, first_response_hours),
        resolution_hours=COALESCE(${resolution_hours ?? null}, resolution_hours),
        business_hours_only=COALESCE(${business_hours_only ?? null}, business_hours_only),
        is_default=COALESCE(${is_default ?? null}, is_default)
      WHERE id=${parseInt(id)} AND tenant_id=${tenantId} RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Agents
swachdeskRouter.get('/agents', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const rows = await db.execute(sql`SELECT * FROM desk_agents WHERE tenant_id=${tenantId} AND is_active=TRUE ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.post('/agents', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const { name, email, team, max_tickets = 20, user_id } = req.body;
    const result = await db.execute(sql`
      INSERT INTO desk_agents (tenant_id, user_id, name, email, team, max_tickets)
      VALUES (${tenantId}, ${user_id ?? null}, ${name}, ${email ?? null}, ${team ?? null}, ${max_tickets})
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.put('/agents/:id/assign-ticket', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const { id } = req.params;
    const { ticket_id } = req.body;
    const result = await db.execute(sql`
      UPDATE desk_tickets SET assigned_agent_id=${parseInt(id)}, updated_at=NOW()
      WHERE id=${parseInt(ticket_id)} AND tenant_id=${tenantId} RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Canned responses
swachdeskRouter.get('/canned-responses', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const { q } = req.query;
    let query = `SELECT * FROM desk_canned_responses WHERE tenant_id=${tenantId} AND record_status=1`;
    if (q) query += ` AND (title ILIKE '%${q}%' OR content ILIKE '%${q}%')`;
    query += ` ORDER BY title`;
    const rows = await db.execute(sql.raw(query));
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.post('/canned-responses', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const { title, content, category, shortcut } = req.body;
    const result = await db.execute(sql`
      INSERT INTO desk_canned_responses (tenant_id, title, content, category, shortcut)
      VALUES (${tenantId}, ${title}, ${content}, ${category ?? null}, ${shortcut ?? null})
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.put('/canned-responses/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const { id } = req.params;
    const { title, content, category, shortcut } = req.body;
    const result = await db.execute(sql`
      UPDATE desk_canned_responses SET
        title=COALESCE(${title ?? null}, title), content=COALESCE(${content ?? null}, content),
        category=COALESCE(${category ?? null}, category), shortcut=COALESCE(${shortcut ?? null}, shortcut)
      WHERE id=${parseInt(id)} AND tenant_id=${tenantId} RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.delete('/canned-responses/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const { id } = req.params;
    await db.execute(sql`UPDATE desk_canned_responses SET record_status=0 WHERE id=${parseInt(id)} AND tenant_id=${tenantId}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Reports
swachdeskRouter.get('/reports/overview', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const rows = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_opened,
        COUNT(*) FILTER (WHERE DATE(resolved_at) = CURRENT_DATE) as today_resolved,
        COUNT(*) FILTER (WHERE DATE(closed_at) = CURRENT_DATE) as today_closed,
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('week', NOW())) as week_opened,
        COUNT(*) FILTER (WHERE resolved_at >= DATE_TRUNC('week', NOW())) as week_resolved,
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())) as month_opened,
        COUNT(*) FILTER (WHERE resolved_at >= DATE_TRUNC('month', NOW())) as month_resolved,
        COUNT(*) FILTER (WHERE status = 'open') as total_open,
        COUNT(*) FILTER (WHERE status = 'in_progress') as total_in_progress
      FROM desk_tickets WHERE tenant_id=${tenantId} AND record_status=1
    `);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.get('/reports/sla', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const rows = await db.execute(sql`
      SELECT priority,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE sla_breached=TRUE) as breached,
        ROUND(AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))/60)::numeric, 2) as avg_first_response_mins,
        ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::numeric, 2) as avg_resolution_hours,
        ROUND(100.0 * COUNT(*) FILTER (WHERE sla_breached=FALSE) / NULLIF(COUNT(*),0), 1) as compliance_pct
      FROM desk_tickets WHERE tenant_id=${tenantId} AND record_status=1
      GROUP BY priority ORDER BY priority
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.get('/reports/agent-performance', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const rows = await db.execute(sql`
      SELECT a.name as agent_name, a.team,
        COUNT(t.id) as assigned,
        COUNT(t.id) FILTER (WHERE t.status IN ('resolved','closed')) as resolved,
        ROUND(AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600)::numeric, 2) as avg_resolution_hours,
        ROUND(AVG(t.csat_score)::numeric, 2) as avg_csat
      FROM desk_agents a
      LEFT JOIN desk_tickets t ON t.assigned_agent_id=a.id AND t.tenant_id=${tenantId}
      WHERE a.tenant_id=${tenantId} GROUP BY a.id, a.name, a.team ORDER BY resolved DESC
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.get('/reports/csat', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const tenantId = tid(req);
    const rows = await db.execute(sql`
      SELECT
        ROUND(AVG(csat_score)::numeric, 2) as avg_csat,
        COUNT(csat_score) as total_responses,
        COUNT(*) FILTER (WHERE csat_score=5) as score_5,
        COUNT(*) FILTER (WHERE csat_score=4) as score_4,
        COUNT(*) FILTER (WHERE csat_score=3) as score_3,
        COUNT(*) FILTER (WHERE csat_score=2) as score_2,
        COUNT(*) FILTER (WHERE csat_score=1) as score_1
      FROM desk_tickets WHERE tenant_id=${tenantId} AND csat_score IS NOT NULL
    `);
    const trend = await db.execute(sql`
      SELECT DATE(csat_sent_at) as date, ROUND(AVG(csat_score)::numeric, 2) as avg_csat
      FROM desk_tickets WHERE tenant_id=${tenantId} AND csat_score IS NOT NULL AND csat_sent_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(csat_sent_at) ORDER BY date
    `);
    res.json({ summary: rows.rows[0], trend: trend.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Webhooks
swachdeskRouter.post('/webhook/email', async (req: any, res) => {
  try {
    await ensureTables();
    const { from, subject, body, tenant_id = 1 } = req.body;
    const ticketNo = await getNextTicketNo(tenant_id);
    await seedSLAPolicies(tenant_id);
    const result = await db.execute(sql`
      INSERT INTO desk_tickets (tenant_id, ticket_no, subject, description, customer_email, channel)
      VALUES (${tenant_id}, ${ticketNo}, ${subject || 'Email Ticket'}, ${body || null}, ${from || null}, 'email')
      RETURNING *
    `);
    res.json({ success: true, ticket: result.rows[0] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.post('/webhook/whatsapp', async (req: any, res) => {
  try {
    await ensureTables();
    const { phone, message, tenant_id = 1 } = req.body;
    // Check if open ticket exists for this phone
    const existing = await db.execute(sql`SELECT id FROM desk_tickets WHERE tenant_id=${tenant_id} AND customer_phone=${phone} AND status NOT IN ('resolved','closed') ORDER BY created_at DESC LIMIT 1`);
    if (existing.rows.length > 0) {
      const ticketId = (existing.rows[0] as any).id;
      await db.execute(sql`INSERT INTO desk_ticket_comments (ticket_id, tenant_id, author_type, content) VALUES (${ticketId}, ${tenant_id}, 'customer', ${message})`);
      return res.json({ success: true, ticket_id: ticketId, action: 'appended' });
    }
    const ticketNo = await getNextTicketNo(tenant_id);
    await seedSLAPolicies(tenant_id);
    const result = await db.execute(sql`
      INSERT INTO desk_tickets (tenant_id, ticket_no, subject, description, customer_phone, channel)
      VALUES (${tenant_id}, ${ticketNo}, 'WhatsApp Inquiry', ${message}, ${phone}, 'whatsapp')
      RETURNING *
    `);
    res.json({ success: true, ticket: result.rows[0], action: 'created' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// KB / Routing / Chat — additional tables
// ─────────────────────────────────────────────────────────────────────────────
async function ensureExtendedTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS desk_kb_categories (
      id SERIAL PRIMARY KEY, tenant_id INT,
      name VARCHAR(200), slug VARCHAR(200), description TEXT,
      icon VARCHAR(50) DEFAULT 'ti-book',
      article_count INT DEFAULT 0, display_order INT DEFAULT 0,
      is_public BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS desk_kb_articles (
      id SERIAL PRIMARY KEY, tenant_id INT,
      category_id INT, title VARCHAR(500), slug VARCHAR(500),
      content TEXT, excerpt TEXT,
      status VARCHAR(20) DEFAULT 'draft',
      is_public BOOLEAN DEFAULT TRUE,
      author_id INT, author_name VARCHAR(200),
      views INT DEFAULT 0, helpful_yes INT DEFAULT 0, helpful_no INT DEFAULT 0,
      tags TEXT[],
      seo_title VARCHAR(300), seo_description TEXT,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
      record_status INT DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS desk_kb_feedback (
      id SERIAL PRIMARY KEY, article_id INT, tenant_id INT,
      is_helpful BOOLEAN, comment TEXT, visitor_ip VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS desk_routing_rules (
      id SERIAL PRIMARY KEY, tenant_id INT,
      name VARCHAR(200),
      priority INT DEFAULT 10,
      conditions JSONB DEFAULT '[]',
      actions JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT TRUE,
      match_count INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS desk_chat_sessions (
      id SERIAL PRIMARY KEY, tenant_id INT,
      session_id VARCHAR(100) UNIQUE,
      visitor_name VARCHAR(200), visitor_email VARCHAR(200),
      visitor_ip VARCHAR(50), page_url TEXT,
      assigned_agent_id INT,
      status VARCHAR(20) DEFAULT 'waiting',
      ticket_id INT,
      started_at TIMESTAMPTZ DEFAULT NOW(), ended_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS desk_chat_messages (
      id SERIAL PRIMARY KEY, session_id VARCHAR(100),
      tenant_id INT, sender_type VARCHAR(20),
      sender_name VARCHAR(200), message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function seedKbCategories(tenantId: number) {
  const ex = await db.execute(sql`SELECT id FROM desk_kb_categories WHERE tenant_id=${tenantId} LIMIT 1`);
  if (ex.rows.length > 0) return;
  await db.execute(sql`
    INSERT INTO desk_kb_categories (tenant_id, name, slug, icon, display_order)
    VALUES
      (${tenantId}, 'General', 'general', 'ti-info-circle', 1),
      (${tenantId}, 'Getting Started', 'getting-started', 'ti-rocket', 2),
      (${tenantId}, 'Billing & Payments', 'billing-payments', 'ti-credit-card', 3)
  `);
}

// ─── KB Categories ───────────────────────────────────────────────────────────
swachdeskRouter.get('/kb/categories', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    const rows = await db.execute(sql`SELECT * FROM desk_kb_categories WHERE tenant_id=${t} ORDER BY display_order, name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.post('/kb/categories', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    const { name, description, icon = 'ti-book', display_order = 0, is_public = true } = req.body;
    const slug = slugify(name);
    const r = await db.execute(sql`
      INSERT INTO desk_kb_categories (tenant_id, name, slug, description, icon, display_order, is_public)
      VALUES (${t}, ${name}, ${slug}, ${description ?? null}, ${icon}, ${display_order}, ${is_public}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.put('/kb/categories/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    const { name, description, icon, display_order, is_public } = req.body;
    const slug = name ? slugify(name) : undefined;
    const r = await db.execute(sql`
      UPDATE desk_kb_categories SET
        name=COALESCE(${name ?? null}, name),
        slug=COALESCE(${slug ?? null}, slug),
        description=COALESCE(${description ?? null}, description),
        icon=COALESCE(${icon ?? null}, icon),
        display_order=COALESCE(${display_order ?? null}, display_order),
        is_public=COALESCE(${is_public ?? null}, is_public)
      WHERE id=${parseInt(req.params.id)} AND tenant_id=${t} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.delete('/kb/categories/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    await db.execute(sql`DELETE FROM desk_kb_categories WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── KB Articles ─────────────────────────────────────────────────────────────
swachdeskRouter.get('/kb/articles', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    const { category_id, status, search, tags } = req.query as any;
    let conds = [`a.tenant_id=${t}`, `a.record_status=1`];
    if (category_id) conds.push(`a.category_id=${parseInt(category_id)}`);
    if (status) conds.push(`a.status='${status}'`);
    if (search) conds.push(`(a.title ILIKE '%${search}%' OR a.content ILIKE '%${search}%')`);
    if (tags) conds.push(`'${tags}'=ANY(a.tags)`);
    const rows = await db.execute(sql.raw(`
      SELECT a.*, c.name as category_name FROM desk_kb_articles a
      LEFT JOIN desk_kb_categories c ON c.id=a.category_id
      WHERE ${conds.join(' AND ')} ORDER BY a.updated_at DESC LIMIT 200
    `));
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.post('/kb/articles', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    await seedKbCategories(t);
    const { title, content, category_id, tags = [], is_public = true, seo_title, seo_description } = req.body;
    const slug = slugify(title);
    const excerpt = stripHtml(content || '').substring(0, 200);
    const authorId = req.user?.id ?? null;
    const authorName = req.user?.name ?? req.user?.username ?? 'Agent';
    const r = await db.execute(sql`
      INSERT INTO desk_kb_articles (tenant_id, category_id, title, slug, content, excerpt, tags, is_public, author_id, author_name, seo_title, seo_description)
      VALUES (${t}, ${category_id ?? null}, ${title}, ${slug}, ${content ?? null}, ${excerpt}, ${tags}, ${is_public}, ${authorId}, ${authorName}, ${seo_title ?? null}, ${seo_description ?? null})
      RETURNING *`);
    if (category_id) {
      await db.execute(sql`UPDATE desk_kb_categories SET article_count=article_count+1 WHERE id=${parseInt(category_id)}`);
    }
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.get('/kb/articles/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    await db.execute(sql`UPDATE desk_kb_articles SET views=views+1 WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    const r = await db.execute(sql`SELECT a.*, c.name as category_name FROM desk_kb_articles a LEFT JOIN desk_kb_categories c ON c.id=a.category_id WHERE a.id=${parseInt(req.params.id)} AND a.tenant_id=${t}`);
    if (!r.rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.put('/kb/articles/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    const { title, content, category_id, tags, is_public, seo_title, seo_description } = req.body;
    const slug = title ? slugify(title) : undefined;
    const excerpt = content ? stripHtml(content).substring(0, 200) : undefined;
    const r = await db.execute(sql`
      UPDATE desk_kb_articles SET
        title=COALESCE(${title ?? null}, title),
        slug=COALESCE(${slug ?? null}, slug),
        content=COALESCE(${content ?? null}, content),
        excerpt=COALESCE(${excerpt ?? null}, excerpt),
        category_id=COALESCE(${category_id ?? null}, category_id),
        tags=COALESCE(${tags ?? null}, tags),
        is_public=COALESCE(${is_public ?? null}, is_public),
        seo_title=COALESCE(${seo_title ?? null}, seo_title),
        seo_description=COALESCE(${seo_description ?? null}, seo_description),
        updated_at=NOW()
      WHERE id=${parseInt(req.params.id)} AND tenant_id=${t} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.post('/kb/articles/:id/publish', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    const r = await db.execute(sql`UPDATE desk_kb_articles SET status='published', published_at=NOW(), updated_at=NOW() WHERE id=${parseInt(req.params.id)} AND tenant_id=${t} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.post('/kb/articles/:id/archive', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    const r = await db.execute(sql`UPDATE desk_kb_articles SET status='archived', updated_at=NOW() WHERE id=${parseInt(req.params.id)} AND tenant_id=${t} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.delete('/kb/articles/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    await db.execute(sql`UPDATE desk_kb_articles SET record_status=0 WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.get('/kb/search', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    const q = (req.query.q as string) || '';
    const rows = await db.execute(sql`
      SELECT * FROM desk_kb_articles
      WHERE tenant_id=${t} AND status='published' AND record_status=1
        AND (title ILIKE ${'%' + q + '%'} OR content ILIKE ${'%' + q + '%'} OR ${q}=ANY(tags))
      ORDER BY (title ILIKE ${q})::int DESC, views DESC LIMIT 50`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Public KB routes ────────────────────────────────────────────────────────
export const deskPublicRouter = Router();

deskPublicRouter.get('/kb/:tenantSlug/categories', async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = parseInt(req.params.tenantSlug) || 1;
    const rows = await db.execute(sql`SELECT * FROM desk_kb_categories WHERE tenant_id=${t} AND is_public=TRUE ORDER BY display_order, name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

deskPublicRouter.get('/kb/:tenantSlug/articles', async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = parseInt(req.params.tenantSlug) || 1;
    const rows = await db.execute(sql`SELECT id, title, slug, excerpt, category_id, tags, views, published_at FROM desk_kb_articles WHERE tenant_id=${t} AND status='published' AND is_public=TRUE AND record_status=1 ORDER BY published_at DESC LIMIT 100`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

deskPublicRouter.get('/kb/:tenantSlug/articles/:slug', async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = parseInt(req.params.tenantSlug) || 1;
    const r = await db.execute(sql`SELECT * FROM desk_kb_articles WHERE tenant_id=${t} AND slug=${req.params.slug} AND status='published' AND is_public=TRUE AND record_status=1`);
    if (!r.rows.length) return res.status(404).json({ message: 'Not found' });
    const id = (r.rows[0] as any).id;
    await db.execute(sql`UPDATE desk_kb_articles SET views=views+1 WHERE id=${id}`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

deskPublicRouter.get('/kb/:tenantSlug/search', async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = parseInt(req.params.tenantSlug) || 1;
    const q = (req.query.q as string) || '';
    const rows = await db.execute(sql`SELECT id,title,slug,excerpt,views FROM desk_kb_articles WHERE tenant_id=${t} AND status='published' AND is_public=TRUE AND record_status=1 AND (title ILIKE ${'%'+q+'%'} OR content ILIKE ${'%'+q+'%'} OR ${q}=ANY(tags)) ORDER BY views DESC LIMIT 20`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

deskPublicRouter.post('/kb/articles/:id/feedback', async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const { is_helpful, comment } = req.body;
    const ip = req.ip || '';
    const id = parseInt(req.params.id);
    await db.execute(sql`INSERT INTO desk_kb_feedback (article_id, tenant_id, is_helpful, comment, visitor_ip) VALUES (${id}, 1, ${is_helpful}, ${comment ?? null}, ${ip})`);
    if (is_helpful) {
      await db.execute(sql`UPDATE desk_kb_articles SET helpful_yes=helpful_yes+1 WHERE id=${id}`);
    } else {
      await db.execute(sql`UPDATE desk_kb_articles SET helpful_no=helpful_no+1 WHERE id=${id}`);
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Routing Rules ────────────────────────────────────────────────────────────
async function applyRoutingRules(tenantId: number, ticket: { subject: string; description: string; channel: string; priority: string }): Promise<any | null> {
  await ensureExtendedTables();
  const rules = await db.execute(sql`SELECT * FROM desk_routing_rules WHERE tenant_id=${tenantId} AND is_active=TRUE ORDER BY priority ASC`);
  for (const rule of rules.rows as any[]) {
    const conditions = rule.conditions as any[];
    if (!Array.isArray(conditions) || conditions.length === 0) continue;
    const allMatch = conditions.every((cond: any) => {
      const fieldValue = ((ticket as any)[cond.field] || '').toLowerCase();
      const val = (cond.value || '').toLowerCase();
      if (cond.operator === 'contains') return fieldValue.includes(val);
      if (cond.operator === 'equals') return fieldValue === val;
      if (cond.operator === 'starts_with') return fieldValue.startsWith(val);
      return false;
    });
    if (allMatch) {
      await db.execute(sql`UPDATE desk_routing_rules SET match_count=match_count+1 WHERE id=${rule.id}`);
      return rule.actions;
    }
  }
  return null;
}

swachdeskRouter.get('/routing-rules', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    const rows = await db.execute(sql`SELECT * FROM desk_routing_rules WHERE tenant_id=${t} ORDER BY priority ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.post('/routing-rules', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    const { name, priority = 10, conditions = [], actions = {}, is_active = true } = req.body;
    const r = await db.execute(sql`INSERT INTO desk_routing_rules (tenant_id, name, priority, conditions, actions, is_active) VALUES (${t}, ${name}, ${priority}, ${JSON.stringify(conditions)}, ${JSON.stringify(actions)}, ${is_active}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.put('/routing-rules/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    const { name, priority, conditions, actions, is_active } = req.body;
    const r = await db.execute(sql`
      UPDATE desk_routing_rules SET
        name=COALESCE(${name ?? null}, name),
        priority=COALESCE(${priority ?? null}, priority),
        conditions=COALESCE(${conditions ? JSON.stringify(conditions) : null}::jsonb, conditions),
        actions=COALESCE(${actions ? JSON.stringify(actions) : null}::jsonb, actions),
        is_active=COALESCE(${is_active ?? null}, is_active)
      WHERE id=${parseInt(req.params.id)} AND tenant_id=${t} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.delete('/routing-rules/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    await db.execute(sql`DELETE FROM desk_routing_rules WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.post('/routing-rules/test', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    const { subject = '', description = '', channel = 'portal', priority = 'medium' } = req.body;
    const rules = await db.execute(sql`SELECT * FROM desk_routing_rules WHERE tenant_id=${t} AND is_active=TRUE ORDER BY priority ASC`);
    const matched: any[] = [];
    for (const rule of rules.rows as any[]) {
      const conditions = rule.conditions as any[];
      if (!Array.isArray(conditions) || conditions.length === 0) continue;
      const allMatch = conditions.every((cond: any) => {
        const fv = ({ subject, description, channel, priority } as any)[cond.field]?.toLowerCase() || '';
        const val = cond.value?.toLowerCase() || '';
        if (cond.operator === 'contains') return fv.includes(val);
        if (cond.operator === 'equals') return fv === val;
        if (cond.operator === 'starts_with') return fv.startsWith(val);
        return false;
      });
      if (allMatch) matched.push({ rule_id: rule.id, rule_name: rule.name, actions: rule.actions });
    }
    res.json({ matched });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.post('/tickets/:id/auto-tag', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const t = tid(req);
    const ticket = await db.execute(sql`SELECT subject, description, tags FROM desk_tickets WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    if (!ticket.rows.length) return res.status(404).json({ message: 'Not found' });
    const tk = ticket.rows[0] as any;
    const text = `${tk.subject || ''} ${tk.description || ''}`.toLowerCase();
    const keywordTags: Record<string, string> = {
      'invoice': 'billing', 'payment': 'billing', 'refund': 'billing', 'charge': 'billing',
      'password': 'account', 'login': 'account', 'access': 'account', 'account': 'account',
      'bug': 'technical', 'error': 'technical', 'crash': 'technical', 'broken': 'technical',
      'slow': 'performance', 'timeout': 'performance', 'loading': 'performance',
      'urgent': 'urgent', 'asap': 'urgent', 'critical': 'urgent',
      'feature': 'feature-request', 'enhancement': 'feature-request', 'suggestion': 'feature-request',
    };
    const newTags = new Set<string>(Array.isArray(tk.tags) ? tk.tags : []);
    for (const [kw, tag] of Object.entries(keywordTags)) {
      if (text.includes(kw)) newTags.add(tag);
    }
    const tagsArr = Array.from(newTags);
    await db.execute(sql`UPDATE desk_tickets SET tags=${tagsArr}, updated_at=NOW() WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    res.json({ tags: tagsArr });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Live Chat ────────────────────────────────────────────────────────────────
function genSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

deskPublicRouter.post('/desk/chat/start', async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const { tenant_id = 1, visitor_name, visitor_email, page_url } = req.body;
    const sessionId = genSessionId();
    await db.execute(sql`INSERT INTO desk_chat_sessions (tenant_id, session_id, visitor_name, visitor_email, visitor_ip, page_url) VALUES (${parseInt(tenant_id)}, ${sessionId}, ${visitor_name ?? 'Visitor'}, ${visitor_email ?? null}, ${req.ip || ''}, ${page_url ?? null})`);
    await db.execute(sql`INSERT INTO desk_chat_messages (session_id, tenant_id, sender_type, sender_name, message) VALUES (${sessionId}, ${parseInt(tenant_id)}, 'bot', 'SwachDesk', 'Hi! How can we help you today?')`);
    res.json({ session_id: sessionId, initial_message: 'Hi! How can we help you today?' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

deskPublicRouter.get('/desk/chat/:sessionId/messages', async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const rows = await db.execute(sql`SELECT * FROM desk_chat_messages WHERE session_id=${req.params.sessionId} ORDER BY created_at ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

deskPublicRouter.post('/desk/chat/:sessionId/send', async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const { message, visitor_name = 'Visitor' } = req.body;
    const sess = await db.execute(sql`SELECT * FROM desk_chat_sessions WHERE session_id=${req.params.sessionId}`);
    if (!sess.rows.length) return res.status(404).json({ message: 'Session not found' });
    const s = sess.rows[0] as any;
    await db.execute(sql`INSERT INTO desk_chat_messages (session_id, tenant_id, sender_type, sender_name, message) VALUES (${req.params.sessionId}, ${s.tenant_id}, 'visitor', ${visitor_name}, ${message})`);
    await db.execute(sql`UPDATE desk_chat_sessions SET status='active' WHERE session_id=${req.params.sessionId}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.get('/chat/sessions', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    const rows = await db.execute(sql`SELECT * FROM desk_chat_sessions WHERE tenant_id=${t} AND status != 'resolved' ORDER BY started_at DESC LIMIT 100`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.get('/chat/:sessionId/messages', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const rows = await db.execute(sql`SELECT * FROM desk_chat_messages WHERE session_id=${req.params.sessionId} ORDER BY created_at ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.post('/chat/:sessionId/reply', requireAuth, async (req: any, res) => {
  try {
    await ensureExtendedTables();
    const t = tid(req);
    const { message } = req.body;
    const agentName = req.user?.name ?? req.user?.username ?? 'Agent';
    const sess = await db.execute(sql`SELECT * FROM desk_chat_sessions WHERE session_id=${req.params.sessionId}`);
    if (!sess.rows.length) return res.status(404).json({ message: 'Session not found' });
    await db.execute(sql`INSERT INTO desk_chat_messages (session_id, tenant_id, sender_type, sender_name, message) VALUES (${req.params.sessionId}, ${t}, 'agent', ${agentName}, ${message})`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachdeskRouter.post('/chat/:sessionId/escalate', requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    await ensureExtendedTables();
    const t = tid(req);
    const sess = await db.execute(sql`SELECT * FROM desk_chat_sessions WHERE session_id=${req.params.sessionId}`);
    if (!sess.rows.length) return res.status(404).json({ message: 'Session not found' });
    const s = sess.rows[0] as any;
    const msgs = await db.execute(sql`SELECT * FROM desk_chat_messages WHERE session_id=${req.params.sessionId} ORDER BY created_at ASC`);
    const transcript = (msgs.rows as any[]).map((m: any) => `[${m.sender_type}] ${m.sender_name}: ${m.message}`).join('\n');
    const ticketNo = await getNextTicketNo(t);
    const result = await db.execute(sql`
      INSERT INTO desk_tickets (tenant_id, ticket_no, subject, description, customer_name, customer_email, channel)
      VALUES (${t}, ${ticketNo}, ${'Chat: ' + (s.visitor_name || 'Visitor')}, ${transcript}, ${s.visitor_name ?? null}, ${s.visitor_email ?? null}, 'chat')
      RETURNING *`);
    const ticketId = (result.rows[0] as any).id;
    await db.execute(sql`UPDATE desk_chat_sessions SET ticket_id=${ticketId}, status='resolved', ended_at=NOW() WHERE session_id=${req.params.sessionId}`);
    res.json({ success: true, ticket: result.rows[0] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

deskPublicRouter.get('/widget.js', async (req: any, res) => {
  const { tenant_id } = req.query;
  const baseUrl = process.env.BASE_URL || 'https://app.swacherp.com';
  const script = `
(function() {
  var w = document.createElement('div');
  w.id = 'swach-chat-widget';
  w.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;font-family:sans-serif';
  var btn = document.createElement('button');
  btn.textContent = '💬 Chat';
  btn.style.cssText = 'background:#4F46E5;color:#fff;border:none;padding:12px 20px;border-radius:24px;cursor:pointer;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,.2)';
  btn.onclick = function() {
    var frame = document.getElementById('swach-chat-frame');
    if (frame) { frame.style.display = frame.style.display==='none'?'block':'none'; return; }
    var f = document.createElement('iframe');
    f.id = 'swach-chat-frame';
    f.src = '${baseUrl}/chat-widget?tenant_id=${tenant_id}&page=' + encodeURIComponent(location.href);
    f.style.cssText = 'width:360px;height:480px;border:none;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.2);display:block;margin-bottom:8px';
    w.insertBefore(f, btn);
  };
  w.appendChild(btn);
  document.body.appendChild(w);
})();
`;
  res.setHeader('Content-Type', 'application/javascript');
  res.send(script);
});

export default swachdeskRouter;
