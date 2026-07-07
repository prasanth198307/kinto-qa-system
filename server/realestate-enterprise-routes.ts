import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const router = Router();

function getTenantId(req: any): number {
  return req.session?.tenantId ?? req.user?.tenantId;
}

function auth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

// ── Leads ─────────────────────────────────────────────────────────────────────

router.get("/leads", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM re_leads WHERE tenant_id=${tid} ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/leads", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, phone, email, source, project_id, budget, notes } = req.body;
    const r = await db.execute(sql`
      INSERT INTO re_leads (tenant_id, name, phone, email, source, project_id, budget, notes, stage, created_at)
      VALUES (${tid}, ${name}, ${phone}, ${email}, ${source}, ${project_id}, ${budget}, ${notes}, 'new', NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/leads/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, phone, email, source, project_id, budget, notes } = req.body;
    const r = await db.execute(sql`
      UPDATE re_leads SET name=${name}, phone=${phone}, email=${email}, source=${source},
        project_id=${project_id}, budget=${budget}, notes=${notes}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/leads/:id/stage", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { stage } = req.body;
    const r = await db.execute(sql`
      UPDATE re_leads SET stage=${stage}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/leads/pipeline", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const stages = await db.execute(sql`
      SELECT stage, COUNT(*) as count FROM re_leads WHERE tenant_id=${tid} GROUP BY stage`);
    const leadsAll = await db.execute(sql`SELECT * FROM re_leads WHERE tenant_id=${tid} ORDER BY stage, created_at DESC`);
    const leadsMap: Record<string, any[]> = {};
    for (const lead of leadsAll.rows as any[]) {
      if (!leadsMap[lead.stage]) leadsMap[lead.stage] = [];
      leadsMap[lead.stage].push(lead);
    }
    const pipeline = (stages.rows as any[]).map((s) => ({ stage: s.stage, count: s.count, leads: leadsMap[s.stage] || [] }));
    res.json(pipeline);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Site Visits ───────────────────────────────────────────────────────────────

router.get("/site-visits", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT sv.*, l.name as lead_name, p.name as project_name
      FROM re_site_visits sv
      LEFT JOIN re_leads l ON l.id = sv.lead_id
      LEFT JOIN re_projects p ON p.id = sv.project_id
      WHERE sv.tenant_id=${tid} ORDER BY sv.visit_date DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/site-visits", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { lead_id, project_id, visit_date, assigned_to, notes } = req.body;
    const r = await db.execute(sql`
      INSERT INTO re_site_visits (tenant_id, lead_id, project_id, visit_date, assigned_to, notes, status, created_at)
      VALUES (${tid}, ${lead_id}, ${project_id}, ${visit_date}, ${assigned_to}, ${notes}, 'scheduled', NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/site-visits/:id/outcome", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { outcome, feedback, follow_up_date } = req.body;
    const r = await db.execute(sql`
      UPDATE re_site_visits SET outcome=${outcome}, feedback=${feedback}, follow_up_date=${follow_up_date},
        status='completed', updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Cost Sheets ───────────────────────────────────────────────────────────────

router.get("/cost-sheets/:unitId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM re_cost_sheets WHERE unit_id=${req.params.unitId} AND tenant_id=${tid}`);
    res.json(r.rows[0] || null);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/cost-sheets", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { unit_id, base_price, floor_rise, corner_premium, car_parking, club_house, misc_charges, gst_rate } = req.body;
    const total = (base_price || 0) + (floor_rise || 0) + (corner_premium || 0) + (car_parking || 0) + (club_house || 0) + (misc_charges || 0);
    const gst_amount = total * ((gst_rate || 0) / 100);
    const r = await db.execute(sql`
      INSERT INTO re_cost_sheets (tenant_id, unit_id, base_price, floor_rise, corner_premium, car_parking, club_house, misc_charges, gst_rate, gst_amount, total_amount, created_at)
      VALUES (${tid}, ${unit_id}, ${base_price}, ${floor_rise}, ${corner_premium}, ${car_parking}, ${club_house}, ${misc_charges}, ${gst_rate}, ${gst_amount}, ${total + gst_amount}, NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/cost-sheets/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { base_price, floor_rise, corner_premium, car_parking, club_house, misc_charges, gst_rate } = req.body;
    const total = (base_price || 0) + (floor_rise || 0) + (corner_premium || 0) + (car_parking || 0) + (club_house || 0) + (misc_charges || 0);
    const gst_amount = total * ((gst_rate || 0) / 100);
    const r = await db.execute(sql`
      UPDATE re_cost_sheets SET base_price=${base_price}, floor_rise=${floor_rise}, corner_premium=${corner_premium},
        car_parking=${car_parking}, club_house=${club_house}, misc_charges=${misc_charges},
        gst_rate=${gst_rate}, gst_amount=${gst_amount}, total_amount=${total + gst_amount}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Unit Blocking ─────────────────────────────────────────────────────────────

router.post("/units/:id/block", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { lead_id, block_reason, block_end, block_amount } = req.body;
    await db.execute(sql`
      INSERT INTO re_unit_blocks (tenant_id, unit_id, lead_id, block_reason, block_end, block_amount, is_active, created_at)
      VALUES (${tid}, ${req.params.id}, ${lead_id}, ${block_reason}, ${block_end}, ${block_amount}, 1, NOW())`);
    await db.execute(sql`UPDATE re_units SET status='blocked', updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/units/:id/unblock", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    await db.execute(sql`UPDATE re_unit_blocks SET is_active=0, updated_at=NOW() WHERE unit_id=${req.params.id} AND tenant_id=${tid} AND is_active=1`);
    await db.execute(sql`UPDATE re_units SET status='available', updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Price Escalations ─────────────────────────────────────────────────────────

router.get("/price-escalations/:projectId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT * FROM re_price_escalations WHERE project_id=${req.params.projectId} AND tenant_id=${tid} ORDER BY effective_date DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/price-escalations", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { project_id, escalation_pct, new_base_rate, effective_date, reason } = req.body;
    const r = await db.execute(sql`
      INSERT INTO re_price_escalations (tenant_id, project_id, escalation_pct, new_base_rate, effective_date, reason, created_at)
      VALUES (${tid}, ${project_id}, ${escalation_pct}, ${new_base_rate}, ${effective_date}, ${reason}, NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Bookings ──────────────────────────────────────────────────────────────────

router.post("/bookings/:id/cancel", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { cancellation_reason, cancellation_charge } = req.body;
    const booking = await db.execute(sql`SELECT * FROM re_bookings WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (!booking.rows[0]) return res.status(404).json({ message: "Booking not found" });
    const b: any = booking.rows[0];
    await db.execute(sql`
      UPDATE re_bookings SET status='cancelled', cancellation_date=NOW(), cancellation_reason=${cancellation_reason},
        cancellation_charge=${cancellation_charge}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    await db.execute(sql`UPDATE re_units SET status='available', updated_at=NOW() WHERE id=${b.unit_id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/bookings/:id/payment-dues", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT ps.*, (ps.due_date < NOW() AND ps.paid_amount < ps.due_amount) as is_overdue
      FROM re_payment_schedules ps
      WHERE ps.booking_id=${req.params.id} AND ps.tenant_id=${tid}
      ORDER BY ps.due_date ASC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Brokers ───────────────────────────────────────────────────────────────────

router.get("/brokers/:id/commission-report", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT rb.*, b.name as broker_name, u.unit_number,
        rb.commission_amount,
        CASE WHEN rb.commission_paid=1 THEN 'paid' ELSE 'pending' END as commission_status
      FROM re_bookings rb
      JOIN re_brokers b ON b.id = rb.broker_id
      JOIN re_units u ON u.id = rb.unit_id
      WHERE rb.broker_id=${req.params.id} AND rb.tenant_id=${tid}
      ORDER BY rb.booking_date DESC`);
    const summary = await db.execute(sql`
      SELECT
        SUM(commission_amount) as total_commission,
        SUM(CASE WHEN commission_paid=1 THEN commission_amount ELSE 0 END) as commission_paid,
        SUM(CASE WHEN commission_paid=0 OR commission_paid IS NULL THEN commission_amount ELSE 0 END) as commission_pending
      FROM re_bookings WHERE broker_id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ bookings: r.rows, summary: summary.rows[0] });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/brokers/:id/mark-commission-paid", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { booking_id } = req.body;
    const r = await db.execute(sql`
      UPDATE re_bookings SET commission_paid=1, commission_paid_date=NOW(), updated_at=NOW()
      WHERE id=${booking_id} AND broker_id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Construction Costs ────────────────────────────────────────────────────────

router.get("/construction-costs/:projectId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT * FROM re_construction_costs WHERE project_id=${req.params.projectId} AND tenant_id=${tid} ORDER BY cost_date DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/construction-costs", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { project_id, category, description, budget_amount, actual_amount, cost_date, vendor } = req.body;
    const r = await db.execute(sql`
      INSERT INTO re_construction_costs (tenant_id, project_id, category, description, budget_amount, actual_amount, cost_date, vendor, created_at)
      VALUES (${tid}, ${project_id}, ${category}, ${description}, ${budget_amount}, ${actual_amount}, ${cost_date}, ${vendor}, NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/construction-costs/budget-actual/:projectId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT category,
        SUM(budget_amount) as total_budget,
        SUM(actual_amount) as total_actual,
        SUM(budget_amount) - SUM(actual_amount) as variance
      FROM re_construction_costs
      WHERE project_id=${req.params.projectId} AND tenant_id=${tid}
      GROUP BY category ORDER BY category`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Documents ─────────────────────────────────────────────────────────────────

router.get("/documents/:projectId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT * FROM re_documents WHERE project_id=${req.params.projectId} AND tenant_id=${tid} ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/documents", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { project_id, document_name, document_type, file_url, is_public } = req.body;
    const r = await db.execute(sql`
      INSERT INTO re_documents (tenant_id, project_id, document_name, document_type, file_url, is_public, created_at)
      VALUES (${tid}, ${project_id}, ${document_name}, ${document_type}, ${file_url}, ${is_public ?? false}, NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.delete("/documents/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    await db.execute(sql`DELETE FROM re_documents WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Customer Portal ───────────────────────────────────────────────────────────

router.post("/customer-portal/create", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { booking_id, customer_name, phone, email } = req.body;
    const portal_token = uuidv4();
    const r = await db.execute(sql`
      INSERT INTO re_customer_portal (tenant_id, booking_id, customer_name, phone, email, portal_token, created_at)
      VALUES (${tid}, ${booking_id}, ${customer_name}, ${phone}, ${email}, ${portal_token}, NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// PUBLIC — no auth
router.get("/customer-portal/:token", async (req: any, res: any) => {
  try {
    const portal = await db.execute(sql`SELECT * FROM re_customer_portal WHERE portal_token=${req.params.token}`);
    if (!portal.rows[0]) return res.status(404).json({ message: "Invalid portal link" });
    const p: any = portal.rows[0];

    const booking = await db.execute(sql`SELECT * FROM re_bookings WHERE id=${p.booking_id}`);
    const schedule = await db.execute(sql`
      SELECT * FROM re_payment_schedules WHERE booking_id=${p.booking_id} ORDER BY due_date ASC`);
    const documents = await db.execute(sql`
      SELECT * FROM re_documents WHERE project_id=(SELECT project_id FROM re_bookings WHERE id=${p.booking_id}) AND is_public=true`);

    res.json({ portal: p, booking: booking.rows[0], payment_schedule: schedule.rows, documents: documents.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Society Charges ───────────────────────────────────────────────────────────

router.get("/society/charges/:projectId/:month", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT sc.*, u.unit_number FROM re_society_charges sc
      JOIN re_units u ON u.id = sc.unit_id
      WHERE sc.project_id=${req.params.projectId} AND sc.month=${req.params.month} AND sc.tenant_id=${tid}
      ORDER BY u.unit_number`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/society/charges/generate", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { project_id, month, maintenance_charge, sinking_fund, water_charge } = req.body;
    const units = await db.execute(sql`SELECT * FROM re_units WHERE project_id=${project_id} AND status='possessed' AND tenant_id=${tid}`);
    const total_charge = (maintenance_charge || 0) + (sinking_fund || 0) + (water_charge || 0);
    const inserted = [];
    for (const unit of units.rows as any[]) {
      const r = await db.execute(sql`
        INSERT INTO re_society_charges (tenant_id, project_id, unit_id, month, maintenance_charge, sinking_fund, water_charge, total_charge, paid_amount, status, created_at)
        VALUES (${tid}, ${project_id}, ${unit.id}, ${month}, ${maintenance_charge}, ${sinking_fund}, ${water_charge}, ${total_charge}, 0, 'pending', NOW())
        ON CONFLICT (unit_id, month) DO NOTHING
        RETURNING *`);
      if (r.rows[0]) inserted.push(r.rows[0]);
    }
    res.json({ generated: inserted.length, charges: inserted });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/society/charges/:id/mark-paid", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { paid_amount, payment_mode } = req.body;
    const r = await db.execute(sql`
      UPDATE re_society_charges
      SET paid_amount=${paid_amount}, payment_mode=${payment_mode}, payment_date=NOW(), status='paid', updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── RERA ─────────────────────────────────────────────────────────────────────

router.get("/rera/projects", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM re_projects WHERE tenant_id=${tid} ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/rera/quarterly-report/:projectId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const project = await db.execute(sql`SELECT * FROM re_projects WHERE id=${req.params.projectId} AND tenant_id=${tid}`);
    if (!project.rows[0]) return res.status(404).json({ message: "Project not found" });

    const units = await db.execute(sql`
      SELECT status, COUNT(*) as count FROM re_units WHERE project_id=${req.params.projectId} AND tenant_id=${tid} GROUP BY status`);
    const bookings = await db.execute(sql`
      SELECT COUNT(*) as total_bookings, SUM(booking_amount) as total_value
      FROM re_bookings WHERE project_id=${req.params.projectId} AND tenant_id=${tid} AND status != 'cancelled'`);
    const construction = await db.execute(sql`
      SELECT SUM(actual_amount) as total_spent FROM re_construction_costs WHERE project_id=${req.params.projectId} AND tenant_id=${tid}`);

    res.json({
      project: project.rows[0],
      unit_summary: units.rows,
      booking_summary: bookings.rows[0],
      construction_summary: construction.rows[0],
      generated_at: new Date().toISOString(),
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Reports ───────────────────────────────────────────────────────────────────

router.get("/reports/sales-velocity", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const weekly = await db.execute(sql`
      SELECT DATE_TRUNC('week', booking_date) as week, COUNT(*) as bookings
      FROM re_bookings WHERE tenant_id=${tid} AND status != 'cancelled'
      GROUP BY week ORDER BY week DESC LIMIT 12`);
    const monthly = await db.execute(sql`
      SELECT DATE_TRUNC('month', booking_date) as month, COUNT(*) as bookings
      FROM re_bookings WHERE tenant_id=${tid} AND status != 'cancelled'
      GROUP BY month ORDER BY month DESC LIMIT 12`);
    res.json({ weekly: weekly.rows, monthly: monthly.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/inventory-aging", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT u.unit_number, u.unit_type, u.status, p.name as project_name,
        EXTRACT(DAY FROM NOW() - p.launch_date) as days_since_launch
      FROM re_units u
      JOIN re_projects p ON p.id = u.project_id
      WHERE u.status='available' AND u.tenant_id=${tid}
      ORDER BY days_since_launch DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/collection-efficiency", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT
        SUM(due_amount) as total_demanded,
        SUM(paid_amount) as total_collected,
        ROUND(SUM(paid_amount) * 100.0 / NULLIF(SUM(due_amount), 0), 2) as collection_efficiency_pct
      FROM re_payment_schedules WHERE tenant_id=${tid}`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/broker-performance", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT b.id as broker_id, b.name as broker_name,
        COUNT(rb.id) as total_bookings,
        SUM(rb.booking_amount) as total_value,
        SUM(rb.commission_amount) as total_commission,
        SUM(CASE WHEN rb.commission_paid=1 THEN rb.commission_amount ELSE 0 END) as commission_paid
      FROM re_brokers b
      LEFT JOIN re_bookings rb ON rb.broker_id = b.id AND rb.tenant_id=${tid} AND rb.status != 'cancelled'
      WHERE b.tenant_id=${tid}
      GROUP BY b.id, b.name ORDER BY total_bookings DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/project-profitability", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT p.id, p.name as project_name,
        COALESCE(SUM(rb.booking_amount), 0) as total_revenue,
        COALESCE(SUM(cc.actual_amount), 0) as total_cost,
        COALESCE(SUM(rb.booking_amount), 0) - COALESCE(SUM(cc.actual_amount), 0) as gross_profit
      FROM re_projects p
      LEFT JOIN re_bookings rb ON rb.project_id = p.id AND rb.tenant_id=${tid} AND rb.status != 'cancelled'
      LEFT JOIN re_construction_costs cc ON cc.project_id = p.id AND cc.tenant_id=${tid}
      WHERE p.tenant_id=${tid}
      GROUP BY p.id, p.name ORDER BY gross_profit DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/demand-vs-collection", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT DATE_TRUNC('month', due_date) as month,
        SUM(due_amount) as demanded,
        SUM(paid_amount) as collected,
        SUM(due_amount) - SUM(paid_amount) as outstanding
      FROM re_payment_schedules WHERE tenant_id=${tid}
      GROUP BY month ORDER BY month DESC LIMIT 12`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/unit-status-inventory", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT status, COUNT(*) as count FROM re_units WHERE tenant_id=${tid} GROUP BY status`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Construction Bank Loan Tracking ──────────────────────────────────────────
router.get("/construction-loans", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS re_construction_loans (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
      loan_no VARCHAR(50) NOT NULL, project_id INT,
      bank_name VARCHAR(200) NOT NULL, branch_name VARCHAR(200),
      sanction_amount NUMERIC(16,2) NOT NULL,
      disbursed_amount NUMERIC(16,2) DEFAULT 0,
      outstanding_amount NUMERIC(16,2) DEFAULT 0,
      interest_rate NUMERIC(6,3),
      loan_type VARCHAR(50) DEFAULT 'construction',
      sanction_date DATE, first_disbursement_date DATE,
      tenure_months INT, moratorium_months INT DEFAULT 0,
      emi_start_date DATE, emi_amount NUMERIC(14,2),
      collateral TEXT,
      loan_account_no VARCHAR(100),
      status VARCHAR(30) DEFAULT 'active',
      notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), record_status INT DEFAULT 1
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS re_loan_drawdowns (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, loan_id INT NOT NULL,
      drawdown_no VARCHAR(50), drawdown_date DATE NOT NULL DEFAULT CURRENT_DATE,
      amount NUMERIC(14,2) NOT NULL,
      stage VARCHAR(100),
      utilization VARCHAR(200),
      bank_reference VARCHAR(100),
      inspected_by VARCHAR(200), inspection_date DATE,
      approved_by VARCHAR(200), approved_date DATE,
      status VARCHAR(20) DEFAULT 'requested',
      notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    const { project_id } = req.query;
    let q = sql`SELECT l.*, p.name as project_name,
      (SELECT COUNT(*) FROM re_loan_drawdowns d WHERE d.loan_id=l.id) as drawdown_count
      FROM re_construction_loans l
      LEFT JOIN re_projects p ON p.id = l.project_id
      WHERE l.tenant_id=${t} AND l.record_status=1`;
    if (project_id) q = sql`${q} AND l.project_id=${parseInt(project_id as string)}`;
    q = sql`${q} ORDER BY l.created_at DESC`;
    const rows = await db.execute(q);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/construction-loans", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  const { loan_no, project_id, bank_name, branch_name, sanction_amount, interest_rate, loan_type, sanction_date, tenure_months, moratorium_months, emi_start_date, emi_amount, collateral, loan_account_no, notes } = req.body;
  try {
    const r = await db.execute(sql`INSERT INTO re_construction_loans (tenant_id, loan_no, project_id, bank_name, branch_name, sanction_amount, outstanding_amount, interest_rate, loan_type, sanction_date, tenure_months, moratorium_months, emi_start_date, emi_amount, collateral, loan_account_no, notes) VALUES (${t}, ${loan_no||'LOAN-'+Date.now()}, ${project_id||null}, ${bank_name}, ${branch_name||null}, ${sanction_amount}, ${sanction_amount}, ${interest_rate||null}, ${loan_type||'construction'}, ${sanction_date||null}, ${tenure_months||null}, ${moratorium_months||0}, ${emi_start_date||null}, ${emi_amount||null}, ${collateral||null}, ${loan_account_no||null}, ${notes||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/construction-loans/:id/drawdowns", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM re_loan_drawdowns WHERE loan_id=${parseInt(req.params.id)} AND tenant_id=${t} ORDER BY drawdown_date`);
    const total = rows.rows.reduce((s: number, r: any) => s + Number(r.amount||0), 0);
    res.json({ drawdowns: rows.rows, total_drawn: total });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/construction-loans/:id/drawdowns", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  const { drawdown_date, amount, stage, utilization, bank_reference, inspected_by, inspection_date, approved_by, approved_date, notes } = req.body;
  try {
    const loanId = parseInt(req.params.id);
    const count = await db.execute(sql`SELECT COUNT(*) as n FROM re_loan_drawdowns WHERE loan_id=${loanId}`);
    const seq = String(Number((count.rows[0] as any).n) + 1).padStart(3,'0');
    const ddNo = `DD-${loanId}-${seq}`;
    const r = await db.execute(sql`INSERT INTO re_loan_drawdowns (tenant_id, loan_id, drawdown_no, drawdown_date, amount, stage, utilization, bank_reference, inspected_by, inspection_date, approved_by, approved_date, notes) VALUES (${t}, ${loanId}, ${ddNo}, ${drawdown_date||new Date().toISOString().slice(0,10)}, ${amount}, ${stage||null}, ${utilization||null}, ${bank_reference||null}, ${inspected_by||null}, ${inspection_date||null}, ${approved_by||null}, ${approved_date||null}, ${notes||null}) RETURNING *`);
    await db.execute(sql`UPDATE re_construction_loans SET disbursed_amount = disbursed_amount + ${amount}, outstanding_amount = outstanding_amount - ${amount} WHERE id=${loanId} AND tenant_id=${t}`);
    try {
      const { createJournalWithLines } = await import('./journal-service');
      await createJournalWithLines(
        drawdown_date || new Date().toISOString().slice(0,10),
        `Construction loan drawdown — ${ddNo}`,
        [
          { accountCode: '1002', debit: Math.round(Number(amount)*100), credit: 0, memo: 'Bank — loan proceeds received' },
          { accountCode: '2500', debit: 0, credit: Math.round(Number(amount)*100), memo: 'Construction loan payable' },
        ],
        { sourceType: 're_loan_drawdown', sourceId: String((r.rows[0] as any).id), isAutoGenerated: true }
      );
    } catch {}
    res.json(r.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/construction-loans/:id", auth, async (req: any, res: any) => {
  const { status, notes, interest_rate, emi_amount } = req.body;
  try {
    const r = await db.execute(sql`UPDATE re_construction_loans SET status=${status||'active'}, notes=${notes||null}, interest_rate=${interest_rate||null}, emi_amount=${emi_amount||null} WHERE id=${parseInt(req.params.id)} AND tenant_id=${getTenantId(req)} RETURNING *`);
    res.json(r.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

// ── Real Estate Subcontractor Billing ────────────────────────────────────────
router.get("/subcontractors", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS re_subcontractors (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
      name VARCHAR(200) NOT NULL, trade VARCHAR(100),
      contact_person VARCHAR(200), phone VARCHAR(20), email VARCHAR(200),
      gstin VARCHAR(20), pan VARCHAR(12), bank_name VARCHAR(200),
      bank_account VARCHAR(50), bank_ifsc VARCHAR(15),
      address TEXT, rating INT DEFAULT 3,
      status VARCHAR(20) DEFAULT 'active', notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), record_status INT DEFAULT 1
    )`);
    const rows = await db.execute(sql`SELECT * FROM re_subcontractors WHERE tenant_id=${t} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/subcontractors", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  const { name, trade, contact_person, phone, email, gstin, pan, bank_name, bank_account, bank_ifsc, address, rating, notes } = req.body;
  try {
    const r = await db.execute(sql`INSERT INTO re_subcontractors (tenant_id, name, trade, contact_person, phone, email, gstin, pan, bank_name, bank_account, bank_ifsc, address, rating, notes) VALUES (${t}, ${name}, ${trade||null}, ${contact_person||null}, ${phone||null}, ${email||null}, ${gstin||null}, ${pan||null}, ${bank_name||null}, ${bank_account||null}, ${bank_ifsc||null}, ${address||null}, ${rating||3}, ${notes||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/subcontractors/:id", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  const { name, trade, contact_person, phone, email, gstin, pan, status, rating, notes } = req.body;
  try {
    const r = await db.execute(sql`UPDATE re_subcontractors SET name=${name}, trade=${trade||null}, contact_person=${contact_person||null}, phone=${phone||null}, email=${email||null}, gstin=${gstin||null}, pan=${pan||null}, status=${status||'active'}, rating=${rating||3}, notes=${notes||null} WHERE id=${parseInt(req.params.id)} AND tenant_id=${t} RETURNING *`);
    res.json(r.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/subcontract-work-orders", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS re_subcontract_work_orders (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
      wo_no VARCHAR(50) NOT NULL, project_id INT, subcontractor_id INT NOT NULL,
      scope_of_work TEXT NOT NULL, trade VARCHAR(100),
      start_date DATE, end_date DATE, actual_completion DATE,
      contract_value NUMERIC(14,2) DEFAULT 0,
      advance_paid NUMERIC(14,2) DEFAULT 0,
      total_billed NUMERIC(14,2) DEFAULT 0,
      total_paid NUMERIC(14,2) DEFAULT 0,
      retention_pct NUMERIC(5,2) DEFAULT 5,
      tds_pct NUMERIC(5,2) DEFAULT 1,
      status VARCHAR(30) DEFAULT 'draft',
      notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), record_status INT DEFAULT 1
    )`);
    const { project_id } = req.query;
    let q = sql`SELECT wo.*, sc.name as subcontractor_name, sc.trade as subcontractor_trade, sc.phone as sub_phone,
      p.name as project_name
      FROM re_subcontract_work_orders wo
      LEFT JOIN re_subcontractors sc ON sc.id=wo.subcontractor_id
      LEFT JOIN re_projects p ON p.id=wo.project_id
      WHERE wo.tenant_id=${t} AND wo.record_status=1`;
    if (project_id) q = sql`${q} AND wo.project_id=${parseInt(project_id as string)}`;
    q = sql`${q} ORDER BY wo.created_at DESC`;
    const rows = await db.execute(q);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/subcontract-work-orders", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  const { project_id, subcontractor_id, scope_of_work, trade, start_date, end_date, contract_value, advance_paid, retention_pct, tds_pct, notes } = req.body;
  try {
    const count = await db.execute(sql`SELECT COUNT(*) as n FROM re_subcontract_work_orders WHERE tenant_id=${t}`);
    const woNo = `SC-WO-${new Date().getFullYear()}-${String(Number((count.rows[0] as any).n)+1).padStart(4,'0')}`;
    const r = await db.execute(sql`INSERT INTO re_subcontract_work_orders (tenant_id, wo_no, project_id, subcontractor_id, scope_of_work, trade, start_date, end_date, contract_value, advance_paid, retention_pct, tds_pct, notes, status) VALUES (${t}, ${woNo}, ${project_id||null}, ${subcontractor_id}, ${scope_of_work}, ${trade||null}, ${start_date||null}, ${end_date||null}, ${contract_value||0}, ${advance_paid||0}, ${retention_pct??5}, ${tds_pct??1}, ${notes||null}, 'active') RETURNING *`);
    res.json(r.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/subcontract-bills", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  const { work_order_id } = req.query;
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS re_subcontract_bills (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
      bill_no VARCHAR(50) NOT NULL, work_order_id INT NOT NULL,
      bill_date DATE NOT NULL DEFAULT CURRENT_DATE, billing_period_from DATE, billing_period_to DATE,
      gross_amount NUMERIC(14,2) DEFAULT 0,
      advance_recovery NUMERIC(14,2) DEFAULT 0,
      retention_amount NUMERIC(14,2) DEFAULT 0,
      tds_amount NUMERIC(14,2) DEFAULT 0,
      net_payable NUMERIC(14,2) DEFAULT 0,
      paid_amount NUMERIC(14,2) DEFAULT 0, payment_date DATE,
      payment_mode VARCHAR(50), bank_reference VARCHAR(100),
      status VARCHAR(20) DEFAULT 'pending',
      work_description TEXT, notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), record_status INT DEFAULT 1
    )`);
    let q = sql`SELECT b.*, wo.wo_no, wo.scope_of_work, wo.contract_value, sc.name as subcontractor_name
      FROM re_subcontract_bills b
      LEFT JOIN re_subcontract_work_orders wo ON wo.id=b.work_order_id
      LEFT JOIN re_subcontractors sc ON sc.id=wo.subcontractor_id
      WHERE b.tenant_id=${t} AND b.record_status=1`;
    if (work_order_id) q = sql`${q} AND b.work_order_id=${parseInt(work_order_id as string)}`;
    q = sql`${q} ORDER BY b.bill_date DESC`;
    const rows = await db.execute(q);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/subcontract-bills", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  const { work_order_id, bill_date, billing_period_from, billing_period_to, gross_amount, advance_recovery, work_description, notes } = req.body;
  try {
    const wo = await db.execute(sql`SELECT * FROM re_subcontract_work_orders WHERE id=${parseInt(work_order_id)} AND tenant_id=${t}`);
    if (!wo.rows[0]) return res.status(404).json({ message: 'Work order not found' });
    const w = wo.rows[0] as any;
    const gross = Number(gross_amount||0);
    const advRec = Number(advance_recovery||0);
    const retention = gross * (Number(w.retention_pct||5)) / 100;
    const tds = gross * (Number(w.tds_pct||1)) / 100;
    const netPayable = gross - advRec - retention - tds;
    const billNo = `SCB-${Date.now().toString().slice(-6)}`;
    const r = await db.execute(sql`INSERT INTO re_subcontract_bills (tenant_id, bill_no, work_order_id, bill_date, billing_period_from, billing_period_to, gross_amount, advance_recovery, retention_amount, tds_amount, net_payable, work_description, notes)
      VALUES (${t}, ${billNo}, ${parseInt(work_order_id)}, ${bill_date||new Date().toISOString().slice(0,10)}, ${billing_period_from||null}, ${billing_period_to||null}, ${gross}, ${advRec}, ${retention}, ${tds}, ${netPayable}, ${work_description||null}, ${notes||null}) RETURNING *`);
    await db.execute(sql`UPDATE re_subcontract_work_orders SET total_billed = total_billed + ${gross} WHERE id=${parseInt(work_order_id)} AND tenant_id=${t}`);
    try {
      const { createJournalWithLines } = await import('./journal-service');
      await createJournalWithLines(
        bill_date || new Date().toISOString().slice(0,10),
        `Subcontract bill — ${billNo}`,
        [
          { accountCode: '5100', debit: Math.round(gross*100), credit: 0, memo: 'Construction/subcontract expense' },
          { accountCode: '2100', debit: 0, credit: Math.round(netPayable*100), memo: 'Subcontractor payable (AP)' },
          { accountCode: '2201', debit: 0, credit: Math.round(tds*100), memo: 'TDS payable' },
          { accountCode: '2100', debit: 0, credit: Math.round(retention*100), memo: 'Retention payable' },
        ],
        { sourceType: 're_subcontract_bill', sourceId: String((r.rows[0] as any).id), isAutoGenerated: true }
      );
    } catch {}
    res.json(r.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/subcontract-bills/:id/pay", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  const { payment_date, payment_mode, bank_reference, paid_amount } = req.body;
  try {
    const r = await db.execute(sql`UPDATE re_subcontract_bills SET paid_amount=${paid_amount}, payment_date=${payment_date}, payment_mode=${payment_mode||null}, bank_reference=${bank_reference||null}, status='paid' WHERE id=${parseInt(req.params.id)} AND tenant_id=${t} RETURNING *`);
    if (!r.rows[0]) return res.status(404).json({ message: 'Bill not found' });
    const bill = r.rows[0] as any;
    await db.execute(sql`UPDATE re_subcontract_work_orders SET total_paid = total_paid + ${paid_amount} WHERE id=${bill.work_order_id} AND tenant_id=${t}`);
    try {
      const { createJournalWithLines } = await import('./journal-service');
      await createJournalWithLines(
        payment_date || new Date().toISOString().slice(0,10),
        `Subcontract payment — Bill ${bill.bill_no}`,
        [
          { accountCode: '2100', debit: Math.round(Number(paid_amount)*100), credit: 0, memo: 'AP cleared — subcontractor' },
          { accountCode: '1002', debit: 0, credit: Math.round(Number(paid_amount)*100), memo: 'Bank payment' },
        ],
        { sourceType: 're_subcontract_payment', sourceId: String(bill.id), isAutoGenerated: true }
      );
    } catch {}
    res.json(bill);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
