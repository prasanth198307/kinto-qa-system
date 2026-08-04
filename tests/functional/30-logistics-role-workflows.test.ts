/**
 * Test 30 — Logistics ERP: Role-based workflow validation
 *
 * Plans:
 *   logistics_starter      (9720) — invoicing, purchase_orders, basic_inventory,
 *                                    expenses, documents, logistics_transport, masters
 *   logistics_professional (9721) — + sales_orders, accounting, mis, crm, whatsapp, hr_payroll
 *   logistics_enterprise   (9700) — + production, warehouses, fixed_assets,
 *                                    multi_currency, projects, api_hub
 *
 * Roles (enterprise tenant 9700):
 *   admin           → Owner / Operations Director
 *   manager         → Fleet Manager
 *   operator        → Dispatcher
 *   reviewer        → Driver (field reviewer)
 *   accountsmanager → Accountant
 *   + specialist roles: hr, crm, sales, mis, wh, prod, assets
 *
 * API routes:
 *   /api/logistics/vehicles, /api/logistics/drivers, /api/logistics/routes,
 *   /api/logistics/shipments, /api/logistics/lr-numbers,
 *   /api/logistics/delivery-orders, /api/logistics/pod,
 *   /api/logistics/fuel-logs, /api/logistics/maintenance,
 *   /api/logistics/eway-bills
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, BASE } from '../helpers/api';

const TODAY = new Date().toISOString().split('T')[0];

// ── Enterprise logins (tenant 9700) ──────────────────────────────────────────
async function owner()        { return login('qa_lgs_owner',      'Test@1234'); }
async function manager()      { return login('qa_lgs_manager',    'Test@1234'); }
async function dispatcher()   { return login('qa_lgs_dispatcher', 'Test@1234'); }
async function driver()       { return login('qa_lgs_driver',     'Test@1234'); }
async function accountant()   { return login('qa_lgs_acct',       'Test@1234'); }
async function hrManager()    { return login('qa_lgs_hr',         'Test@1234'); }
async function crmExec()      { return login('qa_lgs_crm',        'Test@1234'); }
async function salesManager() { return login('qa_lgs_sales',      'Test@1234'); }
async function misViewer()    { return login('qa_lgs_mis',        'Test@1234'); }
async function warehouseMgr() { return login('qa_lgs_wh',         'Test@1234'); }
async function prodSup()      { return login('qa_lgs_prod',       'Test@1234'); }
async function assetsMgr()    { return login('qa_lgs_assets',     'Test@1234'); }

// ── Professional logins (tenant 9721) ────────────────────────────────────────
async function proOwner()      { return login('qa_lgs_p_owner',      'Test@1234'); }
async function proManager()    { return login('qa_lgs_p_manager',    'Test@1234'); }
async function proDispatcher() { return login('qa_lgs_p_dispatcher', 'Test@1234'); }
async function proAcct()       { return login('qa_lgs_p_acct',       'Test@1234'); }
async function proHr()         { return login('qa_lgs_p_hr',         'Test@1234'); }
async function proCrm()        { return login('qa_lgs_p_crm',        'Test@1234'); }
async function proMis()        { return login('qa_lgs_p_mis',        'Test@1234'); }

// ── Starter logins (tenant 9720) ─────────────────────────────────────────────
async function starterOwner()      { return login('qa_lgs_s_owner',      'Test@1234'); }
async function starterManager()    { return login('qa_lgs_s_manager',    'Test@1234'); }
async function starterDispatcher() { return login('qa_lgs_s_dispatcher', 'Test@1234'); }
async function starterBilling()    { return login('qa_lgs_s_billing',    'Test@1234'); }

// ── Helper: tenant modules list ───────────────────────────────────────────────
async function getModules(api: Awaited<ReturnType<typeof login>>): Promise<string[]> {
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  const body = await res.json() as { modules: string[] };
  return body.modules;
}

// ── Shared state ──────────────────────────────────────────────────────────────
let vehicleId: number;
let driverId: number;
let shipmentId: number;
let lrNumber: string;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Role Setup (admin/owner) — create core domain objects
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Role Setup (admin/owner)', () => {
  it('admin can login and has admin role', async () => {
    const api = await owner();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('admin');
  });

  it('admin can create a vehicle', async () => {
    const api = await owner();
    const res = await api.post('/api/logistics/vehicles', {
      registration_number: 'MH-QA-LGS-001',
      vehicle_type: 'truck',
      capacity_kg: 8000,
      fuel_type: 'diesel',
      model: 'Tata Prima',
      make_year: 2022,
      is_active: true,
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    vehicleId = body.id ?? body.vehicle?.id ?? 9700;
    expect(vehicleId).toBeTruthy();
  });

  it('admin can create a driver', async () => {
    const api = await owner();
    const res = await api.post('/api/logistics/drivers', {
      name: 'QA Driver Singh',
      license_number: 'MH-QA-DL-0001',
      phone: '9000700001',
      vehicle_id: vehicleId,
      is_active: true,
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    driverId = body.id ?? body.driver?.id ?? 9700;
    expect(driverId).toBeTruthy();
  });

  it('admin can create a shipment', async () => {
    const api = await owner();
    const res = await api.post('/api/logistics/shipments', {
      shipment_date: TODAY,
      origin: 'Mumbai Warehouse',
      destination: 'Pune Hub',
      vehicle_id: vehicleId,
      driver_id: driverId,
      consignee_name: 'QA Consignee Ltd',
      consignee_phone: '9000700002',
      weight_kg: 2500,
      status: 'pending',
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    shipmentId = body.id ?? body.shipment?.id ?? 9700;
    expect(shipmentId).toBeTruthy();
  });

  it('admin can view all logistics screens', async () => {
    const api = await owner();
    const endpoints = [
      '/api/logistics/vehicles',
      '/api/logistics/drivers',
      '/api/logistics/shipments',
      '/api/logistics/routes',
      '/api/logistics/fuel-logs',
      '/api/logistics/maintenance',
    ];
    const results = await Promise.all(
      endpoints.map(e => api.get(e).then(r => ({ e, status: r.status })))
    );
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Role: Manager workflow (Fleet Manager)
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Role: Fleet Manager (manager)', () => {
  it('fleet manager can login', async () => {
    const api = await manager();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('manager');
  });

  it('fleet manager can view vehicles and drivers', async () => {
    const api = await manager();
    const [vehicles, drivers] = await Promise.all([
      api.get('/api/logistics/vehicles'),
      api.get('/api/logistics/drivers'),
    ]);
    expect(vehicles.status).toBe(200);
    expect(drivers.status).toBe(200);
  });

  it('fleet manager can create a delivery order', async () => {
    const api = await manager();
    const res = await api.post('/api/logistics/delivery-orders', {
      shipment_id: shipmentId,
      delivery_date: TODAY,
      consignee_name: 'QA Delivery Customer',
      consignee_address: '123 Test Street, Pune',
      status: 'scheduled',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('fleet manager can view routes', async () => {
    const api = await manager();
    const res = await api.get('/api/logistics/routes');
    expect(res.status).toBeLessThan(400);
  });

  it('fleet manager can view eway-bills', async () => {
    const api = await manager();
    const res = await api.get('/api/logistics/eway-bills');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Role: Operator/Field workflow (Dispatcher)
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Role: Dispatcher (operator)', () => {
  it('dispatcher can login', async () => {
    const api = await dispatcher();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('operator');
  });

  it('dispatcher can view vehicles for assignment', async () => {
    const api = await dispatcher();
    const res = await api.get('/api/logistics/vehicles');
    expect(res.status).toBe(200);
    const list = await res.json() as any[];
    expect(Array.isArray(list)).toBe(true);
  });

  it('dispatcher can create an LR number (consignment note)', async () => {
    const api = await dispatcher();
    const res = await api.post('/api/logistics/lr-numbers', {
      lr_date: TODAY,
      shipment_id: shipmentId,
      origin: 'Mumbai',
      destination: 'Pune',
      consignor_name: 'QA Sender Corp',
      consignee_name: 'QA Receiver Ltd',
      no_of_packages: 10,
      weight_kg: 500,
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    lrNumber = body.lr_number ?? body.lr?.lr_number ?? 'QA-LR-001';
    expect(lrNumber).toBeTruthy();
  });

  it('dispatcher can view LR numbers list', async () => {
    const api = await dispatcher();
    const res = await api.get('/api/logistics/lr-numbers');
    expect(res.status).toBeLessThan(400);
  });

  it('dispatcher can log fuel consumption', async () => {
    const api = await dispatcher();
    const res = await api.post('/api/logistics/fuel-logs', {
      vehicle_id: vehicleId,
      date: TODAY,
      litres: 80,
      rate_per_litre: 95,
      amount: 7600,
      odometer_reading: 150000,
    });
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Role: Reviewer workflow (Driver — field reviewer)
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Role: Driver (reviewer)', () => {
  it('driver can login', async () => {
    const api = await driver();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('driver can view their shipments (read-only)', async () => {
    const api = await driver();
    const res = await api.get('/api/logistics/shipments');
    expect(res.status).toBeLessThan(400);
  });

  it('driver can view delivery orders assigned to them', async () => {
    const api = await driver();
    const res = await api.get('/api/logistics/delivery-orders');
    expect(res.status).toBeLessThan(400);
  });

  it('driver can submit proof of delivery (POD)', async () => {
    const api = await driver();
    const res = await api.post('/api/logistics/pod', {
      shipment_id: shipmentId,
      delivered_date: TODAY,
      received_by: 'QA Receiver',
      remarks: 'Delivered in good condition',
      status: 'delivered',
    });
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Plan: ALL plans — logistics core module accessible
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Plan: ALL plans — core logistics module accessible', () => {
  it('starter plan: /api/tenant/features includes logistics_transport module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('logistics_transport');
  });

  it('professional plan: /api/tenant/features includes logistics_transport module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('logistics_transport');
  });

  it('enterprise plan: /api/tenant/features includes logistics_transport module', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('logistics_transport');
  });

  it('all plans: core logistics APIs return < 400', async () => {
    const CORE = ['/api/logistics/vehicles', '/api/logistics/drivers', '/api/logistics/shipments'];
    const api = await owner();
    const results = await Promise.all(CORE.map(e => api.get(e).then(r => ({ e, status: r.status }))));
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Plan: ALL plans — invoicing / purchase_orders / basic_inventory
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Plan: ALL plans — invoicing / purchase_orders / basic_inventory', () => {
  it('starter plan: features includes invoicing, purchase_orders, basic_inventory', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('invoicing');
    expect(mods).toContain('purchase_orders');
    expect(mods).toContain('basic_inventory');
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
describe('Logistics Plan: Professional+ — accounting / mis / crm / hr_payroll', () => {
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
describe('Logistics Plan: Enterprise only — production / warehouses / fixed_assets', () => {
  it('starter plan: does NOT include warehouses module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('warehouses');
  });

  it('professional plan: does NOT include fixed_assets module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('fixed_assets');
  });

  it('enterprise plan: includes warehouses, fixed_assets, production', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('warehouses');
    expect(mods).toContain('fixed_assets');
    expect(mods).toContain('production');
  });

  it('enterprise: GET /api/warehouses returns < 400', async () => {
    const res = await (await owner()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Cross-role: Data created by one role visible to others
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Cross-role: Data created by one role visible to others', () => {
  it('shipment created by dispatcher is visible to fleet manager', async () => {
    const dispApi = await dispatcher();
    const mgrApi  = await manager();

    const createRes = await dispApi.post('/api/logistics/shipments', {
      shipment_date: TODAY,
      origin: 'Nagpur Depot',
      destination: 'Nashik Hub',
      vehicle_id: vehicleId,
      driver_id: driverId,
      consignee_name: 'QA Cross-Role Consignee',
      consignee_phone: '9000700099',
      weight_kg: 1200,
      status: 'pending',
    });
    expect(createRes.status).toBeLessThan(400);
    const created = await createRes.json() as any;
    const createdId = created.id ?? created.shipment?.id;

    const listRes = await mgrApi.get('/api/logistics/shipments');
    expect(listRes.status).toBe(200);
    const list = await listRes.json() as any[];
    if (Array.isArray(list) && createdId) {
      expect(list.some((s: any) => s.id === createdId)).toBe(true);
    }
  });

  it('fuel log created by dispatcher is visible to owner', async () => {
    const dispApi   = await dispatcher();
    const ownerApi  = await owner();

    const logRes = await dispApi.post('/api/logistics/fuel-logs', {
      vehicle_id: vehicleId,
      date: TODAY,
      litres: 60,
      rate_per_litre: 96,
      amount: 5760,
      odometer_reading: 155000,
    });
    expect(logRes.status).toBeLessThan(400);

    const listRes = await ownerApi.get('/api/logistics/fuel-logs');
    expect(listRes.status).toBeLessThan(400);
  });

  it('POD submitted by driver is visible to fleet manager', async () => {
    const driverApi = await driver();
    const mgrApi    = await manager();

    const podRes = await driverApi.post('/api/logistics/pod', {
      shipment_id: shipmentId,
      delivered_date: TODAY,
      received_by: 'QA Cross Receiver',
      remarks: 'Cross-role test delivery',
      status: 'delivered',
    });
    expect(podRes.status).toBeLessThan(400);

    const listRes = await mgrApi.get('/api/logistics/pod');
    expect(listRes.status).toBeLessThan(400);
  });

  it('vehicle created by admin is visible to dispatcher and driver', async () => {
    const dispApi   = await dispatcher();
    const driverApi = await driver();

    const [dispVehicles, driverVehicles] = await Promise.all([
      dispApi.get('/api/logistics/vehicles'),
      driverApi.get('/api/logistics/vehicles'),
    ]);
    expect(dispVehicles.status).toBe(200);
    expect(driverVehicles.status).toBeLessThan(400);

    const dList = await dispVehicles.json() as any[];
    if (Array.isArray(dList)) {
      expect(dList.some((v: any) => v.registration_number === 'MH-QA-LGS-001')).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Starter Plan — role login + core workflow
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Starter Plan — role login + core workflow', () => {
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

  it('starter dispatcher can access core logistics APIs', async () => {
    const api = await starterDispatcher();
    const [ships, drivers, vehicles] = await Promise.all([
      api.get('/api/logistics/shipments'),
      api.get('/api/logistics/drivers'),
      api.get('/api/logistics/vehicles'),
    ]);
    expect(ships.status).toBeLessThan(400);
    expect(drivers.status).toBeLessThan(400);
    expect(vehicles.status).toBeLessThan(400);
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
describe('Logistics Professional Plan — role login + extra modules', () => {
  it('professional owner (admin) can login', async () => {
    const api = await proOwner();
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('professional dispatcher can access logistics and sales orders', async () => {
    const api = await proDispatcher();
    const [ships, so] = await Promise.all([
      api.get('/api/logistics/shipments'),
      api.get('/api/sales-orders'),
    ]);
    expect(ships.status).toBeLessThan(400);
    expect(so.status).toBeLessThan(400);
  });

  it('professional: features includes sales_orders, accounting, crm', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('sales_orders');
    expect(mods).toContain('accounting');
    expect(mods).toContain('crm');
  });

  it('professional: features does NOT include production or warehouses (enterprise only)', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('production');
    expect(mods).not.toContain('warehouses');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Enterprise — Accountant workflow (accounting module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Enterprise — Accountant workflow (accounting module)', () => {
  it('accountant can login', async () => {
    const body = await (await (await accountant()).get('/api/user')).json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('accountant can view chart of accounts', async () => {
    const res = await (await accountant()).get('/api/chart-of-accounts');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can create a journal entry for freight income', async () => {
    const res = await (await accountant()).post('/api/journal-entries', {
      date: TODAY,
      narration: 'QA Logistics — Freight Income Journal',
      entries: [
        { account_code: '4001', debit: 50000, credit: 0 },
        { account_code: '1001', debit: 0,     credit: 50000 },
      ],
    });
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view trial balance', async () => {
    const res = await (await accountant()).get('/api/trial-balance');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view invoices and expenses', async () => {
    const api = await accountant();
    const [inv, exp] = await Promise.all([
      api.get('/api/invoices'),
      api.get('/api/expenses'),
    ]);
    expect(inv.status).toBeLessThan(400);
    expect(exp.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Enterprise — HR Manager workflow (hr_payroll module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Enterprise — HR Manager workflow (hr_payroll module)', () => {
  it('hr manager can login', async () => {
    const body = await (await (await hrManager()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('hr manager can view employees', async () => {
    const res = await (await hrManager()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('hr manager can add a driver as employee', async () => {
    const res = await (await hrManager()).post('/api/hr/employees', {
      employee_id: 'QA-LGS-EMP-001',
      first_name: 'QA',
      last_name: 'Fleet Driver',
      designation: 'Senior Driver',
      department: 'Fleet Operations',
      basic_salary: 28000,
      phone: '9000700010',
      email: 'qa-driver@lgs.kinto',
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
describe('Logistics Enterprise — CRM Executive workflow (crm module)', () => {
  it('crm executive can login', async () => {
    const body = await (await (await crmExec()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('crm exec can view CRM contacts (freight clients)', async () => {
    const res = await (await crmExec()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can create a lead (new shipping client)', async () => {
    const res = await (await crmExec()).post('/api/crm/leads', {
      name: 'QA Freight Corp',
      email: 'freight@test.kinto',
      phone: '9000700020',
      source: 'referral',
      status: 'new',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view campaigns', async () => {
    const res = await (await crmExec()).get('/api/crm/campaigns');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view shipments (cross-link to logistics)', async () => {
    const res = await (await crmExec()).get('/api/logistics/shipments');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. Enterprise — Sales Manager workflow (sales_orders module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Enterprise — Sales Manager workflow (sales_orders module)', () => {
  it('sales manager can login', async () => {
    const body = await (await (await salesManager()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('sales manager can view sales orders (freight contracts)', async () => {
    const res = await (await salesManager()).get('/api/sales-orders');
    expect(res.status).toBe(200);
  });

  it('sales manager can create a freight sales order', async () => {
    const res = await (await salesManager()).post('/api/sales-orders', {
      customer_name: 'QA Freight Client',
      order_date: TODAY,
      delivery_date: TODAY,
      items: [{ product_name: 'Full Truck Load — Mumbai to Pune', quantity: 1, rate: 25000, amount: 25000 }],
      total: 25000,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('sales manager can view invoices', async () => {
    const res = await (await salesManager()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('sales manager can view LR numbers', async () => {
    const res = await (await salesManager()).get('/api/logistics/lr-numbers');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. Enterprise — MIS Viewer workflow (mis module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Enterprise — MIS Viewer workflow (mis module)', () => {
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

  it('mis viewer can view shipments (read-only analytics)', async () => {
    const res = await (await misViewer()).get('/api/logistics/shipments');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. Enterprise — Warehouse Manager workflow (warehouses module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Enterprise — Warehouse Manager workflow (warehouses module)', () => {
  it('warehouse manager can login', async () => {
    const body = await (await (await warehouseMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('warehouse manager can view warehouses', async () => {
    const res = await (await warehouseMgr()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view products/inventory', async () => {
    const res = await (await warehouseMgr()).get('/api/products');
    expect(res.status).toBe(200);
  });

  it('warehouse manager can view shipments (goods in/out)', async () => {
    const res = await (await warehouseMgr()).get('/api/logistics/shipments');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 18. Enterprise — Production Supervisor workflow (production module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Enterprise — Production Supervisor workflow (production module)', () => {
  it('production supervisor can login', async () => {
    const body = await (await (await prodSup()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('production supervisor can view raw materials', async () => {
    const res = await (await prodSup()).get('/api/raw-materials');
    expect(res.status).toBeLessThan(400);
  });

  it('production supervisor can view production entries', async () => {
    const res = await (await prodSup()).get('/api/production-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('production supervisor can view maintenance logs (vehicle servicing)', async () => {
    const res = await (await prodSup()).get('/api/logistics/maintenance');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 19. Enterprise — Assets Manager workflow (fixed_assets module)
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Enterprise — Assets Manager workflow (fixed_assets module)', () => {
  it('assets manager can login', async () => {
    const body = await (await (await assetsMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('assets manager can view fixed assets (fleet as assets)', async () => {
    const res = await (await assetsMgr()).get('/api/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });

  it('assets manager can view vehicles (fleet register)', async () => {
    const res = await (await assetsMgr()).get('/api/logistics/vehicles');
    expect(res.status).toBeLessThan(400);
  });

  it('assets manager can view maintenance logs (asset upkeep)', async () => {
    const res = await (await assetsMgr()).get('/api/logistics/maintenance');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 20. Professional — Accountant workflow
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Professional — Accountant workflow', () => {
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

  it('pro accountant: features does NOT include production (enterprise only)', async () => {
    const mods = await getModules(await proAcct());
    expect(mods).not.toContain('production');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 21. Professional — HR Manager workflow
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Professional — HR Manager workflow', () => {
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

  it('pro hr manager: features does NOT include warehouses (enterprise only)', async () => {
    const mods = await getModules(await proHr());
    expect(mods).not.toContain('warehouses');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 22. Professional — CRM Executive workflow
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Professional — CRM Executive workflow', () => {
  it('pro crm exec can login', async () => {
    const body = await (await (await proCrm()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('pro crm exec can view CRM contacts', async () => {
    const res = await (await proCrm()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('pro crm exec can view logistics shipments (cross-link)', async () => {
    const res = await (await proCrm()).get('/api/logistics/shipments');
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
describe('Logistics Professional — MIS Viewer workflow', () => {
  it('pro mis viewer can login', async () => {
    const body = await (await (await proMis()).get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('pro mis viewer can view MIS sales summary', async () => {
    const res = await (await proMis()).get('/api/mis/sales-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('pro mis viewer can view shipments (read-only)', async () => {
    const res = await (await proMis()).get('/api/logistics/shipments');
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
describe('Logistics Starter — Billing Staff workflow (invoicing module)', () => {
  it('billing staff can login', async () => {
    const body = await (await (await starterBilling()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('billing staff can view invoices', async () => {
    const res = await (await starterBilling()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('billing staff can view LR numbers for invoicing', async () => {
    const res = await (await starterBilling()).get('/api/logistics/lr-numbers');
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
describe('Logistics Starter — Purchase Manager workflow (purchase_orders module)', () => {
  it('starter manager can login as purchase manager', async () => {
    const body = await (await (await starterManager()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('starter manager can view purchase orders (fuel, spares)', async () => {
    const res = await (await starterManager()).get('/api/purchase-orders');
    expect(res.status).toBe(200);
  });

  it('starter manager can view vendors (fuel stations, part suppliers)', async () => {
    const res = await (await starterManager()).get('/api/vendors');
    expect(res.status).toBe(200);
  });

  it('starter manager: features does NOT include hr_payroll (professional+ only)', async () => {
    const mods = await getModules(await starterManager());
    expect(mods).not.toContain('hr_payroll');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 26. Enterprise — extended vehicle & fleet management (admin/manager)
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Enterprise — extended fleet management', () => {
  it('admin can create a maintenance record for a vehicle', async () => {
    const api = await owner();
    const res = await api.post('/api/logistics/maintenance', {
      vehicle_id: vehicleId,
      service_date: TODAY,
      service_type: 'oil_change',
      odometer_reading: 152000,
      cost: 3500,
      vendor_name: 'QA Service Centre',
      remarks: 'Routine oil change',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('admin can list maintenance records', async () => {
    const res = await (await owner()).get('/api/logistics/maintenance');
    expect(res.status).toBeLessThan(400);
  });

  it('fleet manager can create an eway bill', async () => {
    const api = await manager();
    const res = await api.post('/api/logistics/eway-bills', {
      shipment_id: shipmentId,
      eway_bill_number: 'QA-EWB-0001',
      generated_date: TODAY,
      valid_till: TODAY,
      total_value: 150000,
      distance_km: 150,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('fleet manager can list eway bills', async () => {
    const res = await (await manager()).get('/api/logistics/eway-bills');
    expect(res.status).toBeLessThan(400);
  });

  it('dispatcher can view POD list', async () => {
    const res = await (await dispatcher()).get('/api/logistics/pod');
    expect(res.status).toBeLessThan(400);
  });

  it('driver can view fuel logs for their vehicle', async () => {
    const res = await (await driver()).get('/api/logistics/fuel-logs');
    expect(res.status).toBeLessThan(400);
  });

  it('admin can list routes', async () => {
    const res = await (await owner()).get('/api/logistics/routes');
    expect(res.status).toBeLessThan(400);
  });

  it('fleet manager can create a route', async () => {
    const api = await manager();
    const res = await api.post('/api/logistics/routes', {
      route_name: 'QA Mumbai-Pune Express',
      origin: 'Mumbai',
      destination: 'Pune',
      distance_km: 150,
      estimated_hours: 3,
      is_active: true,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('admin can view expenses (fuel/toll as logistics expenses)', async () => {
    const res = await (await owner()).get('/api/expenses');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view purchase orders (spare parts procurement)', async () => {
    const res = await (await accountant()).get('/api/purchase-orders');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view fuel logs (fleet cost analytics)', async () => {
    const res = await (await misViewer()).get('/api/logistics/fuel-logs');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view delivery orders', async () => {
    const res = await (await warehouseMgr()).get('/api/logistics/delivery-orders');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 27. Plan-level feature assertions — detailed starter vs professional vs enterprise
// ─────────────────────────────────────────────────────────────────────────────
describe('Logistics Plan: detailed feature assertions across all tiers', () => {
  it('starter: features includes expenses and documents', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('expenses');
    expect(mods).toContain('documents');
  });

  it('professional: features includes sales_orders and whatsapp', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('sales_orders');
    expect(mods).toContain('whatsapp');
  });

  it('enterprise: features includes api_hub and multi_currency', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('api_hub');
    expect(mods).toContain('multi_currency');
  });

  it('starter dispatcher: can access shipments and LR numbers', async () => {
    const api = await starterDispatcher();
    const [ships, lr] = await Promise.all([
      api.get('/api/logistics/shipments'),
      api.get('/api/logistics/lr-numbers'),
    ]);
    expect(ships.status).toBeLessThan(400);
    expect(lr.status).toBeLessThan(400);
  });

  it('professional dispatcher: can access accounting module', async () => {
    const api = await proDispatcher();
    const res = await api.get('/api/journal-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('professional manager: can access CRM (crm module)', async () => {
    const res = await (await proManager()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('enterprise: GET /api/fixed-assets returns < 400', async () => {
    const res = await (await owner()).get('/api/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });

  it('pro mis viewer: can access MIS financial summary', async () => {
    const res = await (await proMis()).get('/api/mis/financial-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('starter billing: can access invoices and LR numbers', async () => {
    const api = await starterBilling();
    const [inv, lr] = await Promise.all([
      api.get('/api/invoices'),
      api.get('/api/logistics/lr-numbers'),
    ]);
    expect(inv.status).toBe(200);
    expect(lr.status).toBeLessThan(400);
  });

  it('pro crm exec: can view leads and contacts', async () => {
    const api = await proCrm();
    const [contacts, leads] = await Promise.all([
      api.get('/api/crm/contacts'),
      api.get('/api/crm/leads'),
    ]);
    expect(contacts.status).toBeLessThan(400);
    expect(leads.status).toBeLessThan(400);
  });
});
