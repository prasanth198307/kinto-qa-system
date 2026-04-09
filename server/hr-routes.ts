import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { whatsappService } from "./whatsappService";

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

// ── PT SLABS ────────────────────────────────────────────────────────────────
router.get("/pt-slabs", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM hr_pt_slabs WHERE tenant_id=${tid} AND record_status=1 ORDER BY state, income_from`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/pt-slabs", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { state, income_from, income_to, pt_amount } = req.body;
  try {
    const r = await db.execute(sql`INSERT INTO hr_pt_slabs (tenant_id, state, income_from, income_to, pt_amount) VALUES (${tid}, ${state}, ${income_from}, ${income_to ?? null}, ${pt_amount}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/pt-slabs/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { state, income_from, income_to, pt_amount } = req.body;
  try {
    const r = await db.execute(sql`UPDATE hr_pt_slabs SET state=${state}, income_from=${income_from}, income_to=${income_to ?? null}, pt_amount=${pt_amount} WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/pt-slabs/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_pt_slabs SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
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
        join_date, exit_date, exit_type, exit_reason, resignation_date,
        reporting_manager_id, phone, alternate_phone, email,
        address, city, state, pincode,
        emergency_contact, emergency_contact_name, emergency_contact_relation,
        pan, aadhaar, pf_number, esi_number, uan, bank_account, ifsc, bank_name, tax_regime,
        marital_status, spouse_name, spouse_dob, spouse_aadhaar,
        father_name, father_dob, father_aadhaar,
        mother_name, mother_dob, mother_aadhaar, number_of_children, status
      ) VALUES (
        ${tid}, ${d.empCode}, ${d.firstName}, ${d.lastName ?? null}, ${d.gender ?? null},
        ${d.dateOfBirth ?? null}, ${d.bloodGroup ?? null},
        ${d.departmentId ?? null}, ${d.designationId ?? null}, ${d.shiftId ?? null},
        ${d.salaryStructureId ?? null}, ${d.basicSalary ?? 0}, ${d.ctc ?? 0},
        ${d.joinDate}, ${d.exitDate ?? null}, ${d.exitType ?? null}, ${d.exitReason ?? null}, ${d.resignationDate ?? null},
        ${d.reportingManagerId ?? null}, ${d.phone ?? null}, ${d.alternatePhone ?? null}, ${d.email ?? null},
        ${d.address ?? null}, ${d.city ?? null}, ${d.state ?? null}, ${d.pincode ?? null},
        ${d.emergencyContact ?? null}, ${d.emergencyContactName ?? null}, ${d.emergencyContactRelation ?? null},
        ${d.pan ?? null}, ${d.aadhaar ?? null}, ${d.pfNumber ?? null},
        ${d.esiNumber ?? null}, ${d.uan ?? null}, ${d.bankAccount ?? null},
        ${d.ifsc ?? null}, ${d.bankName ?? null}, ${d.taxRegime ?? 'new'},
        ${d.maritalStatus ?? null}, ${d.spouseName ?? null}, ${d.spouseDob ?? null}, ${d.spouseAadhaar ?? null},
        ${d.fatherName ?? null}, ${d.fatherDob ?? null}, ${d.fatherAadhaar ?? null},
        ${d.motherName ?? null}, ${d.motherDob ?? null}, ${d.motherAadhaar ?? null},
        ${d.numberOfChildren ?? 0}, ${d.status ?? 'active'}
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
        exit_date=${d.exitDate ?? null}, exit_type=${d.exitType ?? null},
        exit_reason=${d.exitReason ?? null}, resignation_date=${d.resignationDate ?? null},
        reporting_manager_id=${d.reportingManagerId ?? null},
        phone=${d.phone ?? null}, alternate_phone=${d.alternatePhone ?? null},
        email=${d.email ?? null}, address=${d.address ?? null},
        city=${d.city ?? null}, state=${d.state ?? null}, pincode=${d.pincode ?? null},
        emergency_contact=${d.emergencyContact ?? null},
        emergency_contact_name=${d.emergencyContactName ?? null},
        emergency_contact_relation=${d.emergencyContactRelation ?? null},
        pan=${d.pan ?? null}, aadhaar=${d.aadhaar ?? null}, pf_number=${d.pfNumber ?? null},
        esi_number=${d.esiNumber ?? null}, uan=${d.uan ?? null}, bank_account=${d.bankAccount ?? null},
        ifsc=${d.ifsc ?? null}, bank_name=${d.bankName ?? null}, tax_regime=${d.taxRegime ?? 'new'},
        marital_status=${d.maritalStatus ?? null}, spouse_name=${d.spouseName ?? null},
        spouse_dob=${d.spouseDob ?? null}, spouse_aadhaar=${d.spouseAadhaar ?? null},
        father_name=${d.fatherName ?? null}, father_dob=${d.fatherDob ?? null},
        father_aadhaar=${d.fatherAadhaar ?? null}, mother_name=${d.motherName ?? null},
        mother_dob=${d.motherDob ?? null}, mother_aadhaar=${d.motherAadhaar ?? null},
        number_of_children=${d.numberOfChildren ?? 0},
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
    const app = await db.execute(sql`
      SELECT la.*, lt.name as leave_type_name, lt.code,
        e.first_name, e.last_name, e.phone
      FROM hr_leave_applications la
      JOIN hr_leave_types lt ON la.leave_type_id = lt.id
      JOIN hr_employees e ON la.employee_id = e.id
      WHERE la.id=${req.params.id} AND la.tenant_id=${tid}
    `);
    if (!app.rows.length) return res.status(404).json({ message: "Not found" });
    const a = app.rows[0] as any;
    await db.execute(sql`UPDATE hr_leave_applications SET status=${status}, approved_by=${userId ?? null}, approver_comment=${approverComment ?? null}, action_at=NOW() WHERE id=${req.params.id}`);
    if (status === 'approved') {
      const year = new Date(a.from_date).getFullYear();
      await db.execute(sql`
        UPDATE hr_leave_balances SET used=used+${a.days}, balance=balance-${a.days}
        WHERE tenant_id=${tid} AND employee_id=${a.employee_id} AND leave_type_id=${a.leave_type_id} AND year=${year}
      `);
    }
    // WhatsApp notification to employee
    if (a.phone) {
      const actionWord = status === 'approved' ? 'approved' : 'rejected';
      const comment = approverComment ? `\nComment: ${approverComment}` : '';
      const msg = `Hi ${a.first_name},\n\nYour ${a.leave_type_name} (${a.code}) leave application from ${a.from_date} to ${a.to_date} (${a.days} day${a.days > 1 ? 's' : ''}) has been *${actionWord}*.${comment}\n\n- HR Team`;
      whatsappService.sendTextMessage({ to: a.phone, message: msg }).catch(() => {});
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Leave calendar — returns approved leaves for a given month/year
router.get("/leave-calendar", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { month, year } = req.query;
  const m = Number(month) || new Date().getMonth() + 1;
  const y = Number(year) || new Date().getFullYear();
  try {
    const rows = await db.execute(sql`
      SELECT la.from_date, la.to_date, la.days, la.status,
        e.first_name, e.last_name, e.emp_code,
        lt.name as leave_type_name, lt.code as leave_code
      FROM hr_leave_applications la
      JOIN hr_employees e ON la.employee_id = e.id
      JOIN hr_leave_types lt ON la.leave_type_id = lt.id
      WHERE la.tenant_id=${tid} AND la.record_status=1
        AND la.status IN ('approved', 'pending')
        AND (
          (EXTRACT(MONTH FROM la.from_date)=${m} AND EXTRACT(YEAR FROM la.from_date)=${y})
          OR (EXTRACT(MONTH FROM la.to_date)=${m} AND EXTRACT(YEAR FROM la.to_date)=${y})
        )
      ORDER BY la.from_date
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Year-end carry forward
router.post("/leave-balances/carry-forward", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { fromYear } = req.body;
  const srcYear = Number(fromYear) || new Date().getFullYear();
  const destYear = srcYear + 1;
  try {
    // Get all encashable leave types
    const ltypes = await db.execute(sql`SELECT * FROM hr_leave_types WHERE tenant_id=${tid} AND is_carry_forward=true AND record_status=1`);
    // Get all active employees
    const emps = await db.execute(sql`SELECT id FROM hr_employees WHERE tenant_id=${tid} AND record_status=1 AND status='active'`);
    let processed = 0;
    for (const emp of emps.rows as any[]) {
      for (const lt of ltypes.rows as any[]) {
        const bal = await db.execute(sql`
          SELECT * FROM hr_leave_balances WHERE tenant_id=${tid} AND employee_id=${emp.id} AND leave_type_id=${lt.id} AND year=${srcYear}
        `);
        if (!bal.rows.length) continue;
        const b = bal.rows[0] as any;
        const carryOver = Math.min(Number(b.balance ?? 0), Number(lt.max_carry_forward ?? 0));
        if (carryOver <= 0) continue;
        // Check if dest year balance exists
        const existing = await db.execute(sql`
          SELECT id FROM hr_leave_balances WHERE tenant_id=${tid} AND employee_id=${emp.id} AND leave_type_id=${lt.id} AND year=${destYear}
        `);
        if (existing.rows.length) {
          await db.execute(sql`
            UPDATE hr_leave_balances SET entitled=entitled+${carryOver}, balance=balance+${carryOver}
            WHERE tenant_id=${tid} AND employee_id=${emp.id} AND leave_type_id=${lt.id} AND year=${destYear}
          `);
        } else {
          await db.execute(sql`
            INSERT INTO hr_leave_balances (tenant_id, employee_id, leave_type_id, year, entitled, used, balance)
            VALUES (${tid}, ${emp.id}, ${lt.id}, ${destYear}, ${carryOver}, 0, ${carryOver})
          `);
        }
        processed++;
      }
    }
    res.json({ success: true, message: `Carry forward completed. ${processed} leave balance(s) carried over to ${destYear}.` });
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

// Helper: calculate annual tax given taxable income and regime
function calcAnnualTax(taxableIncome: number, regime: string): number {
  if (taxableIncome <= 0) return 0;
  if (regime === 'new') {
    // New regime slabs (FY 2024-25) with rebate u/s 87A up to ₹7L
    let tax = 0;
    if (taxableIncome > 1500000) tax += (taxableIncome - 1500000) * 0.30;
    if (taxableIncome > 1200000) tax += (Math.min(taxableIncome, 1500000) - 1200000) * 0.20;
    if (taxableIncome > 900000) tax += (Math.min(taxableIncome, 1200000) - 900000) * 0.15;
    if (taxableIncome > 600000) tax += (Math.min(taxableIncome, 900000) - 600000) * 0.10;
    if (taxableIncome > 300000) tax += (Math.min(taxableIncome, 600000) - 300000) * 0.05;
    if (taxableIncome <= 700000) tax = 0; // 87A rebate
    return Math.round(tax);
  } else {
    // Old regime slabs
    let tax = 0;
    if (taxableIncome > 1000000) tax += (taxableIncome - 1000000) * 0.30;
    if (taxableIncome > 500000) tax += (Math.min(taxableIncome, 1000000) - 500000) * 0.20;
    if (taxableIncome > 250000) tax += (Math.min(taxableIncome, 500000) - 250000) * 0.05;
    if (taxableIncome <= 500000) tax = 0; // 87A rebate
    return Math.round(tax);
  }
}

// Process payroll — calculate payslips for all active employees
router.post("/payroll-runs/:id/process", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const runId = Number(req.params.id);
  try {
    const run = await db.execute(sql`SELECT * FROM hr_payroll_runs WHERE id=${runId} AND tenant_id=${tid}`);
    if (!run.rows.length) return res.status(404).json({ message: "Payroll run not found" });
    const runRow = run.rows[0] as any;
    if (runRow.status === 'locked') return res.status(400).json({ message: "Payroll is locked" });
    const { month, year } = runRow;

    const daysInMonth = new Date(year, month, 0).getDate();
    const workingDays = 26;

    // Get all active employees with their salary structures
    const employees = await db.execute(sql`
      SELECT e.*, ss.components as structure_components
      FROM hr_employees e
      LEFT JOIN hr_salary_structures ss ON e.salary_structure_id = ss.id
      WHERE e.tenant_id=${tid} AND e.record_status=1 AND e.status='active'
    `);

    // Get PT slabs for tenant
    const ptSlabs = await db.execute(sql`SELECT * FROM hr_pt_slabs WHERE tenant_id=${tid} AND record_status=1 ORDER BY income_from`);

    let totalGross = 0, totalDeductions = 0, totalNet = 0;

    for (const emp of employees.rows as any[]) {
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
      const attendancePct = workingDays > 0 ? Math.min(daysWorked, workingDays) / workingDays : 0;

      const basicSalary = Number(emp.basic_salary || 0);
      const dailyRate = basicSalary / workingDays;
      const proRataBasic = Math.round(basicSalary * attendancePct);
      const otPay = Math.round((dailyRate / 8) * 1.5 * otHours);

      // Build component-wise breakdown from salary structure
      const structureComponents: any[] = emp.structure_components
        ? (typeof emp.structure_components === 'string' ? JSON.parse(emp.structure_components) : emp.structure_components)
        : [];

      const componentBreakdown: any[] = [];
      let totalEarnings = proRataBasic;
      let componentGross = 0;

      if (structureComponents.length > 0) {
        for (const comp of structureComponents) {
          if (comp.type !== 'earning') continue;
          if (comp.code === 'BASIC' || comp.name?.toLowerCase() === 'basic') {
            componentBreakdown.push({ name: 'Basic Salary', code: 'BASIC', amount: proRataBasic, type: 'earning' });
            componentGross += proRataBasic;
            continue;
          }
          let amount = 0;
          if (comp.formula_type === 'percent_of_basic' || comp.formula_type === 'percentage') {
            amount = Math.round(basicSalary * (Number(comp.formula_value) / 100) * attendancePct);
          } else {
            amount = Math.round(Number(comp.formula_value || 0) * attendancePct);
          }
          if (amount > 0) {
            componentBreakdown.push({ name: comp.name, code: comp.code, amount, type: 'earning' });
            componentGross += amount;
          }
        }
        totalEarnings = componentGross;
      } else {
        componentBreakdown.push({ name: 'Basic Salary', code: 'BASIC', amount: proRataBasic, type: 'earning' });
        totalEarnings = proRataBasic;
      }

      if (otPay > 0) {
        componentBreakdown.push({ name: 'Overtime Pay', code: 'OT', amount: otPay, type: 'earning' });
        totalEarnings += otPay;
      }

      const totalGrossSalary = totalEarnings;

      // PF: 12% of basic (employee), capped at 1800
      const pfEmployee = basicSalary <= 15000 ? Math.round(basicSalary * 0.12) : 1800;
      const pfEmployer = pfEmployee;

      // ESI: 0.75% if gross <= 21000
      const esiEmployee = totalGrossSalary <= 21000 ? Math.round(totalGrossSalary * 0.0075) : 0;
      const esiEmployer = totalGrossSalary <= 21000 ? Math.round(totalGrossSalary * 0.0325) : 0;

      // PT: from state slabs or fallback
      let pt = 0;
      const empState = (emp.state || '').toLowerCase();
      const matchSlabs = (ptSlabs.rows as any[]).filter(s => s.state.toLowerCase() === empState);
      if (matchSlabs.length > 0) {
        for (const slab of matchSlabs) {
          if (totalGrossSalary >= Number(slab.income_from) && (slab.income_to === null || totalGrossSalary <= Number(slab.income_to))) {
            pt = Number(slab.pt_amount);
            break;
          }
        }
      } else {
        if (totalGrossSalary > 15000) pt = 200;
        else if (totalGrossSalary > 10000) pt = 150;
        else if (totalGrossSalary > 7500) pt = 100;
      }

      // TDS: project annual taxable income and compute monthly TDS
      const monthsRemaining = Math.max(1, 12 - month + 1);
      const annualProjectedGross = totalGrossSalary * 12;
      const regime = emp.tax_regime || 'new';
      const standardDeduction = regime === 'new' ? 75000 : 50000;
      const taxableIncome = Math.max(0, annualProjectedGross - standardDeduction - (pfEmployee * 12));
      const annualTax = calcAnnualTax(taxableIncome, regime);
      const tds = Math.round(annualTax / 12);

      componentBreakdown.push({ name: 'PF (Employee)', code: 'PF_EMP', amount: pfEmployee, type: 'deduction' });
      if (esiEmployee > 0) componentBreakdown.push({ name: 'ESI (Employee)', code: 'ESI_EMP', amount: esiEmployee, type: 'deduction' });
      if (pt > 0) componentBreakdown.push({ name: 'Professional Tax', code: 'PT', amount: pt, type: 'deduction' });
      if (tds > 0) componentBreakdown.push({ name: 'TDS', code: 'TDS', amount: tds, type: 'deduction' });

      // Loan / Advance EMI deductions
      const activeLoans = await db.execute(sql`
        SELECT * FROM hr_loans
        WHERE employee_id=${emp.id} AND tenant_id=${tid} AND status='active' AND record_status=1
        AND (start_year < ${year} OR (start_year=${year} AND start_month <= ${month}))
        ORDER BY created_at
      `);
      let loanDeductionTotal = 0;
      for (const loan of activeLoans.rows as any[]) {
        const deductAmt = Math.min(Number(loan.emi), Number(loan.outstanding));
        if (deductAmt <= 0) continue;
        const newOutstanding = Number(loan.outstanding) - deductAmt;
        loanDeductionTotal += deductAmt;
        const label = loan.loan_type === 'advance' ? 'Advance Recovery' : 'Loan Recovery';
        componentBreakdown.push({ name: label, code: `LOAN_${loan.id}`, amount: deductAmt, type: 'deduction' });
        // Update outstanding and close loan if fully paid
        await db.execute(sql`
          UPDATE hr_loans SET outstanding=${newOutstanding}, status=${newOutstanding <= 0 ? 'closed' : 'active'}
          WHERE id=${loan.id} AND tenant_id=${tid}
        `);
        await db.execute(sql`
          INSERT INTO hr_loan_ledger (loan_id, tenant_id, payroll_run_id, month, year, deducted_amount, balance_after, notes)
          VALUES (${loan.id}, ${tid}, ${runId}, ${month}, ${year}, ${deductAmt}, ${newOutstanding}, 'Auto-deducted via payroll')
        `);
      }

      const totalDeductionsAmt = pfEmployee + esiEmployee + pt + tds + loanDeductionTotal;
      const netSalary = totalGrossSalary - totalDeductionsAmt;

      totalGross += totalGrossSalary;
      totalDeductions += totalDeductionsAmt;
      totalNet += netSalary;

      await db.execute(sql`DELETE FROM hr_payslips WHERE payroll_run_id=${runId} AND employee_id=${emp.id} AND tenant_id=${tid}`);

      await db.execute(sql`
        INSERT INTO hr_payslips (
          tenant_id, payroll_run_id, employee_id, month, year, days_in_month,
          days_worked, days_absent, lop_days, ot_hours, basic_salary, gross_salary,
          pf_employee, pf_employer, esi_employee, esi_employer, pt, tds,
          other_deductions, total_deductions, net_salary, components
        ) VALUES (
          ${tid}, ${runId}, ${emp.id}, ${month}, ${year}, ${workingDays},
          ${daysWorked}, ${daysInMonth - Math.round(daysWorked) - lopDays}, ${lopDays}, ${otHours},
          ${basicSalary}, ${totalGrossSalary},
          ${pfEmployee}, ${pfEmployer}, ${esiEmployee}, ${esiEmployer}, ${pt}, ${tds},
          ${loanDeductionTotal}, ${totalDeductionsAmt}, ${netSalary}, ${JSON.stringify(componentBreakdown)}
        )
      `);
    }

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
    await db.execute(sql`UPDATE hr_payroll_runs SET status='locked', locked_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tid}`);
    await db.execute(sql`UPDATE hr_payslips SET status='locked' WHERE payroll_run_id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/payroll-runs/:id/unlock", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { reason } = req.body;
  try {
    await db.execute(sql`UPDATE hr_payroll_runs SET status='approved', locked_at=NULL, unlock_reason=${reason ?? null} WHERE id=${req.params.id} AND tenant_id=${tid}`);
    await db.execute(sql`UPDATE hr_payslips SET status='approved' WHERE payroll_run_id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Bank transfer file — CSV with bank details + net salary
router.get("/payroll-runs/:id/bank-file", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`
      SELECT p.net_salary, e.first_name, e.last_name, e.emp_code,
        e.bank_account, e.ifsc, e.bank_name,
        dep.name as department_name
      FROM hr_payslips p
      JOIN hr_employees e ON p.employee_id = e.id
      LEFT JOIN hr_departments dep ON e.department_id = dep.id
      WHERE p.payroll_run_id=${req.params.id} AND p.tenant_id=${tid}
      ORDER BY e.emp_code
    `);
    const run = await db.execute(sql`SELECT month, year FROM hr_payroll_runs WHERE id=${req.params.id} AND tenant_id=${tid}`);
    const { month, year } = (run.rows[0] as any) || { month: 1, year: 2025 };
    const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let csv = 'Emp Code,Employee Name,Department,Bank Account,IFSC Code,Bank Name,Net Salary\n';
    for (const r of rows.rows as any[]) {
      csv += `${r.emp_code},"${r.first_name} ${r.last_name}","${r.department_name || ''}",${r.bank_account || ''},${r.ifsc || ''},"${r.bank_name || ''}",${r.net_salary}\n`;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="salary_bank_${MONTHS[month]}_${year}.csv"`);
    res.send(csv);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Send payslip via WhatsApp to all employees in a run
router.post("/payroll-runs/:id/send-whatsapp", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`
      SELECT p.*, e.first_name, e.phone, p.month, p.year
      FROM hr_payslips p
      JOIN hr_employees e ON p.employee_id = e.id
      WHERE p.payroll_run_id=${req.params.id} AND p.tenant_id=${tid}
    `);
    const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let sent = 0, skipped = 0;
    for (const p of rows.rows as any[]) {
      if (!p.phone) { skipped++; continue; }
      const msg = `Hi ${p.first_name},\n\nYour salary for *${MONTHS[p.month]} ${p.year}* has been credited.\n\n💰 Gross: ₹${Number(p.gross_salary).toLocaleString('en-IN')}\n🔻 Deductions: ₹${Number(p.total_deductions).toLocaleString('en-IN')}\n✅ Net Pay: ₹${Number(p.net_salary).toLocaleString('en-IN')}\n\nFor detailed payslip, please contact HR.\n\n- HR Team`;
      const ok = await whatsappService.sendTextMessage({ to: p.phone, message: msg }).catch(() => false);
      if (ok) sent++; else skipped++;
    }
    res.json({ success: true, sent, skipped });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Send single payslip via WhatsApp
router.post("/payslips/:id/send-whatsapp", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const r = await db.execute(sql`
      SELECT p.*, e.first_name, e.phone
      FROM hr_payslips p JOIN hr_employees e ON p.employee_id = e.id
      WHERE p.id=${req.params.id} AND p.tenant_id=${tid}
    `);
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    const p = r.rows[0] as any;
    if (!p.phone) return res.status(400).json({ message: "Employee has no phone number" });
    const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const msg = `Hi ${p.first_name},\n\nYour salary for *${MONTHS[p.month]} ${p.year}* has been credited.\n\n💰 Gross: ₹${Number(p.gross_salary).toLocaleString('en-IN')}\n🔻 Deductions: ₹${Number(p.total_deductions).toLocaleString('en-IN')}\n✅ Net Pay: ₹${Number(p.net_salary).toLocaleString('en-IN')}\n\nFor detailed payslip, please contact HR.\n\n- HR Team`;
    const ok = await whatsappService.sendTextMessage({ to: p.phone, message: msg });
    res.json({ success: ok, message: ok ? "Sent" : "Failed to send" });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Send payslips via email for all employees in a run
router.post("/payroll-runs/:id/send-email", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`
      SELECT p.*, e.first_name, e.last_name, e.email, p.month, p.year
      FROM hr_payslips p
      JOIN hr_employees e ON p.employee_id = e.id
      WHERE p.payroll_run_id=${req.params.id} AND p.tenant_id=${tid}
    `);
    const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let sent = 0, skipped = 0;
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: 'smtp.office365.com', port: 587, secure: false,
      auth: { user: process.env.OFFICE365_EMAIL, pass: process.env.OFFICE365_PASSWORD },
    });
    for (const p of rows.rows as any[]) {
      if (!p.email) { skipped++; continue; }
      const html = `<p>Dear ${p.first_name} ${p.last_name},</p>
<p>Your salary for <strong>${MONTHS[p.month]} ${p.year}</strong> has been processed.</p>
<table border="1" cellpadding="6" style="border-collapse:collapse">
  <tr><td>Gross Salary</td><td>₹${Number(p.gross_salary).toLocaleString('en-IN')}</td></tr>
  <tr><td>Total Deductions</td><td>₹${Number(p.total_deductions).toLocaleString('en-IN')}</td></tr>
  <tr><td><strong>Net Pay</strong></td><td><strong>₹${Number(p.net_salary).toLocaleString('en-IN')}</strong></td></tr>
</table>
<p>For detailed payslip, please contact HR.</p><p>- HR Team</p>`;
      try {
        await transporter.sendMail({
          from: process.env.OFFICE365_EMAIL,
          to: p.email,
          subject: `Payslip for ${MONTHS[p.month]} ${p.year}`,
          html,
        });
        sent++;
      } catch { skipped++; }
    }
    res.json({ success: true, sent, skipped });
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

// ── SALARY REVISIONS ─────────────────────────────────────────────────────────
router.get("/salary-revisions", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { employeeId } = req.query;
  try {
    let rows;
    if (employeeId) {
      rows = await db.execute(sql`
        SELECT sr.*, e.first_name, e.last_name, e.emp_code
        FROM hr_salary_revisions sr
        JOIN hr_employees e ON sr.employee_id = e.id
        WHERE sr.tenant_id=${tid} AND sr.employee_id=${Number(employeeId)} AND sr.record_status=1
        ORDER BY sr.effective_date DESC
      `);
    } else {
      rows = await db.execute(sql`
        SELECT sr.*, e.first_name, e.last_name, e.emp_code
        FROM hr_salary_revisions sr
        JOIN hr_employees e ON sr.employee_id = e.id
        WHERE sr.tenant_id=${tid} AND sr.record_status=1
        ORDER BY sr.effective_date DESC
      `);
    }
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/salary-revisions", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const d = req.body;
  try {
    const r = await db.execute(sql`
      INSERT INTO hr_salary_revisions
        (tenant_id, employee_id, effective_date, old_basic, new_basic, old_ctc, new_ctc, revision_type, reason, approved_by)
      VALUES
        (${tid}, ${d.employeeId}, ${d.effectiveDate}, ${d.oldBasic ?? 0}, ${d.newBasic},
         ${d.oldCtc ?? 0}, ${d.newCtc}, ${d.revisionType ?? 'increment'}, ${d.reason ?? null}, ${d.approvedBy ?? null})
      RETURNING *
    `);
    // Also update employee's current salary
    await db.execute(sql`
      UPDATE hr_employees SET basic_salary=${d.newBasic}, ctc=${d.newCtc}, updated_at=NOW()
      WHERE id=${d.employeeId} AND tenant_id=${tid}
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/salary-revisions/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_salary_revisions SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── HR REPORTS ────────────────────────────────────────────────────────────────

// Employee directory report
router.get("/reports/employee-directory", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { status, departmentId } = req.query;
  try {
    let q = sql`
      SELECT e.*, d.name as department_name, des.name as designation_name, s.name as shift_name
      FROM hr_employees e
      LEFT JOIN hr_departments d ON e.department_id = d.id
      LEFT JOIN hr_designations des ON e.designation_id = des.id
      LEFT JOIN hr_shifts s ON e.shift_id = s.id
      WHERE e.tenant_id=${tid} AND e.record_status=1
    `;
    if (status) q = sql`${q} AND e.status=${status}`;
    if (departmentId) q = sql`${q} AND e.department_id=${Number(departmentId)}`;
    q = sql`${q} ORDER BY e.emp_code`;
    const rows = await db.execute(q);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Attendance summary report
router.get("/reports/attendance-summary", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { month, year, departmentId } = req.query;
  if (!month || !year) return res.status(400).json({ message: "month and year required" });
  try {
    const rows = await db.execute(sql`
      SELECT
        e.id, e.emp_code, e.first_name, e.last_name,
        d.name as department_name, des.name as designation_name,
        COUNT(CASE WHEN a.status='present' THEN 1 END) as present_days,
        COUNT(CASE WHEN a.status='absent' THEN 1 END) as absent_days,
        COUNT(CASE WHEN a.status='half_day' THEN 1 END) as half_days,
        COUNT(CASE WHEN a.status='lop' THEN 1 END) as lop_days,
        COUNT(CASE WHEN a.status='on_leave' THEN 1 END) as leave_days,
        COUNT(CASE WHEN a.status='weekly_off' THEN 1 END) as weekly_off,
        COUNT(CASE WHEN a.status='holiday' THEN 1 END) as holidays,
        COALESCE(SUM(CAST(ot.ot_hours AS numeric)), 0) as total_ot_hours
      FROM hr_employees e
      LEFT JOIN hr_departments d ON e.department_id = d.id
      LEFT JOIN hr_designations des ON e.designation_id = des.id
      LEFT JOIN hr_attendance a ON a.employee_id = e.id
        AND EXTRACT(MONTH FROM a.date) = ${Number(month)}
        AND EXTRACT(YEAR FROM a.date) = ${Number(year)}
        AND a.record_status = 1
      LEFT JOIN hr_ot_records ot ON ot.employee_id = e.id
        AND EXTRACT(MONTH FROM ot.date) = ${Number(month)}
        AND EXTRACT(YEAR FROM ot.date) = ${Number(year)}
        AND ot.record_status = 1
      WHERE e.tenant_id=${tid} AND e.record_status=1 AND e.status='active'
      ${departmentId ? sql`AND e.department_id=${Number(departmentId)}` : sql``}
      GROUP BY e.id, e.emp_code, e.first_name, e.last_name, d.name, des.name
      ORDER BY e.emp_code
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Payroll summary report
router.get("/reports/payroll-summary", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { month, year } = req.query;
  try {
    let q = sql`
      SELECT
        r.id as run_id, r.month, r.year, r.status as run_status,
        COUNT(p.id) as employee_count,
        SUM(p.basic_salary) as total_basic,
        SUM(p.gross_salary) as total_gross,
        SUM(p.total_deductions) as total_deductions,
        SUM(p.net_salary) as total_net,
        SUM(p.pf_employee) as total_pf_employee,
        SUM(p.pf_employer) as total_pf_employer,
        SUM(p.esi_employee) as total_esi_employee,
        SUM(p.esi_employer) as total_esi_employer,
        SUM(p.professional_tax) as total_pt,
        SUM(p.income_tax) as total_tds
      FROM hr_payroll_runs r
      LEFT JOIN hr_payslips p ON p.payroll_run_id = r.id AND p.tenant_id=${tid}
      WHERE r.tenant_id=${tid}
    `;
    if (month && year) {
      q = sql`${q} AND r.month=${Number(month)} AND r.year=${Number(year)}`;
    }
    q = sql`${q} GROUP BY r.id, r.month, r.year, r.status ORDER BY r.year DESC, r.month DESC`;
    const rows = await db.execute(q);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Leave balance report
router.get("/reports/leave-balance", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { year, departmentId } = req.query;
  const y = year ? Number(year) : new Date().getFullYear();
  try {
    const rows = await db.execute(sql`
      SELECT
        e.emp_code, e.first_name, e.last_name,
        d.name as department_name, des.name as designation_name,
        lt.name as leave_type, lt.code as leave_code,
        lb.total_days, lb.used_days, lb.pending_days,
        (lb.total_days - lb.used_days - lb.pending_days) as balance_days
      FROM hr_employees e
      LEFT JOIN hr_departments d ON e.department_id = d.id
      LEFT JOIN hr_designations des ON e.designation_id = des.id
      JOIN hr_leave_balances lb ON lb.employee_id = e.id AND lb.year=${y}
      JOIN hr_leave_types lt ON lt.id = lb.leave_type_id AND lt.tenant_id=${tid}
      WHERE e.tenant_id=${tid} AND e.record_status=1 AND e.status='active'
      ${departmentId ? sql`AND e.department_id=${Number(departmentId)}` : sql``}
      ORDER BY e.emp_code, lt.name
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Salary revision report
router.get("/reports/salary-revisions", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { fromDate, toDate, departmentId } = req.query;
  try {
    let q = sql`
      SELECT sr.*, e.first_name, e.last_name, e.emp_code, d.name as department_name, des.name as designation_name
      FROM hr_salary_revisions sr
      JOIN hr_employees e ON sr.employee_id = e.id
      LEFT JOIN hr_departments d ON e.department_id = d.id
      LEFT JOIN hr_designations des ON e.designation_id = des.id
      WHERE sr.tenant_id=${tid} AND sr.record_status=1
    `;
    if (fromDate) q = sql`${q} AND sr.effective_date >= ${fromDate}`;
    if (toDate) q = sql`${q} AND sr.effective_date <= ${toDate}`;
    if (departmentId) q = sql`${q} AND e.department_id=${Number(departmentId)}`;
    q = sql`${q} ORDER BY sr.effective_date DESC`;
    const rows = await db.execute(q);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── LOANS & ADVANCES ─────────────────────────────────────────────────────────
router.get("/loans", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { employeeId } = req.query;
  try {
    let q = sql`
      SELECT l.*, e.first_name, e.last_name, e.emp_code, dep.name as department_name
      FROM hr_loans l
      JOIN hr_employees e ON l.employee_id = e.id
      LEFT JOIN hr_departments dep ON e.department_id = dep.id
      WHERE l.tenant_id=${tid} AND l.record_status=1
    `;
    if (employeeId) q = sql`${q} AND l.employee_id=${Number(employeeId)}`;
    q = sql`${q} ORDER BY l.created_at DESC`;
    res.json((await db.execute(q)).rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/loans/:id/ledger", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`
      SELECT * FROM hr_loan_ledger WHERE loan_id=${req.params.id} AND tenant_id=${tid} ORDER BY year, month
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/loans", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { employeeId, loanType, purpose, sanctionedAmount, emi, disbursedDate, startMonth, startYear, notes } = req.body;
  try {
    const r = await db.execute(sql`
      INSERT INTO hr_loans (tenant_id, employee_id, loan_type, purpose, sanctioned_amount, outstanding, emi,
        disbursed_date, start_month, start_year, notes)
      VALUES (${tid}, ${Number(employeeId)}, ${loanType || 'loan'}, ${purpose ?? null}, ${Number(sanctionedAmount)},
        ${Number(sanctionedAmount)}, ${Number(emi)}, ${disbursedDate ?? null},
        ${Number(startMonth)}, ${Number(startYear)}, ${notes ?? null})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/loans/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { emi, status, notes, outstanding } = req.body;
  try {
    const updates: string[] = [];
    if (emi !== undefined) updates.push(`emi=${Number(emi)}`);
    if (status !== undefined) updates.push(`status='${status}'`);
    if (notes !== undefined) updates.push(`notes=${notes ? `'${notes.replace(/'/g, "''")}'` : 'NULL'}`);
    if (outstanding !== undefined) updates.push(`outstanding=${Number(outstanding)}`);
    if (updates.length === 0) return res.json({ success: true });
    await db.execute(sql`UPDATE hr_loans SET ${sql.raw(updates.join(','))} WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/loans/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_loans SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── PAYSLIP SETTINGS ─────────────────────────────────────────────────────────
router.get("/payslip-settings", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const r = await db.execute(sql`SELECT * FROM hr_payslip_settings WHERE tenant_id=${tid}`);
    res.json(r.rows[0] || { signatory_name: null, signatory_designation: null, show_employer_contributions: true, show_loan_deductions: true, footer_note: null });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/payslip-settings", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { signatoryName, signatoryDesignation, showEmployerContributions, showLoanDeductions, footerNote } = req.body;
  try {
    await db.execute(sql`
      INSERT INTO hr_payslip_settings (tenant_id, signatory_name, signatory_designation, show_employer_contributions, show_loan_deductions, footer_note, updated_at)
      VALUES (${tid}, ${signatoryName ?? null}, ${signatoryDesignation ?? null}, ${showEmployerContributions ?? true}, ${showLoanDeductions ?? true}, ${footerNote ?? null}, NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        signatory_name=${signatoryName ?? null}, signatory_designation=${signatoryDesignation ?? null},
        show_employer_contributions=${showEmployerContributions ?? true}, show_loan_deductions=${showLoanDeductions ?? true},
        footer_note=${footerNote ?? null}, updated_at=NOW()
    `);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── PHASE 4: TDS DECLARATIONS ────────────────────────────────────────────────
router.get("/tds-declarations", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { employeeId, fiscalYear } = req.query;
  try {
    let q = sql`SELECT td.*, e.first_name, e.last_name, e.emp_code
      FROM hr_tds_declarations td
      JOIN hr_employees e ON td.employee_id = e.id
      WHERE td.tenant_id=${tid}`;
    if (employeeId) q = sql`${q} AND td.employee_id=${Number(employeeId)}`;
    if (fiscalYear) q = sql`${q} AND td.fiscal_year=${fiscalYear}`;
    q = sql`${q} ORDER BY e.first_name, e.last_name`;
    res.json((await db.execute(q)).rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/tds-declarations/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const r = await db.execute(sql`SELECT * FROM hr_tds_declarations WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (!r.rows[0]) return res.status(404).json({ message: 'Not found' });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/tds-declarations", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const d = req.body;
  try {
    const r = await db.execute(sql`
      INSERT INTO hr_tds_declarations (tenant_id, employee_id, fiscal_year, regime,
        lic_premium, ppf, elss, nsc, home_loan_principal, fd_tax_saving, other_80c,
        sec_80d_self, sec_80d_parents, parents_senior_citizen,
        rent_per_month, city_type, home_loan_interest, edu_loan_interest,
        nps_80ccd, sec_80g, sec_80tta, other_deductions, notes)
      VALUES (${tid}, ${Number(d.employeeId)}, ${d.fiscalYear}, ${d.regime || 'new'},
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
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/form16/:employeeId/:fiscalYear", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { employeeId, fiscalYear } = req.params;
  try {
    const emp = await db.execute(sql`
      SELECT e.*, d.name as department_name, des.name as designation_name
      FROM hr_employees e
      LEFT JOIN hr_departments d ON e.department_id=d.id
      LEFT JOIN hr_designations des ON e.designation_id=des.id
      WHERE e.id=${Number(employeeId)} AND e.tenant_id=${tid}
    `);
    if (!emp.rows[0]) return res.status(404).json({ message: 'Employee not found' });
    const [fromYear, toYear] = fiscalYear.split('-').map(Number);
    const payslips = await db.execute(sql`
      SELECT p.*, pr.month, pr.year FROM hr_payslips p
      JOIN hr_payroll_runs pr ON p.payroll_run_id=pr.id
      WHERE p.employee_id=${Number(employeeId)} AND p.tenant_id=${tid}
      AND ((pr.year=${fromYear} AND pr.month >= 4) OR (pr.year=${toYear} AND pr.month <= 3))
      ORDER BY pr.year, pr.month
    `);
    const decl = await db.execute(sql`SELECT * FROM hr_tds_declarations WHERE employee_id=${Number(employeeId)} AND tenant_id=${tid} AND fiscal_year=${fiscalYear}`);
    res.json({ employee: emp.rows[0], payslips: payslips.rows, declaration: decl.rows[0] || null, fiscalYear });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── PHASE 5: F&F SETTLEMENTS ──────────────────────────────────────────────────
router.get("/fnf", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const r = await db.execute(sql`
      SELECT f.*, e.first_name, e.last_name, e.emp_code, e.designation_id,
        des.name as designation_name, d.name as department_name
      FROM hr_fnf_settlements f
      JOIN hr_employees e ON f.employee_id=e.id
      LEFT JOIN hr_designations des ON e.designation_id=des.id
      LEFT JOIN hr_departments d ON e.department_id=d.id
      WHERE f.tenant_id=${tid} ORDER BY f.settlement_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/fnf/calculate", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { employeeId, settlementDate } = req.body;
  try {
    const emp = await db.execute(sql`SELECT * FROM hr_employees WHERE id=${Number(employeeId)} AND tenant_id=${tid}`);
    if (!emp.rows[0]) return res.status(404).json({ message: 'Employee not found' });
    const e = emp.rows[0] as any;
    const sDate = new Date(settlementDate);
    const lwd = e.exit_date ? new Date(e.exit_date) : sDate;
    const daysInMonth = new Date(lwd.getFullYear(), lwd.getMonth() + 1, 0).getDate();
    const workedDays = lwd.getDate();
    const dailyBasic = Number(e.basic_salary || 0) / 26;
    const pendingSalaryDays = workedDays;
    const pendingSalary = Math.round(dailyBasic * workedDays);
    const joinDate = e.join_date ? new Date(e.join_date) : null;
    let yearsServed = 0;
    if (joinDate) {
      const ms = lwd.getTime() - joinDate.getTime();
      yearsServed = ms / (365.25 * 24 * 3600 * 1000);
    }
    const gratuity = yearsServed >= 5 ? Math.round((Number(e.basic_salary || 0) * 15 * Math.floor(yearsServed)) / 26) : 0;
    const leaveBal = await db.execute(sql`SELECT * FROM hr_leave_balances WHERE employee_id=${Number(employeeId)} AND tenant_id=${tid} AND leave_type_id IN (SELECT id FROM hr_leave_types WHERE type_code='EL' AND tenant_id=${tid})`);
    const elDays = leaveBal.rows[0] ? Number((leaveBal.rows[0] as any).balance || 0) : 0;
    const elEncashment = Math.round(dailyBasic * elDays);
    const noticeRequired = e.notice_period_days || 30;
    res.json({
      employeeId: Number(employeeId), pendingSalaryDays, pendingSalary,
      elEncashmentDays: elDays, elEncashmentAmount: elEncashment,
      gratuityAmount: gratuity, yearsServed: Math.floor(yearsServed),
      noticePeriodDays: noticeRequired, noticeServedDays: 0,
      noticeRecovery: 0, noticePay: 0, bonusArrears: 0,
      otherAdditions: 0, otherDeductions: 0,
      grossSettlement: pendingSalary + elEncashment + gratuity,
      tdsOnSettlement: 0, netSettlement: pendingSalary + elEncashment + gratuity,
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/fnf", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const d = req.body;
  try {
    const r = await db.execute(sql`
      INSERT INTO hr_fnf_settlements (tenant_id, employee_id, settlement_date, last_working_date,
        notice_period_days, notice_served_days, pending_salary_days, pending_salary,
        el_encashment_days, el_encashment_amount, gratuity_amount,
        notice_recovery, notice_pay, bonus_arrears, other_additions, other_deductions,
        gross_settlement, tds_on_settlement, net_settlement, status, notes)
      VALUES (${tid}, ${Number(d.employeeId)}, ${d.settlementDate}, ${d.lastWorkingDate||null},
        ${Number(d.noticePeriodDays||0)}, ${Number(d.noticeServedDays||0)},
        ${Number(d.pendingSalaryDays||0)}, ${Number(d.pendingSalary||0)},
        ${Number(d.elEncashmentDays||0)}, ${Number(d.elEncashmentAmount||0)}, ${Number(d.gratuityAmount||0)},
        ${Number(d.noticeRecovery||0)}, ${Number(d.noticePay||0)}, ${Number(d.bonusArrears||0)},
        ${Number(d.otherAdditions||0)}, ${Number(d.otherDeductions||0)},
        ${Number(d.grossSettlement||0)}, ${Number(d.tdsOnSettlement||0)}, ${Number(d.netSettlement||0)},
        ${d.status||'draft'}, ${d.notes||null})
      ON CONFLICT (tenant_id, employee_id) DO UPDATE SET
        settlement_date=${d.settlementDate}, last_working_date=${d.lastWorkingDate||null},
        notice_period_days=${Number(d.noticePeriodDays||0)}, notice_served_days=${Number(d.noticeServedDays||0)},
        pending_salary_days=${Number(d.pendingSalaryDays||0)}, pending_salary=${Number(d.pendingSalary||0)},
        el_encashment_days=${Number(d.elEncashmentDays||0)}, el_encashment_amount=${Number(d.elEncashmentAmount||0)},
        gratuity_amount=${Number(d.gratuityAmount||0)}, notice_recovery=${Number(d.noticeRecovery||0)},
        notice_pay=${Number(d.noticePay||0)}, bonus_arrears=${Number(d.bonusArrears||0)},
        other_additions=${Number(d.otherAdditions||0)}, other_deductions=${Number(d.otherDeductions||0)},
        gross_settlement=${Number(d.grossSettlement||0)}, tds_on_settlement=${Number(d.tdsOnSettlement||0)},
        net_settlement=${Number(d.netSettlement||0)}, status=${d.status||'draft'}, notes=${d.notes||null}, updated_at=NOW()
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/fnf/:id/finalize", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_fnf_settlements SET status='finalized', updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── PHASE 6: RECRUITMENT ─────────────────────────────────────────────────────
router.get("/job-openings", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const r = await db.execute(sql`
      SELECT jo.*, d.name as department_name,
        COUNT(ja.id) as application_count
      FROM hr_job_openings jo
      LEFT JOIN hr_departments d ON jo.department_id=d.id
      LEFT JOIN hr_job_applications ja ON ja.opening_id=jo.id AND ja.record_status=1
      WHERE jo.tenant_id=${tid} AND jo.record_status=1
      GROUP BY jo.id, d.name ORDER BY jo.created_at DESC
    `);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/job-openings", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const d = req.body;
  try {
    const r = await db.execute(sql`
      INSERT INTO hr_job_openings (tenant_id, title, department_id, positions, experience_min, experience_max,
        salary_min, salary_max, job_type, location, skills, description, status, posted_date, closing_date)
      VALUES (${tid}, ${d.title}, ${d.departmentId?Number(d.departmentId):null}, ${Number(d.positions||1)},
        ${Number(d.experienceMin||0)}, ${Number(d.experienceMax||0)},
        ${d.salaryMin?Number(d.salaryMin):null}, ${d.salaryMax?Number(d.salaryMax):null},
        ${d.jobType||'full_time'}, ${d.location||null}, ${d.skills||null}, ${d.description||null},
        ${d.status||'open'}, ${d.postedDate||new Date().toISOString().slice(0,10)}, ${d.closingDate||null})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/job-openings/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const d = req.body;
  try {
    await db.execute(sql`
      UPDATE hr_job_openings SET title=${d.title}, department_id=${d.departmentId?Number(d.departmentId):null},
        positions=${Number(d.positions||1)}, experience_min=${Number(d.experienceMin||0)},
        experience_max=${Number(d.experienceMax||0)}, salary_min=${d.salaryMin?Number(d.salaryMin):null},
        salary_max=${d.salaryMax?Number(d.salaryMax):null}, job_type=${d.jobType||'full_time'},
        location=${d.location||null}, skills=${d.skills||null}, description=${d.description||null},
        status=${d.status||'open'}, closing_date=${d.closingDate||null}
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/job-openings/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_job_openings SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/job-applications", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { openingId, stage } = req.query;
  try {
    let q = sql`SELECT ja.*, jo.title as opening_title, jo.department_id
      FROM hr_job_applications ja
      JOIN hr_job_openings jo ON ja.opening_id=jo.id
      WHERE ja.tenant_id=${tid} AND ja.record_status=1`;
    if (openingId) q = sql`${q} AND ja.opening_id=${Number(openingId)}`;
    if (stage) q = sql`${q} AND ja.stage=${stage}`;
    q = sql`${q} ORDER BY ja.created_at DESC`;
    res.json((await db.execute(q)).rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/job-applications", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const d = req.body;
  try {
    const r = await db.execute(sql`
      INSERT INTO hr_job_applications (tenant_id, opening_id, candidate_name, phone, email,
        current_company, current_ctc, expected_ctc, notice_period_days, source, stage, rating, interview_date, notes)
      VALUES (${tid}, ${Number(d.openingId)}, ${d.candidateName}, ${d.phone||null}, ${d.email||null},
        ${d.currentCompany||null}, ${d.currentCtc?Number(d.currentCtc):null}, ${d.expectedCtc?Number(d.expectedCtc):null},
        ${Number(d.noticePeriodDays||0)}, ${d.source||'direct'}, ${d.stage||'applied'},
        ${Number(d.rating||0)}, ${d.interviewDate||null}, ${d.notes||null})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/job-applications/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const d = req.body;
  try {
    await db.execute(sql`
      UPDATE hr_job_applications SET stage=${d.stage||'applied'}, rating=${Number(d.rating||0)},
        interview_date=${d.interviewDate||null}, notes=${d.notes||null},
        current_company=${d.currentCompany||null}, current_ctc=${d.currentCtc?Number(d.currentCtc):null},
        expected_ctc=${d.expectedCtc?Number(d.expectedCtc):null}, notice_period_days=${Number(d.noticePeriodDays||0)},
        phone=${d.phone||null}, email=${d.email||null}
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/job-applications/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hr_job_applications SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;

