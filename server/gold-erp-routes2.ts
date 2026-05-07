import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import {
  journalForKarigarSettlement,
  journalForOldGoldBuyback,
  journalForGhatEntry,
} from "./journal-service";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
};
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);
const seq = () => Date.now();

// ── Gap 9: Audit trail helper ──────────────────────────────────────────────────
const goldAudit = (req: any, action: string, table: string, recordId: string, desc: string) => {
  db.execute(sql`
    INSERT INTO audit_logs (user_id, action, table_name, record_id, description, tenant_id, severity)
    VALUES (${String(req.user?.id || 0)}, ${action}, ${table}, ${recordId}, ${desc}, ${Number(tid(req))}, 'info')
  `).catch(() => {});
};

const SETTLEMENT_APPROVAL_THRESHOLD_INR = 50000; // ₹50k

// ── DESIGN LIBRARY (enhanced) ─────────────────────────────────────────────────
router.get("/designs/list", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_design_library WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── SKETCH PROCESS ────────────────────────────────────────────────────────────
router.get("/sketch", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT s.*, po.order_no, d.name design_name
      FROM jw_sketch_process s
      LEFT JOIN jw_production_orders po ON po.id=s.production_order_id
      LEFT JOIN jw_design_library d ON d.id=s.design_id
      WHERE po.tenant_id=${tid(req)} ORDER BY s.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/sketch", requireAuth, async (req: any, res) => {
  try {
    const { production_order_id, design_id, customer_brief, sketch_image_url, design_category, stone_details } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_sketch_process (production_order_id, design_id, customer_brief, sketch_image_url, design_category, stone_details, status)
      VALUES (${production_order_id}, ${design_id||null}, ${customer_brief||null}, ${sketch_image_url||null}, ${design_category||null}, ${stone_details||null}, 'pending')
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/sketch/:id", requireAuth, async (req: any, res) => {
  try {
    const { customer_approval, customer_approval_date, revision_notes, status, sketch_image_url } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_sketch_process SET customer_approval=${customer_approval||0},
        customer_approval_date=${customer_approval_date||null}, revision_notes=${revision_notes||null},
        status=${status||'pending'}, sketch_image_url=${sketch_image_url||null}
      WHERE id=${req.params.id} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── CAD PROCESS ───────────────────────────────────────────────────────────────
router.get("/cad", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT c.*, po.order_no FROM jw_cad_process c
      LEFT JOIN jw_production_orders po ON po.id=c.production_order_id
      WHERE po.tenant_id=${tid(req)} ORDER BY c.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/cad", requireAuth, async (req: any, res) => {
  try {
    const { production_order_id, cad_software, cad_file_url, weight_estimate_gm, render_image_url, design_notes } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_cad_process (production_order_id, cad_software, cad_file_url, weight_estimate_gm, render_image_url, design_notes, status)
      VALUES (${production_order_id}, ${cad_software||null}, ${cad_file_url||null}, ${weight_estimate_gm||null}, ${render_image_url||null}, ${design_notes||null}, 'in_progress')
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/cad/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, approval_status, approval_date, customer_approval, render_image_url, revision_count } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_cad_process SET status=${status||'in_progress'}, approval_status=${approval_status||null},
        approval_date=${approval_date||null}, customer_approval=${customer_approval||0},
        render_image_url=${render_image_url||null}, revision_count=${revision_count||0}
      WHERE id=${req.params.id} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── CAM PROCESS ───────────────────────────────────────────────────────────────
router.get("/cam", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT c.*, po.order_no FROM jw_cam_process c
      LEFT JOIN jw_production_orders po ON po.id=c.production_order_id
      WHERE po.tenant_id=${tid(req)} ORDER BY c.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/cam", requireAuth, async (req: any, res) => {
  try {
    const { production_order_id, milling_machine, milling_hours_est, wax_model_image_url } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_cam_process (production_order_id, milling_machine, milling_hours_est, wax_model_image_url, status)
      VALUES (${production_order_id}, ${milling_machine||null}, ${milling_hours_est||null}, ${wax_model_image_url||null}, 'pending')
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/cam/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, milling_hours_actual, wax_weight_gm, prototype_approved, notes } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_cam_process SET status=${status||'pending'}, milling_hours_actual=${milling_hours_actual||null},
        wax_weight_gm=${wax_weight_gm||null}, prototype_approved=${prototype_approved||0}, notes=${notes||null}
      WHERE id=${req.params.id} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── CASTING TREE ──────────────────────────────────────────────────────────────
router.get("/casting-trees", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT ct.*, po.order_no FROM jw_casting_trees ct
      LEFT JOIN jw_production_orders po ON po.id=ct.production_order_id
      WHERE po.tenant_id=${tid(req)} ORDER BY ct.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/casting-trees", requireAuth, async (req: any, res) => {
  try {
    const { production_order_id, tree_items, tree_wax_weight_gm, metal_type, purity_name, notes } = req.body;
    const gold_req = tree_items ? JSON.parse(JSON.stringify(tree_items)).length * 2.5 : 0; // approx
    const row = await db.execute(sql`
      INSERT INTO jw_casting_trees (production_order_id, tree_items, tree_wax_weight_gm, metal_type, purity_name, gold_required_gm, notes)
      VALUES (${production_order_id}, ${JSON.stringify(tree_items||[])}::jsonb, ${tree_wax_weight_gm||0}, ${metal_type||'gold'}, ${purity_name||null}, ${gold_req}, ${notes||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GHAT ENTRIES ──────────────────────────────────────────────────────────────
router.get("/ghat-entries", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT g.*, po.order_no FROM jw_ghat_entries g
      LEFT JOIN jw_production_orders po ON po.id=g.production_order_id
      WHERE po.tenant_id=${tid(req)} ORDER BY g.weigh_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/ghat-entries", requireAuth, async (req: any, res) => {
  try {
    const { production_order_id, stage_name, karigar_id, issued_weight_gm, received_weight_gm, assay_purity_pct, weigh_date, notes } = req.body;
    const wastage = Number(issued_weight_gm||0) - Number(received_weight_gm||0);
    const wastage_pct = Number(issued_weight_gm||0) > 0 ? (wastage / Number(issued_weight_gm)) * 100 : 0;
    const alert = wastage_pct > 5;
    const row = await db.execute(sql`
      INSERT INTO jw_ghat_entries (production_order_id, stage_name, karigar_id, issued_weight_gm, received_weight_gm,
        wastage_gm, wastage_pct, assay_purity_pct, weigh_date, alert_flag, notes)
      VALUES (${production_order_id}, ${stage_name}, ${karigar_id||null}, ${issued_weight_gm||0}, ${received_weight_gm||0},
        ${wastage}, ${wastage_pct.toFixed(3)}, ${assay_purity_pct||null}, ${weigh_date||new Date().toISOString().slice(0,10)}, ${alert?1:0}, ${notes||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── CASTING PROCESS ───────────────────────────────────────────────────────────
router.get("/casting", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT c.*, po.order_no FROM jw_casting_process c
      LEFT JOIN jw_production_orders po ON po.id=c.production_order_id
      WHERE po.tenant_id=${tid(req)} ORDER BY c.casting_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/casting", requireAuth, async (req: any, res) => {
  try {
    const { production_order_id, furnace_id, melt_weight_gm, sprue_cut_gm, net_casting_gm, casting_date, operator_name, notes } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_casting_process (production_order_id, furnace_id, melt_weight_gm, sprue_cut_gm,
        net_casting_gm, casting_date, operator_name, notes, status)
      VALUES (${production_order_id}, ${furnace_id||null}, ${melt_weight_gm||0}, ${sprue_cut_gm||0},
        ${net_casting_gm||0}, ${casting_date||new Date().toISOString().slice(0,10)}, ${operator_name||null}, ${notes||null}, 'completed')
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── FINISHING STAGES ──────────────────────────────────────────────────────────
router.get("/finishing", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT f.*, po.order_no FROM jw_finishing_stages f
      LEFT JOIN jw_production_orders po ON po.id=f.production_order_id
      WHERE po.tenant_id=${tid(req)} ORDER BY f.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/finishing", requireAuth, async (req: any, res) => {
  try {
    const { production_order_id, stage_type, karigar_id, weight_before_gm, weight_after_gm, stage_date, notes } = req.body;
    const wastage = Number(weight_before_gm||0) - Number(weight_after_gm||0);
    const row = await db.execute(sql`
      INSERT INTO jw_finishing_stages (production_order_id, stage_type, karigar_id, weight_before_gm, weight_after_gm, stage_date, notes, status)
      VALUES (${production_order_id}, ${stage_type||'filing'}, ${karigar_id||null}, ${weight_before_gm||0}, ${weight_after_gm||0}, ${stage_date||new Date().toISOString().slice(0,10)}, ${notes||null}, 'completed')
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/finishing/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, weight_after_gm, notes } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_finishing_stages SET status=${status||'pending'}, weight_after_gm=${weight_after_gm||null}, notes=${notes||null}
      WHERE id=${req.params.id} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── JOB FINALIZE ──────────────────────────────────────────────────────────────
router.get("/finalize", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT jf.*, po.order_no FROM jw_job_finalize jf
      LEFT JOIN jw_production_orders po ON po.id=jf.production_order_id
      WHERE po.tenant_id=${tid(req)} ORDER BY jf.finalize_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/finalize", requireAuth, async (req: any, res) => {
  try {
    const { production_order_id, final_weight_gm, huid_no, barcode, rfid_tag, stone_setting_done,
            qc_passed, qc_notes, moved_to_stock, item_id, finalize_date } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_job_finalize (production_order_id, final_weight_gm, huid_no, barcode, rfid_tag,
        stone_setting_done, qc_passed, qc_notes, moved_to_stock, item_id, finalize_date)
      VALUES (${production_order_id}, ${final_weight_gm||0}, ${huid_no||null}, ${barcode||null}, ${rfid_tag||null},
        ${stone_setting_done||0}, ${qc_passed||0}, ${qc_notes||null}, ${moved_to_stock||0}, ${item_id||null},
        ${finalize_date||new Date().toISOString().slice(0,10)})
      RETURNING *`);
    if (qc_passed) {
      await db.execute(sql`UPDATE jw_production_orders SET status='completed' WHERE id=${production_order_id}`);
    }
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── SETTLEMENT ────────────────────────────────────────────────────────────────
router.get("/settlements", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT s.*, po.order_no, k.name karigar_name FROM jw_settlement s
      LEFT JOIN jw_production_orders po ON po.id=s.production_order_id
      LEFT JOIN jw_karigars k ON k.id=s.karigar_id
      WHERE po.tenant_id=${tid(req)} ORDER BY s.settlement_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/settlements", requireAuth, async (req: any, res) => {
  try {
    const { production_order_id, karigar_id, gold_issued_gm, gold_received_gm, allowable_wastage_pct,
            actual_wastage_gm, excess_wastage_gm, wage_amount, excess_deduction, net_payable, settlement_date } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_settlement (production_order_id, karigar_id, gold_issued_gm, gold_received_gm,
        allowable_wastage_pct, actual_wastage_gm, excess_wastage_gm, wage_amount, excess_deduction, net_payable, settlement_date, status)
      VALUES (${production_order_id}, ${karigar_id}, ${gold_issued_gm||0}, ${gold_received_gm||0},
        ${allowable_wastage_pct||3}, ${actual_wastage_gm||0}, ${excess_wastage_gm||0},
        ${wage_amount||0}, ${excess_deduction||0}, ${net_payable||0},
        ${settlement_date||new Date().toISOString().slice(0,10)}, 'settled')
      RETURNING *`);
    const settlement = row.rows[0] as any;

    // Gap 3: Auto-post making charges journal for karigar settlement
    if (settlement) {
      // Look up karigar name
      db.execute(sql`SELECT name FROM jw_karigars WHERE id=${karigar_id}`).then(k => {
        const karigarName = (k.rows[0] as any)?.name || 'Unknown Karigar';
        journalForKarigarSettlement(settlement, karigarName)
          .catch(e => console.error('[GOLD JOURNAL] Settlement:', e.message));

        // Gap 12: Post TDS entry if TDS was deducted
        const tdsAmt = Number(settlement.tds_deducted || 0);
        if (tdsAmt > 0) {
          const grossAmt = Number(settlement.wage_amount || net_payable || 0);
          const tdsRatePct = grossAmt > 0 ? Math.round((tdsAmt / grossAmt) * 100) : 2;
          db.execute(sql`
            INSERT INTO tds_entries (entry_date, vendor_name, section, gross_amount, tds_rate, tds_amount, net_amount, description, deposit_status)
            VALUES (${settlement_date || new Date().toISOString().slice(0,10)}, ${karigarName}, '194C',
                    ${Math.round(grossAmt * 100)}, ${tdsRatePct},
                    ${Math.round(tdsAmt * 100)}, ${Math.round((grossAmt - tdsAmt) * 100)},
                    ${'Karigar settlement — ' + karigarName}, 'pending')
          `).catch(() => {});
        }

        // Gap 9: Audit trail (karigar name available here)
        db.execute(sql`
          INSERT INTO audit_logs (user_id, action, table_name, record_id, description, tenant_id, severity)
          VALUES (${String(0)}, 'CREATE', 'jw_settlement', ${String(settlement.id)},
                  ${'Karigar settlement — ' + karigarName + ' — Net: ₹' + net_payable + (tdsAmt > 0 ? ' (TDS: ₹' + tdsAmt + ')' : '')},
                  ${Number(settlement.tenant_id || 1)}, 'info')
        `).catch(() => {});
      }).catch(() => {});

      // Gap 8: Approval if net_payable > threshold
      const netAmt = Number(net_payable || 0);
      if (netAmt >= SETTLEMENT_APPROVAL_THRESHOLD_INR) {
        db.execute(sql`
          INSERT INTO approval_requests (tenant_id, entity_type, entity_id, status)
          VALUES (${settlement.tenant_id || 1}, 'karigar_settlement', ${settlement.id}, 'pending')
          RETURNING id
        `).then(r => {
          const aprId = (r.rows[0] as any)?.id;
          if (aprId) db.execute(sql`UPDATE jw_settlement SET approval_request_id=${aprId} WHERE id=${settlement.id}`);
        }).catch(() => {});
      }
    }
    res.json(settlement);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── KARIGAR MATERIAL LEDGER ───────────────────────────────────────────────────
router.get("/karigar-ledger", requireAuth, async (req: any, res) => {
  try {
    const { karigar_id } = req.query;
    const where = karigar_id ? sql`AND kml.karigar_id=${karigar_id}` : sql``;
    const rows = await db.execute(sql`
      SELECT kml.*, k.name karigar_name, po.order_no FROM jw_karigar_material_ledger kml
      LEFT JOIN jw_karigars k ON k.id=kml.karigar_id
      LEFT JOIN jw_production_orders po ON po.id=kml.production_order_id
      WHERE po.tenant_id=${tid(req)} ORDER BY kml.txn_date DESC LIMIT 200`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/karigar-ledger", requireAuth, async (req: any, res) => {
  try {
    const { karigar_id, production_order_id, txn_type, metal_type, purity_name, weight_gm, txn_date, notes } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_karigar_material_ledger (karigar_id, production_order_id, txn_type, metal_type, purity_name, weight_gm, txn_date, notes)
      VALUES (${karigar_id}, ${production_order_id||null}, ${txn_type}, ${metal_type||'gold'}, ${purity_name||null}, ${weight_gm||0}, ${txn_date||new Date().toISOString().slice(0,10)}, ${notes||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── WHOLESALE JOBWORK ─────────────────────────────────────────────────────────
router.get("/wholesale-jobwork", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_wholesale_jobwork WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/wholesale-jobwork", requireAuth, async (req: any, res) => {
  try {
    const { customer_name, customer_phone, design_ref, qty_pieces, customer_gold_recv_gm, customer_gold_purity,
            making_charges_type, making_charges, stone_setting_charges, timeline_days, karigar_id,
            gold_issued_to_karigar_gm, expected_delivery } = req.body;
    const no = "WSJ-" + seq();
    const fine = Number(customer_gold_recv_gm||0) * 0.916; // default 22K
    const row = await db.execute(sql`
      INSERT INTO jw_wholesale_jobwork (tenant_id, jobwork_no, customer_name, customer_phone, design_ref,
        qty_pieces, customer_gold_recv_gm, customer_gold_purity, fine_gold_recv_gm, making_charges_type,
        making_charges, stone_setting_charges, timeline_days, karigar_id, gold_issued_to_karigar_gm,
        customer_gold_balance_gm)
      VALUES (${tid(req)}, ${no}, ${customer_name}, ${customer_phone||null}, ${design_ref||null},
        ${qty_pieces||1}, ${customer_gold_recv_gm||0}, ${customer_gold_purity||'22K'}, ${fine.toFixed(3)},
        ${making_charges_type||'per_gram'}, ${making_charges||0}, ${stone_setting_charges||0},
        ${timeline_days||10}, ${karigar_id||null}, ${gold_issued_to_karigar_gm||0},
        ${customer_gold_recv_gm||0})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/wholesale-jobwork/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, finished_weight_gm, customer_gold_balance_gm, delivery_date, notes } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_wholesale_jobwork SET status=${status||'received'}, finished_weight_gm=${finished_weight_gm||null},
        customer_gold_balance_gm=${customer_gold_balance_gm||null}, delivery_date=${delivery_date||null}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── HALLMARKING BATCHES ───────────────────────────────────────────────────────
router.get("/hallmarking-batches", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT b.*, COUNT(h.id) item_count FROM jw_hallmarking_batches b
      LEFT JOIN jw_hallmarking h ON h.batch_id=b.id
      WHERE b.tenant_id=${tid(req)} GROUP BY b.id ORDER BY b.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/hallmarking-batches", requireAuth, async (req: any, res) => {
  try {
    const { centre_name, bis_licence_no, testing_method, date_sent, total_cost } = req.body;
    const no = "HMB-" + seq();
    const row = await db.execute(sql`
      INSERT INTO jw_hallmarking_batches (tenant_id, batch_no, centre_name, bis_licence_no, testing_method, date_sent, total_cost, status, submission_date)
      VALUES (${tid(req)}, ${no}, ${centre_name||null}, ${bis_licence_no||null}, ${testing_method||'xrf'}, ${date_sent||null}, ${total_cost||0}, 'submitted', CURRENT_DATE)
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/hallmarking-batches/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, date_received, items_passed, items_rejected, certificate_url, notes } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_hallmarking_batches SET status=${status||'submitted'}, date_received=${date_received||null},
        items_passed=${items_passed||0}, items_rejected=${items_rejected||0},
        certificate_url=${certificate_url||null}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── COUNTER BOOKINGS ──────────────────────────────────────────────────────────
router.get("/counter-bookings", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_counter_bookings WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/counter-bookings", requireAuth, async (req: any, res) => {
  try {
    const { customer_name, customer_phone, booking_type, urgency, description, design_ref,
            advance_collected, expected_ready, counter_staff } = req.body;
    const no = "CB-" + seq();
    const row = await db.execute(sql`
      INSERT INTO jw_counter_bookings (tenant_id, booking_no, customer_name, customer_phone, booking_type, urgency,
        description, design_ref, advance_collected, expected_ready, counter_staff)
      VALUES (${tid(req)}, ${no}, ${customer_name}, ${customer_phone}, ${booking_type}, ${urgency||'normal'},
        ${description||null}, ${design_ref||null}, ${advance_collected||0}, ${expected_ready||null}, ${counter_staff||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/counter-bookings/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, assigned_to, reminder_sent, notes } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_counter_bookings SET status=${status||'booked'}, assigned_to=${assigned_to||null},
        reminder_sent=${reminder_sent||0}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── CUSTOMER APPROVALS ────────────────────────────────────────────────────────
router.get("/customer-approvals", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_customer_approvals WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/customer-approvals", requireAuth, async (req: any, res) => {
  try {
    const { customer_name, customer_phone, issue_date, expected_return, total_value,
            deposit_collected, deposit_amount, counter_staff, notes } = req.body;
    const no = "APP-" + seq();
    const row = await db.execute(sql`
      INSERT INTO jw_customer_approvals (tenant_id, approval_no, customer_name, customer_phone, issue_date,
        expected_return, total_value, deposit_collected, deposit_amount, counter_staff, notes)
      VALUES (${tid(req)}, ${no}, ${customer_name}, ${customer_phone||null}, ${issue_date||new Date().toISOString().slice(0,10)},
        ${expected_return||null}, ${total_value||0}, ${deposit_collected||0}, ${deposit_amount||0}, ${counter_staff||null}, ${notes||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/customer-approvals/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, items_returned, return_date, converted_to_sale, invoice_id } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_customer_approvals SET status=${status||'open'}, items_returned=${items_returned||0},
        return_date=${return_date||null}, converted_to_sale=${converted_to_sale||0}, invoice_id=${invoice_id||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── BUY-BACK ──────────────────────────────────────────────────────────────────
router.get("/buyback", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_buyback_transactions WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/buyback", requireAuth, async (req: any, res) => {
  try {
    const { customer_name, customer_phone, item_description, metal_type, purity_tested_pct,
            gross_weight_gm, stone_weight_gm, gold_rate_today, buyback_rate_pct, payment_mode } = req.body;
    const no = "BBK-" + seq();
    const net_wt = Number(gross_weight_gm||0) - Number(stone_weight_gm||0);
    const buyback_val = net_wt * Number(gold_rate_today||0) * Number(buyback_rate_pct||95) / 100;
    const row = await db.execute(sql`
      INSERT INTO jw_buyback_transactions (tenant_id, buyback_no, customer_name, customer_phone, item_description,
        metal_type, purity_tested_pct, gross_weight_gm, stone_weight_gm, net_weight_gm,
        gold_rate_today, buyback_rate_pct, buyback_value, net_offered, payment_mode)
      VALUES (${tid(req)}, ${no}, ${customer_name}, ${customer_phone||null}, ${item_description||null},
        ${metal_type||'gold'}, ${purity_tested_pct||null}, ${gross_weight_gm||0}, ${stone_weight_gm||0}, ${net_wt},
        ${gold_rate_today||0}, ${buyback_rate_pct||95}, ${buyback_val.toFixed(2)}, ${buyback_val.toFixed(2)}, ${payment_mode||null})
      RETURNING *`);
    const buyback = row.rows[0] as any;
    // Gap 1: Auto-post journal for old gold buy-back
    if (buyback) {
      journalForOldGoldBuyback(buyback).catch(e => console.error('[GOLD JOURNAL] Buyback:', e.message));
    }
    res.json(buyback);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/buyback/:id", requireAuth, async (req: any, res) => {
  try {
    const { customer_accepted, stock_updated, original_invoice_ref } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_buyback_transactions SET customer_accepted=${customer_accepted||0},
        stock_updated=${stock_updated||0}, original_invoice_ref=${original_invoice_ref||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── PHYSICAL AUDITS ───────────────────────────────────────────────────────────
router.get("/physical-audits", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_physical_audits WHERE tenant_id=${tid(req)} ORDER BY audit_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/physical-audits", requireAuth, async (req: any, res) => {
  try {
    const { audit_date, branch, audit_type, auditor_name } = req.body;
    const no = "PA-" + seq();
    const row = await db.execute(sql`
      INSERT INTO jw_physical_audits (tenant_id, audit_no, audit_date, branch, audit_type, auditor_name, status)
      VALUES (${tid(req)}, ${no}, ${audit_date||new Date().toISOString().slice(0,10)}, ${branch||'main'}, ${audit_type||'full'}, ${auditor_name||null}, 'in_progress')
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/physical-audits/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, approved_by, total_system_pieces, total_physical_pieces,
            total_system_gm, total_physical_gm, action_taken } = req.body;
    const disc_gm = Number(total_physical_gm||0) - Number(total_system_gm||0);
    const row = await db.execute(sql`
      UPDATE jw_physical_audits SET status=${status||'in_progress'}, approved_by=${approved_by||null},
        total_system_pieces=${total_system_pieces||0}, total_physical_pieces=${total_physical_pieces||0},
        total_system_gm=${total_system_gm||0}, total_physical_gm=${total_physical_gm||0},
        discrepancy_gm=${disc_gm}, action_taken=${action_taken||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    const audit = row.rows[0] as any;
    // Gap 9: Audit trail
    goldAudit(req, 'UPDATE', 'jw_physical_audits', String(req.params.id),
      `Physical audit ${audit?.audit_no || req.params.id} → ${status} | Discrepancy: ${disc_gm.toFixed(3)}g`);
    // Gap 17: Post journal for gold shrinkage/surplus if audit is approved and discrepancy exists
    if (status === 'approved' && Math.abs(disc_gm) > 0.001) {
      db.execute(sql`
        SELECT rate_per_gram FROM jw_metal_rates WHERE tenant_id=${tid(req)} AND metal='gold'
        ORDER BY rate_date DESC, id DESC LIMIT 1
      `).then(rateRow => {
        const goldRate = Number((rateRow.rows[0] as any)?.rate_per_gram || 7000);
        const discVal = Math.abs(disc_gm) * goldRate;
        const isShortage = disc_gm < 0;
        // DR Gold Shrinkage Expense / CR Gold Inventory (or vice versa for surplus)
        journalForGhatEntry(
          { id: audit?.id, ghat_date: new Date().toISOString().slice(0,10), stage: 'Physical Audit', tenant_id: Number(tid(req)) },
          goldRate
        ).catch(() => {});
      }).catch(() => {});
    }
    res.json(audit);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── LOYALTY ───────────────────────────────────────────────────────────────────
router.get("/loyalty/programs", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_loyalty_programs WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/loyalty/programs", requireAuth, async (req: any, res) => {
  try {
    const { program_name, silver_threshold, gold_threshold, platinum_threshold, points_per_rupee, redemption_value } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_loyalty_programs (tenant_id, program_name, silver_threshold, gold_threshold, platinum_threshold, points_per_rupee, redemption_value)
      VALUES (${tid(req)}, ${program_name}, ${silver_threshold||50000}, ${gold_threshold||200000}, ${platinum_threshold||500000}, ${points_per_rupee||0.01}, ${redemption_value||0.5})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/loyalty/members", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT m.*, p.program_name FROM jw_loyalty_members m LEFT JOIN jw_loyalty_programs p ON p.id=m.program_id WHERE m.tenant_id=${tid(req)} ORDER BY m.points_balance DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/loyalty/members", requireAuth, async (req: any, res) => {
  try {
    const { program_id, member_name, phone, email, birthday, anniversary } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_loyalty_members (tenant_id, program_id, member_name, phone, email, birthday, anniversary)
      VALUES (${tid(req)}, ${program_id||null}, ${member_name}, ${phone||null}, ${email||null}, ${birthday||null}, ${anniversary||null})
      RETURNING *`);
    const member = row.rows[0] as any;
    // Gap 15: Sync loyalty member to CRM leads
    if (member_name) {
      db.execute(sql`
        INSERT INTO crm_leads (tenant_id, lead_no, name, phone, email, source, product_interest, status, notes)
        VALUES (${tid(req)}, ${'LOY-' + Date.now()}, ${member_name}, ${phone||null}, ${email||null},
                'loyalty_program', 'gold_jewellery', 'warm', 'Auto-created from Gold ERP loyalty member enrolment')
        ON CONFLICT DO NOTHING
      `).catch(() => {});
    }
    // Gap 9: Audit trail
    goldAudit(req, 'CREATE', 'jw_loyalty_members', String(member?.id || ''),
      `Loyalty member enrolled: ${member_name} — Phone: ${phone || 'N/A'}`);
    res.json(member);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/loyalty/earn", requireAuth, async (req: any, res) => {
  try {
    const { member_id, points, invoice_id, reference_no } = req.body;
    await db.execute(sql`INSERT INTO jw_loyalty_transactions (tenant_id, member_id, txn_type, points, reference_no, invoice_id) VALUES (${tid(req)}, ${member_id}, 'earn', ${points}, ${reference_no||null}, ${invoice_id||null})`);
    await db.execute(sql`UPDATE jw_loyalty_members SET points_balance=points_balance+${points}, points_earned=points_earned+${points}, total_spent=total_spent+${points*100} WHERE id=${member_id}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── PROMOTIONS ────────────────────────────────────────────────────────────────
router.get("/promotions", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_promotions WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/promotions", requireAuth, async (req: any, res) => {
  try {
    const { promo_name, promo_type, applicable_categories, min_purchase_value, discount_value, discount_pct, valid_from, valid_to, terms } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_promotions (tenant_id, promo_name, promo_type, applicable_categories, min_purchase_value, discount_value, discount_pct, valid_from, valid_to, terms)
      VALUES (${tid(req)}, ${promo_name}, ${promo_type}, ${applicable_categories||'all'}, ${min_purchase_value||null}, ${discount_value||0}, ${discount_pct||0}, ${valid_from||null}, ${valid_to||null}, ${terms||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/promotions/:id", requireAuth, async (req: any, res) => {
  try {
    const { is_active } = req.body;
    const row = await db.execute(sql`UPDATE jw_promotions SET is_active=${is_active} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── REFINING ──────────────────────────────────────────────────────────────────
router.get("/refining", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_refining_entries WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/refining", requireAuth, async (req: any, res) => {
  try {
    const { source_type, customer_name, customer_phone, item_description,
            gross_recv_gm, assay_purity_pct, refinery_name, date_sent, credited_to } = req.body;
    const no = "REF-" + seq();
    const fine = Number(gross_recv_gm||0) * Number(assay_purity_pct||75) / 100;
    const row = await db.execute(sql`
      INSERT INTO jw_refining_entries (tenant_id, refinery_no, source_type, customer_name, customer_phone,
        item_description, gross_recv_gm, assay_purity_pct, net_fine_gold_gm, refinery_name, date_sent, credited_to, status)
      VALUES (${tid(req)}, ${no}, ${source_type}, ${customer_name||null}, ${customer_phone||null},
        ${item_description||null}, ${gross_recv_gm||0}, ${assay_purity_pct||null}, ${fine.toFixed(3)},
        ${refinery_name||null}, ${date_sent||null}, ${credited_to||'own_stock'}, 'sent')
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/refining/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, date_received, refined_gold_recv_gm, payment_to_customer } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_refining_entries SET status=${status||'sent'}, date_received=${date_received||null},
        refined_gold_recv_gm=${refined_gold_recv_gm||null}, payment_to_customer=${payment_to_customer||0}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POS OLD GOLD ──────────────────────────────────────────────────────────────
router.get("/pos-old-gold", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_pos_old_gold WHERE tenant_id=${tid(req)} ORDER BY created_at DESC LIMIT 200`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/pos-old-gold", requireAuth, async (req: any, res) => {
  try {
    const { customer_name, customer_phone, item_description, metal_type, purity_tested_pct,
            gross_weight_gm, stone_weight_gm, today_rate, buyback_rate_pct } = req.body;
    const net_wt = Number(gross_weight_gm||0) - Number(stone_weight_gm||0);
    const credit = net_wt * Number(today_rate||0) * Number(buyback_rate_pct||95) / 100;
    const row = await db.execute(sql`
      INSERT INTO jw_pos_old_gold (tenant_id, customer_name, customer_phone, item_description, metal_type, purity_tested_pct,
        gross_weight_gm, stone_weight_gm, net_weight_gm, today_rate, buyback_rate_pct, credit_value)
      VALUES (${tid(req)}, ${customer_name||null}, ${customer_phone||null}, ${item_description||null},
        ${metal_type||'gold'}, ${purity_tested_pct||null}, ${gross_weight_gm||0}, ${stone_weight_gm||0}, ${net_wt},
        ${today_rate||0}, ${buyback_rate_pct||95}, ${credit.toFixed(2)})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── BULLION BOOKINGS ──────────────────────────────────────────────────────────
router.get("/bullion-bookings", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_bullion_bookings WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/bullion-bookings", requireAuth, async (req: any, res) => {
  try {
    const { party_type, party_name, metal_type, form_type, fineness, weight_gm, rate_per_gram,
            expected_delivery, payment_terms, delivery_type } = req.body;
    const no = "BBK-" + seq();
    const amount = Number(weight_gm||0) * Number(rate_per_gram||0);
    const gst = amount * 0.03;
    const row = await db.execute(sql`
      INSERT INTO jw_bullion_bookings (tenant_id, booking_no, party_type, party_name, metal_type, form_type, fineness,
        weight_gm, rate_per_gram, amount, gst_amount, expected_delivery, payment_terms, delivery_type, status)
      VALUES (${tid(req)}, ${no}, ${party_type||'supplier'}, ${party_name}, ${metal_type||'gold'}, ${form_type||'bar'},
        ${fineness||null}, ${weight_gm||0}, ${rate_per_gram||0}, ${amount}, ${gst}, ${expected_delivery||null},
        ${payment_terms||'advance'}, ${delivery_type||'physical'}, 'booked')
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/bullion-bookings/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, actual_delivery, received_weight_gm, assay_cert_no } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_bullion_bookings SET status=${status||'booked'}, actual_delivery=${actual_delivery||null},
        received_weight_gm=${received_weight_gm||null}, assay_cert_no=${assay_cert_no||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── VAULT AUDITS ──────────────────────────────────────────────────────────────
router.get("/vault-audits", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_vault_audits WHERE tenant_id=${tid(req)} ORDER BY audit_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/vault-audits", requireAuth, async (req: any, res) => {
  try {
    const { audit_date, location, auditor_1, auditor_2, manager_name, next_audit_date } = req.body;
    const no = "VA-" + seq();
    const row = await db.execute(sql`
      INSERT INTO jw_vault_audits (tenant_id, audit_no, audit_date, location, auditor_1, auditor_2, manager_name, next_audit_date, status)
      VALUES (${tid(req)}, ${no}, ${audit_date||new Date().toISOString().slice(0,10)}, ${location||'main_vault'}, ${auditor_1||null}, ${auditor_2||null}, ${manager_name||null}, ${next_audit_date||null}, 'in_progress')
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/vault-audits/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, total_system_gm, total_physical_gm, seal_intact, signed_off, tamper_evidence } = req.body;
    const disc = Number(total_physical_gm||0) - Number(total_system_gm||0);
    const row = await db.execute(sql`
      UPDATE jw_vault_audits SET status=${status||'in_progress'}, total_system_gm=${total_system_gm||0},
        total_physical_gm=${total_physical_gm||0}, discrepancy_gm=${disc},
        seal_intact=${seal_intact||1}, signed_off=${signed_off||0}, tamper_evidence=${tamper_evidence||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    const vaudit = row.rows[0] as any;
    // Gap 9: Audit trail
    goldAudit(req, 'UPDATE', 'jw_vault_audits', String(req.params.id),
      `Vault audit ${vaudit?.audit_no || req.params.id} → ${status} | Discrepancy: ${disc.toFixed(3)}g | Seal intact: ${seal_intact ? 'Yes' : 'No'}`);
    res.json(vaudit);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── CHIT MATURITY & DEFAULTERS ────────────────────────────────────────────────
router.get("/chit-maturity", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT m.*, s.name scheme_name, s.monthly_amount, s.duration_months, s.bonus_month_free
      FROM jw_chit_members m JOIN jw_chit_schemes s ON s.id=m.scheme_id
      WHERE m.tenant_id=${tid(req)} AND m.maturity_date IS NOT NULL
      ORDER BY m.maturity_date ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/chit-defaulters", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT m.*, s.name scheme_name, s.monthly_amount,
        COUNT(a.id) action_count FROM jw_chit_members m
      JOIN jw_chit_schemes s ON s.id=m.scheme_id
      LEFT JOIN jw_chit_defaulter_actions a ON a.member_id=m.id
      WHERE m.tenant_id=${tid(req)} AND m.defaulter_flag=1
      GROUP BY m.id, s.name, s.monthly_amount ORDER BY m.installments_paid ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/chit-defaulter-actions", requireAuth, async (req: any, res) => {
  try {
    const { member_id, action_type, action_date, notes, next_followup_date } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_chit_defaulter_actions (tenant_id, member_id, action_type, action_date, notes, next_followup_date)
      VALUES (${tid(req)}, ${member_id}, ${action_type||'call'}, ${action_date||new Date().toISOString().slice(0,10)}, ${notes||null}, ${next_followup_date||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/chit-redemptions", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT r.*, m.member_name, m.phone, s.name scheme_name
      FROM jw_chit_redemptions r
      JOIN jw_chit_members m ON m.id=r.member_id
      JOIN jw_chit_schemes s ON s.id=r.scheme_id
      WHERE r.tenant_id=${tid(req)} ORDER BY r.redemption_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/chit-redemptions", requireAuth, async (req: any, res) => {
  try {
    const { member_id, scheme_id, redemption_type, redemption_date, gold_weight_gm,
            item_tag, bonus_amount, tds_deducted } = req.body;
    const mem = await db.execute(sql`SELECT m.*, s.monthly_amount, s.duration_months, s.bonus_month_free FROM jw_chit_members m JOIN jw_chit_schemes s ON s.id=m.scheme_id WHERE m.id=${member_id}`);
    const m = mem.rows[0] as any;
    const total_paid = Number(m?.total_paid || 0);
    const bonus = Number(m?.monthly_amount||0) * Number(m?.bonus_month_free||1);
    const tds = Number(tds_deducted || 0);
    const net = total_paid + bonus - tds;
    const row = await db.execute(sql`
      INSERT INTO jw_chit_redemptions (member_id, scheme_id, tenant_id, redemption_type, redemption_date,
        total_paid, bonus_amount, tds_deducted, total_redeemable, gold_weight_gm, item_tag, balance_payable, status)
      VALUES (${member_id}, ${scheme_id}, ${tid(req)}, ${redemption_type||'gold'}, ${redemption_date||new Date().toISOString().slice(0,10)},
        ${total_paid}, ${bonus_amount||bonus}, ${tds}, ${net}, ${gold_weight_gm||null}, ${item_tag||null}, ${net}, 'processed')
      RETURNING *`);
    await db.execute(sql`UPDATE jw_chit_members SET status='matured' WHERE id=${member_id}`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── E-CATALOG ─────────────────────────────────────────────────────────────────
router.get("/catalogs", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_catalogs WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/catalogs", requireAuth, async (req: any, res) => {
  try {
    const { catalog_name, brand_name, access_type, show_prices, watermark_text, footer_text } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_catalogs (tenant_id, catalog_name, brand_name, access_type, show_prices, watermark_text, footer_text)
      VALUES (${tid(req)}, ${catalog_name}, ${brand_name||null}, ${access_type||'link'}, ${show_prices||'hide'}, ${watermark_text||null}, ${footer_text||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/catalogs/:id", requireAuth, async (req: any, res) => {
  try {
    const { catalog_name, is_active, show_prices, access_type, watermark_text } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_catalogs SET catalog_name=${catalog_name}, is_active=${is_active||1},
        show_prices=${show_prices||'hide'}, access_type=${access_type||'link'}, watermark_text=${watermark_text||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/catalogs/:id/share", requireAuth, async (req: any, res) => {
  try {
    const { customer_name, customer_phone, shared_by, expires_hours } = req.body;
    const token = Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
    const expires = expires_hours ? new Date(Date.now() + Number(expires_hours) * 3600000) : null;
    const row = await db.execute(sql`
      INSERT INTO jw_catalog_shares (tenant_id, catalog_id, share_token, customer_name, customer_phone, shared_by, expires_at)
      VALUES (${tid(req)}, ${req.params.id}, ${token}, ${customer_name||null}, ${customer_phone||null}, ${shared_by||null}, ${expires?.toISOString()||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/catalogs/:id/shares", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_catalog_shares WHERE catalog_id=${req.params.id} AND tenant_id=${tid(req)} ORDER BY shared_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/catalogs/:id/enquiries", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_catalog_enquiries WHERE catalog_id=${req.params.id} AND tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/catalog-enquiries", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT e.*, c.catalog_name FROM jw_catalog_enquiries e LEFT JOIN jw_catalogs c ON c.id=e.catalog_id WHERE e.tenant_id=${tid(req)} ORDER BY e.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/catalog-analytics", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT catalog_id, event_type, COUNT(*) AS cnt, DATE_TRUNC('day', viewed_at) AS event_day
      FROM jw_catalog_analytics WHERE tenant_id=${tid(req)}
      GROUP BY catalog_id, event_type, DATE_TRUNC('day', viewed_at) ORDER BY event_day DESC LIMIT 100`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── OMS ───────────────────────────────────────────────────────────────────────
router.get("/oms-orders", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_oms_orders WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/oms-orders", requireAuth, async (req: any, res) => {
  try {
    const { customer_name, customer_phone, customer_email, order_type, design_ref, metal_type, purity_name,
            approx_weight_gm, making_charges_quoted, stone_requirements, customisation_notes,
            advance_paid, advance_mode, expected_delivery, counter_staff } = req.body;
    const no = "OMS-" + seq();
    const row = await db.execute(sql`
      INSERT INTO jw_oms_orders (tenant_id, order_no, customer_name, customer_phone, customer_email, order_type,
        design_ref, metal_type, purity_name, approx_weight_gm, making_charges_quoted, stone_requirements,
        customisation_notes, advance_paid, advance_mode, expected_delivery, counter_staff)
      VALUES (${tid(req)}, ${no}, ${customer_name}, ${customer_phone}, ${customer_email||null},
        ${order_type||'new_design'}, ${design_ref||null}, ${metal_type||'gold'}, ${purity_name||null},
        ${approx_weight_gm||null}, ${making_charges_quoted||null}, ${stone_requirements||null},
        ${customisation_notes||null}, ${advance_paid||0}, ${advance_mode||null}, ${expected_delivery||null}, ${counter_staff||null})
      RETURNING *`);
    await db.execute(sql`
      INSERT INTO jw_oms_status_log (tenant_id, order_id, status, changed_by)
      VALUES (${tid(req)}, ${row.rows[0].id}, 'booked', ${counter_staff||'system'})`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/oms-orders/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, notes, changed_by } = req.body;
    const row = await db.execute(sql`UPDATE jw_oms_orders SET status=${status} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    if (status) {
      await db.execute(sql`INSERT INTO jw_oms_status_log (tenant_id, order_id, status, notes, changed_by) VALUES (${tid(req)}, ${req.params.id}, ${status}, ${notes||null}, ${changed_by||'user'})`);
    }
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/oms-orders/:id/timeline", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_oms_status_log WHERE order_id=${req.params.id} ORDER BY changed_at ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/oms-notify-config", requireAuth, async (req: any, res) => {
  try {
    const row = await db.execute(sql`SELECT * FROM jw_oms_notify_config WHERE tenant_id=${tid(req)} LIMIT 1`);
    res.json(row.rows[0] || {});
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/oms-notify-config", requireAuth, async (req: any, res) => {
  try {
    const { notify_booked, notify_in_prod, notify_qc, notify_ready, notify_dispatched, notify_delivered, channel } = req.body;
    await db.execute(sql`
      INSERT INTO jw_oms_notify_config (tenant_id, notify_booked, notify_in_prod, notify_qc, notify_ready, notify_dispatched, notify_delivered, channel)
      VALUES (${tid(req)}, ${notify_booked??1}, ${notify_in_prod??1}, ${notify_qc??1}, ${notify_ready??1}, ${notify_dispatched??1}, ${notify_delivered??1}, ${channel||'whatsapp'})
      ON CONFLICT (tenant_id) DO UPDATE SET notify_booked=${notify_booked??1}, notify_in_prod=${notify_in_prod??1},
        notify_qc=${notify_qc??1}, notify_ready=${notify_ready??1}, notify_dispatched=${notify_dispatched??1},
        notify_delivered=${notify_delivered??1}, channel=${channel||'whatsapp'}`);
    const row = await db.execute(sql`SELECT * FROM jw_oms_notify_config WHERE tenant_id=${tid(req)} LIMIT 1`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── E-COMMERCE ────────────────────────────────────────────────────────────────
router.get("/ecom-config", requireAuth, async (req: any, res) => {
  try {
    const row = await db.execute(sql`SELECT * FROM jw_ecom_config WHERE tenant_id=${tid(req)} LIMIT 1`);
    res.json(row.rows[0] || {});
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/ecom-config", requireAuth, async (req: any, res) => {
  try {
    const { store_name, subdomain, rate_source, price_validity_mins, cod_enabled, return_policy, seo_title, seo_description } = req.body;
    await db.execute(sql`
      INSERT INTO jw_ecom_config (tenant_id, store_name, subdomain, rate_source, price_validity_mins, cod_enabled, return_policy, seo_title, seo_description)
      VALUES (${tid(req)}, ${store_name||null}, ${subdomain||null}, ${rate_source||'manual'}, ${price_validity_mins||30}, ${cod_enabled||0}, ${return_policy||null}, ${seo_title||null}, ${seo_description||null})
      ON CONFLICT (tenant_id) DO UPDATE SET store_name=${store_name||null}, rate_source=${rate_source||'manual'},
        price_validity_mins=${price_validity_mins||30}, cod_enabled=${cod_enabled||0}, return_policy=${return_policy||null}`);
    const row = await db.execute(sql`SELECT * FROM jw_ecom_config WHERE tenant_id=${tid(req)} LIMIT 1`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/ecom-customers", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT id, customer_name, phone, email, city, preferred_metal, total_orders, total_spent, is_active, created_at FROM jw_ecom_customers WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/ecom-customers", requireAuth, async (req: any, res) => {
  try {
    const { customer_name, phone, email, city, preferred_metal, birthday, anniversary } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_ecom_customers (tenant_id, customer_name, phone, email, city, preferred_metal, birthday, anniversary)
      VALUES (${tid(req)}, ${customer_name}, ${phone}, ${email||null}, ${city||null}, ${preferred_metal||null}, ${birthday||null}, ${anniversary||null})
      ON CONFLICT (tenant_id, phone) DO UPDATE SET customer_name=${customer_name}, email=${email||null}
      RETURNING id, customer_name, phone, email, city, total_orders, total_spent, is_active, created_at`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/ecom-orders", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_ecom_orders WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/ecom-orders/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, courier_name, tracking_no, synced_to_erp } = req.body;
    const row = await db.execute(sql`UPDATE jw_ecom_orders SET status=${status||'placed'}, courier_name=${courier_name||null}, tracking_no=${tracking_no||null}, synced_to_erp=${synced_to_erp||0} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/ecom-coupons", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_ecom_coupons WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/ecom-coupons", requireAuth, async (req: any, res) => {
  try {
    const { coupon_code, discount_type, discount_value, discount_pct, min_order_value, max_discount, usage_limit, valid_from, valid_to } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_ecom_coupons (tenant_id, coupon_code, discount_type, discount_value, discount_pct, min_order_value, max_discount, usage_limit, valid_from, valid_to)
      VALUES (${tid(req)}, ${coupon_code}, ${discount_type}, ${discount_value||0}, ${discount_pct||0}, ${min_order_value||null}, ${max_discount||null}, ${usage_limit||null}, ${valid_from||null}, ${valid_to||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/ecom-rate-history", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_ecom_rate_history WHERE tenant_id=${tid(req)} ORDER BY recorded_at DESC LIMIT 100`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/ecom-rate-history", requireAuth, async (req: any, res) => {
  try {
    const { metal_type, purity_name, rate_per_gram, source } = req.body;
    const row = await db.execute(sql`INSERT INTO jw_ecom_rate_history (tenant_id, metal_type, purity_name, rate_per_gram, source) VALUES (${tid(req)}, ${metal_type||'gold'}, ${purity_name||null}, ${rate_per_gram}, ${source||'manual'}) RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── RFID ──────────────────────────────────────────────────────────────────────
router.get("/rfid-tags", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_rfid_tags WHERE tenant_id=${tid(req)} AND is_active=1 ORDER BY encoded_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/rfid-tags", requireAuth, async (req: any, res) => {
  try {
    const { tag_id, epc_code, item_id, design_code, metal_type, weight_gm, huid_no, location, tag_type, encoded_by } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_rfid_tags (tenant_id, tag_id, epc_code, item_id, design_code, metal_type, weight_gm, huid_no, location, tag_type, encoded_by)
      VALUES (${tid(req)}, ${tag_id}, ${epc_code||null}, ${item_id||null}, ${design_code||null}, ${metal_type||null}, ${weight_gm||null}, ${huid_no||null}, ${location||'showroom'}, ${tag_type||'uhf'}, ${encoded_by||null})
      ON CONFLICT (tenant_id, tag_id) DO UPDATE SET item_id=${item_id||null}, location=${location||'showroom'}
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/rfid-tags/:id", requireAuth, async (req: any, res) => {
  try {
    const { location, is_active } = req.body;
    const row = await db.execute(sql`UPDATE jw_rfid_tags SET location=${location||'showroom'}, is_active=${is_active??1} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/rfid-sessions", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_rfid_scan_sessions WHERE tenant_id=${tid(req)} ORDER BY scan_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/rfid-sessions", requireAuth, async (req: any, res) => {
  try {
    const { location, scanner_device, scan_mode, scanned_by } = req.body;
    const code = "SCAN-" + seq();
    const row = await db.execute(sql`
      INSERT INTO jw_rfid_scan_sessions (tenant_id, session_code, location, scanner_device, scan_mode, scanned_by)
      VALUES (${tid(req)}, ${code}, ${location||null}, ${scanner_device||null}, ${scan_mode||'full_audit'}, ${scanned_by||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/rfid-sessions/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, tags_scanned, tags_matched, tags_missing, tags_extra, discrepancy_gm } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_rfid_scan_sessions SET status=${status||'in_progress'}, tags_scanned=${tags_scanned||0},
        tags_matched=${tags_matched||0}, tags_missing=${tags_missing||0}, tags_extra=${tags_extra||0},
        discrepancy_gm=${discrepancy_gm||0}, ended_at=CASE WHEN ${status}='completed' THEN NOW() ELSE ended_at END
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/rfid-alerts", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_rfid_alerts WHERE tenant_id=${tid(req)} ORDER BY triggered_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/rfid-alerts", requireAuth, async (req: any, res) => {
  try {
    const { alert_type, tag_id, item_code, description, weight_gm, location } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_rfid_alerts (tenant_id, alert_type, tag_id, item_code, description, weight_gm, location)
      VALUES (${tid(req)}, ${alert_type}, ${tag_id||null}, ${item_code||null}, ${description||null}, ${weight_gm||null}, ${location||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/rfid-alerts/:id/acknowledge", requireAuth, async (req: any, res) => {
  try {
    const { acknowledged_by, action_taken } = req.body;
    const row = await db.execute(sql`
      UPDATE jw_rfid_alerts SET acknowledged=1, acknowledged_by=${acknowledged_by||null}, action_taken=${action_taken||null}, resolved=1
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/rfid-gate-movements", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_rfid_gate_movements WHERE tenant_id=${tid(req)} ORDER BY movement_date DESC LIMIT 200`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/rfid-dispatch", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_rfid_dispatch_validations WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/rfid-dispatch", requireAuth, async (req: any, res) => {
  try {
    const { invoice_id, customer_name, expected_items, scanned_items, authorised_by, seal_no } = req.body;
    const no = "DISP-" + seq();
    const exp = expected_items || [];
    const sc = scanned_items || [];
    const matched = exp.filter((e: any) => sc.find((s: any) => s.tag_id === e.tag_id)).length;
    const missing = exp.length - matched;
    const extra = sc.length - matched;
    const row = await db.execute(sql`
      INSERT INTO jw_rfid_dispatch_validations (tenant_id, validation_no, invoice_id, customer_name,
        expected_items, scanned_items, all_matched, missing_count, extra_count, authorised_by, seal_no, status)
      VALUES (${tid(req)}, ${no}, ${invoice_id||null}, ${customer_name||null},
        ${JSON.stringify(exp)}::jsonb, ${JSON.stringify(sc)}::jsonb, ${missing===0?1:0}, ${missing}, ${extra},
        ${authorised_by||null}, ${seal_no||null}, ${missing===0?'validated':'discrepancy'})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── METAL FINANCE ─────────────────────────────────────────────────────────────
router.get("/metal-accounts", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_metal_accounts WHERE tenant_id=${tid(req)} AND is_active=1 ORDER BY account_code`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/metal-accounts", requireAuth, async (req: any, res) => {
  try {
    const { account_code, account_name, account_type, metal_type } = req.body;
    const row = await db.execute(sql`
      INSERT INTO jw_metal_accounts (tenant_id, account_code, account_name, account_type, metal_type)
      VALUES (${tid(req)}, ${account_code}, ${account_name}, ${account_type}, ${metal_type||'gold'})
      ON CONFLICT (tenant_id, account_code) DO UPDATE SET account_name=${account_name}
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/metal-journals", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_metal_journals WHERE tenant_id=${tid(req)} ORDER BY txn_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/metal-journals/:id/lines", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_metal_journal_lines WHERE journal_id=${req.params.id} ORDER BY id`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/metal-journals", requireAuth, async (req: any, res) => {
  try {
    const { txn_date, txn_type, narration, gold_rate_used, lines, reference_type, reference_id } = req.body;
    const no = "MJ-" + seq();
    const lineArr = lines || [];
    const total_debit_gm = lineArr.filter((l: any) => l.side === 'debit').reduce((s: number, l: any) => s + Number(l.weight_gm||0), 0);
    const total_credit_gm = lineArr.filter((l: any) => l.side === 'credit').reduce((s: number, l: any) => s + Number(l.weight_gm||0), 0);
    const journal = await db.execute(sql`
      INSERT INTO jw_metal_journals (tenant_id, journal_no, txn_date, txn_type, narration, reference_type, reference_id, total_debit_gm, total_credit_gm, gold_rate_used)
      VALUES (${tid(req)}, ${no}, ${txn_date||new Date().toISOString().slice(0,10)}, ${txn_type}, ${narration||null}, ${reference_type||null}, ${reference_id||null}, ${total_debit_gm}, ${total_credit_gm}, ${gold_rate_used||null})
      RETURNING *`);
    const jid = journal.rows[0].id;
    for (const l of lineArr) {
      await db.execute(sql`
        INSERT INTO jw_metal_journal_lines (journal_id, tenant_id, account_id, account_name, side, weight_gm, purity_name, rate_per_gram, amount_inr)
        VALUES (${jid}, ${tid(req)}, ${l.account_id||null}, ${l.account_name||null}, ${l.side}, ${l.weight_gm||0}, ${l.purity_name||null}, ${gold_rate_used||0}, ${Number(l.weight_gm||0)*Number(gold_rate_used||0)})`);
    }
    res.json(journal.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/stock-consolidation", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_stock_consolidation WHERE tenant_id=${tid(req)} ORDER BY snapshot_date DESC LIMIT 100`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/stock-consolidation", requireAuth, async (req: any, res) => {
  try {
    const { snapshot_date, branch, metal_type, purity_name, stock_in_hand_gm, stock_with_karigar_gm, stock_in_transit_gm, gold_rate } = req.body;
    const total = Number(stock_in_hand_gm||0) + Number(stock_with_karigar_gm||0) + Number(stock_in_transit_gm||0);
    const value = total * Number(gold_rate||0);
    const row = await db.execute(sql`
      INSERT INTO jw_stock_consolidation (tenant_id, snapshot_date, branch, metal_type, purity_name, stock_in_hand_gm, stock_with_karigar_gm, stock_in_transit_gm, total_gm, gold_rate, total_value_inr)
      VALUES (${tid(req)}, ${snapshot_date||new Date().toISOString().slice(0,10)}, ${branch||'main'}, ${metal_type||'gold'}, ${purity_name||null}, ${stock_in_hand_gm||0}, ${stock_with_karigar_gm||0}, ${stock_in_transit_gm||0}, ${total}, ${gold_rate||0}, ${value})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/metal-loss-reports", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_metal_loss_reports WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/metal-loss-reports", requireAuth, async (req: any, res) => {
  try {
    const { period_from, period_to, metal_type, gold_issued_gm, gold_in_products_gm, wastage_collected_gm,
            refinery_sent_gm, refinery_received_gm, gold_rate_used, purity_loss_gm, created_by } = req.body;
    const unaccounted = Number(gold_issued_gm||0) - Number(gold_in_products_gm||0) - Number(wastage_collected_gm||0) - Number(refinery_sent_gm||0) + Number(refinery_received_gm||0);
    const loss_val = (unaccounted + Number(purity_loss_gm||0)) * Number(gold_rate_used||0);
    const loss_pct = Number(gold_issued_gm||0) > 0 ? (unaccounted / Number(gold_issued_gm)) * 100 : 0;
    const row = await db.execute(sql`
      INSERT INTO jw_metal_loss_reports (tenant_id, period_from, period_to, metal_type, gold_issued_gm, gold_in_products_gm,
        wastage_collected_gm, refinery_sent_gm, refinery_received_gm, unaccounted_loss_gm, gold_rate_used,
        loss_value_inr, loss_pct, purity_loss_gm, total_metal_loss_inr, created_by)
      VALUES (${tid(req)}, ${period_from}, ${period_to}, ${metal_type||'gold'}, ${gold_issued_gm||0}, ${gold_in_products_gm||0},
        ${wastage_collected_gm||0}, ${refinery_sent_gm||0}, ${refinery_received_gm||0}, ${unaccounted.toFixed(3)}, ${gold_rate_used||0},
        ${loss_val.toFixed(2)}, ${loss_pct.toFixed(3)}, ${purity_loss_gm||0}, ${loss_val.toFixed(2)}, ${created_by||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── INTEGRATION CONFIGS ───────────────────────────────────────────────────────
router.get("/config/mcx", requireAuth, async (req: any, res) => {
  try {
    const row = await db.execute(sql`SELECT * FROM jw_mcx_rate_config WHERE tenant_id=${tid(req)} LIMIT 1`);
    res.json(row.rows[0] || {});
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/config/mcx", requireAuth, async (req: any, res) => {
  try {
    const { rate_source, api_url, poll_interval_mins, auto_update, fallback_source } = req.body;
    await db.execute(sql`
      INSERT INTO jw_mcx_rate_config (tenant_id, rate_source, api_url, poll_interval_mins, auto_update, fallback_source)
      VALUES (${tid(req)}, ${rate_source||'manual'}, ${api_url||null}, ${poll_interval_mins||60}, ${auto_update||0}, ${fallback_source||'manual'})
      ON CONFLICT (tenant_id) DO UPDATE SET rate_source=${rate_source||'manual'}, api_url=${api_url||null},
        poll_interval_mins=${poll_interval_mins||60}, auto_update=${auto_update||0}`);
    const row = await db.execute(sql`SELECT * FROM jw_mcx_rate_config WHERE tenant_id=${tid(req)} LIMIT 1`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/config/bis", requireAuth, async (req: any, res) => {
  try {
    const row = await db.execute(sql`SELECT * FROM jw_bis_config WHERE tenant_id=${tid(req)} LIMIT 1`);
    res.json(row.rows[0] || {});
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/config/bis", requireAuth, async (req: any, res) => {
  try {
    const { bis_login_id, bis_licence_no, hallmarking_centre, centre_address, auto_submit } = req.body;
    await db.execute(sql`
      INSERT INTO jw_bis_config (tenant_id, bis_login_id, bis_licence_no, hallmarking_centre, centre_address, auto_submit)
      VALUES (${tid(req)}, ${bis_login_id||null}, ${bis_licence_no||null}, ${hallmarking_centre||null}, ${centre_address||null}, ${auto_submit||0})
      ON CONFLICT (tenant_id) DO UPDATE SET bis_login_id=${bis_login_id||null}, bis_licence_no=${bis_licence_no||null},
        hallmarking_centre=${hallmarking_centre||null}, auto_submit=${auto_submit||0}`);
    const row = await db.execute(sql`SELECT * FROM jw_bis_config WHERE tenant_id=${tid(req)} LIMIT 1`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/config/shipping", requireAuth, async (req: any, res) => {
  try {
    const row = await db.execute(sql`SELECT * FROM jw_shipping_config WHERE tenant_id=${tid(req)} LIMIT 1`);
    res.json(row.rows[0] || {});
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/config/shipping", requireAuth, async (req: any, res) => {
  try {
    const { provider, api_url, auto_book, default_weight_kg } = req.body;
    await db.execute(sql`
      INSERT INTO jw_shipping_config (tenant_id, provider, api_url, auto_book, default_weight_kg)
      VALUES (${tid(req)}, ${provider||'shiprocket'}, ${api_url||null}, ${auto_book||0}, ${default_weight_kg||0.1})
      ON CONFLICT (tenant_id) DO UPDATE SET provider=${provider||'shiprocket'}, auto_book=${auto_book||0}`);
    const row = await db.execute(sql`SELECT * FROM jw_shipping_config WHERE tenant_id=${tid(req)} LIMIT 1`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/config/insurance", requireAuth, async (req: any, res) => {
  try {
    const row = await db.execute(sql`SELECT * FROM jw_insurance_config WHERE tenant_id=${tid(req)} LIMIT 1`);
    res.json(row.rows[0] || {});
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/config/insurance", requireAuth, async (req: any, res) => {
  try {
    const { provider, policy_no, coverage_per_gm, max_coverage, premium_pct, auto_insure_above_gm, contact_name, contact_phone } = req.body;
    await db.execute(sql`
      INSERT INTO jw_insurance_config (tenant_id, provider, policy_no, coverage_per_gm, max_coverage, premium_pct, auto_insure_above_gm, contact_name, contact_phone)
      VALUES (${tid(req)}, ${provider||null}, ${policy_no||null}, ${coverage_per_gm||null}, ${max_coverage||null}, ${premium_pct||null}, ${auto_insure_above_gm||100}, ${contact_name||null}, ${contact_phone||null})
      ON CONFLICT (tenant_id) DO UPDATE SET provider=${provider||null}, policy_no=${policy_no||null}, coverage_per_gm=${coverage_per_gm||null}, auto_insure_above_gm=${auto_insure_above_gm||100}`);
    const row = await db.execute(sql`SELECT * FROM jw_insurance_config WHERE tenant_id=${tid(req)} LIMIT 1`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/config/traces", requireAuth, async (req: any, res) => {
  try {
    const row = await db.execute(sql`SELECT * FROM jw_traces_config WHERE tenant_id=${tid(req)} LIMIT 1`);
    res.json(row.rows[0] || {});
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/config/traces", requireAuth, async (req: any, res) => {
  try {
    const { tan_no, deductor_name, deductor_type, tds_rate_pct, threshold_inr, auto_deduct } = req.body;
    await db.execute(sql`
      INSERT INTO jw_traces_config (tenant_id, tan_no, deductor_name, deductor_type, tds_rate_pct, threshold_inr, auto_deduct)
      VALUES (${tid(req)}, ${tan_no||null}, ${deductor_name||null}, ${deductor_type||'company'}, ${tds_rate_pct||1}, ${threshold_inr||10000}, ${auto_deduct||0})
      ON CONFLICT (tenant_id) DO UPDATE SET tan_no=${tan_no||null}, tds_rate_pct=${tds_rate_pct||1}, auto_deduct=${auto_deduct||0}`);
    const row = await db.execute(sql`SELECT * FROM jw_traces_config WHERE tenant_id=${tid(req)} LIMIT 1`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/config/xrf", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM jw_xrf_readings WHERE tenant_id=${tid(req)} ORDER BY reading_date DESC LIMIT 100`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/config/xrf", requireAuth, async (req: any, res) => {
  try {
    const { device_id, item_id, production_order_id, sample_id, gold_pct, silver_pct, copper_pct, zinc_pct } = req.body;
    const total = Number(gold_pct||0) + Number(silver_pct||0) + Number(copper_pct||0) + Number(zinc_pct||0);
    const row = await db.execute(sql`
      INSERT INTO jw_xrf_readings (tenant_id, device_id, item_id, production_order_id, sample_id, gold_pct, silver_pct, copper_pct, zinc_pct, total_purity_pct)
      VALUES (${tid(req)}, ${device_id||null}, ${item_id||null}, ${production_order_id||null}, ${sample_id||null}, ${gold_pct||null}, ${silver_pct||null}, ${copper_pct||null}, ${zinc_pct||null}, ${total||null})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Gap 13: E-commerce Order → Standard Invoice Sync ─────────────────────────
router.post("/ecom-orders/:id/sync", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const ordRow = await db.execute(sql`SELECT * FROM jw_ecom_orders WHERE id=${req.params.id} AND tenant_id=${t}`);
    const ord = ordRow.rows[0] as any;
    if (!ord) return res.status(404).json({ error: 'Order not found' });
    if (ord.synced_to_erp) return res.status(400).json({ error: 'Already synced to ERP' });

    const invNo = 'ECOM-INV-' + Date.now();
    const totalAmt = Number(ord.total_amount || 0);
    const gstAmt = Number(ord.gst_amount || 0);
    const taxable = totalAmt - gstAmt;

    const invRow = await db.execute(sql`
      INSERT INTO invoices (tenant_id, invoice_number, invoice_type, invoice_date, buyer_name, buyer_contact,
                            subtotal, cgst_amount, sgst_amount, total_amount, status, remarks)
      VALUES (${t}, ${invNo}, 'tax_invoice', CURRENT_DATE, ${ord.customer_name}, ${ord.customer_phone||null},
              ${Math.round(taxable*100)}, ${Math.round(gstAmt/2*100)}, ${Math.round(gstAmt/2*100)},
              ${Math.round(totalAmt*100)}, 'draft', ${'Auto-synced from Gold ERP ecom order ' + ord.order_no})
      RETURNING *`);
    const inv = invRow.rows[0] as any;

    await db.execute(sql`UPDATE jw_ecom_orders SET synced_to_erp=1, erp_invoice_id=${inv?.id||null} WHERE id=${ord.id}`);

    goldAudit(req, 'CREATE', 'invoices', String(inv?.id || ''),
      `Ecom order ${ord.order_no} synced → Invoice ${invNo} — ₹${totalAmt}`);

    res.json({ success: true, invoice: inv, order: ord });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Gap 16: Dashboard KPIs ────────────────────────────────────────────────────
router.get("/dashboard-kpis", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const [
      salesRow, inventoryRow, karigarRow, repairRow, loyaltyRow,
      estimateRow, bullionRow, productionRow, ecomRow, chitRow
    ] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) cnt, COALESCE(SUM(total_amount),0) total FROM invoices WHERE tenant_id=${t} AND EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM NOW())`),
      db.execute(sql`SELECT COALESCE(SUM(stock_grams),0) total_gm FROM jw_bullion_stock WHERE tenant_id=${t}`),
      db.execute(sql`SELECT COUNT(*) cnt FROM jw_karigars WHERE tenant_id=${t} AND record_status=1 AND status='active'`),
      db.execute(sql`SELECT COUNT(*) cnt, COALESCE(SUM(repair_charges),0) total FROM jw_repairs WHERE tenant_id=${t} AND record_status=1 AND status NOT IN ('delivered','cancelled')`),
      db.execute(sql`SELECT COUNT(*) cnt, COALESCE(SUM(points_balance),0) total_pts FROM jw_loyalty_members WHERE tenant_id=${t}`),
      db.execute(sql`SELECT COUNT(*) cnt FROM jw_estimates WHERE tenant_id=${t} AND status='pending'`),
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) total FROM jw_bullion_transactions WHERE tenant_id=${t} AND txn_type IN ('purchase','buy','inward') AND record_status=1 AND EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM NOW())`),
      db.execute(sql`SELECT COUNT(*) cnt FROM jw_production_orders WHERE tenant_id=${t} AND record_status=1 AND status NOT IN ('completed','cancelled')`),
      db.execute(sql`SELECT COUNT(*) cnt, COALESCE(SUM(total_amount),0) total FROM jw_ecom_orders WHERE tenant_id=${t} AND record_status=1 AND EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM NOW())`),
      db.execute(sql`SELECT COUNT(*) cnt FROM jw_chit_members WHERE tenant_id=${t} AND status='active'`),
    ]);

    res.json({
      monthly_sales: { count: Number((salesRow.rows[0] as any)?.cnt||0), amount: Number((salesRow.rows[0] as any)?.total||0) },
      bullion_stock_gm: Number((inventoryRow.rows[0] as any)?.total_gm||0),
      active_karigars: Number((karigarRow.rows[0] as any)?.cnt||0),
      pending_repairs: { count: Number((repairRow.rows[0] as any)?.cnt||0), amount: Number((repairRow.rows[0] as any)?.total||0) },
      loyalty_members: { count: Number((loyaltyRow.rows[0] as any)?.cnt||0), total_points: Number((loyaltyRow.rows[0] as any)?.total_pts||0) },
      pending_estimates: Number((estimateRow.rows[0] as any)?.cnt||0),
      monthly_bullion_purchase: Number((bullionRow.rows[0] as any)?.total||0),
      active_production_orders: Number((productionRow.rows[0] as any)?.cnt||0),
      monthly_ecom: { count: Number((ecomRow.rows[0] as any)?.cnt||0), amount: Number((ecomRow.rows[0] as any)?.total||0) },
      active_chit_members: Number((chitRow.rows[0] as any)?.cnt||0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
