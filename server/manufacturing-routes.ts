import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

function getTenantId(req: any): number {
  return req.session?.tenantId ?? req.user?.tenantId;
}

function auth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userRole = req.user?.role;
    if (!roles.includes(userRole)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

// ─── WORK ORDERS ─────────────────────────────────────────────────────────────

// List work orders
router.get("/work-orders", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { status, productId, from, to } = req.query;

    const rows = await db.execute(sql`
      SELECT
        wo.*,
        p.product_name,
        p.product_code,
        u.name AS uom_name,
        (SELECT COUNT(*) FROM production_entries pe WHERE pe.issuance_id = wo.issuance_id AND pe.tenant_id = ${tenantId}) AS production_count
      FROM work_orders wo
      LEFT JOIN products p ON p.id = wo.product_id
      LEFT JOIN uom u ON u.id = wo.uom_id
      WHERE wo.tenant_id = ${tenantId}
        AND (${status ?? null}::text IS NULL OR wo.status = ${status ?? null})
        AND (${productId ?? null}::text IS NULL OR wo.product_id = ${productId ?? null})
        AND (${from ?? null}::date IS NULL OR wo.planned_start_date >= ${from ?? null}::date)
        AND (${to ?? null}::date IS NULL OR wo.planned_start_date <= ${to ?? null}::date)
      ORDER BY wo.created_at DESC
      LIMIT 200
    `);

    res.json(rows.rows);
  } catch (err) {
    console.error("work-orders list:", err);
    res.status(500).json({ message: "Failed to fetch work orders" });
  }
});

// Get single work order
router.get("/work-orders/:id", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const rows = await db.execute(sql`
      SELECT wo.*, p.product_name, p.product_code, u.name AS uom_name
      FROM work_orders wo
      LEFT JOIN products p ON p.id = wo.product_id
      LEFT JOIN uom u ON u.id = wo.uom_id
      WHERE wo.id = ${req.params.id} AND wo.tenant_id = ${tenantId}
    `);
    if (!rows.rows.length) return res.status(404).json({ message: "Not found" });
    res.json(rows.rows[0]);
  } catch (err) {
    console.error("work-order get:", err);
    res.status(500).json({ message: "Failed to fetch work order" });
  }
});

