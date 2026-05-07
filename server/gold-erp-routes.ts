import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
};
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);
const seq = () => Date.now();

// ── Dashboard Stats ───────────────────────────────────────────────────────────
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const [rates, karigars, items, repairs, schemes] = await Promise.all([
      db.execute(sql`SELECT rate_per_gram FROM jw_metal_rates WHERE tenant_id=${t} AND metal='gold' ORDER BY rate_date DESC, id DESC LIMIT 1`),
      db.execute(sql`SELECT COUNT(*) cnt FROM jw_karigars WHERE tenant_id=${t} AND record_status=1`),
      db.execute(sql`SELECT COUNT(*) cnt FROM jw_items WHERE tenant_id=${t} AND record_status=1`),
      db.execute(sql`SELECT COUNT(*) cnt FROM jw_repairs WHERE tenant_id=${t} AND record_status=1 AND status NOT IN ('delivered','cancelled')`),
      db.execute(sql`SELECT COUNT(*) cnt FROM jw_chit_schemes WHERE tenant_id=${t} AND record_status=1 AND status='active'`),
    ]);
    res.json({
      goldRate: Number(rates.rows[0]?.rate_per_gram || 0),
      totalKarigars: Number(karigars.rows[0]?.cnt || 0),
      totalItems: Number(items.rows[0]?.cnt || 0),
      activeRepairs: Number(repairs.rows[0]?.cnt || 0),
      activeSchemes: Number(schemes.rows[0]?.cnt || 0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Metal Rates ───────────────────────────────────────────────────────────────
router.get("/metal-rates", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_metal_rates WHERE tenant_id=${tid(req)} ORDER BY rate_date DESC, id DESC LIMIT 100`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/metal-rates/today", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT DISTINCT ON (metal, purity_name) * FROM jw_metal_rates WHERE tenant_id=${tid(req)} ORDER BY metal, purity_name, rate_date DESC, id DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/metal-rates", requireAuth, async (req: any, res) => {
  try {
    const { metal, purity_name, purity_percent, rate_per_gram, source, rate_date } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_metal_rates (tenant_id, metal, purity_name, purity_percent, rate_per_gram, source, rate_date)
      VALUES (${tid(req)}, ${metal||'gold'}, ${purity_name}, ${purity_percent}, ${rate_per_gram}, ${source||'manual'}, ${rate_date||new Date().toISOString().slice(0,10)})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/metal-rates/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM jw_metal_rates WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Karigars ─────────────────────────────────────────────────────────────────
router.get("/karigars", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_karigars WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/karigars", requireAuth, async (req: any, res) => {
  try {
    const { name, phone, address, aadhar_no, specialization, metal_type, wage_per_gram } = req.body;
    const code = "KAR-" + seq();
    const row = await db.execute(sql`
      INSERT INTO jw_karigars (tenant_id, karigar_code, name, phone, address, aadhar_no, specialization, metal_type, wage_per_gram)
      VALUES (${tid(req)}, ${code}, ${name}, ${phone||null}, ${address||null}, ${aadhar_no||null}, ${specialization||null}, ${metal_type||'gold'}, ${wage_per_gram||0})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/karigars/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, phone, address, aadhar_no, specialization, metal_type, wage_per_gram, status } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_karigars SET name=${name}, phone=${phone||null}, address=${address||null},
        aadhar_no=${aadhar_no||null}, specialization=${specialization||null},
        metal_type=${metal_type||'gold'}, wage_per_gram=${wage_per_gram||0}, status=${status||'active'}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/karigars/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE jw_karigars SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Jewellery Items ───────────────────────────────────────────────────────────
router.get("/items", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_items WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/items", requireAuth, async (req: any, res) => {
  try {
    const { name, category, metal_type, purity_name, purity_percent, gross_weight_gm, stone_weight_gm,
            making_charge_type, making_charge_value, wastage_pct, stone_value, selling_price, stock_qty, image_url } = req.body;
    const code = "JW-" + seq();
    const net_wt = Number(gross_weight_gm||0) - Number(stone_weight_gm||0);
    const row = await db.execute(sql`
      INSERT INTO jw_items (tenant_id, item_code, name, category, metal_type, purity_name, purity_percent,
        gross_weight_gm, stone_weight_gm, net_weight_gm, making_charge_type, making_charge_value,
        wastage_pct, stone_value, selling_price, stock_qty, image_url)
      VALUES (${tid(req)}, ${code}, ${name}, ${category||null}, ${metal_type||'gold'}, ${purity_name||null}, ${purity_percent||null},
        ${gross_weight_gm||0}, ${stone_weight_gm||0}, ${net_wt}, ${making_charge_type||'percent'}, ${making_charge_value||0},
        ${wastage_pct||0}, ${stone_value||0}, ${selling_price||null}, ${stock_qty||1}, ${image_url||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/items/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, category, metal_type, purity_name, purity_percent, gross_weight_gm, stone_weight_gm,
            making_charge_type, making_charge_value, wastage_pct, stone_value, selling_price, stock_qty, status } = req.body;
    const net_wt = Number(gross_weight_gm||0) - Number(stone_weight_gm||0);
    const row = await db.execute(sql`
      UPDATE jw_items SET name=${name}, category=${category||null}, metal_type=${metal_type||'gold'},
        purity_name=${purity_name||null}, purity_percent=${purity_percent||null},
        gross_weight_gm=${gross_weight_gm||0}, stone_weight_gm=${stone_weight_gm||0}, net_weight_gm=${net_wt},
        making_charge_type=${making_charge_type||'percent'}, making_charge_value=${making_charge_value||0},
        wastage_pct=${wastage_pct||0}, stone_value=${stone_value||0}, selling_price=${selling_price||null},
        stock_qty=${stock_qty||1}, status=${status||'active'}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/items/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE jw_items SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Estimates ─────────────────────────────────────────────────────────────────
router.get("/estimates", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_estimates WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/estimates", requireAuth, async (req: any, res) => {
  try {
    const { customer_name, customer_phone, metal_type, purity_name, rate_per_gram,
            total_metal_value, making_charges, stone_value, wastage_amount, gst_pct, gst_amount, total_amount, valid_until, notes } = req.body;
    const no = "EST-" + seq();
    const row = await db.execute(sql`
      INSERT INTO jw_estimates (tenant_id, estimate_no, customer_name, customer_phone, metal_type, purity_name,
        rate_per_gram, total_metal_value, making_charges, stone_value, wastage_amount, gst_pct, gst_amount, total_amount, valid_until, notes)
      VALUES (${tid(req)}, ${no}, ${customer_name||null}, ${customer_phone||null}, ${metal_type||'gold'}, ${purity_name||null},
        ${rate_per_gram||0}, ${total_metal_value||0}, ${making_charges||0}, ${stone_value||0}, ${wastage_amount||0},
        ${gst_pct||3}, ${gst_amount||0}, ${total_amount||0}, ${valid_until||null}, ${notes||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/estimates/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, notes } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_estimates SET status=${status}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Design Library ────────────────────────────────────────────────────────────
router.get("/designs", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_design_library WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/designs", requireAuth, async (req: any, res) => {
  try {
    const { name, category, metal_type, purity_name, estimated_weight_gm, notes } = req.body;
    const code = "DSN-" + seq();
    const row = await db.execute(sql`
      INSERT INTO jw_design_library (tenant_id, design_code, name, category, metal_type, purity_name, estimated_weight_gm, notes)
      VALUES (${tid(req)}, ${code}, ${name}, ${category||null}, ${metal_type||'gold'}, ${purity_name||null}, ${estimated_weight_gm||null}, ${notes||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/designs/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, category, metal_type, purity_name, estimated_weight_gm, notes, status } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_design_library SET name=${name}, category=${category||null}, metal_type=${metal_type||'gold'},
        purity_name=${purity_name||null}, estimated_weight_gm=${estimated_weight_gm||null}, notes=${notes||null}, status=${status||'active'}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/designs/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE jw_design_library SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Production Orders ─────────────────────────────────────────────────────────
router.get("/production-orders", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT po.*, d.name design_name, k.name karigar_name
      FROM jw_production_orders po
      LEFT JOIN jw_design_library d ON d.id = po.design_id
      LEFT JOIN jw_karigars k ON k.id = po.karigar_id
      WHERE po.tenant_id=${tid(req)} AND po.record_status=1
      ORDER BY po.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/production-orders", requireAuth, async (req: any, res) => {
  try {
    const { design_id, karigar_id, qty, metal_type, purity_name, issued_weight_gm, target_date, notes } = req.body;
    const no = "PRD-" + seq();
    const row = await db.execute(sql`
      INSERT INTO jw_production_orders (tenant_id, order_no, design_id, karigar_id, qty, metal_type, purity_name, issued_weight_gm, target_date, notes)
      VALUES (${tid(req)}, ${no}, ${design_id||null}, ${karigar_id||null}, ${qty||1}, ${metal_type||'gold'}, ${purity_name||null}, ${issued_weight_gm||0}, ${target_date||null}, ${notes||null})
      RETURNING *`);
    // Insert default production stages
    const orderId = row.rows[0].id;
    const stages = ["CAD","Sketch","Ghat","Casting","Tree Setup","CAM","Filing & Buffing","Fitting","Polish","Quality Check","Finalize / Barcode","Settlement"];
    for (let i = 0; i < stages.length; i++) {
      await db.execute(sql`INSERT INTO jw_production_stages (production_order_id, stage_name, stage_order, status) VALUES (${orderId}, ${stages[i]}, ${i+1}, 'pending')`);
    }
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/production-orders/:id/stages", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_production_stages WHERE production_order_id=${req.params.id} ORDER BY stage_order`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/production-orders/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, current_stage, received_weight_gm, notes } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_production_orders SET status=${status||'pending'}, current_stage=${current_stage||null},
        received_weight_gm=${received_weight_gm||0}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/production-stages/:id", requireAuth, async (req: any, res) => {
  try {
    const { weight_in_gm, weight_out_gm, assigned_to, status, notes, cad_file_url } = req.body;
    const started = status === 'in_progress' ? sql`NOW()` : sql`started_at`;
    const completed = status === 'completed' ? sql`NOW()` : sql`completed_at`;
    const row = await db.execute(sql`
      UPDATE jw_production_stages SET weight_in_gm=${weight_in_gm||null}, weight_out_gm=${weight_out_gm||null},
        assigned_to=${assigned_to||null}, status=${status}, notes=${notes||null}, cad_file_url=${cad_file_url||null},
        started_at=CASE WHEN ${status}='in_progress' AND started_at IS NULL THEN NOW() ELSE started_at END,
        completed_at=CASE WHEN ${status}='completed' AND completed_at IS NULL THEN NOW() ELSE completed_at END
      WHERE id=${req.params.id} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Jobwork Orders ────────────────────────────────────────────────────────────
router.get("/jobwork-orders", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT j.*, k.name karigar_name FROM jw_jobwork_orders j
      LEFT JOIN jw_karigars k ON k.id = j.karigar_id
      WHERE j.tenant_id=${tid(req)} AND j.record_status=1 ORDER BY j.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/jobwork-orders", requireAuth, async (req: any, res) => {
  try {
    const { karigar_id, metal_type, purity_name, description, issued_weight_gm, wage_per_gram, expected_date, notes } = req.body;
    const no = "JW-" + seq();
    const total_wage = Number(issued_weight_gm||0) * Number(wage_per_gram||0);
    const row = await db.execute(sql`
      INSERT INTO jw_jobwork_orders (tenant_id, jobwork_no, karigar_id, metal_type, purity_name, description, issued_weight_gm, wage_per_gram, total_wage, expected_date, notes)
      VALUES (${tid(req)}, ${no}, ${karigar_id||null}, ${metal_type||'gold'}, ${purity_name||null}, ${description||null}, ${issued_weight_gm||0}, ${wage_per_gram||0}, ${total_wage}, ${expected_date||null}, ${notes||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/jobwork-orders/:id", requireAuth, async (req: any, res) => {
  try {
    const { received_weight_gm, status, completed_date, notes } = req.body;
    const wastage = req.body.wastage_gm || 0;
    const row = await db.execute(sql`
      UPDATE jw_jobwork_orders SET received_weight_gm=${received_weight_gm||0}, wastage_gm=${wastage},
        status=${status||'pending'}, completed_date=${completed_date||null}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Bullion ───────────────────────────────────────────────────────────────────
router.get("/bullion-stock", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_bullion_stock WHERE tenant_id=${tid(req)} ORDER BY metal_type, purity_name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/bullion-transactions", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_bullion_transactions WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/bullion-transactions", requireAuth, async (req: any, res) => {
  try {
    const { txn_type, metal_type, purity_name, weight_gm, rate_per_gram, party_name, txn_date, notes } = req.body;
    const no = "BUL-" + seq();
    const amount = Number(weight_gm||0) * Number(rate_per_gram||0);
    const row = await db.execute(sql`
      INSERT INTO jw_bullion_transactions (tenant_id, txn_no, txn_type, metal_type, purity_name, weight_gm, rate_per_gram, amount, party_name, txn_date, notes)
      VALUES (${tid(req)}, ${no}, ${txn_type}, ${metal_type||'gold'}, ${purity_name||null}, ${weight_gm||0}, ${rate_per_gram||0}, ${amount}, ${party_name||null}, ${txn_date||new Date().toISOString().slice(0,10)}, ${notes||null})
      RETURNING *`);
    // Update bullion stock
    const sign = ['purchase','inward','buy'].includes(txn_type) ? 1 : -1;
    await db.execute(sql`
      INSERT INTO jw_bullion_stock (tenant_id, metal_type, purity_name, stock_grams, avg_rate, last_updated)
      VALUES (${tid(req)}, ${metal_type||'gold'}, ${purity_name||'N/A'}, ${Number(weight_gm||0)*sign}, ${rate_per_gram||0}, NOW())
      ON CONFLICT (tenant_id, metal_type, purity_name)
      DO UPDATE SET stock_grams = jw_bullion_stock.stock_grams + ${Number(weight_gm||0)*sign}, last_updated=NOW()`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/bullion-transactions/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE jw_bullion_transactions SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Repairs ───────────────────────────────────────────────────────────────────
router.get("/repairs", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT r.*, k.name karigar_name FROM jw_repairs r
      LEFT JOIN jw_karigars k ON k.id = r.karigar_id
      WHERE r.tenant_id=${tid(req)} AND r.record_status=1 ORDER BY r.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/repairs", requireAuth, async (req: any, res) => {
  try {
    const { customer_name, customer_phone, item_description, karigar_id, issue_date, expected_delivery,
            repair_type, metal_type, metal_weight_gm, old_gold_weight_gm, repair_charges, advance_amount, notes } = req.body;
    const no = "REP-" + seq();
    const row = await db.execute(sql`
      INSERT INTO jw_repairs (tenant_id, repair_no, customer_name, customer_phone, item_description, karigar_id,
        issue_date, expected_delivery, repair_type, metal_type, metal_weight_gm, old_gold_weight_gm, repair_charges, advance_amount, notes)
      VALUES (${tid(req)}, ${no}, ${customer_name}, ${customer_phone||null}, ${item_description||null}, ${karigar_id||null},
        ${issue_date||new Date().toISOString().slice(0,10)}, ${expected_delivery||null}, ${repair_type||null},
        ${metal_type||'gold'}, ${metal_weight_gm||0}, ${old_gold_weight_gm||0}, ${repair_charges||0}, ${advance_amount||0}, ${notes||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/repairs/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, delivered_date, repair_charges, notes, karigar_id } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_repairs SET status=${status||'received'}, delivered_date=${delivered_date||null},
        repair_charges=${repair_charges||0}, notes=${notes||null}, karigar_id=${karigar_id||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/repairs/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE jw_repairs SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Hallmarking ───────────────────────────────────────────────────────────────
router.get("/hallmarking", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_hallmarking WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/hallmarking", requireAuth, async (req: any, res) => {
  try {
    const { item_description, metal_type, purity_name, gross_weight_gm, net_weight_gm, assay_centre, lot_no, hallmark_date } = req.body;
    const huid = "HUID" + Math.random().toString(36).substr(2,8).toUpperCase();
    const row = await db.execute(sql`
      INSERT INTO jw_hallmarking (tenant_id, huid, item_description, metal_type, purity_name, gross_weight_gm, net_weight_gm, assay_centre, lot_no, hallmark_date)
      VALUES (${tid(req)}, ${huid}, ${item_description||null}, ${metal_type||'gold'}, ${purity_name||null},
        ${gross_weight_gm||0}, ${net_weight_gm||0}, ${assay_centre||null}, ${lot_no||null}, ${hallmark_date||new Date().toISOString().slice(0,10)})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/hallmarking/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, lot_no, assay_centre, certificate_url } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_hallmarking SET status=${status||'pending'}, lot_no=${lot_no||null},
        assay_centre=${assay_centre||null}, certificate_url=${certificate_url||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Chit Schemes ──────────────────────────────────────────────────────────────
router.get("/chit-schemes", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT s.*, COUNT(m.id) member_count FROM jw_chit_schemes s
      LEFT JOIN jw_chit_members m ON m.scheme_id=s.id AND m.status='active'
      WHERE s.tenant_id=${tid(req)} AND s.record_status=1
      GROUP BY s.id ORDER BY s.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/chit-schemes", requireAuth, async (req: any, res) => {
  try {
    const { name, duration_months, monthly_amount, metal_type, bonus_month_free, start_date, max_members, notes } = req.body;
    const code = "SCH-" + seq();
    const row = await db.execute(sql`
      INSERT INTO jw_chit_schemes (tenant_id, scheme_code, name, duration_months, monthly_amount, metal_type, bonus_month_free, start_date, max_members, notes)
      VALUES (${tid(req)}, ${code}, ${name}, ${duration_months||11}, ${monthly_amount}, ${metal_type||'gold'}, ${bonus_month_free||1}, ${start_date||null}, ${max_members||20}, ${notes||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/chit-schemes/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, status, max_members, notes } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_chit_schemes SET name=${name}, status=${status||'active'}, max_members=${max_members||20}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/chit-schemes/:id/members", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_chit_members WHERE scheme_id=${req.params.id} ORDER BY enrollment_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/chit-schemes/:id/members", requireAuth, async (req: any, res) => {
  try {
    const { member_name, phone, address } = req.body;
    const code = "MEM-" + seq();
    const row = await db.execute(sql`
      INSERT INTO jw_chit_members (scheme_id, tenant_id, member_code, member_name, phone, address)
      VALUES (${req.params.id}, ${tid(req)}, ${code}, ${member_name}, ${phone||null}, ${address||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/chit-members/:id/pay", requireAuth, async (req: any, res) => {
  try {
    const { amount, payment_mode, paid_date } = req.body;
    const mem = await db.execute(sql`SELECT * FROM jw_chit_members WHERE id=${req.params.id}`);
    const m = mem.rows[0] as any;
    if (!m) return res.status(404).json({ error: "Member not found" });
    const inst_no = Number(m.installments_paid || 0) + 1;
    await db.execute(sql`
      INSERT INTO jw_chit_installments (member_id, scheme_id, tenant_id, installment_no, paid_date, amount, payment_mode, status)
      VALUES (${req.params.id}, ${m.scheme_id}, ${tid(req)}, ${inst_no}, ${paid_date||new Date().toISOString().slice(0,10)}, ${amount}, ${payment_mode||'cash'}, 'paid')`);
    await db.execute(sql`
      UPDATE jw_chit_members SET installments_paid=${inst_no}, total_paid=total_paid+${Number(amount)}
      WHERE id=${req.params.id}`);
    res.json({ success: true, installment_no: inst_no });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/chit-members/:id/installments", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_chit_installments WHERE member_id=${req.params.id} ORDER BY installment_no`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Metal Ledger ──────────────────────────────────────────────────────────────
router.get("/metal-ledger", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`SELECT * FROM jw_metal_ledger WHERE tenant_id=${t} ORDER BY txn_date DESC, id DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/metal-ledger/balances", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`
      SELECT customer_name, customer_phone, metal_type, purity_name,
        SUM(CASE WHEN transaction_type IN ('inward','purchase','repair_return') THEN weight_gm ELSE -weight_gm END) AS balance_gm,
        MAX(txn_date) AS last_txn_date
      FROM jw_metal_ledger WHERE tenant_id=${t}
      GROUP BY customer_name, customer_phone, metal_type, purity_name
      HAVING SUM(CASE WHEN transaction_type IN ('inward','purchase','repair_return') THEN weight_gm ELSE -weight_gm END) != 0
      ORDER BY customer_name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/metal-ledger", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const { customer_name, customer_phone, metal_type, purity_name, transaction_type, weight_gm, rate_per_gram, reference_no, reference_type, txn_date, notes } = req.body;
    const amount = rate_per_gram ? Number(weight_gm) * Number(rate_per_gram) : null;
    const row = await db.execute(sql`
      INSERT INTO jw_metal_ledger (tenant_id, customer_name, customer_phone, metal_type, purity_name, transaction_type, weight_gm, rate_per_gram, amount, reference_no, reference_type, txn_date, notes)
      VALUES (${t}, ${customer_name}, ${customer_phone||null}, ${metal_type}, ${purity_name}, ${transaction_type}, ${weight_gm}, ${rate_per_gram||null}, ${amount}, ${reference_no||null}, ${reference_type||null}, ${txn_date}, ${notes||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get("/analytics/overview", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const [items, karigar, repairs, bullion, estimates, production, schemes] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) AS cnt, SUM(stock_qty) AS total_stock, SUM(selling_price * stock_qty) AS total_value FROM jw_items WHERE tenant_id=${t}`),
      db.execute(sql`SELECT COUNT(*) AS cnt FROM jw_karigars WHERE tenant_id=${t} AND status='active'`),
      db.execute(sql`SELECT COUNT(*) AS cnt, SUM(repair_charges) AS total_charges FROM jw_repairs WHERE tenant_id=${t} AND status NOT IN ('delivered','cancelled')`),
      db.execute(sql`SELECT metal_type, SUM(stock_grams) AS stock_grams, SUM(stock_grams * avg_rate) AS stock_value FROM jw_bullion_stock WHERE tenant_id=${t} GROUP BY metal_type`),
      db.execute(sql`SELECT COUNT(*) AS cnt, SUM(total_amount) AS total_value FROM jw_estimates WHERE tenant_id=${t} AND created_at > NOW() - INTERVAL '30 days'`),
      db.execute(sql`SELECT status, COUNT(*) AS cnt FROM jw_production_orders WHERE tenant_id=${t} GROUP BY status`),
      db.execute(sql`SELECT COUNT(*) AS cnt FROM jw_chit_schemes WHERE tenant_id=${t} AND status='active'`),
    ]);
    res.json({
      items: items.rows[0],
      karigars: karigar.rows[0],
      repairs: repairs.rows[0],
      bullionStock: bullion.rows,
      estimates30d: estimates.rows[0],
      productionByStatus: production.rows,
      activeSchemes: schemes.rows[0],
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/analytics/wastage", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`
      SELECT ps.stage_name,
        SUM(ps.weight_in_gm) AS total_in,
        SUM(ps.weight_out_gm) AS total_out,
        SUM(ps.wastage_gm) AS total_wastage,
        ROUND(
          CASE WHEN SUM(ps.weight_in_gm) > 0
            THEN SUM(ps.wastage_gm) * 100.0 / SUM(ps.weight_in_gm)
            ELSE 0 END, 2
        ) AS avg_wastage_pct,
        COUNT(*) AS stage_count
      FROM jw_production_stages ps
      JOIN jw_production_orders po ON po.id = ps.production_order_id
      WHERE po.tenant_id=${t} AND ps.status='completed' AND ps.wastage_gm IS NOT NULL
      GROUP BY ps.stage_name ORDER BY total_wastage DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/ghat-entries", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`
      SELECT g.id, g.job_id, g.stage AS stage_name, g.ghat_date AS weigh_date,
        g.gross_weight_gm AS issued_weight_gm,
        g.net_metal_weight_gm AS received_weight_gm,
        ROUND(g.gross_weight_gm - g.net_metal_weight_gm, 3) AS wastage_gm,
        ROUND(
          CASE WHEN g.gross_weight_gm > 0
            THEN (g.gross_weight_gm - g.net_metal_weight_gm) * 100.0 / g.gross_weight_gm
            ELSE 0 END, 2
        ) AS wastage_pct,
        g.purity_result_pct AS assay_purity_pct,
        g.alert_flag, g.notes, g.operator_name,
        po.order_no
      FROM jw_ghat_entries g
      LEFT JOIN jw_production_orders po ON po.id = g.production_order_id
      WHERE g.tenant_id=${t}
      ORDER BY g.ghat_date DESC, g.id DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/ghat-entries", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const { production_order_id, stage_name, karigar_id, issued_weight_gm, received_weight_gm,
      assay_purity_pct, weigh_date, notes } = req.body;
    const issued = Number(issued_weight_gm || 0);
    const received = Number(received_weight_gm || 0);
    const alert_flag = issued > 0 && (issued - received) / issued * 100 > 5 ? 1 : 0;
    const row = await db.execute(sql`
      INSERT INTO jw_ghat_entries
        (tenant_id, production_order_id, stage, ghat_date, gross_weight_gm, net_metal_weight_gm,
         purity_result_pct, operator_name, alert_flag, notes)
      VALUES (${t}, ${production_order_id || null}, ${stage_name || 'Casting'},
        ${weigh_date || 'CURRENT_DATE'}, ${issued}, ${received},
        ${assay_purity_pct || null}, ${null}, ${alert_flag}, ${notes || null})
      RETURNING id`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/analytics/karigar-output", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`
      SELECT k.name AS karigar_name, k.karigar_code,
        COUNT(po.id) AS total_orders,
        COUNT(CASE WHEN po.status='completed' THEN 1 END) AS completed_orders,
        SUM(po.issued_weight_gm) AS total_issued_gm,
        COUNT(jo.id) AS jobwork_count,
        SUM(jo.issued_weight_gm) AS jw_issued_gm,
        SUM(jo.received_weight_gm) AS jw_received_gm
      FROM jw_karigars k
      LEFT JOIN jw_production_orders po ON po.karigar_id=k.id
      LEFT JOIN jw_jobwork_orders jo ON jo.karigar_id=k.id
      WHERE k.tenant_id=${t}
      GROUP BY k.id, k.name, k.karigar_code ORDER BY total_orders DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/analytics/making-charges", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`
      SELECT DATE_TRUNC('month', created_at) AS month,
        COUNT(*) AS estimate_count,
        SUM(making_charges) AS total_making,
        SUM(total_metal_value) AS total_metal_value,
        SUM(total_amount) AS total_revenue,
        ROUND(AVG(wastage_amount),2) AS avg_wastage_amt
      FROM jw_estimates WHERE tenant_id=${t}
      GROUP BY 1 ORDER BY 1 DESC LIMIT 12`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/analytics/stock-value", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const [bullionStock, itemStock, todayRates] = await Promise.all([
      db.execute(sql`SELECT metal_type, purity_name, stock_grams, avg_rate, stock_grams*avg_rate AS value FROM jw_bullion_stock WHERE tenant_id=${t}`),
      db.execute(sql`SELECT metal_type, purity_name, SUM(gross_weight_gm*stock_qty) AS total_gm, SUM(selling_price*stock_qty) AS total_value FROM jw_items WHERE tenant_id=${t} GROUP BY metal_type, purity_name`),
      db.execute(sql`SELECT metal, purity_name, rate_per_gram FROM jw_metal_rates WHERE tenant_id=${t} AND rate_date=CURRENT_DATE`),
    ]);
    res.json({ bullionStock: bullionStock.rows, itemStock: itemStock.rows, todayRates: todayRates.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
