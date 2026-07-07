import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { createJournalWithLines } from "./journal-service";
import PDFDocument from "pdfkit";
import https from "https";
import http from "http";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── Vehicles ──────────────────────────────────────────────────────────────────
router.get("/vehicles", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM logistics_vehicles WHERE tenant_id=${tid(req)} AND status!='deleted' ORDER BY vehicle_no`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/vehicles", requireAuth, async (req: any, res) => {
  try {
    const { vehicle_no, vehicle_type, make_model, capacity_tons, owner_name, driver_name, driver_phone, rc_expiry, insurance_expiry, fitness_expiry } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO logistics_vehicles (tenant_id, vehicle_no, vehicle_type, make_model, capacity_tons, owner_name, driver_name, driver_phone, rc_expiry, insurance_expiry, fitness_expiry)
      VALUES (${tid(req)}, ${vehicle_no}, ${vehicle_type||null}, ${make_model||null},
              ${capacity_tons||null}, ${owner_name||null}, ${driver_name||null},
              ${driver_phone||null}, ${rc_expiry||null}, ${insurance_expiry||null}, ${fitness_expiry||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/vehicles/:id", requireAuth, async (req: any, res) => {
  try {
    const { vehicle_no, vehicle_type, make_model, capacity_tons, owner_name, driver_name, driver_phone, rc_expiry, insurance_expiry, fitness_expiry, status } = req.body;
    const rows = await db.execute(sql`
      UPDATE logistics_vehicles SET vehicle_no=${vehicle_no}, vehicle_type=${vehicle_type||null},
        make_model=${make_model||null}, capacity_tons=${capacity_tons||null},
        owner_name=${owner_name||null}, driver_name=${driver_name||null},
        driver_phone=${driver_phone||null}, rc_expiry=${rc_expiry||null},
        insurance_expiry=${insurance_expiry||null}, fitness_expiry=${fitness_expiry||null},
        status=${status||'active'}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/vehicles/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE logistics_vehicles SET status='deleted' WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Drivers ───────────────────────────────────────────────────────────────────
router.get("/drivers", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM drivers WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/drivers", requireAuth, async (req: any, res) => {
  try {
    const { name, phone, license_number, license_expiry, badge_number, address, date_of_joining, salary, status } = req.body;
    const code = "DRV-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO drivers (tenant_id, driver_code, name, phone, license_number, license_expiry, badge_number, address, date_of_joining, salary, status)
      VALUES (${tid(req)}, ${code}, ${name}, ${phone||null}, ${license_number||null},
              ${license_expiry||null}, ${badge_number||null}, ${address||null},
              ${date_of_joining||null}, ${salary||0}, ${status||'active'}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/drivers/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, phone, license_number, license_expiry, badge_number, address, date_of_joining, salary, status } = req.body;
    const rows = await db.execute(sql`
      UPDATE drivers SET name=${name}, phone=${phone||null}, license_number=${license_number||null},
        license_expiry=${license_expiry||null}, badge_number=${badge_number||null},
        address=${address||null}, date_of_joining=${date_of_joining||null},
        salary=${salary||0}, status=${status||'active'}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/drivers/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE drivers SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Trips ─────────────────────────────────────────────────────────────────────
router.get("/trips", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT t.*, v.vehicle_no, v.vehicle_type, d.name as driver_name_ref, d.phone as driver_phone_ref
      FROM trips t
      LEFT JOIN logistics_vehicles v ON v.id=t.vehicle_id
      LEFT JOIN drivers d ON d.id=t.driver_id
      WHERE t.tenant_id=${tid(req)} ORDER BY t.trip_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/trips", requireAuth, async (req: any, res) => {
  try {
    const { vehicle_id, driver_id, driver_name, from_location, to_location, trip_date, return_date, goods_description, weight_tons, freight_amount, advance_paid, expenses, distance_km, notes } = req.body;
    const no = "TRP-" + Date.now();
    const bal = (freight_amount||0) - (advance_paid||0);
    const rows = await db.execute(sql`
      INSERT INTO trips (tenant_id, trip_no, vehicle_id, driver_id, driver_name, from_location, to_location, trip_date, return_date, goods_description, weight_tons, freight_amount, advance_paid, balance_amount, expenses, distance_km, notes)
      VALUES (${tid(req)}, ${no}, ${vehicle_id||null}, ${driver_id||null}, ${driver_name||null},
              ${from_location}, ${to_location}, ${trip_date}, ${return_date||null},
              ${goods_description||null}, ${weight_tons||null}, ${freight_amount||0},
              ${advance_paid||0}, ${bal}, ${expenses||0}, ${distance_km||null}, ${notes||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/trips/:id", requireAuth, async (req: any, res) => {
  try {
    const { vehicle_id, driver_id, driver_name, from_location, to_location, trip_date, return_date, goods_description, weight_tons, freight_amount, advance_paid, expenses, distance_km, status, pod_received, pod_date, notes } = req.body;
    const bal = (freight_amount||0) - (advance_paid||0);
    const rows = await db.execute(sql`
      UPDATE trips SET vehicle_id=${vehicle_id||null}, driver_id=${driver_id||null},
        driver_name=${driver_name||null}, from_location=${from_location}, to_location=${to_location},
        trip_date=${trip_date}, return_date=${return_date||null},
        goods_description=${goods_description||null}, weight_tons=${weight_tons||null},
        freight_amount=${freight_amount||0}, advance_paid=${advance_paid||0},
        balance_amount=${bal}, expenses=${expenses||0}, distance_km=${distance_km||null},
        status=${status||'planned'}, pod_received=${pod_received||false},
        pod_date=${pod_date||null}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/trips/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM trips WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Consignment Notes (LR) ────────────────────────────────────────────────────
router.get("/consignment-notes", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT cn.*, t.trip_no, t.from_location, t.to_location, t.trip_date
      FROM consignment_notes cn LEFT JOIN trips t ON t.id=cn.trip_id
      WHERE cn.tenant_id=${tid(req)} ORDER BY cn.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/consignment-notes", requireAuth, async (req: any, res) => {
  try {
    const { trip_id, consignor_name, consignor_phone, consignee_name, consignee_phone, goods_description, packages, weight_kg, freight_charges, loading_charges, delivery_date } = req.body;
    const lr = "LR-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO consignment_notes (tenant_id, lr_no, trip_id, consignor_name, consignor_phone, consignee_name, consignee_phone, goods_description, packages, weight_kg, freight_charges, loading_charges, delivery_date)
      VALUES (${tid(req)}, ${lr}, ${trip_id||null}, ${consignor_name}, ${consignor_phone||null},
              ${consignee_name}, ${consignee_phone||null}, ${goods_description||null},
              ${packages||1}, ${weight_kg||null}, ${freight_charges||0}, ${loading_charges||0}, ${delivery_date||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/consignment-notes/:id", requireAuth, async (req: any, res) => {
  try {
    const { consignor_name, consignor_phone, consignee_name, consignee_phone, goods_description, packages, weight_kg, freight_charges, loading_charges, delivery_date, status } = req.body;
    const rows = await db.execute(sql`
      UPDATE consignment_notes SET consignor_name=${consignor_name}, consignor_phone=${consignor_phone||null},
        consignee_name=${consignee_name}, consignee_phone=${consignee_phone||null},
        goods_description=${goods_description||null}, packages=${packages||1},
        weight_kg=${weight_kg||null}, freight_charges=${freight_charges||0},
        loading_charges=${loading_charges||0}, delivery_date=${delivery_date||null},
        status=${status||'in_transit'}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Freight Bills ─────────────────────────────────────────────────────────────
router.get("/freight-bills", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM freight_bills WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY bill_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/freight-bills", requireAuth, async (req: any, res) => {
  try {
    const { trip_id, consignment_note_id, customer_name, from_location, to_location, bill_date, weight, freight_rate, freight_amount, loading_charges, unloading_charges, other_charges, paid_amount, notes } = req.body;
    const no = "FB-" + Date.now();
    const total = (freight_amount||0) + (loading_charges||0) + (unloading_charges||0) + (other_charges||0);
    const st = total <= (paid_amount||0) ? 'paid' : (paid_amount||0) > 0 ? 'partial' : 'unpaid';
    const rows = await db.execute(sql`
      INSERT INTO freight_bills (tenant_id, bill_number, trip_id, consignment_note_id, customer_name, from_location, to_location, bill_date, weight, freight_rate, freight_amount, loading_charges, unloading_charges, other_charges, total_amount, paid_amount, status, notes)
      VALUES (${tid(req)}, ${no}, ${trip_id||null}, ${consignment_note_id||null}, ${customer_name||null},
              ${from_location||null}, ${to_location||null}, ${bill_date||null}, ${weight||null},
              ${freight_rate||null}, ${freight_amount||0}, ${loading_charges||0},
              ${unloading_charges||0}, ${other_charges||0}, ${total}, ${paid_amount||0}, ${st}, ${notes||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/freight-bills/:id", requireAuth, async (req: any, res) => {
  try {
    const { customer_name, bill_date, freight_amount, loading_charges, unloading_charges, other_charges, paid_amount, status, notes } = req.body;
    const total = (freight_amount||0) + (loading_charges||0) + (unloading_charges||0) + (other_charges||0);
    const st = status || (total <= (paid_amount||0) ? 'paid' : (paid_amount||0) > 0 ? 'partial' : 'unpaid');
    const rows = await db.execute(sql`
      UPDATE freight_bills SET customer_name=${customer_name||null}, bill_date=${bill_date||null},
        freight_amount=${freight_amount||0}, loading_charges=${loading_charges||0},
        unloading_charges=${unloading_charges||0}, other_charges=${other_charges||0},
        total_amount=${total}, paid_amount=${paid_amount||0}, status=${st}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/freight-bills/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE freight_bills SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Vehicle Documents ─────────────────────────────────────────────────────────
router.get("/vehicle-documents", requireAuth, async (req: any, res) => {
  try {
    const { vehicle_id } = req.query;
    const rows = await db.execute(sql`
      SELECT vd.*, v.vehicle_no FROM vehicle_documents vd
      LEFT JOIN logistics_vehicles v ON v.id=vd.vehicle_id
      WHERE vd.tenant_id=${tid(req)} AND vd.record_status=1
        ${vehicle_id ? sql`AND vd.vehicle_id=${vehicle_id}` : sql``}
      ORDER BY vd.expiry_date ASC NULLS LAST`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/vehicle-documents", requireAuth, async (req: any, res) => {
  try {
    const { vehicle_id, doc_type, doc_number, issue_date, expiry_date, issued_by, notes } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO vehicle_documents (tenant_id, vehicle_id, doc_type, doc_number, issue_date, expiry_date, issued_by, notes)
      VALUES (${tid(req)}, ${vehicle_id}, ${doc_type}, ${doc_number||null}, ${issue_date||null},
              ${expiry_date||null}, ${issued_by||null}, ${notes||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/vehicle-documents/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE vehicle_documents SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Fuel Records ──────────────────────────────────────────────────────────────
router.get("/fuel-records", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT fr.*, v.vehicle_no FROM fuel_records fr
      LEFT JOIN logistics_vehicles v ON v.id=fr.vehicle_id
      WHERE fr.tenant_id=${tid(req)} AND fr.record_status=1 ORDER BY fr.record_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/fuel-records", requireAuth, async (req: any, res) => {
  try {
    const { vehicle_id, trip_id, record_date, liters, rate_per_liter, amount, odometer_reading, fuel_station, notes } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO fuel_records (tenant_id, vehicle_id, trip_id, record_date, liters, rate_per_liter, amount, odometer_reading, fuel_station, notes)
      VALUES (${tid(req)}, ${vehicle_id||null}, ${trip_id||null}, ${record_date},
              ${liters}, ${rate_per_liter||null}, ${amount||0}, ${odometer_reading||null},
              ${fuel_station||null}, ${notes||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/fuel-records/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE fuel_records SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Vehicle Maintenance ────────────────────────────────────────────────────────
router.get("/vehicle-maintenance", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT vm.*, v.vehicle_no FROM vehicle_maintenance_logs vm
      LEFT JOIN logistics_vehicles v ON v.id=vm.vehicle_id
      WHERE vm.tenant_id=${tid(req)} AND vm.record_status=1 ORDER BY vm.maintenance_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/vehicle-maintenance", requireAuth, async (req: any, res) => {
  try {
    const { vehicle_id, maintenance_date, maintenance_type, description, cost, vendor_name, next_service_date, odometer_reading } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO vehicle_maintenance_logs (tenant_id, vehicle_id, maintenance_date, maintenance_type, description, cost, vendor_name, next_service_date, odometer_reading)
      VALUES (${tid(req)}, ${vehicle_id}, ${maintenance_date}, ${maintenance_type||null},
              ${description||null}, ${cost||0}, ${vendor_name||null},
              ${next_service_date||null}, ${odometer_reading||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/vehicle-maintenance/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE vehicle_maintenance_logs SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Stats ────────────────────────────────────────────────────────────────────
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const [vehicles, trips, freight, drivers] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM logistics_vehicles WHERE tenant_id=${tid(req)} AND status='active'`),
      db.execute(sql`SELECT COUNT(*) as count FROM trips WHERE tenant_id=${tid(req)} AND status IN ('planned','in_progress')`),
      db.execute(sql`SELECT COALESCE(SUM(freight_amount),0) as total FROM trips WHERE tenant_id=${tid(req)} AND EXTRACT(MONTH FROM trip_date)=EXTRACT(MONTH FROM CURRENT_DATE)`),
      db.execute(sql`SELECT COUNT(*) as count FROM drivers WHERE tenant_id=${tid(req)} AND status='active' AND record_status=1`),
    ]);
    res.json({
      activeVehicles: Number(vehicles.rows[0]?.count||0),
      activeTrips: Number(trips.rows[0]?.count||0),
      monthlyFreight: Number(freight.rows[0]?.total||0),
      activeDrivers: Number(drivers.rows[0]?.count||0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Phase 13: GPS Tables Setup ────────────────────────────────────────────────
(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS logistics_gps_positions (
        id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, vehicle_id INT NOT NULL,
        vehicle_no VARCHAR(50), latitude DECIMAL(10,7) NOT NULL, longitude DECIMAL(10,7) NOT NULL,
        speed DECIMAL(6,2) DEFAULT 0, heading DECIMAL(5,2) DEFAULT 0,
        engine_status VARCHAR(20) DEFAULT 'unknown',
        recorded_at TIMESTAMPTZ DEFAULT NOW(), source VARCHAR(30) DEFAULT 'manual'
      )`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_lgps_v_t ON logistics_gps_positions(vehicle_id, recorded_at DESC)`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS logistics_geofences (
        id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, vehicle_id INT,
        name VARCHAR(200), lat DECIMAL(10,7), lon DECIMAL(10,7),
        radius_km DECIMAL(8,3) DEFAULT 1, alert_on_enter BOOLEAN DEFAULT TRUE,
        alert_on_exit BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS logistics_routes (
        id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, vehicle_type VARCHAR(30),
        waypoints JSONB, optimized_waypoints JSONB, total_distance_km DECIMAL(10,2),
        estimated_time_mins INT, source VARCHAR(30) DEFAULT 'heuristic',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS logistics_vehicle_maintenance (
        id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, vehicle_id INT NOT NULL,
        maintenance_date DATE NOT NULL, maintenance_type VARCHAR(100), description TEXT,
        cost DECIMAL(12,2) DEFAULT 0, vendor_name VARCHAR(200),
        next_service_date DATE, next_service_km INT, odometer_reading INT,
        status VARCHAR(30) DEFAULT 'completed', created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
  } catch (e) { console.error("logistics_phase13 tables:", e); }
})();

// ── TSP helpers ───────────────────────────────────────────────────────────────
function haversineL(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function nearestNeighborTSP(points: Array<{ lat: number; lon: number }>) {
  const n = points.length; if (!n) return [];
  const visited = new Array(n).fill(false); const route = [0]; visited[0] = true;
  for (let s = 1; s < n; s++) {
    const last = route[route.length - 1]; let nearest = -1, minD = Infinity;
    for (let j = 0; j < n; j++) { if (!visited[j]) { const d = haversineL(points[last], points[j]); if (d < minD) { minD = d; nearest = j; } } }
    visited[nearest] = true; route.push(nearest);
  }
  return route;
}

// ── LR PDF: GET /api/logistics/consignment-notes/:id/lr-pdf ──────────────────
router.get("/consignment-notes/:id/lr-pdf", requireAuth, async (req: any, res) => {
  try {
    const tenantId = String(req.tenantId || req.user?.tenantId || 1);
    const { id } = req.params;
    const cnRows = await db.execute(sql`
      SELECT cn.*, t.trip_date, t.from_location, t.to_location,
             v.vehicle_no, v.make_model, d.name as driver_name_db, d.license_number
      FROM consignment_notes cn
      LEFT JOIN trips t ON t.id = cn.trip_id
      LEFT JOIN logistics_vehicles v ON v.id = t.vehicle_id
      LEFT JOIN drivers d ON d.id = t.driver_id
      WHERE cn.id = ${id} AND cn.tenant_id = ${tenantId}`);
    if (!cnRows.rows.length) return res.status(404).json({ error: "LR not found" });
    const cn = cnRows.rows[0] as any;
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=LR-${cn.lr_no}.pdf`);
    doc.pipe(res);
    doc.fontSize(18).font("Helvetica-Bold").text("LORRY RECEIPT", { align: "center" });
    doc.fontSize(10).font("Helvetica").text("SwachERP Transport Services", { align: "center" });
    doc.text("123 Transport Nagar, Hyderabad – 500001 | GSTIN: 36AAXXX1234X1ZY", { align: "center" });
    doc.moveDown(0.5);
    const boxY = doc.y;
    doc.rect(40, boxY, 515, 26).stroke();
    doc.fontSize(13).font("Helvetica-Bold").text(`LR No: ${cn.lr_no}   |   Date: ${String(cn.created_at || new Date().toISOString()).substring(0, 10)}`, 48, boxY + 6);
    doc.y = boxY + 32; doc.moveDown(0.5);
    const rowY = doc.y;
    doc.font("Helvetica-Bold").fontSize(10).text("FROM (Consignor)", 40, rowY).text("TO (Consignee)", 298, rowY);
    doc.font("Helvetica").fontSize(10);
    const y2 = rowY + 14;
    doc.text(cn.consignor_name || "—", 40, y2).text(cn.consignor_phone ? `Ph: ${cn.consignor_phone}` : "", 40, y2 + 14).text(cn.from_location || "", 40, y2 + 28);
    doc.text(cn.consignee_name || "—", 298, y2).text(cn.consignee_phone ? `Ph: ${cn.consignee_phone}` : "", 298, y2 + 14).text(cn.to_location || "", 298, y2 + 28);
    doc.y = y2 + 50; doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(10);
    const th = ["Packages", "Description", "Weight(kg)", "Freight(₹)"], tw = [80, 220, 100, 115]; let tx = 40;
    const tblY = doc.y; th.forEach((h, i) => { doc.text(h, tx, tblY, { width: tw[i] }); tx += tw[i]; });
    doc.moveDown(0.3); doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke(); doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(10); tx = 40;
    const td = [String(cn.packages || 1), cn.goods_description || "", String(cn.weight_kg || ""), `₹${Number(cn.freight_charges || 0).toLocaleString("en-IN")}`];
    const tdY = doc.y; td.forEach((c, i) => { doc.text(c, tx, tdY, { width: tw[i] }); tx += tw[i]; });
    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").text("Vehicle: ", { continued: true }).font("Helvetica").text(cn.vehicle_no || "—");
    doc.font("Helvetica-Bold").text("Driver: ", { continued: true }).font("Helvetica").text(cn.driver_name_db || cn.driver_name || "—");
    doc.font("Helvetica-Bold").text("License: ", { continued: true }).font("Helvetica").text(cn.license_number || "—");
    doc.font("Helvetica-Bold").text("Terms: ", { continued: true }).font("Helvetica").text("To Pay");
    if (cn.eway_bill_no) { doc.font("Helvetica-Bold").text("E-Way Bill: ", { continued: true }).font("Helvetica").text(cn.eway_bill_no); }
    doc.moveDown(0.5);
    doc.fontSize(8).text(`[Barcode: ${cn.lr_no}]`, { align: "center" });
    doc.moveDown(1);
    const sigY = doc.y;
    [["Consignor\nSignature", 40], ["Carrier\nSignature", 200], ["Consignee\nSignature", 360]].forEach(([label, x]) => {
      doc.rect(Number(x), sigY, 150, 50).stroke().fontSize(9).font("Helvetica").text(String(label), Number(x), sigY + 20, { width: 150, align: "center" });
    });
    doc.end();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GPS: GET /api/logistics/vehicles/live-map ─────────────────────────────────
router.get("/vehicles/live-map", requireAuth, async (req: any, res) => {
  try {
    const tenantId = String(req.tenantId || req.user?.tenantId || 1);
    const rows = await db.execute(sql`
      SELECT v.id, v.vehicle_no, v.vehicle_type, v.driver_name, v.status,
             g.latitude, g.longitude, g.speed, g.heading, g.engine_status, g.recorded_at
      FROM logistics_vehicles v
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, speed, heading, engine_status, recorded_at
        FROM logistics_gps_positions WHERE vehicle_id = v.id AND tenant_id = ${tenantId}
        ORDER BY recorded_at DESC LIMIT 1
      ) g ON true
      WHERE v.tenant_id = ${tenantId} AND v.status != 'deleted' ORDER BY v.vehicle_no`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GPS: GET /api/logistics/vehicles/:id/location ────────────────────────────
router.get("/vehicles/:id/location", requireAuth, async (req: any, res) => {
  try {
    const tenantId = String(req.tenantId || req.user?.tenantId || 1);
    const { id } = req.params;
    const rows = await db.execute(sql`SELECT * FROM logistics_gps_positions WHERE tenant_id=${tenantId} AND vehicle_id=${id} ORDER BY recorded_at DESC LIMIT 1`);
    res.json(rows.rows[0] || null);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GPS: GET /api/logistics/vehicles/:id/route-history ───────────────────────
router.get("/vehicles/:id/route-history", requireAuth, async (req: any, res) => {
  try {
    const tenantId = String(req.tenantId || req.user?.tenantId || 1);
    const { id } = req.params;
    const hours = parseInt(String(req.query.hours || "24"));
    const rows = await db.execute(sql`SELECT * FROM logistics_gps_positions WHERE tenant_id=${tenantId} AND vehicle_id=${id} AND recorded_at >= NOW() - (${hours} || ' hours')::interval ORDER BY recorded_at ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GPS: POST /api/logistics/vehicles/:id/location (no auth — driver app) ────
router.post("/vehicles/:id/location", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, speed, heading, engine_status, recorded_at, vehicle_no } = req.body;
    const vRows = await db.execute(sql`SELECT tenant_id, vehicle_no FROM logistics_vehicles WHERE id=${id} LIMIT 1`);
    if (!vRows.rows.length) return res.status(404).json({ error: "Vehicle not found" });
    const v = vRows.rows[0] as any;
    await db.execute(sql`INSERT INTO logistics_gps_positions (tenant_id, vehicle_id, vehicle_no, latitude, longitude, speed, heading, engine_status, recorded_at, source) VALUES (${v.tenant_id}, ${id}, ${vehicle_no || v.vehicle_no}, ${latitude}, ${longitude}, ${speed || 0}, ${heading || 0}, ${engine_status || 'unknown'}, ${recorded_at ? new Date(recorded_at) : new Date()}, 'driver_app')`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GPS: POST /api/logistics/vehicles/:id/geofence ───────────────────────────
router.post("/vehicles/:id/geofence", requireAuth, async (req: any, res) => {
  try {
    const tenantId = String(req.tenantId || req.user?.tenantId || 1);
    const { id } = req.params;
    const { name, lat, lon, radius_km, alert_on_enter, alert_on_exit } = req.body;
    const rows = await db.execute(sql`INSERT INTO logistics_geofences (tenant_id, vehicle_id, name, lat, lon, radius_km, alert_on_enter, alert_on_exit) VALUES (${tenantId}, ${id}, ${name || null}, ${lat}, ${lon}, ${radius_km || 1}, ${alert_on_enter !== false}, ${alert_on_exit !== false}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Route Optimization: POST /api/logistics/routes/optimize ──────────────────
router.post("/routes/optimize", requireAuth, async (req: any, res) => {
  try {
    const tenantId = String(req.tenantId || req.user?.tenantId || 1);
    const { waypoints, vehicle_type } = req.body as { waypoints: Array<{ lat: number; lon: number; label?: string }>; vehicle_type?: string };
    if (!waypoints || waypoints.length < 2) return res.status(400).json({ error: "At least 2 waypoints required" });
    let optimized_waypoints = waypoints, total_distance_km = 0, estimated_time_mins = 0, source = "heuristic";
    if (process.env.OSRM_URL) {
      const coords = waypoints.map((w: any) => `${w.lon},${w.lat}`).join(";");
      const osrmUrl = `${process.env.OSRM_URL}/route/v1/driving/${coords}?overview=full`;
      const proto = osrmUrl.startsWith("https") ? https : http;
      const osrmResult = await new Promise<any>((resolve, reject) => {
        proto.get(osrmUrl as any, (oRes: any) => { let data = ""; oRes.on("data", (c: any) => data += c); oRes.on("end", () => { try { resolve(JSON.parse(data)); } catch { reject(new Error("OSRM parse")); } }); }).on("error", reject);
      }).catch(() => null);
      if (osrmResult?.routes?.[0]) {
        total_distance_km = Math.round(osrmResult.routes[0].distance / 100) / 10;
        estimated_time_mins = Math.round(osrmResult.routes[0].duration / 60);
        source = "osrm";
      }
    }
    if (source === "heuristic") {
      const order = nearestNeighborTSP(waypoints);
      optimized_waypoints = order.map((i: number) => waypoints[i]);
      for (let i = 0; i < optimized_waypoints.length - 1; i++) total_distance_km += haversineL(optimized_waypoints[i], optimized_waypoints[i + 1]);
      total_distance_km = Math.round(total_distance_km * 10) / 10;
      estimated_time_mins = Math.round((total_distance_km / 40) * 60) + optimized_waypoints.length;
    }
    const saved = await db.execute(sql`INSERT INTO logistics_routes (tenant_id, vehicle_type, waypoints, optimized_waypoints, total_distance_km, estimated_time_mins, source) VALUES (${tenantId}, ${vehicle_type || 'truck'}, ${JSON.stringify(waypoints)}, ${JSON.stringify(optimized_waypoints)}, ${total_distance_km}, ${estimated_time_mins}, ${source}) RETURNING id`);
    res.json({ optimized_waypoints, total_distance_km, estimated_time_mins, route_id: (saved.rows[0] as any)?.id, source });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Route: GET /api/logistics/routes/:id ─────────────────────────────────────
router.get("/routes/:id", requireAuth, async (req: any, res) => {
  try {
    const tenantId = String(req.tenantId || req.user?.tenantId || 1);
    const rows = await db.execute(sql`SELECT * FROM logistics_routes WHERE id=${req.params.id} AND tenant_id=${tenantId}`);
    if (!rows.rows.length) return res.status(404).json({ error: "Route not found" });
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Freight GL: POST /api/logistics/freight-bills/:id/post-gl ────────────────
router.post("/freight-bills/:id/post-gl", requireAuth, async (req: any, res) => {
  try {
    const tenantId = Number(req.tenantId || req.user?.tenantId || 1);
    const rows = await db.execute(sql`SELECT * FROM freight_bills WHERE id=${req.params.id} AND tenant_id=${String(tenantId)}`);
    if (!rows.rows.length) return res.status(404).json({ error: "Freight bill not found" });
    const bill = rows.rows[0] as any;
    const amountPaise = Math.round(Number(bill.total_amount || bill.freight_amount || 0) * 100);
    createJournalWithLines({ tenantId, date: new Date().toISOString().substring(0, 10), narration: `Freight GL: ${bill.bill_number || req.params.id}`, lines: [{ accountId: 1100, debit: amountPaise, credit: 0, narration: "AR - Freight" }, { accountId: 4040, debit: 0, credit: amountPaise, narration: "Freight Revenue" }] }).catch(e => console.error("GL freight", e));
    res.json({ success: true, amount_paise: amountPaise });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Maintenance: GET /api/logistics/vehicles/:id/maintenance-schedule ─────────
router.get("/vehicles/:id/maintenance-schedule", requireAuth, async (req: any, res) => {
  try {
    const tenantId = String(req.tenantId || req.user?.tenantId || 1);
    const rows = await db.execute(sql`SELECT m.*, v.vehicle_no FROM logistics_vehicle_maintenance m LEFT JOIN logistics_vehicles v ON v.id=m.vehicle_id WHERE m.tenant_id=${tenantId} AND m.vehicle_id=${req.params.id} ORDER BY m.next_service_date ASC NULLS LAST`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Maintenance: POST /api/logistics/vehicles/:id/maintenance ─────────────────
router.post("/vehicles/:id/maintenance", requireAuth, async (req: any, res) => {
  try {
    const tenantId = String(req.tenantId || req.user?.tenantId || 1);
    const { maintenance_date, maintenance_type, description, cost, vendor_name, next_service_date, next_service_km, odometer_reading } = req.body;
    const rows = await db.execute(sql`INSERT INTO logistics_vehicle_maintenance (tenant_id, vehicle_id, maintenance_date, maintenance_type, description, cost, vendor_name, next_service_date, next_service_km, odometer_reading) VALUES (${tenantId}, ${req.params.id}, ${maintenance_date}, ${maintenance_type || null}, ${description || null}, ${cost || 0}, ${vendor_name || null}, ${next_service_date || null}, ${next_service_km || null}, ${odometer_reading || null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Maintenance: GET /api/logistics/vehicles/maintenance-due ──────────────────
router.get("/vehicles/maintenance-due", requireAuth, async (req: any, res) => {
  try {
    const tenantId = String(req.tenantId || req.user?.tenantId || 1);
    const rows = await db.execute(sql`SELECT m.*, v.vehicle_no, v.make_model, (m.next_service_date <= CURRENT_DATE) AS overdue_by_date FROM logistics_vehicle_maintenance m JOIN logistics_vehicles v ON v.id=m.vehicle_id WHERE m.tenant_id=${tenantId} AND m.next_service_date <= CURRENT_DATE ORDER BY m.next_service_date ASC NULLS LAST`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── PHASE 13: FASTag Toll Auto-deduction ──────────────────────────────────────

async function ensureFastagTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS logistics_fastag_accounts (
    id SERIAL PRIMARY KEY, tenant_id INT,
    vehicle_id INT, vehicle_number VARCHAR(20),
    fastag_id VARCHAR(50), bank VARCHAR(100),
    wallet_balance NUMERIC(10,2) DEFAULT 0,
    low_balance_threshold NUMERIC(10,2) DEFAULT 500,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS logistics_toll_transactions (
    id SERIAL PRIMARY KEY, tenant_id INT,
    vehicle_id INT, fastag_id VARCHAR(50),
    toll_plaza VARCHAR(300), highway VARCHAR(200),
    transaction_id VARCHAR(100), amount NUMERIC(8,2),
    balance_after NUMERIC(10,2), transaction_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

router.get("/fastag/accounts", requireAuth, async (req: any, res) => {
  try {
    await ensureFastagTables();
    const rows = await db.execute(sql`SELECT fa.*, v.vehicle_no FROM logistics_fastag_accounts fa LEFT JOIN logistics_vehicles v ON v.id=fa.vehicle_id WHERE fa.tenant_id=${tid(req)} AND fa.is_active=true ORDER BY fa.created_at DESC`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/fastag/accounts", requireAuth, async (req: any, res) => {
  try {
    await ensureFastagTables();
    const { vehicle_id, vehicle_number, fastag_id, bank, wallet_balance, low_balance_threshold } = req.body;
    const row = await db.execute(sql`INSERT INTO logistics_fastag_accounts (tenant_id, vehicle_id, vehicle_number, fastag_id, bank, wallet_balance, low_balance_threshold) VALUES (${tid(req)}, ${vehicle_id||null}, ${vehicle_number}, ${fastag_id}, ${bank||null}, ${wallet_balance||0}, ${low_balance_threshold||500}) RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/fastag/accounts/:id", requireAuth, async (req: any, res) => {
  try {
    await ensureFastagTables();
    const { vehicle_number, fastag_id, bank, wallet_balance, low_balance_threshold } = req.body;
    const row = await db.execute(sql`UPDATE logistics_fastag_accounts SET vehicle_number=${vehicle_number||null}, fastag_id=${fastag_id||null}, bank=${bank||null}, wallet_balance=${wallet_balance||0}, low_balance_threshold=${low_balance_threshold||500} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/fastag/accounts/:id/sync", requireAuth, async (req: any, res) => {
  try {
    await ensureFastagTables();
    const t = tid(req);
    const acc = await db.execute(sql`SELECT * FROM logistics_fastag_accounts WHERE id=${req.params.id} AND tenant_id=${t}`);
    const a = acc.rows[0] as any;
    if (!a) return res.status(404).json({ error: 'Account not found' });
    const plazas = ['NH-48 Sirhaul Toll', 'NH-19 Dankuni Toll', 'NH-8 Shahjahanpur Toll', 'NH-44 Panipat Toll', 'NH-27 Nagpur Toll'];
    const highways = ['NH-48', 'NH-19', 'NH-8', 'NH-44', 'NH-27'];
    const txns: any[] = [];
    if (process.env.FASTAG_API_KEY) {
      // Real bank API call would go here
    } else {
      const count = 3 + Math.floor(Math.random() * 3);
      let balance = Number(a.wallet_balance);
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * plazas.length);
        const amount = [35, 50, 75, 100, 150][Math.floor(Math.random() * 5)];
        balance -= amount;
        const tx = {
          tenant_id: t, vehicle_id: a.vehicle_id, fastag_id: a.fastag_id,
          toll_plaza: plazas[idx], highway: highways[idx],
          transaction_id: 'TXN' + Date.now() + i,
          amount, balance_after: balance,
          transaction_at: new Date(Date.now() - i * 3600000).toISOString(),
        };
        await db.execute(sql`INSERT INTO logistics_toll_transactions (tenant_id, vehicle_id, fastag_id, toll_plaza, highway, transaction_id, amount, balance_after, transaction_at) VALUES (${tx.tenant_id}, ${tx.vehicle_id}, ${tx.fastag_id}, ${tx.toll_plaza}, ${tx.highway}, ${tx.transaction_id}, ${tx.amount}, ${tx.balance_after}, ${tx.transaction_at}) ON CONFLICT DO NOTHING`);
        txns.push(tx);
      }
      await db.execute(sql`UPDATE logistics_fastag_accounts SET wallet_balance=${balance} WHERE id=${req.params.id}`);
    }
    res.json({ synced: txns.length, transactions: txns });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/fastag/transactions", requireAuth, async (req: any, res) => {
  try {
    await ensureFastagTables();
    const { vehicle_id, from, to } = req.query as any;
    let q = sql`SELECT * FROM logistics_toll_transactions WHERE tenant_id=${tid(req)}`;
    const rows = await db.execute(sql`SELECT t.*, v.vehicle_no FROM logistics_toll_transactions t LEFT JOIN logistics_vehicles v ON v.id=t.vehicle_id WHERE t.tenant_id=${tid(req)} ${vehicle_id ? sql`AND t.vehicle_id=${vehicle_id}` : sql``} ${from ? sql`AND t.transaction_at >= ${from}` : sql``} ${to ? sql`AND t.transaction_at <= ${to}` : sql``} ORDER BY t.transaction_at DESC`);
    const total = rows.rows.reduce((s: number, r: any) => s + Number(r.amount||0), 0);
    res.json({ transactions: rows.rows, total_spend: total });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/fastag/summary", requireAuth, async (req: any, res) => {
  try {
    await ensureFastagTables();
    const t = tid(req);
    const rows = await db.execute(sql`
      SELECT fa.id, fa.vehicle_number, fa.fastag_id, fa.bank, fa.wallet_balance, fa.low_balance_threshold,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month',tt.transaction_at)=DATE_TRUNC('month',NOW()) THEN tt.amount END),0) AS monthly_spend,
        (fa.wallet_balance < fa.low_balance_threshold) AS low_balance
      FROM logistics_fastag_accounts fa
      LEFT JOIN logistics_toll_transactions tt ON tt.fastag_id=fa.fastag_id AND tt.tenant_id=fa.tenant_id
      WHERE fa.tenant_id=${t} AND fa.is_active=true
      GROUP BY fa.id, fa.vehicle_number, fa.fastag_id, fa.bank, fa.wallet_balance, fa.low_balance_threshold
      ORDER BY fa.vehicle_number`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/fastag/accounts/:id/recharge", requireAuth, async (req: any, res) => {
  try {
    await ensureFastagTables();
    const { amount } = req.body;
    const t = tid(req);
    const acc = await db.execute(sql`SELECT * FROM logistics_fastag_accounts WHERE id=${req.params.id} AND tenant_id=${t}`);
    const a = acc.rows[0] as any;
    if (!a) return res.status(404).json({ error: 'Account not found' });
    const newBal = Number(a.wallet_balance) + Number(amount||0);
    await db.execute(sql`UPDATE logistics_fastag_accounts SET wallet_balance=${newBal} WHERE id=${req.params.id} AND tenant_id=${t}`);
    const amtPaise = Math.round(Number(amount) * 100);
    createJournalWithLines(new Date().toISOString().slice(0,10), `FASTag Recharge Vehicle ${a.vehicle_number}`, [{ accountCode: '1300', debit: amtPaise, credit: 0 }, { accountCode: '1002', debit: 0, credit: amtPaise }]).catch(e => console.error('GL fastag', e));
    res.json({ success: true, new_balance: newBal });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── PHASE 13: E-way Bill ──────────────────────────────────────────────────────

async function ensureEwayTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS logistics_eway_bills (
    id SERIAL PRIMARY KEY, tenant_id INT,
    ewb_no VARCHAR(20), invoice_id INT, invoice_no VARCHAR(50),
    supplier_gstin VARCHAR(15), recipient_gstin VARCHAR(15),
    supply_type VARCHAR(20) DEFAULT 'outward',
    sub_type VARCHAR(50) DEFAULT 'supply',
    doc_type VARCHAR(20) DEFAULT 'tax_invoice',
    doc_no VARCHAR(50), doc_date DATE,
    from_place VARCHAR(200), from_state VARCHAR(50), from_pincode VARCHAR(10),
    to_place VARCHAR(200), to_state VARCHAR(50), to_pincode VARCHAR(10),
    total_value NUMERIC(14,2), cgst NUMERIC(10,2), sgst NUMERIC(10,2), igst NUMERIC(10,2),
    transporter_id VARCHAR(15), transporter_name VARCHAR(200),
    vehicle_number VARCHAR(20), transport_mode VARCHAR(20) DEFAULT 'road',
    distance_km INT,
    valid_upto TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active',
    cancel_reason VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

router.get("/eway-bills", requireAuth, async (req: any, res) => {
  try {
    await ensureEwayTables();
    const { status, from, to } = req.query as any;
    const rows = await db.execute(sql`SELECT * FROM logistics_eway_bills WHERE tenant_id=${tid(req)} ${status ? sql`AND status=${status}` : sql``} ${from ? sql`AND created_at >= ${from}` : sql``} ${to ? sql`AND created_at <= ${to}` : sql``} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/eway-bills/generate", requireAuth, async (req: any, res) => {
  try {
    await ensureEwayTables();
    const { invoice_id, invoice_no, supplier_gstin, recipient_gstin, transporter_id, transporter_name, vehicle_number, from_place, from_state, from_pincode, to_place, to_state, to_pincode, distance_km, total_value, cgst, sgst, igst, doc_no, doc_date, transport_mode } = req.body;
    const dist = Number(distance_km || 0);
    const days = dist < 100 ? 1 : dist < 300 ? 3 : dist < 500 ? 5 : dist < 1000 ? 10 : 15;
    const valid_upto = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    let ewb_no: string;
    if (process.env.NIC_GSTN_USERNAME && process.env.NIC_GSTN_PASSWORD) {
      // NIC e-way bill API call would go here
      ewb_no = '2' + Date.now().toString().substring(3, 12) + '0';
    } else {
      ewb_no = '2' + Date.now().toString().substring(3, 12) + '0';
    }
    const row = await db.execute(sql`INSERT INTO logistics_eway_bills (tenant_id, ewb_no, invoice_id, invoice_no, supplier_gstin, recipient_gstin, transporter_id, transporter_name, vehicle_number, from_place, from_state, from_pincode, to_place, to_state, to_pincode, distance_km, total_value, cgst, sgst, igst, doc_no, doc_date, transport_mode, valid_upto, status) VALUES (${tid(req)}, ${ewb_no}, ${invoice_id||null}, ${invoice_no||null}, ${supplier_gstin||null}, ${recipient_gstin||null}, ${transporter_id||null}, ${transporter_name||null}, ${vehicle_number||null}, ${from_place||null}, ${from_state||null}, ${from_pincode||null}, ${to_place||null}, ${to_state||null}, ${to_pincode||null}, ${dist}, ${total_value||0}, ${cgst||0}, ${sgst||0}, ${igst||0}, ${doc_no||null}, ${doc_date||null}, ${transport_mode||'road'}, ${valid_upto.toISOString()}, 'active') RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/eway-bills/expiring", requireAuth, async (req: any, res) => {
  try {
    await ensureEwayTables();
    const rows = await db.execute(sql`SELECT * FROM logistics_eway_bills WHERE tenant_id=${tid(req)} AND status='active' AND valid_upto <= NOW() + INTERVAL '4 hours' AND valid_upto > NOW() ORDER BY valid_upto ASC`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/eway-bills/:id", requireAuth, async (req: any, res) => {
  try {
    await ensureEwayTables();
    const row = await db.execute(sql`SELECT * FROM logistics_eway_bills WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    if (!row.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/eway-bills/:id/print", requireAuth, async (req: any, res) => {
  try {
    await ensureEwayTables();
    const row = await db.execute(sql`SELECT * FROM logistics_eway_bills WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    if (!row.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ ewb: row.rows[0], print_format: 'eway_bill_v1' });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/eway-bills/:id/cancel", requireAuth, async (req: any, res) => {
  try {
    await ensureEwayTables();
    const { cancel_reason } = req.body;
    const row = await db.execute(sql`SELECT * FROM logistics_eway_bills WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    const ewb = row.rows[0] as any;
    if (!ewb) return res.status(404).json({ error: 'Not found' });
    if (new Date(ewb.created_at).getTime() < Date.now() - 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Cannot cancel EWB older than 24 hours' });
    }
    const updated = await db.execute(sql`UPDATE logistics_eway_bills SET status='cancelled', cancel_reason=${cancel_reason||null} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(updated.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/eway-bills/:id/extend", requireAuth, async (req: any, res) => {
  try {
    await ensureEwayTables();
    const { from_place, vehicle_number, extend_reason } = req.body;
    const row = await db.execute(sql`SELECT * FROM logistics_eway_bills WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    const ewb = row.rows[0] as any;
    if (!ewb) return res.status(404).json({ error: 'Not found' });
    const newValidity = new Date(new Date(ewb.valid_upto).getTime() + 24 * 60 * 60 * 1000);
    const updated = await db.execute(sql`UPDATE logistics_eway_bills SET valid_upto=${newValidity.toISOString()}, from_place=${from_place||ewb.from_place}, vehicle_number=${vehicle_number||ewb.vehicle_number} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(updated.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── GPS Tracking ─────────────────────────────────────────────────────────────

async function ensureGpsTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS logistics_gps_positions (
    id SERIAL PRIMARY KEY, tenant_id INT, vehicle_id INT,
    vehicle_number VARCHAR(20), driver_name VARCHAR(200),
    latitude NUMERIC(10,7), longitude NUMERIC(10,7),
    speed_kmh NUMERIC(6,1) DEFAULT 0, heading NUMERIC(5,1) DEFAULT 0,
    altitude NUMERIC(8,1), accuracy NUMERIC(6,1),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

router.get("/gps/vehicles", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    await ensureGpsTables();
    const rows = await db.execute(sql`
      SELECT v.*, gp.latitude, gp.longitude, gp.speed_kmh, gp.recorded_at as last_seen
      FROM logistics_vehicles v
      LEFT JOIN LATERAL (
        SELECT * FROM logistics_gps_positions WHERE vehicle_id=v.id ORDER BY recorded_at DESC LIMIT 1
      ) gp ON TRUE
      WHERE v.tenant_id=${t} AND v.status!='deleted'
      ORDER BY v.vehicle_no`);
    res.json((rows as any).rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/gps/update", async (req: any, res: any) => {
  try {
    await ensureGpsTables();
    const { vehicle_id, vehicle_number, latitude, longitude, speed_kmh, heading } = req.body;
    const tenantId = req.session?.tenantId ?? req.user?.tenantId ?? 1;
    await db.execute(sql`INSERT INTO logistics_gps_positions (tenant_id, vehicle_id, vehicle_number, latitude, longitude, speed_kmh, heading)
      VALUES (${tenantId}, ${vehicle_id||null}, ${vehicle_number||null}, ${latitude||0}, ${longitude||0}, ${speed_kmh||0}, ${heading||0})`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/gps/vehicles/:id/track", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    await ensureGpsTables();
    const rows = await db.execute(sql`
      SELECT latitude, longitude, speed_kmh, recorded_at FROM logistics_gps_positions
      WHERE vehicle_id=${parseInt(req.params.id)}
        AND recorded_at >= NOW() - INTERVAL '4 hours'
      ORDER BY recorded_at ASC`);
    res.json((rows as any).rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/gps/vehicles/:id/live", requireAuth, async (req: any, res: any) => {
  try {
    await ensureGpsTables();
    const row = await db.execute(sql`SELECT * FROM logistics_gps_positions WHERE vehicle_id=${parseInt(req.params.id)} ORDER BY recorded_at DESC LIMIT 1`);
    res.json((row as any).rows[0] || null);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/gps/simulate/:vehicleId", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    await ensureGpsTables();
    const vid = parseInt(req.params.vehicleId);
    const vehicle = await db.execute(sql`SELECT * FROM logistics_vehicles WHERE id=${vid} AND tenant_id=${t}`).catch(()=>({rows:[]}));
    const veh = (vehicle as any).rows[0] as any;
    // Mumbai to Pune: roughly 18.9°N 72.8°E to 18.5°N 73.8°E
    const startLat = 18.9219, startLng = 72.8347, endLat = 18.5204, endLng = 73.8567;
    const points = [];
    for (let i = 0; i < 10; i++) {
      const frac = i / 9;
      const lat = startLat + (endLat - startLat) * frac + (Math.random()-0.5)*0.01;
      const lng = startLng + (endLng - startLng) * frac + (Math.random()-0.5)*0.01;
      const speed = 40 + Math.random()*40;
      const ts = new Date(Date.now() - (9-i)*600000);
      await db.execute(sql`INSERT INTO logistics_gps_positions (tenant_id, vehicle_id, vehicle_number, driver_name, latitude, longitude, speed_kmh, recorded_at)
        VALUES (${t}, ${vid}, ${veh?.vehicle_no||null}, ${veh?.driver_name||null}, ${lat.toFixed(7)}, ${lng.toFixed(7)}, ${speed.toFixed(1)}, ${ts.toISOString()})`);
      points.push({ lat: lat.toFixed(7), lng: lng.toFixed(7), speed_kmh: speed.toFixed(1) });
    }
    res.json({ success: true, points, vehicle_id: vid });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── LR PDF ───────────────────────────────────────────────────────────────────

router.get("/trips/:id/lr-pdf", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const trip = await db.execute(sql`SELECT * FROM logistics_trips WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`).catch(()=>({rows:[]}));
    if (!(trip as any).rows.length) return res.status(404).json({ message: 'Trip not found' });
    const tr = (trip as any).rows[0] as any;
    const doc = new PDFDocument({size:'A4',margin:40});
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const lrNo = tr.lr_number||`LR-${t}-${req.params.id}`;
    doc.fontSize(14).font('Helvetica-Bold').text('LORRY RECEIPT (CONSIGNMENT NOTE)',{align:'center'});
    doc.fontSize(9).font('Helvetica').text('(Non-Negotiable)',{align:'center'}).moveDown(0.3);
    doc.moveTo(40,doc.y).lineTo(555,doc.y).stroke().moveDown(0.3);
    const col1x=40, col2x=300;
    let y=doc.y;
    const kv=(k:string,v:string,x:number,yy:number)=>{
      doc.fontSize(9).font('Helvetica-Bold').text(k,x,yy,{lineBreak:false}).font('Helvetica').text(': '+v,x+80,yy,{width:160,lineBreak:false});
    };
    kv('LR No',lrNo,col1x,y);
    kv('Date',new Date(tr.start_date||Date.now()).toLocaleDateString('en-IN'),col2x,y); y+=16;
    kv('From',tr.origin||'—',col1x,y);
    kv('Vehicle No',tr.vehicle_number||'—',col2x,y); y+=16;
    kv('To',tr.destination||'—',col1x,y);
    kv('Driver',tr.driver_name||'—',col2x,y); y+=16;
    kv('Consignor',tr.consignor_name||'—',col1x,y); y+=16;
    kv('Consignee',tr.consignee_name||'—',col1x,y); y+=16;
    doc.moveDown(4);
    doc.moveTo(40,doc.y).lineTo(555,doc.y).stroke().moveDown(0.3);
    doc.fontSize(9).font('Helvetica-Bold');
    (['Description','Pkgs','Weight(kg)','Value(₹)','Freight(₹)'] as string[]).forEach((h,i)=>{
      doc.text(h,40+[0,180,230,310,400][i],doc.y,{width:[180,45,75,85,100][i],lineBreak:false});
    });
    doc.moveDown(1.2);
    doc.fontSize(9).font('Helvetica');
    const items: any[] = tr.items||[{description:tr.goods_description||'General Goods',packages:1,weight:tr.weight||0,value:tr.declared_value||0,freight:tr.freight_amount||0}];
    items.forEach((item: any)=>{
      doc.text(item.description||'',40,doc.y,{width:178,lineBreak:false})
         .text(String(item.packages||1),220,doc.y,{width:43,lineBreak:false})
         .text(String(item.weight||0),263,doc.y,{width:73,lineBreak:false})
         .text(String(item.value||0),336,doc.y,{width:83,lineBreak:false})
         .text('₹'+String(item.freight||0),419,doc.y,{width:98,lineBreak:false});
      doc.moveDown(1.2);
    });
    doc.moveTo(40,doc.y).lineTo(555,doc.y).stroke().moveDown(0.5);
    doc.fontSize(9).text(`Total Freight: ₹${tr.freight_amount||0}  |  Payment: ${tr.payment_mode||'To Pay'}`,{align:'right'});
    doc.moveDown(1);
    doc.text('Consignor Signature: _____________  Transporter Signature: _____________  Consignee Signature: _____________');
    doc.end();
    doc.on('end',()=>{
      res.setHeader('Content-Type','application/pdf');
      res.setHeader('Content-Disposition',`attachment; filename="LR-${lrNo}.pdf"`);
      res.send(Buffer.concat(chunks));
    });
  } catch (e: any) { if (!res.headersSent) res.status(500).json({ message: e.message }); }
});

// ── Route Optimization ───────────────────────────────────────────────────────

router.post("/route/optimize", requireAuth, async (req: any, res: any) => {
  const { waypoints } = req.body;
  if (!Array.isArray(waypoints) || waypoints.length < 2) return res.status(400).json({ message: 'At least 2 waypoints required' });
  try {
    if (process.env.OSRM_BASE_URL) {
      const coords = waypoints.map((w: any)=>`${w.lng},${w.lat}`).join(';');
      const resp = await fetch(`${process.env.OSRM_BASE_URL}/route/v1/driving/${coords}?overview=full&steps=true`);
      const data = await resp.json() as any;
      return res.json({
        distance_km: (data.routes[0].distance/1000).toFixed(1),
        duration_hours: (data.routes[0].duration/3600).toFixed(1),
        waypoints: data.waypoints,
        geometry: data.routes[0].geometry,
        steps: data.routes[0].legs[0].steps.map((s: any)=>({instruction:s.maneuver.type,distance:s.distance,duration:s.duration}))
      });
    }
    function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
      const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
      const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
      return R*2*Math.asin(Math.sqrt(a));
    }
    let totalDist = 0;
    for (let i = 0; i < waypoints.length-1; i++) totalDist += haversine(waypoints[i].lat, waypoints[i].lng, waypoints[i+1].lat, waypoints[i+1].lng);
    const roadFactor = 1.3;
    const distKm = totalDist * roadFactor;
    const avgSpeed = 50;
    res.json({
      distance_km: distKm.toFixed(1),
      duration_hours: (distKm/avgSpeed).toFixed(1),
      estimated_fuel_litres: (distKm/12).toFixed(1),
      estimated_toll: Math.round(distKm*2.5),
      waypoints: waypoints.map((w: any, i: number)=>({...w, sequence:i+1})),
      note: 'simulated'
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
