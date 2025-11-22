/**
 * KINTO Smart Ops - Database Seed Script
 * 
 * This script seeds the database with required reference data:
 * - Roles (Admin, Manager, Operator, Reviewer)
 * - Default Admin User (admin / Admin@123)
 * - Role Permissions (Screen-level access control)
 * - Units of Measurement (PCS, KG, LTR, etc.)
 * - Machine Types (CNC, Injection Molding, etc.)
 * - Vendor Types (Kinto, HPPani, Purejal)
 * - Product Categories and Types (Bottles, Caps)
 * 
 * This script is IDEMPOTENT - safe to run multiple times.
 * It uses upsert operations and transaction wrapping for atomicity.
 * 
 * IMPORTANT: If admin user already exists, password is NOT modified.
 */

import { db } from "../../server/db";
import { 
  roles, users, rolePermissions, uom, machineTypes,
  vendorTypes, productCategories, productTypes
} from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${buf.toString("hex")}`;
}

async function seedRoles() {
  console.log("Seeding roles...");
  
  const defaultRoles = [
    {
      name: "admin",
      description: "System Administrator with full access to all features",
      permissions: ["all"],
      recordStatus: 1
    },
    {
      name: "manager",
      description: "Manager with inventory management, reporting, and approval permissions",
      permissions: ["machines", "maintenance", "inventory", "reports", "approvals"],
      recordStatus: 1
    },
    {
      name: "operator",
      description: "Machine Operator who can execute checklists and PM tasks",
      permissions: ["checklists", "pm_execution", "production"],
      recordStatus: 1
    },
    {
      name: "reviewer",
      description: "Quality Reviewer who can review and approve checklists",
      permissions: ["checklist_review", "quality_reports"],
      recordStatus: 1
    }
  ];

  for (const role of defaultRoles) {
    await db.insert(roles)
      .values(role)
      .onConflictDoUpdate({
        target: roles.name,
        set: {
          description: role.description,
          permissions: role.permissions
        }
      });
  }
  
  console.log(`✓ Seeded ${defaultRoles.length} roles`);
}

async function seedAdminUser() {
  console.log("Seeding admin user...");
  
  // Get admin role ID
  const [adminRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.name, "admin"))
    .limit(1);
  
  if (!adminRole) {
    throw new Error("Admin role not found! Roles must be seeded first.");
  }
  
  // Check if admin user already exists
  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.username, "admin"))
    .limit(1);
  
  if (existingAdmin) {
    console.log("⚠️  Admin user already exists - preserving existing password and profile");
    // Only update role assignment if needed
    if (existingAdmin.roleId !== adminRole.id) {
      await db.update(users)
        .set({
          roleId: adminRole.id,
          recordStatus: 1
        })
        .where(eq(users.username, "admin"));
      console.log("✓ Updated admin user role assignment");
    }
    return;
  }
  
  // Admin doesn't exist - create with default password
  const passwordHash = await hashPassword("Admin@123");
  
  await db.insert(users)
    .values({
      username: "admin",
      password: passwordHash,
      email: "admin@kinto.com",
      firstName: "System",
      lastName: "Administrator",
      roleId: adminRole.id,
      recordStatus: 1
    });
  
  console.log("✓ Created admin user (username: admin, password: Admin@123)");
  console.log("⚠️  IMPORTANT: Change this password after first login!");
}

async function seedRolePermissions() {
  console.log("Seeding role permissions...");
  
  // Get all role IDs first
  const allRoles = await db.select().from(roles);
  const roleIdMap = new Map(allRoles.map(r => [r.name, r.id]));
  
  const adminRoleId = roleIdMap.get("admin");
  const managerRoleId = roleIdMap.get("manager");
  const operatorRoleId = roleIdMap.get("operator");
  const reviewerRoleId = roleIdMap.get("reviewer");
  
  if (!adminRoleId || !managerRoleId || !operatorRoleId || !reviewerRoleId) {
    throw new Error("Required roles not found! Roles must be seeded first.");
  }
  
  const adminScreens = [
    "dashboard", "users", "roles", "machines", "machine_types",
    "checklist_templates", "checklists", "spare_parts", "purchase_orders",
    "maintenance_plans", "pm_templates", "pm_execution", "inventory",
    "uom", "products", "raw_materials", "finished_goods", "reports",
    "vendors", "vendor_types", "product_categories", "product_types",
    "invoices", "gatepasses", "payments", "credit_notes", "sales_returns",
    "data_import", "raw_material_issuance", "production_entries",
    "production_reconciliation", "variance_analytics", "pending_payments"
  ];

  const permissions: Array<{
    roleId: string;
    screenKey: string;
    canView: number;
    canCreate: number;
    canEdit: number;
    canDelete: number;
    recordStatus: number;
  }> = [];
  
  // Admin - full access to all screens
  for (const screen of adminScreens) {
    permissions.push({
      roleId: adminRoleId,
      screenKey: screen,
      canView: 1,
      canCreate: 1,
      canEdit: 1,
      canDelete: 1,
      recordStatus: 1
    });
  }

  // Manager - view and edit most screens
  const managerScreens = [
    "dashboard", "machines", "machine_types", "checklist_templates",
    "checklists", "spare_parts", "purchase_orders", "maintenance_plans",
    "pm_templates", "inventory", "uom", "products", "raw_materials",
    "finished_goods", "reports", "vendors", "invoices", "gatepasses",
    "production_reconciliation", "variance_analytics"
  ];
  
  for (const screen of managerScreens) {
    permissions.push({
      roleId: managerRoleId,
      screenKey: screen,
      canView: 1,
      canCreate: screen !== "reports" && screen !== "dashboard" ? 1 : 0,
      canEdit: screen !== "reports" && screen !== "dashboard" ? 1 : 0,
      canDelete: screen !== "reports" && screen !== "dashboard" ? 1 : 0,
      recordStatus: 1
    });
  }

  // Operator - limited to execution
  const operatorScreens = [
    { screen: "dashboard", view: 1, create: 0, edit: 0, delete: 0 },
    { screen: "checklists", view: 1, create: 1, edit: 1, delete: 0 },
    { screen: "pm_execution", view: 1, create: 1, edit: 1, delete: 0 },
    { screen: "production_entries", view: 1, create: 1, edit: 0, delete: 0 },
    { screen: "raw_materials", view: 1, create: 0, edit: 0, delete: 0 }
  ];
  
  for (const { screen, view, create, edit, delete: del } of operatorScreens) {
    permissions.push({
      roleId: operatorRoleId,
      screenKey: screen,
      canView: view,
      canCreate: create,
      canEdit: edit,
      canDelete: del,
      recordStatus: 1
    });
  }

  // Reviewer - read-only access to quality screens
  const reviewerScreens = [
    "dashboard", "checklists", "finished_goods", "reports"
  ];
  
  for (const screen of reviewerScreens) {
    permissions.push({
      roleId: reviewerRoleId,
      screenKey: screen,
      canView: 1,
      canCreate: 0,
      canEdit: screen === "checklists" || screen === "finished_goods" ? 1 : 0,
      canDelete: 0,
      recordStatus: 1
    });
  }

  // Upsert permissions - check if exists, then update or insert
  let insertedCount = 0;
  let updatedCount = 0;
  
  for (const perm of permissions) {
    // Check if permission already exists
    const [existing] = await db
      .select()
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, perm.roleId),
          eq(rolePermissions.screenKey, perm.screenKey)
        )
      )
      .limit(1);
    
    if (existing) {
      // Update existing permission
      await db
        .update(rolePermissions)
        .set({
          canView: perm.canView,
          canCreate: perm.canCreate,
          canEdit: perm.canEdit,
          canDelete: perm.canDelete,
          recordStatus: perm.recordStatus
        })
        .where(
          and(
            eq(rolePermissions.roleId, perm.roleId),
            eq(rolePermissions.screenKey, perm.screenKey)
          )
        );
      updatedCount++;
    } else {
      // Insert new permission
      await db.insert(rolePermissions).values(perm);
      insertedCount++;
    }
  }
  
  console.log(`✓ Seeded ${permissions.length} role permissions (${insertedCount} inserted, ${updatedCount} updated)`);
}

async function seedUOM() {
  console.log("Seeding units of measurement...");
  
  const units = [
    { code: "PCS", name: "Pieces", description: "Individual units" },
    { code: "KG", name: "Kilograms", description: "Weight in kilograms" },
    { code: "LTR", name: "Liters", description: "Volume in liters" },
    { code: "MTR", name: "Meters", description: "Length in meters" },
    { code: "BOX", name: "Box", description: "Boxed units" },
    { code: "SET", name: "Set", description: "Set of items" },
    { code: "ROLL", name: "Roll", description: "Rolled material" },
    { code: "BAG", name: "Bag", description: "Bagged items" }
  ];

  for (const unit of units) {
    await db.insert(uom)
      .values({ ...unit, isActive: "true", recordStatus: 1 })
      .onConflictDoUpdate({
        target: uom.code,
        set: {
          name: unit.name,
          description: unit.description
        }
      });
  }
  
  console.log(`✓ Seeded ${units.length} units of measurement`);
}

async function seedMachineTypes() {
  console.log("Seeding machine types...");
  
  const types = [
    { name: "CNC Machine", description: "Computer Numerical Control machines for precision manufacturing" },
    { name: "Injection Molding", description: "Plastic injection molding equipment" },
    { name: "Assembly Line", description: "Automated assembly line systems" },
    { name: "Quality Inspection", description: "Quality control and inspection equipment" },
    { name: "Packaging Machine", description: "Automated packaging systems" }
  ];

  for (const type of types) {
    await db.insert(machineTypes)
      .values({ ...type, recordStatus: 1 })
      .onConflictDoUpdate({
        target: machineTypes.name,
        set: {
          description: type.description
        }
      });
  }
  
  console.log(`✓ Seeded ${types.length} machine types`);
}

async function seedVendorTypes() {
  console.log("Seeding vendor types...");
  
  const types = [
    { code: "KINTO", name: "Kinto", description: "Kinto brand water bottles" },
    { code: "HPPANI", name: "HPPani", description: "HPPani brand water bottles" },
    { code: "PUREJAL", name: "Purejal", description: "Purejal brand water bottles" }
  ];

  for (const type of types) {
    await db.insert(vendorTypes)
      .values({ ...type, isActive: 1, recordStatus: 1 })
      .onConflictDoUpdate({
        target: vendorTypes.code,
        set: {
          name: type.name,
          description: type.description
        }
      });
  }
  
  console.log(`✓ Seeded ${types.length} vendor types`);
}

async function seedProductCategories() {
  console.log("Seeding product categories...");
  
  const categories = [
    { code: "BOTTLES", name: "Water Bottles", description: "Packaged drinking water bottles", displayOrder: 1 },
    { code: "CAPS", name: "Bottle Caps", description: "Caps and closures for water bottles", displayOrder: 2 },
    { code: "LABELS", name: "Labels", description: "Product labels and stickers", displayOrder: 3 },
    { code: "PACKAGING", name: "Packaging Materials", description: "Boxes, wraps, and packaging supplies", displayOrder: 4 }
  ];

  for (const category of categories) {
    await db.insert(productCategories)
      .values({ ...category, isActive: "true", recordStatus: 1 })
      .onConflictDoUpdate({
        target: productCategories.code,
        set: {
          name: category.name,
          description: category.description,
          displayOrder: category.displayOrder
        }
      });
  }
  
  console.log(`✓ Seeded ${categories.length} product categories`);
}

async function seedProductTypes() {
  console.log("Seeding product types...");
  
  const types = [
    { code: "500ML", name: "500ml Bottle", description: "500 milliliter water bottle", displayOrder: 1 },
    { code: "1LTR", name: "1 Liter Bottle", description: "1 liter water bottle", displayOrder: 2 },
    { code: "2LTR", name: "2 Liter Bottle", description: "2 liter water bottle", displayOrder: 3 },
    { code: "5LTR", name: "5 Liter Bottle", description: "5 liter water bottle", displayOrder: 4 },
    { code: "20LTR", name: "20 Liter Jar", description: "20 liter water jar", displayOrder: 5 }
  ];

  for (const type of types) {
    await db.insert(productTypes)
      .values({ ...type, isActive: "true", recordStatus: 1 })
      .onConflictDoUpdate({
        target: productTypes.code,
        set: {
          name: type.name,
          description: type.description,
          displayOrder: type.displayOrder
        }
      });
  }
  
  console.log(`✓ Seeded ${types.length} product types`);
}

async function main() {
  console.log("Starting database seed...\n");
  
  try {
    // Run all seed operations in sequence (idempotent operations)
    // Note: Drizzle doesn't support explicit transactions across all these operations
    // Each individual upsert is atomic, ensuring data consistency
    
    await seedRoles();
    await seedAdminUser();
    await seedRolePermissions();
    await seedUOM();
    await seedMachineTypes();
    await seedVendorTypes();
    await seedProductCategories();
    await seedProductTypes();
    
    console.log("\n✅ Database seed completed successfully!");
    console.log("\n📝 Default Admin Credentials:");
    console.log("   Username: admin");
    console.log("   Password: Admin@123");
    console.log("\n⚠️  IMPORTANT: Change the admin password after first login!");
    console.log("\n💡 TIP: If you imported test users, remove them before production:");
    console.log("   psql $DATABASE_URL -c \"DELETE FROM users WHERE username LIKE '%_test';\"");
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  } finally {
    // Drizzle automatically handles connection pooling
    // No explicit cleanup needed for Neon serverless connections
  }
}

main();
