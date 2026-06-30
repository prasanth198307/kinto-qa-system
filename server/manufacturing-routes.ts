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
    res.json(result.rows[0]);
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
      SELECT pe.*, p.product_name, p.cost_price
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

export default router;
