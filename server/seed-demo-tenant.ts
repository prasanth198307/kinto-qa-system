/**
 * Demo tenant seed — creates "Acme Precision Parts" with realistic sample data
 * for sales demonstrations of Kinto Smart Ops.
 *
 * Idempotent: checks if demo tenant already exists before creating.
 */
import { db } from "./db";
import { tenants, users, vendors, rawMaterials, products } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { seedNewTenant } from "./seed-tenant";
import { ALL_SCREEN_KEYS as REGISTRY_SCREEN_KEYS } from "@shared/screen-registry";
import { hashPassword } from "./auth";

/** Grants full admin permissions for every ERP screen to the demo admin role. Idempotent. */
async function ensureDemoPermissions(tenantId: number, adminRoleId: string): Promise<void> {
  // Sourced from shared/screen-registry.ts — the single source of truth.
  for (const key of REGISTRY_SCREEN_KEYS) {
    await db.execute(sql`
      INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete, tenant_id)
      VALUES (${adminRoleId}, ${key}, 1, 1, 1, 1, ${tenantId})
      ON CONFLICT (role_id, screen_key) DO UPDATE
        SET can_view=1, can_create=1, can_edit=1, can_delete=1
    `);
  }
  console.log(`[DEMO SEED] ${ALL_SCREEN_KEYS.length} permissions set for demo admin role`);
}

/** Creates acme-admin and acme-manager for an already-existing demo tenant. */
async function ensureDemoUsers(tenantId: number): Promise<void> {
  const rolesResult = await db.execute(
    sql`SELECT id, name FROM roles WHERE tenant_id = ${tenantId} AND name IN ('admin','manager')`
  );
  const rolesMap: Record<string, string> = {};
  const rolesRows = (rolesResult as any).rows ?? (rolesResult as any) ?? [];
  for (const row of rolesRows) {
    rolesMap[row.name] = String(row.id);
  }

  const adminPwd = await hashPassword("Demo@1234");
  const mgrPwd   = await hashPassword("Demo@1234");

  await db.insert(users).values([
    {
      username: "acme-admin",
      email: "admin@acme-demo.com",
      password: adminPwd,
      firstName: "Rajesh",
      lastName: "Mehta",
      mobileNumber: "9876543210",
      roleId: rolesMap["admin"] ?? null,
      tenantId,
      recordStatus: 1,
    },
    {
      username: "acme-manager",
      email: "manager@acme-demo.com",
      password: mgrPwd,
      firstName: "Priya",
      lastName: "Sharma",
      mobileNumber: "9876543211",
      roleId: rolesMap["manager"] ?? null,
      tenantId,
      recordStatus: 1,
    },
  ]);
  console.log(`[DEMO SEED] Users created for tenant ${tenantId}`);
}

