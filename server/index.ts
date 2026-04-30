// --- Environment variables are automatically loaded in Replit ---
import * as url from "url";
import * as path from "path";
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

app.use(cors({
  origin: async (incoming, callback) => {
    if (!incoming) return callback(null, true); // same-origin / server-to-server
    const normalized = incoming.toLowerCase();
    // Always allow Replit preview, localhost, and the app's own domain
    if (
      normalized.includes('.replit.dev') ||
      normalized.includes('.replit.app') ||
      normalized.includes('localhost') ||
      normalized.includes('127.0.0.1')
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