// Create work order
router.post("/work-orders", requireRole("admin", "manager"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const {
      productId, uomId, plannedQty, plannedStartDate, plannedEndDate,
      shift, priority, salesOrderId, notes
    } = req.body;

    if (!productId || !plannedQty || !plannedStartDate) {
      return res.status(400).json({ message: "productId, plannedQty, plannedStartDate are required" });
    }

    // Generate WO number
    const countRes = await db.execute(sql`
      SELECT COUNT(*) AS cnt FROM work_orders WHERE tenant_id = ${tenantId}
    `);
    const seq = Number((countRes.rows[0] as any).cnt) + 1;
    const woNumber = `WO-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;

    const result = await db.execute(sql`
      INSERT INTO work_orders
        (tenant_id, work_order_number, product_id, uom_id, planned_qty, produced_qty,
         status, planned_start_date, planned_end_date, shift, priority,
         sales_order_id, notes, created_by, created_at)
      VALUES
        (${tenantId}, ${woNumber}, ${productId}, ${uomId ?? null}, ${Number(plannedQty)}, 0,
         'planned', ${plannedStartDate}, ${plannedEndDate ?? null}, ${shift ?? null}, ${priority ?? "medium"},
         ${salesOrderId ?? null}, ${notes ?? null}, ${req.user?.id ?? null}, NOW())
      RETURNING *
    `);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("work-order create:", err);
    res.status(500).json({ message: "Failed to create work order" });
  }
});

// Update work order status (lifecycle: planned → released → in_progress → completed)
router.patch("/work-orders/:id/status", requireRole("admin", "manager", "operator"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { status, producedQty, rejectedQty, completedDate } = req.body;

    const allowed = ["planned", "released", "in_progress", "completed", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });
    }

    const result = await db.execute(sql`
      UPDATE work_orders SET
        status = ${status},
        produced_qty = COALESCE(${producedQty ?? null}::numeric, produced_qty),
        rejected_qty = COALESCE(${rejectedQty ?? null}::numeric, rejected_qty),
        actual_end_date = CASE WHEN ${status} = 'completed' THEN COALESCE(${completedDate ?? null}::date, CURRENT_DATE) ELSE actual_end_date END,
        actual_start_date = CASE WHEN ${status} = 'in_progress' AND actual_start_date IS NULL THEN CURRENT_DATE ELSE actual_start_date END,
        updated_at = NOW()
      WHERE id = ${req.params.id} AND tenant_id = ${tenantId}
      RETURNING *
    `);

    if (!result.rows.length) return res.status(404).json({ message: "Work order not found" });
    const wo = result.rows[0] as any;

    // Auto-post GL on completion: DR WIP / CR RM Inventory → DR FG / CR WIP
    if (status === 'completed' && wo.product_id) {
      const costRows = await db.execute(sql`
        SELECT COALESCE(p.standard_cost, 0) as cost_price
        FROM products p WHERE p.id = ${wo.product_id} AND p.tenant_id = ${tenantId}
      `).catch(() => ({ rows: [] }));
      const costPrice = Number((costRows.rows[0] as any)?.cost_price || 0);
      const costValue = costPrice * Number(producedQty || wo.planned_qty || 1);
      if (costValue > 0) {
        import("./journal-service").then(({ journalForProductionEntry }) => {
          journalForProductionEntry({ tenant_id: tenantId, id: wo.id, product_id: wo.product_id, produced_quantity: producedQty || wo.planned_qty }, wo.product_name || "Finished Goods", costValue);
        }).catch(e => console.error("GL auto-post WO:", e));
      }
    }

    res.json(wo);
  } catch (err) {
    console.error("work-order status update:", err);
    res.status(500).json({ message: "Failed to update work order status" });
  }
});

// Update work order details
router.put("/work-orders/:id", requireRole("admin", "manager"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { plannedQty, plannedStartDate, plannedEndDate, shift, priority, notes } = req.body;

    const result = await db.execute(sql`
      UPDATE work_orders SET
        planned_qty = COALESCE(${plannedQty ?? null}::numeric, planned_qty),
        planned_start_date = COALESCE(${plannedStartDate ?? null}::date, planned_start_date),
        planned_end_date = COALESCE(${plannedEndDate ?? null}::date, planned_end_date),
        shift = COALESCE(${shift ?? null}, shift),
        priority = COALESCE(${priority ?? null}, priority),
        notes = COALESCE(${notes ?? null}, notes),
        updated_at = NOW()
      WHERE id = ${req.params.id} AND tenant_id = ${tenantId} AND status NOT IN ('completed', 'cancelled')
      RETURNING *
    `);

    if (!result.rows.length) return res.status(404).json({ message: "Work order not found or already completed" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("work-order update:", err);
    res.status(500).json({ message: "Failed to update work order" });
  }
});

// Work order summary dashboard
router.get("/work-orders/summary/dashboard", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);

    const [summary, byStatus, overdue] = await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'planned') AS planned,
          COUNT(*) FILTER (WHERE status = 'released') AS released,
          COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
          COUNT(*) FILTER (WHERE status = 'completed') AS completed,
          COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
          COALESCE(SUM(planned_qty) FILTER (WHERE status NOT IN ('completed','cancelled')), 0) AS total_planned_qty,
          COALESCE(SUM(produced_qty), 0) AS total_produced_qty
        FROM work_orders
        WHERE tenant_id = ${tenantId}
          AND created_at >= NOW() - INTERVAL '30 days'
      `),
      db.execute(sql`
        SELECT status, COUNT(*) AS count, COALESCE(SUM(planned_qty), 0) AS total_qty
        FROM work_orders WHERE tenant_id = ${tenantId}
        GROUP BY status
      `),
      db.execute(sql`
        SELECT wo.*, p.product_name
        FROM work_orders wo
        LEFT JOIN products p ON p.id = wo.product_id
        WHERE wo.tenant_id = ${tenantId}
          AND wo.planned_end_date < CURRENT_DATE
          AND wo.status NOT IN ('completed', 'cancelled')
        ORDER BY wo.planned_end_date ASC
        LIMIT 10
      `),
    ]);

    res.json({
      summary: summary.rows[0],
      by_status: byStatus.rows,
      overdue: overdue.rows,
    });
  } catch (err) {
    console.error("work-order dashboard:", err);
    res.status(500).json({ message: "Failed to fetch dashboard" });
  }
});

// ─── MRP ENGINE ──────────────────────────────────────────────────────────────

