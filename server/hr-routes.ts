import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { whatsappService } from "./whatsappService";
import archiver from "archiver";
import PDFDocument from "pdfkit";
import XLSX from "xlsx";

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
const xlsxUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const logoUpload = multer({ storage: makeStorage("hr_logos"), limits: { fileSize: 3 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, /image/.test(file.mimetype)) });

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
  const { name, code, annualDays, isCarryForward, maxCarryForward, isEncashable, isPaidLeave, applicableEmpTypes, maxPerMonth } = req.body;
  const empTypes = applicableEmpTypes || 'permanent,consultant,contract,intern';
  try {
    const r = await db.execute(sql`INSERT INTO hr_leave_types (tenant_id, name, code, annual_days, is_carry_forward, max_carry_forward, is_encashable, is_paid_leave, applicable_emp_types, max_per_month) VALUES (${tid}, ${name}, ${code}, ${annualDays ?? 0}, ${isCarryForward ?? false}, ${maxCarryForward ?? 0}, ${isEncashable ?? false}, ${isPaidLeave ?? true}, ${empTypes}, ${maxPerMonth ?? 0}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/leave-types/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { name, code, annualDays, isCarryForward, maxCarryForward, isEncashable, isPaidLeave, applicableEmpTypes, maxPerMonth } = req.body;
  const empTypes = applicableEmpTypes || 'permanent,consultant,contract,intern';
  try {
    const r = await db.execute(sql`UPDATE hr_leave_types SET name=${name}, code=${code}, annual_days=${annualDays ?? 0}, is_carry_forward=${isCarryForward ?? false}, max_carry_forward=${maxCarryForward ?? 0}, is_encashable=${isEncashable ?? false}, is_paid_leave=${isPaidLeave ?? true}, applicable_emp_types=${empTypes}, max_per_month=${maxPerMonth ?? 0} WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
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

// ── DASHBOARD STATS ───────────────────────────────────────────────────────────
router.get("/employees/stats", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const result = await db.execute(sql`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'active') AS active
      FROM hr_employees
      WHERE tenant_id = ${tid} AND record_status = 1
    `);
    const row = result.rows[0] as any;
    res.json({ total: parseInt(row.total) || 0, active: parseInt(row.active) || 0 });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/leave-applications/pending-count", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) AS count FROM hr_leave_applications
      WHERE tenant_id = ${tid} AND status = 'pending'
    `);
    const row = result.rows[0] as any;
    res.json({ count: parseInt(row.count) || 0 });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/payroll/draft-count", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) AS count FROM hr_payroll_runs
      WHERE tenant_id = ${tid} AND status = 'draft'
    `);
    const row = result.rows[0] as any;
    res.json({ draftCount: parseInt(row.count) || 0 });
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

// ── Employee Bulk Upload — Excel template download ────────────────────────────
router.get("/employees/template", requireHR, (_req, res) => {
  try {
    const headers = [
      "emp_code*", "first_name*", "join_date*",
      "last_name", "gender", "date_of_birth", "blood_group", "marital_status",
      "department_name", "designation_name", "employee_type",
      "phone", "alternate_phone", "email",
      "address", "city", "state", "pincode",
      "basic_salary", "ctc", "special_allowance",
      "pan", "aadhaar", "pf_number", "uan", "esi_number",
      "bank_account", "ifsc", "bank_name", "tax_regime",
    ];
    const notes = [
      "Required", "Required", "Required (YYYY-MM-DD)",
      "", "Male/Female/Other", "YYYY-MM-DD", "A+/A-/B+/B-/AB+/AB-/O+/O-", "Single/Married/Divorced/Widowed",
      "Must match exact dept name", "Must match exact designation name", "permanent/contract/intern/trainee",
      "", "", "",
      "", "", "", "",
      "Number", "Number", "Number",
      "", "12-digit number", "", "", "",
      "", "", "", "new/old (default: new)",
    ];
    const example = [
      "EMP001", "Ravi", "2024-01-15",
      "Kumar", "Male", "1990-05-10", "B+", "Married",
      "Production", "Operator", "permanent",
      "9876543210", "", "ravi@example.com",
      "123 MG Road", "Pune", "Maharashtra", "411001",
      "25000", "35000", "5000",
      "ABCDE1234F", "123456789012", "", "100123456789", "",
      "987654321012", "HDFC0001234", "HDFC Bank", "new",
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, notes, example]);

    // Column widths
    ws["!cols"] = headers.map((_h: string, i: number) => ({ wch: i < 3 ? 22 : 20 }));

    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=employee_upload_template.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Employee Bulk Upload — parse & insert ─────────────────────────────────────
// Helper: convert an Excel cell value that may be a Date object, serial number, or string → "YYYY-MM-DD" | null
function excelToDateStr(val: any): string | null {
  if (val === null || val === undefined || val === "") return null;
  // JS Date (from cellDates:true)
  if (val instanceof Date) {
    const d = new Date(Date.UTC(val.getFullYear(), val.getMonth(), val.getDate()));
    return d.toISOString().split("T")[0];
  }
  const s = String(val).trim();
  if (!s) return null;
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  // Excel serial number (without cellDates:true)
  const n = Number(s);
  if (!isNaN(n) && n > 1000 && n < 60000) {
    // Excel epoch is Jan 0 1900; JS epoch is Jan 1 1970
    const d = new Date((n - 25569) * 86400 * 1000);
    return d.toISOString().split("T")[0];
  }
  // Fallback: try JS Date parse
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  return s; // return as-is and let Postgres validate
}

router.post("/employees/bulk-upload", requireHR, xlsxUpload.single("file"), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const tid = getTenantId(req);
  try {
    // cellDates:true converts Excel date-formatted cells to JS Date objects automatically
    const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
    // Remove the notes row (row 2: has "Required" in emp_code* col) and any blank rows
    const dataRows = rows.filter((r: any) => {
      const code = String(r["emp_code*"] || r["emp_code"] || "").trim();
      return code !== "" && code.toLowerCase() !== "required";
    });

    // Load departments and designations for lookup
    const [deptRows, desigRows] = await Promise.all([
      db.execute(sql`SELECT id, name FROM hr_departments WHERE tenant_id=${tid} AND record_status=1`),
      db.execute(sql`SELECT id, name FROM hr_designations WHERE tenant_id=${tid} AND record_status=1`),
    ]);
    const deptMap: Record<string, number> = {};
    for (const d of deptRows.rows) deptMap[(d.name as string).trim().toLowerCase()] = d.id as number;
    const desigMap: Record<string, number> = {};
    for (const d of desigRows.rows) desigMap[(d.name as string).trim().toLowerCase()] = d.id as number;

    // Pre-load all existing emp_codes for this tenant to detect duplicates without relying on DB constraints
    const existingCodesRes = await db.execute(sql`
      SELECT emp_code FROM hr_employees WHERE tenant_id=${tid} AND record_status=1
    `);
    const existingCodes = new Set(existingCodesRes.rows.map((r: any) => String(r.emp_code).trim().toLowerCase()));

    let created = 0;
    const errors: { row: number; reason: string }[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      const rowNum = i + 3; // header=1, notes=2, data starts at 3
      const empCode = String(r["emp_code*"] || r["emp_code"] || "").trim();
      const firstName = String(r["first_name*"] || r["first_name"] || "").trim();
      const joinDateRaw = r["join_date*"] ?? r["join_date"] ?? "";
      const joinDate = excelToDateStr(joinDateRaw);

      if (!empCode) { errors.push({ row: rowNum, reason: "emp_code is required" }); continue; }
      if (!firstName) { errors.push({ row: rowNum, reason: "first_name is required" }); continue; }
      if (!joinDate) { errors.push({ row: rowNum, reason: "join_date is required" }); continue; }

      // Duplicate check — against existing DB records AND earlier rows in the same upload
      if (existingCodes.has(empCode.toLowerCase())) {
        errors.push({ row: rowNum, reason: `emp_code "${empCode}" already exists — skipped` });
        continue;
      }

      const deptName = String(r["department_name"] || "").trim().toLowerCase();
      const desigName = String(r["designation_name"] || "").trim().toLowerCase();
      const departmentId = deptName ? (deptMap[deptName] ?? null) : null;
      const designationId = desigName ? (desigMap[desigName] ?? null) : null;

      if (deptName && departmentId === null) {
        errors.push({ row: rowNum, reason: `Department "${r["department_name"]}" not found` }); continue;
      }
      if (desigName && designationId === null) {
        errors.push({ row: rowNum, reason: `Designation "${r["designation_name"]}" not found` }); continue;
      }

      const num = (v: any) => { const n = parseFloat(String(v)); return isNaN(n) ? 0 : n; };
      // str: converts to string but also handles numbers like aadhaar/phone that Excel stores as integers
      const str = (v: any) => {
        if (v === null || v === undefined || v === "") return null;
        const s = String(v).trim();
        return s === "" ? null : s;
      };

      try {
        await db.execute(sql`
          INSERT INTO hr_employees (
            tenant_id, emp_code, first_name, last_name, gender, date_of_birth, blood_group,
            marital_status, department_id, designation_id, employee_type, join_date,
            phone, alternate_phone, email, address, city, state, pincode,
            basic_salary, ctc, special_allowance,
            pan, aadhaar, pf_number, uan, esi_number,
            bank_account, ifsc, bank_name, tax_regime, status
          ) VALUES (
            ${tid}, ${empCode}, ${firstName},
            ${str(r["last_name"])}, ${str(r["gender"])}, ${excelToDateStr(r["date_of_birth"])}, ${str(r["blood_group"])},
            ${str(r["marital_status"])}, ${departmentId}, ${designationId},
            ${str(r["employee_type"]) ?? "permanent"}, ${joinDate},
            ${str(r["phone"])}, ${str(r["alternate_phone"])}, ${str(r["email"])},
            ${str(r["address"])}, ${str(r["city"])}, ${str(r["state"])}, ${str(r["pincode"])},
            ${num(r["basic_salary"])}, ${num(r["ctc"])}, ${num(r["special_allowance"])},
            ${str(r["pan"])}, ${str(r["aadhaar"])}, ${str(r["pf_number"])}, ${str(r["uan"])}, ${str(r["esi_number"])},
            ${str(r["bank_account"])}, ${str(r["ifsc"])}, ${str(r["bank_name"])},
            ${str(r["tax_regime"]) ?? "new"}, 'active'
          )
        `);
        existingCodes.add(empCode.toLowerCase()); // prevent same-file duplicates
        created++;
      } catch (e: any) {
        let reason = e.message;
        if (e.message?.includes("unique") || e.message?.includes("duplicate")) {
          reason = `emp_code "${empCode}" already exists — skipped`;
        }
        errors.push({ row: rowNum, reason });
      }
    }

    res.json({ created, errors });
  } catch (e: any) { res.status(400).json({ message: `Failed to parse file: ${e.message}` }); }
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
  // Convert empty strings to null (same helpers as PUT endpoint)
  const s = (v: any) => (v === '' || v == null) ? null : v;
  const n = (v: any, def = 0) => (v === '' || v == null) ? def : Number(v);
  const i = (v: any) => (v === '' || v == null) ? null : parseInt(v);
  try {
    const r = await db.execute(sql`
      INSERT INTO hr_employees (
        tenant_id, emp_code, first_name, last_name, gender, date_of_birth, blood_group,
        department_id, designation_id, shift_id, salary_structure_id, basic_salary, special_allowance, ta_amount, da_amount, ctc,
        join_date, exit_date, exit_type, exit_reason, resignation_date,
        reporting_manager_id, phone, alternate_phone, email,
        address, city, state, pincode,
        emergency_contact, emergency_contact_name, emergency_contact_relation,
        pan, aadhaar, pf_enabled, esi_enabled, pf_number, esi_number, uan, bank_account, ifsc, bank_name, tax_regime,
        marital_status, spouse_name, spouse_dob, spouse_aadhaar,
        father_name, father_dob, father_aadhaar,
        mother_name, mother_dob, mother_aadhaar, number_of_children, status, employee_type
      ) VALUES (
        ${tid}, ${d.empCode}, ${d.firstName}, ${s(d.lastName)}, ${s(d.gender)},
        ${s(d.dateOfBirth)}, ${s(d.bloodGroup)},
        ${i(d.departmentId)}, ${i(d.designationId)}, ${i(d.shiftId)},
        ${i(d.salaryStructureId)}, ${n(d.basicSalary)}, ${n(d.specialAllowance)}, ${n(d.taAmount)}, ${n(d.daAmount)}, ${n(d.ctc)},
        ${s(d.joinDate)}, ${s(d.exitDate)}, ${s(d.exitType)}, ${s(d.exitReason)}, ${s(d.resignationDate)},
        ${i(d.reportingManagerId)}, ${s(d.phone)}, ${s(d.alternatePhone)}, ${s(d.email)},
        ${s(d.address)}, ${s(d.city)}, ${s(d.state)}, ${s(d.pincode)},
        ${s(d.emergencyContact)}, ${s(d.emergencyContactName)}, ${s(d.emergencyContactRelation)},
        ${s(d.pan)}, ${s(d.aadhaar)}, ${d.pfEnabled !== false}, ${d.esiEnabled !== false},
        ${s(d.pfNumber)}, ${s(d.esiNumber)}, ${s(d.uan)}, ${s(d.bankAccount)},
        ${s(d.ifsc)}, ${s(d.bankName)}, ${s(d.taxRegime) ?? 'new'},
        ${s(d.maritalStatus)}, ${s(d.spouseName)}, ${s(d.spouseDob)}, ${s(d.spouseAadhaar)},
        ${s(d.fatherName)}, ${s(d.fatherDob)}, ${s(d.fatherAadhaar)},
        ${s(d.motherName)}, ${s(d.motherDob)}, ${s(d.motherAadhaar)},
        ${n(d.numberOfChildren)}, ${s(d.status) ?? 'active'}, ${s(d.employeeType) ?? 'permanent'}
      ) RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/employees/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const d = req.body;
  // Helpers: empty string must become null/0 for typed DB columns
  const s = (v: any) => (v === '' || v == null) ? null : v;
  const n = (v: any, def = 0) => (v === '' || v == null) ? def : Number(v);
  const i = (v: any) => (v === '' || v == null) ? null : parseInt(v);
  try {
    const r = await db.execute(sql`
      UPDATE hr_employees SET
        emp_code=${d.empCode}, first_name=${d.firstName}, last_name=${s(d.lastName)},
        gender=${s(d.gender)}, date_of_birth=${s(d.dateOfBirth)}, blood_group=${s(d.bloodGroup)},
        department_id=${i(d.departmentId)}, designation_id=${i(d.designationId)},
        shift_id=${i(d.shiftId)}, salary_structure_id=${i(d.salaryStructureId)},
        basic_salary=${n(d.basicSalary)}, special_allowance=${n(d.specialAllowance)}, ta_amount=${n(d.taAmount)}, da_amount=${n(d.daAmount)}, ctc=${n(d.ctc)}, join_date=${s(d.joinDate)},
        exit_date=${s(d.exitDate)}, exit_type=${s(d.exitType)},
        exit_reason=${s(d.exitReason)}, resignation_date=${s(d.resignationDate)},
        reporting_manager_id=${i(d.reportingManagerId)},
        phone=${s(d.phone)}, alternate_phone=${s(d.alternatePhone)},
        email=${s(d.email)}, address=${s(d.address)},
        city=${s(d.city)}, state=${s(d.state)}, pincode=${s(d.pincode)},
        emergency_contact=${s(d.emergencyContact)},
        emergency_contact_name=${s(d.emergencyContactName)},
        emergency_contact_relation=${s(d.emergencyContactRelation)},
        pan=${s(d.pan)}, aadhaar=${s(d.aadhaar)},
        pf_enabled=${d.pfEnabled !== false}, esi_enabled=${d.esiEnabled !== false},
        pf_number=${s(d.pfNumber)}, esi_number=${s(d.esiNumber)}, uan=${s(d.uan)}, bank_account=${s(d.bankAccount)},
        ifsc=${s(d.ifsc)}, bank_name=${s(d.bankName)}, tax_regime=${s(d.taxRegime) ?? 'new'},
        marital_status=${s(d.maritalStatus)}, spouse_name=${s(d.spouseName)},
        spouse_dob=${s(d.spouseDob)}, spouse_aadhaar=${s(d.spouseAadhaar)},
        father_name=${s(d.fatherName)}, father_dob=${s(d.fatherDob)},
        father_aadhaar=${s(d.fatherAadhaar)}, mother_name=${s(d.motherName)},
        mother_dob=${s(d.motherDob)}, mother_aadhaar=${s(d.motherAadhaar)},
        number_of_children=${n(d.numberOfChildren)},
        status=${s(d.status) ?? 'active'}, employee_type=${s(d.employeeType) ?? 'permanent'}, updated_at=NOW()
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
  const { employeeId, date, status, otHours, shiftId, remarks, checkInTime, checkOutTime, markedBy, leaveTypeId } = req.body;
  let workingHours: number | null = null;
  if (checkInTime && checkOutTime) {
    const [inH, inM] = checkInTime.split(':').map(Number);
    const [outH, outM] = checkOutTime.split(':').map(Number);
    const diff = (outH * 60 + outM) - (inH * 60 + inM);
    if (diff > 0) workingHours = Math.round((diff / 60) * 100) / 100;
  }
  let finalStatus = status ?? 'present';
  if (!status && workingHours !== null) {
    if (workingHours === 0) finalStatus = 'absent';
    else if (workingHours < 4) finalStatus = 'half_day';
    else finalStatus = 'present';
  }
  try {
    const existing = await db.execute(sql`SELECT id, status, leave_type_id FROM hr_attendance WHERE employee_id=${employeeId} AND date=${date} AND tenant_id=${tid}`);
    const existingRec = existing.rows[0] as any;
    const appYear = new Date(date).getFullYear();
    const appMonth = new Date(date).getMonth() + 1;

    // Credit back leave balance if changing away from on_leave
    if (existingRec && existingRec.status === 'on_leave' && finalStatus !== 'on_leave' && existingRec.leave_type_id) {
      await db.execute(sql`
        UPDATE hr_leave_balances SET used=GREATEST(0,used-1), balance=balance+1
        WHERE tenant_id=${tid} AND employee_id=${employeeId} AND leave_type_id=${existingRec.leave_type_id} AND year=${appYear}
      `);
    }

    // When marking on_leave, check monthly limit and deduct balance
    if (finalStatus === 'on_leave' && leaveTypeId) {
      const ltRow = await db.execute(sql`SELECT max_per_month, name FROM hr_leave_types WHERE id=${leaveTypeId} AND tenant_id=${tid}`);
      const lt = ltRow.rows[0] as any;
      if (lt && Number(lt.max_per_month) > 0) {
        // Count direct OL marks for this month (excluding this date if updating)
        const attUsed = await db.execute(sql`
          SELECT COUNT(*) as cnt FROM hr_attendance
          WHERE tenant_id=${tid} AND employee_id=${employeeId} AND leave_type_id=${leaveTypeId}
            AND status='on_leave' AND date != ${date}
            AND EXTRACT(MONTH FROM date)=${appMonth} AND EXTRACT(YEAR FROM date)=${appYear}
        `);
        // Count approved leave applications for this month
        const appUsed = await db.execute(sql`
          SELECT COALESCE(SUM(days),0) AS used FROM hr_leave_applications
          WHERE tenant_id=${tid} AND employee_id=${employeeId} AND leave_type_id=${leaveTypeId}
            AND status != 'rejected'
            AND EXTRACT(MONTH FROM from_date)=${appMonth} AND EXTRACT(YEAR FROM from_date)=${appYear}
        `);
        const totalUsed = Number((attUsed.rows[0] as any)?.cnt || 0) + Number((appUsed.rows[0] as any)?.used || 0);
        if (totalUsed + 1 > Number(lt.max_per_month)) {
          return res.status(400).json({
            message: `Monthly limit exceeded for ${lt.name}. Max allowed: ${lt.max_per_month} day(s)/month. Already used: ${totalUsed} day(s) this month.`
          });
        }
      }
      // Credit back old leave type if switching leave types on same date
      if (existingRec && existingRec.status === 'on_leave' && existingRec.leave_type_id && existingRec.leave_type_id !== leaveTypeId) {
        await db.execute(sql`
          UPDATE hr_leave_balances SET used=GREATEST(0,used-1), balance=balance+1
          WHERE tenant_id=${tid} AND employee_id=${employeeId} AND leave_type_id=${existingRec.leave_type_id} AND year=${appYear}
        `);
      }
      // Deduct 1 day from balance (only if new entry OR changing leave type OR was not on_leave before)
      const wasAlreadySameLT = existingRec && existingRec.status === 'on_leave' && existingRec.leave_type_id === leaveTypeId;
      if (!wasAlreadySameLT) {
        await db.execute(sql`
          UPDATE hr_leave_balances SET used=used+1, balance=GREATEST(0,balance-1)
          WHERE tenant_id=${tid} AND employee_id=${employeeId} AND leave_type_id=${leaveTypeId} AND year=${appYear}
        `);
      }
    }

    const finalLeaveTypeId = finalStatus === 'on_leave' ? (leaveTypeId ?? null) : null;

    if (existingRec) {
      const r = await db.execute(sql`
        UPDATE hr_attendance SET
          status=${finalStatus}, ot_hours=${otHours ?? 0}, shift_id=${shiftId ?? null},
          remarks=${remarks ?? null}, check_in_time=${checkInTime ?? null},
          check_out_time=${checkOutTime ?? null}, working_hours=${workingHours},
          leave_type_id=${finalLeaveTypeId}, marked_by=${markedBy ?? 'admin'}
        WHERE id=${existingRec.id} RETURNING *`);
      return res.json(r.rows[0]);
    }
    const r = await db.execute(sql`
      INSERT INTO hr_attendance
        (tenant_id, employee_id, date, status, ot_hours, shift_id, remarks,
         check_in_time, check_out_time, working_hours, leave_type_id, marked_by)
      VALUES
        (${tid}, ${employeeId}, ${date}, ${finalStatus}, ${otHours ?? 0}, ${shiftId ?? null},
         ${remarks ?? null}, ${checkInTime ?? null}, ${checkOutTime ?? null},
         ${workingHours}, ${finalLeaveTypeId}, ${markedBy ?? 'admin'})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Bulk attendance
router.post("/attendance/bulk", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { records } = req.body; // [{employeeId, date, status?, otHours?, checkInTime?, checkOutTime?, markedBy?}]
  try {
    const results = [];
    for (const rec of records) {
      // Auto-calculate working hours per record
      let wh: number | null = null;
      if (rec.checkInTime && rec.checkOutTime) {
        const [inH, inM] = rec.checkInTime.split(':').map(Number);
        const [outH, outM] = rec.checkOutTime.split(':').map(Number);
        const diff = (outH * 60 + outM) - (inH * 60 + inM);
        if (diff > 0) wh = Math.round((diff / 60) * 100) / 100;
      }
      let finalStatus = rec.status ?? 'present';
      if (!rec.status && wh !== null) {
        if (wh === 0) finalStatus = 'absent';
        else if (wh < 4) finalStatus = 'half_day';
        else finalStatus = 'present';
      }
      const existing = await db.execute(sql`SELECT id, status, leave_type_id FROM hr_attendance WHERE employee_id=${rec.employeeId} AND date=${rec.date} AND tenant_id=${tid}`);
      const existingRec = existing.rows[0] as any;
      const recYear = new Date(rec.date).getFullYear();
      const recMonth = new Date(rec.date).getMonth() + 1;
      const leaveTypeId = rec.leaveTypeId ?? null;

      // Credit back if changing away from on_leave
      if (existingRec && existingRec.status === 'on_leave' && finalStatus !== 'on_leave' && existingRec.leave_type_id) {
        await db.execute(sql`UPDATE hr_leave_balances SET used=GREATEST(0,used-1), balance=balance+1 WHERE tenant_id=${tid} AND employee_id=${rec.employeeId} AND leave_type_id=${existingRec.leave_type_id} AND year=${recYear}`);
      }
      // Handle on_leave: check limit + deduct
      if (finalStatus === 'on_leave' && leaveTypeId) {
        const ltRow = await db.execute(sql`SELECT max_per_month, name FROM hr_leave_types WHERE id=${leaveTypeId} AND tenant_id=${tid}`);
        const lt = ltRow.rows[0] as any;
        if (lt && Number(lt.max_per_month) > 0) {
          const attUsed = await db.execute(sql`SELECT COUNT(*) as cnt FROM hr_attendance WHERE tenant_id=${tid} AND employee_id=${rec.employeeId} AND leave_type_id=${leaveTypeId} AND status='on_leave' AND date != ${rec.date} AND EXTRACT(MONTH FROM date)=${recMonth} AND EXTRACT(YEAR FROM date)=${recYear}`);
          const appUsed = await db.execute(sql`SELECT COALESCE(SUM(days),0) AS used FROM hr_leave_applications WHERE tenant_id=${tid} AND employee_id=${rec.employeeId} AND leave_type_id=${leaveTypeId} AND status != 'rejected' AND EXTRACT(MONTH FROM from_date)=${recMonth} AND EXTRACT(YEAR FROM from_date)=${recYear}`);
          const totalUsed = Number((attUsed.rows[0] as any)?.cnt || 0) + Number((appUsed.rows[0] as any)?.used || 0);
          if (totalUsed + 1 > Number(lt.max_per_month)) {
            results.push({ error: `Monthly limit exceeded for ${lt.name} on ${rec.date}`, employeeId: rec.employeeId });
            continue;
          }
        }
        if (existingRec && existingRec.status === 'on_leave' && existingRec.leave_type_id && existingRec.leave_type_id !== leaveTypeId) {
          await db.execute(sql`UPDATE hr_leave_balances SET used=GREATEST(0,used-1), balance=balance+1 WHERE tenant_id=${tid} AND employee_id=${rec.employeeId} AND leave_type_id=${existingRec.leave_type_id} AND year=${recYear}`);
        }
        const wasAlreadySameLT = existingRec && existingRec.status === 'on_leave' && existingRec.leave_type_id === leaveTypeId;
        if (!wasAlreadySameLT) {
          await db.execute(sql`UPDATE hr_leave_balances SET used=used+1, balance=GREATEST(0,balance-1) WHERE tenant_id=${tid} AND employee_id=${rec.employeeId} AND leave_type_id=${leaveTypeId} AND year=${recYear}`);
        }
      }

      const finalLTId = finalStatus === 'on_leave' ? leaveTypeId : null;
      if (existingRec) {
        const r = await db.execute(sql`
          UPDATE hr_attendance SET
            status=${finalStatus}, ot_hours=${rec.otHours ?? 0},
            check_in_time=${rec.checkInTime ?? null}, check_out_time=${rec.checkOutTime ?? null},
            working_hours=${wh}, leave_type_id=${finalLTId}, marked_by=${rec.markedBy ?? 'biometric'}
          WHERE id=${existingRec.id} RETURNING *`);
        results.push(r.rows[0]);
      } else {
        const r = await db.execute(sql`
          INSERT INTO hr_attendance
            (tenant_id, employee_id, date, status, ot_hours, check_in_time, check_out_time, working_hours, leave_type_id, marked_by)
          VALUES
            (${tid}, ${rec.employeeId}, ${rec.date}, ${finalStatus}, ${rec.otHours ?? 0},
             ${rec.checkInTime ?? null}, ${rec.checkOutTime ?? null}, ${wh}, ${finalLTId}, ${rec.markedBy ?? 'biometric'})
          RETURNING *`);
        results.push(r.rows[0]);
      }
    }
    res.json({ saved: results.length, records: results });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Helper: grant Compensatory Off leave balance when OT is registered as comp
async function grantCompOff(tenantId: number, employeeId: number, otHours: number) {
  try {
    const compDays = Math.round((otHours / 8) * 2) / 2; // round to nearest 0.5
    if (compDays <= 0) return;
    const year = new Date().getFullYear();
    // Find COMP leave type for this tenant
    const ltRow = await db.execute(sql`
      SELECT id FROM hr_leave_types WHERE tenant_id=${tenantId} AND code='COMP' AND record_status=1 LIMIT 1
    `);
    const lt = ltRow.rows[0] as any;
    if (!lt) return;
    // Upsert leave balance
    const existing = await db.execute(sql`
      SELECT id FROM hr_leave_balances
      WHERE tenant_id=${tenantId} AND employee_id=${employeeId} AND leave_type_id=${lt.id} AND year=${year}
    `);
    if (existing.rows.length) {
      await db.execute(sql`
        UPDATE hr_leave_balances
        SET entitled=entitled+${compDays}, balance=balance+${compDays}
        WHERE tenant_id=${tenantId} AND employee_id=${employeeId} AND leave_type_id=${lt.id} AND year=${year}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO hr_leave_balances (tenant_id, employee_id, leave_type_id, year, entitled, used, balance)
        VALUES (${tenantId}, ${employeeId}, ${lt.id}, ${year}, ${compDays}, 0, ${compDays})
      `);
    }
  } catch (err) {
    console.error('[COMP-OFF] Failed to grant compensatory off:', err);
  }
}

// OT register — GET all OT entries for a month (ot_hours > 0)
router.get("/attendance/ot", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { month, year } = req.query;
  try {
    const rows = await db.execute(sql`
      SELECT a.id, a.employee_id, a.date, a.ot_hours, a.ot_type, a.status, a.remarks,
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
  const { employeeId, date, otHours, remarks, otType } = req.body;
  if (!employeeId || !date) return res.status(400).json({ message: "employeeId and date required" });
  const resolvedOtType = otType === 'comp' ? 'comp' : 'paid';
  try {
    const existing = await db.execute(sql`
      SELECT id, status FROM hr_attendance
      WHERE employee_id=${employeeId} AND date=${date} AND tenant_id=${tid}
    `);
    if (existing.rows.length) {
      const r = await db.execute(sql`
        UPDATE hr_attendance SET ot_hours=${Number(otHours) || 0}, ot_type=${resolvedOtType}, remarks=${remarks ?? null}
        WHERE id=${(existing.rows[0] as any).id} RETURNING *
      `);
      if (resolvedOtType === 'comp') await grantCompOff(tid, employeeId, Number(otHours) || 0);
      return res.json(r.rows[0]);
    }
    // No attendance record yet — create with present + OT hours
    const r = await db.execute(sql`
      INSERT INTO hr_attendance (tenant_id, employee_id, date, status, ot_hours, ot_type, remarks)
      VALUES (${tid}, ${employeeId}, ${date}, 'present', ${Number(otHours) || 0}, ${resolvedOtType}, ${remarks ?? null}) RETURNING *
    `);
    if (resolvedOtType === 'comp') await grantCompOff(tid, employeeId, Number(otHours) || 0);
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

// Fix unlinked OL records — assign leave type + deduct balances for a given month/year
router.post("/attendance/fix-ol-leave-types", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { month, year, leaveTypeId } = req.body;
  if (!month || !year || !leaveTypeId) return res.status(400).json({ message: "month, year, leaveTypeId required" });
  try {
    // Get all unlinked OL records for this month/year
    const rows = await db.execute(sql`
      SELECT a.id, a.employee_id, a.date
      FROM hr_attendance a
      WHERE a.tenant_id=${tid} AND a.status='on_leave' AND a.leave_type_id IS NULL
        AND EXTRACT(MONTH FROM a.date)=${month} AND EXTRACT(YEAR FROM a.date)=${year}
    `);
    if (!rows.rows.length) return res.json({ fixed: 0, message: "No unlinked OL records found for this period." });

    const ltRow = await db.execute(sql`SELECT name FROM hr_leave_types WHERE id=${leaveTypeId} AND tenant_id=${tid}`);
    if (!ltRow.rows.length) return res.status(404).json({ message: "Leave type not found" });

    // Group by employee to count days
    const empDays: Record<number, number> = {};
    for (const r of rows.rows as any[]) {
      empDays[r.employee_id] = (empDays[r.employee_id] || 0) + 1;
    }

    // Update attendance records with leave_type_id
    await db.execute(sql`
      UPDATE hr_attendance SET leave_type_id=${leaveTypeId}
      WHERE tenant_id=${tid} AND status='on_leave' AND leave_type_id IS NULL
        AND EXTRACT(MONTH FROM date)=${month} AND EXTRACT(YEAR FROM date)=${year}
    `);

    // Deduct from each employee's leave balance
    let balanceUpdated = 0;
    for (const [empId, days] of Object.entries(empDays)) {
      const updated = await db.execute(sql`
        UPDATE hr_leave_balances
        SET used = used + ${days}, balance = GREATEST(0, balance - ${days})
        WHERE tenant_id=${tid} AND employee_id=${Number(empId)} AND leave_type_id=${leaveTypeId} AND year=${year}
      `);
      if ((updated as any).rowCount > 0) balanceUpdated++;
    }

    res.json({
      fixed: rows.rows.length,
      employeesAffected: Object.keys(empDays).length,
      balancesUpdated: balanceUpdated,
      message: `${rows.rows.length} OL record(s) linked to ${(ltRow.rows[0] as any).name}. Balances deducted for ${balanceUpdated} employee(s).`
    });
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
// Export all employees' leave balances as Excel
router.get("/leave-balances/export-excel", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const year = Number(req.query.year) || new Date().getFullYear();
  try {
    // Fetch all active leave types
    const ltRows = await db.execute(sql`
      SELECT id, name, code FROM hr_leave_types
      WHERE tenant_id=${tid} AND record_status=1 ORDER BY name
    `);
    const leaveTypes = ltRows.rows as any[];

    // Fetch all active employees with their balances
    const rows = await db.execute(sql`
      SELECT e.emp_code, e.first_name, e.last_name,
             COALESCE(d.name, '') as department,
             lb.leave_type_id, lb.entitled, lb.used, lb.balance
      FROM hr_employees e
      LEFT JOIN hr_departments d ON d.id = e.department_id AND d.tenant_id=${tid}
      LEFT JOIN hr_leave_balances lb ON lb.employee_id = e.id AND lb.tenant_id=${tid} AND lb.year=${year}
      WHERE e.tenant_id=${tid} AND e.status='active'
      ORDER BY e.emp_code
    `);

    // Build pivot: empCode -> { empInfo, leaveTypeId -> {entitled,used,balance} }
    const empMap: Record<string, any> = {};
    for (const r of rows.rows as any[]) {
      if (!empMap[r.emp_code]) {
        empMap[r.emp_code] = {
          emp_code: r.emp_code,
          name: `${r.first_name} ${r.last_name}`,
          department: r.department || "",
          balances: {},
        };
      }
      if (r.leave_type_id) {
        empMap[r.emp_code].balances[r.leave_type_id] = {
          entitled: Number(r.entitled) || 0,
          used: Number(r.used) || 0,
          balance: Number(r.balance) || 0,
        };
      }
    }

    // Build header row
    const headers = ["Emp Code", "Employee Name", "Department"];
    for (const lt of leaveTypes) {
      headers.push(`${lt.name} (${lt.code}) - Entitled`);
      headers.push(`${lt.name} (${lt.code}) - Used`);
      headers.push(`${lt.name} (${lt.code}) - Balance`);
    }

    // Build data rows
    const dataRows = Object.values(empMap).map((emp: any) => {
      const row: (string | number)[] = [emp.emp_code, emp.name, emp.department];
      for (const lt of leaveTypes) {
        const b = emp.balances[lt.id] || { entitled: 0, used: 0, balance: 0 };
        row.push(b.entitled, b.used, b.balance);
      }
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    // Column widths
    ws["!cols"] = [
      { wch: 12 }, { wch: 25 }, { wch: 18 },
      ...leaveTypes.flatMap(() => [{ wch: 14 }, { wch: 10 }, { wch: 12 }]),
    ];

    XLSX.utils.book_append_sheet(wb, ws, `Leave Balances ${year}`);
    const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", `attachment; filename=leave_balances_${year}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

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
  const { employeeId, leaveTypeId, fromDate, toDate, reason } = req.body;
  try {
    // Auto-calculate days excluding public holidays
    const holidayRows = await db.execute(sql`
      SELECT date::text FROM hr_holidays
      WHERE tenant_id=${tid} AND record_status=1 AND date >= ${fromDate} AND date <= ${toDate}
    `);
    const holidayDates = new Set(
      (holidayRows.rows as any[]).map((h: any) => (h.date || '').split('T')[0])
    );
    let calcDays = 0;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split('T')[0];
      if (!holidayDates.has(ds)) calcDays++;
    }
    const actualDays = Math.max(1, calcDays);

    // ── Monthly limit check ────────────────────────────────────────────────
    const ltRow = await db.execute(sql`SELECT max_per_month, name FROM hr_leave_types WHERE id=${leaveTypeId} AND tenant_id=${tid}`);
    const lt = ltRow.rows[0] as any;
    if (lt && Number(lt.max_per_month) > 0) {
      const appMonth = new Date(fromDate).getMonth() + 1;
      const appYear  = new Date(fromDate).getFullYear();
      const usedRow = await db.execute(sql`
        SELECT COALESCE(SUM(days),0) AS used
        FROM hr_leave_applications
        WHERE tenant_id=${tid} AND employee_id=${employeeId}
          AND leave_type_id=${leaveTypeId} AND status != 'rejected'
          AND EXTRACT(MONTH FROM from_date)=${appMonth} AND EXTRACT(YEAR FROM from_date)=${appYear}
      `);
      const alreadyUsed = Number((usedRow.rows[0] as any)?.used || 0);
      if (alreadyUsed + actualDays > Number(lt.max_per_month)) {
        return res.status(400).json({
          message: `Monthly limit exceeded for ${lt.name}. Max allowed: ${lt.max_per_month} day(s)/month. Already applied: ${alreadyUsed} day(s) this month.`
        });
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    const r = await db.execute(sql`
      INSERT INTO hr_leave_applications (tenant_id, employee_id, leave_type_id, from_date, to_date, days, reason)
      VALUES (${tid}, ${employeeId}, ${leaveTypeId}, ${fromDate}, ${toDate}, ${actualDays}, ${reason ?? null})
      RETURNING *
    `);
    res.json({ ...r.rows[0], holidaysExcluded: holidayDates.size });
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
    // approved_by is integer; req.user.id is UUID — pass null to avoid type error
    const approverIntId = Number.isInteger(Number(userId)) && !isNaN(Number(userId)) ? Number(userId) : null;
    await db.execute(sql`UPDATE hr_leave_applications SET status=${status}, approved_by=${approverIntId}, approver_comment=${approverComment ?? null}, action_at=NOW() WHERE id=${req.params.id}`);
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

// ── Statutory Settings (PF / ESI rates) ──────────────────────────────────────
router.get("/statutory-settings", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const r = await db.execute(sql`SELECT * FROM hr_statutory_settings WHERE tenant_id=${tid}`);
    if (r.rows.length) return res.json(r.rows[0]);
    // Return defaults if not configured yet
    res.json({ pf_enabled: true, pf_employee_rate: 0.12, pf_employer_rate: 0.12, pf_ceiling_basic: 15000, esi_enabled: true, esi_employee_rate: 0.0075, esi_employer_rate: 0.0325, esi_gross_ceiling: 21000, pt_enabled: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/statutory-settings", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { pfEnabled, pfEmployeeRate, pfEmployerRate, pfCeilingBasic, esiEnabled, esiEmployeeRate, esiEmployerRate, esiGrossCeiling, ptEnabled } = req.body;
  try {
    await db.execute(sql`
      INSERT INTO hr_statutory_settings (tenant_id, pf_enabled, pf_employee_rate, pf_employer_rate, pf_ceiling_basic, esi_enabled, esi_employee_rate, esi_employer_rate, esi_gross_ceiling, pt_enabled, updated_at)
      VALUES (${tid}, ${pfEnabled}, ${pfEmployeeRate}, ${pfEmployerRate}, ${pfCeilingBasic}, ${esiEnabled}, ${esiEmployeeRate}, ${esiEmployerRate}, ${esiGrossCeiling}, ${ptEnabled}, NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        pf_enabled=${pfEnabled}, pf_employee_rate=${pfEmployeeRate}, pf_employer_rate=${pfEmployerRate}, pf_ceiling_basic=${pfCeilingBasic},
        esi_enabled=${esiEnabled}, esi_employee_rate=${esiEmployeeRate}, esi_employer_rate=${esiEmployerRate}, esi_gross_ceiling=${esiGrossCeiling},
        pt_enabled=${ptEnabled}, updated_at=NOW()
    `);
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

    // Load statutory rates (PF / ESI) — configurable, defaults to current statutory rates
    const statRow = await db.execute(sql`SELECT * FROM hr_statutory_settings WHERE tenant_id=${tid}`);
    const stat = statRow.rows[0] as any || {};
    const PF_ENABLED     = stat.pf_enabled  !== false;   // default true
    const ESI_ENABLED    = stat.esi_enabled !== false;
    const PT_ENABLED     = stat.pt_enabled  !== false;
    const PF_EMP_RATE    = Number(stat.pf_employee_rate   ?? 0.12);
    const PF_EMPR_RATE   = Number(stat.pf_employer_rate   ?? 0.12);
    const PF_CEILING     = Number(stat.pf_ceiling_basic   ?? 15000);
    const ESI_EMP_RATE   = Number(stat.esi_employee_rate  ?? 0.0075);
    const ESI_EMPR_RATE  = Number(stat.esi_employer_rate  ?? 0.0325);
    const ESI_CEILING    = Number(stat.esi_gross_ceiling  ?? 21000);

    let totalGross = 0, totalDeductions = 0, totalNet = 0;

    for (const emp of employees.rows as any[]) {
      const att = await db.execute(sql`
        SELECT
          COUNT(CASE WHEN status='present' THEN 1 END) as present,
          COUNT(CASE WHEN status='half_day' THEN 1 END) as half_day,
          COUNT(CASE WHEN status='on_leave' THEN 1 END) as on_leave,
          COUNT(CASE WHEN status='lop' THEN 1 END) as lop,
          COALESCE(SUM(CASE WHEN ot_type IS NULL OR ot_type='paid' THEN ot_hours ELSE 0 END),0) as ot_hours
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

      // If no attendance records exist at all for this employee this month,
      // assume full attendance so that salary is not zeroed out.
      const hasAttendance = (present + halfDay + onLeave + lop) > 0;
      const daysWorked = hasAttendance ? (present + (halfDay * 0.5) + onLeave) : workingDays;
      const lopDays = lop;
      const attendancePct = workingDays > 0 ? Math.min(daysWorked, workingDays) / workingDays : 1;

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
          // Special Allowance: use per-employee value if set, else fall back to structure formula
          if (comp.code === 'SPEC' || comp.name?.toLowerCase().includes('special allowance')) {
            const specBase = Number(emp.special_allowance || 0);
            const specAmount = specBase > 0 ? Math.round(specBase * attendancePct) : Math.round(Number(comp.formula_value || 0) * attendancePct);
            if (specAmount > 0) {
              componentBreakdown.push({ name: comp.name, code: comp.code, amount: specAmount, type: 'earning' });
              componentGross += specAmount;
            }
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

      // TA (Travel Allowance) — daily rate × field-visit days (defaults to daysWorked; HR can adjust later)
      const taFromEmp = Number(emp.ta_amount || 0); // stored as daily rate (₹ per day)
      const taAlreadyInStructure = componentBreakdown.some((c: any) => c.code === 'TA');
      if (taFromEmp > 0 && !taAlreadyInStructure) {
        const taDays = Math.round(daysWorked); // HR can override via Adjust
        const taAmount = Math.round(taFromEmp * taDays);
        if (taAmount > 0) {
          componentBreakdown.push({ name: 'Travel Allowance', code: 'TA', amount: taAmount, type: 'earning', daily_rate: taFromEmp, field_days: taDays });
          totalEarnings += taAmount;
        }
      }

      // DA (Dearness Allowance) — daily rate × field-visit days (defaults to daysWorked; HR can adjust later)
      const daFromEmp = Number(emp.da_amount || 0); // stored as daily rate (₹ per day)
      const daAlreadyInStructure = componentBreakdown.some((c: any) => c.code === 'DA');
      if (daFromEmp > 0 && !daAlreadyInStructure) {
        const daDays = Math.round(daysWorked); // HR can override via Adjust
        const daAmount = Math.round(daFromEmp * daDays);
        if (daAmount > 0) {
          componentBreakdown.push({ name: 'Dearness Allowance', code: 'DA', amount: daAmount, type: 'earning', daily_rate: daFromEmp, field_days: daDays });
          totalEarnings += daAmount;
        }
      }

      if (otPay > 0) {
        componentBreakdown.push({ name: 'Overtime Pay', code: 'OT', amount: otPay, type: 'earning' });
        totalEarnings += otPay;
      }

      const totalGrossSalary = totalEarnings;

      // PF: global flag AND per-employee flag both must be enabled
      const empPfEnabled = PF_ENABLED && (emp.pf_enabled !== false);
      const pfBase = Math.min(basicSalary, PF_CEILING);
      const pfEmployee = empPfEnabled ? Math.round(pfBase * PF_EMP_RATE) : 0;
      const pfEmployer = empPfEnabled ? Math.round(pfBase * PF_EMPR_RATE) : 0;

      // ESI: global flag AND per-employee flag both must be enabled
      const empEsiEnabled = ESI_ENABLED && (emp.esi_enabled !== false);
      const esiEmployee = empEsiEnabled && totalGrossSalary <= ESI_CEILING ? Math.round(totalGrossSalary * ESI_EMP_RATE) : 0;
      const esiEmployer = empEsiEnabled && totalGrossSalary <= ESI_CEILING ? Math.round(totalGrossSalary * ESI_EMPR_RATE) : 0;

      // PT: from state slabs or fallback (skipped if PT disabled)
      let pt = 0;
      if (PT_ENABLED) {
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

// ── Salary Sheet Excel Export ────────────────────────────────────────────────
router.get("/payroll-runs/:id/salary-sheet", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    const runRow = await db.execute(sql`SELECT month, year FROM hr_payroll_runs WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (!runRow.rows.length) return res.status(404).json({ message: "Run not found" });
    const { month, year } = runRow.rows[0] as any;
    const MONTHS = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
    const monthName = MONTHS[month];

    const rows = await db.execute(sql`
      SELECT p.*, e.emp_code, e.first_name, e.last_name,
        e.join_date, e.exit_date, e.bank_name, e.bank_account, e.ifsc,
        des.name as designation_name
      FROM hr_payslips p
      JOIN hr_employees e ON p.employee_id = e.id
      LEFT JOIN hr_designations des ON e.designation_id = des.id
      WHERE p.payroll_run_id=${req.params.id} AND p.tenant_id=${tid}
      ORDER BY e.emp_code
    `);

    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`Salary ${monthName} ${year}`);

    const COLS = [
      { header: 'Sl.No', key: 'sl', width: 6 },
      { header: 'Emp ID', key: 'emp_code', width: 12 },
      { header: 'Employee Name', key: 'name', width: 22 },
      { header: 'Date of Joining', key: 'doj', width: 14 },
      { header: 'Date of Leaving', key: 'dol', width: 14 },
      { header: 'Bank Name', key: 'bank_name', width: 18 },
      { header: 'Bank A/C No.', key: 'bank_account', width: 18 },
      { header: 'IFSC', key: 'ifsc', width: 13 },
      { header: 'Designation', key: 'designation', width: 18 },
      { header: 'Sal Calendar Days', key: 'cal_days', width: 10 },
      { header: 'Present Days', key: 'pay_days', width: 10 },
      { header: 'Derivable Days', key: 'deriv_days', width: 10 },
      { header: 'BASIC', key: 'basic', width: 12 },
      { header: 'HRA', key: 'hra', width: 12 },
      { header: 'LTA', key: 'lta', width: 12 },
      { header: 'TA', key: 'ta', width: 12 },
      { header: 'DA', key: 'da', width: 12 },
      { header: 'OT1', key: 'ot1', width: 10 },
      { header: 'Total Earning', key: 'gross', width: 13 },
      { header: 'PF', key: 'pf', width: 10 },
      { header: 'ESI', key: 'esi', width: 10 },
      { header: 'PT', key: 'pt', width: 10 },
      { header: 'Total Deductions', key: 'total_ded', width: 14 },
      { header: 'Net Amount', key: 'net', width: 13 },
    ];

    ws.columns = COLS.map(c => ({ header: '', key: c.key, width: c.width }));

    // Title row
    ws.mergeCells(1, 1, 1, COLS.length);
    const titleCell = ws.getCell('A1');
    titleCell.value = `Salary Sheet Report for the month of ${monthName}/${year}`;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    ws.getRow(1).height = 22;

    // Header row (row 2)
    const headerRow = ws.getRow(2);
    COLS.forEach((c, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = c.header;
      cell.font = { bold: true, size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6DCE4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.height = 28;

    const fmt = (v: any) => Number(v || 0);
    const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

    let slNo = 1;
    let totBasic = 0, totHRA = 0, totLTA = 0, totTA = 0, totDA = 0, totOT1 = 0, totGross = 0;
    let totPF = 0, totESI = 0, totPT = 0, totDed = 0, totNet = 0;

    for (const r of rows.rows as any[]) {
      const comps: any[] = r.components
        ? (typeof r.components === 'string' ? JSON.parse(r.components) : r.components)
        : [];

      const getComp = (code: string) => {
        const c = comps.find((x: any) => x.code?.toUpperCase() === code.toUpperCase() || x.name?.toUpperCase().includes(code.toUpperCase()));
        return c ? Number(c.amount || 0) : 0;
      };

      const basic   = getComp('BASIC') || fmt(r.basic_salary);
      const hra     = getComp('HRA');
      const lta     = getComp('LTA');
      const ta      = getComp('TA');
      const da      = getComp('DA');
      const ot1     = getComp('OT1') || getComp('OT') || getComp('OVERTIME');
      const gross   = fmt(r.gross_salary);
      const pf      = fmt(r.pf_employee);
      const esi     = fmt(r.esi_employee);
      const pt      = fmt(r.pt);
      const totDedR = fmt(r.total_deductions);
      const net     = fmt(r.net_salary);

      totBasic += basic; totHRA += hra; totLTA += lta; totTA += ta; totDA += da; totOT1 += ot1;
      totGross += gross; totPF += pf; totESI += esi; totPT += pt;
      totDed += totDedR; totNet += net;

      const dataRow = ws.addRow([
        slNo++,
        r.emp_code,
        `${r.first_name} ${r.last_name || ''}`.trim(),
        fmtDate(r.join_date),
        fmtDate(r.exit_date),
        r.bank_name || '',
        r.bank_account || '',
        r.ifsc || '',
        r.designation_name || '',
        fmt(r.days_in_month),
        fmt(r.days_worked),
        fmt(r.days_worked),
        basic, hra, lta, ta, da, ot1, gross, pf, esi, pt, totDedR, net,
      ]);

      dataRow.eachCell((cell, colNum) => {
        cell.font = { size: 9 };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (colNum >= 10) cell.alignment = { horizontal: 'right' };
        if (colNum >= 13) cell.numFmt = '#,##0.00';
      });
      dataRow.getCell(1).alignment = { horizontal: 'center' };
    }

    // Totals row
    const totRow = ws.addRow([
      '', '', 'TOTAL', '', '', '', '', '', '',
      '', '', '',
      totBasic, totHRA, totLTA, totTA, totDA, totOT1, totGross, totPF, totESI, totPT, totDed, totNet,
    ]);
    totRow.eachCell((cell, colNum) => {
      cell.font = { bold: true, size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } };
      if (colNum >= 10) cell.alignment = { horizontal: 'right' };
      if (colNum >= 13) cell.numFmt = '#,##0.00';
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Salary_Sheet_${monthName}_${year}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Bulk payslip ZIP download ────────────────────────────────────────────────
router.get("/payroll-runs/:id/payslips/zip", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const MONTHS_ARR = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
  try {
    const runRow = await db.execute(sql`SELECT month, year FROM hr_payroll_runs WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (!runRow.rows.length) return res.status(404).json({ message: "Run not found" });
    const { month, year } = runRow.rows[0] as any;
    const monthName = MONTHS_ARR[month];

    // Fetch payslip template settings
    const settRow = await db.execute(sql`SELECT * FROM hr_payslip_settings WHERE tenant_id=${tid}`);
    const sett = (settRow.rows[0] || {}) as any;

    const rows = await db.execute(sql`
      SELECT p.*, e.first_name, e.last_name, e.emp_code, e.pan, e.pf_number,
        e.bank_account, e.ifsc as bank_ifsc, e.bank_name,
        dep.name as department_name, des.name as designation_name,
        t.name as tenant_name, t.address as tenant_address
      FROM hr_payslips p
      JOIN hr_employees e ON p.employee_id = e.id
      LEFT JOIN hr_departments dep ON e.department_id = dep.id
      LEFT JOIN hr_designations des ON e.designation_id = des.id
      JOIN tenants t ON p.tenant_id = t.id
      WHERE p.payroll_run_id=${req.params.id} AND p.tenant_id=${tid}
      ORDER BY e.emp_code
    `);

    // Fetch leave balances for all employees in this run (batch — avoid N+1)
    const empIds = (rows.rows as any[]).map((r: any) => r.employee_id);
    const leaveBalRows = empIds.length
      ? await db.execute(sql`
          SELECT lb.employee_id, lb.entitled, lb.used, lb.balance,
                 lt.name as leave_type_name, lt.code
          FROM hr_leave_balances lb
          JOIN hr_leave_types lt ON lb.leave_type_id = lt.id
          WHERE lb.tenant_id=${tid} AND lb.year=${year}
            AND lb.employee_id = ANY(ARRAY[${sql.raw(empIds.join(","))}]::int[])
          ORDER BY lt.name
        `)
      : { rows: [] };

    // Group balances by employee_id
    const balancesByEmp: Record<number, any[]> = {};
    for (const b of leaveBalRows.rows as any[]) {
      if (!balancesByEmp[b.employee_id]) balancesByEmp[b.employee_id] = [];
      balancesByEmp[b.employee_id].push(b);
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="Payslips_${monthName}_${year}.zip"`);

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.pipe(res);
    archive.on("error", (err: any) => { if (!res.headersSent) res.status(500).end(); });

    const fmtN = (n: any) => Number(n || 0).toLocaleString("en-IN");
    const fmtRs = (n: any) => `&#8377;${fmtN(n)}`;

    for (const p of rows.rows as any[]) {
      const comps = p.components ? (typeof p.components === "string" ? JSON.parse(p.components) : p.components) : [];
      const earnings = comps.filter((c: any) => c.type === "earning");
      const deductions = comps.filter((c: any) => c.type === "deduction");
      const maxRows = Math.max(earnings.length, deductions.length, 1);

      const compRows = Array.from({ length: maxRows }, (_, i) => {
        const e = earnings[i]; const d = deductions[i];
        return `<tr>
          <td>${e ? e.name : ""}</td><td class="r">${e ? fmtRs(e.amount) : ""}</td>
          <td>${d ? d.name : ""}</td><td class="r">${d ? fmtRs(d.amount) : ""}</td>
        </tr>`;
      }).join("");

      // Build leave balance table for this employee
      const empLeaves = balancesByEmp[p.employee_id] || [];
      const leaveTableHtml = empLeaves.length > 0 ? `
<table style="margin-top:10px">
  <tr>
    <th colspan="4" style="background:#e8edf8;text-align:left;font-size:11px">Leave Balance Summary — ${year}</th>
  </tr>
  <tr>
    <th>Leave Type</th><th class="r">Entitled</th><th class="r">Used</th><th class="r">Balance</th>
  </tr>
  ${empLeaves.map((b: any) => `<tr>
    <td>${b.leave_type_name} (${b.code})</td>
    <td class="r">${Number(b.entitled || 0).toFixed(1)}</td>
    <td class="r">${Number(b.used || 0).toFixed(1)}</td>
    <td class="r" style="font-weight:bold;color:${Number(b.balance) > 0 ? "#166534" : "#c00"}">${Number(b.balance || 0).toFixed(1)}</td>
  </tr>`).join("")}
</table>` : "";

      // Build company header from settings or fall back to tenant name
      const coName = sett.company_name || p.tenant_name || "Company";
      const coAddr = [sett.company_address, sett.company_city, sett.company_state, sett.company_pin].filter(Boolean).join(", ");
      const coContact = [sett.company_phone ? `Ph: ${sett.company_phone}` : "", sett.company_email || ""].filter(Boolean).join(" | ");
      const coReg = [sett.company_gstin ? `GSTIN: ${sett.company_gstin}` : "", sett.company_cin ? `CIN: ${sett.company_cin}` : ""].filter(Boolean).join(" | ");
      const logoHtml = sett.logo_path ? `<img src="data:image/png;base64,${(() => { try { return fs.readFileSync(sett.logo_path).toString("base64"); } catch { return ""; } })()}" style="height:48px;object-fit:contain;">` : "";
      const signatory = sett.signatory_name ? `<div style="margin-top:24px;text-align:right;font-size:11px;"><b>${sett.signatory_name}</b>${sett.signatory_designation ? `<br>${sett.signatory_designation}` : ""}<br>Authorised Signatory</div>` : "";
      const footerNote = sett.footer_note || "This is a system-generated payslip. Not valid without company seal.";

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Payslip ${p.emp_code} ${monthName} ${year}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#222}
  .header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #1e40af;padding-bottom:10px;margin-bottom:12px}
  .co-info{flex:1}
  .co-name{font-size:16px;font-weight:bold;color:#1e40af}
  .co-addr,.co-reg{font-size:10px;color:#555;margin-top:2px}
  .slip-title{background:#1e40af;color:#fff;text-align:center;padding:4px 0;font-size:13px;font-weight:bold;margin-bottom:10px}
  table{width:100%;border-collapse:collapse;margin-bottom:10px}
  th,td{border:1px solid #ccc;padding:5px 8px;font-size:11px}
  th{background:#e8edf8;text-align:left;font-size:11px}
  .r{text-align:right}
  .total{font-weight:bold;background:#f0f4ff}
  .netpay{background:#1e40af;color:#fff;font-weight:bold;text-align:center;font-size:13px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px 12px;margin-bottom:10px;font-size:11px}
  .lbl{color:#666}
</style></head><body>
<div class="header">
  ${logoHtml}
  <div class="co-info">
    <div class="co-name">${coName}</div>
    ${coAddr ? `<div class="co-addr">${coAddr}</div>` : ""}
    ${coContact ? `<div class="co-addr">${coContact}</div>` : ""}
    ${coReg ? `<div class="co-reg">${coReg}</div>` : ""}
  </div>
</div>
<div class="slip-title">SALARY SLIP — ${monthName.toUpperCase()} ${year}</div>
<div class="grid">
  <div><span class="lbl">Employee:</span> <b>${p.first_name} ${p.last_name}</b></div>
  <div><span class="lbl">Code:</span> ${p.emp_code}</div>
  <div><span class="lbl">Department:</span> ${p.department_name || "—"}</div>
  <div><span class="lbl">Designation:</span> ${p.designation_name || "—"}</div>
  <div><span class="lbl">PAN:</span> ${p.pan || "—"}</div>
  <div><span class="lbl">PF No:</span> ${p.pf_number || "—"}</div>
  <div><span class="lbl">Days Worked:</span> ${p.days_worked}/${p.days_in_month}</div>
  <div><span class="lbl">LOP Days:</span> ${p.lop_days || 0}</div>
  <div><span class="lbl">Bank:</span> ${p.bank_name || "—"}</div>
</div>
<table>
  <tr><th>Earnings</th><th class="r">Amount (&#8377;)</th><th>Deductions</th><th class="r">Amount (&#8377;)</th></tr>
  ${compRows}
  <tr class="total">
    <td>Gross Salary</td><td class="r">${fmtRs(p.gross_salary)}</td>
    <td>Total Deductions</td><td class="r" style="color:#c00">${fmtRs(p.total_deductions)}</td>
  </tr>
  <tr><td colspan="4" class="netpay">Net Pay: ${fmtRs(p.net_salary)}</td></tr>
</table>
${leaveTableHtml}
${signatory}
<p style="font-size:10px;color:#888;text-align:center;margin-top:16px">${footerNote}<br>Generated on ${new Date().toLocaleDateString("en-IN")}</p>
</body></html>`;

      archive.append(html, { name: `${p.emp_code}_${p.first_name}_${p.last_name}_${monthName}_${year}.html` });
    }
    await archive.finalize();
  } catch (e: any) { if (!res.headersSent) res.status(500).json({ message: e.message }); }
});

// ── Form 16 PDF download ─────────────────────────────────────────────────────
router.get("/form16/:employeeId/:fiscalYear/pdf", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const { employeeId, fiscalYear } = req.params;
  const MONTHS_ARR = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  try {
    const empRow = await db.execute(sql`
      SELECT e.*, des.name as designation_name, dep.name as department_name, t.name as tenant_name
      FROM hr_employees e
      LEFT JOIN hr_designations des ON e.designation_id = des.id
      LEFT JOIN hr_departments dep ON e.department_id = dep.id
      JOIN tenants t ON t.id = e.tenant_id
      WHERE e.id=${Number(employeeId)} AND e.tenant_id=${tid}
    `);
    if (!empRow.rows.length) return res.status(404).json({ message: "Employee not found" });
    const emp = empRow.rows[0] as any;

    const startYear = Number(fiscalYear.split("-")[0]);
    const endYear = startYear + 1;

    const psRows = await db.execute(sql`
      SELECT p.*, r.month, r.year FROM hr_payslips p
      JOIN hr_payroll_runs r ON p.payroll_run_id = r.id
      WHERE p.employee_id=${Number(employeeId)} AND p.tenant_id=${tid}
        AND ((r.year=${startYear} AND r.month >= 4) OR (r.year=${endYear} AND r.month <= 3))
      ORDER BY r.year, r.month
    `);
    const payslips = psRows.rows as any[];
    const decl = ((await db.execute(sql`
      SELECT * FROM hr_tds_declarations WHERE employee_id=${Number(employeeId)} AND tenant_id=${tid} AND fiscal_year=${fiscalYear}
    `)).rows[0] || null) as any;

    const totalGross = payslips.reduce((s, p) => s + Number(p.gross_salary || 0), 0);
    const totalPF = payslips.reduce((s, p) => s + Number(p.pf_employee || 0), 0);
    const totalPT = payslips.reduce((s, p) => s + Number(p.pt || 0), 0);
    const totalTDS = payslips.reduce((s, p) => s + Number(p.tds || 0), 0);
    const stdDed = emp.tax_regime === "old" ? 50000 : 75000;
    const fmtN = (n: any) => Number(n || 0).toLocaleString("en-IN");
    const fmtRs = (n: any) => `Rs.${fmtN(n)}`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Form16_${emp.emp_code}_${fiscalYear}.pdf"`);

    const doc = new PDFDocument({ size: "A4", margin: 45 });
    doc.pipe(res);

    const W = 505; // usable width (595 - 45*2)

    // Header
    doc.fontSize(13).font("Helvetica-Bold").text(emp.tenant_name || "Company", { align: "center" });
    doc.fontSize(11).font("Helvetica-Bold").text("FORM 16 — Certificate of Tax Deducted at Source", { align: "center" });
    doc.fontSize(9).font("Helvetica").fillColor("#555").text(`Financial Year: ${fiscalYear}  |  Assessment Year: ${endYear}-${String(endYear + 1).slice(2)}`, { align: "center" });
    doc.fillColor("#000").moveDown(0.8);

    // Section divider helper
    const sectionTitle = (title: string) => {
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#1e3a5f")
        .rect(45, doc.y, W, 14).fill("#e8f0fe")
        .fillColor("#1e3a5f").text("  " + title, 45, doc.y - 11);
      doc.fillColor("#000").moveDown(0.4);
    };

    // Employee Details
    sectionTitle("EMPLOYEE DETAILS");
    const empInfo = [
      ["Name", `${emp.first_name} ${emp.last_name}`, "Emp Code", emp.emp_code],
      ["Designation", emp.designation_name || "—", "Department", emp.department_name || "—"],
      ["PAN", emp.pan || "Not Provided", "Tax Regime", emp.tax_regime === "old" ? "Old Regime" : "New Regime"],
      ["PF Number", emp.pf_number || "—", "Period", `Apr ${startYear} – Mar ${endYear}`],
    ];
    for (const [l1, v1, l2, v2] of empInfo) {
      const ey = doc.y;
      doc.font("Helvetica").fontSize(8).fillColor("#555").text(l1 + ":", 45, ey, { width: 70 });
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#000").text(String(v1), 115, ey, { width: 140 });
      doc.font("Helvetica").fontSize(8).fillColor("#555").text(String(l2) + ":", 295, ey, { width: 70 });
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#000").text(String(v2), 365, ey, { width: 185 });
      doc.moveDown(0.5);
    }
    doc.moveDown(0.5);

    // Part A
    sectionTitle("PART A — TDS SUMMARY (MONTH-WISE)");
    const colX = [45, 175, 285, 355, 425];
    const colW = [130, 110, 70, 70, 125];
    const ths = ["Month", "Gross Salary", "PF", "PT", "TDS Deducted"];
    const thY = doc.y;
    ths.forEach((h, i) => doc.font("Helvetica-Bold").fontSize(8).text(h, colX[i], thY, { width: colW[i], align: i > 0 ? "right" : "left" }));
    doc.moveDown(0.3);
    doc.moveTo(45, doc.y).lineTo(550, doc.y).lineWidth(0.5).stroke();
    doc.moveDown(0.2);

    const MONTHS_ORDER = [4,5,6,7,8,9,10,11,12,1,2,3];
    for (const m of MONTHS_ORDER) {
      const ps = payslips.find((p: any) => p.month === m);
      if (!ps) continue;
      const ry = doc.y;
      const rowData = [
        `${MONTHS_ARR[m]} ${m >= 4 ? startYear : endYear}`,
        fmtRs(ps.gross_salary), fmtRs(ps.pf_employee), fmtRs(ps.pt), fmtRs(ps.tds)
      ];
      rowData.forEach((v, i) => doc.font("Helvetica").fontSize(8).text(v, colX[i], ry, { width: colW[i], align: i > 0 ? "right" : "left" }));
      doc.moveDown(0.4);
    }
    doc.moveTo(45, doc.y).lineTo(550, doc.y).lineWidth(0.5).stroke();
    doc.moveDown(0.2);
    const ty = doc.y;
    const totRow = ["TOTAL", fmtRs(totalGross), fmtRs(totalPF), fmtRs(totalPT), fmtRs(totalTDS)];
    totRow.forEach((v, i) => doc.font("Helvetica-Bold").fontSize(8).text(v, colX[i], ty, { width: colW[i], align: i > 0 ? "right" : "left" }));
    doc.moveDown(1);

    // Part B
    sectionTitle("PART B — INCOME COMPUTATION");
    const items: [string, string][] = [
      ["1. Gross Salary", fmtRs(totalGross)],
      ["2.  Less: Standard Deduction", `(${fmtRs(stdDed)})`],
      ["3.  Less: PF Contribution (Employee)", `(${fmtRs(totalPF)})`],
      ["4.  Less: Professional Tax Paid", `(${fmtRs(totalPT)})`],
    ];
    if (decl && emp.tax_regime !== "new") {
      const t80c = Math.min(150000, ["lic_premium","ppf","elss","nsc","home_loan_principal","fd_tax_saving","other_80c"].reduce((s, k) => s + Number(decl[k]||0), 0));
      const t80d = Number(decl.sec_80d_self||0) + Number(decl.sec_80d_parents||0);
      const nps = Math.min(50000, Number(decl.nps_80ccd||0));
      if (t80c) items.push(["5.  Less: Section 80C Investments (capped at 1.5L)", `(${fmtRs(t80c)})`]);
      if (t80d) items.push(["6.  Less: Section 80D Health Insurance", `(${fmtRs(t80d)})`]);
      if (Number(decl.home_loan_interest)) items.push(["7.  Less: Home Loan Interest (Sec 24)", `(${fmtRs(Math.min(200000, Number(decl.home_loan_interest)))})`]);
      if (nps) items.push(["8.  Less: NPS Self Contribution (80CCD-1B)", `(${fmtRs(nps)})`]);
    } else if (!decl) {
      items.push(["5. Investment Declaration", "Not submitted"]);
    } else {
      items.push(["5. Deductions", "Not applicable (New Regime)"]);
    }

    for (const [l, v] of items) {
      const iy = doc.y;
      doc.font("Helvetica").fontSize(8).fillColor("#000").text(l, 45, iy, { width: 360 });
      doc.font("Helvetica").fontSize(8).text(v, 405, iy, { width: 145, align: "right" });
      doc.moveDown(0.45);
    }
    doc.moveTo(45, doc.y).lineTo(550, doc.y).lineWidth(0.5).stroke();
    doc.moveDown(0.3);
    const netY = doc.y;
    doc.font("Helvetica-Bold").fontSize(9).text("Total TDS Deducted at Source", 45, netY, { width: 360 });
    doc.font("Helvetica-Bold").fontSize(9).text(fmtRs(totalTDS), 405, netY, { width: 145, align: "right" });
    doc.moveDown(1.5);

    // Footer
    doc.fontSize(7).font("Helvetica").fillColor("#888")
      .text(`This is a system-generated Form 16. Generated on ${new Date().toLocaleDateString("en-IN")}. For queries, contact HR.`, { align: "center" });

    doc.end();
  } catch (e: any) { if (!res.headersSent) res.status(500).json({ message: e.message }); }
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

// Adjust earning components on a draft/approved payslip (e.g. remove TA/DA for no-field-visit)
router.put("/payslips/:id/adjust", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  try {
    // Fetch current payslip
    const r = await db.execute(sql`SELECT * FROM hr_payslips WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (!r.rows.length) return res.status(404).json({ message: "Payslip not found" });
    const ps = r.rows[0] as any;
    if (ps.status === 'locked') return res.status(400).json({ message: "Payslip is locked and cannot be adjusted" });

    const { adjustments } = req.body; // [{code, amount}]  amount=null means remove that component
    if (!Array.isArray(adjustments)) return res.status(400).json({ message: "adjustments must be an array" });

    // Parse current components
    let comps: any[] = ps.components
      ? (typeof ps.components === 'string' ? JSON.parse(ps.components) : ps.components)
      : [];

    // Apply adjustments: update amounts or remove components where amount = null/undefined
    for (const adj of adjustments) {
      const idx = comps.findIndex((c: any) => c.code === adj.code);
      if (adj.amount === null || adj.amount === undefined || Number(adj.amount) === 0) {
        // Remove this component
        if (idx >= 0) comps.splice(idx, 1);
      } else {
        if (idx >= 0) {
          comps[idx] = { ...comps[idx], amount: Number(adj.amount) };
        } else {
          // Add if doesn't exist (e.g. adding a component that was missing)
          comps.push({ code: adj.code, name: adj.name || adj.code, amount: Number(adj.amount), type: 'earning' });
        }
      }
    }

    // Recalculate totals from updated components
    const newGross = comps.filter((c: any) => c.type === 'earning').reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
    const pfEmployee = Number(ps.pf_employee || 0);
    const esiEmployee = Number(ps.esi_employee || 0);
    const pt = Number(ps.pt || 0);
    const tds = Number(ps.tds || 0);
    const otherDed = Number(ps.other_deductions || 0);
    const newTotalDed = pfEmployee + esiEmployee + pt + tds + otherDed;
    const newNet = newGross - newTotalDed;

    await db.execute(sql`
      UPDATE hr_payslips
      SET components=${JSON.stringify(comps)},
          gross_salary=${newGross},
          total_deductions=${newTotalDed},
          net_salary=${newNet}
      WHERE id=${req.params.id} AND tenant_id=${tid}
    `);

    // Also update payroll_run totals
    const runTotals = await db.execute(sql`
      SELECT SUM(gross_salary) as total_gross, SUM(total_deductions) as total_ded
      FROM hr_payslips WHERE payroll_run_id=${ps.payroll_run_id} AND tenant_id=${tid}
    `);
    const rt = runTotals.rows[0] as any;
    await db.execute(sql`
      UPDATE hr_payroll_runs SET total_gross=${Number(rt.total_gross||0)}, total_deductions=${Number(rt.total_ded||0)} WHERE id=${ps.payroll_run_id} AND tenant_id=${tid}
    `);

    res.json({ message: "Payslip adjusted", gross: newGross, net: newNet });
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
        SUM(p.pt) as total_pt,
        SUM(p.tds) as total_tds
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
  const { signatoryName, signatoryDesignation, showEmployerContributions, showLoanDeductions, footerNote,
    companyName, companyAddress, companyCity, companyState, companyPin, companyPhone, companyEmail,
    companyGstin, companyCin, templateStyle } = req.body;
  try {
    await db.execute(sql`
      INSERT INTO hr_payslip_settings (tenant_id, signatory_name, signatory_designation, show_employer_contributions, show_loan_deductions, footer_note,
        company_name, company_address, company_city, company_state, company_pin, company_phone, company_email,
        company_gstin, company_cin, template_style, updated_at)
      VALUES (${tid}, ${signatoryName ?? null}, ${signatoryDesignation ?? null}, ${showEmployerContributions ?? true}, ${showLoanDeductions ?? true}, ${footerNote ?? null},
        ${companyName ?? null}, ${companyAddress ?? null}, ${companyCity ?? null}, ${companyState ?? null}, ${companyPin ?? null},
        ${companyPhone ?? null}, ${companyEmail ?? null}, ${companyGstin ?? null}, ${companyCin ?? null}, ${templateStyle ?? 'classic'}, NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        signatory_name=${signatoryName ?? null}, signatory_designation=${signatoryDesignation ?? null},
        show_employer_contributions=${showEmployerContributions ?? true}, show_loan_deductions=${showLoanDeductions ?? true},
        footer_note=${footerNote ?? null},
        company_name=${companyName ?? null}, company_address=${companyAddress ?? null},
        company_city=${companyCity ?? null}, company_state=${companyState ?? null},
        company_pin=${companyPin ?? null}, company_phone=${companyPhone ?? null},
        company_email=${companyEmail ?? null}, company_gstin=${companyGstin ?? null},
        company_cin=${companyCin ?? null}, template_style=${templateStyle ?? 'classic'}, updated_at=NOW()
    `);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Upload payslip company logo
router.post("/payslip-settings/logo", requireHR, logoUpload.single("logo"), async (req: any, res) => {
  const tid = getTenantId(req);
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const logoPath = req.file.path;
  try {
    await db.execute(sql`
      INSERT INTO hr_payslip_settings (tenant_id, logo_path, updated_at)
      VALUES (${tid}, ${logoPath}, NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET logo_path=${logoPath}, updated_at=NOW()
    `);
    res.json({ logoPath });
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

// Approve / Reject TDS declaration
router.put("/tds-declarations/:id/action", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const userId = (req as any).user?.id ?? null;
  const { status, approverComment } = req.body;
  if (!["approved", "rejected"].includes(status)) return res.status(400).json({ message: "Invalid status" });
  try {
    const r = await db.execute(sql`
      UPDATE hr_tds_declarations
      SET status=${status}, approved_by=${Number.isInteger(Number(userId)) && !isNaN(Number(userId)) ? Number(userId) : null}, approver_comment=${approverComment ?? null}, approved_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid}
      RETURNING *
    `);
    if (!r.rows[0]) return res.status(404).json({ message: "Not found" });
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
    const leaveBal = await db.execute(sql`SELECT * FROM hr_leave_balances WHERE employee_id=${Number(employeeId)} AND tenant_id=${tid} AND leave_type_id IN (SELECT id FROM hr_leave_types WHERE code='EL' AND tenant_id=${tid})`);
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

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2 — Expense Claims
// ═══════════════════════════════════════════════════════════════════════════
router.get("/expense-claims", requireHR, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { employeeId, status } = req.query;
    let q = `SELECT ec.*, e.first_name||' '||e.last_name AS employee_name
             FROM hr_expense_claims ec
             JOIN hr_employees e ON e.id = ec.employee_id
             WHERE ec.tenant_id=${tid} AND ec.record_status=1`;
    if (employeeId) q += ` AND ec.employee_id=${Number(employeeId)}`;
    if (status)     q += ` AND ec.status='${status}'`;
    q += ` ORDER BY ec.created_at DESC`;
    const claims = await db.execute(sql.raw(q));
    const ids = (claims.rows as any[]).map((c: any) => Number(c.id)).filter(Boolean);
    const items = ids.length > 0
      ? await db.execute(sql.raw(`SELECT * FROM hr_expense_claim_items WHERE claim_id IN (${ids.join(",")}) AND tenant_id=${tid}`))
      : { rows: [] };
    res.json({ claims: claims.rows, items: items.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/expense-claims", requireHR, async (req: any, res) => {
  const tid = req.session?.tenantId;
  const { employeeId, title, claimDate, items: claimItems, notes } = req.body;
  const total = (claimItems || []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
  const claim = await db.execute(sql`INSERT INTO hr_expense_claims
    (tenant_id, employee_id, title, claim_date, total_amount, notes, status)
    VALUES (${tid}, ${employeeId}, ${title}, ${claimDate}, ${total}, ${notes||null}, 'pending')
    RETURNING *`);
  const claimId = (claim.rows[0] as any).id;
  for (const it of claimItems || []) {
    await db.execute(sql`INSERT INTO hr_expense_claim_items
      (tenant_id, claim_id, category, description, amount, receipt_url, expense_date)
      VALUES (${tid}, ${claimId}, ${it.category}, ${it.description||null}, ${it.amount}, ${it.receiptUrl||null}, ${it.expenseDate||null})`);
  }
  res.json(claim.rows[0]);
});

router.put("/expense-claims/:id/action", requireHR, async (req: any, res) => {
  const tid = req.session?.tenantId;
  const { action, rejectionReason } = req.body;
  const userId = req.user?.id;
  if (!['approved','rejected','paid'].includes(action)) return res.status(400).json({ message: 'Invalid action' });
  await db.execute(sql`UPDATE hr_expense_claims SET
    status=${action}, approved_by=${Number.isInteger(Number(userId)) && !isNaN(Number(userId)) ? Number(userId) : null},
    approved_at=${action !== 'paid' ? sql`NOW()` : sql`approved_at`},
    paid_at=${action === 'paid' ? sql`NOW()` : sql`paid_at`},
    rejection_reason=${rejectionReason||null}
    WHERE id=${req.params.id} AND tenant_id=${tid}`);
  res.json({ success: true });
});

router.delete("/expense-claims/:id", requireHR, async (req: any, res) => {
  const tid = req.session?.tenantId;
  await db.execute(sql`UPDATE hr_expense_claims SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 4 — Timesheets
// ═══════════════════════════════════════════════════════════════════════════
router.get("/timesheets", requireHR, async (req: any, res) => {
  const tid = req.session?.tenantId;
  const { employeeId, projectId, fromDate, toDate } = req.query;
  let q = `SELECT t.*, e.first_name||' '||e.last_name AS employee_name, p.name AS project_name
           FROM timesheets t
           JOIN hr_employees e ON e.id = t.employee_id
           LEFT JOIN projects p ON p.id = t.project_id
           WHERE t.tenant_id=${tid} AND t.record_status=1`;
  if (employeeId) q += ` AND t.employee_id=${Number(employeeId)}`;
  if (projectId)  q += ` AND t.project_id=${Number(projectId)}`;
  if (fromDate)   q += ` AND t.work_date >= '${fromDate}'`;
  if (toDate)     q += ` AND t.work_date <= '${toDate}'`;
  q += ` ORDER BY t.work_date DESC`;
  const rows = await db.execute(sql.raw(q));
  res.json(rows.rows);
});

router.post("/timesheets", requireHR, async (req: any, res) => {
  const tid = req.session?.tenantId;
  const { employeeId, projectId, clientName, workDate, hours, description, isBillable } = req.body;
  const r = await db.execute(sql`INSERT INTO timesheets
    (tenant_id, employee_id, project_id, client_name, work_date, hours, description, is_billable)
    VALUES (${tid}, ${employeeId}, ${projectId||null}, ${clientName||null}, ${workDate}, ${hours}, ${description||null}, ${isBillable !== false})
    RETURNING *`);
  res.json(r.rows[0]);
});

router.put("/timesheets/:id", requireHR, async (req: any, res) => {
  const tid = req.session?.tenantId;
  const { projectId, clientName, workDate, hours, description, isBillable, approved } = req.body;
  const r = await db.execute(sql`UPDATE timesheets SET
    project_id=${projectId||null}, client_name=${clientName||null}, work_date=${workDate},
    hours=${hours}, description=${description||null}, is_billable=${isBillable !== false},
    approved=${approved||false}, approved_by=${approved ? (Number.isInteger(Number(req.user?.id)) && !isNaN(Number(req.user?.id)) ? Number(req.user?.id) : null) : null}
    WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
  res.json(r.rows[0]);
});

router.delete("/timesheets/:id", requireHR, async (req: any, res) => {
  const tid = req.session?.tenantId;
  await db.execute(sql`UPDATE timesheets SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 5 — Performance Appraisal
// ═══════════════════════════════════════════════════════════════════════════
router.get("/appraisal-cycles", requireHR, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const rows = await db.execute(sql`SELECT * FROM appraisal_cycles WHERE tenant_id=${tid} AND record_status=1 ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/appraisal-cycles", requireHR, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { name, periodFrom, periodTo } = req.body;
    const r = await db.execute(sql`INSERT INTO appraisal_cycles (tenant_id, name, period_from, period_to) VALUES (${tid}, ${name}, ${periodFrom||null}, ${periodTo||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/appraisal-cycles/:id", requireHR, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { name, periodFrom, periodTo, status } = req.body;
    const r = await db.execute(sql`UPDATE appraisal_cycles SET name=${name}, period_from=${periodFrom||null}, period_to=${periodTo||null}, status=${status||'draft'} WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/appraisals", requireHR, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { cycleId } = req.query;
    let q = `SELECT a.*, e.first_name||' '||e.last_name AS employee_name,
             mgr.first_name||' '||mgr.last_name AS appraiser_name
             FROM appraisals a
             JOIN hr_employees e ON e.id = a.employee_id
             LEFT JOIN hr_employees mgr ON mgr.id = a.appraiser_id
             WHERE a.tenant_id=${tid} AND a.record_status=1`;
    if (cycleId) q += ` AND a.cycle_id=${Number(cycleId)}`;
    q += ` ORDER BY e.first_name`;
    const rows = await db.execute(sql.raw(q));
    const ids = (rows.rows as any[]).map((r: any) => Number(r.id)).filter(Boolean);
    const kras = ids.length > 0
      ? await db.execute(sql.raw(`SELECT * FROM appraisal_kras WHERE appraisal_id IN (${ids.join(",")}) AND tenant_id=${tid}`))
      : { rows: [] };
    res.json({ appraisals: rows.rows, kras: kras.rows });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/appraisals", requireHR, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { cycleId, employeeId, appraiserId, kras } = req.body;
    const r = await db.execute(sql`INSERT INTO appraisals (tenant_id, cycle_id, employee_id, appraiser_id, status)
      VALUES (${tid}, ${cycleId}, ${employeeId}, ${appraiserId||null}, 'pending') RETURNING *`);
    const appraisalId = (r.rows[0] as any).id;
    for (const kra of kras || []) {
      await db.execute(sql`INSERT INTO appraisal_kras (tenant_id, appraisal_id, kra, weightage)
        VALUES (${tid}, ${appraisalId}, ${kra.kra}, ${kra.weightage||null})`);
    }
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/appraisals/:id", requireHR, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { selfRating, managerRating, finalRating, strengths, improvements, goals, status, kras } = req.body;
    const r = await db.execute(sql`UPDATE appraisals SET
      self_rating=${selfRating||null}, manager_rating=${managerRating||null},
      final_rating=${finalRating||null}, strengths=${strengths||null},
      improvements=${improvements||null}, goals=${goals||null}, status=${status||'pending'}
      WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    if (kras) {
      for (const k of kras) {
        if (k.id) {
          await db.execute(sql`UPDATE appraisal_kras SET self_score=${k.selfScore||null}, manager_score=${k.managerScore||null} WHERE id=${k.id}`);
        }
      }
    }
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 1 — Tenant Module Labels
// ═══════════════════════════════════════════════════════════════════════════
router.get("/module-labels", requireHR, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const rows = await db.execute(sql`SELECT * FROM tenant_module_labels WHERE tenant_id=${tid}`);
    res.json(rows.rows);
  } catch {
    res.json([]);
  }
});

router.put("/module-labels", requireHR, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { labels } = req.body; // [{moduleKey, customLabel}]
    for (const { moduleKey, customLabel } of labels || []) {
      await db.execute(sql`INSERT INTO tenant_module_labels (tenant_id, module_key, custom_label)
        VALUES (${tid}, ${moduleKey}, ${customLabel})
        ON CONFLICT (tenant_id, module_key) DO UPDATE SET custom_label=${customLabel}`);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Failed to save module labels" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 1 — Custom Field Definitions
// ═══════════════════════════════════════════════════════════════════════════
router.get("/custom-fields", requireHR, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { entityType } = req.query;
    const rows = await db.execute(sql`SELECT * FROM custom_field_definitions WHERE tenant_id=${tid} AND record_status=1`);
    const filtered = entityType
      ? (rows.rows as any[]).filter(r => r.entity_type === entityType)
      : rows.rows;
    res.json(filtered);
  } catch {
    res.json([]);
  }
});

router.post("/custom-fields", requireHR, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { entityType, fieldName, fieldLabel, fieldType, options, isRequired, sortOrder } = req.body;
    const r = await db.execute(sql`INSERT INTO custom_field_definitions
      (tenant_id, entity_type, field_name, field_label, field_type, options, is_required, sort_order)
      VALUES (${tid}, ${entityType}, ${fieldName}, ${fieldLabel}, ${fieldType||'text'}, ${options ? JSON.stringify(options) : null}, ${isRequired||false}, ${sortOrder||0})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Failed to create custom field" });
  }
});

router.put("/custom-fields/:id", requireHR, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { fieldLabel, fieldType, options, isRequired, sortOrder } = req.body;
    const r = await db.execute(sql`UPDATE custom_field_definitions SET
      field_label=${fieldLabel}, field_type=${fieldType||'text'}, options=${options ? JSON.stringify(options) : null},
      is_required=${isRequired||false}, sort_order=${sortOrder||0}
      WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Failed to update custom field" });
  }
});

router.delete("/custom-fields/:id", requireHR, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    await db.execute(sql`UPDATE custom_field_definitions SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Failed to delete custom field" });
  }
});

export default router;


