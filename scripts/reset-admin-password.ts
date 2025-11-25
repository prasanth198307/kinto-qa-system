/**
 * Reset Admin Password Script
 * 
 * Usage: npx tsx scripts/reset-admin-password.ts [password]
 * Default password: Admin@123
 * 
 * Format: salt:hash (32 char salt + : + 128 char hash = 161 total)
 */

import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import pkg from 'pg';
const { Client } = pkg;

const scryptAsync = promisify(scrypt);
const SALT_LENGTH = 16;  // 16 bytes = 32 hex chars
const KEY_LENGTH = 64;   // 64 bytes = 128 hex chars

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  // Format: SALT:HASH (this is what auth.ts expects)
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function resetAdminPassword() {
  const password = process.argv[2] || "Admin@123";
  const username = process.argv[3] || "admin";
  
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log("✅ Connected to database");
    
    const newPasswordHash = await hashPassword(password);
    console.log(`✅ Generated hash for password: ${password}`);
    console.log(`   Hash length: ${newPasswordHash.length} (expected: 161)`);
    console.log(`   Format: salt:hash`);
    
    const result = await client.query(
      `UPDATE users SET password = $1 WHERE username = $2 RETURNING id, username, email`,
      [newPasswordHash, username]
    );
    
    if (result.rowCount === 0) {
      console.log(`❌ User '${username}' not found`);
    } else {
      console.log(`✅ Password reset for user: ${result.rows[0].username}`);
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   User ID: ${result.rows[0].id}`);
      console.log(`\n   Login with: ${username} / ${password}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.end();
  }
}

resetAdminPassword();
