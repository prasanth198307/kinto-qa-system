import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import pkg from 'pg';
const { Client } = pkg;

const scryptAsync = promisify(scrypt);
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function resetAdminPassword() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log("✅ Connected to database");
    
    const newPasswordHash = await hashPassword("admin123");
    console.log("✅ Generated new password hash");
    
    const result = await client.query(
      `UPDATE users SET password = $1 WHERE email = 'admin@kinto.com' RETURNING id, email`,
      [newPasswordHash]
    );
    
    if (result.rowCount === 0) {
      console.log("❌ User admin@kinto.com not found");
    } else {
      console.log(`✅ Password reset for ${result.rows[0].email}`);
      console.log(`   User ID: ${result.rows[0].id}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.end();
  }
}

resetAdminPassword();
