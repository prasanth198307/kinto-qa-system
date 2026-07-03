/**
 * Manufacturing Advanced Routes
 * - Multi-level BOM explosion (recursive)
 * - MRP II (Material Requirements Planning)
 * - ECN (Engineering Change Notices)
 * - Cost rollup (standard costing from BOM)
 */

import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();
function tid(req: any): number { return req.session?.tenantId ?? req.user?.tenantId ?? 1; }
function auth(req: any, res: any, next: any) { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); }

// ─── MULTI-LEVEL BOM EXPLOSION ────────────────────────────────────────────────

/**
 * Recursively explode BOM for a finished good.
 * Returns flat list with level, path, total_qty_needed for a given parent_qty.
 */
async function explodeBOM(
  productId: number,
  parentQty: number,
  tenantId: number,
  level = 0,
  path: string[] = [],
  visited = new Set<number>()
): Promise<any[]> {
  if (level > 10 || visited.has(productId)) return []; // circular guard
  visited.add(productId);

  // Try product_bom first, then check raw_material sub-assemblies
  const bomRows = await db.execute(sql`
    SELECT pb.raw_material_id, pb.quantity, pb.uom_id, pb.scrap_pct,
           rm.name as material_name, rm.type as material_type, rm.cost_price,
           u.abbreviation as uom
    FROM product_bom pb
    JOIN raw_materials rm ON rm.id = pb.raw_material_id
    LEFT JOIN uom u ON u.id = pb.uom_id
    WHERE pb.product_id = ${productId} AND pb.tenant_id = ${tenantId}
  `).catch(() => ({ rows: [] }));

  const result: any[] = [];
  for (const row of bomRows.rows as any[]) {
    const scrapFactor = 1 + (Number(row.scrap_pct || 0) / 100);
    const qtyNeeded = Number(row.quantity) * parentQty * scrapFactor;
    const materialPath = [...path, row.material_name];

    result.push({
      level,
      path: materialPath.join(" > "),
      material_id: row.raw_material_id,
      material_name: row.material_name,
      material_type: row.material_type,
      uom: row.uom,
      qty_per_parent: Number(row.quantity),
      scrap_pct: Number(row.scrap_pct || 0),
      total_qty_needed: qtyNeeded,
      cost_price: Number(row.cost_price || 0),
      total_cost: qtyNeeded * Number(row.cost_price || 0),
      is_leaf: true, // will be set false if it has its own BOM
    });

    // Check if this raw material is itself a sub-assembly (has its own BOM via raw_material_sub_bom)
    const subBOM = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM raw_material_sub_bom WHERE parent_material_id = ${row.raw_material_id} AND tenant_id = ${tenantId}
    `).catch(() => ({ rows: [{ cnt: 0 }] }));
    const hasSubBOM = Number((subBOM.rows[0] as any)?.cnt || 0) > 0;

    if (hasSubBOM) {
      result[result.length - 1].is_leaf = false;
      const subRows = await db.execute(sql`
        SELECT sbs.component_material_id, sbs.quantity, sbs.scrap_pct,
               rm2.name as material_name, rm2.cost_price, u2.abbreviation as uom
        FROM raw_material_sub_bom sbs
        JOIN raw_materials rm2 ON rm2.id = sbs.component_material_id
        LEFT JOIN uom u2 ON u2.id = sbs.uom_id
        WHERE sbs.parent_material_id = ${row.raw_material_id} AND sbs.tenant_id = ${tenantId}
      `).catch(() => ({ rows: [] }));

      for (const sub of subRows.rows as any[]) {
        const subScrap = 1 + (Number(sub.scrap_pct || 0) / 100);
        const subQty = Number(sub.quantity) * qtyNeeded * subScrap;
        result.push({
          level: level + 1,
          path: [...materialPath, sub.material_name].join(" > "),
          material_id: sub.component_material_id,
          material_name: sub.material_name,
          uom: sub.uom,
          qty_per_parent: Number(sub.quantity),
          scrap_pct: Number(sub.scrap_pct || 0),
          total_qty_needed: subQty,
          cost_price: Number(sub.cost_price || 0),
          total_cost: subQty * Number(sub.cost_price || 0),
          is_leaf: true,
          parent_material_id: row.raw_material_id,
        });
      }
    }
  }
  return result;
}

// GET /bom-explosion/:productId?qty=100 — multi-level BOM explosion
router.get("/bom-explosion/:productId", auth, async (req: any, res) => {
  const t = tid(req);
  const productId = Number(req.params.productId);
  const qty = Number(req.query.qty || 1);
  try {
    const productRow = await db.execute(sql`SELECT name, standard_cost FROM products WHERE id=${productId} AND tenant_id=${t} LIMIT 1`).catch(() => ({ rows: [] }));
    const product = (productRow.rows[0] as any) || {};

    const explosion = await explodeBOM(productId, qty, t);

    // Aggregate leaf items
    const aggregated: Record<number, any> = {};
    for (const item of explosion) {
      if (!aggregated[item.material_id]) {
        aggregated[item.material_id] = { ...item, total_qty_needed: 0, total_cost: 0 };
      }
      aggregated[item.material_id].total_qty_needed += item.total_qty_needed;
      aggregated[item.material_id].total_cost += item.total_cost;
    }

    const totalCost = Object.values(aggregated).reduce((s, m: any) => s + m.total_cost, 0);

    res.json({
      product_id: productId,
      product_name: product.name,
      qty_to_produce: qty,
      total_material_cost: totalCost,
      bom_explosion: explosion,
      aggregated_requirements: Object.values(aggregated),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /bom-explosion/batch — explode multiple products at once
router.post("/bom-explosion/batch", auth, async (req: any, res) => {
  const t = tid(req);
  const { items } = req.body; // [{ product_id, qty }]
  try {
    const results = await Promise.all(
      (items || []).map(async (item: any) => {
        const explosion = await explodeBOM(item.product_id, item.qty || 1, t);
        return { product_id: item.product_id, qty: item.qty, explosion };
      })
    );
    res.json(results);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── MRP II — Material Requirements Planning ──────────────────────────────────

// POST /mrp/run — run MRP for open work orders + sales orders
router.post("/mrp/run", auth, async (req: any, res) => {
  const t = tid(req);
  const { horizon_days = 30, include_safety_stock = true } = req.body;
  const horizon = new Date(Date.now() + horizon_days * 86400000).toISOString().slice(0, 10);

  try {
    // 1. Demand: open work orders
    const woRows = await db.execute(sql`
      SELECT wo.id as work_order_id, wo.product_id, wo.planned_qty - COALESCE(wo.produced_qty,0) as required_qty,
             wo.planned_start_date as need_date, p.name as product_name
      FROM work_orders wo
      JOIN products p ON p.id = wo.product_id
      WHERE wo.tenant_id = ${t} AND wo.status IN ('planned','in_progress')
        AND wo.planned_start_date <= ${horizon}
    `).catch(() => ({ rows: [] }));

    // 2. Demand: open sales orders
    const soRows = await db.execute(sql`
      SELECT so.id as sales_order_id, soi.product_id, soi.quantity - COALESCE(soi.dispatched_qty,0) as required_qty,
             so.delivery_date as need_date, p.name as product_name
      FROM sales_orders so
      JOIN sales_order_items soi ON soi.sales_order_id = so.id
      JOIN products p ON p.id = soi.product_id
      WHERE so.tenant_id = ${t} AND so.status IN ('confirmed','processing')
        AND so.delivery_date <= ${horizon}
    `).catch(() => ({ rows: [] }));

    // 3. Current stock
    const stockRows = await db.execute(sql`
      SELECT raw_material_id, SUM(qty_available) as stock_qty
      FROM raw_material_transactions
      WHERE tenant_id = ${t}
      GROUP BY raw_material_id
    `).catch(() => ({ rows: [] }));
    const stockMap: Record<number, number> = {};
    for (const s of stockRows.rows as any[]) stockMap[s.raw_material_id] = Number(s.stock_qty || 0);

    // 4. Explode BOM for each demand item
    const materialDemand: Record<number, { material_id: number; material_name: string; uom: string; gross_requirement: number; on_hand: number; net_requirement: number; planned_orders: any[] }> = {};

    const allDemand = [
      ...(woRows.rows as any[]).map(r => ({ ...r, source: "work_order" })),
      ...(soRows.rows as any[]).map(r => ({ ...r, source: "sales_order" })),
    ];

    for (const demand of allDemand) {
      if (!demand.product_id || !demand.required_qty) continue;
      const explosion = await explodeBOM(demand.product_id, Number(demand.required_qty), t);
      for (const item of explosion) {
        if (!materialDemand[item.material_id]) {
          materialDemand[item.material_id] = {
            material_id: item.material_id, material_name: item.material_name, uom: item.uom,
            gross_requirement: 0, on_hand: stockMap[item.material_id] || 0, net_requirement: 0, planned_orders: [],
          };
        }
        materialDemand[item.material_id].gross_requirement += item.total_qty_needed;
      }
    }

    // 5. Compute net requirements + planned purchase orders
    const plannedOrders: any[] = [];
    for (const [, mat] of Object.entries(materialDemand)) {
      const safetyStock = include_safety_stock ? mat.on_hand * 0.1 : 0; // 10% safety
      mat.net_requirement = Math.max(0, mat.gross_requirement - mat.on_hand + safetyStock);
      if (mat.net_requirement > 0) {
        const po = {
          material_id: mat.material_id,
          material_name: mat.material_name,
          uom: mat.uom,
          quantity: Math.ceil(mat.net_requirement),
          suggested_order_date: new Date().toISOString().slice(0, 10),
          required_by: horizon,
          action: "CREATE_PO",
        };
        plannedOrders.push(po);
        mat.planned_orders.push(po);
      }
    }

    res.json({
      run_date: new Date().toISOString(),
      horizon: horizon,
      demand_sources: { work_orders: woRows.rows.length, sales_orders: soRows.rows.length },
      material_plan: Object.values(materialDemand),
      planned_purchase_orders: plannedOrders,
      summary: {
        total_materials: Object.keys(materialDemand).length,
        materials_short: plannedOrders.length,
        total_pos_suggested: plannedOrders.length,
      },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /mrp/schedule — production schedule from work orders
router.get("/mrp/schedule", auth, async (req: any, res) => {
  const t = tid(req);
  const { from_date, to_date } = req.query as any;
  const from = from_date || new Date().toISOString().slice(0, 10);
  const to = to_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  try {
    const rows = await db.execute(sql`
      SELECT wo.*, p.name as product_name,
             COALESCE(wo.planned_qty,0) - COALESCE(wo.produced_qty,0) as pending_qty,
             ROUND(COALESCE(wo.produced_qty,0)::numeric / NULLIF(wo.planned_qty,0) * 100, 1) as completion_pct
      FROM work_orders wo
      LEFT JOIN products p ON p.id = wo.product_id
      WHERE wo.tenant_id = ${t}
        AND wo.planned_start_date BETWEEN ${from} AND ${to}
      ORDER BY wo.planned_start_date, wo.priority DESC
    `).catch(() => ({ rows: [] }));
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /mrp/commit-planned-orders — convert MRP suggestions to purchase requisitions
router.post("/mrp/commit-planned-orders", auth, async (req: any, res) => {
  const t = tid(req);
  const { planned_orders } = req.body;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mrp_planned_orders (
        id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL, material_id INTEGER,
        material_name VARCHAR(200), quantity NUMERIC(15,3), uom VARCHAR(20),
        required_by DATE, status VARCHAR(30) DEFAULT 'suggested',
        converted_to_po INTEGER, created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const inserted = [];
    for (const po of (planned_orders || [])) {
      const row = await db.execute(sql`
        INSERT INTO mrp_planned_orders (tenant_id, material_id, material_name, quantity, uom, required_by)
        VALUES (${t}, ${po.material_id}, ${po.material_name}, ${po.quantity}, ${po.uom || null}, ${po.required_by || null})
        RETURNING *
      `);
      inserted.push(row.rows[0]);
    }
    res.json({ success: true, committed: inserted.length, orders: inserted });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── ECN — Engineering Change Notices ────────────────────────────────────────

// GET /ecn — list all ECNs
router.get("/ecn", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS engineering_change_notices (
        id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL,
        ecn_number VARCHAR(50) NOT NULL, title VARCHAR(300) NOT NULL,
        description TEXT, change_type VARCHAR(50), priority VARCHAR(20) DEFAULT 'normal',
        affected_products JSONB, affected_bom_items JSONB,
        old_spec JSONB, new_spec JSONB,
        reason TEXT, impact_analysis TEXT,
        status VARCHAR(30) DEFAULT 'draft',
        initiated_by INTEGER, approved_by INTEGER,
        effective_date DATE, implemented_date DATE,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const rows = await db.execute(sql`
      SELECT ecn.*, u1.first_name || ' ' || COALESCE(u1.last_name,'') as initiated_by_name,
             u2.first_name || ' ' || COALESCE(u2.last_name,'') as approved_by_name
      FROM engineering_change_notices ecn
      LEFT JOIN hr_employees u1 ON u1.id = ecn.initiated_by
      LEFT JOIN hr_employees u2 ON u2.id = ecn.approved_by
      WHERE ecn.tenant_id = ${t}
      ORDER BY ecn.created_at DESC
    `).catch(() => db.execute(sql`SELECT * FROM engineering_change_notices WHERE tenant_id=${t} ORDER BY created_at DESC`));
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /ecn — create ECN
router.post("/ecn", auth, async (req: any, res) => {
  const t = tid(req);
  const { title, description, change_type, priority, affected_products, affected_bom_items, old_spec, new_spec, reason, impact_analysis, effective_date } = req.body;
  try {
    const ecnNo = `ECN-${Date.now()}`;
    const row = await db.execute(sql`
      INSERT INTO engineering_change_notices
        (tenant_id, ecn_number, title, description, change_type, priority, affected_products, affected_bom_items, old_spec, new_spec, reason, impact_analysis, effective_date, initiated_by)
      VALUES
        (${t}, ${ecnNo}, ${title}, ${description||null}, ${change_type||'bom_change'}, ${priority||'normal'},
         ${JSON.stringify(affected_products||[])}::jsonb, ${JSON.stringify(affected_bom_items||[])}::jsonb,
         ${JSON.stringify(old_spec||{})}::jsonb, ${JSON.stringify(new_spec||{})}::jsonb,
         ${reason||null}, ${impact_analysis||null}, ${effective_date||null}, ${req.user?.id||null})
      RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PUT /ecn/:id — update ECN
router.put("/ecn/:id", auth, async (req: any, res) => {
  const t = tid(req);
  const { title, description, priority, status, reason, impact_analysis, effective_date, implemented_date, old_spec, new_spec } = req.body;
  try {
    const row = await db.execute(sql`
      UPDATE engineering_change_notices SET
        title=${title}, description=${description||null}, priority=${priority||'normal'}, status=${status||'draft'},
        reason=${reason||null}, impact_analysis=${impact_analysis||null}, effective_date=${effective_date||null},
        implemented_date=${implemented_date||null}, old_spec=${JSON.stringify(old_spec||{})}::jsonb,
        new_spec=${JSON.stringify(new_spec||{})}::jsonb, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${t} RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /ecn/:id/approve — approve an ECN
router.post("/ecn/:id/approve", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const row = await db.execute(sql`
      UPDATE engineering_change_notices SET status='approved', approved_by=${req.user?.id||null}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${t} RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /ecn/:id/implement — mark ECN as implemented + apply BOM changes
router.post("/ecn/:id/implement", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const ecnRow = await db.execute(sql`SELECT * FROM engineering_change_notices WHERE id=${req.params.id} AND tenant_id=${t}`);
    const ecn = ecnRow.rows[0] as any;
    if (!ecn) return res.status(404).json({ error: "ECN not found" });
    if (ecn.status !== "approved") return res.status(400).json({ error: "ECN must be approved before implementation" });

    // Apply BOM changes if new_spec contains bom_updates
    const newSpec = ecn.new_spec || {};
    if (newSpec.bom_updates && Array.isArray(newSpec.bom_updates)) {
      for (const update of newSpec.bom_updates) {
        if (update.action === "add") {
          await db.execute(sql`
            INSERT INTO product_bom (product_id, raw_material_id, quantity, uom_id, scrap_pct, tenant_id)
            VALUES (${update.product_id}, ${update.material_id}, ${update.quantity}, ${update.uom_id||null}, ${update.scrap_pct||0}, ${t})
            ON CONFLICT DO NOTHING
          `).catch(() => {});
        } else if (update.action === "remove") {
          await db.execute(sql`DELETE FROM product_bom WHERE product_id=${update.product_id} AND raw_material_id=${update.material_id} AND tenant_id=${t}`).catch(() => {});
        } else if (update.action === "update") {
          await db.execute(sql`UPDATE product_bom SET quantity=${update.quantity}, scrap_pct=${update.scrap_pct||0} WHERE product_id=${update.product_id} AND raw_material_id=${update.material_id} AND tenant_id=${t}`).catch(() => {});
        }
      }
    }

    await db.execute(sql`UPDATE engineering_change_notices SET status='implemented', implemented_date=CURRENT_DATE, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${t}`);
    res.json({ success: true, message: `ECN ${ecn.ecn_number} implemented successfully`, bom_updates_applied: (newSpec.bom_updates || []).length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── STANDARD COST ROLLUP ─────────────────────────────────────────────────────

// GET /cost-rollup/:productId — compute standard cost from BOM
router.get("/cost-rollup/:productId", auth, async (req: any, res) => {
  const t = tid(req);
  const productId = Number(req.params.productId);
  const qty = Number(req.query.qty || 1);
  try {
    const productRow = await db.execute(sql`SELECT name, standard_cost FROM products WHERE id=${productId} AND tenant_id=${t} LIMIT 1`).catch(() => ({ rows: [] }));
    const product = (productRow.rows[0] as any) || {};
    const explosion = await explodeBOM(productId, qty, t);

    const totalMaterialCost = explosion.reduce((s, m) => s + m.total_cost, 0);

    // Labour + overhead from work order standard times
    const labourRow = await db.execute(sql`
      SELECT COALESCE(SUM(standard_labour_cost),0) as labour_cost,
             COALESCE(SUM(standard_overhead_cost),0) as overhead_cost
      FROM product_routing WHERE product_id=${productId} AND tenant_id=${t}
    `).catch(() => ({ rows: [{ labour_cost: 0, overhead_cost: 0 }] }));
    const labour = Number((labourRow.rows[0] as any)?.labour_cost || 0) * qty;
    const overhead = Number((labourRow.rows[0] as any)?.overhead_cost || 0) * qty;

    const totalStandardCost = totalMaterialCost + labour + overhead;

    res.json({
      product_id: productId,
      product_name: product.name,
      qty,
      cost_breakdown: {
        material_cost: totalMaterialCost,
        labour_cost: labour,
        overhead_cost: overhead,
        total_standard_cost: totalStandardCost,
        cost_per_unit: qty > 0 ? totalStandardCost / qty : 0,
      },
      existing_standard_cost: Number(product.standard_cost || 0),
      variance: totalStandardCost - Number(product.standard_cost || 0) * qty,
      material_details: explosion,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /cost-rollup/update-standard — update product standard costs from BOM
router.post("/cost-rollup/update-standard", auth, async (req: any, res) => {
  const t = tid(req);
  const { product_ids } = req.body;
  try {
    const results: any[] = [];
    for (const pid of (product_ids || [])) {
      const explosion = await explodeBOM(pid, 1, t);
      const cost = explosion.reduce((s, m) => s + m.total_cost, 0);
      await db.execute(sql`UPDATE products SET standard_cost=${cost} WHERE id=${pid} AND tenant_id=${t}`).catch(() => {});
      results.push({ product_id: pid, new_standard_cost: cost });
    }
    res.json({ success: true, updated: results.length, results });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
