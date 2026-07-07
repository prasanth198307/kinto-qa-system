import { db } from './db';
import { sql } from 'drizzle-orm';
import { Router } from 'express';

export const notifRouter = Router();

// Ensure log table
async function ensureNotifTable() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS notif_log (
    id SERIAL PRIMARY KEY, tenant_id INT,
    channel VARCHAR(20),
    recipient VARCHAR(200), message TEXT,
    status VARCHAR(20) DEFAULT 'sent',
    error_msg TEXT, attempt_count INT DEFAULT 1,
    entity_type VARCHAR(50), entity_id INT,
    created_at TIMESTAMPTZ DEFAULT NOW(), sent_at TIMESTAMPTZ
  )`);
}

// ─── WhatsApp ────────────────────────────────────────────────────────────────
async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  if (!phone || !message) return false;
  const cleanPhone = phone.replace(/\s/g,'').replace(/^0/,'+91');

  if (process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_PHONE_ID) {
    try {
      const resp = await fetch(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
        method:'POST',
        headers:{'Authorization':`Bearer ${process.env.WHATSAPP_API_KEY}`,'Content-Type':'application/json'},
        body: JSON.stringify({ messaging_product:'whatsapp', to: cleanPhone, type:'text', text:{body: message} })
      });
      const data = await resp.json() as any;
      return !data.error;
    } catch { return false; }
  }
  // Simulation — log to console
  console.log(`[WhatsApp SIM] To: ${cleanPhone} | ${message.substring(0,80)}...`);
  return true;
}

// ─── SMS ─────────────────────────────────────────────────────────────────────
async function sendSMS(phone: string, message: string): Promise<boolean> {
  if (!phone || !message) return false;
  const cleanPhone = phone.replace(/\s/g,'');

  if (process.env.TWOFACTOR_API_KEY) {
    try {
      const resp = await fetch(`https://2factor.in/API/V1/${process.env.TWOFACTOR_API_KEY}/SMS/${cleanPhone}/AUTOGEN3/${encodeURIComponent(message)}`);
      const data = await resp.json() as any;
      return data.Status === 'Success';
    } catch { return false; }
  }
  if (process.env.MSG91_AUTH_KEY) {
    try {
      const resp = await fetch('https://api.msg91.com/api/v5/flow/', {
        method:'POST', headers:{'authkey': process.env.MSG91_AUTH_KEY,'Content-Type':'application/json'},
        body: JSON.stringify({ template_id: process.env.MSG91_TEMPLATE_ID||'', mobiles: cleanPhone, message })
      });
      return resp.ok;
    } catch { return false; }
  }
  console.log(`[SMS SIM] To: ${cleanPhone} | ${message.substring(0,80)}...`);
  return true;
}

// ─── Email ───────────────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  if (!to) return false;
  if (process.env.SENDGRID_API_KEY) {
    try {
      const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method:'POST',
        headers:{'Authorization':`Bearer ${process.env.SENDGRID_API_KEY}`,'Content-Type':'application/json'},
        body: JSON.stringify({
          personalizations:[{to:[{email:to}],subject}],
          from:{email: process.env.FROM_EMAIL||'noreply@swacherp.com', name:'SwachERP'},
          content:[{type:'text/plain',value:body}]
        })
      });
      return resp.status === 202;
    } catch { return false; }
  }
  console.log(`[Email SIM] To: ${to} | Subject: ${subject} | ${body.substring(0,80)}...`);
  return true;
}

// ─── Main send function ──────────────────────────────────────────────────────
export interface NotifPayload {
  tenantId: number;
  channel: 'whatsapp' | 'sms' | 'email' | 'all';
  recipient: string;          // phone for whatsapp/sms, email for email
  message: string;
  subject?: string;           // for email
  entityType?: string;
  entityId?: number;
}

