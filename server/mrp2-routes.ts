import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import PDFDocument from "pdfkit";

export const mrp2Router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
};
const tid = (req: any): number => req.session?.tenantId ?? req.user?.tenantId ?? 1;

// ─── CREATE TABLES ────────────────────────────────────────────────────────────
async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mfg_bom_versions (
      id SERIAL PRIMARY KEY, tenant_id INT,
      product_id INT, product_name VARCHAR(300),
      version_no VARCHAR(20),
      effective_from DATE, effective_to DATE,
      ecn_no VARCHAR(100),
      change_description TEXT, change_reason TEXT,
      approved_by VARCHAR(200), approved_at TIMESTAMPTZ,
      status VARCHAR(20) DEFAULT 'draft',
      is_active BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mfg_bom_items (
      id SERIAL PRIMARY KEY, tenant_id INT, bom_version_id INT,
      parent_item_id INT,
      level INT DEFAULT 0,
      item_code VARCHAR(100), item_name VARCHAR(300),
      item_type VARCHAR(30) DEFAULT 'component',
      quantity NUMERIC(10,4), unit VARCHAR(20),
      scrap_pct NUMERIC(5,2) DEFAULT 0,
      lead_time_days INT DEFAULT 0,
      make_or_buy VARCHAR(10) DEFAULT 'buy',
      unit_cost NUMERIC(10,2) DEFAULT 0,
      is_phantom BOOLEAN DEFAULT FALSE,
      cbom_config JSONB DEFAULT '{}',
      notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mfg_ecn (
      id SERIAL PRIMARY KEY, tenant_id INT,
      ecn_no VARCHAR(100), title VARCHAR(300),
      product_id INT, product_name VARCHAR(300),
      old_bom_version_id INT, new_bom_version_id INT,
      change_type VARCHAR(50),
      description TEXT, reason TEXT,
      impact_assessment TEXT, affected_work_orders INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'draft',
      initiated_by VARCHAR(200), approved_by VARCHAR(200),
      effective_date DATE, created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mfg_mrp_runs (
      id SERIAL PRIMARY KEY, tenant_id INT,
      run_date DATE DEFAULT CURRENT_DATE, run_type VARCHAR(20) DEFAULT 'full',
      horizon_days INT DEFAULT 90,
      status VARCHAR(20) DEFAULT 'running',
      demands_processed INT DEFAULT 0,
      planned_orders JSONB DEFAULT '[]',
      purchase_recommendations JSONB DEFAULT '[]',
      production_recommendations JSONB DEFAULT '[]',
      exception_messages JSONB DEFAULT '[]',
      completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mfg_capacity_plan (
      id SERIAL PRIMARY KEY, tenant_id INT,
      work_center_id INT, work_center_name VARCHAR(200),
      week_start DATE,
      available_hours NUMERIC(6,2),
      planned_hours NUMERIC(6,2) DEFAULT 0,
      actual_hours NUMERIC(6,2) DEFAULT 0,
      utilization_pct NUMERIC(5,2) DEFAULT 0,
      is_bottleneck BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mfg_work_centers (
      id SERIAL PRIMARY KEY, tenant_id INT,
      name VARCHAR(200), code VARCHAR(50), department VARCHAR(100),
      capacity_per_shift NUMERIC(8,2), shifts_per_day INT DEFAULT 1,
      workers_per_shift INT DEFAULT 1, efficiency_pct NUMERIC(5,2) DEFAULT 85,
      is_active BOOLEAN DEFAULT TRUE
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mfg_supplier_portal_tokens (
      id SERIAL PRIMARY KEY, tenant_id INT, supplier_id INT,
      supplier_name VARCHAR(300), token VARCHAR(100) UNIQUE,
      expires_at TIMESTAMPTZ, is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mfg_landed_costs (
      id SERIAL PRIMARY KEY, tenant_id INT, purchase_order_id INT,
      freight NUMERIC(10,2) DEFAULT 0, insurance NUMERIC(10,2) DEFAULT 0,
      customs_duty NUMERIC(10,2) DEFAULT 0, customs_clearing NUMERIC(10,2) DEFAULT 0,
      port_charges NUMERIC(10,2) DEFAULT 0, other_charges NUMERIC(10,2) DEFAULT 0,
      total_landed_cost NUMERIC(12,2) DEFAULT 0,
      allocation_method VARCHAR(30) DEFAULT 'value',
      allocated_to_items JSONB DEFAULT '[]',
      gl_posted BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

let tablesReady = false;
async function initTables() {
  if (!tablesReady) {
    await ensureTables();
    tablesReady = true;
  }
}

// ─── BOM VERSIONS ─────────────────────────────────────────────────────────────

// GET /api/mrp/bom — list BOMs (latest active version per product)
mrp2Router.get("/bom", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const rows = await db.execute(sql`
      SELECT DISTINCT ON (product_id) *
      FROM mfg_bom_versions
      WHERE tenant_id = ${tenantId}
      ORDER BY product_id, is_active DESC, created_at DESC
    `);
    res.json(rows.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/mrp/bom — create new BOM version
mrp2Router.post("/bom", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const { product_id, product_name, version_no, effective_from, change_description, change_reason } = req.body;
    const row = await db.execute(sql`
      INSERT INTO mfg_bom_versions (tenant_id, product_id, product_name, version_no, effective_from, change_description, change_reason)
      VALUES (${tenantId}, ${product_id}, ${product_name}, ${version_no}, ${effective_from ?? null}, ${change_description ?? null}, ${change_reason ?? null})
      RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/mrp/bom/:productId/versions
mrp2Router.get("/bom/:productId/versions", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const rows = await db.execute(sql`
      SELECT * FROM mfg_bom_versions
      WHERE tenant_id = ${tenantId} AND product_id = ${req.params.productId}
      ORDER BY created_at DESC
    `);
    res.json(rows.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/mrp/bom/:versionId/activate
mrp2Router.post("/bom/:versionId/activate", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const versionId = parseInt(req.params.versionId);
    // Get product_id for this version
    const ver = await db.execute(sql`SELECT product_id FROM mfg_bom_versions WHERE id = ${versionId} AND tenant_id = ${tenantId}`);
    if (!ver.rows.length) return res.status(404).json({ message: "Version not found" });
    const productId = (ver.rows[0] as any).product_id;
    // Deactivate all versions for this product
    await db.execute(sql`UPDATE mfg_bom_versions SET is_active = FALSE WHERE product_id = ${productId} AND tenant_id = ${tenantId}`);
    // Activate the selected version
    await db.execute(sql`UPDATE mfg_bom_versions SET is_active = TRUE, status = 'approved' WHERE id = ${versionId}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/mrp/bom/:versionId/items — add item to BOM
mrp2Router.post("/bom/:versionId/items", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const { parent_item_id, item_code, item_name, item_type, quantity, unit, scrap_pct, is_phantom, make_or_buy, unit_cost, lead_time_days, level, notes } = req.body;
    const row = await db.execute(sql`
      INSERT INTO mfg_bom_items (tenant_id, bom_version_id, parent_item_id, item_code, item_name, item_type, quantity, unit, scrap_pct, is_phantom, make_or_buy, unit_cost, lead_time_days, level, notes)
      VALUES (${tenantId}, ${req.params.versionId}, ${parent_item_id ?? null}, ${item_code}, ${item_name}, ${item_type ?? 'component'}, ${quantity}, ${unit ?? 'pcs'}, ${scrap_pct ?? 0}, ${is_phantom ?? false}, ${make_or_buy ?? 'buy'}, ${unit_cost ?? 0}, ${lead_time_days ?? 0}, ${level ?? 0}, ${notes ?? null})
      RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/mrp/bom/items/:itemId
mrp2Router.put("/bom/items/:itemId", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const { item_code, item_name, item_type, quantity, unit, scrap_pct, is_phantom, make_or_buy, unit_cost, lead_time_days, notes } = req.body;
    const row = await db.execute(sql`
      UPDATE mfg_bom_items SET
        item_code = COALESCE(${item_code ?? null}, item_code),
        item_name = COALESCE(${item_name ?? null}, item_name),
        item_type = COALESCE(${item_type ?? null}, item_type),
        quantity = COALESCE(${quantity ?? null}, quantity),
        unit = COALESCE(${unit ?? null}, unit),
        scrap_pct = COALESCE(${scrap_pct ?? null}, scrap_pct),
        is_phantom = COALESCE(${is_phantom ?? null}, is_phantom),
        make_or_buy = COALESCE(${make_or_buy ?? null}, make_or_buy),
        unit_cost = COALESCE(${unit_cost ?? null}, unit_cost),
        lead_time_days = COALESCE(${lead_time_days ?? null}, lead_time_days),
        notes = COALESCE(${notes ?? null}, notes)
      WHERE id = ${req.params.itemId}
      RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/mrp/bom/items/:itemId
mrp2Router.delete("/bom/items/:itemId", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    await db.execute(sql`DELETE FROM mfg_bom_items WHERE id = ${req.params.itemId}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/mrp/bom/:productId/explode — multi-level BOM explosion
mrp2Router.get("/bom/:productId/explode", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const productId = req.params.productId;
    // Get active BOM version
    const ver = await db.execute(sql`
      SELECT id FROM mfg_bom_versions
      WHERE tenant_id = ${tenantId} AND product_id = ${productId} AND is_active = TRUE
      LIMIT 1
    `);
    if (!ver.rows.length) return res.status(404).json({ message: "No active BOM version found" });
    const versionId = (ver.rows[0] as any).id;

    const tree = await db.execute(sql`
      WITH RECURSIVE bom_tree AS (
        SELECT id, parent_item_id, item_code, item_name, quantity::numeric, level, is_phantom, make_or_buy, unit, scrap_pct, unit_cost
        FROM mfg_bom_items WHERE bom_version_id = ${versionId} AND parent_item_id IS NULL
        UNION ALL
        SELECT i.id, i.parent_item_id, i.item_code, i.item_name, (i.quantity * t.quantity)::numeric, i.level, i.is_phantom, i.make_or_buy, i.unit, i.scrap_pct, i.unit_cost
        FROM mfg_bom_items i JOIN bom_tree t ON i.parent_item_id = t.id
      )
      SELECT * FROM bom_tree ORDER BY level, id
    `);

    // Flatten material list (excluding phantoms, aggregating quantities)
    const flatMap: Record<string, any> = {};
    const treeRows = tree.rows as any[];
    for (const r of treeRows) {
      if (!r.is_phantom) {
        const key = r.item_code;
        if (!flatMap[key]) {
          flatMap[key] = { item_code: r.item_code, item_name: r.item_name, total_qty: 0, unit: r.unit, make_or_buy: r.make_or_buy, unit_cost: r.unit_cost };
        }
        flatMap[key].total_qty += parseFloat(r.quantity);
      }
    }

    res.json({ tree: treeRows, flattened_materials: Object.values(flatMap) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/mrp/bom/:productId/cost-rollup
mrp2Router.get("/bom/:productId/cost-rollup", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const productId = req.params.productId;
    const ver = await db.execute(sql`
      SELECT id FROM mfg_bom_versions
      WHERE tenant_id = ${tenantId} AND product_id = ${productId} AND is_active = TRUE
      LIMIT 1
    `);
    if (!ver.rows.length) return res.status(404).json({ message: "No active BOM version found" });
    const versionId = (ver.rows[0] as any).id;

    const items = await db.execute(sql`
      SELECT item_code, item_name, quantity, unit_cost, scrap_pct, level, make_or_buy
      FROM mfg_bom_items WHERE bom_version_id = ${versionId}
    `);

    let total_material_cost = 0;
    const components = (items.rows as any[]).map(r => {
      const qty = parseFloat(r.quantity);
      const cost = parseFloat(r.unit_cost ?? 0);
      const scrap = parseFloat(r.scrap_pct ?? 0);
      const line_cost = qty * cost * (1 + scrap / 100);
      total_material_cost += line_cost;
      return { ...r, line_cost: line_cost.toFixed(2) };
    });

    res.json({ components, total_material_cost: total_material_cost.toFixed(2), labour_estimate: 0 });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── ECN ─────────────────────────────────────────────────────────────────────

// GET /api/mrp/ecn
mrp2Router.get("/ecn", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const rows = await db.execute(sql`SELECT * FROM mfg_ecn WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/mrp/ecn
mrp2Router.post("/ecn", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const { product_id, product_name, change_type, description, reason, effective_date, title } = req.body;
    const ecn_no = "ECN-" + Date.now();

    // Find current active BOM version
    const ver = await db.execute(sql`
      SELECT id FROM mfg_bom_versions WHERE tenant_id = ${tenantId} AND product_id = ${product_id} AND is_active = TRUE LIMIT 1
    `);
    const old_bom_version_id = ver.rows.length ? (ver.rows[0] as any).id : null;

    // Create new draft BOM version based on old
    let new_bom_version_id = null;
    if (old_bom_version_id) {
      const oldVer = await db.execute(sql`SELECT * FROM mfg_bom_versions WHERE id = ${old_bom_version_id}`);
      const ov = oldVer.rows[0] as any;
      const newVer = await db.execute(sql`
        INSERT INTO mfg_bom_versions (tenant_id, product_id, product_name, version_no, effective_from, ecn_no, change_description, change_reason, status)
        VALUES (${tenantId}, ${product_id}, ${product_name}, ${'v' + Date.now()}, ${effective_date ?? null}, ${ecn_no}, ${description ?? null}, ${reason ?? null}, 'draft')
        RETURNING id
      `);
      new_bom_version_id = (newVer.rows[0] as any).id;
      // Copy items from old version
      await db.execute(sql`
        INSERT INTO mfg_bom_items (tenant_id, bom_version_id, parent_item_id, level, item_code, item_name, item_type, quantity, unit, scrap_pct, lead_time_days, make_or_buy, unit_cost, is_phantom, notes)
        SELECT tenant_id, ${new_bom_version_id}, parent_item_id, level, item_code, item_name, item_type, quantity, unit, scrap_pct, lead_time_days, make_or_buy, unit_cost, is_phantom, notes
        FROM mfg_bom_items WHERE bom_version_id = ${old_bom_version_id}
      `);
    }

    const row = await db.execute(sql`
      INSERT INTO mfg_ecn (tenant_id, ecn_no, title, product_id, product_name, old_bom_version_id, new_bom_version_id, change_type, description, reason, effective_date, initiated_by)
      VALUES (${tenantId}, ${ecn_no}, ${title ?? ecn_no}, ${product_id}, ${product_name}, ${old_bom_version_id}, ${new_bom_version_id}, ${change_type ?? null}, ${description ?? null}, ${reason ?? null}, ${effective_date ?? null}, ${req.user?.name ?? null})
      RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/mrp/ecn/:id
mrp2Router.get("/ecn/:id", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const row = await db.execute(sql`SELECT * FROM mfg_ecn WHERE id = ${req.params.id}`);
    if (!row.rows.length) return res.status(404).json({ message: "ECN not found" });
    res.json(row.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/mrp/ecn/:id/approve
mrp2Router.post("/ecn/:id/approve", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    await db.execute(sql`UPDATE mfg_ecn SET status = 'approved', approved_by = ${req.user?.name ?? 'System'} WHERE id = ${req.params.id}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/mrp/ecn/:id/implement
mrp2Router.post("/ecn/:id/implement", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const ecn = await db.execute(sql`SELECT * FROM mfg_ecn WHERE id = ${req.params.id}`);
    if (!ecn.rows.length) return res.status(404).json({ message: "ECN not found" });
    const e = ecn.rows[0] as any;

    // Check open work orders using old BOM
    const woCount = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM work_orders WHERE status NOT IN ('completed','cancelled')
        AND tenant_id = ${e.tenant_id}
    `).catch(() => ({ rows: [{ cnt: 0 }] }));
    const affected = parseInt((woCount.rows[0] as any).cnt ?? 0);

    // Activate new BOM version, obsolete old
    if (e.new_bom_version_id) {
      await db.execute(sql`UPDATE mfg_bom_versions SET is_active = FALSE, status = 'obsolete' WHERE id = ${e.old_bom_version_id}`);
      await db.execute(sql`UPDATE mfg_bom_versions SET is_active = TRUE, status = 'approved' WHERE id = ${e.new_bom_version_id}`);
    }
    await db.execute(sql`UPDATE mfg_ecn SET status = 'implemented', affected_work_orders = ${affected} WHERE id = ${req.params.id}`);
    res.json({ success: true, affected_work_orders: affected });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── MRP RUNS ─────────────────────────────────────────────────────────────────

// GET /api/mrp/runs
mrp2Router.get("/runs", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const rows = await db.execute(sql`SELECT * FROM mfg_mrp_runs WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 10`);
    res.json(rows.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/mrp/runs/:id
mrp2Router.get("/runs/:id", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const row = await db.execute(sql`SELECT * FROM mfg_mrp_runs WHERE id = ${req.params.id}`);
    if (!row.rows.length) return res.status(404).json({ message: "Run not found" });
    res.json(row.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/mrp/runs/start
mrp2Router.post("/runs/start", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const { horizon_days = 90, include_safety_stock = true } = req.body;

    // Insert run record
    const runRow = await db.execute(sql`
      INSERT INTO mfg_mrp_runs (tenant_id, horizon_days, status, run_type)
      VALUES (${tenantId}, ${horizon_days}, 'running', 'full')
      RETURNING id
    `);
    const runId = (runRow.rows[0] as any).id;

    // 1. Collect demand: open sales orders in horizon
    const demands = await db.execute(sql`
      SELECT so.id, so.order_no, soi.product_id, soi.product_name, soi.quantity, so.delivery_date
      FROM sales_orders so
      JOIN sales_order_items soi ON soi.sales_order_id = so.id
      WHERE so.tenant_id = ${tenantId}
        AND so.status NOT IN ('cancelled','delivered','completed')
        AND (so.delivery_date IS NULL OR so.delivery_date <= CURRENT_DATE + ${horizon_days})
    `).catch(() => ({ rows: [] }));

    const demandRows = demands.rows as any[];
    const plannedOrders: any[] = [];
    const purchaseRecs: any[] = [];
    const productionRecs: any[] = [];
    const exceptions: any[] = [];

    // 2. For each demand item: explode BOM requirements
    for (const d of demandRows) {
      const bomVer = await db.execute(sql`
        SELECT id FROM mfg_bom_versions WHERE tenant_id = ${tenantId} AND product_id = ${d.product_id} AND is_active = TRUE LIMIT 1
      `).catch(() => ({ rows: [] }));

      if (!bomVer.rows.length) {
        exceptions.push({ type: 'no_bom', item: d.product_name, message: `No active BOM for ${d.product_name}` });
        continue;
      }
      const versionId = (bomVer.rows[0] as any).id;

      const components = await db.execute(sql`
        WITH RECURSIVE bom_tree AS (
          SELECT id, parent_item_id, item_code, item_name, quantity::numeric, lead_time_days, make_or_buy, is_phantom
          FROM mfg_bom_items WHERE bom_version_id = ${versionId} AND parent_item_id IS NULL
          UNION ALL
          SELECT i.id, i.parent_item_id, i.item_code, i.item_name, (i.quantity * t.quantity)::numeric, i.lead_time_days, i.make_or_buy, i.is_phantom
          FROM mfg_bom_items i JOIN bom_tree t ON i.parent_item_id = t.id
        )
        SELECT * FROM bom_tree WHERE is_phantom = FALSE
      `).catch(() => ({ rows: [] }));

      for (const c of components.rows as any[]) {
        const grossReq = parseFloat(c.quantity) * parseFloat(d.quantity);
        const dueDate = d.delivery_date ? new Date(d.delivery_date) : new Date(Date.now() + 30 * 86400000);
        const leadDays = parseInt(c.lead_time_days ?? 0);
        const plannedStart = new Date(dueDate.getTime() - leadDays * 86400000);

        plannedOrders.push({
          item_code: c.item_code, item_name: c.item_name,
          qty: grossReq, planned_start: plannedStart.toISOString().split('T')[0],
          planned_end: dueDate.toISOString().split('T')[0],
          action: c.make_or_buy === 'make' ? 'produce' : 'purchase'
        });

        if (c.make_or_buy === 'buy') {
          purchaseRecs.push({ item: c.item_name, item_code: c.item_code, qty: grossReq, by_date: dueDate.toISOString().split('T')[0] });
        } else {
          productionRecs.push({ item: c.item_name, item_code: c.item_code, qty: grossReq, start_date: plannedStart.toISOString().split('T')[0], end_date: dueDate.toISOString().split('T')[0] });
        }
      }
    }

    // Update run record
    await db.execute(sql`
      UPDATE mfg_mrp_runs SET
        status = 'completed',
        demands_processed = ${demandRows.length},
        planned_orders = ${JSON.stringify(plannedOrders)}::jsonb,
        purchase_recommendations = ${JSON.stringify(purchaseRecs)}::jsonb,
        production_recommendations = ${JSON.stringify(productionRecs)}::jsonb,
        exception_messages = ${JSON.stringify(exceptions)}::jsonb,
        completed_at = NOW()
      WHERE id = ${runId}
    `);

    res.json({
      run_id: runId,
      demands_processed: demandRows.length,
      planned_orders: plannedOrders.length,
      purchase_recommendations: purchaseRecs.length,
      production_recommendations: productionRecs.length,
      exceptions: exceptions.length
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/mrp/runs/:id/release
mrp2Router.post("/runs/:id/release", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const run = await db.execute(sql`SELECT * FROM mfg_mrp_runs WHERE id = ${req.params.id}`);
    if (!run.rows.length) return res.status(404).json({ message: "Run not found" });
    const r = run.rows[0] as any;

    const productionRecs: any[] = Array.isArray(r.production_recommendations) ? r.production_recommendations : JSON.parse(r.production_recommendations || '[]');
    const purchaseRecs: any[] = Array.isArray(r.purchase_recommendations) ? r.purchase_recommendations : JSON.parse(r.purchase_recommendations || '[]');

    let woCreated = 0;
    let poCreated = 0;

    // Create work orders for production recommendations
    for (const pr of productionRecs) {
      await db.execute(sql`
        INSERT INTO work_orders (tenant_id, product_name, quantity, planned_start_date, planned_end_date, status)
        VALUES (${tenantId}, ${pr.item}, ${pr.qty}, ${pr.start_date}, ${pr.end_date}, 'planned')
      `).catch(() => null);
      woCreated++;
    }

    res.json({ success: true, work_orders_created: woCreated, po_requisitions_created: poCreated, purchase_items: purchaseRecs.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── WORK CENTERS ─────────────────────────────────────────────────────────────

// GET /api/mrp/work-centers
mrp2Router.get("/work-centers", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const rows = await db.execute(sql`SELECT * FROM mfg_work_centers WHERE tenant_id = ${tenantId} AND is_active = TRUE ORDER BY name`);
    res.json(rows.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/mrp/work-centers
mrp2Router.post("/work-centers", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const { name, code, department, capacity_per_shift, shifts_per_day, workers_per_shift, efficiency_pct } = req.body;
    const row = await db.execute(sql`
      INSERT INTO mfg_work_centers (tenant_id, name, code, department, capacity_per_shift, shifts_per_day, workers_per_shift, efficiency_pct)
      VALUES (${tenantId}, ${name}, ${code ?? null}, ${department ?? null}, ${capacity_per_shift ?? 8}, ${shifts_per_day ?? 1}, ${workers_per_shift ?? 1}, ${efficiency_pct ?? 85})
      RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── CAPACITY ─────────────────────────────────────────────────────────────────

// GET /api/mrp/capacity/week
mrp2Router.get("/capacity/week", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const weekStart = req.query.week_start || new Date().toISOString().split('T')[0];
    const rows = await db.execute(sql`
      SELECT cp.*, wc.name as wc_name, wc.code as wc_code
      FROM mfg_capacity_plan cp
      LEFT JOIN mfg_work_centers wc ON wc.id = cp.work_center_id
      WHERE cp.tenant_id = ${tenantId} AND cp.week_start = ${weekStart}
      ORDER BY cp.work_center_name
    `);
    res.json(rows.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/mrp/capacity/load-work-order
mrp2Router.post("/capacity/load-work-order", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const { work_order_id, work_center_id, hours_required } = req.body;

    // Get work center info
    const wc = await db.execute(sql`SELECT * FROM mfg_work_centers WHERE id = ${work_center_id} AND tenant_id = ${tenantId}`);
    if (!wc.rows.length) return res.status(404).json({ message: "Work center not found" });
    const wcRow = wc.rows[0] as any;

    // Find or create capacity plan for current week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const availableHours = (wcRow.capacity_per_shift ?? 8) * (wcRow.shifts_per_day ?? 1) * 5 * ((wcRow.efficiency_pct ?? 85) / 100);

    let cp = await db.execute(sql`
      SELECT * FROM mfg_capacity_plan WHERE work_center_id = ${work_center_id} AND week_start = ${weekStartStr} AND tenant_id = ${tenantId}
    `);
    if (!cp.rows.length) {
      await db.execute(sql`
        INSERT INTO mfg_capacity_plan (tenant_id, work_center_id, work_center_name, week_start, available_hours)
        VALUES (${tenantId}, ${work_center_id}, ${wcRow.name}, ${weekStartStr}, ${availableHours})
      `);
      cp = await db.execute(sql`SELECT * FROM mfg_capacity_plan WHERE work_center_id = ${work_center_id} AND week_start = ${weekStartStr} AND tenant_id = ${tenantId}`);
    }

    const cpRow = cp.rows[0] as any;
    const newPlanned = parseFloat(cpRow.planned_hours ?? 0) + parseFloat(hours_required);
    const utilization = availableHours > 0 ? (newPlanned / availableHours) * 100 : 0;

    await db.execute(sql`
      UPDATE mfg_capacity_plan
      SET planned_hours = ${newPlanned}, utilization_pct = ${utilization}, is_bottleneck = ${utilization > 90}
      WHERE id = ${cpRow.id}
    `);

    const scheduledStart = weekStartStr;
    const scheduledEnd = new Date(weekStart.getTime() + 4 * 86400000).toISOString().split('T')[0];
    res.json({ scheduled_start: scheduledStart, scheduled_end: scheduledEnd, work_center: wcRow.name, utilization_pct: utilization.toFixed(1) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/mrp/capacity/gantt
mrp2Router.get("/capacity/gantt", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const { from, to } = req.query;

    const wcs = await db.execute(sql`SELECT * FROM mfg_work_centers WHERE tenant_id = ${tenantId} AND is_active = TRUE`);
    const workOrders = await db.execute(sql`
      SELECT wo.id, wo.product_name, wo.quantity, wo.planned_start_date, wo.planned_end_date, wo.status
      FROM work_orders wo
      WHERE wo.tenant_id = ${tenantId}
        AND (${from ?? null}::date IS NULL OR wo.planned_start_date >= ${from ?? null}::date)
        AND (${to ?? null}::date IS NULL OR wo.planned_end_date <= ${to ?? null}::date)
      ORDER BY wo.planned_start_date
    `).catch(() => ({ rows: [] }));

    const result = (wcs.rows as any[]).map(wc => ({
      id: wc.id, name: wc.name, code: wc.code,
      work_orders: (workOrders.rows as any[]).map(wo => ({
        id: wo.id, start: wo.planned_start_date, end: wo.planned_end_date,
        product: wo.product_name, qty: wo.quantity, status: wo.status
      }))
    }));

    res.json({ work_centers: result });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── SUPPLIER PORTAL ─────────────────────────────────────────────────────────

// POST /api/mrp/supplier-portal/invite/:supplierId
mrp2Router.post("/supplier-portal/invite/:supplierId", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const supplierId = req.params.supplierId;
    const { supplier_name } = req.body;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 86400000); // 30 days

    await db.execute(sql`
      INSERT INTO mfg_supplier_portal_tokens (tenant_id, supplier_id, supplier_name, token, expires_at)
      VALUES (${tenantId}, ${supplierId}, ${supplier_name ?? 'Supplier'}, ${token}, ${expiresAt.toISOString()})
    `);

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    res.json({ token, portal_url: `${baseUrl}/supplier-portal/${token}`, expires_at: expiresAt });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/mrp/supplier-portal/responses
mrp2Router.get("/supplier-portal/responses", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const rows = await db.execute(sql`SELECT * FROM mfg_supplier_portal_tokens WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── TRADE DOCUMENTS ─────────────────────────────────────────────────────────

// Helper: draw a PDF table with headers and rows
function drawTable(
  doc: InstanceType<typeof PDFDocument>,
  x: number, y: number, totalWidth: number,
  headers: string[], colWidths: number[],
  rows: string[][]
): number {
  const rowH = 20;
  const headerH = 22;
  // Header row
  doc.font("Helvetica-Bold").fontSize(8);
  let cx = x;
  headers.forEach((h, i) => {
    doc.rect(cx, y, colWidths[i], headerH).fillAndStroke("#e8e8e8", "#999999");
    doc.fillColor("black").text(h, cx + 4, y + 6, { width: colWidths[i] - 8, lineBreak: false });
    cx += colWidths[i];
  });
  let curY = y + headerH;
  // Data rows
  doc.font("Helvetica").fontSize(8);
  rows.forEach((row) => {
    cx = x;
    row.forEach((cell, i) => {
      doc.rect(cx, curY, colWidths[i], rowH).stroke("#cccccc");
      doc.fillColor("black").text(cell, cx + 4, curY + 5, { width: colWidths[i] - 8, lineBreak: false });
      cx += colWidths[i];
    });
    curY += rowH;
  });
  return curY; // return Y position after table
}

// Helper: draw company header
function drawHeader(doc: InstanceType<typeof PDFDocument>, title: string) {
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#1a1a2e").text("SwachERP", 50, 45, { continued: true });
  doc.font("Helvetica").fontSize(10).fillColor("#666666").text("  |  Export Management Platform", { continued: false });
  doc.moveTo(50, 70).lineTo(545, 70).strokeColor("#1a1a2e").lineWidth(2).stroke();
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#1a1a2e").text(title, 50, 82, { align: "center", width: 495 });
  doc.moveTo(50, 105).lineTo(545, 105).strokeColor("#cccccc").lineWidth(0.5).stroke();
}

// Helper: draw a labeled box
function drawBox(doc: InstanceType<typeof PDFDocument>, x: number, y: number, w: number, h: number, label: string, lines: string[]) {
  doc.rect(x, y, w, h).stroke("#aaaaaa");
  doc.font("Helvetica-Bold").fontSize(7).fillColor("#555555").text(label, x + 4, y + 4);
  doc.font("Helvetica").fontSize(8).fillColor("black");
  lines.forEach((line, i) => {
    doc.text(line, x + 4, y + 15 + i * 13, { width: w - 8, lineBreak: false });
  });
}

// GET /api/mrp/trade-documents/packing-list/:id
mrp2Router.get("/trade-documents/packing-list/:id", requireAuth, async (req: any, res) => {
  try {
    const id = req.params.id;
    const today = new Date().toISOString().split("T")[0];
    const plNo = `PL-${id}-${Date.now().toString().slice(-6)}`;

    const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 50, left: 50, right: 50 } });
    res.setHeader("Content-Disposition", `attachment; filename="packing-list-${id}.pdf"`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    drawHeader(doc, "PACKING LIST");

    // PL number + date
    doc.font("Helvetica").fontSize(9).fillColor("#333333");
    doc.text(`P/L No: ${plNo}`, 50, 115);
    doc.text(`Date: ${today}`, 400, 115, { align: "right", width: 145 });

    // Ship From / Ship To boxes
    drawBox(doc, 50, 135, 235, 80, "SHIP FROM", [
      "SwachERP Exports Ltd",
      "42, Industrial Area, Phase II",
      "Mumbai – 400001, India",
      "GSTIN: 27AAXXX1234F1Z0"
    ]);
    drawBox(doc, 310, 135, 235, 80, "SHIP TO", [
      "Buyer Name",
      "123 Commerce Street",
      "Los Angeles, CA 90001",
      "United States"
    ]);

    // Items table
    const headers = ["Item Description", "HS Code", "Packages", "Gross Wt (kg)", "Net Wt (kg)", "Dimensions (cm)"];
    const colWidths = [150, 70, 60, 70, 65, 80];
    const rows: string[][] = [
      ["Water Purifier Unit WP-100", "8421.21.10", "10", "150.00", "140.00", "60x40x50"],
      ["Filter Cartridge FC-200", "8421.99.90", "20", "40.00", "38.00", "30x20x15"],
      ["Spare Parts Kit SP-50", "8421.99.00", "5", "25.00", "23.00", "25x15x10"],
    ];
    const totals = ["TOTAL", "", "35", "215.00", "201.00", ""];

    let tableY = 230;
    tableY = drawTable(doc, 50, tableY, 495, headers, colWidths, rows);

    // Totals row
    doc.font("Helvetica-Bold").fontSize(8);
    let cx = 50;
    totals.forEach((cell, i) => {
      doc.rect(cx, tableY, colWidths[i], 22).fillAndStroke("#d0e8ff", "#999999");
      doc.fillColor("black").text(cell, cx + 4, tableY + 6, { width: colWidths[i] - 8, lineBreak: false });
      cx += colWidths[i];
    });

    // Footer
    doc.font("Helvetica").fontSize(8).fillColor("#555555")
      .text("This packing list is issued for customs purposes only.", 50, tableY + 40, { align: "center", width: 495 });
    doc.moveTo(50, tableY + 55).lineTo(545, tableY + 55).strokeColor("#cccccc").lineWidth(0.5).stroke();
    doc.font("Helvetica").fontSize(7).fillColor("#888888")
      .text("SwachERP Export Management Platform  |  Generated: " + new Date().toLocaleString(), 50, tableY + 62, { align: "center", width: 495 });

    doc.end();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/mrp/trade-documents/bill-of-lading/:id
mrp2Router.get("/trade-documents/bill-of-lading/:id", requireAuth, async (req: any, res) => {
  try {
    const id = req.params.id;
    const today = new Date().toISOString().split("T")[0];
    const blNo = `BL-${id}-${Date.now().toString().slice(-6)}`;

    const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 50, left: 50, right: 50 } });
    res.setHeader("Content-Disposition", `attachment; filename="bill-of-lading-${id}.pdf"`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    drawHeader(doc, "BILL OF LADING");

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#333333");
    doc.text(`B/L No: ${blNo}`, 50, 115);
    doc.text(`Date: ${today}`, 400, 115, { align: "right", width: 145 });

    // Shipper / Consignee / Notify Party – 3 column boxes
    const boxW = 161;
    drawBox(doc, 50, 135, boxW, 80, "SHIPPER", [
      "SwachERP Exports Ltd",
      "42, Industrial Area, Phase II",
      "Mumbai – 400001, India"
    ]);
    drawBox(doc, 50 + boxW + 2, 135, boxW, 80, "CONSIGNEE", [
      "Buyer Name",
      "123 Commerce Street",
      "Los Angeles, CA 90001"
    ]);
    drawBox(doc, 50 + (boxW + 2) * 2, 135, boxW, 80, "NOTIFY PARTY", [
      "Buyer Bank International",
      "456 Finance Ave",
      "New York, NY 10001"
    ]);

    // Vessel/Port details
    const detailY = 230;
    doc.rect(50, detailY, 495, 50).stroke("#aaaaaa");
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#555555").text("VESSEL DETAILS", 54, detailY + 4);
    const details = [
      { label: "Vessel Name:", value: "MV SWACH CARRIER" },
      { label: "Port of Loading:", value: "Nhava Sheva (INNSA), India" },
      { label: "Port of Discharge:", value: "Los Angeles (USLAX), USA" },
      { label: "Place of Delivery:", value: "Los Angeles, USA" },
    ];
    details.forEach((d, i) => {
      const dx = 54 + (i % 2) * 248;
      const dy = detailY + 16 + Math.floor(i / 2) * 14;
      doc.font("Helvetica-Bold").fontSize(8).fillColor("black").text(d.label, dx, dy, { continued: true });
      doc.font("Helvetica").text(" " + d.value, { lineBreak: false });
    });

    // Cargo table
    const headers = ["Mark & Numbers", "Description of Goods", "Packages", "Weight (kg)", "Measurement (CBM)"];
    const colWidths = [90, 170, 65, 80, 90];
    const rows: string[][] = [
      ["MUM/LAX/001-010", "Water Purifier Units WP-100", "10 Cartons", "150.00", "0.480"],
      ["MUM/LAX/011-030", "Filter Cartridge FC-200", "20 Cartons", "40.00", "0.180"],
      ["MUM/LAX/031-035", "Spare Parts Kit SP-50", "5 Cartons", "25.00", "0.094"],
    ];
    let tableY = 295;
    tableY = drawTable(doc, 50, tableY, 495, headers, colWidths, rows);

    // Freight section
    tableY += 15;
    doc.rect(50, tableY, 240, 40).stroke("#aaaaaa");
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#555555").text("FREIGHT", 54, tableY + 4);
    doc.font("Helvetica").fontSize(9).fillColor("black")
      .text("☑ FREIGHT PREPAID   ☐ FREIGHT COLLECT", 54, tableY + 16);

    // Signature block
    doc.rect(310, tableY, 235, 40).stroke("#aaaaaa");
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#555555").text("FOR AND ON BEHALF OF THE CARRIER", 314, tableY + 4);
    doc.font("Helvetica").fontSize(8).fillColor("black")
      .text(`Place of Issue: Mumbai, India`, 314, tableY + 16)
      .text(`Date: ${today}   No. of Originals: 3`, 314, tableY + 28);

    tableY += 55;
    // Footer
    doc.font("Helvetica").fontSize(7).fillColor("#666666")
      .text("RECEIVED by the Carrier from the Shipper in apparent good order and condition unless otherwise stated herein the total number or quantity of Containers or other packages or units indicated in the box opposite entitled CARRIER'S RECEIPT to be transported and delivered as mentioned above. In accepting this Bill of Lading the Merchant agrees to be bound by all the terms and conditions, whether printed, stamped or written on the face and back of this Bill of Lading.", 50, tableY, { width: 495, lineBreak: true });
    doc.font("Helvetica").fontSize(7).fillColor("#888888")
      .text("SwachERP Export Management Platform  |  Generated: " + new Date().toLocaleString(), 50, tableY + 35, { align: "center", width: 495 });

    doc.end();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/mrp/trade-documents/certificate-of-origin/:id
mrp2Router.get("/trade-documents/certificate-of-origin/:id", requireAuth, async (req: any, res) => {
  try {
    const id = req.params.id;
    const today = new Date().toISOString().split("T")[0];
    const certNo = `COO-${id}-${Date.now().toString().slice(-6)}`;

    const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 50, left: 50, right: 50 } });
    res.setHeader("Content-Disposition", `attachment; filename="certificate-of-origin-${id}.pdf"`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    drawHeader(doc, "CERTIFICATE OF ORIGIN");

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#333333");
    doc.text(`Certificate No: ${certNo}`, 50, 115);
    doc.text(`Date: ${today}`, 400, 115, { align: "right", width: 145 });

    // Exporter / Consignee boxes
    drawBox(doc, 50, 135, 235, 90, "EXPORTER", [
      "SwachERP Exports Ltd",
      "42, Industrial Area, Phase II",
      "Mumbai – 400001, India",
      "IEC: 0599XXXXX01",
      "Tel: +91-22-XXXXXXXX"
    ]);
    drawBox(doc, 310, 135, 235, 90, "CONSIGNEE", [
      "Buyer Name",
      "123 Commerce Street",
      "Los Angeles, CA 90001",
      "United States",
      "Tel: +1-310-XXXXXXX"
    ]);

    // Goods table
    const headers = ["Item No.", "HS Code", "Description", "Qty", "Unit", "Origin Criteria"];
    const colWidths = [45, 65, 195, 50, 45, 95];
    const rows: string[][] = [
      ["1", "8421.21.10", "Water Purifier Unit WP-100", "10", "PCS", "Wholly Obtained (WO)"],
      ["2", "8421.99.90", "Filter Cartridge FC-200", "20", "PCS", "Substantial Transform"],
      ["3", "8421.99.00", "Spare Parts Kit SP-50", "5", "SET", "Substantially Manuf."],
    ];
    let tableY = 240;
    tableY = drawTable(doc, 50, tableY, 495, headers, colWidths, rows);

    tableY += 15;

    // Declaration box
    doc.rect(50, tableY, 495, 55).stroke("#aaaaaa");
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#555555").text("DECLARATION BY THE EXPORTER", 54, tableY + 4);
    doc.font("Helvetica").fontSize(8).fillColor("black")
      .text("The undersigned hereby declares that the above details and statements are correct, that all the goods were produced or manufactured in India, and that they comply with the origin requirements specified.", 54, tableY + 16, { width: 487, lineBreak: true });

    tableY += 70;

    // Certification box
    doc.rect(50, tableY, 495, 55).stroke("#1a1a2e").lineWidth(1.5);
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#1a1a2e").text("CERTIFICATION", 54, tableY + 4);
    doc.font("Helvetica").fontSize(8).fillColor("black")
      .text("It is hereby certified on the basis of control carried out that the declaration by the exporter is correct.", 54, tableY + 16, { width: 487 })
      .text("The goods described above originated in INDIA.", 54, tableY + 30, { width: 487 });
    doc.font("Helvetica-Bold").fontSize(8).text("Issued by: Export Promotion Council of India", 54, tableY + 43, { width: 487 });

    tableY += 70;

    // Signature area
    doc.rect(50, tableY, 235, 60).stroke("#aaaaaa");
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#555555").text("AUTHORISED SIGNATORY (EXPORTER)", 54, tableY + 4);
    doc.font("Helvetica").fontSize(8).fillColor("black").text(`Place & Date: Mumbai, ${today}`, 54, tableY + 44);
    doc.moveTo(54, tableY + 38).lineTo(275, tableY + 38).strokeColor("#999999").lineWidth(0.5).stroke();

    doc.rect(310, tableY, 235, 60).stroke("#aaaaaa");
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#555555").text("CERTIFICATION STAMP & SIGNATURE", 314, tableY + 4);
    doc.font("Helvetica").fontSize(8).fillColor("black").text(`Date: ${today}`, 314, tableY + 44);
    doc.moveTo(314, tableY + 38).lineTo(535, tableY + 38).strokeColor("#999999").lineWidth(0.5).stroke();

    tableY += 75;
    doc.font("Helvetica").fontSize(7).fillColor("#888888")
      .text("SwachERP Export Management Platform  |  Generated: " + new Date().toLocaleString(), 50, tableY, { align: "center", width: 495 });

    doc.end();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/mrp/trade-documents/commercial-invoice/:id
mrp2Router.get("/trade-documents/commercial-invoice/:id", requireAuth, async (req: any, res) => {
  try {
    const id = req.params.id;
    const today = new Date().toISOString().split("T")[0];
    const invNo = `CI-${id}-${Date.now().toString().slice(-6)}`;

    const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 50, left: 50, right: 50 } });
    res.setHeader("Content-Disposition", `attachment; filename="commercial-invoice-${id}.pdf"`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    drawHeader(doc, "COMMERCIAL INVOICE");

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#333333");
    doc.text(`Invoice No: ${invNo}`, 50, 115);
    doc.text(`Date: ${today}`, 400, 115, { align: "right", width: 145 });

    // Seller / Buyer boxes
    drawBox(doc, 50, 135, 235, 90, "SELLER / EXPORTER", [
      "SwachERP Exports Ltd",
      "42, Industrial Area, Phase II",
      "Mumbai – 400001, India",
      "GSTIN: 27AAXXX1234F1Z0",
      "IEC: 0599XXXXX01"
    ]);
    drawBox(doc, 310, 135, 235, 90, "BUYER / IMPORTER", [
      "Buyer Name",
      "123 Commerce Street",
      "Los Angeles, CA 90001",
      "United States",
      "Tel: +1-310-XXXXXXX"
    ]);

    // Terms row
    const termsY = 238;
    doc.rect(50, termsY, 495, 22).stroke("#aaaaaa");
    doc.font("Helvetica-Bold").fontSize(8).fillColor("black")
      .text("Incoterms: CIF Los Angeles", 54, termsY + 6, { continued: true })
      .font("Helvetica").text("    |    Currency: USD    |    Country of Origin: India    |    Payment: 30 days from B/L date");

    // Items table
    const headers = ["Description", "HS Code", "Qty", "Unit", "Unit Price (USD)", "Amount (USD)"];
    const colWidths = [170, 70, 40, 35, 90, 90];
    const rows: string[][] = [
      ["Water Purifier Unit WP-100", "8421.21.10", "10", "PCS", "250.00", "2,500.00"],
      ["Filter Cartridge FC-200", "8421.99.90", "20", "PCS", "45.00", "900.00"],
      ["Spare Parts Kit SP-50", "8421.99.00", "5", "SET", "80.00", "400.00"],
    ];
    let tableY = 272;
    tableY = drawTable(doc, 50, tableY, 495, headers, colWidths, rows);

    // Summary rows
    const summaryRows: [string, string][] = [
      ["Subtotal:", "3,800.00"],
      ["Freight:", "200.00"],
      ["Insurance:", "38.00"],
      ["TOTAL (USD):", "4,038.00"],
    ];
    summaryRows.forEach(([label, val], i) => {
      const isTot = label.startsWith("TOTAL");
      doc.rect(310, tableY, 145, 20).stroke("#cccccc");
      doc.rect(455, tableY, 90, 20).stroke("#cccccc");
      if (isTot) {
        doc.fillColor("#1a1a2e");
        doc.font("Helvetica-Bold");
      } else {
        doc.fillColor("black");
        doc.font(i === summaryRows.length - 1 ? "Helvetica-Bold" : "Helvetica");
      }
      doc.fontSize(8).text(label, 314, tableY + 5, { width: 137, lineBreak: false, align: "right" });
      doc.text(val, 459, tableY + 5, { width: 82, lineBreak: false, align: "right" });
      tableY += 20;
    });

    tableY += 15;

    // Bank details
    doc.rect(50, tableY, 495, 65).stroke("#aaaaaa");
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#555555").text("BANK DETAILS (FOR PAYMENT)", 54, tableY + 4);
    doc.font("Helvetica").fontSize(8).fillColor("black")
      .text("Bank Name: State Bank of India, Fort Branch, Mumbai", 54, tableY + 16)
      .text("Account Name: SwachERP Exports Ltd", 54, tableY + 29)
      .text("Account No: XXXXXXXXXXXXXXX   |   IFSC: SBIN0000001", 54, tableY + 42)
      .text("SWIFT Code: SBININBB   |   IBAN: INXXXXXXXXXXXXXXXXXX", 54, tableY + 55);

    tableY += 80;

    // Signature block
    doc.rect(50, tableY, 235, 55).stroke("#aaaaaa");
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#555555").text("AUTHORISED SIGNATORY", 54, tableY + 4);
    doc.font("Helvetica").fontSize(8).fillColor("black").text("For SwachERP Exports Ltd", 54, tableY + 40);
    doc.moveTo(54, tableY + 35).lineTo(275, tableY + 35).strokeColor("#999999").lineWidth(0.5).stroke();

    doc.rect(310, tableY, 235, 55).stroke("#aaaaaa");
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#555555").text("DECLARATION", 314, tableY + 4);
    doc.font("Helvetica").fontSize(7).fillColor("black")
      .text("We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.", 314, tableY + 15, { width: 227 });

    tableY += 65;
    doc.font("Helvetica").fontSize(7).fillColor("#888888")
      .text("SwachERP Export Management Platform  |  Generated: " + new Date().toLocaleString(), 50, tableY, { align: "center", width: 495 });

    doc.end();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── LANDED COSTS ─────────────────────────────────────────────────────────────

// GET /api/mrp/landed-costs
mrp2Router.get("/landed-costs", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const rows = await db.execute(sql`SELECT * FROM mfg_landed_costs WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/mrp/landed-costs
mrp2Router.post("/landed-costs", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const tenantId = tid(req);
    const { purchase_order_id, freight = 0, insurance = 0, customs_duty = 0, customs_clearing = 0, port_charges = 0, other_charges = 0, allocation_method = 'value' } = req.body;
    const total = parseFloat(freight) + parseFloat(insurance) + parseFloat(customs_duty) + parseFloat(customs_clearing) + parseFloat(port_charges) + parseFloat(other_charges);

    const row = await db.execute(sql`
      INSERT INTO mfg_landed_costs (tenant_id, purchase_order_id, freight, insurance, customs_duty, customs_clearing, port_charges, other_charges, total_landed_cost, allocation_method)
      VALUES (${tenantId}, ${purchase_order_id}, ${freight}, ${insurance}, ${customs_duty}, ${customs_clearing}, ${port_charges}, ${other_charges}, ${total}, ${allocation_method})
      RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/mrp/landed-costs/:id/allocate
mrp2Router.post("/landed-costs/:id/allocate", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const lc = await db.execute(sql`SELECT * FROM mfg_landed_costs WHERE id = ${req.params.id}`);
    if (!lc.rows.length) return res.status(404).json({ message: "Landed cost record not found" });
    const lcRow = lc.rows[0] as any;
    const totalLanded = parseFloat(lcRow.total_landed_cost);

    // Fetch PO line items
    const items = await db.execute(sql`
      SELECT id, item_name, quantity, unit_price, (quantity * unit_price) as line_value
      FROM purchase_order_items WHERE po_id = ${lcRow.purchase_order_id}
    `).catch(() => ({ rows: [] }));

    const itemRows = items.rows as any[];
    if (!itemRows.length) return res.json({ message: "No PO items found", allocated: [] });

    const totalValue = itemRows.reduce((s, i) => s + parseFloat(i.line_value ?? 0), 0);
    const totalQty = itemRows.reduce((s, i) => s + parseFloat(i.quantity ?? 0), 0);

    const allocated = itemRows.map(i => {
      let share = 0;
      if (lcRow.allocation_method === 'qty') {
        share = totalQty > 0 ? totalLanded * (parseFloat(i.quantity) / totalQty) : 0;
      } else {
        share = totalValue > 0 ? totalLanded * (parseFloat(i.line_value) / totalValue) : 0;
      }
      return { item_code: i.item_name, item_id: i.id, allocated_amount: parseFloat(share.toFixed(2)) };
    });

    await db.execute(sql`
      UPDATE mfg_landed_costs SET allocated_to_items = ${JSON.stringify(allocated)}::jsonb WHERE id = ${req.params.id}
    `);

    // Post GL entry
    const tenantId = tid(req);
    await db.execute(sql`
      INSERT INTO journal_entries (tenant_id, entry_date, description, status)
      VALUES (${tenantId}, CURRENT_DATE, ${'Landed cost allocation for PO ' + lcRow.purchase_order_id}, 'posted')
    `).catch(() => null);

    res.json({ success: true, allocated });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/mrp/landed-costs/:id/breakdown
mrp2Router.get("/landed-costs/:id/breakdown", requireAuth, async (req: any, res) => {
  try {
    await initTables();
    const row = await db.execute(sql`SELECT * FROM mfg_landed_costs WHERE id = ${req.params.id}`);
    if (!row.rows.length) return res.status(404).json({ message: "Not found" });
    const lc = row.rows[0] as any;
    const allocated: any[] = Array.isArray(lc.allocated_to_items) ? lc.allocated_to_items : JSON.parse(lc.allocated_to_items || '[]');
    res.json({ ...lc, breakdown: allocated });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default mrp2Router;
