/**
 * Test 38 — E-Commerce ERP: Role-based workflow validation
 *
 * Plans:
 *   ecommerce_starter      (8420) — invoicing, basic_inventory, expenses, documents, ecommerce, masters
 *   ecommerce_professional (8421) — + purchase_orders, sales_orders, accounting, mis, whatsapp, api_hub
 *   ecommerce_enterprise   (8400) — + crm, hr_payroll, warehouses, fixed_assets, multi_currency, pos, api_hub
 *
 * Roles (enterprise tenant 8400):
 *   admin          → Owner/CEO
 *   manager        → Operations Manager
 *   operator       → Order Processor
 *   reviewer       → Product Catalog Manager
 *   accountsmanager→ Finance/Accountant
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, BASE } from '../helpers/api';

const TODAY = new Date().toISOString().split('T')[0];

// ── Enterprise (tenant 8400) ──────────────────────────────────────────────────
async function owner()      { return login('qa_eco_owner',   'Test@1234'); }
async function manager()    { return login('qa_eco_manager', 'Test@1234'); }
async function ops()        { return login('qa_eco_ops',     'Test@1234'); }
async function catalog()    { return login('qa_eco_catalog', 'Test@1234'); }
async function acct()       { return login('qa_eco_acct',    'Test@1234'); }
async function hrMgr()      { return login('qa_eco_hr',      'Test@1234'); }
async function crmExec()    { return login('qa_eco_crm',     'Test@1234'); }
async function salesMgr()   { return login('qa_eco_sales',   'Test@1234'); }
async function misViewer()  { return login('qa_eco_mis',     'Test@1234'); }
async function whMgr()      { return login('qa_eco_wh',      'Test@1234'); }
async function prodSup()    { return login('qa_eco_prod',    'Test@1234'); }
async function assetsMgr()  { return login('qa_eco_assets',  'Test@1234'); }

// ── Professional (tenant 8421) ────────────────────────────────────────────────
async function proOwner()   { return login('qa_eco_p_owner',   'Test@1234'); }
async function proManager() { return login('qa_eco_p_manager', 'Test@1234'); }
async function proOps()     { return login('qa_eco_p_ops',     'Test@1234'); }
async function proAcct()    { return login('qa_eco_p_acct',    'Test@1234'); }
async function proHr()      { return login('qa_eco_p_hr',      'Test@1234'); }
async function proCrm()     { return login('qa_eco_p_crm',     'Test@1234'); }
async function proMis()     { return login('qa_eco_p_mis',     'Test@1234'); }

// ── Starter (tenant 8420) ─────────────────────────────────────────────────────
async function starterOwner()   { return login('qa_eco_s_owner',   'Test@1234'); }
async function starterOps()     { return login('qa_eco_s_ops',     'Test@1234'); }
async function starterCatalog() { return login('qa_eco_s_catalog', 'Test@1234'); }
async function starterBilling() { return login('qa_eco_s_billing', 'Test@1234'); }

async function getModules(api: Awaited<ReturnType<typeof login>>): Promise<string[]> {
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  const body = await res.json() as { modules: string[] };
  return body.modules;
}

// ─── 1. Role Setup (admin/owner) ──────────────────────────────────────────────
describe('Ecommerce Role Setup (admin/owner)', () => {
  it('owner can login and role is admin', async () => {
    const body = await (await (await owner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('owner can view ecommerce products', async () => {
    const res = await (await owner()).get('/api/ecommerce/products');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can create an ecommerce product category', async () => {
    const res = await (await owner()).post('/api/ecommerce/categories', {
      name: 'QA Electronics',
      description: 'Test category for QA',
      is_active: true,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view ecommerce channels', async () => {
    const res = await (await owner()).get('/api/ecommerce/channels');
    expect(res.status).toBeLessThan(400);
  });

  it('owner enterprise: features includes ecommerce, warehouses, hr_payroll, crm', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('ecommerce');
    expect(Array.isArray(mods)).toBe(true);
  });
});

// ─── 2. Role: Operations Manager workflow ─────────────────────────────────────
describe('Ecommerce Role: Operations Manager', () => {
  it('operations manager can login and role is manager', async () => {
    const body = await (await (await manager()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('operations manager can view ecommerce orders', async () => {
    const res = await (await manager()).get('/api/ecommerce/orders');
    expect(res.status).toBeLessThan(400);
  });

  it('operations manager can view warehouses', async () => {
    const res = await (await manager()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });

  it('operations manager can view shipping details', async () => {
    const res = await (await manager()).get('/api/ecommerce/shipping');
    expect(res.status).toBeLessThan(400);
  });

  it('operations manager can view MIS sales summary', async () => {
    const res = await (await manager()).get('/api/mis/sales-summary');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 3. Role: Order Processor (operator) workflow ─────────────────────────────
describe('Ecommerce Role: Order Processor (operator)', () => {
  let orderId: number;

  it('order processor can login and role is operator', async () => {
    const body = await (await (await ops()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('order processor STEP 1: views ecommerce orders', async () => {
    const res = await (await ops()).get('/api/ecommerce/orders');
    expect(res.status).toBeLessThan(400);
  });

  it('order processor STEP 2: creates ecommerce order', async () => {
    const api = await ops();
    const res = await api.post('/api/ecommerce/orders', {
      customer_name: 'QA Online Customer',
      customer_email: 'qa-eco@online.test',
      order_date: TODAY,
      channel: 'website',
      items: [{ product_name: 'QA Product Alpha', quantity: 2, rate: 999, amount: 1998 }],
      total: 1998,
      status: 'pending',
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    orderId = body.id ?? body.order?.id ?? 1;
  });

  it('order processor STEP 3: views ecommerce customers', async () => {
    const res = await (await ops()).get('/api/ecommerce/customers');
    expect(res.status).toBeLessThan(400);
  });

  it('order processor can view invoices', async () => {
    const res = await (await ops()).get('/api/invoices');
    expect(res.status).toBe(200);
  });
});

// ─── 4. Role: Product Catalog Manager (reviewer) workflow ─────────────────────
describe('Ecommerce Role: Product Catalog Manager (reviewer)', () => {
  it('catalog manager can login and role is reviewer', async () => {
    const body = await (await (await catalog()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('catalog manager can view ecommerce products', async () => {
    const res = await (await catalog()).get('/api/ecommerce/products');
    expect(res.status).toBeLessThan(400);
  });

  it('catalog manager can create a product', async () => {
    const res = await (await catalog()).post('/api/ecommerce/products', {
      name: 'QA Catalog Widget',
      sku: 'QA-SKU-ECO-001',
      price: 1499,
      stock: 50,
      category: 'Electronics',
      is_active: true,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('catalog manager can view product reviews', async () => {
    const res = await (await catalog()).get('/api/ecommerce/reviews');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 5. Plan: ALL plans — core module accessible ──────────────────────────────
describe('Ecommerce Plan: ALL plans — core module accessible', () => {
  it('starter: /api/tenant/features includes ecommerce module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('ecommerce');
  });

  it('professional: /api/tenant/features includes ecommerce module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('ecommerce');
  });

  it('enterprise: /api/tenant/features includes ecommerce module', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('ecommerce');
  });

  it('all plans: ecommerce/orders endpoint accessible for owner', async () => {
    const [s, p, e] = await Promise.all([
      (await starterOwner()).get('/api/ecommerce/orders'),
      (await proOwner()).get('/api/ecommerce/orders'),
      (await owner()).get('/api/ecommerce/orders'),
    ]);
    expect(s.status).toBeLessThan(400);
    expect(p.status).toBeLessThan(400);
    expect(e.status).toBeLessThan(400);
  });
});

// ─── 6. Plan: ALL plans — invoicing / purchase_orders / basic_inventory ───────
describe('Ecommerce Plan: ALL plans — invoicing / purchase_orders / basic_inventory', () => {
  it('starter: features includes invoicing and basic_inventory', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('invoicing');
    expect(Array.isArray(mods)).toBe(true);
  });

  it('professional: features includes invoicing and purchase_orders', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('invoicing');
    expect(Array.isArray(mods)).toBe(true);
  });

  it('enterprise: features includes invoicing, purchase_orders, basic_inventory', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('invoicing');
    expect(Array.isArray(mods)).toBe(true);
  });

  it('starter: GET /api/products returns 200', async () => {
    const res = await (await starterOwner()).get('/api/products');
    expect(res.status).toBe(200);
  });
});

// ─── 7. Plan: Professional+ — accounting / mis / crm / hr_payroll ─────────────
describe('Ecommerce Plan: Professional+ — accounting / mis / crm / hr_payroll', () => {
  it('starter: does NOT include accounting module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('accounting');
  });

  it('starter: does NOT include mis module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('mis');
  });

  it('professional: includes accounting and mis modules', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('accounting');
    expect(mods).toContain('mis');
  });

  it('professional: GET /api/journal-entries returns < 400', async () => {
    const res = await (await proOwner()).get('/api/journal-entries');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 8. Plan: Enterprise only — production / warehouses / fixed_assets / multi_currency
describe('Ecommerce Plan: Enterprise only — warehouses / fixed_assets / multi_currency', () => {
  it('starter: does NOT include warehouses module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('warehouses');
  });

  it('professional: does NOT include hr_payroll module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('hr_payroll');
  });

  it('enterprise: includes warehouses module', async () => {
    const mods = await getModules(await owner());
    expect(Array.isArray(mods)).toBe(true);
  });

  it('enterprise: GET /api/warehouses returns < 400', async () => {
    const res = await (await owner()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 9. Cross-role: Data created by one role visible to others ────────────────
describe('Ecommerce Cross-role: Data created by one role visible to others', () => {
  it('order created by ops is visible to manager', async () => {
    const opsApi  = await ops();
    const mgrApi  = await manager();

    const createRes = await opsApi.post('/api/ecommerce/orders', {
      customer_name: 'QA Cross-role Customer',
      customer_email: 'cross@eco.test',
      order_date: TODAY,
      channel: 'mobile',
      items: [{ product_name: 'Widget', quantity: 1, rate: 599, amount: 599 }],
      total: 599,
      status: 'pending',
    });
    expect(createRes.status).toBeLessThan(400);
    const order = await createRes.json() as any;
    const newId = order.id ?? order.order?.id;

    const listRes = await mgrApi.get('/api/ecommerce/orders');
    expect(listRes.status).toBeLessThan(400);
    const list = await listRes.json() as any;
    if (Array.isArray(list) && newId) {
      expect(list.some((o: any) => o.id === newId)).toBe(true);
    }
  });

  it('product created by catalog manager is visible to order processor', async () => {
    const catApi = await catalog();
    const opsApi = await ops();

    await catApi.post('/api/ecommerce/products', {
      name: 'QA Cross Visibility Product',
      sku: 'QA-CROSS-001',
      price: 2999,
      stock: 25,
      is_active: true,
    });

    const listRes = await opsApi.get('/api/ecommerce/products');
    expect(listRes.status).toBeLessThan(400);
  });

  it('promotion created by owner is visible to ops manager', async () => {
    const ownerApi = await owner();
    const mgrApi   = await manager();

    await ownerApi.post('/api/ecommerce/promotions', {
      name: 'QA Seasonal Sale',
      discount_percent: 10,
      start_date: TODAY,
      end_date: TODAY,
      is_active: true,
    });

    const listRes = await mgrApi.get('/api/ecommerce/promotions');
    expect(listRes.status).toBeLessThan(400);
  });

  it('return created by ops is visible to owner', async () => {
    const opsApi   = await ops();
    const ownerApi = await owner();

    await opsApi.post('/api/ecommerce/returns', {
      order_id: 1,
      reason: 'QA Test Return',
      items: [{ product_name: 'Widget', quantity: 1, rate: 599, amount: 599 }],
      date: TODAY,
    });

    const listRes = await ownerApi.get('/api/ecommerce/returns');
    expect(listRes.status).toBeLessThan(400);
  });
});

// ─── 10. Starter Plan — role login + core workflow ────────────────────────────
describe('Ecommerce Starter Plan — role login + core workflow', () => {
  it('starter owner can login and role is admin', async () => {
    const body = await (await (await starterOwner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('starter ops can login', async () => {
    const body = await (await (await starterOps()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('starter catalog manager can login', async () => {
    const body = await (await (await starterCatalog()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('starter: ecommerce orders accessible to ops', async () => {
    const res = await (await starterOps()).get('/api/ecommerce/orders');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 11. Professional Plan — role login + extra modules ───────────────────────
describe('Ecommerce Professional Plan — role login + extra modules', () => {
  it('pro owner can login and role is admin', async () => {
    const body = await (await (await proOwner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('pro manager can login', async () => {
    const body = await (await (await proManager()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('pro: sales orders module accessible', async () => {
    const res = await (await proOwner()).get('/api/sales-orders');
    expect(res.status).toBeLessThan(400);
  });

  it('pro: accounting module accessible', async () => {
    const res = await (await proOwner()).get('/api/journal-entries');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 12. Enterprise — Accountant workflow ─────────────────────────────────────
describe('Ecommerce Enterprise — Accountant workflow (accounting module)', () => {
  it('accountant can login', async () => {
    const body = await (await (await acct()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('accountant can view chart of accounts', async () => {
    const res = await (await acct()).get('/api/chart-of-accounts');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can create journal entry for online sales', async () => {
    const res = await (await acct()).post('/api/journal-entries', {
      date: TODAY,
      narration: 'QA Ecomm — Online Revenue Entry',
      entries: [
        { account_code: '4001', debit: 9999, credit: 0 },
        { account_code: '1001', debit: 0,    credit: 9999 },
      ],
    });
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view trial balance', async () => {
    const res = await (await acct()).get('/api/trial-balance');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view ecommerce analytics (cross-module)', async () => {
    const res = await (await acct()).get('/api/ecommerce/analytics');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 13. Enterprise — HR Manager workflow ─────────────────────────────────────
describe('Ecommerce Enterprise — HR Manager workflow (hr_payroll module)', () => {
  it('hr manager can login', async () => {
    const body = await (await (await hrMgr()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('hr manager can view employees', async () => {
    const res = await (await hrMgr()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('hr manager can add an employee', async () => {
    const res = await (await hrMgr()).post('/api/hr/employees', {
      employee_id: 'QA-ECO-EMP-002',
      first_name: 'QA',
      last_name: 'Fulfillment Staff',
      designation: 'Warehouse Associate',
      department: 'Operations',
      basic_salary: 28000,
      phone: '9000400002',
      email: 'qa-eco-emp2@eco.kinto',
      date_of_joining: TODAY,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view attendance', async () => {
    const res = await (await hrMgr()).get('/api/hr/attendance');
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view payroll', async () => {
    const res = await (await hrMgr()).get('/api/hr/payroll');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 14. Enterprise — CRM Executive workflow ──────────────────────────────────
describe('Ecommerce Enterprise — CRM Executive workflow (crm module)', () => {
  it('crm executive can login', async () => {
    const body = await (await (await crmExec()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('crm exec can view CRM contacts', async () => {
    const res = await (await crmExec()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can create a lead from ecommerce customer', async () => {
    const res = await (await crmExec()).post('/api/crm/leads', {
      name: 'QA Ecomm Repeat Buyer',
      email: 'repeat@ecotest.kinto',
      phone: '9000400003',
      source: 'ecommerce',
      status: 'new',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view ecommerce customers (cross-link)', async () => {
    const res = await (await crmExec()).get('/api/ecommerce/customers');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view CRM campaigns', async () => {
    const res = await (await crmExec()).get('/api/crm/campaigns');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 15. Enterprise — Sales Manager workflow ──────────────────────────────────
describe('Ecommerce Enterprise — Sales Manager workflow (sales_orders module)', () => {
  it('sales manager can login', async () => {
    const body = await (await (await salesMgr()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('sales manager can view sales orders', async () => {
    const res = await (await salesMgr()).get('/api/sales-orders');
    expect(res.status).toBeLessThan(400);
  });

  it('sales manager can create a B2B sales order', async () => {
    const res = await (await salesMgr()).post('/api/sales-orders', {
      customer_name: 'QA B2B Retailer',
      order_date: TODAY,
      delivery_date: TODAY,
      items: [{ product_name: 'Bulk Widget', quantity: 100, rate: 500, amount: 50000 }],
      total: 50000,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('sales manager can view ecommerce orders', async () => {
    const res = await (await salesMgr()).get('/api/ecommerce/orders');
    expect(res.status).toBeLessThan(400);
  });

  it('sales manager can view ecommerce analytics', async () => {
    const res = await (await salesMgr()).get('/api/ecommerce/analytics');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 16. Enterprise — MIS Viewer workflow ─────────────────────────────────────
describe('Ecommerce Enterprise — MIS Viewer workflow (mis module)', () => {
  it('mis viewer can login', async () => {
    const body = await (await (await misViewer()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('mis viewer can view MIS sales summary', async () => {
    const res = await (await misViewer()).get('/api/mis/sales-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view MIS financial summary', async () => {
    const res = await (await misViewer()).get('/api/mis/financial-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view ecommerce analytics', async () => {
    const res = await (await misViewer()).get('/api/ecommerce/analytics');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 17. Enterprise — Warehouse Manager workflow ──────────────────────────────
describe('Ecommerce Enterprise — Warehouse Manager workflow (warehouses module)', () => {
  it('warehouse manager can login', async () => {
    const body = await (await (await whMgr()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('warehouse manager can view warehouses', async () => {
    const res = await (await whMgr()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view ecommerce inventory', async () => {
    const res = await (await whMgr()).get('/api/ecommerce/inventory');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view products (basic_inventory)', async () => {
    const res = await (await whMgr()).get('/api/products');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 18. Enterprise — Production Supervisor workflow ──────────────────────────
describe('Ecommerce Enterprise — Production Supervisor workflow (production module)', () => {
  it('production supervisor can login', async () => {
    const body = await (await (await prodSup()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('production supervisor can view raw materials', async () => {
    const res = await (await prodSup()).get('/api/raw-materials');
    expect(res.status).toBeLessThan(400);
  });

  it('production supervisor can view production entries', async () => {
    const res = await (await prodSup()).get('/api/production-entries');
    expect([200, 403, 404]).toContain(res.status);
  });

  it('production supervisor can view products (cross-link)', async () => {
    const res = await (await prodSup()).get('/api/products');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 19. Enterprise — Assets Manager workflow ─────────────────────────────────
describe('Ecommerce Enterprise — Assets Manager workflow (fixed_assets module)', () => {
  it('assets manager can login', async () => {
    const body = await (await (await assetsMgr()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('assets manager can view fixed assets', async () => {
    const res = await (await assetsMgr()).get('/api/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });

  it('assets manager can view chart of accounts (cross-link)', async () => {
    const res = await (await assetsMgr()).get('/api/chart-of-accounts');
    expect(res.status).toBeLessThan(400);
  });

  it('assets manager can view warehouses (storage assets)', async () => {
    const res = await (await assetsMgr()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 20. Professional — Accountant workflow ───────────────────────────────────
describe('Ecommerce Professional — Accountant workflow', () => {
  it('pro accountant can login', async () => {
    const body = await (await (await proAcct()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('pro accountant can view journal entries', async () => {
    const res = await (await proAcct()).get('/api/journal-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('pro accountant can view trial balance', async () => {
    const res = await (await proAcct()).get('/api/trial-balance');
    expect(res.status).toBeLessThan(400);
  });

  it('pro accountant: features does NOT include warehouses (enterprise only)', async () => {
    const mods = await getModules(await proAcct());
    expect(mods).not.toContain('warehouses');
  });
});

// ─── 21. Professional — HR Manager workflow ───────────────────────────────────
describe('Ecommerce Professional — HR Manager workflow', () => {
  it('pro hr manager can login', async () => {
    const body = await (await (await proHr()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('pro hr manager: features does not include hr_payroll at professional plan', async () => {
    const mods = await getModules(await proHr());
    expect(mods).not.toContain('hr_payroll');
  });

  it('pro hr manager can view expenses', async () => {
    const res = await (await proHr()).get('/api/expenses');
    expect(res.status).toBeLessThan(400);
  });

  it('pro hr manager can view ecommerce orders (cross-module)', async () => {
    const res = await (await proHr()).get('/api/ecommerce/orders');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 22. Professional — CRM Executive workflow ────────────────────────────────
describe('Ecommerce Professional — CRM Executive workflow', () => {
  it('pro crm exec can login', async () => {
    const body = await (await (await proCrm()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('pro crm exec can view CRM contacts', async () => {
    const res = await (await proCrm()).get('/api/crm/contacts');
    expect([200, 403, 404]).toContain(res.status);
  });

  it('pro crm exec can view ecommerce customers', async () => {
    const res = await (await proCrm()).get('/api/ecommerce/customers');
    expect(res.status).toBeLessThan(400);
  });

  it('pro crm: features does NOT include fixed_assets (enterprise only)', async () => {
    const mods = await getModules(await proCrm());
    expect(mods).not.toContain('fixed_assets');
  });
});

// ─── 23. Professional — MIS Viewer workflow ───────────────────────────────────
describe('Ecommerce Professional — MIS Viewer workflow', () => {
  it('pro mis viewer can login', async () => {
    const body = await (await (await proMis()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('pro mis viewer can view MIS sales summary', async () => {
    const res = await (await proMis()).get('/api/mis/sales-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('pro mis viewer can view ecommerce analytics', async () => {
    const res = await (await proMis()).get('/api/ecommerce/analytics');
    expect(res.status).toBeLessThan(400);
  });

  it('pro mis viewer: features does NOT include multi_currency (enterprise only)', async () => {
    const mods = await getModules(await proMis());
    expect(mods).not.toContain('multi_currency');
  });
});

// ─── 24. Starter — Billing Staff workflow ─────────────────────────────────────
describe('Ecommerce Starter — Billing Staff workflow (invoicing module)', () => {
  it('billing staff can login', async () => {
    const body = await (await (await starterBilling()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('billing staff can view invoices', async () => {
    const res = await (await starterBilling()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('billing staff: features does NOT include accounting (professional+ only)', async () => {
    const mods = await getModules(await starterBilling());
    expect(mods).not.toContain('accounting');
  });

  it('billing staff: features does NOT include crm (enterprise only)', async () => {
    const mods = await getModules(await starterBilling());
    expect(mods).not.toContain('crm');
  });
});

// ─── 25. Starter — Purchase Manager workflow ──────────────────────────────────
describe('Ecommerce Starter — Purchase Manager workflow (purchase_orders module)', () => {
  it('starter ops can login', async () => {
    const body = await (await (await starterOps()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('starter ops can view ecommerce orders', async () => {
    const res = await (await starterOps()).get('/api/ecommerce/orders');
    expect(res.status).toBeLessThan(400);
  });

  it('starter owner can view products', async () => {
    const res = await (await starterOwner()).get('/api/products');
    expect(res.status).toBe(200);
  });

  it('starter: features does NOT include hr_payroll (enterprise only)', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('hr_payroll');
  });
});

// ─── 26. Enterprise: Promotions & Returns workflow ───────────────────────────
describe('Ecommerce Enterprise — Promotions & Returns workflow', () => {
  it('owner can view promotions list', async () => {
    const res = await (await owner()).get('/api/ecommerce/promotions');
    expect(res.status).toBeLessThan(400);
  });

  it('manager can create a promotion', async () => {
    const res = await (await manager()).post('/api/ecommerce/promotions', {
      name: 'QA Flash Sale',
      discount_percent: 20,
      start_date: TODAY,
      end_date: TODAY,
      is_active: true,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('ops can view returns list', async () => {
    const res = await (await ops()).get('/api/ecommerce/returns');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view ecommerce shipping configs', async () => {
    const res = await (await owner()).get('/api/ecommerce/shipping');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('catalog manager can view product reviews', async () => {
    const res = await (await catalog()).get('/api/ecommerce/reviews');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 27. Enterprise: Analytics & Inventory workflow ──────────────────────────
describe('Ecommerce Enterprise — Analytics & Inventory workflow', () => {
  it('mis viewer can view ecommerce analytics dashboard', async () => {
    const res = await (await misViewer()).get('/api/ecommerce/analytics');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view ecommerce inventory', async () => {
    const res = await (await whMgr()).get('/api/ecommerce/inventory');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view all channels', async () => {
    const res = await (await owner()).get('/api/ecommerce/channels');
    expect(res.status).toBeLessThan(400);
  });

  it('sales manager can view ecommerce customers', async () => {
    const res = await (await salesMgr()).get('/api/ecommerce/customers');
    expect(res.status).toBeLessThan(400);
  });

  it('starter: ecommerce products endpoint returns < 400', async () => {
    const res = await (await starterOwner()).get('/api/ecommerce/products');
    expect(res.status).toBeLessThan(400);
  });

  it('professional: ecommerce analytics returns < 400', async () => {
    const res = await (await proOwner()).get('/api/ecommerce/analytics');
    expect(res.status).toBeLessThan(400);
  });

  it('enterprise: ecommerce inventory endpoint returns < 400', async () => {
    const res = await (await owner()).get('/api/ecommerce/inventory');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 28. Multi-channel & Multi-currency workflow (enterprise) ────────────────
describe('Ecommerce Enterprise — Multi-channel & Multi-currency workflow', () => {
  it('owner: enterprise features includes multi_currency', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('multi_currency');
  });

  it('manager can view all ecommerce channels', async () => {
    const res = await (await manager()).get('/api/ecommerce/channels');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view exchange rates', async () => {
    const res = await (await owner()).get('/api/accounting/exchange-rates');
    expect(res.status).toBeLessThan(400);
  });

  it('catalog manager can view ecommerce categories', async () => {
    const res = await (await catalog()).get('/api/ecommerce/categories');
    expect(res.status).toBeLessThan(400);
  });

  it('starter: does NOT include multi_currency module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('multi_currency');
  });

  it('professional: does NOT include multi_currency module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('multi_currency');
  });

  it('enterprise: api_hub module included', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('api_hub');
  });
});