export async function notifSend(payload: NotifPayload): Promise<{sent: boolean, channels: string[]}> {
  await ensureNotifTable();
  const channels: string[] = [];

  const tryChannel = async (ch: string, fn: () => Promise<boolean>) => {
    let status = 'pending', error = '';
    let sent = false;
    try { sent = await fn(); status = sent ? 'sent' : 'failed'; } catch(e:any) { status='failed'; error=e.message; }
    if (sent) channels.push(ch);
    await db.execute(sql`INSERT INTO notif_log (tenant_id,channel,recipient,message,status,error_msg,entity_type,entity_id,sent_at)
      VALUES (${payload.tenantId},${ch},${payload.recipient},${payload.message},${status},${error||null},${payload.entityType||null},${payload.entityId||null},${sent?sql`NOW()`:sql`NULL`})`
    ).catch(()=>{});
    return sent;
  };

  if (payload.channel === 'whatsapp' || payload.channel === 'all') {
    await tryChannel('whatsapp', () => sendWhatsApp(payload.recipient, payload.message));
  }
  if (payload.channel === 'sms' || payload.channel === 'all') {
    await tryChannel('sms', () => sendSMS(payload.recipient, payload.message));
  }
  if ((payload.channel === 'email' || payload.channel === 'all') && payload.subject) {
    await tryChannel('email', () => sendEmail(payload.recipient, payload.subject!, payload.message));
  }

  return { sent: channels.length > 0, channels };
}

// ─── Template registry — shared contract: notifSendTemplate({phone, channel, template, vars}) ───
export const NOTIF_TEMPLATES: Record<string, { body: string; subject?: string }> = {
  fee_due:                { body: "Dear {{name}}, fee of ₹{{amount}} for {{student}} is due on {{due_date}}. Please pay to avoid late charges. — {{org}}" },
  emi_due:                { body: "Dear {{name}}, your EMI of ₹{{amount}} for loan {{loan_number}} is due on {{due_date}}. Please pay on time. — {{org}}" },
  fd_maturity:            { body: "Dear {{name}}, your deposit {{account_number}} matures on {{maturity_date}} with maturity value ₹{{amount}}. Visit us to renew or withdraw. — {{org}}" },
  appointment_reminder:   { body: "Dear {{name}}, reminder: your appointment with {{doctor}} is on {{date}} at {{time}}. — {{org}}" },
  hotel_checkin:          { body: "Dear {{name}}, welcome to {{org}}! You are checked in to room {{room}}. Check-out: {{checkout_date}}. Dial 9 for room service. Enjoy your stay!" },
  hotel_checkout:         { body: "Dear {{name}}, thank you for staying at {{org}}. Your bill of ₹{{amount}} is settled. We hope to see you again!" },
  restaurant_order_status:{ body: "Hi {{name}}, your order {{order_number}} at {{org}} is now {{status}}.{{extra}}" },
  order_ready:            { body: "Hi {{name}}, your order {{order_number}} is ready for pickup at {{org}}!" },
  donation_receipt:       { body: "Dear {{name}}, thank you for your donation of ₹{{amount}} to {{org}}. Receipt no: {{receipt_number}}. 80G certificate will follow by email.", subject: "Donation Receipt — {{org}}" },
  booking_confirmation:   { body: "Dear {{name}}, your booking {{booking_number}} at {{org}} is confirmed for {{date}}. — {{org}}" },
};

export function renderTemplate(template: string, vars: Record<string, any>): { body: string; subject?: string } {
  const t = NOTIF_TEMPLATES[template];
  if (!t) throw new Error(`Unknown notification template: ${template}`);
  const fill = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ""));
  return { body: fill(t.body), subject: t.subject ? fill(t.subject) : undefined };
}

export interface NotifTemplatePayload {
  tenantId: number;
  phone: string;                       // or email for channel 'email'
  channel?: 'whatsapp' | 'sms' | 'email' | 'all';
  template: string;
  vars: Record<string, any>;
  entityType?: string;
  entityId?: number;
}

