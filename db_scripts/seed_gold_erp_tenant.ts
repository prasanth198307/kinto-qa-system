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

function buildPoolConfig() {
  if (connArg) {
    console.log("🔗 Using connection string from CLI argument");
    return { connectionString: connArg };
  }
  if (process.env.DATABASE_URL) {
    console.log("🔗 Using DATABASE_URL environment variable");
    return { connectionString: process.env.DATABASE_URL };
  }
  // Fall back to individual PG* variables
  const { PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = process.env;
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
    "No database connection found.\n" +
    "Provide one of:\n" +
    "  1. npx tsx db_scripts/seed_gold_erp_tenant.ts 'postgresql://user:pass@host/db'\n" +
    "  2. export DATABASE_URL='postgresql://user:pass@host/db'\n" +
    "  3. export PGHOST=... PGUSER=... PGPASSWORD=... PGDATABASE=..."
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
