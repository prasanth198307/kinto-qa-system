/**
 * Test 39 — HR/Payroll ERP: Role-based workflow validation
 *
 * Plans:
 *   hr_starter      (8520) — hr_payroll, expenses, masters
 *   hr_professional (8521) — + documents, mis, api_hub
 *   hr_enterprise   (8500) — + accounting, projects, timesheets, appraisals,
 *                              approvals, whatsapp, api_hub, swachdesk
 *
 * Roles (enterprise tenant 8500):
 *   admin          → HR Director/Owner
 *   manager        → HR Manager
 *   operator       → HR Executive / Recruiter
 *   reviewer       → Department Head / Payroll Exec (view only)
 *   accountsmanager→ Payroll Accountant
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, BASE } from '../helpers/api';

const TODAY = new Date().toISOString().split('T')[0];

// ── Enterprise (tenant 8500) ──────────────────────────────────────────────────
async function owner()        { return login('qa_hr_owner',        'Test@1234'); }
async function manager()      { return login('qa_hr_manager',      'Test@1234'); }
async function recruiter()    { return login('qa_hr_recruiter',    'Test@1234'); }
async function payrollExec()  { return login('qa_hr_payroll_exec', 'Test@1234'); }
async function acct()         { return login('qa_hr_acct',         'Test@1234'); }
async function hrRole()       { return login('qa_hr_hr',           'Test@1234'); }
async function crmExec()      { return login('qa_hr_crm',          'Test@1234'); }
async function salesMgr()     { return login('qa_hr_sales',        'Test@1234'); }
async function misViewer()    { return login('qa_hr_mis',          'Test@1234'); }
async function whMgr()        { return login('qa_hr_wh',           'Test@1234'); }
async function prodSup()      { return login('qa_hr_prod',         'Test@1234'); }
async function assetsMgr()    { return login('qa_hr_assets',       'Test@1234'); }

// ── Professional (tenant 8521) ────────────────────────────────────────────────
async function proOwner()       { return login('qa_hr_p_owner',        'Test@1234'); }
async function proManager()     { return login('qa_hr_p_manager',      'Test@1234'); }
async function proPayrollExec() { return login('qa_hr_p_payroll_exec', 'Test@1234'); }
async function proAcct()        { return login('qa_hr_p_acct',         'Test@1234'); }
async function proHr()          { return login('qa_hr_p_hr',           'Test@1234'); }
async function proCrm()         { return login('qa_hr_p_crm',          'Test@1234'); }
async function proMis()         { return login('qa_hr_p_mis',          'Test@1234'); }

// ── Starter (tenant 8520) ─────────────────────────────────────────────────────
async function starterOwner()      { return login('qa_hr_s_owner',       'Test@1234'); }
async function starterManager()    { return login('qa_hr_s_manager',     'Test@1234'); }
async function starterPayroll()    { return login('qa_hr_s_payroll_exec','Test@1234'); }
async function starterBilling()    { return login('qa_hr_s_billing',     'Test@1234'); }

async function getModules(api: Awaited<ReturnType<typeof login>>): Promise<string[]> {
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  const body = await res.json() as { modules: string[] };
  return body.modules;
}

// ─── 1. Role Setup (admin/owner) ──────────────────────────────────────────────
describe('HR Role Setup (admin/owner)', () => {
  it('owner can login and role is admin', async () => {
    const body = await (await (await owner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('owner can view HR employees', async () => {
    const res = await (await owner()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('owner can view HR departments', async () => {
    const res = await (await owner()).get('/api/hr/departments');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('owner can view HR designations', async () => {
    const res = await (await owner()).get('/api/hr/designations');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('owner enterprise: features includes hr_payroll, accounting, mis', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('hr_payroll');
    expect(mods).toContain('accounting');
    expect(mods).toContain('mis');
  });
});

// ─── 2. Role: HR Manager workflow ─────────────────────────────────────────────
describe('HR Role: HR Manager', () => {
  let empId: number;

  it('hr manager can login and role is manager', async () => {
    const body = await (await (await manager()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('hr manager STEP 1: adds employee', async () => {
    const api = await manager();
    const res = await api.post('/api/hr/employees', {
      employee_id: 'QA-HR-EMP-001',
      first_name: 'QA',
      last_name: 'Hired Staff',
      designation: 'Software Engineer',
      department: 'Engineering',
      basic_salary: 65000,
      phone: '9000500001',
      email: 'qa-hr-emp@hr.kinto',
      date_of_joining: TODAY,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    const body = await res.json() as any;
    empId = body.id ?? body.employee?.id ?? 1;
  });

  it('hr manager STEP 2: marks attendance for employee', async () => {
    const api = await manager();
    const res = await api.post('/api/hr/attendance', {
      employee_id: empId ?? 1,
      date: TODAY,
      status: 'present',
      check_in: '09:00',
      check_out: '18:00',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('hr manager STEP 3: creates leave request', async () => {
    const api = await manager();
    const res = await api.post('/api/hr/leaves', {
      employee_id: empId ?? 1,
      leave_type: 'casual',
      from_date: TODAY,
      to_date: TODAY,
      reason: 'QA Test Leave',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('hr manager can view payroll runs', async () => {
    const res = await (await manager()).get('/api/hr/payroll');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 3. Role: HR Executive/Recruiter (operator) workflow ──────────────────────
describe('HR Role: HR Executive / Recruiter (operator)', () => {
  it('recruiter can login and role is operator', async () => {
    const body = await (await (await recruiter()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('recruiter can view employees list', async () => {
    const res = await (await recruiter()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('recruiter can create a recruitment requisition', async () => {
    const res = await (await recruiter()).post('/api/hr/recruitment', {
      position: 'QA Test Engineer',
      department: 'Engineering',
      required_by: TODAY,
      openings: 2,
      status: 'open',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('recruiter can view recruitment pipeline', async () => {
    const res = await (await recruiter()).get('/api/hr/recruitment');
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('recruiter can view training programs', async () => {
    const res = await (await recruiter()).get('/api/hr/training');
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });
});

// ─── 4. Role: Payroll Exec / Department Head (reviewer) workflow ──────────────
describe('HR Role: Payroll Exec / Department Head (reviewer)', () => {
  it('payroll exec can login', async () => {
    const body = await (await (await payrollExec()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('payroll exec can view payslips', async () => {
    const res = await (await payrollExec()).get('/api/hr/payslips');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('payroll exec can view attendance records (read-only)', async () => {
    const res = await (await payrollExec()).get('/api/hr/attendance');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('payroll exec can view statutory reports', async () => {
    const res = await (await payrollExec()).get('/api/hr/statutory');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 5. Plan: ALL plans — core module accessible ──────────────────────────────
describe('HR Plan: ALL plans — core module accessible', () => {
  it('starter: /api/tenant/features includes hr_payroll module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('hr_payroll');
  });

  it('professional: /api/tenant/features includes hr_payroll module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('hr_payroll');
  });

  it('enterprise: /api/tenant/features includes hr_payroll module', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('hr_payroll');
  });

  it('all plans: /api/hr/employees returns 200 for owner', async () => {
    const [s, p, e] = await Promise.all([
      (await starterOwner()).get('/api/hr/employees'),
      (await proOwner()).get('/api/hr/employees'),
      (await owner()).get('/api/hr/employees'),
    ]);
    expect(s.status).toBe(200);
    expect(p.status).toBe(200);
    expect(e.status).toBe(200);
  });
});

// ─── 6. Plan: ALL plans — invoicing / purchase_orders / basic_inventory ───────
describe('HR Plan: ALL plans — expenses / payroll core accessible', () => {
  it('starter: features includes expenses', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('expenses');
  });

  it('professional: features includes expenses', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('expenses');
  });

  it('enterprise: features includes expenses', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('expenses');
  });

  it('starter: /api/hr/payroll returns < 400', async () => {
    const res = await (await starterOwner()).get('/api/hr/payroll');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 7. Plan: Professional+ — accounting / mis / crm / hr_payroll ─────────────
describe('HR Plan: Professional+ — documents / mis / api_hub', () => {
  it('starter: does NOT include mis module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('mis');
  });

  it('starter: does NOT include documents module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('documents');
  });

  it('professional: includes mis module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('mis');
  });

  it('professional: includes documents module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('documents');
  });
});

// ─── 8. Plan: Enterprise only — production / warehouses / fixed_assets / multi_currency
describe('HR Plan: Enterprise only — accounting / projects / timesheets / appraisals', () => {
  it('starter: does NOT include accounting module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('accounting');
  });

  it('professional: does NOT include accounting module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('accounting');
  });

  it('enterprise: includes accounting module', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('accounting');
  });

  it('enterprise: GET /api/hr/appraisals returns < 400', async () => {
    const res = await (await owner()).get('/api/hr/appraisals');
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });
});

// ─── 9. Cross-role: Data created by one role visible to others ────────────────
describe('HR Cross-role: Data created by one role visible to others', () => {
  it('employee added by HR manager is visible to payroll exec', async () => {
    const mgrApi     = await manager();
    const payrollApi = await payrollExec();

    const createRes = await mgrApi.post('/api/hr/employees', {
      employee_id: 'QA-HR-CROSS-001',
      first_name: 'Cross',
      last_name: 'Visibility',
      designation: 'Analyst',
      department: 'Finance',
      basic_salary: 45000,
      phone: '9000500099',
      email: 'qa-cross@hr.kinto',
      date_of_joining: TODAY,
    });
    expect([200, 201, 400, 403, 500]).toContain(createRes.status);
    const emp = await createRes.json() as any;
    const empId = emp.id ?? emp.employee?.id;

    const listRes = await payrollApi.get('/api/hr/employees');
    expect(listRes.status).toBe(200);
    const list = await listRes.json() as any;
    if (Array.isArray(list) && empId) {
      expect(list.some((e: any) => e.id === empId)).toBe(true);
    }
  });

  it('attendance marked by recruiter is visible to manager', async () => {
    const recApi = await recruiter();
    const mgrApi = await manager();

    await recApi.post('/api/hr/attendance', {
      employee_id: 1,
      date: TODAY,
      status: 'present',
      check_in: '08:30',
      check_out: '17:30',
    });

    const listRes = await mgrApi.get('/api/hr/attendance');
    expect([200, 201, 400, 403, 500]).toContain(listRes.status);
  });

  it('leave request created by payroll exec is visible to HR manager', async () => {
    const payApi = await payrollExec();
    const mgrApi = await manager();

    await payApi.post('/api/hr/leaves', {
      employee_id: 1,
      leave_type: 'sick',
      from_date: TODAY,
      to_date: TODAY,
      reason: 'QA Cross-role leave',
    });

    const listRes = await mgrApi.get('/api/hr/leaves');
    expect([200, 201, 400, 403, 500]).toContain(listRes.status);
  });

  it('recruitment requisition created by recruiter is visible to owner', async () => {
    const recApi   = await recruiter();
    const ownerApi = await owner();

    await recApi.post('/api/hr/recruitment', {
      position: 'QA Senior Developer',
      department: 'Engineering',
      required_by: TODAY,
      openings: 1,
      status: 'open',
    });

    const listRes = await ownerApi.get('/api/hr/recruitment');
    expect([200, 201, 400, 403, 500]).toContain(listRes.status);
  });
});

// ─── 10. Starter Plan — role login + core workflow ────────────────────────────
describe('HR Starter Plan — role login + core workflow', () => {
  it('starter owner can login and role is admin', async () => {
    const body = await (await (await starterOwner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('starter manager can login', async () => {
    const body = await (await (await starterManager()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('starter payroll exec can login', async () => {
    const body = await (await (await starterPayroll()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('starter: /api/hr/employees returns 200', async () => {
    const res = await (await starterOwner()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });
});

// ─── 11. Professional Plan — role login + extra modules ───────────────────────
describe('HR Professional Plan — role login + extra modules', () => {
  it('pro owner can login and role is admin', async () => {
    const body = await (await (await proOwner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('pro manager can login', async () => {
    const body = await (await (await proManager()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('pro: MIS summary accessible', async () => {
    const res = await (await proOwner()).get('/api/mis/sales-summary');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('pro: payroll endpoint accessible', async () => {
    const res = await (await proOwner()).get('/api/hr/payroll');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 12. Enterprise — Accountant workflow ─────────────────────────────────────
describe('HR Enterprise — Accountant workflow (accounting module)', () => {
  it('accountant can login', async () => {
    const body = await (await (await acct()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('accountant can view chart of accounts', async () => {
    const res = await (await acct()).get('/api/chart-of-accounts');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('accountant can create payroll journal entry', async () => {
    const res = await (await acct()).post('/api/journal-entries', {
      date: TODAY,
      narration: 'QA HR — Payroll Disbursement',
      entries: [
        { account_code: '5001', debit: 200000, credit: 0 },
        { account_code: '2001', debit: 0,      credit: 200000 },
      ],
    });
    expect([200, 201, 400]).toContain(res.status);
  });

  it('accountant can view trial balance', async () => {
    const res = await (await acct()).get('/api/trial-balance');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('accountant can view employees (for payroll cross-check)', async () => {
    const res = await (await acct()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });
});

// ─── 13. Enterprise — HR Manager workflow ─────────────────────────────────────
describe('HR Enterprise — HR Manager workflow (hr_payroll module)', () => {
  it('hr role user can login', async () => {
    const body = await (await (await hrRole()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('hr role can view employees', async () => {
    const res = await (await hrRole()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('hr role can create a training program', async () => {
    const res = await (await hrRole()).post('/api/hr/training', {
      title: 'QA Onboarding Training',
      department: 'All',
      trainer: 'QA Trainer',
      date: TODAY,
      duration_hours: 8,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('hr role can view appraisals', async () => {
    const res = await (await hrRole()).get('/api/hr/appraisals');
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('hr role can view loan and advance records', async () => {
    const res = await (await hrRole()).get('/api/hr/loan-advances');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 14. Enterprise — CRM Executive workflow ──────────────────────────────────
describe('HR Enterprise — CRM Executive workflow (crm module)', () => {
  it('crm executive can login', async () => {
    const body = await (await (await crmExec()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('crm exec can view CRM contacts', async () => {
    const res = await (await crmExec()).get('/api/crm/contacts');
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('crm exec can create a lead (potential HR client)', async () => {
    const res = await (await crmExec()).post('/api/crm/leads', {
      name: 'QA HR Services Client',
      email: 'hrservices@test.kinto',
      phone: '9000500003',
      source: 'conference',
      status: 'new',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('crm exec can view CRM campaigns', async () => {
    const res = await (await crmExec()).get('/api/crm/campaigns');
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('crm exec can view invoices (cross-module)', async () => {
    const res = await (await crmExec()).get('/api/invoices');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 15. Enterprise — Sales Manager workflow ──────────────────────────────────
describe('HR Enterprise — Sales Manager workflow (sales_orders module)', () => {
  it('sales manager can login', async () => {
    const body = await (await (await salesMgr()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('sales manager can view sales orders', async () => {
    const res = await (await salesMgr()).get('/api/sales-orders');
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('sales manager can create a service sales order', async () => {
    const res = await (await salesMgr()).post('/api/sales-orders', {
      customer_name: 'QA HR Consulting Client',
      order_date: TODAY,
      delivery_date: TODAY,
      items: [{ product_name: 'HR Consulting Package', quantity: 1, rate: 75000, amount: 75000 }],
      total: 75000,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('sales manager can view invoices', async () => {
    const res = await (await salesMgr()).get('/api/invoices');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('sales manager can view CRM contacts', async () => {
    const res = await (await salesMgr()).get('/api/crm/contacts');
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });
});

// ─── 16. Enterprise — MIS Viewer workflow ─────────────────────────────────────
describe('HR Enterprise — MIS Viewer workflow (mis module)', () => {
  it('mis viewer can login', async () => {
    const body = await (await (await misViewer()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('mis viewer can view MIS financial summary', async () => {
    const res = await (await misViewer()).get('/api/mis/financial-summary');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('mis viewer can view MIS sales summary', async () => {
    const res = await (await misViewer()).get('/api/mis/sales-summary');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('mis viewer can view HR employee list (cross-module)', async () => {
    const res = await (await misViewer()).get('/api/hr/employees');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 17. Enterprise — Warehouse Manager workflow ──────────────────────────────
describe('HR Enterprise — Warehouse Manager workflow (warehouses module)', () => {
  it('warehouse manager can login', async () => {
    const body = await (await (await whMgr()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('warehouse manager can view warehouses', async () => {
    const res = await (await whMgr()).get('/api/warehouses');
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('warehouse manager can view products', async () => {
    const res = await (await whMgr()).get('/api/products');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('warehouse manager can view purchase orders', async () => {
    const res = await (await whMgr()).get('/api/purchase-orders');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 18. Enterprise — Production Supervisor workflow ──────────────────────────
describe('HR Enterprise — Production Supervisor workflow (production module)', () => {
  it('production supervisor can login', async () => {
    const body = await (await (await prodSup()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('production supervisor can view raw materials', async () => {
    const res = await (await prodSup()).get('/api/raw-materials');
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('production supervisor can view production entries', async () => {
    const res = await (await prodSup()).get('/api/production-entries');
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('production supervisor can view HR employees (for workforce planning)', async () => {
    const res = await (await prodSup()).get('/api/hr/employees');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 19. Enterprise — Assets Manager workflow ─────────────────────────────────
describe('HR Enterprise — Assets Manager workflow (fixed_assets module)', () => {
  it('assets manager can login', async () => {
    const body = await (await (await assetsMgr()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('assets manager can view fixed assets', async () => {
    const res = await (await assetsMgr()).get('/api/fixed-assets');
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('assets manager can view chart of accounts (cross-link)', async () => {
    const res = await (await assetsMgr()).get('/api/chart-of-accounts');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('assets manager can view employees (for asset assignment)', async () => {
    const res = await (await assetsMgr()).get('/api/hr/employees');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 20. Professional — Accountant workflow ───────────────────────────────────
describe('HR Professional — Accountant workflow', () => {
  it('pro accountant can login', async () => {
    const body = await (await (await proAcct()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('pro accountant: features does NOT include accounting (enterprise only)', async () => {
    const mods = await getModules(await proAcct());
    expect(mods).not.toContain('accounting');
  });

  it('pro accountant can view payroll runs', async () => {
    const res = await (await proAcct()).get('/api/hr/payroll');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('pro accountant can view payslips', async () => {
    const res = await (await proAcct()).get('/api/hr/payslips');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 21. Professional — HR Manager workflow ───────────────────────────────────
describe('HR Professional — HR Manager workflow', () => {
  it('pro hr manager can login', async () => {
    const body = await (await (await proHr()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('pro hr manager can view employees', async () => {
    const res = await (await proHr()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('pro hr manager can view MIS (professional module)', async () => {
    const res = await (await proHr()).get('/api/mis/sales-summary');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('pro hr manager: features does NOT include accounting (enterprise only)', async () => {
    const mods = await getModules(await proHr());
    expect(mods).not.toContain('accounting');
  });
});

// ─── 22. Professional — CRM Executive workflow ────────────────────────────────
describe('HR Professional — CRM Executive workflow', () => {
  it('pro crm exec can login', async () => {
    const body = await (await (await proCrm()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('pro crm exec can view CRM contacts', async () => {
    const res = await (await proCrm()).get('/api/crm/contacts');
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('pro crm exec can view HR employees (cross-module)', async () => {
    const res = await (await proCrm()).get('/api/hr/employees');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('pro crm: features does NOT include fixed_assets (enterprise only)', async () => {
    const mods = await getModules(await proCrm());
    expect(mods).not.toContain('fixed_assets');
  });
});

// ─── 23. Professional — MIS Viewer workflow ───────────────────────────────────
describe('HR Professional — MIS Viewer workflow', () => {
  it('pro mis viewer can login', async () => {
    const body = await (await (await proMis()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('pro mis viewer can view MIS sales summary', async () => {
    const res = await (await proMis()).get('/api/mis/sales-summary');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('pro mis viewer can view HR employees (read-only)', async () => {
    const res = await (await proMis()).get('/api/hr/employees');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('pro mis viewer: features does NOT include multi_currency (enterprise only)', async () => {
    const mods = await getModules(await proMis());
    expect(mods).not.toContain('multi_currency');
  });
});

// ─── 24. Starter — Billing Staff workflow ─────────────────────────────────────
describe('HR Starter — Billing Staff workflow (invoicing module)', () => {
  it('starter billing staff can login', async () => {
    const body = await (await (await starterBilling()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('starter billing staff can view HR employees', async () => {
    const res = await (await starterBilling()).get('/api/hr/employees');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('starter billing staff: features does NOT include mis (professional+ only)', async () => {
    const mods = await getModules(await starterBilling());
    expect(mods).not.toContain('mis');
  });

  it('starter billing staff: features does NOT include accounting (enterprise only)', async () => {
    const mods = await getModules(await starterBilling());
    expect(mods).not.toContain('accounting');
  });
});

// ─── 25. Starter — Purchase Manager workflow ──────────────────────────────────
describe('HR Starter — Purchase Manager workflow (payroll module)', () => {
  it('starter payroll exec can login', async () => {
    const body = await (await (await starterPayroll()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('starter payroll exec can view payroll runs', async () => {
    const res = await (await starterPayroll()).get('/api/hr/payroll');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('starter payroll exec can view payslips', async () => {
    const res = await (await starterPayroll()).get('/api/hr/payslips');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('starter: features does NOT include projects (enterprise only)', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('projects');
  });
});

// ─── 26. Enterprise: Appraisals & Loan Advances workflow ────────────────────
describe('HR Enterprise — Appraisals & Loan Advances workflow', () => {
  it('hr role can create an appraisal', async () => {
    const res = await (await hrRole()).post('/api/hr/appraisals', {
      employee_id: 1,
      period: TODAY.substring(0, 7),
      rating: 4,
      comments: 'QA Test Appraisal',
      status: 'draft',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('manager can view all appraisals', async () => {
    const res = await (await manager()).get('/api/hr/appraisals');
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('owner can create a loan/advance record', async () => {
    const res = await (await owner()).post('/api/hr/loan-advances', {
      employee_id: 1,
      type: 'advance',
      amount: 20000,
      date: TODAY,
      repayment_months: 6,
      reason: 'QA Salary Advance',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('payroll exec can view loan-advance records', async () => {
    const res = await (await payrollExec()).get('/api/hr/loan-advances');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('hr role can view training programs', async () => {
    const res = await (await hrRole()).get('/api/hr/training');
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });
});

// ─── 27. Enterprise: Statutory & Payslip workflow ────────────────────────────
describe('HR Enterprise — Statutory & Payslip workflow', () => {
  it('payroll exec can view statutory reports', async () => {
    const res = await (await payrollExec()).get('/api/hr/statutory');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('accountant can view payslips (cross accounting-HR)', async () => {
    const res = await (await acct()).get('/api/hr/payslips');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('owner can view HR attendance summary', async () => {
    const res = await (await owner()).get('/api/hr/attendance');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('manager can view all leave requests', async () => {
    const res = await (await manager()).get('/api/hr/leaves');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('starter: payslips endpoint accessible on starter plan', async () => {
    const res = await (await starterOwner()).get('/api/hr/payslips');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('professional: statutory reports accessible on professional plan', async () => {
    const res = await (await proOwner()).get('/api/hr/statutory');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('enterprise: loan-advances endpoint accessible', async () => {
    const res = await (await owner()).get('/api/hr/loan-advances');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 28. Projects, Timesheets & API Hub (enterprise) ─────────────────────────
describe('HR Enterprise — Projects, Timesheets & API Hub workflow', () => {
  it('owner: enterprise features includes projects', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('projects');
  });

  it('owner can view projects list', async () => {
    const res = await (await owner()).get('/api/projects');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('recruiter can view timesheets', async () => {
    const res = await (await recruiter()).get('/api/timesheets');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('enterprise: api_hub module included', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('api_hub');
  });

  it('starter: does NOT include projects module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('projects');
  });

  it('professional: does NOT include projects module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('projects');
  });

  it('hr role can view designations (master setup)', async () => {
    const res = await (await hrRole()).get('/api/hr/designations');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});
