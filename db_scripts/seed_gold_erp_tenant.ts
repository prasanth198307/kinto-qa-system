import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { readFileSync, existsSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const scryptAsync = promisify(scrypt);
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

// Optional: pass full connection URL as first CLI argument
const connArg = process.argv[2];

function readDotEnv(): string | undefined {
  try {
    const envPath = resolve(__dirname, "../.env");
    if (existsSync(envPath)) {
      for (const line of readFileSync(envPath, "utf8").split("\n")) {
        const m = line.match(/^DATABASE_URL\s*=\s*(.+)$/);
        if (m) return m[1].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {}
  return undefined;
}

function findSocketDir(): string {
  for (const dir of ["/var/run/postgresql", "/tmp", "/var/pgsql_socket"]) {
    try { if (statSync(dir).isDirectory()) return dir; } catch {}
  }
  return "/var/run/postgresql";
}

function localUrlToSocket(url: string): object | null {
  // If the URL points to localhost / 127.0.0.1, switch to Unix socket so that
  // peer auth is used (same as psql) — avoids TCP password auth failures.
  try {
    const u = new URL(url);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      const socketDir = findSocketDir();
      const user     = decodeURIComponent(u.username) || process.env.USER || "postgres";
      const database = (u.pathname ?? "/").replace(/^\//, "") || "postgres";
      console.log(`🔗 localhost detected — switching to Unix socket (${socketDir}) user=${user} db=${database}`);
      return { host: socketDir, user, database };
    }
  } catch {}
  return null;
}

function buildPoolConfig() {
  if (connArg) {
    console.log("🔗 Using connection string from CLI argument");
    const sock = localUrlToSocket(connArg);
    return sock ?? { connectionString: connArg };
  }
  if (process.env.DATABASE_URL) {
    console.log("🔗 Using DATABASE_URL environment variable");
    const sock = localUrlToSocket(process.env.DATABASE_URL);
    return sock ?? { connectionString: process.env.DATABASE_URL };
  }
  const dotEnvUrl = readDotEnv();
  if (dotEnvUrl) {
    console.log("🔗 Using DATABASE_URL from .env file");
    const sock = localUrlToSocket(dotEnvUrl);
    return sock ?? { connectionString: dotEnvUrl };
  }

  // Fall back to PG* vars — prefer Unix socket over TCP so peer auth works
  const { PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = process.env;
  const user     = PGUSER     ?? process.env.USER ?? "postgres";
  const database = PGDATABASE ?? "kinto_qa_db";

  if (!PGHOST || PGHOST === "localhost" || PGHOST === "127.0.0.1") {
    const socketDir = findSocketDir();
    console.log(`🔗 Using Unix socket (${socketDir}) — user=${user} db=${database}`);
    return {
      host:     socketDir,
      user,
      database,
      ...(PGPASSWORD ? { password: PGPASSWORD } : {}),
    };
  }

  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    console.log(`🔗 Using PG* env vars (host=${PGHOST} db=${PGDATABASE} user=${PGUSER})`);
    return {
      host:     PGHOST,
      port:     parseInt(PGPORT ?? "5432", 10),
      user:     PGUSER,
      password: PGPASSWORD,
      database: PGDATABASE,
      ssl:      process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
    };
  }

  throw new Error(
    "\nNo database connection found. Try one of:\n\n" +
    "  # Auto-detect from .env file (simplest):\n" +
    "  npx tsx db_scripts/seed_gold_erp_tenant.ts\n\n" +
    "  # Pass URL directly:\n" +
    "  npx tsx db_scripts/seed_gold_erp_tenant.ts 'postgresql://user:pass@host/db'\n\n" +
    "  # Via env vars (Unix socket, no password needed):\n" +
    "  PGUSER=kinto_admin PGDATABASE=kinto_qa_db npx tsx db_scripts/seed_gold_erp_tenant.ts\n"
  );
}

const pool = new Pool(buildPoolConfig());

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Resolve gold_erp_plan ID dynamically
    const planRes = await client.query(
      `SELECT id FROM subscription_plans WHERE slug = 'gold_erp_plan'`
    );
    if (planRes.rows.length === 0) {
      throw new Error("gold_erp_plan not found — run 2026-05-07_seed_gold_erp_tenant_oci.sql first");
    }
    const planId = planRes.rows[0].id;
    console.log("✅ Plan ID (gold_erp_plan):", planId);

    // 2. Resolve tenant ID dynamically
    const tenantRes = await client.query(
      `SELECT id, slug FROM tenants WHERE slug = 'gold-erp-demo'`
    );
    if (tenantRes.rows.length === 0) {
      throw new Error("Tenant gold-erp-demo not found — run 2026-05-07_seed_gold_erp_tenant_oci.sql first");
    }
    const tenant = tenantRes.rows[0];
    console.log("✅ Tenant:", tenant);

    // 3. Resolve Admin role ID dynamically
    const roleRes = await client.query(
      `SELECT id FROM roles WHERE name = 'Admin' AND tenant_id = $1`,
      [tenant.id]
    );
    if (roleRes.rows.length === 0) {
      throw new Error("Admin role not found — run 2026-05-07_seed_gold_erp_tenant_oci.sql first");
    }
    const roleId = roleRes.rows[0].id;
    console.log("✅ Role ID:", roleId);

    // 4. Hash password
    const hashedPw = await hashPassword("Gold@1234");

    // 5. Create / update admin user
    const userRes = await client.query(`
      INSERT INTO users (email, first_name, last_name, username, password, role, role_id, tenant_id, record_status)
      VALUES ('admin@golderpodemo.com', 'Gold', 'Admin', 'goldadmin', $1, 'Admin', $2, $3, 1)
      ON CONFLICT (username, tenant_id) DO UPDATE
        SET password   = $1,
            role_id    = $2,
            email      = 'admin@golderpodemo.com',
            first_name = 'Gold',
            last_name  = 'Admin'
      RETURNING id, username, email
    `, [hashedPw, roleId, tenant.id]);
    const user = userRes.rows[0];
    console.log("✅ User:", user);

    await client.query("COMMIT");

    console.log("\n============================================");
    console.log("  Gold ERP Demo Tenant — Login Credentials");
    console.log("============================================");
    console.log("  Company ID : gold-erp-demo");
    console.log("  Username   : goldadmin");
    console.log("  Password   : Gold@1234");
    console.log("  Tenant DB  :", tenant.id);
    console.log("  Plan ID    :", planId);
    console.log("============================================\n");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
