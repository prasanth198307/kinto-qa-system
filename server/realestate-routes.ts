import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { createJournalWithLines } from "./journal-service";
import PDFDocument from "pdfkit";

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
        (SELECT COALESCE(MAX(completion_pct),0) FROM re_construction_progress cp WHERE cp.project_id=p.id::text) as latest_progress
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

router.delete("/units/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE re_units SET status='cancelled' WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
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
      INSERT INTO re_bookings (tenant_id, unit_id, booking_no, customer_name, customer_phone, customer_email, customer_address, booking_date, total_consideration, booking_amount, loan_amount, bank_name, broker_id, broker_commission, agreement_date, possession_date, notes)
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
        booking_date=${booking_date}, total_consideration=${total_amount||0},
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
      INSERT INTO re_construction_progress (tenant_id, project_id, project_name, progress_date, stage, completion_pct, description, recorded_by)
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
    const rows = await db.execute(sql`SELECT * FROM re_demand_letters WHERE tenant_id=${Number(tid(req))} AND record_status=1 ORDER BY demand_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/demand-letters", requireAuth, async (req: any, res) => {
  try {
    const { booking_id, customer_name, unit_number, demand_date, due_date, milestone, amount, notes } = req.body;
    const no = "DL-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO re_demand_letters (tenant_id, demand_number, booking_id, customer_name, unit_number, demand_date, due_date, milestone, amount, notes)
      VALUES (${Number(tid(req))}, ${no}, ${booking_id||null}, ${customer_name||null}, ${unit_number||null},
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
      WHERE id=${req.params.id} AND tenant_id=${Number(tid(req))} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/demand-letters/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE re_demand_letters SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${Number(tid(req))}`);
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
      db.execute(sql`SELECT COALESCE(SUM(total_consideration),0) as total FROM re_bookings WHERE tenant_id=${tid(req)}`),
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

// ── Phase 14: DB Setup ────────────────────────────────────────────────────────
(async () => {
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS re_rera_submissions (id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, project_id INT NOT NULL, year INT NOT NULL, quarter INT NOT NULL, submitted_at TIMESTAMPTZ DEFAULT NOW(), status VARCHAR(30) DEFAULT 'submitted', report_data JSONB, submission_no VARCHAR(100), created_at TIMESTAMPTZ DEFAULT NOW())`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS re_broker_commissions (id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, broker_id INT NOT NULL, booking_id INT, commission_amount DECIMAL(15,2) DEFAULT 0, commission_pct DECIMAL(5,2) DEFAULT 0, status VARCHAR(30) DEFAULT 'pending', paid_date DATE, gl_posted BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW())`);
  } catch (e) { console.error("re_phase14 tables:", e); }
})();

