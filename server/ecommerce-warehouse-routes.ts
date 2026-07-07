import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { refreshAmazonTokenOnly, getAmazonTokenStatus } from "./ecommerce-marketplace-service";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
};
const tid = (req: any): number => req.session?.tenantId ?? req.user?.tenantId ?? 1;

async function ensureTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS ec_warehouses (
    id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, name VARCHAR(200) NOT NULL,
    address TEXT, city VARCHAR(100), state VARCHAR(100), pin_code VARCHAR(10),
    contact_name VARCHAR(100), contact_phone VARCHAR(20), is_active BOOL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS ec_warehouse_zones (
    id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, warehouse_id INT NOT NULL,
    zone_name VARCHAR(100), pin_from INT, pin_to INT,
    priority INT DEFAULT 1, courier_partner VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS ec_warehouse_stock (
    id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, warehouse_id INT NOT NULL,
    sku VARCHAR(100) NOT NULL, product_name VARCHAR(300),
    available_qty INT DEFAULT 0, reserved_qty INT DEFAULT 0,
    reorder_level INT DEFAULT 10, last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, warehouse_id, sku)
  )`);
  await db.execute(sql`ALTER TABLE ec_orders ADD COLUMN IF NOT EXISTS warehouse_id INT`);
  await db.execute(sql`ALTER TABLE ec_orders ADD COLUMN IF NOT EXISTS allocation_notes TEXT`);
}

// ── Warehouses ────────────────────────────────────────────────────────────────
router.get("/warehouses", requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const rows = await db.execute(sql`SELECT * FROM ec_warehouses WHERE tenant_id=${tid(req)} ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/warehouses", requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const { name, address, city, state, pin_code, contact_name, contact_phone, is_active } = req.body;
    const rows = await db.execute(sql`INSERT INTO ec_warehouses
      (tenant_id, name, address, city, state, pin_code, contact_name, contact_phone, is_active)
      VALUES (${tid(req)}, ${name}, ${address||null}, ${city||null}, ${state||null}, ${pin_code||null},
              ${contact_name||null}, ${contact_phone||null}, ${is_active ?? true}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/warehouses/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, address, city, state, pin_code, contact_name, contact_phone, is_active } = req.body;
    const rows = await db.execute(sql`UPDATE ec_warehouses SET
      name=${name}, address=${address||null}, city=${city||null}, state=${state||null},
      pin_code=${pin_code||null}, contact_name=${contact_name||null},
      contact_phone=${contact_phone||null}, is_active=${is_active ?? true}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/warehouses/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM ec_warehouses WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Warehouse Zones ───────────────────────────────────────────────────────────
router.get("/warehouse-zones", requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const { warehouse_id } = req.query;
    let q = sql`SELECT z.*, w.name as warehouse_name FROM ec_warehouse_zones z
      LEFT JOIN ec_warehouses w ON w.id=z.warehouse_id WHERE z.tenant_id=${tid(req)}`;
    if (warehouse_id) q = sql`${q} AND z.warehouse_id=${warehouse_id}`;
    const rows = await db.execute(sql`${q} ORDER BY z.priority, z.zone_name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/warehouse-zones", requireAuth, async (req: any, res) => {
  try {
    const { warehouse_id, zone_name, pin_from, pin_to, priority, courier_partner } = req.body;
    const rows = await db.execute(sql`INSERT INTO ec_warehouse_zones
      (tenant_id, warehouse_id, zone_name, pin_from, pin_to, priority, courier_partner)
      VALUES (${tid(req)}, ${warehouse_id}, ${zone_name||null}, ${pin_from||null}, ${pin_to||null},
              ${priority||1}, ${courier_partner||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/warehouse-zones/:id", requireAuth, async (req: any, res) => {
  try {
    const { zone_name, pin_from, pin_to, priority, courier_partner } = req.body;
    const rows = await db.execute(sql`UPDATE ec_warehouse_zones SET
      zone_name=${zone_name||null}, pin_from=${pin_from||null}, pin_to=${pin_to||null},
      priority=${priority||1}, courier_partner=${courier_partner||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/warehouse-zones/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM ec_warehouse_zones WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Warehouse Stock ───────────────────────────────────────────────────────────
router.get("/warehouse-stock", requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const { warehouse_id, sku } = req.query;
    let q = sql`SELECT s.*, w.name as warehouse_name FROM ec_warehouse_stock s
      LEFT JOIN ec_warehouses w ON w.id=s.warehouse_id WHERE s.tenant_id=${tid(req)}`;
    if (warehouse_id) q = sql`${q} AND s.warehouse_id=${warehouse_id}`;
    if (sku) q = sql`${q} AND s.sku ILIKE ${'%' + sku + '%'}`;
    const rows = await db.execute(sql`${q} ORDER BY s.sku`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/warehouse-stock", requireAuth, async (req: any, res) => {
  try {
    const { warehouse_id, sku, product_name, available_qty, reserved_qty, reorder_level } = req.body;
    const rows = await db.execute(sql`INSERT INTO ec_warehouse_stock
      (tenant_id, warehouse_id, sku, product_name, available_qty, reserved_qty, reorder_level, last_updated)
      VALUES (${tid(req)}, ${warehouse_id}, ${sku}, ${product_name||null}, ${available_qty||0},
              ${reserved_qty||0}, ${reorder_level||10}, NOW())
      ON CONFLICT (tenant_id, warehouse_id, sku) DO UPDATE SET
        product_name=EXCLUDED.product_name, available_qty=EXCLUDED.available_qty,
        reserved_qty=EXCLUDED.reserved_qty, reorder_level=EXCLUDED.reorder_level,
        last_updated=NOW()
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/warehouse-stock/:id", requireAuth, async (req: any, res) => {
  try {
    const { available_qty, reserved_qty, reorder_level } = req.body;
    const rows = await db.execute(sql`UPDATE ec_warehouse_stock SET
      available_qty=${available_qty ?? 0}, reserved_qty=${reserved_qty ?? 0},
      reorder_level=${reorder_level ?? 10}, last_updated=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/warehouse-stock/alerts", requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const rows = await db.execute(sql`SELECT s.*, w.name as warehouse_name FROM ec_warehouse_stock s
      LEFT JOIN ec_warehouses w ON w.id=s.warehouse_id
      WHERE s.tenant_id=${tid(req)} AND s.available_qty <= s.reorder_level
      ORDER BY s.available_qty ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Fulfillment Routing ───────────────────────────────────────────────────────
router.get("/fulfillment/suggest", requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const { pin_code, sku } = req.query as { pin_code: string; sku: string };
    if (!pin_code || !sku) return res.status(400).json({ error: "pin_code and sku required" });
    const pinNum = parseInt(pin_code);

    // Get all warehouses with stock for this SKU
    const stockRows = await db.execute(sql`SELECT s.*, w.name, w.city, w.pin_code as wh_pin
      FROM ec_warehouse_stock s
      LEFT JOIN ec_warehouses w ON w.id=s.warehouse_id
      WHERE s.tenant_id=${tid(req)} AND s.sku=${sku} AND s.available_qty > 0 AND w.is_active=true`);

    // Get zones that cover the delivery pin code
    const zoneRows = await db.execute(sql`SELECT * FROM ec_warehouse_zones
      WHERE tenant_id=${tid(req)} AND pin_from <= ${pinNum} AND pin_to >= ${pinNum}
      ORDER BY priority`);
    const servedWarehouseIds = new Set((zoneRows.rows as any[]).map(z => z.warehouse_id));

    const suggestions = (stockRows.rows as any[]).map(s => ({
      warehouse_id: s.warehouse_id,
      name: s.name,
      city: s.city,
      available_qty: s.available_qty,
      serves_zone: servedWarehouseIds.has(s.warehouse_id),
      courier_partner: (zoneRows.rows as any[]).find(z => z.warehouse_id === s.warehouse_id)?.courier_partner ?? null,
      priority: (zoneRows.rows as any[]).find(z => z.warehouse_id === s.warehouse_id)?.priority ?? 99,
    })).sort((a, b) => (b.serves_zone ? 1 : 0) - (a.serves_zone ? 1 : 0) || a.priority - b.priority || b.available_qty - a.available_qty);

    res.json({ pin_code, sku, suggestions });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/orders/:id/allocate-warehouse", requireAuth, async (req: any, res) => {
  try {
    await ensureTables();
    const t = tid(req);
    const orderRows = await db.execute(sql`SELECT * FROM ec_orders WHERE id=${req.params.id} AND tenant_id=${t}`);
    const order = orderRows.rows[0] as any;
    if (!order) return res.status(404).json({ error: "Order not found" });

    const pinMatch = (order.shipping_address ?? "").match(/\b(\d{6})\b/);
    const pinNum = pinMatch ? parseInt(pinMatch[1]) : 0;

    const itemRows = await db.execute(sql`SELECT * FROM ec_order_items WHERE order_id=${req.params.id}`);
    const items = itemRows.rows as any[];

    // For each SKU find best warehouse
    let bestWarehouseId: number | null = null;
    let bestWarehouse: any = null;
    let courierPartner: string | null = null;

    for (const item of items) {
      const stockRows = await db.execute(sql`SELECT s.*, w.name, w.city FROM ec_warehouse_stock s
        LEFT JOIN ec_warehouses w ON w.id=s.warehouse_id
        WHERE s.tenant_id=${t} AND s.sku=${item.sku} AND s.available_qty >= ${item.quantity ?? 1} AND w.is_active=true`);
      if (!stockRows.rows.length) continue;

      // Check zone match
      const zoneRows = await db.execute(sql`SELECT * FROM ec_warehouse_zones
        WHERE tenant_id=${t} AND pin_from <= ${pinNum} AND pin_to >= ${pinNum} ORDER BY priority`);
      const zoneWh = (zoneRows.rows as any[]).find(z => stockRows.rows.find((s: any) => s.warehouse_id === z.warehouse_id));
      const picked = zoneWh ? stockRows.rows.find((s: any) => s.warehouse_id === zoneWh.warehouse_id) : stockRows.rows[0];

      if (picked && !bestWarehouseId) {
        bestWarehouseId = (picked as any).warehouse_id;
        bestWarehouse = picked;
        courierPartner = zoneWh?.courier_partner ?? null;
      }

      // Reserve stock
      if (bestWarehouseId) {
        await db.execute(sql`UPDATE ec_warehouse_stock SET
          reserved_qty = reserved_qty + ${item.quantity ?? 1}, last_updated=NOW()
          WHERE warehouse_id=${bestWarehouseId} AND sku=${item.sku} AND tenant_id=${t}`);
      }
    }

    if (!bestWarehouseId) return res.status(422).json({ error: "No warehouse has sufficient stock for all items" });

    const notes = `Auto-allocated to warehouse ${bestWarehouseId} by pin code ${pinNum} routing`;
    await db.execute(sql`UPDATE ec_orders SET warehouse_id=${bestWarehouseId}, allocation_notes=${notes} WHERE id=${req.params.id} AND tenant_id=${t}`);

    res.json({ warehouse: bestWarehouse, allocated_items: items.length, courier_partner: courierPartner, allocation_notes: notes });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Amazon token management ───────────────────────────────────────────────────
router.get("/amazon/token-status", requireAuth, async (req: any, res) => {
  try {
    const status = await getAmazonTokenStatus(tid(req));
    res.json(status);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/amazon/refresh-token", requireAuth, async (req: any, res) => {
  try {
    const result = await refreshAmazonTokenOnly(tid(req));
    res.json({ success: true, expires_at: result.expires_at, expires_in_minutes: Math.round((result.expires_at - Date.now()) / 60000) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
