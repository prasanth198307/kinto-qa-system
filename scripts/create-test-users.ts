import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "../server/db";
import { users, roles } from "../shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function createTestUsers() {
  console.log("Creating test users...");

  // Get role IDs
  const adminRole = await db.select().from(roles).where(eq(roles.name, "admin")).limit(1);
  const managerRole = await db.select().from(roles).where(eq(roles.name, "manager")).limit(1);
  const operatorRole = await db.select().from(roles).where(eq(roles.name, "operator")).limit(1);
  const reviewerRole = await db.select().from(roles).where(eq(roles.name, "reviewer")).limit(1);

  if (!adminRole[0] || !managerRole[0] || !operatorRole[0] || !reviewerRole[0]) {
    console.error("Required roles not found in database");
    return;
  }

  const testUsers = [
    {
      username: "admin_test",
      email: "admin_test@kintotest.com",
      password: await hashPassword("Admin@123"),
      mobileNumber: "9876543201",
      firstName: "Admin",
      lastName: "Test",
      roleId: adminRole[0].id,
    },
    {
      username: "manager_test",
      email: "manager_test@kintotest.com",
      password: await hashPassword("Manager@123"),
      mobileNumber: "9876543202",
      firstName: "Manager",
      lastName: "Test",
      roleId: managerRole[0].id,
    },
    {
      username: "operator_test",
      email: "operator_test@kintotest.com",
      password: await hashPassword("Operator@123"),
      mobileNumber: "9876543203",
      firstName: "Operator",
      lastName: "Test",
      roleId: operatorRole[0].id,
    },
    {
      username: "reviewer_test",
      email: "reviewer_test@kintotest.com",
      password: await hashPassword("Reviewer@123"),
      mobileNumber: "9876543204",
      firstName: "Reviewer",
      lastName: "Test",
      roleId: reviewerRole[0].id,
    },
  ];

  for (const user of testUsers) {
    try {
      // Check if user already exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.username, user.username))
        .limit(1);

      if (existing.length > 0) {
        console.log(`User ${user.username} already exists, skipping...`);
        continue;
      }

      await db.insert(users).values(user);
      console.log(`✓ Created user: ${user.username} (${user.email})`);
    } catch (error) {
      console.error(`Failed to create ${user.username}:`, error);
    }
  }

  console.log("\nTest users created successfully!");
  console.log("\nCredentials:");
  console.log("  admin_test / Admin@123");
  console.log("  manager_test / Manager@123");
  console.log("  operator_test / Operator@123");
  console.log("  reviewer_test / Reviewer@123");
}

createTestUsers().catch(console.error).finally(() => process.exit(0));
