import { pgTable, serial, varchar, text, integer, boolean, timestamp, date, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Departments ──────────────────────────────────────────────────────────────
export const hrDepartments = pgTable("hr_departments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  recordStatus: integer("record_status").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertHrDepartmentSchema = createInsertSchema(hrDepartments).omit({ id: true, createdAt: true });
export type InsertHrDepartment = z.infer<typeof insertHrDepartmentSchema>;
export type HrDepartment = typeof hrDepartments.$inferSelect;

// ── Designations ─────────────────────────────────────────────────────────────
export const hrDesignations = pgTable("hr_designations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  departmentId: integer("department_id"),
  grade: varchar("grade", { length: 50 }),
  recordStatus: integer("record_status").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertHrDesignationSchema = createInsertSchema(hrDesignations).omit({ id: true, createdAt: true });
export type InsertHrDesignation = z.infer<typeof insertHrDesignationSchema>;
export type HrDesignation = typeof hrDesignations.$inferSelect;

// ── Shifts ───────────────────────────────────────────────────────────────────
export const hrShifts = pgTable("hr_shifts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  startTime: varchar("start_time", { length: 10 }),
  endTime: varchar("end_time", { length: 10 }),
  breakMinutes: integer("break_minutes").default(30),
  weeklyOff: varchar("weekly_off", { length: 50 }).default("sunday"),
  recordStatus: integer("record_status").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertHrShiftSchema = createInsertSchema(hrShifts).omit({ id: true, createdAt: true });
export type InsertHrShift = z.infer<typeof insertHrShiftSchema>;
export type HrShift = typeof hrShifts.$inferSelect;

// ── Leave Types ──────────────────────────────────────────────────────────────
export const hrLeaveTypes = pgTable("hr_leave_types", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  annualDays: integer("annual_days").notNull().default(0),
  isCarryForward: boolean("is_carry_forward").default(false),
  maxCarryForward: integer("max_carry_forward").default(0),
  isEncashable: boolean("is_encashable").default(false),
  isPaidLeave: boolean("is_paid_leave").default(true),
  recordStatus: integer("record_status").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertHrLeaveTypeSchema = createInsertSchema(hrLeaveTypes).omit({ id: true, createdAt: true });
export type InsertHrLeaveType = z.infer<typeof insertHrLeaveTypeSchema>;
export type HrLeaveType = typeof hrLeaveTypes.$inferSelect;

// ── Holidays ─────────────────────────────────────────────────────────────────
export const hrHolidays = pgTable("hr_holidays", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  year: integer("year").notNull(),
  date: date("date").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("festival"),
  isPaid: boolean("is_paid").default(true),
  recordStatus: integer("record_status").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertHrHolidaySchema = createInsertSchema(hrHolidays).omit({ id: true, createdAt: true });
export type InsertHrHoliday = z.infer<typeof insertHrHolidaySchema>;
export type HrHoliday = typeof hrHolidays.$inferSelect;

// ── Salary Components ────────────────────────────────────────────────────────
export const hrSalaryComponents = pgTable("hr_salary_components", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // earning | deduction
  formulaType: varchar("formula_type", { length: 20 }).notNull().default("fixed"), // fixed | percent_of_basic
  formulaValue: numeric("formula_value", { precision: 10, scale: 2 }).default("0"),
  isStatutory: boolean("is_statutory").default(false),
  showOnPayslip: boolean("show_on_payslip").default(true),
  recordStatus: integer("record_status").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertHrSalaryComponentSchema = createInsertSchema(hrSalaryComponents).omit({ id: true, createdAt: true });
export type InsertHrSalaryComponent = z.infer<typeof insertHrSalaryComponentSchema>;
export type HrSalaryComponent = typeof hrSalaryComponents.$inferSelect;

// ── Salary Structures ────────────────────────────────────────────────────────
export const hrSalaryStructures = pgTable("hr_salary_structures", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  components: jsonb("components").default([]), // [{componentId, formulaType, value}]
  recordStatus: integer("record_status").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertHrSalaryStructureSchema = createInsertSchema(hrSalaryStructures).omit({ id: true, createdAt: true });
export type InsertHrSalaryStructure = z.infer<typeof insertHrSalaryStructureSchema>;
export type HrSalaryStructure = typeof hrSalaryStructures.$inferSelect;

// ── Professional Tax Slabs ───────────────────────────────────────────────────
export const hrPtSlabs = pgTable("hr_pt_slabs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  incomeFrom: integer("income_from").notNull(),
  incomeTo: integer("income_to"),
  ptAmount: integer("pt_amount").notNull(),
  recordStatus: integer("record_status").notNull().default(1),
});
export const insertHrPtSlabSchema = createInsertSchema(hrPtSlabs).omit({ id: true });
export type InsertHrPtSlab = z.infer<typeof insertHrPtSlabSchema>;
export type HrPtSlab = typeof hrPtSlabs.$inferSelect;

// ── Employees ────────────────────────────────────────────────────────────────
export const hrEmployees = pgTable("hr_employees", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  empCode: varchar("emp_code", { length: 50 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }),
  gender: varchar("gender", { length: 10 }),
  dateOfBirth: date("date_of_birth"),
  bloodGroup: varchar("blood_group", { length: 5 }),
  photoPath: text("photo_path"),
  departmentId: integer("department_id"),
  designationId: integer("designation_id"),
  shiftId: integer("shift_id"),
  salaryStructureId: integer("salary_structure_id"),
  basicSalary: integer("basic_salary").default(0),
  ctc: integer("ctc").default(0),
  joinDate: date("join_date").notNull(),
  exitDate: date("exit_date"),
  exitType: varchar("exit_type", { length: 50 }),
  exitReason: text("exit_reason"),
  resignationDate: date("resignation_date"),
  reportingManagerId: integer("reporting_manager_id"),
  phone: varchar("phone", { length: 20 }),
  alternatePhone: varchar("alternate_phone", { length: 20 }),
  email: varchar("email", { length: 200 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  pincode: varchar("pincode", { length: 10 }),
  emergencyContact: varchar("emergency_contact", { length: 20 }),
  emergencyContactName: varchar("emergency_contact_name", { length: 100 }),
  emergencyContactRelation: varchar("emergency_contact_relation", { length: 50 }),
  pan: varchar("pan", { length: 20 }),
  aadhaar: varchar("aadhaar", { length: 20 }),
  pfNumber: varchar("pf_number", { length: 50 }),
  esiNumber: varchar("esi_number", { length: 50 }),
  uan: varchar("uan", { length: 30 }),
  bankAccount: varchar("bank_account", { length: 50 }),
  ifsc: varchar("ifsc", { length: 20 }),
  bankName: varchar("bank_name", { length: 100 }),
  taxRegime: varchar("tax_regime", { length: 10 }).default("new"),
  // Family details
  maritalStatus: varchar("marital_status", { length: 20 }),
  spouseName: varchar("spouse_name", { length: 100 }),
  spouseDob: date("spouse_dob"),
  spouseAadhaar: varchar("spouse_aadhaar", { length: 20 }),
  fatherName: varchar("father_name", { length: 100 }),
  fatherDob: date("father_dob"),
  fatherAadhaar: varchar("father_aadhaar", { length: 20 }),
  motherName: varchar("mother_name", { length: 100 }),
  motherDob: date("mother_dob"),
  motherAadhaar: varchar("mother_aadhaar", { length: 20 }),
  numberOfChildren: integer("number_of_children").default(0),
  status: varchar("status", { length: 20 }).default("active"),
  recordStatus: integer("record_status").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertHrEmployeeSchema = createInsertSchema(hrEmployees).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHrEmployee = z.infer<typeof insertHrEmployeeSchema>;
export type HrEmployee = typeof hrEmployees.$inferSelect;

// ── Salary Revisions ─────────────────────────────────────────────────────────
export const hrSalaryRevisions = pgTable("hr_salary_revisions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  effectiveDate: date("effective_date").notNull(),
  oldBasic: integer("old_basic").default(0),
  newBasic: integer("new_basic").notNull(),
  oldCtc: integer("old_ctc").default(0),
  newCtc: integer("new_ctc").notNull(),
  revisionType: varchar("revision_type", { length: 50 }).default("increment"),
  reason: text("reason"),
  approvedBy: varchar("approved_by", { length: 100 }),
  recordStatus: integer("record_status").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertHrSalaryRevisionSchema = createInsertSchema(hrSalaryRevisions).omit({ id: true, createdAt: true });
export type InsertHrSalaryRevision = z.infer<typeof insertHrSalaryRevisionSchema>;
export type HrSalaryRevision = typeof hrSalaryRevisions.$inferSelect;

// ── Employee Documents ───────────────────────────────────────────────────────
export const hrEmployeeDocuments = pgTable("hr_employee_documents", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  documentType: varchar("document_type", { length: 100 }).notNull(),
  fileName: varchar("file_name", { length: 255 }),
  filePath: text("file_path"),
  notes: text("notes"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  recordStatus: integer("record_status").notNull().default(1),
});
export const insertHrEmployeeDocumentSchema = createInsertSchema(hrEmployeeDocuments).omit({ id: true, uploadedAt: true });
export type InsertHrEmployeeDocument = z.infer<typeof insertHrEmployeeDocumentSchema>;
export type HrEmployeeDocument = typeof hrEmployeeDocuments.$inferSelect;

// ── Attendance ───────────────────────────────────────────────────────────────
export const hrAttendance = pgTable("hr_attendance", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  date: date("date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("present"), // present|absent|half_day|lop|holiday|weekly_off|on_leave
  otHours: numeric("ot_hours", { precision: 5, scale: 2 }).default("0"),
  shiftId: integer("shift_id"),
  remarks: text("remarks"),
  recordStatus: integer("record_status").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertHrAttendanceSchema = createInsertSchema(hrAttendance).omit({ id: true, createdAt: true });
export type InsertHrAttendance = z.infer<typeof insertHrAttendanceSchema>;
export type HrAttendance = typeof hrAttendance.$inferSelect;

// ── Leave Balances ───────────────────────────────────────────────────────────
export const hrLeaveBalances = pgTable("hr_leave_balances", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  leaveTypeId: integer("leave_type_id").notNull(),
  year: integer("year").notNull(),
  entitled: numeric("entitled", { precision: 6, scale: 2 }).default("0"),
  used: numeric("used", { precision: 6, scale: 2 }).default("0"),
  balance: numeric("balance", { precision: 6, scale: 2 }).default("0"),
});
export const insertHrLeaveBalanceSchema = createInsertSchema(hrLeaveBalances).omit({ id: true });
export type InsertHrLeaveBalance = z.infer<typeof insertHrLeaveBalanceSchema>;
export type HrLeaveBalance = typeof hrLeaveBalances.$inferSelect;

// ── Leave Applications ───────────────────────────────────────────────────────
export const hrLeaveApplications = pgTable("hr_leave_applications", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  leaveTypeId: integer("leave_type_id").notNull(),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  days: numeric("days", { precision: 5, scale: 2 }).notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending|approved|rejected
  approvedBy: integer("approved_by"),
  approverComment: text("approver_comment"),
  appliedAt: timestamp("applied_at").defaultNow(),
  actionAt: timestamp("action_at"),
  recordStatus: integer("record_status").notNull().default(1),
});
export const insertHrLeaveApplicationSchema = createInsertSchema(hrLeaveApplications).omit({ id: true, appliedAt: true, actionAt: true });
export type InsertHrLeaveApplication = z.infer<typeof insertHrLeaveApplicationSchema>;
export type HrLeaveApplication = typeof hrLeaveApplications.$inferSelect;

// ── Payroll Runs ─────────────────────────────────────────────────────────────
export const hrPayrollRuns = pgTable("hr_payroll_runs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft|approved|locked
  totalGross: integer("total_gross").default(0),
  totalDeductions: integer("total_deductions").default(0),
  totalNet: integer("total_net").default(0),
  employeeCount: integer("employee_count").default(0),
  processedAt: timestamp("processed_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertHrPayrollRunSchema = createInsertSchema(hrPayrollRuns).omit({ id: true, createdAt: true, processedAt: true, approvedAt: true });
export type InsertHrPayrollRun = z.infer<typeof insertHrPayrollRunSchema>;
export type HrPayrollRun = typeof hrPayrollRuns.$inferSelect;

// ── Payslips ─────────────────────────────────────────────────────────────────
export const hrPayslips = pgTable("hr_payslips", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  payrollRunId: integer("payroll_run_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  daysInMonth: integer("days_in_month").default(26),
  daysWorked: numeric("days_worked", { precision: 5, scale: 2 }).default("0"),
  daysAbsent: numeric("days_absent", { precision: 5, scale: 2 }).default("0"),
  lopDays: numeric("lop_days", { precision: 5, scale: 2 }).default("0"),
  otHours: numeric("ot_hours", { precision: 6, scale: 2 }).default("0"),
  basicSalary: integer("basic_salary").default(0),
  grossSalary: integer("gross_salary").default(0),
  pfEmployee: integer("pf_employee").default(0),
  pfEmployer: integer("pf_employer").default(0),
  esiEmployee: integer("esi_employee").default(0),
  esiEmployer: integer("esi_employer").default(0),
  pt: integer("pt").default(0),
  tds: integer("tds").default(0),
  otherDeductions: integer("other_deductions").default(0),
  totalDeductions: integer("total_deductions").default(0),
  netSalary: integer("net_salary").default(0),
  components: jsonb("components").default([]),
  status: varchar("status", { length: 20 }).default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertHrPayslipSchema = createInsertSchema(hrPayslips).omit({ id: true, createdAt: true });
export type InsertHrPayslip = z.infer<typeof insertHrPayslipSchema>;
export type HrPayslip = typeof hrPayslips.$inferSelect;
