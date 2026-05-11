// --- Environment variables are automatically loaded in Replit ---
import * as url from "url";
import * as path from "path";
import * as fs from "fs";
import dotenv from "dotenv";

// Load environment variables manually (for local runs)
dotenv.config();

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

console.log("✅ Environment loaded");
console.log("✅ DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");

// --- Dynamically import all other modules ---
const expressModule = await import("express");
const { registerRoutes } = await import("./routes");
const { setupVite, serveStatic, log } = await import("./vite");
const { notificationService } = await import("./notificationService");
const { storage } = await import("./storage");
const corsModule = await import("cors");

// Function to sync WhatsApp secrets from environment to database (one-time)
async function syncWhatsAppSecretsToDatabase() {
  try {
    const config = await storage.getNotificationConfig();
    if (!config) {
      console.log('[SYNC] No notification config found, skipping sync');
      return;
    }

    const updates: any = {};
    let synced: string[] = [];

    // Only sync if database fields are empty and env vars exist
    if (!config.metaPhoneNumberId && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      updates.metaPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      synced.push('Meta Phone Number ID');
    }

    if (!config.metaAccessToken && process.env.WHATSAPP_ACCESS_TOKEN) {
      updates.metaAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      synced.push('Meta Access Token');
    }

    if (!config.metaVerifyToken && process.env.WHATSAPP_VERIFY_TOKEN) {
      updates.metaVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
      synced.push('Meta Verify Token');
    }

    if (Object.keys(updates).length > 0) {
      await storage.updateNotificationConfig(config.id, updates);
      console.log(`[SYNC] ✅ Synced WhatsApp secrets to database: ${synced.join(', ')}`);
    } else {
      console.log('[SYNC] WhatsApp secrets already in database or no env vars to sync');
    }
  } catch (error) {
    console.error('[SYNC] Error syncing WhatsApp secrets:', error);
  }
}

const express = expressModule.default;
const cors = corsModule.default;
const { Request, Response, NextFunction } = expressModule;

const app = express();

// ── Dynamic per-tenant CORS whitelist ─────────────────────────────────────
let _corsCache: Set<string> = new Set();
let _corsCacheAt = 0;
const CORS_TTL = 60_000;

async function getAllowedOrigins(): Promise<Set<string>> {
  if (Date.now() - _corsCacheAt < CORS_TTL) return _corsCache;
  try {
    const { pool } = await import('./db');
    const { rows } = await pool.query<{ cors_origins: string[] | null }>(
      'SELECT cors_origins FROM tenants WHERE cors_origins IS NOT NULL AND array_length(cors_origins,1) > 0'
    );
    const fresh = new Set<string>();
    for (const row of rows) {
      for (const o of row.cors_origins ?? []) {
        if (o) fresh.add(o.trim().toLowerCase());
      }
    }
    _corsCache = fresh;
    _corsCacheAt = Date.now();
  } catch { /* keep old cache on transient DB errors */ }
  return _corsCache;
}

// ─── Security headers + rate limiting ────────────────────────────────────────
const { securityHeaders, apiRateLimiter } = await import("./security-middleware");
app.use(securityHeaders);
app.use("/api/", apiRateLimiter);

