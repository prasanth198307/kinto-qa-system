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
import { hashPassword } from "./auth";

export async function seedDemoTenant(): Promise<{ created: boolean; tenantId: number; message: string }> {
  const DEMO_SLUG = "acme-demo";

  // Check if demo tenant already exists
  const [existing] = await db
    .select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .where(eq(tenants.slug, DEMO_SLUG));

  if (existing) {
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
  for (const row of rolesResult as any[]) {
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

  console.log(`[DEMO SEED] ✅ Demo tenant fully seeded! Tenant ID: ${tenantId}`);
  console.log(`[DEMO SEED] Login: slug=acme-demo, username=acme-admin, password=Demo@1234`);

  return {
    created: true,
    tenantId,
    message: `Demo tenant "Acme Precision Parts" created successfully (ID: ${tenantId}). Login: slug=acme-demo | username=acme-admin | password=Demo@1234`,
  };
}