// MRP: compute what needs to be produced based on open sales orders
router.get("/mrp/requirements", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { horizon = 30 } = req.query; // days ahead

    // Open sales orders / pending invoices due within horizon
    const demand = await db.execute(sql`
      SELECT
        ii.product_id,
        p.product_name,
        p.product_code,
        SUM(ii.quantity) AS total_demand,
        MIN(i.due_date) AS earliest_due
      FROM invoice_items ii
      JOIN invoices i ON i.id = ii.invoice_id AND i.tenant_id = ${tenantId}
      JOIN products p ON p.id = ii.product_id
      WHERE i.status NOT IN ('paid', 'cancelled')
        AND (i.due_date IS NULL OR i.due_date <= CURRENT_DATE + (${Number(horizon)} || ' days')::interval)
      GROUP BY ii.product_id, p.product_name, p.product_code
    `);

    // Current finished goods stock
    const stock = await db.execute(sql`
      SELECT product_id, COALESCE(SUM(quantity), 0) AS on_hand
      FROM finished_goods
      WHERE tenant_id = ${tenantId} AND status = 'approved'
      GROUP BY product_id
    `);

    // Open work orders (already planned)
    const woPlanned = await db.execute(sql`
      SELECT product_id, COALESCE(SUM(planned_qty - produced_qty), 0) AS planned
      FROM work_orders
      WHERE tenant_id = ${tenantId} AND status NOT IN ('completed', 'cancelled')
      GROUP BY product_id
    `);

    const stockMap: Record<string, number> = {};
    for (const r of stock.rows as any[]) stockMap[r.product_id] = Number(r.on_hand);

    const woMap: Record<string, number> = {};
    for (const r of woPlanned.rows as any[]) woMap[r.product_id] = Number(r.planned);

    const requirements = (demand.rows as any[]).map((d) => {
      const demandQty = Number(d.total_demand);
      const onHand = stockMap[d.product_id] ?? 0;
      const alreadyPlanned = woMap[d.product_id] ?? 0;
      const netRequirement = Math.max(0, demandQty - onHand - alreadyPlanned);
      return {
        product_id: d.product_id,
        product_name: d.product_name,
        product_code: d.product_code,
        demand: demandQty,
        on_hand: onHand,
        already_planned: alreadyPlanned,
        net_requirement: netRequirement,
        earliest_due: d.earliest_due,
        action: netRequirement > 0 ? "CREATE_WORK_ORDER" : "SUFFICIENT",
      };
    });

    res.json({
      horizon_days: Number(horizon),
      computed_at: new Date().toISOString(),
      requirements,
      summary: {
        total_products: requirements.length,
        need_production: requirements.filter((r) => r.action === "CREATE_WORK_ORDER").length,
        sufficient: requirements.filter((r) => r.action === "SUFFICIENT").length,
      },
    });
  } catch (err) {
    console.error("mrp requirements:", err);
    res.status(500).json({ message: "Failed to compute MRP requirements" });
  }
});

