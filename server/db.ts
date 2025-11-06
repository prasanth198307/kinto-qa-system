import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

// Ensure the database URL is set
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Please check your .env file.");
}

// Create a connection pool to PostgreSQL
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Drizzle ORM using the native pg driver
export const db = drizzle(pool, { schema });

// Optional: test the connection
(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to local PostgreSQL successfully");
    client.release();
  } catch (err) {
    console.error("❌ PostgreSQL connection error:", err);
  }
})();