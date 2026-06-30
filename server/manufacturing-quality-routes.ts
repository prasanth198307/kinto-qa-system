import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

const getTenantId = (req: any) => req.session?.tenantId ?? req.user?.tenantId;

function auth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}
function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(req.user?.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

// ─── QUALITY INSPECTION LOTS ─────────────────────────────────────────────────

router.get("/quality/lots", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { type, status, from, to } = req.query;
    const rows = await db.execute(sql`
      SELECT q.*, p.product_name, r.material_name
      FROM quality_inspection_lots q
      LEFT JOIN products p ON p.id = q.product_id
      LEFT JOIN raw_materials r ON r.id = q.raw_material_id
      WHERE q.tenant_id = ${tenantId}
        AND (${type ?? null}::text IS NULL OR q.inspection_type = ${type ?? null})
        AND (${status ?? null}::text IS NULL OR q.status = ${status ?? null})
        AND (${from ?? null}::date IS NULL OR q.created_at::date >= ${from ?? null}::date)
        AND (${to ?? null}::date IS NULL OR q.created_at::date <= ${to ?? null}::date)
      ORDER BY q.created_at DESC LIMIT 200
    `);
    res.json(rows.rows);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

router.get("/quality/lots/:id", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const [lot, params] = await Promise.all([
      db.execute(sql`SELECT q.*, p.product_name FROM quality_inspection_lots q LEFT JOIN products p ON p.id = q.product_id WHERE q.id = ${req.params.id} AND q.tenant_id = ${tenantId}`),
      db.execute(sql`SELECT * FROM quality_inspection_parameters WHERE lot_id = ${req.params.id} ORDER BY parameter_name`),
    ]);
    if (!lot.rows.length) return res.status(404).json({ message: "Not found" });
    res.json({ ...lot.rows[0], parameters: params.rows });
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

router.post("/quality/lots", requireRole("admin", "manager", "operator"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { inspectionType, referenceType, referenceId, productId, rawMaterialId,
            batchNumber, lotQty, sampleQty, aqlLevel, parameters } = req.body;
    if (!inspectionType) return res.status(400).json({ message: "inspectionType required" });

    const cnt = await db.execute(sql`SELECT COUNT(*) AS c FROM quality_inspection_lots WHERE tenant_id = ${tenantId}`);
    const seq = Number((cnt.rows[0] as any).c) + 1;
    const lotNumber = `QIL-${inspectionType}-${new Date().getFullYear()}-${String(seq).padStart(4,"0")}`;

    const lot = await db.execute(sql`
      INSERT INTO quality_inspection_lots
        (tenant_id, lot_number, inspection_type, reference_type, reference_id,
         product_id, raw_material_id, batch_number, lot_qty, sample_qty, aql_level, created_by)
      VALUES (${tenantId}, ${lotNumber}, ${inspectionType}, ${referenceType ?? null},
              ${referenceId ?? null}, ${productId ?? null}, ${rawMaterialId ?? null},
              ${batchNumber ?? null}, ${lotQty ?? null}, ${sampleQty ?? null},
              ${aqlLevel ?? "2.5"}, ${req.user?.id ?? null})
      RETURNING *
    `);

    const lotId = (lot.rows[0] as any).id;
    if (parameters?.length) {
      for (const p of parameters) {
        await db.execute(sql`
          INSERT INTO quality_inspection_parameters
            (tenant_id, lot_id, parameter_name, uom, min_value, max_value, method)
          VALUES (${tenantId}, ${lotId}, ${p.parameterName}, ${p.uom ?? null},
                  ${p.minValue ?? null}, ${p.maxValue ?? null}, ${p.method ?? null})
        `);
      }
    }
    res.status(201).json({ ...lot.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed to create lot" }); }
});

router.patch("/quality/lots/:id/inspect", requireRole("admin", "manager", "operator"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { parameters, passedQty, rejectedQty, disposition, remarks } = req.body;

    // Update each parameter result
    if (parameters?.length) {
      for (const p of parameters) {
        await db.execute(sql`
          UPDATE quality_inspection_parameters
          SET actual_value = ${p.actualValue ?? null}, result = ${p.result ?? null}, remarks = ${p.remarks ?? null}
          WHERE id = ${p.id} AND lot_id = ${req.params.id}
        `);
      }
    }

    // Determine overall status from parameter results
    const failCount = await db.execute(sql`
      SELECT COUNT(*) AS fails FROM quality_inspection_parameters
      WHERE lot_id = ${req.params.id} AND result = 'fail'
    `);
    const overallStatus = Number((failCount.rows[0] as any).fails) > 0 ? "failed" : "passed";

    const result = await db.execute(sql`
      UPDATE quality_inspection_lots SET
        status = ${overallStatus}, passed_qty = ${passedQty ?? null},
        rejected_qty = ${rejectedQty ?? null}, disposition = ${disposition ?? null},
        remarks = ${remarks ?? null}, inspected_by = ${req.user?.id ?? null},
        inspected_at = NOW(), updated_at = NOW()
      WHERE id = ${req.params.id} AND tenant_id = ${tenantId}
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

router.get("/quality/summary", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const rows = await db.execute(sql`
      SELECT
        inspection_type,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'passed') AS passed,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        ROUND(COUNT(*) FILTER (WHERE status='passed') * 100.0 / NULLIF(COUNT(*) FILTER(WHERE status IN ('passed','failed')),0), 1) AS pass_rate
      FROM quality_inspection_lots
      WHERE tenant_id = ${tenantId} AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY inspection_type
    `);
    res.json(rows.rows);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

// ─── MACHINE OEE ─────────────────────────────────────────────────────────────

router.get("/oee/records", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { machineId, from, to } = req.query;
    const rows = await db.execute(sql`
      SELECT * FROM machine_oee_records
      WHERE tenant_id = ${tenantId}
        AND (${machineId ?? null}::text IS NULL OR machine_id = ${machineId ?? null})
        AND (${from ?? null}::date IS NULL OR record_date >= ${from ?? null}::date)
        AND (${to ?? null}::date IS NULL OR record_date <= ${to ?? null}::date)
      ORDER BY record_date DESC, shift LIMIT 300
    `);
    res.json(rows.rows);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

router.post("/oee/records", requireRole("admin", "manager", "operator"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { machineId, machineName, recordDate, shift, plannedMinutes = 480,
            downtimeMinutes = 0, idealCycleTimeSec, totalUnitsProduced, goodUnits } = req.body;
    if (!machineId || !recordDate) return res.status(400).json({ message: "machineId and recordDate required" });

    const avail = (plannedMinutes - downtimeMinutes) / plannedMinutes;
    const idealOutput = idealCycleTimeSec ? ((plannedMinutes - downtimeMinutes) * 60) / idealCycleTimeSec : null;
    const perf = idealOutput && totalUnitsProduced ? Math.min(totalUnitsProduced / idealOutput, 1) : null;
    const qual = totalUnitsProduced ? (goodUnits ?? totalUnitsProduced) / totalUnitsProduced : null;
    const oee = avail && perf && qual ? avail * perf * qual : null;

    const result = await db.execute(sql`
      INSERT INTO machine_oee_records
        (tenant_id, machine_id, machine_name, record_date, shift, planned_minutes,
         downtime_minutes, ideal_cycle_time_sec, total_units_produced, good_units,
         availability, performance, quality, oee)
      VALUES (${tenantId}, ${machineId}, ${machineName ?? null}, ${recordDate}, ${shift ?? null},
              ${plannedMinutes}, ${downtimeMinutes}, ${idealCycleTimeSec ?? null},
              ${totalUnitsProduced ?? 0}, ${goodUnits ?? totalUnitsProduced ?? 0},
              ${avail.toFixed(4)}, ${perf?.toFixed(4) ?? null}, ${qual?.toFixed(4) ?? null},
              ${oee?.toFixed(4) ?? null})
      ON CONFLICT (tenant_id, machine_id, record_date, shift)
      DO UPDATE SET downtime_minutes=${downtimeMinutes}, total_units_produced=${totalUnitsProduced ?? 0},
        good_units=${goodUnits ?? totalUnitsProduced ?? 0}, availability=${avail.toFixed(4)},
        performance=${perf?.toFixed(4) ?? null}, quality=${qual?.toFixed(4) ?? null},
        oee=${oee?.toFixed(4) ?? null}, updated_at=NOW()
      RETURNING *
    `);
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

router.post("/oee/downtime", requireRole("admin", "manager", "operator"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { machineId, machineName, downtimeDate, shift, startTime, endTime, category, reason, actionTaken } = req.body;
    if (!machineId || !startTime) return res.status(400).json({ message: "machineId and startTime required" });
    const result = await db.execute(sql`
      INSERT INTO machine_downtime_logs
        (tenant_id, machine_id, machine_name, downtime_date, shift, start_time, end_time, category, reason, action_taken, logged_by)
      VALUES (${tenantId}, ${machineId}, ${machineName ?? null}, ${downtimeDate ?? new Date().toISOString().slice(0,10)},
              ${shift ?? null}, ${startTime}, ${endTime ?? null}, ${category ?? "unplanned"}, ${reason ?? null}, ${actionTaken ?? null}, ${req.user?.id ?? null})
      RETURNING *
    `);
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

router.get("/oee/dashboard", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { days = 30 } = req.query;
    const [oeeAvg, downtime, trend] = await Promise.all([
      db.execute(sql`
        SELECT machine_id, machine_name,
          ROUND(AVG(availability)*100,1) AS avg_availability,
          ROUND(AVG(performance)*100,1) AS avg_performance,
          ROUND(AVG(quality)*100,1) AS avg_quality,
          ROUND(AVG(oee)*100,1) AS avg_oee,
          COUNT(*) AS record_count
        FROM machine_oee_records
        WHERE tenant_id=${tenantId} AND record_date >= CURRENT_DATE - ${Number(days)}::int
        GROUP BY machine_id, machine_name ORDER BY avg_oee ASC
      `),
      db.execute(sql`
        SELECT machine_id, machine_name, category,
          SUM(duration_minutes) AS total_downtime_mins, COUNT(*) AS incidents
        FROM machine_downtime_logs
        WHERE tenant_id=${tenantId} AND downtime_date >= CURRENT_DATE - ${Number(days)}::int
        GROUP BY machine_id, machine_name, category ORDER BY total_downtime_mins DESC
      `),
      db.execute(sql`
        SELECT record_date, ROUND(AVG(oee)*100,1) AS avg_oee
        FROM machine_oee_records
        WHERE tenant_id=${tenantId} AND record_date >= CURRENT_DATE - ${Number(days)}::int
        GROUP BY record_date ORDER BY record_date
      `),
    ]);
    res.json({ oee_by_machine: oeeAvg.rows, downtime_by_category: downtime.rows, oee_trend: trend.rows });
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

// ─── STANDARD COST vs ACTUAL VARIANCE ────────────────────────────────────────

router.get("/costing/variance", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { from, to, productId } = req.query;

    const rows = await db.execute(sql`
      SELECT
        pe.id AS production_entry_id,
        pe.production_date,
        pe.batch_number,
        pe.produced_quantity,
        pe.rejected_quantity,
        p.product_name,
        p.product_code,
        p.cost_price AS standard_unit_cost,
        ROUND(p.cost_price::numeric * pe.produced_quantity::numeric, 2) AS standard_total_cost,
        COALESCE((
          SELECT SUM(rmii.quantity_issued::numeric * COALESCE(rm.unit_cost, rm.total_cost, 0)::numeric)
          FROM raw_material_issuance_items rmii
          JOIN raw_material_issuance rmi ON rmi.id = rmii.issuance_id
          LEFT JOIN raw_materials rm ON rm.id = rmii.raw_material_id
          WHERE rmi.product_id = pe.product_id
            AND rmi.issuance_date::date = pe.production_date::date
            AND rmi.tenant_id = ${tenantId}
        ), 0) AS actual_rm_cost,
        ROUND(
          COALESCE((
            SELECT SUM(rmii.quantity_issued::numeric * COALESCE(rm.unit_cost, rm.total_cost, 0)::numeric)
            FROM raw_material_issuance_items rmii
            JOIN raw_material_issuance rmi ON rmi.id = rmii.issuance_id
            LEFT JOIN raw_materials rm ON rm.id = rmii.raw_material_id
            WHERE rmi.product_id = pe.product_id
              AND rmi.issuance_date::date = pe.production_date::date
              AND rmi.tenant_id = ${tenantId}
          ), 0) - (p.cost_price::numeric * pe.produced_quantity::numeric)
        , 2) AS variance,
        CASE
          WHEN p.cost_price > 0 AND pe.produced_quantity > 0 THEN
            ROUND((
              COALESCE((
                SELECT SUM(rmii.quantity_issued::numeric * COALESCE(rm.unit_cost, rm.total_cost, 0)::numeric)
                FROM raw_material_issuance_items rmii
                JOIN raw_material_issuance rmi ON rmi.id = rmii.issuance_id
                LEFT JOIN raw_materials rm ON rm.id = rmii.raw_material_id
                WHERE rmi.product_id = pe.product_id
                  AND rmi.issuance_date::date = pe.production_date::date
                  AND rmi.tenant_id = ${tenantId}
              ), 0) - (p.cost_price::numeric * pe.produced_quantity::numeric)
            ) * 100.0 / NULLIF(p.cost_price::numeric * pe.produced_quantity::numeric, 0), 2)
          ELSE NULL
        END AS variance_pct
      FROM production_entries pe
      JOIN products p ON p.id = pe.product_id
      WHERE pe.tenant_id = ${tenantId}
        AND (${productId ?? null}::text IS NULL OR pe.product_id = ${productId ?? null})
        AND (${from ?? null}::date IS NULL OR pe.production_date::date >= ${from ?? null}::date)
        AND (${to ?? null}::date IS NULL OR pe.production_date::date <= ${to ?? null}::date)
      ORDER BY pe.production_date DESC
      LIMIT 200
    `);

    const summary = await db.execute(sql`
      SELECT
        COUNT(*) AS total_batches,
        COUNT(*) FILTER (WHERE actual_rm_cost > standard_total_cost) AS adverse_count,
        COUNT(*) FILTER (WHERE actual_rm_cost <= standard_total_cost) AS favourable_count,
        SUM(variance) AS total_variance
      FROM (${sql.raw(`
        SELECT
          pe.produced_quantity,
          p.cost_price,
          COALESCE((
            SELECT SUM(rmii.quantity_issued::numeric * COALESCE(rm.unit_cost, rm.total_cost, 0)::numeric)
            FROM raw_material_issuance_items rmii
            JOIN raw_material_issuance rmi ON rmi.id = rmii.issuance_id
            LEFT JOIN raw_materials rm ON rm.id = rmii.raw_material_id
            WHERE rmi.product_id = pe.product_id AND rmi.issuance_date::date = pe.production_date::date AND rmi.tenant_id = ${tenantId}
          ), 0) AS actual_rm_cost,
          ROUND(p.cost_price::numeric * pe.produced_quantity::numeric, 2) AS standard_total_cost,
          ROUND(COALESCE((
            SELECT SUM(rmii.quantity_issued::numeric * COALESCE(rm.unit_cost, rm.total_cost, 0)::numeric)
            FROM raw_material_issuance_items rmii
            JOIN raw_material_issuance rmi ON rmi.id = rmii.issuance_id
            LEFT JOIN raw_materials rm ON rm.id = rmii.raw_material_id
            WHERE rmi.product_id = pe.product_id AND rmi.issuance_date::date = pe.production_date::date AND rmi.tenant_id = ${tenantId}
          ), 0) - (p.cost_price::numeric * pe.produced_quantity::numeric), 2) AS variance
        FROM production_entries pe JOIN products p ON p.id = pe.product_id
        WHERE pe.tenant_id = ${tenantId}
      `)}) sub
    `);

    res.json({ variance_details: rows.rows, summary: summary.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed to compute variance" }); }
});

export default router;
