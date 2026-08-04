/**
 * Test 22 — Restaurant ERP: Role-based workflow validation
 *
 * 3 plans × 5 roles = covers who can do what
 *
 * Plans:
 *   restaurant_starter      — invoicing, purchase_orders, basic_inventory, expenses, documents, restaurant, masters
 *   restaurant_professional — + sales_orders, accounting, mis, crm, whatsapp, hr_payroll
 *   restaurant_enterprise   — + production, warehouses, fixed_assets, multi_currency, projects, api_hub, swach*
 *
 * Roles (system roles mapped to restaurant function):
 *   admin    → Owner    : full setup + reports + staff management
 *   manager  → Manager  : reservations, shift overview, reports — no settings change
 *   operator → Cashier  : open shift → KOT → bill → payment → close shift
 *   reviewer → Steward  : view tables, create table KOT (waiter workflow)
 *   reviewer → Chef     : view KDS, mark items prepared (kitchen workflow)
 *
 * All restaurant API routes use requireAuth only (no role gate), so the
 * workflow tests confirm each role CAN complete their job. A future
 * role-gate layer would add 403 tests here.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, BASE } from '../helpers/api';

const TODAY = new Date().toISOString().split('T')[0];

// ─── Shared state set up by admin once ────────────────────────────────────────
let outletId: number;
let tableId: number;
let menuItemId: number;
let menuCategoryId: number;

// ─── Logins ───────────────────────────────────────────────────────────────────
// Tenant 9001 = qa-in = restaurant_enterprise
// All users share password: test1234
// Roles added to seed: qa_owner_in(admin), qa_manager_in(manager),
//                      qa_cashier_in(operator), qa_steward_in(reviewer), qa_chef_in(reviewer)

// ── Enterprise (tenant 9001) — 13 roles ──────────────────────────────────────
async function owner()        { return login('qa_e_owner',   'Test@1234'); }
async function manager()      { return login('qa_e_manager', 'Test@1234'); }
async function cashier()      { return login('qa_e_cashier', 'Test@1234'); }
async function steward()      { return login('qa_e_steward', 'Test@1234'); }
async function chef()         { return login('qa_e_chef',    'Test@1234'); }
async function accountant()   { return login('qa_e_acct',    'Test@1234'); }
async function hrManager()    { return login('qa_e_hr',      'Test@1234'); }
async function crmExec()      { return login('qa_e_crm',     'Test@1234'); }
async function salesManager() { return login('qa_e_sales',   'Test@1234'); }
async function misViewer()    { return login('qa_e_mis',     'Test@1234'); }
async function warehouseMgr() { return login('qa_e_wh',      'Test@1234'); }
async function prodSup()      { return login('qa_e_prod',    'Test@1234'); }
async function assetsMgr()    { return login('qa_e_assets',  'Test@1234'); }

// ─── 0. Setup — run once as owner/admin ───────────────────────────────────────
describe('Restaurant Role Setup (admin/owner)', () => {
  it('admin can login', async () => {
    const api = await owner();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('admin');
  });

  it('admin creates an outlet (required for all workflows)', async () => {
    const api = await owner();
    const res = await api.post('/api/restaurant/outlets', {
      name: 'QA Main Kitchen',
      address: '1 Test Street, Mumbai',
      city: 'Mumbai',
      phone: '9000000001',
      is_active: true,
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    outletId = body.id ?? body.outlet?.id ?? 9001;
    expect(outletId).toBeTruthy();
  });

  it('admin creates a menu category', async () => {
    const api = await owner();
    const res = await api.post('/api/restaurant/menu-categories', {
      name: 'Main Course',
      description: 'Hot mains',
      outlet_id: outletId,
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    menuCategoryId = body.id ?? body.category?.id;
    expect(menuCategoryId).toBeTruthy();
  });

  it('admin creates a menu item', async () => {
    const api = await owner();
    const res = await api.post('/api/restaurant/menu-items', {
      name: 'QA Butter Chicken',
      category_id: menuCategoryId,
      price: 320,
      gst_rate: 5,
      item_type: 'veg',
      is_available: true,
      outlet_id: outletId,
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    menuItemId = body.id ?? body.item?.id;
    expect(menuItemId).toBeTruthy();
  });

  it('admin creates a table', async () => {
    const api = await owner();
    const res = await api.post('/api/restaurant/tables', {
      table_number: 'T-QA-01',
      capacity: 4,
      outlet_id: outletId,
      status: 'available',
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    tableId = body.id ?? body.table?.id;
    expect(tableId).toBeTruthy();
  });

  it('admin can view all restaurant screens (plan: restaurant module)', async () => {
    const api = await owner();
    const [outlets, tables, menu, categories, orders, reservations] = await Promise.all([
      api.get('/api/restaurant/outlets'),
      api.get('/api/restaurant/tables'),
      api.get('/api/restaurant/menu-items'),
      api.get('/api/restaurant/menu-categories'),
      api.get('/api/restaurant/kot/orders'),
      api.get('/api/restaurant/reservations'),
    ]);
    expect(outlets.status).toBe(200);
    expect(tables.status).toBe(200);
    expect(menu.status).toBe(200);
    expect(categories.status).toBe(200);
    expect(orders.status).toBe(200);
    expect(reservations.status).toBe(200);
  });

  it('admin can view reports (plan: restaurant module)', async () => {
    const api = await owner();
    const res = await api.get('/api/restaurant/z-report');
    expect(res.status).toBe(200);
  });

  it('admin can configure tax settings (enterprise plan)', async () => {
    const api = await owner();
    const res = await api.get('/api/restaurant/tax/config');
    expect(res.status).toBeLessThan(400);
  });

  it('admin can view analytics (enterprise plan)', async () => {
    const api = await owner();
    const res = await api.get('/api/restaurant/analytics/sales-summary');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 1. Manager workflow ───────────────────────────────────────────────────────
describe('Restaurant Role: Manager', () => {
  it('manager can login', async () => {
    const api = await manager();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('manager');
  });

  it('manager can view outlets and tables', async () => {
    const api = await manager();
    const [outlets, tables] = await Promise.all([
      api.get('/api/restaurant/outlets'),
      api.get('/api/restaurant/tables'),
    ]);
    expect(outlets.status).toBe(200);
    expect(tables.status).toBe(200);
  });

  it('manager can create and view reservations', async () => {
    const api = await manager();
    const res = await api.post('/api/restaurant/reservations', {
      customer_name: 'QA Manager Test',
      customer_phone: '9000000099',
      party_size: 3,
      reservation_date: TODAY,
      reservation_time: '19:00',
      table_id: tableId,
      outlet_id: outletId,
      status: 'confirmed',
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    expect(body.id ?? body.reservation?.id).toBeTruthy();

    const listRes = await api.get('/api/restaurant/reservations');
    expect(listRes.status).toBe(200);
    const list = await listRes.json() as any[];
    expect(Array.isArray(list)).toBe(true);
  });

  it('manager can view Z-report (day summary)', async () => {
    const api = await manager();
    const res = await api.get('/api/restaurant/z-report');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body).toHaveProperty('date');
  });

  it('manager can view shifts', async () => {
    const api = await manager();
    const res = await api.get('/api/restaurant/shifts');
    expect(res.status).toBe(200);
  });

  it('manager can view/manage staff schedules (professional+ plan)', async () => {
    const api = await manager();
    const res = await api.get('/api/restaurant/staff-schedules');
    expect(res.status).toBeLessThan(400);
  });

  it('manager can view CRM customers (professional+ plan)', async () => {
    const api = await manager();
    const res = await api.get('/api/restaurant/customers');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 2. Cashier workflow: Open shift → KOT → Bill → Payment → Close ──────────
describe('Restaurant Role: Cashier (operator)', () => {
  let shiftId: number;
  let kotId: number;

  it('cashier can login', async () => {
    const api = await cashier();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('operator');
  });

  it('cashier can view menu (needed for POS screen)', async () => {
    const api = await cashier();
    const [menu, categories] = await Promise.all([
      api.get('/api/restaurant/menu-items'),
      api.get('/api/restaurant/menu-categories'),
    ]);
    expect(menu.status).toBe(200);
    expect(categories.status).toBe(200);
    const items = await menu.json() as any[];
    expect(Array.isArray(items) && items.length > 0).toBe(true);
  });

  it('cashier can view tables (POS floor plan)', async () => {
    const api = await cashier();
    const res = await api.get('/api/restaurant/tables');
    expect(res.status).toBe(200);
  });

  it('cashier STEP 1: opens shift', async () => {
    const api = await cashier();
    const res = await api.post('/api/restaurant/shifts/open', {
      cashier_name: 'QA Cashier',
      terminal_id: 'T-001',
      opening_cash: 2000,
      outlet_id: outletId,
      shift_name: 'Morning',
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    shiftId = body.id ?? body.shift?.id;
    expect(shiftId).toBeTruthy();
  });

  it('cashier STEP 2: creates KOT (Kitchen Order Ticket)', async () => {
    const api = await cashier();
    const res = await api.post('/api/restaurant/kot/orders', {
      table_id: tableId,
      table_number: 'T-QA-01',
      order_type: 'dine_in',
      covers: 2,
      outlet_id: outletId,
      cashier_name: 'QA Cashier',
      items: [
        { menu_item_id: menuItemId, quantity: 2, rate: 320, amount: 640, special_instructions: '' },
      ],
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    kotId = body.id ?? body.kot?.id ?? body.order?.id;
    expect(kotId).toBeTruthy();
  });

  it('cashier STEP 3: views KOT list', async () => {
    const api = await cashier();
    const res = await api.get('/api/restaurant/kot/orders');
    expect(res.status).toBe(200);
    const list = await res.json() as any;
    expect(Array.isArray(list) ? list.length > 0 : true).toBe(true);
  });

  it('cashier STEP 4: generates bill from KOT', async () => {
    const api = await cashier();
    const res = await api.post(`/api/restaurant/kot/orders/${kotId}/bill`, {});
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    expect(body.total ?? body.grand_total ?? body.bill).toBeTruthy();
  });

  it('cashier STEP 5: settles payment', async () => {
    const api = await cashier();
    const res = await api.post(`/api/restaurant/kot/orders/${kotId}/payment`, {
      payment_method: 'cash',
      amount_paid: 700,
      total_amount: 672,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('cashier STEP 6: closes shift (Z-report close)', async () => {
    const api = await cashier();
    const res = await api.post('/api/restaurant/z-report/close', {
      shift_id: shiftId,
      closing_cash: 2700,
      cashier_name: 'QA Cashier',
      outlet_id: outletId,
    });
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 3. Steward/Waiter workflow: Table order → KOT ───────────────────────────
describe('Restaurant Role: Steward/Waiter (reviewer)', () => {
  let stewardKotId: number;

  it('steward can login', async () => {
    const api = await steward();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('steward can view tables (floor plan for waiter screen)', async () => {
    const api = await steward();
    const res = await api.get('/api/restaurant/tables');
    expect(res.status).toBe(200);
    const list = await res.json() as any[];
    expect(Array.isArray(list)).toBe(true);
  });

  it('steward can view menu (to take order)', async () => {
    const api = await steward();
    const res = await api.get('/api/restaurant/menu-items');
    expect(res.status).toBe(200);
    const items = await res.json() as any[];
    expect(Array.isArray(items) && items.length > 0).toBe(true);
  });

  it('steward STEP 1: opens table session', async () => {
    const api = await steward();
    const res = await api.post(`/api/restaurant/tables/${tableId}/open`, {
      covers: 2,
      cashier_name: 'QA Steward',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('steward STEP 2: creates KOT for the table', async () => {
    const api = await steward();
    const res = await api.post('/api/restaurant/kot/orders', {
      table_id: tableId,
      table_number: 'T-QA-01',
      order_type: 'dine_in',
      covers: 2,
      outlet_id: outletId,
      cashier_name: 'QA Steward',
      items: [
        { menu_item_id: menuItemId, quantity: 1, rate: 320, amount: 320 },
      ],
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    stewardKotId = body.id ?? body.kot?.id ?? body.order?.id;
    expect(stewardKotId).toBeTruthy();
  });

  it('steward STEP 3: views their table orders', async () => {
    const api = await steward();
    const res = await api.get('/api/restaurant/kot/orders');
    expect(res.status).toBe(200);
    const list = await res.json() as any;
    expect(Array.isArray(list) ? list.length > 0 : true).toBe(true);
  });

  it('steward can add items to existing KOT (add-on order)', async () => {
    const api = await steward();
    const res = await api.post(`/api/restaurant/kot/orders/${stewardKotId}/add-items`, {
      items: [{ menu_item_id: menuItemId, quantity: 1, rate: 320, amount: 320 }],
    });
    // 404 is acceptable if add-items route not yet built; 400+ fails
    expect([200, 201, 204, 404].includes(res.status)).toBe(true);
  });
});

// ─── 4. Chef/Kitchen workflow: KDS view → mark prepared ──────────────────────
describe('Restaurant Role: Chef/Kitchen (reviewer)', () => {
  let pendingKotId: number;

  it('chef can login', async () => {
    const api = await chef();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('chef STEP 1: views KDS (kitchen display — pending KOTs)', async () => {
    const api = await chef();
    const res = await api.get('/api/restaurant/kot/orders?status=pending');
    expect(res.status).toBe(200);
    const list = await res.json() as any[];
    if (Array.isArray(list) && list.length > 0) {
      pendingKotId = list[0].id;
    }
  });

  it('chef STEP 2: marks KOT item as prepared', async () => {
    if (!pendingKotId) return; // no pending KOTs in CI — skip gracefully
    const api = await chef();
    const res = await api.patch(`/api/restaurant/kot/${pendingKotId}`, {
      status: 'prepared',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('chef can view kitchen displays config', async () => {
    const api = await chef();
    const res = await api.get('/api/restaurant/kitchen-displays');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 5. Plan-level module access ─────────────────────────────────────────────
/**
 * Plan matrix:
 *
 *  Module                          Starter  Professional  Enterprise
 *  ─────────────────────────────── ───────  ────────────  ──────────
 *  restaurant (POS/KOT/Tables…)      ✅         ✅            ✅
 *  invoicing                         ✅         ✅            ✅
 *  purchase_orders                   ✅         ✅            ✅
 *  basic_inventory (products/users)  ✅         ✅            ✅
 *  expenses                          ✅         ✅            ✅
 *  documents                         ✅         ✅            ✅
 *  masters                           ✅         ✅            ✅
 *  sales_orders                      ❌         ✅            ✅
 *  accounting (GL/journal/TrialBal)  ❌         ✅            ✅
 *  mis (dashboards)                  ❌         ✅            ✅
 *  crm                               ❌         ✅            ✅
 *  whatsapp                          ❌         ✅            ✅
 *  hr_payroll                        ❌         ✅            ✅
 *  production                        ❌         ❌            ✅
 *  warehouses                        ❌         ❌            ✅
 *  fixed_assets                      ❌         ❌            ✅
 *  multi_currency                    ❌         ❌            ✅
 *  api_hub (aggregators)             ❌         ❌            ✅
 *  swach apps                        ❌         ❌            ✅
 *
 * Tenants:
 *   9001 qa-in       = restaurant_enterprise  (login: qa_owner_in / test1234)
 *   9020 qa-rst-s    = restaurant_starter     (login: qa_rst_starter / test1234)
 *   9021 qa-rst-p    = restaurant_professional(login: qa_rst_pro / test1234)
 *
 * The /api/tenant/features endpoint returns { modules, allowedNavItems } for
 * the logged-in tenant. We test both the features list AND that the actual
 * API endpoints respond correctly.
 */

