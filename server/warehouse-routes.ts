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

// ─── Barcode / SKU lookup (used by GRN scan screen) ──────────────────────────
router.get("/products/lookup", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const barcode = String(req.query.barcode || "").trim();
    const sku     = String(req.query.sku     || "").trim();
    if (!barcode && !sku) return res.status(400).json({ error: "barcode or sku required" });
    const rows = await db.execute(sql`
      SELECT id, product_name AS name, sku_code AS sku, barcode, category,
             hsn_code, gst_percent AS tax_rate, base_price AS selling_price,
             mrp, unit_label, sold_by, item_type, product_type, pos_enabled,
             brand, expiry_tracking
      FROM products
      WHERE tenant_id=${tid} AND record_status=1 AND is_active='true'
        AND (
          (${barcode} <> '' AND barcode = ${barcode})
          OR (${sku} <> '' AND (sku_code = ${sku} OR product_code = ${sku}))
        )
      LIMIT 1`);
    if (!rows.rows.length) return res.status(404).json({ error: "Product not found in item master" });
    res.json(rows.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GRN Scan — confirm receipt (adds stock to warehouse_stock) ───────────────
router.post("/grn-scan/confirm", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { items, supplier } = req.body as { items: Array<{ product_id: number; qty: number; unit_label: string }>; supplier?: string };
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "No items provided" });

    // Resolve default warehouse for this tenant
    const whRows = await db.execute(sql`
      SELECT id FROM warehouses WHERE tenant_id=${tid} AND is_default=true AND record_status=1 LIMIT 1`);
    const warehouseId: number | null = whRows.rows.length ? (whRows.rows[0] as any).id : null;

    let received = 0;
    for (const item of items) {
      if (!item.product_id || !item.qty || item.qty <= 0) continue;
      const itemIdStr = String(item.product_id);
      if (warehouseId) {
        const existing = await db.execute(sql`
          SELECT id FROM warehouse_stock WHERE tenant_id=${tid} AND warehouse_id=${warehouseId} AND item_id=${itemIdStr} LIMIT 1`);
        if (existing.rows.length) {
          await db.execute(sql`
            UPDATE warehouse_stock SET quantity = quantity + ${item.qty}
            WHERE tenant_id=${tid} AND warehouse_id=${warehouseId} AND item_id=${itemIdStr}`);
        } else {
          await db.execute(sql`
            INSERT INTO warehouse_stock (tenant_id, warehouse_id, item_id, quantity, reserved)
            VALUES (${tid}, ${warehouseId}, ${itemIdStr}, ${item.qty}, 0)`);
        }
      }
      received++;
    }

    res.json({ success: true, received, supplier: supplier || null, warehouse_id: warehouseId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Bulk Import — template download (mode-aware) ────────────────────────────
router.get("/bulk-import/template", requireAuth, (req: any, res) => {
  const mode = String(req.query.mode || "retail");

  let headers: string[], sample: string[], filename: string;

  if (mode === "raw-materials") {
    headers = [
      "Material Code", "Material Name*", "Description", "Category",
      "UOM*", "Unit Cost (₹)", "Reorder Level (qty)", "Max Stock Level (qty)",
      "Opening Stock (qty)", "Opening Date (YYYY-MM-DD)", "Supplier", "Storage Location",
    ];
    sample = [
      "RM-STEEL-001", "HR Steel Sheet 2mm", "Hot-rolled steel 2mm thickness",
      "Steel", "KG", "85", "500", "5000", "1200", "2026-04-01", "Tata Steel Ltd", "Rack-A3",
    ];
    filename = "raw_materials_import_template.csv";
  } else if (mode === "finished-goods") {
    headers = [
      "Product Code", "Product Name*", "Category", "HSN Code*",
      "GST %*", "Standard Cost (₹)", "Selling Price (₹)*", "UOM*",
      "Item Type (goods/service)", "Reorder Level",
      "Sell at Retail Counter (Y/N)", "Barcode/EAN", "MRP (₹)",
    ];
    sample = [
      "FG-BOTTLE-001", "Kinto 500ml Water Bottle", "Beverages", "22029990",
      "12", "28", "45", "pcs", "goods", "100",
      "Y", "8906072100012", "55",
    ];
    filename = "finished_goods_import_template.csv";
  } else {
    // retail (default)
    headers = [
      "Barcode/EAN", "Product Name*", "SKU Code", "Category", "HSN Code*",
      "GST %*", "MRP (₹)*", "Purchase Rate (₹)", "Selling Price (₹)*",
      "UOM*", "Sold By (unit/weight)", "Reorder Level", "Item Type (goods/service)",
      "Opening Stock (qty)", "Brand", "Expiry Tracking (YES/NO)", "Warehouse",
    ];
    sample = [
      "8901030984817", "Aashirvaad Atta 5kg", "ATT-5K", "Staples", "19021090",
      "5", "280", "195", "265", "pcs", "unit", "5", "goods",
      "120", "ITC", "NO", "Main Godown",
    ];
    filename = "retail_products_import_template.csv";
  }

  const csv = [headers.join(","), sample.join(",")].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

// ─── Bulk Import — preview / validate (mode-aware) ───────────────────────────
router.post("/bulk-import/preview", requireAuth, xlsxUpload.single("file"), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const mode = String(req.body.mode || req.query.mode || "retail");

    const XLSX = await import("xlsx");
    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const valid: any[] = [];
    const errors: Array<{ row: number; field: string; message: string; item: string }> = [];

    for (let i = 0; i < rawRows.length; i++) {
      const r = rawRows[i];
      const rowNum = i + 2;
      const rowErrors: string[] = [];

      if (mode === "raw-materials") {
        const name = String(r["Material Name*"] || r["Material Name"] || "").trim();
        const uom  = String(r["UOM*"] || r["UOM"] || "").trim();
        const cost = parseFloat(String(r["Unit Cost (₹)"] || "0")) || 0;
        if (!name) rowErrors.push("Material Name is required");
        if (!uom)  rowErrors.push("UOM is required");
        if (rowErrors.length) {
          rowErrors.forEach(msg => errors.push({ row: rowNum, field: msg.split(" ")[0], message: msg, item: name || `Row ${rowNum}` }));
        } else {
          valid.push({
            material_code:   String(r["Material Code"] || "").trim() || null,
            material_name:   name,
            description:     String(r["Description"] || "").trim() || null,
            category:        String(r["Category"] || "").trim() || null,
            base_unit:       uom,
            unit_cost:       cost,
            reorder_level:   parseInt(String(r["Reorder Level (qty)"] || "0")) || 0,
            max_stock_level: parseInt(String(r["Max Stock Level (qty)"] || "0")) || 0,
            opening_stock:   parseInt(String(r["Opening Stock (qty)"] || "0")) || 0,
            opening_date:    String(r["Opening Date (YYYY-MM-DD)"] || "").trim() || null,
            supplier:        String(r["Supplier"] || "").trim() || null,
            location:        String(r["Storage Location"] || "").trim() || null,
          });
        }

      } else if (mode === "finished-goods") {
        const name        = String(r["Product Name*"] || r["Product Name"] || "").trim();
        const hsn         = String(r["HSN Code*"]     || r["HSN Code"]     || "").trim();
        const gst         = parseFloat(String(r["GST %*"] || r["GST %"] || "0"));
        const price       = parseFloat(String(r["Selling Price (₹)*"] || r["Selling Price (₹)"] || ""));
        const uom         = String(r["UOM*"] || r["UOM"] || "pcs").trim() || "pcs";
        const sellRetail  = String(r["Sell at Retail Counter (Y/N)"] || "N").trim().toUpperCase() === "Y";
        const mrpRaw      = parseFloat(String(r["MRP (₹)"] || ""));
        const barcode     = String(r["Barcode/EAN"] || "").trim() || null;

        if (!name)                       rowErrors.push("Product Name is required");
        if (!hsn)                        rowErrors.push("HSN Code is required for GST invoicing");
        if (isNaN(gst))                  rowErrors.push("GST % must be a number (0/5/12/18/28)");
        if (isNaN(price) || price <= 0) rowErrors.push("Selling Price must be a positive number");
        // POS-specific validations only when sellRetail = Y
        if (sellRetail) {
          if (isNaN(mrpRaw) || mrpRaw <= 0) rowErrors.push("MRP is required when Sell at Retail Counter = Y");
          if (!isNaN(mrpRaw) && !isNaN(price) && price > mrpRaw) rowErrors.push("Selling Price cannot exceed MRP");
        }
        if (rowErrors.length) {
          rowErrors.forEach(msg => errors.push({ row: rowNum, field: msg.split(" ")[0], message: msg, item: name || `Row ${rowNum}` }));
        } else {
          valid.push({
            product_code:  String(r["Product Code"] || "").trim() || null,
            product_name:  name,
            category:      String(r["Category"] || "").trim() || null,
            hsn_code:      hsn,
            gst_percent:   gst,
            standard_cost: parseFloat(String(r["Standard Cost (₹)"] || "0")) || 0,
            base_price:    price,
            unit_label:    uom,
            item_type:     String(r["Item Type (goods/service)"] || "goods").toLowerCase() === "service" ? "service" : "goods",
            reorder_point: parseFloat(String(r["Reorder Level"] || "0")) || 0,
            product_type:  "finished_good",
            pos_enabled:   sellRetail,
            barcode:       sellRetail ? barcode : null,
            mrp:           sellRetail && !isNaN(mrpRaw) ? Math.round(mrpRaw * 100) : null,
            sold_by:       "unit",
          });
        }

      } else {
        // retail
        const name    = String(r["Product Name*"] || r["Product Name"] || "").trim();
        const hsn     = String(r["HSN Code*"]     || r["HSN Code"]     || "").trim();
        const gst     = parseFloat(String(r["GST %*"] || r["GST %"] || "0"));
        const mrpRaw  = parseFloat(String(r["MRP (₹)*"] || r["MRP (₹)"] || ""));
        const price   = parseFloat(String(r["Selling Price (₹)*"] || r["Selling Price (₹)"] || ""));
        const uom     = String(r["UOM*"] || r["UOM"] || "pcs").trim() || "pcs";
        const openQty = parseFloat(String(r["Opening Stock (qty)"] || "0")) || 0;
        const brand   = String(r["Brand"] || "").trim() || null;
        const expiryRaw = String(r["Expiry Tracking (YES/NO)"] || "NO").trim().toUpperCase();
        const expiryTracking = expiryRaw === "YES" || expiryRaw === "Y";
        const warehouseName  = String(r["Warehouse"] || "").trim() || null;
        if (!name)                                                        rowErrors.push("Product Name is required");
        if (!hsn)                                                         rowErrors.push("HSN Code is required for GST billing");
        if (isNaN(gst))                                                   rowErrors.push("GST % must be a number (0/5/12/18)");
        if (isNaN(mrpRaw) || mrpRaw <= 0)                                rowErrors.push("MRP must be a positive number");
        if (isNaN(price) || price <= 0)                                  rowErrors.push("Selling Price must be a positive number");
        if (!isNaN(mrpRaw) && !isNaN(price) && price > mrpRaw)          rowErrors.push("Selling Price cannot exceed MRP");
        if (rowErrors.length) {
          rowErrors.forEach(msg => errors.push({ row: rowNum, field: msg.split(" ")[0], message: msg, item: name || `Row ${rowNum}` }));
        } else {
          valid.push({
            barcode:          String(r["Barcode/EAN"] || "").trim() || null,
            product_name:     name,
            sku_code:         String(r["SKU Code"] || "").trim() || null,
            category:         String(r["Category"] || "").trim() || null,
            hsn_code:         hsn,
            gst_percent:      gst,
            mrp:              Math.round(mrpRaw * 100),
            standard_cost:    parseFloat(String(r["Purchase Rate (₹)"] || "0")) || 0,
            base_price:       price,
            unit_label:       uom,
            sold_by:          String(r["Sold By (unit/weight)"] || "unit").toLowerCase() === "weight" ? "weight" : "unit",
            reorder_point:    parseFloat(String(r["Reorder Level"] || "0")) || 0,
            item_type:        String(r["Item Type (goods/service)"] || "goods").toLowerCase() === "service" ? "service" : "goods",
            opening_stock:    openQty,
            brand,
            expiry_tracking:  expiryTracking,
            warehouse_name:   warehouseName,
          });
        }
      }
    }

    res.json({ total: rawRows.length, validCount: valid.length, errorCount: errors.length, valid, errors, mode });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Bulk Import — confirm insert (mode-aware) ────────────────────────────────
router.post("/bulk-import/confirm", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { rows, mode = "retail" } = req.body as { rows: any[]; mode?: string };
    if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ error: "No rows to import" });

    let inserted = 0, updated = 0;

    if (mode === "raw-materials") {
      for (const r of rows) {
        const mCode = r.material_code || `RM-${tid}-${Date.now()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;
        const existing = r.material_code
          ? await db.execute(sql`SELECT id FROM raw_materials WHERE tenant_id=${tid} AND material_code=${r.material_code} AND record_status=1 LIMIT 1`)
          : { rows: [] };
        if (existing.rows.length) {
          await db.execute(sql`
            UPDATE raw_materials SET
              material_name=${r.material_name}, description=${r.description||null},
              category=${r.category||null}, base_unit=${r.base_unit||null},
              unit_cost=${r.unit_cost||0}, reorder_level=${r.reorder_level||0},
              max_stock_level=${r.max_stock_level||0}, opening_stock=${r.opening_stock||0},
              supplier=${r.supplier||null}, location=${r.location||null}, updated_at=NOW()
            WHERE tenant_id=${tid} AND material_code=${r.material_code} AND record_status=1`);
          updated++;
        } else {
          await db.execute(sql`
            INSERT INTO raw_materials
              (tenant_id, material_code, material_name, description, category, base_unit,
               unit_cost, reorder_level, max_stock_level, opening_stock, opening_date,
               supplier, location, record_status, is_active)
            VALUES
              (${tid}, ${mCode}, ${r.material_name}, ${r.description||null}, ${r.category||null},
               ${r.base_unit||'pcs'}, ${r.unit_cost||0}, ${r.reorder_level||0},
               ${r.max_stock_level||0}, ${r.opening_stock||0}, ${r.opening_date||null},
               ${r.supplier||null}, ${r.location||null}, 1, 'true')
            ON CONFLICT (material_code) DO UPDATE SET
              material_name=EXCLUDED.material_name, updated_at=NOW()`);
          inserted++;
        }
      }

    } else {
      // finished-goods or retail → products table
      const isRetailMode = mode === "retail";
      for (const r of rows) {
        const pType     = r.product_type || (isRetailMode ? "retail" : "finished_good");
        const posEnable = r.pos_enabled !== undefined ? r.pos_enabled : true;

        // Deduplicate priority: barcode first (catches POS-enabled FG overlap), then product_code
        if (r.barcode) {
          const ex = await db.execute(sql`SELECT id FROM products WHERE tenant_id=${tid} AND barcode=${r.barcode} AND record_status=1 LIMIT 1`);
          if (ex.rows.length) {
            await db.execute(sql`
              UPDATE products SET
                product_name=${r.product_name}, sku_code=${r.sku_code||null},
                category=${r.category||null}, hsn_code=${r.hsn_code||null},
                gst_percent=${r.gst_percent||0}, mrp=${r.mrp||null},
                standard_cost=${r.standard_cost||0}, base_price=${r.base_price||0},
                unit_label=${r.unit_label||'pcs'}, sold_by=${r.sold_by||'unit'},
                reorder_point=${r.reorder_point||0}, item_type=${r.item_type||'goods'},
                product_type=${pType}, pos_enabled=${posEnable}, updated_at=NOW()
              WHERE tenant_id=${tid} AND barcode=${r.barcode} AND record_status=1`);
            updated++; continue;
          }
        }
        if (r.product_code) {
          const ex = await db.execute(sql`SELECT id FROM products WHERE tenant_id=${tid} AND product_code=${r.product_code} AND record_status=1 LIMIT 1`);
          if (ex.rows.length) {
            await db.execute(sql`
              UPDATE products SET
                product_name=${r.product_name}, category=${r.category||null},
                hsn_code=${r.hsn_code||null}, gst_percent=${r.gst_percent||0},
                standard_cost=${r.standard_cost||0}, base_price=${r.base_price||0},
                unit_label=${r.unit_label||'pcs'}, item_type=${r.item_type||'goods'},
                reorder_point=${r.reorder_point||0}, barcode=${r.barcode||null},
                mrp=${r.mrp||null}, pos_enabled=${posEnable}, product_type=${pType},
                updated_at=NOW()
              WHERE tenant_id=${tid} AND product_code=${r.product_code} AND record_status=1`);
            updated++; continue;
          }
        }
        const code = (r.product_code || r.sku_code)
          ? `${(r.product_code || r.sku_code)}-${tid}`
          : `PRD-${tid}-${Date.now()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;
        const newRows = await db.execute(sql`
          INSERT INTO products
            (tenant_id, product_code, product_name, sku_code, barcode, category,
             hsn_code, gst_percent, mrp, standard_cost, base_price,
             unit_label, sold_by, reorder_point, item_type,
             product_type, pos_enabled, brand, expiry_tracking, record_status, is_active)
          VALUES
            (${tid}, ${code}, ${r.product_name}, ${r.sku_code||null}, ${r.barcode||null},
             ${r.category||null}, ${r.hsn_code||null}, ${r.gst_percent||0},
             ${r.mrp||null}, ${r.standard_cost||0}, ${r.base_price||0},
             ${r.unit_label||'pcs'}, ${r.sold_by||'unit'}, ${r.reorder_point||0},
             ${r.item_type||'goods'}, ${pType}, ${posEnable},
             ${r.brand||null}, ${r.expiry_tracking||false}, 1, 'true')
          ON CONFLICT (product_code) DO UPDATE SET
            product_name=EXCLUDED.product_name,
            pos_enabled=EXCLUDED.pos_enabled,
            product_type=EXCLUDED.product_type,
            brand=EXCLUDED.brand,
            expiry_tracking=EXCLUDED.expiry_tracking,
            updated_at=NOW()
          RETURNING id`);
        const newId = (newRows.rows[0] as any)?.id;
        // Write opening stock if provided (retail mode only)
        if (isRetailMode && newId && r.opening_stock && r.opening_stock > 0) {
          let whId: number | null = null;
          if (r.warehouse_name) {
            const wh = await db.execute(sql`
              SELECT id FROM warehouses WHERE tenant_id=${tid} AND LOWER(name)=LOWER(${r.warehouse_name}) AND record_status=1 LIMIT 1`);
            if (wh.rows.length) whId = (wh.rows[0] as any).id;
          }
          if (!whId) {
            const wh = await db.execute(sql`
              SELECT id FROM warehouses WHERE tenant_id=${tid} AND is_default=true AND record_status=1 LIMIT 1`);
            if (wh.rows.length) whId = (wh.rows[0] as any).id;
          }
          if (whId) {
            const itemIdStr = String(newId);
            const ex = await db.execute(sql`
              SELECT id FROM warehouse_stock WHERE tenant_id=${tid} AND warehouse_id=${whId} AND item_id=${itemIdStr} LIMIT 1`);
            if (ex.rows.length) {
              await db.execute(sql`
                UPDATE warehouse_stock SET quantity = quantity + ${r.opening_stock}
                WHERE tenant_id=${tid} AND warehouse_id=${whId} AND item_id=${itemIdStr}`);
            } else {
              await db.execute(sql`
                INSERT INTO warehouse_stock (tenant_id, warehouse_id, item_id, quantity, reserved)
                VALUES (${tid}, ${whId}, ${itemIdStr}, ${r.opening_stock}, 0)`);
            }
          }
        }
        inserted++;
      }
    }

    res.json({ success: true, inserted, updated, total: inserted + updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Stock Adjustments (shrinkage / write-off / surplus) ─────────────────────
router.get("/stock-adjustments", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const rows = await db.execute(sql`
      SELECT * FROM stock_adjustments
      WHERE tenant_id=${tid}
      ORDER BY created_at DESC
      LIMIT 500`);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === '42P01') return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/stock-adjustments", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const user = req.user;
    const { product_id, adjustment_type, qty_change, unit_label, reason_notes, reference_no } = req.body;

    if (!product_id) return res.status(400).json({ message: "product_id required" });
    if (!adjustment_type) return res.status(400).json({ message: "adjustment_type required" });
    if (!qty_change || Number(qty_change) <= 0) return res.status(400).json({ message: "qty_change must be > 0" });

    // Resolve product details
    const prodRows = await db.execute(sql`
      SELECT id, product_name, sku_code, barcode FROM products
      WHERE id=${product_id} AND tenant_id=${tid} LIMIT 1`);
    const prod: any = prodRows.rows[0];
    if (!prod) return res.status(404).json({ message: "Product not found" });

    // Determine sign: damaged/expired/theft/wastage = negative; found = positive; correction = positive (caller decides meaning)
    const NEGATIVE_TYPES = ['damaged', 'expired', 'theft', 'wastage'];
    const isNegative = NEGATIVE_TYPES.includes(adjustment_type);
    const signedQty = isNegative ? -Number(qty_change) : Number(qty_change);

    // Insert adjustment record
    const inserted = await db.execute(sql`
      INSERT INTO stock_adjustments
        (tenant_id, product_id, product_name, sku_code, barcode, adjustment_type,
         qty_change, unit_label, reason_notes, adjusted_by, reference_no)
      VALUES
        (${tid}, ${product_id}, ${prod.product_name}, ${prod.sku_code ?? null},
         ${prod.barcode ?? null}, ${adjustment_type}, ${signedQty},
         ${unit_label ?? null}, ${reason_notes ?? null},
         ${user?.username ?? user?.email ?? 'system'}, ${reference_no ?? null})
      RETURNING *`);

    // Update warehouse_stock — find default warehouse and adjust
    try {
      const whRows = await db.execute(sql`
        SELECT id FROM warehouses WHERE tenant_id=${tid} AND is_default=true LIMIT 1`);
      const warehouseId = (whRows.rows[0] as any)?.id ?? null;
      if (warehouseId) {
        const itemIdStr = String(product_id);
        const existing = await db.execute(sql`
          SELECT id FROM warehouse_stock
          WHERE tenant_id=${tid} AND warehouse_id=${warehouseId} AND item_id=${itemIdStr} LIMIT 1`);
        if ((existing.rows[0] as any)?.id) {
          await db.execute(sql`
            UPDATE warehouse_stock SET quantity = GREATEST(0, quantity + ${signedQty})
            WHERE tenant_id=${tid} AND warehouse_id=${warehouseId} AND item_id=${itemIdStr}`);
        } else if (signedQty > 0) {
          await db.execute(sql`
            INSERT INTO warehouse_stock (tenant_id, warehouse_id, item_id, quantity, reserved)
            VALUES (${tid}, ${warehouseId}, ${itemIdStr}, ${signedQty}, 0)`);
        }
      }
    } catch (_) { /* stock update is best-effort */ }

    res.json(inserted.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
