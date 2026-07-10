import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { whatsappService } from "./whatsappService";

export const swachformsRouter = Router();
export const swachformsPublicRouter = Router();

const tid = (req: any): number => Number(req.session?.tenantId ?? req.user?.tenantId ?? 1);
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
};

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sf_forms (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, name VARCHAR(300) NOT NULL,
      slug VARCHAR(200) NOT NULL, description TEXT, schema JSONB NOT NULL DEFAULT '[]',
      settings JSONB DEFAULT '{}', status VARCHAR(20) DEFAULT 'draft',
      submission_count INT DEFAULT 0, workflow_id INT, created_by INT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, slug)
    );
    CREATE TABLE IF NOT EXISTS sf_form_submissions (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, form_id INT NOT NULL,
      submission_no VARCHAR(50), data JSONB NOT NULL DEFAULT '{}',
      submitter_name VARCHAR(200), submitter_email VARCHAR(200), submitter_ip VARCHAR(50),
      status VARCHAR(30) DEFAULT 'new', reviewer_id INT, reviewer_notes TEXT,
      reviewed_at TIMESTAMPTZ, workflow_state JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sf_workflows (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, name VARCHAR(300) NOT NULL,
      trigger_type VARCHAR(50) DEFAULT 'form_submission', steps JSONB NOT NULL DEFAULT '[]',
      is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sf_workflow_runs (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, workflow_id INT NOT NULL,
      submission_id INT, current_step INT DEFAULT 0, status VARCHAR(30) DEFAULT 'running',
      step_history JSONB DEFAULT '[]', started_at TIMESTAMPTZ DEFAULT NOW(), completed_at TIMESTAMPTZ
    );
  `);
  // Add notification_config column if it doesn't exist
  await db.execute(sql`
    ALTER TABLE sf_forms ADD COLUMN IF NOT EXISTS notification_config JSONB DEFAULT '{}';
  `).catch(() => {});
}

async function getNextSubmissionNo(tenantId: number, formId: number): Promise<string> {
  const year = new Date().getFullYear();
  const res = await db.execute(sql`SELECT COUNT(*) as cnt FROM sf_form_submissions WHERE tenant_id=${tenantId} AND form_id=${formId}`);
  const cnt = parseInt((res.rows[0] as any).cnt) + 1;
  return `SUB-${year}-${String(cnt).padStart(5, '0')}`;
}

let _formsTablesPromise: Promise<void> | null = null;
function ensureTablesOnce(): Promise<void> {
  if (!_formsTablesPromise) {
    _formsTablesPromise = ensureTables().catch(e => { _formsTablesPromise = null; throw e; });
  }
  return _formsTablesPromise;
}

async function generateSlug(name: string, tenantId: number): Promise<string> {
  let base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let slug = base;
  let i = 1;
  while (true) {
    const ex = await db.execute(sql`SELECT id FROM sf_forms WHERE tenant_id=${tenantId} AND slug=${slug}`);
    if (!ex.rows.length) break;
    slug = `${base}-${i++}`;
  }
  return slug;
}

async function startWorkflowRun(tenantId: number, workflowId: number, submissionId: number) {
  await db.execute(sql`
    INSERT INTO sf_workflow_runs (tenant_id, workflow_id, submission_id, current_step, status)
    VALUES (${tenantId}, ${workflowId}, ${submissionId}, 0, 'running')
  `);
}

// Evaluate conditional logic to determine active fields
function evaluateConditions(schema: any[], formData: Record<string, any>): Set<string> {
  const activeFields = new Set<string>();
  for (const field of schema) {
    if (!field.conditions) {
      activeFields.add(field.id);
      continue;
    }
    const { action, logic, rules } = field.conditions;
    const results = (rules as any[]).map((rule: any) => {
      const fieldValue = String(formData[rule.field_id] || '').toLowerCase();
      const ruleValue = String(rule.value || '').toLowerCase();
      switch (rule.operator) {
        case 'equals': return fieldValue === ruleValue;
        case 'not_equals': return fieldValue !== ruleValue;
        case 'contains': return fieldValue.includes(ruleValue);
        case 'not_contains': return !fieldValue.includes(ruleValue);
        case 'is_empty': return !fieldValue || fieldValue === '';
        case 'is_not_empty': return !!(fieldValue && fieldValue !== '');
        case 'greater_than': return parseFloat(fieldValue) > parseFloat(ruleValue);
        case 'less_than': return parseFloat(fieldValue) < parseFloat(ruleValue);
        default: return false;
      }
    });
    const conditionMet = logic === 'any' ? results.some(Boolean) : results.every(Boolean);
    if (action === 'show' && conditionMet) activeFields.add(field.id);
    if (action === 'hide' && !conditionMet) activeFields.add(field.id);
  }
  return activeFields;
}

// Send form notifications via WhatsApp
async function sendFormNotifications(form: any, submission: any, formData: Record<string, any>) {
  const notifConfig = form.notification_config as any;
  if (!notifConfig || Object.keys(notifConfig).length === 0) return;

  const baseUrl = process.env.BASE_URL || 'https://app.swacherp.com';
  const interpolate = (template: string, vars: Record<string, string>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');

  const vars: Record<string, string> = {
    name: String(formData['name'] || formData['full_name'] || formData['your_name'] || 'Submitter'),
    email: String(formData['email'] || formData['email_address'] || ''),
    form_name: form.name,
    submission_id: `SUB-${submission.id}`,
    dashboard_url: `${baseUrl}/swachforms/submissions?form=${form.slug}`,
  };

  // Notify submitter
  if (notifConfig.submitter_whatsapp?.enabled && notifConfig.submitter_whatsapp.phone_field_id) {
    const phone = String(formData[notifConfig.submitter_whatsapp.phone_field_id] || '').replace(/\s/g, '');
    if (phone && /^\+?\d{10,15}$/.test(phone)) {
      const message = interpolate(
        notifConfig.submitter_whatsapp.message_template ||
          `Thank you {{name}}! Your submission to '{{form_name}}' has been received. Reference: {{submission_id}}`,
        vars
      );
      try {
        await whatsappService.sendTextMessage({ to: phone, message });
      } catch (e) { console.error('Form submitter WhatsApp error:', e); }
    }
  }

  // Notify owner
  if (notifConfig.owner_whatsapp?.enabled && notifConfig.owner_whatsapp.phone) {
    const message = interpolate(
      notifConfig.owner_whatsapp.message_template ||
        `New form submission on '{{form_name}}' from {{name}}. Reference: {{submission_id}}`,
      vars
    );
    try {
      await whatsappService.sendTextMessage({ to: notifConfig.owner_whatsapp.phone, message });
    } catch (e) { console.error('Form owner WhatsApp error:', e); }
  }
}

// Forms CRUD
swachformsRouter.get('/', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const rows = await db.execute(sql`SELECT id, name, slug, description, status, submission_count, created_at, updated_at FROM sf_forms WHERE tenant_id=${tenantId} AND status != 'deleted' ORDER BY updated_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachformsRouter.post('/', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { name, schema = [], settings = {}, description } = req.body;
    const slug = await generateSlug(name, tenantId);
    const userId = req.user?.id;
    const result = await db.execute(sql`
      INSERT INTO sf_forms (tenant_id, name, slug, description, schema, settings, created_by)
      VALUES (${tenantId}, ${name}, ${slug}, ${description ?? null}, ${JSON.stringify(schema)}, ${JSON.stringify(settings)}, ${userId ?? null})
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachformsRouter.get('/workflows', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const rows = await db.execute(sql`SELECT * FROM sf_workflows WHERE tenant_id=${tenantId} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachformsRouter.post('/workflows', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { name, trigger_type = 'form_submission', steps = [] } = req.body;
    const result = await db.execute(sql`
      INSERT INTO sf_workflows (tenant_id, name, trigger_type, steps)
      VALUES (${tenantId}, ${name}, ${trigger_type}, ${JSON.stringify(steps)})
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachformsRouter.put('/workflows/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { id } = req.params;
    const { name, steps, is_active } = req.body;
    const result = await db.execute(sql`
      UPDATE sf_workflows SET
        name=COALESCE(${name ?? null}, name),
        steps=COALESCE(${steps ? JSON.stringify(steps) : null}::jsonb, steps),
        is_active=COALESCE(${is_active ?? null}, is_active)
      WHERE id=${parseInt(id)} AND tenant_id=${tenantId} RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachformsRouter.post('/workflows/:id/run', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { id } = req.params;
    const { submission_id } = req.body;
    await startWorkflowRun(tenantId, parseInt(id), parseInt(submission_id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachformsRouter.get('/analytics/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { id } = req.params;
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE status='approved') as approved,
        COUNT(*) FILTER (WHERE status='rejected') as rejected,
        COUNT(*) FILTER (WHERE status='new') as pending,
        MIN(created_at) as first_submission,
        MAX(created_at) as last_submission
      FROM sf_form_submissions WHERE tenant_id=${tenantId} AND form_id=${parseInt(id)}
    `);
    const daily = await db.execute(sql`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM sf_form_submissions WHERE tenant_id=${tenantId} AND form_id=${parseInt(id)} AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at) ORDER BY date
    `);
    res.json({ stats: stats.rows[0], daily_trend: daily.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachformsRouter.get('/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { id } = req.params;
    const row = await db.execute(sql`SELECT * FROM sf_forms WHERE id=${parseInt(id)} AND tenant_id=${tenantId}`);
    if (!row.rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachformsRouter.put('/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { id } = req.params;
    const { name, schema, settings, description, workflow_id } = req.body;
    const result = await db.execute(sql`
      UPDATE sf_forms SET
        name=COALESCE(${name ?? null}, name),
        description=COALESCE(${description ?? null}, description),
        schema=COALESCE(${schema ? JSON.stringify(schema) : null}::jsonb, schema),
        settings=COALESCE(${settings ? JSON.stringify(settings) : null}::jsonb, settings),
        workflow_id=COALESCE(${workflow_id ?? null}, workflow_id),
        updated_at=NOW()
      WHERE id=${parseInt(id)} AND tenant_id=${tenantId} RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachformsRouter.delete('/:id', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { id } = req.params;
    await db.execute(sql`UPDATE sf_forms SET status='closed', updated_at=NOW() WHERE id=${parseInt(id)} AND tenant_id=${tenantId}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachformsRouter.post('/:id/publish', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { id } = req.params;
    const result = await db.execute(sql`UPDATE sf_forms SET status='published', updated_at=NOW() WHERE id=${parseInt(id)} AND tenant_id=${tenantId} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachformsRouter.post('/:id/duplicate', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { id } = req.params;
    const orig = await db.execute(sql`SELECT * FROM sf_forms WHERE id=${parseInt(id)} AND tenant_id=${tenantId}`);
    if (!orig.rows.length) return res.status(404).json({ message: 'Not found' });
    const f = orig.rows[0] as any;
    const newSlug = await generateSlug(f.name + '-copy', tenantId);
    const result = await db.execute(sql`
      INSERT INTO sf_forms (tenant_id, name, slug, description, schema, settings, created_by)
      VALUES (${tenantId}, ${f.name + ' (Copy)'}, ${newSlug}, ${f.description}, ${JSON.stringify(f.schema)}, ${JSON.stringify(f.settings)}, ${f.created_by})
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Validate conditional logic
swachformsRouter.post('/:id/validate-conditions', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { id } = req.params;
    const { field_id, conditions } = req.body;
    const formRow = await db.execute(sql`SELECT schema FROM sf_forms WHERE id=${parseInt(id)} AND tenant_id=${tenantId}`);
    if (!formRow.rows.length) return res.status(404).json({ message: 'Form not found' });
    const schema: any[] = (formRow.rows[0] as any).schema || [];
    const fieldIds = new Set(schema.map((f: any) => f.id));
    const errors: string[] = [];
    if (!fieldIds.has(field_id)) errors.push(`Field ${field_id} not found in form`);
    if (conditions?.rules) {
      for (const rule of conditions.rules) {
        if (!fieldIds.has(rule.field_id)) errors.push(`Referenced field ${rule.field_id} not found in form`);
        if (rule.field_id === field_id) errors.push('A field cannot reference itself in conditions');
      }
    }
    if (errors.length) return res.json({ valid: false, errors });
    res.json({ valid: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Notification config routes
swachformsRouter.get('/:id/notifications', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { id } = req.params;
    const row = await db.execute(sql`SELECT notification_config FROM sf_forms WHERE id=${parseInt(id)} AND tenant_id=${tenantId}`);
    if (!row.rows.length) return res.status(404).json({ message: 'Not found' });
    res.json((row.rows[0] as any).notification_config || {});
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachformsRouter.put('/:id/notifications', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { id } = req.params;
    const config = req.body;
    const result = await db.execute(sql`
      UPDATE sf_forms SET notification_config=${JSON.stringify(config)}::jsonb, updated_at=NOW()
      WHERE id=${parseInt(id)} AND tenant_id=${tenantId} RETURNING notification_config
    `);
    res.json((result.rows[0] as any).notification_config);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachformsRouter.post('/:id/notifications/test', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { id } = req.params;
    const row = await db.execute(sql`SELECT * FROM sf_forms WHERE id=${parseInt(id)} AND tenant_id=${tenantId}`);
    if (!row.rows.length) return res.status(404).json({ message: 'Form not found' });
    const form = row.rows[0] as any;
    const config = form.notification_config || {};
    if (!config.owner_whatsapp?.phone) return res.status(400).json({ message: 'Owner phone not configured' });
    const sent = await whatsappService.sendTextMessage({
      to: config.owner_whatsapp.phone,
      message: `Test notification from SwachForms: Form '${form.name}' notifications are working correctly.`,
    });
    res.json({ sent });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Submissions
swachformsRouter.get('/:id/submissions', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { id } = req.params;
    const { status } = req.query;
    let q = `SELECT * FROM sf_form_submissions WHERE tenant_id=${tenantId} AND form_id=${parseInt(id)}`;
    if (status) q += ` AND status='${status}'`;
    q += ` ORDER BY created_at DESC`;
    const rows = await db.execute(sql.raw(q));
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachformsRouter.get('/:id/submissions/export', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { id } = req.params;
    const rows = await db.execute(sql`SELECT * FROM sf_form_submissions WHERE tenant_id=${tenantId} AND form_id=${parseInt(id)} ORDER BY created_at DESC`);
    const submissions = rows.rows as any[];
    if (!submissions.length) { res.setHeader('Content-Type', 'text/csv'); return res.send('No data'); }
    const keys = ['id', 'submission_no', 'submitter_name', 'submitter_email', 'status', 'created_at'];
    const dataKeys = submissions.length > 0 ? Object.keys(submissions[0].data || {}) : [];
    const allKeys = [...keys, ...dataKeys];
    const csv = [allKeys.join(','), ...submissions.map((s: any) => allKeys.map(k => {
      const val = dataKeys.includes(k) ? (s.data?.[k] ?? '') : (s[k] ?? '');
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="submissions-${id}.csv"`);
    res.send(csv);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachformsRouter.get('/:id/submissions/:subId', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { id, subId } = req.params;
    const row = await db.execute(sql`SELECT * FROM sf_form_submissions WHERE id=${parseInt(subId)} AND form_id=${parseInt(id)} AND tenant_id=${tenantId}`);
    if (!row.rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachformsRouter.put('/:id/submissions/:subId', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { id, subId } = req.params;
    const { status, reviewer_notes } = req.body;
    const userId = req.user?.id;
    const result = await db.execute(sql`
      UPDATE sf_form_submissions SET
        status=COALESCE(${status ?? null}, status),
        reviewer_notes=COALESCE(${reviewer_notes ?? null}, reviewer_notes),
        reviewer_id=COALESCE(${userId ?? null}, reviewer_id),
        reviewed_at=CASE WHEN ${status ?? null} IS NOT NULL THEN NOW() ELSE reviewed_at END
      WHERE id=${parseInt(subId)} AND form_id=${parseInt(id)} AND tenant_id=${tenantId} RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Resend notification for a specific submission
swachformsRouter.post('/submissions/:subId/resend-notification', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const tenantId = tid(req);
    const { subId } = req.params;
    const subRow = await db.execute(sql`SELECT * FROM sf_form_submissions WHERE id=${parseInt(subId)} AND tenant_id=${tenantId}`);
    if (!subRow.rows.length) return res.status(404).json({ message: 'Submission not found' });
    const sub = subRow.rows[0] as any;
    const formRow = await db.execute(sql`SELECT * FROM sf_forms WHERE id=${sub.form_id} AND tenant_id=${tenantId}`);
    if (!formRow.rows.length) return res.status(404).json({ message: 'Form not found' });
    const form = formRow.rows[0] as any;
    await sendFormNotifications(form, sub, sub.data || {});
    res.json({ sent: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Embed snippet endpoint (authenticated)
swachformsRouter.get('/:id/embed-snippet', requireAuth, async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const t = tid(req);
    const baseUrl = process.env.BASE_URL || 'https://app.swacherp.com';
    const form = await db.execute(sql`SELECT slug FROM sf_forms WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    if (!form.rows.length) return res.status(404).json({ message: 'Form not found' });
    const { slug } = form.rows[0] as any;
    res.json({
      script_tag: `<script src="${baseUrl}/api/public/forms/widget.js?form_slug=${slug}&tenant_id=${t}" async></script>`,
      inline_embed: `<div data-swach-form="${slug}"></div>\n<script src="${baseUrl}/api/public/forms/sdk.js" async></script>\n<script>SwachForms('init',{formSlug:'${slug}',tenantId:'${t}',mode:'inline'})</script>`,
      direct_url: `${baseUrl}/embed-form/${slug}?tid=${t}`,
      iframe: `<iframe src="${baseUrl}/api/public/forms/embed/${slug}?tid=${t}" width="100%" height="500" frameborder="0"></iframe>`,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Public routes
swachformsPublicRouter.get('/:slug', async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const { slug } = req.params;
    const tenantId = req.headers['x-tenant-id'] ? parseInt(req.headers['x-tenant-id'] as string) : 1;
    const row = await db.execute(sql`SELECT id, name, slug, description, schema, settings FROM sf_forms WHERE slug=${slug} AND tenant_id=${tenantId} AND status='published'`);
    if (!row.rows.length) return res.status(404).json({ message: 'Form not found or not published' });
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

swachformsPublicRouter.post('/:slug', async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const { slug } = req.params;
    const tenantId = req.headers['x-tenant-id'] ? parseInt(req.headers['x-tenant-id'] as string) : 1;
    const formRow = await db.execute(sql`SELECT * FROM sf_forms WHERE slug=${slug} AND tenant_id=${tenantId} AND status='published'`);
    if (!formRow.rows.length) return res.status(404).json({ message: 'Form not found or not published' });
    const form = formRow.rows[0] as any;
    const { data = {}, submitter_name, submitter_email } = req.body;
    const schema: any[] = form.schema || [];

    // Evaluate conditional logic to determine active fields
    const activeFields = evaluateConditions(schema, data);

    // Validate required fields that are active
    const errors: string[] = [];
    for (const field of schema) {
      if (field.required && activeFields.has(field.id) && !data[field.id] && !data[field.label]) {
        errors.push(`${field.label} is required`);
      }
    }
    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    // Payment validation for active fields only
    for (const field of schema) {
      if (field.type === 'payment' && field.required && activeFields.has(field.id)) {
        const paymentId = data[`${field.id}_payment_id`];
        if (!paymentId) return res.status(400).json({ message: `Payment required for ${field.label}` });
        if (process.env.RAZORPAY_KEY_SECRET) {
          const verifyResp = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64') }
          });
          const payment = await verifyResp.json() as any;
          if (payment.status !== 'captured') return res.status(400).json({ message: 'Payment not captured' });
        }
      }
    }

    // Strip hidden field values — only store active fields
    const filteredData: Record<string, any> = {};
    for (const fieldId of activeFields) {
      if (data[fieldId] !== undefined) filteredData[fieldId] = data[fieldId];
    }
    // Keep payment ids for active payment fields
    for (const field of schema) {
      if (field.type === 'payment' && activeFields.has(field.id)) {
        const pid = `${field.id}_payment_id`;
        if (data[pid] !== undefined) filteredData[pid] = data[pid];
      }
    }

    const submissionNo = await getNextSubmissionNo(tenantId, form.id);
    const submitterIp = req.ip || req.headers['x-forwarded-for'] || '';
    const result = await db.execute(sql`
      INSERT INTO sf_form_submissions (tenant_id, form_id, submission_no, data, submitter_name, submitter_email, submitter_ip)
      VALUES (${tenantId}, ${form.id}, ${submissionNo}, ${JSON.stringify(filteredData)}, ${submitter_name ?? null}, ${submitter_email ?? null}, ${submitterIp})
      RETURNING id, submission_no
    `);
    // Increment submission count
    await db.execute(sql`UPDATE sf_forms SET submission_count=submission_count+1, updated_at=NOW() WHERE id=${form.id}`);
    const sub = result.rows[0] as any;

    // Start workflow if configured
    if (form.workflow_id) {
      await startWorkflowRun(tenantId, form.workflow_id, sub.id).catch(() => {});
    }

    // Fire-and-forget webhook
    const settings = form.settings || {};
    if (settings.webhook_url) {
      fetch(settings.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_id: form.id, submission_id: sub.id, data: filteredData }),
      }).catch(() => {});
    }

    // Fire-and-forget WhatsApp notifications
    sendFormNotifications(form, sub, filteredData).catch(e => console.error('Form notify:', e));

    res.json({ success: true, submission_id: sub.id, submission_no: sub.submission_no });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Widget JS
swachformsPublicRouter.get('/widget.js', async (req: any, res) => {
  const { form_slug, tenant_id, mode = 'modal', button_text = 'Open Form', button_color = '#4F46E5' } = req.query;
  const baseUrl = process.env.BASE_URL || 'https://app.swacherp.com';
  const script = `
(function(w,d,s,o,f,js,fjs){
  w['SwachFormsObject']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
  js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
  js.id='swach-forms-sdk';js.src='${baseUrl}/api/public/forms/sdk.js';js.async=1;
  fjs.parentNode.insertBefore(js,fjs);
}(window,document,'script','SwachForms'));

SwachForms('init', {
  formSlug: '${form_slug}',
  tenantId: '${tenant_id}',
  mode: '${mode}',
  buttonText: '${button_text}',
  buttonColor: '${button_color}',
  baseUrl: '${baseUrl}'
});
`;
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(script);
});

// SDK JS
swachformsPublicRouter.get('/sdk.js', (_req: any, res: any) => {
  const sdk = `
(function() {
  var config = {};
  window.SwachForms = window.SwachForms || function(cmd, opts) {
    if (cmd === 'init') { config = opts; init(); }
  };
  if (window.SwachForms.q) { window.SwachForms.q.forEach(function(args) { window.SwachForms.apply(null, args); }); }
  function init() { if (config.mode === 'inline') { renderInline(); } else { renderModal(); } }
  function renderModal() {
    var btn = document.createElement('button');
    btn.textContent = config.buttonText || 'Open Form';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99998;background:' + (config.buttonColor||'#4F46E5') + ';color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:14px;font-family:sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.2)';
    btn.onclick = openModal;
    document.body.appendChild(btn);
  }
  function openModal() {
    if (document.getElementById('swach-form-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'swach-form-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:sans-serif';
    overlay.onclick = function(e) { if(e.target===overlay) closeModal(); };
    var modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:12px;width:90%;max-width:600px;max-height:90vh;overflow-y:auto;padding:24px;position:relative';
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '\\u00d7';
    closeBtn.style.cssText = 'position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#666';
    closeBtn.onclick = closeModal;
    modal.appendChild(closeBtn);
    var iframe = document.createElement('iframe');
    iframe.src = config.baseUrl + '/api/public/forms/embed/' + config.formSlug + '?tid=' + config.tenantId;
    iframe.style.cssText = 'width:100%;height:500px;border:none;margin-top:8px';
    iframe.allow = 'payment';
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }
  function closeModal() { var o = document.getElementById('swach-form-overlay'); if(o) o.remove(); }
  function renderInline() {
    var targets = document.querySelectorAll('[data-swach-form="' + config.formSlug + '"]');
    targets.forEach(function(el) {
      var iframe = document.createElement('iframe');
      iframe.src = config.baseUrl + '/api/public/forms/embed/' + config.formSlug + '?tid=' + config.tenantId;
      iframe.style.cssText = 'width:100%;min-height:400px;border:none;border-radius:8px';
      iframe.allow = 'payment';
      el.appendChild(iframe);
    });
  }
})();
`;
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(sdk);
});

// Embed HTML
swachformsPublicRouter.get('/embed/:slug', async (req: any, res) => {
  try {
    await ensureTablesOnce();
    const { slug } = req.params;
    const tenantId = parseInt(req.query.tid as string) || 1;
    // prefill params: everything except tid
    const prefill: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.query)) {
      if (k !== 'tid') prefill[k] = String(v);
    }
    const form = await db.execute(sql`SELECT * FROM sf_forms WHERE slug=${slug} AND tenant_id=${tenantId} AND status='published' AND record_status IS DISTINCT FROM 0`);
    if (!form.rows.length) {
      return res.status(404).send('<h3 style="font-family:sans-serif;color:#666;text-align:center;padding:40px">Form not found</h3>');
    }
    const f = form.rows[0] as any;
    const schema = Array.isArray(f.schema) ? f.schema : [];
    const html = generateEmbedHTML(f, schema, prefill);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.send(html);
  } catch (e: any) { res.status(500).send('<h3>Error loading form</h3>'); }
});

function generateEmbedHTML(form: any, schema: any[], prefill: Record<string, string> = {}): string {
  const fields = schema.map((field: any) => {
    const pre = prefill[field.id] || prefill[field.label] || '';
    const isHiddenByDefault = field.hidden_by_default === true;
    const wrapperStyle = isHiddenByDefault ? 'display:none' : 'display:block';

    let fieldHtml = '';
    switch (field.type) {
      case 'text': case 'email': case 'phone': case 'number': case 'date':
        fieldHtml = `<div class="field"><label>${field.label}${field.required ? '<span class="req">*</span>' : ''}</label>
          <input type="${field.type}" name="${field.id}" placeholder="${field.placeholder || ''}" value="${pre}" ${field.required ? 'required' : ''}/></div>`;
        break;
      case 'textarea':
        fieldHtml = `<div class="field"><label>${field.label}</label><textarea name="${field.id}" rows="4" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>${pre}</textarea></div>`;
        break;
      case 'select': {
        const opts = (field.options || []).map((o: string) => `<option value="${o}"${pre === o ? ' selected' : ''}>${o}</option>`).join('');
        fieldHtml = `<div class="field"><label>${field.label}</label><select name="${field.id}" ${field.required ? 'required' : ''}><option value="">Select...</option>${opts}</select></div>`;
        break;
      }
      case 'checkbox':
        fieldHtml = `<div class="field check"><input type="checkbox" name="${field.id}" id="${field.id}" ${field.required ? 'required' : ''}/><label for="${field.id}">${field.label}</label></div>`;
        break;
      case 'heading':
        fieldHtml = `<h3 class="heading">${field.label}</h3>`;
        break;
      case 'divider':
        fieldHtml = '<hr/>';
        break;
      case 'payment':
        fieldHtml = `<div class="field payment-field" data-amount="${field.amount}" data-currency="${field.currency || 'INR'}">
          <label>${field.label}</label>
          <div class="payment-amount">Amount: ${field.currency === 'USD' ? '$' : field.currency === 'EUR' ? '€' : '₹'}${field.amount}</div>
          <button type="button" class="pay-btn" onclick="initiatePayment('${field.id}',${field.amount})">Pay Now</button>
          <input type="hidden" name="${field.id}_payment_id" id="${field.id}_payment_id"/>
        </div>`;
        break;
      default:
        fieldHtml = '';
    }

    if (!fieldHtml) return '';
    return `<div class="field-wrapper" data-field-id="${field.id}" style="${wrapperStyle}">${fieldHtml}</div>`;
  }).join('');

  // Build conditional JS engine
  const schemaJson = JSON.stringify(schema);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${form.name}</title>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;font-size:14px;color:#1a1a1a;padding:20px;background:#fff}
h2{font-size:18px;font-weight:600;margin-bottom:6px}.desc{color:#666;font-size:13px;margin-bottom:20px}
.field{margin-bottom:16px}label{display:block;font-weight:500;margin-bottom:4px;font-size:13px}.req{color:#e34948;margin-left:2px}
input,textarea,select{width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;outline:none}
input:focus,textarea:focus,select:focus{border-color:#4F46E5;box-shadow:0 0 0 3px rgba(79,70,229,.1)}
.check{display:flex;align-items:center;gap:8px}.check input{width:auto}
.heading{font-size:15px;font-weight:600;margin:16px 0 8px;color:#374151}hr{border:none;border-top:1px solid #e5e7eb;margin:16px 0}
.payment-amount{font-size:16px;font-weight:500;color:#059669;margin:6px 0}
.pay-btn{background:#059669;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:13px}
.pay-btn.paid{background:#374151;cursor:default}
button[type=submit]{width:100%;padding:10px;background:#4F46E5;color:#fff;border:none;border-radius:6px;font-size:15px;font-weight:500;cursor:pointer;margin-top:8px}
button[type=submit]:hover{background:#4338ca}.success{text-align:center;padding:40px 20px;color:#059669}
.success h3{font-size:20px;margin-bottom:8px}
.field-wrapper{transition:opacity 0.2s}
</style></head><body>
<h2>${form.name}</h2>${form.description ? `<p class="desc">${form.description}</p>` : ''}
<form id="swachForm" onsubmit="submitForm(event)">${fields}
<button type="submit">Submit</button></form>
<script>
var paymentsDone={};
var formSchema=${schemaJson};

function evaluateAndApply(){
  var formData={};
  var form=document.getElementById('swachForm');
  if(!form)return;
  new FormData(form).forEach(function(v,k){formData[k]=v;});
  form.querySelectorAll('input[type=checkbox]').forEach(function(cb){
    formData[cb.name]=cb.checked?cb.value||'true':'';
  });
  formSchema.forEach(function(field){
    if(!field.conditions)return;
    var wrapper=document.querySelector('[data-field-id="'+field.id+'"]');
    if(!wrapper)return;
    var rules=field.conditions.rules||[];
    var logic=field.conditions.logic||'all';
    var action=field.conditions.action||'show';
    var results=rules.map(function(rule){
      var fieldVal=String(formData[rule.field_id]||'').toLowerCase();
      var ruleVal=String(rule.value||'').toLowerCase();
      switch(rule.operator){
        case 'equals':return fieldVal===ruleVal;
        case 'not_equals':return fieldVal!==ruleVal;
        case 'contains':return fieldVal.indexOf(ruleVal)!==-1;
        case 'not_contains':return fieldVal.indexOf(ruleVal)===-1;
        case 'is_empty':return!fieldVal;
        case 'is_not_empty':return!!fieldVal;
        case 'greater_than':return parseFloat(fieldVal)>parseFloat(ruleVal);
        case 'less_than':return parseFloat(fieldVal)<parseFloat(ruleVal);
        default:return false;
      }
    });
    var conditionMet=logic==='any'?results.some(Boolean):results.every(Boolean);
    var shouldShow=(action==='show'&&conditionMet)||(action==='hide'&&!conditionMet);
    wrapper.style.display=shouldShow?'block':'none';
    wrapper.querySelectorAll('input,select,textarea').forEach(function(el){
      el.disabled=!shouldShow;
    });
  });
}

document.addEventListener('change',evaluateAndApply);
document.addEventListener('input',evaluateAndApply);
document.addEventListener('DOMContentLoaded',evaluateAndApply);
evaluateAndApply();

function initiatePayment(fieldId,amount){
  var options={key:'rzp_test_placeholder',amount:amount*100,currency:'INR',name:'Form Payment',
    handler:function(r){paymentsDone[fieldId]=r.razorpay_payment_id;document.getElementById(fieldId+'_payment_id').value=r.razorpay_payment_id;
    var btn=document.querySelector('[onclick*="'+fieldId+'"]');if(btn){btn.textContent='Paid \\u2713';btn.classList.add('paid');btn.disabled=true;}}};
  var rzp=new Razorpay(options);rzp.open();
}
function submitForm(e){
  e.preventDefault();
  var form=document.getElementById('swachForm');
  var data={};
  new FormData(form).forEach(function(v,k){data[k]=v;});
  fetch('/api/public/forms/${form.slug}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:data,tenant_id:${form.tenant_id}})})
  .then(function(r){return r.json()}).then(function(res){
    if(res.success){form.innerHTML='<div class="success"><h3>\\u2713 Submitted!</h3><p>Thank you for your response.</p></div>';}
    else{alert('Error: '+res.message);}
  }).catch(function(){alert('Submission failed. Please try again.');});
}
</script></body></html>`;
}

export default swachformsRouter;