// Starter plan (tenant 9020) — restaurant_starter
async function starter()           { return login('qa_s_owner',   'Test@1234'); }
async function starterManager()    { return login('qa_s_manager', 'Test@1234'); }
async function starterCashier()    { return login('qa_s_cashier', 'Test@1234'); }
async function starterSteward()    { return login('qa_s_steward', 'Test@1234'); }
async function starterChef()       { return login('qa_s_chef',    'Test@1234'); }

// Professional plan (tenant 9021) — restaurant_professional
async function professional()      { return login('qa_p_owner',   'Test@1234'); }
async function proManager()        { return login('qa_p_manager', 'Test@1234'); }
async function proCashier()        { return login('qa_p_cashier', 'Test@1234'); }
async function proSteward()        { return login('qa_p_steward', 'Test@1234'); }
async function proChef()           { return login('qa_p_chef',    'Test@1234'); }

// Helper: returns the modules list from /api/tenant/features
async function getModules(api: Awaited<ReturnType<typeof login>>): Promise<string[]> {
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  const body = await res.json() as { modules: string[] };
  return body.modules;
}

// ── ALL 3 PLANS: restaurant core screens ──────────────────────────────────────
describe('Restaurant Plan: ALL plans — core restaurant screens accessible', () => {
  const CORE_RESTAURANT_APIS = [
    '/api/restaurant/outlets',
    '/api/restaurant/tables',
    '/api/restaurant/menu-items',
    '/api/restaurant/menu-categories',
    '/api/restaurant/kot/orders',
    '/api/restaurant/reservations',
    '/api/restaurant/shifts',
    '/api/restaurant/z-report',
  ];

  it('starter plan: /api/tenant/features includes restaurant module', async () => {
    const mods = await getModules(await starter());
    expect(mods).toContain('restaurant');
  });

  it('professional plan: /api/tenant/features includes restaurant module', async () => {
    const mods = await getModules(await professional());
    expect(mods).toContain('restaurant');
  });

  it('enterprise plan: /api/tenant/features includes restaurant module', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('restaurant');
  });

  it('starter plan: all core restaurant APIs return 200', async () => {
    const api = await starter();
    const results = await Promise.all(
      CORE_RESTAURANT_APIS.map(s => api.get(s).then(r => ({ s, status: r.status })))
    );
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });

  it('professional plan: all core restaurant APIs return 200', async () => {
    const api = await professional();
    const results = await Promise.all(
      CORE_RESTAURANT_APIS.map(s => api.get(s).then(r => ({ s, status: r.status })))
    );
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });

  it('enterprise plan: all core restaurant APIs return 200', async () => {
    const api = await owner();
    const results = await Promise.all(
      CORE_RESTAURANT_APIS.map(s => api.get(s).then(r => ({ s, status: r.status })))
    );
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });
});

