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

  // ─── Daily tenant backup cron (2:00 AM daily) ────────────────────────────
  try {
    const cron = (await import('node-cron')).default;
    cron.schedule('0 2 * * *', async () => {
      try {
        const { runDailyBackups } = await import('./backup');
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
        const { runPostgresBackup } = await import('./backup');
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
