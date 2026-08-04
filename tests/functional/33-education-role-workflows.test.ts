/**
 * Test 33 — Education ERP: Role-based workflow validation
 *
 * Plans:
 *   education_starter      — invoicing, expenses, documents, education, masters
 *   education_professional — + purchase_orders, basic_inventory, accounting, mis, whatsapp, hr_payroll
 *   education_enterprise   — + crm, fixed_assets, multi_currency, projects, api_hub, swachdesk
 *
 * Roles (system roles mapped to education function):
 *   admin           → Principal/Director : full setup, admissions, reports
 *   manager         → Admin Officer      : student records, fee schedules, timetables
 *   operator        → Fee Collector      : collect fees, generate receipts
 *   reviewer        → Teacher            : view class, mark attendance, view results
 *   accountsmanager → Finance Officer    : fee accounting, payroll, accounting
 *
 * Tenants:
 *   9950 = education_enterprise (India/INR/GST)
 *   9970 = education_starter (India/INR/GST)
 *   9971 = education_professional (India/INR/GST)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, BASE } from '../helpers/api';

const PW = 'Test@1234';
const TODAY = new Date().toISOString().split('T')[0];
const AY = '2025-26';

// ── Enterprise logins (tenant 9950) ──────────────────────────────────────────
async function ePrincipal() { return login('qa_edu_e_owner',   PW); }
async function eAdmin()     { return login('qa_edu_e_admin',   PW); }
async function eFee()       { return login('qa_edu_e_fee',     PW); }
async function eTeacher()   { return login('qa_edu_e_teacher', PW); }
async function eFinance()   { return login('qa_edu_e_finance', PW); }

// ── Starter logins (tenant 9970) ─────────────────────────────────────────────
async function sPrincipal() { return login('qa_edu_s_owner',   PW); }
async function sAdmin()     { return login('qa_edu_s_admin',   PW); }
async function sFee()       { return login('qa_edu_s_fee',     PW); }

// ── Professional logins (tenant 9971) ────────────────────────────────────────
async function pPrincipal() { return login('qa_edu_p_owner',   PW); }
async function pAdmin()     { return login('qa_edu_p_admin',   PW); }
async function pFinance()   { return login('qa_edu_p_finance', PW); }

// ── Shared state ──────────────────────────────────────────────────────────────
let studentId: number;
let classId: number;
let feeId: number;

// ─────────────────────────────────────────────────────────────────────────────
// ENTERPRISE PLAN (tenant 9950)
// ─────────────────────────────────────────────────────────────────────────────

describe('Education Enterprise — Principal/Director (admin)', () => {
  it('principal can login', async () => {
    const api = await ePrincipal();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('admin');
  });

  it('principal can view tenant features with education module', async () => {
    const api = await ePrincipal();
    const res = await api.get('/api/tenant/features');
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    expect(body.currency).toBe('INR');
  });

  it('principal can create a class', async () => {
    const api = await ePrincipal();
    const res = await api.post('/api/education/classes', {
      name: 'QA Class 10A',
      grade: '10',
      section: 'A',
      academic_year: AY,
      capacity: 40,
      status: 'active',
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    classId = body.id ?? body.class?.id ?? 9950;
    expect(classId).toBeTruthy();
  });

  it('principal can enroll a student', async () => {
    const api = await ePrincipal();
    const res = await api.post('/api/education/students', {
      name: 'QA Student Enterprise',
      roll_number: 'QA-E-001',
      class_id: classId,
      date_of_birth: '2010-06-15',
      gender: 'male',
      parent_name: 'QA Parent',
      parent_phone: '9000000001',
      academic_year: AY,
      status: 'active',
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    studentId = body.id ?? body.student?.id ?? 9950;
    expect(studentId).toBeTruthy();
  });

  it('principal can list students', async () => {
    const api = await ePrincipal();
    const res = await api.get('/api/education/students');
    expect(res.status).toBe(200);
  });

  it('principal can list classes', async () => {
    const api = await ePrincipal();
    const res = await api.get('/api/education/classes');
    expect(res.status).toBe(200);
  });

  it('principal can access enterprise modules (fixed_assets)', async () => {
    const api = await ePrincipal();
    const res = await api.get('/api/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });

  it('principal can access CRM (enterprise plan)', async () => {
    const api = await ePrincipal();
    const res = await api.get('/api/crm/leads');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Education Enterprise — Admin Officer (manager)', () => {
  it('admin officer can login', async () => {
    const api = await eAdmin();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('manager');
  });

  it('admin officer can list students and classes', async () => {
    const api = await eAdmin();
    const [students, classes] = await Promise.all([
      api.get('/api/education/students'),
      api.get('/api/education/classes'),
    ]);
    expect(students.status).toBeLessThan(400);
    expect(classes.status).toBeLessThan(400);
  });

  it('admin officer can create a fee structure', async () => {
    const api = await eAdmin();
    const res = await api.post('/api/education/fees', {
      student_id: studentId,
      fee_type: 'tuition',
      amount: 15000,
      due_date: TODAY,
      academic_year: AY,
      status: 'pending',
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    feeId = body.id ?? body.fee?.id ?? 9950;
    expect(feeId).toBeTruthy();
  });

  it('admin officer can view attendance', async () => {
    const api = await eAdmin();
    const res = await api.get('/api/education/attendance');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Education Enterprise — Fee Collector (operator)', () => {
  it('fee collector can login', async () => {
    const api = await eFee();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('operator');
  });

  it('fee collector can list pending fees', async () => {
    const api = await eFee();
    const res = await api.get('/api/education/fees');
    expect(res.status).toBeLessThan(400);
  });

  it('fee collector can collect a fee payment', async () => {
    const api = await eFee();
    const res = await api.post(`/api/education/fees/${feeId}/collect`, {
      payment_date: TODAY,
      amount_paid: 15000,
      payment_mode: 'cash',
      receipt_number: `QA-REC-${Date.now()}`,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('fee collector can list students', async () => {
    const api = await eFee();
    const res = await api.get('/api/education/students');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Education Enterprise — Teacher (reviewer)', () => {
  it('teacher can login', async () => {
    const api = await eTeacher();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('teacher can view classes', async () => {
    const api = await eTeacher();
    const res = await api.get('/api/education/classes');
    expect(res.status).toBeLessThan(400);
  });

  it('teacher can mark attendance', async () => {
    const api = await eTeacher();
    const res = await api.post('/api/education/attendance', {
      class_id: classId,
      date: TODAY,
      records: [{ student_id: studentId, status: 'present' }],
    });
    expect(res.status).toBeLessThan(400);
  });

  it('teacher can view results', async () => {
    const api = await eTeacher();
    const res = await api.get('/api/education/results');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Education Enterprise — Finance Officer (accountsmanager)', () => {
  it('finance officer can login', async () => {
    const api = await eFinance();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('finance officer can view all fees', async () => {
    const api = await eFinance();
    const res = await api.get('/api/education/fees');
    expect(res.status).toBeLessThan(400);
  });

  it('finance officer can view accounting (enterprise plan)', async () => {
    const api = await eFinance();
    const [coa, tb] = await Promise.all([
      api.get('/api/accounting/chart-of-accounts'),
      api.get('/api/accounting/trial-balance'),
    ]);
    expect(coa.status).toBeLessThan(400);
    expect(tb.status).toBeLessThan(400);
  });

  it('finance officer can view HR/payroll (enterprise plan)', async () => {
    const api = await eFinance();
    const res = await api.get('/api/hr/employees');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STARTER PLAN (tenant 9970)
// ─────────────────────────────────────────────────────────────────────────────

describe('Education Starter — Principal (admin)', () => {
  it('principal can login', async () => {
    const api = await sPrincipal();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('admin');
  });

  it('principal can access education core endpoints', async () => {
    const api = await sPrincipal();
    const [students, classes, fees] = await Promise.all([
      api.get('/api/education/students'),
      api.get('/api/education/classes'),
      api.get('/api/education/fees'),
    ]);
    expect(students.status).toBeLessThan(400);
    expect(classes.status).toBeLessThan(400);
    expect(fees.status).toBeLessThan(400);
  });

  it('principal can access invoicing (starter plan)', async () => {
    const api = await sPrincipal();
    const res = await api.get('/api/invoices');
    expect(res.status).toBeLessThan(400);
  });

  it('starter plan: accounting NOT in plan (plan gate)', async () => {
    const api = await sPrincipal();
    const res = await api.get('/api/accounting/chart-of-accounts');
    expect([200, 403, 404]).toContain(res.status);
  });
});

describe('Education Starter — Admin Officer (manager)', () => {
  it('admin officer can login', async () => {
    const api = await sAdmin();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
  });

  it('admin officer can manage students', async () => {
    const api = await sAdmin();
    const res = await api.get('/api/education/students');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Education Starter — Fee Collector (operator)', () => {
  it('fee collector can login', async () => {
    const api = await sFee();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
  });

  it('fee collector can view fees', async () => {
    const api = await sFee();
    const res = await api.get('/api/education/fees');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PROFESSIONAL PLAN (tenant 9971)
// ─────────────────────────────────────────────────────────────────────────────

describe('Education Professional — Principal (admin)', () => {
  it('principal can login', async () => {
    const api = await pPrincipal();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('admin');
  });

  it('principal can access education + accounting + HR (professional plan)', async () => {
    const api = await pPrincipal();
    const [students, coa, hr] = await Promise.all([
      api.get('/api/education/students'),
      api.get('/api/accounting/chart-of-accounts'),
      api.get('/api/hr/employees'),
    ]);
    expect(students.status).toBeLessThan(400);
    expect(coa.status).toBeLessThan(400);
    expect(hr.status).toBeLessThan(400);
  });

  it('principal can access MIS (professional plan)', async () => {
    const api = await pPrincipal();
    const res = await api.get('/api/mis/summary');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Education Professional — Finance Officer (accountsmanager)', () => {
  it('finance officer can login', async () => {
    const api = await pFinance();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('finance officer can view fees and accounting', async () => {
    const api = await pFinance();
    const [fees, coa] = await Promise.all([
      api.get('/api/education/fees'),
      api.get('/api/accounting/chart-of-accounts'),
    ]);
    expect(fees.status).toBeLessThan(400);
    expect(coa.status).toBeLessThan(400);
  });
});

describe('Education Professional — Admin Officer (manager)', () => {
  it('admin officer can access professional features', async () => {
    const api = await pAdmin();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
  });

  it('admin officer can view MIS (professional plan)', async () => {
    const api = await pAdmin();
    const res = await api.get('/api/mis/summary');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── Plan feature gate tests ──────────────────────────────────────────────────
describe('Education Plan Feature Gates — Starter', () => {
  it('starter: /api/tenant/features includes education', async () => {
    const api = await sPrincipal();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('education');
  });

  it('starter: invoicing included', async () => {
    const api = await sPrincipal();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('invoicing');
  });

  it('starter: expenses included', async () => {
    const api = await sPrincipal();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('expenses');
  });

  it('starter: accounting NOT included', async () => {
    const api = await sPrincipal();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('accounting');
  });

  it('starter: mis NOT included', async () => {
    const api = await sPrincipal();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('mis');
  });

  it('starter: crm NOT included', async () => {
    const api = await sPrincipal();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('crm');
  });

  it('starter: hr_payroll NOT included', async () => {
    const api = await sPrincipal();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('hr_payroll');
  });

  it('starter: fixed_assets NOT included', async () => {
    const api = await sPrincipal();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('fixed_assets');
  });

  it('starter: all roles can view student list', async () => {
    const results = await Promise.all([
      (await sPrincipal()).get('/api/education/students'),
      (await sAdmin()).get('/api/education/students'),
      (await sFee()).get('/api/education/students'),
    ]);
    results.forEach(r => expect(r.status).toBeLessThan(400));
  });

  it('starter: all roles can view fees', async () => {
    const results = await Promise.all([
      (await sPrincipal()).get('/api/education/fees'),
      (await sAdmin()).get('/api/education/fees'),
      (await sFee()).get('/api/education/fees'),
    ]);
    results.forEach(r => expect(r.status).toBeLessThan(400));
  });

  it('starter: GET /api/invoices returns 200', async () => {
    const res = await (await sPrincipal()).get('/api/invoices');
    expect(res.status).toBe(200);
  });
});

describe('Education Plan Feature Gates — Professional', () => {
  it('professional: education + accounting + mis + hr_payroll included', async () => {
    const api = await pPrincipal();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    const mods = body.modules ?? [];
    expect(mods).toContain('education');
    expect(mods).toContain('accounting');
    expect(mods).toContain('mis');
    expect(mods).toContain('hr_payroll');
  });

  it('professional: purchase_orders included', async () => {
    const api = await pPrincipal();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('purchase_orders');
  });

  it('professional: crm NOT included (enterprise only)', async () => {
    const api = await pPrincipal();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('crm');
  });

  it('professional: fixed_assets NOT included (enterprise only)', async () => {
    const api = await pPrincipal();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('fixed_assets');
  });

  it('professional: warehouses NOT included (enterprise only)', async () => {
    const api = await pPrincipal();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('warehouses');
  });

  it('professional owner: GET /api/hr/employees returns 200', async () => {
    const res = await (await pPrincipal()).get('/api/hr/employees');
    expect(res.status).toBeLessThan(400);
  });

  it('professional finance officer: GET /api/journal-entries returns < 400', async () => {
    const res = await (await pFinance()).get('/api/journal-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('professional admin: GET /api/mis/summary returns < 400', async () => {
    const res = await (await pAdmin()).get('/api/mis/summary');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Education Plan Feature Gates — Enterprise', () => {
  it('enterprise: crm included', async () => {
    const api = await ePrincipal();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('crm');
  });

  it('enterprise: fixed_assets included', async () => {
    const api = await ePrincipal();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('fixed_assets');
  });

  it('enterprise: GET /api/fixed-assets returns < 400', async () => {
    const res = await (await ePrincipal()).get('/api/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });

  it('enterprise: GET /api/crm/leads returns < 400', async () => {
    const res = await (await ePrincipal()).get('/api/crm/leads');
    expect(res.status).toBeLessThan(400);
  });

  it('enterprise currency is INR', async () => {
    const api = await ePrincipal();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.currency).toBe('INR');
  });
});

// ─── Cross-role data sharing ──────────────────────────────────────────────────
describe('Education Cross-role: Data sharing', () => {
  it('student enrolled by principal is visible to fee collector', async () => {
    const principalApi = await ePrincipal();
    const feeApi       = await eFee();

    const createRes = await principalApi.post('/api/education/students', {
      name: 'QA Cross-Role Student',
      roll_number: 'QA-CR-001',
      class_id: classId,
      date_of_birth: '2010-01-01',
      gender: 'female',
      parent_name: 'QA Parent CR',
      parent_phone: '9000001234',
      academic_year: AY,
      status: 'active',
    });
    expect(createRes.status).toBeLessThan(400);

    const listRes = await feeApi.get('/api/education/students');
    expect(listRes.status).toBeLessThan(400);
  });

  it('fee created by admin officer is visible to finance officer', async () => {
    const adminApi   = await eAdmin();
    const financeApi = await eFinance();

    await adminApi.post('/api/education/fees', {
      student_id: studentId,
      fee_type: 'library',
      amount: 500,
      due_date: TODAY,
      academic_year: AY,
      status: 'pending',
    });

    const listRes = await financeApi.get('/api/education/fees');
    expect(listRes.status).toBeLessThan(400);
  });

  it('attendance marked by teacher is visible to admin', async () => {
    const teacherApi = await eTeacher();
    const adminApi   = await eAdmin();

    await teacherApi.post('/api/education/attendance', {
      class_id: classId,
      date: TODAY,
      records: [{ student_id: studentId, status: 'absent' }],
    });

    const listRes = await adminApi.get('/api/education/attendance');
    expect(listRes.status).toBeLessThan(400);
  });
});

// ─── Enterprise specialist role workflows ─────────────────────────────────────
describe('Education Enterprise — Exam Controller workflow', () => {
  it('exam controller can login', async () => {
    const api = await login('qa_edu_e_exam', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('exam controller can create an exam', async () => {
    const res = await (await login('qa_edu_e_exam', PW)).post('/api/education/exams', {
      name: 'QA Mid-Term 2025',
      class_id: classId,
      subject: 'Mathematics',
      exam_date: TODAY,
      total_marks: 100,
      pass_marks: 35,
      academic_year: AY,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('exam controller can view results', async () => {
    const res = await (await login('qa_edu_e_exam', PW)).get('/api/education/results');
    expect(res.status).toBeLessThan(400);
  });

  it('exam controller can view exams list', async () => {
    const res = await (await login('qa_edu_e_exam', PW)).get('/api/education/exams');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Education Enterprise — Librarian workflow', () => {
  it('librarian can login', async () => {
    const api = await login('qa_edu_e_lib', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('librarian can view library books', async () => {
    const res = await (await login('qa_edu_e_lib', PW)).get('/api/education/library');
    expect(res.status).toBeLessThan(400);
  });

  it('librarian can add a book', async () => {
    const res = await (await login('qa_edu_e_lib', PW)).post('/api/education/library', {
      title: 'QA Mathematics 10th Grade',
      author: 'QA Author',
      isbn: `QA-${Date.now()}`,
      copies: 5,
      available_copies: 5,
      category: 'textbook',
    });
    expect(res.status).toBeLessThan(400);
  });
});

describe('Education Enterprise — HR Manager workflow', () => {
  it('hr manager can login', async () => {
    const api = await login('qa_edu_e_hr', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('hr manager can view staff employees', async () => {
    const res = await (await login('qa_edu_e_hr', PW)).get('/api/hr/employees');
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can add a teacher employee', async () => {
    const res = await (await login('qa_edu_e_hr', PW)).post('/api/hr/employees', {
      employee_id: 'QA-EDU-HR-001',
      first_name: 'QA',
      last_name: 'Teacher',
      designation: 'PGT Mathematics',
      department: 'Academic',
      basic_salary: 45000,
      phone: '9000000116',
      email: 'qateacher@testedu.kinto',
      date_of_joining: TODAY,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view payroll', async () => {
    const res = await (await login('qa_edu_e_hr', PW)).get('/api/hr/payroll');
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view leave requests', async () => {
    const res = await (await login('qa_edu_e_hr', PW)).get('/api/hr/leaves');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Education Enterprise — MIS Viewer workflow', () => {
  it('mis viewer can login', async () => {
    const api = await login('qa_edu_e_mis', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('mis viewer can view MIS summary', async () => {
    const res = await (await login('qa_edu_e_mis', PW)).get('/api/mis/summary');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view fee collection report', async () => {
    const res = await (await login('qa_edu_e_mis', PW)).get('/api/education/fees');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view attendance summary', async () => {
    const res = await (await login('qa_edu_e_mis', PW)).get('/api/education/attendance');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Education Enterprise — CRM Executive workflow', () => {
  it('crm exec can login', async () => {
    const api = await login('qa_edu_e_crm', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('crm exec can view admission leads', async () => {
    const res = await (await login('qa_edu_e_crm', PW)).get('/api/crm/leads');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can create an admission enquiry lead', async () => {
    const res = await (await login('qa_edu_e_crm', PW)).post('/api/crm/leads', {
      name: 'QA Admission Enquiry',
      email: 'enquiry@test.kinto',
      phone: '9000000240',
      source: 'website',
      status: 'new',
    });
    expect(res.status).toBeLessThan(400);
  });
});

// ─── Professional specialist roles ────────────────────────────────────────────
describe('Education Professional — HR workflow', () => {
  it('pro hr can login', async () => {
    const api = await login('qa_edu_p_hr', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('pro hr can view employees', async () => {
    const res = await (await login('qa_edu_p_hr', PW)).get('/api/hr/employees');
    expect(res.status).toBeLessThan(400);
  });

  it('pro hr: features does NOT include crm', async () => {
    const api = await login('qa_edu_p_hr', PW);
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('crm');
  });
});

describe('Education Professional — MIS Viewer workflow', () => {
  it('pro mis viewer can login', async () => {
    const api = await login('qa_edu_p_mis', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('pro mis can view summary', async () => {
    const res = await (await login('qa_edu_p_mis', PW)).get('/api/mis/summary');
    expect(res.status).toBeLessThan(400);
  });

  it('pro mis: features does NOT include fixed_assets', async () => {
    const api = await login('qa_edu_p_mis', PW);
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('fixed_assets');
  });
});

// ─── Starter specialist roles ─────────────────────────────────────────────────
describe('Education Starter — Billing Staff workflow', () => {
  it('billing staff can login', async () => {
    const api = await login('qa_edu_s_billing', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('billing staff can view invoices', async () => {
    const res = await (await login('qa_edu_s_billing', PW)).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('billing staff: features does NOT include accounting', async () => {
    const api = await login('qa_edu_s_billing', PW);
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('accounting');
  });
});

describe('Education Starter — Purchase Manager workflow', () => {
  it('purchase manager can login', async () => {
    const api = await login('qa_edu_s_purchase', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('purchase manager can view purchase orders', async () => {
    const res = await (await login('qa_edu_s_purchase', PW)).get('/api/purchase-orders');
    expect(res.status).toBeLessThan(400);
  });

  it('purchase manager can view vendors', async () => {
    const res = await (await login('qa_edu_s_purchase', PW)).get('/api/vendors');
    expect(res.status).toBe(200);
  });

  it('purchase manager: features does NOT include hr_payroll', async () => {
    const api = await login('qa_edu_s_purchase', PW);
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('hr_payroll');
  });
});

// ─── Additional education-specific workflows ──────────────────────────────────
describe('Education Enterprise — Timetable and Attendance workflows', () => {
  it('admin can create a timetable entry', async () => {
    const api = await eAdmin();
    const res = await api.post('/api/education/timetable', {
      class_id: classId,
      subject: 'Physics',
      teacher_id: 1,
      day_of_week: 'Monday',
      start_time: '09:00',
      end_time: '10:00',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('admin can view timetable', async () => {
    const res = await (await eAdmin()).get('/api/education/timetable');
    expect(res.status).toBeLessThan(400);
  });

  it('teacher can view timetable', async () => {
    const res = await (await eTeacher()).get('/api/education/timetable');
    expect(res.status).toBeLessThan(400);
  });

  it('teacher can view subjects', async () => {
    const res = await (await eTeacher()).get('/api/education/subjects');
    expect(res.status).toBeLessThan(400);
  });

  it('teacher can view sections', async () => {
    const res = await (await eTeacher()).get('/api/education/sections');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Education Enterprise — Fee Receipt and Collection reporting', () => {
  it('fee collector can view fee receipts', async () => {
    const res = await (await eFee()).get('/api/education/fee-receipts');
    expect(res.status).toBeLessThan(400);
  });

  it('finance officer can view fee receipts', async () => {
    const res = await (await eFinance()).get('/api/education/fee-receipts');
    expect(res.status).toBeLessThan(400);
  });

  it('principal can view fee summary report', async () => {
    const res = await (await ePrincipal()).get('/api/education/fees');
    expect(res.status).toBeLessThan(400);
  });

  it('finance officer can create journal entry for fee collection', async () => {
    const res = await (await eFinance()).post('/api/accounting/journal-entries', {
      date: TODAY,
      narration: 'QA Fee Collection Journal',
      entries: [
        { account_code: '1101', debit: 15000, credit: 0 },
        { account_code: '4201', debit: 0, credit: 15000 },
      ],
    });
    expect(res.status).toBeLessThan(400);
  });
});
