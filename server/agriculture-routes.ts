import { Router } from "express";

import { sql } from "drizzle-orm";
import { db } from "./db";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── Farms ─────────────────────────────────────────────────────────────────────
router.get("/farms", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM farms WHERE tenant_id=${tid(req)} AND is_active=1 ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/farms", requireAuth, async (req: any, res) => {
  try {
    const { name, location, area_acres, owner_name, contact_phone, soil_type, water_source } = req.body;
    const code = "FARM-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO farms (tenant_id, farm_code, name, location, area_acres, owner_name, contact_phone, soil_type, water_source)
      VALUES (${tid(req)}, ${code}, ${name}, ${location || null}, ${area_acres || null},
              ${owner_name || null}, ${contact_phone || null}, ${soil_type || null}, ${water_source || null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/farms/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, location, area_acres, owner_name, contact_phone, soil_type, water_source } = req.body;
    const rows = await db.execute(sql`
      UPDATE farms SET name=${name}, location=${location || null}, area_acres=${area_acres || null},
        owner_name=${owner_name || null}, contact_phone=${contact_phone || null},
        soil_type=${soil_type || null}, water_source=${water_source || null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/farms/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE farms SET is_active=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Crop Cycles ───────────────────────────────────────────────────────────────
router.get("/crop-cycles", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT cc.*, f.name as farm_name, f.location as farm_location
      FROM crop_cycles cc LEFT JOIN farms f ON f.id=cc.farm_id
      WHERE cc.tenant_id=${tid(req)} ORDER BY cc.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/crop-cycles", requireAuth, async (req: any, res) => {
  try {
    const { farm_id, crop_name, variety, season, sowing_date, expected_harvest_date, area_acres, seed_qty_kg, fertilizer_cost, labor_cost, other_cost, notes } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO crop_cycles (tenant_id, farm_id, crop_name, variety, season, sowing_date, expected_harvest_date, area_acres, seed_qty_kg, fertilizer_cost, labor_cost, other_cost, notes)
      VALUES (${tid(req)}, ${farm_id || null}, ${crop_name}, ${variety || null}, ${season || null},
              ${sowing_date || null}, ${expected_harvest_date || null}, ${area_acres || null},
              ${seed_qty_kg || null}, ${fertilizer_cost || 0}, ${labor_cost || 0}, ${other_cost || 0}, ${notes || null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/crop-cycles/:id", requireAuth, async (req: any, res) => {
  try {
    const { crop_name, variety, season, sowing_date, expected_harvest_date, actual_harvest_date, area_acres, seed_qty_kg, fertilizer_cost, labor_cost, other_cost, yield_qty_tons, selling_price_per_ton, status, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE crop_cycles SET crop_name=${crop_name}, variety=${variety || null}, season=${season || null},
        sowing_date=${sowing_date || null}, expected_harvest_date=${expected_harvest_date || null},
        actual_harvest_date=${actual_harvest_date || null}, area_acres=${area_acres || null},
        seed_qty_kg=${seed_qty_kg || null}, fertilizer_cost=${fertilizer_cost || 0},
        labor_cost=${labor_cost || 0}, other_cost=${other_cost || 0},
        yield_qty_tons=${yield_qty_tons || null}, selling_price_per_ton=${selling_price_per_ton || null},
        status=${status || 'sown'}, notes=${notes || null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Commodity Prices ──────────────────────────────────────────────────────────
router.get("/commodity-prices", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM commodity_prices WHERE tenant_id=${tid(req)} ORDER BY price_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/commodity-prices", requireAuth, async (req: any, res) => {
  try {
    const { commodity_name, variety, market_name, price_per_quintal, min_price, max_price, price_date, source } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO commodity_prices (tenant_id, commodity_name, variety, market_name, price_per_quintal, min_price, max_price, price_date, source)
      VALUES (${tid(req)}, ${commodity_name}, ${variety || null}, ${market_name || null},
              ${price_per_quintal}, ${min_price || null}, ${max_price || null}, ${price_date}, ${source || null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/commodity-prices/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM commodity_prices WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Procurement ───────────────────────────────────────────────────────────────
router.get("/procurement", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM agri_procurement WHERE tenant_id=${tid(req)} ORDER BY procurement_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/procurement", requireAuth, async (req: any, res) => {
  try {
    const { farmer_name, farmer_phone, commodity, variety, quantity_tons, rate_per_ton, procurement_date, quality_grade, moisture_pct, notes } = req.body;
    const no = "PROC-" + Date.now();
    const total = (quantity_tons || 0) * (rate_per_ton || 0);
    const rows = await db.execute(sql`
      INSERT INTO agri_procurement (tenant_id, procurement_no, farmer_name, farmer_phone, commodity, variety, quantity_tons, rate_per_ton, total_amount, procurement_date, quality_grade, moisture_pct, notes)
      VALUES (${tid(req)}, ${no}, ${farmer_name}, ${farmer_phone || null}, ${commodity},
              ${variety || null}, ${quantity_tons}, ${rate_per_ton}, ${total},
              ${procurement_date}, ${quality_grade || null}, ${moisture_pct || null}, ${notes || null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/procurement/:id", requireAuth, async (req: any, res) => {
  try {
    const { farmer_name, farmer_phone, commodity, variety, quantity_tons, rate_per_ton, procurement_date, quality_grade, moisture_pct, status, notes } = req.body;
    const total = (quantity_tons || 0) * (rate_per_ton || 0);
    const rows = await db.execute(sql`
      UPDATE agri_procurement SET farmer_name=${farmer_name}, farmer_phone=${farmer_phone || null},
        commodity=${commodity}, variety=${variety || null}, quantity_tons=${quantity_tons},
        rate_per_ton=${rate_per_ton}, total_amount=${total}, procurement_date=${procurement_date},
        quality_grade=${quality_grade || null}, moisture_pct=${moisture_pct || null},
        status=${status || 'received'}, notes=${notes || null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Stats
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const [farms, cycles, procurement] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM farms WHERE tenant_id=${tid(req)} AND is_active=1`),
      db.execute(sql`SELECT COUNT(*) as count FROM crop_cycles WHERE tenant_id=${tid(req)} AND status IN ('sown','growing')`),
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as total FROM agri_procurement WHERE tenant_id=${tid(req)} AND EXTRACT(MONTH FROM procurement_date)=EXTRACT(MONTH FROM CURRENT_DATE)`),
    ]);
    res.json({
      totalFarms: Number(farms.rows[0]?.count || 0),
      activeCycles: Number(cycles.rows[0]?.count || 0),
      monthlyProcurement: Number(procurement.rows[0]?.total || 0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
