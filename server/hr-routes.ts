import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────
function getTenantId(req: any): number {
  return req.session?.tenantId ?? req.user?.tenantId;
}

function requireHR(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

// ── Multer for employee photos & documents ───────────────────────────────────
function makeStorage(subdir: string) {
  return multer.diskStorage({
    destination: (req: any, _file, cb) => {
      const tid = getTenantId(req);
      const dir = path.join("uploads", "tenants", String(tid), subdir);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}${ext}`);
    },
  });
}
const photoUpload = multer({ storage: makeStorage("hr_photos"), limits: { fileSize: 5 * 1024 * 1024 } });
const docUpload = multer({ storage: makeStorage("hr_docs"), limits: { fileSize: 20 * 1024 * 1024 } });

// ── DEPARTMENTS ──────────────────────────────────────────────────────────────
router.get("/departments", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM hr_departments WHERE tenant_id = ${tid} AND record_status = 1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/departments", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { name, description } = req.body;
  try {
    const r = await db.execute(sql`INSERT INTO hr_departments (tenant_id, name, description) VALUES (${tid}, ${name}, ${description ?? null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/departments/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { name, description } = req.body;
  try {
    const r = await db.execute(sql`UPDATE hr_departments SET name=${name}, description=${description ?? null} WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/departments/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_departments SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── DESIGNATIONS ─────────────────────────────────────────────────────────────
router.get("/designations", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`SELECT d.*, dep.name as department_name FROM hr_designations d LEFT JOIN hr_departments dep ON d.department_id = dep.id WHERE d.tenant_id = ${tid} AND d.record_status = 1 ORDER BY d.name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/designations", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { name, departmentId, grade } = req.body;
  try {
    const r = await db.execute(sql`INSERT INTO hr_designations (tenant_id, name, department_id, grade) VALUES (${tid}, ${name}, ${departmentId ?? null}, ${grade ?? null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/designations/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { name, departmentId, grade } = req.body;
  try {
    const r = await db.execute(sql`UPDATE hr_designations SET name=${name}, department_id=${departmentId ?? null}, grade=${grade ?? null} WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/designations/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_designations SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── SHIFTS ───────────────────────────────────────────────────────────────────
router.get("/shifts", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM hr_shifts WHERE tenant_id=${tid} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/shifts", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { name, startTime, endTime, breakMinutes, weeklyOff } = req.body;
  try {
    const r = await db.execute(sql`INSERT INTO hr_shifts (tenant_id, name, start_time, end_time, break_minutes, weekly_off) VALUES (${tid}, ${name}, ${startTime ?? null}, ${endTime ?? null}, ${breakMinutes ?? 30}, ${weeklyOff ?? 'sunday'}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/shifts/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { name, startTime, endTime, breakMinutes, weeklyOff } = req.body;
  try {
    const r = await db.execute(sql`UPDATE hr_shifts SET name=${name}, start_time=${startTime ?? null}, end_time=${endTime ?? null}, break_minutes=${breakMinutes ?? 30}, weekly_off=${weeklyOff ?? 'sunday'} WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/shifts/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_shifts SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── LEAVE TYPES ──────────────────────────────────────────────────────────────
router.get("/leave-types", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM hr_leave_types WHERE tenant_id=${tid} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/leave-types", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { name, code, annualDays, isCarryForward, maxCarryForward, isEncashable, isPaidLeave } = req.body;
  try {
    const r = await db.execute(sql`INSERT INTO hr_leave_types (tenant_id, name, code, annual_days, is_carry_forward, max_carry_forward, is_encashable, is_paid_leave) VALUES (${tid}, ${name}, ${code}, ${annualDays ?? 0}, ${isCarryForward ?? false}, ${maxCarryForward ?? 0}, ${isEncashable ?? false}, ${isPaidLeave ?? true}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/leave-types/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { name, code, annualDays, isCarryForward, maxCarryForward, isEncashable, isPaidLeave } = req.body;
  try {
    const r = await db.execute(sql`UPDATE hr_leave_types SET name=${name}, code=${code}, annual_days=${annualDays ?? 0}, is_carry_forward=${isCarryForward ?? false}, max_carry_forward=${maxCarryForward ?? 0}, is_encashable=${isEncashable ?? false}, is_paid_leave=${isPaidLeave ?? true} WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/leave-types/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_leave_types SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── HOLIDAYS ─────────────────────────────────────────────────────────────────
router.get("/holidays", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const year = req.query.year || new Date().getFullYear();
  try {
    const rows = await db.execute(sql`SELECT * FROM hr_holidays WHERE tenant_id=${tid} AND year=${year} AND record_status=1 ORDER BY date`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/holidays", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { year, date, name, type, isPaid } = req.body;
  try {
    const r = await db.execute(sql`INSERT INTO hr_holidays (tenant_id, year, date, name, type, is_paid) VALUES (${tid}, ${year}, ${date}, ${name}, ${type ?? 'festival'}, ${isPaid ?? true}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/holidays/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { date, name, type, isPaid } = req.body;
  try {
    const r = await db.execute(sql`UPDATE hr_holidays SET date=${date}, name=${name}, type=${type ?? 'festival'}, is_paid=${isPaid ?? true} WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/holidays/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_holidays SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── SALARY COMPONENTS ────────────────────────────────────────────────────────
router.get("/salary-components", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM hr_salary_components WHERE tenant_id=${tid} AND record_status=1 ORDER BY type, name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/salary-components", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { name, code, type, formulaType, formulaValue, isStatutory, showOnPayslip } = req.body;
  try {
    const r = await db.execute(sql`INSERT INTO hr_salary_components (tenant_id, name, code, type, formula_type, formula_value, is_statutory, show_on_payslip) VALUES (${tid}, ${name}, ${code}, ${type}, ${formulaType ?? 'fixed'}, ${formulaValue ?? 0}, ${isStatutory ?? false}, ${showOnPayslip ?? true}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/salary-components/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { name, code, type, formulaType, formulaValue, isStatutory, showOnPayslip } = req.body;
  try {
    const r = await db.execute(sql`UPDATE hr_salary_components SET name=${name}, code=${code}, type=${type}, formula_type=${formulaType ?? 'fixed'}, formula_value=${formulaValue ?? 0}, is_statutory=${isStatutory ?? false}, show_on_payslip=${showOnPayslip ?? true} WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/salary-components/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_salary_components SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── SALARY STRUCTURES ────────────────────────────────────────────────────────
router.get("/salary-structures", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM hr_salary_structures WHERE tenant_id=${tid} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/salary-structures", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { name, components } = req.body;
  try {
    const r = await db.execute(sql`INSERT INTO hr_salary_structures (tenant_id, name, components) VALUES (${tid}, ${name}, ${JSON.stringify(components ?? [])}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/salary-structures/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { name, components } = req.body;
  try {
    const r = await db.execute(sql`UPDATE hr_salary_structures SET name=${name}, components=${JSON.stringify(components ?? [])} WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/salary-structures/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_salary_structures SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── EMPLOYEES ────────────────────────────────────────────────────────────────
router.get("/employees", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`
      SELECT e.*,
        dep.name as department_name,
        des.name as designation_name,
        s.name as shift_name
      FROM hr_employees e
      LEFT JOIN hr_departments dep ON e.department_id = dep.id
      LEFT JOIN hr_designations des ON e.designation_id = des.id
      LEFT JOIN hr_shifts s ON e.shift_id = s.id
      WHERE e.tenant_id = ${tid} AND e.record_status = 1
      ORDER BY e.emp_code
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/employees/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const emp = await db.execute(sql`
      SELECT e.*,
        dep.name as department_name,
        des.name as designation_name,
        s.name as shift_name,
        ss.name as salary_structure_name
      FROM hr_employees e
      LEFT JOIN hr_departments dep ON e.department_id = dep.id
      LEFT JOIN hr_designations des ON e.designation_id = des.id
      LEFT JOIN hr_shifts s ON e.shift_id = s.id
      LEFT JOIN hr_salary_structures ss ON e.salary_structure_id = ss.id
      WHERE e.id = ${req.params.id} AND e.tenant_id = ${tid}
    `);
    if (!emp.rows.length) return res.status(404).json({ message: "Employee not found" });
    const docs = await db.execute(sql`SELECT * FROM hr_employee_documents WHERE employee_id=${req.params.id} AND tenant_id=${tid} AND record_status=1 ORDER BY uploaded_at DESC`);
    res.json({ ...emp.rows[0], documents: docs.rows });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/employees", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const d = req.body;
  try {
    const r = await db.execute(sql`
      INSERT INTO hr_employees (
        tenant_id, emp_code, first_name, last_name, gender, date_of_birth, blood_group,
        department_id, designation_id, shift_id, salary_structure_id, basic_salary, ctc,
        join_date, reporting_manager_id, phone, email, address, emergency_contact,
        pan, aadhaar, pf_number, esi_number, uan, bank_account, ifsc, bank_name, tax_regime
      ) VALUES (
        ${tid}, ${d.empCode}, ${d.firstName}, ${d.lastName ?? null}, ${d.gender ?? null},
        ${d.dateOfBirth ?? null}, ${d.bloodGroup ?? null},
        ${d.departmentId ?? null}, ${d.designationId ?? null}, ${d.shiftId ?? null},
        ${d.salaryStructureId ?? null}, ${d.basicSalary ?? 0}, ${d.ctc ?? 0},
        ${d.joinDate}, ${d.reportingManagerId ?? null}, ${d.phone ?? null},
        ${d.email ?? null}, ${d.address ?? null}, ${d.emergencyContact ?? null},
        ${d.pan ?? null}, ${d.aadhaar ?? null}, ${d.pfNumber ?? null},
        ${d.esiNumber ?? null}, ${d.uan ?? null}, ${d.bankAccount ?? null},
        ${d.ifsc ?? null}, ${d.bankName ?? null}, ${d.taxRegime ?? 'new'}
      ) RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/employees/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const d = req.body;
  try {
    const r = await db.execute(sql`
      UPDATE hr_employees SET
        emp_code=${d.empCode}, first_name=${d.firstName}, last_name=${d.lastName ?? null},
        gender=${d.gender ?? null}, date_of_birth=${d.dateOfBirth ?? null}, blood_group=${d.bloodGroup ?? null},
        department_id=${d.departmentId ?? null}, designation_id=${d.designationId ?? null},
        shift_id=${d.shiftId ?? null}, salary_structure_id=${d.salaryStructureId ?? null},
        basic_salary=${d.basicSalary ?? 0}, ctc=${d.ctc ?? 0}, join_date=${d.joinDate},
        reporting_manager_id=${d.reportingManagerId ?? null}, phone=${d.phone ?? null},
        email=${d.email ?? null}, address=${d.address ?? null}, emergency_contact=${d.emergencyContact ?? null},
        pan=${d.pan ?? null}, aadhaar=${d.aadhaar ?? null}, pf_number=${d.pfNumber ?? null},
        esi_number=${d.esiNumber ?? null}, uan=${d.uan ?? null}, bank_account=${d.bankAccount ?? null},
        ifsc=${d.ifsc ?? null}, bank_name=${d.bankName ?? null}, tax_regime=${d.taxRegime ?? 'new'},
        status=${d.status ?? 'active'}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Upload employee photo
router.post("/employees/:id/photo", requireHR, photoUpload.single("photo"), async (req: any, res) => {
  const tid = getTenantId(req);
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const filePath = req.file.path;
  try {
    await db.execute(sql`UPDATE hr_employees SET photo_path=${filePath} WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ photoPath: filePath });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Upload employee document
router.post("/employees/:id/documents", requireHR, docUpload.single("file"), async (req: any, res) => {
  const tid = getTenantId(req);
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const { documentType, notes } = req.body;
  try {
    const r = await db.execute(sql`
      INSERT INTO hr_employee_documents (tenant_id, employee_id, document_type, file_name, file_path, notes)
      VALUES (${tid}, ${req.params.id}, ${documentType}, ${req.file.originalname}, ${req.file.path}, ${notes ?? null})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/employees/:id/documents/:docId", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_employee_documents SET record_status=0 WHERE id=${req.params.docId} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/employees/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_employees SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── ATTENDANCE ───────────────────────────────────────────────────────────────
router.get("/attendance", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { month, year, employeeId } = req.query;
  try {
    let q = sql`SELECT a.*, e.first_name, e.last_name, e.emp_code FROM hr_attendance a JOIN hr_employees e ON a.employee_id = e.id WHERE a.tenant_id = ${tid} AND a.record_status = 1`;
    if (month && year) {
      q = sql`SELECT a.*, e.first_name, e.last_name, e.emp_code FROM hr_attendance a JOIN hr_employees e ON a.employee_id = e.id WHERE a.tenant_id = ${tid} AND a.record_status = 1 AND EXTRACT(MONTH FROM a.date) = ${Number(month)} AND EXTRACT(YEAR FROM a.date) = ${Number(year)}`;
    }
    if (employeeId) {
      q = sql`SELECT a.*, e.first_name, e.last_name, e.emp_code FROM hr_attendance a JOIN hr_employees e ON a.employee_id = e.id WHERE a.tenant_id = ${tid} AND a.record_status = 1 AND a.employee_id = ${Number(employeeId)} ORDER BY a.date DESC`;
    }
    const rows = await db.execute(q);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/attendance", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { employeeId, date, status, otHours, shiftId, remarks } = req.body;
  try {
    // Upsert — if record for that employee+date exists, update it
    const existing = await db.execute(sql`SELECT id FROM hr_attendance WHERE employee_id=${employeeId} AND date=${date} AND tenant_id=${tid}`);
    if (existing.rows.length) {
      const r = await db.execute(sql`UPDATE hr_attendance SET status=${status}, ot_hours=${otHours ?? 0}, shift_id=${shiftId ?? null}, remarks=${remarks ?? null} WHERE id=${(existing.rows[0] as any).id} RETURNING *`);
      return res.json(r.rows[0]);
    }
    const r = await db.execute(sql`INSERT INTO hr_attendance (tenant_id, employee_id, date, status, ot_hours, shift_id, remarks) VALUES (${tid}, ${employeeId}, ${date}, ${status}, ${otHours ?? 0}, ${shiftId ?? null}, ${remarks ?? null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Bulk attendance
router.post("/attendance/bulk", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { records } = req.body; // [{employeeId, date, status, otHours}]
  try {
    const results = [];
    for (const rec of records) {
      const existing = await db.execute(sql`SELECT id FROM hr_attendance WHERE employee_id=${rec.employeeId} AND date=${rec.date} AND tenant_id=${tid}`);
      if (existing.rows.length) {
        const r = await db.execute(sql`UPDATE hr_attendance SET status=${rec.status}, ot_hours=${rec.otHours ?? 0} WHERE id=${(existing.rows[0] as any).id} RETURNING *`);
        results.push(r.rows[0]);
      } else {
        const r = await db.execute(sql`INSERT INTO hr_attendance (tenant_id, employee_id, date, status, ot_hours) VALUES (${tid}, ${rec.employeeId}, ${rec.date}, ${rec.status}, ${rec.otHours ?? 0}) RETURNING *`);
        results.push(r.rows[0]);
      }
    }
    res.json({ saved: results.length });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// OT register — GET all OT entries for a month (ot_hours > 0)
router.get("/attendance/ot", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { month, year } = req.query;
  try {
    const rows = await db.execute(sql`
      SELECT a.id, a.employee_id, a.date, a.ot_hours, a.status, a.remarks,
             e.first_name, e.last_name, e.emp_code
      FROM hr_attendance a
      JOIN hr_employees e ON e.id = a.employee_id
      WHERE a.tenant_id=${tid} AND a.record_status=1
        AND a.ot_hours > 0
        AND EXTRACT(MONTH FROM a.date)=${Number(month)}
        AND EXTRACT(YEAR FROM a.date)=${Number(year)}
      ORDER BY a.date, e.emp_code
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// OT register — POST upsert OT hours for an employee on a date (preserves attendance status)
router.post("/attendance/ot", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { employeeId, date, otHours, remarks } = req.body;
  if (!employeeId || !date) return res.status(400).json({ message: "employeeId and date required" });
  try {
    const existing = await db.execute(sql`
      SELECT id, status FROM hr_attendance
      WHERE employee_id=${employeeId} AND date=${date} AND tenant_id=${tid}
    `);
    if (existing.rows.length) {
      const r = await db.execute(sql`
        UPDATE hr_attendance SET ot_hours=${Number(otHours) || 0}, remarks=${remarks ?? null}
        WHERE id=${(existing.rows[0] as any).id} RETURNING *
      `);
      return res.json(r.rows[0]);
    }
    // No attendance record yet — create with present + OT hours
    const r = await db.execute(sql`
      INSERT INTO hr_attendance (tenant_id, employee_id, date, status, ot_hours, remarks)
      VALUES (${tid}, ${employeeId}, ${date}, 'present', ${Number(otHours) || 0}, ${remarks ?? null}) RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// OT register — DELETE (clear OT hours for one record)
router.delete("/attendance/ot/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_attendance SET ot_hours=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Monthly attendance summary per employee
router.get("/attendance/summary", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { month, year } = req.query;
  try {
    const rows = await db.execute(sql`
      SELECT e.id, e.emp_code, e.first_name, e.last_name,
        COUNT(CASE WHEN a.status='present' THEN 1 END) as present,
        COUNT(CASE WHEN a.status='absent' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status='half_day' THEN 1 END) as half_day,
        COUNT(CASE WHEN a.status='lop' THEN 1 END) as lop,
        COUNT(CASE WHEN a.status='on_leave' THEN 1 END) as on_leave,
        COALESCE(SUM(a.ot_hours),0) as total_ot_hours
      FROM hr_employees e
      LEFT JOIN hr_attendance a ON e.id=a.employee_id AND EXTRACT(MONTH FROM a.date)=${Number(month)} AND EXTRACT(YEAR FROM a.date)=${Number(year)} AND a.record_status=1
      WHERE e.tenant_id=${tid} AND e.record_status=1 AND e.status='active'
      GROUP BY e.id, e.emp_code, e.first_name, e.last_name
      ORDER BY e.emp_code
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── LEAVE MANAGEMENT ─────────────────────────────────────────────────────────
router.get("/leave-balances", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { employeeId, year } = req.query;
  try {
    const rows = await db.execute(sql`
      SELECT lb.*, lt.name as leave_type_name, lt.code
      FROM hr_leave_balances lb
      JOIN hr_leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.tenant_id=${tid} AND lb.employee_id=${Number(employeeId)} AND lb.year=${Number(year || new Date().getFullYear())}
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/leave-balances/initialize", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { employeeId, year } = req.body;
  try {
    const leaveTypes = await db.execute(sql`SELECT * FROM hr_leave_types WHERE tenant_id=${tid} AND record_status=1`);
    for (const lt of leaveTypes.rows as any[]) {
      const existing = await db.execute(sql`SELECT id FROM hr_leave_balances WHERE tenant_id=${tid} AND employee_id=${employeeId} AND leave_type_id=${lt.id} AND year=${year}`);
      if (!existing.rows.length) {
        await db.execute(sql`INSERT INTO hr_leave_balances (tenant_id, employee_id, leave_type_id, year, entitled, used, balance) VALUES (${tid}, ${employeeId}, ${lt.id}, ${year}, ${lt.annual_days}, 0, ${lt.annual_days})`);
      }
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/leave-applications", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { employeeId, status } = req.query;
  try {
    const rows = await db.execute(sql`
      SELECT la.*, lt.name as leave_type_name, lt.code,
        e.first_name, e.last_name, e.emp_code
      FROM hr_leave_applications la
      JOIN hr_leave_types lt ON la.leave_type_id = lt.id
      JOIN hr_employees e ON la.employee_id = e.id
      WHERE la.tenant_id=${tid} AND la.record_status=1
      ${employeeId ? sql`AND la.employee_id=${Number(employeeId)}` : sql``}
      ${status ? sql`AND la.status=${String(status)}` : sql``}
      ORDER BY la.applied_at DESC
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/leave-applications", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { employeeId, leaveTypeId, fromDate, toDate, days, reason } = req.body;
  try {
    const r = await db.execute(sql`
      INSERT INTO hr_leave_applications (tenant_id, employee_id, leave_type_id, from_date, to_date, days, reason)
      VALUES (${tid}, ${employeeId}, ${leaveTypeId}, ${fromDate}, ${toDate}, ${days}, ${reason ?? null})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/leave-applications/:id/action", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { status, approverComment } = req.body;
  const userId = (req.user as any)?.id;
  try {
    const app = await db.execute(sql`SELECT * FROM hr_leave_applications WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (!app.rows.length) return res.status(404).json({ message: "Not found" });
    await db.execute(sql`UPDATE hr_leave_applications SET status=${status}, approved_by=${userId ?? null}, approver_comment=${approverComment ?? null}, action_at=NOW() WHERE id=${req.params.id}`);
    // Update balance if approved
    if (status === 'approved') {
      const a = app.rows[0] as any;
      const year = new Date(a.from_date).getFullYear();
      await db.execute(sql`
        UPDATE hr_leave_balances SET used=used+${a.days}, balance=balance-${a.days}
        WHERE tenant_id=${tid} AND employee_id=${a.employee_id} AND leave_type_id=${a.leave_type_id} AND year=${year}
      `);
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── PAYROLL ───────────────────────────────────────────────────────────────────
router.get("/payroll-runs", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM hr_payroll_runs WHERE tenant_id=${tid} ORDER BY year DESC, month DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/payroll-runs", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { month, year } = req.body;
  try {
    // Check if already exists
    const existing = await db.execute(sql`SELECT id FROM hr_payroll_runs WHERE tenant_id=${tid} AND month=${month} AND year=${year}`);
    if (existing.rows.length) return res.status(400).json({ message: "Payroll already exists for this month" });
    const r = await db.execute(sql`INSERT INTO hr_payroll_runs (tenant_id, month, year) VALUES (${tid}, ${month}, ${year}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Process payroll — calculate payslips for all active employees
router.post("/payroll-runs/:id/process", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const runId = Number(req.params.id);
  try {
    const run = await db.execute(sql`SELECT * FROM hr_payroll_runs WHERE id=${runId} AND tenant_id=${tid}`);
    if (!run.rows.length) return res.status(404).json({ message: "Payroll run not found" });
    const { month, year } = run.rows[0] as any;

    // Get working days in month (from attendance)
    const daysInMonth = new Date(year, month, 0).getDate();
    const workingDays = 26; // Standard for Indian payroll

    // Get all active employees
    const employees = await db.execute(sql`SELECT * FROM hr_employees WHERE tenant_id=${tid} AND record_status=1 AND status='active'`);

    let totalGross = 0, totalDeductions = 0, totalNet = 0;

    for (const emp of employees.rows as any[]) {
      // Get attendance summary
      const att = await db.execute(sql`
        SELECT
          COUNT(CASE WHEN status='present' THEN 1 END) as present,
          COUNT(CASE WHEN status='half_day' THEN 1 END) as half_day,
          COUNT(CASE WHEN status='on_leave' THEN 1 END) as on_leave,
          COUNT(CASE WHEN status='lop' THEN 1 END) as lop,
          COALESCE(SUM(ot_hours),0) as ot_hours
        FROM hr_attendance
        WHERE employee_id=${emp.id} AND tenant_id=${tid}
        AND EXTRACT(MONTH FROM date)=${month} AND EXTRACT(YEAR FROM date)=${year} AND record_status=1
      `);
      const a = att.rows[0] as any;
      const present = Number(a.present || 0);
      const halfDay = Number(a.half_day || 0);
      const onLeave = Number(a.on_leave || 0);
      const lop = Number(a.lop || 0);
      const otHours = Number(a.ot_hours || 0);
      const daysWorked = present + (halfDay * 0.5) + onLeave;
      const lopDays = lop;

      // Salary calculation
      const basicSalary = emp.basic_salary || 0;
      const dailyRate = basicSalary / workingDays;
      const grossSalary = Math.round(dailyRate * Math.min(daysWorked, workingDays));

      // OT pay (1.5x rate)
      const otPay = Math.round((dailyRate / 8) * 1.5 * otHours);
      const totalGrossSalary = grossSalary + otPay;

      // PF: 12% of basic (employee), capped at 1800
      const pfEmployee = basicSalary <= 15000 ? Math.round(basicSalary * 0.12) : 1800;
      const pfEmployer = pfEmployee;

      // ESI: 0.75% if gross <= 21000
      const esiEmployee = totalGrossSalary <= 21000 ? Math.round(totalGrossSalary * 0.0075) : 0;
      const esiEmployer = totalGrossSalary <= 21000 ? Math.round(totalGrossSalary * 0.0325) : 0;

      // PT: Simple slab
      let pt = 0;
      if (totalGrossSalary > 15000) pt = 200;
      else if (totalGrossSalary > 10000) pt = 150;
      else if (totalGrossSalary > 7500) pt = 100;

      const totalDeductionsAmt = pfEmployee + esiEmployee + pt;
      const netSalary = totalGrossSalary - totalDeductionsAmt;

      totalGross += totalGrossSalary;
      totalDeductions += totalDeductionsAmt;
      totalNet += netSalary;

      // Delete old payslip for this employee+month if draft
      await db.execute(sql`DELETE FROM hr_payslips WHERE payroll_run_id=${runId} AND employee_id=${emp.id} AND tenant_id=${tid}`);

      // Create payslip
      await db.execute(sql`
        INSERT INTO hr_payslips (
          tenant_id, payroll_run_id, employee_id, month, year, days_in_month,
          days_worked, days_absent, lop_days, ot_hours, basic_salary, gross_salary,
          pf_employee, pf_employer, esi_employee, esi_employer, pt, tds, total_deductions, net_salary
        ) VALUES (
          ${tid}, ${runId}, ${emp.id}, ${month}, ${year}, ${workingDays},
          ${daysWorked}, ${daysInMonth - Math.round(daysWorked) - lopDays}, ${lopDays}, ${otHours},
          ${basicSalary}, ${totalGrossSalary},
          ${pfEmployee}, ${pfEmployer}, ${esiEmployee}, ${esiEmployer}, ${pt}, 0,
          ${totalDeductionsAmt}, ${netSalary}
        )
      `);
    }

    // Update run totals
    await db.execute(sql`
      UPDATE hr_payroll_runs SET
        status='draft', total_gross=${totalGross}, total_deductions=${totalDeductions},
        total_net=${totalNet}, employee_count=${employees.rows.length}, processed_at=NOW()
      WHERE id=${runId}
    `);

    res.json({ success: true, employeeCount: employees.rows.length, totalGross, totalNet });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/payroll-runs/:id/approve", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_payroll_runs SET status='approved', approved_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tid}`);
    await db.execute(sql`UPDATE hr_payslips SET status='approved' WHERE payroll_run_id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/payroll-runs/:id/lock", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_payroll_runs SET status='locked' WHERE id=${req.params.id} AND tenant_id=${tid}`);
    await db.execute(sql`UPDATE hr_payslips SET status='locked' WHERE payroll_run_id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Get payslips for a payroll run
router.get("/payroll-runs/:id/payslips", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`
      SELECT p.*, e.first_name, e.last_name, e.emp_code, e.designation_id,
        e.pan, e.pf_number, e.esi_number, e.bank_account, e.ifsc, e.bank_name,
        dep.name as department_name, des.name as designation_name
      FROM hr_payslips p
      JOIN hr_employees e ON p.employee_id = e.id
      LEFT JOIN hr_departments dep ON e.department_id = dep.id
      LEFT JOIN hr_designations des ON e.designation_id = des.id
      WHERE p.payroll_run_id=${req.params.id} AND p.tenant_id=${tid}
      ORDER BY e.emp_code
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Get single payslip with full details
router.get("/payslips/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const r = await db.execute(sql`
      SELECT p.*, e.first_name, e.last_name, e.emp_code,
        e.pan, e.pf_number, e.esi_number, e.uan, e.bank_account, e.ifsc, e.bank_name,
        dep.name as department_name, des.name as designation_name
      FROM hr_payslips p
      JOIN hr_employees e ON p.employee_id = e.id
      LEFT JOIN hr_departments dep ON e.department_id = dep.id
      LEFT JOIN hr_designations des ON e.designation_id = des.id
      WHERE p.id=${req.params.id} AND p.tenant_id=${tid}
    `);
    if (!r.rows.length) return res.status(404).json({ message: "Payslip not found" });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// All payslips for an employee (history)
router.get("/employees/:id/payslips", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`
      SELECT p.*, r.status as run_status
      FROM hr_payslips p
      JOIN hr_payroll_runs r ON p.payroll_run_id = r.id
      WHERE p.employee_id=${req.params.id} AND p.tenant_id=${tid}
      ORDER BY p.year DESC, p.month DESC
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
