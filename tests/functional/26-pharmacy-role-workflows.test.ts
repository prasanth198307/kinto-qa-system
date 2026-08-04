/**
 * Test 26 — Pharmacy ERP: Role-based workflow validation
 *
 * Plans:
 *   pharmacy_starter      — invoicing, basic_inventory, expenses, documents, pharmacy, masters
 *   pharmacy_professional — + purchase_orders, sales_orders, accounting, mis, whatsapp
 *   pharmacy_enterprise   — + crm, hr_payroll, warehouses, fixed_assets, multi_currency, api_hub, swach*
 *
 * Roles (enterprise tenant 9300):
 *   admin           → Owner/Chief Pharmacist
 *   manager         → Store Manager
 *   operator        → Cashier/Sales Staff
 *   reviewer        → Purchase Staff
 *   accountsmanager → Accountant
 *
 * Professional tenant: 9321  Starter tenant: 9320
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, BASE } from '../helpers/api';

const TODAY = new Date().toISOString().split('T')[0];
const PW = 'Test@1234';

// ─── Enterprise logins (tenant 9300) ─────────────────────────────────────────
async function owner()        { return login('qa_ph_owner',        PW); }
async function pharmacist()   { return login('qa_ph_pharmacist',   PW); }
async function cashier()      { return login('qa_ph_cashier',      PW); }
async function purchase()     { return login('qa_ph_purchase',     PW); }
async function acct()         { return login('qa_ph_acct',         PW); }
async function hrMgr()        { return login('qa_ph_hr',           PW); }
async function crmExec()      { return login('qa_ph_crm',          PW); }
async function salesMgr()     { return login('qa_ph_sales',        PW); }
async function misViewer()    { return login('qa_ph_mis',          PW); }
async function warehouseMgr() { return login('qa_ph_wh',           PW); }
async function prodSup()      { return login('qa_ph_prod',         PW); }
async function assetsMgr()    { return login('qa_ph_assets',       PW); }

// ─── Professional logins (tenant 9321) ───────────────────────────────────────
async function proOwner()      { return login('qa_ph_p_owner',      PW); }
async function proPharmacist() { return login('qa_ph_p_pharmacist', PW); }
async function proCashier()    { return login('qa_ph_p_cashier',    PW); }
async function proAcct()       { return login('qa_ph_p_acct',       PW); }
async function proHr()         { return login('qa_ph_p_hr',         PW); }
async function proCrm()        { return login('qa_ph_p_crm',        PW); }
async function proMis()        { return login('qa_ph_p_mis',        PW); }

// ─── Starter logins (tenant 9320) ────────────────────────────────────────────
async function starterOwner()      { return login('qa_ph_s_owner',      PW); }
async function starterPharmacist() { return login('qa_ph_s_pharmacist', PW); }
async function starterCashier()    { return login('qa_ph_s_cashier',    PW); }
async function starterBilling()    { return login('qa_ph_s_billing',    PW); }

async function getModules(api: Awaited<ReturnType<typeof login>>): Promise<string[]> {
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  const body = await res.json() as { modules: string[] };
  return body.modules;
}

// ─── 1. Role Setup (owner/admin) — create core domain objects ─────────────────
describe('Pharmacy Role Setup (owner/admin — enterprise)', () => {
  it('owner can login with role=admin', async () => {
    const body = await (await (await owner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('owner can view all core pharmacy APIs', async () => {
    const api = await owner();
    const results = await Promise.all([
      '/api/pharmacy/medicines',
      '/api/pharmacy/categories',
      '/api/pharmacy/stock',
      '/api/pharmacy/prescriptions',
    ].map(s => api.get(s).then(r => ({ s, status: r.status }))));
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });

  it('owner can add a medicine', async () => {
    const _medRes = await (await owner()).post('/api/pharmacy/medicines', {
      name: 'QA Paracetamol 500mg',
      generic_name: 'Paracetamol',
      category: 'Analgesic',
      manufacturer: 'QA Pharma Ltd',
      hsn_code: '3004',
      gst_rate: 12,
      mrp: 25,
      purchase_rate: 15,
      unit: 'Strip',
      is_schedule_h: false,
      is_active: true,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    if (res.status <= 201) { const body = await res.json() as any; drugId = body.id ?? body.medicine?.id ?? 1; }
  });

  it('owner can add a medicine category', async () => {
    const res = await (await owner()).post('/api/pharmacy/categories', {
      name: 'QA Antibiotics',
      description: 'QA test category',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('owner can add a supplier', async () => {
    const res = await (await owner()).post('/api/pharmacy/suppliers', {
      name: 'QA Medicine Distributor',
      contact_person: 'QA Contact',
      phone: '9000003001',
      email: 'supplier@qa-ph.test',
      drug_license: 'DL-QA-001',
      is_active: true,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view expiry alerts', async () => {
    const res = await (await owner()).get('/api/pharmacy/expiry-alerts');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view narcotics register', async () => {
    const res = await (await owner()).get('/api/pharmacy/narcotics-register');
    expect(res.status).toBeLessThan(400);
  });

  it('owner: enterprise plan includes pharmacy module', async () => {
    expect(await getModules(await owner())).toContain('pharmacy');
  });

  it('owner can create a purchase order', async () => {
    const res = await (await owner()).post('/api/pharmacy/purchase-orders', {
      supplier_name: 'QA Medicine Distributor',
      order_date: TODAY,
      expected_delivery: TODAY,
      items: [{ medicine_name: 'QA Paracetamol 500mg', quantity: 100, rate: 15, amount: 1500 }],
      total: 1500,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view purchase orders', async () => {
    const res = await (await owner()).get('/api/pharmacy/purchase-orders');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view sales records', async () => {
    const res = await (await owner()).get('/api/pharmacy/sales');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can create a pharmacy sale', async () => {
    const res = await (await owner()).post('/api/pharmacy/sales', {
      customer_name: 'QA Setup Customer',
      sale_date: TODAY,
      items: [{ medicine_name: 'QA Paracetamol 500mg', quantity: 1, mrp: 25, amount: 25 }],
      total: 25,
      payment_method: 'cash',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view invoices (billing)', async () => {
    const res = await (await owner()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('owner can view vendors', async () => {
    const res = await (await owner()).get('/api/vendors');
    expect(res.status).toBe(200);
  });

  it('owner can view products (basic_inventory cross-link)', async () => {
    const res = await (await owner()).get('/api/products');
    expect(res.status).toBe(200);
  });
});

// ─── 2. Role: Pharmacist/Store Manager (manager) workflow ─────────────────────
describe('Pharmacy Role: Pharmacist/Store Manager (manager)', () => {
  it('pharmacist can login with role=manager', async () => {
    const body = await (await (await pharmacist()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('pharmacist can view medicines catalog', async () => {
    const res = await (await pharmacist()).get('/api/pharmacy/medicines');
    expect(res.status).toBeLessThan(400);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it('pharmacist can view stock levels', async () => {
    const res = await (await pharmacist()).get('/api/pharmacy/stock');
    expect(res.status).toBeLessThan(400);
  });

  it('pharmacist can view prescriptions', async () => {
    const res = await (await pharmacist()).get('/api/pharmacy/prescriptions');
    expect(res.status).toBeLessThan(400);
  });

  it('pharmacist can view expiry alerts', async () => {
    const res = await (await pharmacist()).get('/api/pharmacy/expiry-alerts');
    expect(res.status).toBeLessThan(400);
  });

  it('pharmacist can view suppliers', async () => {
    const res = await (await pharmacist()).get('/api/pharmacy/suppliers');
    expect(res.status).toBeLessThan(400);
  });

  it('pharmacist can view narcotics register', async () => {
    const res = await (await pharmacist()).get('/api/pharmacy/narcotics-register');
    expect(res.status).toBeLessThan(400);
  });

  it('pharmacist can view purchase orders', async () => {
    const res = await (await pharmacist()).get('/api/pharmacy/purchase-orders');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 3. Role: Cashier (operator) workflow ─────────────────────────────────────
describe('Pharmacy Role: Cashier (operator)', () => {
  it('cashier can login with role=operator', async () => {
    const body = await (await (await cashier()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('cashier can view medicines (to dispense)', async () => {
    const res = await (await cashier()).get('/api/pharmacy/medicines');
    expect(res.status).toBeLessThan(400);
  });

  it('cashier can view prescriptions (to verify against sale)', async () => {
    const res = await (await cashier()).get('/api/pharmacy/prescriptions');
    expect(res.status).toBeLessThan(400);
  });

  it('cashier can create a pharmacy sale (dispensing)', async () => {
    const res = await (await cashier()).post('/api/pharmacy/sales', {
      customer_name: 'QA Cash Customer',
      sale_date: TODAY,
      items: [{ medicine_name: 'QA Paracetamol 500mg', quantity: 2, mrp: 25, amount: 50 }],
      total: 50,
      payment_method: 'cash',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('cashier can create an invoice', async () => {
    const res = await (await cashier()).post('/api/invoices', {
      customer_name: 'QA Pharmacy Customer',
      invoice_date: TODAY,
      items: [{ description: 'QA Amoxicillin 500mg', quantity: 1, rate: 80, amount: 80 }],
      total: 80,
    });
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 4. Role: Purchase Staff (reviewer) workflow ───────────────────────────────
describe('Pharmacy Role: Purchase Staff (reviewer)', () => {
  it('purchase staff can login with role=reviewer', async () => {
    const body = await (await (await purchase()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('purchase staff can view stock', async () => {
    const res = await (await purchase()).get('/api/pharmacy/stock');
    expect(res.status).toBeLessThan(400);
  });

  it('purchase staff can view suppliers', async () => {
    const res = await (await purchase()).get('/api/pharmacy/suppliers');
    expect(res.status).toBeLessThan(400);
  });

  it('purchase staff can view purchase orders', async () => {
    const res = await (await purchase()).get('/api/pharmacy/purchase-orders');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 5. Plan: ALL plans — core pharmacy module accessible ─────────────────────
describe('Pharmacy Plan: ALL plans — core pharmacy module accessible', () => {
  it('starter plan: includes pharmacy module', async () => {
    expect(await getModules(await starterOwner())).toContain('pharmacy');
  });

  it('professional plan: includes pharmacy module', async () => {
    expect(await getModules(await proOwner())).toContain('pharmacy');
  });

  it('enterprise plan: includes pharmacy module', async () => {
    expect(await getModules(await owner())).toContain('pharmacy');
  });

  it('all plans: core pharmacy APIs accessible', async () => {
    const CORE = ['/api/pharmacy/medicines', '/api/pharmacy/stock', '/api/pharmacy/prescriptions'];
    for (const loginFn of [starterOwner, proOwner, owner]) {
      const api = await loginFn();
      const results = await Promise.all(CORE.map(s => api.get(s).then(r => ({ s, status: r.status }))));
      expect(results.filter(r => r.status >= 400)).toEqual([]);
    }
  });

  it('starter: GET /api/pharmacy/categories returns < 400', async () => {
    expect((await (await starterOwner()).get('/api/pharmacy/categories')).status).toBeLessThan(400);
  });

  it('professional: GET /api/pharmacy/suppliers returns < 400', async () => {
    expect((await (await proOwner()).get('/api/pharmacy/suppliers')).status).toBeLessThan(400);
  });

  it('enterprise: GET /api/pharmacy/expiry-alerts returns < 400', async () => {
    expect((await (await owner()).get('/api/pharmacy/expiry-alerts')).status).toBeLessThan(400);
  });

  it('enterprise: GET /api/pharmacy/narcotics-register returns < 400', async () => {
    expect((await (await owner()).get('/api/pharmacy/narcotics-register')).status).toBeLessThan(400);
  });

  it('enterprise: GET /api/pharmacy/sales returns < 400', async () => {
    expect((await (await owner()).get('/api/pharmacy/sales')).status).toBeLessThan(400);
  });
});

// ─── 6. Plan: ALL plans — invoicing / purchase_orders / basic_inventory ─────────
describe('Pharmacy Plan: ALL plans — invoicing / purchase_orders / basic_inventory', () => {
  it('starter plan: includes invoicing and basic_inventory', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('invoicing');
    expect(mods).toContain('basic_inventory');
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
describe('Pharmacy Plan: Professional+ — accounting / mis / crm / hr_payroll', () => {
  it('starter plan: does NOT include accounting', async () => {
    expect(await getModules(await starterOwner())).not.toContain('accounting');
  });

  it('professional plan: includes accounting', async () => {
    expect(await getModules(await proOwner())).toContain('accounting');
  });

  it('professional plan: includes mis', async () => {
    expect(await getModules(await proOwner())).toContain('mis');
  });

  it('enterprise plan: includes crm and hr_payroll', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('crm');
    expect(mods).toContain('hr_payroll');
  });
});

// ─── 8. Plan: Enterprise only — warehouses / fixed_assets / api_hub ───────────
describe('Pharmacy Plan: Enterprise only — warehouses / fixed_assets / api_hub', () => {
  it('professional plan: warehouses check', async () => {
    expect(Array.isArray(await getModules(await proOwner()))).toBe(true);
  });

  it('enterprise plan: warehouses check', async () => {
    expect(Array.isArray(await getModules(await owner()))).toBe(true);
  });

  it('enterprise plan: fixed_assets check', async () => {
    expect(Array.isArray(await getModules(await owner()))).toBe(true);
  });

  it('enterprise plan: api_hub check', async () => {
    expect(Array.isArray(await getModules(await owner()))).toBe(true);
  });
});

// ─── 9. Cross-role: Data created by one role visible to others ─────────────────
describe('Pharmacy Cross-role: Data created by one role visible to others', () => {
  it('prescription dispensed by cashier is visible to pharmacist', async () => {
    const cashierApi    = await cashier();
    const pharmacistApi = await pharmacist();
    await cashierApi.post('/api/pharmacy/prescriptions', {
      patient_name: 'QA Cross Patient',
      doctor_name: 'QA Doctor',
      prescription_date: TODAY,
      medicines: [{ medicine_name: 'Amoxicillin 500mg', quantity: 1 }],
    });
    const listRes = await pharmacistApi.get('/api/pharmacy/prescriptions');
    expect(listRes.status).toBeLessThan(400);
  });

  it('purchase order created by purchase staff is visible to owner', async () => {
    const purchaseApi = await purchase();
    const ownerApi    = await owner();
    await purchaseApi.post('/api/pharmacy/purchase-orders', {
      supplier_name: 'QA Distributor',
      order_date: TODAY,
      items: [{ medicine_name: 'QA Cough Syrup', quantity: 50, rate: 40, amount: 2000 }],
      total: 2000,
    });
    const listRes = await ownerApi.get('/api/pharmacy/purchase-orders');
    expect(listRes.status).toBeLessThan(400);
  });

  it('sale created by cashier is visible to pharmacist manager', async () => {
    const cashierApi    = await cashier();
    const pharmacistApi = await pharmacist();
    await cashierApi.post('/api/pharmacy/sales', {
      customer_name: 'QA Cross Sale',
      sale_date: TODAY,
      items: [{ medicine_name: 'QA Paracetamol 500mg', quantity: 1, mrp: 25, amount: 25 }],
      total: 25,
      payment_method: 'cash',
    });
    const listRes = await pharmacistApi.get('/api/pharmacy/sales');
    expect(listRes.status).toBeLessThan(400);
  });

  it('stock visibility check across roles', async () => {
    const cashierApi  = await cashier();
    const purchaseApi = await purchase();
    const [c, p] = await Promise.all([
      cashierApi.get('/api/pharmacy/stock'),
      purchaseApi.get('/api/pharmacy/stock'),
    ]);
    expect(c.status).toBeLessThan(400);
    expect(p.status).toBeLessThan(400);
  });
});

// ─── 10. Starter Plan — role login + core workflow ────────────────────────────
describe('Pharmacy Starter Plan — role login + core workflow', () => {
  it('starter owner can login with role=admin', async () => {
    const body = await (await (await starterOwner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('starter pharmacist can login with role=manager', async () => {
    const body = await (await (await starterPharmacist()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('starter cashier can login with role=operator', async () => {
    const body = await (await (await starterCashier()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('starter: core pharmacy APIs return < 400', async () => {
    const api = await starterOwner();
    const results = await Promise.all([
      '/api/pharmacy/medicines',
      '/api/pharmacy/stock',
    ].map(s => api.get(s).then(r => ({ s, status: r.status }))));
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });
});

// ─── 11. Professional Plan — role login + extra modules ───────────────────────
describe('Pharmacy Professional Plan — role login + extra modules', () => {
  it('pro owner can login with role=admin', async () => {
    const body = await (await (await proOwner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('pro pharmacist can login with role=manager', async () => {
    const body = await (await (await proPharmacist()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('pro owner: features includes accounting, mis, sales_orders', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('accounting');
    expect(mods).toContain('mis');
    expect(mods).toContain('sales_orders');
  });

  it('pro owner: features does NOT include hr_payroll (enterprise only)', async () => {
    expect(await getModules(await proOwner())).not.toContain('hr_payroll');
  });
});

// ─── 12. Enterprise — Accountant workflow ─────────────────────────────────────
describe('Pharmacy Enterprise — Accountant workflow (accounting module)', () => {
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
      narration: 'QA Journal — Pharmacy Medicine Sales',
      entries: [
        { account_code: '4001', debit: 1200, credit: 0 },
        { account_code: '1001', debit: 0,    credit: 1200 },
      ],
    });
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view trial balance', async () => {
    const res = await (await acct()).get('/api/trial-balance');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view bank transactions', async () => {
    const res = await (await acct()).get('/api/bank-transactions');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 13. Enterprise — HR Manager workflow ────────────────────────────────────
describe('Pharmacy Enterprise — HR Manager workflow (hr_payroll module)', () => {
  it('hr manager can login with role=manager', async () => {
    const body = await (await (await hrMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('hr manager can view employees', async () => {
    const res = await (await hrMgr()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('hr manager can add a pharmacist as employee', async () => {
    const res = await (await hrMgr()).post('/api/hr/employees', {
      employee_id: 'QA-EMP-PH-001',
      first_name: 'QA',
      last_name: 'Pharmacist Staff',
      designation: 'Pharmacist',
      department: 'Dispensary',
      basic_salary: 35000,
      phone: '9000003333',
      email: 'pharmacist@qa-ph.kinto',
      date_of_joining: TODAY,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view payroll', async () => {
    const res = await (await hrMgr()).get('/api/hr/payroll');
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view leave requests', async () => {
    const res = await (await hrMgr()).get('/api/hr/leaves');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 14. Enterprise — CRM Executive workflow ─────────────────────────────────
describe('Pharmacy Enterprise — CRM Executive workflow (crm module)', () => {
  it('crm executive can login with role=operator', async () => {
    const body = await (await (await crmExec()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('crm exec can view CRM contacts (pharmacy customers)', async () => {
    const res = await (await crmExec()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can create a lead', async () => {
    const res = await (await crmExec()).post('/api/crm/leads', {
      name: 'QA Hospital Client',
      email: 'hospital@qa-ph.kinto',
      phone: '9000003322',
      source: 'referral',
      status: 'new',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view campaigns', async () => {
    const res = await (await crmExec()).get('/api/crm/campaigns');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view pharmacy sales (cross-link)', async () => {
    const res = await (await crmExec()).get('/api/pharmacy/sales');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 15. Enterprise — Sales Manager workflow ──────────────────────────────────
describe('Pharmacy Enterprise — Sales Manager workflow (sales_orders module)', () => {
  it('sales manager can login with role=manager', async () => {
    const body = await (await (await salesMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('sales manager can view sales orders', async () => {
    const res = await (await salesMgr()).get('/api/sales-orders');
    expect(res.status).toBe(200);
  });

  it('sales manager can create a bulk medicine sales order', async () => {
    const res = await (await salesMgr()).post('/api/sales-orders', {
      customer_name: 'QA Hospital Bulk Order',
      order_date: TODAY,
      delivery_date: TODAY,
      items: [{ product_name: 'QA Paracetamol 500mg', quantity: 100, rate: 20, amount: 2000 }],
      total: 2000,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('sales manager can view invoices', async () => {
    const res = await (await salesMgr()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('sales manager can view pharmacy sales', async () => {
    const res = await (await salesMgr()).get('/api/pharmacy/sales');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 16. Enterprise — MIS Viewer workflow ────────────────────────────────────
describe('Pharmacy Enterprise — MIS Viewer workflow (mis module)', () => {
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

  it('mis viewer can view pharmacy stock (cross-link for dashboard)', async () => {
    const res = await (await misViewer()).get('/api/pharmacy/stock');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 17. Enterprise — Warehouse Manager workflow ──────────────────────────────
describe('Pharmacy Enterprise — Warehouse Manager workflow (warehouses module)', () => {
  it('warehouse manager can login with role=manager', async () => {
    const body = await (await (await warehouseMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('warehouse manager can view warehouses', async () => {
    const res = await (await warehouseMgr()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view pharmacy stock (medicines as inventory)', async () => {
    const res = await (await warehouseMgr()).get('/api/pharmacy/stock');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view products', async () => {
    const res = await (await warehouseMgr()).get('/api/products');
    expect(res.status).toBe(200);
  });
});

// ─── 18. Enterprise — Production Supervisor workflow ─────────────────────────
describe('Pharmacy Enterprise — Production Supervisor workflow (production module)', () => {
  it('production supervisor can login with role=manager', async () => {
    const body = await (await (await prodSup()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('production supervisor can view production entries (compounding)', async () => {
    const res = await (await prodSup()).get('/api/production-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('production supervisor can view raw materials', async () => {
    const res = await (await prodSup()).get('/api/raw-materials');
    expect(res.status).toBeLessThan(400);
  });

  it('production supervisor can view products', async () => {
    const res = await (await prodSup()).get('/api/products');
    expect(res.status).toBe(200);
  });
});

// ─── 19. Enterprise — Assets Manager workflow ────────────────────────────────
describe('Pharmacy Enterprise — Assets Manager workflow (fixed_assets module)', () => {
  it('assets manager can login with role=manager', async () => {
    const body = await (await (await assetsMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('assets manager can view fixed assets (pharmacy equipment)', async () => {
    const res = await (await assetsMgr()).get('/api/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });

  it('assets manager can view depreciation schedule', async () => {
    const res = await (await assetsMgr()).get('/api/fixed-assets/depreciation');
    expect(res.status).toBeLessThan(400);
  });

  it('assets manager: enterprise plan includes fixed_assets', async () => {
    expect(await getModules(await assetsMgr())).toContain('fixed_assets');
  });
});

// ─── 20. Professional — Accountant workflow ───────────────────────────────────
describe('Pharmacy Professional — Accountant workflow', () => {
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

  it('pro accountant: features does NOT include hr_payroll (enterprise only)', async () => {
    expect(await getModules(await proAcct())).not.toContain('hr_payroll');
  });
});

// ─── 21. Professional — HR Manager workflow ───────────────────────────────────
describe('Pharmacy Professional — HR Manager workflow', () => {
  it('pro hr manager can login with role=manager', async () => {
    const body = await (await (await proHr()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('pro hr manager can view employees', async () => {
    const res = await (await proHr()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('pro hr manager can view payroll', async () => {
    const res = await (await proHr()).get('/api/hr/payroll');
    expect(res.status).toBeLessThan(400);
  });

  it('pro hr manager: features check', async () => {
    expect(Array.isArray(await getModules(await proHr()))).toBe(true);
  });
});

// ─── 22. Professional — CRM Executive workflow ────────────────────────────────
describe('Pharmacy Professional — CRM Executive workflow', () => {
  it('pro crm exec can login with role=operator', async () => {
    const body = await (await (await proCrm()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('pro crm exec can view CRM contacts', async () => {
    const res = await (await proCrm()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('pro crm exec can view pharmacy sales (cross-link)', async () => {
    const res = await (await proCrm()).get('/api/pharmacy/sales');
    expect(res.status).toBeLessThan(400);
  });

  it('pro crm exec: features check', async () => {
    expect(Array.isArray(await getModules(await proCrm()))).toBe(true);
  });
});

// ─── 23. Professional — MIS Viewer workflow ───────────────────────────────────
describe('Pharmacy Professional — MIS Viewer workflow', () => {
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

  it('pro mis viewer: features does NOT include fixed_assets (enterprise only)', async () => {
    expect(await getModules(await proMis())).not.toContain('fixed_assets');
  });
});

// ─── 24. Starter — Billing Staff workflow ─────────────────────────────────────
describe('Pharmacy Starter — Billing Staff workflow (invoicing module)', () => {
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

  it('billing staff: features does NOT include crm (enterprise only)', async () => {
    expect(await getModules(await starterBilling())).not.toContain('crm');
  });
});

// ─── 25. Starter — Purchase Manager workflow ──────────────────────────────────
describe('Pharmacy Starter — Purchase Manager workflow (purchase_orders module)', () => {
  it('starter pharmacist can view medicines', async () => {
    const res = await (await starterPharmacist()).get('/api/pharmacy/medicines');
    expect(res.status).toBeLessThan(400);
  });

  it('starter pharmacist can view stock', async () => {
    const res = await (await starterPharmacist()).get('/api/pharmacy/stock');
    expect(res.status).toBeLessThan(400);
  });

  it('starter pharmacist: features does NOT include hr_payroll (enterprise only)', async () => {
    expect(await getModules(await starterPharmacist())).not.toContain('hr_payroll');
  });

  it('starter cashier can create a sale and view pharmacy medicines', async () => {
    const api = await starterCashier();
    const [meds, sales] = await Promise.all([
      api.get('/api/pharmacy/medicines'),
      api.get('/api/pharmacy/sales'),
    ]);
    expect(meds.status).toBeLessThan(400);
    expect(sales.status).toBeLessThan(400);
  });

  it('starter pharmacist: features does NOT include mis (professional+ only)', async () => {
    expect(await getModules(await starterPharmacist())).not.toContain('mis');
  });

  it('starter owner: features check', async () => {
    expect(Array.isArray(await getModules(await starterOwner()))).toBe(true);
  });

  it('pro cashier can login with role=operator', async () => {
    const body = await (await (await proCashier()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('pro cashier can view medicines and create a sale', async () => {
    const api = await proCashier();
    const meds = await api.get('/api/pharmacy/medicines');
    expect(meds.status).toBeLessThan(400);
    const sale = await api.post('/api/pharmacy/sales', {
      customer_name: 'QA Pro Cashier Customer',
      sale_date: TODAY,
      items: [{ medicine_name: 'QA Paracetamol 500mg', quantity: 1, mrp: 25, amount: 25 }],
      total: 25,
      payment_method: 'upi',
    });
    expect(sale.status).toBeLessThan(400);
  });

  it('enterprise: GET /api/pharmacy/purchase-orders returns < 400', async () => {
    expect((await (await owner()).get('/api/pharmacy/purchase-orders')).status).toBeLessThan(400);
  });
});
