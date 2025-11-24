import { db } from "./db";
import { users } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function createTestUser() {
  const testUsername = "testuser";
  const testEmail = "test@kintotest.com";
  const testPassword = "test123";
  
  try {
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.username, testUsername)).limit(1);
    
    if (existingUser.length > 0) {
      console.log(`✅ Test user '${testUsername}' already exists`);
      // Update password to ensure it's correct
      const hashedPassword = await hashPassword(testPassword);
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.username, testUsername));
      console.log(`✅ Updated test user password`);
    } else {
      // Create new test user
      const hashedPassword = await hashPassword(testPassword);
      await db.insert(users).values({
        username: testUsername,
        email: testEmail,
        password: hashedPassword,
        role: "admin",
        recordStatus: 1,
      });
      console.log(`✅ Created test user: ${testUsername} / ${testPassword}`);
    }
    
    console.log(`\n📋 Test User Credentials:`);
    console.log(`   Username: ${testUsername}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   Email: ${testEmail}`);
    console.log(`   Role: admin\n`);
    
  } catch (error) {
    console.error("❌ Error creating test user:", error);
    throw error;
  }
}

// Run if executed directly
createTestUser()
  .then(() => {
    console.log("✅ Test user setup complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed to create test user:", error);
    process.exit(1);
  });
