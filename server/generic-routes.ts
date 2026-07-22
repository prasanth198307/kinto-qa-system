import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
};

const router = Router();
const tid = (req: any) => req.tenantId as number;

// pg error codes
const MISSING_TABLE = '42P01';   // relation does not exist
const MISSING_COLUMN = '42703';  // column does not exist

// ─── Attachment Storage ────────────────────────────────────────────────────────
const attachmentStorage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    const tenantId = req.tenantId || "0";
    const dir = path.join(process.cwd(), "uploads", "tenants", String(tenantId), "attachments");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});
const uploadAttachment = multer({ storage: attachmentStorage, limits: { fileSize: 20 * 1024 * 1024 } });

// ─── Cost Centres ────────────────────────────────────────────────────────────
router.get("/cost-centres", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM cost_centres WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY code`);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === MISSING_TABLE) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});
router.post("/cost-centres", requireAuth, async (req: any, res) => {
  try {
    const { code, name, parentId } = req.body;
    const r = await db.execute(sql`INSERT INTO cost_centres (tenant_id,code,name,parent_id) VALUES (${tid(req)},${code},${name},${parentId||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.put("/cost-centres/:id", requireAuth, async (req: any, res) => {
  try {
    const { code, name, parentId } = req.body;
    const r = await db.execute(sql`UPDATE cost_centres SET code=${code},name=${name},parent_id=${parentId||null} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.delete("/cost-centres/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE cost_centres SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Price Lists ──────────────────────────────────────────────────────────────
router.get("/price-lists", requireAuth, async (req: any, res) => {
  try {
    const lists = await db.execute(sql`SELECT * FROM price_lists WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY name`);
    res.json(lists.rows);
  } catch (e: any) {
    if (e.code === MISSING_TABLE) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});
router.get("/price-lists/:id/items", requireAuth, async (req: any, res) => {
  try {
    const items = await db.execute(sql`
      SELECT pli.*, p.name as product_name, p.sku FROM price_list_items pli
      LEFT JOIN products p ON p.id=pli.product_id
      WHERE pli.price_list_id=${req.params.id} AND pli.tenant_id=${tid(req)} AND pli.record_status=1`);
    res.json(items.rows);
  } catch (e: any) {
    if (e.code === MISSING_TABLE) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});
router.post("/price-lists", requireAuth, async (req: any, res) => {
  try {
    const { name, currencyCode, discountPct, isDefault, validFrom, validTo } = req.body;
    if (isDefault) await db.execute(sql`UPDATE price_lists SET is_default=false WHERE tenant_id=${tid(req)}`);
    const r = await db.execute(sql`INSERT INTO price_lists (tenant_id,name,currency_code,discount_pct,is_default,valid_from,valid_to)
      VALUES (${tid(req)},${name},${currencyCode||'INR'},${discountPct||0},${isDefault||false},${validFrom||null},${validTo||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.put("/price-lists/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, currencyCode, discountPct, isDefault, validFrom, validTo } = req.body;
    if (isDefault) await db.execute(sql`UPDATE price_lists SET is_default=false WHERE tenant_id=${tid(req)}`);
    const r = await db.execute(sql`UPDATE price_lists SET name=${name},currency_code=${currencyCode||'INR'},discount_pct=${discountPct||0},is_default=${isDefault||false},valid_from=${validFrom||null},valid_to=${validTo||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post("/price-lists/:id/items", requireAuth, async (req: any, res) => {
  try {
    const { productId, unitPrice, minQty } = req.body;
    await db.execute(sql`DELETE FROM price_list_items WHERE price_list_id=${req.params.id} AND product_id=${productId} AND tenant_id=${tid(req)}`);
    const r = await db.execute(sql`INSERT INTO price_list_items (tenant_id,price_list_id,product_id,unit_price,min_qty)
      VALUES (${tid(req)},${req.params.id},${productId},${unitPrice},${minQty||0}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.delete("/price-lists/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE price_lists SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Item Variants ────────────────────────────────────────────────────────────
router.get("/item-variants/:productId", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM item_variants WHERE product_id=${req.params.productId} AND tenant_id=${tid(req)} AND record_status=1 ORDER BY variant_name`);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === MISSING_TABLE) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});
router.post("/item-variants", requireAuth, async (req: any, res) => {
  try {
    const { productId, variantName, sku, barcode, attributes, priceOverride } = req.body;
    const r = await db.execute(sql`INSERT INTO item_variants (tenant_id,product_id,variant_name,sku,barcode,attributes,price_override)
      VALUES (${tid(req)},${productId},${variantName},${sku||null},${barcode||null},${JSON.stringify(attributes||{})},${priceOverride||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.put("/item-variants/:id", requireAuth, async (req: any, res) => {
  try {
    const { variantName, sku, barcode, attributes, priceOverride, stockQty } = req.body;
    const r = await db.execute(sql`UPDATE item_variants SET variant_name=${variantName},sku=${sku||null},barcode=${barcode||null},attributes=${JSON.stringify(attributes||{})},price_override=${priceOverride||null},stock_qty=${stockQty||0}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.delete("/item-variants/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE item_variants SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Purchase Requisitions ────────────────────────────────────────────────────
router.get("/purchase-requisitions", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT pr.*, CONCAT(u.first_name, ' ', u.last_name) as requested_by_name FROM purchase_requisitions pr
      LEFT JOIN users u ON u.id::text=pr.requested_by::text
      WHERE pr.tenant_id=${tid(req)} AND pr.record_status=1 ORDER BY pr.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === MISSING_TABLE || e.code === MISSING_COLUMN) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});
router.get("/purchase-requisitions/:id", requireAuth, async (req: any, res) => {
  try {
    const prId = parseInt(req.params.id);
    const tenantId = tid(req);
    const pr = await db.execute(sql`SELECT * FROM purchase_requisitions WHERE id=${prId} AND tenant_id=${tenantId}`);
    const items = await db.execute(sql`SELECT pri.*, p.product_name FROM purchase_requisition_items pri LEFT JOIN products p ON p.id::text=pri.product_id::text WHERE pri.pr_id=${prId} AND pri.tenant_id=${tenantId} AND pri.record_status=1`);
    res.json({ ...pr.rows[0], items: items.rows });
  } catch (e: any) {
    if (e.code === MISSING_TABLE || e.code === MISSING_COLUMN) return res.json({ items: [] });
    res.status(500).json({ message: e.message });
  }
});
router.post("/purchase-requisitions", requireAuth, async (req: any, res) => {
  try {
    const { prDate, reqDate, department, notes, items } = req.body;
    const num = `PR-${Date.now()}`;
    const prDateVal = prDate || reqDate || new Date().toISOString().split("T")[0];
    const pr = await db.execute(sql`INSERT INTO purchase_requisitions (tenant_id,pr_number,pr_date,department,notes,status)
      VALUES (${tid(req)},${num},${prDateVal},${department||null},${notes||null},'draft') RETURNING *`);
    const prId = pr.rows[0].id;
    for (const it of (items||[])) {
      await db.execute(sql`INSERT INTO purchase_requisition_items (tenant_id,pr_id,product_id,description,quantity,uom,estimated_price,required_date)
        VALUES (${tid(req)},${prId},${it.productId||null},${it.description||null},${it.qty||it.quantity||1},${it.uom||null},${it.estimatedPrice||it.estimatedUnitPrice||null},${it.requiredDate||it.requiredBy||null})`);
    }
    res.json(pr.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.put("/purchase-requisitions/:id/submit", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE purchase_requisitions SET status='submitted' WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.put("/purchase-requisitions/:id/approve", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE purchase_requisitions SET status='approved' WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.put("/purchase-requisitions/:id/reject", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE purchase_requisitions SET status='rejected' WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post("/purchase-requisitions/:id/convert-to-po", requireAuth, async (req: any, res) => {
  try {
    const pr = await db.execute(sql`SELECT * FROM purchase_requisitions WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    if (!pr.rows[0]) return res.status(404).json({ error: "Not found" });
    const prItems = await db.execute(sql`SELECT * FROM purchase_requisition_items WHERE pr_id=${req.params.id} AND tenant_id=${tid(req)} AND record_status=1`);
    const poNum = `PO-${Date.now()}`;
    const totalQty = prItems.rows.reduce((s: number, r: any) => s + (Number(r.quantity) || 1), 0);
    const po = await db.execute(sql`INSERT INTO purchase_orders (tenant_id,po_number,po_date,vendor_id,status,quantity,urgency)
      VALUES (${tid(req)},${poNum},now(),${req.body.vendorId||null},'draft',${totalQty},'normal') RETURNING *`);
    const poId = po.rows[0].id;
    // Insert PR items into PO items using purchase_orders schema (purchase_order_id, item_name, quantity, unit_price, amount, serial_no)
    let serialNo = 1;
    for (const it of prItems.rows) {
      const qty = Number(it.quantity) || 1;
      const price = Number(it.estimated_price) || 0;
      const amount = Math.round(qty * price);
      await db.execute(sql`INSERT INTO purchase_order_items (purchase_order_id, serial_no, item_name, description, quantity, unit_price, amount)
        VALUES (${poId}, ${serialNo++}, ${it.description||'Item'}, ${it.description||null}, ${qty}, ${price}, ${amount})`).catch(() => {});
    }
    await db.execute(sql`UPDATE purchase_requisitions SET status='converted' WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ ...po.rows[0], pr_number: (pr.rows[0] as any).pr_number, items_count: prItems.rows.length });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Goods Receipt Notes ─────────────────────────────────────────────────────
// FIX: production vendors table uses "vendor_name" not "name"
async function handleGetGRNs(req: any, res: any) {
  try {
    const rows = await db.execute(sql`
      SELECT g.*, v.vendor_name as vendor_name FROM goods_receipt_notes g
      LEFT JOIN vendors v ON v.id::text=g.vendor_id::text
      WHERE g.tenant_id=${tid(req)} AND g.record_status=1 ORDER BY g.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === MISSING_TABLE || e.code === MISSING_COLUMN) return res.json([]);
    res.status(500).json({ message: e.message });
  }
}
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

async function handleCreateGRN(req: any, res: any) {
  try {
    const { grnDate, received_date, poId, po_id, vendorId, vendor_id, notes, remarks, items } = req.body;
    const actualDate = grnDate || received_date || new Date().toISOString().split("T")[0];
    const actualPoId = poId || po_id || null;
    const actualVendorId = vendorId || vendor_id || null;
    const actualNotes = notes || remarks || null;
    const num = `GRN-${Date.now()}`;

    // Vendor GSTIN validation — block if no GSTIN + GST-applicable items; warn if malformed
    let gstin_warning: string | null = null;
    if (actualVendorId) {
      try {
        const vRows = await db.execute(sql`SELECT gst_number, vendor_name FROM vendors WHERE id=${actualVendorId} AND tenant_id=${tid(req)} LIMIT 1`);
        const v: any = vRows.rows[0];
        if (v) {
          const gstin = (v.gst_number || '').trim().toUpperCase();
          if (!gstin) {
            // Check if any item in this GRN is GST-applicable → BLOCK
            let hasGstItem = false;
            for (const it of (items || [])) {
              const pid = it.productId || it.product_id;
              if (pid) {
                try {
                  const gstChk = await db.execute(sql`SELECT 1 FROM products WHERE id::text=${String(pid)} AND tenant_id=${tid(req)} AND COALESCE(gst_percent,0)>0 LIMIT 1`);
                  if (gstChk.rows.length > 0) { hasGstItem = true; break; }
                } catch (_) {}
              }
            }
            if (hasGstItem) {
              return res.status(400).json({ message: `Vendor "${v.vendor_name || actualVendorId}" has no GSTIN on file. Cannot receive GST-applicable items without a valid vendor GSTIN — ITC would be disallowed by GSTN. Please update the vendor GSTIN in Vendor Master before saving this GRN.` });
            }
            gstin_warning = `Vendor "${v.vendor_name || actualVendorId}" has no GSTIN on file. Input tax credit (ITC) may not be available for this GRN.`;
          } else if (!GSTIN_REGEX.test(gstin)) {
            gstin_warning = `Vendor GSTIN "${gstin}" appears invalid (expected 15-character format). Verify before claiming ITC.`;
          }
        }
      } catch (gstinErr: any) {
        if (gstinErr.status === 400) throw gstinErr;
      }
    }

    // received_by is an integer column (legacy); user.id is now UUID — pass null to avoid type error
    const grn = await db.execute(sql`INSERT INTO goods_receipt_notes (tenant_id,grn_number,received_date,po_id,vendor_id,remarks,status)
      VALUES (${tid(req)},${num},${actualDate},${actualPoId},${actualVendorId},${actualNotes},'received') RETURNING *`);
    const grnId = (grn.rows[0] as any).id;
    for (const it of (items||[])) {
      await db.execute(sql`INSERT INTO grn_items (tenant_id,grn_id,po_item_id,product_id,description,ordered_qty,received_qty,rejected_qty,unit_price,batch_number,lot_number,manufactured_date,expiry_date)
        VALUES (${tid(req)},${grnId},${it.poItemId||null},${it.productId||null},${it.item_name||it.description||null},${it.orderedQty||it.ordered_qty||0},${it.receivedQty||it.received_qty||0},${it.rejectedQty||0},${it.unitPrice||it.unit_price||0},${it.batchNumber||it.batch_number||null},${it.lotNumber||it.lot_number||null},${it.manufacturedDate||it.manufactured_date||null},${it.expiryDate||it.expiry_date||null})`);
    }
    if (actualPoId) await db.execute(sql`UPDATE purchase_orders SET grn_status='partial' WHERE id=${actualPoId} AND tenant_id=${tid(req)}`).catch(() => {});
    res.json({ ...grn.rows[0], gstin_warning });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
}
router.get("/grn", requireAuth, handleGetGRNs);
router.get("/grns", requireAuth, handleGetGRNs);
router.get("/grn/:id", requireAuth, async (req: any, res) => {
  try {
    const grn = await db.execute(sql`SELECT * FROM goods_receipt_notes WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    const items = await db.execute(sql`SELECT gi.* FROM grn_items gi WHERE gi.grn_id=${req.params.id} AND gi.tenant_id=${tid(req)} AND gi.record_status=1`);
    res.json({ ...grn.rows[0], items: items.rows });
  } catch (e: any) {
    if (e.code === MISSING_TABLE) return res.status(404).json({ message: "Not found" });
    res.status(500).json({ message: e.message });
  }
});
router.post("/grn", requireAuth, handleCreateGRN);
router.post("/grns", requireAuth, handleCreateGRN);
router.put("/grn/:id/post", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE goods_receipt_notes SET status='posted' WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── GRN Submit (Godown → submitted) ──────────────────────────────────────────
router.patch("/grn/:id/submit", requireAuth, async (req: any, res) => {
  try {
    const grnRows = await db.execute(sql`SELECT * FROM goods_receipt_notes WHERE id=${req.params.id} AND tenant_id=${tid(req)} LIMIT 1`);
    if (!grnRows.rows[0]) return res.status(404).json({ message: "GRN not found" });
    const current = (grnRows.rows[0] as any).status;
    if (!['draft', 'received'].includes(current)) return res.status(400).json({ message: `Cannot submit a GRN with status: ${current}` });

    await db.execute(sql`
      UPDATE goods_receipt_notes
      SET status='submitted', submitted_by_id=${(req.user as any)?.id ?? null}, submitted_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);

    // In-app notification: create system alert for Purchase Manager approvers
    try {
      const gInfo = grnRows.rows[0] as any;
      await db.execute(sql`
        INSERT INTO system_alerts (alert_type, entity_type, entity_id, entity_name, severity, message, tenant_id)
        VALUES ('grn_pending_approval', 'grn', ${req.params.id},
          ${gInfo.grn_number ?? req.params.id}, 'info',
          ${`GRN ${gInfo.grn_number ?? req.params.id} submitted — awaiting Purchase Manager approval.`},
          ${tid(req)})`);
    } catch (_) {}

    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── GRN Approve (Purchase Manager/Admin → posted + stock update) ──────────────
router.patch("/grn/:id/approve", requireAuth, async (req: any, res) => {
  try {
    const grnRows = await db.execute(sql`SELECT * FROM goods_receipt_notes WHERE id=${req.params.id} AND tenant_id=${tid(req)} LIMIT 1`);
    if (!grnRows.rows[0]) return res.status(404).json({ message: "GRN not found" });
    const grn: any = grnRows.rows[0];
    if (grn.status !== 'submitted') return res.status(400).json({ message: "Only submitted GRNs can be approved" });

    // Get GRN items to update stock
    const itemsRows = await db.execute(sql`
      SELECT gi.product_id, gi.received_qty FROM grn_items gi
      WHERE gi.grn_id=${req.params.id} AND gi.tenant_id=${tid(req)} AND gi.record_status=1 AND gi.received_qty > 0`);

    // Find default warehouse
    const whRows = await db.execute(sql`SELECT id FROM warehouses WHERE tenant_id=${tid(req)} AND is_default=true LIMIT 1`);
    const warehouseId = (whRows.rows[0] as any)?.id ?? null;

    // Update warehouse stock for each item
    if (warehouseId) {
      for (const item of itemsRows.rows as any[]) {
        if (!item.product_id || !item.received_qty) continue;
        const itemIdStr = String(item.product_id);
        const qty = Number(item.received_qty);
        const existing = await db.execute(sql`
          SELECT id FROM warehouse_stock WHERE tenant_id=${tid(req)} AND warehouse_id=${warehouseId} AND item_id=${itemIdStr} LIMIT 1`);
        if ((existing.rows[0] as any)?.id) {
          await db.execute(sql`
            UPDATE warehouse_stock SET quantity = quantity + ${qty}
            WHERE tenant_id=${tid(req)} AND warehouse_id=${warehouseId} AND item_id=${itemIdStr}`);
        } else {
          await db.execute(sql`
            INSERT INTO warehouse_stock (tenant_id, warehouse_id, item_id, quantity, reserved)
            VALUES (${tid(req)}, ${warehouseId}, ${itemIdStr}, ${qty}, 0)`);
        }
      }
    }

    // Mark GRN as posted
    await db.execute(sql`
      UPDATE goods_receipt_notes
      SET status='posted', approved_by_id=${(req.user as any)?.id ?? null}, approved_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);

    // Also update linked PO grn_status
    if (grn.po_id) {
      await db.execute(sql`UPDATE purchase_orders SET grn_status='received' WHERE id=${grn.po_id} AND tenant_id=${tid(req)}`).catch(() => {});
    }

    // Expiry alerts: flag any items expiring within 30 days as system alerts (#4)
    try {
      const expiringItems = await db.execute(sql`
        SELECT description, expiry_date FROM grn_items
        WHERE grn_id=${req.params.id} AND tenant_id=${tid(req)} AND record_status=1
          AND expiry_date IS NOT NULL AND expiry_date::date < CURRENT_DATE + INTERVAL '30 days'`);
      for (const item of expiringItems.rows as any[]) {
        const daysLeft = Math.max(0, Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / 86400000));
        const itemName = item.description || 'Item';
        await db.execute(sql`
          INSERT INTO system_alerts (alert_type, entity_type, entity_id, entity_name, severity, message, tenant_id)
          VALUES ('near_expiry', 'grn', ${req.params.id}, ${itemName}, 'warning',
            ${`"${itemName}" in GRN ${grn.grn_number ?? req.params.id} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (${new Date(item.expiry_date).toLocaleDateString('en-IN')}).`},
            ${tid(req)})`);
      }
    } catch (_) {}

    res.json({ ok: true, items_stocked: itemsRows.rows.length });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Approval Rules ───────────────────────────────────────────────────────────
router.get("/approval-rules", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM approval_rules WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY entity_type,approval_level`);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === MISSING_TABLE) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});
router.post("/approval-rules", requireAuth, async (req: any, res) => {
  try {
    const { entityType, entity_type, minAmount, min_amount, maxAmount, max_amount, approverRole, approver_role, approverUserId, approvalLevel } = req.body;
    const r = await db.execute(sql`INSERT INTO approval_rules (tenant_id,entity_type,min_amount,max_amount,approver_role,approver_user_id,approval_level)
      VALUES (${tid(req)},${entityType||entity_type},${minAmount||min_amount||0},${maxAmount||max_amount||null},${approverRole||approver_role},${approverUserId||null},${approvalLevel||1}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.delete("/approval-rules/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE approval_rules SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Approval Requests ────────────────────────────────────────────────────────
router.get("/approval-requests", requireAuth, async (req: any, res) => {
  try {
    const { status, entityType } = req.query as any;
    let q = sql`SELECT ar.*, CONCAT(u.first_name, ' ', u.last_name) as requested_by_name FROM approval_requests ar LEFT JOIN users u ON u.id::text=ar.requested_by::text WHERE ar.tenant_id=${tid(req)} AND ar.record_status=1`;
    if (status) q = sql`${q} AND ar.status=${status}`;
    if (entityType) q = sql`${q} AND ar.entity_type=${entityType}`;
    q = sql`${q} ORDER BY ar.requested_at DESC`;
    const rows = await db.execute(q);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === MISSING_TABLE || e.code === MISSING_COLUMN) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});
router.post("/approval-requests", requireAuth, async (req: any, res) => {
  try {
    const { entityType, entityId, ruleId } = req.body;
    const existing = await db.execute(sql`SELECT id FROM approval_requests WHERE entity_type=${entityType} AND entity_id=${entityId} AND status='pending' AND tenant_id=${tid(req)} AND record_status=1`);
    if (existing.rows.length > 0) return res.json(existing.rows[0]);
    const r = await db.execute(sql`INSERT INTO approval_requests (tenant_id,entity_type,entity_id,rule_id,status)
      VALUES (${tid(req)},${entityType},${entityId},${ruleId||null},'pending') RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.put("/approval-requests/:id/approve", requireAuth, async (req: any, res) => {
  try {
    const { comments } = req.body;
    // actioned_by is INTEGER; user.id is UUID — pass null to avoid type error
    await db.execute(sql`UPDATE approval_requests SET status='approved',actioned_by=null,actioned_at=now(),comments=${comments||null} WHERE id=${parseInt(req.params.id)} AND tenant_id=${tid(req)}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.put("/approval-requests/:id/reject", requireAuth, async (req: any, res) => {
  try {
    const { comments } = req.body;
    await db.execute(sql`UPDATE approval_requests SET status='rejected',actioned_by=null,actioned_at=now(),comments=${comments||null} WHERE id=${parseInt(req.params.id)} AND tenant_id=${tid(req)}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post("/approval-requests/:id/action", requireAuth, async (req: any, res) => {
  try {
    const { action, notes, comments } = req.body;
    const status = action === "approve" ? "approved" : "rejected";
    await db.execute(sql`UPDATE approval_requests SET status=${status},actioned_by=null,actioned_at=now(),comments=${notes||comments||null} WHERE id=${parseInt(req.params.id)} AND tenant_id=${tid(req)}`);
    res.json({ ok: true, status });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Audit Log ────────────────────────────────────────────────────────────────
router.get("/audit-log", requireAuth, async (req: any, res) => {
  try {
    const { entityType, entity_type, entityId, entity_id, action, limit } = req.query as any;
    const et = entityType || entity_type;
    const eid = entityId || entity_id;
    let q = sql`SELECT al.*, CONCAT(u.first_name, ' ', u.last_name) as performed_by_name FROM audit_logs al LEFT JOIN users u ON u.id::text=al.user_id WHERE (al.tenant_id=${tid(req)} OR al.tenant_id IS NULL)`;
    if (et) q = sql`${q} AND al.table_name=${et}`;
    if (eid) q = sql`${q} AND al.record_id=${eid}`;
    if (action) q = sql`${q} AND al.action=${action}`;
    q = sql`${q} ORDER BY al.created_at DESC LIMIT ${parseInt(limit)||200}`;
    const rows = await db.execute(q);
    const normalized = (rows.rows as any[]).map((r: any) => ({
      ...r,
      entity_type: r.table_name,
      entity_id: r.record_id,
      performed_by: r.performed_by_name || r.user_id,
      description: r.description,
    }));
    res.json(normalized);
  } catch (e: any) {
    if (e.code === MISSING_TABLE || e.code === MISSING_COLUMN) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

// ─── System Alerts (in-app notification inbox) ────────────────────────────────
router.get("/system-alerts/count", requireAuth, async (req: any, res) => {
  try {
    const r = await db.execute(sql`SELECT COUNT(*) as count FROM system_alerts WHERE tenant_id=${tid(req)} AND status='active'`);
    res.json({ count: Number((r.rows[0] as any)?.count ?? 0) });
  } catch (_) { res.json({ count: 0 }); }
});

router.get("/system-alerts", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT * FROM system_alerts WHERE tenant_id=${tid(req)} AND status='active'
      ORDER BY detected_at DESC LIMIT 50`);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === MISSING_TABLE) return res.json([]);
    res.json([]);
  }
});

router.patch("/system-alerts/:id/resolve", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`
      UPDATE system_alerts SET status='resolved', resolved_at=NOW(), resolved_by=${(req.user as any)?.id ?? null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Per-Tenant Platform Settings (operational toggles) ──────────────────────
router.get("/platform-settings", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const prefix = `t${tenantId}:`;
    const rows = await db.execute(sql`SELECT key, value FROM platform_settings WHERE key LIKE ${prefix + '%'}`);
    const settings: Record<string, string> = {};
    for (const r of rows.rows as any[]) {
      settings[(r.key as string).slice(prefix.length)] = r.value;
    }
    res.json(settings);
  } catch (_) { res.json({}); }
});

router.put("/platform-settings", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const prefix = `t${tenantId}:`;
    for (const [key, value] of Object.entries(req.body as Record<string, string>)) {
      const scopedKey = prefix + key;
      await db.execute(sql`
        INSERT INTO platform_settings (key, value, updated_at) VALUES (${scopedKey}, ${String(value)}, NOW())
        ON CONFLICT (key) DO UPDATE SET value=${String(value)}, updated_at=NOW()`);
    }
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Reorder Alerts ───────────────────────────────────────────────────────────
router.get("/reorder-alerts", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT p.id, p.product_name as name, p.sku_code as sku, p.reorder_point, p.reorder_qty,
        COALESCE(SUM(CASE WHEN rmt.transaction_type='in' THEN rmt.quantity WHEN rmt.transaction_type='out' THEN -rmt.quantity ELSE 0 END),0) as current_stock
      FROM products p
      LEFT JOIN raw_material_transactions rmt ON rmt.material_id=p.id AND rmt.tenant_id=${tid(req)}
      WHERE p.tenant_id=${tid(req)} AND p.record_status=1 AND p.reorder_point > 0
      GROUP BY p.id, p.product_name, p.sku_code, p.reorder_point, p.reorder_qty
      HAVING COALESCE(SUM(CASE WHEN rmt.transaction_type='in' THEN rmt.quantity WHEN rmt.transaction_type='out' THEN -rmt.quantity ELSE 0 END),0) <= p.reorder_point`);

    // Auto-generate draft PRs if the tenant setting is enabled (#5)
    if (rows.rows.length > 0) {
      try {
        const settingKey = `t${tid(req)}:auto_pr_on_reorder`;
        const settingRow = await db.execute(sql`SELECT value FROM platform_settings WHERE key=${settingKey} LIMIT 1`);
        const autoPR = (settingRow.rows[0] as any)?.value === 'true';
        if (autoPR) {
          for (const item of rows.rows as any[]) {
            // Skip if a draft/submitted PR for this product already exists within the last 7 days
            const existing = await db.execute(sql`
              SELECT pr.id FROM purchase_requisitions pr
              JOIN purchase_requisition_items pri ON pri.pr_id=pr.id AND pri.tenant_id=${tid(req)}
              WHERE pr.tenant_id=${tid(req)} AND pr.status IN ('draft','submitted')
                AND pri.product_id=${String((item as any).id)}
                AND pr.pr_date >= CURRENT_DATE - INTERVAL '7 days'
              LIMIT 1`);
            if ((existing.rows[0] as any)?.id) continue;
            const prNum = `PR-AUTO-${Date.now()}-${(item as any).id}`;
            const pr = await db.execute(sql`
              INSERT INTO purchase_requisitions (tenant_id, pr_number, pr_date, department, notes, status)
              VALUES (${tid(req)}, ${prNum}, CURRENT_DATE, 'Inventory',
                ${`Auto-generated reorder PR for ${(item as any).name} (stock: ${(item as any).current_stock}, reorder point: ${(item as any).reorder_point})`},
                'draft') RETURNING id`);
            const prId = (pr.rows[0] as any).id;
            await db.execute(sql`
              INSERT INTO purchase_requisition_items (tenant_id, pr_id, product_id, description, quantity, uom, estimated_price, required_date)
              VALUES (${tid(req)}, ${prId}, ${String((item as any).id)}, ${(item as any).name},
                ${Number((item as any).reorder_qty || 1)}, 'Nos', 0, CURRENT_DATE + INTERVAL '7 days')`);
          }
        }
      } catch (_) { /* auto-PR is best-effort */ }
    }

    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === MISSING_TABLE || e.code === MISSING_COLUMN) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

// ─── GSTR-1 Report ───────────────────────────────────────────────────────────
async function handleGSTR1(req: any, res: any) {
  try {
    const { month, year } = req.query as any;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year)  || new Date().getFullYear();

    const rows = await db.execute(sql`
      SELECT i.invoice_number, i.invoice_date, i.buyer_name, i.buyer_gstin,
        i.subtotal, i.cgst_amount, i.sgst_amount, i.igst_amount, i.total_amount,
        i.place_of_supply, i.invoice_type
      FROM invoices i
      WHERE i.tenant_id=${tid(req)} AND i.status NOT IN ('cancelled','draft')
        AND EXTRACT(MONTH FROM i.invoice_date::date)=${m}
        AND EXTRACT(YEAR FROM i.invoice_date::date)=${y}
      ORDER BY i.invoice_date`);

    // HSN-wise summary — pulls hsn_code from invoice_items first, falls back to products.hsn_code
    const hsnRows = await db.execute(sql`
      SELECT
        COALESCE(NULLIF(TRIM(ii.hsn_code),''), NULLIF(TRIM(p.hsn_code),''), 'N/A') AS hsn_code,
        COALESCE(NULLIF(TRIM(p.product_name),''), ii.item_name, 'Unspecified')      AS description,
        COALESCE(ii.cgst_rate + ii.sgst_rate + ii.igst_rate,
                 CAST(p.gst_percent AS INTEGER), 0)                                  AS gst_rate,
        COUNT(DISTINCT i.id)                                                          AS invoice_count,
        COALESCE(SUM(ii.quantity), 0)                                                 AS total_qty,
        COALESCE(SUM(ii.taxable_amount), 0)                                           AS taxable_value,
        COALESCE(SUM(ii.cgst_amount), 0)                                              AS cgst,
        COALESCE(SUM(ii.sgst_amount), 0)                                              AS sgst,
        COALESCE(SUM(ii.igst_amount), 0)                                              AS igst,
        COALESCE(SUM(ii.cgst_amount + ii.sgst_amount + ii.igst_amount), 0)            AS total_tax
      FROM invoice_items ii
      JOIN invoices i ON i.id = ii.invoice_id
      LEFT JOIN products p ON p.id::text = ii.product_id::text AND p.tenant_id = ${tid(req)}
      WHERE i.tenant_id = ${tid(req)} AND i.status NOT IN ('cancelled','draft')
        AND EXTRACT(MONTH FROM i.invoice_date::date) = ${m}
        AND EXTRACT(YEAR FROM i.invoice_date::date)  = ${y}
      GROUP BY
        COALESCE(NULLIF(TRIM(ii.hsn_code),''), NULLIF(TRIM(p.hsn_code),''), 'N/A'),
        COALESCE(NULLIF(TRIM(p.product_name),''), ii.item_name, 'Unspecified'),
        COALESCE(ii.cgst_rate + ii.sgst_rate + ii.igst_rate, CAST(p.gst_percent AS INTEGER), 0)
      ORDER BY taxable_value DESC`).catch(() => ({ rows: [] as any[] }));

    const b2b = rows.rows.filter((r: any) => r.buyer_gstin);
    const b2c = rows.rows.filter((r: any) => !r.buyer_gstin);
    const totalTax    = rows.rows.reduce((s: number, r: any) => s + Number(r.cgst_amount||0) + Number(r.sgst_amount||0) + Number(r.igst_amount||0), 0);
    const totalSupply = rows.rows.reduce((s: number, r: any) => s + Number(r.subtotal||0), 0);

    res.json({
      b2b, b2c,
      hsnSummary: hsnRows.rows,
      summary: { totalInvoices: rows.rows.length, totalSupply, totalTax },
    });
  } catch (e: any) {
    if (e.code === MISSING_COLUMN) return res.json({ b2b: [], b2c: [], hsnSummary: [], summary: { totalInvoices: 0, totalSupply: 0, totalTax: 0 } });
    res.status(500).json({ message: e.message });
  }
}
router.get("/gstr1", requireAuth, handleGSTR1);
router.get("/gstr-1", requireAuth, handleGSTR1);

// ─── GSTR-3B Report ──────────────────────────────────────────────────────────
async function handleGSTR3B(req: any, res: any) {
  try {
    const { month, year } = req.query as any;
    const sales = await db.execute(sql`
      SELECT 
        COALESCE(SUM(subtotal),0) as taxable_value,
        COALESCE(SUM(cgst_amount),0) as cgst,
        COALESCE(SUM(sgst_amount),0) as sgst,
        COALESCE(SUM(igst_amount),0) as igst
      FROM invoices WHERE tenant_id=${tid(req)} AND status NOT IN ('cancelled','draft')
        AND EXTRACT(MONTH FROM invoice_date::date)=${parseInt(month)||new Date().getMonth()+1}
        AND EXTRACT(YEAR FROM invoice_date::date)=${parseInt(year)||new Date().getFullYear()}`);
    const purchases = await db.execute(sql`
      SELECT 
        COALESCE(SUM(total_amount),0) as taxable_value,
        COALESCE(SUM(COALESCE(cgst_amount,0) + COALESCE(sgst_amount,0) + COALESCE(igst_amount,0)),0) as input_tax
      FROM purchase_orders WHERE tenant_id=${tid(req)} AND status NOT IN ('cancelled','draft')
        AND EXTRACT(MONTH FROM po_date::date)=${parseInt(month)||new Date().getMonth()+1}
        AND EXTRACT(YEAR FROM po_date::date)=${parseInt(year)||new Date().getFullYear()}`);
    const salesData = (sales.rows[0] as any) || {};
    const purchaseData = (purchases.rows[0] as any) || {};

    const taxRates = await db.execute(sql`
      SELECT 
        COALESCE(ii.gst_rate, 18) as tax_rate,
        COALESCE(SUM(ii.taxable_amount), 0) as taxable_value,
        COALESCE(SUM(ii.cgst_amount + ii.sgst_amount + ii.igst_amount), 0) as tax_amount
      FROM invoice_items ii
      JOIN invoices i ON i.id=ii.invoice_id
      WHERE i.tenant_id=${tid(req)} AND i.status NOT IN ('cancelled','draft')
        AND EXTRACT(MONTH FROM i.invoice_date::date)=${parseInt(req.query.month as string)||new Date().getMonth()+1}
        AND EXTRACT(YEAR FROM i.invoice_date::date)=${parseInt(req.query.year as string)||new Date().getFullYear()}
      GROUP BY tax_rate ORDER BY tax_rate`).catch(() => ({ rows: [] }));

    res.json({
      sup_details: {
        taxable_value: salesData.taxable_value || 0,
        igst: salesData.igst || 0,
        cgst: salesData.cgst || 0,
        sgst: salesData.sgst || 0,
      },
      itc_elg: {
        inputs: purchaseData.input_tax || 0,
        capital_goods: 0,
      },
      tax_rate_summary: (taxRates as any).rows,
      outwardSupplies: salesData,
      inwardSupplies: purchaseData,
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
}
router.get("/gstr3b", requireAuth, handleGSTR3B);
router.get("/gstr-3b", requireAuth, handleGSTR3B);

// ─── Bulk Operations ──────────────────────────────────────────────────────────
router.post("/bulk/expenses/approve", requireAuth, async (req: any, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids required" });
    let updated = 0;
    for (const id of ids) {
      await db.execute(sql`UPDATE hr_expense_claims SET status='approved', approved_by=${(req as any).user?.id||null}, approved_at=now() WHERE id=${id} AND tenant_id=${tid(req)}`).catch(() => {});
      updated++;
    }
    res.json({ ok: true, updated });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post("/bulk/expenses/reject", requireAuth, async (req: any, res) => {
  try {
    const { ids, reason } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids required" });
    let updated = 0;
    for (const id of ids) {
      await db.execute(sql`UPDATE hr_expense_claims SET status='rejected', rejection_reason=${reason||null} WHERE id=${id} AND tenant_id=${tid(req)}`).catch(() => {});
      updated++;
    }
    res.json({ ok: true, updated });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post("/bulk/invoices/mark-paid", requireAuth, async (req: any, res) => {
  try {
    const { ids, paymentDate, paymentMode } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids required" });
    const pDate = paymentDate || new Date().toISOString().split("T")[0];
    let updated = 0;
    for (const id of ids) {
      await db.execute(sql`UPDATE invoices SET status='paid', payment_date=${pDate}, payment_mode=${paymentMode||'bank'} WHERE id=${id} AND tenant_id=${tid(req)} AND status NOT IN ('cancelled')`).catch(() => {});
      updated++;
    }
    res.json({ ok: true, updated });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post("/bulk/purchase-orders/cancel", requireAuth, async (req: any, res) => {
  try {
    const { ids, reason } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids required" });
    let updated = 0;
    for (const id of ids) {
      await db.execute(sql`UPDATE purchase_orders SET status='cancelled', notes=COALESCE(notes||' | ','') || ${reason||'Bulk cancelled'} WHERE id=${id} AND tenant_id=${tid(req)} AND status NOT IN ('received')`).catch(() => {});
      updated++;
    }
    res.json({ ok: true, updated });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post("/bulk/purchase-requisitions/submit", requireAuth, async (req: any, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids required" });
    let updated = 0;
    for (const id of ids) {
      await db.execute(sql`UPDATE purchase_requisitions SET status='submitted' WHERE id=${id} AND tenant_id=${tid(req)} AND status='draft'`).catch(() => {});
      updated++;
    }
    res.json({ ok: true, updated });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Custom Field Values ──────────────────────────────────────────────────────
router.get("/custom-field-values/:entityType/:entityId", requireAuth, async (req: any, res) => {
  try {
    const { entityType, entityId } = req.params;
    const rows = await db.execute(sql`
      SELECT cfv.*, cfd.field_name, cfd.field_label, cfd.field_type
      FROM custom_field_values cfv
      JOIN custom_field_definitions cfd ON cfd.id=cfv.field_def_id
      WHERE cfv.tenant_id=${tid(req)} AND cfv.entity_type=${entityType} AND cfv.entity_id=${entityId}`);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === MISSING_TABLE) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});
router.post("/custom-field-values/:entityType/:entityId", requireAuth, async (req: any, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { values } = req.body;
    const results = [];
    for (const [fieldDefId, fieldValue] of Object.entries(values as Record<string, any>)) {
      const existing = await db.execute(sql`SELECT id FROM custom_field_values WHERE field_def_id=${parseInt(fieldDefId)} AND entity_id=${entityId} AND tenant_id=${tid(req)}`);
      if (existing.rows.length > 0) {
        await db.execute(sql`UPDATE custom_field_values SET field_value=${String(fieldValue ?? "")} WHERE field_def_id=${parseInt(fieldDefId)} AND entity_id=${entityId} AND tenant_id=${tid(req)}`);
      } else {
        await db.execute(sql`INSERT INTO custom_field_values (tenant_id, field_def_id, entity_type, entity_id, field_value) VALUES (${tid(req)},${parseInt(fieldDefId)},${entityType},${entityId},${String(fieldValue ?? "")})`);
      }
      results.push({ fieldDefId, fieldValue });
    }
    res.json({ ok: true, saved: results.length });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Inline Attachments ───────────────────────────────────────────────────────
router.get("/attachments/:entityType/:entityId", requireAuth, async (req: any, res) => {
  try {
    const { entityType, entityId } = req.params;
    const rows = await db.execute(sql`
      SELECT ea.*, u.full_name as uploaded_by_name FROM entity_attachments ea
      LEFT JOIN users u ON u.id=ea.uploaded_by
      WHERE ea.tenant_id=${tid(req)} AND ea.entity_type=${entityType} AND ea.entity_id=${parseInt(entityId)}
      ORDER BY ea.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === MISSING_TABLE) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});
router.post("/attachments/:entityType/:entityId", requireAuth, uploadAttachment.single("file"), async (req: any, res) => {
  try {
    const { entityType, entityId } = req.params;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const filePath = `/uploads/tenants/${tid(req)}/attachments/${req.file.filename}`;
    const r = await db.execute(sql`
      INSERT INTO entity_attachments (tenant_id, entity_type, entity_id, file_name, file_path, file_size, mime_type, uploaded_by)
      VALUES (${tid(req)}, ${entityType}, ${parseInt(entityId)}, ${req.file.originalname}, ${filePath}, ${req.file.size}, ${req.file.mimetype}, ${(req as any).user?.id || null})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
// ── GRN Expiry Alerts — items expiring within N days (default 30) ─────────────
router.get("/grn-expiry-alerts", requireAuth, async (req: any, res) => {
  try {
    const days = Math.min(Number(req.query.days || 30), 365);
    const rows = await db.execute(sql`
      SELECT gi.id, gi.grn_id, gi.product_id, gi.description, gi.expiry_date,
             gi.batch_number, gi.lot_number, gi.received_qty,
             g.grn_number, g.received_date,
             (gi.expiry_date - CURRENT_DATE) AS days_to_expiry
      FROM grn_items gi
      JOIN goods_receipt_notes g ON g.id = gi.grn_id
      WHERE gi.tenant_id = ${tid(req)}
        AND gi.record_status = 1
        AND gi.expiry_date IS NOT NULL
        AND gi.expiry_date <= CURRENT_DATE + ${days}::int
      ORDER BY gi.expiry_date ASC
      LIMIT 50`);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === MISSING_TABLE || e.code === MISSING_COLUMN) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.delete("/attachments/:id", requireAuth, async (req: any, res) => {
  try {
    const row = await db.execute(sql`SELECT * FROM entity_attachments WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    if (!row.rows.length) return res.status(404).json({ error: "Not found" });
    const att = row.rows[0] as any;
    const absPath = path.join(process.cwd(), att.file_path);
    fs.promises.unlink(absPath).catch(() => {});
    await db.execute(sql`DELETE FROM entity_attachments WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
