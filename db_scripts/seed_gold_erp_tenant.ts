import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { Pool } from "pg";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Create tenant
    const tenantRes = await client.query(`
      INSERT INTO tenants (name, slug, plan, status, industry, contact_name, contact_phone, billing_email, max_users)
      VALUES ('Shree Jewellers Demo', 'gold-erp-demo', 'enterprise', 'active', 'jewellery',
              'Gold Admin', '9999999999', 'golderp@swacherp.demo', 50)
      ON CONFLICT (slug) DO UPDATE SET plan = 'enterprise', status = 'active'
      RETURNING id, slug
    `);
    const tenant = tenantRes.rows[0];
    console.log("✅ Tenant:", tenant);

    // 2. Enterprise subscription with gold_erp module included
    const MODULES = JSON.stringify([
      "gold_erp","invoicing","purchase_orders","basic_inventory","gatepasses",
      "sales_orders","production","quality_returns","accounting","mis","expenses",
      "documents","whatsapp","maintenance","hr_payroll","crm","api_hub",
      "recurring_invoices","warehouses","projects","fixed_assets","multi_currency"
    ]);
    await client.query(`
      INSERT INTO subscriptions (tenant_id, plan_id, plan_slug, billing_cycle, status,
        started_at, current_period_start, current_period_end, selected_modules, monthly_amount)
      VALUES ($1, 4, 'enterprise', 'monthly', 'active',
        NOW(), NOW(), NOW() + INTERVAL '1 year', $2::jsonb, 0)
      ON CONFLICT (tenant_id) DO UPDATE
        SET plan_id = 4, plan_slug = 'enterprise', status = 'active',
            current_period_end = NOW() + INTERVAL '1 year',
            selected_modules = $2::jsonb
    `, [tenant.id, MODULES]);
    console.log("✅ Subscription (enterprise + gold_erp) created");

    // 3. Create Admin role for this tenant
    const roleRes = await client.query(`
      INSERT INTO roles (name, description, tenant_id)
      VALUES ('Admin', 'Full access administrator', $1)
      ON CONFLICT (name, tenant_id) DO UPDATE SET description = 'Full access administrator'
      RETURNING id
    `, [tenant.id]);
    const roleId = roleRes.rows[0].id;
    console.log("✅ Role ID:", roleId);

    // 4. Hash password
    const hashedPw = await hashPassword("Gold@1234");

    // 5. Create admin user
    const userRes = await client.query(`
      INSERT INTO users (email, first_name, last_name, username, password, role, role_id, tenant_id, record_status)
      VALUES ('admin@golderpodemo.com', 'Gold', 'Admin', 'goldadmin', $1, 'Admin', $2, $3, 1)
      ON CONFLICT (username, tenant_id) DO UPDATE
        SET password = $1, role_id = $2, email = 'admin@golderpodemo.com',
            first_name = 'Gold', last_name = 'Admin'
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
