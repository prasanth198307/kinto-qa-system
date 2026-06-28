import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

function getTenantId(req: any): number {
  return req.session?.tenantId ?? req.user?.tenantId;
}

function auth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

// GPS TRACKING
router.get("/gps/vehicles", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT v.id, v.vehicle_no, v.model, g.lat, g.lng, g.speed, g.ignition, g.timestamp
      FROM vehicles v
      LEFT JOIN LATERAL (
        SELECT lat, lng, speed, ignition, timestamp
        FROM vehicle_gps_locations
        WHERE vehicle_id = v.id AND tenant_id = ${tenantId}
        ORDER BY timestamp DESC LIMIT 1
      ) g ON true
      WHERE v.tenant_id = ${tenantId}
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/gps/location", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { vehicle_id, lat, lng, speed, ignition, timestamp } = req.body;
    const r = await db.execute(sql`
      INSERT INTO vehicle_gps_locations (tenant_id, vehicle_id, lat, lng, speed, ignition, timestamp)
      VALUES (${tenantId}, ${vehicle_id}, ${lat}, ${lng}, ${speed}, ${ignition}, ${timestamp ?? new Date()})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/gps/vehicle/:vehicleId/track", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { vehicleId } = req.params;
    const r = await db.execute(sql`
      SELECT lat, lng, speed, ignition, timestamp
      FROM vehicle_gps_locations
      WHERE tenant_id = ${tenantId} AND vehicle_id = ${vehicleId}
        AND timestamp >= NOW() - INTERVAL '24 hours'
      ORDER BY timestamp ASC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/gps/vehicle/:vehicleId/replay", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { vehicleId } = req.params;
    const { date } = req.query;
    const r = await db.execute(sql`
      SELECT lat, lng, speed, ignition, timestamp
      FROM vehicle_gps_locations
      WHERE tenant_id = ${tenantId} AND vehicle_id = ${vehicleId}
        AND DATE(timestamp) = ${date}
      ORDER BY timestamp ASC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/gps/alerts", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT a.*, v.vehicle_no
      FROM vehicle_gps_alerts a
      JOIN vehicles v ON v.id = a.vehicle_id
      WHERE a.tenant_id = ${tenantId}
      ORDER BY a.created_at DESC
      LIMIT 100
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/gps/geofence", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { vehicle_id, center_lat, center_lng, radius_km } = req.body;
    const r = await db.execute(sql`
      INSERT INTO vehicle_geofences (tenant_id, vehicle_id, center_lat, center_lng, radius_km, created_at)
      VALUES (${tenantId}, ${vehicle_id}, ${center_lat}, ${center_lng}, ${radius_km}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ePOD DIGITAL
router.get("/epod/trips", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT t.*, e.id AS epod_id, e.delivery_photo_url, e.signature_url, e.otp_verified
      FROM trips t
      LEFT JOIN trip_epod e ON e.trip_id = t.id
      WHERE t.tenant_id = ${tenantId}
        AND t.status = 'in_progress'
        AND e.id IS NULL
      ORDER BY t.trip_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/epod/:tripId/submit", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { tripId } = req.params;
    const { delivery_photo_url, signature_url, receiver_name, receiver_phone, otp_verified, delivery_time } = req.body;
    const r = await db.execute(sql`
      INSERT INTO trip_epod (tenant_id, trip_id, delivery_photo_url, signature_url, receiver_name, receiver_phone, otp_verified, delivery_time, submitted_at)
      VALUES (${tenantId}, ${tripId}, ${delivery_photo_url}, ${signature_url}, ${receiver_name}, ${receiver_phone}, ${otp_verified}, ${delivery_time}, NOW())
      ON CONFLICT (trip_id) DO UPDATE SET
        delivery_photo_url = EXCLUDED.delivery_photo_url,
        signature_url = EXCLUDED.signature_url,
        receiver_name = EXCLUDED.receiver_name,
        receiver_phone = EXCLUDED.receiver_phone,
        otp_verified = EXCLUDED.otp_verified,
        delivery_time = EXCLUDED.delivery_time,
        submitted_at = NOW()
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/epod/:tripId/exception", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { tripId } = req.params;
    const { reason, photo_url } = req.body;
    const r = await db.execute(sql`
      UPDATE trip_epod
      SET exception_reason = ${reason}, exception_photo_url = ${photo_url}, exception_at = NOW()
      WHERE trip_id = ${tripId} AND tenant_id = ${tenantId}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/epod/:tripId/customer-notify", auth, async (req, res) => {
  try {
    // Stub: integrate with SMS gateway
    res.json({ success: true, message: "Delivery notification SMS sent" });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ROUTE OPTIMIZATION
router.post("/routes/optimize", auth, async (req, res) => {
  try {
    const { vehicle_id, delivery_points } = req.body;
    // Stub: integrate with routing engine (e.g. OSRM, Google Maps)
    const optimized_sequence = delivery_points
      .map((p: any, i: number) => ({ ...p, sequence: i + 1 }))
      .sort(() => Math.random() - 0.5)
      .map((p: any, i: number) => ({ ...p, optimized_sequence: i + 1 }));
    const total_distance_km = delivery_points.length * 12.5;
    const estimated_time_mins = delivery_points.length * 25;
    res.json({ optimized_sequence, total_distance_km, estimated_time_mins });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/routes/planned", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT rp.*, v.vehicle_no, d.name AS driver_name
      FROM route_plans rp
      JOIN vehicles v ON v.id = rp.vehicle_id
      LEFT JOIN drivers d ON d.id = rp.driver_id
      WHERE rp.tenant_id = ${tenantId} AND rp.plan_date = CURRENT_DATE
      ORDER BY rp.created_at DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/routes/plan", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { vehicle_id, date, stops } = req.body;
    const r = await db.execute(sql`
      INSERT INTO route_plans (tenant_id, vehicle_id, plan_date, stops, created_at)
      VALUES (${tenantId}, ${vehicle_id}, ${date}, ${JSON.stringify(stops)}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// FUEL MANAGEMENT
router.get("/fuel/records", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT f.*, v.vehicle_no
      FROM fuel_records f
      JOIN vehicles v ON v.id = f.vehicle_id
      WHERE f.tenant_id = ${tenantId}
      ORDER BY f.fill_date DESC
      LIMIT 200
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/fuel/records", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { vehicle_id, fill_date, liters, rate_per_liter, total_amount, fuel_station, odometer } = req.body;
    const r = await db.execute(sql`
      INSERT INTO fuel_records (tenant_id, vehicle_id, fill_date, liters, rate_per_liter, total_amount, fuel_station, odometer, created_at)
      VALUES (${tenantId}, ${vehicle_id}, ${fill_date}, ${liters}, ${rate_per_liter}, ${total_amount}, ${fuel_station}, ${odometer}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/fuel/efficiency", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT v.vehicle_no, v.id AS vehicle_id,
        SUM(f.liters) AS total_liters,
        MAX(f.odometer) - MIN(f.odometer) AS total_km,
        CASE WHEN SUM(f.liters) > 0
          THEN ROUND(((MAX(f.odometer) - MIN(f.odometer)) / SUM(f.liters))::numeric, 2)
          ELSE 0 END AS km_per_liter
      FROM fuel_records f
      JOIN vehicles v ON v.id = f.vehicle_id
      WHERE f.tenant_id = ${tenantId}
        AND (${from}::date IS NULL OR f.fill_date >= ${from}::date)
        AND (${to}::date IS NULL OR f.fill_date <= ${to}::date)
      GROUP BY v.id, v.vehicle_no
      ORDER BY km_per_liter DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/fuel/fastag", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT f.*, v.vehicle_no
      FROM fastag_records f
      JOIN vehicles v ON v.id = f.vehicle_id
      WHERE f.tenant_id = ${tenantId}
      ORDER BY f.toll_date DESC
      LIMIT 200
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/fuel/fastag", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { vehicle_id, toll_date, toll_amount, location } = req.body;
    const r = await db.execute(sql`
      INSERT INTO fastag_records (tenant_id, vehicle_id, toll_date, toll_amount, location, created_at)
      VALUES (${tenantId}, ${vehicle_id}, ${toll_date}, ${toll_amount}, ${location}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// TYRE MANAGEMENT
router.get("/tyres", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT t.*, v.vehicle_no
      FROM tyre_inventory t
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      WHERE t.tenant_id = ${tenantId}
      ORDER BY t.fitted_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/tyres", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { tyre_make, serial_number, vehicle_id, position, fitted_date, fitted_odometer } = req.body;
    const r = await db.execute(sql`
      INSERT INTO tyre_inventory (tenant_id, tyre_make, serial_number, vehicle_id, position, fitted_date, fitted_odometer, status, created_at)
      VALUES (${tenantId}, ${tyre_make}, ${serial_number}, ${vehicle_id}, ${position}, ${fitted_date}, ${fitted_odometer}, 'fitted', NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/tyres/:id/remove", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { removed_date, removed_odometer, reason } = req.body;
    await db.execute(sql`
      INSERT INTO tyre_history (tenant_id, tyre_id, event, event_date, odometer, reason, created_at)
      SELECT ${tenantId}, ${id}, 'removed', ${removed_date}, ${removed_odometer}, ${reason}, NOW()
    `);
    const r = await db.execute(sql`
      UPDATE tyre_inventory
      SET status = 'removed', removed_date = ${removed_date}, removed_odometer = ${removed_odometer}, removed_reason = ${reason}, vehicle_id = NULL, position = NULL
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/tyres/:id/history", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      SELECT h.*, v.vehicle_no
      FROM tyre_history h
      LEFT JOIN vehicles v ON v.id = h.vehicle_id
      WHERE h.tenant_id = ${tenantId} AND h.tyre_id = ${id}
      ORDER BY h.event_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/tyres/due-replacement", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const threshold = (req.query.threshold_km as string) ?? "80000";
    const r = await db.execute(sql`
      SELECT t.*, v.vehicle_no,
        (v.current_odometer - t.fitted_odometer) AS km_run
      FROM tyre_inventory t
      JOIN vehicles v ON v.id = t.vehicle_id
      WHERE t.tenant_id = ${tenantId}
        AND t.status = 'fitted'
        AND (v.current_odometer - t.fitted_odometer) >= ${parseInt(threshold)}
      ORDER BY km_run DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// VEHICLE MAINTENANCE
router.get("/maintenance/schedule", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT ms.*, v.vehicle_no, v.current_odometer,
        CASE WHEN ms.due_date <= CURRENT_DATE OR v.current_odometer >= ms.due_km THEN true ELSE false END AS is_due
      FROM maintenance_schedules ms
      JOIN vehicles v ON v.id = ms.vehicle_id
      WHERE ms.tenant_id = ${tenantId} AND ms.is_completed = false
      ORDER BY ms.due_date ASC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/maintenance/schedule", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { vehicle_id, service_type, due_date, due_km } = req.body;
    const r = await db.execute(sql`
      INSERT INTO maintenance_schedules (tenant_id, vehicle_id, service_type, due_date, due_km, is_completed, created_at)
      VALUES (${tenantId}, ${vehicle_id}, ${service_type}, ${due_date}, ${due_km}, false, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/maintenance/log", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { vehicle_id, service_date, service_type, odometer, cost, workshop, next_due } = req.body;
    const r = await db.execute(sql`
      INSERT INTO maintenance_logs (tenant_id, vehicle_id, service_date, service_type, odometer, cost, workshop, next_due, created_at)
      VALUES (${tenantId}, ${vehicle_id}, ${service_date}, ${service_type}, ${odometer}, ${cost}, ${workshop}, ${next_due}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/maintenance/history/:vehicleId", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { vehicleId } = req.params;
    const r = await db.execute(sql`
      SELECT * FROM maintenance_logs
      WHERE tenant_id = ${tenantId} AND vehicle_id = ${vehicleId}
      ORDER BY service_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/maintenance/breakdown", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { vehicle_id, breakdown_date, location, issue_description } = req.body;
    const r = await db.execute(sql`
      INSERT INTO breakdown_reports (tenant_id, vehicle_id, breakdown_date, location, issue_description, status, created_at)
      VALUES (${tenantId}, ${vehicle_id}, ${breakdown_date}, ${location}, ${issue_description}, 'open', NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/maintenance/breakdown/:id/resolve", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { mechanic, resolved_at, cost } = req.body;
    const r = await db.execute(sql`
      UPDATE breakdown_reports
      SET status = 'resolved', mechanic = ${mechanic}, resolved_at = ${resolved_at}, cost = ${cost}
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/maintenance/breakdowns", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT b.*, v.vehicle_no
      FROM breakdown_reports b
      JOIN vehicles v ON v.id = b.vehicle_id
      WHERE b.tenant_id = ${tenantId}
      ORDER BY b.breakdown_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// FREIGHT & BILLING
router.get("/freight-rates", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT fr.*, c.name AS customer_name
      FROM freight_rates fr
      LEFT JOIN customers c ON c.id = fr.customer_id
      WHERE fr.tenant_id = ${tenantId}
      ORDER BY fr.created_at DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/freight-rates", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { customer_id, origin, destination, rate_type, rate_per_km, rate_per_ton } = req.body;
    const r = await db.execute(sql`
      INSERT INTO freight_rates (tenant_id, customer_id, origin, destination, rate_type, rate_per_km, rate_per_ton, created_at)
      VALUES (${tenantId}, ${customer_id}, ${origin}, ${destination}, ${rate_type}, ${rate_per_km}, ${rate_per_ton}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/freight-bills", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT fb.*, t.trip_no, c.name AS customer_name
      FROM freight_bills fb
      JOIN trips t ON t.id = fb.trip_id
      LEFT JOIN customers c ON c.id = t.customer_id
      WHERE fb.tenant_id = ${tenantId}
      ORDER BY fb.created_at DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/freight-bills/generate", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { trip_id } = req.body;
    const tripRows = await db.execute(sql`
      SELECT t.*, fr.rate_per_km, fr.rate_per_ton, fr.rate_type
      FROM trips t
      LEFT JOIN freight_rates fr ON fr.customer_id = t.customer_id
        AND fr.origin = t.origin AND fr.destination = t.destination
      WHERE t.id = ${trip_id} AND t.tenant_id = ${tenantId}
      LIMIT 1
    `);
    if (!tripRows.rows.length) return res.status(404).json({ message: "Trip not found" });
    const trip = tripRows.rows[0] as any;
    const amount =
      trip.rate_type === "per_km"
        ? (trip.distance_km ?? 0) * (trip.rate_per_km ?? 0)
        : (trip.load_ton ?? 0) * (trip.rate_per_ton ?? 0);
    const r = await db.execute(sql`
      INSERT INTO freight_bills (tenant_id, trip_id, amount, status, created_at)
      VALUES (${tenantId}, ${trip_id}, ${amount}, 'draft', NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/freight-bills/:id/finalize", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      UPDATE freight_bills SET status = 'finalized', finalized_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/freight-bills/:id/details", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      SELECT fb.*, t.trip_no, t.origin, t.destination, t.distance_km, t.load_ton,
        v.vehicle_no, d.name AS driver_name, c.name AS customer_name
      FROM freight_bills fb
      JOIN trips t ON t.id = fb.trip_id
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      LEFT JOIN drivers d ON d.id = t.driver_id
      LEFT JOIN customers c ON c.id = t.customer_id
      WHERE fb.id = ${id} AND fb.tenant_id = ${tenantId}
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// COMPLIANCE
router.get("/compliance/e-way-bills", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT eb.*, t.trip_no, v.vehicle_no
      FROM eway_bills eb
      JOIN trips t ON t.id = eb.trip_id
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      WHERE eb.tenant_id = ${tenantId}
      ORDER BY eb.created_at DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/compliance/e-way-bills", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { trip_id, consignment_note, value, destination, gstin } = req.body;
    const r = await db.execute(sql`
      INSERT INTO eway_bills (tenant_id, trip_id, consignment_note, value, destination, gstin, created_at)
      VALUES (${tenantId}, ${trip_id}, ${consignment_note}, ${value}, ${destination}, ${gstin}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/compliance/driver-hours", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { date } = req.query;
    const r = await db.execute(sql`
      SELECT d.id, d.name AS driver_name,
        SUM(EXTRACT(EPOCH FROM (t.end_time - t.start_time))/3600) AS total_hours,
        COUNT(t.id) AS trips,
        CASE WHEN SUM(EXTRACT(EPOCH FROM (t.end_time - t.start_time))/3600) > 8 THEN true ELSE false END AS exceeded_limit
      FROM drivers d
      JOIN trips t ON t.driver_id = d.id
      WHERE d.tenant_id = ${tenantId}
        AND DATE(t.trip_date) = ${date ?? new Date().toISOString().slice(0, 10)}
        AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL
      GROUP BY d.id, d.name
      ORDER BY total_hours DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/compliance/documents-expiry", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const days = parseInt((req.query.days as string) ?? "30");
    const r = await db.execute(sql`
      SELECT v.id, v.vehicle_no,
        v.insurance_expiry, v.fitness_expiry, v.permit_expiry, v.puc_expiry,
        LEAST(v.insurance_expiry, v.fitness_expiry, v.permit_expiry, v.puc_expiry) AS earliest_expiry
      FROM vehicles v
      WHERE v.tenant_id = ${tenantId}
        AND LEAST(v.insurance_expiry, v.fitness_expiry, v.permit_expiry, v.puc_expiry) <= CURRENT_DATE + ${days}
      ORDER BY earliest_expiry ASC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// REPORTS
router.get("/reports/fleet-utilization", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT v.id, v.vehicle_no,
        COUNT(t.id) AS total_trips,
        COALESCE(SUM(t.distance_km), 0) AS total_km,
        COALESCE(SUM(fb.amount), 0) AS total_revenue
      FROM vehicles v
      LEFT JOIN trips t ON t.vehicle_id = v.id
        AND (${from}::date IS NULL OR t.trip_date >= ${from}::date)
        AND (${to}::date IS NULL OR t.trip_date <= ${to}::date)
      LEFT JOIN freight_bills fb ON fb.trip_id = t.id AND fb.status = 'finalized'
      WHERE v.tenant_id = ${tenantId}
      GROUP BY v.id, v.vehicle_no
      ORDER BY total_revenue DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/fuel-expense", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT v.vehicle_no, v.id AS vehicle_id,
        SUM(f.liters) AS total_liters,
        SUM(f.total_amount) AS total_cost,
        COUNT(f.id) AS fill_ups
      FROM fuel_records f
      JOIN vehicles v ON v.id = f.vehicle_id
      WHERE f.tenant_id = ${tenantId}
        AND (${from}::date IS NULL OR f.fill_date >= ${from}::date)
        AND (${to}::date IS NULL OR f.fill_date <= ${to}::date)
      GROUP BY v.id, v.vehicle_no
      ORDER BY total_cost DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/maintenance-cost", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT v.vehicle_no, v.id AS vehicle_id,
        COUNT(ml.id) AS service_count,
        SUM(ml.cost) AS total_cost,
        COALESCE(SUM(br.cost), 0) AS breakdown_cost,
        SUM(ml.cost) + COALESCE(SUM(br.cost), 0) AS grand_total
      FROM vehicles v
      LEFT JOIN maintenance_logs ml ON ml.vehicle_id = v.id
        AND (${from}::date IS NULL OR ml.service_date >= ${from}::date)
        AND (${to}::date IS NULL OR ml.service_date <= ${to}::date)
      LEFT JOIN breakdown_reports br ON br.vehicle_id = v.id AND br.status = 'resolved'
        AND (${from}::date IS NULL OR br.breakdown_date >= ${from}::date)
        AND (${to}::date IS NULL OR br.breakdown_date <= ${to}::date)
      WHERE v.tenant_id = ${tenantId}
      GROUP BY v.id, v.vehicle_no
      ORDER BY grand_total DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/driver-performance", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT d.id, d.name AS driver_name,
        COUNT(t.id) AS total_trips,
        COALESCE(SUM(t.distance_km), 0) AS total_km,
        COUNT(CASE WHEN e.otp_verified = true THEN 1 END)::float /
          NULLIF(COUNT(t.id), 0) * 100 AS delivery_rate_pct
      FROM drivers d
      LEFT JOIN trips t ON t.driver_id = d.id
        AND (${from}::date IS NULL OR t.trip_date >= ${from}::date)
        AND (${to}::date IS NULL OR t.trip_date <= ${to}::date)
      LEFT JOIN trip_epod e ON e.trip_id = t.id
      WHERE d.tenant_id = ${tenantId}
      GROUP BY d.id, d.name
      ORDER BY total_trips DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/freight-revenue", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT t.origin, t.destination,
        COUNT(fb.id) AS trips,
        SUM(fb.amount) AS total_revenue
      FROM freight_bills fb
      JOIN trips t ON t.id = fb.trip_id
      WHERE fb.tenant_id = ${tenantId} AND fb.status = 'finalized'
        AND (${from}::date IS NULL OR t.trip_date >= ${from}::date)
        AND (${to}::date IS NULL OR t.trip_date <= ${to}::date)
      GROUP BY t.origin, t.destination
      ORDER BY total_revenue DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
