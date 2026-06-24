import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from './db';
import { sql } from 'drizzle-orm';

const router = Router();

// Blocked prefixes — never expose these externally
const BLOCKED_PATHS = [
  '/auth', '/login', '/logout', '/admin', '/billing',
  '/superadmin', '/mfa', '/demo', '/seed', '/impersonate',
  '/webhook', '/callback', '/download', '/upload'
];

// Module router map — maps prefix to internal mount path
const MODULE_MAP: Record<string, string> = {
  'crm':          '/api/crm',
  'hr':           '/api/hr',
  'inventory':    '/api/inventory',
  'logistics':    '/api/logistics',
  'warehouse':    '/api/inventory',
  'sales':        '/api',
  'purchase':     '/api',
  'finance':      '/api',
  'assets':       '/api/assets',
  'projects':     '/api/projects',
  'healthcare':   '/api/healthcare',
  'education':    '/api/education',
  'agriculture':  '/api/agriculture',
  'realestate':   '/api/real-estate',
  'retail':       '/api/pos',
  'gold':         '/api/gold-erp',
  'generic':      '/api/generic',
  'ess':          '/api/ess',
  'core':         '/api',
};

async function authenticateApiKey(authHeader: string): Promise<{ tenantId: number; keyId: number; userId: number | null } | null> {
  const rawKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!rawKey) return null;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyRows = await db.execute(sql`
    SELECT k.id, k.tenant_id, u.id as user_id
    FROM external_api_keys k
    LEFT JOIN users u ON u.tenant_id = k.tenant_id AND u.role_id = (
      SELECT id FROM roles WHERE tenant_id = k.tenant_id AND name = 'admin' LIMIT 1
    )
    WHERE k.key_hash = ${keyHash} AND k.is_active = 1
    LIMIT 1
  `);
  const rec = keyRows.rows[0] as any;
  if (!rec) return null;
  db.execute(sql`UPDATE external_api_keys SET last_used_at = NOW() WHERE id = ${rec.id}`).catch(() => {});
  return { tenantId: rec.tenant_id, keyId: rec.id, userId: rec.user_id ?? null };
}

function injectTenantContext(req: any, tenantId: number, userId: number | null) {
  if (!req.session) req.session = {} as any;
  req.session.tenantId = tenantId;
  req.user = {
    id: userId,
    tenantId,
    roleId: null,
    role: 'admin',
    username: 'api_key',
  };
  req.isAuthenticated = () => true;
}

// CORS preflight
router.options('*', (req: any, res: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.sendStatus(204);
});

// Generic proxy handler
// Route: /api/external/proxy/:module/*
router.all('/:module/*', async (req: any, res: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    // 1. Auth
    const auth = await authenticateApiKey(req.headers['authorization'] || '');
    if (!auth) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization: Bearer <key> header' });
    }

    // 2. Extract module and sub-path
    const moduleKey = req.params.module.toLowerCase();
    const subPath = '/' + (req.params[0] || '');

    // 3. Block sensitive paths
    if (BLOCKED_PATHS.some(b => subPath.startsWith(b))) {
      return res.status(403).json({ error: 'Forbidden', message: `Path "${subPath}" is not available via external API` });
    }

    // 4. Resolve internal mount
    const internalMount = MODULE_MAP[moduleKey];
    if (!internalMount) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Unknown module "${moduleKey}". Available: ${Object.keys(MODULE_MAP).join(', ')}`
      });
    }

    // 5. Inject tenant context
    injectTenantContext(req, auth.tenantId, auth.userId);

    // 6. Rewrite URL to internal path and forward
    const internalPath = internalMount + subPath;
    req.url = internalPath;
    req.originalUrl = internalPath;

    // 7. Forward to the Express app
    req.app.handle(req, res);

  } catch (e: any) {
    console.error('[Proxy External API] Error:', e.message);
    return res.status(500).json({ error: 'Internal Server Error', message: e.message });
  }
});

export default router;
