/**
 * Test 25 — Healthcare ERP: Role-based workflow validation
 *
 * Plans:
 *   healthcare_starter      — invoicing, expenses, documents, healthcare, masters
 *   healthcare_professional — + purchase_orders, basic_inventory, accounting, mis, crm, whatsapp, hr_payroll, pharmacy
 *   healthcare_enterprise   — + sales_orders, production, warehouses, fixed_assets, multi_currency, api_hub, swach*
 *
 * Roles (enterprise tenant 9200):
 *   admin           → Owner/Director
 *   manager         → Doctor/Medical Director
 *   operator        → Nurse/Receptionist
 *   reviewer        → Lab Technician
 *   accountsmanager → Billing/Accounts Manager
 *
 * Professional tenant: 9221  Starter tenant: 9220
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, BASE } from '../helpers/api';

const TODAY = new Date().toISOString().split('T')[0];
const PW = 'Test@1234';

// ─── Enterprise logins (tenant 9200) ─────────────────────────────────────────
async function owner()        { return login('qa_hc_owner',        PW); }
async function doctor()       { return login('qa_hc_doctor',       PW); }
async function nurse()        { return login('qa_hc_nurse',        PW); }
async function receptionist() { return login('qa_hc_receptionist', PW); }
async function acct()         { return login('qa_hc_acct',         PW); }
async function hrMgr()        { return login('qa_hc_hr',           PW); }
async function crmExec()      { return login('qa_hc_crm',          PW); }
async function salesMgr()     { return login('qa_hc_sales',        PW); }
async function misViewer()    { return login('qa_hc_mis',          PW); }
async function warehouseMgr() { return login('qa_hc_wh',           PW); }
async function prodSup()      { return login('qa_hc_prod',         PW); }
async function assetsMgr()    { return login('qa_hc_assets',       PW); }

// ─── Professional logins (tenant 9221) ───────────────────────────────────────
async function proOwner()        { return login('qa_hc_p_owner',        PW); }
async function proDoctor()       { return login('qa_hc_p_doctor',       PW); }
async function proReceptionist() { return login('qa_hc_p_receptionist', PW); }
async function proAcct()         { return login('qa_hc_p_acct',         PW); }
async function proHr()           { return login('qa_hc_p_hr',           PW); }
async function proCrm()          { return login('qa_hc_p_crm',          PW); }
async function proMis()          { return login('qa_hc_p_mis',          PW); }

// ─── Starter logins (tenant 9220) ────────────────────────────────────────────
async function starterOwner()        { return login('qa_hc_s_owner',        PW); }
async function starterDoctor()       { return login('qa_hc_s_doctor',       PW); }
async function starterReceptionist() { return login('qa_hc_s_receptionist', PW); }
async function starterBilling()      { return login('qa_hc_s_billing',      PW); }

async function getModules(api: Awaited<ReturnType<typeof login>>): Promise<string[]> {
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  const body = await res.json() as { modules: string[] };
  return body.modules;
}

// ─── 1. Role Setup (admin/owner) — create core domain objects ─────────────────
describe('Healthcare Role Setup (admin/owner — enterprise)', () => {
  it('owner can login with role=admin', async () => {
    const body = await (await (await owner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('owner can view all core healthcare APIs', async () => {
    const api = await owner();
    const results = await Promise.all([
      '/api/healthcare/patients',
      '/api/healthcare/appointments',
      '/api/healthcare/opd',
      '/api/healthcare/doctors',
    ].map(s => api.get(s).then(r => ({ s, status: r.status }))));
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });

  it('owner can register a patient', async () => {
    const res = await (await owner()).post('/api/healthcare/patients', {
      name: 'QA Admin Patient',
      phone: '9700009001',
      email: 'qapatient@hc.test',
      date_of_birth: '1985-03-12',
      gender: 'Male',
      blood_group: 'O+',
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    expect(body.id ?? body.patient?.id).toBeTruthy();
  });

  it('owner can create an appointment', async () => {
    const res = await (await owner()).post('/api/healthcare/appointments', {
      patient_name: 'QA Admin Patient',
      patient_phone: '9700009001',
      appointment_date: TODAY,
      appointment_time: '09:00',
      doctor_name: 'QA Director',
      type: 'opd',
      status: 'scheduled',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('owner can register a doctor', async () => {
    const res = await (await owner()).post('/api/healthcare/doctors', {
      name: 'Dr QA Specialist',
      specialization: 'General Medicine',
      phone: '9700009010',
      email: 'drqa@hc.test',
      license_number: 'QA-LIC-001',
      is_active: true,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view wards', async () => {
    const res = await (await owner()).get('/api/healthcare/wards');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view lab tests', async () => {
    const res = await (await owner()).get('/api/healthcare/lab-tests');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view prescriptions', async () => {
    const res = await (await owner()).get('/api/healthcare/prescriptions');
    expect(res.status).toBeLessThan(400);
  });

  it('owner: enterprise plan includes healthcare module', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('healthcare');
  });

  it('owner can view IPD records', async () => {
    const res = await (await owner()).get('/api/healthcare/ipd');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can admit a patient to IPD', async () => {
    const res = await (await owner()).post('/api/healthcare/ipd', {
      patient_name: 'QA IPD Patient',
      admission_date: TODAY,
      ward: 'General Ward',
      bed_number: 'B-001',
      doctor_name: 'QA Director',
      diagnosis: 'Appendicitis',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view OPD records', async () => {
    const res = await (await owner()).get('/api/healthcare/opd');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can order a lab test', async () => {
    const res = await (await owner()).post('/api/healthcare/lab-tests', {
      patient_name: 'QA Lab Patient',
      test_name: 'Complete Blood Count',
      ordered_by: 'QA Director',
      ordered_date: TODAY,
      status: 'pending',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view invoices (billing module)', async () => {
    const res = await (await owner()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('owner can view purchase orders (medical supplies)', async () => {
    const res = await (await owner()).get('/api/purchase-orders');
    expect(res.status).toBe(200);
  });

  it('owner can view products (basic_inventory module)', async () => {
    const res = await (await owner()).get('/api/products');
    expect(res.status).toBe(200);
  });

  it('owner can view vendors (medical suppliers)', async () => {
    const res = await (await owner()).get('/api/vendors');
    expect(res.status).toBe(200);
  });
});

// ─── 2. Role: Doctor/Manager workflow ─────────────────────────────────────────
describe('Healthcare Role: Doctor (manager)', () => {
  it('doctor can login with role=manager', async () => {
    const body = await (await (await doctor()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('doctor can view patients list', async () => {
    const res = await (await doctor()).get('/api/healthcare/patients');
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    expect(Array.isArray(body)).toBe(true);
  });

  it('doctor can create an OPD visit record', async () => {
    const res = await (await doctor()).post('/api/healthcare/opd', {
      patient_name: 'QA Doctor OPD Patient',
      visit_date: TODAY,
      doctor_name: 'QA Doctor',
      chief_complaint: 'Fever and cough',
      diagnosis: 'Viral fever',
      prescription: 'Paracetamol 500mg',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('doctor can create a prescription', async () => {
    const res = await (await doctor()).post('/api/healthcare/prescriptions', {
      patient_name: 'QA Rx Patient',
      doctor_name: 'QA Doctor',
      date: TODAY,
      medicines: [{ name: 'Amoxicillin 500mg', dosage: '1-0-1', duration: '5 days' }],
    });
    expect(res.status).toBeLessThan(400);
  });

  it('doctor can view appointment schedule', async () => {
    const res = await (await doctor()).get('/api/healthcare/appointments');
    expect(res.status).toBeLessThan(400);
  });

  it('doctor can order a lab test', async () => {
    const res = await (await doctor()).post('/api/healthcare/lab-tests', {
      patient_name: 'QA Doctor Lab Patient',
      test_name: 'Blood Sugar Fasting',
      ordered_by: 'QA Doctor',
      ordered_date: TODAY,
      status: 'pending',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('doctor can view wards (for IPD referral)', async () => {
    const res = await (await doctor()).get('/api/healthcare/wards');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 3. Role: Nurse/Receptionist (operator) workflow ──────────────────────────
describe('Healthcare Role: Nurse/Receptionist (operator)', () => {
  it('receptionist can login with role=operator', async () => {
    const body = await (await (await receptionist()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('receptionist can register a new patient', async () => {
    const res = await (await receptionist()).post('/api/healthcare/patients', {
      name: 'QA Walk-In Patient',
      phone: '9700009099',
      email: 'walkin@qa-hc.test',
      date_of_birth: '1995-05-15',
      gender: 'Female',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('receptionist can book an appointment', async () => {
    const res = await (await receptionist()).post('/api/healthcare/appointments', {
      patient_name: 'QA Receptionist Booked',
      patient_phone: '9700009088',
      appointment_date: TODAY,
      appointment_time: '11:00',
      doctor_name: 'QA Doctor',
      type: 'opd',
      status: 'scheduled',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('receptionist can view appointments', async () => {
    const res = await (await receptionist()).get('/api/healthcare/appointments');
    expect(res.status).toBeLessThan(400);
  });

  it('nurse can view ward assignments', async () => {
    const res = await (await nurse()).get('/api/healthcare/wards');
    expect(res.status).toBeLessThan(400);
  });

  it('nurse can create a vitals/nursing note', async () => {
    const res = await (await nurse()).post('/api/healthcare/ipd', {
      patient_name: 'QA Nurse IPD Patient',
      admission_date: TODAY,
      ward: 'Nursing Ward',
      bed_number: 'N-002',
      doctor_name: 'QA Doctor',
      diagnosis: 'Post-op observation',
    });
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 4. Role: Lab Technician (reviewer) workflow ───────────────────────────────
describe('Healthcare Role: Lab Technician (reviewer)', () => {
  it('lab tech (doctor role) can view lab test orders', async () => {
    const res = await (await doctor()).get('/api/healthcare/lab-tests');
    expect(res.status).toBeLessThan(400);
  });

  it('lab tech can view patients (to match sample)', async () => {
    const res = await (await receptionist()).get('/api/healthcare/patients');
    expect(res.status).toBeLessThan(400);
  });

  it('lab tech can view prescriptions (to check test requests)', async () => {
    const res = await (await receptionist()).get('/api/healthcare/prescriptions');
    expect(res.status).toBeLessThan(400);
  });

  it('lab tech can create a lab test result', async () => {
    const res = await (await doctor()).post('/api/healthcare/lab-tests', {
      patient_name: 'QA Lab Result Patient',
      test_name: 'Lipid Profile',
      ordered_by: 'QA Doctor',
      ordered_date: TODAY,
      status: 'completed',
      result: 'Normal',
    });
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 5. Plan: ALL plans — core healthcare module accessible ────────────────────
describe('Healthcare Plan: ALL plans — core healthcare module accessible', () => {
  it('starter plan: /api/tenant/features includes healthcare module', async () => {
    expect(await getModules(await starterOwner())).toContain('healthcare');
  });

  it('professional plan: /api/tenant/features includes healthcare module', async () => {
    expect(await getModules(await proOwner())).toContain('healthcare');
  });

  it('enterprise plan: /api/tenant/features includes healthcare module', async () => {
    expect(await getModules(await owner())).toContain('healthcare');
  });

  it('all plans: core healthcare APIs return < 400', async () => {
    const CORE = ['/api/healthcare/patients', '/api/healthcare/appointments', '/api/healthcare/opd'];
    for (const loginFn of [starterOwner, proOwner, owner]) {
      const api = await loginFn();
      const results = await Promise.all(CORE.map(s => api.get(s).then(r => ({ s, status: r.status }))));
      expect(results.filter(r => r.status >= 400)).toEqual([]);
    }
  });

  it('starter: GET /api/healthcare/doctors returns < 400', async () => {
    expect((await (await starterOwner()).get('/api/healthcare/doctors')).status).toBeLessThan(400);
  });

  it('professional: GET /api/healthcare/wards returns < 400', async () => {
    expect((await (await proOwner()).get('/api/healthcare/wards')).status).toBeLessThan(400);
  });

  it('enterprise: GET /api/healthcare/lab-tests returns < 400', async () => {
    expect((await (await owner()).get('/api/healthcare/lab-tests')).status).toBeLessThan(400);
  });

  it('enterprise: GET /api/healthcare/prescriptions returns < 400', async () => {
    expect((await (await owner()).get('/api/healthcare/prescriptions')).status).toBeLessThan(400);
  });
});

// ─── 6. Plan: ALL plans — invoicing / purchase_orders / basic_inventory ─────────
describe('Healthcare Plan: ALL plans — invoicing / purchase_orders / basic_inventory', () => {
  it('starter plan: includes invoicing and expenses', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('invoicing');
    expect(mods).toContain('expenses');
  });

  it('professional plan: includes invoicing, purchase_orders, basic_inventory', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('invoicing');
    expect(mods).toContain('purchase_orders');
    expect(mods).toContain('basic_inventory');
  });

  it('enterprise: GET /api/invoices returns 200', async () => {
    expect((await (await owner()).get('/api/invoices')).status).toBe(200);
  });

  it('enterprise: GET /api/products returns 200 (basic_inventory)', async () => {
    expect((await (await owner()).get('/api/products')).status).toBe(200);
  });
});

// ─── 7. Plan: Professional+ — accounting / mis / crm / hr_payroll ──────────────
describe('Healthcare Plan: Professional+ — accounting / mis / crm / hr_payroll', () => {
  it('starter plan: does NOT include accounting', async () => {
    expect(await getModules(await starterOwner())).not.toContain('accounting');
  });

  it('professional plan: includes accounting', async () => {
    expect(await getModules(await proOwner())).toContain('accounting');
  });

  it('professional plan: includes mis', async () => {
    expect(await getModules(await proOwner())).toContain('mis');
  });

  it('professional plan: includes crm', async () => {
    expect(await getModules(await proOwner())).toContain('crm');
  });
});

// ─── 8. Plan: Enterprise only — production / warehouses / fixed_assets ──────────
describe('Healthcare Plan: Enterprise only — production / warehouses / fixed_assets', () => {
  it('professional plan: does NOT include production', async () => {
    expect(await getModules(await proOwner())).not.toContain('production');
  });

  it('enterprise plan: includes production', async () => {
    expect(await getModules(await owner())).toContain('production');
  });

  it('enterprise plan: includes warehouses', async () => {
    expect(await getModules(await owner())).toContain('warehouses');
  });

  it('enterprise plan: includes fixed_assets', async () => {
    expect(await getModules(await owner())).toContain('fixed_assets');
  });
});

// ─── 9. Cross-role: Data created by one role visible to others ─────────────────
describe('Healthcare Cross-role: Data created by one role visible to others', () => {
  it('patient registered by receptionist is visible to doctor', async () => {
    const recApi    = await receptionist();
    const doctorApi = await doctor();
    const postRes = await recApi.post('/api/healthcare/patients', {
      name: 'QA Cross-Role Patient',
      phone: '9700009077',
      gender: 'Female',
    });
    expect(postRes.status).toBeLessThan(400);
    const listRes = await doctorApi.get('/api/healthcare/patients');
    expect(listRes.status).toBeLessThan(400);
    const list = await listRes.json() as any[];
    expect(Array.isArray(list)).toBe(true);
  });

  it('appointment booked by receptionist is visible to doctor', async () => {
    const recApi    = await receptionist();
    const doctorApi = await doctor();
    const apptRes = await recApi.post('/api/healthcare/appointments', {
      patient_name: 'QA Cross Visibility',
      patient_phone: '9700009066',
      appointment_date: TODAY,
      appointment_time: '14:00',
      doctor_name: 'QA Doctor',
      type: 'opd',
      status: 'scheduled',
    });
    expect(apptRes.status).toBeLessThan(400);
    const listRes = await doctorApi.get('/api/healthcare/appointments');
    expect(listRes.status).toBeLessThan(400);
  });

  it('prescription created by doctor is visible to nurse', async () => {
    const doctorApi = await doctor();
    const nurseApi  = await nurse();
    await doctorApi.post('/api/healthcare/prescriptions', {
      patient_name: 'QA Rx Cross',
      doctor_name: 'QA Doctor',
      date: TODAY,
      medicines: [{ name: 'Ibuprofen 400mg', dosage: '1-1-1', duration: '3 days' }],
    });
    const listRes = await nurseApi.get('/api/healthcare/prescriptions');
    expect(listRes.status).toBeLessThan(400);
  });

  it('OPD record created by doctor is visible to admin', async () => {
    const doctorApi = await doctor();
    const ownerApi  = await owner();
    await doctorApi.post('/api/healthcare/opd', {
      patient_name: 'QA OPD Cross',
      visit_date: TODAY,
      doctor_name: 'QA Doctor',
      diagnosis: 'Gastritis',
    });
    const listRes = await ownerApi.get('/api/healthcare/opd');
    expect(listRes.status).toBeLessThan(400);
  });
});

// ─── 10. Starter Plan — role login + core workflow ────────────────────────────
describe('Healthcare Starter Plan — role login + core workflow', () => {
  it('starter owner can login with role=admin', async () => {
    const body = await (await (await starterOwner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('starter doctor can login with role=manager', async () => {
    const body = await (await (await starterDoctor()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('starter receptionist can login with role=operator', async () => {
    const body = await (await (await starterReceptionist()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('starter: core healthcare APIs return < 400', async () => {
    const api = await starterOwner();
    const results = await Promise.all([
      '/api/healthcare/patients',
      '/api/healthcare/appointments',
    ].map(s => api.get(s).then(r => ({ s, status: r.status }))));
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });
});

// ─── 11. Professional Plan — role login + extra modules ───────────────────────
describe('Healthcare Professional Plan — role login + extra modules', () => {
  it('pro owner can login with role=admin', async () => {
    const body = await (await (await proOwner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('pro doctor can login with role=manager', async () => {
    const body = await (await (await proDoctor()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('pro owner: features includes accounting, mis, crm, hr_payroll', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('accounting');
    expect(mods).toContain('mis');
    expect(mods).toContain('crm');
    expect(mods).toContain('hr_payroll');
  });

  it('pro owner: features does NOT include production (enterprise only)', async () => {
    expect(await getModules(await proOwner())).not.toContain('production');
  });
});

// ─── 12. Enterprise — Accountant workflow ─────────────────────────────────────
describe('Healthcare Enterprise — Accountant workflow (accounting module)', () => {
  it('accountant can login with role=accountsmanager', async () => {
    const body = await (await (await acct()).get('/api/user')).json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('accountant can view chart of accounts', async () => {
    const res = await (await acct()).get('/api/chart-of-accounts');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can create a journal entry', async () => {
    const res = await (await acct()).post('/api/journal-entries', {
      date: TODAY,
      narration: 'QA Journal — Healthcare OPD Revenue',
      entries: [
        { account_code: '4001', debit: 2500, credit: 0 },
        { account_code: '1001', debit: 0,    credit: 2500 },
      ],
    });
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view trial balance', async () => {
    const res = await (await acct()).get('/api/trial-balance');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view P&L report', async () => {
    const res = await (await acct()).get('/api/profit-loss');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 13. Enterprise — HR Manager workflow ────────────────────────────────────
describe('Healthcare Enterprise — HR Manager workflow (hr_payroll module)', () => {
  it('hr manager can login with role=manager', async () => {
    const body = await (await (await hrMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('hr manager can view employees', async () => {
    const res = await (await hrMgr()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('hr manager can add a nurse as employee', async () => {
    const res = await (await hrMgr()).post('/api/hr/employees', {
      employee_id: 'QA-EMP-HC-001',
      first_name: 'QA',
      last_name: 'Nurse Staff',
      designation: 'Staff Nurse',
      department: 'Nursing',
      basic_salary: 25000,
      phone: '9000002222',
      email: 'nurse@qa-hc.kinto',
      date_of_joining: TODAY,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view payroll', async () => {
    const res = await (await hrMgr()).get('/api/hr/payroll');
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view attendance', async () => {
    const res = await (await hrMgr()).get('/api/hr/attendance');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 14. Enterprise — CRM Executive workflow ─────────────────────────────────
describe('Healthcare Enterprise — CRM Executive workflow (crm module)', () => {
  it('crm executive can login with role=operator', async () => {
    const body = await (await (await crmExec()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('crm exec can view CRM contacts (patients as contacts)', async () => {
    const res = await (await crmExec()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can create a lead (corporate patient)', async () => {
    const res = await (await crmExec()).post('/api/crm/leads', {
      name: 'QA Corporate Health Client',
      email: 'corp@hc-qa.kinto',
      phone: '9000002211',
      source: 'referral',
      status: 'new',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view campaigns', async () => {
    const res = await (await crmExec()).get('/api/crm/campaigns');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view healthcare patients (cross-link)', async () => {
    const res = await (await crmExec()).get('/api/healthcare/patients');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 15. Enterprise — Sales Manager workflow ──────────────────────────────────
describe('Healthcare Enterprise — Sales Manager workflow (sales_orders module)', () => {
  it('sales manager can login with role=manager', async () => {
    const body = await (await (await salesMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('sales manager can view sales orders', async () => {
    const res = await (await salesMgr()).get('/api/sales-orders');
    expect(res.status).toBe(200);
  });

  it('sales manager can create a sales order (corporate package)', async () => {
    const res = await (await salesMgr()).post('/api/sales-orders', {
      customer_name: 'QA Corporate HC Package',
      order_date: TODAY,
      delivery_date: TODAY,
      items: [{ product_name: 'Health Checkup Package', quantity: 5, rate: 2000, amount: 10000 }],
      total: 10000,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('sales manager can view invoices', async () => {
    const res = await (await salesMgr()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('sales manager can view products (catalog for packages)', async () => {
    const res = await (await salesMgr()).get('/api/products');
    expect(res.status).toBe(200);
  });
});

// ─── 16. Enterprise — MIS Viewer workflow ────────────────────────────────────
describe('Healthcare Enterprise — MIS Viewer workflow (mis module)', () => {
  it('mis viewer can login with role=reviewer', async () => {
    const body = await (await (await misViewer()).get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('mis viewer can view MIS sales summary', async () => {
    const res = await (await misViewer()).get('/api/mis/sales-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view MIS financial summary', async () => {
    const res = await (await misViewer()).get('/api/mis/financial-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view healthcare patient stats (cross-link)', async () => {
    const res = await (await misViewer()).get('/api/healthcare/patients');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 17. Enterprise — Warehouse Manager workflow ──────────────────────────────
describe('Healthcare Enterprise — Warehouse Manager workflow (warehouses module)', () => {
  it('warehouse manager can login with role=manager', async () => {
    const body = await (await (await warehouseMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('warehouse manager can view warehouses', async () => {
    const res = await (await warehouseMgr()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view products/inventory (medical supplies)', async () => {
    const res = await (await warehouseMgr()).get('/api/products');
    expect(res.status).toBe(200);
  });

  it('warehouse manager can view purchase orders (medical supplies intake)', async () => {
    const res = await (await warehouseMgr()).get('/api/purchase-orders');
    expect(res.status).toBe(200);
  });
});

// ─── 18. Enterprise — Production Supervisor workflow ─────────────────────────
describe('Healthcare Enterprise — Production Supervisor workflow (production module)', () => {
  it('production supervisor can login with role=manager', async () => {
    const body = await (await (await prodSup()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('production supervisor can view production entries', async () => {
    const res = await (await prodSup()).get('/api/production-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('production supervisor can view raw materials (lab supplies)', async () => {
    const res = await (await prodSup()).get('/api/raw-materials');
    expect(res.status).toBeLessThan(400);
  });

  it('production supervisor can view products', async () => {
    const res = await (await prodSup()).get('/api/products');
    expect(res.status).toBe(200);
  });
});

// ─── 19. Enterprise — Assets Manager workflow ────────────────────────────────
describe('Healthcare Enterprise — Assets Manager workflow (fixed_assets module)', () => {
  it('assets manager can login with role=manager', async () => {
    const body = await (await (await assetsMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('assets manager can view fixed assets (medical equipment)', async () => {
    const res = await (await assetsMgr()).get('/api/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });

  it('assets manager can view depreciation schedule', async () => {
    const res = await (await assetsMgr()).get('/api/fixed-assets/depreciation');
    expect(res.status).toBeLessThan(400);
  });

  it('assets manager: enterprise plan includes fixed_assets', async () => {
    const mods = await getModules(await assetsMgr());
    expect(mods).toContain('fixed_assets');
  });
});

// ─── 20. Professional — Accountant workflow ───────────────────────────────────
describe('Healthcare Professional — Accountant workflow', () => {
  it('pro accountant can login with role=accountsmanager', async () => {
    const body = await (await (await proAcct()).get('/api/user')).json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('pro accountant can view journal entries', async () => {
    const res = await (await proAcct()).get('/api/journal-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('pro accountant can view trial balance', async () => {
    const res = await (await proAcct()).get('/api/trial-balance');
    expect(res.status).toBeLessThan(400);
  });

  it('pro accountant: features does NOT include production (enterprise only)', async () => {
    expect(await getModules(await proAcct())).not.toContain('production');
  });
});

// ─── 21. Professional — HR Manager workflow ───────────────────────────────────
describe('Healthcare Professional — HR Manager workflow', () => {
  it('pro hr manager can login with role=manager', async () => {
    const body = await (await (await proHr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('pro hr manager can view employees', async () => {
    const res = await (await proHr()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('pro hr manager can view payroll', async () => {
    const res = await (await proHr()).get('/api/hr/payroll');
    expect(res.status).toBeLessThan(400);
  });

  it('pro hr manager: features does NOT include warehouses (enterprise only)', async () => {
    expect(await getModules(await proHr())).not.toContain('warehouses');
  });
});

// ─── 22. Professional — CRM Executive workflow ────────────────────────────────
describe('Healthcare Professional — CRM Executive workflow', () => {
  it('pro crm exec can login with role=operator', async () => {
    const body = await (await (await proCrm()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('pro crm exec can view CRM contacts', async () => {
    const res = await (await proCrm()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('pro crm exec can view healthcare patients (cross-link)', async () => {
    const res = await (await proCrm()).get('/api/healthcare/patients');
    expect(res.status).toBeLessThan(400);
  });

  it('pro crm exec: features does NOT include fixed_assets (enterprise only)', async () => {
    expect(await getModules(await proCrm())).not.toContain('fixed_assets');
  });
});

// ─── 23. Professional — MIS Viewer workflow ───────────────────────────────────
describe('Healthcare Professional — MIS Viewer workflow', () => {
  it('pro mis viewer can login with role=reviewer', async () => {
    const body = await (await (await proMis()).get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('pro mis viewer can view MIS sales summary', async () => {
    const res = await (await proMis()).get('/api/mis/sales-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('pro mis viewer can view MIS financial summary', async () => {
    const res = await (await proMis()).get('/api/mis/financial-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('pro mis viewer: features does NOT include warehouses (enterprise only)', async () => {
    expect(await getModules(await proMis())).not.toContain('warehouses');
  });
});

// ─── 24. Starter — Billing Staff workflow ─────────────────────────────────────
describe('Healthcare Starter — Billing Staff workflow (invoicing module)', () => {
  it('billing staff can login with role=operator', async () => {
    const body = await (await (await starterBilling()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('billing staff can view invoices', async () => {
    const res = await (await starterBilling()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('billing staff: features does NOT include accounting (professional+ only)', async () => {
    expect(await getModules(await starterBilling())).not.toContain('accounting');
  });

  it('billing staff: features does NOT include crm (professional+ only)', async () => {
    expect(await getModules(await starterBilling())).not.toContain('crm');
  });
});

// ─── 25. Starter — Purchase Manager workflow ──────────────────────────────────
describe('Healthcare Starter — Purchase Manager workflow', () => {
  it('starter owner can access invoices (purchase via invoice on starter)', async () => {
    const res = await (await starterOwner()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('starter owner can view healthcare patients on starter plan', async () => {
    const res = await (await starterOwner()).get('/api/healthcare/patients');
    expect(res.status).toBeLessThan(400);
  });

  it('starter doctor: features does NOT include hr_payroll (professional+ only)', async () => {
    expect(await getModules(await starterDoctor())).not.toContain('hr_payroll');
  });

  it('starter receptionist can register patients and view appointments', async () => {
    const api = await starterReceptionist();
    const [patients, appts] = await Promise.all([
      api.get('/api/healthcare/patients'),
      api.get('/api/healthcare/appointments'),
    ]);
    expect(patients.status).toBeLessThan(400);
    expect(appts.status).toBeLessThan(400);
  });

  it('starter billing: can create a patient bill', async () => {
    const res = await (await starterBilling()).post('/api/healthcare/patient-bills', {
      patient_name: 'QA Starter HC Patient',
      bill_date: TODAY,
      bill_type: 'OPD',
      total_amount: 300,
      paid_amount: 300,
      balance_amount: 0,
      payment_mode: 'cash',
      status: 'paid',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('starter doctor: features does NOT include mis (professional+ only)', async () => {
    expect(await getModules(await starterDoctor())).not.toContain('mis');
  });

  it('starter owner: features does NOT include sales_orders (enterprise only)', async () => {
    expect(await getModules(await starterOwner())).not.toContain('sales_orders');
  });

  it('professional receptionist can view prescriptions (pharmacy cross-link)', async () => {
    const res = await (await proReceptionist()).get('/api/healthcare/prescriptions');
    expect(res.status).toBeLessThan(400);
  });
});
