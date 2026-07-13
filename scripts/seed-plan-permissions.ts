/**
 * One-time runner: create Admin role + seed plan-gated permissions
 * for all 51 QA plan-test tenants (IDs 9101–9151).
 *
 * Usage: npx tsx scripts/seed-plan-permissions.ts
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { seedTenantPermissions } from "../server/seed-permissions";

const TENANT_IDS = Array.from({ length: 51 }, (_, i) => 9101 + i);

async function ensureAdminRole(tenantId: number): Promise<void> {
  // Check if admin role already exists
  const existing = await db.execute(sql`
    SELECT id FROM roles
    WHERE tenant_id = ${tenantId} AND LOWER(name) = 'admin' AND record_status = 1
    LIMIT 1
  `);
  if (existing.rows.length > 0) return;

  // Create the admin role
  await db.execute(sql`
    INSERT INTO roles (name, description, tenant_id, record_status, created_at, updated_at)
    VALUES ('Admin', 'Administrator role — full access per plan', ${tenantId}, 1, NOW(), NOW())
  `);

  // Assign the role to the tenant's admin user
  const user = await db.execute(sql`
    SELECT id FROM users
    WHERE tenant_id = ${tenantId} AND record_status = 1
    LIMIT 1
  `);

  if (user.rows.length > 0) {
    const userId = (user.rows[0] as any).id;
    const role = await db.execute(sql`
      SELECT id FROM roles
      WHERE tenant_id = ${tenantId} AND LOWER(name) = 'admin' AND record_status = 1
      LIMIT 1
    `);
    const roleId = (role.rows[0] as any).id;
    await db.execute(sql`
      UPDATE users SET role_id = ${roleId} WHERE id = ${userId}
    `);
  }
}

async function main() {
  console.log(`Seeding permissions for ${TENANT_IDS.length} plan-test tenants...`);
  let ok = 0;
  let failed = 0;

  for (const tenantId of TENANT_IDS) {
    try {
      await ensureAdminRole(tenantId);
      const result = await seedTenantPermissions(tenantId);
      console.log(`  ✓ tenant ${tenantId} — inserted:${result.inserted} unlocked:${result.unlocked} skipped:${result.skipped}`);
      ok++;
    } catch (err) {
      console.error(`  ✗ tenant ${tenantId} — ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${ok} succeeded, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
