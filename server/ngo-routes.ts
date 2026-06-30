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

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// ── Donors ────────────────────────────────────────────────────────────────────

router.get("/donors", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { search, donor_type, status } = req.query;
    let q = `SELECT * FROM ngo_donors WHERE tenant_id=${tid} AND record_status=1`;
    if (search) q += ` AND (name ILIKE '%${String(search).replace(/'/g,"''")}%' OR phone ILIKE '%${String(search).replace(/'/g,"''")}%' OR donor_code ILIKE '%${String(search).replace(/'/g,"''")}%')`;
    if (donor_type) q += ` AND donor_type='${String(donor_type).replace(/'/g,"''")}'`;
    if (status !== undefined) q += ` AND is_active=${status === 'active' ? 1 : 0}`;
    q += ` ORDER BY total_donated DESC NULLS LAST, created_at DESC`;
    const r = await db.execute(sql.raw(q));
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/donors", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const id = genId();
    const { name, email, phone, address, pan_number, aadhar_number, donor_type, is_anonymous } = req.body;
    const donor_code = `DNR-${Date.now().toString().slice(-6)}`;
    const r = await db.execute(sql`
      INSERT INTO ngo_donors (id, tenant_id, donor_code, name, email, phone, address, pan_number, aadhar_number, donor_type, is_anonymous, total_donated, is_active, record_status)
      VALUES (${id}, ${tid}, ${donor_code}, ${name}, ${email||null}, ${phone||null}, ${address||null}, ${pan_number||null}, ${aadhar_number||null}, ${donor_type||'individual'}, ${is_anonymous?1:0}, 0, 1, 1)
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/donors/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, email, phone, address, pan_number, aadhar_number, donor_type, is_anonymous, is_active } = req.body;
    await db.execute(sql`
      UPDATE ngo_donors SET name=${name}, email=${email||null}, phone=${phone||null}, address=${address||null},
      pan_number=${pan_number||null}, aadhar_number=${aadhar_number||null}, donor_type=${donor_type||'individual'},
      is_anonymous=${is_anonymous?1:0}, is_active=${is_active!==false?1:0}
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Donations ─────────────────────────────────────────────────────────────────

router.get("/donations", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { donor_id, payment_mode, from, to, search } = req.query;
    let q = `SELECT d.*, dn.name as donor_name, dn.phone as donor_phone, dn.donor_code
             FROM ngo_donations d LEFT JOIN ngo_donors dn ON dn.id=d.donor_id
             WHERE d.tenant_id=${tid} AND d.record_status=1`;
    if (donor_id) q += ` AND d.donor_id='${String(donor_id).replace(/'/g,"''")}'`;
    if (payment_mode) q += ` AND d.payment_mode='${String(payment_mode).replace(/'/g,"''")}'`;
    if (from) q += ` AND d.donation_date >= '${String(from).replace(/'/g,"''")}'`;
    if (to) q += ` AND d.donation_date <= '${String(to).replace(/'/g,"''")}'`;
    if (search) q += ` AND (dn.name ILIKE '%${String(search).replace(/'/g,"''")}%' OR d.receipt_number ILIKE '%${String(search).replace(/'/g,"''")}%')`;
    q += ` ORDER BY d.donation_date DESC, d.created_at DESC LIMIT 500`;
    const r = await db.execute(sql.raw(q));
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/donations", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const id = genId();
    const { donor_id, donation_date, amount, payment_mode, payment_reference, purpose, project_id, is_80g_eligible, notes } = req.body;
    const receipt_number = `RCP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const r = await db.execute(sql`
      INSERT INTO ngo_donations (id, tenant_id, receipt_number, donor_id, donation_date, amount, payment_mode, payment_reference, purpose, project_id, is_80g_eligible, receipt_sent, notes, record_status)
      VALUES (${id}, ${tid}, ${receipt_number}, ${donor_id}, ${donation_date||new Date().toISOString().slice(0,10)}, ${amount}, ${payment_mode||'cash'}, ${payment_reference||null}, ${purpose||null}, ${project_id||null}, ${is_80g_eligible?1:0}, 0, ${notes||null}, 1)
      RETURNING *`);
    await db.execute(sql`UPDATE ngo_donors SET total_donated=COALESCE(total_donated,0)+${amount} WHERE id=${donor_id} AND tenant_id=${tid}`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── 80G ───────────────────────────────────────────────────────────────────────

router.get("/80g", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { financial_year } = req.query;
    let q = `SELECT r.*, dn.name as donor_name, dn.pan_number FROM ngo_80g_receipts r
             LEFT JOIN ngo_donors dn ON dn.id=r.donor_id
             WHERE r.tenant_id=${tid} AND r.record_status=1`;
    if (financial_year) q += ` AND r.financial_year='${String(financial_year).replace(/'/g,"''")}'`;
    q += ` ORDER BY r.issued_date DESC`;
    const r = await db.execute(sql.raw(q));
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/80g/generate", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { donation_id, financial_year } = req.body;
    const donation = await db.execute(sql`SELECT * FROM ngo_donations WHERE id=${donation_id} AND tenant_id=${tid}`);
    if (!donation.rows[0]) return res.status(404).json({ message: "Donation not found" });
    const d = donation.rows[0] as any;
    const fy = financial_year || `${new Date().getFullYear()}-${new Date().getFullYear()+1}`;
    const receipt_number = `80G-${fy}-${Date.now().toString().slice(-5)}`;
    const r = await db.execute(sql`
      INSERT INTO ngo_80g_receipts (id, tenant_id, receipt_number, donation_id, donor_id, financial_year, amount, issued_date, record_status)
      VALUES (${genId()}, ${tid}, ${receipt_number}, ${donation_id}, ${d.donor_id}, ${fy}, ${d.amount}, ${new Date().toISOString().slice(0,10)}, 1)
      ON CONFLICT DO NOTHING RETURNING *`);
    res.json(r.rows[0] || { message: "Receipt already generated" });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/80g/bulk-generate", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { financial_year } = req.body;
    const fy = financial_year || `${new Date().getFullYear()}-${new Date().getFullYear()+1}`;
    const donations = await db.execute(sql`SELECT * FROM ngo_donations WHERE tenant_id=${tid} AND is_80g_eligible=1 AND record_status=1`);
    let generated = 0;
    for (const d of donations.rows as any[]) {
      const exists = await db.execute(sql`SELECT id FROM ngo_80g_receipts WHERE donation_id=${d.id} AND financial_year=${fy} AND tenant_id=${tid}`);
      if (exists.rows.length === 0) {
        await db.execute(sql`
          INSERT INTO ngo_80g_receipts (id, tenant_id, receipt_number, donation_id, donor_id, financial_year, amount, issued_date, record_status)
          VALUES (${genId()}, ${tid}, ${'80G-'+fy+'-'+genId().slice(-5)}, ${d.id}, ${d.donor_id}, ${fy}, ${d.amount}, ${new Date().toISOString().slice(0,10)}, 1)`);
        generated++;
      }
    }
    res.json({ generated, financial_year: fy });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Projects ──────────────────────────────────────────────────────────────────

router.get("/projects", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM ngo_projects WHERE tenant_id=${tid} AND record_status=1 ORDER BY start_date DESC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/projects", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, description, category, start_date, end_date, target_amount, location, status } = req.body;
    const r = await db.execute(sql`
      INSERT INTO ngo_projects (id, tenant_id, project_code, name, description, category, start_date, end_date, target_amount, allocated_amount, spent_amount, status, location, beneficiary_count, record_status)
      VALUES (${genId()}, ${tid}, ${'PRJ-'+genId().slice(-5)}, ${name}, ${description||null}, ${category||null}, ${start_date||null}, ${end_date||null}, ${target_amount||0}, 0, 0, ${status||'planning'}, ${location||null}, 0, 1)
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/projects/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, description, start_date, end_date, target_amount, allocated_amount, spent_amount, status, location, beneficiary_count } = req.body;
    await db.execute(sql`
      UPDATE ngo_projects SET name=${name}, description=${description||null}, start_date=${start_date||null},
      end_date=${end_date||null}, target_amount=${target_amount||0}, allocated_amount=${allocated_amount||0},
      spent_amount=${spent_amount||0}, status=${status||'planning'}, location=${location||null},
      beneficiary_count=${beneficiary_count||0}
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Grants ────────────────────────────────────────────────────────────────────

router.get("/grants", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM ngo_grants WHERE tenant_id=${tid} AND record_status=1 ORDER BY received_date DESC NULLS LAST, created_at DESC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/grants", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { grantor_name, grantor_type, project_id, amount, received_date, utilization_deadline, status, conditions, notes } = req.body;
    const r = await db.execute(sql`
      INSERT INTO ngo_grants (id, tenant_id, grant_number, grantor_name, grantor_type, project_id, amount, received_date, utilization_deadline, status, conditions, notes, record_status)
      VALUES (${genId()}, ${tid}, ${'GRT-'+genId().slice(-5)}, ${grantor_name}, ${grantor_type||'government'}, ${project_id||null}, ${amount||0}, ${received_date||null}, ${utilization_deadline||null}, ${status||'active'}, ${conditions||null}, ${notes||null}, 1)
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/grants/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { grantor_name, amount, received_date, utilization_deadline, status, conditions, notes } = req.body;
    await db.execute(sql`
      UPDATE ngo_grants SET grantor_name=${grantor_name}, amount=${amount||0}, received_date=${received_date||null},
      utilization_deadline=${utilization_deadline||null}, status=${status||'active'}, conditions=${conditions||null}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Volunteers ────────────────────────────────────────────────────────────────

router.get("/volunteers", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM ngo_volunteers WHERE tenant_id=${tid} AND record_status=1 ORDER BY name`);
    res.json(r.rows);
  } catch (e: any) {
    if (e.message?.includes('does not exist')) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/volunteers", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, email, phone, skills, availability, enrolled_date } = req.body;
    const r = await db.execute(sql`
      INSERT INTO ngo_volunteers (id, tenant_id, volunteer_number, name, email, phone, skills, availability, enrolled_date, status, record_status)
      VALUES (${genId()}, ${tid}, ${'VOL-'+Date.now().toString().slice(-5)}, ${name}, ${email||null}, ${phone||null}, ${skills||null}, ${availability||'weekday'}, ${enrolled_date||new Date().toISOString().slice(0,10)}, 'active', 1)
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    if (e.message?.includes('does not exist')) return res.status(404).json({ message: "volunteers table not set up" });
    res.status(500).json({ message: e.message });
  }
});

router.put("/volunteers/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, email, phone, skills, availability, status } = req.body;
    await db.execute(sql`UPDATE ngo_volunteers SET name=${name}, email=${email||null}, phone=${phone||null}, skills=${skills||null}, availability=${availability||'weekday'}, status=${status||'active'} WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Beneficiaries ─────────────────────────────────────────────────────────────

router.get("/beneficiaries", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM ngo_beneficiaries WHERE tenant_id=${tid} AND record_status=1 ORDER BY name`);
    res.json(r.rows);
  } catch (e: any) {
    if (e.message?.includes('does not exist')) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/beneficiaries", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, phone, program, enrollment_date, status } = req.body;
    const r = await db.execute(sql`
      INSERT INTO ngo_beneficiaries (id, tenant_id, beneficiary_number, name, phone, program, enrollment_date, status, record_status)
      VALUES (${genId()}, ${tid}, ${'BNF-'+Date.now().toString().slice(-5)}, ${name}, ${phone||null}, ${program||null}, ${enrollment_date||new Date().toISOString().slice(0,10)}, ${status||'active'}, 1)
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    if (e.message?.includes('does not exist')) return res.status(404).json({ message: "beneficiaries table not set up" });
    res.status(500).json({ message: e.message });
  }
});

router.put("/beneficiaries/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, phone, program, status } = req.body;
    await db.execute(sql`UPDATE ngo_beneficiaries SET name=${name}, phone=${phone||null}, program=${program||null}, status=${status||'active'} WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Reports ───────────────────────────────────────────────────────────────────

router.get("/reports/:type", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to, fy } = req.query;
    const type = req.params.type;
    let data: any[] = [];

    if (type === 'donor-summary') {
      const r = await db.execute(sql`
        SELECT donor_type, COUNT(*) as count, SUM(total_donated) as total_donated
        FROM ngo_donors WHERE tenant_id=${tid} AND record_status=1 GROUP BY donor_type ORDER BY total_donated DESC`);
      data = r.rows as any[];
    } else if (type === 'donation-register') {
      const f = String(from || new Date().getFullYear() + '-01-01');
      const t = String(to || new Date().toISOString().slice(0,10));
      const r = await db.execute(sql`
        SELECT d.receipt_number, dn.name as donor_name, dn.pan_number, d.amount, d.donation_date, d.payment_mode, d.payment_reference, d.purpose
        FROM ngo_donations d LEFT JOIN ngo_donors dn ON dn.id=d.donor_id
        WHERE d.tenant_id=${tid} AND d.record_status=1 AND d.donation_date BETWEEN ${f} AND ${t}
        ORDER BY d.donation_date`);
      data = r.rows as any[];
    } else if (type === '80g-register') {
      const r = await db.execute(sql`
        SELECT r.receipt_number, dn.name as donor_name, dn.pan_number, r.amount, r.issued_date, r.financial_year
        FROM ngo_80g_receipts r LEFT JOIN ngo_donors dn ON dn.id=r.donor_id
        WHERE r.tenant_id=${tid} AND r.record_status=1 ${fy ? sql`AND r.financial_year=${fy}` : sql``}
        ORDER BY r.issued_date`);
      data = r.rows as any[];
    } else if (type === 'grant-utilization') {
      const r = await db.execute(sql`
        SELECT grant_number, grantor_name, grantor_type, amount, received_date, utilization_deadline, status
        FROM ngo_grants WHERE tenant_id=${tid} AND record_status=1 ORDER BY received_date DESC`);
      data = r.rows as any[];
    } else if (type === 'project-status') {
      const r = await db.execute(sql`
        SELECT project_code, name, status, target_amount, allocated_amount, spent_amount, beneficiary_count, start_date, end_date
        FROM ngo_projects WHERE tenant_id=${tid} AND record_status=1 ORDER BY start_date DESC`);
      data = r.rows as any[];
    }

    res.json({ report_type: type, from, to, fy, count: data.length, data });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
