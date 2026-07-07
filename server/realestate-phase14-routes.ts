import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { createJournalWithLines } from "./journal-service";
import PDFDocument from "pdfkit";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
};
const tid = (req: any): number => req.session?.tenantId ?? req.user?.tenantId ?? 1;

// ── DB Setup ──────────────────────────────────────────────────────────────────
async function ensureTables() {
  // Demand letters (may already exist but ensure extra columns)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS re_demand_letters_v2 (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      project_id INT,
      unit_id INT,
      buyer_id INT,
      letter_no VARCHAR(100) UNIQUE,
      letter_date DATE DEFAULT CURRENT_DATE,
      demand_type VARCHAR(50) DEFAULT 'milestone',
      milestone_name VARCHAR(200),
      amount_demanded DECIMAL(15,2) DEFAULT 0,
      gst_amount DECIMAL(15,2) DEFAULT 0,
      total_amount DECIMAL(15,2) DEFAULT 0,
      due_date DATE,
      status VARCHAR(30) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS re_rera_submissions (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      project_id INT NOT NULL,
      year INT NOT NULL,
      quarter INT NOT NULL,
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      status VARCHAR(30) DEFAULT 'submitted',
      report_data JSONB,
      submission_no VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS re_broker_commissions (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      broker_id INT NOT NULL,
      booking_id INT,
      sale_id INT,
      commission_amount DECIMAL(15,2) DEFAULT 0,
      commission_pct DECIMAL(5,2) DEFAULT 0,
      status VARCHAR(30) DEFAULT 'pending',
      paid_date DATE,
      gl_posted BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}
ensureTables().catch(e => console.error("re_phase14 table setup:", e));

// ── Demand Letter PDF ─────────────────────────────────────────────────────────
// GET /api/real-estate/demand-letters/:id/pdf
router.get("/demand-letters/:id/pdf", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const { id } = req.params;

    // Try re_demand_letters (primary table)
    const dlRows = await db.execute(sql`
      SELECT dl.*,
             b.customer_name, b.customer_address, b.customer_phone, b.customer_email,
             u.unit_no, u.unit_type, u.area_sqft, u.floor_no,
             p.name as project_name, p.location as project_location
      FROM re_demand_letters dl
      LEFT JOIN re_bookings b ON b.id = dl.booking_id
      LEFT JOIN re_units u ON u.unit_no = dl.unit_number AND u.tenant_id = ${tenantId}
      LEFT JOIN re_projects p ON p.id = u.project_id
      WHERE dl.id = ${id} AND dl.tenant_id = ${tenantId}
      LIMIT 1
    `);
    if (!dlRows.rows.length) return res.status(404).json({ error: "Demand letter not found" });
    const dl = dlRows.rows[0] as any;

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=DL-${dl.demand_number || dl.letter_no || id}.pdf`);
    doc.pipe(res);

    // Letterhead
    doc.fontSize(16).font("Helvetica-Bold").text("SwachERP Developers Pvt. Ltd.", { align: "center" });
    doc.fontSize(9).font("Helvetica")
      .text("RERA Reg: MAHA/P/2024/001 | CIN: U45200MH2024PTC123456", { align: "center" })
      .text("123 Developer Road, Hyderabad – 500001 | Tel: 040-12345678 | GST: 36AAXXX1234X1ZY", { align: "center" });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Letter date & number
    const letterDate = dl.demand_date || dl.letter_date || new Date().toISOString().substring(0, 10);
    const letterNo = dl.demand_number || dl.letter_no || `DL-${id}`;
    doc.font("Helvetica").fontSize(10)
      .text(`Date: ${letterDate}`, { align: "right" })
      .text(`Letter No: ${letterNo}`, { align: "right" });
    doc.moveDown(0.5);

    // To address
    doc.font("Helvetica-Bold").fontSize(10).text("To,");
    doc.font("Helvetica").fontSize(10)
      .text(dl.customer_name || dl.buyer_name || "—")
      .text(dl.customer_address || "")
      .text(dl.customer_phone ? `Tel: ${dl.customer_phone}` : "");
    doc.moveDown(0.5);

    // Subject
    const milestoneLabel = dl.milestone || dl.milestone_name || "Payment Due";
    const unitLabel = dl.unit_no ? `Unit ${dl.unit_no}` : (dl.unit_number ? `Unit ${dl.unit_number}` : "");
    const projectLabel = dl.project_name || "";
    doc.font("Helvetica-Bold").fontSize(10)
      .text(`Subject: Demand for ${milestoneLabel} – ${unitLabel}${projectLabel ? `, ${projectLabel}` : ""}`, {});
    doc.moveDown(0.5);

    // Body
    doc.font("Helvetica").fontSize(10).text(
      `Dear ${dl.customer_name || "Sir/Madam"},\n\nThis is to inform you that the ${milestoneLabel} milestone has been reached for your unit. As per the payment schedule, the following amount is now due:`,
      { lineGap: 2 }
    );
    doc.moveDown(0.5);

    // Amount table
    const basicAmount = Number(dl.amount || dl.amount_demanded || 0);
    const gstAmount = Number(dl.gst_amount || 0);
    const totalAmount = Number(dl.total_amount || basicAmount + gstAmount);

    doc.font("Helvetica-Bold").text("Payment Breakup:");
    doc.moveDown(0.2);
    const rows2 = [
      ["Basic Amount", `₹${basicAmount.toLocaleString("en-IN")}`],
      ["GST (as applicable)", `₹${gstAmount.toLocaleString("en-IN")}`],
      ["Total Amount Due", `₹${totalAmount.toLocaleString("en-IN")}`],
    ];
    rows2.forEach(([label, val], i) => {
      const bold = i === rows2.length - 1;
      if (bold) doc.font("Helvetica-Bold"); else doc.font("Helvetica");
      doc.text(`${label}:`, 70, doc.y, { continued: true, width: 250 });
      doc.text(val, { width: 200, align: "right" });
    });
    doc.moveDown(0.5);

    // Due date
    const dueDate = dl.due_date || "—";
    doc.font("Helvetica-Bold").fillColor("red").text(`Due Date: ${dueDate}`).fillColor("black");
    doc.moveDown(0.5);

    // Payment instructions
    doc.font("Helvetica-Bold").text("Payment Instructions:");
    doc.font("Helvetica").text("Bank: HDFC Bank Ltd.");
    doc.text("Account Name: SwachERP Developers Pvt. Ltd.");
    doc.text("Account No: 50100012345678");
    doc.text("IFSC: HDFC0001234");
    doc.text(`Reference: ${letterNo}`);
    doc.moveDown(0.5);

    doc.font("Helvetica").fontSize(9).text(
      "Please arrange the payment before the due date to avoid interest charges. For any queries, contact our accounts team.",
      { lineGap: 2 }
    );
    doc.moveDown(1);

    // Signatory
    doc.font("Helvetica").text("Yours faithfully,").moveDown(0.3);
    doc.font("Helvetica-Bold").text("For SwachERP Developers Pvt. Ltd.");
    doc.moveDown(2);
    doc.font("Helvetica").text("Authorised Signatory");

    doc.end();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GL on Collection ──────────────────────────────────────────────────────────
// POST /api/real-estate/payment-schedules/:id/record-payment
router.post("/payment-schedules/:id/record-payment", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const { id } = req.params;
    const { paid_amount, gst_amount, payment_mode, paid_date, notes } = req.body;

    const paymentAmount = Number(paid_amount || 0);
    const gstAmt = Number(gst_amount || 0);
    const baseAmount = paymentAmount - gstAmt;

    const rows = await db.execute(sql`
      UPDATE re_payment_schedules
      SET paid_amount = ${paymentAmount}, paid_date = ${paid_date || null},
          payment_mode = ${payment_mode || null}, status = 'paid', notes = ${notes || null}
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);
    if (!rows.rows.length) return res.status(404).json({ error: "Payment schedule not found" });

    // GL: DR 1002 Bank | CR 4050 RE Revenue + 2201 GST Payable
    const glLines: any[] = [
      { accountId: 1002, debit: Math.round(paymentAmount * 100), credit: 0, narration: "Bank - RE Collection" },
      { accountId: 4050, debit: 0, credit: Math.round(baseAmount * 100), narration: "Real Estate Revenue" },
    ];
    if (gstAmt > 0) {
      glLines.push({ accountId: 2201, debit: 0, credit: Math.round(gstAmt * 100), narration: "GST Payable" });
    }

    createJournalWithLines({
      tenantId,
      date: paid_date || new Date().toISOString().substring(0, 10),
      narration: `RE Collection - Payment Schedule ${id}`,
      lines: glLines,
    }).catch(e => console.error("GL RE collection", e));

    res.json(rows.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── RERA Quarterly Report ─────────────────────────────────────────────────────
// GET /api/real-estate/rera/quarterly-report/:projectId/:year/:quarter
router.get("/rera/quarterly-report/:projectId/:year/:quarter", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const { projectId, year, quarter } = req.params;
    const q = parseInt(quarter);
    const yr = parseInt(year);
    const qStart = new Date(yr, (q - 1) * 3, 1).toISOString().substring(0, 10);
    const qEnd = new Date(yr, q * 3, 0).toISOString().substring(0, 10);

    const [proj, units, collections, progress] = await Promise.all([
      db.execute(sql`SELECT * FROM re_projects WHERE id=${projectId} AND tenant_id=${tenantId} LIMIT 1`),
      db.execute(sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status='available') as unsold,
          COUNT(*) FILTER (WHERE status IN ('booked','sold')) as sold
        FROM re_units WHERE project_id=${projectId} AND tenant_id=${tenantId}
      `),
      db.execute(sql`
        SELECT
          COALESCE(SUM(paid_amount),0) as quarter_collections,
          COALESCE(SUM(CASE WHEN paid_date < ${qStart} THEN paid_amount ELSE 0 END),0) as prior_collections
        FROM re_payment_schedules
        WHERE tenant_id=${tenantId}
          AND paid_date BETWEEN ${qStart} AND ${qEnd}
          AND booking_id IN (SELECT id FROM re_bookings WHERE unit_id IN (SELECT id FROM re_units WHERE project_id=${projectId}))
      `),
      db.execute(sql`
        SELECT percentage_complete FROM re_construction_progress
        WHERE project_id=${projectId} AND tenant_id=${tenantId}
        ORDER BY progress_date DESC LIMIT 1
      `),
    ]);

    const projectData = proj.rows[0] as any;
    if (!projectData) return res.status(404).json({ error: "Project not found" });
    const unitData = units.rows[0] as any;
    const collData = collections.rows[0] as any;
    const progressPct = Number((progress.rows[0] as any)?.percentage_complete || 0);

    const report = {
      form: "RERA-Form-1",
      project_id: projectId,
      project_name: projectData.name,
      rera_registration: projectData.rera_registration || "—",
      year: yr,
      quarter: q,
      period: `Q${q} ${yr} (${qStart} to ${qEnd})`,
      units: {
        total: Number(unitData?.total || 0),
        sold: Number(unitData?.sold || 0),
        unsold: Number(unitData?.unsold || 0),
      },
      collections: {
        this_quarter: Number(collData?.quarter_collections || 0),
        total_to_date: Number(collData?.quarter_collections || 0) + Number(collData?.prior_collections || 0),
      },
      construction_progress_pct: progressPct,
      complaints: { total: 0, resolved: 0, pending: 0 },
      generated_at: new Date().toISOString(),
    };

    res.json(report);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/real-estate/rera/quarterly-report/:projectId/:year/:quarter/xml
router.get("/rera/quarterly-report/:projectId/:year/:quarter/xml", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const { projectId, year, quarter } = req.params;
    const q = parseInt(quarter);
    const yr = parseInt(year);
    const qStart = new Date(yr, (q - 1) * 3, 1).toISOString().substring(0, 10);
    const qEnd = new Date(yr, q * 3, 0).toISOString().substring(0, 10);

    const [proj, units, progress] = await Promise.all([
      db.execute(sql`SELECT * FROM re_projects WHERE id=${projectId} AND tenant_id=${tenantId} LIMIT 1`),
      db.execute(sql`
        SELECT COUNT(*) as total,
          COUNT(*) FILTER (WHERE status IN ('booked','sold')) as sold
        FROM re_units WHERE project_id=${projectId} AND tenant_id=${tenantId}
      `),
      db.execute(sql`
        SELECT percentage_complete FROM re_construction_progress
        WHERE project_id=${projectId} AND tenant_id=${tenantId}
        ORDER BY progress_date DESC LIMIT 1
      `),
    ]);

    const pd = proj.rows[0] as any;
    if (!pd) return res.status(404).json({ error: "Project not found" });
    const ud = units.rows[0] as any;
    const pp = Number((progress.rows[0] as any)?.percentage_complete || 0);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<RERAQuarterlyReport>
  <FormNo>Form-1</FormNo>
  <ProjectName>${pd.name || ""}</ProjectName>
  <RERARegistration>${pd.rera_registration || ""}</RERARegistration>
  <ReportingPeriod>
    <Year>${yr}</Year>
    <Quarter>${q}</Quarter>
    <StartDate>${qStart}</StartDate>
    <EndDate>${qEnd}</EndDate>
  </ReportingPeriod>
  <Units>
    <Total>${ud?.total || 0}</Total>
    <Sold>${ud?.sold || 0}</Sold>
    <Unsold>${Number(ud?.total || 0) - Number(ud?.sold || 0)}</Unsold>
  </Units>
  <ConstructionProgress>
    <PercentageComplete>${pp}</PercentageComplete>
  </ConstructionProgress>
  <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
</RERAQuarterlyReport>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Content-Disposition", `attachment; filename=RERA-Q${q}-${yr}-P${projectId}.xml`);
    res.send(xml);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/real-estate/rera/submit-quarterly
router.post("/rera/submit-quarterly", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const { project_id, year, quarter, report_data } = req.body;
    const subNo = `RERA-${project_id}-Q${quarter}-${year}-${Date.now()}`;
    const rows = await db.execute(sql`
      INSERT INTO re_rera_submissions (tenant_id, project_id, year, quarter, report_data, submission_no, status)
      VALUES (${tenantId}, ${project_id}, ${year}, ${quarter}, ${JSON.stringify(report_data || {})}, ${subNo}, 'submitted')
      RETURNING *
    `);
    res.json(rows.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Project P&L ───────────────────────────────────────────────────────────────
// GET /api/real-estate/projects/:id/pnl
router.get("/projects/:id/pnl", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const { id } = req.params;

    const [projRow, collections, bookings] = await Promise.all([
      db.execute(sql`SELECT * FROM re_projects WHERE id=${id} AND tenant_id=${tenantId} LIMIT 1`),
      db.execute(sql`
        SELECT COALESCE(SUM(paid_amount),0) as total_collected
        FROM re_payment_schedules
        WHERE tenant_id=${tenantId}
          AND booking_id IN (SELECT id FROM re_bookings WHERE unit_id IN (SELECT id FROM re_units WHERE project_id=${id}))
      `),
      db.execute(sql`
        SELECT COALESCE(SUM(total_amount),0) as total_booked, COUNT(*) as bookings
        FROM re_bookings WHERE tenant_id=${tenantId}
          AND unit_id IN (SELECT id FROM re_units WHERE project_id=${id})
      `),
    ]);

    if (!projRow.rows.length) return res.status(404).json({ error: "Project not found" });
    const proj = projRow.rows[0] as any;
    const totalCollected = Number((collections.rows[0] as any)?.total_collected || 0);
    const totalBooked = Number((bookings.rows[0] as any)?.total_booked || 0);
    const bookingCount = Number((bookings.rows[0] as any)?.bookings || 0);

    res.json({
      project_id: id,
      project_name: proj.name,
      total_booked_amount: totalBooked,
      total_collected: totalCollected,
      pending_collections: totalBooked - totalCollected,
      booking_count: bookingCount,
      gross_margin_pct: totalBooked > 0 ? Math.round((totalCollected / totalBooked) * 100) : 0,
      note: "Cost-to-complete requires subcontract/material module integration",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Broker Commissions ────────────────────────────────────────────────────────
// GET /api/real-estate/brokers/:id/commissions
router.get("/brokers/:id/commissions", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const { id } = req.params;
    const rows = await db.execute(sql`
      SELECT c.*, b.name as broker_name, bk.booking_no, bk.customer_name
      FROM re_broker_commissions c
      LEFT JOIN re_brokers b ON b.id = c.broker_id
      LEFT JOIN re_bookings bk ON bk.id = c.booking_id
      WHERE c.tenant_id = ${tenantId} AND c.broker_id = ${id}
      ORDER BY c.created_at DESC
    `);
    res.json(rows.rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/real-estate/sales/:id/pay-commission
router.post("/sales/:id/pay-commission", requireAuth, async (req: any, res) => {
  try {
    const tenantId = tid(req);
    const { id } = req.params; // booking_id used as sale_id
    const { broker_id, commission_amount, paid_date } = req.body;

    const rows = await db.execute(sql`
      INSERT INTO re_broker_commissions (tenant_id, broker_id, booking_id, commission_amount, status, paid_date, gl_posted)
      VALUES (${tenantId}, ${broker_id}, ${id}, ${commission_amount || 0}, 'paid', ${paid_date || null}, TRUE)
      RETURNING *
    `);

    const amountPaise = Math.round(Number(commission_amount || 0) * 100);
    createJournalWithLines({
      tenantId,
      date: paid_date || new Date().toISOString().substring(0, 10),
      narration: `Broker Commission - Booking ${id}`,
      lines: [
        { accountId: 6200, debit: amountPaise, credit: 0, narration: "Broker Commission Expense" },
        { accountId: 2100, debit: 0, credit: amountPaise, narration: "AP - Broker Payable" },
      ],
    }).catch(e => console.error("GL broker commission", e));

    res.json(rows.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