app.use(cors({
  origin: async (incoming, callback) => {
    if (!incoming) return callback(null, true); // same-origin / server-to-server
    const normalized = incoming.toLowerCase();
    // Always allow Replit preview, localhost, the app's own domain, and all *.swacherp.com subdomains
    if (
      normalized.includes('.replit.dev') ||
      normalized.includes('.replit.app') ||
      normalized.includes('localhost') ||
      normalized.includes('127.0.0.1') ||
      normalized.endsWith('.swacherp.com') ||
      normalized === 'https://swacherp.com' ||
      normalized === 'http://swacherp.com'
    ) {
      return callback(null, true);
    }
    const allowed = await getAllowedOrigins();
    return callback(null, allowed.has(normalized));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
}));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ✅ Allow Express to trust proxy headers (needed for session cookies)
app.set("trust proxy", 1);

// ✅ Treat direct localhost connections as HTTPS so express-session sends
//    Secure cookies even over plain HTTP (needed for Playwright e2e tests).
app.use((req: any, res, next) => {
  const ip = req.socket?.remoteAddress ?? "";
  const isLocalhost = ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  if (isLocalhost && !req.headers["x-forwarded-proto"]) {
    req.headers["x-forwarded-proto"] = "https";
  }
  next();
});

app.use(
  express.json({
    limit: '10mb', // Increase limit for large import payloads
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Serve static files
app.use(express.static("public"));
app.use('/uploads', express.static('uploads'));
// Logos are uploaded to client/public/logos/ at runtime (after build) so they
// must be served from the source directory, not just the build output.
app.use('/logos', express.static('client/public/logos'));

// Explicit download route for public files (Excel, PDF) — must be before Vite
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const allowed = /^[\w\-. ]+\.(xlsx|pdf|csv|docx)$/i;
  if (!allowed.test(filename)) return res.status(400).json({ error: 'Invalid file' });
  const filepath = path.join(process.cwd(), 'public', filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'File not found' });
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(filepath);
});

// --- Logging middleware for API requests ---
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // ── Social-crawler OG tag injector ─────────────────────────────────────────
  // When Facebook / Twitter / LinkedIn / WhatsApp crawlers hit a tenant URL
  // like https://microgrid.swacherp.com, return a minimal HTML page with the
  // tenant's name and logo so sharing previews show tenant branding.
  const BOT_UA = /facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|ia_archiver|Googlebot|bingbot|DuckDuckBot|Applebot/i;
  const { pool: pgPool } = await import("./db");

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const ua = req.headers["user-agent"] || "";
    if (!BOT_UA.test(ua)) return next();

    // Extract subdomain from host header (e.g. microgrid.swacherp.com → microgrid)
    const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toString().split(":")[0];
    const parts = host.split(".");
    // Need at least subdomain.domain.tld (3 parts); skip www/app/plain domain
    const subdomain = parts.length >= 3 && !["www", "app"].includes(parts[0]) ? parts[0] : null;
    if (!subdomain) return next();

    let tenantName = "SwachERP";
    let tenantLogo = "";
    let tenantDesc = "Cloud ERP for Indian businesses — GST-compliant, WhatsApp-connected, HR-ready.";

    try {
      const result = await pgPool.query(
        `SELECT name, logo_url FROM tenants WHERE slug = $1 AND status <> 'deleted' LIMIT 1`,
        [subdomain]
      );
      if (result.rows.length) {
        tenantName = result.rows[0].name || tenantName;
        tenantLogo = result.rows[0].logo_url || "";
        tenantDesc = `${tenantName} — powered by SwachERP. GST-compliant cloud ERP for Indian businesses.`;
      }
    } catch (_) { /* fall through to defaults */ }

    const pageUrl = `https://${host}${req.path}`;
    const ogImage = tenantLogo
      ? `<meta property="og:image" content="${tenantLogo}" />
    <meta name="twitter:image" content="${tenantLogo}" />`
      : `<meta property="og:image" content="https://app.swacherp.com/swacherp-og.png" />
    <meta name="twitter:image" content="https://app.swacherp.com/swacherp-og.png" />`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${tenantName} — SwachERP</title>
  <meta name="description" content="${tenantDesc}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:title" content="${tenantName} — SwachERP" />
  <meta property="og:description" content="${tenantDesc}" />
  <meta property="og:site_name" content="${tenantName}" />
  ${ogImage}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${tenantName} — SwachERP" />
  <meta name="twitter:description" content="${tenantDesc}" />
  <meta http-equiv="refresh" content="0;url=${pageUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${pageUrl}">${tenantName}</a>…</p>
</body>
</html>`;

    res.status(200).set("Content-Type", "text/html").end(html);
  });
  // ───────────────────────────────────────────────────────────────────────────

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Seed Account Types FIRST
  try {
    const { storage } = await import("./storage");
    const defaultTypes = [
      { name: "asset", label: "Asset" },
      { name: "liability", label: "Liability" },
      { name: "equity", label: "Equity" },
      { name: "revenue", label: "Revenue" },
      { name: "expense", label: "Expense" },
    ];
    for (const t of defaultTypes) {
      const exists = await storage.getAccountTypeByName(t.name);
      if (!exists) {
        await storage.createAccountType({ ...t, isSystem: 1 });
      }
    }
    console.log('[TYPE SEED] Account types seeding complete');
  } catch (error) {
    console.error('[TYPE SEED ERROR]', error);
  }

  // Seed Chart of Accounts on startup
  try {
    const { seedChartOfAccounts } = await import("./journal-service");
    await seedChartOfAccounts();
  } catch (error) {
    console.error('[COA SEED ERROR]', error);
  }

  // Auto-migrate any journal lines still pointing at the generic Sundry Debtors (1100)
  // to per-party sub-ledger accounts. Safe to run on every startup — idempotent.
  try {
    const { rectifyDebtorJournalLines } = await import("./journal-service");
    const result = await rectifyDebtorJournalLines();
    if (result.updated > 0) {
      console.log(`[DEBTOR RECTIFY] Migrated ${result.updated} journal lines to party sub-accounts (${result.errors} errors)`);
    }
  } catch (error) {
    console.error('[DEBTOR RECTIFY ERROR]', error);
  }

  // Auto-migrate any journal lines still pointing at the generic Sundry Creditors (2001)
  // to per-vendor sub-ledger accounts. Safe to run on every startup — idempotent.
  try {
    const { rectifyCreditorJournalLines } = await import("./journal-service");
    const result = await rectifyCreditorJournalLines();
    if (result.updated > 0) {
      console.log(`[CREDITOR RECTIFY] Migrated ${result.updated} journal lines to vendor sub-accounts (${result.errors} errors)`);
    }
  } catch (error) {
    console.error('[CREDITOR RECTIFY ERROR]', error);
  }

  // ─── Multi-role migration: create user_roles table and backfill ──────────
  // Idempotent — safe to run on every startup. Creates the junction table
  // if it doesn't exist and backfills any users whose role_id is set but
  // who don't yet have a row in user_roles (handles OCI / production deploys).
  try {
    const { db: dbInst } = await import("./db");
    const { sql: sqlTag } = await import("drizzle-orm");
    await dbInst.execute(sqlTag`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id VARCHAR NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        tenant_id INTEGER NOT NULL,
        record_status INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, role_id)
      )
    `);
    const backfill = await dbInst.execute(sqlTag`
      INSERT INTO user_roles (user_id, role_id, tenant_id)
      SELECT id, role_id, tenant_id
      FROM users
      WHERE role_id IS NOT NULL
        AND role_id != ''
        AND id NOT IN (SELECT user_id FROM user_roles)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `);
    const count = (backfill as any).rowCount ?? 0;
    if (count > 0) {
      console.log(`[USER_ROLES MIGRATION] Backfilled ${count} user(s) into user_roles table`);
    } else {
      console.log('[USER_ROLES MIGRATION] Table OK — no backfill needed');
    }
  } catch (err) {
    console.error('[USER_ROLES MIGRATION ERROR]', err);
  }

  // ─── manual_credit_note_requests missing columns migration ───────────────
  // notes, processing_notes may be absent on dev; request_number may be
  // NOT NULL on OCI (added manually) — drop the constraint so our insert
  // (which now supplies a value) works consistently everywhere.
  try {
    const { db: dbMcn } = await import("./db");
    const { sql: sqlMcn } = await import("drizzle-orm");
    await dbMcn.execute(sqlMcn`
      ALTER TABLE manual_credit_note_requests
        ADD COLUMN IF NOT EXISTS notes TEXT,
        ADD COLUMN IF NOT EXISTS processing_notes TEXT,
        ADD COLUMN IF NOT EXISTS request_number VARCHAR(50),
        ADD COLUMN IF NOT EXISTS invoice_id VARCHAR,
        ADD COLUMN IF NOT EXISTS return_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS days_since_invoice INTEGER,
        ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS return_number VARCHAR(100),
        ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255)
    `);
    // Drop NOT NULL on any column OCI may have defined as NOT NULL
    // These are idempotent — safe to run even if the column is already nullable
    await dbMcn.execute(sqlMcn`
      ALTER TABLE manual_credit_note_requests
        ALTER COLUMN request_number DROP NOT NULL,
        ALTER COLUMN invoice_id DROP NOT NULL,
        ALTER COLUMN return_date DROP NOT NULL,
        ALTER COLUMN days_since_invoice DROP NOT NULL,
        ALTER COLUMN invoice_date DROP NOT NULL,
        ALTER COLUMN return_number DROP NOT NULL,
        ALTER COLUMN customer_name DROP NOT NULL
    `);
    console.log('[MCN_REQUESTS MIGRATION] Columns OK');
  } catch (err) {
    console.error('[MCN_REQUESTS MIGRATION ERROR]', err);
  }

  // ─── sales_return_items missing columns migration ────────────────────────
  // Adds bottles_per_case, cases_returned, loose_bottles_returned,
  // verified_quantity, variance_reason columns if they are missing.
  // These exist in the Drizzle schema but were never applied to older DBs.
  try {
    const { db: dbInst2 } = await import("./db");
    const { sql: sqlTag2 } = await import("drizzle-orm");
    await dbInst2.execute(sqlTag2`
      ALTER TABLE sales_return_items
        ADD COLUMN IF NOT EXISTS bottles_per_case INTEGER,
        ADD COLUMN IF NOT EXISTS cases_returned INTEGER,
        ADD COLUMN IF NOT EXISTS loose_bottles_returned INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS verified_quantity INTEGER,
        ADD COLUMN IF NOT EXISTS variance_reason VARCHAR(255)
    `);
    console.log('[SALES_RETURN_ITEMS MIGRATION] Columns OK');
  } catch (err) {
    console.error('[SALES_RETURN_ITEMS MIGRATION ERROR]', err);
  }

  // ─── finished_goods_return_log table ─────────────────────────────────────
  try {
    const { db: dbFgrl } = await import("./db");
    const { sql: sqlFgrl } = await import("drizzle-orm");
    await dbFgrl.execute(sqlFgrl`
      CREATE TABLE IF NOT EXISTS finished_goods_return_log (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        finished_good_id VARCHAR NOT NULL REFERENCES finished_goods(id),
        sales_return_id VARCHAR NOT NULL,
        sales_return_item_id VARCHAR,
        quantity_added INTEGER NOT NULL,
        description TEXT,
        restocked_by VARCHAR REFERENCES users(id),
        restocked_at TIMESTAMP DEFAULT NOW(),
        record_status INTEGER NOT NULL DEFAULT 1,
        tenant_id INTEGER DEFAULT 1
      )
    `);
    console.log('[FG_RETURN_LOG MIGRATION] Table OK');
  } catch (err) {
    console.error('[FG_RETURN_LOG MIGRATION ERROR]', err);
  }

  // ─── Fix role_permissions tenant_id mismatch ─────────────────────────────
  // Rows created via the Role Management UI were inserted with tenant_id=1
  // (schema default) instead of the role's actual tenant. This query corrects
  // any mismatched rows so custom-role permissions work correctly.
  try {
    const { db: dbRpFix } = await import("./db");
    const { sql: sqlRpFix } = await import("drizzle-orm");
    const rpFixResult = await dbRpFix.execute(sqlRpFix`
      UPDATE role_permissions rp
      SET tenant_id = r.tenant_id
      FROM roles r
      WHERE rp.role_id = r.id
        AND rp.tenant_id != r.tenant_id
    `);
    const fixed = (rpFixResult as any).rowCount ?? 0;
    if (fixed > 0) {
      console.log(`[ROLE_PERMS TENANT FIX] Corrected ${fixed} role_permissions row(s) with wrong tenant_id`);
    } else {
      console.log('[ROLE_PERMS TENANT FIX] All role_permissions rows OK');
    }
  } catch (err) {
    console.error('[ROLE_PERMS TENANT FIX ERROR]', err);
  }

  // ─── New screen keys migration: insert missing purchase_returns / tds_management rows ──
  try {
    const { db: dbNewScreens } = await import("./db");
    const { sql: sqlNewScreens } = await import("drizzle-orm");
    for (const screenKey of ['purchase_returns', 'tds_management']) {
      await dbNewScreens.execute(sqlNewScreens`
        INSERT INTO role_permissions (role_id, tenant_id, screen_key, can_view, can_create, can_edit, can_delete, record_status)
        SELECT r.id, r.tenant_id, ${screenKey}, 0, 0, 0, 0, 1
        FROM roles r
        WHERE NOT EXISTS (
          SELECT 1 FROM role_permissions rp2
          WHERE rp2.role_id = r.id AND rp2.screen_key = ${screenKey}
        )
      `);
    }
    console.log('[NEW_SCREEN_KEYS MIGRATION] purchase_returns / tds_management rows ensured');
  } catch (err) {
    console.error('[NEW_SCREEN_KEYS MIGRATION ERROR]', err);
  }

  // ─── api_keys screen key migration ───────────────────────────────────────────
  try {
    const { db: dbApiKeys } = await import("./db");
    const { sql: sqlApiKeys } = await import("drizzle-orm");
    // Insert missing rows — admin/accountsmanager get full access, others get none
    await dbApiKeys.execute(sqlApiKeys`
      INSERT INTO role_permissions (role_id, tenant_id, screen_key, can_view, can_create, can_edit, can_delete, record_status)
      SELECT
        r.id, r.tenant_id, 'api_keys',
        CASE WHEN lower(r.name) IN ('admin','accountsmanager') THEN 1 ELSE 0 END,
        CASE WHEN lower(r.name) IN ('admin','accountsmanager') THEN 1 ELSE 0 END,
        CASE WHEN lower(r.name) IN ('admin','accountsmanager') THEN 1 ELSE 0 END,
        CASE WHEN lower(r.name) IN ('admin','accountsmanager') THEN 1 ELSE 0 END,
        1
      FROM roles r
      WHERE NOT EXISTS (
        SELECT 1 FROM role_permissions rp2
        WHERE rp2.role_id = r.id AND rp2.screen_key = 'api_keys'
      )
    `);
    // Also fix any existing admin rows that were inserted with all-zero by a prior migration run
    await dbApiKeys.execute(sqlApiKeys`
      UPDATE role_permissions rp
      SET can_view=1, can_create=1, can_edit=1, can_delete=1
      FROM roles r
      WHERE rp.role_id = r.id
        AND rp.screen_key = 'api_keys'
        AND lower(r.name) IN ('admin','accountsmanager')
        AND rp.can_view = 0
    `);
    console.log('[API_KEYS MIGRATION] api_keys rows ensured for all roles');
  } catch (err) {
    console.error('[API_KEYS MIGRATION ERROR]', err);
  }

  // ─── Fix chart_of_accounts unique constraint (multi-tenant) ─────────────
  // Production may still have the old single-column unique constraint
  // 'chart_of_accounts_code_key' on just (code), which blocks seeding COA for
  // any tenant beyond the first. Replace it with the correct composite
  // constraint (code, tenant_id) so each tenant can have its own COA.
  try {
    const { db: dbCoaFix } = await import("./db");
    const { sql: sqlCoaFix } = await import("drizzle-orm");

    // Drop old single-column constraint if it still exists
    await dbCoaFix.execute(sqlCoaFix`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'chart_of_accounts'
            AND constraint_name = 'chart_of_accounts_code_key'
            AND constraint_type = 'UNIQUE'
        ) THEN
          ALTER TABLE chart_of_accounts DROP CONSTRAINT chart_of_accounts_code_key;
        END IF;
      END $$;
    `);

    // Ensure composite (code, tenant_id) constraint exists
    await dbCoaFix.execute(sqlCoaFix`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'chart_of_accounts'
            AND constraint_name = 'coa_code_tenant_unique'
            AND constraint_type = 'UNIQUE'
        ) THEN
          ALTER TABLE chart_of_accounts
            ADD CONSTRAINT coa_code_tenant_unique UNIQUE (code, tenant_id);
        END IF;
      END $$;
    `);
    console.log('[COA CONSTRAINT MIGRATION] chart_of_accounts constraint OK (code, tenant_id)');
  } catch (err) {
    console.error('[COA CONSTRAINT MIGRATION ERROR]', err);
  }

  // ─── Ensure subscriptions(tenant_id) unique constraint ───────────────────
  // Required by seed-demo-tenant.ts ON CONFLICT (tenant_id). Missing on
  // production DBs created before this constraint was added.
  try {
    const { db: dbSubFix } = await import("./db");
    const { sql: sqlSubFix } = await import("drizzle-orm");
    await dbSubFix.execute(sqlSubFix`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'subscriptions'
            AND constraint_name = 'subscriptions_tenant_id_unique'
            AND constraint_type = 'UNIQUE'
        ) THEN
          ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_tenant_id_unique UNIQUE (tenant_id);
        END IF;
      END $$;
    `);
    console.log('[SUBSCRIPTIONS MIGRATION] subscriptions(tenant_id) unique constraint OK');
  } catch (err) {
    console.error('[SUBSCRIPTIONS MIGRATION ERROR]', err);
  }

  // ─── Ensure subscriptions.selected_modules + monthly_amount columns ───────
  // Added for the Module Marketplace (Phase 9). Production DBs that were
  // deployed before this migration will be missing these columns, which
  // causes the billing routes and plan-middleware to crash or misbehave.
  try {
    const { db: dbModFix } = await import("./db");
    const { sql: sqlModFix } = await import("drizzle-orm");
    await dbModFix.execute(sqlModFix`
      ALTER TABLE subscriptions
        ADD COLUMN IF NOT EXISTS selected_modules JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS monthly_amount INTEGER DEFAULT 0;
    `);
    console.log('[SUBSCRIPTIONS MODULE MIGRATION] selected_modules + monthly_amount columns OK');
  } catch (err) {
    console.error('[SUBSCRIPTIONS MODULE MIGRATION ERROR]', err);
  }

  // ─── Phase 1-5 tables (comprehensive auto-migration) ────────────────────
  // Each section has its OWN try/catch so one failure never blocks the rest.
  // All DDL uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS — safe on every startup.
  {
    const { pool: pgMig } = await import("./db");

    // ── Phase 1: Configurable Module Labels ────────────────────────────────
    try {
    await pgMig.query(`
      CREATE SEQUENCE IF NOT EXISTS public.tenant_module_labels_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.tenant_module_labels (
        id           integer NOT NULL DEFAULT nextval('tenant_module_labels_id_seq'),
        tenant_id    integer NOT NULL,
        module_key   text NOT NULL,
        custom_label text NOT NULL,
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.tenant_module_labels_id_seq OWNED BY public.tenant_module_labels.id;
      CREATE UNIQUE INDEX IF NOT EXISTS tenant_module_labels_tenant_module_uidx
        ON public.tenant_module_labels (tenant_id, module_key);
    `);
    console.log('[MIGRATION] tenant_module_labels OK');
    } catch (e: any) { console.error('[MIGRATION] tenant_module_labels SKIP:', e.message); }

    // ── Phase 1: Custom Field Definitions + Values ────────────────────────
    try {
    await pgMig.query(`
      CREATE SEQUENCE IF NOT EXISTS public.custom_field_definitions_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
        id            integer NOT NULL DEFAULT nextval('custom_field_definitions_id_seq'),
        tenant_id     integer NOT NULL,
        entity_type   text NOT NULL,
        field_name    text NOT NULL,
        field_label   text NOT NULL,
        field_type    text DEFAULT 'text',
        options       jsonb,
        is_required   boolean DEFAULT false,
        sort_order    integer DEFAULT 0,
        record_status integer DEFAULT 1,
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.custom_field_definitions_id_seq OWNED BY public.custom_field_definitions.id;

      CREATE SEQUENCE IF NOT EXISTS public.custom_field_values_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.custom_field_values (
        id           integer NOT NULL DEFAULT nextval('custom_field_values_id_seq'),
        tenant_id    integer NOT NULL,
        field_def_id integer NOT NULL,
        entity_type  text NOT NULL,
        entity_id    integer NOT NULL,
        field_value  text,
        created_at   timestamptz DEFAULT now(),
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.custom_field_values_id_seq OWNED BY public.custom_field_values.id;
      CREATE INDEX IF NOT EXISTS custom_field_values_entity_idx
        ON public.custom_field_values (tenant_id, entity_type, entity_id);
    `);
    console.log('[MIGRATION] custom_field_definitions + values OK');
    } catch (e: any) { console.error('[MIGRATION] custom_field_definitions SKIP:', e.message); }

    // ── T003: Purchase Requisitions ───────────────────────────────────────
    // NOTE: Index creation uses DO $$ guard because old prod DBs may have this
    // table with different column names — CREATE TABLE IF NOT EXISTS skips it,
    // then the index on pr_id would fail. The DO $$ checks column existence first.
    try {
    await pgMig.query(`
      CREATE SEQUENCE IF NOT EXISTS public.purchase_requisitions_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
        id            integer NOT NULL DEFAULT nextval('purchase_requisitions_id_seq'),
        tenant_id     integer NOT NULL,
        pr_number     text NOT NULL,
        pr_date       date NOT NULL DEFAULT CURRENT_DATE,
        requested_by  integer,
        department    text,
        status        text DEFAULT 'draft',
        priority      text DEFAULT 'normal',
        notes         text,
        record_status integer DEFAULT 1,
        created_at    timestamptz DEFAULT now(),
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.purchase_requisitions_id_seq OWNED BY public.purchase_requisitions.id;
    `);
    console.log('[MIGRATION] purchase_requisitions OK');
    } catch (e: any) { console.error('[MIGRATION] purchase_requisitions SKIP:', e.message); }

    try {
    await pgMig.query(`
      CREATE SEQUENCE IF NOT EXISTS public.purchase_requisition_items_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.purchase_requisition_items (
        id              integer NOT NULL DEFAULT nextval('purchase_requisition_items_id_seq'),
        tenant_id       integer NOT NULL,
        pr_id           integer NOT NULL,
        product_id      integer,
        description     text,
        quantity        numeric(15,3) NOT NULL,
        uom             text,
        estimated_price numeric(15,2),
        required_date   date,
        record_status   integer DEFAULT 1,
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.purchase_requisition_items_id_seq OWNED BY public.purchase_requisition_items.id;
    `);
    console.log('[MIGRATION] purchase_requisition_items OK');
    } catch (e: any) { console.error('[MIGRATION] purchase_requisition_items SKIP:', e.message); }

    // Create pr_items index only if the column exists (safe on mismatched prod schemas)
    try {
    await pgMig.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'purchase_requisition_items' AND column_name = 'pr_id'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename = 'purchase_requisition_items' AND indexname = 'pr_items_pr_idx'
        ) THEN
          CREATE INDEX pr_items_pr_idx ON public.purchase_requisition_items (pr_id);
        END IF;
      END $$;
    `);
    } catch (e: any) { console.error('[MIGRATION] pr_items_pr_idx SKIP:', e.message); }

    // ── T004: Goods Receipt Notes ─────────────────────────────────────────
    try {
    await pgMig.query(`
      CREATE SEQUENCE IF NOT EXISTS public.goods_receipt_notes_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.goods_receipt_notes (
        id            integer NOT NULL DEFAULT nextval('goods_receipt_notes_id_seq'),
        tenant_id     integer NOT NULL,
        grn_number    text NOT NULL,
        received_date date NOT NULL DEFAULT CURRENT_DATE,
        po_id         integer,
        vendor_id     integer,
        remarks       text,
        received_by   integer,
        status        text DEFAULT 'received',
        record_status integer DEFAULT 1,
        created_at    timestamptz DEFAULT now(),
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.goods_receipt_notes_id_seq OWNED BY public.goods_receipt_notes.id;

      CREATE SEQUENCE IF NOT EXISTS public.grn_items_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.grn_items (
        id            integer NOT NULL DEFAULT nextval('grn_items_id_seq'),
        tenant_id     integer NOT NULL,
        grn_id        integer NOT NULL,
        po_item_id    integer,
        product_id    integer,
        description   text,
        ordered_qty   numeric(15,3) DEFAULT 0,
        received_qty  numeric(15,3) NOT NULL,
        rejected_qty  numeric(15,3) DEFAULT 0,
        unit_price    numeric(15,2) DEFAULT 0,
        uom           text,
        record_status integer DEFAULT 1,
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.grn_items_id_seq OWNED BY public.grn_items.id;
      CREATE INDEX IF NOT EXISTS grn_items_grn_idx ON public.grn_items (grn_id);
    `);
    console.log('[MIGRATION] goods_receipt_notes + grn_items OK');
    } catch (e: any) { console.error('[MIGRATION] goods_receipt_notes SKIP:', e.message); }

    // ── T005-T008: Vendor columns (CRITICAL — own isolated block) ─────────
    try {
    await pgMig.query(`
      ALTER TABLE public.vendors
        ADD COLUMN IF NOT EXISTS payment_terms_days integer DEFAULT 30,
        ADD COLUMN IF NOT EXISTS credit_limit numeric(15,2) DEFAULT 0;
    `);
    console.log('[MIGRATION] vendors.credit_limit + payment_terms_days OK');
    } catch (e: any) { console.error('[MIGRATION] vendors columns SKIP:', e.message); }

    // ── T005-T008: Expense voucher + journal columns ──────────────────────
    try {
    await pgMig.query(`
      ALTER TABLE public.expense_vouchers
        ADD COLUMN IF NOT EXISTS grn_id integer,
        ADD COLUMN IF NOT EXISTS matching_status text DEFAULT 'unmatched',
        ADD COLUMN IF NOT EXISTS cost_centre_id integer;
      ALTER TABLE public.journal_lines
        ADD COLUMN IF NOT EXISTS cost_centre_id integer;
    `);
    console.log('[MIGRATION] expense_vouchers + journal_lines columns OK');
    } catch (e: any) { console.error('[MIGRATION] expense/journal columns SKIP:', e.message); }

    // ── T005-T008: Approval tables + Cost Centres ─────────────────────────
    try {
    await pgMig.query(`
      CREATE SEQUENCE IF NOT EXISTS public.approval_rules_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.approval_rules (
        id              integer NOT NULL DEFAULT nextval('approval_rules_id_seq'),
        tenant_id       integer NOT NULL,
        entity_type     text NOT NULL,
        min_amount      numeric(15,2) DEFAULT 0,
        max_amount      numeric(15,2),
        approver_role   text,
        approver_user_id integer,
        approval_level  integer DEFAULT 1,
        record_status   integer DEFAULT 1,
        created_at      timestamptz DEFAULT now(),
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.approval_rules_id_seq OWNED BY public.approval_rules.id;

      CREATE SEQUENCE IF NOT EXISTS public.approval_requests_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.approval_requests (
        id            integer NOT NULL DEFAULT nextval('approval_requests_id_seq'),
        tenant_id     integer NOT NULL,
        entity_type   text NOT NULL,
        entity_id     integer NOT NULL,
        rule_id       integer,
        requested_by  integer,
        requested_at  timestamptz DEFAULT now(),
        status        text DEFAULT 'pending',
        actioned_by   integer,
        actioned_at   timestamptz,
        comments      text,
        record_status integer DEFAULT 1,
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.approval_requests_id_seq OWNED BY public.approval_requests.id;
      CREATE INDEX IF NOT EXISTS approval_requests_entity_idx
        ON public.approval_requests (tenant_id, entity_type, entity_id);

      CREATE SEQUENCE IF NOT EXISTS public.cost_centres_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.cost_centres (
        id            integer NOT NULL DEFAULT nextval('cost_centres_id_seq'),
        tenant_id     integer NOT NULL,
        name          text NOT NULL,
        code          text,
        parent_id     integer,
        description   text,
        is_active     boolean DEFAULT true,
        record_status integer DEFAULT 1,
        created_at    timestamptz DEFAULT now(),
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.cost_centres_id_seq OWNED BY public.cost_centres.id;
    `);
    console.log('[MIGRATION] approval_rules + approval_requests + cost_centres OK');
    } catch (e: any) { console.error('[MIGRATION] approval/cost_centres SKIP:', e.message); }

    // ── Phase 2: Expense Claims + Recurring Invoices ──────────────────────
    try {
    await pgMig.query(`
      CREATE SEQUENCE IF NOT EXISTS public.hr_expense_claims_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.hr_expense_claims (
        id               integer NOT NULL DEFAULT nextval('hr_expense_claims_id_seq'),
        tenant_id        integer NOT NULL,
        employee_id      integer NOT NULL,
        title            text NOT NULL,
        claim_date       date NOT NULL,
        total_amount     numeric(12,2) DEFAULT 0,
        status           text DEFAULT 'pending',
        approved_by      integer,
        approved_at      timestamptz,
        paid_at          timestamptz,
        notes            text,
        rejection_reason text,
        cost_centre_id   integer,
        record_status    integer DEFAULT 1,
        created_at       timestamptz DEFAULT now(),
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.hr_expense_claims_id_seq OWNED BY public.hr_expense_claims.id;

      CREATE SEQUENCE IF NOT EXISTS public.hr_expense_claim_items_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.hr_expense_claim_items (
        id           integer NOT NULL DEFAULT nextval('hr_expense_claim_items_id_seq'),
        tenant_id    integer NOT NULL,
        claim_id     integer NOT NULL,
        category     text NOT NULL,
        description  text,
        amount       numeric(12,2) NOT NULL,
        receipt_url  text,
        expense_date date,
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.hr_expense_claim_items_id_seq OWNED BY public.hr_expense_claim_items.id;
      CREATE INDEX IF NOT EXISTS hr_expense_claim_items_claim_idx ON public.hr_expense_claim_items (claim_id);

      CREATE SEQUENCE IF NOT EXISTS public.recurring_invoice_schedules_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.recurring_invoice_schedules (
        id              integer NOT NULL DEFAULT nextval('recurring_invoice_schedules_id_seq'),
        tenant_id       integer NOT NULL,
        customer_name   text NOT NULL,
        customer_gstin  text,
        billing_address text,
        frequency       text DEFAULT 'monthly',
        next_due        date NOT NULL,
        end_date        date,
        amount          numeric(15,2) DEFAULT 0,
        gst_rate        numeric(5,2) DEFAULT 0,
        notes           text,
        is_active       boolean DEFAULT true,
        record_status   integer DEFAULT 1,
        created_at      timestamptz DEFAULT now(),
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.recurring_invoice_schedules_id_seq OWNED BY public.recurring_invoice_schedules.id;
    `);
    console.log('[MIGRATION] hr_expense_claims + recurring_invoice_schedules OK');
    } catch (e: any) { console.error('[MIGRATION] expense_claims/recurring SKIP:', e.message); }

    // ── Phase 3: Warehouses, UOM, Serial/Lot, Stock Transfers ────────────
    try {
    await pgMig.query(`
      CREATE SEQUENCE IF NOT EXISTS public.warehouses_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.warehouses (
        id            integer NOT NULL DEFAULT nextval('warehouses_id_seq'),
        tenant_id     integer NOT NULL,
        name          text NOT NULL,
        code          text,
        address       text,
        city          text,
        state         text,
        is_default    boolean DEFAULT false,
        record_status integer DEFAULT 1,
        created_at    timestamptz DEFAULT now(),
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.warehouses_id_seq OWNED BY public.warehouses.id;

      CREATE SEQUENCE IF NOT EXISTS public.warehouse_stock_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.warehouse_stock (
        id           integer NOT NULL DEFAULT nextval('warehouse_stock_id_seq'),
        tenant_id    integer NOT NULL,
        warehouse_id integer NOT NULL,
        item_id      text NOT NULL,
        quantity     numeric(15,3) DEFAULT 0,
        reserved     numeric(15,3) DEFAULT 0,
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.warehouse_stock_id_seq OWNED BY public.warehouse_stock.id;
      CREATE UNIQUE INDEX IF NOT EXISTS warehouse_stock_item_uidx ON public.warehouse_stock (tenant_id, warehouse_id, item_id);

      CREATE SEQUENCE IF NOT EXISTS public.uom_conversions_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.uom_conversions (
        id            integer NOT NULL DEFAULT nextval('uom_conversions_id_seq'),
        tenant_id     integer NOT NULL,
        item_id       text,
        from_uom      text NOT NULL,
        to_uom        text NOT NULL,
        factor        numeric(15,6) NOT NULL,
        record_status integer DEFAULT 1,
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.uom_conversions_id_seq OWNED BY public.uom_conversions.id;

      CREATE SEQUENCE IF NOT EXISTS public.serial_lot_register_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.serial_lot_register (
        id                integer NOT NULL DEFAULT nextval('serial_lot_register_id_seq'),
        tenant_id         integer NOT NULL,
        item_id           text NOT NULL,
        serial_number     text,
        lot_number        text,
        batch_number      text,
        manufactured_date date,
        expiry_date       date,
        quantity          numeric(15,3) DEFAULT 1,
        status            text DEFAULT 'in_stock',
        source_type       text,
        source_id         integer,
        warehouse_id      integer,
        record_status     integer DEFAULT 1,
        created_at        timestamptz DEFAULT now(),
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.serial_lot_register_id_seq OWNED BY public.serial_lot_register.id;

      CREATE SEQUENCE IF NOT EXISTS public.stock_transfers_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.stock_transfers (
        id               integer NOT NULL DEFAULT nextval('stock_transfers_id_seq'),
        tenant_id        integer NOT NULL,
        transfer_number  text NOT NULL,
        transfer_date    date NOT NULL DEFAULT CURRENT_DATE,
        from_warehouse_id integer,
        to_warehouse_id  integer,
        status           text DEFAULT 'draft',
        notes            text,
        record_status    integer DEFAULT 1,
        created_at       timestamptz DEFAULT now(),
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.stock_transfers_id_seq OWNED BY public.stock_transfers.id;

      CREATE SEQUENCE IF NOT EXISTS public.stock_transfer_items_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.stock_transfer_items (
        id           integer NOT NULL DEFAULT nextval('stock_transfer_items_id_seq'),
        tenant_id    integer NOT NULL,
        transfer_id  integer NOT NULL,
        item_id      text NOT NULL,
        quantity     numeric(15,3) NOT NULL,
        uom          text,
        record_status integer DEFAULT 1,
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.stock_transfer_items_id_seq OWNED BY public.stock_transfer_items.id;
    `);
    console.log('[MIGRATION] warehouses + uom + serial_lot + stock_transfers OK');
    } catch (e: any) { console.error('[MIGRATION] warehouses/uom/stock SKIP:', e.message); }

    // ── Phase 4: Projects, BOQ, Milestones, Timesheets ───────────────────
    try {
    await pgMig.query(`
      CREATE SEQUENCE IF NOT EXISTS public.projects_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.projects (
        id              integer NOT NULL DEFAULT nextval('projects_id_seq'),
        tenant_id       integer NOT NULL,
        name            text NOT NULL,
        code            text,
        customer_id     integer,
        start_date      date,
        end_date        date,
        budget          numeric(15,2) DEFAULT 0,
        status          text DEFAULT 'active',
        description     text,
        project_manager integer,
        record_status   integer DEFAULT 1,
        created_at      timestamptz DEFAULT now(),
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;

      CREATE SEQUENCE IF NOT EXISTS public.boq_items_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.boq_items (
        id           integer NOT NULL DEFAULT nextval('boq_items_id_seq'),
        tenant_id    integer NOT NULL,
        project_id   integer NOT NULL,
        description  text NOT NULL,
        uom          text,
        quantity     numeric(15,3) DEFAULT 0,
        unit_rate    numeric(15,2) DEFAULT 0,
        amount       numeric(15,2) DEFAULT 0,
        record_status integer DEFAULT 1,
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.boq_items_id_seq OWNED BY public.boq_items.id;

      CREATE SEQUENCE IF NOT EXISTS public.billing_milestones_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.billing_milestones (
        id           integer NOT NULL DEFAULT nextval('billing_milestones_id_seq'),
        tenant_id    integer NOT NULL,
        project_id   integer NOT NULL,
        name         text NOT NULL,
        due_date     date,
        amount       numeric(15,2) DEFAULT 0,
        status       text DEFAULT 'pending',
        invoice_id   text,
        record_status integer DEFAULT 1,
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.billing_milestones_id_seq OWNED BY public.billing_milestones.id;

      CREATE SEQUENCE IF NOT EXISTS public.timesheets_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.timesheets (
        id           integer NOT NULL DEFAULT nextval('timesheets_id_seq'),
        tenant_id    integer NOT NULL,
        employee_id  integer NOT NULL,
        project_id   integer,
        date         date NOT NULL,
        hours        numeric(5,2) NOT NULL,
        description  text,
        status       text DEFAULT 'draft',
        record_status integer DEFAULT 1,
        created_at   timestamptz DEFAULT now(),
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.timesheets_id_seq OWNED BY public.timesheets.id;
    `);
    console.log('[MIGRATION] projects + boq + milestones + timesheets OK');
    } catch (e: any) { console.error('[MIGRATION] projects/boq SKIP:', e.message); }

    // ── Phase 5: Fixed Assets, Appraisals, Multi-currency ────────────────
    try {
    await pgMig.query(`
      CREATE SEQUENCE IF NOT EXISTS public.fixed_assets_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.fixed_assets (
        id                  integer NOT NULL DEFAULT nextval('fixed_assets_id_seq'),
        tenant_id           integer NOT NULL,
        name                text NOT NULL,
        code                text,
        category            text,
        purchase_date       date,
        purchase_cost       numeric(15,2) DEFAULT 0,
        useful_life_years   integer DEFAULT 5,
        depreciation_method text DEFAULT 'slm',
        salvage_value       numeric(15,2) DEFAULT 0,
        location            text,
        status              text DEFAULT 'active',
        record_status       integer DEFAULT 1,
        created_at          timestamptz DEFAULT now(),
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.fixed_assets_id_seq OWNED BY public.fixed_assets.id;

      CREATE SEQUENCE IF NOT EXISTS public.asset_depreciation_schedule_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.asset_depreciation_schedule (
        id              integer NOT NULL DEFAULT nextval('asset_depreciation_schedule_id_seq'),
        tenant_id       integer NOT NULL,
        asset_id        integer NOT NULL,
        year            integer NOT NULL,
        depreciation    numeric(15,2) DEFAULT 0,
        book_value      numeric(15,2) DEFAULT 0,
        is_posted       boolean DEFAULT false,
        record_status   integer DEFAULT 1,
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.asset_depreciation_schedule_id_seq OWNED BY public.asset_depreciation_schedule.id;

      CREATE SEQUENCE IF NOT EXISTS public.appraisal_cycles_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.appraisal_cycles (
        id            integer NOT NULL DEFAULT nextval('appraisal_cycles_id_seq'),
        tenant_id     integer NOT NULL,
        name          text NOT NULL,
        period_start  date NOT NULL,
        period_end    date NOT NULL,
        status        text DEFAULT 'draft',
        record_status integer DEFAULT 1,
        created_at    timestamptz DEFAULT now(),
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.appraisal_cycles_id_seq OWNED BY public.appraisal_cycles.id;

      CREATE SEQUENCE IF NOT EXISTS public.appraisals_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.appraisals (
        id             integer NOT NULL DEFAULT nextval('appraisals_id_seq'),
        tenant_id      integer NOT NULL,
        cycle_id       integer NOT NULL,
        employee_id    integer NOT NULL,
        reviewer_id    integer,
        self_score     numeric(3,1),
        manager_score  numeric(3,1),
        final_score    numeric(3,1),
        rating         text,
        comments       text,
        status         text DEFAULT 'pending',
        record_status  integer DEFAULT 1,
        created_at     timestamptz DEFAULT now(),
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.appraisals_id_seq OWNED BY public.appraisals.id;

      CREATE SEQUENCE IF NOT EXISTS public.appraisal_kras_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.appraisal_kras (
        id            integer NOT NULL DEFAULT nextval('appraisal_kras_id_seq'),
        tenant_id     integer NOT NULL,
        appraisal_id  integer NOT NULL,
        kra           text NOT NULL,
        weightage     numeric(5,2),
        self_score    numeric(3,1),
        manager_score numeric(3,1),
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.appraisal_kras_id_seq OWNED BY public.appraisal_kras.id;

      CREATE SEQUENCE IF NOT EXISTS public.currencies_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.currencies (
        id            integer NOT NULL DEFAULT nextval('currencies_id_seq'),
        tenant_id     integer NOT NULL,
        code          text NOT NULL,
        name          text NOT NULL,
        symbol        text,
        is_base       boolean DEFAULT false,
        record_status integer DEFAULT 1,
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.currencies_id_seq OWNED BY public.currencies.id;
      CREATE UNIQUE INDEX IF NOT EXISTS currencies_tenant_code_uidx ON public.currencies (tenant_id, code);

      CREATE SEQUENCE IF NOT EXISTS public.exchange_rates_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE TABLE IF NOT EXISTS public.exchange_rates (
        id           integer NOT NULL DEFAULT nextval('exchange_rates_id_seq'),
        tenant_id    integer NOT NULL,
        currency_id  integer NOT NULL,
        rate         date NOT NULL,
        rate_value   numeric(15,6) NOT NULL,
        PRIMARY KEY (id)
      );
      ALTER SEQUENCE public.exchange_rates_id_seq OWNED BY public.exchange_rates.id;
    `);
    console.log('[MIGRATION] fixed_assets + appraisals + currencies + exchange_rates OK');
    } catch (e: any) { console.error('[MIGRATION] phase5 assets/appraisals/currencies SKIP:', e.message); }

    console.log('[PHASE 1-5 MIGRATION] All sections attempted — check individual lines above for status');
  }

  // ─── Platform settings table (super-admin editable config) ───────────────
  try {
    const { pool: pgPs } = await import("./db");
    await pgPs.query(`
      CREATE TABLE IF NOT EXISTS public.platform_settings (
        key        text NOT NULL PRIMARY KEY,
        value      text,
        updated_at timestamptz DEFAULT now()
      );
    `);
    console.log('[PLATFORM SETTINGS MIGRATION] platform_settings table OK');
  } catch (err) {
    console.error('[PLATFORM SETTINGS MIGRATION ERROR]', err);
  }

  // ─── Ensure role_permissions(role_id, screen_key) unique constraint ───────
  // Required by seed-demo-tenant.ts and seed-tenant.ts ON CONFLICT (role_id, screen_key).
  // Missing on production DBs created before this constraint was added.
  try {
    const { db: dbRpFix } = await import("./db");
    const { sql: sqlRpFix } = await import("drizzle-orm");
    await dbRpFix.execute(sqlRpFix`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'role_permissions'
            AND constraint_name = 'role_permissions_role_screen_unique'
            AND constraint_type = 'UNIQUE'
        ) THEN
          ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_screen_unique UNIQUE (role_id, screen_key);
        END IF;
      END $$;
    `);
    console.log('[ROLE_PERMS MIGRATION] role_permissions(role_id, screen_key) unique constraint OK');
  } catch (err) {
    console.error('[ROLE_PERMS MIGRATION ERROR]', err);
  }

  // ─── Seed / sync role_permissions for all gold_erp_plan tenants ───────────
  // Uses syncAndUnlockByPlan so BOTH gold-erp-specific keys AND standard module
  // screen keys (invoicing, HR, accounting, CRM …) are seeded with correct perms.
  try {
    const { pool: goldPool } = await import('./db');
    const { syncAndUnlockByPlan } = await import('./seed-permissions');
    const goldTenantsRes = await goldPool.query(`
      SELECT DISTINCT t.id
      FROM tenants t
      JOIN subscriptions s ON s.tenant_id = t.id
      JOIN subscription_plans sp ON sp.id = s.plan_id
      WHERE sp.slug = 'gold_erp_plan'
    `);
    for (const row of goldTenantsRes.rows) {
      const result = await syncAndUnlockByPlan(row.id);
      console.log(`[GOLD_ERP_ROLE_PERMS] tenant ${row.id}: inserted=${result.inserted} unlocked=${result.unlocked} skipped=${result.skipped}`);
    }
  } catch (err) {
    console.error('[GOLD_ERP_ROLE_PERMS ERROR]', err);
  }

  // ─── Auto-patch all admin roles with any new screens from the registry ────
  // This runs on every startup. When a developer adds a new screen to
  // shared/screen-registry.ts, ALL existing admin roles across ALL tenants
  // get that screen automatically — no manual SQL needed.
  try {
    const { ALL_NAV_SCREEN_KEYS: ALL_SCREEN_KEYS } = await import('../shared/nav-screen-map');
    const { pool: patchPool } = await import('./db');

    // Find every admin role across all tenants
    const adminRoles = await patchPool.query(`
      SELECT r.id AS role_id, r.tenant_id
      FROM roles r
      WHERE lower(r.name) = 'admin'
    `);

    let totalInserted = 0;
    for (const row of adminRoles.rows) {
      for (const key of ALL_SCREEN_KEYS) {
        const res = await patchPool.query(`
          INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete, tenant_id)
          VALUES ($1, $2, 1, 1, 1, 1, $3)
          ON CONFLICT (role_id, screen_key) DO NOTHING
        `, [row.role_id, key, row.tenant_id]);
        totalInserted += res.rowCount ?? 0;
      }
    }
    console.log(`[REGISTRY AUTO-PATCH] ${adminRoles.rows.length} admin role(s) synced — ${totalInserted} new permission row(s) inserted`);
  } catch (err) {
    console.error('[REGISTRY AUTO-PATCH ERROR]', err);
  }

  // ─── is_super_admin column on users (required by Drizzle schema) ─────────
  try {
    const { pool: poolSA } = await import('./db');
    await poolSA.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false`);
    await poolSA.query(`UPDATE users SET is_super_admin = true WHERE tenant_id = 6 AND (is_super_admin IS NULL OR is_super_admin = false)`);
    console.log('[MIGRATION] users.is_super_admin column OK');
  } catch (err) {
    console.error('[MIGRATION] users.is_super_admin ERROR:', err);
  }

  // ─── Daily tenant backup cron (2:00 AM daily) ────────────────────────────
  try {
    const cron = (await import('node-cron')).default;
    cron.schedule('0 2 * * *', async () => {
      try {
        const { runDailyBackups } = await import('./backup.js');
        await runDailyBackups();
      } catch (err) {
        console.error('[BACKUP CRON ERROR]', err);
      }
    });
    log('✅ Daily tenant backup cron initialized (runs at 2:00 AM)');
  } catch (err) {
    console.error('[BACKUP CRON SETUP ERROR]', err);
  }

  // ─── PostgreSQL dump cron (1:00 AM daily) ────────────────────────────────
  // Full pg_dump of the entire database, stored in uploads/admin/postgres-backups/
  try {
    const pgCron = (await import('node-cron')).default;
    pgCron.schedule('0 1 * * *', async () => {
      try {
        const { runPostgresBackup } = await import('./backup.js');
        const filename = await runPostgresBackup('scheduled');
        log(`✅ Scheduled PostgreSQL backup: ${filename}`);
      } catch (err) {
        console.error('[PGBACKUP CRON ERROR]', err);
      }
    });
    log('✅ PostgreSQL dump cron initialized (runs at 1:00 AM)');
  } catch (err) {
    console.error('[PGBACKUP CRON SETUP ERROR]', err);
  }

  // ─── Subscription expiry cron (3:00 AM daily) ────────────────────────────
  // Downgrades any cancelled subscription whose billing period has ended
  try {
    const cron2 = (await import('node-cron')).default;
    cron2.schedule('0 3 * * *', async () => {
      try {
        const { runSubscriptionExpiryCheck } = await import('./billing');
        await runSubscriptionExpiryCheck();
      } catch (err) {
        console.error('[SUBSCRIPTION EXPIRY CRON ERROR]', err);
      }
    });
    log('✅ Subscription expiry cron initialized (runs at 3:00 AM)');
  } catch (err) {
    console.error('[SUBSCRIPTION EXPIRY CRON SETUP ERROR]', err);
  }

  // ─── Recurring Invoice auto-generate cron (6:00 AM daily) ──────────────────
  try {
    const recurCron = (await import('node-cron')).default;
    recurCron.schedule('0 6 * * *', async () => {
      try {
        const { db: cronDb } = await import('./db');
        const { sql: cronSql } = await import('drizzle-orm');
        const today = new Date().toISOString().split('T')[0];
        const due = await cronDb.execute(cronSql`SELECT * FROM recurring_invoice_schedules WHERE next_due <= ${today} AND status='active' AND record_status=1`);
        for (const sched of due.rows as any[]) {
          try {
            const nextDue = new Date(sched.next_due);
            const freq = sched.frequency;
            if (freq === 'monthly') nextDue.setMonth(nextDue.getMonth() + 1);
            else if (freq === 'quarterly') nextDue.setMonth(nextDue.getMonth() + 3);
            else if (freq === 'weekly') nextDue.setDate(nextDue.getDate() + 7);
            else if (freq === 'yearly') nextDue.setFullYear(nextDue.getFullYear() + 1);
            const invNum = `INV-REC-${Date.now()}`;
            await cronDb.execute(cronSql`INSERT INTO invoices (tenant_id,invoice_number,invoice_date,buyer_name,subtotal,tax_amount,total_amount,status,invoice_type)
              VALUES (${sched.tenant_id},${invNum},${today},${sched.customer_name||''},${sched.amount},0,${sched.amount},'draft','tax_invoice')`);
            await cronDb.execute(cronSql`UPDATE recurring_invoice_schedules SET next_due=${nextDue.toISOString().split('T')[0]},last_generated=${today} WHERE id=${sched.id}`);
          } catch (e) { console.error('[RECUR INVOICE CRON] Row error', e); }
        }
        if (due.rows.length > 0) log(`[RECUR INVOICE CRON] Generated ${due.rows.length} invoices`);
      } catch (e) { console.error('[RECUR INVOICE CRON ERROR]', e); }
    });
    log('✅ Recurring invoice cron initialized (runs at 6:00 AM)');
  } catch (err) {
    console.error('[RECUR INVOICE CRON SETUP ERROR]', err);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`🚀 Server running on port ${port}`);
    
    // Start machine startup reminder checking system
    // Checks every 5 minutes for pending reminders
    setInterval(async () => {
      try {
        await notificationService.checkAndSendReminders();
      } catch (error) {
        console.error('[REMINDER SYSTEM ERROR]', error);
      }
    }, 300000); // Check every 5 minutes (300 seconds)
    
    // Start missed checklist checking system
    // Checks every 5 minutes for missed checklists
    setInterval(async () => {
      try {
        await notificationService.checkAndSendMissedChecklistNotifications();
      } catch (error) {
        console.error('[MISSED CHECKLIST SYSTEM ERROR]', error);
      }
    }, 300000); // Check every 5 minutes (300 seconds)
    
    // Start document expiry alert system
    // Checks every hour for documents nearing expiry (30 days before)
    setInterval(async () => {
      try {
        await notificationService.checkAndSendDocumentExpiryAlerts(30);
      } catch (error) {
        console.error('[DOCUMENT EXPIRY ALERT SYSTEM ERROR]', error);
      }
    }, 3600000); // Check every hour (3600 seconds)
    
    // Initial check for document expiry on startup
    notificationService.checkAndSendDocumentExpiryAlerts(30).catch(error => {
      console.error('[DOCUMENT EXPIRY ALERT STARTUP ERROR]', error);
    });
    
    // Sync WhatsApp secrets from environment to database (one-time on startup)
    syncWhatsAppSecretsToDatabase().catch(error => {
      console.error('[WHATSAPP SECRETS SYNC ERROR]', error);
    });
    
    // ─── Daily tenant backup cron is initialized after listen ───────────────
    // (setup happens below in the async IIFE)

    log('✅ Machine startup reminder system initialized');
    log('✅ Missed checklist notification system initialized');
    log('✅ Document expiry alert system initialized');
    log('✅ WhatsApp secrets sync checked');
  });
})();