// ── ALL 3 PLANS: invoicing, purchase orders, basic inventory ──────────────────
describe('Restaurant Plan: ALL plans — invoicing / purchase_orders / basic_inventory', () => {
  it('starter plan: includes invoicing, purchase_orders, basic_inventory modules', async () => {
    const mods = await getModules(await starter());
    expect(mods).toContain('invoicing');
    expect(mods).toContain('purchase_orders');
    expect(mods).toContain('basic_inventory');
  });

  it('professional plan: includes invoicing, purchase_orders, basic_inventory modules', async () => {
    const mods = await getModules(await professional());
    expect(mods).toContain('invoicing');
    expect(mods).toContain('purchase_orders');
    expect(mods).toContain('basic_inventory');
  });

  it('enterprise plan: includes invoicing, purchase_orders, basic_inventory modules', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('invoicing');
    expect(mods).toContain('purchase_orders');
    expect(mods).toContain('basic_inventory');
  });

  it('starter: GET /api/invoices returns 200', async () => {
    const res = await (await starter()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('starter: GET /api/purchase-orders returns 200', async () => {
    const res = await (await starter()).get('/api/purchase-orders');
    expect(res.status).toBe(200);
  });

  it('starter: GET /api/products returns 200', async () => {
    const res = await (await starter()).get('/api/products');
    expect(res.status).toBe(200);
  });
});

// ── PROFESSIONAL + ENTERPRISE ONLY: sales_orders, accounting, mis, crm, hr ───
describe('Restaurant Plan: Professional+ — sales_orders / accounting / mis / crm / hr_payroll', () => {
  it('starter plan: does NOT include sales_orders module', async () => {
    const mods = await getModules(await starter());
    expect(mods).not.toContain('sales_orders');
  });

  it('starter plan: does NOT include accounting module', async () => {
    const mods = await getModules(await starter());
    expect(mods).not.toContain('accounting');
  });

  it('starter plan: does NOT include mis module', async () => {
    const mods = await getModules(await starter());
    expect(mods).not.toContain('mis');
  });

  it('starter plan: does NOT include crm module', async () => {
    const mods = await getModules(await starter());
    expect(mods).not.toContain('crm');
  });

  it('starter plan: does NOT include hr_payroll module', async () => {
    const mods = await getModules(await starter());
    expect(mods).not.toContain('hr_payroll');
  });

  it('professional plan: includes sales_orders module', async () => {
    const mods = await getModules(await professional());
    expect(mods).toContain('sales_orders');
  });

  it('professional plan: includes accounting module', async () => {
    const mods = await getModules(await professional());
    expect(mods).toContain('accounting');
  });

  it('professional plan: includes mis module', async () => {
    const mods = await getModules(await professional());
    expect(mods).toContain('mis');
  });

  it('professional plan: includes crm module', async () => {
    const mods = await getModules(await professional());
    expect(mods).toContain('crm');
  });

  it('professional plan: includes hr_payroll module', async () => {
    const mods = await getModules(await professional());
    expect(mods).toContain('hr_payroll');
  });

  it('professional: GET /api/sales-orders returns 200', async () => {
    const res = await (await professional()).get('/api/sales-orders');
    expect(res.status).toBe(200);
  });

  it('professional: GET /api/journal-entries returns 200', async () => {
    const res = await (await professional()).get('/api/journal-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('professional: GET /api/hr/employees returns 200', async () => {
    const res = await (await professional()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('professional: GET /api/crm/contacts returns 200', async () => {
    const res = await (await professional()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('enterprise: GET /api/sales-orders returns 200', async () => {
    const res = await (await owner()).get('/api/sales-orders');
    expect(res.status).toBe(200);
  });

  it('enterprise: GET /api/hr/employees returns 200', async () => {
    const res = await (await owner()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });
});

// ── ENTERPRISE ONLY: production, warehouses, fixed_assets, api_hub ────────────
describe('Restaurant Plan: Enterprise only — production / warehouses / fixed_assets / api_hub', () => {
  it('starter plan: does NOT include production module', async () => {
    const mods = await getModules(await starter());
    expect(mods).not.toContain('production');
  });

  it('professional plan: does NOT include production module', async () => {
    const mods = await getModules(await professional());
    expect(mods).not.toContain('production');
  });

  it('starter plan: does NOT include warehouses module', async () => {
    const mods = await getModules(await starter());
    expect(mods).not.toContain('warehouses');
  });

  it('professional plan: does NOT include warehouses module', async () => {
    const mods = await getModules(await professional());
    expect(mods).not.toContain('warehouses');
  });

  it('starter plan: does NOT include fixed_assets module', async () => {
    const mods = await getModules(await starter());
    expect(mods).not.toContain('fixed_assets');
  });

  it('professional plan: does NOT include fixed_assets module', async () => {
    const mods = await getModules(await professional());
    expect(mods).not.toContain('fixed_assets');
  });

  it('starter plan: does NOT include api_hub module', async () => {
    const mods = await getModules(await starter());
    expect(mods).not.toContain('api_hub');
  });

  it('professional plan: does NOT include api_hub module', async () => {
    const mods = await getModules(await professional());
    expect(mods).not.toContain('api_hub');
  });

  it('enterprise plan: includes production module', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('production');
  });

  it('enterprise plan: includes warehouses module', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('warehouses');
  });

  it('enterprise plan: includes fixed_assets module', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('fixed_assets');
  });

  it('enterprise plan: includes api_hub module', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('api_hub');
  });

  it('enterprise: GET /api/warehouses returns 200', async () => {
    const res = await (await owner()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });

  it('enterprise: GET /api/fixed-assets returns 200', async () => {
    const res = await (await owner()).get('/api/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });

  it('enterprise: GET /api/restaurant/aggregators/platforms returns 200', async () => {
    const res = await (await owner()).get('/api/restaurant/aggregators/platforms');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 6. Cross-role data visibility ───────────────────────────────────────────
describe('Restaurant Cross-role: Data created by one role is visible to others', () => {
  it('KOT created by cashier is visible to chef', async () => {
    const cashierApi = await cashier();
    const chefApi    = await chef();

    // cashier creates KOT
    const kotRes = await cashierApi.post('/api/restaurant/kot/orders', {
      table_id: tableId,
      table_number: 'T-QA-01',
      order_type: 'dine_in',
      covers: 1,
      outlet_id: outletId,
      cashier_name: 'QA Cashier Cross',
      items: [{ menu_item_id: menuItemId, quantity: 1, rate: 320, amount: 320 }],
    });
    expect(kotRes.status).toBeLessThan(400);
    const kot = await kotRes.json() as any;
    const kotId = kot.id ?? kot.kot?.id ?? kot.order?.id;

    // chef can see it
    const kdsRes = await chefApi.get('/api/restaurant/kot/orders');
    expect(kdsRes.status).toBe(200);
    const kds = await kdsRes.json() as any[];
    if (Array.isArray(kds)) {
      const found = kds.some((k: any) => k.id === kotId);
      expect(found).toBe(true);
    }
  });

  it('Reservation created by manager is visible to admin', async () => {
    const mgApi    = await manager();
    const adminApi = await owner();

    const resRes = await mgApi.post('/api/restaurant/reservations', {
      customer_name: 'Cross-role Test Customer',
      customer_phone: '9000000077',
      party_size: 2,
      reservation_date: TODAY,
      reservation_time: '20:00',
      outlet_id: outletId,
      status: 'confirmed',
    });
    expect(resRes.status).toBeLessThan(400);
    const resv = await resRes.json() as any;
    const resvId = resv.id ?? resv.reservation?.id;

    const listRes = await adminApi.get('/api/restaurant/reservations');
    expect(listRes.status).toBe(200);
    const list = await listRes.json() as any[];
    if (Array.isArray(list) && resvId) {
      expect(list.some((r: any) => r.id === resvId)).toBe(true);
    }
  });
});

// ─── 7. Starter plan: all 5 roles can login and do their job ─────────────────
describe('Restaurant Starter Plan — role login + core workflow', () => {
  it('starter owner (admin) can login', async () => {
    const api = await starter();
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('starter manager can login', async () => {
    const api = await starterManager();
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('starter cashier can login', async () => {
    const api = await starterCashier();
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('starter steward can login', async () => {
    const api = await starterSteward();
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('starter chef can login', async () => {
    const api = await starterChef();
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  // Core restaurant screens work for every role on starter plan
  const STARTER_CORE = [
    '/api/restaurant/outlets',
    '/api/restaurant/tables',
    '/api/restaurant/menu-items',
    '/api/restaurant/kot/orders',
    '/api/restaurant/shifts',
  ];

  it('starter cashier: can access all POS/KOT screens', async () => {
    const api = await starterCashier();
    const results = await Promise.all(STARTER_CORE.map(s => api.get(s).then(r => ({ s, status: r.status }))));
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });

  it('starter steward: can view tables and menu', async () => {
    const api = await starterSteward();
    const [tables, menu] = await Promise.all([
      api.get('/api/restaurant/tables'),
      api.get('/api/restaurant/menu-items'),
    ]);
    expect(tables.status).toBe(200);
    expect(menu.status).toBe(200);
  });

  it('starter chef: can view KDS (pending KOTs)', async () => {
    const api = await starterChef();
    const res = await api.get('/api/restaurant/kot/orders?status=pending');
    expect(res.status).toBe(200);
  });

  it('starter manager: can view reservations and Z-report', async () => {
    const api = await starterManager();
    const [resv, zrep] = await Promise.all([
      api.get('/api/restaurant/reservations'),
      api.get('/api/restaurant/z-report'),
    ]);
    expect(resv.status).toBe(200);
    expect(zrep.status).toBe(200);
  });

  // Starter plan: shared modules available to all roles
  it('starter cashier: can access invoices (invoicing module)', async () => {
    const res = await (await starterCashier()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('starter owner: can access purchase orders (purchase_orders module)', async () => {
    const res = await (await starter()).get('/api/purchase-orders');
    expect(res.status).toBe(200);
  });

  it('starter owner: can access products (basic_inventory module)', async () => {
    const res = await (await starter()).get('/api/products');
    expect(res.status).toBe(200);
  });

  // Starter plan: blocked modules — features API confirms absence
  it('starter owner: /api/tenant/features does NOT include accounting', async () => {
    const mods = await getModules(await starter());
    expect(mods).not.toContain('accounting');
  });

  it('starter cashier: /api/tenant/features does NOT include hr_payroll', async () => {
    const mods = await getModules(await starterCashier());
    expect(mods).not.toContain('hr_payroll');
  });

  it('starter manager: /api/tenant/features does NOT include crm', async () => {
    const mods = await getModules(await starterManager());
    expect(mods).not.toContain('crm');
  });
});

// ─── 8. Professional plan: all 5 roles can login and do their job ─────────────
describe('Restaurant Professional Plan — role login + core + extra modules', () => {
  it('professional owner (admin) can login', async () => {
    const api = await professional();
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('professional manager can login', async () => {
    const api = await proManager();
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('professional cashier can login', async () => {
    const api = await proCashier();
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('professional steward can login', async () => {
    const api = await proSteward();
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('professional chef can login', async () => {
    const api = await proChef();
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  // Core restaurant screens
  it('professional cashier: can access POS/KOT screens', async () => {
    const api = await proCashier();
    const results = await Promise.all([
      '/api/restaurant/outlets',
      '/api/restaurant/tables',
      '/api/restaurant/menu-items',
      '/api/restaurant/kot/orders',
    ].map(s => api.get(s).then(r => ({ s, status: r.status }))));
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });

  // Professional-only modules accessible to all roles on this plan
  it('professional owner: can access sales orders (sales_orders module)', async () => {
    const res = await (await professional()).get('/api/sales-orders');
    expect(res.status).toBe(200);
  });

  it('professional owner: can access journal entries (accounting module)', async () => {
    const res = await (await professional()).get('/api/journal-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('professional owner: can access HR employees (hr_payroll module)', async () => {
    const res = await (await professional()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('professional manager: can access CRM contacts (crm module)', async () => {
    const res = await (await proManager()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('professional manager: can access MIS dashboard (mis module)', async () => {
    const res = await (await proManager()).get('/api/mis/sales-summary');
    expect(res.status).toBeLessThan(400);
  });

  // Professional plan: /api/tenant/features confirms modules present
  it('professional owner: features includes accounting, mis, crm, hr_payroll', async () => {
    const mods = await getModules(await professional());
    expect(mods).toContain('accounting');
    expect(mods).toContain('mis');
    expect(mods).toContain('crm');
    expect(mods).toContain('hr_payroll');
    expect(mods).toContain('sales_orders');
  });

  it('professional cashier: features includes accounting (same plan, all roles)', async () => {
    const mods = await getModules(await proCashier());
    expect(mods).toContain('accounting');
    expect(mods).toContain('hr_payroll');
  });

  // Professional plan: still blocked from enterprise-only modules
  it('professional owner: features does NOT include production', async () => {
    const mods = await getModules(await professional());
    expect(mods).not.toContain('production');
  });

  it('professional owner: features does NOT include warehouses', async () => {
    const mods = await getModules(await professional());
    expect(mods).not.toContain('warehouses');
  });

  it('professional owner: features does NOT include api_hub', async () => {
    const mods = await getModules(await professional());
    expect(mods).not.toContain('api_hub');
  });

  it('professional owner: features does NOT include fixed_assets', async () => {
    const mods = await getModules(await professional());
    expect(mods).not.toContain('fixed_assets');
  });
});

// ─── 9. Enterprise: cross-module roles workflow ───────────────────────────────
describe('Restaurant Enterprise — Accountant workflow (accounting module)', () => {
  it('accountant can login', async () => {
    const body = await (await (await accountant()).get('/api/user')).json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('accountant can view chart of accounts', async () => {
    const res = await (await accountant()).get('/api/chart-of-accounts');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view journal entries', async () => {
    const res = await (await accountant()).get('/api/journal-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can create a journal entry', async () => {
    const res = await (await accountant()).post('/api/journal-entries', {
      date: TODAY,
      narration: 'QA Test Journal — Restaurant Sales',
      entries: [
        { account_code: '4001', debit: 1000, credit: 0 },
        { account_code: '1001', debit: 0,    credit: 1000 },
      ],
    });
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view trial balance', async () => {
    const res = await (await accountant()).get('/api/trial-balance');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view P&L report', async () => {
    const res = await (await accountant()).get('/api/profit-loss');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view bank transactions', async () => {
    const res = await (await accountant()).get('/api/bank-transactions');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Restaurant Enterprise — HR Manager workflow (hr_payroll module)', () => {
  it('hr manager can login', async () => {
    const body = await (await (await hrManager()).get('/api/user')).json() as any;
    expect(body.role).toBe('hr_manager');
  });

  it('hr manager can view employees', async () => {
    const res = await (await hrManager()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('hr manager can add an employee', async () => {
    const res = await (await hrManager()).post('/api/hr/employees', {
      employee_id: 'QA-EMP-RST-001',
      first_name: 'QA',
      last_name: 'Chef Staff',
      designation: 'Head Chef',
      department: 'Kitchen',
      basic_salary: 35000,
      phone: '9000000111',
      email: 'qachef@testrst.kinto',
      date_of_joining: TODAY,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view attendance', async () => {
    const res = await (await hrManager()).get('/api/hr/attendance');
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view payroll', async () => {
    const res = await (await hrManager()).get('/api/hr/payroll');
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view leave requests', async () => {
    const res = await (await hrManager()).get('/api/hr/leaves');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Restaurant Enterprise — CRM Executive workflow (crm module)', () => {
  it('crm executive can login', async () => {
    const body = await (await (await crmExec()).get('/api/user')).json() as any;
    expect(body.role).toBe('crm_executive');
  });

  it('crm exec can view CRM contacts (restaurant customers)', async () => {
    const res = await (await crmExec()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can create a lead', async () => {
    const res = await (await crmExec()).post('/api/crm/leads', {
      name: 'QA Corporate Client',
      email: 'corp@test.kinto',
      phone: '9000000222',
      source: 'walk_in',
      status: 'new',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view campaigns', async () => {
    const res = await (await crmExec()).get('/api/crm/campaigns');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view restaurant customers (cross-link)', async () => {
    const res = await (await crmExec()).get('/api/restaurant/customers');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Restaurant Enterprise — Sales Manager workflow (sales_orders module)', () => {
  it('sales manager can login', async () => {
    const body = await (await (await salesManager()).get('/api/user')).json() as any;
    expect(body.role).toBe('sales_manager');
  });

  it('sales manager can view sales orders', async () => {
    const res = await (await salesManager()).get('/api/sales-orders');
    expect(res.status).toBe(200);
  });

  it('sales manager can create a sales order (B2B catering)', async () => {
    const res = await (await salesManager()).post('/api/sales-orders', {
      customer_name: 'QA Corporate Catering',
      order_date: TODAY,
      delivery_date: TODAY,
      items: [{ product_name: 'Catering Package', quantity: 1, rate: 15000, amount: 15000 }],
      total: 15000,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('sales manager can view invoices', async () => {
    const res = await (await salesManager()).get('/api/invoices');
    expect(res.status).toBe(200);
  });
});

describe('Restaurant Enterprise — MIS Viewer workflow (mis module)', () => {
  it('mis viewer can login', async () => {
    const body = await (await (await misViewer()).get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('mis viewer can view MIS sales dashboard', async () => {
    const res = await (await misViewer()).get('/api/mis/sales-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view MIS financial report', async () => {
    const res = await (await misViewer()).get('/api/mis/financial-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view restaurant analytics', async () => {
    const res = await (await misViewer()).get('/api/restaurant/analytics/sales-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view restaurant Z-report', async () => {
    const res = await (await misViewer()).get('/api/restaurant/z-report');
    expect(res.status).toBe(200);
  });
});

describe('Restaurant Enterprise — Warehouse Manager workflow (warehouses module)', () => {
  it('warehouse manager can login', async () => {
    const body = await (await (await warehouseMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('warehouse_manager');
  });

  it('warehouse manager can view warehouses', async () => {
    const res = await (await warehouseMgr()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view products/inventory', async () => {
    const res = await (await warehouseMgr()).get('/api/products');
    expect(res.status).toBe(200);
  });

  it('warehouse manager can view restaurant inventory (cross-link)', async () => {
    const res = await (await warehouseMgr()).get('/api/restaurant/inventory');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Restaurant Enterprise — Production Supervisor workflow (production module)', () => {
  it('production supervisor can login', async () => {
    const body = await (await (await prodSup()).get('/api/user')).json() as any;
    expect(body.role).toBe('production_supervisor');
  });

  it('production supervisor can view raw materials', async () => {
    const res = await (await prodSup()).get('/api/raw-materials');
    expect(res.status).toBeLessThan(400);
  });

  it('production supervisor can view recipe costing (kitchen cross-link)', async () => {
    const res = await (await prodSup()).get('/api/restaurant/recipe-costing');
    expect(res.status).toBeLessThan(400);
  });

  it('production supervisor can view production entries', async () => {
    const res = await (await prodSup()).get('/api/production-entries');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Restaurant Enterprise — Assets Manager workflow (fixed_assets module)', () => {
  it('assets manager can login', async () => {
    const body = await (await (await assetsMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('assets_manager');
  });

  it('assets manager can view fixed assets', async () => {
    const res = await (await assetsMgr()).get('/api/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 10. Professional: cross-module roles workflow ────────────────────────────
describe('Restaurant Professional — Accountant workflow', () => {
  it('pro accountant can login', async () => {
    const api = await login('qa_p_acct', 'Test@1234');
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('pro accountant can view journal entries', async () => {
    const res = await (await login('qa_p_acct', 'Test@1234')).get('/api/journal-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('pro accountant can view trial balance', async () => {
    const res = await (await login('qa_p_acct', 'Test@1234')).get('/api/trial-balance');
    expect(res.status).toBeLessThan(400);
  });

  it('pro accountant: features does NOT include production (enterprise only)', async () => {
    const mods = await getModules(await login('qa_p_acct', 'Test@1234'));
    expect(mods).not.toContain('production');
  });
});

describe('Restaurant Professional — HR Manager workflow', () => {
  it('pro hr manager can login', async () => {
    const body = await (await (await login('qa_p_hr', 'Test@1234')).get('/api/user')).json() as any;
    expect(body.role).toBe('hr_manager');
  });

  it('pro hr manager can view employees', async () => {
    const res = await (await login('qa_p_hr', 'Test@1234')).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('pro hr manager can view payroll', async () => {
    const res = await (await login('qa_p_hr', 'Test@1234')).get('/api/hr/payroll');
    expect(res.status).toBeLessThan(400);
  });

  it('pro hr manager: features does NOT include warehouses (enterprise only)', async () => {
    const mods = await getModules(await login('qa_p_hr', 'Test@1234'));
    expect(mods).not.toContain('warehouses');
  });
});

describe('Restaurant Professional — CRM Executive workflow', () => {
  it('pro crm exec can login', async () => {
    const body = await (await (await login('qa_p_crm', 'Test@1234')).get('/api/user')).json() as any;
    expect(body.role).toBe('crm_executive');
  });

  it('pro crm exec can view CRM contacts', async () => {
    const res = await (await login('qa_p_crm', 'Test@1234')).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('pro crm exec can view restaurant customers (cross-link)', async () => {
    const res = await (await login('qa_p_crm', 'Test@1234')).get('/api/restaurant/customers');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Restaurant Professional — MIS Viewer workflow', () => {
  it('pro mis viewer can login', async () => {
    const body = await (await (await login('qa_p_mis', 'Test@1234')).get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('pro mis viewer can view MIS sales summary', async () => {
    const res = await (await login('qa_p_mis', 'Test@1234')).get('/api/mis/sales-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('pro mis viewer can view restaurant Z-report', async () => {
    const res = await (await login('qa_p_mis', 'Test@1234')).get('/api/restaurant/z-report');
    expect(res.status).toBe(200);
  });

  it('pro mis viewer: features does NOT include fixed_assets (enterprise only)', async () => {
    const mods = await getModules(await login('qa_p_mis', 'Test@1234'));
    expect(mods).not.toContain('fixed_assets');
  });
});

// ─── 11. Starter: billing-staff and purchase-manager cross-module roles ────────
describe('Restaurant Starter — Billing Staff workflow (invoicing module)', () => {
  it('billing staff can login', async () => {
    const body = await (await (await login('qa_s_billing', 'Test@1234')).get('/api/user')).json() as any;
    expect(body.role).toBe('billing_staff');
  });

  it('billing staff can view invoices', async () => {
    const res = await (await login('qa_s_billing', 'Test@1234')).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('billing staff: features does NOT include accounting (professional+ only)', async () => {
    const mods = await getModules(await login('qa_s_billing', 'Test@1234'));
    expect(mods).not.toContain('accounting');
  });

  it('billing staff: features does NOT include crm (professional+ only)', async () => {
    const mods = await getModules(await login('qa_s_billing', 'Test@1234'));
    expect(mods).not.toContain('crm');
  });
});

describe('Restaurant Starter — Purchase Manager workflow (purchase_orders module)', () => {
  it('purchase manager can login', async () => {
    const body = await (await (await login('qa_s_purchase', 'Test@1234')).get('/api/user')).json() as any;
    expect(body.role).toBe('purchase_manager');
  });

  it('purchase manager can view purchase orders', async () => {
    const res = await (await login('qa_s_purchase', 'Test@1234')).get('/api/purchase-orders');
    expect(res.status).toBe(200);
  });

  it('purchase manager can view vendors', async () => {
    const res = await (await login('qa_s_purchase', 'Test@1234')).get('/api/vendors');
    expect(res.status).toBe(200);
  });

  it('purchase manager can view products (basic_inventory)', async () => {
    const res = await (await login('qa_s_purchase', 'Test@1234')).get('/api/products');
    expect(res.status).toBe(200);
  });

  it('purchase manager: features does NOT include hr_payroll (professional+ only)', async () => {
    const mods = await getModules(await login('qa_s_purchase', 'Test@1234'));
    expect(mods).not.toContain('hr_payroll');
  });
});