// MRP: auto-create work orders from net requirements
router.post("/mrp/create-work-orders", requireRole("admin", "manager"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { requirements } = req.body as { requirements: Array<{ product_id: string; net_requirement: number; earliest_due?: string }> };

    if (!requirements?.length) return res.status(400).json({ message: "requirements array required" });

    const created: any[] = [];
    for (const r of requirements) {
      if (r.net_requirement <= 0) continue;

      const countRes = await db.execute(sql`SELECT COUNT(*) AS cnt FROM work_orders WHERE tenant_id = ${tenantId}`);
      const seq = Number((countRes.rows[0] as any).cnt) + 1 + created.length;
      const woNumber = `WO-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;

      const startDate = new Date();
      const endDate = r.earliest_due ? new Date(r.earliest_due) : new Date(Date.now() + 7 * 86400000);

      const result = await db.execute(sql`
        INSERT INTO work_orders
          (tenant_id, work_order_number, product_id, planned_qty, produced_qty,
           status, planned_start_date, planned_end_date, priority, notes, created_by, created_at)
        VALUES
          (${tenantId}, ${woNumber}, ${r.product_id}, ${r.net_requirement}, 0,
           'planned', ${startDate.toISOString().slice(0, 10)}, ${endDate.toISOString().slice(0, 10)},
           'medium', 'Auto-created by MRP engine', ${req.user?.id ?? null}, NOW())
        RETURNING *
      `);
      created.push(result.rows[0]);
    }

    res.status(201).json({ created: created.length, work_orders: created });
  } catch (err) {
    console.error("mrp create-work-orders:", err);
    res.status(500).json({ message: "Failed to create work orders from MRP" });
  }
});

// ─── PRODUCTION GL BACKFILL ───────────────────────────────────────────────────
// Fix: allow GL posting even when RM unit_cost = 0 by using product standard cost as fallback

router.post("/production/gl-post/:productionEntryId", requireRole("admin", "manager"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { productionEntryId } = req.params;
    const { manualCostValue } = req.body; // admin can provide cost if auto-calc fails

    const peRows = await db.execute(sql`
      SELECT pe.*, p.product_name, p.standard_cost
      FROM production_entries pe
      LEFT JOIN products p ON p.id = pe.product_id
      WHERE pe.id = ${productionEntryId} AND pe.tenant_id = ${tenantId}
    `);

    if (!peRows.rows.length) return res.status(404).json({ message: "Production entry not found" });
    const pe = peRows.rows[0] as any;

    // Try RM cost first, then product standard cost, then manual
    let costValue = Number(manualCostValue ?? 0);
    if (!costValue && pe.issuance_id) {
      const issItems = await db.execute(sql`
        SELECT rmii.quantity_issued, rm.unit_cost
        FROM raw_material_issuance_items rmii
        LEFT JOIN raw_materials rm ON rmii.raw_material_id = rm.id
        WHERE rmii.issuance_id = ${pe.issuance_id}
      `);
      for (const item of issItems.rows as any[]) {
        costValue += (Number(item.quantity_issued) || 0) * (Number(item.unit_cost) || 0);
      }
    }
    // Fallback: product standard cost × produced qty
    if (!costValue && pe.cost_price && pe.produced_quantity) {
      costValue = Number(pe.cost_price) * Number(pe.produced_quantity);
    }

    if (!costValue) {
      return res.status(400).json({
        message: "Cannot compute cost: raw materials have no unit_cost and product has no cost_price. Provide manualCostValue.",
      });
    }

    const { journalForProductionEntry } = await import("./journal-service");
    await journalForProductionEntry(pe, pe.product_name || "Product", costValue);

    res.json({ success: true, cost_value: costValue, message: "GL entry posted for production entry" });
  } catch (err) {
    console.error("production gl-post:", err);
    res.status(500).json({ message: "Failed to post GL entry" });
  }
});

// ── BARCODE / QR SCAN ──────────────────────────────────────────────────────────

async function initBarcodeTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mfg_barcode_registry (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      barcode VARCHAR(100) NOT NULL,
      item_type VARCHAR(30) NOT NULL, -- 'raw_material','finished_goods','grn','work_order'
      item_id INT NOT NULL,
      item_name VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, barcode)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mfg_stock_movements (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      barcode VARCHAR(100),
      item_type VARCHAR(30),
      item_id INT,
      item_name VARCHAR(255),
      movement_type VARCHAR(30) NOT NULL, -- 'grn_receive','issue_to_production','stock_transfer','dispatch'
      quantity NUMERIC(15,3) NOT NULL,
      from_location VARCHAR(100),
      to_location VARCHAR(100),
      reference_no VARCHAR(100),
      scanned_by INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// GET /api/manufacturing/barcode/lookup?code=X — resolve barcode to item
router.get("/barcode/lookup", auth, async (req: any, res) => {
  await initBarcodeTable();
  const tenantId = getTenantId(req);
  const { code } = req.query;
  if (!code) return res.status(400).json({ message: "code required" });
  const rows = await db.execute(sql`
    SELECT * FROM mfg_barcode_registry WHERE tenant_id = ${tenantId} AND barcode = ${String(code)}
  `);
  if (!rows.rows.length) {
    // Fallback: look up raw materials by barcode/item_code field
    const rm = await db.execute(sql`
      SELECT id, name as item_name, 'raw_material' as item_type, item_code as barcode_match FROM raw_materials
      WHERE tenant_id = ${tenantId} AND (item_code = ${String(code)} OR id::text = ${String(code)}) LIMIT 1
    `).catch(() => ({ rows: [] }));
    if ((rm.rows as any[]).length) return res.json({ found: true, source: 'raw_materials', item: rm.rows[0] });
    return res.json({ found: false, message: "Barcode not found" });
  }
  res.json({ found: true, source: 'registry', item: rows.rows[0] });
});

// POST /api/manufacturing/barcode/register — register barcode for an item
router.post("/barcode/register", requireRole("admin", "manager"), async (req: any, res) => {
  await initBarcodeTable();
  const tenantId = getTenantId(req);
  const { barcode, item_type, item_id, item_name } = req.body;
  const row = await db.execute(sql`
    INSERT INTO mfg_barcode_registry (tenant_id, barcode, item_type, item_id, item_name)
    VALUES (${tenantId}, ${barcode}, ${item_type}, ${item_id}, ${item_name ?? null})
    ON CONFLICT (tenant_id, barcode) DO UPDATE SET item_type=EXCLUDED.item_type, item_id=EXCLUDED.item_id, item_name=EXCLUDED.item_name
    RETURNING *
  `);
  res.json(row.rows[0]);
});

// POST /api/manufacturing/barcode/grn-scan — scan barcode on GRN receipt
router.post("/barcode/grn-scan", requireRole("admin", "manager", "operator"), async (req: any, res) => {
  await initBarcodeTable();
  const tenantId = getTenantId(req);
  const { barcode, quantity, grn_id, location } = req.body;
  // Log movement
  await db.execute(sql`
    INSERT INTO mfg_stock_movements (tenant_id, barcode, movement_type, quantity, from_location, to_location, reference_no, scanned_by)
    VALUES (${tenantId}, ${barcode}, 'grn_receive', ${quantity}, 'supplier', ${location ?? 'warehouse'}, ${grn_id ? `GRN-${grn_id}` : null}, ${(req as any).user?.id ?? null})
  `);
  // Update GRN item qty if grn_id provided
  if (grn_id) {
    const lookup = await db.execute(sql`
      SELECT * FROM mfg_barcode_registry WHERE tenant_id = ${tenantId} AND barcode = ${barcode}
    `).catch(() => ({ rows: [] }));
    const item = (lookup.rows[0] as any);
    if (item?.item_type === 'raw_material' && item?.item_id) {
      await db.execute(sql`
        UPDATE goods_receipt_items SET received_qty = COALESCE(received_qty, 0) + ${quantity}
        WHERE grn_id = ${grn_id} AND raw_material_id = ${item.item_id}
      `).catch(() => {});
    }
  }
  res.json({ success: true, message: `GRN scan recorded: ${quantity} units of ${barcode}` });
});

// POST /api/manufacturing/barcode/stock-move — general stock movement scan
router.post("/barcode/stock-move", requireRole("admin", "manager", "operator"), async (req: any, res) => {
  await initBarcodeTable();
  const tenantId = getTenantId(req);
  const { barcode, quantity, movement_type, from_location, to_location, reference_no } = req.body;
  const row = await db.execute(sql`
    INSERT INTO mfg_stock_movements (tenant_id, barcode, movement_type, quantity, from_location, to_location, reference_no, scanned_by)
    VALUES (${tenantId}, ${barcode}, ${movement_type}, ${quantity}, ${from_location ?? null}, ${to_location ?? null}, ${reference_no ?? null}, ${(req as any).user?.id ?? null})
    RETURNING *
  `);
  res.json(row.rows[0]);
});

// GET /api/manufacturing/barcode/movements — stock movement log
router.get("/barcode/movements", auth, async (req: any, res) => {
  await initBarcodeTable();
  const tenantId = getTenantId(req);
  const rows = await db.execute(sql`
    SELECT * FROM mfg_stock_movements WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC LIMIT 200
  `);
  res.json(rows.rows);
});

// GET /api/manufacturing/barcode/registry — all registered barcodes
router.get("/barcode/registry", auth, async (req: any, res) => {
  await initBarcodeTable();
  const tenantId = getTenantId(req);
  const rows = await db.execute(sql`SELECT * FROM mfg_barcode_registry WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`);
  res.json(rows.rows);
});

// ── PREVENTIVE MAINTENANCE SCHEDULER ──────────────────────────────────────────

async function initPMTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mfg_pm_schedules (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      machine_name VARCHAR(255) NOT NULL,
      machine_id INT,
      task_name VARCHAR(255) NOT NULL,
      frequency VARCHAR(30) NOT NULL, -- 'daily','weekly','monthly','quarterly','annual','hours_based'
      frequency_value INT DEFAULT 1,
      last_performed_date DATE,
      next_due_date DATE NOT NULL,
      estimated_hours NUMERIC(5,2) DEFAULT 1,
      assigned_to INT,
      priority VARCHAR(20) DEFAULT 'medium',
      checklist TEXT,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mfg_pm_work_orders (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      schedule_id INT NOT NULL,
      machine_name VARCHAR(255),
      task_name VARCHAR(255),
      due_date DATE,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      status VARCHAR(20) DEFAULT 'pending',
      technician_notes TEXT,
      parts_used JSONB,
      downtime_minutes INT DEFAULT 0,
      oee_impact_pct NUMERIC(5,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// GET /api/manufacturing/pm/schedules
router.get("/pm/schedules", auth, async (req: any, res) => {
  await initPMTables();
  const tenantId = getTenantId(req);
  const rows = await db.execute(sql`
    SELECT ps.*,
      (SELECT COUNT(*) FROM mfg_pm_work_orders pw WHERE pw.schedule_id = ps.id AND pw.status = 'pending') AS pending_wo,
      CASE WHEN ps.next_due_date < CURRENT_DATE THEN 'overdue'
           WHEN ps.next_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
           ELSE 'ok' END AS urgency
    FROM mfg_pm_schedules ps
    WHERE ps.tenant_id = ${tenantId} AND ps.status = 'active'
    ORDER BY ps.next_due_date ASC
  `);
  res.json(rows.rows);
});

// POST /api/manufacturing/pm/schedules
router.post("/pm/schedules", requireRole("admin", "manager"), async (req: any, res) => {
  await initPMTables();
  const tenantId = getTenantId(req);
  const { machine_name, machine_id, task_name, frequency, frequency_value, next_due_date, estimated_hours, priority, checklist } = req.body;
  const row = await db.execute(sql`
    INSERT INTO mfg_pm_schedules (tenant_id, machine_name, machine_id, task_name, frequency, frequency_value, next_due_date, estimated_hours, priority, checklist)
    VALUES (${tenantId}, ${machine_name}, ${machine_id ?? null}, ${task_name}, ${frequency}, ${frequency_value ?? 1}, ${next_due_date}, ${estimated_hours ?? 1}, ${priority ?? 'medium'}, ${checklist ?? null})
    RETURNING *
  `);
  res.json(row.rows[0]);
});

// DELETE /api/manufacturing/pm/schedules/:id
router.delete("/pm/schedules/:id", requireRole("admin", "manager"), async (req: any, res) => {
  const tenantId = getTenantId(req);
  await db.execute(sql`UPDATE mfg_pm_schedules SET status='inactive' WHERE id = ${req.params.id} AND tenant_id = ${tenantId}`);
  res.json({ success: true });
});

// GET /api/manufacturing/pm/work-orders
router.get("/pm/work-orders", auth, async (req: any, res) => {
  await initPMTables();
  const tenantId = getTenantId(req);
  const rows = await db.execute(sql`
    SELECT pw.*, ps.frequency, ps.priority
    FROM mfg_pm_work_orders pw
    LEFT JOIN mfg_pm_schedules ps ON ps.id = pw.schedule_id
    WHERE ps.tenant_id = ${tenantId}
    ORDER BY pw.due_date ASC
    LIMIT 100
  `);
  res.json(rows.rows);
});

// POST /api/manufacturing/pm/generate-work-orders — generate WOs for due schedules
router.post("/pm/generate-work-orders", requireRole("admin", "manager"), async (req: any, res) => {
  await initPMTables();
  const tenantId = getTenantId(req);
  const due = await db.execute(sql`
    SELECT * FROM mfg_pm_schedules
    WHERE tenant_id = ${tenantId} AND status = 'active' AND next_due_date <= CURRENT_DATE + INTERVAL '7 days'
  `);
  let created = 0;
  for (const sched of due.rows as any[]) {
    const existing = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM mfg_pm_work_orders WHERE schedule_id = ${sched.id} AND status IN ('pending','in_progress') AND due_date = ${sched.next_due_date}
    `);
    if (Number((existing.rows[0] as any)?.cnt || 0) === 0) {
      await db.execute(sql`
        INSERT INTO mfg_pm_work_orders (tenant_id, schedule_id, machine_name, task_name, due_date)
        VALUES (${tenantId}, ${sched.id}, ${sched.machine_name}, ${sched.task_name}, ${sched.next_due_date})
      `);
      created++;
    }
  }
  res.json({ created, message: `${created} maintenance work orders generated` });
});

