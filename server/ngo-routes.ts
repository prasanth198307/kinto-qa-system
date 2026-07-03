import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { glNGODonation } from "./vertical-gl-service";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── Donors ────────────────────────────────────────────────────────────────────
router.get("/donors", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM ngo_donors WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/donors/:id/donations", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM ngo_donations WHERE tenant_id=${tid(req)} AND donor_id=${req.params.id} ORDER BY donation_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/donors", requireAuth, async (req: any, res) => {
  try {
    const { name, phone, email, address, pan_number, donor_type, notes } = req.body;
    const code = "DNR-" + Date.now();
    const rows = await db.execute(sql`INSERT INTO ngo_donors (tenant_id, donor_code, name, phone, email, address, pan_number, donor_type, notes) VALUES (${tid(req)}, ${code}, ${name}, ${phone||null}, ${email||null}, ${address||null}, ${pan_number||null}, ${donor_type||'individual'}, ${notes||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/donors/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, phone, email, address, pan_number, donor_type, notes } = req.body;
    const rows = await db.execute(sql`UPDATE ngo_donors SET name=${name}, phone=${phone||null}, email=${email||null}, address=${address||null}, pan_number=${pan_number||null}, donor_type=${donor_type||'individual'}, notes=${notes||null} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/donors/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE ngo_donors SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Donations ─────────────────────────────────────────────────────────────────
router.get("/donations", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT d.*, dn.name as donor_name, dn.pan_number, p.name as project_name FROM ngo_donations d LEFT JOIN ngo_donors dn ON dn.id=d.donor_id LEFT JOIN ngo_projects p ON p.id=d.project_id WHERE d.tenant_id=${tid(req)} ORDER BY d.donation_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/donations", requireAuth, async (req: any, res) => {
  try {
    const { donor_id, project_id, amount, donation_date, payment_mode, reference_number, purpose, is_80g_eligible, notes } = req.body;
    const no = "DON-" + Date.now();
    const rows = await db.execute(sql`INSERT INTO ngo_donations (tenant_id, donation_number, donor_id, project_id, amount, donation_date, payment_mode, reference_number, purpose, is_80g_eligible, notes) VALUES (${tid(req)}, ${no}, ${donor_id}, ${project_id||null}, ${amount||0}, ${donation_date||null}, ${payment_mode||'cash'}, ${reference_number||null}, ${purpose||null}, ${is_80g_eligible ?? true}, ${notes||null}) RETURNING *`);
    const donation = rows.rows[0] as any;
    await db.execute(sql`UPDATE ngo_donors SET total_donated=COALESCE(total_donated,0)+${amount||0} WHERE id=${donor_id} AND tenant_id=${tid(req)}`);
    if (project_id) {
      await db.execute(sql`UPDATE ngo_projects SET funds_received=COALESCE(funds_received,0)+${amount||0} WHERE id=${project_id} AND tenant_id=${tid(req)}`);
    }
    // GL auto-post: Dr Cash/Bank, Cr Donation Income
    glNGODonation({ tenantId: tid(req), donationId: donation.id, donationNumber: no, amount: Math.round((amount||0)*100), paymentMode: payment_mode || "cash", date: donation_date || undefined });
    res.json(donation);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/donations/:id", requireAuth, async (req: any, res) => {
  try {
    const { amount, donation_date, payment_mode, reference_number, purpose, notes } = req.body;
    const rows = await db.execute(sql`UPDATE ngo_donations SET amount=${amount||0}, donation_date=${donation_date||null}, payment_mode=${payment_mode||'cash'}, reference_number=${reference_number||null}, purpose=${purpose||null}, notes=${notes||null} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/donations/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM ngo_donations WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── 80G Receipts ──────────────────────────────────────────────────────────────
router.get("/receipts-80g", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT r.*, dn.name as donor_name, dn.pan_number FROM ngo_80g_receipts r LEFT JOIN ngo_donors dn ON dn.id=r.donor_id WHERE r.tenant_id=${tid(req)} ORDER BY r.issue_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/receipts-80g", requireAuth, async (req: any, res) => {
  try {
    const { donor_id, donation_id, amount, financial_year, issue_date, notes } = req.body;
    const no = "80G-" + Date.now();
    const rows = await db.execute(sql`INSERT INTO ngo_80g_receipts (tenant_id, receipt_number, donor_id, donation_id, amount, financial_year, issue_date, notes) VALUES (${tid(req)}, ${no}, ${donor_id}, ${donation_id||null}, ${amount||0}, ${financial_year||null}, ${issue_date||null}, ${notes||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Projects ──────────────────────────────────────────────────────────────────
router.get("/projects", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM ngo_projects WHERE tenant_id=${tid(req)} ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/projects", requireAuth, async (req: any, res) => {
  try {
    const { name, description, start_date, end_date, target_amount, location, status } = req.body;
    const code = "PRJ-" + Date.now();
    const rows = await db.execute(sql`INSERT INTO ngo_projects (tenant_id, project_code, name, description, start_date, end_date, target_amount, location, status) VALUES (${tid(req)}, ${code}, ${name}, ${description||null}, ${start_date||null}, ${end_date||null}, ${target_amount||0}, ${location||null}, ${status||'active'}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/projects/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, description, start_date, end_date, target_amount, funds_received, funds_utilized, location, status } = req.body;
    const rows = await db.execute(sql`UPDATE ngo_projects SET name=${name}, description=${description||null}, start_date=${start_date||null}, end_date=${end_date||null}, target_amount=${target_amount||0}, funds_received=${funds_received||0}, funds_utilized=${funds_utilized||0}, location=${location||null}, status=${status||'active'} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/projects/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM ngo_projects WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Beneficiaries ─────────────────────────────────────────────────────────────
router.get("/beneficiaries", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT b.*, p.name as project_name FROM ngo_beneficiaries b LEFT JOIN ngo_projects p ON p.id=b.project_id WHERE b.tenant_id=${tid(req)} AND b.record_status=1 ORDER BY b.name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/beneficiaries", requireAuth, async (req: any, res) => {
  try {
    const { name, project_id, age, gender, phone, address, category, notes } = req.body;
    const code = "BEN-" + Date.now();
    const rows = await db.execute(sql`INSERT INTO ngo_beneficiaries (tenant_id, beneficiary_code, name, project_id, age, gender, phone, address, category, notes) VALUES (${tid(req)}, ${code}, ${name}, ${project_id||null}, ${age||null}, ${gender||null}, ${phone||null}, ${address||null}, ${category||null}, ${notes||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/beneficiaries/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, project_id, age, gender, phone, address, category, notes } = req.body;
    const rows = await db.execute(sql`UPDATE ngo_beneficiaries SET name=${name}, project_id=${project_id||null}, age=${age||null}, gender=${gender||null}, phone=${phone||null}, address=${address||null}, category=${category||null}, notes=${notes||null} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/beneficiaries/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE ngo_beneficiaries SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Grants ────────────────────────────────────────────────────────────────────
router.get("/grants", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT g.*, p.name as project_name FROM ngo_grants g LEFT JOIN ngo_projects p ON p.id=g.project_id WHERE g.tenant_id=${tid(req)} ORDER BY g.application_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/grants", requireAuth, async (req: any, res) => {
  try {
    const { project_id, grantor_name, grant_type, applied_amount, approved_amount, application_date, approval_date, status, notes } = req.body;
    const code = "GRT-" + Date.now();
    const rows = await db.execute(sql`INSERT INTO ngo_grants (tenant_id, grant_code, project_id, grantor_name, grant_type, applied_amount, approved_amount, application_date, approval_date, status, notes) VALUES (${tid(req)}, ${code}, ${project_id||null}, ${grantor_name}, ${grant_type||'government'}, ${applied_amount||0}, ${approved_amount||0}, ${application_date||null}, ${approval_date||null}, ${status||'applied'}, ${notes||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/grants/:id", requireAuth, async (req: any, res) => {
  try {
    const { grantor_name, grant_type, applied_amount, approved_amount, application_date, approval_date, status, notes } = req.body;
    const rows = await db.execute(sql`UPDATE ngo_grants SET grantor_name=${grantor_name}, grant_type=${grant_type||'government'}, applied_amount=${applied_amount||0}, approved_amount=${approved_amount||0}, application_date=${application_date||null}, approval_date=${approval_date||null}, status=${status||'applied'}, notes=${notes||null} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/grants/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM ngo_grants WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Volunteers ────────────────────────────────────────────────────────────────
router.get("/volunteers", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM ngo_volunteers WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/volunteers", requireAuth, async (req: any, res) => {
  try {
    const { name, phone, email, skills, availability, joined_date, notes } = req.body;
    const code = "VOL-" + Date.now();
    const rows = await db.execute(sql`INSERT INTO ngo_volunteers (tenant_id, volunteer_code, name, phone, email, skills, availability, joined_date, notes) VALUES (${tid(req)}, ${code}, ${name}, ${phone||null}, ${email||null}, ${skills||null}, ${availability||null}, ${joined_date||null}, ${notes||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/volunteers/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, phone, email, skills, availability, joined_date, status, notes } = req.body;
    const rows = await db.execute(sql`UPDATE ngo_volunteers SET name=${name}, phone=${phone||null}, email=${email||null}, skills=${skills||null}, availability=${availability||null}, joined_date=${joined_date||null}, status=${status||'active'}, notes=${notes||null} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/volunteers/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE ngo_volunteers SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const [donors, donations, projects, beneficiaries, volunteers] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM ngo_donors WHERE tenant_id=${tid(req)} AND record_status=1`),
      db.execute(sql`SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM ngo_donations WHERE tenant_id=${tid(req)}`),
      db.execute(sql`SELECT COUNT(*) as count FROM ngo_projects WHERE tenant_id=${tid(req)} AND status='active'`),
      db.execute(sql`SELECT COUNT(*) as count FROM ngo_beneficiaries WHERE tenant_id=${tid(req)} AND record_status=1`),
      db.execute(sql`SELECT COUNT(*) as count FROM ngo_volunteers WHERE tenant_id=${tid(req)} AND record_status=1 AND status='active'`),
    ]);
    res.json({
      totalDonors: Number(donors.rows[0]?.count || 0),
      totalDonations: Number(donations.rows[0]?.count || 0),
      totalDonationAmount: Number(donations.rows[0]?.total || 0),
      activeProjects: Number(projects.rows[0]?.count || 0),
      totalBeneficiaries: Number(beneficiaries.rows[0]?.count || 0),
      activeVolunteers: Number(volunteers.rows[0]?.count || 0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