// ── Demand Letter PDF: GET /api/real-estate/demand-letters/:id/pdf ────────────
router.get("/demand-letters/:id/pdf", requireAuth, async (req: any, res) => {
  try {
    const tenantId = Number(tid(req));
    const { id } = req.params;
    const dlRows = await db.execute(sql`
      SELECT dl.*, b.customer_name, b.customer_address, b.customer_phone,
             u.unit_no, u.unit_type, p.name as project_name
      FROM re_demand_letters dl
      LEFT JOIN re_bookings b ON b.id = dl.booking_id
      LEFT JOIN re_units u ON u.unit_no = dl.unit_number AND u.tenant_id = ${tenantId}
      LEFT JOIN re_projects p ON p.id = u.project_id
      WHERE dl.id = ${id} AND dl.tenant_id = ${tenantId} LIMIT 1`);
    if (!dlRows.rows.length) return res.status(404).json({ error: "Demand letter not found" });
    const dl = dlRows.rows[0] as any;
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=DL-${dl.demand_number || id}.pdf`);
    doc.pipe(res);
    doc.fontSize(16).font("Helvetica-Bold").text("SwachERP Developers Pvt. Ltd.", { align: "center" });
    doc.fontSize(9).font("Helvetica").text("RERA Reg: MAHA/P/2024/001 | CIN: U45200MH2024PTC123456", { align: "center" }).text("123 Developer Road, Hyderabad – 500001 | Tel: 040-12345678", { align: "center" });
    doc.moveDown(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);
    doc.font("Helvetica").fontSize(10).text(`Date: ${dl.demand_date || new Date().toISOString().substring(0, 10)}`, { align: "right" }).text(`Letter No: ${dl.demand_number || id}`, { align: "right" });
    doc.moveDown(0.5).font("Helvetica-Bold").text("To,").font("Helvetica").text(dl.customer_name || "—").text(dl.customer_address || "").text(dl.customer_phone ? `Tel: ${dl.customer_phone}` : "");
    doc.moveDown(0.5).font("Helvetica-Bold").text(`Subject: Demand for ${dl.milestone || "Payment"} – Unit ${dl.unit_number || dl.unit_no || "—"}, ${dl.project_name || ""}`);
    doc.moveDown(0.5).font("Helvetica").text(`Dear ${dl.customer_name || "Sir/Madam"},\n\nThis is to inform you that the ${dl.milestone || "payment"} milestone has been reached. The following amount is now due:`, { lineGap: 2 });
    doc.moveDown(0.5);
    const basic = Number(dl.amount || 0), gst = 0, total = basic + gst;
    [["Basic Amount", `₹${basic.toLocaleString("en-IN")}`], ["GST", `₹${gst.toLocaleString("en-IN")}`], ["Total Due", `₹${total.toLocaleString("en-IN")}`]].forEach(([l, v], i) => {
      if (i === 2) doc.font("Helvetica-Bold"); else doc.font("Helvetica");
      doc.text(`${l}:`, 70, doc.y, { continued: true, width: 250 }).text(v, { width: 200, align: "right" });
    });
    if (dl.due_date) doc.moveDown(0.5).font("Helvetica-Bold").fillColor("red").text(`Due Date: ${dl.due_date}`).fillColor("black");
    doc.moveDown(0.5).font("Helvetica-Bold").text("Payment Instructions:").font("Helvetica").text("Bank: HDFC Bank | A/C: 50100012345678 | IFSC: HDFC0001234").text(`Reference: ${dl.demand_number || id}`);
    doc.moveDown(1).font("Helvetica").text("Yours faithfully,").moveDown(0.3).font("Helvetica-Bold").text("For SwachERP Developers Pvt. Ltd.").moveDown(2).font("Helvetica").text("Authorised Signatory");
    doc.end();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GL on Collection: POST /api/real-estate/payment-schedules/:id/record-payment
router.post("/payment-schedules/:id/record-payment", requireAuth, async (req: any, res) => {
  try {
    const tenantId = Number(tid(req));
    const { paid_amount, gst_amount, payment_mode, paid_date, notes } = req.body;
    const payAmt = Number(paid_amount || 0), gstAmt = Number(gst_amount || 0), baseAmt = payAmt - gstAmt;
    const rows = await db.execute(sql`UPDATE re_payment_schedules SET paid_amount=${payAmt}, paid_date=${paid_date || null}, payment_mode=${payment_mode || null}, status='paid', notes=${notes || null} WHERE id=${req.params.id} AND tenant_id=${String(tenantId)} RETURNING *`);
    if (!rows.rows.length) return res.status(404).json({ error: "Not found" });
    const glLines: any[] = [{ accountId: 1002, debit: Math.round(payAmt * 100), credit: 0, narration: "Bank" }, { accountId: 4050, debit: 0, credit: Math.round(baseAmt * 100), narration: "RE Revenue" }];
    if (gstAmt > 0) glLines.push({ accountId: 2201, debit: 0, credit: Math.round(gstAmt * 100), narration: "GST Payable" });
    createJournalWithLines({ tenantId, date: paid_date || new Date().toISOString().substring(0, 10), narration: `RE Collection ${req.params.id}`, lines: glLines }).catch(e => console.error("GL RE collection", e));
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── RERA Quarterly: GET /api/real-estate/rera/quarterly-report/:pid/:yr/:q ───
router.get("/rera/quarterly-report/:projectId/:year/:quarter", requireAuth, async (req: any, res) => {
  try {
    const tenantId = String(tid(req));
    const { projectId, year, quarter } = req.params;
    const q = parseInt(quarter), yr = parseInt(year);
    const qStart = new Date(yr, (q - 1) * 3, 1).toISOString().substring(0, 10);
    const qEnd = new Date(yr, q * 3, 0).toISOString().substring(0, 10);
    const [proj, units, progress] = await Promise.all([
      db.execute(sql`SELECT * FROM re_projects WHERE id=${projectId} AND tenant_id=${tenantId} LIMIT 1`),
      db.execute(sql`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status IN ('booked','sold')) as sold, COUNT(*) FILTER (WHERE status='available') as unsold FROM re_units WHERE project_id=${projectId} AND tenant_id=${tenantId}`),
      db.execute(sql`SELECT completion_pct FROM re_construction_progress WHERE project_id=${projectId} AND tenant_id=${tenantId} ORDER BY id DESC LIMIT 1`),
    ]);
    if (!proj.rows.length) return res.status(404).json({ error: "Project not found" });
    const pd = proj.rows[0] as any, ud = units.rows[0] as any;
    res.json({ form: "RERA-Form-1", project_id: projectId, project_name: pd.name, rera_registration: pd.rera_registration || "—", year: yr, quarter: q, period: `Q${q} ${yr} (${qStart} to ${qEnd})`, units: { total: Number(ud?.total || 0), sold: Number(ud?.sold || 0), unsold: Number(ud?.unsold || 0) }, construction_progress_pct: Number((progress.rows[0] as any)?.completion_pct || 0), complaints: { total: 0, resolved: 0, pending: 0 }, generated_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── RERA XML: GET /api/real-estate/rera/quarterly-report/:pid/:yr/:q/xml ──────
router.get("/rera/quarterly-report/:projectId/:year/:quarter/xml", requireAuth, async (req: any, res) => {
  try {
    const tenantId = String(tid(req));
    const { projectId, year, quarter } = req.params;
    const q = parseInt(quarter), yr = parseInt(year);
    const qStart = new Date(yr, (q - 1) * 3, 1).toISOString().substring(0, 10);
    const qEnd = new Date(yr, q * 3, 0).toISOString().substring(0, 10);
    const [proj, units, progress] = await Promise.all([
      db.execute(sql`SELECT * FROM re_projects WHERE id=${projectId} AND tenant_id=${tenantId} LIMIT 1`),
      db.execute(sql`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status IN ('booked','sold')) as sold FROM re_units WHERE project_id=${projectId} AND tenant_id=${tenantId}`),
      db.execute(sql`SELECT completion_pct FROM re_construction_progress WHERE project_id=${projectId} AND tenant_id=${tenantId} ORDER BY id DESC LIMIT 1`),
    ]);
    if (!proj.rows.length) return res.status(404).json({ error: "Project not found" });
    const pd = proj.rows[0] as any, ud = units.rows[0] as any;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<RERAQuarterlyReport>\n  <FormNo>Form-1</FormNo>\n  <ProjectName>${pd.name}</ProjectName>\n  <RERARegistration>${pd.rera_registration || ""}</RERARegistration>\n  <ReportingPeriod><Year>${yr}</Year><Quarter>${q}</Quarter><StartDate>${qStart}</StartDate><EndDate>${qEnd}</EndDate></ReportingPeriod>\n  <Units><Total>${ud?.total || 0}</Total><Sold>${ud?.sold || 0}</Sold><Unsold>${Number(ud?.total || 0) - Number(ud?.sold || 0)}</Unsold></Units>\n  <ConstructionProgress><PercentageComplete>${Number((progress.rows[0] as any)?.completion_pct || 0)}</PercentageComplete></ConstructionProgress>\n  <GeneratedAt>${new Date().toISOString()}</GeneratedAt>\n</RERAQuarterlyReport>`;
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Content-Disposition", `attachment; filename=RERA-Q${q}-${yr}-P${projectId}.xml`);
    res.send(xml);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── RERA Submit: POST /api/real-estate/rera/submit-quarterly ─────────────────
router.post("/rera/submit-quarterly", requireAuth, async (req: any, res) => {
  try {
    const tenantId = Number(tid(req));
    const { project_id, year, quarter, report_data } = req.body;
    const subNo = `RERA-${project_id}-Q${quarter}-${year}-${Date.now()}`;
    const rows = await db.execute(sql`INSERT INTO re_rera_submissions (tenant_id, project_id, year, quarter, report_data, submission_no, status) VALUES (${tenantId}, ${project_id}, ${year}, ${quarter}, ${JSON.stringify(report_data || {})}, ${subNo}, 'submitted') RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Project P&L: GET /api/real-estate/projects/:id/pnl ───────────────────────
router.get("/projects/:id/pnl", requireAuth, async (req: any, res) => {
  try {
    const tenantId = String(tid(req));
    const { id } = req.params;
    const [projRow, bkRows] = await Promise.all([
      db.execute(sql`SELECT * FROM re_projects WHERE id=${id} AND tenant_id=${tenantId} LIMIT 1`),
      db.execute(sql`SELECT COALESCE(SUM(total_consideration),0) as total_booked, COUNT(*) as bookings FROM re_bookings WHERE tenant_id=${tenantId} AND unit_id IN (SELECT id FROM re_units WHERE project_id=${id})`),
    ]);
    if (!projRow.rows.length) return res.status(404).json({ error: "Project not found" });
    const proj = projRow.rows[0] as any, bk = bkRows.rows[0] as any;
    const totalBooked = Number(bk?.total_booked || 0);
    res.json({ project_id: id, project_name: proj.name, total_booked_amount: totalBooked, booking_count: Number(bk?.bookings || 0), note: "Integrate subcontract/material module for cost-to-complete" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Broker Commissions: GET /api/real-estate/brokers/:id/commissions ──────────
router.get("/brokers/:id/commissions", requireAuth, async (req: any, res) => {
  try {
    const tenantId = Number(tid(req));
    const rows = await db.execute(sql`SELECT c.*, br.name as broker_name, bk.booking_no, bk.customer_name FROM re_broker_commissions c LEFT JOIN re_brokers br ON br.id=c.broker_id LEFT JOIN re_bookings bk ON bk.id=c.booking_id WHERE c.tenant_id=${tenantId} AND c.broker_id=${req.params.id} ORDER BY c.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Pay Commission: POST /api/real-estate/sales/:id/pay-commission ────────────
router.post("/sales/:id/pay-commission", requireAuth, async (req: any, res) => {
  try {
    const tenantId = Number(tid(req));
    const { broker_id, commission_amount, paid_date } = req.body;
    const rows = await db.execute(sql`INSERT INTO re_broker_commissions (tenant_id, broker_id, booking_id, commission_amount, status, paid_date, gl_posted) VALUES (${tenantId}, ${broker_id}, ${req.params.id}, ${commission_amount || 0}, 'paid', ${paid_date || null}, TRUE) RETURNING *`);
    const amtPaise = Math.round(Number(commission_amount || 0) * 100);
    createJournalWithLines({ tenantId, date: paid_date || new Date().toISOString().substring(0, 10), narration: `Broker Commission Booking ${req.params.id}`, lines: [{ accountId: 6200, debit: amtPaise, credit: 0, narration: "Broker Commission Expense" }, { accountId: 2100, debit: 0, credit: amtPaise, narration: "AP - Broker" }] }).catch(e => console.error("GL broker", e));
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── PHASE 14: Bank Loan Tracking ─────────────────────────────────────────────

async function ensureLoanTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS re_bank_loans (
    id SERIAL PRIMARY KEY, tenant_id INT,
    project_id INT, loan_no VARCHAR(100),
    bank_name VARCHAR(200), branch VARCHAR(200),
    sanction_amount NUMERIC(14,2), sanction_date DATE,
    interest_rate NUMERIC(5,2), tenure_months INT,
    loan_type VARCHAR(50) DEFAULT 'construction',
    current_outstanding NUMERIC(14,2) DEFAULT 0,
    total_disbursed NUMERIC(14,2) DEFAULT 0,
    emi_amount NUMERIC(10,2), emi_date INT DEFAULT 1,
    status VARCHAR(30) DEFAULT 'active',
    notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS re_loan_drawdowns (
    id SERIAL PRIMARY KEY, tenant_id INT,
    loan_id INT, project_id INT,
    drawdown_date DATE, amount NUMERIC(12,2),
    purpose TEXT,
    bank_ref VARCHAR(100), gl_posted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS re_loan_repayments (
    id SERIAL PRIMARY KEY, tenant_id INT,
    loan_id INT, payment_date DATE,
    principal_amount NUMERIC(10,2), interest_amount NUMERIC(10,2),
    total_amount NUMERIC(10,2), payment_mode VARCHAR(50),
    bank_ref VARCHAR(100), gl_posted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

router.get("/loans", requireAuth, async (req: any, res) => {
  try {
    await ensureLoanTables();
    const rows = await db.execute(sql`SELECT l.*, p.name as project_name FROM re_bank_loans l LEFT JOIN re_projects p ON p.id=l.project_id WHERE l.tenant_id=${tid(req)} ORDER BY l.created_at DESC`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/loans", requireAuth, async (req: any, res) => {
  try {
    await ensureLoanTables();
    const { project_id, loan_no, bank_name, branch, sanction_amount, sanction_date, interest_rate, tenure_months, loan_type, emi_amount, emi_date, notes } = req.body;
    const row = await db.execute(sql`INSERT INTO re_bank_loans (tenant_id, project_id, loan_no, bank_name, branch, sanction_amount, sanction_date, interest_rate, tenure_months, loan_type, emi_amount, emi_date, notes) VALUES (${tid(req)}, ${project_id||null}, ${loan_no}, ${bank_name}, ${branch||null}, ${sanction_amount||0}, ${sanction_date||null}, ${interest_rate||0}, ${tenure_months||0}, ${loan_type||'construction'}, ${emi_amount||null}, ${emi_date||1}, ${notes||null}) RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/loans/summary", requireAuth, async (req: any, res) => {
  try {
    await ensureLoanTables();
    const t = tid(req);
    const rows = await db.execute(sql`SELECT COALESCE(SUM(sanction_amount),0) AS total_sanctioned, COALESCE(SUM(total_disbursed),0) AS total_disbursed, COALESCE(SUM(current_outstanding),0) AS total_outstanding, COALESCE(SUM(CASE WHEN emi_date=EXTRACT(DAY FROM CURRENT_DATE) THEN emi_amount END),0) AS todays_emis FROM re_bank_loans WHERE tenant_id=${t} AND status='active'`);
    res.json(rows.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/loans/schedule/:id", requireAuth, async (req: any, res) => {
  try {
    await ensureLoanTables();
    const loan = await db.execute(sql`SELECT * FROM re_bank_loans WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    const l = loan.rows[0] as any;
    if (!l) return res.status(404).json({ error: 'Loan not found' });
    const monthlyRate = Number(l.interest_rate) / 12 / 100;
    const n = Number(l.tenure_months);
    const outstanding = Number(l.current_outstanding);
    const emi = outstanding * monthlyRate * Math.pow(1 + monthlyRate, n) / (Math.pow(1 + monthlyRate, n) - 1);
    const schedule: any[] = [];
    let balance = outstanding;
    for (let i = 1; i <= n && balance > 0; i++) {
      const interest = balance * monthlyRate;
      const principal = Math.min(emi - interest, balance);
      balance -= principal;
      schedule.push({ month: i, opening_balance: balance + principal, emi: Math.round(emi * 100) / 100, principal: Math.round(principal * 100) / 100, interest: Math.round(interest * 100) / 100, closing_balance: Math.round(balance * 100) / 100 });
    }
    res.json(schedule);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/loans/:id", requireAuth, async (req: any, res) => {
  try {
    await ensureLoanTables();
    const loan = await db.execute(sql`SELECT * FROM re_bank_loans WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    if (!loan.rows[0]) return res.status(404).json({ error: 'Not found' });
    const drawdowns = await db.execute(sql`SELECT * FROM re_loan_drawdowns WHERE loan_id=${req.params.id} AND tenant_id=${tid(req)} ORDER BY drawdown_date DESC`);
    const repayments = await db.execute(sql`SELECT * FROM re_loan_repayments WHERE loan_id=${req.params.id} AND tenant_id=${tid(req)} ORDER BY payment_date DESC`);
    res.json({ ...loan.rows[0], drawdowns: drawdowns.rows, repayments: repayments.rows });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/loans/:id", requireAuth, async (req: any, res) => {
  try {
    await ensureLoanTables();
    const { bank_name, branch, interest_rate, tenure_months, emi_amount, emi_date, status, notes } = req.body;
    const row = await db.execute(sql`UPDATE re_bank_loans SET bank_name=${bank_name||null}, branch=${branch||null}, interest_rate=${interest_rate||0}, tenure_months=${tenure_months||0}, emi_amount=${emi_amount||null}, emi_date=${emi_date||1}, status=${status||'active'}, notes=${notes||null} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/loans/:id/drawdown", requireAuth, async (req: any, res) => {
  try {
    await ensureLoanTables();
    const t = tid(req);
    const { drawdown_date, amount, purpose, bank_ref } = req.body;
    const loan = await db.execute(sql`SELECT * FROM re_bank_loans WHERE id=${req.params.id} AND tenant_id=${t}`);
    const l = loan.rows[0] as any;
    if (!l) return res.status(404).json({ error: 'Loan not found' });
    const row = await db.execute(sql`INSERT INTO re_loan_drawdowns (tenant_id, loan_id, project_id, drawdown_date, amount, purpose, bank_ref, gl_posted) VALUES (${t}, ${req.params.id}, ${l.project_id}, ${drawdown_date||null}, ${amount||0}, ${purpose||null}, ${bank_ref||null}, TRUE) RETURNING *`);
    await db.execute(sql`UPDATE re_bank_loans SET total_disbursed=total_disbursed+${amount||0}, current_outstanding=current_outstanding+${amount||0} WHERE id=${req.params.id} AND tenant_id=${t}`);
    const amtPaise = Math.round(Number(amount) * 100);
    createJournalWithLines(drawdown_date || new Date().toISOString().slice(0,10), `Loan Drawdown ${l.loan_no} - ${purpose}`, [{ accountCode: '1002', debit: amtPaise, credit: 0 }, { accountCode: '2400', debit: 0, credit: amtPaise }]).catch(e => console.error('GL drawdown', e));
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/loans/:id/repayment", requireAuth, async (req: any, res) => {
  try {
    await ensureLoanTables();
    const t = tid(req);
    const { principal_amount, interest_amount, payment_date, payment_mode, bank_ref } = req.body;
    const total = Number(principal_amount||0) + Number(interest_amount||0);
    const row = await db.execute(sql`INSERT INTO re_loan_repayments (tenant_id, loan_id, payment_date, principal_amount, interest_amount, total_amount, payment_mode, bank_ref, gl_posted) VALUES (${t}, ${req.params.id}, ${payment_date||null}, ${principal_amount||0}, ${interest_amount||0}, ${total}, ${payment_mode||'NEFT'}, ${bank_ref||null}, TRUE) RETURNING *`);
    await db.execute(sql`UPDATE re_bank_loans SET current_outstanding=current_outstanding-${principal_amount||0} WHERE id=${req.params.id} AND tenant_id=${t}`);
    const prinPaise = Math.round(Number(principal_amount||0) * 100);
    const intPaise = Math.round(Number(interest_amount||0) * 100);
    const totalPaise = prinPaise + intPaise;
    createJournalWithLines(payment_date || new Date().toISOString().slice(0,10), `Loan Repayment EMI ${req.params.id}`, [{ accountCode: '2400', debit: prinPaise, credit: 0 }, { accountCode: '6300', debit: intPaise, credit: 0 }, { accountCode: '1002', debit: 0, credit: totalPaise }]).catch(e => console.error('GL repayment', e));
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── PHASE 14: Subcontractor Management ───────────────────────────────────────

async function ensureSubcontractorTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS re_subcontractors (
    id SERIAL PRIMARY KEY, tenant_id INT,
    name VARCHAR(300), trade VARCHAR(100),
    gstin VARCHAR(15), pan VARCHAR(10),
    contact_person VARCHAR(200), phone VARCHAR(20), email VARCHAR(200),
    address TEXT, bank_account VARCHAR(30), bank_ifsc VARCHAR(11),
    rating INT DEFAULT 3,
    total_contracts NUMERIC(14,2) DEFAULT 0,
    total_paid NUMERIC(14,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS re_subcontractor_contracts (
    id SERIAL PRIMARY KEY, tenant_id INT,
    subcontractor_id INT, project_id INT,
    contract_no VARCHAR(50), work_description TEXT,
    contract_value NUMERIC(12,2), start_date DATE, end_date DATE,
    payment_terms TEXT,
    advance_paid NUMERIC(10,2) DEFAULT 0, total_paid NUMERIC(12,2) DEFAULT 0,
    retention_amount NUMERIC(10,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS re_subcontractor_bills (
    id SERIAL PRIMARY KEY, tenant_id INT,
    contract_id INT, subcontractor_id INT, project_id INT,
    bill_no VARCHAR(50), bill_date DATE,
    work_done_value NUMERIC(12,2), tds_rate NUMERIC(4,2) DEFAULT 2.0,
    tds_amount NUMERIC(10,2), net_payable NUMERIC(12,2),
    status VARCHAR(20) DEFAULT 'pending',
    paid_date DATE, payment_ref VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

router.get("/subcontractors", requireAuth, async (req: any, res) => {
  try {
    await ensureSubcontractorTables();
    const rows = await db.execute(sql`SELECT * FROM re_subcontractors WHERE tenant_id=${tid(req)} AND is_active=true ORDER BY name`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/subcontractors", requireAuth, async (req: any, res) => {
  try {
    await ensureSubcontractorTables();
    const { name, trade, gstin, pan, contact_person, phone, email, address, bank_account, bank_ifsc, rating } = req.body;
    const row = await db.execute(sql`INSERT INTO re_subcontractors (tenant_id, name, trade, gstin, pan, contact_person, phone, email, address, bank_account, bank_ifsc, rating) VALUES (${tid(req)}, ${name}, ${trade||null}, ${gstin||null}, ${pan||null}, ${contact_person||null}, ${phone||null}, ${email||null}, ${address||null}, ${bank_account||null}, ${bank_ifsc||null}, ${rating||3}) RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/subcontractors/summary", requireAuth, async (req: any, res) => {
  try {
    await ensureSubcontractorTables();
    const t = tid(req);
    const rows = await db.execute(sql`SELECT COALESCE(SUM(contract_value),0) AS total_contracts_value, COALESCE(SUM(total_paid),0) AS total_paid, COALESCE(SUM(retention_amount),0) AS total_retention FROM re_subcontractor_contracts WHERE tenant_id=${t} AND status != 'terminated'`);
    res.json(rows.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/subcontractors/:id", requireAuth, async (req: any, res) => {
  try {
    await ensureSubcontractorTables();
    const t = tid(req);
    const sc = await db.execute(sql`SELECT * FROM re_subcontractors WHERE id=${req.params.id} AND tenant_id=${t}`);
    if (!sc.rows[0]) return res.status(404).json({ error: 'Not found' });
    const contracts = await db.execute(sql`SELECT * FROM re_subcontractor_contracts WHERE subcontractor_id=${req.params.id} AND tenant_id=${t} AND status='active' ORDER BY created_at DESC`);
    res.json({ ...sc.rows[0], contracts: contracts.rows });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/subcontractor-contracts", requireAuth, async (req: any, res) => {
  try {
    await ensureSubcontractorTables();
    const { project_id } = req.query as any;
    const rows = await db.execute(sql`SELECT c.*, s.name as subcontractor_name, p.name as project_name FROM re_subcontractor_contracts c LEFT JOIN re_subcontractors s ON s.id=c.subcontractor_id LEFT JOIN re_projects p ON p.id=c.project_id WHERE c.tenant_id=${tid(req)} ${project_id ? sql`AND c.project_id=${project_id}` : sql``} ORDER BY c.created_at DESC`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/subcontractor-contracts", requireAuth, async (req: any, res) => {
  try {
    await ensureSubcontractorTables();
    const { subcontractor_id, project_id, contract_no, work_description, contract_value, start_date, end_date, payment_terms } = req.body;
    const row = await db.execute(sql`INSERT INTO re_subcontractor_contracts (tenant_id, subcontractor_id, project_id, contract_no, work_description, contract_value, start_date, end_date, payment_terms) VALUES (${tid(req)}, ${subcontractor_id}, ${project_id||null}, ${contract_no}, ${work_description||null}, ${contract_value||0}, ${start_date||null}, ${end_date||null}, ${payment_terms||null}) RETURNING *`);
    await db.execute(sql`UPDATE re_subcontractors SET total_contracts=total_contracts+${contract_value||0} WHERE id=${subcontractor_id} AND tenant_id=${tid(req)}`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/subcontractor-contracts/:id/complete", requireAuth, async (req: any, res) => {
  try {
    await ensureSubcontractorTables();
    const row = await db.execute(sql`UPDATE re_subcontractor_contracts SET status='completed' WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/subcontractor-bills", requireAuth, async (req: any, res) => {
  try {
    await ensureSubcontractorTables();
    const { contract_id, subcontractor_id, project_id, bill_no, bill_date, work_done_value, tds_rate } = req.body;
    const rate = Number(tds_rate || 2.0);
    const tds = Math.round(Number(work_done_value) * rate) / 100;
    const net = Number(work_done_value) - tds;
    const row = await db.execute(sql`INSERT INTO re_subcontractor_bills (tenant_id, contract_id, subcontractor_id, project_id, bill_no, bill_date, work_done_value, tds_rate, tds_amount, net_payable) VALUES (${tid(req)}, ${contract_id||null}, ${subcontractor_id}, ${project_id||null}, ${bill_no}, ${bill_date||null}, ${work_done_value||0}, ${rate}, ${tds}, ${net}) RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/subcontractor-bills/:id/approve", requireAuth, async (req: any, res) => {
  try {
    await ensureSubcontractorTables();
    const row = await db.execute(sql`UPDATE re_subcontractor_bills SET status='approved' WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/subcontractor-bills/:id/pay", requireAuth, async (req: any, res) => {
  try {
    await ensureSubcontractorTables();
    const t = tid(req);
    const { payment_ref } = req.body;
    const bill = await db.execute(sql`SELECT * FROM re_subcontractor_bills WHERE id=${req.params.id} AND tenant_id=${t}`);
    const b = bill.rows[0] as any;
    if (!b) return res.status(404).json({ error: 'Bill not found' });
    const row = await db.execute(sql`UPDATE re_subcontractor_bills SET status='paid', paid_date=CURRENT_DATE, payment_ref=${payment_ref||null} WHERE id=${req.params.id} AND tenant_id=${t} RETURNING *`);
    await db.execute(sql`UPDATE re_subcontractors SET total_paid=total_paid+${b.net_payable} WHERE id=${b.subcontractor_id} AND tenant_id=${t}`);
    await db.execute(sql`UPDATE re_subcontractor_contracts SET total_paid=total_paid+${b.net_payable} WHERE id=${b.contract_id} AND tenant_id=${t}`);
    const netPaise = Math.round(Number(b.net_payable) * 100);
    const tdsPaise = Math.round(Number(b.tds_amount) * 100);
    const totalPaise = netPaise + tdsPaise;
    createJournalWithLines(new Date().toISOString().slice(0,10), `Subcontractor Bill Payment ${b.bill_no}`, [{ accountCode: '2100', debit: totalPaise, credit: 0 }, { accountCode: '1002', debit: 0, credit: netPaise }, { accountCode: '2201', debit: 0, credit: tdsPaise }]).catch(e => console.error('GL subcontractor', e));
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── RERA Quarterly Report ────────────────────────────────────────────────────

async function ensureReraTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS re_rera_submissions (
    id SERIAL PRIMARY KEY, tenant_id INT, project_id INT,
    quarter INT, year INT, rera_no VARCHAR(100),
    units_total INT, units_sold INT, units_booked INT,
    collections_quarter NUMERIC(14,2), collections_cumulative NUMERIC(14,2),
    construction_completion_pct NUMERIC(5,2),
    status VARCHAR(20) DEFAULT 'draft',
    submitted_at TIMESTAMPTZ, ack_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

router.get("/rera/report", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    await ensureReraTables();
    const { quarter, year, project_id } = req.query as any;
    const q = parseInt(quarter||1), y = parseInt(year||new Date().getFullYear());
    const projects = await db.execute(sql`
      SELECT p.id, p.name, p.rera_no, p.total_units,
        COUNT(u.id) FILTER (WHERE u.status='sold') as sold,
        COUNT(u.id) FILTER (WHERE u.status='booked') as booked,
        COALESCE(SUM(c.amount) FILTER (WHERE EXTRACT(QUARTER FROM c.payment_date)=${q} AND EXTRACT(YEAR FROM c.payment_date)=${y}),0) as quarter_collections,
        p.construction_pct
      FROM re_projects p
      LEFT JOIN re_units u ON u.project_id=p.id AND u.tenant_id=${t}
      LEFT JOIN re_collections c ON c.project_id=p.id AND c.tenant_id=${t}
      WHERE p.tenant_id=${t} ${project_id ? sql`AND p.id=${parseInt(project_id)}` : sql``}
      GROUP BY p.id
    `).catch(async () => {
      // Fallback without re_collections which may not exist
      const r2 = await db.execute(sql`SELECT p.id, p.name, p.total_units, COUNT(u.id) FILTER (WHERE u.status='sold') as sold, COUNT(u.id) FILTER (WHERE u.status='booked') as booked FROM re_projects p LEFT JOIN re_units u ON u.project_id=p.id AND u.tenant_id=${t} WHERE p.tenant_id=${t} GROUP BY p.id`);
      return r2;
    });
    res.json({ quarter: q, year: y, projects: (projects as any).rows, report_type: 'RERA-Quarterly' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/rera/report/:projectId/submit", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    await ensureReraTables();
    const { quarter, year, construction_pct } = req.body;
    const proj = await db.execute(sql`SELECT * FROM re_projects WHERE id=${parseInt(req.params.projectId)} AND tenant_id=${t}`).catch(()=>({rows:[]}));
    if (!(proj as any).rows.length) return res.status(404).json({ message: 'Project not found' });
    const p = (proj as any).rows[0] as any;
    const ackNo = `RERA-ACK-${t}-${req.params.projectId}-Q${quarter}-${year}`;
    await db.execute(sql`INSERT INTO re_rera_submissions (tenant_id, project_id, quarter, year, rera_no, construction_completion_pct, status, submitted_at, ack_number)
      VALUES (${t}, ${parseInt(req.params.projectId)}, ${quarter||1}, ${year||new Date().getFullYear()}, ${p.rera_no||null}, ${construction_pct||0}, 'submitted', NOW(), ${ackNo})`);
    res.json({ ack_number: ackNo, status: 'submitted', message: process.env.RERA_API_KEY ? 'Submitted to RERA portal' : 'Simulation — RERA submission recorded' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Demand Letter PDF ─────────────────────────────────────────────────────────

router.post("/demand-letters/generate", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const { unit_id, installment_type, due_date, amount, notes } = req.body;
    const unit = await db.execute(sql`
      SELECT u.*, b.buyer_name, b.buyer_email, b.buyer_phone, b.buyer_address, p.name as project_name, p.rera_no
      FROM re_units u
      LEFT JOIN re_bookings b ON b.unit_id=u.id AND b.tenant_id=${t}
      LEFT JOIN re_projects p ON p.id=u.project_id AND p.tenant_id=${t}
      WHERE u.id=${parseInt(unit_id)} AND u.tenant_id=${t}
    `).catch(()=>({rows:[]}));
    if (!(unit as any).rows.length) return res.status(404).json({ message: 'Unit not found' });
    const u = (unit as any).rows[0] as any;
    const doc = new PDFDocument({size:'A4', margin:60});
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const demandNo = `DL-${t}-${unit_id}-${Date.now().toString().slice(-6)}`;
    doc.fontSize(14).font('Helvetica-Bold').text('PAYMENT DEMAND NOTICE',{align:'center'});
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text(`Ref: ${demandNo} | Date: ${new Date().toLocaleDateString('en-IN')}`,{align:'right'}).fillColor('#000');
    doc.moveDown(0.5);
    doc.text(`To,`);
    doc.font('Helvetica-Bold').text(u.buyer_name||'Dear Buyer');
    doc.font('Helvetica').text(u.buyer_address||'').text(u.buyer_phone||'').moveDown(0.5);
    doc.text(`Dear ${(u.buyer_name||'Sir/Madam').split(' ')[0]},`).moveDown(0.3);
    doc.text(`Sub: Demand Notice for ${installment_type||'Installment'} — Unit ${u.unit_no||u.id}, ${u.project_name||'Project'}`).moveDown(0.3);
    doc.text(`We wish to draw your attention to the payment schedule as per the Agreement for Sale dated ____________.`).moveDown(0.3);
    doc.text(`The following installment is now due for payment:`).moveDown(0.5);
    doc.font('Helvetica-Bold').text(`Installment: ${installment_type||'Current Installment'}`);
    doc.text(`Amount Due: ₹${parseFloat(amount||0).toLocaleString('en-IN')}`);
    doc.text(`Due Date: ${new Date(due_date||Date.now()).toLocaleDateString('en-IN')}`);
    doc.font('Helvetica').moveDown(0.5);
    if (notes) doc.text(notes).moveDown(0.3);
    doc.text(`Kindly remit the above amount within 7 days to avoid interest as per the agreement.`).moveDown(1);
    doc.text(`For payment: Bank Transfer / Cheque in favour of "Company Name"`).moveDown(0.3);
    doc.text(`RERA No: ${u.rera_no||'Applied For'}`).moveDown(2);
    doc.text('Authorised Signatory',{align:'right'}).text('(Company Name)',{align:'right'});
    doc.end();
    doc.on('end',()=>{
      res.setHeader('Content-Type','application/pdf');
      res.setHeader('Content-Disposition',`attachment; filename="Demand-Letter-${demandNo}.pdf"`);
      res.send(Buffer.concat(chunks));
    });
  } catch (e: any) { if (!res.headersSent) res.status(500).json({ error: e.message }); }
});

export default router;
