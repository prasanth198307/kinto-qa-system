import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── Farms ─────────────────────────────────────────────────────────────────────
router.get("/farms", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM farms WHERE tenant_id=${tid(req)} AND is_active=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/farms", requireAuth, async (req: any, res) => {
  try {
    const { name, location, area_acres, owner_name, contact_phone, soil_type, water_source } = req.body;
    const code = "FARM-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO farms (tenant_id, farm_code, name, location, area_acres, owner_name, contact_phone, soil_type, water_source)
      VALUES (${tid(req)}, ${code}, ${name}, ${location||null}, ${area_acres||null},
              ${owner_name||null}, ${contact_phone||null}, ${soil_type||null}, ${water_source||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/farms/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, location, area_acres, owner_name, contact_phone, soil_type, water_source } = req.body;
    const rows = await db.execute(sql`
      UPDATE farms SET name=${name}, location=${location||null}, area_acres=${area_acres||null},
        owner_name=${owner_name||null}, contact_phone=${contact_phone||null},
        soil_type=${soil_type||null}, water_source=${water_source||null}
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

// ── Farmers ───────────────────────────────────────────────────────────────────
router.get("/farmers", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM farmers WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/farmers", requireAuth, async (req: any, res) => {
  try {
    const { name, phone, village, taluka, district, state, land_area, land_area_unit, bank_account, bank_name, ifsc_code, aadhar_number } = req.body;
    const code = "FRM-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO farmers (tenant_id, farmer_code, name, phone, village, taluka, district, state, land_area, land_area_unit, bank_account, bank_name, ifsc_code, aadhar_number)
      VALUES (${tid(req)}, ${code}, ${name}, ${phone||null}, ${village||null}, ${taluka||null},
              ${district||null}, ${state||null}, ${land_area||null}, ${land_area_unit||'acre'},
              ${bank_account||null}, ${bank_name||null}, ${ifsc_code||null}, ${aadhar_number||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/farmers/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, phone, village, taluka, district, state, land_area, land_area_unit, bank_account, bank_name, ifsc_code, aadhar_number } = req.body;
    const rows = await db.execute(sql`
      UPDATE farmers SET name=${name}, phone=${phone||null}, village=${village||null},
        taluka=${taluka||null}, district=${district||null}, state=${state||null},
        land_area=${land_area||null}, land_area_unit=${land_area_unit||'acre'},
        bank_account=${bank_account||null}, bank_name=${bank_name||null},
        ifsc_code=${ifsc_code||null}, aadhar_number=${aadhar_number||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/farmers/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE farmers SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Crop Cycles ───────────────────────────────────────────────────────────────
router.get("/crop-cycles", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT cc.*, f.name as farm_name, f.location as farm_location, fr.name as farmer_name
      FROM crop_cycles cc
      LEFT JOIN farms f ON f.id::text=cc.farm_id::text
      LEFT JOIN farmers fr ON fr.id=cc.farmer_id
      WHERE cc.tenant_id=${tid(req)} ORDER BY cc.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/crop-cycles", requireAuth, async (req: any, res) => {
  try {
    const { farm_id, farmer_id, crop_name, variety, season, sowing_date, expected_harvest_date, area_acres, area, area_unit, seed_qty_kg, fertilizer_cost, labor_cost, other_cost, expected_yield, notes } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO crop_cycles (tenant_id, farm_id, farmer_id, crop_name, variety, season, sowing_date, expected_harvest_date, area_acres, area, area_unit, seed_qty_kg, fertilizer_cost, labor_cost, other_cost, expected_yield, notes)
      VALUES (${tid(req)}, ${farm_id||null}, ${farmer_id||null}, ${crop_name}, ${variety||null},
              ${season||null}, ${sowing_date||null}, ${expected_harvest_date||null},
              ${area_acres||area||null}, ${area||area_acres||null}, ${area_unit||'acre'},
              ${seed_qty_kg||null}, ${fertilizer_cost||0}, ${labor_cost||0}, ${other_cost||0},
              ${expected_yield||null}, ${notes||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/crop-cycles/:id", requireAuth, async (req: any, res) => {
  try {
    const { crop_name, variety, season, sowing_date, expected_harvest_date, actual_harvest_date, area_acres, area, area_unit, seed_qty_kg, fertilizer_cost, labor_cost, other_cost, yield_qty_tons, actual_yield, selling_price_per_ton, status, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE crop_cycles SET crop_name=${crop_name}, variety=${variety||null}, season=${season||null},
        sowing_date=${sowing_date||null}, expected_harvest_date=${expected_harvest_date||null},
        actual_harvest_date=${actual_harvest_date||null}, area_acres=${area_acres||area||null},
        area=${area||area_acres||null}, area_unit=${area_unit||'acre'},
        seed_qty_kg=${seed_qty_kg||null}, fertilizer_cost=${fertilizer_cost||0},
        labor_cost=${labor_cost||0}, other_cost=${other_cost||0},
        yield_qty_tons=${yield_qty_tons||null}, actual_yield=${actual_yield||null},
        selling_price_per_ton=${selling_price_per_ton||null},
        status=${status||'sown'}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Crop Inputs ───────────────────────────────────────────────────────────────
router.get("/crop-inputs", requireAuth, async (req: any, res) => {
  try {
    const { crop_cycle_id } = req.query;
    const rows = await db.execute(
      crop_cycle_id
        ? sql`SELECT * FROM crop_inputs WHERE tenant_id=${tid(req)} AND crop_cycle_id=${String(crop_cycle_id)} AND record_status=1 ORDER BY application_date DESC`
        : sql`SELECT ci.*, cc.crop_name FROM crop_inputs ci LEFT JOIN crop_cycles cc ON cc.id::text=ci.crop_cycle_id::text WHERE ci.tenant_id=${tid(req)} AND ci.record_status=1 ORDER BY ci.application_date DESC`
    );
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/crop-inputs", requireAuth, async (req: any, res) => {
  try {
    const { crop_cycle_id, input_type, input_name, quantity, unit, cost_per_unit, total_cost, application_date, vendor_name, notes } = req.body;
    const tot = total_cost || ((quantity||0) * (cost_per_unit||0));
    const rows = await db.execute(sql`
      INSERT INTO crop_inputs (tenant_id, crop_cycle_id, input_type, input_name, quantity, unit, cost_per_unit, total_cost, application_date, vendor_name, notes)
      VALUES (${tid(req)}, ${crop_cycle_id||null}, ${input_type}, ${input_name}, ${quantity||null},
              ${unit||null}, ${cost_per_unit||null}, ${tot}, ${application_date||null},
              ${vendor_name||null}, ${notes||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/crop-inputs/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE crop_inputs SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Harvest Records ───────────────────────────────────────────────────────────
router.get("/harvest-records", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT hr.*, cc.crop_name, cc.variety
      FROM harvest_records hr LEFT JOIN crop_cycles cc ON cc.id::text=hr.crop_cycle_id::text
      WHERE hr.tenant_id=${tid(req)} AND hr.record_status=1 ORDER BY hr.harvest_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/harvest-records", requireAuth, async (req: any, res) => {
  try {
    const { crop_cycle_id, harvest_date, quantity, unit, quality_grade, moisture_pct, market_price, storage_location, notes } = req.body;
    const total_value = (quantity||0) * (market_price||0);
    const rows = await db.execute(sql`
      INSERT INTO harvest_records (tenant_id, crop_cycle_id, harvest_date, quantity, unit, quality_grade, moisture_pct, market_price, total_value, storage_location, notes)
      VALUES (${tid(req)}, ${crop_cycle_id||null}, ${harvest_date}, ${quantity}, ${unit||'kg'},
              ${quality_grade||null}, ${moisture_pct||null}, ${market_price||0},
              ${total_value}, ${storage_location||null}, ${notes||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/harvest-records/:id", requireAuth, async (req: any, res) => {
  try {
    const { harvest_date, quantity, unit, quality_grade, moisture_pct, market_price, storage_location, notes } = req.body;
    const total_value = (quantity||0) * (market_price||0);
    const rows = await db.execute(sql`
      UPDATE harvest_records SET harvest_date=${harvest_date}, quantity=${quantity}, unit=${unit||'kg'},
        quality_grade=${quality_grade||null}, moisture_pct=${moisture_pct||null},
        market_price=${market_price||0}, total_value=${total_value},
        storage_location=${storage_location||null}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/harvest-records/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE harvest_records SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
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
      VALUES (${tid(req)}, ${commodity_name}, ${variety||null}, ${market_name||null},
              ${price_per_quintal}, ${min_price||null}, ${max_price||null}, ${price_date}, ${source||null})
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
    const total = (quantity_tons||0) * (rate_per_ton||0);
    const rows = await db.execute(sql`
      INSERT INTO agri_procurement (tenant_id, procurement_no, farmer_name, farmer_phone, commodity, variety, quantity_tons, rate_per_ton, total_amount, procurement_date, quality_grade, moisture_pct, notes)
      VALUES (${tid(req)}, ${no}, ${farmer_name}, ${farmer_phone||null}, ${commodity},
              ${variety||null}, ${quantity_tons}, ${rate_per_ton}, ${total},
              ${procurement_date}, ${quality_grade||null}, ${moisture_pct||null}, ${notes||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/procurement/:id", requireAuth, async (req: any, res) => {
  try {
    const { farmer_name, farmer_phone, commodity, variety, quantity_tons, rate_per_ton, procurement_date, quality_grade, moisture_pct, status, notes } = req.body;
    const total = (quantity_tons||0) * (rate_per_ton||0);
    const rows = await db.execute(sql`
      UPDATE agri_procurement SET farmer_name=${farmer_name}, farmer_phone=${farmer_phone||null},
        commodity=${commodity}, variety=${variety||null}, quantity_tons=${quantity_tons},
        rate_per_ton=${rate_per_ton}, total_amount=${total}, procurement_date=${procurement_date},
        quality_grade=${quality_grade||null}, moisture_pct=${moisture_pct||null},
        status=${status||'received'}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Agri Payments ─────────────────────────────────────────────────────────────
router.get("/agri-payments", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT ap.*, f.name as farmer_name_ref
      FROM agri_payments ap LEFT JOIN farmers f ON f.id=ap.farmer_id
      WHERE ap.tenant_id=${tid(req)} AND ap.record_status=1 ORDER BY ap.payment_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/agri-payments", requireAuth, async (req: any, res) => {
  try {
    const { farmer_id, payment_date, amount, purpose, payment_mode, reference_number, notes } = req.body;
    const code = "PAY-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO agri_payments (tenant_id, payment_code, farmer_id, payment_date, amount, purpose, payment_mode, reference_number, notes)
      VALUES (${tid(req)}, ${code}, ${farmer_id||null}, ${payment_date}, ${amount},
              ${purpose||null}, ${payment_mode||'cash'}, ${reference_number||null}, ${notes||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/agri-payments/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE agri_payments SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Soil Tests ────────────────────────────────────────────────────────────────
router.get("/soil-tests", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT st.*, f.name as farm_name_ref
      FROM soil_tests st LEFT JOIN farms f ON f.id::text=st.farm_id::text
      WHERE st.tenant_id=${tid(req)} AND st.record_status=1 ORDER BY st.test_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/soil-tests", requireAuth, async (req: any, res) => {
  try {
    const { farm_id, farm_name, test_date, nitrogen, phosphorus, potassium, ph_value, organic_carbon, ec_value, recommendations, tested_by } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO soil_tests (tenant_id, farm_id, farm_name, test_date, nitrogen, phosphorus, potassium, ph_value, organic_carbon, ec_value, recommendations, tested_by)
      VALUES (${tid(req)}, ${farm_id||null}, ${farm_name||null}, ${test_date},
              ${nitrogen||null}, ${phosphorus||null}, ${potassium||null}, ${ph_value||null},
              ${organic_carbon||null}, ${ec_value||null}, ${recommendations||null}, ${tested_by||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/soil-tests/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE soil_tests SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Stats ────────────────────────────────────────────────────────────────────
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const [farms, cycles, procurement, farmers, harvest] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM farms WHERE tenant_id=${tid(req)} AND is_active=1`),
      db.execute(sql`SELECT COUNT(*) as count FROM crop_cycles WHERE tenant_id=${tid(req)} AND status IN ('sown','growing')`),
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as total FROM agri_procurement WHERE tenant_id=${tid(req)} AND EXTRACT(MONTH FROM procurement_date)=EXTRACT(MONTH FROM CURRENT_DATE)`),
      db.execute(sql`SELECT COUNT(*) as count FROM farmers WHERE tenant_id=${tid(req)} AND record_status=1`),
      db.execute(sql`SELECT COALESCE(SUM(total_value),0) as total FROM harvest_records WHERE tenant_id=${tid(req)} AND EXTRACT(MONTH FROM harvest_date)=EXTRACT(MONTH FROM CURRENT_DATE)`),
    ]);
    res.json({
      totalFarms: Number(farms.rows[0]?.count||0),
      activeCycles: Number(cycles.rows[0]?.count||0),
      monthlyProcurement: Number(procurement.rows[0]?.total||0),
      totalFarmers: Number(farmers.rows[0]?.count||0),
      monthlyHarvestValue: Number(harvest.rows[0]?.total||0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Phase 7J: Mandi Prices ───────────────────────────────────────────────────
router.get("/mandi-prices", async (req: any, res) => {
  const { commodity = "Wheat", state = "MP" } = req.query;
  res.json([
    { date: new Date().toISOString().slice(0,10), mandi: `${state} APMC`, min: 2100, max: 2350, modal: 2250 },
    { date: new Date(Date.now()-86400000).toISOString().slice(0,10), mandi: `${state} APMC`, min: 2050, max: 2300, modal: 2180 },
  ]);
});

// ── Phase 7J: PMFBY ──────────────────────────────────────────────────────────
router.get("/pmfby", async (_req: any, res) => { res.json([]); });
router.post("/pmfby", async (req: any, res) => { res.json({ id: Date.now(), ...req.body }); });
router.get("/pmfby/claims", async (_req: any, res) => { res.json([]); });

export default router;
