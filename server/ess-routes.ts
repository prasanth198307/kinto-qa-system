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
    let q = sql`SELECT * FROM hr_attendance WHERE employee_id=${eid} AND tenant_id=${tid}`;
    if (month && year) {
      q = sql`${q} AND month=${Number(month)} AND year=${Number(year)}`;
    }
    q = sql`${q} ORDER BY year DESC, month DESC, date DESC`;
    res.json((await db.execute(q)).rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Leaves ────────────────────────────────────────────────────────────────────
router.get("/leaves", requireESS, async (req: any, res) => {
  const eid = getEssEmployeeId(req);
  const tid = getEssTenantId(req);
  try {
    // Get employee type to filter applicable leave types
    const empRow = await db.execute(sql`SELECT employee_type FROM hr_employees WHERE id=${eid} AND tenant_id=${tid}`);
    const empType = (empRow.rows[0] as any)?.employee_type || 'permanent';

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
        ORDER BY la.created_at DESC LIMIT 30
      `),
      db.execute(sql`SELECT * FROM hr_leave_types WHERE tenant_id=${tid} AND record_status=1 ORDER BY name`),
    ]);

    // Filter leave types applicable to this employee type
    const leaveTypes = (allLeaveTypes.rows as any[]).filter(lt => {
      const types = (lt.applicable_emp_types || 'permanent,consultant,contract,intern').split(',').map((t: string) => t.trim());
      return types.includes(empType);
    });

    // Also filter balances to only applicable leave types
    const applicableLtIds = new Set(leaveTypes.map((lt: any) => lt.id));
    const filteredBalances = (balances.rows as any[]).filter(b => applicableLtIds.has(b.leave_type_id));

    res.json({ balances: filteredBalances, applications: applications.rows, leaveTypes, empType });
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
        nps_80ccd, sec_80g, sec_80tta, other_deductions, notes)
      VALUES (${tid}, ${eid}, ${d.fiscalYear || getCurrentFiscalYear()}, ${d.regime || 'new'},
        ${Number(d.licPremium||0)}, ${Number(d.ppf||0)}, ${Number(d.elss||0)}, ${Number(d.nsc||0)},
        ${Number(d.homeLoanPrincipal||0)}, ${Number(d.fdTaxSaving||0)}, ${Number(d.other80c||0)},
        ${Number(d.sec80dSelf||0)}, ${Number(d.sec80dParents||0)}, ${!!d.parentsSeniorCitizen},
        ${Number(d.rentPerMonth||0)}, ${d.cityType||'non_metro'},
        ${Number(d.homeLoanInterest||0)}, ${Number(d.eduLoanInterest||0)},
        ${Number(d.nps80ccd||0)}, ${Number(d.sec80g||0)}, ${Number(d.sec80tta||0)},
        ${Number(d.otherDeductions||0)}, ${d.notes||null})
      ON CONFLICT (tenant_id, employee_id, fiscal_year) DO UPDATE SET
        regime=${d.regime||'new'}, lic_premium=${Number(d.licPremium||0)}, ppf=${Number(d.ppf||0)},
        elss=${Number(d.elss||0)}, nsc=${Number(d.nsc||0)}, home_loan_principal=${Number(d.homeLoanPrincipal||0)},
        fd_tax_saving=${Number(d.fdTaxSaving||0)}, other_80c=${Number(d.other80c||0)},
        sec_80d_self=${Number(d.sec80dSelf||0)}, sec_80d_parents=${Number(d.sec80dParents||0)},
        parents_senior_citizen=${!!d.parentsSeniorCitizen}, rent_per_month=${Number(d.rentPerMonth||0)},
        city_type=${d.cityType||'non_metro'}, home_loan_interest=${Number(d.homeLoanInterest||0)},
        edu_loan_interest=${Number(d.eduLoanInterest||0)}, nps_80ccd=${Number(d.nps80ccd||0)},
        sec_80g=${Number(d.sec80g||0)}, sec_80tta=${Number(d.sec80tta||0)},
        other_deductions=${Number(d.otherDeductions||0)}, notes=${d.notes||null}, updated_at=NOW()
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

function getCurrentFiscalYear(): string {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  return m >= 4 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`;
}

export default router;
