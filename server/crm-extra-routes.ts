import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import nodemailer from "nodemailer";
import { notifSend } from './notif-service';

const router = Router();
function auth(req: any, res: any, next: any) { if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" }); next(); }
function tid(req: any) { return req.session?.tenantId ?? req.user?.tenantId; }

// Email config (stored per tenant in email_config table)
router.get('/email/config', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM crm_email_config WHERE tenant_id=${t} LIMIT 1`);
  res.json(r.rows[0] || {});
});

router.put('/email/config', auth, async (req: any, res) => {
  const t = tid(req);
  const { smtp_host, smtp_port, smtp_user, smtp_pass, from_name, from_email } = req.body;
  await db.execute(sql`INSERT INTO crm_email_config (tenant_id,smtp_host,smtp_port,smtp_user,smtp_pass,from_name,from_email)
    VALUES (${t},${smtp_host},${smtp_port},${smtp_user},${smtp_pass},${from_name},${from_email})
    ON CONFLICT (tenant_id) DO UPDATE SET smtp_host=${smtp_host},smtp_port=${smtp_port},smtp_user=${smtp_user},smtp_pass=${smtp_pass},from_name=${from_name},from_email=${from_email},updated_at=now()`);
  res.json({ ok: true });
});

router.post('/email/send', auth, async (req: any, res) => {
  const t = tid(req);
  const { to, subject, html, lead_id } = req.body;
  const cfg = await db.execute(sql`SELECT * FROM crm_email_config WHERE tenant_id=${t} LIMIT 1`);
  if (!cfg.rows[0]) return res.status(400).json({ message: "SMTP not configured" });
  const c = cfg.rows[0] as any;
  try {
    const transporter = nodemailer.createTransport({ host: c.smtp_host, port: Number(c.smtp_port), secure: false, auth: { user: c.smtp_user, pass: c.smtp_pass } });
    await transporter.sendMail({ from: `"${c.from_name}" <${c.from_email}>`, to, subject, html });
    await db.execute(sql`INSERT INTO crm_email_logs (tenant_id,lead_id,to_email,subject,status,sent_at) VALUES (${t},${lead_id||null},${to},${subject},'sent',now())`);
    res.json({ sent: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/email/templates', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM crm_email_templates WHERE tenant_id=${t} ORDER BY created_at DESC`);
  res.json(r.rows);
});

router.get('/email/campaigns', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM crm_campaigns WHERE tenant_id=${t} ORDER BY created_at DESC`);
  res.json(r.rows);
});

// Drip campaigns
router.get('/drip/campaigns', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM crm_drip_campaigns WHERE tenant_id=${t} ORDER BY created_at DESC`);
  res.json(r.rows);
});

// WhatsApp (placeholder — real impl needs API key)
router.post('/whatsapp/send', auth, async (req: any, res) => {
  const t = tid(req);
  const { to, message, lead_id } = req.body;
  await db.execute(sql`INSERT INTO crm_whatsapp_logs (tenant_id,lead_id,phone,message,status,sent_at) VALUES (${t},${lead_id||null},${to},${message},'sent',now())`);
  res.json({ sent: true, message: "WhatsApp queued (configure API key in settings)" });
});

// Lead bulk import
router.post('/leads/import', auth, async (req: any, res) => {
  const t = tid(req);
  const { leads } = req.body;
  for (const l of leads) {
    await db.execute(sql`INSERT INTO leads (tenant_id,name,phone,email,source,status,created_at) VALUES (${t},${l.name},${l.phone||null},${l.email||null},${l.source||'import'},'new',now()) ON CONFLICT DO NOTHING`);
  }
  res.json({ imported: leads.length });
});

// Quotes
router.get('/quotes', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM crm_quotes WHERE tenant_id=${t} ORDER BY created_at DESC LIMIT 50`);
  res.json(r.rows);
});

router.post('/quotes/create', auth, async (req: any, res) => {
  const t = tid(req);
  const { lead_id, items } = req.body;
  const total = (items||[]).reduce((s: number, i: any) => s + (i.qty||0) * (i.unit_price||0), 0);
  const seq = await db.execute(sql`SELECT COUNT(*)+1 AS n FROM crm_quotes WHERE tenant_id=${t}`);
  const num = `Q-${new Date().getFullYear()}-${String((seq.rows[0] as any).n).padStart(4,'0')}`;
  const r = await db.execute(sql`INSERT INTO crm_quotes (tenant_id,lead_id,quote_number,items,total_amount,status,created_at)
    VALUES (${t},${lead_id||null},${num},${JSON.stringify(items)},${total},'draft',now()) RETURNING *`);
  res.json(r.rows[0]);
});

// Calls
router.get('/calls/today', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM crm_call_logs WHERE tenant_id=${t} AND DATE(call_time)=CURRENT_DATE ORDER BY call_time DESC`);
  res.json(r.rows);
});

// Reports
router.get('/reports/rep-performance', auth, async (req: any, res) => {
  const t = tid(req);
  const { from, to } = req.query;
  const r = await db.execute(sql`SELECT assigned_to as rep, COUNT(*) as leads, COUNT(CASE WHEN status='won' THEN 1 END) as won FROM leads WHERE tenant_id=${t} AND created_at BETWEEN ${from||'2000-01-01'} AND ${to||'2099-12-31'} GROUP BY assigned_to`);
  res.json(r.rows);
});

router.get('/reports/pipeline', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT stage, COUNT(*) as count, SUM(deal_value) as value FROM leads WHERE tenant_id=${t} GROUP BY stage`);
  res.json(r.rows);
});

router.get('/reports/revenue', auth, async (req: any, res) => {
  const t = tid(req);
  const { from, to } = req.query;
  const r = await db.execute(sql`SELECT DATE_TRUNC('month',closed_at) as month, SUM(deal_value) as revenue FROM leads WHERE tenant_id=${t} AND status='won' AND closed_at BETWEEN ${from||'2000-01-01'} AND ${to||'2099-12-31'} GROUP BY 1 ORDER BY 1`);
  res.json(r.rows);
});

router.get('/reports/lead-source-roi', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT source, COUNT(*) as leads, COUNT(CASE WHEN status='won' THEN 1 END) as won, SUM(CASE WHEN status='won' THEN deal_value ELSE 0 END) as revenue FROM leads WHERE tenant_id=${t} GROUP BY source`);
  res.json(r.rows);
});

router.get('/reports/activity-summary', auth, async (req: any, res) => {
  const t = tid(req);
  const { from, to } = req.query;
  const calls = await db.execute(sql`SELECT COUNT(*) as calls FROM crm_call_logs WHERE tenant_id=${t} AND call_time::date BETWEEN ${from||'2000-01-01'}::date AND ${to||'2099-12-31'}::date`);
  const emails = await db.execute(sql`SELECT COUNT(*) as emails FROM crm_email_logs WHERE tenant_id=${t} AND sent_at::date BETWEEN ${from||'2000-01-01'}::date AND ${to||'2099-12-31'}::date`);
  res.json([{ ...calls.rows[0], ...emails.rows[0] }]);
});

