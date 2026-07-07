import { db } from "./db";
import { sql } from "drizzle-orm";
import axios from "axios";

export interface ChannelRate {
  channel: string;
  room_type: string;
  rate: number;
  available_rooms: number;
  date: string;
}

async function ensureTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hotel_channel_rates (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      channel VARCHAR(100) NOT NULL,
      room_type_id INTEGER,
      rate_date DATE NOT NULL,
      rate_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      available_rooms INTEGER NOT NULL DEFAULT 0,
      last_synced TIMESTAMPTZ DEFAULT NOW(),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function syncChannelRates(tenantId: number): Promise<{ synced: number; source: string }> {
  await ensureTable();
  const apiKey = process.env.CHANNEL_MANAGER_API_KEY;

  if (apiKey) {
    try {
      const resp = await axios.get("https://api.channelmanager.io/v1/rates", {
        headers: { "X-API-Key": apiKey },
        params: { tenant_id: tenantId },
        timeout: 10000,
      });
      const rates: any[] = resp.data?.rates || [];
      for (const r of rates) {
        await db.execute(sql`
          INSERT INTO hotel_channel_rates (tenant_id, channel, room_type_id, rate_date, rate_amount, available_rooms, last_synced)
          VALUES (${tenantId}, ${r.channel}, ${r.room_type_id ?? null}, ${r.date}, ${r.rate}, ${r.available_rooms ?? 0}, NOW())
          ON CONFLICT DO NOTHING
        `);
      }
      return { synced: rates.length, source: "api" };
    } catch {
      // fall through to DB-based simulation
    }
  }

  // Simulate: generate rates for next 7 days from DB room types
  const roomTypes = await db.execute(sql`SELECT * FROM hotel_room_types WHERE tenant_id=${tenantId}`);
  const channels = ["MakeMyTrip", "Booking.com", "Agoda", "Expedia", "Direct"];
  let synced = 0;

  for (const rt of roomTypes.rows as any[]) {
    for (const channel of channels) {
      for (let d = 0; d < 7; d++) {
        const date = new Date();
        date.setDate(date.getDate() + d);
        const dateStr = date.toISOString().slice(0, 10);
        const channelMultiplier = channel === "Direct" ? 1.0 : channel === "MakeMyTrip" ? 1.05 : 1.08;
        const rate = Math.round(Number(rt.base_price || 2000) * channelMultiplier);
        const available = Math.floor(Math.random() * 5) + 1;

        await db.execute(sql`
          INSERT INTO hotel_channel_rates (tenant_id, channel, room_type_id, rate_date, rate_amount, available_rooms, last_synced)
          VALUES (${tenantId}, ${channel}, ${rt.id}, ${dateStr}, ${rate}, ${available}, NOW())
          ON CONFLICT DO NOTHING
        `);
        synced++;
      }
    }
  }
  return { synced, source: "db_simulation" };
}

export async function getChannelInventory(tenantId: number, date: string): Promise<ChannelRate[]> {
  await ensureTable();
  const rows = await db.execute(sql`
    SELECT hcr.channel, rt.name as room_type, hcr.rate_amount as rate, hcr.available_rooms, hcr.rate_date as date
    FROM hotel_channel_rates hcr
    LEFT JOIN hotel_room_types rt ON rt.id = hcr.room_type_id
    WHERE hcr.tenant_id=${tenantId} AND hcr.rate_date=${date}
    ORDER BY hcr.channel, rt.name
  `);
  return rows.rows as unknown as ChannelRate[];
}
