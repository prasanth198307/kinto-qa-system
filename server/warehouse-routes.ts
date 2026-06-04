import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import multer from "multer";

const router = Router();
const xlsxUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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
    const items = rows.rows.length > 0
      ? await db.execute(sql`SELECT * FROM stock_transfer_items WHERE transfer_id IN (
          SELECT id FROM stock_transfers WHERE tenant_id=${tid} AND record_status=1
        ) AND tenant_id=${tid}`)
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

// ─── POS / Inventory Products list ───────────────────────────────────────────
router.get("/products", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const rows = await db.execute(sql`
      SELECT id, product_name AS name, sku_code AS sku, barcode, category,
             hsn_code, gst_percent AS tax_rate, base_price AS selling_price,
             base_price AS price, mrp, unit_label, sold_by, item_type,
             reorder_point, reorder_qty, minimum_stock_level
      FROM products
      WHERE tenant_id=${tid} AND record_status=1 AND is_active='true'
      ORDER BY product_name`);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === '42P01') return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

// ─── Bulk Import — template download ─────────────────────────────────────────
router.get("/bulk-import/template", requireAuth, (_req, res) => {
  const headers = [
    "Barcode/EAN", "Product Name*", "SKU Code", "Category", "HSN Code*",
    "GST %*", "MRP (₹)*", "Purchase Rate (₹)", "Selling Price (₹)*",
    "UOM*", "Sold By (unit/weight)", "Reorder Level", "Item Type (goods/service)",
  ];
  const sample = [
    "8901030984817", "Aashirvaad Atta 5kg", "ATT-5K", "Staples", "19021090",
    "5", "280", "195", "265", "pcs", "unit", "5", "goods",
  ];
  const csv = [headers.join(","), sample.join(",")].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="product_import_template.csv"');
  res.send(csv);
});

// ─── Bulk Import — preview / validate ────────────────────────────────────────
router.post("/bulk-import/preview", requireAuth, xlsxUpload.single("file"), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const XLSX = await import("xlsx");
    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const valid: any[] = [];
    const errors: Array<{ row: number; field: string; message: string; item: string }> = [];

    for (let i = 0; i < rawRows.length; i++) {
      const r = rawRows[i];
      const rowNum = i + 2;
      const name  = String(r["Product Name*"] || r["Product Name"] || "").trim();
      const hsn   = String(r["HSN Code*"]     || r["HSN Code"]     || "").trim();
      const gst   = parseFloat(String(r["GST %*"] || r["GST %"] || "0"));
      const mrpRaw = parseFloat(String(r["MRP (₹)*"] || r["MRP (₹)"] || ""));
      const price  = parseFloat(String(r["Selling Price (₹)*"] || r["Selling Price (₹)"] || ""));
      const uom    = String(r["UOM*"] || r["UOM"] || "pcs").trim() || "pcs";

      const rowErrors: string[] = [];
      if (!name)                          rowErrors.push("Product Name is required");
      if (!hsn)                           rowErrors.push("HSN Code is required for GST billing");
      if (isNaN(gst))                     rowErrors.push("GST % must be a number (0/5/12/18)");
      if (isNaN(mrpRaw) || mrpRaw <= 0)  rowErrors.push("MRP must be a positive number");
      if (isNaN(price) || price <= 0)    rowErrors.push("Selling Price must be a positive number");
      if (!isNaN(mrpRaw) && !isNaN(price) && price > mrpRaw)
                                          rowErrors.push("Selling Price cannot exceed MRP");

      if (rowErrors.length) {
        rowErrors.forEach(msg =>
          errors.push({ row: rowNum, field: msg.split(" ")[0], message: msg, item: name || `Row ${rowNum}` })
        );
      } else {
        valid.push({
          barcode:       String(r["Barcode/EAN"] || "").trim() || null,
          product_name:  name,
          sku_code:      String(r["SKU Code"] || "").trim() || null,
          category:      String(r["Category"] || "").trim() || null,
          hsn_code:      hsn,
          gst_percent:   gst,
          mrp:           Math.round(mrpRaw * 100),   // stored as paise
          standard_cost: parseFloat(String(r["Purchase Rate (₹)"] || "0")) || 0,
          base_price:    price,
          unit_label:    uom,
          sold_by:       String(r["Sold By (unit/weight)"] || "unit").toLowerCase() === "weight" ? "weight" : "unit",
          reorder_point: parseFloat(String(r["Reorder Level"] || "0")) || 0,
          item_type:     String(r["Item Type (goods/service)"] || "goods").toLowerCase() === "service" ? "service" : "goods",
        });
      }
    }

    res.json({ total: rawRows.length, validCount: valid.length, errorCount: errors.length, valid, errors });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Bulk Import — confirm insert ─────────────────────────────────────────────
router.post("/bulk-import/confirm", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { rows } = req.body as { rows: any[] };
    if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ error: "No rows to import" });

    let inserted = 0, updated = 0;
    for (const r of rows) {
      if (r.barcode) {
        const existing = await db.execute(sql`
          SELECT id FROM products WHERE tenant_id=${tid} AND barcode=${r.barcode} AND record_status=1 LIMIT 1`);
        if (existing.rows.length) {
          await db.execute(sql`
            UPDATE products SET
              product_name=${r.product_name}, sku_code=${r.sku_code||null},
              category=${r.category||null}, hsn_code=${r.hsn_code||null},
              gst_percent=${r.gst_percent||0}, mrp=${r.mrp||null},
              standard_cost=${r.standard_cost||0}, base_price=${r.base_price||0},
              unit_label=${r.unit_label||'pcs'}, sold_by=${r.sold_by||'unit'},
              reorder_point=${r.reorder_point||0}, item_type=${r.item_type||'goods'},
              updated_at=NOW()
            WHERE tenant_id=${tid} AND barcode=${r.barcode} AND record_status=1`);
          updated++;
          continue;
        }
      }
      // Generate a unique product_code
      const code = r.sku_code
        ? `${r.sku_code}-${tid}`
        : `PRD-${tid}-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      await db.execute(sql`
        INSERT INTO products
          (tenant_id, product_code, product_name, sku_code, barcode, category,
           hsn_code, gst_percent, mrp, standard_cost, base_price,
           unit_label, sold_by, reorder_point, item_type, record_status, is_active)
        VALUES
          (${tid}, ${code}, ${r.product_name}, ${r.sku_code||null}, ${r.barcode||null},
           ${r.category||null}, ${r.hsn_code||null}, ${r.gst_percent||0},
           ${r.mrp||null}, ${r.standard_cost||0}, ${r.base_price||0},
           ${r.unit_label||'pcs'}, ${r.sold_by||'unit'}, ${r.reorder_point||0},
           ${r.item_type||'goods'}, 1, 'true')
        ON CONFLICT (product_code) DO UPDATE SET
          product_name=EXCLUDED.product_name, updated_at=NOW()`);
      inserted++;
    }
    res.json({ success: true, inserted, updated, total: inserted + updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