export async function notifSendTemplate(p: NotifTemplatePayload): Promise<{sent: boolean, channels: string[]}> {
  const { body, subject } = renderTemplate(p.template, p.vars);
  return notifSend({
    tenantId: p.tenantId, channel: p.channel || 'whatsapp', recipient: p.phone,
    message: body, subject, entityType: p.entityType || p.template, entityId: p.entityId,
  });
}

// ─── HTTP Routes ─────────────────────────────────────────────────────────────
const requireAuth = (req:any,res:any,next:any) => { if(!req.isAuthenticated?.()&&!req.user) return res.status(401).json({message:"Unauthorized"}); next(); };
const tid = (req:any):number => req.session?.tenantId ?? req.user?.tenantId ?? 1;

// POST /api/notifications/send
notifRouter.post('/send', requireAuth, async (req:any, res) => {
  try {
    const t = tid(req);
    const { channel, recipient, message, subject, entity_type, entity_id } = req.body;
    if (!recipient || !message) return res.status(400).json({ message: 'recipient and message required' });
    const result = await notifSend({ tenantId: t, channel: channel||'whatsapp', recipient, message, subject, entityType: entity_type, entityId: entity_id });
    res.json(result);
  } catch(e:any) { res.status(500).json({ message: e.message }); }
});

// POST /api/notifications/bulk
notifRouter.post('/bulk', requireAuth, async (req:any, res) => {
  try {
    const t = tid(req);
    const { notifications } = req.body; // array of {channel, recipient, message, subject}
    if (!Array.isArray(notifications)) return res.status(400).json({ message: 'notifications array required' });
    const results = await Promise.allSettled(
      notifications.map((n:any) => notifSend({ tenantId: t, ...n }))
    );
    const sent = results.filter(r => r.status === 'fulfilled' && (r.value as any).sent).length;
    res.json({ total: notifications.length, sent, failed: notifications.length - sent });
  } catch(e:any) { res.status(500).json({ message: e.message }); }
});

// POST /api/notifications/send-template — { template, phone, vars, channel? }
notifRouter.post('/send-template', requireAuth, async (req:any, res) => {
  try {
    const t = tid(req);
    const { template, phone, vars, channel, entity_type, entity_id } = req.body;
    if (!template || !phone) return res.status(400).json({ message: 'template and phone required' });
    const result = await notifSendTemplate({ tenantId: t, phone, template, vars: vars || {}, channel, entityType: entity_type, entityId: entity_id });
    res.json(result);
  } catch(e:any) { res.status(500).json({ message: e.message }); }
});

// GET /api/notifications/templates
notifRouter.get('/templates', requireAuth, (_req, res) => {
  res.json(Object.entries(NOTIF_TEMPLATES).map(([name, t]) => ({ name, body: t.body, subject: t.subject || null })));
});

// GET /api/notifications/log
notifRouter.get('/log', requireAuth, async (req:any, res) => {
  const t = tid(req);
  await ensureNotifTable();
  const { channel, status, limit: lim } = req.query;
  const r = await db.execute(sql`
    SELECT * FROM notif_log WHERE tenant_id=${t}
    ${channel ? sql`AND channel=${channel as string}` : sql``}
    ${status ? sql`AND status=${status as string}` : sql``}
    ORDER BY created_at DESC LIMIT ${parseInt(lim as string)||50}
  `);
  res.json(r.rows);
});

// GET /api/notifications/stats
notifRouter.get('/stats', requireAuth, async (req:any, res) => {
  const t = tid(req);
  await ensureNotifTable();
  const r = await db.execute(sql`
    SELECT channel, status, COUNT(*) as count FROM notif_log WHERE tenant_id=${t}
    AND created_at >= NOW() - INTERVAL '30 days' GROUP BY channel, status
  `);
  res.json(r.rows);
});

export default notifRouter;
