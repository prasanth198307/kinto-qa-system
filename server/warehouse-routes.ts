import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
};

// ─── Warehouses ───────────────────────────────────────────────────────────────
router.get("/warehouses", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const rows = await db.execute(sql`SELECT * FROM warehouses WHERE tenant_id=${tid} AND record_status=1 ORDER BY is_default DESC, name`);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === '42P01') return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/warehouses", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { name, code, address, city, state, isDefault } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });
    if (isDefault) await db.execute(sql`UPDATE warehouses SET is_default=false WHERE tenant_id=${tid}`);
    const r = await db.execute(sql`INSERT INTO warehouses (tenant_id, name, code, address, city, state, is_default)
      VALUES (${tid}, ${name}, ${code||null}, ${address||null}, ${city||null}, ${state||null}, ${isDefault||false}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/warehouses/:id", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { name, code, address, city, state, isDefault } = req.body;
    if (isDefault) await db.execute(sql`UPDATE warehouses SET is_default=false WHERE tenant_id=${tid}`);
    const r = await db.execute(sql`UPDATE warehouses SET name=${name}, code=${code||null}, address=${address||null},
      city=${city||null}, state=${state||null}, is_default=${isDefault||false}
      WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.delete("/warehouses/:id", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    await db.execute(sql`UPDATE warehouses SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── Warehouse Stock ──────────────────────────────────────────────────────────
router.get("/warehouses/:id/stock", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const rows = await db.execute(sql`
      SELECT ws.*, rm.name AS item_name, rm.unit AS uom
      FROM warehouse_stock ws
      LEFT JOIN raw_materials rm ON rm.id::text = ws.item_id
      WHERE ws.tenant_id=${tid} AND ws.warehouse_id=${req.params.id}
      ORDER BY rm.name`);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === '42P01') return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

// ─── Stock Transfers ──────────────────────────────────────────────────────────
router.get("/stock-transfers", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const rows = await db.execute(sql`
      SELECT st.*, fw.name AS from_warehouse_name, tw.name AS to_warehouse_name
      FROM stock_transfers st
      LEFT JOIN warehouses fw ON fw.id = st.from_warehouse_id
      LEFT JOIN warehouses tw ON tw.id = st.to_warehouse_id
      WHERE st.tenant_id=${tid} AND st.record_status=1
      ORDER BY st.transfer_date DESC`);
    const ids = (rows.rows as any[]).map((r: any) => r.id);
    const items = ids.length > 0
      ? await db.execute(sql`SELECT * FROM stock_transfer_items WHERE transfer_id = ANY(${ids}::int[]) AND tenant_id=${tid}`)
      : { rows: [] };
    res.json({ transfers: rows.rows, items: items.rows });
  } catch (e: any) {
    if (e.code === '42P01') return res.json({ transfers: [], items: [] });
    res.status(500).json({ message: e.message });
  }
});

router.post("/stock-transfers", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { fromWarehouseId, toWarehouseId, transferDate, referenceNo, notes, items } = req.body;
    const r = await db.execute(sql`INSERT INTO stock_transfers
      (tenant_id, from_warehouse_id, to_warehouse_id, transfer_date, reference_no, notes, status)
      VALUES (${tid}, ${fromWarehouseId||null}, ${toWarehouseId}, ${transferDate}, ${referenceNo||null}, ${notes||null}, 'completed')
      RETURNING *`);
    const transferId = (r.rows[0] as any).id;
    for (const it of items || []) {
      await db.execute(sql`INSERT INTO stock_transfer_items (tenant_id, transfer_id, item_id, item_name, quantity, uom)
        VALUES (${tid}, ${transferId}, ${it.itemId}, ${it.itemName||null}, ${it.quantity}, ${it.uom||null})`);
      if (fromWarehouseId) {
        await db.execute(sql`INSERT INTO warehouse_stock (tenant_id, warehouse_id, item_id, quantity)
          VALUES (${tid}, ${fromWarehouseId}, ${it.itemId}, ${-Number(it.quantity)})
          ON CONFLICT (tenant_id, warehouse_id, item_id) DO UPDATE SET quantity = warehouse_stock.quantity - ${it.quantity}`);
      }
      await db.execute(sql`INSERT INTO warehouse_stock (tenant_id, warehouse_id, item_id, quantity)
        VALUES (${tid}, ${toWarehouseId}, ${it.itemId}, ${it.quantity})
        ON CONFLICT (tenant_id, warehouse_id, item_id) DO UPDATE SET quantity = warehouse_stock.quantity + ${it.quantity}`);
    }
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── UOM Conversions ──────────────────────────────────────────────────────────
router.get("/uom-conversions", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const rows = await db.execute(sql`SELECT * FROM uom_conversions WHERE tenant_id=${tid} AND record_status=1 ORDER BY from_uom, to_uom`);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === '42P01') return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/uom-conversions", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { itemId, fromUom, toUom, factor } = req.body;
    const r = await db.execute(sql`INSERT INTO uom_conversions (tenant_id, item_id, from_uom, to_uom, factor)
      VALUES (${tid}, ${itemId||null}, ${fromUom}, ${toUom}, ${factor}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.delete("/uom-conversions/:id", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    await db.execute(sql`UPDATE uom_conversions SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── Serial / Lot Register ────────────────────────────────────────────────────
router.get("/serial-lot-register", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { itemId, status } = req.query;
    let q = `SELECT sl.*, rm.name AS item_name, w.name AS warehouse_name
             FROM serial_lot_register sl
             LEFT JOIN raw_materials rm ON rm.id::text = sl.item_id
             LEFT JOIN warehouses w ON w.id = sl.warehouse_id
             WHERE sl.tenant_id=${tid} AND sl.record_status=1`;
    if (itemId)  q += ` AND sl.item_id='${itemId}'`;
    if (status)  q += ` AND sl.status='${status}'`;
    q += ` ORDER BY sl.created_at DESC LIMIT 500`;
    const rows = await db.execute(sql.raw(q));
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === '42P01') return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/serial-lot-register", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { itemId, serialNumber, lotNumber, batchNumber, manufacturedDate, expiryDate, quantity, warehouseId, sourceType, sourceId } = req.body;
    const r = await db.execute(sql`INSERT INTO serial_lot_register
      (tenant_id, item_id, serial_number, lot_number, batch_number, manufactured_date, expiry_date, quantity, warehouse_id, source_type, source_id)
      VALUES (${tid}, ${itemId}, ${serialNumber||null}, ${lotNumber||null}, ${batchNumber||null},
              ${manufacturedDate||null}, ${expiryDate||null}, ${quantity||1}, ${warehouseId||null}, ${sourceType||null}, ${sourceId||null})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/serial-lot-register/:id/status", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { status } = req.body;
    await db.execute(sql`UPDATE serial_lot_register SET status=${status} WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