// PATCH /api/manufacturing/pm/work-orders/:id/complete
router.patch("/pm/work-orders/:id/complete", requireRole("admin", "manager", "operator"), async (req: any, res) => {
  await initPMTables();
  const tenantId = getTenantId(req);
  const { technician_notes, parts_used, downtime_minutes } = req.body;
  const result = await db.execute(sql`
    UPDATE mfg_pm_work_orders SET
      status = 'completed', completed_at = NOW(),
      technician_notes = ${technician_notes ?? null},
      parts_used = ${parts_used ? JSON.stringify(parts_used) : null},
      downtime_minutes = ${downtime_minutes ?? 0}
    WHERE id = ${req.params.id}
    RETURNING *
  `);
  if (!result.rows.length) return res.status(404).json({ message: "PM work order not found" });
  const wo = result.rows[0] as any;
  // Advance next due date on the schedule
  await db.execute(sql`
    UPDATE mfg_pm_schedules SET
      last_performed_date = CURRENT_DATE,
      next_due_date = CASE frequency
        WHEN 'daily' THEN CURRENT_DATE + INTERVAL '1 day'
        WHEN 'weekly' THEN CURRENT_DATE + INTERVAL '7 days'
        WHEN 'monthly' THEN CURRENT_DATE + INTERVAL '1 month'
        WHEN 'quarterly' THEN CURRENT_DATE + INTERVAL '3 months'
        WHEN 'annual' THEN CURRENT_DATE + INTERVAL '1 year'
        ELSE CURRENT_DATE + INTERVAL '1 month'
      END
    WHERE id = ${wo.schedule_id}
  `);
  res.json(wo);
});

