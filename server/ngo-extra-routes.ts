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

function randomToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── 80G RECEIPTS & COMPLIANCE ───────────────────────────────────────────────

router.get("/receipts/80g", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const fy = req.query.fy ?? getCurrentFY();
    const { from, to } = getFYDates(fy as string);
    const r = await db.execute(sql`
      SELECT r.*, d.name AS donor_name, d.pan_number, d.address
      FROM ngo_80g_receipts r
      JOIN donors d ON d.id = r.donor_id
      WHERE r.tenant_id = ${tid}
        AND r.receipt_date BETWEEN ${from} AND ${to}
      ORDER BY r.receipt_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/receipts/80g/generate", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { donation_id } = req.body;
    const donation = await db.execute(sql`
      SELECT dn.*, d.name AS donor_name, d.pan_number, d.address, d.email
      FROM donations dn
      JOIN donors d ON d.id = dn.donor_id
      WHERE dn.id = ${donation_id} AND dn.tenant_id = ${tid}
    `);
    if (!donation.rows[0]) return res.status(404).json({ message: "Donation not found" });
    const don = donation.rows[0] as any;
    const receiptNo = `80G-${tid}-${Date.now()}`;
    const r = await db.execute(sql`
      INSERT INTO ngo_80g_receipts (tenant_id, donation_id, donor_id, receipt_no, receipt_date,
        amount, donor_name, pan_number, donor_address, created_at)
      VALUES (${tid}, ${donation_id}, ${don.donor_id}, ${receiptNo}, NOW(),
        ${don.amount}, ${don.donor_name}, ${don.pan_number}, ${don.address}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/receipts/80g/:id/pdf-data", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      SELECT r.*, d.name AS donor_name, d.pan_number, d.address, d.email, d.phone,
        dn.purpose, dn.payment_mode, dn.cheque_no, dn.bank_name,
        o.name AS org_name, o.registration_no, o.reg_80g_no, o.reg_12a_no, o.address AS org_address
      FROM ngo_80g_receipts r
      JOIN donors d ON d.id = r.donor_id
      JOIN donations dn ON dn.id = r.donation_id
      CROSS JOIN ngo_organization_details o
      WHERE r.id = ${id} AND r.tenant_id = ${tid} AND o.tenant_id = ${tid}
    `);
    if (!r.rows[0]) return res.status(404).json({ message: "Receipt not found" });
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/receipts/80g/bulk-generate", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const fy = req.body.fy ?? getCurrentFY();
    const { from, to } = getFYDates(fy);
    const donations = await db.execute(sql`
      SELECT dn.id AS donation_id, dn.donor_id, dn.amount, d.name AS donor_name, d.pan_number, d.address
      FROM donations dn
      JOIN donors d ON d.id = dn.donor_id
      LEFT JOIN ngo_80g_receipts r ON r.donation_id = dn.id
      WHERE dn.tenant_id = ${tid}
        AND dn.donation_date BETWEEN ${from} AND ${to}
        AND dn.eligible_80g = true
        AND r.id IS NULL
    `);
    const generated = [];
    for (const don of donations.rows as any[]) {
      const receiptNo = `80G-${tid}-${don.donation_id}`;
      const r = await db.execute(sql`
        INSERT INTO ngo_80g_receipts (tenant_id, donation_id, donor_id, receipt_no, receipt_date,
          amount, donor_name, pan_number, donor_address, created_at)
        VALUES (${tid}, ${don.donation_id}, ${don.donor_id}, ${receiptNo}, NOW(),
          ${don.amount}, ${don.donor_name}, ${don.pan_number}, ${don.address}, NOW())
        ON CONFLICT (donation_id) DO NOTHING
        RETURNING *
      `);
      if (r.rows[0]) generated.push(r.rows[0]);
    }
    res.json({ generated: generated.length, receipts: generated });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/form-10bd/data", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const fy = req.query.fy ?? getCurrentFY();
    const { from, to } = getFYDates(fy as string);
    const r = await db.execute(sql`
      SELECT d.name AS donor_name, d.pan_number, d.address, d.donor_type,
        SUM(dn.amount) AS total_donated,
        COUNT(dn.id) AS donation_count
      FROM donations dn
      JOIN donors d ON d.id = dn.donor_id
      WHERE dn.tenant_id = ${tid}
        AND dn.donation_date BETWEEN ${from} AND ${to}
        AND dn.eligible_80g = true
      GROUP BY d.id, d.name, d.pan_number, d.address, d.donor_type
      ORDER BY total_donated DESC
    `);
    res.json({ fy, donors: r.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/form-10be/generate", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { donor_id } = req.body;
    const donor = await db.execute(sql`SELECT * FROM donors WHERE id = ${donor_id} AND tenant_id = ${tid}`);
    if (!donor.rows[0]) return res.status(404).json({ message: "Donor not found" });
    const receipts = await db.execute(sql`
      SELECT r.*, dn.donation_date, dn.purpose
      FROM ngo_80g_receipts r
      JOIN donations dn ON dn.id = r.donation_id
      WHERE r.donor_id = ${donor_id} AND r.tenant_id = ${tid}
      ORDER BY dn.donation_date
    `);
    res.json({ donor: donor.rows[0], receipts: receipts.rows, certificate_type: "Form 10BE" });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── FCRA COMPLIANCE ─────────────────────────────────────────────────────────

router.get("/fcra/registration", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM ngo_fcra_registrations WHERE tenant_id = ${tid} LIMIT 1`);
    res.json(r.rows[0] ?? {});
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/fcra/registration", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { registration_no, validity_date, account_no, bank_name, bank_branch, ifsc } = req.body;
    const r = await db.execute(sql`
      INSERT INTO ngo_fcra_registrations (tenant_id, registration_no, validity_date, account_no, bank_name, bank_branch, ifsc, updated_at)
      VALUES (${tid}, ${registration_no}, ${validity_date}, ${account_no}, ${bank_name}, ${bank_branch}, ${ifsc}, NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        registration_no = EXCLUDED.registration_no,
        validity_date = EXCLUDED.validity_date,
        account_no = EXCLUDED.account_no,
        bank_name = EXCLUDED.bank_name,
        bank_branch = EXCLUDED.bank_branch,
        ifsc = EXCLUDED.ifsc,
        updated_at = NOW()
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/fcra/foreign-contributions", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT * FROM ngo_foreign_contributions WHERE tenant_id = ${tid} ORDER BY receipt_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/fcra/foreign-contributions", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { donor_name, country, currency, amount, inr_amount, receipt_date } = req.body;
    const r = await db.execute(sql`
      INSERT INTO ngo_foreign_contributions (tenant_id, donor_name, country, currency, amount, inr_amount, receipt_date, created_at)
      VALUES (${tid}, ${donor_name}, ${country}, ${currency}, ${amount}, ${inr_amount}, ${receipt_date}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/fcra/annual-return-data", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const fy = req.query.fy ?? getCurrentFY();
    const { from, to } = getFYDates(fy as string);
    const contributions = await db.execute(sql`
      SELECT donor_name, country, currency, amount, inr_amount, receipt_date
      FROM ngo_foreign_contributions
      WHERE tenant_id = ${tid} AND receipt_date BETWEEN ${from} AND ${to}
      ORDER BY receipt_date
    `);
    const total = await db.execute(sql`
      SELECT SUM(inr_amount) AS total_inr, COUNT(*) AS count
      FROM ngo_foreign_contributions
      WHERE tenant_id = ${tid} AND receipt_date BETWEEN ${from} AND ${to}
    `);
    res.json({ fy, format: "FC-4", ...total.rows[0], contributions: contributions.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/fcra/quarterly-report", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const quarter = req.query.quarter ?? "Q1";
    const fy = req.query.fy ?? getCurrentFY();
    const { from, to } = getQuarterDates(quarter as string, fy as string);
    const r = await db.execute(sql`
      SELECT donor_name, country, currency, amount, inr_amount, receipt_date
      FROM ngo_foreign_contributions
      WHERE tenant_id = ${tid} AND receipt_date BETWEEN ${from} AND ${to}
      ORDER BY receipt_date
    `);
    res.json({ fy, quarter, from, to, contributions: r.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── ONLINE DONATIONS ────────────────────────────────────────────────────────

router.post("/donations/online/create", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { amount, donor_name, email, phone, purpose } = req.body;
    // Create a pending donation record and return a simulated Razorpay order
    const order = await db.execute(sql`
      INSERT INTO donations (tenant_id, amount, donor_name, email, phone, purpose,
        payment_mode, status, eligible_80g, donation_date, created_at)
      VALUES (${tid}, ${amount}, ${donor_name}, ${email}, ${phone}, ${purpose},
        'online', 'pending', true, NOW(), NOW())
      RETURNING *
    `);
    const razorpayOrderId = `order_${Date.now()}`;
    await db.execute(sql`
      UPDATE donations SET razorpay_order_id = ${razorpayOrderId} WHERE id = ${(order.rows[0] as any).id}
    `);
    res.json({
      donation_id: (order.rows[0] as any).id,
      razorpay_order_id: razorpayOrderId,
      amount,
      currency: "INR",
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/donations/online/confirm", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { razorpay_payment_id, razorpay_order_id } = req.body;
    const donation = await db.execute(sql`
      UPDATE donations SET razorpay_payment_id = ${razorpay_payment_id}, status = 'completed'
      WHERE razorpay_order_id = ${razorpay_order_id} AND tenant_id = ${tid}
      RETURNING *
    `);
    if (!donation.rows[0]) return res.status(404).json({ message: "Donation not found" });
    const don = donation.rows[0] as any;
    const receiptNo = `80G-${tid}-${don.id}`;
    const receipt = await db.execute(sql`
      INSERT INTO ngo_80g_receipts (tenant_id, donation_id, donor_id, receipt_no, receipt_date,
        amount, donor_name, created_at)
      VALUES (${tid}, ${don.id}, ${don.donor_id}, ${receiptNo}, NOW(), ${don.amount}, ${don.donor_name}, NOW())
      ON CONFLICT (donation_id) DO NOTHING
      RETURNING *
    `);
    res.json({ donation: don, receipt: receipt.rows[0] ?? null });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/donations/online/list", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT * FROM donations
      WHERE tenant_id = ${tid} AND payment_mode = 'online'
      ORDER BY id DESC LIMIT 100
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── DONOR PORTAL ────────────────────────────────────────────────────────────

router.post("/donor-portal/access", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { email, phone } = req.body;
    const donor = await db.execute(sql`
      SELECT * FROM donors WHERE tenant_id = ${tid}
        AND (email = ${email} OR phone = ${phone})
      LIMIT 1
    `);
    if (!donor.rows[0]) return res.status(404).json({ message: "Donor not found" });
    const token = randomToken();
    const donorId = (donor.rows[0] as any).id;
    await db.execute(sql`
      INSERT INTO ngo_donor_portal_tokens (tenant_id, donor_id, token, expires_at, created_at)
      VALUES (${tid}, ${donorId}, ${token}, NOW() + INTERVAL '7 days', NOW())
      ON CONFLICT (donor_id, tenant_id) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at
    `);
    res.json({ token, donor_id: donorId });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// PUBLIC route — no auth middleware
router.get("/donor-portal/:token", async (req: any, res: any) => {
  try {
    const { token } = req.params;
    const tokenRow = await db.execute(sql`
      SELECT t.*, d.name, d.email, d.phone, d.address, t.tenant_id
      FROM ngo_donor_portal_tokens t
      JOIN donors d ON d.id = t.donor_id
      WHERE t.token = ${token} AND t.expires_at > NOW()
      LIMIT 1
    `);
    if (!tokenRow.rows[0]) return res.status(401).json({ message: "Invalid or expired token" });
    const t = tokenRow.rows[0] as any;
    const donations = await db.execute(sql`
      SELECT dn.*, r.receipt_no FROM donations dn
      LEFT JOIN ngo_80g_receipts r ON r.donation_id = dn.id
      WHERE dn.donor_id = ${t.donor_id} AND dn.tenant_id = ${t.tenant_id}
      ORDER BY dn.donation_date DESC
    `);
    const stories = await db.execute(sql`
      SELECT * FROM ngo_impact_stories WHERE tenant_id = ${t.tenant_id} AND is_published = true ORDER BY id DESC LIMIT 5
    `);
    res.json({ donor: { name: t.name, email: t.email, phone: t.phone }, donations: donations.rows, impact_stories: stories.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/donor-portal/:token/receipts", async (req: any, res: any) => {
  try {
    const { token } = req.params;
    const tokenRow = await db.execute(sql`
      SELECT t.donor_id, t.tenant_id FROM ngo_donor_portal_tokens t
      WHERE t.token = ${token} AND t.expires_at > NOW() LIMIT 1
    `);
    if (!tokenRow.rows[0]) return res.status(401).json({ message: "Invalid or expired token" });
    const t = tokenRow.rows[0] as any;
    const r = await db.execute(sql`
      SELECT r.*, dn.donation_date, dn.purpose, dn.payment_mode
      FROM ngo_80g_receipts r
      JOIN donations dn ON dn.id = r.donation_id
      WHERE r.donor_id = ${t.donor_id} AND r.tenant_id = ${t.tenant_id}
      ORDER BY r.receipt_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── DONOR SEGMENTATION ──────────────────────────────────────────────────────

router.get("/donors/segments", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const major = await db.execute(sql`
      SELECT COUNT(*) AS count FROM (
        SELECT donor_id FROM donations WHERE tenant_id = ${tid} AND status = 'completed'
        GROUP BY donor_id HAVING SUM(amount) > 100000
      ) t
    `);
    const regular = await db.execute(sql`
      SELECT COUNT(*) AS count FROM (
        SELECT donor_id FROM donations WHERE tenant_id = ${tid} AND status = 'completed'
        GROUP BY donor_id HAVING COUNT(*) >= 3
      ) t
    `);
    const oneTime = await db.execute(sql`
      SELECT COUNT(*) AS count FROM (
        SELECT donor_id FROM donations WHERE tenant_id = ${tid} AND status = 'completed'
        GROUP BY donor_id HAVING COUNT(*) = 1
      ) t
    `);
    const lapsed = await db.execute(sql`
      SELECT COUNT(*) AS count FROM (
        SELECT donor_id FROM donations WHERE tenant_id = ${tid} AND status = 'completed'
        GROUP BY donor_id HAVING MAX(donation_date) < CURRENT_DATE - INTERVAL '12 months'
      ) t
    `);
    res.json({
      major: (major.rows[0] as any).count,
      regular: (regular.rows[0] as any).count,
      one_time: (oneTime.rows[0] as any).count,
      lapsed: (lapsed.rows[0] as any).count,
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/donors/major", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT d.id, d.name, d.email, d.phone, SUM(dn.amount) AS lifetime_giving, COUNT(dn.id) AS donation_count
      FROM donors d
      JOIN donations dn ON dn.donor_id = d.id
      WHERE d.tenant_id = ${tid} AND dn.status = 'completed'
      GROUP BY d.id, d.name, d.email, d.phone
      HAVING SUM(dn.amount) > 100000
      ORDER BY lifetime_giving DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/donors/lapsed", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT d.id, d.name, d.email, d.phone,
        MAX(dn.donation_date) AS last_donation_date,
        SUM(dn.amount) AS lifetime_giving
      FROM donors d
      JOIN donations dn ON dn.donor_id = d.id
      WHERE d.tenant_id = ${tid} AND dn.status = 'completed'
      GROUP BY d.id, d.name, d.email, d.phone
      HAVING MAX(dn.donation_date) < CURRENT_DATE - INTERVAL '12 months'
      ORDER BY last_donation_date ASC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/donors/:id/thank-you", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const donor = await db.execute(sql`SELECT * FROM donors WHERE id = ${id} AND tenant_id = ${tid}`);
    if (!donor.rows[0]) return res.status(404).json({ message: "Donor not found" });
    await db.execute(sql`
      INSERT INTO ngo_donor_communications (tenant_id, donor_id, type, message, sent_at)
      VALUES (${tid}, ${id}, 'whatsapp_thank_you', 'Thank you for your generous contribution.', NOW())
    `);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/donors/:id/communication-history", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      SELECT * FROM ngo_donor_communications
      WHERE donor_id = ${id} AND tenant_id = ${tid}
      ORDER BY sent_at DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── FUND ACCOUNTING ─────────────────────────────────────────────────────────

router.get("/funds", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM ngo_funds WHERE tenant_id = ${tid} ORDER BY name`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/funds", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, type, purpose } = req.body;
    const allowed = ["restricted", "unrestricted", "endowment"];
    if (!allowed.includes(type)) return res.status(400).json({ message: "Invalid fund type" });
    const r = await db.execute(sql`
      INSERT INTO ngo_funds (tenant_id, name, type, purpose, created_at)
      VALUES (${tid}, ${name}, ${type}, ${purpose}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/funds/:id/balance", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const fund = await db.execute(sql`SELECT * FROM ngo_funds WHERE id = ${id} AND tenant_id = ${tid}`);
    if (!fund.rows[0]) return res.status(404).json({ message: "Fund not found" });
    const income = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0) AS total FROM ngo_fund_transactions
      WHERE fund_id = ${id} AND tenant_id = ${tid} AND type = 'income'
    `);
    const expenditure = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0) AS total FROM ngo_fund_transactions
      WHERE fund_id = ${id} AND tenant_id = ${tid} AND type = 'expense'
    `);
    const incomeTotal = parseFloat((income.rows[0] as any).total);
    const expTotal = parseFloat((expenditure.rows[0] as any).total);
    res.json({ fund: fund.rows[0], income: incomeTotal, expenditure: expTotal, balance: incomeTotal - expTotal });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/funds/:id/transaction", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { type, amount, description, date, reference } = req.body;
    const allowed = ["income", "expense"];
    if (!allowed.includes(type)) return res.status(400).json({ message: "Invalid transaction type" });
    const r = await db.execute(sql`
      INSERT INTO ngo_fund_transactions (tenant_id, fund_id, type, amount, description, transaction_date, reference, created_at)
      VALUES (${tid}, ${id}, ${type}, ${amount}, ${description}, ${date}, ${reference}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/fund-utilization-certificate/:projectId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { projectId } = req.params;
    const project = await db.execute(sql`SELECT * FROM ngo_projects WHERE id = ${projectId} AND tenant_id = ${tid}`);
    if (!project.rows[0]) return res.status(404).json({ message: "Project not found" });
    const transactions = await db.execute(sql`
      SELECT ft.*, f.name AS fund_name
      FROM ngo_fund_transactions ft
      JOIN ngo_funds f ON f.id = ft.fund_id
      WHERE ft.project_id = ${projectId} AND ft.tenant_id = ${tid}
      ORDER BY ft.transaction_date
    `);
    const summary = await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_received,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_utilized
      FROM ngo_fund_transactions
      WHERE project_id = ${projectId} AND tenant_id = ${tid}
    `);
    res.json({ project: project.rows[0], ...summary.rows[0], transactions: transactions.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────

router.get("/reports/80g-summary", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT
        COUNT(*) AS total_donations,
        COALESCE(SUM(amount), 0) AS total_amount,
        COUNT(CASE WHEN eligible_80g THEN 1 END) AS eligible_80g_count,
        COALESCE(SUM(CASE WHEN eligible_80g THEN amount ELSE 0 END), 0) AS eligible_80g_amount,
        COUNT(CASE WHEN donor_type = 'individual' THEN 1 END) AS individual_count,
        COUNT(CASE WHEN donor_type = 'corporate' THEN 1 END) AS corporate_count
      FROM donations
      WHERE tenant_id = ${tid} AND status = 'completed'
        AND (${from}::date IS NULL OR donation_date >= ${from}::date)
        AND (${to}::date IS NULL OR donation_date <= ${to}::date)
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/donor-wise", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT d.id, d.name, d.pan_number, d.email, d.phone,
        COUNT(dn.id) AS donation_count,
        COALESCE(SUM(dn.amount), 0) AS total_given,
        COUNT(r.id) AS receipts_generated
      FROM donors d
      LEFT JOIN donations dn ON dn.donor_id = d.id AND dn.status = 'completed'
        AND (${from}::date IS NULL OR dn.donation_date >= ${from}::date)
        AND (${to}::date IS NULL OR dn.donation_date <= ${to}::date)
      LEFT JOIN ngo_80g_receipts r ON r.donor_id = d.id
      WHERE d.tenant_id = ${tid}
      GROUP BY d.id, d.name, d.pan_number, d.email, d.phone
      ORDER BY total_given DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/project-budget-actual", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT p.id, p.name, p.budget,
        COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) AS actual_spend,
        p.budget - COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) AS balance,
        CASE WHEN p.budget > 0
          THEN ROUND(COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) / p.budget * 100, 2)
          ELSE 0
        END AS utilization_pct
      FROM ngo_projects p
      LEFT JOIN ngo_fund_transactions ft ON ft.project_id = p.id AND ft.tenant_id = ${tid}
      WHERE p.tenant_id = ${tid}
      GROUP BY p.id, p.name, p.budget
      ORDER BY utilization_pct DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/fcra-summary", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const fy = req.query.fy ?? getCurrentFY();
    const { from, to } = getFYDates(fy as string);
    const r = await db.execute(sql`
      SELECT country,
        COUNT(*) AS contribution_count,
        SUM(inr_amount) AS total_inr,
        COUNT(DISTINCT donor_name) AS donor_count
      FROM ngo_foreign_contributions
      WHERE tenant_id = ${tid} AND receipt_date BETWEEN ${from} AND ${to}
      GROUP BY country
      ORDER BY total_inr DESC
    `);
    const total = await db.execute(sql`
      SELECT SUM(inr_amount) AS grand_total, COUNT(*) AS total_count
      FROM ngo_foreign_contributions
      WHERE tenant_id = ${tid} AND receipt_date BETWEEN ${from} AND ${to}
    `);
    res.json({ fy, by_country: r.rows, ...total.rows[0] });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/annual-report", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const fy = req.query.fy ?? getCurrentFY();
    const { from, to } = getFYDates(fy as string);
    const donations = await db.execute(sql`
      SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
      FROM donations WHERE tenant_id = ${tid} AND status = 'completed'
        AND donation_date BETWEEN ${from} AND ${to}
    `);
    const foreign = await db.execute(sql`
      SELECT COUNT(*) AS count, COALESCE(SUM(inr_amount), 0) AS total
      FROM ngo_foreign_contributions WHERE tenant_id = ${tid}
        AND receipt_date BETWEEN ${from} AND ${to}
    `);
    const expenses = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0) AS total FROM ngo_fund_transactions
      WHERE tenant_id = ${tid} AND type = 'expense'
        AND transaction_date BETWEEN ${from} AND ${to}
    `);
    const projects = await db.execute(sql`
      SELECT COUNT(*) AS count FROM ngo_projects WHERE tenant_id = ${tid} AND status = 'active'
    `);
    res.json({
      fy,
      domestic_donations: donations.rows[0],
      foreign_contributions: foreign.rows[0],
      total_expenditure: (expenses.rows[0] as any).total,
      active_projects: (projects.rows[0] as any).count,
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/csr", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT d.name AS company_name, d.pan_number,
        SUM(dn.amount) AS csr_contribution,
        COUNT(dn.id) AS payments,
        STRING_AGG(DISTINCT dn.purpose, ', ') AS purposes
      FROM donations dn
      JOIN donors d ON d.id = dn.donor_id
      WHERE dn.tenant_id = ${tid} AND dn.status = 'completed' AND d.donor_type = 'corporate'
        AND (${from}::date IS NULL OR dn.donation_date >= ${from}::date)
        AND (${to}::date IS NULL OR dn.donation_date <= ${to}::date)
      GROUP BY d.id, d.name, d.pan_number
      ORDER BY csr_contribution DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/government", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const fy = req.query.fy ?? getCurrentFY();
    const { from, to } = getFYDates(fy as string);
    const donors = await db.execute(sql`
      SELECT d.name, d.pan_number, d.address, d.donor_type, d.email, d.phone,
        SUM(dn.amount) AS total, COUNT(dn.id) AS donation_count
      FROM donations dn
      JOIN donors d ON d.id = dn.donor_id
      WHERE dn.tenant_id = ${tid} AND dn.status = 'completed'
        AND dn.donation_date BETWEEN ${from} AND ${to}
      GROUP BY d.id, d.name, d.pan_number, d.address, d.donor_type, d.email, d.phone
      ORDER BY d.name
    `);
    res.json({ fy, format: "DARPAN", donors: donors.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getCurrentFY(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 4) return `${year}-${String(year + 1).slice(2)}`;
  return `${year - 1}-${String(year).slice(2)}`;
}

function getFYDates(fy: string): { from: string; to: string } {
  const [startYear] = fy.split("-");
  const yr = parseInt(startYear);
  return { from: `${yr}-04-01`, to: `${yr + 1}-03-31` };
}

function getQuarterDates(quarter: string, fy: string): { from: string; to: string } {
  const { from: fyStart } = getFYDates(fy);
  const fyYear = parseInt(fyStart.slice(0, 4));
  const map: Record<string, { from: string; to: string }> = {
    Q1: { from: `${fyYear}-04-01`, to: `${fyYear}-06-30` },
    Q2: { from: `${fyYear}-07-01`, to: `${fyYear}-09-30` },
    Q3: { from: `${fyYear}-10-01`, to: `${fyYear}-12-31` },
    Q4: { from: `${fyYear + 1}-01-01`, to: `${fyYear + 1}-03-31` },
  };
  return map[quarter] ?? map["Q1"];
}

export default router;
