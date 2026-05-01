import { Router } from "express";

import { sql } from "drizzle-orm";
import { db } from "./db";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── Vehicles ─────────────────────────────────────────────────────────────────
router.get("/vehicles", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM logistics_vehicles WHERE tenant_id=${tid(req)} AND status!='deleted' ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/vehicles", requireAuth, async (req: any, res) => {
  try {
    const { vehicle_no, vehicle_type, make_model, capacity_tons, owner_name, driver_name, driver_phone, rc_expiry, insurance_expiry, fitness_expiry } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO logistics_vehicles (tenant_id, vehicle_no, vehicle_type, make_model, capacity_tons, owner_name, driver_name, driver_phone, rc_expiry, insurance_expiry, fitness_expiry)
      VALUES (${tid(req)}, ${vehicle_no}, ${vehicle_type || null}, ${make_model || null},
              ${capacity_tons || null}, ${owner_name || null}, ${driver_name || null},
              ${driver_phone || null}, ${rc_expiry || null}, ${insurance_expiry || null}, ${fitness_expiry || null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/vehicles/:id", requireAuth, async (req: any, res) => {
  try {
    const { vehicle_no, vehicle_type, make_model, capacity_tons, owner_name, driver_name, driver_phone, rc_expiry, insurance_expiry, fitness_expiry, status } = req.body;
    const rows = await db.execute(sql`
      UPDATE logistics_vehicles SET vehicle_no=${vehicle_no}, vehicle_type=${vehicle_type || null},
        make_model=${make_model || null}, capacity_tons=${capacity_tons || null},
        owner_name=${owner_name || null}, driver_name=${driver_name || null},
        driver_phone=${driver_phone || null}, rc_expiry=${rc_expiry || null},
        insurance_expiry=${insurance_expiry || null}, fitness_expiry=${fitness_expiry || null},
        status=${status || 'active'}
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

// ── Trips ─────────────────────────────────────────────────────────────────────
router.get("/trips", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT t.*, v.vehicle_no, v.vehicle_type
      FROM trips t LEFT JOIN logistics_vehicles v ON v.id=t.vehicle_id
      WHERE t.tenant_id=${tid(req)} ORDER BY t.trip_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/trips", requireAuth, async (req: any, res) => {
  try {
    const { vehicle_id, driver_name, from_location, to_location, trip_date, return_date, goods_description, weight_tons, freight_amount, advance_paid, expenses, notes } = req.body;
    const no = "TRP-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO trips (tenant_id, trip_no, vehicle_id, driver_name, from_location, to_location, trip_date, return_date, goods_description, weight_tons, freight_amount, advance_paid, expenses, notes)
      VALUES (${tid(req)}, ${no}, ${vehicle_id || null}, ${driver_name || null},
              ${from_location}, ${to_location}, ${trip_date}, ${return_date || null},
              ${goods_description || null}, ${weight_tons || null},
              ${freight_amount || 0}, ${advance_paid || 0}, ${expenses || 0}, ${notes || null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/trips/:id", requireAuth, async (req: any, res) => {
  try {
    const { vehicle_id, driver_name, from_location, to_location, trip_date, return_date, goods_description, weight_tons, freight_amount, advance_paid, expenses, status, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE trips SET vehicle_id=${vehicle_id || null}, driver_name=${driver_name || null},
        from_location=${from_location}, to_location=${to_location}, trip_date=${trip_date},
        return_date=${return_date || null}, goods_description=${goods_description || null},
        weight_tons=${weight_tons || null}, freight_amount=${freight_amount || 0},
        advance_paid=${advance_paid || 0}, expenses=${expenses || 0},
        status=${status || 'planned'}, notes=${notes || null}
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
      SELECT cn.*, t.trip_no, t.from_location, t.to_location
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
      VALUES (${tid(req)}, ${lr}, ${trip_id || null}, ${consignor_name}, ${consignor_phone || null},
              ${consignee_name}, ${consignee_phone || null}, ${goods_description || null},
              ${packages || 1}, ${weight_kg || null}, ${freight_charges || 0}, ${loading_charges || 0}, ${delivery_date || null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/consignment-notes/:id", requireAuth, async (req: any, res) => {
  try {
    const { consignor_name, consignor_phone, consignee_name, consignee_phone, goods_description, packages, weight_kg, freight_charges, loading_charges, delivery_date, status } = req.body;
    const rows = await db.execute(sql`
      UPDATE consignment_notes SET consignor_name=${consignor_name}, consignor_phone=${consignor_phone || null},
        consignee_name=${consignee_name}, consignee_phone=${consignee_phone || null},
        goods_description=${goods_description || null}, packages=${packages || 1},
        weight_kg=${weight_kg || null}, freight_charges=${freight_charges || 0},
        loading_charges=${loading_charges || 0}, delivery_date=${delivery_date || null},
        status=${status || 'in_transit'}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Stats
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const [vehicles, trips, freight] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM logistics_vehicles WHERE tenant_id=${tid(req)} AND status='active'`),
      db.execute(sql`SELECT COUNT(*) as count FROM trips WHERE tenant_id=${tid(req)} AND status IN ('planned','in_progress')`),
      db.execute(sql`SELECT COALESCE(SUM(freight_amount),0) as total FROM trips WHERE tenant_id=${tid(req)} AND EXTRACT(MONTH FROM trip_date)=EXTRACT(MONTH FROM CURRENT_DATE)`),
    ]);
    res.json({
      activeVehicles: Number(vehicles.rows[0]?.count || 0),
      activeTrips: Number(trips.rows[0]?.count || 0),
      monthlyFreight: Number(freight.rows[0]?.total || 0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
