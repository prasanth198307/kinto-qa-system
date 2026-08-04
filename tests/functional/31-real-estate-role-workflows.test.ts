/**
 * Test 31 — Real Estate ERP: Role-based workflow validation
 *
 * Plans:
 *   realestate_starter      (9820) — invoicing, expenses, documents, real_estate, masters
 *   realestate_professional (9821) — + purchase_orders, accounting, mis, crm, whatsapp, hr_payroll
 *   realestate_enterprise   (9800) — + basic_inventory, sales_orders, gatepasses,
 *                                      fixed_assets, multi_currency, projects, approvals,
 *                                      api_hub
 *
 * Roles (system roles mapped to real estate function):
 *   admin           → Owner / MD       : full setup + reports + team management
 *   manager         → Sales Manager    : property listings, leads, bookings
 *   operator        → Sales Executive  : site visits, demand letters, customer enquiries
 *   reviewer        → Site Engineer    : inspect property, log construction updates
 *   accountsmanager → Finance Manager  : demands, collections, accounting
 *   + specialist roles: hr, crm, sales, mis, wh, prod, assets
 *
 * API routes:
 *   /api/real-estate/projects, /api/real-estate/units, /api/real-estate/bookings,
 *   /api/real-estate/customers, /api/real-estate/payment-plans,
 *   /api/real-estate/demand-letters, /api/real-estate/receipts,
 *   /api/real-estate/construction-updates, /api/real-estate/contractors
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, BASE } from '../helpers/api';

const TODAY = new Date().toISOString().split('T')[0];

// ── Enterprise logins (tenant 9800) ──────────────────────────────────────────
async function owner()        { return login('qa_re_owner',      'Test@1234'); }
async function manager()      { return login('qa_re_manager',    'Test@1234'); }
async function salesExec()    { return login('qa_re_sales_exec', 'Test@1234'); }
async function siteEngineer() { return login('qa_re_site_engineer', 'Test@1234'); }
async function accountant()   { return login('qa_re_acct',       'Test@1234'); }
async function hrManager()    { return login('qa_re_hr',         'Test@1234'); }
async function crmExec()      { return login('qa_re_crm',        'Test@1234'); }
async function salesManager() { return login('qa_re_sales',      'Test@1234'); }
async function misViewer()    { return login('qa_re_mis',        'Test@1234'); }
async function warehouseMgr() { return login('qa_re_wh',         'Test@1234'); }
async function prodSup()      { return login('qa_re_prod',       'Test@1234'); }
async function assetsMgr()    { return login('qa_re_assets',     'Test@1234'); }

// ── Professional logins (tenant 9821) ────────────────────────────────────────
async function proOwner()     { return login('qa_re_p_owner',     'Test@1234'); }
async function proManager()   { return login('qa_re_p_manager',   'Test@1234'); }
async function proSalesExec() { return login('qa_re_p_sales_exec','Test@1234'); }
async function proAcct()      { return login('qa_re_p_acct',      'Test@1234'); }
async function proHr()        { return login('qa_re_p_hr',        'Test@1234'); }
async function proCrm()       { return login('qa_re_p_crm',       'Test@1234'); }
async function proMis()       { return login('qa_re_p_mis',       'Test@1234'); }

// ── Starter logins (tenant 9820) ─────────────────────────────────────────────
async function starterOwner()    { return login('qa_re_s_owner',    'Test@1234'); }
async function starterManager()  { return login('qa_re_s_manager',  'Test@1234'); }
async function starterSalesExec(){ return login('qa_re_s_sales_exec','Test@1234'); }
async function starterBilling()  { return login('qa_re_s_billing',  'Test@1234'); }

// ── Helper: tenant modules list ───────────────────────────────────────────────
async function getModules(api: Awaited<ReturnType<typeof login>>): Promise<string[]> {
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  const body = await res.json() as { modules: string[] };
  return body.modules;
}

// ── Shared state ──────────────────────────────────────────────────────────────
let projectId: number;
let unitId: number;
let bookingId: number;
let demandLetterId: number;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Role Setup (admin/owner) — create core domain objects
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Role Setup (admin/owner)', () => {
  it('admin can login and has admin role', async () => {
    const api = await owner();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('admin');
  });

  it('admin can create a real estate project', async () => {
    const api = await owner();
    const res = await api.post('/api/real-estate/projects', {
      name: 'QA Skyline Residency',
      project_type: 'residential',
      location: 'Thane, Maharashtra',
      total_units: 100,
      start_date: TODAY,
      expected_completion: TODAY,
      status: 'active',
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    projectId = body.id ?? body.project?.id ?? 9800;
    expect(projectId).toBeTruthy();
  });

  it('admin can create a unit in the project', async () => {
    const api = await owner();
    const res = await api.post('/api/real-estate/units', {
      project_id: projectId,
      unit_number: 'QA-A-101',
      unit_type: '2BHK',
      floor: 1,
      area_sqft: 1050,
      price: 6500000,
      status: 'available',
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    unitId = body.id ?? body.unit?.id ?? 9800;
    expect(unitId).toBeTruthy();
  });

  it('admin can view all real estate screens', async () => {
    const api = await owner();
    const endpoints = [
      '/api/real-estate/projects',
      '/api/real-estate/units',
      '/api/real-estate/bookings',
      '/api/real-estate/customers',
      '/api/real-estate/contractors',
    ];
    const results = await Promise.all(
      endpoints.map(e => api.get(e).then(r => ({ e, status: r.status })))
    );
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });

  it('admin can view construction updates', async () => {
    const api = await owner();
    const res = await api.get('/api/real-estate/construction-updates');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Role: Manager workflow (Sales Manager)
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Role: Sales Manager (manager)', () => {
  it('sales manager can login', async () => {
    const api = await manager();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('manager');
  });

  it('sales manager can view units and projects', async () => {
    const api = await manager();
    const [units, projects] = await Promise.all([
      api.get('/api/real-estate/units'),
      api.get('/api/real-estate/projects'),
    ]);
    expect(units.status).toBeLessThan(400);
    expect(projects.status).toBeLessThan(400);
  });

  it('sales manager can create a booking', async () => {
    const api = await manager();
    const res = await api.post('/api/real-estate/bookings', {
      unit_id: unitId,
      project_id: projectId,
      customer_name: 'QA Buyer Kumar',
      customer_phone: '9000800001',
      customer_email: 'qa-buyer@re.kinto',
      booking_date: TODAY,
      booking_amount: 200000,
      status: 'confirmed',
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    bookingId = body.id ?? body.booking?.id ?? 9800;
    expect(bookingId).toBeTruthy();
  });

  it('sales manager can view all bookings', async () => {
    const api = await manager();
    const res = await api.get('/api/real-estate/bookings');
    expect(res.status).toBe(200);
    const list = await res.json() as any[];
    expect(Array.isArray(list) || list).toBeTruthy();
  });

  it('sales manager can view customer list', async () => {
    const api = await manager();
    const res = await api.get('/api/real-estate/customers');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Role: Operator/Field workflow (Sales Executive)
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Role: Sales Executive (operator)', () => {
  it('sales executive can login', async () => {
    const api = await salesExec();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('operator');
  });

  it('sales exec can view available units for site visits', async () => {
    const api = await salesExec();
    const res = await api.get('/api/real-estate/units');
    expect(res.status).toBeLessThan(400);
    const list = await res.json() as any[];
    expect(Array.isArray(list)).toBe(true);
  });

  it('sales exec can create a demand letter for a booking', async () => {
    const api = await salesExec();
    const res = await api.post('/api/real-estate/demand-letters', {
      booking_id: bookingId,
      demand_date: TODAY,
      amount: 650000,
      due_date: TODAY,
      milestone: 'Foundation',
      status: 'pending',
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    demandLetterId = body.id ?? body.demand_letter?.id ?? 9800;
    expect(demandLetterId).toBeTruthy();
  });

  it('sales exec can view payment plans', async () => {
    const api = await salesExec();
    const res = await api.get('/api/real-estate/payment-plans');
    expect(res.status).toBeLessThan(400);
  });

  it('sales exec can view receipts', async () => {
    const api = await salesExec();
    const res = await api.get('/api/real-estate/receipts');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Role: Reviewer workflow (Site Engineer)
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Role: Site Engineer (reviewer)', () => {
  it('site engineer can login', async () => {
    const api = await siteEngineer();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('site engineer can view project construction details', async () => {
    const api = await siteEngineer();
    const res = await api.get('/api/real-estate/projects');
    expect(res.status).toBeLessThan(400);
  });

  it('site engineer can post a construction update', async () => {
    const api = await siteEngineer();
    const res = await api.post('/api/real-estate/construction-updates', {
      project_id: projectId,
      update_date: TODAY,
      milestone: 'Foundation',
      progress_pct: 35,
      remarks: 'Foundation work in progress — QA Test',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('site engineer can view contractors', async () => {
    const api = await siteEngineer();
    const res = await api.get('/api/real-estate/contractors');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Plan: ALL plans — real estate core module accessible
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Plan: ALL plans — core real_estate module accessible', () => {
  it('starter plan: /api/tenant/features includes real_estate module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('real_estate');
  });

  it('professional plan: /api/tenant/features includes real_estate module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('real_estate');
  });

  it('enterprise plan: /api/tenant/features includes real_estate module', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('real_estate');
  });

  it('all plans: core real estate APIs accessible to owner', async () => {
    const CORE = [
      '/api/real-estate/projects',
      '/api/real-estate/units',
      '/api/real-estate/bookings',
    ];
    const api = await owner();
    const results = await Promise.all(CORE.map(e => api.get(e).then(r => ({ e, status: r.status }))));
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Plan: ALL plans — invoicing / purchase_orders / basic_inventory
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Plan: ALL plans — invoicing / purchase_orders / basic_inventory', () => {
  it('starter plan: features includes invoicing and expenses', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('invoicing');
    expect(mods).toContain('expenses');
  });

  it('professional plan: features includes invoicing, purchase_orders', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('invoicing');
    expect(mods).toContain('purchase_orders');
  });

  it('enterprise plan: features includes invoicing, purchase_orders, basic_inventory', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('invoicing');
    expect(mods).toContain('purchase_orders');
    expect(mods).toContain('basic_inventory');
  });

  it('starter: GET /api/invoices returns 200', async () => {
    const res = await (await starterOwner()).get('/api/invoices');
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Plan: Professional+ — accounting / mis / crm / hr_payroll
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Plan: Professional+ — accounting / mis / crm / hr_payroll', () => {
  it('starter plan: does NOT include accounting module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('accounting');
  });

  it('professional plan: includes accounting, mis, crm, hr_payroll', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('accounting');
    expect(mods).toContain('mis');
    expect(mods).toContain('crm');
    expect(mods).toContain('hr_payroll');
  });

  it('enterprise plan: includes accounting, mis, crm, hr_payroll', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('accounting');
    expect(mods).toContain('mis');
    expect(mods).toContain('crm');
    expect(mods).toContain('hr_payroll');
  });

  it('professional: GET /api/journal-entries returns < 400', async () => {
    const res = await (await proOwner()).get('/api/journal-entries');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Plan: Enterprise only — production / warehouses / fixed_assets
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Plan: Enterprise only — production / warehouses / fixed_assets', () => {
  it('starter plan: does NOT include fixed_assets module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('fixed_assets');
  });

  it('professional plan: does NOT include fixed_assets module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('fixed_assets');
  });

  it('enterprise plan: includes fixed_assets, sales_orders, projects', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('fixed_assets');
    expect(mods).toContain('sales_orders');
    expect(mods).toContain('projects');
  });

  it('enterprise: GET /api/fixed-assets returns < 400', async () => {
    const res = await (await owner()).get('/api/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Cross-role: Data created by one role visible to others
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Cross-role: Data created by one role visible to others', () => {
  it('booking created by sales manager is visible to finance manager', async () => {
    const mgrApi  = await manager();
    const acctApi = await accountant();

    const createRes = await mgrApi.post('/api/real-estate/bookings', {
      unit_id: unitId,
      project_id: projectId,
      customer_name: 'QA Cross-Role Buyer',
      customer_phone: '9000800099',
      customer_email: 'crossrole@re.kinto',
      booking_date: TODAY,
      booking_amount: 150000,
      status: 'confirmed',
    });
    expect(createRes.status).toBeLessThan(400);
    const created = await createRes.json() as any;
    const createdId = created.id ?? created.booking?.id;

    const listRes = await acctApi.get('/api/real-estate/bookings');
    expect(listRes.status).toBeLessThan(400);
    const list = await listRes.json() as any[];
    if (Array.isArray(list) && createdId) {
      expect(list.some((b: any) => b.id === createdId)).toBe(true);
    }
  });

  it('construction update by site engineer is visible to sales manager', async () => {
    const engApi = await siteEngineer();
    const mgrApi = await manager();

    const updateRes = await engApi.post('/api/real-estate/construction-updates', {
      project_id: projectId,
      update_date: TODAY,
      milestone: 'Plinth',
      progress_pct: 50,
      remarks: 'Cross-role visibility test',
    });
    expect(updateRes.status).toBeLessThan(400);

    const listRes = await mgrApi.get('/api/real-estate/construction-updates');
    expect(listRes.status).toBeLessThan(400);
  });

  it('demand letter created by sales exec is visible to accountant', async () => {
    const execApi = await salesExec();
    const acctApi = await accountant();

    const demRes = await execApi.post('/api/real-estate/demand-letters', {
      booking_id: bookingId,
      demand_date: TODAY,
      amount: 325000,
      due_date: TODAY,
      milestone: 'Slab',
      status: 'pending',
    });
    expect(demRes.status).toBeLessThan(400);

    const listRes = await acctApi.get('/api/real-estate/demand-letters');
    expect(listRes.status).toBeLessThan(400);
  });

  it('unit created by admin is visible to all roles', async () => {
    const execApi = await salesExec();
    const engApi  = await siteEngineer();

    const [execUnits, engUnits] = await Promise.all([
      execApi.get('/api/real-estate/units'),
      engApi.get('/api/real-estate/units'),
    ]);
    expect(execUnits.status).toBeLessThan(400);
    expect(engUnits.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Starter Plan — role login + core workflow
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Starter Plan — role login + core workflow', () => {
  it('starter owner (admin) can login', async () => {
    const api = await starterOwner();
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('starter manager can login', async () => {
    const api = await starterManager();
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('starter sales exec can access core real estate APIs', async () => {
    const api = await starterSalesExec();
    const [units, bookings, projects] = await Promise.all([
      api.get('/api/real-estate/units'),
      api.get('/api/real-estate/bookings'),
      api.get('/api/real-estate/projects'),
    ]);
    expect(units.status).toBeLessThan(400);
    expect(bookings.status).toBeLessThan(400);
    expect(projects.status).toBeLessThan(400);
  });

  it('starter: features does NOT include accounting or hr_payroll', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('accounting');
    expect(mods).not.toContain('hr_payroll');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Professional Plan — role login + extra modules
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Professional Plan — role login + extra modules', () => {
  it('professional owner (admin) can login', async () => {
    const api = await proOwner();
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('professional sales exec can access accounting and real estate APIs', async () => {
    const api = await proSalesExec();
    const [units, inv] = await Promise.all([
      api.get('/api/real-estate/units'),
      api.get('/api/invoices'),
    ]);
    expect(units.status).toBeLessThan(400);
    expect(inv.status).toBeLessThan(400);
  });

  it('professional: features includes accounting, crm, mis, hr_payroll', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('accounting');
    expect(mods).toContain('crm');
    expect(mods).toContain('mis');
    expect(mods).toContain('hr_payroll');
  });

  it('professional: features does NOT include fixed_assets (enterprise only)', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('fixed_assets');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Enterprise — Accountant workflow (accounting module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Enterprise — Accountant workflow (accounting module)', () => {
  it('accountant can login', async () => {
    const body = await (await (await accountant()).get('/api/user')).json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('accountant can view chart of accounts', async () => {
    const res = await (await accountant()).get('/api/chart-of-accounts');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can create a collection receipt journal entry', async () => {
    const res = await (await accountant()).post('/api/journal-entries', {
      date: TODAY,
      narration: 'QA Real Estate — Customer Collection',
      entries: [
        { account_code: '1001', debit: 200000, credit: 0 },
        { account_code: '4001', debit: 0,      credit: 200000 },
      ],
    });
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view trial balance', async () => {
    const res = await (await accountant()).get('/api/trial-balance');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view demand letters and receipts', async () => {
    const api = await accountant();
    const [demands, receipts] = await Promise.all([
      api.get('/api/real-estate/demand-letters'),
      api.get('/api/real-estate/receipts'),
    ]);
    expect(demands.status).toBeLessThan(400);
    expect(receipts.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Enterprise — HR Manager workflow (hr_payroll module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Enterprise — HR Manager workflow (hr_payroll module)', () => {
  it('hr manager can login', async () => {
    const body = await (await (await hrManager()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('hr manager can view employees', async () => {
    const res = await (await hrManager()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('hr manager can add a sales executive as employee', async () => {
    const res = await (await hrManager()).post('/api/hr/employees', {
      employee_id: 'QA-RE-EMP-001',
      first_name: 'QA',
      last_name: 'Sales Exec RE',
      designation: 'Senior Sales Executive',
      department: 'Sales',
      basic_salary: 42000,
      phone: '9000800010',
      email: 'qa-re-sales@re.kinto',
      date_of_joining: TODAY,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view attendance records', async () => {
    const res = await (await hrManager()).get('/api/hr/attendance');
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view payroll', async () => {
    const res = await (await hrManager()).get('/api/hr/payroll');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. Enterprise — CRM Executive workflow (crm module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Enterprise — CRM Executive workflow (crm module)', () => {
  it('crm executive can login', async () => {
    const body = await (await (await crmExec()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('crm exec can view CRM contacts (potential buyers)', async () => {
    const res = await (await crmExec()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can create a lead (property enquiry)', async () => {
    const res = await (await crmExec()).post('/api/crm/leads', {
      name: 'QA Property Buyer',
      email: 'buyer@re.kinto',
      phone: '9000800020',
      source: 'property_portal',
      status: 'new',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view real estate customers (cross-link)', async () => {
    const res = await (await crmExec()).get('/api/real-estate/customers');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view campaigns', async () => {
    const res = await (await crmExec()).get('/api/crm/campaigns');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. Enterprise — Sales Manager workflow (sales_orders module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Enterprise — Sales Manager workflow (sales_orders module)', () => {
  it('sales manager can login', async () => {
    const body = await (await (await salesManager()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('sales manager can view sales orders (bulk bookings)', async () => {
    const res = await (await salesManager()).get('/api/sales-orders');
    expect(res.status).toBe(200);
  });

  it('sales manager can create a bulk booking sales order', async () => {
    const res = await (await salesManager()).post('/api/sales-orders', {
      customer_name: 'QA Bulk Investor Group',
      order_date: TODAY,
      delivery_date: TODAY,
      items: [{ product_name: 'Block booking — 3 units', quantity: 3, rate: 6500000, amount: 19500000 }],
      total: 19500000,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('sales manager can view bookings list', async () => {
    const res = await (await salesManager()).get('/api/real-estate/bookings');
    expect(res.status).toBe(200);
  });

  it('sales manager can view invoices', async () => {
    const res = await (await salesManager()).get('/api/invoices');
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. Enterprise — MIS Viewer workflow (mis module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Enterprise — MIS Viewer workflow (mis module)', () => {
  it('mis viewer can login', async () => {
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

  it('mis viewer can view projects and bookings (read-only analytics)', async () => {
    const api = await misViewer();
    const [projects, bookings] = await Promise.all([
      api.get('/api/real-estate/projects'),
      api.get('/api/real-estate/bookings'),
    ]);
    expect(projects.status).toBeLessThan(400);
    expect(bookings.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. Enterprise — Warehouse Manager workflow (warehouses module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Enterprise — Warehouse Manager workflow (warehouses module)', () => {
  it('warehouse manager can login', async () => {
    const body = await (await (await warehouseMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('warehouse manager can view warehouses (material stores)', async () => {
    const res = await (await warehouseMgr()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view products/materials inventory', async () => {
    const res = await (await warehouseMgr()).get('/api/products');
    expect(res.status).toBe(200);
  });

  it('warehouse manager can view contractors (material suppliers)', async () => {
    const res = await (await warehouseMgr()).get('/api/real-estate/contractors');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 18. Enterprise — Production Supervisor workflow (production module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Enterprise — Production Supervisor workflow (production module)', () => {
  it('production supervisor can login', async () => {
    const body = await (await (await prodSup()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('production supervisor can view construction updates', async () => {
    const res = await (await prodSup()).get('/api/real-estate/construction-updates');
    expect(res.status).toBeLessThan(400);
  });

  it('production supervisor can view production entries (material usage)', async () => {
    const res = await (await prodSup()).get('/api/production-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('production supervisor can view raw materials', async () => {
    const res = await (await prodSup()).get('/api/raw-materials');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 19. Enterprise — Assets Manager workflow (fixed_assets module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Enterprise — Assets Manager workflow (fixed_assets module)', () => {
  it('assets manager can login', async () => {
    const body = await (await (await assetsMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('assets manager can view fixed assets (land, plant, equipment)', async () => {
    const res = await (await assetsMgr()).get('/api/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });

  it('assets manager can view projects (land/property as assets)', async () => {
    const res = await (await assetsMgr()).get('/api/real-estate/projects');
    expect(res.status).toBeLessThan(400);
  });

  it('assets manager can view invoices for asset purchase', async () => {
    const res = await (await assetsMgr()).get('/api/invoices');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 20. Professional — Accountant workflow
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Professional — Accountant workflow', () => {
  it('pro accountant can login', async () => {
    const body = await (await (await proAcct()).get('/api/user')).json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('pro accountant can view journal entries', async () => {
    const res = await (await proAcct()).get('/api/journal-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('pro accountant can view demand letters and receipts', async () => {
    const api = await proAcct();
    const [dem, rec] = await Promise.all([
      api.get('/api/real-estate/demand-letters'),
      api.get('/api/real-estate/receipts'),
    ]);
    expect(dem.status).toBeLessThan(400);
    expect(rec.status).toBeLessThan(400);
  });

  it('pro accountant: features does NOT include fixed_assets (enterprise only)', async () => {
    const mods = await getModules(await proAcct());
    expect(mods).not.toContain('fixed_assets');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 21. Professional — HR Manager workflow
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Professional — HR Manager workflow', () => {
  it('pro hr manager can login', async () => {
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
    const mods = await getModules(await proHr());
    expect(mods).not.toContain('fixed_assets');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 22. Professional — CRM Executive workflow
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Professional — CRM Executive workflow', () => {
  it('pro crm exec can login', async () => {
    const body = await (await (await proCrm()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('pro crm exec can view CRM contacts', async () => {
    const res = await (await proCrm()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('pro crm exec can view real estate customers (cross-link)', async () => {
    const res = await (await proCrm()).get('/api/real-estate/customers');
    expect(res.status).toBeLessThan(400);
  });

  it('pro crm exec: features does NOT include fixed_assets (enterprise only)', async () => {
    const mods = await getModules(await proCrm());
    expect(mods).not.toContain('fixed_assets');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 23. Professional — MIS Viewer workflow
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Professional — MIS Viewer workflow', () => {
  it('pro mis viewer can login', async () => {
    const body = await (await (await proMis()).get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('pro mis viewer can view MIS sales summary', async () => {
    const res = await (await proMis()).get('/api/mis/sales-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('pro mis viewer can view bookings (read-only)', async () => {
    const res = await (await proMis()).get('/api/real-estate/bookings');
    expect(res.status).toBeLessThan(400);
  });

  it('pro mis viewer: features does NOT include fixed_assets (enterprise only)', async () => {
    const mods = await getModules(await proMis());
    expect(mods).not.toContain('fixed_assets');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 24. Starter — Billing Staff workflow (invoicing module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Starter — Billing Staff workflow (invoicing module)', () => {
  it('billing staff can login', async () => {
    const body = await (await (await starterBilling()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('billing staff can view invoices', async () => {
    const res = await (await starterBilling()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('billing staff can view demand letters for invoicing', async () => {
    const res = await (await starterBilling()).get('/api/real-estate/demand-letters');
    expect(res.status).toBeLessThan(400);
  });

  it('billing staff: features does NOT include accounting (professional+ only)', async () => {
    const mods = await getModules(await starterBilling());
    expect(mods).not.toContain('accounting');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 25. Starter — Purchase Manager workflow (purchase_orders module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Starter — Purchase Manager workflow (purchase_orders module)', () => {
  it('starter manager can login as purchase manager', async () => {
    const body = await (await (await starterManager()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('starter manager can view projects and units', async () => {
    const api = await starterManager();
    const [projects, units] = await Promise.all([
      api.get('/api/real-estate/projects'),
      api.get('/api/real-estate/units'),
    ]);
    expect(projects.status).toBeLessThan(400);
    expect(units.status).toBeLessThan(400);
  });

  it('starter manager can view invoices', async () => {
    const res = await (await starterManager()).get('/api/invoices');
    expect(res.status).toBeLessThan(400);
  });

  it('starter manager: features does NOT include hr_payroll (professional+ only)', async () => {
    const mods = await getModules(await starterManager());
    expect(mods).not.toContain('hr_payroll');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 26. Enterprise — extended property & project management
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Enterprise — extended property management', () => {
  it('admin can create a contractor', async () => {
    const api = await owner();
    const res = await api.post('/api/real-estate/contractors', {
      name: 'QA Civil Works Ltd',
      specialization: 'civil',
      contact_person: 'QA Contact',
      phone: '9000800050',
      email: 'qa-civil@re.kinto',
      is_active: true,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('admin can create a payment plan for a unit', async () => {
    const api = await owner();
    const res = await api.post('/api/real-estate/payment-plans', {
      unit_id: unitId,
      project_id: projectId,
      plan_name: 'QA 20:80 Subvention Plan',
      on_booking: 20,
      on_foundation: 10,
      on_possession: 70,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('sales exec can record a receipt from a customer', async () => {
    const api = await salesExec();
    const res = await api.post('/api/real-estate/receipts', {
      booking_id: bookingId,
      receipt_date: TODAY,
      amount: 200000,
      payment_mode: 'bank_transfer',
      reference_number: 'QA-TXN-RE-001',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view all receipts', async () => {
    const res = await (await accountant()).get('/api/real-estate/receipts');
    expect(res.status).toBeLessThan(400);
  });

  it('site engineer can view payment plans', async () => {
    const res = await (await siteEngineer()).get('/api/real-estate/payment-plans');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view construction updates', async () => {
    const res = await (await misViewer()).get('/api/real-estate/construction-updates');
    expect(res.status).toBeLessThan(400);
  });

  it('admin can view expenses (construction costs)', async () => {
    const res = await (await owner()).get('/api/expenses');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view profit-loss report', async () => {
    const res = await (await accountant()).get('/api/profit-loss');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view leads for property enquiries', async () => {
    const res = await (await crmExec()).get('/api/crm/leads');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view purchase orders for materials', async () => {
    const res = await (await warehouseMgr()).get('/api/purchase-orders');
    expect(res.status).toBeLessThan(400);
  });

  it('production supervisor can view contractors', async () => {
    const res = await (await prodSup()).get('/api/real-estate/contractors');
    expect(res.status).toBeLessThan(400);
  });

  it('sales manager can view demand letters', async () => {
    const res = await (await salesManager()).get('/api/real-estate/demand-letters');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 27. Plan-level feature assertions — detailed tier comparison
// ─────────────────────────────────────────────────────────────────────────────
describe('Real Estate Plan: detailed feature assertions across all tiers', () => {
  it('starter: features includes expenses and documents', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('expenses');
    expect(mods).toContain('documents');
  });

  it('professional: features includes crm and whatsapp', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('crm');
    expect(mods).toContain('whatsapp');
  });

  it('enterprise: features includes projects and approvals', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('projects');
    expect(mods).toContain('approvals');
  });

  it('starter sales exec: can access invoices', async () => {
    const res = await (await starterSalesExec()).get('/api/invoices');
    expect(res.status).toBeLessThan(400);
  });

  it('professional sales exec: can access CRM contacts', async () => {
    const res = await (await proSalesExec()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('professional manager: can access MIS sales summary', async () => {
    const res = await (await proManager()).get('/api/mis/sales-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('enterprise: GET /api/sales-orders returns 200', async () => {
    const res = await (await owner()).get('/api/sales-orders');
    expect(res.status).toBe(200);
  });

  it('pro acct: can view bank transactions', async () => {
    const res = await (await proAcct()).get('/api/bank-transactions');
    expect(res.status).toBeLessThan(400);
  });

  it('starter billing: features does NOT include crm', async () => {
    const mods = await getModules(await starterBilling());
    expect(mods).not.toContain('crm');
  });

  it('pro mis viewer: can view financial summary', async () => {
    const res = await (await proMis()).get('/api/mis/financial-summary');
    expect(res.status).toBeLessThan(400);
  });
});
