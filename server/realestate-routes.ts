import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── Projects ──────────────────────────────────────────────────────────────────
router.get("/projects", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT p.*,
        (SELECT COUNT(*) FROM re_units u WHERE u.project_id=p.id) as total_units_count,
        (SELECT COUNT(*) FROM re_units u WHERE u.project_id=p.id AND u.status='available') as available_units,
        (SELECT COUNT(*) FROM re_units u WHERE u.project_id=p.id AND u.status IN ('booked','sold')) as booked_units,
        (SELECT COALESCE(MAX(percentage_complete),0) FROM re_construction_progress cp WHERE cp.project_id=p.id) as latest_progress
      FROM re_projects p WHERE p.tenant_id=${tid(req)} ORDER BY p.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/projects", requireAuth, async (req: any, res) => {
  try {
    const { name, location, project_type, total_units, total_area_sqft, start_date, completion_date, description } = req.body;
    const code = "PROJ-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO re_projects (tenant_id, project_code, name, location, project_type, total_units, total_area_sqft, start_date, completion_date, description)
      VALUES (${tid(req)}, ${code}, ${name}, ${location||null}, ${project_type||'residential'},
              ${total_units||0}, ${total_area_sqft||null}, ${start_date||null},
              ${completion_date||null}, ${description||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/projects/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, location, project_type, total_units, total_area_sqft, start_date, completion_date, status, description } = req.body;
    const rows = await db.execute(sql`
      UPDATE re_projects SET name=${name}, location=${location||null}, project_type=${project_type||'residential'},
        total_units=${total_units||0}, total_area_sqft=${total_area_sqft||null},
        start_date=${start_date||null}, completion_date=${completion_date||null},
        status=${status||'planning'}, description=${description||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/projects/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE re_projects SET status='cancelled' WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Units ─────────────────────────────────────────────────────────────────────
router.get("/units", requireAuth, async (req: any, res) => {
  try {
    const { project_id } = req.query;
    const rows = await db.execute(
      project_id
        ? sql`SELECT u.*, p.name as project_name FROM re_units u LEFT JOIN re_projects p ON p.id=u.project_id WHERE u.tenant_id=${tid(req)} AND u.project_id=${String(project_id)} ORDER BY u.unit_no`
        : sql`SELECT u.*, p.name as project_name FROM re_units u LEFT JOIN re_projects p ON p.id=u.project_id WHERE u.tenant_id=${tid(req)} ORDER BY p.name, u.unit_no`
    );
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/units", requireAuth, async (req: any, res) => {
  try {
    const { project_id, unit_no, unit_type, floor_no, area_sqft, base_price, current_price, facing, features } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO re_units (tenant_id, project_id, unit_no, unit_type, floor_no, area_sqft, base_price, current_price, facing, features)
      VALUES (${tid(req)}, ${project_id}, ${unit_no}, ${unit_type||null}, ${floor_no||null},
              ${area_sqft||null}, ${base_price||0}, ${current_price||base_price||0},
              ${facing||null}, ${features||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/units/:id", requireAuth, async (req: any, res) => {
  try {
    const { unit_no, unit_type, floor_no, area_sqft, base_price, current_price, facing, features, status } = req.body;
    const rows = await db.execute(sql`
      UPDATE re_units SET unit_no=${unit_no}, unit_type=${unit_type||null}, floor_no=${floor_no||null},
        area_sqft=${area_sqft||null}, base_price=${base_price||0}, current_price=${current_price||0},
        facing=${facing||null}, features=${features||null}, status=${status||'available'}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Bookings ──────────────────────────────────────────────────────────────────
router.get("/bookings", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT b.*, u.unit_no, u.unit_type, u.area_sqft, p.name as project_name,
             br.name as broker_name
      FROM re_bookings b
      LEFT JOIN re_units u ON u.id=b.unit_id
      LEFT JOIN re_projects p ON p.id=u.project_id
      LEFT JOIN re_brokers br ON br.id=b.broker_id
      WHERE b.tenant_id=${tid(req)} ORDER BY b.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/bookings", requireAuth, async (req: any, res) => {
  try {
    const { unit_id, customer_name, customer_phone, customer_email, customer_address, booking_date, total_amount, booking_amount, loan_amount, bank_name, broker_id, broker_commission, agreement_date, possession_date, notes } = req.body;
    const no = "BKG-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO re_bookings (tenant_id, unit_id, booking_no, customer_name, customer_phone, customer_email, customer_address, booking_date, total_amount, booking_amount, loan_amount, bank_name, broker_id, broker_commission, agreement_date, possession_date, notes)
      VALUES (${tid(req)}, ${unit_id}, ${no}, ${customer_name}, ${customer_phone||null},
              ${customer_email||null}, ${customer_address||null}, ${booking_date},
              ${total_amount||0}, ${booking_amount||0}, ${loan_amount||0}, ${bank_name||null},
              ${broker_id||null}, ${broker_commission||0}, ${agreement_date||null},
              ${possession_date||null}, ${notes||null}) RETURNING *`);
    await db.execute(sql`UPDATE re_units SET status='booked' WHERE id=${unit_id}`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/bookings/:id", requireAuth, async (req: any, res) => {
  try {
    const { customer_name, customer_phone, customer_email, customer_address, booking_date, total_amount, booking_amount, loan_amount, bank_name, broker_id, broker_commission, agreement_date, possession_date, possession_status, status, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE re_bookings SET customer_name=${customer_name}, customer_phone=${customer_phone||null},
        customer_email=${customer_email||null}, customer_address=${customer_address||null},
        booking_date=${booking_date}, total_amount=${total_amount||0},
        booking_amount=${booking_amount||0}, loan_amount=${loan_amount||0},
        bank_name=${bank_name||null}, broker_id=${broker_id||null},
        broker_commission=${broker_commission||0}, agreement_date=${agreement_date||null},
        possession_date=${possession_date||null}, possession_status=${possession_status||'pending'},
        status=${status||'booked'}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Payment Schedules ─────────────────────────────────────────────────────────
router.get("/payment-schedules", requireAuth, async (req: any, res) => {
  try {
    const { booking_id } = req.query;
    const rows = await db.execute(
      booking_id
        ? sql`SELECT * FROM re_payment_schedules WHERE tenant_id=${tid(req)} AND booking_id=${String(booking_id)} ORDER BY due_date`
        : sql`SELECT * FROM re_payment_schedules WHERE tenant_id=${tid(req)} ORDER BY due_date`
    );
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/payment-schedules/:bookingId", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM re_payment_schedules WHERE booking_id=${req.params.bookingId} AND tenant_id=${tid(req)} ORDER BY due_date`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/payment-schedules", requireAuth, async (req: any, res) => {
  try {
    const { booking_id, milestone, due_date, amount, notes } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO re_payment_schedules (tenant_id, booking_id, milestone, due_date, amount, notes)
      VALUES (${tid(req)}, ${booking_id}, ${milestone}, ${due_date||null}, ${amount}, ${notes||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/payment-schedules/:id", requireAuth, async (req: any, res) => {
  try {
    const { milestone, due_date, amount, paid_date, paid_amount, payment_mode, status, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE re_payment_schedules SET milestone=${milestone}, due_date=${due_date||null},
        amount=${amount}, paid_date=${paid_date||null}, paid_amount=${paid_amount||0},
        payment_mode=${payment_mode||null}, status=${status||'pending'}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Brokers ───────────────────────────────────────────────────────────────────
router.get("/brokers", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM re_brokers WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/brokers", requireAuth, async (req: any, res) => {
  try {
    const { name, firm_name, phone, email, commission_pct, address, rera_number } = req.body;
    const code = "BRK-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO re_brokers (tenant_id, broker_code, name, firm_name, phone, email, commission_pct, address, rera_number)
      VALUES (${tid(req)}, ${code}, ${name}, ${firm_name||null}, ${phone||null}, ${email||null},
              ${commission_pct||0}, ${address||null}, ${rera_number||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/brokers/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, firm_name, phone, email, commission_pct, address, rera_number, status } = req.body;
    const rows = await db.execute(sql`
      UPDATE re_brokers SET name=${name}, firm_name=${firm_name||null}, phone=${phone||null},
        email=${email||null}, commission_pct=${commission_pct||0}, address=${address||null},
        rera_number=${rera_number||null}, status=${status||'active'}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/brokers/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE re_brokers SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Construction Progress ─────────────────────────────────────────────────────
router.get("/construction-progress", requireAuth, async (req: any, res) => {
  try {
    const { project_id } = req.query;
    const rows = await db.execute(
      project_id
        ? sql`SELECT * FROM re_construction_progress WHERE tenant_id=${tid(req)} AND project_id=${String(project_id)} ORDER BY progress_date DESC`
        : sql`SELECT * FROM re_construction_progress WHERE tenant_id=${tid(req)} ORDER BY progress_date DESC`
    );
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/construction-progress", requireAuth, async (req: any, res) => {
  try {
    const { project_id, project_name, progress_date, stage, percentage_complete, description, recorded_by } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO re_construction_progress (tenant_id, project_id, project_name, progress_date, stage, percentage_complete, description, recorded_by)
      VALUES (${tid(req)}, ${project_id||null}, ${project_name||null}, ${progress_date},
              ${stage}, ${percentage_complete||0}, ${description||null}, ${recorded_by||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/construction-progress/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE re_construction_progress SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Demand Letters ────────────────────────────────────────────────────────────
router.get("/demand-letters", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM re_demand_letters WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY demand_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/demand-letters", requireAuth, async (req: any, res) => {
  try {
    const { booking_id, customer_name, unit_number, demand_date, due_date, milestone, amount, notes } = req.body;
    const no = "DL-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO re_demand_letters (tenant_id, demand_number, booking_id, customer_name, unit_number, demand_date, due_date, milestone, amount, notes)
      VALUES (${tid(req)}, ${no}, ${booking_id||null}, ${customer_name||null}, ${unit_number||null},
              ${demand_date}, ${due_date||null}, ${milestone||null}, ${amount||0}, ${notes||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/demand-letters/:id", requireAuth, async (req: any, res) => {
  try {
    const { due_date, milestone, amount, paid_amount, status, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE re_demand_letters SET due_date=${due_date||null}, milestone=${milestone||null},
        amount=${amount||0}, paid_amount=${paid_amount||0}, status=${status||'pending'}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/demand-letters/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE re_demand_letters SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Stats ────────────────────────────────────────────────────────────────────
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const [projects, units, bookings, revenue] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM re_projects WHERE tenant_id=${tid(req)} AND status!='cancelled'`),
      db.execute(sql`SELECT COUNT(*) as count, COUNT(*) FILTER (WHERE status='available') as available FROM re_units WHERE tenant_id=${tid(req)}`),
      db.execute(sql`SELECT COUNT(*) as count FROM re_bookings WHERE tenant_id=${tid(req)} AND status='booked'`),
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as total FROM re_bookings WHERE tenant_id=${tid(req)}`),
    ]);
    res.json({
      totalProjects: Number(projects.rows[0]?.count||0),
      totalUnits: Number(units.rows[0]?.count||0),
      availableUnits: Number(units.rows[0]?.available||0),
      activeBookings: Number(bookings.rows[0]?.count||0),
      totalRevenue: Number(revenue.rows[0]?.total||0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