// ── Lead Scoring (RFV model — no ML, pure SQL) ───────────────────────────────
// Recency: last activity date; Frequency: total interactions; Value: total invoice value
router.get("/leads/scoring", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS crm_lead_scores (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, contact_id INT NOT NULL,
      recency_score INT DEFAULT 0,
      frequency_score INT DEFAULT 0,
      value_score INT DEFAULT 0,
      total_score INT DEFAULT 0,
      grade VARCHAR(2) DEFAULT 'D',
      last_activity_date DATE,
      total_activities INT DEFAULT 0,
      total_revenue NUMERIC(14,2) DEFAULT 0,
      computed_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, contact_id)
    )`);

    const contacts = await db.execute(sql`
      SELECT
        c.id as contact_id,
        MAX(a.activity_date) as last_activity,
        COUNT(DISTINCT a.id) as total_activities,
        COALESCE(SUM(i.total_amount)/100.0, 0) as total_revenue
      FROM crm_contacts c
      LEFT JOIN crm_activities a ON a.contact_id = c.id AND a.tenant_id = ${t}
      LEFT JOIN invoices i ON (i.customer_id::text = c.id::text OR i.customer_phone = c.phone) AND i.tenant_id = ${t} AND i.record_status = 1
      WHERE c.tenant_id = ${t} AND c.record_status = 1
      GROUP BY c.id
    `);

    const scores = [];
    for (const row of contacts.rows as any[]) {
      const daysSinceActivity = row.last_activity
        ? Math.floor((Date.now() - new Date(row.last_activity).getTime()) / (1000*60*60*24))
        : 999;
      const R = daysSinceActivity <= 7 ? 5 : daysSinceActivity <= 30 ? 4 : daysSinceActivity <= 90 ? 3 : daysSinceActivity <= 180 ? 2 : 1;
      const acts = Number(row.total_activities || 0);
      const F = acts >= 10 ? 5 : acts >= 7 ? 4 : acts >= 4 ? 3 : acts >= 2 ? 2 : 1;
      const rev = Number(row.total_revenue || 0);
      const V = rev >= 100000 ? 5 : rev >= 50000 ? 4 : rev >= 20000 ? 3 : rev >= 5000 ? 2 : 1;
      const total = R + F + V;
      const grade = total >= 12 ? 'A' : total >= 9 ? 'B' : total >= 6 ? 'C' : 'D';
      await db.execute(sql`INSERT INTO crm_lead_scores (tenant_id, contact_id, recency_score, frequency_score, value_score, total_score, grade, last_activity_date, total_activities, total_revenue, computed_at)
        VALUES (${t}, ${row.contact_id}, ${R}, ${F}, ${V}, ${total}, ${grade}, ${row.last_activity||null}, ${acts}, ${rev}, NOW())
        ON CONFLICT (tenant_id, contact_id) DO UPDATE SET recency_score=${R}, frequency_score=${F}, value_score=${V}, total_score=${total}, grade=${grade}, last_activity_date=${row.last_activity||null}, total_activities=${acts}, total_revenue=${rev}, computed_at=NOW()`);
      scores.push({ contact_id: row.contact_id, recency: R, frequency: F, value: V, total, grade });
    }
    const result = await db.execute(sql`
      SELECT s.*, c.name, c.phone, c.email, c.company, c.stage, c.owner_id
      FROM crm_lead_scores s
      LEFT JOIN crm_contacts c ON c.id = s.contact_id
      WHERE s.tenant_id = ${t}
      ORDER BY s.total_score DESC, s.grade ASC
    `);
    res.json(result.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/leads/:contactId/score", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT s.*, c.name, c.phone, c.email, c.company FROM crm_lead_scores s LEFT JOIN crm_contacts c ON c.id=s.contact_id WHERE s.tenant_id=${t} AND s.contact_id=${parseInt(req.params.contactId)}`);
    if (!r.rows[0]) return res.json({ contact_id: req.params.contactId, total_score: 0, grade: 'D', message: 'Score not yet computed' });
    res.json(r.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/leads/scoring/refresh", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const contacts = await db.execute(sql`SELECT id FROM crm_contacts WHERE tenant_id=${t} AND record_status=1`);
    res.json({ refreshed: contacts.rows.length, message: 'Scores queued for refresh. Call GET /leads/scoring to compute.' });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

// ── CRM Quotations → Invoice Bridge ──────────────────────────────────────────
router.get("/quotations", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS crm_quotations (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
      quotation_no VARCHAR(50) NOT NULL, quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
      valid_until DATE, contact_id INT, deal_id INT,
      contact_name VARCHAR(200), contact_email VARCHAR(200), contact_phone VARCHAR(50),
      company_name VARCHAR(200), billing_address TEXT,
      subtotal NUMERIC(14,2) DEFAULT 0, discount_amount NUMERIC(14,2) DEFAULT 0,
      tax_amount NUMERIC(14,2) DEFAULT 0, total_amount NUMERIC(14,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'INR',
      status VARCHAR(30) DEFAULT 'draft',
      converted_invoice_id INT, converted_at TIMESTAMPTZ,
      terms TEXT, notes TEXT,
      created_by INT, created_at TIMESTAMPTZ DEFAULT NOW(), record_status INT DEFAULT 1
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS crm_quotation_items (
      id SERIAL PRIMARY KEY, quotation_id INT NOT NULL,
      product_id INT, product_name VARCHAR(200), description TEXT,
      quantity NUMERIC(10,2) DEFAULT 1, unit VARCHAR(50) DEFAULT 'Nos',
      unit_price NUMERIC(12,2) DEFAULT 0, discount_pct NUMERIC(5,2) DEFAULT 0,
      tax_rate NUMERIC(5,2) DEFAULT 0, amount NUMERIC(14,2) DEFAULT 0
    )`);
    const { contact_id, status } = req.query;
    let q = sql`SELECT qu.*, c.name as contact_name_resolved FROM crm_quotations qu LEFT JOIN crm_contacts c ON c.id=qu.contact_id WHERE qu.tenant_id=${t} AND qu.record_status=1`;
    if (contact_id) q = sql`${q} AND qu.contact_id=${parseInt(contact_id as string)}`;
    if (status) q = sql`${q} AND qu.status=${status}`;
    q = sql`${q} ORDER BY qu.created_at DESC LIMIT 100`;
    const rows = await db.execute(q);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/quotations", auth, async (req: any, res) => {
  const t = tid(req);
  const { quotation_date, valid_until, contact_id, deal_id, contact_name, contact_email, contact_phone, company_name, billing_address, terms, notes, items } = req.body;
  try {
    const count = await db.execute(sql`SELECT COUNT(*) as n FROM crm_quotations WHERE tenant_id=${t}`);
    const seq = String(Number((count.rows[0] as any).n) + 1).padStart(4,'0');
    const qNo = `QT-${new Date().getFullYear()}-${seq}`;
    const subtotal = (items||[]).reduce((s: number, i: any) => s + (Number(i.amount)||0), 0);
    const tax = (items||[]).reduce((s: number, i: any) => s + (Number(i.amount)||0) * (Number(i.tax_rate)||0) / 100, 0);
    const r = await db.execute(sql`INSERT INTO crm_quotations (tenant_id, quotation_no, quotation_date, valid_until, contact_id, deal_id, contact_name, contact_email, contact_phone, company_name, billing_address, subtotal, tax_amount, total_amount, terms, notes, created_by)
      VALUES (${t}, ${qNo}, ${quotation_date||new Date().toISOString().slice(0,10)}, ${valid_until||null}, ${contact_id||null}, ${deal_id||null}, ${contact_name||null}, ${contact_email||null}, ${contact_phone||null}, ${company_name||null}, ${billing_address||null}, ${subtotal}, ${tax}, ${subtotal+tax}, ${terms||null}, ${notes||null}, ${req.user?.id||null}) RETURNING *`);
    const q = r.rows[0] as any;
    for (const it of (items||[])) {
      await db.execute(sql`INSERT INTO crm_quotation_items (quotation_id, product_id, product_name, description, quantity, unit, unit_price, discount_pct, tax_rate, amount) VALUES (${q.id}, ${it.product_id||null}, ${it.product_name||null}, ${it.description||null}, ${it.quantity||1}, ${it.unit||'Nos'}, ${it.unit_price||0}, ${it.discount_pct||0}, ${it.tax_rate||0}, ${it.amount||0})`);
    }
    res.json(q);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/quotations/:id/send", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await db.execute(sql`UPDATE crm_quotations SET status='sent' WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    res.json({ success: true, status: 'sent' });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/quotations/:id/convert-to-invoice", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const qRows = await db.execute(sql`SELECT q.*, qi.* FROM crm_quotations q LEFT JOIN crm_quotation_items qi ON qi.quotation_id=q.id WHERE q.id=${parseInt(req.params.id)} AND q.tenant_id=${t} AND q.record_status=1`);
    if (!qRows.rows[0]) return res.status(404).json({ message: 'Quotation not found' });
    const q = qRows.rows[0] as any;
    if (q.converted_invoice_id) return res.status(400).json({ message: 'Already converted to invoice #'+q.converted_invoice_id });
    const countInv = await db.execute(sql`SELECT COUNT(*) as n FROM invoices WHERE tenant_id=${t}`);
    const invNo = `INV-${new Date().getFullYear()}-${String(Number((countInv.rows[0] as any).n)+1).padStart(4,'0')}`;
    const invR = await db.execute(sql`INSERT INTO invoices (tenant_id, invoice_number, invoice_date, customer_name, customer_email, customer_phone, billing_address, subtotal, tax_amount, total_amount, status, notes, record_status)
      VALUES (${t}, ${invNo}, NOW()::date, ${q.contact_name}, ${q.contact_email}, ${q.contact_phone}, ${q.billing_address}, ${q.subtotal}, ${q.tax_amount}, ${q.total_amount}, 'unpaid', ${'Converted from quotation '+q.quotation_no}, 1) RETURNING *`);
    const inv = invR.rows[0] as any;
    const items = await db.execute(sql`SELECT * FROM crm_quotation_items WHERE quotation_id=${parseInt(req.params.id)}`);
    for (const it of items.rows as any[]) {
      await db.execute(sql`INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, discount_pct, tax_rate, amount) VALUES (${inv.id}, ${it.product_id||null}, ${it.product_name||it.description||null}, ${it.quantity||1}, ${it.unit||'Nos'}, ${it.unit_price||0}, ${it.discount_pct||0}, ${it.tax_rate||0}, ${it.amount||0})`);
    }
    await db.execute(sql`UPDATE crm_quotations SET status='converted', converted_invoice_id=${inv.id}, converted_at=NOW() WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    res.json({ invoice: inv, invoice_number: inv.invoice_number });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/quotations/:id", auth, async (req: any, res) => {
  const t = tid(req);
  const { valid_until, status, terms, notes } = req.body;
  try {
    const r = await db.execute(sql`UPDATE crm_quotations SET valid_until=${valid_until||null}, status=${status||'draft'}, terms=${terms||null}, notes=${notes||null} WHERE id=${parseInt(req.params.id)} AND tenant_id=${t} RETURNING *`);
    res.json(r.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/quotations/:id/items", auth, async (req: any, res) => {
  try {
    const r = await db.execute(sql`SELECT * FROM crm_quotation_items WHERE quotation_id=${parseInt(req.params.id)} ORDER BY id`);
    res.json(r.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

// ── Drip Campaign Engine ──────────────────────────────────────────────────────

async function ensureDripTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS crm_drip_campaigns (
    id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    trigger_event VARCHAR(50) DEFAULT 'lead_created',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS crm_drip_steps (
    id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
    campaign_id INT NOT NULL, step_order INT DEFAULT 1,
    delay_days INT DEFAULT 1,
    message_type VARCHAR(20) DEFAULT 'email',
    message_template TEXT,
    subject VARCHAR(300)
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS crm_drip_enrollments (
    id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
    campaign_id INT NOT NULL, contact_id INT NOT NULL,
    current_step INT DEFAULT 0,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active',
    next_send_at TIMESTAMPTZ
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS crm_drip_log (
    id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
    enrollment_id INT, step_id INT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20), error TEXT
  )`);
}

router.get("/drip-campaigns", auth, async (req: any, res) => {
  try {
    await ensureDripTables();
    const rows = await db.execute(sql`SELECT c.*, COUNT(e.id) as enrollment_count
      FROM crm_drip_campaigns c
      LEFT JOIN crm_drip_enrollments e ON e.campaign_id=c.id
      WHERE c.tenant_id=${tid(req)}
      GROUP BY c.id ORDER BY c.created_at DESC`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/drip-campaigns", auth, async (req: any, res) => {
  try {
    await ensureDripTables();
    const { name, trigger_event, steps } = req.body;
    const camp = await db.execute(sql`INSERT INTO crm_drip_campaigns (tenant_id, name, trigger)
      VALUES (${tid(req)}, ${name}, ${trigger_event||'lead_created'}) RETURNING *`);
    const campaign = camp.rows[0] as any;
    if (steps?.length) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await db.execute(sql`INSERT INTO crm_drip_steps (tenant_id, campaign_id, step_order, delay_days, message_type, message_template, subject)
          VALUES (${tid(req)}, ${campaign.id}, ${i+1}, ${s.delay_days||1}, ${s.message_type||'email'}, ${s.message_template||null}, ${s.subject||null})`);
      }
    }
    const withSteps = await db.execute(sql`SELECT * FROM crm_drip_steps WHERE campaign_id=${campaign.id} ORDER BY step_order`);
    res.json({ ...campaign, steps: withSteps.rows });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/drip-campaigns/:id/enroll", auth, async (req: any, res) => {
  try {
    await ensureDripTables();
    const { contact_ids } = req.body;
    const campId = parseInt(req.params.id);
    // Get first step delay
    const firstStep = await db.execute(sql`SELECT delay_days FROM crm_drip_steps WHERE campaign_id=${campId} ORDER BY step_order LIMIT 1`);
    const delayDays = Number((firstStep.rows[0] as any)?.delay_days || 1);
    const nextSendAt = new Date(Date.now() + delayDays * 86400000).toISOString();
    const enrolled = [];
    for (const cid of (contact_ids || [])) {
      const e = await db.execute(sql`INSERT INTO crm_drip_enrollments (tenant_id, campaign_id, contact_id, next_send_at)
        VALUES (${tid(req)}, ${campId}, ${cid}, ${nextSendAt})
        ON CONFLICT DO NOTHING RETURNING *`);
      if (e.rows[0]) enrolled.push(e.rows[0]);
    }
    res.json({ enrolled: enrolled.length, enrollments: enrolled });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/drip-campaigns/run", auth, async (req: any, res) => {
  try {
    await ensureDripTables();
    const t = tid(req);
    // Get due enrollments
    const due = await db.execute(sql`
      SELECT e.*, c.name as campaign_name FROM crm_drip_enrollments e
      JOIN crm_drip_campaigns c ON c.id=e.campaign_id
      WHERE e.tenant_id=${t} AND e.status='active' AND e.next_send_at <= NOW()
      LIMIT 50
    `);
    let processed = 0;
    for (const enr of due.rows as any[]) {
      try {
        // Get current step
        const stepRes = await db.execute(sql`SELECT * FROM crm_drip_steps WHERE campaign_id=${enr.campaign_id} ORDER BY step_order LIMIT 1 OFFSET ${enr.current_step}`);
        const step = stepRes.rows[0] as any;
        if (!step) {
          await db.execute(sql`UPDATE crm_drip_enrollments SET status='completed' WHERE id=${enr.id}`);
          continue;
        }
        // Log send
        await db.execute(sql`INSERT INTO crm_drip_log (tenant_id, enrollment_id, step_id, status)
          VALUES (${t}, ${enr.id}, ${step.id}, 'sent')`);
        // Get next step
        const nextStepRes = await db.execute(sql`SELECT * FROM crm_drip_steps WHERE campaign_id=${enr.campaign_id} ORDER BY step_order LIMIT 1 OFFSET ${enr.current_step + 1}`);
        const nextStep = nextStepRes.rows[0] as any;
        if (!nextStep) {
          await db.execute(sql`UPDATE crm_drip_enrollments SET status='completed', current_step=${enr.current_step+1} WHERE id=${enr.id}`);
        } else {
          const nextSendAt = new Date(Date.now() + Number(nextStep.delay_days||1) * 86400000).toISOString();
          await db.execute(sql`UPDATE crm_drip_enrollments SET current_step=${enr.current_step+1}, next_send_at=${nextSendAt} WHERE id=${enr.id}`);
        }
        processed++;
      } catch (err: any) {
        await db.execute(sql`INSERT INTO crm_drip_log (tenant_id, enrollment_id, status, error)
          VALUES (${t}, ${enr.id}, 'error', ${err.message})`);
      }
    }
    res.json({ processed, total_due: due.rows.length });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/drip-campaigns/:id/stats", auth, async (req: any, res) => {
  try {
    await ensureDripTables();
    const campId = parseInt(req.params.id);
    const [enrollments, logs, completed] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as total FROM crm_drip_enrollments WHERE campaign_id=${campId} AND tenant_id=${tid(req)}`),
      db.execute(sql`SELECT COUNT(*) as sent FROM crm_drip_log l JOIN crm_drip_enrollments e ON e.id=l.enrollment_id WHERE e.campaign_id=${campId} AND l.status='sent'`),
      db.execute(sql`SELECT COUNT(*) as completed FROM crm_drip_enrollments WHERE campaign_id=${campId} AND status='completed' AND tenant_id=${tid(req)}`),
    ]);
    const total = Number((enrollments.rows[0] as any)?.total || 0);
    const comp = Number((completed.rows[0] as any)?.completed || 0);
    res.json({
      campaign_id: campId,
      total_enrolled: total,
      messages_sent: Number((logs.rows[0] as any)?.sent || 0),
      completed: comp,
      completion_rate: total > 0 ? ((comp/total)*100).toFixed(1) + '%' : '0%',
    });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

// ── Telephony / CTI ───────────────────────────────────────────────────────────

async function ensureCallTable() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS crm_call_logs (
    id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
    contact_id INT, agent_id INT,
    call_direction VARCHAR(10) DEFAULT 'outbound',
    phone VARCHAR(20), duration_secs INT DEFAULT 0,
    call_recording_url TEXT, call_notes TEXT,
    call_outcome VARCHAR(50),
    called_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

router.get("/calls", auth, async (req: any, res) => {
  try {
    await ensureCallTable();
    const rows = await db.execute(sql`
      SELECT cl.*, l.name as contact_name, u.username as agent_name
      FROM crm_call_logs cl
      LEFT JOIN crm_leads l ON l.id=cl.contact_id
      LEFT JOIN users u ON u.id=cl.agent_id
      WHERE cl.tenant_id=${tid(req)}
      ORDER BY cl.called_at DESC LIMIT 200`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/calls", auth, async (req: any, res) => {
  try {
    await ensureCallTable();
    const { contact_id, call_direction, phone, duration_secs, call_notes, call_outcome, call_recording_url } = req.body;
    const row = await db.execute(sql`INSERT INTO crm_call_logs
      (tenant_id, contact_id, agent_id, call_direction, phone, duration_secs, call_notes, call_outcome, call_recording_url)
      VALUES (${tid(req)}, ${contact_id||null}, ${req.user?.id||null}, ${call_direction||'outbound'},
              ${phone||null}, ${duration_secs||0}, ${call_notes||null}, ${call_outcome||null}, ${call_recording_url||null})
      RETURNING *`);
    // Auto-create CRM activity
    if (contact_id) {
      db.execute(sql`INSERT INTO crm_activities (tenant_id, lead_id, activity_type, notes, created_by)
        VALUES (${tid(req)}, ${contact_id}, 'call', ${call_notes||`Call - ${call_direction} - ${duration_secs||0}s`}, ${req.user?.id||null})
      `).catch(() => {});
    }
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/calls/exotel-webhook", async (req: any, res) => {
  // No auth — Exotel calls this webhook
  try {
    await ensureCallTable();
    const { CallSid, From, To, Direction, Duration, RecordingUrl, Status } = req.body;
    const phone = Direction === 'inbound' ? From : To;
    // Match to a lead
    const lead = await db.execute(sql`SELECT id FROM crm_leads WHERE phone=${phone} LIMIT 1`).catch(()=>({rows:[]}));
    const contactId = (lead.rows[0] as any)?.id || null;
    await db.execute(sql`INSERT INTO crm_call_logs
      (tenant_id, contact_id, call_direction, phone, duration_secs, call_recording_url, call_outcome, called_at)
      VALUES (1, ${contactId}, ${Direction||'inbound'}, ${phone||null}, ${parseInt(Duration)||0},
              ${RecordingUrl||null}, ${Status||null}, NOW())`);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/calls/stats", auth, async (req: any, res) => {
  try {
    await ensureCallTable();
    const t = tid(req);
    const [perAgent, outcomes, avgDur] = await Promise.all([
      db.execute(sql`SELECT u.username as agent, COUNT(*) as calls, COALESCE(SUM(cl.duration_secs),0) as total_duration
        FROM crm_call_logs cl LEFT JOIN users u ON u.id=cl.agent_id
        WHERE cl.tenant_id=${t} GROUP BY u.username ORDER BY calls DESC`),
      db.execute(sql`SELECT call_outcome, COUNT(*) as count FROM crm_call_logs WHERE tenant_id=${t} GROUP BY call_outcome`),
      db.execute(sql`SELECT ROUND(AVG(duration_secs)) as avg_duration_secs FROM crm_call_logs WHERE tenant_id=${t}`),
    ]);
    res.json({ per_agent: perAgent.rows, outcomes: outcomes.rows, avg_duration_secs: Number((avgDur.rows[0] as any)?.avg_duration_secs||0) });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

// ── Customer 360 View ─────────────────────────────────────────────────────────
router.get("/contacts/:id/360", auth, async (req: any, res) => {
  const t = tid(req);
  const cid = parseInt(req.params.id);
  try {
    await ensureDripTables();
    await ensureCallTable();
    const [contact, activities, quotations, calls, dripEnrollments] = await Promise.all([
      db.execute(sql`SELECT * FROM crm_leads WHERE id=${cid} AND tenant_id=${t}`),
      db.execute(sql`SELECT * FROM crm_activities WHERE lead_id=${cid} AND tenant_id=${t} ORDER BY created_at DESC LIMIT 20`).catch(()=>({rows:[]})),
      db.execute(sql`SELECT * FROM crm_quotations WHERE lead_id=${cid} AND tenant_id=${t} ORDER BY created_at DESC LIMIT 10`).catch(()=>({rows:[]})),
      db.execute(sql`SELECT * FROM crm_call_logs WHERE contact_id=${cid} AND tenant_id=${t} ORDER BY called_at DESC LIMIT 20`),
      db.execute(sql`SELECT e.*, c.name as campaign_name FROM crm_drip_enrollments e JOIN crm_drip_campaigns c ON c.id=e.campaign_id WHERE e.contact_id=${cid} AND e.tenant_id=${t}`),
    ]);
    const c = contact.rows[0] as any;
    if (!c) return res.status(404).json({ message: 'Contact not found' });
    // RFV lead score: recency + frequency + value
    const daysSinceActivity = activities.rows.length ? Math.floor((Date.now() - new Date((activities.rows[0] as any).created_at).getTime()) / 86400000) : 999;
    const rfvScore = Math.max(0, 100 - daysSinceActivity) + quotations.rows.length * 5 + Number(c.estimated_value||0) / 1000;
    res.json({
      contact: c,
      activities: activities.rows,
      quotations: quotations.rows,
      call_history: calls.rows,
      drip_enrollments: dripEnrollments.rows,
      lead_score: Math.round(rfvScore),
    });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

// ── Phase 17: Pipeline Kanban / Deals ─────────────────────────────────────────

async function ensureDealsTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS crm_deals (
      id SERIAL PRIMARY KEY, tenant_id INT,
      title VARCHAR(300), contact_id INT, contact_name VARCHAR(200),
      value NUMERIC(12,2) DEFAULT 0, currency VARCHAR(3) DEFAULT 'INR',
      stage VARCHAR(50) DEFAULT 'lead',
      probability INT DEFAULT 10,
      expected_close_date DATE, actual_close_date DATE,
      owner_id INT, owner_name VARCHAR(200),
      source VARCHAR(100),
      lost_reason TEXT, notes TEXT, quotation_id INT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

const STAGE_PROBABILITY: Record<string, number> = {
  lead: 10, qualified: 25, proposal: 40, negotiation: 70, won: 100, lost: 0
};

router.get("/deals", auth, async (req: any, res) => {
  try {
    await ensureDealsTables();
    const t = (req as any).session?.tenantId ?? (req as any).user?.tenantId ?? 1;
    let rows = await db.execute(sql`SELECT * FROM crm_deals WHERE tenant_id=${t} ORDER BY updated_at DESC`);
    let deals = rows.rows as any[];
    if (req.query.stage) deals = deals.filter(d => d.stage === req.query.stage);
    if (req.query.contact_id) deals = deals.filter(d => Number(d.contact_id) === Number(req.query.contact_id));
    res.json(deals);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/deals", auth, async (req: any, res) => {
  try {
    await ensureDealsTables();
    const t = (req as any).session?.tenantId ?? (req as any).user?.tenantId ?? 1;
    const { title, contact_id, contact_name, value, stage, expected_close_date, owner_id, owner_name, source, notes, quotation_id } = req.body;
    const stg = stage || 'lead';
    const prob = STAGE_PROBABILITY[stg] ?? 10;
    const rows = await db.execute(sql`
      INSERT INTO crm_deals (tenant_id, title, contact_id, contact_name, value, stage, probability, expected_close_date, owner_id, owner_name, source, notes, quotation_id)
      VALUES (${t}, ${title}, ${contact_id||null}, ${contact_name||null}, ${value||0}, ${stg}, ${prob}, ${expected_close_date||null}, ${owner_id||null}, ${owner_name||null}, ${source||null}, ${notes||null}, ${quotation_id||null})
      RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/deals/:id", auth, async (req: any, res) => {
  try {
    await ensureDealsTables();
    const t = (req as any).session?.tenantId ?? (req as any).user?.tenantId ?? 1;
    const rows = await db.execute(sql`SELECT * FROM crm_deals WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    if (!rows.rows[0]) return res.status(404).json({ message: 'Not found' });
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/deals/:id", auth, async (req: any, res) => {
  try {
    await ensureDealsTables();
    const t = (req as any).session?.tenantId ?? (req as any).user?.tenantId ?? 1;
    const { title, contact_id, contact_name, value, stage, probability, expected_close_date, owner_id, owner_name, source, notes, lost_reason } = req.body;
    const stg = stage;
    const prob = probability ?? (stg ? STAGE_PROBABILITY[stg] : undefined);
    const rows = await db.execute(sql`
      UPDATE crm_deals SET
        title=COALESCE(${title||null}, title),
        contact_id=COALESCE(${contact_id||null}, contact_id),
        contact_name=COALESCE(${contact_name||null}, contact_name),
        value=COALESCE(${value!=null?value:null}, value),
        stage=COALESCE(${stg||null}, stage),
        probability=COALESCE(${prob!=null?prob:null}, probability),
        expected_close_date=COALESCE(${expected_close_date||null}, expected_close_date),
        owner_id=COALESCE(${owner_id||null}, owner_id),
        owner_name=COALESCE(${owner_name||null}, owner_name),
        source=COALESCE(${source||null}, source),
        notes=COALESCE(${notes||null}, notes),
        lost_reason=COALESCE(${lost_reason||null}, lost_reason),
        updated_at=NOW()
      WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}
      RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/deals/:id/move", auth, async (req: any, res) => {
  try {
    await ensureDealsTables();
    const t = (req as any).session?.tenantId ?? (req as any).user?.tenantId ?? 1;
    const { stage } = req.body;
    const prob = STAGE_PROBABILITY[stage] ?? 10;
    const rows = await db.execute(sql`
      UPDATE crm_deals SET stage=${stage}, probability=${prob}, updated_at=NOW()
      WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}
      RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/deals/:id/won", auth, async (req: any, res) => {
  try {
    await ensureDealsTables();
    const t = (req as any).session?.tenantId ?? (req as any).user?.tenantId ?? 1;
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db.execute(sql`
      UPDATE crm_deals SET stage='won', probability=100, actual_close_date=${today}, updated_at=NOW()
      WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}
      RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/deals/:id/lost", auth, async (req: any, res) => {
  try {
    await ensureDealsTables();
    const t = (req as any).session?.tenantId ?? (req as any).user?.tenantId ?? 1;
    const { lost_reason } = req.body;
    if (!lost_reason) return res.status(400).json({ message: 'lost_reason is required' });
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db.execute(sql`
      UPDATE crm_deals SET stage='lost', probability=0, actual_close_date=${today}, lost_reason=${lost_reason}, updated_at=NOW()
      WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}
      RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/pipeline/summary", auth, async (req: any, res) => {
  try {
    await ensureDealsTables();
    const t = (req as any).session?.tenantId ?? (req as any).user?.tenantId ?? 1;
    const rows = await db.execute(sql`SELECT * FROM crm_deals WHERE tenant_id=${t} ORDER BY stage, updated_at DESC`);
    const deals = rows.rows as any[];
    const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
    const summary = stages.map(stage => {
      const stageDeals = deals.filter(d => d.stage === stage);
      return {
        stage,
        count: stageDeals.length,
        total_value: stageDeals.reduce((s, d) => s + parseFloat(d.value || 0), 0),
        deals: stageDeals
      };
    });
    res.json({ stages: summary });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/pipeline/forecast", auth, async (req: any, res) => {
  try {
    await ensureDealsTables();
    const t = (req as any).session?.tenantId ?? (req as any).user?.tenantId ?? 1;
    const rows = await db.execute(sql`
      SELECT * FROM crm_deals WHERE tenant_id=${t} AND stage NOT IN ('won','lost')
      AND expected_close_date IS NOT NULL
      ORDER BY expected_close_date
    `);
    // Group by month
    const byMonth: Record<string, { month: string, weighted_value: number, deals: any[] }> = {};
    for (const deal of rows.rows as any[]) {
      const monthKey = (deal.expected_close_date as string)?.slice(0, 7) || 'unknown';
      if (!byMonth[monthKey]) byMonth[monthKey] = { month: monthKey, weighted_value: 0, deals: [] };
      byMonth[monthKey].weighted_value += parseFloat(deal.value || 0) * (parseInt(deal.probability || 10) / 100);
      byMonth[monthKey].deals.push(deal);
    }
    res.json({ forecast: Object.values(byMonth) });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Drip Campaigns + AI Lead Scoring ─────────────────────────────────────────

router.get('/drip-campaigns', auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureDripTables();
    const rows = await db.execute(sql`SELECT * FROM crm_drip_campaigns WHERE tenant_id=${t} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/drip-campaigns', auth, async (req: any, res) => {
  const t = tid(req);
  const { name, trigger_event, target_segment, steps } = req.body;
  try {
    await ensureDripTables();
    const row = await db.execute(sql`INSERT INTO crm_drip_campaigns (tenant_id, name, trigger)
      VALUES (${t}, ${name}, ${trigger_event||'manual'}) RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/drip-campaigns/:id', auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureDripTables();
    const row = await db.execute(sql`SELECT c.*, (SELECT COUNT(*) FROM crm_drip_enrollments WHERE campaign_id=c.id AND tenant_id=${t}) as enrollment_count FROM crm_drip_campaigns c WHERE c.id=${req.params.id} AND c.tenant_id=${t}`);
    if (!row.rows[0]) return res.status(404).json({ message: 'Campaign not found' });
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.put('/drip-campaigns/:id', auth, async (req: any, res) => {
  const t = tid(req);
  const { name, trigger_event, target_segment, steps, is_active } = req.body;
  try {
    await ensureDripTables();
    const row = await db.execute(sql`UPDATE crm_drip_campaigns SET
      name=COALESCE(${name},name), trigger=COALESCE(${trigger_event},trigger)
      WHERE id=${req.params.id} AND tenant_id=${t} RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/drip-campaigns/:id/enroll', auth, async (req: any, res) => {
  const t = tid(req);
  const { contact_ids, segment } = req.body;
  try {
    await ensureDripTables();
    const campaign = await db.execute(sql`SELECT * FROM crm_drip_campaigns WHERE id=${req.params.id} AND tenant_id=${t}`);
    if (!campaign.rows[0]) return res.status(404).json({ message: 'Campaign not found' });
    const c = campaign.rows[0] as any;
    const steps = c.steps || [];
    const firstStepDays = steps.length > 0 ? (steps[0].day || 1) : 1;
    const nextSendAt = new Date(Date.now() + firstStepDays * 86400000).toISOString();
    let ids: number[] = contact_ids || [];
    if (segment === 'all_leads') {
      const contacts = await db.execute(sql`SELECT id FROM crm_contacts WHERE tenant_id=${t} AND status='lead'`).catch(() => ({ rows: [] }));
      ids = (contacts as any).rows.map((r: any) => r.id);
    }
    let enrolled = 0;
    for (const contactId of ids) {
      await db.execute(sql`INSERT INTO crm_drip_enrollments (tenant_id, campaign_id, contact_id, next_send_at)
        VALUES (${t}, ${req.params.id}, ${contactId}, ${nextSendAt}) ON CONFLICT DO NOTHING`).catch(() => {});
      enrolled++;
    }
    res.json({ enrolled, next_send_at: nextSendAt });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/drip/process-due', auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureDripTables();
    const due = await db.execute(sql`
      SELECT e.*, c.steps FROM crm_drip_enrollments e
      JOIN crm_drip_campaigns c ON c.id=e.campaign_id
      WHERE e.tenant_id=${t} AND e.status='active' AND e.next_send_at <= NOW()
    `).catch(() => ({ rows: [] }));
    let processed = 0; let sent = 0;
    for (const enrollment of (due as any).rows) {
      const e = enrollment as any;
      const steps = e.steps || [];
      const currentStep = e.current_step || 0;
      if (currentStep >= steps.length) {
        await db.execute(sql`UPDATE crm_drip_enrollments SET status='completed' WHERE id=${e.id}`).catch(() => {});
        processed++;
        continue;
      }
      const step = steps[currentStep];
      // Send notification (simulated)
      console.log(`[Drip] Sending step ${currentStep} (${step?.channel}) to contact ${e.contact_id}`);
      sent++;
      const nextStep = currentStep + 1;
      if (nextStep >= steps.length) {
        await db.execute(sql`UPDATE crm_drip_enrollments SET status='completed', last_sent_at=NOW(), current_step=${nextStep} WHERE id=${e.id}`).catch(() => {});
      } else {
        const nextStepDays = steps[nextStep].day || (currentStep + 2);
        const nextSendAt = new Date(Date.now() + nextStepDays * 86400000).toISOString();
        await db.execute(sql`UPDATE crm_drip_enrollments SET current_step=${nextStep}, next_send_at=${nextSendAt}, last_sent_at=NOW() WHERE id=${e.id}`).catch(() => {});
      }
      processed++;
    }
    res.json({ processed, sent });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/leads/:id/score', auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureDripTables();
    const contact = await db.execute(sql`SELECT * FROM crm_contacts WHERE id=${req.params.id} AND tenant_id=${t}`).catch(() => ({ rows: [] }));
    if (!(contact as any).rows[0]) return res.status(404).json({ message: 'Contact not found' });
    const c = (contact as any).rows[0] as any;
    const deals = await db.execute(sql`SELECT * FROM crm_deals WHERE contact_id=${c.id} AND tenant_id=${t} ORDER BY updated_at DESC LIMIT 1`).catch(() => ({ rows: [] }));
    const deal = (deals as any).rows[0] as any;
    const activities = await db.execute(sql`SELECT MAX(created_at) as last_activity FROM crm_activities WHERE contact_id=${c.id} AND tenant_id=${t}`).catch(() => ({ rows: [{ last_activity: null }] }));
    const lastActivity = (activities as any).rows[0]?.last_activity;

    let score = 0; let reasoning = '';
    const breakdown: any = { engagement: 0, fit: 0, behavior: 0, demographic: 0 };

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        const anthropic = new Anthropic();
        const prompt = `Score this lead 0-100 for sales readiness. Data: ${JSON.stringify({ name: c.name, company: c.company, email: c.email, phone: c.phone, industry: c.industry, deal_stage: deal?.stage, deal_value: deal?.value, last_activity: lastActivity })}. Respond with JSON: {"score": <number>, "grade": "<A|B|C|D>", "reasoning": "<brief explanation>", "breakdown": {"engagement": <0-25>, "fit": <0-25>, "behavior": <0-25>, "demographic": <0-25>}}`;
        const message = await anthropic.messages.create({ model: 'claude-opus-4-5', max_tokens: 256, messages: [{ role: 'user', content: prompt }] });
        const text = (message.content[0] as any).text;
        const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
        score = parsed.score || 0;
        reasoning = parsed.reasoning || '';
        Object.assign(breakdown, parsed.breakdown || {});
      } catch { /* fallback below */ }
    }

    if (score === 0) {
      if (c.phone) { score += 15; breakdown.demographic += 15; }
      if (c.email) { score += 10; breakdown.demographic += 10; }
      if (c.company) { score += 10; breakdown.fit += 10; }
      if (deal) { score += 25; breakdown.behavior += 25; }
      if (deal?.stage === 'proposal') { score += 20; breakdown.engagement += 20; }
      if (lastActivity && (Date.now() - new Date(lastActivity).getTime()) < 7 * 86400000) { score += 20; breakdown.engagement += 20; }
      reasoning = `Rule-based score: phone(${c.phone?15:0}), email(${c.email?10:0}), company(${c.company?10:0}), deal(${deal?25:0}), proposal(${deal?.stage==='proposal'?20:0}), recent_activity(${lastActivity&&(Date.now()-new Date(lastActivity).getTime())<7*86400000?20:0})`;
    }
    const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
    await db.execute(sql`INSERT INTO crm_lead_scores (tenant_id, contact_id, score, grade, score_breakdown, ai_reasoning)
      VALUES (${t}, ${c.id}, ${score}, ${grade}, ${JSON.stringify(breakdown)}, ${reasoning})
      ON CONFLICT DO NOTHING`).catch(() => {});
    res.json({ score, grade, breakdown, reasoning });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/leads/score-all', auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureDripTables();
    const contacts = await db.execute(sql`SELECT * FROM crm_contacts WHERE tenant_id=${t} AND status='lead'`).catch(() => ({ rows: [] }));
    let scored = 0; let totalScore = 0;
    for (const contact of (contacts as any).rows) {
      const c = contact as any;
      let score = 0;
      const deals = await db.execute(sql`SELECT * FROM crm_deals WHERE contact_id=${c.id} AND tenant_id=${t} ORDER BY updated_at DESC LIMIT 1`).catch(() => ({ rows: [] }));
      const deal = (deals as any).rows[0] as any;
      const activities = await db.execute(sql`SELECT MAX(created_at) as last_activity FROM crm_activities WHERE contact_id=${c.id} AND tenant_id=${t}`).catch(() => ({ rows: [{ last_activity: null }] }));
      const lastActivity = (activities as any).rows[0]?.last_activity;
      const breakdown: any = { engagement: 0, fit: 0, behavior: 0, demographic: 0 };
      if (c.phone) { score += 15; breakdown.demographic += 15; }
      if (c.email) { score += 10; breakdown.demographic += 10; }
      if (c.company) { score += 10; breakdown.fit += 10; }
      if (deal) { score += 25; breakdown.behavior += 25; }
      if (deal?.stage === 'proposal') { score += 20; breakdown.engagement += 20; }
      if (lastActivity && (Date.now() - new Date(lastActivity).getTime()) < 7 * 86400000) { score += 20; breakdown.engagement += 20; }
      const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
      const reasoning = 'Rule-based batch score';
      await db.execute(sql`INSERT INTO crm_lead_scores (tenant_id, contact_id, score, grade, score_breakdown, ai_reasoning)
        VALUES (${t}, ${c.id}, ${score}, ${grade}, ${JSON.stringify(breakdown)}, ${reasoning})
        ON CONFLICT DO NOTHING`).catch(() => {});
      scored++; totalScore += score;
    }
    res.json({ scored, avg_score: scored > 0 ? Math.round(totalScore / scored) : 0 });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/leads/scores', auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureDripTables();
    const rows = await db.execute(sql`
      SELECT ls.*, c.name, c.email, c.company, c.phone FROM crm_lead_scores ls
      LEFT JOIN crm_contacts c ON c.id=ls.contact_id
      WHERE ls.tenant_id=${t} ORDER BY ls.score DESC LIMIT 200
    `).catch(() => ({ rows: [] }));
    res.json((rows as any).rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/pipeline/by-score', auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureDripTables();
    const grades = ['A', 'B', 'C', 'D'];
    const result: any[] = [];
    for (const grade of grades) {
      const rows = await db.execute(sql`
        SELECT d.*, c.name as contact_name, ls.score, ls.grade
        FROM crm_deals d
        LEFT JOIN crm_contacts c ON c.id=d.contact_id
        LEFT JOIN crm_lead_scores ls ON ls.contact_id=d.contact_id AND ls.tenant_id=${t}
        WHERE d.tenant_id=${t} AND ls.grade=${grade}
        ORDER BY ls.score DESC
      `).catch(() => ({ rows: [] }));
      result.push({ grade, deals: (rows as any).rows, count: (rows as any).rows.length });
    }
    res.json({ pipeline_by_grade: result });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

// ── Task spec exact path aliases ──────────────────────────────────────────────

router.post('/drip/campaigns', auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureDripTables();
    const { name, trigger_event, steps, status } = req.body;
    const stepsJson = steps ? JSON.stringify(steps) : '[]';
    const row = await db.execute(sql`INSERT INTO crm_drip_campaigns (tenant_id, name, trigger_event, steps, status)
      VALUES (${t}, ${name}, ${trigger_event||'lead_created'}, ${stepsJson}::jsonb, ${status||'active'}) RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.put('/drip/campaigns/:id', auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureDripTables();
    const { name, trigger_event, steps, status } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (trigger_event !== undefined) updates.trigger_event = trigger_event;
    if (status !== undefined) updates.status = status;
    const stepsStr = steps ? JSON.stringify(steps) : undefined;
    const row = await db.execute(sql`UPDATE crm_drip_campaigns SET
      name=COALESCE(${name||null}, name), trigger_event=COALESCE(${trigger_event||null}, trigger_event),
      status=COALESCE(${status||null}, status),
      steps=CASE WHEN ${stepsStr||null}::text IS NOT NULL THEN ${stepsStr||null}::jsonb ELSE steps END
      WHERE id=${Number(req.params.id)} AND tenant_id=${t} RETURNING *`);
    if (!row.rows[0]) return res.status(404).json({ message: 'Campaign not found' });
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/drip/campaigns/:id/enroll', auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureDripTables();
    const { contact_id } = req.body;
    const camp = await db.execute(sql`SELECT * FROM crm_drip_campaigns WHERE id=${Number(req.params.id)} AND tenant_id=${t}`);
    if (!(camp as any).rows[0]) return res.status(404).json({ message: 'Campaign not found' });
    const c = (camp as any).rows[0] as any;
    const steps = c.steps || [];
    const step0DelayDays = steps[0]?.day ?? 0;
    const nextActionAt = new Date(Date.now() + step0DelayDays * 86400000).toISOString();
    const row = await db.execute(sql`INSERT INTO crm_drip_enrollments (tenant_id, campaign_id, contact_id, enrolled_at, current_step, next_action_at, status)
      VALUES (${t}, ${Number(req.params.id)}, ${contact_id}, NOW(), 0, ${nextActionAt}, 'active') RETURNING *`);
    await db.execute(sql`UPDATE crm_drip_campaigns SET enrolled_count=enrolled_count+1 WHERE id=${Number(req.params.id)}`).catch(() => {});
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/drip/enrollments', auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureDripTables();
    const rows = await db.execute(sql`SELECT e.*, c.name AS contact_name, c.email AS contact_email, dc.name AS campaign_name
      FROM crm_drip_enrollments e
      LEFT JOIN crm_contacts c ON c.id=e.contact_id
      LEFT JOIN crm_drip_campaigns dc ON dc.id=e.campaign_id
      WHERE e.tenant_id=${t} AND e.status='active' ORDER BY e.enrolled_at DESC LIMIT 200`).catch(() => ({ rows: [] }));
    res.json((rows as any).rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/drip/process', auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureDripTables();
    const due = await db.execute(sql`
      SELECT e.*, dc.steps FROM crm_drip_enrollments e
      JOIN crm_drip_campaigns dc ON dc.id=e.campaign_id
      WHERE e.tenant_id=${t} AND e.status='active' AND e.next_action_at <= NOW()
    `).catch(() => ({ rows: [] }));
    let processed = 0; let sent = 0;
    for (const enrollment of (due as any).rows) {
      const e = enrollment as any;
      const steps: any[] = e.steps || [];
      const currentStep = e.current_step || 0;
      if (currentStep >= steps.length) {
        await db.execute(sql`UPDATE crm_drip_enrollments SET status='completed', completed_at=NOW() WHERE id=${e.id}`).catch(() => {});
        processed++; continue;
      }
      const step = steps[currentStep];
      // Fire notification
      notifSend({ tenantId: t, channel: step.type || 'email', recipient: String(e.contact_id), message: step.message || step.body || '', subject: step.subject }).catch(err => console.error('drip notif', err));
      sent++;
      const nextStep = currentStep + 1;
      if (nextStep >= steps.length) {
        await db.execute(sql`UPDATE crm_drip_enrollments SET status='completed', completed_at=NOW(), current_step=${nextStep} WHERE id=${e.id}`).catch(() => {});
      } else {
        const delayDays = steps[nextStep].day || (currentStep + 2);
        const nextAt = new Date(Date.now() + delayDays * 86400000).toISOString();
        await db.execute(sql`UPDATE crm_drip_enrollments SET current_step=${nextStep}, next_action_at=${nextAt} WHERE id=${e.id}`).catch(() => {});
      }
      processed++;
    }
    res.json({ processed, sent });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/leads/score/:contactId', auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureDripTables();
    const contact = await db.execute(sql`SELECT * FROM crm_contacts WHERE id=${Number(req.params.contactId)} AND tenant_id=${t}`).catch(() => ({ rows: [] }));
    if (!(contact as any).rows[0]) return res.status(404).json({ message: 'Contact not found' });
    const c = (contact as any).rows[0] as any;
    const deals = await db.execute(sql`SELECT COUNT(*) as cnt, COALESCE(SUM(value),0) as total FROM crm_deals WHERE contact_id=${c.id} AND tenant_id=${t}`).catch(() => ({ rows: [{ cnt: 0, total: 0 }] }));
    const dealCount = parseInt((deals as any).rows[0]?.cnt || '0');
    const dealValue = parseFloat((deals as any).rows[0]?.total || '0');
    let score = 0; let grade = 'D'; let factors: any = {};
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        const anthropic = new Anthropic();
        const prompt = `Score this sales lead 0-100. Contact: ${JSON.stringify({ name: c.name, company: c.company, email: c.email, phone: c.phone, notes: c.notes })}. Deals: count=${dealCount}, value=${dealValue}. Respond JSON: {"score":<number>,"grade":"<A|B|C|D>","factors":{}}`;
        const msg = await anthropic.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 200, messages: [{ role: 'user', content: prompt }] });
        const parsed = JSON.parse(((msg.content[0] as any).text || '{}').match(/\{[\s\S]*\}/)?.[0] || '{}');
        score = parsed.score || 0; grade = parsed.grade || 'D'; factors = parsed.factors || {};
      } catch { /* fallback */ }
    }
    if (score === 0) {
      if (c.company) { score += 20; factors.company = 20; }
      if (c.phone) { score += 10; factors.phone = 10; }
      if (dealCount > 0) { score += 30; factors.deals = 30; }
      if (dealValue > 1000000) { score += 20; factors.high_value = 20; }
      grade = score >= 70 ? 'A' : score >= 50 ? 'B' : score >= 30 ? 'C' : 'D';
      factors.model = 'heuristic';
    }
    await db.execute(sql`INSERT INTO crm_lead_scores (tenant_id, contact_id, score, grade, factors, scored_at, model)
      VALUES (${t}, ${c.id}, ${score}, ${grade}, ${JSON.stringify(factors)}::jsonb, NOW(), ${factors.model||'anthropic'})
      ON CONFLICT (contact_id) DO UPDATE SET score=${score}, grade=${grade}, factors=${JSON.stringify(factors)}::jsonb, scored_at=NOW()`
    ).catch(e => console.error('GL', e));
    res.json({ contact_id: c.id, score, grade, factors });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
