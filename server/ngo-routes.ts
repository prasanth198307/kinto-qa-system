import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { glNGODonation } from "./vertical-gl-service";
import PDFDocument from "pdfkit";
import crypto from "crypto";

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

router.get("/donors/:id", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM ngo_donors WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    if (!rows.rows.length) return res.status(404).json({ error: "Not found" });
    const d: any = rows.rows[0];
    res.json({ ...d, pan: d.pan_number });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/donors", requireAuth, async (req: any, res) => {
  try {
    const { name, phone, email, address, pan_number, pan, donor_type } = req.body;
    const panVal = pan_number || pan || null;
    const code = "DNR-" + Date.now();
    const rows = await db.execute(sql`INSERT INTO ngo_donors (tenant_id, donor_code, name, phone, email, address, pan_number, donor_type) VALUES (${tid(req)}, ${code}, ${name}, ${phone||null}, ${email||null}, ${address||null}, ${panVal}, ${donor_type||'individual'}) RETURNING *`);
    const d: any = rows.rows[0];
    res.json({ ...d, pan: d.pan_number });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/donors/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, phone, email, address, pan_number, donor_type } = req.body;
    const rows = await db.execute(sql`UPDATE ngo_donors SET name=${name}, phone=${phone||null}, email=${email||null}, address=${address||null}, pan_number=${pan_number||null}, donor_type=${donor_type||'individual'} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
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
    const eligible80g = is_80g_eligible ? 1 : 0;
    const rows = await db.execute(sql`INSERT INTO ngo_donations (tenant_id, receipt_number, donor_id, project_id, amount, donation_date, payment_mode, payment_reference, purpose, is_80g_eligible, notes) VALUES (${tid(req)}, ${no}, ${donor_id}, ${project_id||null}, ${amount||0}, ${donation_date||null}, ${payment_mode||'cash'}, ${reference_number||null}, ${purpose||null}, ${eligible80g}, ${notes||null}) RETURNING *`);
    const donation = rows.rows[0] as any;
    await db.execute(sql`UPDATE ngo_donors SET total_donated=COALESCE(total_donated,0)+${amount||0} WHERE id=${donor_id} AND tenant_id=${tid(req)}`);
    if (project_id) {
      await db.execute(sql`UPDATE ngo_projects SET allocated_amount=COALESCE(allocated_amount,0)+${amount||0} WHERE id=${project_id} AND tenant_id=${tid(req)}`);
    }
    // GL auto-post: Dr Cash/Bank, Cr Donation Income
    glNGODonation({ tenantId: tid(req), donationId: donation.id, donationNumber: no, amount: Math.round((amount||0)*100), paymentMode: payment_mode || "cash", date: donation_date || undefined });
    res.json({ ...donation, amount: Number(donation.amount) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/donations/:id", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT d.*, dn.name as donor_name FROM ngo_donations d LEFT JOIN ngo_donors dn ON dn.id=d.donor_id WHERE d.id=${req.params.id} AND d.tenant_id=${tid(req)}`);
    if (!rows.rows.length) return res.status(404).json({ error: "Not found" });
    const don: any = rows.rows[0];
    res.json({ ...don, amount: Number(don.amount) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/donations/:id", requireAuth, async (req: any, res) => {
  try {
    const { amount, donation_date, payment_mode, reference_number, purpose, notes } = req.body;
    const rows = await db.execute(sql`UPDATE ngo_donations SET amount=${amount||0}, donation_date=${donation_date||null}, payment_mode=${payment_mode||'cash'}, payment_reference=${reference_number||null}, purpose=${purpose||null}, notes=${notes||null} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
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
    const rows = await db.execute(sql`SELECT r.*, dn.name as donor_name, dn.pan_number FROM ngo_80g_receipts r LEFT JOIN ngo_donors dn ON dn.id=r.donor_id WHERE r.tenant_id=${tid(req)} ORDER BY r.issued_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/receipts-80g", requireAuth, async (req: any, res) => {
  try {
    const { donor_id, donation_id, amount, financial_year, issue_date, notes } = req.body;
    const no = "80G-" + Date.now();
    const rows = await db.execute(sql`INSERT INTO ngo_80g_receipts (tenant_id, receipt_number, donor_id, donation_id, amount, financial_year, issued_date) VALUES (${tid(req)}, ${no}, ${donor_id}, ${donation_id||null}, ${amount||0}, ${financial_year||null}, ${issue_date||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── 80G Certificates (alias for receipts-80g) ─────────────────────────────────
router.get("/80g-certificates", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT r.*, dn.name as donor_name, dn.pan_number FROM ngo_80g_receipts r LEFT JOIN ngo_donors dn ON dn.id=r.donor_id WHERE r.tenant_id=${tid(req)} ORDER BY r.issued_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/80g-certificates", requireAuth, async (req: any, res) => {
  try {
    const { donor_id, donation_id, donation_ids, amount, financial_year, issue_date, notes } = req.body;
    const no = "80G-" + Date.now();
    const did = donation_id || (Array.isArray(donation_ids) ? donation_ids[0] : null);
    const rows = await db.execute(sql`INSERT INTO ngo_80g_receipts (tenant_id, receipt_number, donor_id, donation_id, amount, financial_year) VALUES (${tid(req)}, ${no}, ${donor_id}, ${did||null}, ${amount||0}, ${financial_year||null}) RETURNING *`);
    const row: any = rows.rows[0];
    res.json({ ...row, certificate_number: row.receipt_number });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/80g-certificates/bulk", requireAuth, async (req: any, res) => {
  try {
    const { financial_year, donor_ids } = req.body;
    const ids: string[] = Array.isArray(donor_ids) ? donor_ids : [];
    let generated = 0;
    for (const did of ids) {
      const no = "80G-" + Date.now().toString().slice(-8) + "-" + String(did).slice(-4);
      await db.execute(sql`INSERT INTO ngo_80g_receipts (tenant_id, receipt_number, donor_id, amount, financial_year) VALUES (${tid(req)}, ${no}, ${did}, 0, ${financial_year||null})`);
      generated++;
    }
    res.json({ generated, financial_year });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/80g-certificates/:id/download", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT r.*, dn.name as donor_name, dn.pan_number FROM ngo_80g_receipts r LEFT JOIN ngo_donors dn ON dn.id=r.donor_id WHERE r.id=${req.params.id} AND r.tenant_id=${tid(req)}`);
    if (!rows.rows.length) return res.status(404).json({ error: "Not found" });
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
    const { name, description, start_date, end_date, target_amount, location, status } = req.body;
    const rows = await db.execute(sql`UPDATE ngo_projects SET name=${name}, description=${description||null}, start_date=${start_date||null}, end_date=${end_date||null}, target_amount=${target_amount||0}, location=${location||null}, status=${status||'active'} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
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

// ── 80G Certificate PDF ───────────────────────────────────────────────────────
router.get("/donations/:id/certificate-pdf", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const donRow = await db.execute(sql`SELECT d.*, dn.name as donor_name, dn.pan_number, dn.address as donor_address FROM ngo_donations d LEFT JOIN ngo_donors dn ON dn.id=d.donor_id WHERE d.id=${req.params.id} AND d.tenant_id=${t}`);
    if (!donRow.rows.length) return res.status(404).json({ error: "Donation not found" });
    const don = donRow.rows[0] as any;

    const year = don.donation_date ? new Date(don.donation_date).getFullYear() : new Date().getFullYear();
    const certNo = `80G-${year}-${don.id}`;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', (b: Buffer) => buffers.push(b));
    doc.on('end', () => {
      const pdf = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=80G-${don.id}.pdf`);
      res.send(pdf);
    });

    doc.fontSize(18).font('Helvetica-Bold').text('DONATION CERTIFICATE', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('u/s 80G of Income Tax Act, 1961', { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).text(`Certificate No: ${certNo}`);
    doc.text(`Date: ${don.donation_date || new Date().toISOString().slice(0,10)}`);
    doc.moveDown();
    doc.fontSize(12).text(`This is to certify that ${don.donor_name || 'the donor'} has made a donation of`);
    doc.fontSize(14).font('Helvetica-Bold').text(`₹${Number(don.amount).toLocaleString('en-IN')}`, { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`on ${don.donation_date || ''} via ${don.payment_mode || 'cash'}.`);
    if (don.reference_number) doc.text(`Reference: ${don.reference_number}`);
    if (don.pan_number) doc.text(`Donor PAN: ${don.pan_number}`);
    doc.moveDown();
    doc.text('This donation is eligible for deduction under Section 80G of the Income Tax Act, 1961.');
    doc.moveDown(2);
    doc.text('_______________________');
    doc.text('Authorized Signatory');
    doc.end();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Batch 80G Certificate PDF (merged, one page per donation) ────────────────
router.post("/donations/80g/bulk-pdf", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const { donation_ids, financial_year } = req.body as { donation_ids: number[]; financial_year: string };
    if (!donation_ids?.length) return res.status(400).json({ error: "donation_ids required" });

    const donations = await db.execute(sql`
      SELECT d.*, dn.name as donor_name, dn.pan_number, dn.email, dn.address
      FROM ngo_donations d LEFT JOIN ngo_donors dn ON dn.id=d.donor_id
      WHERE d.id = ANY(${donation_ids}::int[]) AND d.tenant_id=${t}
    `);

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    for (let i = 0; i < donations.rows.length; i++) {
      if (i > 0) doc.addPage();
      const d = donations.rows[i] as any;
      const certNo = `80G-${t}-${d.id}-${financial_year}`;

      doc.fontSize(16).font('Helvetica-Bold').text('DONATION RECEIPT — SECTION 80G', { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#666').text('(Eligible for deduction under Section 80G of Income Tax Act, 1961)', { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text('ORGANISATION NAME');
      doc.fontSize(10).font('Helvetica').text('80G Registration No: [80G/REG/XXXX]');
      doc.text('PAN: XXXXXXXXXX').moveDown(0.5);

      const pairs: [string, string][] = [
        ['Certificate No:', certNo],
        ['Donor Name:', d.donor_name || 'Anonymous'],
        ['PAN:', d.pan_number || 'Not Provided'],
        ['Address:', d.address || ''],
        ['Donation Amount:', `₹${parseFloat(d.amount || 0).toFixed(2)}`],
        ['Payment Mode:', d.payment_mode || 'Cash'],
        ['Donation Date:', d.donation_date ? String(d.donation_date).slice(0, 10) : new Date().toISOString().slice(0, 10)],
        ['Financial Year:', financial_year || ''],
        ['Purpose:', d.purpose || 'General Donation'],
      ];
      pairs.forEach(([k, v]) => {
        doc.fontSize(10).font('Helvetica-Bold').text(k + ' ', { continued: true }).font('Helvetica').text(v);
      });
      doc.moveDown(1);
      doc.text('This donation qualifies for 50% deduction under Section 80G of Income Tax Act, 1961, subject to 10% of Adjusted Gross Total Income.', { lineGap: 3 });
      doc.moveDown(2);
      doc.text('Authorised Signatory: ________________________', { align: 'right' });
      doc.text('Seal & Date: ________________________', { align: 'right' });
    }

    doc.end();
    doc.on('end', () => {
      const buf = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="80G-Certificates-${financial_year}.pdf"`);
      res.send(buf);
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── FCRA FC-4 Annual Return ───────────────────────────────────────────────────
async function ensureFCRASubmissionsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ngo_fcra_submissions (
      id SERIAL PRIMARY KEY, tenant_id INT,
      year INT, return_type VARCHAR(10) DEFAULT 'FC-4',
      status VARCHAR(20) DEFAULT 'draft',
      submission_ref VARCHAR(100), submitted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

function generateFC4XML(year: number, data: any, tenantId: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<FC4Return>
  <FinancialYear>${year}-${year + 1}</FinancialYear>
  <RegistrationNo>FCRA/REG/${tenantId}/XXXX</RegistrationNo>
  <ForeignReceipts>${data.total_foreign || 0}</ForeignReceipts>
  <DomesticReceipts>${data.total_domestic || 0}</DomesticReceipts>
  <TotalDonors>${data.total_donations || 0}</TotalDonors>
  <FilingStatus>draft</FilingStatus>
</FC4Return>`;
}

router.get("/fcra/fc4/:year", requireAuth, async (req: any, res) => {
  const t = tid(req);
  const year = parseInt(req.params.year);
  try {
    const foreign = await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN payment_mode='foreign' OR payment_mode='wire' THEN amount ELSE 0 END), 0) as total_foreign,
        COUNT(CASE WHEN payment_mode='foreign' OR payment_mode='wire' THEN 1 END) as foreign_count,
        COALESCE(SUM(CASE WHEN payment_mode NOT IN ('foreign','wire') OR payment_mode IS NULL THEN amount ELSE 0 END), 0) as total_domestic,
        COUNT(*) as total_donations
      FROM ngo_donations WHERE tenant_id=${t} AND EXTRACT(YEAR FROM donation_date)=${year}
    `).catch(() => ({ rows: [{ total_foreign: 0, foreign_count: 0, total_domestic: 0, total_donations: 0 }] }));
    const f = foreign.rows[0] as any;
    res.json({
      year, return_type: 'FC-4',
      registration_no: `FCRA/REG/${t}/XXXX`,
      opening_balance: 0,
      receipts: { foreign: Number(f.total_foreign || 0), domestic: Number(f.total_domestic || 0) },
      utilisation: { programme: 0, admin: 0 },
      closing_balance: 0,
      xml: generateFC4XML(year, f, t),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/fcra/fc4/:year/submit", requireAuth, async (req: any, res) => {
  const t = tid(req);
  const year = parseInt(req.params.year);
  try {
    await ensureFCRASubmissionsTable();
    const { submission_ref } = req.body;
    const row = await db.execute(sql`
      INSERT INTO ngo_fcra_submissions (tenant_id, year, return_type, status, submission_ref, submitted_at)
      VALUES (${t}, ${year}, 'FC-4', 'submitted', ${submission_ref || null}, NOW())
      RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── CSR Projects ──────────────────────────────────────────────────────────────
async function ensureCSRTable(t: string) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ngo_csr_projects (
      id SERIAL PRIMARY KEY, tenant_id INT,
      project_name VARCHAR(300), corporate_donor VARCHAR(300),
      cin VARCHAR(21), csr_amount NUMERIC(12,2),
      project_description TEXT, beneficiary_count INT,
      start_date DATE, end_date DATE,
      utilisation_certificate_no VARCHAR(100),
      status VARCHAR(30) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

router.get("/csr/projects", requireAuth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureCSRTable(t);
    const rows = await db.execute(sql`SELECT * FROM ngo_csr_projects WHERE tenant_id=${t} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/csr/projects", requireAuth, async (req: any, res) => {
  const t = tid(req);
  const { project_name, corporate_donor, cin, csr_amount, project_description, beneficiary_count, start_date, end_date, utilisation_certificate_no, status } = req.body;
  try {
    await ensureCSRTable(t);
    const row = await db.execute(sql`
      INSERT INTO ngo_csr_projects (tenant_id, project_name, corporate_donor, cin, csr_amount, project_description, beneficiary_count, start_date, end_date, utilisation_certificate_no, status)
      VALUES (${t}, ${project_name}, ${corporate_donor || null}, ${cin || null}, ${csr_amount || 0}, ${project_description || null}, ${beneficiary_count || null}, ${start_date || null}, ${end_date || null}, ${utilisation_certificate_no || null}, ${status || 'active'})
      RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/csr/projects/:id", requireAuth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureCSRTable(t);
    const row = await db.execute(sql`SELECT * FROM ngo_csr_projects WHERE id=${req.params.id} AND tenant_id=${t}`);
    if (!row.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/csr/projects/:id", requireAuth, async (req: any, res) => {
  const t = tid(req);
  const { project_name, corporate_donor, cin, csr_amount, project_description, beneficiary_count, start_date, end_date, utilisation_certificate_no, status } = req.body;
  try {
    await ensureCSRTable(t);
    const row = await db.execute(sql`
      UPDATE ngo_csr_projects SET project_name=${project_name}, corporate_donor=${corporate_donor || null}, cin=${cin || null}, csr_amount=${csr_amount || 0}, project_description=${project_description || null}, beneficiary_count=${beneficiary_count || null}, start_date=${start_date || null}, end_date=${end_date || null}, utilisation_certificate_no=${utilisation_certificate_no || null}, status=${status || 'active'}
      WHERE id=${req.params.id} AND tenant_id=${t} RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/csr/summary", requireAuth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureCSRTable(t);
    const row = await db.execute(sql`
      SELECT
        COALESCE(SUM(csr_amount), 0) as total_received,
        COALESCE(SUM(CASE WHEN status='completed' THEN csr_amount ELSE 0 END), 0) as utilised,
        COALESCE(SUM(CASE WHEN status='active' THEN csr_amount ELSE 0 END), 0) as balance,
        COUNT(*) as project_count
      FROM ngo_csr_projects WHERE tenant_id=${t}
    `);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Bulk 80G Certificates ──────────────────────────────────────────────────────
router.post("/donations/bulk-certificates", requireAuth, async (req: any, res) => {
  try {
    const t = tid(req);
    const { donation_ids, financial_year } = req.body as { donation_ids: number[]; financial_year: string };
    if (!donation_ids?.length) return res.status(400).json({ error: "donation_ids required" });

    const results: { donation_id: number; certificate_no: string; pdf_base64: string }[] = [];

    for (const did of donation_ids) {
      const donRow = await db.execute(sql`SELECT d.*, dn.name as donor_name, dn.pan_number FROM ngo_donations d LEFT JOIN ngo_donors dn ON dn.id=d.donor_id WHERE d.id=${did} AND d.tenant_id=${t}`);
      if (!donRow.rows.length) continue;
      const don = donRow.rows[0] as any;
      const year = financial_year || (don.donation_date ? new Date(don.donation_date).getFullYear() : new Date().getFullYear());
      const certNo = `80G-${year}-${don.id}`;

      const pdf = await new Promise<Buffer>((resolve) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const bufs: Buffer[] = [];
        doc.on('data', (b: Buffer) => bufs.push(b));
        doc.on('end', () => resolve(Buffer.concat(bufs)));
        doc.fontSize(16).font('Helvetica-Bold').text('80G DONATION CERTIFICATE', { align: 'center' });
        doc.fontSize(11).font('Helvetica').text(`Cert No: ${certNo} | Date: ${don.donation_date || ''}`);
        doc.text(`Donor: ${don.donor_name || ''} | PAN: ${don.pan_number || 'N/A'}`);
        doc.text(`Amount: ₹${Number(don.amount).toLocaleString('en-IN')} via ${don.payment_mode || 'cash'}`);
        doc.moveDown();
        doc.text('Eligible for deduction u/s 80G of Income Tax Act 1961.');
        doc.end();
      });

      results.push({ donation_id: did, certificate_no: certNo, pdf_base64: pdf.toString('base64') });
    }

    res.json({ count: results.length, certificates: results });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── FCRA FC-4 Return ──────────────────────────────────────────────────────────
router.get("/fcra/fc4-return/:year", requireAuth, async (req: any, res) => {
  const t = tid(req);
  const year = req.params.year;
  try {
    const fcRows = await db.execute(sql`
      SELECT * FROM ngo_foreign_contributions
      WHERE tenant_id=${t} AND EXTRACT(YEAR FROM receipt_date)=${year}
      ORDER BY receipt_date
    `).catch(() => ({ rows: [] }));

    const projectRows = await db.execute(sql`SELECT * FROM ngo_projects WHERE tenant_id=${t} AND status='active'`).catch(() => ({ rows: [] }));

    const contributions = fcRows.rows as any[];
    const byCountry: Record<string, any> = {};
    for (const c of contributions) {
      const country = c.donor_country || 'Unknown';
      if (!byCountry[country]) byCountry[country] = { country, sources: [], total: 0 };
      byCountry[country].sources.push({ source: c.donor_name, purpose: c.purpose, amount: Number(c.amount || 0), date: c.receipt_date });
      byCountry[country].total += Number(c.amount || 0);
    }

    const totalReceived = contributions.reduce((s, c) => s + Number(c.amount || 0), 0);
    const utilized = contributions.filter(c => c.status === 'utilized').reduce((s, c) => s + Number(c.amount || 0), 0);
    const balance = totalReceived - utilized;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FC4Return year="${year}" tenantId="${t}">
  <PartA><Organization tenantId="${t}"/></PartA>
  <PartB total_received="${totalReceived}">${Object.values(byCountry).map((c: any) => `<Country name="${c.country}" total="${c.total}"/>`).join('')}</PartB>
  <PartC utilized="${utilized}">${(projectRows.rows as any[]).map((p: any) => `<Project name="${p.name}" utilized="${p.funds_utilized || 0}"/>`).join('')}</PartC>
  <PartD balance="${balance}"/>
</FC4Return>`;

    res.json({
      year,
      part_a: { tenant_id: t },
      part_b: { total_received: totalReceived, by_country: Object.values(byCountry) },
      part_c: { utilized, projects: projectRows.rows },
      part_d: { balance },
      xml_format: xml,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Donor Portal (public, no auth) ────────────────────────────────────────────
router.get("/public/donate/:slug", async (req: any, res) => {
  try {
    const orgRow = await db.execute(sql`SELECT id, name, upi_id, description FROM tenants WHERE slug=${req.params.slug} LIMIT 1`).catch(() => ({ rows: [] }));
    if (!(orgRow.rows as any[]).length) return res.status(404).json({ error: "Organization not found" });
    const org = orgRow.rows[0] as any;
    res.json({ org_name: org.name, upi_id: org.upi_id || null, description: org.description || null });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/public/donate/:slug", async (req: any, res) => {
  try {
    const orgRow = await db.execute(sql`SELECT id FROM tenants WHERE slug=${req.params.slug} LIMIT 1`).catch(() => ({ rows: [] }));
    if (!(orgRow.rows as any[]).length) return res.status(404).json({ error: "Organization not found" });
    const tenantId = (orgRow.rows[0] as any).id;
    const { donor_name, donor_email, donor_phone, amount, payment_mode, purpose } = req.body;
    const token = crypto.randomBytes(16).toString('hex');
    const no = "DON-PUB-" + Date.now();

    // Upsert donor
    let donorId: number;
    const existingDonor = await db.execute(sql`SELECT id FROM ngo_donors WHERE tenant_id=${tenantId} AND email=${donor_email||null} LIMIT 1`).catch(() => ({ rows: [] }));
    if ((existingDonor.rows as any[]).length) {
      donorId = (existingDonor.rows[0] as any).id;
    } else {
      const dRow = await db.execute(sql`INSERT INTO ngo_donors (tenant_id, donor_code, name, phone, email, donor_type) VALUES (${tenantId}, ${'DNR-PUB-'+Date.now()}, ${donor_name||'Anonymous'}, ${donor_phone||null}, ${donor_email||null}, 'individual') RETURNING id`);
      donorId = (dRow.rows[0] as any).id;
    }

    const row = await db.execute(sql`INSERT INTO ngo_donations (tenant_id, donation_number, donor_id, amount, payment_mode, purpose, is_80g_eligible, notes) VALUES (${tenantId}, ${no}, ${donorId}, ${amount||0}, ${payment_mode||'online'}, ${purpose||null}, true, ${token}) RETURNING *`);
    await db.execute(sql`UPDATE ngo_donors SET total_donated=COALESCE(total_donated,0)+${amount||0} WHERE id=${donorId} AND tenant_id=${tenantId}`);

    res.json({ success: true, donation_number: no, receipt_token: token, amount });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/public/receipt/:token", async (req: any, res) => {
  try {
    const row = await db.execute(sql`SELECT d.*, dn.name as donor_name, dn.email as donor_email FROM ngo_donations d LEFT JOIN ngo_donors dn ON dn.id=d.donor_id WHERE d.notes=${req.params.token} LIMIT 1`);
    if (!row.rows.length) return res.status(404).json({ error: "Receipt not found" });
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
