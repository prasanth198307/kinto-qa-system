import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

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

export default router;
