import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { hashPassword } from "./auth";
import { lookupTenantBySlug } from "./tenant-middleware";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const router = Router();
const scryptAsync = promisify(scrypt);

async function compareEssPassword(supplied: string, stored: string): Promise<boolean> {
  try {
    const [salt, hash] = stored.split(":");
    const hashBuffer = Buffer.from(hash, "hex");
    const derivedKey = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashBuffer, derivedKey);
  } catch { return false; }
}

function requireESS(req: any, res: any, next: any) {
  if (!req.session?.essEmployeeId || !req.session?.essTenantId) {
    return res.status(401).json({ message: "ESS login required" });
  }
  next();
}

function getEssTenantId(req: any): number { return req.session.essTenantId; }
function getEssEmployeeId(req: any): number { return req.session.essEmployeeId; }

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post("/login", async (req: any, res) => {
  const { tenantSlug, empCode, password } = req.body;
  if (!tenantSlug || !empCode || !password) {
    return res.status(400).json({ message: "Company ID, employee code, and password are required" });
  }
  try {
    const tenant = await lookupTenantBySlug(tenantSlug);
    if (!tenant) return res.status(400).json({ message: "Company not found. Check your company ID." });

    const empRows = await db.execute(sql`
      SELECT * FROM hr_employees
      WHERE LOWER(emp_code) = LOWER(${empCode}) AND tenant_id = ${tenant.id}
      AND record_status = 1
    `);
    const emp = empRows.rows[0] as any;
    if (!emp) return res.status(401).json({ message: "Invalid employee code or password" });
    if (!emp.ess_enabled) return res.status(403).json({ message: "ESS access not enabled for this account. Contact HR." });
    if (!emp.ess_password) return res.status(403).json({ message: "ESS password not set. Contact HR to activate your account." });

    const valid = await compareEssPassword(password, emp.ess_password);
    if (!valid) return res.status(401).json({ message: "Invalid employee code or password" });

    req.session.essEmployeeId = emp.id;
    req.session.essTenantId = tenant.id;
    req.session.essTenantSlug = tenant.slug;

    res.json({
      id: emp.id, empCode: emp.emp_code,
      name: `${emp.first_name} ${emp.last_name}`,
      tenantId: tenant.id, tenantName: tenant.name,
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/logout", (req: any, res) => {
  req.session.essEmployeeId = null;
  req.session.essTenantId = null;
  req.session.essTenantSlug = null;
  res.json({ success: true });
});

router.get("/me", requireESS, async (req: any, res) => {
  const eid = getEssEmployeeId(req);
  const tid = getEssTenantId(req);
  try {
    const r = await db.execute(sql`
      SELECT e.*, d.name as department_name, des.name as designation_name,
        s.name as shift_name, t.name as tenant_name, t.slug as tenant_slug
      FROM hr_employees e
      LEFT JOIN hr_departments d ON e.department_id = d.id
      LEFT JOIN hr_designations des ON e.designation_id = des.id
      LEFT JOIN hr_shifts s ON e.shift_id = s.id
      LEFT JOIN tenants t ON t.id = e.tenant_id
      WHERE e.id = ${eid} AND e.tenant_id = ${tid}
    `);
    if (!r.rows[0]) return res.status(404).json({ message: "Not found" });
    const emp = r.rows[0] as any;
    // Strip sensitive fields
    delete emp.ess_password;
    res.json(emp);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/change-password", requireESS, async (req: any, res) => {
  const eid = getEssEmployeeId(req);
  const tid = getEssTenantId(req);
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both fields required" });
  if (newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });
  try {
    const r = await db.execute(sql`SELECT ess_password FROM hr_employees WHERE id=${eid} AND tenant_id=${tid}`);
    const emp = r.rows[0] as any;
    if (!emp?.ess_password) return res.status(400).json({ message: "No password set" });
    const valid = await compareEssPassword(currentPassword, emp.ess_password);
    if (!valid) return res.status(401).json({ message: "Current password is incorrect" });
    const hashed = await hashPassword(newPassword);
    await db.execute(sql`UPDATE hr_employees SET ess_password=${hashed} WHERE id=${eid} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Payslips ─────────────────────────────────────────────────────────────────
router.get("/payslips", requireESS, async (req: any, res) => {
  const eid = getEssEmployeeId(req);
  const tid = getEssTenantId(req);
  try {
    const r = await db.execute(sql`
      SELECT p.*, pr.month, pr.year, pr.status as run_status
      FROM hr_payslips p
      JOIN hr_payroll_runs pr ON p.payroll_run_id = pr.id
      WHERE p.employee_id = ${eid} AND p.tenant_id = ${tid}
      ORDER BY pr.year DESC, pr.month DESC
    `);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/payslips/:id", requireESS, async (req: any, res) => {
  const eid = getEssEmployeeId(req);
  const tid = getEssTenantId(req);
  try {
    const r = await db.execute(sql`
      SELECT p.*, pr.month, pr.year, pr.status as run_status,
        e.first_name, e.last_name, e.emp_code, e.pan, e.pf_number, e.esi_number,
        e.bank_account_number, e.bank_name, e.bank_ifsc,
        d.name as department_name, des.name as designation_name
      FROM hr_payslips p
      JOIN hr_payroll_runs pr ON p.payroll_run_id = pr.id
      JOIN hr_employees e ON p.employee_id = e.id
      LEFT JOIN hr_departments d ON e.department_id = d.id
      LEFT JOIN hr_designations des ON e.designation_id = des.id
      WHERE p.id = ${req.params.id} AND p.employee_id = ${eid} AND p.tenant_id = ${tid}
    `);
    if (!r.rows[0]) return res.status(404).json({ message: "Not found" });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Attendance ────────────────────────────────────────────────────────────────
router.get("/attendance", requireESS, async (req: any, res) => {
  const eid = getEssEmployeeId(req);
  const tid = getEssTenantId(req);
  const { month, year } = req.query;
  try {
    let rows;
    if (month && year) {
      rows = await db.execute(sql`
        SELECT * FROM hr_attendance
        WHERE employee_id=${eid} AND tenant_id=${tid} AND record_status=1
          AND EXTRACT(MONTH FROM date)=${Number(month)} AND EXTRACT(YEAR FROM date)=${Number(year)}
        ORDER BY date DESC
      `);
    } else {
      rows = await db.execute(sql`
        SELECT * FROM hr_attendance
        WHERE employee_id=${eid} AND tenant_id=${tid} AND record_status=1
        ORDER BY date DESC LIMIT 60
      `);
    }
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Self attendance marking — Check In / Check Out
router.post("/attendance/mark", requireESS, async (req: any, res) => {
  const eid = getEssEmployeeId(req);
  const tid = getEssTenantId(req);
  try {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(" ")[0].substring(0, 5); // HH:MM

    // Check if record already exists for today
    const existing = await db.execute(sql`
      SELECT * FROM hr_attendance
      WHERE employee_id=${eid} AND tenant_id=${tid} AND date=${todayStr} AND record_status=1
    `);

    if (existing.rows.length === 0) {
      // No record yet → Check In
      await db.execute(sql`
        INSERT INTO hr_attendance (tenant_id, employee_id, date, status, check_in_time, marked_by)
        VALUES (${tid}, ${eid}, ${todayStr}, 'present', ${timeStr}, 'employee')
      `);
      return res.json({ action: "checked_in", time: timeStr });
    }

    const rec = existing.rows[0] as any;
    if (rec.check_in_time && !rec.check_out_time) {
      // Already checked in, not yet out → Check Out
      // Calculate working hours
      const [inH, inM] = (rec.check_in_time as string).split(":").map(Number);
      const [outH, outM] = timeStr.split(":").map(Number);
      const hrs = Math.round(((outH * 60 + outM) - (inH * 60 + inM)) / 6) / 10; // 1 decimal
      await db.execute(sql`
        UPDATE hr_attendance
        SET check_out_time=${timeStr}, working_hours=${hrs > 0 ? hrs : 0}, marked_by='employee'
        WHERE id=${rec.id} AND tenant_id=${tid}
      `);
      return res.json({ action: "checked_out", time: timeStr, hours: hrs > 0 ? hrs : 0 });
    }

    if (rec.check_in_time && rec.check_out_time) {
      return res.json({ action: "already_done", check_in: rec.check_in_time, check_out: rec.check_out_time });
    }

    // Record exists but no check_in_time (admin-created) → update with check-in
    await db.execute(sql`
      UPDATE hr_attendance SET check_in_time=${timeStr}, marked_by='employee', status='present' WHERE id=${rec.id} AND tenant_id=${tid}
    `);
    return res.json({ action: "checked_in", time: timeStr });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Leaves ────────────────────────────────────────────────────────────────────
router.get("/leaves", requireESS, async (req: any, res) => {
  const eid = getEssEmployeeId(req);
  const tid = getEssTenantId(req);
  try {
    const [balances, applications, allLeaveTypes] = await Promise.all([
      db.execute(sql`
        SELECT lb.*, lt.name as leave_type_name, lt.code as type_code
        FROM hr_leave_balances lb
        JOIN hr_leave_types lt ON lb.leave_type_id = lt.id
        WHERE lb.employee_id=${eid} AND lb.tenant_id=${tid}
        ORDER BY lt.name
      `),
      db.execute(sql`
        SELECT la.*, lt.name as leave_type_name
        FROM hr_leave_applications la
        JOIN hr_leave_types lt ON la.leave_type_id = lt.id
        WHERE la.employee_id=${eid} AND la.tenant_id=${tid}
        ORDER BY la.applied_at DESC LIMIT 30
      `),
      db.execute(sql`SELECT * FROM hr_leave_types WHERE tenant_id=${tid} AND (record_status IS NULL OR record_status != 0) ORDER BY name`),
    ]);

    // Return all active leave types for this tenant — no employee-type filtering
    // Balances already reflect per-employee entitlement
    const leaveTypes = allLeaveTypes.rows;

    res.json({ balances: balances.rows, applications: applications.rows, leaveTypes });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/leaves", requireESS, async (req: any, res) => {
  const eid = getEssEmployeeId(req);
  const tid = getEssTenantId(req);
  const { leaveTypeId, fromDate, toDate, reason } = req.body;
  if (!leaveTypeId || !fromDate || !toDate) return res.status(400).json({ message: "Leave type, from date, and to date are required" });
  try {
    const days = Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86400000) + 1;
    const r = await db.execute(sql`
      INSERT INTO hr_leave_applications (tenant_id, employee_id, leave_type_id, from_date, to_date, days, reason, status)
      VALUES (${tid}, ${eid}, ${Number(leaveTypeId)}, ${fromDate}, ${toDate}, ${days}, ${reason || null}, 'pending')
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── TDS Declaration ───────────────────────────────────────────────────────────
router.get("/declaration", requireESS, async (req: any, res) => {
  const eid = getEssEmployeeId(req);
  const tid = getEssTenantId(req);
  const { fiscalYear } = req.query;
  const fy = fiscalYear || getCurrentFiscalYear();
  try {
    const r = await db.execute(sql`
      SELECT * FROM hr_tds_declarations WHERE employee_id=${eid} AND tenant_id=${tid} AND fiscal_year=${fy}
    `);
    res.json(r.rows[0] || null);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/declaration", requireESS, async (req: any, res) => {
  const eid = getEssEmployeeId(req);
  const tid = getEssTenantId(req);
  const d = req.body;
  try {
    const r = await db.execute(sql`
      INSERT INTO hr_tds_declarations (tenant_id, employee_id, fiscal_year, regime,
        lic_premium, ppf, elss, nsc, home_loan_principal, fd_tax_saving, other_80c,
        sec_80d_self, sec_80d_parents, parents_senior_citizen,
        rent_per_month, city_type, home_loan_interest, edu_loan_interest,
        nps_80ccd, sec_80g, sec_80tta, other_deductions, notes, status)
      VALUES (${tid}, ${eid}, ${d.fiscalYear || getCurrentFiscalYear()}, ${d.regime || 'new'},
        ${Number(d.licPremium||0)}, ${Number(d.ppf||0)}, ${Number(d.elss||0)}, ${Number(d.nsc||0)},
        ${Number(d.homeLoanPrincipal||0)}, ${Number(d.fdTaxSaving||0)}, ${Number(d.other80c||0)},
        ${Number(d.sec80dSelf||0)}, ${Number(d.sec80dParents||0)}, ${!!d.parentsSeniorCitizen},
        ${Number(d.rentPerMonth||0)}, ${d.cityType||'non_metro'},
        ${Number(d.homeLoanInterest||0)}, ${Number(d.eduLoanInterest||0)},
        ${Number(d.nps80ccd||0)}, ${Number(d.sec80g||0)}, ${Number(d.sec80tta||0)},
        ${Number(d.otherDeductions||0)}, ${d.notes||null}, 'submitted')
      ON CONFLICT (tenant_id, employee_id, fiscal_year) DO UPDATE SET
        regime=${d.regime||'new'}, lic_premium=${Number(d.licPremium||0)}, ppf=${Number(d.ppf||0)},
        elss=${Number(d.elss||0)}, nsc=${Number(d.nsc||0)}, home_loan_principal=${Number(d.homeLoanPrincipal||0)},
        fd_tax_saving=${Number(d.fdTaxSaving||0)}, other_80c=${Number(d.other80c||0)},
        sec_80d_self=${Number(d.sec80dSelf||0)}, sec_80d_parents=${Number(d.sec80dParents||0)},
        parents_senior_citizen=${!!d.parentsSeniorCitizen}, rent_per_month=${Number(d.rentPerMonth||0)},
        city_type=${d.cityType||'non_metro'}, home_loan_interest=${Number(d.homeLoanInterest||0)},
        edu_loan_interest=${Number(d.eduLoanInterest||0)}, nps_80ccd=${Number(d.nps80ccd||0)},
        sec_80g=${Number(d.sec80g||0)}, sec_80tta=${Number(d.sec80tta||0)},
        other_deductions=${Number(d.otherDeductions||0)}, notes=${d.notes||null}, updated_at=NOW(),
        status=CASE WHEN hr_tds_declarations.status='approved' THEN 'resubmitted' ELSE 'submitted' END,
        approved_by=NULL, approver_comment=NULL, approved_at=NULL
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Admin: Set ESS Password ───────────────────────────────────────────────────
// This route is authenticated via the main admin session, not ESS session
router.post("/admin/set-password", async (req: any, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Admin login required" });
  const adminTenantId = req.session?.tenantId ?? req.user?.tenantId;
  if (!adminTenantId) return res.status(401).json({ message: "No tenant" });

  const { employeeId, password, enabled } = req.body;
  if (!employeeId) return res.status(400).json({ message: "Employee ID required" });
  try {
    if (password) {
      if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
      const hashed = await hashPassword(password);
      await db.execute(sql`
        UPDATE hr_employees SET ess_password=${hashed}, ess_enabled=true
        WHERE id=${Number(employeeId)} AND tenant_id=${adminTenantId}
      `);
    } else if (enabled !== undefined) {
      await db.execute(sql`
        UPDATE hr_employees SET ess_enabled=${!!enabled}
        WHERE id=${Number(employeeId)} AND tenant_id=${adminTenantId}
      `);
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── ESS Expense Claims ───────────────────────────────────────────────────────
router.get("/expense-claims", requireESS, async (req: any, res) => {
  const tid = getEssTenantId(req);
  const eid = getEssEmployeeId(req);
  const claims = await db.execute(sql`SELECT ec.*, e.first_name||' '||e.last_name AS employee_name
    FROM hr_expense_claims ec JOIN hr_employees e ON e.id = ec.employee_id
    WHERE ec.tenant_id=${tid} AND ec.employee_id=${eid} AND ec.record_status=1 ORDER BY ec.created_at DESC`);
  const ids = (claims.rows as any[]).map((c: any) => c.id);
  const items = ids.length > 0
    ? await db.execute(sql`SELECT * FROM hr_expense_claim_items WHERE claim_id = ANY(${ids}::int[]) AND tenant_id=${tid}`)
    : { rows: [] };
  res.json({ claims: claims.rows, items: items.rows });
});

router.post("/expense-claims", requireESS, async (req: any, res) => {
  const tid = getEssTenantId(req);
  const eid = getEssEmployeeId(req);
  const { title, claimDate, items: claimItems, notes } = req.body;
  if (!title || !claimDate) return res.status(400).json({ message: "Title and claim date are required" });
  const total = (claimItems || []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
  const claim = await db.execute(sql`INSERT INTO hr_expense_claims
    (tenant_id, employee_id, title, claim_date, total_amount, notes, status)
    VALUES (${tid}, ${eid}, ${title}, ${claimDate}, ${total}, ${notes||null}, 'pending') RETURNING *`);
  const claimId = (claim.rows[0] as any).id;
  for (const it of claimItems || []) {
    await db.execute(sql`INSERT INTO hr_expense_claim_items
      (tenant_id, claim_id, category, description, amount, receipt_url, expense_date)
      VALUES (${tid}, ${claimId}, ${it.category}, ${it.description||null}, ${it.amount}, ${it.receiptUrl||null}, ${it.expenseDate||null})`);
  }
  res.json(claim.rows[0]);
});

router.delete("/expense-claims/:id", requireESS, async (req: any, res) => {
  const tid = getEssTenantId(req);
  const eid = getEssEmployeeId(req);
  await db.execute(sql`UPDATE hr_expense_claims SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid} AND employee_id=${eid} AND status='pending'`);
  res.json({ success: true });
});

function getCurrentFiscalYear(): string {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  return m >= 4 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`;
}

export default router;
