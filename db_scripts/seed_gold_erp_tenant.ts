import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { Pool } from "pg";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

// Accept connection string from CLI arg, DATABASE_URL env var,
// or fall back to individual PG* env vars (common on OCI / bare Linux).
const connArg = process.argv[2]; // optional: pass full URL as first argument

function readDotEnv(): string | undefined {
  // Try to load DATABASE_URL from the project's .env file as a last resort
  try {
    const fs = require("fs");
    const path = require("path");
    const envPath = path.resolve(__dirname, "../.env");
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf8").split("\n");
      for (const line of lines) {
        const m = line.match(/^DATABASE_URL\s*=\s*(.+)$/);
        if (m) return m[1].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {}
  return undefined;
}

function buildPoolConfig() {
  if (connArg) {
    console.log("🔗 Using connection string from CLI argument");
    return { connectionString: connArg };
  }
  if (process.env.DATABASE_URL) {
    console.log("🔗 Using DATABASE_URL environment variable");
    return { connectionString: process.env.DATABASE_URL };
  }
  // Try reading from .env file (works when app runs fine but env isn't exported)
  const dotEnvUrl = readDotEnv();
  if (dotEnvUrl) {
    console.log("🔗 Using DATABASE_URL from .env file");
    return { connectionString: dotEnvUrl };
  }
  // Fall back to individual PG* variables — use Unix socket if no host given
  // (matches how psql connects locally without needing a password)
  const { PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = process.env;
  const user     = PGUSER     ?? process.env.USER ?? "postgres";
  const database = PGDATABASE ?? "kinto_qa_db";
  if (!PGHOST || PGHOST === "localhost" || PGHOST === "127.0.0.1") {
    // Use Unix domain socket — same path psql uses — avoids TCP password auth
    const socketDirs = [
      "/var/run/postgresql",
      "/tmp",
      "/var/pgsql_socket",
    ];
    const fs = require("fs");
    const socketDir = socketDirs.find(d => {
      try { return fs.statSync(d).isDirectory(); } catch { return false; }
    }) ?? "/var/run/postgresql";
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
    "  # Simplest — socket (same as psql, no password needed if peer auth):\n" +
    "  npx tsx db_scripts/seed_gold_erp_tenant.ts\n\n" +
    "  # With explicit socket path:\n" +
    "  PGUSER=kinto_admin PGDATABASE=kinto_qa_db \\\n" +
    "    npx tsx db_scripts/seed_gold_erp_tenant.ts\n\n" +
    "  # With full URL (TCP — needs correct password):\n" +
    "  npx tsx db_scripts/seed_gold_erp_tenant.ts 'postgresql://user:pass@host/db'\n"
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
