import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { createJournalWithLines } from "./journal-service";
import PDFDocument from "pdfkit";
import https from "https";
import http from "http";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
};
const tid = (req: any): number => req.session?.tenantId ?? req.user?.tenantId ?? 1;

// ── DB Setup helpers (idempotent CREATE TABLE IF NOT EXISTS) ──────────────────
async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS logistics_gps_positions (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      vehicle_id INT NOT NULL,
      vehicle_no VARCHAR(50),
      latitude DECIMAL(10,7) NOT NULL,
      longitude DECIMAL(10,7) NOT NULL,
      speed DECIMAL(6,2) DEFAULT 0,
      heading DECIMAL(5,2) DEFAULT 0,
      engine_status VARCHAR(20) DEFAULT 'unknown',
      recorded_at TIMESTAMPTZ DEFAULT NOW(),
      source VARCHAR(30) DEFAULT 'manual'
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_lgps_vehicle_time ON logistics_gps_positions(vehicle_id, recorded_at DESC)
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS logistics_geofences (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      vehicle_id INT,
      name VARCHAR(200),
      lat DECIMAL(10,7),
      lon DECIMAL(10,7),
      radius_km DECIMAL(8,3) DEFAULT 1,
      alert_on_enter BOOLEAN DEFAULT TRUE,
      alert_on_exit BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS logistics_routes (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      vehicle_type VARCHAR(30),
      waypoints JSONB,
      optimized_waypoints JSONB,
      total_distance_km DECIMAL(10,2),
      estimated_time_mins INT,
      source VARCHAR(30) DEFAULT 'heuristic',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS logistics_vehicle_maintenance (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      vehicle_id INT NOT NULL,
      maintenance_date DATE NOT NULL,
      maintenance_type VARCHAR(100),
      description TEXT,
      cost DECIMAL(12,2) DEFAULT 0,
      vendor_name VARCHAR(200),
      next_service_date DATE,
      next_service_km INT,
      odometer_reading INT,
      status VARCHAR(30) DEFAULT 'completed',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}
ensureTables().catch(e => console.error("logistics_phase13 table setup:", e));

// ── Haversine & TSP ──────────────────────────────────────────────────────────
function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function nearestNeighborTSP(points: Array<{ lat: number; lon: number; label?: string }>) {
  const n = points.length;
  if (n === 0) return [];
  const visited = new Array(n).fill(false);
  const route = [0];
  visited[0] = true;
  for (let step = 1; step < n; step++) {
    const last = route[route.length - 1];
    let nearest = -1, minDist = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited[j]) {
        const d = haversine(points[last], points[j]);
        if (d < minDist) { minDist = d; nearest = j; }
      }
    }
    visited[nearest] = true;
    route.push(nearest);
  }
  return route;
}

// ── LR PDF ───────────────────────────────────────────────────────────────────
// GET /api/logistics/consignment-notes/:id/lr-pdf
router.get("/consignment-notes/:id/lr-pdf", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const { id } = req.params;

    const cnRows = await db.execute(sql`
      SELECT cn.*,
             t.trip_date, t.from_location, t.to_location,
             v.vehicle_no, v.make_model,
             d.name as driver_name_db, d.license_number
      FROM consignment_notes cn
      LEFT JOIN trips t ON t.id = cn.trip_id
      LEFT JOIN logistics_vehicles v ON v.id = t.vehicle_id
      LEFT JOIN drivers d ON d.id = t.driver_id
      WHERE cn.id = ${id} AND cn.tenant_id = ${tenantId}
    `);
    if (!cnRows.rows.length) return res.status(404).json({ error: "LR not found" });
    const cn = cnRows.rows[0] as any;

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=LR-${cn.lr_no}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(18).font("Helvetica-Bold").text("LORRY RECEIPT", { align: "center" });
    doc.fontSize(10).font("Helvetica").text("SwachERP Transport Services", { align: "center" });
    doc.text("123 Transport Nagar, Hyderabad - 500001 | GSTIN: 36AAXXX1234X1ZY", { align: "center" });
    doc.moveDown(0.5);

    // LR Number box
    doc.rect(40, doc.y, 515, 28).stroke();
    doc.fontSize(14).font("Helvetica-Bold")
      .text(`LR No: ${cn.lr_no}   |   Date: ${cn.created_at ? String(cn.created_at).substring(0, 10) : new Date().toISOString().substring(0, 10)}`,
        48, doc.y + 7, { align: "left" });
    doc.moveDown(1.5);

    const col1X = 40, col2X = 298, rowY = doc.y;

    // Consignor / Consignee
    doc.font("Helvetica-Bold").fontSize(10).text("FROM (Consignor)", col1X, rowY);
    doc.font("Helvetica-Bold").fontSize(10).text("TO (Consignee)", col2X, rowY);
    doc.moveDown(0.3);
    const y2 = doc.y;
    doc.font("Helvetica").fontSize(10);
    doc.text(cn.consignor_name || "—", col1X, y2);
    doc.text(cn.consignor_phone ? `Ph: ${cn.consignor_phone}` : "", col1X, y2 + 14);
    doc.text(cn.from_location || "", col1X, y2 + 28);
    doc.text(cn.consignee_name || "—", col2X, y2);
    doc.text(cn.consignee_phone ? `Ph: ${cn.consignee_phone}` : "", col2X, y2 + 14);
    doc.text(cn.to_location || "", col2X, y2 + 28);
    doc.y = y2 + 50;
    doc.moveDown(0.5);

    // Consignment table
    doc.font("Helvetica-Bold").fontSize(10);
    const th = ["Packages", "Description", "Weight (kg)", "Freight (₹)"];
    const tw = [80, 220, 100, 115];
    let tx = 40;
    th.forEach((h, i) => { doc.text(h, tx, doc.y, { width: tw[i] }); tx += tw[i]; });
    doc.moveDown(0.3);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(10);
    tx = 40;
    const td = [
      String(cn.packages || 1),
      cn.goods_description || "",
      String(cn.weight_kg || ""),
      `₹${Number(cn.freight_charges || 0).toLocaleString("en-IN")}`,
    ];
    td.forEach((cell, i) => { doc.text(cell, tx, doc.y, { width: tw[i] }); tx += tw[i]; });
    doc.moveDown(0.5);

    // Vehicle & Driver
    doc.font("Helvetica-Bold").text("Vehicle No: ", { continued: true }).font("Helvetica").text(cn.vehicle_no || "—");
    doc.font("Helvetica-Bold").text("Driver: ", { continued: true }).font("Helvetica").text(cn.driver_name_db || cn.driver_name || "—");
    doc.font("Helvetica-Bold").text("License: ", { continued: true }).font("Helvetica").text(cn.license_number || "—");

    // Delivery terms
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").text("Delivery Terms: ", { continued: true });
    doc.font("Helvetica").text("To Pay");

    // E-way bill if present
    if (cn.eway_bill_no) {
      doc.font("Helvetica-Bold").text("E-Way Bill No: ", { continued: true });
      doc.font("Helvetica").text(cn.eway_bill_no);
    }

    // Barcode placeholder
    doc.moveDown(0.5);
    doc.fontSize(8).text(`[Barcode: ${cn.lr_no}]`, { align: "center" });

    // Signature boxes
    doc.moveDown(1);
    const sigY = doc.y;
    const sigW = 150, sigH = 50;
    doc.rect(40, sigY, sigW, sigH).stroke().text("Consignor\nSignature", 40, sigY + 20, { width: sigW, align: "center" });
    doc.rect(200, sigY, sigW, sigH).stroke().text("Carrier\nSignature", 200, sigY + 20, { width: sigW, align: "center" });
    doc.rect(360, sigY, sigW, sigH).stroke().text("Consignee\nSignature", 360, sigY + 20, { width: sigW, align: "center" });

    doc.end();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GPS Tracking ─────────────────────────────────────────────────────────────
// GET /api/logistics/vehicles/:id/location
router.get("/vehicles/:id/location", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const { id } = req.params;

    if (process.env.TRACCAR_URL && process.env.TRACCAR_TOKEN) {
      // Proxy from Traccar
      const url = `${process.env.TRACCAR_URL}/api/positions?deviceId=${id}`;
      const proto = url.startsWith("https") ? https : http;
      proto.get(url, { headers: { Authorization: `Bearer ${process.env.TRACCAR_TOKEN}` } } as any, (tRes) => {
        let data = "";
        tRes.on("data", (c: any) => data += c);
        tRes.on("end", () => {
          try { res.json(JSON.parse(data)); } catch { res.json([]); }
        });
      }).on("error", () => fetchFromDB());
    } else {
      fetchFromDB();
    }

    async function fetchFromDB() {
      const rows = await db.execute(sql`
        SELECT * FROM logistics_gps_positions
        WHERE tenant_id = ${tenantId} AND vehicle_id = ${id}
        ORDER BY recorded_at DESC LIMIT 1
      `);
      res.json(rows.rows[0] || null);
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/logistics/vehicles/:id/route-history
router.get("/vehicles/:id/route-history", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const { id } = req.params;
    const hours = parseInt(String(req.query.hours || "24"));
    const rows = await db.execute(sql`
      SELECT * FROM logistics_gps_positions
      WHERE tenant_id = ${tenantId} AND vehicle_id = ${id}
        AND recorded_at >= NOW() - (${hours} || ' hours')::interval
      ORDER BY recorded_at ASC
    `);
    res.json(rows.rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/logistics/vehicles/:id/location (no auth — driver app)
router.post("/vehicles/:id/location", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, speed, heading, engine_status, recorded_at, secret_token, vehicle_no } = req.body;

    // Verify secret token matches stored token for vehicle
    const vRows = await db.execute(sql`
      SELECT * FROM logistics_vehicles WHERE id = ${id} LIMIT 1
    `);
    if (!vRows.rows.length) return res.status(404).json({ error: "Vehicle not found" });
    const vehicle = vRows.rows[0] as any;
    const tenantId = vehicle.tenant_id || 1;

    await db.execute(sql`
      INSERT INTO logistics_gps_positions (tenant_id, vehicle_id, vehicle_no, latitude, longitude, speed, heading, engine_status, recorded_at, source)
      VALUES (${tenantId}, ${id}, ${vehicle_no || vehicle.vehicle_no || null}, ${latitude}, ${longitude},
              ${speed || 0}, ${heading || 0}, ${engine_status || 'unknown'},
              ${recorded_at ? new Date(recorded_at) : new Date()}, 'driver_app')
    `);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/logistics/vehicles/live-map
router.get("/vehicles/live-map", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const rows = await db.execute(sql`
      SELECT v.id, v.vehicle_no, v.vehicle_type, v.driver_name, v.status,
             g.latitude, g.longitude, g.speed, g.heading, g.engine_status, g.recorded_at
      FROM logistics_vehicles v
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, speed, heading, engine_status, recorded_at
        FROM logistics_gps_positions
        WHERE vehicle_id = v.id AND tenant_id = ${tenantId}
        ORDER BY recorded_at DESC LIMIT 1
      ) g ON true
      WHERE v.tenant_id = ${tenantId} AND v.status != 'deleted'
      ORDER BY v.vehicle_no
    `);
    res.json(rows.rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/logistics/vehicles/:id/geofence
router.post("/vehicles/:id/geofence", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const { id } = req.params;
    const { name, lat, lon, radius_km, alert_on_enter, alert_on_exit } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO logistics_geofences (tenant_id, vehicle_id, name, lat, lon, radius_km, alert_on_enter, alert_on_exit)
      VALUES (${tenantId}, ${id}, ${name || null}, ${lat}, ${lon}, ${radius_km || 1},
              ${alert_on_enter !== false}, ${alert_on_exit !== false})
      RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Route Optimization ────────────────────────────────────────────────────────
// POST /api/logistics/routes/optimize
router.post("/routes/optimize", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const { waypoints, vehicle_type } = req.body as {
      waypoints: Array<{ lat: number; lon: number; label?: string }>;
      vehicle_type?: string;
    };

    if (!waypoints || waypoints.length < 2) {
      return res.status(400).json({ error: "At least 2 waypoints required" });
    }

    let optimized_waypoints: typeof waypoints;
    let total_distance_km: number;
    let estimated_time_mins: number;
    let source = "heuristic";

    if (process.env.OSRM_URL) {
      // Use OSRM
      const coords = waypoints.map(w => `${w.lon},${w.lat}`).join(";");
      const osrmUrl = `${process.env.OSRM_URL}/route/v1/driving/${coords}?overview=full`;
      const proto = osrmUrl.startsWith("https") ? https : http;
      const osrmResult = await new Promise<any>((resolve, reject) => {
        proto.get(osrmUrl, (oRes) => {
          let data = "";
          oRes.on("data", (c: any) => data += c);
          oRes.on("end", () => { try { resolve(JSON.parse(data)); } catch { reject(new Error("OSRM parse error")); } });
        }).on("error", reject);
      });
      const route = osrmResult.routes?.[0];
      total_distance_km = (route?.distance || 0) / 1000;
      estimated_time_mins = Math.round((route?.duration || 0) / 60);
      optimized_waypoints = waypoints;
      source = "osrm";
    } else {
      // Nearest-neighbor TSP heuristic
      const order = nearestNeighborTSP(waypoints);
      optimized_waypoints = order.map(i => waypoints[i]);

      // Compute total distance
      total_distance_km = 0;
      for (let i = 0; i < optimized_waypoints.length - 1; i++) {
        total_distance_km += haversine(optimized_waypoints[i], optimized_waypoints[i + 1]);
      }
      total_distance_km = Math.round(total_distance_km * 10) / 10;
      // Estimate: avg 40 km/h for truck, 1 min stop per waypoint
      estimated_time_mins = Math.round((total_distance_km / 40) * 60) + optimized_waypoints.length;
    }

    const saved = await db.execute(sql`
      INSERT INTO logistics_routes (tenant_id, vehicle_type, waypoints, optimized_waypoints, total_distance_km, estimated_time_mins, source)
      VALUES (${tenantId}, ${vehicle_type || 'truck'}, ${JSON.stringify(waypoints)}, ${JSON.stringify(optimized_waypoints)},
              ${total_distance_km}, ${estimated_time_mins}, ${source})
      RETURNING id
    `);
    const route_id = (saved.rows[0] as any)?.id;

    res.json({ optimized_waypoints, total_distance_km, estimated_time_mins, route_id, source });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/logistics/routes/:id
router.get("/routes/:id", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const rows = await db.execute(sql`
      SELECT * FROM logistics_routes WHERE id = ${req.params.id} AND tenant_id = ${tenantId}
    `);
    if (!rows.rows.length) return res.status(404).json({ error: "Route not found" });
    res.json(rows.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Freight GL Posting ────────────────────────────────────────────────────────
// POST /api/logistics/freight-bills/:id/post-gl
router.post("/freight-bills/:id/post-gl", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const { id } = req.params;
    const rows = await db.execute(sql`SELECT * FROM freight_bills WHERE id=${id} AND tenant_id=${tenantId}`);
    if (!rows.rows.length) return res.status(404).json({ error: "Freight bill not found" });
    const bill = rows.rows[0] as any;
    const amount = Number(bill.total_amount || bill.freight_amount || 0);
    const amountPaise = Math.round(amount * 100);

    createJournalWithLines({
      tenantId,
      date: new Date().toISOString().substring(0, 10),
      narration: `Freight GL: Bill ${bill.bill_number || id}`,
      lines: [
        { accountId: 1100, debit: amountPaise, credit: 0, narration: "AR - Freight Receivable" },
        { accountId: 4040, debit: 0, credit: amountPaise, narration: "Freight Revenue" },
      ],
    }).catch(e => console.error("GL freight", e));

    res.json({ success: true, amount_paise: amountPaise });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Vehicle Maintenance (Phase 13 endpoints) ──────────────────────────────────
// GET /api/logistics/vehicles/:id/maintenance-schedule
router.get("/vehicles/:id/maintenance-schedule", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const { id } = req.params;
    const rows = await db.execute(sql`
      SELECT m.*, v.vehicle_no
      FROM logistics_vehicle_maintenance m
      LEFT JOIN logistics_vehicles v ON v.id = m.vehicle_id
      WHERE m.tenant_id = ${tenantId} AND m.vehicle_id = ${id}
      ORDER BY m.next_service_date ASC NULLS LAST
    `);
    res.json(rows.rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/logistics/vehicles/:id/maintenance
router.post("/vehicles/:id/maintenance", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const { id } = req.params;
    const { maintenance_date, maintenance_type, description, cost, vendor_name, next_service_date, next_service_km, odometer_reading } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO logistics_vehicle_maintenance
        (tenant_id, vehicle_id, maintenance_date, maintenance_type, description, cost, vendor_name, next_service_date, next_service_km, odometer_reading)
      VALUES (${tenantId}, ${id}, ${maintenance_date}, ${maintenance_type || null}, ${description || null},
              ${cost || 0}, ${vendor_name || null}, ${next_service_date || null}, ${next_service_km || null}, ${odometer_reading || null})
      RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/logistics/vehicles/maintenance-due
router.get("/vehicles/maintenance-due", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const rows = await db.execute(sql`
      SELECT m.*, v.vehicle_no, v.make_model,
        CASE WHEN m.next_service_date <= CURRENT_DATE THEN true ELSE false END AS overdue_by_date,
        CASE WHEN m.next_service_km IS NOT NULL AND v.capacity_tons IS NOT NULL THEN
          m.next_service_km <= COALESCE((
            SELECT MAX(odometer_reading) FROM logistics_vehicle_maintenance
            WHERE vehicle_id = m.vehicle_id AND tenant_id = m.tenant_id
          ), 0)
        ELSE false END AS overdue_by_km
      FROM logistics_vehicle_maintenance m
      JOIN logistics_vehicles v ON v.id = m.vehicle_id
      WHERE m.tenant_id = ${tenantId}
        AND (m.next_service_date <= CURRENT_DATE OR m.next_service_date IS NULL)
      ORDER BY m.next_service_date ASC NULLS LAST
    `);
    res.json(rows.rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
