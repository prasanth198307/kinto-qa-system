import { db } from "./db";
import { sql } from "drizzle-orm";

export async function expireLoyaltyPoints(): Promise<number> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const expired = await db.execute(sql`
      SELECT id, loyalty_points
      FROM restaurant_customers
      WHERE expiry_date IS NOT NULL
        AND expiry_date < ${today}
        AND loyalty_points > 0
    `);

    let count = 0;
    for (const row of expired.rows as any[]) {
      await db.execute(sql`
        UPDATE restaurant_customers
        SET loyalty_points = 0
        WHERE id = ${row.id}
      `);
      count++;
    }

    if (count > 0) {
      console.log(`[LOYALTY EXPIRY] Expired points for ${count} customers`);
    }
    return count;
  } catch (e: any) {
    console.error("[LOYALTY EXPIRY] Error:", e.message);
    return 0;
  }
}

// Retail POS loyalty: points expire when a customer's last activity (updated_at)
// is older than loyalty_config.expiry_days (0 = never expire)
export async function expireRetailLoyaltyPoints(): Promise<number> {
  try {
    await db.execute(sql`ALTER TABLE loyalty_config ADD COLUMN IF NOT EXISTS expiry_days INT DEFAULT 365`);
    const expired = await db.execute(sql`
      UPDATE loyalty_customers lc
      SET points_balance = 0, updated_at = NOW()
      FROM loyalty_config cfg
      WHERE cfg.tenant_id = lc.tenant_id
        AND COALESCE(cfg.expiry_days, 365) > 0
        AND lc.points_balance > 0
        AND lc.updated_at < NOW() - (COALESCE(cfg.expiry_days, 365) || ' days')::interval
      RETURNING lc.id
    `);
    const count = (expired.rows as any[]).length;
    if (count > 0) {
      console.log(`[LOYALTY EXPIRY] Retail: expired points for ${count} customers`);
    }
    return count;
  } catch (e: any) {
    console.error("[LOYALTY EXPIRY] Retail error:", e.message);
    return 0;
  }
}

export function startLoyaltyExpiryScheduler(): void {
  expireLoyaltyPoints().catch(() => {});
  expireRetailLoyaltyPoints().catch(() => {});
  setInterval(() => {
    expireLoyaltyPoints().catch(() => {});
    expireRetailLoyaltyPoints().catch(() => {});
  }, 24 * 60 * 60 * 1000);
}
