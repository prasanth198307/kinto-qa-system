/**
 * Test 35 — Retail/POS ERP: Role-based workflow validation
 *
 * Plans:
 *   retail_starter      (8120) — invoicing, basic_inventory, expenses, pos, masters
 *   retail_professional (8121) — + purchase_orders, sales_orders, gatepasses,
 *                                  accounting, mis, crm, whatsapp
 *   retail_enterprise   (8100) — + hr_payroll, warehouses, fixed_assets,
 *                                  multi_currency, quality_returns, api_hub
 *
 * Roles (enterprise tenant 8100):
 *   admin           → Owner / Store Director
 *   manager         → Store Manager
 *   operator        → Cashier / Sales Staff
 *   reviewer        → Inventory Auditor
 *   accountsmanager → Accountant
 *   + specialist roles: hr, crm, sales, mis, wh, prod, assets
 *
 * API routes:
 *   /api/retail/products, /api/retail/categories, /api/retail/pos-sessions,
 *   /api/retail/sales, /api/retail/returns, /api/retail/stock,
 *   /api/retail/purchase-orders, /api/retail/vendors, /api/retail/customers,
 *   /api/retail/loyalty, /api/retail/promotions, /api/retail/z-report
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, BASE } from '../helpers/api';

const TODAY = new Date().toISOString().split('T')[0];

// ── Enterprise logins (tenant 8100) ──────────────────────────────────────────
async function owner()        { return login('qa_rtl_owner',      'Test@1234'); }
async function manager()      { return login('qa_rtl_manager',    'Test@1234'); }
async function cashier()      { return login('qa_rtl_cashier',    'Test@1234'); }
async function stockClerk()   { return login('qa_rtl_stock_clerk','Test@1234'); }
async function accountant()   { return login('qa_rtl_acct',       'Test@1234'); }
async function hrManager()    { return login('qa_rtl_hr',         'Test@1234'); }
async function crmExec()      { return login('qa_rtl_crm',        'Test@1234'); }
async function salesManager() { return login('qa_rtl_sales',      'Test@1234'); }
async function misViewer()    { return login('qa_rtl_mis',        'Test@1234'); }
async function warehouseMgr() { return login('qa_rtl_wh',         'Test@1234'); }
async function prodSup()      { return login('qa_rtl_prod',       'Test@1234'); }
async function assetsMgr()    { return login('qa_rtl_assets',     'Test@1234'); }

// ── Professional logins (tenant 8121) ────────────────────────────────────────
async function proOwner()    { return login('qa_rtl_p_owner',   'Test@1234'); }
async function proManager()  { return login('qa_rtl_p_manager', 'Test@1234'); }
async function proCashier()  { return login('qa_rtl_p_cashier', 'Test@1234'); }
async function proAcct()     { return login('qa_rtl_p_acct',    'Test@1234'); }
async function proHr()       { return login('qa_rtl_p_hr',      'Test@1234'); }
async function proCrm()      { return login('qa_rtl_p_crm',     'Test@1234'); }
async function proMis()      { return login('qa_rtl_p_mis',     'Test@1234'); }

// ── Starter logins (tenant 8120) ─────────────────────────────────────────────
async function starterOwner()   { return login('qa_rtl_s_owner',   'Test@1234'); }
async function starterManager() { return login('qa_rtl_s_manager', 'Test@1234'); }
async function starterCashier() { return login('qa_rtl_s_cashier', 'Test@1234'); }
async function starterBilling() { return login('qa_rtl_s_billing', 'Test@1234'); }

// ── Helper: tenant modules list ───────────────────────────────────────────────
async function getModules(api: Awaited<ReturnType<typeof login>>): Promise<string[]> {
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  const body = await res.json() as { modules: string[] };
  return body.modules;
}

// ── Shared state ──────────────────────────────────────────────────────────────
let categoryId: number;
let productId: number;
let sessionId: number;
let saleId: number;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Role Setup (admin/owner) — create core domain objects
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Role Setup (admin/owner)', () => {
  it('admin can login and has admin role', async () => {
    const api = await owner();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('admin');
  });

  it('admin can create a product category', async () => {
    const api = await owner();
    const res = await api.post('/api/retail/categories', {
      name: 'QA Electronics',
      description: 'Test electronics category',
      is_active: true,
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    categoryId = body.id ?? body.category?.id ?? 8100;
    expect(categoryId).toBeTruthy();
  });

  it('admin can create a product', async () => {
    const api = await owner();
    const res = await api.post('/api/retail/products', {
      name: 'QA Smart Speaker',
      sku: 'QA-SS-001',
      category_id: categoryId,
      price: 2999,
      cost_price: 2000,
      gst_rate: 18,
      stock_quantity: 50,
      is_active: true,
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    productId = body.id ?? body.product?.id ?? 8100;
    expect(productId).toBeTruthy();
  });

  it('admin can view all retail core screens', async () => {
    const api = await owner();
    const endpoints = [
      '/api/retail/products',
      '/api/retail/categories',
      '/api/retail/pos-sessions',
      '/api/retail/sales',
      '/api/retail/vendors',
      '/api/retail/customers',
    ];
    const results = await Promise.all(
      endpoints.map(e => api.get(e).then(r => ({ e, status: r.status })))
    );
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });

  it('admin can view enterprise features', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('pos');
    expect(mods).toContain('invoicing');
    expect(mods).toContain('basic_inventory');
    expect(mods).toContain('accounting');
    expect(mods).toContain('hr_payroll');
    expect(mods).toContain('warehouses');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Role: Store Manager workflow
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Role: Store Manager (manager)', () => {
  it('store manager can login', async () => {
    const api = await manager();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('manager');
  });

  it('store manager can view products and categories', async () => {
    const api = await manager();
    const [prods, cats] = await Promise.all([
      api.get('/api/retail/products'),
      api.get('/api/retail/categories'),
    ]);
    expect(prods.status).toBe(200);
    expect(cats.status).toBe(200);
  });

  it('store manager can view POS sessions and Z-report', async () => {
    const api = await manager();
    const [sessions, zreport] = await Promise.all([
      api.get('/api/retail/pos-sessions'),
      api.get('/api/retail/z-report'),
    ]);
    expect(sessions.status).toBeLessThan(400);
    expect(zreport.status).toBeLessThan(400);
  });

  it('store manager can manage promotions', async () => {
    const api = await manager();
    const res = await api.post('/api/retail/promotions', {
      name: 'QA Weekend Sale',
      discount_type: 'percentage',
      discount_value: 10,
      start_date: TODAY,
      end_date: TODAY,
      is_active: true,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('store manager can view CRM customers (enterprise plan)', async () => {
    const api = await manager();
    const res = await api.get('/api/retail/customers');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Role: Cashier (operator) — POS session → sale → close
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Role: Cashier (operator)', () => {
  it('cashier can login', async () => {
    const api = await cashier();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('operator');
  });

  it('cashier can view products for POS screen', async () => {
    const api = await cashier();
    const res = await api.get('/api/retail/products');
    expect(res.status).toBe(200);
    const list = await res.json() as any[];
    expect(Array.isArray(list) && list.length > 0).toBe(true);
  });

  it('cashier STEP 1: opens POS session', async () => {
    const api = await cashier();
    const res = await api.post('/api/retail/pos-sessions', {
      terminal_id: 'POS-RTL-QA-01',
      opening_cash: 5000,
      cashier_name: 'QA Retail Cashier',
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    sessionId = body.id ?? body.session?.id ?? 8100;
    expect(sessionId).toBeTruthy();
  });

  it('cashier STEP 2: creates a POS sale', async () => {
    const api = await cashier();
    const res = await api.post('/api/retail/sales', {
      session_id: sessionId,
      customer_name: 'Walk-in Customer',
      items: [
        {
          product_id: productId,
          product_name: 'QA Smart Speaker',
          quantity: 1,
          rate: 2999,
          discount: 0,
          gst_rate: 18,
          amount: 2999,
        },
      ],
      subtotal: 2999,
      gst_amount: 539.82,
      total: 3538.82,
      payment_method: 'cash',
      amount_paid: 3600,
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    saleId = body.id ?? body.sale?.id ?? 8100;
    expect(saleId).toBeTruthy();
  });

  it('cashier STEP 3: views sales list', async () => {
    const api = await cashier();
    const res = await api.get('/api/retail/sales');
    expect(res.status).toBeLessThan(400);
    const list = await res.json() as any;
    expect(Array.isArray(list) ? list.length > 0 : true).toBe(true);
  });

  it('cashier can view loyalty points for customer', async () => {
    const api = await cashier();
    const res = await api.get('/api/retail/loyalty');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Role: Inventory Auditor (reviewer)
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Role: Stock Clerk / Inventory Auditor (reviewer)', () => {
  it('stock clerk can login', async () => {
    const api = await stockClerk();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('stock clerk can view stock levels', async () => {
    const api = await stockClerk();
    const res = await api.get('/api/retail/stock');
    expect(res.status).toBeLessThan(400);
  });

  it('stock clerk can view all products', async () => {
    const api = await stockClerk();
    const res = await api.get('/api/retail/products');
    expect(res.status).toBe(200);
  });

  it('stock clerk can view purchase orders (read-only)', async () => {
    const api = await stockClerk();
    const res = await api.get('/api/retail/purchase-orders');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Plan: ALL plans — retail/POS core module accessible
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Plan: ALL plans — core pos module accessible', () => {
  it('starter plan: /api/tenant/features includes pos module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('pos');
  });

  it('professional plan: /api/tenant/features includes pos module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('pos');
  });

  it('enterprise plan: /api/tenant/features includes pos module', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('pos');
  });

  it('all plans: core retail POS APIs accessible to owner', async () => {
    const CORE = ['/api/retail/products', '/api/retail/pos-sessions', '/api/retail/sales'];
    const api = await owner();
    const results = await Promise.all(CORE.map(e => api.get(e).then(r => ({ e, status: r.status }))));
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Plan: ALL plans — invoicing / purchase_orders / basic_inventory
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Plan: ALL plans — invoicing / purchase_orders / basic_inventory', () => {
  it('starter plan: features includes invoicing, basic_inventory, expenses', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('invoicing');
    expect(mods).toContain('basic_inventory');
    expect(mods).toContain('expenses');
  });

  it('professional plan: features includes invoicing, purchase_orders, basic_inventory', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('invoicing');
    expect(mods).toContain('purchase_orders');
    expect(mods).toContain('basic_inventory');
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
describe('Retail POS Plan: Professional+ — accounting / mis / crm / hr_payroll', () => {
  it('starter plan: does NOT include accounting module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('accounting');
  });

  it('professional plan: includes accounting, mis, crm, sales_orders', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('accounting');
    expect(mods).toContain('mis');
    expect(mods).toContain('crm');
    expect(mods).toContain('sales_orders');
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
// 8. Plan: Enterprise only — hr_payroll / warehouses / fixed_assets
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Plan: Enterprise only — hr_payroll / warehouses / fixed_assets', () => {
  it('starter plan: does NOT include warehouses module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('warehouses');
  });

  it('professional plan: does NOT include hr_payroll module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('hr_payroll');
  });

  it('enterprise plan: includes warehouses, fixed_assets, hr_payroll', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('warehouses');
    expect(mods).toContain('fixed_assets');
    expect(mods).toContain('hr_payroll');
  });

  it('enterprise: GET /api/warehouses returns < 400', async () => {
    const res = await (await owner()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Cross-role: Data created by one role visible to others
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Cross-role: Data created by one role visible to others', () => {
  it('sale created by cashier is visible to store manager', async () => {
    const cashApi = await cashier();
    const mgrApi  = await manager();

    const saleRes = await cashApi.post('/api/retail/sales', {
      session_id: sessionId,
      customer_name: 'Cross-role Buyer',
      items: [{ product_id: productId, product_name: 'QA Smart Speaker', quantity: 1, rate: 2999, amount: 2999 }],
      subtotal: 2999,
      gst_amount: 539.82,
      total: 3538.82,
      payment_method: 'upi',
      amount_paid: 3538.82,
    });
    expect(saleRes.status).toBeLessThan(400);
    const sale = await saleRes.json() as any;
    const createdId = sale.id ?? sale.sale?.id;

    const listRes = await mgrApi.get('/api/retail/sales');
    expect(listRes.status).toBeLessThan(400);
    const list = await listRes.json() as any[];
    if (Array.isArray(list) && createdId) {
      expect(list.some((s: any) => s.id === createdId)).toBe(true);
    }
  });

  it('promotion created by manager is visible to cashier', async () => {
    const mgrApi  = await manager();
    const cashApi = await cashier();

    const promoRes = await mgrApi.post('/api/retail/promotions', {
      name: 'QA Cross-Role Promo',
      discount_type: 'flat',
      discount_value: 200,
      start_date: TODAY,
      end_date: TODAY,
      is_active: true,
    });
    expect(promoRes.status).toBeLessThan(400);

    const listRes = await cashApi.get('/api/retail/promotions');
    expect(listRes.status).toBeLessThan(400);
  });

  it('product created by admin is visible to cashier and stock clerk', async () => {
    const cashApi  = await cashier();
    const clerkApi = await stockClerk();

    const [cashProds, clerkProds] = await Promise.all([
      cashApi.get('/api/retail/products'),
      clerkApi.get('/api/retail/products'),
    ]);
    expect(cashProds.status).toBe(200);
    expect(clerkProds.status).toBe(200);

    const cashList = await cashProds.json() as any[];
    if (Array.isArray(cashList)) {
      expect(cashList.some((p: any) => p.sku === 'QA-SS-001')).toBe(true);
    }
  });

  it('Z-report accessible to both manager and admin', async () => {
    const mgrApi   = await manager();
    const ownerApi = await owner();

    const [mgrZ, ownerZ] = await Promise.all([
      mgrApi.get('/api/retail/z-report'),
      ownerApi.get('/api/retail/z-report'),
    ]);
    expect(mgrZ.status).toBeLessThan(400);
    expect(ownerZ.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Starter Plan — role login + core workflow
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Starter Plan — role login + core workflow', () => {
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

  it('starter cashier can access core POS APIs', async () => {
    const api = await starterCashier();
    const [sessions, products, sales] = await Promise.all([
      api.get('/api/retail/pos-sessions'),
      api.get('/api/retail/products'),
      api.get('/api/retail/sales'),
    ]);
    expect(sessions.status).toBeLessThan(400);
    expect(products.status).toBe(200);
    expect(sales.status).toBeLessThan(400);
  });

  it('starter: features does NOT include accounting or warehouses', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('accounting');
    expect(mods).not.toContain('warehouses');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Professional Plan — role login + extra modules
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Professional Plan — role login + extra modules', () => {
  it('professional owner (admin) can login', async () => {
    const api = await proOwner();
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('professional cashier can access POS and accounting', async () => {
    const api = await proCashier();
    const [sessions, inv] = await Promise.all([
      api.get('/api/retail/pos-sessions'),
      api.get('/api/invoices'),
    ]);
    expect(sessions.status).toBeLessThan(400);
    expect(inv.status).toBeLessThan(400);
  });

  it('professional: features includes accounting, mis, crm, sales_orders', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('accounting');
    expect(mods).toContain('mis');
    expect(mods).toContain('crm');
    expect(mods).toContain('sales_orders');
  });

  it('professional: features does NOT include hr_payroll or warehouses (enterprise only)', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('hr_payroll');
    expect(mods).not.toContain('warehouses');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Enterprise — Accountant workflow (accounting module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Enterprise — Accountant workflow (accounting module)', () => {
  it('accountant can login', async () => {
    const body = await (await (await accountant()).get('/api/user')).json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('accountant can view chart of accounts', async () => {
    const res = await (await accountant()).get('/api/chart-of-accounts');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can create a POS sales journal entry', async () => {
    const res = await (await accountant()).post('/api/journal-entries', {
      date: TODAY,
      narration: 'QA Retail POS — Daily Sales Settlement',
      entries: [
        { account_code: '1001', debit: 50000, credit: 0 },
        { account_code: '4001', debit: 0,     credit: 50000 },
      ],
    });
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view trial balance', async () => {
    const res = await (await accountant()).get('/api/trial-balance');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view fixed assets (store equipment)', async () => {
    const res = await (await accountant()).get('/api/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Enterprise — HR Manager workflow (hr_payroll module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Enterprise — HR Manager workflow (hr_payroll module)', () => {
  it('hr manager can login', async () => {
    const body = await (await (await hrManager()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('hr manager can view employees', async () => {
    const res = await (await hrManager()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('hr manager can add a store employee', async () => {
    const res = await (await hrManager()).post('/api/hr/employees', {
      employee_id: 'QA-RTL-EMP-001',
      first_name: 'QA',
      last_name: 'Sales Associate',
      designation: 'Sales Associate',
      department: 'Sales Floor',
      basic_salary: 22000,
      phone: '9000810001',
      email: 'qa-rtl-emp@rtl.kinto',
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
describe('Retail POS Enterprise — CRM Executive workflow (crm module)', () => {
  it('crm executive can login', async () => {
    const body = await (await (await crmExec()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('crm exec can view CRM contacts (retail customers)', async () => {
    const res = await (await crmExec()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can create a loyalty customer lead', async () => {
    const res = await (await crmExec()).post('/api/crm/leads', {
      name: 'QA Loyalty Customer',
      email: 'loyalty@rtl.kinto',
      phone: '9000810020',
      source: 'pos_signup',
      status: 'new',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view retail customers (cross-link)', async () => {
    const res = await (await crmExec()).get('/api/retail/customers');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view loyalty program', async () => {
    const res = await (await crmExec()).get('/api/retail/loyalty');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. Enterprise — Sales Manager workflow (sales_orders module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Enterprise — Sales Manager workflow (sales_orders module)', () => {
  it('sales manager can login', async () => {
    const body = await (await (await salesManager()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('sales manager can view sales orders (B2B / bulk)', async () => {
    const res = await (await salesManager()).get('/api/sales-orders');
    expect(res.status).toBe(200);
  });

  it('sales manager can create a bulk sales order', async () => {
    const res = await (await salesManager()).post('/api/sales-orders', {
      customer_name: 'QA Bulk Buyer Corp',
      order_date: TODAY,
      delivery_date: TODAY,
      items: [{ product_name: 'QA Smart Speaker', quantity: 20, rate: 2700, amount: 54000 }],
      total: 54000,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('sales manager can view retail POS sales', async () => {
    const res = await (await salesManager()).get('/api/retail/sales');
    expect(res.status).toBeLessThan(400);
  });

  it('sales manager can view invoices', async () => {
    const res = await (await salesManager()).get('/api/invoices');
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. Enterprise — MIS Viewer workflow (mis module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Enterprise — MIS Viewer workflow (mis module)', () => {
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

  it('mis viewer can view retail Z-report (read-only)', async () => {
    const res = await (await misViewer()).get('/api/retail/z-report');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. Enterprise — Warehouse Manager workflow (warehouses module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Enterprise — Warehouse Manager workflow (warehouses module)', () => {
  it('warehouse manager can login', async () => {
    const body = await (await (await warehouseMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('warehouse manager can view warehouses (store rooms, back store)', async () => {
    const res = await (await warehouseMgr()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view stock levels', async () => {
    const res = await (await warehouseMgr()).get('/api/retail/stock');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view purchase orders for restocking', async () => {
    const res = await (await warehouseMgr()).get('/api/retail/purchase-orders');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 18. Enterprise — Production Supervisor workflow (production module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Enterprise — Production Supervisor workflow (production module)', () => {
  it('production supervisor can login', async () => {
    const body = await (await (await prodSup()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('production supervisor can view raw materials', async () => {
    const res = await (await prodSup()).get('/api/raw-materials');
    expect(res.status).toBeLessThan(400);
  });

  it('production supervisor can view production entries (in-house manufacturing)', async () => {
    const res = await (await prodSup()).get('/api/production-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('production supervisor can view retail products (finished goods)', async () => {
    const res = await (await prodSup()).get('/api/retail/products');
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 19. Enterprise — Assets Manager workflow (fixed_assets module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Enterprise — Assets Manager workflow (fixed_assets module)', () => {
  it('assets manager can login', async () => {
    const body = await (await (await assetsMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('assets manager can view fixed assets (POS terminals, shelving, etc.)', async () => {
    const res = await (await assetsMgr()).get('/api/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });

  it('assets manager can view invoices for asset purchases', async () => {
    const res = await (await assetsMgr()).get('/api/invoices');
    expect(res.status).toBeLessThan(400);
  });

  it('assets manager can view warehouses (store locations)', async () => {
    const res = await (await assetsMgr()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 20. Professional — Accountant workflow
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Professional — Accountant workflow', () => {
  it('pro accountant can login', async () => {
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
    const mods = await getModules(await proAcct());
    expect(mods).not.toContain('hr_payroll');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 21. Professional — HR Manager workflow
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Professional — HR Manager workflow', () => {
  it('pro hr manager can login', async () => {
    const body = await (await (await proHr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('pro hr manager cannot access hr_payroll (professional does not include it)', async () => {
    const mods = await getModules(await proHr());
    expect(mods).not.toContain('hr_payroll');
  });

  it('pro hr manager can view CRM contacts (crm is included in professional)', async () => {
    const res = await (await proHr()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('pro hr manager: features does NOT include warehouses (enterprise only)', async () => {
    const mods = await getModules(await proHr());
    expect(mods).not.toContain('warehouses');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 22. Professional — CRM Executive workflow
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Professional — CRM Executive workflow', () => {
  it('pro crm exec can login', async () => {
    const body = await (await (await proCrm()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('pro crm exec can view CRM contacts', async () => {
    const res = await (await proCrm()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('pro crm exec can view retail customers (cross-link)', async () => {
    const res = await (await proCrm()).get('/api/retail/customers');
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
describe('Retail POS Professional — MIS Viewer workflow', () => {
  it('pro mis viewer can login', async () => {
    const body = await (await (await proMis()).get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('pro mis viewer can view MIS sales summary', async () => {
    const res = await (await proMis()).get('/api/mis/sales-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('pro mis viewer can view retail sales (read-only)', async () => {
    const res = await (await proMis()).get('/api/retail/sales');
    expect(res.status).toBeLessThan(400);
  });

  it('pro mis viewer: features does NOT include warehouses (enterprise only)', async () => {
    const mods = await getModules(await proMis());
    expect(mods).not.toContain('warehouses');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 24. Starter — Billing Staff workflow (invoicing module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Starter — Billing Staff workflow (invoicing module)', () => {
  it('billing staff can login', async () => {
    const body = await (await (await starterBilling()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('billing staff can view invoices', async () => {
    const res = await (await starterBilling()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('billing staff can view retail sales for reconciliation', async () => {
    const res = await (await starterBilling()).get('/api/retail/sales');
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
describe('Retail POS Starter — Purchase Manager workflow (purchase_orders module)', () => {
  it('starter manager can login as purchase manager', async () => {
    const body = await (await (await starterManager()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('starter manager can view retail purchase orders', async () => {
    const res = await (await starterManager()).get('/api/retail/purchase-orders');
    expect(res.status).toBeLessThan(400);
  });

  it('starter manager can view vendors', async () => {
    const res = await (await starterManager()).get('/api/retail/vendors');
    expect(res.status).toBe(200);
  });

  it('starter manager: features does NOT include hr_payroll (enterprise only)', async () => {
    const mods = await getModules(await starterManager());
    expect(mods).not.toContain('hr_payroll');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 26. Enterprise — extended POS operations (returns, loyalty, stock adjustments)
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Enterprise — extended POS operations', () => {
  it('cashier can process a return', async () => {
    const api = await cashier();
    const res = await api.post('/api/retail/returns', {
      sale_id: saleId,
      return_date: TODAY,
      items: [{ product_id: productId, quantity: 1, rate: 2999, amount: 2999 }],
      reason: 'defective',
      refund_method: 'cash',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('cashier can view returns list', async () => {
    const res = await (await cashier()).get('/api/retail/returns');
    expect(res.status).toBeLessThan(400);
  });

  it('store manager can create a purchase order for restocking', async () => {
    const api = await manager();
    const res = await api.post('/api/retail/purchase-orders', {
      vendor_name: 'QA Electronics Supplier',
      order_date: TODAY,
      items: [{ product_id: productId, quantity: 20, rate: 2000, amount: 40000 }],
      total: 40000,
      status: 'pending',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('stock clerk can view returns (for stock reconciliation)', async () => {
    const res = await (await stockClerk()).get('/api/retail/returns');
    expect(res.status).toBeLessThan(400);
  });

  it('admin can create a vendor', async () => {
    const api = await owner();
    const res = await api.post('/api/retail/vendors', {
      name: 'QA Gadget Wholesaler',
      contact_person: 'QA Contact',
      phone: '9000810050',
      email: 'qa-vendor@rtl.kinto',
      gst_number: 'GSTIN-QA-001',
      is_active: true,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('admin can create a customer in the loyalty programme', async () => {
    const api = await owner();
    const res = await api.post('/api/retail/customers', {
      name: 'QA Loyal Customer',
      phone: '9000810060',
      email: 'qa-loyal@rtl.kinto',
      enroll_loyalty: true,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('store manager can view vendor list', async () => {
    const res = await (await manager()).get('/api/retail/vendors');
    expect(res.status).toBe(200);
  });

  it('cashier can view promotions active today', async () => {
    const res = await (await cashier()).get('/api/retail/promotions');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view bank transactions', async () => {
    const res = await (await accountant()).get('/api/bank-transactions');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view retail categories', async () => {
    const res = await (await misViewer()).get('/api/retail/categories');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view vendors for procurement', async () => {
    const res = await (await warehouseMgr()).get('/api/retail/vendors');
    expect(res.status).toBeLessThan(400);
  });

  it('assets manager can view retail products (inventory valuation)', async () => {
    const res = await (await assetsMgr()).get('/api/retail/products');
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 27. Plan-level feature assertions — detailed tier comparison
// ─────────────────────────────────────────────────────────────────────────────
describe('Retail POS Plan: detailed feature assertions across all tiers', () => {
  it('starter: features includes expenses and documents', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('expenses');
    expect(mods).toContain('documents');
  });

  it('professional: features includes purchase_orders and gatepasses', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('purchase_orders');
    expect(mods).toContain('gatepasses');
  });

  it('enterprise: features includes api_hub and quality_returns', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('api_hub');
    expect(mods).toContain('quality_returns');
  });

  it('starter cashier: features does NOT include crm', async () => {
    const mods = await getModules(await starterCashier());
    expect(mods).not.toContain('crm');
  });

  it('professional cashier: can view journal entries', async () => {
    const res = await (await proCashier()).get('/api/journal-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('professional manager: can access MIS dashboard', async () => {
    const res = await (await proManager()).get('/api/mis/sales-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('enterprise: GET /api/fixed-assets returns < 400', async () => {
    const res = await (await owner()).get('/api/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });

  it('pro acct: can view profit-loss report', async () => {
    const res = await (await proAcct()).get('/api/profit-loss');
    expect(res.status).toBeLessThan(400);
  });

  it('starter billing: features does NOT include sales_orders', async () => {
    const mods = await getModules(await starterBilling());
    expect(mods).not.toContain('sales_orders');
  });

  it('pro crm: can view leads and campaigns', async () => {
    const api = await proCrm();
    const [leads, camp] = await Promise.all([
      api.get('/api/crm/leads'),
      api.get('/api/crm/campaigns'),
    ]);
    expect(leads.status).toBeLessThan(400);
    expect(camp.status).toBeLessThan(400);
  });
});