export async function seedDemoTenant(): Promise<{ created: boolean; tenantId: number; message: string }> {
  const DEMO_SLUG = "acme-demo";

  // Check if demo tenant already exists
  const [existing] = await db
    .select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .where(eq(tenants.slug, DEMO_SLUG));

  if (existing) {
    // Ensure users exist (handles partial-seed recovery)
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.tenantId, existing.id));

    console.log(`[DEMO SEED] Tenant ${existing.id} found. User count: ${existingUsers.length}`);

    if (existingUsers.length === 0) {
      console.log(`[DEMO SEED] No users found — running ensureDemoUsers`);
      await ensureDemoUsers(existing.id);
    }

    // Always ensure the admin role has ALL permissions (idempotent upsert)
    const adminRoleRow = await db.execute(
      sql`SELECT id FROM roles WHERE tenant_id = ${existing.id} AND name = 'admin' LIMIT 1`
    );
    const adminRoleRows = (adminRoleRow as any).rows ?? [];
    if (adminRoleRows.length > 0) {
      await ensureDemoPermissions(existing.id, String(adminRoleRows[0].id));
    }

    return {
      created: false,
      tenantId: existing.id,
      message: `Demo tenant "${existing.name}" already exists (ID: ${existing.id})`,
    };
  }

  // ─── 1. Create tenant ─────────────────────────────────────────────────────
  const [tenant] = await db.insert(tenants).values({
    name: "Acme Precision Parts",
    slug: DEMO_SLUG,
    plan: "professional",
    status: "active",
    billingEmail: "admin@acme-demo.com",
    contactName: "Rajesh Mehta",
    contactPhone: "9876543210",
    gstNumber: "27AABCA1234B1Z5",
    address: "Plot 12, MIDC Industrial Area, Pune, Maharashtra 411019",
    primaryColor: "#2563eb",
    maxUsers: 20,
    trialEndsAt: null,
  }).returning();

  const tenantId = tenant.id;
  console.log(`[DEMO SEED] Created tenant: ${tenant.name} (ID: ${tenantId})`);

  // ─── 2. Seed default roles and Chart of Accounts ────────────────────────
  await seedNewTenant(tenantId);
  console.log(`[DEMO SEED] Roles and COA seeded`);

  // ─── 3. Get seeded role IDs ───────────────────────────────────────────────
  const rolesResult = await db.execute(
    sql`SELECT id, name FROM roles WHERE tenant_id = ${tenantId} AND name IN ('admin','manager')`
  );
  const rolesMap: Record<string, string> = {};
  const rolesRows = (rolesResult as any).rows ?? (rolesResult as any) ?? [];
  for (const row of rolesRows) {
    rolesMap[row.name] = row.id;
  }

  // ─── 4. Create users ──────────────────────────────────────────────────────
  const adminPwd = await hashPassword("Demo@1234");
  const mgrPwd = await hashPassword("Demo@1234");

  await db.insert(users).values([
    {
      username: "acme-admin",
      email: "admin@acme-demo.com",
      password: adminPwd,
      firstName: "Rajesh",
      lastName: "Mehta",
      mobileNumber: "9876543210",
      roleId: rolesMap["admin"] ?? null,
      tenantId,
      recordStatus: 1,
    },
    {
      username: "acme-manager",
      email: "manager@acme-demo.com",
      password: mgrPwd,
      firstName: "Priya",
      lastName: "Sharma",
      mobileNumber: "9876543211",
      roleId: rolesMap["manager"] ?? null,
      tenantId,
      recordStatus: 1,
    },
  ]);
  console.log(`[DEMO SEED] Users created`);

  // ─── 5. Create vendors ────────────────────────────────────────────────────
  await db.insert(vendors).values([
    {
      vendorCode: `ACME-V001-T${tenantId}`,
      vendorName: "Mumbai Metal Traders",
      contactPerson: "Suresh Patel",
      mobileNumber: "9988776655",
      email: "contact@mumbaimetal.com",
      gstNumber: "27AAFCM1234A1Z1",
      address: "MIDC Bhosari, Pune, Maharashtra",
      city: "Pune",
      state: "Maharashtra",
      tenantId,
    },
    {
      vendorCode: `ACME-V002-T${tenantId}`,
      vendorName: "Delhi Polymers Ltd",
      contactPerson: "Amit Gupta",
      mobileNumber: "9911223344",
      email: "sales@delhipolymers.com",
      gstNumber: "07AAGCD5678B1Z3",
      address: "Okhla Industrial Estate, New Delhi",
      city: "New Delhi",
      state: "Delhi",
      tenantId,
    },
  ]);
  console.log(`[DEMO SEED] Vendors created`);

  // ─── 6. Create raw materials ──────────────────────────────────────────────
  await db.insert(rawMaterials).values([
    {
      materialCode: `ACME-RM001-T${tenantId}`,
      materialName: "EN8 Steel Rod (25mm dia)",
      baseUnit: "kg",
      currentStock: 850,
      reorderLevel: 200,
      unitCost: "85.00",
      supplier: "Mumbai Metal Traders",
      tenantId,
    },
    {
      materialCode: `ACME-RM002-T${tenantId}`,
      materialName: "Aluminium Alloy Sheet 3mm",
      baseUnit: "kg",
      currentStock: 320,
      reorderLevel: 100,
      unitCost: "220.00",
      supplier: "Mumbai Metal Traders",
      tenantId,
    },
    {
      materialCode: `ACME-RM003-T${tenantId}`,
      materialName: "NBR Rubber Compound",
      baseUnit: "kg",
      currentStock: 145,
      reorderLevel: 50,
      unitCost: "310.00",
      supplier: "Delhi Polymers Ltd",
      tenantId,
    },
  ]);
  console.log(`[DEMO SEED] Raw materials created`);

  // ─── 7. Create products ───────────────────────────────────────────────────
  await db.insert(products).values([
    {
      productCode: `ACME-FG001-T${tenantId}`,
      productName: "Precision Steel Bracket",
      baseUnit: "pcs",
      description: "High-tolerance steel bracket for automotive assembly",
      basePrice: "450.00",
      gstPercent: "18.00",
      hsnCode: "7326",
      tenantId,
    },
    {
      productCode: `ACME-FG002-T${tenantId}`,
      productName: "Aluminium Valve Cap",
      baseUnit: "pcs",
      description: "Precision-machined aluminium valve cap",
      basePrice: "280.00",
      gstPercent: "18.00",
      hsnCode: "8484",
      tenantId,
    },
    {
      productCode: `ACME-FG003-T${tenantId}`,
      productName: "Engine Rubber Gasket",
      baseUnit: "pcs",
      description: "NBR rubber gasket for engine compartment sealing",
      basePrice: "95.00",
      gstPercent: "18.00",
      hsnCode: "4016",
      tenantId,
    },
  ]);
  console.log(`[DEMO SEED] Products created`);

  // Create subscription record for the demo tenant (trial plan)
  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql2 = neon(process.env.DATABASE_URL!);
    const planRows = await sql2`SELECT id FROM subscription_plans WHERE slug = 'trial' LIMIT 1`;
    if (planRows.length > 0) {
      const planId = planRows[0].id;
      const now = new Date().toISOString();
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      await sql2`
        INSERT INTO subscriptions (tenant_id, plan_id, plan_slug, billing_cycle, status, started_at, trial_ends_at)
        VALUES (${tenantId}, ${planId}, 'trial', 'trial', 'trial', ${now}, ${trialEnd})
        ON CONFLICT (tenant_id) DO NOTHING
      `;
      await sql2`
        INSERT INTO billing_events (tenant_id, event_type, from_plan, to_plan, billing_cycle, amount, notes, created_by, created_at)
        VALUES (${tenantId}, 'trial_started', null, 'trial', 'trial', 0, 'Demo tenant trial started', 'system', ${now})
      `;
      console.log(`[DEMO SEED] Subscription record created (trial plan)`);
    }
  } catch (err) {
    console.warn(`[DEMO SEED] Could not create subscription record:`, err);
  }

  // ─── Grant full permissions to admin role ────────────────────────────────
  if (rolesMap["admin"]) {
    await ensureDemoPermissions(tenantId, rolesMap["admin"]);
  }

  console.log(`[DEMO SEED] ✅ Demo tenant fully seeded! Tenant ID: ${tenantId}`);
  console.log(`[DEMO SEED] Login: slug=acme-demo, username=acme-admin, password=Demo@1234`);

  return {
    created: true,
    tenantId,
    message: `Demo tenant "Acme Precision Parts" created successfully (ID: ${tenantId}). Login: slug=acme-demo | username=acme-admin | password=Demo@1234`,
  };
}
