/**
 * Test 27 — NGO ERP: Role-based workflow validation
 *
 * Plans:
 *   ngo_starter      — invoicing, expenses, documents, ngo, masters
 *   ngo_professional — + purchase_orders, accounting, mis, whatsapp
 *   ngo_enterprise   — + crm, hr_payroll, projects, fixed_assets, multi_currency,
 *                        approvals, api_hub, swach*
 *
 * Roles (enterprise tenant 9400):
 *   admin           → Executive Director
 *   manager         → Program Manager
 *   operator        → Field Worker / Data Entry
 *   reviewer        → Auditor / Donor Relationship
 *   accountsmanager → Finance Manager
 *
 * Professional tenant: 9421  Starter tenant: 9420
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, BASE } from '../helpers/api';

const TODAY = new Date().toISOString().split('T')[0];
const PW = 'Test@1234';

// ─── Enterprise logins (tenant 9400) ─────────────────────────────────────────
async function owner()        { return login('qa_ngo_owner',        PW); }
async function manager()      { return login('qa_ngo_manager',      PW); }
async function fieldWorker()  { return login('qa_ngo_field_worker', PW); }
async function donorMgr()     { return login('qa_ngo_donor_mgr',    PW); }
async function acct()         { return login('qa_ngo_acct',         PW); }
async function hrMgr()        { return login('qa_ngo_hr',           PW); }
async function crmExec()      { return login('qa_ngo_crm',          PW); }
async function salesMgr()     { return login('qa_ngo_sales',        PW); }
async function misViewer()    { return login('qa_ngo_mis',          PW); }
async function warehouseMgr() { return login('qa_ngo_wh',           PW); }
async function prodSup()      { return login('qa_ngo_prod',         PW); }
async function assetsMgr()    { return login('qa_ngo_assets',       PW); }

// ─── Professional logins (tenant 9421) ───────────────────────────────────────
async function proOwner()   { return login('qa_ngo_p_owner',   PW); }
async function proManager() { return login('qa_ngo_p_manager', PW); }
async function proAcct()    { return login('qa_ngo_p_acct',    PW); }
async function proHr()      { return login('qa_ngo_p_hr',      PW); }
async function proCrm()     { return login('qa_ngo_p_crm',     PW); }
async function proMis()     { return login('qa_ngo_p_mis',     PW); }

// ─── Starter logins (tenant 9420) ────────────────────────────────────────────
async function starterOwner()       { return login('qa_ngo_s_owner',       PW); }
async function starterManager()     { return login('qa_ngo_s_manager',     PW); }
async function starterFieldWorker() { return login('qa_ngo_s_field_worker',PW); }
async function starterBilling()     { return login('qa_ngo_s_billing',     PW); }

async function getModules(api: Awaited<ReturnType<typeof login>>): Promise<string[]> {
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  const body = await res.json() as { modules: string[] };
  return body.modules;
}

// ─── 1. Role Setup (admin/owner) — create core domain objects ─────────────────
describe('NGO Role Setup (admin/owner — enterprise)', () => {
  it('owner can login with role=admin', async () => {
    const body = await (await (await owner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('owner can view all core NGO APIs', async () => {
    const api = await owner();
    const results = await Promise.all([
      '/api/ngo/donors',
      '/api/ngo/donations',
      '/api/ngo/projects',
      '/api/ngo/beneficiaries',
    ].map(s => api.get(s).then(r => ({ s, status: r.status }))));
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });

  it('owner can create an NGO donor', async () => {
    const res = await (await owner()).post('/api/ngo/donors', {
      name: 'QA Donor Foundation',
      type: 'institutional',
      pan: 'ABCDE1234F',
      email: 'donor@qa-ngo.test',
      phone: '9000004001',
      address: '1 Donor Street, Mumbai',
      is_active: true,
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    expect(body.id ?? body.donor?.id).toBeTruthy();
  });

  it('owner can create an NGO project', async () => {
    const res = await (await owner()).post('/api/ngo/projects', {
      name: 'QA Community Water Project',
      description: 'QA test project for water access',
      budget: 500000,
      start_date: TODAY,
      end_date: '2027-03-31',
      status: 'active',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('owner can register a beneficiary', async () => {
    const res = await (await owner()).post('/api/ngo/beneficiaries', {
      name: 'QA Beneficiary Family',
      location: 'Rural Maharashtra',
      category: 'water_access',
      registered_date: TODAY,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view grants', async () => {
    const res = await (await owner()).get('/api/ngo/grants');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view fund accounts', async () => {
    const res = await (await owner()).get('/api/ngo/fund-accounts');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view 80G certificates', async () => {
    const res = await (await owner()).get('/api/ngo/80g-certificates');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can generate a 80G certificate', async () => {
    const res = await (await owner()).post('/api/ngo/80g-certificates', {
      donor_name: 'QA 80G Donor',
      donation_amount: 25000,
      donation_date: TODAY,
      pan: 'DONOR1234A',
      financial_year: '2025-26',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view FCRA returns', async () => {
    const res = await (await owner()).get('/api/ngo/fcra-returns');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view campaigns', async () => {
    const res = await (await owner()).get('/api/ngo/campaigns');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can create a fundraising campaign', async () => {
    const res = await (await owner()).post('/api/ngo/campaigns', {
      name: 'QA Monsoon Fund Drive',
      target_amount: 1000000,
      start_date: TODAY,
      end_date: '2025-10-31',
      status: 'active',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('owner: enterprise plan includes ngo module', async () => {
    expect(await getModules(await owner())).toContain('ngo');
  });

  it('owner can view invoices (billing module)', async () => {
    const res = await (await owner()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('owner can view expenses (project costs)', async () => {
    const res = await (await owner()).get('/api/expenses');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view purchase orders (NGO procurement)', async () => {
    const res = await (await owner()).get('/api/purchase-orders');
    expect(res.status).toBe(200);
  });
});

// ─── 2. Role: Program Manager (manager) workflow ──────────────────────────────
describe('NGO Role: Program Manager (manager)', () => {
  it('manager can login with role=manager', async () => {
    const body = await (await (await manager()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('manager can view and manage projects', async () => {
    const res = await (await manager()).get('/api/ngo/projects');
    expect(res.status).toBeLessThan(400);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it('manager can create a donation record', async () => {
    const res = await (await manager()).post('/api/ngo/donations', {
      donor_name: 'QA Test Donor',
      amount: 10000,
      donation_date: TODAY,
      purpose: 'water_project',
      payment_mode: 'bank_transfer',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('manager can view beneficiaries', async () => {
    const res = await (await manager()).get('/api/ngo/beneficiaries');
    expect(res.status).toBeLessThan(400);
  });

  it('manager can access expenses (project expenditure)', async () => {
    const res = await (await manager()).get('/api/expenses');
    expect(res.status).toBeLessThan(400);
  });

  it('manager can view grants', async () => {
    const res = await (await manager()).get('/api/ngo/grants');
    expect(res.status).toBeLessThan(400);
  });

  it('manager can view campaigns', async () => {
    const res = await (await manager()).get('/api/ngo/campaigns');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 3. Role: Field Worker (operator) workflow ────────────────────────────────
describe('NGO Role: Field Worker (operator)', () => {
  it('field worker can login with role=operator', async () => {
    const body = await (await (await fieldWorker()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('field worker can view NGO projects', async () => {
    const res = await (await fieldWorker()).get('/api/ngo/projects');
    expect(res.status).toBeLessThan(400);
  });

  it('field worker can log a project expense', async () => {
    const res = await (await fieldWorker()).post('/api/expenses', {
      description: 'QA Field Travel Expense',
      amount: 1500,
      date: TODAY,
      category: 'travel',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('field worker can view beneficiaries', async () => {
    const res = await (await fieldWorker()).get('/api/ngo/beneficiaries');
    expect(res.status).toBeLessThan(400);
  });

  it('field worker can register a new beneficiary', async () => {
    const res = await (await fieldWorker()).post('/api/ngo/beneficiaries', {
      name: 'QA Field Worker Beneficiary',
      location: 'Remote Village, MP',
      category: 'sanitation',
      registered_date: TODAY,
    });
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 4. Role: Donor Manager / Auditor (reviewer) workflow ─────────────────────
describe('NGO Role: Donor Manager / Auditor (reviewer)', () => {
  it('donor manager can login with role=reviewer', async () => {
    const body = await (await (await donorMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('donor manager can view donors', async () => {
    const res = await (await donorMgr()).get('/api/ngo/donors');
    expect(res.status).toBeLessThan(400);
  });

  it('donor manager can view donations', async () => {
    const res = await (await donorMgr()).get('/api/ngo/donations');
    expect(res.status).toBeLessThan(400);
  });

  it('donor manager can view grants', async () => {
    const res = await (await donorMgr()).get('/api/ngo/grants');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 5. Plan: ALL plans — core NGO module accessible ──────────────────────────
describe('NGO Plan: ALL plans — core NGO module accessible', () => {
  it('starter plan: includes ngo module', async () => {
    expect(await getModules(await starterOwner())).toContain('ngo');
  });

  it('professional plan: includes ngo module', async () => {
    expect(await getModules(await proOwner())).toContain('ngo');
  });

  it('enterprise plan: includes ngo module', async () => {
    expect(await getModules(await owner())).toContain('ngo');
  });

  it('all plans: core NGO APIs return < 400', async () => {
    const CORE = ['/api/ngo/donors', '/api/ngo/projects', '/api/ngo/donations'];
    for (const loginFn of [starterOwner, proOwner, owner]) {
      const api = await loginFn();
      const results = await Promise.all(CORE.map(s => api.get(s).then(r => ({ s, status: r.status }))));
      expect(results.filter(r => r.status >= 400)).toEqual([]);
    }
  });

  it('starter: GET /api/ngo/grants returns < 400', async () => {
    expect((await (await starterOwner()).get('/api/ngo/grants')).status).toBeLessThan(400);
  });

  it('professional: GET /api/ngo/beneficiaries returns < 400', async () => {
    expect((await (await proOwner()).get('/api/ngo/beneficiaries')).status).toBeLessThan(400);
  });

  it('enterprise: GET /api/ngo/fund-accounts returns < 400', async () => {
    expect((await (await owner()).get('/api/ngo/fund-accounts')).status).toBeLessThan(400);
  });

  it('enterprise: GET /api/ngo/campaigns returns < 400', async () => {
    expect((await (await owner()).get('/api/ngo/campaigns')).status).toBeLessThan(400);
  });

  it('enterprise: GET /api/ngo/80g-certificates returns < 400', async () => {
    expect((await (await owner()).get('/api/ngo/80g-certificates')).status).toBeLessThan(400);
  });
});

// ─── 6. Plan: ALL plans — invoicing / purchase_orders / basic_inventory ─────────
describe('NGO Plan: ALL plans — invoicing / purchase_orders / basic_inventory', () => {
  it('starter plan: includes invoicing and expenses', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('invoicing');
    expect(mods).toContain('expenses');
  });

  it('professional plan: includes invoicing and purchase_orders', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('invoicing');
    expect(mods).toContain('purchase_orders');
  });

  it('enterprise: GET /api/invoices returns 200', async () => {
    expect((await (await owner()).get('/api/invoices')).status).toBe(200);
  });

  it('enterprise: GET /api/purchase-orders returns 200', async () => {
    expect((await (await owner()).get('/api/purchase-orders')).status).toBe(200);
  });
});

// ─── 7. Plan: Professional+ — accounting / mis / crm / hr_payroll ──────────────
describe('NGO Plan: Professional+ — accounting / mis / crm / hr_payroll', () => {
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

// ─── 8. Plan: Enterprise only — production / warehouses / fixed_assets ──────────
describe('NGO Plan: Enterprise only — production / warehouses / fixed_assets', () => {
  it('professional plan: does NOT include fixed_assets', async () => {
    expect(await getModules(await proOwner())).not.toContain('fixed_assets');
  });

  it('enterprise plan: includes fixed_assets', async () => {
    expect(await getModules(await owner())).toContain('fixed_assets');
  });

  it('enterprise plan: includes api_hub', async () => {
    expect(await getModules(await owner())).toContain('api_hub');
  });

  it('enterprise plan: includes multi_currency', async () => {
    expect(await getModules(await owner())).toContain('multi_currency');
  });
});

// ─── 9. Cross-role: Data created by one role visible to others ─────────────────
describe('NGO Cross-role: Data created by one role visible to others', () => {
  it('donor created by owner is visible to donor manager', async () => {
    const ownerApi    = await owner();
    const donorMgrApi = await donorMgr();
    await ownerApi.post('/api/ngo/donors', {
      name: 'QA Cross-Role Donor',
      type: 'individual',
      email: 'cross@qa-ngo.test',
      phone: '9000004099',
      is_active: true,
    });
    const listRes = await donorMgrApi.get('/api/ngo/donors');
    expect(listRes.status).toBeLessThan(400);
    const list = await listRes.json() as any[];
    expect(Array.isArray(list)).toBe(true);
  });

  it('project created by manager is visible to field worker', async () => {
    const mgrApi    = await manager();
    const fieldApi  = await fieldWorker();
    await mgrApi.post('/api/ngo/projects', {
      name: 'QA Cross Visibility Project',
      budget: 100000,
      start_date: TODAY,
      status: 'active',
    });
    const listRes = await fieldApi.get('/api/ngo/projects');
    expect(listRes.status).toBeLessThan(400);
  });

  it('expense logged by field worker is visible to finance manager', async () => {
    const fieldApi = await fieldWorker();
    const acctApi  = await acct();
    await fieldApi.post('/api/expenses', {
      description: 'QA Cross Expense',
      amount: 800,
      date: TODAY,
      category: 'supplies',
    });
    const listRes = await acctApi.get('/api/expenses');
    expect(listRes.status).toBeLessThan(400);
  });

  it('donation recorded by manager is visible to admin', async () => {
    const mgrApi   = await manager();
    const ownerApi = await owner();
    await mgrApi.post('/api/ngo/donations', {
      donor_name: 'QA Cross Donation Donor',
      amount: 5000,
      donation_date: TODAY,
      payment_mode: 'cheque',
    });
    const listRes = await ownerApi.get('/api/ngo/donations');
    expect(listRes.status).toBeLessThan(400);
  });
});

// ─── 10. Starter Plan — role login + core workflow ────────────────────────────
describe('NGO Starter Plan — role login + core workflow', () => {
  it('starter owner can login with role=admin', async () => {
    const body = await (await (await starterOwner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('starter manager can login with role=manager', async () => {
    const body = await (await (await starterManager()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('starter field worker can login with role=operator', async () => {
    const body = await (await (await starterFieldWorker()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('starter: core NGO APIs return < 400', async () => {
    const api = await starterOwner();
    const results = await Promise.all([
      '/api/ngo/donors',
      '/api/ngo/projects',
    ].map(s => api.get(s).then(r => ({ s, status: r.status }))));
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });
});

// ─── 11. Professional Plan — role login + extra modules ───────────────────────
describe('NGO Professional Plan — role login + extra modules', () => {
  it('pro owner can login with role=admin', async () => {
    const body = await (await (await proOwner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('pro manager can login with role=manager', async () => {
    const body = await (await (await proManager()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('pro owner: features includes accounting and mis', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('accounting');
    expect(mods).toContain('mis');
  });

  it('pro owner: features does NOT include fixed_assets (enterprise only)', async () => {
    expect(await getModules(await proOwner())).not.toContain('fixed_assets');
  });
});

// ─── 12. Enterprise — Accountant workflow ─────────────────────────────────────
describe('NGO Enterprise — Accountant workflow (accounting module)', () => {
  it('accountant can login with role=accountsmanager', async () => {
    const body = await (await (await acct()).get('/api/user')).json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('accountant can view chart of accounts', async () => {
    const res = await (await acct()).get('/api/chart-of-accounts');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can create a journal entry (grant receipt)', async () => {
    const res = await (await acct()).post('/api/journal-entries', {
      date: TODAY,
      narration: 'QA Journal — NGO Grant Receipt',
      entries: [
        { account_code: '1001', debit: 50000, credit: 0 },
        { account_code: '4001', debit: 0,     credit: 50000 },
      ],
    });
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view trial balance', async () => {
    const res = await (await acct()).get('/api/trial-balance');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view fund accounts', async () => {
    const res = await (await acct()).get('/api/ngo/fund-accounts');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 13. Enterprise — HR Manager workflow ────────────────────────────────────
describe('NGO Enterprise — HR Manager workflow (hr_payroll module)', () => {
  it('hr manager can login with role=manager', async () => {
    const body = await (await (await hrMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('hr manager can view employees', async () => {
    const res = await (await hrMgr()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('hr manager can add a field officer as employee', async () => {
    const res = await (await hrMgr()).post('/api/hr/employees', {
      employee_id: 'QA-EMP-NGO-001',
      first_name: 'QA',
      last_name: 'Field Officer',
      designation: 'Field Officer',
      department: 'Programs',
      basic_salary: 20000,
      phone: '9000004444',
      email: 'officer@qa-ngo.kinto',
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
describe('NGO Enterprise — CRM Executive workflow (crm module)', () => {
  it('crm executive can login with role=operator', async () => {
    const body = await (await (await crmExec()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('crm exec can view CRM contacts (donors as contacts)', async () => {
    const res = await (await crmExec()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can create a lead (potential donor)', async () => {
    const res = await (await crmExec()).post('/api/crm/leads', {
      name: 'QA Potential Donor',
      email: 'potentialdonor@qa-ngo.kinto',
      phone: '9000004422',
      source: 'event',
      status: 'new',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view campaigns', async () => {
    const res = await (await crmExec()).get('/api/crm/campaigns');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view NGO donors (cross-link)', async () => {
    const res = await (await crmExec()).get('/api/ngo/donors');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 15. Enterprise — Sales Manager workflow ──────────────────────────────────
describe('NGO Enterprise — Sales Manager workflow (sales_orders module)', () => {
  it('sales manager can login with role=manager', async () => {
    const body = await (await (await salesMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('sales manager can view donations (grant pipeline)', async () => {
    const res = await (await salesMgr()).get('/api/ngo/donations');
    expect(res.status).toBeLessThan(400);
  });

  it('sales manager can view NGO campaigns', async () => {
    const res = await (await salesMgr()).get('/api/ngo/campaigns');
    expect(res.status).toBeLessThan(400);
  });

  it('sales manager can view invoices', async () => {
    const res = await (await salesMgr()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('sales manager can view grants', async () => {
    const res = await (await salesMgr()).get('/api/ngo/grants');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 16. Enterprise — MIS Viewer workflow ────────────────────────────────────
describe('NGO Enterprise — MIS Viewer workflow (mis module)', () => {
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

  it('mis viewer can view NGO donation stats (cross-link)', async () => {
    const res = await (await misViewer()).get('/api/ngo/donations');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 17. Enterprise — Warehouse Manager workflow ──────────────────────────────
describe('NGO Enterprise — Warehouse Manager workflow (warehouses module)', () => {
  it('warehouse manager can login with role=manager', async () => {
    const body = await (await (await warehouseMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('warehouse manager can view warehouses (NGO supply stores)', async () => {
    const res = await (await warehouseMgr()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view products (NGO supplies)', async () => {
    const res = await (await warehouseMgr()).get('/api/products');
    expect(res.status).toBe(200);
  });

  it('warehouse manager can view purchase orders', async () => {
    const res = await (await warehouseMgr()).get('/api/purchase-orders');
    expect(res.status).toBe(200);
  });
});

// ─── 18. Enterprise — Production Supervisor workflow ─────────────────────────
describe('NGO Enterprise — Production Supervisor workflow (production module)', () => {
  it('production supervisor can login with role=manager', async () => {
    const body = await (await (await prodSup()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('production supervisor can view production entries (livelihood programs)', async () => {
    const res = await (await prodSup()).get('/api/production-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('production supervisor can view raw materials (program materials)', async () => {
    const res = await (await prodSup()).get('/api/raw-materials');
    expect(res.status).toBeLessThan(400);
  });

  it('production supervisor can view products', async () => {
    const res = await (await prodSup()).get('/api/products');
    expect(res.status).toBe(200);
  });
});

// ─── 19. Enterprise — Assets Manager workflow ────────────────────────────────
describe('NGO Enterprise — Assets Manager workflow (fixed_assets module)', () => {
  it('assets manager can login with role=manager', async () => {
    const body = await (await (await assetsMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('assets manager can view fixed assets (vehicles, equipment)', async () => {
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
describe('NGO Professional — Accountant workflow', () => {
  it('pro accountant can login with role=accountsmanager', async () => {
    const body = await (await (await proAcct()).get('/api/user')).json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('pro accountant can view journal entries', async () => {
    const res = await (await proAcct()).get('/api/journal-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('pro accountant can view fund accounts', async () => {
    const res = await (await proAcct()).get('/api/ngo/fund-accounts');
    expect(res.status).toBeLessThan(400);
  });

  it('pro accountant: features does NOT include fixed_assets (enterprise only)', async () => {
    expect(await getModules(await proAcct())).not.toContain('fixed_assets');
  });
});

// ─── 21. Professional — HR Manager workflow ───────────────────────────────────
describe('NGO Professional — HR Manager workflow', () => {
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

  it('pro hr manager: features does NOT include fixed_assets (enterprise only)', async () => {
    expect(await getModules(await proHr())).not.toContain('fixed_assets');
  });
});

// ─── 22. Professional — CRM Executive workflow ────────────────────────────────
describe('NGO Professional — CRM Executive workflow', () => {
  it('pro crm exec can login with role=operator', async () => {
    const body = await (await (await proCrm()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('pro crm exec can view CRM contacts', async () => {
    const res = await (await proCrm()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('pro crm exec can view NGO donors (cross-link)', async () => {
    const res = await (await proCrm()).get('/api/ngo/donors');
    expect(res.status).toBeLessThan(400);
  });

  it('pro crm exec: features does NOT include fixed_assets (enterprise only)', async () => {
    expect(await getModules(await proCrm())).not.toContain('fixed_assets');
  });
});

// ─── 23. Professional — MIS Viewer workflow ───────────────────────────────────
describe('NGO Professional — MIS Viewer workflow', () => {
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
describe('NGO Starter — Billing Staff workflow (invoicing module)', () => {
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
describe('NGO Starter — Purchase Manager workflow', () => {
  it('starter manager can view donors', async () => {
    const res = await (await starterManager()).get('/api/ngo/donors');
    expect(res.status).toBeLessThan(400);
  });

  it('starter manager can view projects', async () => {
    const res = await (await starterManager()).get('/api/ngo/projects');
    expect(res.status).toBeLessThan(400);
  });

  it('starter field worker: features does NOT include hr_payroll (enterprise only)', async () => {
    expect(await getModules(await starterFieldWorker())).not.toContain('hr_payroll');
  });

  it('starter owner can view NGO grants and 80G certificates', async () => {
    const api = await starterOwner();
    const [grants, certs] = await Promise.all([
      api.get('/api/ngo/grants'),
      api.get('/api/ngo/80g-certificates'),
    ]);
    expect(grants.status).toBeLessThan(400);
    expect(certs.status).toBeLessThan(400);
  });

  it('starter field worker: features does NOT include mis (professional+ only)', async () => {
    expect(await getModules(await starterFieldWorker())).not.toContain('mis');
  });

  it('starter owner: features does NOT include fixed_assets (enterprise only)', async () => {
    expect(await getModules(await starterOwner())).not.toContain('fixed_assets');
  });

  it('pro manager can create a donation and view grants', async () => {
    const api = await proManager();
    const donation = await api.post('/api/ngo/donations', {
      donor_name: 'QA Pro Donor',
      amount: 20000,
      donation_date: TODAY,
      payment_mode: 'online',
    });
    expect(donation.status).toBeLessThan(400);
    const grants = await api.get('/api/ngo/grants');
    expect(grants.status).toBeLessThan(400);
  });

  it('starter billing can view invoices and expenses', async () => {
    const api = await starterBilling();
    const [inv, exp] = await Promise.all([
      api.get('/api/invoices'),
      api.get('/api/expenses'),
    ]);
    expect(inv.status).toBe(200);
    expect(exp.status).toBeLessThan(400);
  });

  it('enterprise: GET /api/ngo/fcra-returns returns < 400', async () => {
    expect((await (await owner()).get('/api/ngo/fcra-returns')).status).toBeLessThan(400);
  });
});