// ── SUPPLIER PORTAL + LANDED COST ──────────────────────────────────────────────

async function initSupplyChainTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mfg_supplier_shipments (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      vendor_id INT,
      po_reference VARCHAR(100),
      shipment_no VARCHAR(100),
      origin_country VARCHAR(100),
      destination VARCHAR(100),
      mode_of_transport VARCHAR(30) DEFAULT 'sea',
      vessel_flight VARCHAR(100),
      bl_no VARCHAR(100),
      awb_no VARCHAR(100),
      etd DATE,
      eta DATE,
      status VARCHAR(30) DEFAULT 'in_transit',
      tracking_url TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mfg_landed_costs (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      shipment_id INT,
      grn_id INT,
      po_reference VARCHAR(100),
      freight_amount NUMERIC(15,2) DEFAULT 0,
      insurance_amount NUMERIC(15,2) DEFAULT 0,
      customs_duty NUMERIC(15,2) DEFAULT 0,
      port_charges NUMERIC(15,2) DEFAULT 0,
      cha_charges NUMERIC(15,2) DEFAULT 0,
      other_charges NUMERIC(15,2) DEFAULT 0,
      total_landed_cost NUMERIC(15,2) GENERATED ALWAYS AS (freight_amount + insurance_amount + customs_duty + port_charges + cha_charges + other_charges) STORED,
      allocation_method VARCHAR(30) DEFAULT 'value', -- 'value','weight','quantity'
      gl_posted BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mfg_import_docs (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      shipment_id INT,
      doc_type VARCHAR(50) NOT NULL, -- 'bill_of_lading','commercial_invoice','packing_list','coo','insurance_cert','be_number'
      doc_no VARCHAR(100),
      doc_date DATE,
      issuer VARCHAR(255),
      file_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// GET /api/manufacturing/supply-chain/shipments
router.get("/supply-chain/shipments", auth, async (req: any, res) => {
  await initSupplyChainTables();
  const tenantId = getTenantId(req);
  const rows = await db.execute(sql`
    SELECT ss.*, v.vendor_name
    FROM mfg_supplier_shipments ss
    LEFT JOIN vendors v ON v.id = ss.vendor_id
    WHERE ss.tenant_id = ${tenantId}
    ORDER BY ss.eta ASC, ss.created_at DESC LIMIT 100
  `);
  res.json(rows.rows);
});

// POST /api/manufacturing/supply-chain/shipments
router.post("/supply-chain/shipments", requireRole("admin", "manager"), async (req: any, res) => {
  await initSupplyChainTables();
  const tenantId = getTenantId(req);
  const { vendor_id, po_reference, shipment_no, origin_country, destination, mode_of_transport, vessel_flight, bl_no, awb_no, etd, eta, tracking_url, notes } = req.body;
  const row = await db.execute(sql`
    INSERT INTO mfg_supplier_shipments (tenant_id, vendor_id, po_reference, shipment_no, origin_country, destination, mode_of_transport, vessel_flight, bl_no, awb_no, etd, eta, tracking_url, notes)
    VALUES (${tenantId}, ${vendor_id ?? null}, ${po_reference ?? null}, ${shipment_no ?? null}, ${origin_country ?? null}, ${destination ?? null}, ${mode_of_transport ?? 'sea'}, ${vessel_flight ?? null}, ${bl_no ?? null}, ${awb_no ?? null}, ${etd ?? null}, ${eta ?? null}, ${tracking_url ?? null}, ${notes ?? null})
    RETURNING *
  `);
  res.json(row.rows[0]);
});

// PATCH /api/manufacturing/supply-chain/shipments/:id/status
router.patch("/supply-chain/shipments/:id/status", requireRole("admin", "manager"), async (req: any, res) => {
  const tenantId = getTenantId(req);
  const { status } = req.body;
  const row = await db.execute(sql`
    UPDATE mfg_supplier_shipments SET status = ${status} WHERE id = ${req.params.id} AND tenant_id = ${tenantId} RETURNING *
  `);
  res.json(row.rows[0]);
});

// GET /api/manufacturing/supply-chain/landed-costs
router.get("/supply-chain/landed-costs", auth, async (req: any, res) => {
  await initSupplyChainTables();
  const tenantId = getTenantId(req);
  const rows = await db.execute(sql`
    SELECT lc.*, ss.shipment_no, ss.vendor_id
    FROM mfg_landed_costs lc
    LEFT JOIN mfg_supplier_shipments ss ON ss.id = lc.shipment_id
    WHERE lc.tenant_id = ${tenantId}
    ORDER BY lc.created_at DESC LIMIT 100
  `);
  res.json(rows.rows);
});

// POST /api/manufacturing/supply-chain/landed-costs
router.post("/supply-chain/landed-costs", requireRole("admin", "manager"), async (req: any, res) => {
  await initSupplyChainTables();
  const tenantId = getTenantId(req);
  const { shipment_id, grn_id, po_reference, freight_amount, insurance_amount, customs_duty, port_charges, cha_charges, other_charges, allocation_method } = req.body;
  const row = await db.execute(sql`
    INSERT INTO mfg_landed_costs (tenant_id, shipment_id, grn_id, po_reference, freight_amount, insurance_amount, customs_duty, port_charges, cha_charges, other_charges, allocation_method)
    VALUES (${tenantId}, ${shipment_id ?? null}, ${grn_id ?? null}, ${po_reference ?? null}, ${freight_amount ?? 0}, ${insurance_amount ?? 0}, ${customs_duty ?? 0}, ${port_charges ?? 0}, ${cha_charges ?? 0}, ${other_charges ?? 0}, ${allocation_method ?? 'value'})
    RETURNING *
  `);
  const lc = row.rows[0] as any;
  // Fire-and-forget GL: DR Inventory (landed cost) / CR Freight/Customs Payable
  if (lc.total_landed_cost > 0) {
    import("./journal-service").then(({ createJournalWithLines }) => {
      createJournalWithLines(tenantId, `Landed Cost - ${po_reference || `LC-${lc.id}`}`, [
        { accountCode: "1310", description: "Inventory Landed Cost", debit: Math.round(lc.total_landed_cost * 100), credit: 0 },
        { accountCode: "2210", description: "Freight & Customs Payable", debit: 0, credit: Math.round(lc.total_landed_cost * 100) },
      ]);
    }).catch(e => console.error("GL landed cost:", e));
  }
  res.json(lc);
});

// GET /api/manufacturing/supply-chain/import-docs/:shipmentId
router.get("/supply-chain/import-docs/:shipmentId", auth, async (req: any, res) => {
  await initSupplyChainTables();
  const tenantId = getTenantId(req);
  const rows = await db.execute(sql`
    SELECT d.* FROM mfg_import_docs d
    JOIN mfg_supplier_shipments ss ON ss.id = d.shipment_id
    WHERE d.shipment_id = ${req.params.shipmentId} AND ss.tenant_id = ${tenantId}
    ORDER BY d.created_at
  `);
  res.json(rows.rows);
});

// POST /api/manufacturing/supply-chain/import-docs
router.post("/supply-chain/import-docs", requireRole("admin", "manager"), async (req: any, res) => {
  await initSupplyChainTables();
  const tenantId = getTenantId(req);
  const { shipment_id, doc_type, doc_no, doc_date, issuer } = req.body;
  const row = await db.execute(sql`
    INSERT INTO mfg_import_docs (tenant_id, shipment_id, doc_type, doc_no, doc_date, issuer)
    VALUES (${tenantId}, ${shipment_id}, ${doc_type}, ${doc_no ?? null}, ${doc_date ?? null}, ${issuer ?? null})
    RETURNING *
  `);
  res.json(row.rows[0]);
});

export default router;
