import path from "path";
import fs from "fs";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { createGzip } from "zlib";
import { pipeline } from "stream";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { tenants } from "@shared/schema";
import { eq } from "drizzle-orm";

const execFileAsync = promisify(execFile);
const pipelineAsync = promisify(pipeline);

const UPLOADS_ROOT         = path.join(process.cwd(), "uploads");
const MAX_BACKUPS_PER_TENANT = 30;
const MAX_POSTGRES_BACKUPS   = 30;
const POSTGRES_BACKUP_DIR    = path.join(UPLOADS_ROOT, "admin", "postgres-backups");

// ─── Helpers ────────────────────────────────────────────────────────────────

function tenantBackupDir(tenantId: number): string {
  return path.join(UPLOADS_ROOT, "tenants", String(tenantId), "backups");
}

function ensureBackupDir(tenantId: number): string {
  const dir = tenantBackupDir(tenantId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function formatDateTag(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Tables to include in backups (in dependency order for safe export)
const BACKUP_TABLES = [
  "users", "roles", "role_permissions",
  "vendors", "products", "raw_materials", "product_bom",
  "chart_of_accounts",
  "invoices", "invoice_items", "invoice_payments", "payment_evidence",
  "sales_orders", "sales_order_items",
  "purchase_orders", "purchase_order_items",
  "gatepasses", "gatepass_items",
  "sales_returns", "sales_return_items",
  "credit_notes", "credit_note_items",
  "debit_notes", "debit_note_items",
  "vendor_debit_notes", "vendor_debit_note_items",
  "journal_entries", "journal_lines",
  "expense_vouchers", "expense_items",
  "raw_material_issuance", "raw_material_issuance_items",
  "production_entries",
  "production_reconciliations", "production_reconciliation_items",
  "raw_material_transactions", "finished_goods",
  "documents", "notification_config",
  "scrap_inventory",
  "customer_advances", "advance_applications",
  "cash_register_days", "cash_register_transactions",
];

// ─── Core: Export all tenant data to JSON ───────────────────────────────────

export async function exportTenantData(tenantId: number): Promise<Record<string, any[]>> {
  const data: Record<string, any[]> = {};

  for (const table of BACKUP_TABLES) {
    try {
      const result = await db.execute(
        sql`SELECT * FROM ${sql.identifier(table)} WHERE tenant_id = ${tenantId}`
      );
      data[table] = result.rows as any[];
    } catch {
      data[table] = [];
    }
  }

  return data;
}

// ─── Write a backup file for a tenant ───────────────────────────────────────

export async function backupTenant(
  tenantId: number,
  label: "daily" | "pre-deletion" | "manual" = "daily"
): Promise<string> {
  const dir = ensureBackupDir(tenantId);
  const tag = formatDateTag();
  const ts = Date.now();
  const filename = `${label}-${tag}-${ts}.json`;
  const filePath = path.join(dir, filename);

  const data = await exportTenantData(tenantId);

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));

  const payload = {
    exportedAt: new Date().toISOString(),
    tenantId,
    tenantName: tenant?.name ?? "Unknown",
    tenantSlug: (tenant as any)?.slug ?? "unknown",
    label,
    tables: BACKUP_TABLES,
    data,
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");

  // Rotate: keep only MAX_BACKUPS_PER_TENANT most recent backups (by mtime)
  rotateBackups(tenantId, dir);

  return filename;
}

// Keep only the N most recent backup files, delete older ones
function rotateBackups(tenantId: number, dir: string): void {
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);

    const toDelete = files.slice(MAX_BACKUPS_PER_TENANT);
    for (const f of toDelete) {
      try {
        fs.unlinkSync(path.join(dir, f.name));
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore rotation errors
  }
}

// ─── List backups for a tenant ───────────────────────────────────────────────

export function listBackups(tenantId: number): Array<{
  filename: string;
  label: string;
  date: string;
  sizeKb: number;
  createdAt: string;
}> {
  const dir = tenantBackupDir(tenantId);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const stat = fs.statSync(path.join(dir, f));
      const parts = f.split("-");
      const label = parts[0] ?? "backup";
      return {
        filename: f,
        label,
        date: parts.slice(1, 4).join("-"),
        sizeKb: Math.round(stat.size / 1024),
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─── Download: get full file path for a backup (validated) ──────────────────

export function getBackupFilePath(tenantId: number, filename: string): string | null {
  // Validate filename (no path traversal)
  if (!/^[\w\-]+\.json$/.test(filename)) return null;
  const dir = tenantBackupDir(tenantId);
  const filePath = path.join(dir, filename);
  if (!fs.existsSync(filePath)) return null;
  // Path traversal check
  const resolved = fs.realpathSync(filePath);
  if (!resolved.startsWith(UPLOADS_ROOT)) return null;
  return resolved;
}

// ─── PostgreSQL dump (full database) ─────────────────────────────────────────

function ensurePostgresBackupDir(): string {
  fs.mkdirSync(POSTGRES_BACKUP_DIR, { recursive: true });
  return POSTGRES_BACKUP_DIR;
}

function rotatePostgresBackups(): void {
  try {
    const files = fs
      .readdirSync(POSTGRES_BACKUP_DIR)
      .filter((f) => f.endsWith(".sql.gz"))
      .map((f) => ({ name: f, mtime: fs.statSync(path.join(POSTGRES_BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);

    for (const f of files.slice(MAX_POSTGRES_BACKUPS)) {
      try { fs.unlinkSync(path.join(POSTGRES_BACKUP_DIR, f.name)); } catch {}
    }
  } catch {}
}

export async function runPostgresBackup(label: "scheduled" | "manual" = "manual"): Promise<string> {
  ensurePostgresBackupDir();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  // Resolve pg_dump binary — prefer system PATH, fall back to known Nix store path
  let pgDumpBin = "pg_dump";
  try {
    const { stdout } = await execFileAsync("which", ["pg_dump"]);
    pgDumpBin = stdout.trim() || pgDumpBin;
  } catch {
    // which failed — use default and let spawn fail naturally if not found
  }

  const tag      = formatDateTag();
  const ts       = Date.now();
  const filename = `${label}-${tag}-${ts}.sql.gz`;
  const filePath = path.join(POSTGRES_BACKUP_DIR, filename);

  await new Promise<void>((resolve, reject) => {
    const pgDump = spawn(pgDumpBin, [
      `--dbname=${databaseUrl}`,
      "--no-password",
      "--format=plain",
      "--no-owner",
      "--no-acl",
    ]);

    const gzip       = createGzip();
    const outStream  = fs.createWriteStream(filePath);

    pgDump.stdout.pipe(gzip).pipe(outStream);

    pgDump.stderr.on("data", (d: Buffer) => {
      const msg = d.toString();
      if (!msg.includes("WARNING")) {
        console.warn("[PGBACKUP] pg_dump stderr:", msg.trim());
      }
    });

    outStream.on("finish", resolve);
    outStream.on("error", reject);
    pgDump.on("error", reject);
    pgDump.on("close", (code: number) => {
      if (code !== 0) reject(new Error(`pg_dump exited with code ${code}`));
    });
  });

  const stat   = fs.statSync(filePath);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
  console.log(`[PGBACKUP] ✅ ${filename} (${sizeMb} MB)`);

  rotatePostgresBackups();
  return filename;
}

export function listPostgresBackups(): Array<{
  filename: string;
  label: string;
  date: string;
  sizeMb: string;
  createdAt: string;
}> {
  if (!fs.existsSync(POSTGRES_BACKUP_DIR)) return [];

  return fs
    .readdirSync(POSTGRES_BACKUP_DIR)
    .filter((f) => f.endsWith(".sql.gz"))
    .map((f) => {
      const stat  = fs.statSync(path.join(POSTGRES_BACKUP_DIR, f));
      const parts = f.split("-");
      const label = parts[0] ?? "backup";
      return {
        filename:  f,
        label,
        date:      parts.slice(1, 4).join("-"),
        sizeMb:    (stat.size / (1024 * 1024)).toFixed(2),
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getPostgresBackupFilePath(filename: string): string | null {
  // Validate: only allow expected filename pattern, no path traversal
  if (!/^[\w\-]+\.sql\.gz$/.test(filename)) return null;
  const filePath = path.join(POSTGRES_BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  const resolved = fs.realpathSync(filePath);
  if (!resolved.startsWith(path.resolve(UPLOADS_ROOT))) return null;
  return resolved;
}

// ─── Daily backup: run for all active/trial tenants ─────────────────────────

export async function runDailyBackups(): Promise<void> {
  console.log("[BACKUP] Starting daily backup run...");
  try {
    const activeTenants = await db
      .select({ id: tenants.id, name: tenants.name })
      .from(tenants)
      .where(sql`status IN ('active', 'trial', 'expired')`);

    let success = 0;
    let failed = 0;

    for (const t of activeTenants) {
      try {
        const filename = await backupTenant(t.id, "daily");
        console.log(`[BACKUP] ✅ Tenant ${t.id} (${t.name}) → ${filename}`);
        success++;
      } catch (err) {
        console.error(`[BACKUP] ❌ Tenant ${t.id} (${t.name}) failed:`, (err as any).message);
        failed++;
      }
    }

    console.log(`[BACKUP] Daily backup complete: ${success} succeeded, ${failed} failed`);
  } catch (err) {
    console.error("[BACKUP] Daily backup run failed:", err);
  }
}
