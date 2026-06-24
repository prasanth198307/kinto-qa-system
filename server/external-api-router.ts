import { Router } from 'express';
import crypto from 'crypto';
import { db } from './db';
import { sql } from 'drizzle-orm';

const router = Router();

const MODULE_ACTIONS: Record<string, Record<string, Function>> = {
  crm: {
    create_lead: async (tenantId: number, params: any) => {
      const { name, phone, company, product_interest, source, status, notes, email } = params;
      if (!name) throw new Error('name is required');
      const cntRows = await db.execute(sql`SELECT COUNT(*) as cnt FROM crm_leads WHERE tenant_id = ${tenantId}`);
      const cnt = Number((cntRows.rows[0] as any)?.cnt || 0) + 1;
      const leadNo = 'LEAD-' + String(cnt).padStart(4, '0');
      const result = await db.execute(sql`
        INSERT INTO crm_leads (tenant_id, lead_no, name, phone, company, product_interest, source, status, notes, email)
        VALUES (${tenantId}, ${leadNo}, ${name}, ${phone ?? null}, ${company ?? null},
          ${product_interest ?? null}, ${source ?? 'External API'}, ${status ?? 'new'},
          ${notes ?? null}, ${email ?? null})
        RETURNING id, lead_no, name
      `);
      return { success: true, data: result.rows[0] };
    },
    get_leads: async (tenantId: number, params: any) => {
      const { status, limit } = params;
      const rows = await db.execute(sql`
        SELECT id, lead_no, name, phone, company, status, source, created_at
        FROM crm_leads
        WHERE tenant_id = ${tenantId} AND record_status = 1
        ORDER BY created_at DESC
        LIMIT ${Number(limit) || 50}
      `);
      return { success: true, data: rows.rows, count: rows.rows.length };
    },
    update_lead: async (tenantId: number, params: any) => {
      const { lead_no, status, notes, assigned_to } = params;
      if (!lead_no) throw new Error('lead_no is required');
      await db.execute(sql`
        UPDATE crm_leads SET
          status = COALESCE(${status ?? null}, status),
          notes = COALESCE(${notes ?? null}, notes),
          assigned_to = COALESCE(${assigned_to ?? null}, assigned_to),
          updated_at = NOW()
        WHERE lead_no = ${lead_no} AND tenant_id = ${tenantId} AND record_status = 1
      `);
      return { success: true, message: `Lead ${lead_no} updated` };
    },
  },
  inventory: {
    get_stock: async (tenantId: number, params: any) => {
      const { sku } = params;
      const rows = await db.execute(sql`
        SELECT p.sku, p.name, rm.quantity, rm.warehouse_id
        FROM raw_materials rm
        JOIN products p ON p.id = rm.product_id
        WHERE rm.tenant_id = ${tenantId} AND rm.record_status = 1
        ORDER BY p.name ASC
        LIMIT 100
      `);
      return { success: true, data: rows.rows, count: rows.rows.length };
    },
  },
  invoicing: {
    get_outstanding: async (tenantId: number, params: any) => {
      const { customer } = params;
      if (!customer) throw new Error('customer is required');
      const rows = await db.execute(sql`
        SELECT invoice_number, invoice_date, buyer_name, total_amount, amount_received,
               (total_amount - COALESCE(amount_received, 0)) as outstanding
        FROM invoices
        WHERE tenant_id = ${tenantId} AND record_status = 1
          AND status != 'cancelled'
          AND LOWER(buyer_name) LIKE LOWER(${'%' + customer.trim() + '%'})
        ORDER BY invoice_date DESC
      `);
      return { success: true, data: rows.rows, count: rows.rows.length };
    },
  },
};

async function authenticateApiKey(authHeader: string): Promise<{ tenantId: number; keyId: string } | null> {
  const rawKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!rawKey) return null;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyRows = await db.execute(sql`
    SELECT id, tenant_id FROM external_api_keys
    WHERE key_hash = ${keyHash} AND is_active = 1 LIMIT 1
  `);
  const keyRecord = keyRows.rows[0] as any;
  if (!keyRecord) return null;
  db.execute(sql`UPDATE external_api_keys SET last_used_at = NOW() WHERE id = ${keyRecord.id}`).catch(() => {});
  return { tenantId: keyRecord.tenant_id, keyId: String(keyRecord.id) };
}

async function handleDynamicRoute(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const auth = await authenticateApiKey(req.headers['authorization'] || '');
    if (!auth) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization: Bearer <key> header' });
    }
    const { tenantId } = auth;
    const fullPath = '/api/external' + req.path;
    const method = req.method.toUpperCase();
    const defRows = await db.execute(sql`
      SELECT api_id, method, path, label, module, category, params
      FROM external_api_definitions
      WHERE tenant_id = ${tenantId} AND path = ${fullPath} AND method = ${method} AND is_active = 1
      LIMIT 1
    `);
    const def = defRows.rows[0] as any;
    if (!def) {
      return res.status(404).json({ error: 'Not Found', message: `No active API registered for ${method} ${fullPath}` });
    }
    const params = { ...req.query, ...req.body };
    const moduleKey = (def.module || '').toLowerCase();
    const actionKey = (def.category || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const moduleActions = MODULE_ACTIONS[moduleKey];
    if (!moduleActions) {
      return res.status(501).json({ error: 'Not Implemented', message: `No dynamic handler for module "${moduleKey}". Available: ${Object.keys(MODULE_ACTIONS).join(', ')}` });
    }
    const action = moduleActions[actionKey];
    if (!action) {
      return res.status(501).json({ error: 'Not Implemented', message: `No action "${actionKey}" in module "${moduleKey}". Available: ${Object.keys(moduleActions).join(', ')}` });
    }
    const result = await action(tenantId, params);
    return res.status(200).json(result);
  } catch (e: any) {
    console.error('[Dynamic External API] Error:', e.message);
    return res.status(500).json({ error: 'Internal Server Error', message: e.message });
  }
}

router.options('*', (req: any, res: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.sendStatus(204);
});

router.get('*', handleDynamicRoute);
router.post('*', handleDynamicRoute);
router.put('*', handleDynamicRoute);
router.patch('*', handleDynamicRoute);
router.delete('*', handleDynamicRoute);

export default router;
