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

export function startLoyaltyExpiryScheduler(): void {
  expireLoyaltyPoints().catch(() => {});
  setInterval(() => {
    expireLoyaltyPoints().catch(() => {});
  }, 24 * 60 * 60 * 1000);
}
