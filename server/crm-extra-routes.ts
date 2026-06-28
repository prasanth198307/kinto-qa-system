import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import nodemailer from "nodemailer";

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

export default router;
