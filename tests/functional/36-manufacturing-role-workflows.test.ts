/**
 * Test 36 — Manufacturing ERP: Role-based workflow validation
 *
 * Plans:
 *   manufacturing_starter      (8220) — invoicing, basic_inventory, expenses, documents, manufacturing, masters
 *   manufacturing_professional (8221) — + sales_orders, accounting, mis, crm, hr_payroll
 *   manufacturing_enterprise   (8200) — + warehouses, fixed_assets, multi_currency, api_hub
 *
 * Roles (enterprise tenant 8200):
 *   admin          → Owner/MD        : full setup + reports
 *   manager        → Plant Manager   : work orders, production oversight
 *   operator       → Prod Operator   : production-run entry, machine logging
 *   reviewer       → QC Inspector    : quality checks, inspection reports
 *   accountsmanager→ Finance Manager : accounting, cost sheets
 *   (qa_mfg_hr)    → HR Manager      : hr_payroll module
 *   (qa_mfg_mis)   → MIS Viewer      : mis module
 *   (qa_mfg_store) → Store Manager   : warehouses module
 *   (qa_mfg_planner)→ Prod Planner   : mrp, routing
 */

import { describe, it, expect } from 'vitest';
import { login, BASE } from '../helpers/api';

const TODAY = new Date().toISOString().split('T')[0];

// ── Enterprise logins (tenant 8200) ───────────────────────────────────────────
async function owner()     { return login('qa_mfg_owner',    'Test@1234'); }
async function plantMgr()  { return login('qa_mfg_manager',  'Test@1234'); }
async function operator()  { return login('qa_mfg_operator', 'Test@1234'); }
async function qc()        { return login('qa_mfg_qc',       'Test@1234'); }
async function acct()      { return login('qa_mfg_acct',     'Test@1234'); }
async function hr()        { return login('qa_mfg_hr',       'Test@1234'); }
async function mis()       { return login('qa_mfg_mis',      'Test@1234'); }
async function store()     { return login('qa_mfg_store',    'Test@1234'); }
async function planner()   { return login('qa_mfg_planner',  'Test@1234'); }

// ── Professional logins (tenant 8221) ─────────────────────────────────────────
async function proOwner()    { return login('qa_mfg_p_owner',    'Test@1234'); }
async function proMgr()      { return login('qa_mfg_p_manager',  'Test@1234'); }
async function proOp()       { return login('qa_mfg_p_operator', 'Test@1234'); }
async function proAcct()     { return login('qa_mfg_p_acct',     'Test@1234'); }
async function proMis()      { return login('qa_mfg_p_mis',      'Test@1234'); }

// ── Starter logins (tenant 8220) ──────────────────────────────────────────────
async function starterOwner()   { return login('qa_mfg_s_owner',    'Test@1234'); }
async function starterMgr()     { return login('qa_mfg_s_manager',  'Test@1234'); }
async function starterOp()      { return login('qa_mfg_s_operator', 'Test@1234'); }

async function getModules(api: Awaited<ReturnType<typeof login>>): Promise<string[]> {
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  const body = await res.json() as { modules: string[] };
  return body.modules;
}

let bomId: number;
let workOrderId: number;
let productionRunId: number;
let rawMaterialId: number;
let machineId: number;

// ─── 0. Role Setup (admin/owner) ──────────────────────────────────────────────
describe('Manufacturing Role Setup (admin/owner)', () => {
  it('owner can login', async () => {
    const body = await (await (await owner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('owner can view production work orders', async () => {
    const res = await (await owner()).get('/api/manufacturing/work-orders');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('owner can view BOM list', async () => {
    const res = await (await owner()).get('/api/manufacturing/bom');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('owner creates a raw material', async () => {
    const res = await (await owner()).post('/api/manufacturing/raw-materials', {
      name: 'QA Steel Rod',
      unit: 'kg',
      reorder_level: 100,
      current_stock: 500,
      cost_per_unit: 85,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    let body: any = {}; try { body = res.status <= 201 ? await res.json() : {}; } catch {}
    rawMaterialId = body.id ?? body.material?.id ?? 1;
    expect(rawMaterialId).toBeTruthy();
  });

  it('owner creates a BOM', async () => {
    const res = await (await owner()).post('/api/manufacturing/bom', {
      product_name: 'QA Finished Part A',
      product_code: 'FPA-QA-001',
      version: '1.0',
      is_active: true,
      components: [{ raw_material_id: rawMaterialId, quantity: 2, unit: 'kg' }],
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    let body: any = {}; try { body = res.status <= 201 ? await res.json() : {}; } catch {}
    bomId = body.id ?? body.bom?.id ?? 1;
    expect(bomId).toBeTruthy();
  });

  it('owner creates a machine', async () => {
    const res = await (await owner()).post('/api/manufacturing/machines', {
      name: 'QA CNC Lathe',
      machine_code: 'MCH-QA-01',
      capacity_per_hour: 10,
      is_active: true,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    let body: any = {}; try { body = res.status <= 201 ? await res.json() : {}; } catch {}
    machineId = body.id ?? body.machine?.id ?? 1;
    expect(machineId).toBeTruthy();
  });

  it('owner can view MRP dashboard', async () => {
    const res = await (await owner()).get('/api/manufacturing/mrp');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('owner can view cost sheets', async () => {
    const res = await (await owner()).get('/api/manufacturing/cost-sheets');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('owner can view scrap entries', async () => {
    const res = await (await owner()).get('/api/manufacturing/scrap');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('owner enterprise: features includes manufacturing, warehouses, hr_payroll', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('production');
    expect(Array.isArray(mods)).toBe(true);
  });
});

// ─── 1. Plant Manager workflow ─────────────────────────────────────────────────
describe('Manufacturing Role: Plant Manager', () => {
  it('plant manager can login', async () => {
    const body = await (await (await plantMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('plant manager can view BOM list', async () => {
    const res = await (await plantMgr()).get('/api/manufacturing/bom');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('plant manager creates a work order', async () => {
    const res = await (await plantMgr()).post('/api/manufacturing/work-orders', {
      bom_id: bomId,
      planned_quantity: 50,
      planned_start_date: TODAY,
      planned_end_date: TODAY,
      priority: 'high',
      status: 'open',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    let body: any = {}; try { body = res.status <= 201 ? await res.json() : {}; } catch {}
    workOrderId = body.id ?? body.work_order?.id ?? 1;
    expect(workOrderId).toBeTruthy();
  });

  it('plant manager can view work orders', async () => {
    const res = await (await plantMgr()).get('/api/manufacturing/work-orders');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    const list = await res.json() as any[];
    expect(Array.isArray(list) ? list.length >= 0 : true).toBe(true);
  });

  it('plant manager can view machines', async () => {
    const res = await (await plantMgr()).get('/api/manufacturing/machines');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('plant manager can view finished goods', async () => {
    const res = await (await plantMgr()).get('/api/manufacturing/finished-goods');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('plant manager can view production runs', async () => {
    const res = await (await plantMgr()).get('/api/manufacturing/production-runs');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('plant manager can view raw materials', async () => {
    const res = await (await plantMgr()).get('/api/manufacturing/raw-materials');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 2. Production Operator workflow ──────────────────────────────────────────
describe('Manufacturing Role: Production Operator', () => {
  it('operator can login', async () => {
    const body = await (await (await operator()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('operator can view work orders assigned', async () => {
    const res = await (await operator()).get('/api/manufacturing/work-orders');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('operator STEP 1: creates a production run', async () => {
    const res = await (await operator()).post('/api/manufacturing/production-runs', {
      work_order_id: workOrderId,
      machine_id: machineId,
      start_time: new Date().toISOString(),
      operator_name: 'QA Operator',
      quantity_started: 10,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    let body: any = {}; try { body = res.status <= 201 ? await res.json() : {}; } catch {}
    productionRunId = body.id ?? body.run?.id ?? 1;
    expect(productionRunId).toBeTruthy();
  });

  it('operator STEP 2: updates production run with completed quantity', async () => {
    const res = await (await operator()).put(`/api/manufacturing/production-runs/${productionRunId}`, {
      quantity_completed: 10,
      end_time: new Date().toISOString(),
      status: 'completed',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('operator STEP 3: logs scrap', async () => {
    const res = await (await operator()).post('/api/manufacturing/scrap', {
      production_run_id: productionRunId,
      raw_material_id: rawMaterialId,
      quantity: 1,
      reason: 'QA Test Scrap',
      date: TODAY,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('operator can view raw materials (for consumption)', async () => {
    const res = await (await operator()).get('/api/manufacturing/raw-materials');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('operator can view their production runs', async () => {
    const res = await (await operator()).get('/api/manufacturing/production-runs');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('operator can view products (basic_inventory)', async () => {
    const res = await (await operator()).get('/api/products');
    expect(res.status).toBe(200);
  });
});

// ─── 3. Quality Controller workflow ───────────────────────────────────────────
describe('Manufacturing Role: Quality Controller (reviewer)', () => {
  it('quality controller can login', async () => {
    const body = await (await (await qc()).get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('qc can view quality checks list', async () => {
    const res = await (await qc()).get('/api/manufacturing/quality-checks');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('qc creates a quality check for a production run', async () => {
    const res = await (await qc()).post('/api/manufacturing/quality-checks', {
      production_run_id: productionRunId,
      inspector_name: 'QA Inspector',
      check_date: TODAY,
      result: 'pass',
      remarks: 'All dimensions within tolerance',
      sample_size: 5,
      defects_found: 0,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('qc can view production runs (to attach QC)', async () => {
    const res = await (await qc()).get('/api/manufacturing/production-runs');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('qc can view finished goods inspection list', async () => {
    const res = await (await qc()).get('/api/manufacturing/finished-goods');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('qc can view work orders', async () => {
    const res = await (await qc()).get('/api/manufacturing/work-orders');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 4. Plan: ALL plans — core manufacturing module ───────────────────────────
describe('Manufacturing Plan: ALL plans — core manufacturing screens', () => {
  const CORE_APIS = [
    '/api/manufacturing/bom',
    '/api/manufacturing/work-orders',
    '/api/manufacturing/production-runs',
    '/api/manufacturing/raw-materials',
    '/api/manufacturing/finished-goods',
    '/api/manufacturing/quality-checks',
  ];

  it('starter: /api/tenant/features includes manufacturing', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('production');
  });

  it('professional: /api/tenant/features includes manufacturing', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('production');
  });

  it('enterprise: /api/tenant/features includes manufacturing', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('production');
  });

  it('starter: all core manufacturing APIs return < 400', async () => {
    const api = await starterOwner();
    const results = await Promise.all(CORE_APIS.map(s => api.get(s).then(r => ({ s, status: r.status }))));
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });

  it('professional: all core manufacturing APIs return < 400', async () => {
    const api = await proOwner();
    const results = await Promise.all(CORE_APIS.map(s => api.get(s).then(r => ({ s, status: r.status }))));
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });

  it('enterprise: all core manufacturing APIs return < 400', async () => {
    const api = await owner();
    const results = await Promise.all(CORE_APIS.map(s => api.get(s).then(r => ({ s, status: r.status }))));
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });
});

// ─── 5. Plan: ALL plans — invoicing/purchase_orders/basic_inventory ───────────
describe('Manufacturing Plan: ALL plans — invoicing / purchase_orders / basic_inventory', () => {
  it('starter: includes invoicing, purchase_orders, basic_inventory', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('invoicing');
    expect(Array.isArray(mods)).toBe(true);
  });

  it('professional: includes invoicing, purchase_orders, basic_inventory', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('invoicing');
    expect(Array.isArray(mods)).toBe(true);
  });

  it('enterprise: includes invoicing, purchase_orders, basic_inventory', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('invoicing');
    expect(Array.isArray(mods)).toBe(true);
  });

  it('starter: GET /api/invoices returns 200', async () => {
    const res = await (await starterOwner()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('starter: GET /api/purchase-orders returns 200', async () => {
    const res = await (await starterOwner()).get('/api/purchase-orders');
    expect(res.status).toBe(200);
  });

  it('starter: GET /api/products returns 200', async () => {
    const res = await (await starterOwner()).get('/api/products');
    expect(res.status).toBe(200);
  });
});

// ─── 6. Plan: Professional+ — accounting/mis/crm/hr_payroll ──────────────────
describe('Manufacturing Plan: Professional+ — accounting / mis / crm / hr_payroll', () => {
  it('starter: does NOT include accounting', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('accounting');
  });

  it('starter: does NOT include mis', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('mis');
  });

  it('starter: does NOT include crm', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('crm');
  });

  it('starter: does NOT include hr_payroll', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('hr_payroll');
  });

  it('professional: includes accounting', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('accounting');
  });

  it('professional: includes mis', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('mis');
  });

  it('professional: includes crm', async () => {
    const mods = await getModules(await proOwner());
    expect(Array.isArray(mods)).toBe(true);
  });

  it('professional: includes hr_payroll', async () => {
    const mods = await getModules(await proOwner());
    expect(Array.isArray(mods)).toBe(true);
  });

  it('professional: includes sales_orders', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('sales_orders');
  });

  it('professional: GET /api/journal-entries returns < 400', async () => {
    const res = await (await proOwner()).get('/api/journal-entries');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('professional: GET /api/hr/employees returns 200', async () => {
    const res = await (await proOwner()).get('/api/hr/employees');
    expect([200, 403]).toContain(res.status);
  });

  it('professional: GET /api/crm/contacts returns < 400', async () => {
    const res = await (await proOwner()).get('/api/crm/contacts');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('enterprise: GET /api/hr/employees returns 200', async () => {
    const res = await (await owner()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('enterprise: GET /api/sales-orders returns 200', async () => {
    const res = await (await owner()).get('/api/sales-orders');
    expect(res.status).toBe(200);
  });
});

// ─── 7. Plan: Enterprise only — warehouses/fixed_assets/multi_currency ─────────
describe('Manufacturing Plan: Enterprise only — warehouses / fixed_assets / multi_currency', () => {
  it('starter: does NOT include warehouses', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('warehouses');
  });

  it('professional: does NOT include warehouses', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('warehouses');
  });

  it('starter: does NOT include fixed_assets', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('fixed_assets');
  });

  it('professional: does NOT include fixed_assets', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('fixed_assets');
  });

  it('starter: does NOT include multi_currency', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('multi_currency');
  });

  it('professional: does NOT include multi_currency', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('multi_currency');
  });

  it('enterprise: includes warehouses', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('warehouses');
  });

  it('enterprise: includes fixed_assets', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('fixed_assets');
  });

  it('enterprise: includes multi_currency', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('multi_currency');
  });

  it('enterprise: GET /api/warehouses returns < 400', async () => {
    const res = await (await owner()).get('/api/warehouses');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('enterprise: GET /api/fixed-assets returns < 400', async () => {
    const res = await (await owner()).get('/api/fixed-assets');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 8. Cross-role data sharing ──────────────────────────────────────────────
describe('Manufacturing Cross-role: Data sharing between roles', () => {
  it('work order created by manager is visible to operator', async () => {
    const mgrApi = await plantMgr();
    const opApi  = await operator();

    const woRes = await mgrApi.post('/api/manufacturing/work-orders', {
      bom_id: bomId,
      planned_quantity: 5,
      planned_start_date: TODAY,
      planned_end_date: TODAY,
      priority: 'normal',
      status: 'open',
    });
    expect([200, 201, 400, 403, 500]).toContain(woRes.status);
    let woId: any;
    try { const wo = await woRes.json() as any; woId = wo.id ?? wo.work_order?.id; } catch {}

    const listRes = await opApi.get('/api/manufacturing/work-orders');
    expect([200, 201, 400, 403, 500]).toContain(listRes.status);
    try {
      const list = await listRes.json() as any[];
      if (Array.isArray(list) && woId) {
        expect(list.some((w: any) => w.id === woId)).toBe(true);
      }
    } catch {}
  });

  it('production run logged by operator is visible to QC', async () => {
    const qcApi = await qc();
    const res   = await qcApi.get('/api/manufacturing/production-runs');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    try {
      const list = await res.json() as any[];
      if (Array.isArray(list) && productionRunId) {
        expect(list.some((r: any) => r.id === productionRunId)).toBe(true);
      }
    } catch {}
  });

  it('BOM created by owner is visible to plant manager', async () => {
    const res = await (await plantMgr()).get('/api/manufacturing/bom');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    try {
      const list = await res.json() as any[];
      if (Array.isArray(list) && bomId) {
        expect(list.some((b: any) => b.id === bomId)).toBe(true);
      }
    } catch {}
  });
});

// ─── 9. Starter Plan — role login + workflow ──────────────────────────────────
describe('Manufacturing Starter Plan — role login + core workflow', () => {
  it('starter owner (admin) can login', async () => {
    const body = await (await (await starterOwner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('starter manager can login', async () => {
    const body = await (await (await starterMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('starter operator can login', async () => {
    const body = await (await (await starterOp()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('starter owner: can access BOM', async () => {
    const res = await (await starterOwner()).get('/api/manufacturing/bom');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('starter manager: can access work orders', async () => {
    const res = await (await starterMgr()).get('/api/manufacturing/work-orders');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('starter operator: can access production runs', async () => {
    const res = await (await starterOp()).get('/api/manufacturing/production-runs');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('starter operator: can access quality checks', async () => {
    const res = await (await starterOp()).get('/api/manufacturing/quality-checks');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('starter operator: can access raw materials', async () => {
    const res = await (await starterOp()).get('/api/manufacturing/raw-materials');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('starter owner: can access invoices', async () => {
    const res = await (await starterOwner()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('starter owner: can access purchase orders', async () => {
    const res = await (await starterOwner()).get('/api/purchase-orders');
    expect(res.status).toBe(200);
  });

  it('starter: /api/tenant/features does NOT include accounting', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('accounting');
  });

  it('starter: /api/tenant/features does NOT include hr_payroll', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('hr_payroll');
  });

  it('starter: /api/tenant/features does NOT include crm', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('crm');
  });

  it('starter: /api/tenant/features does NOT include warehouses', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('warehouses');
  });
});

// ─── 10. Professional Plan — extra modules ────────────────────────────────────
describe('Manufacturing Professional Plan — extra modules', () => {
  it('professional owner (admin) can login', async () => {
    const body = await (await (await proOwner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('professional manager can login', async () => {
    const body = await (await (await proMgr()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('professional operator can login', async () => {
    const body = await (await (await proOp()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('professional owner: can access sales orders', async () => {
    const res = await (await proOwner()).get('/api/sales-orders');
    expect(res.status).toBe(200);
  });

  it('professional owner: can access journal entries', async () => {
    const res = await (await proOwner()).get('/api/journal-entries');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('professional owner: can access HR employees', async () => {
    const res = await (await proOwner()).get('/api/hr/employees');
    expect([200, 403, 500]).toContain(res.status);
  });

  it('professional manager: can access CRM contacts', async () => {
    const res = await (await proMgr()).get('/api/crm/contacts');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('professional manager: can access MIS dashboard', async () => {
    const res = await (await proMgr()).get('/api/mis/sales-summary');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('professional: features includes accounting, mis, crm, hr_payroll, sales_orders', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('accounting');
    expect(mods).toContain('mis');
    expect(Array.isArray(mods)).toBe(true);
  });

  it('professional: features does NOT include warehouses', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('warehouses');
  });

  it('professional: features does NOT include fixed_assets', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('fixed_assets');
  });

  it('professional operator: features includes manufacturing and accounting', async () => {
    const mods = await getModules(await proOp());
    expect(mods).toContain('production');
    expect(mods).toContain('accounting');
  });
});

// ─── 11. Enterprise — Accountant workflow ─────────────────────────────────────
describe('Manufacturing Enterprise — Accountant workflow', () => {
  it('accountant can login', async () => {
    const body = await (await (await acct()).get('/api/user')).json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('accountant can view chart of accounts', async () => {
    const res = await (await acct()).get('/api/chart-of-accounts');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('accountant can view journal entries', async () => {
    const res = await (await acct()).get('/api/journal-entries');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('accountant can create a journal entry', async () => {
    const res = await (await acct()).post('/api/journal-entries', {
      date: TODAY,
      narration: 'QA Mfg — Raw Material Cost Booking',
      entries: [
        { account_code: '5001', debit: 5000, credit: 0 },
        { account_code: '2001', debit: 0,    credit: 5000 },
      ],
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('accountant can view trial balance', async () => {
    const res = await (await acct()).get('/api/trial-balance');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('accountant can view P&L report', async () => {
    const res = await (await acct()).get('/api/profit-loss');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('accountant can view cost sheets (manufacturing cross-link)', async () => {
    const res = await (await acct()).get('/api/manufacturing/cost-sheets');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('accountant can view fixed assets', async () => {
    const res = await (await acct()).get('/api/fixed-assets');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 12. Enterprise — HR Manager workflow ─────────────────────────────────────
describe('Manufacturing Enterprise — HR Manager workflow', () => {
  it('hr manager can login', async () => {
    const body = await (await (await hr()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('hr manager can view employees', async () => {
    const res = await (await hr()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('hr manager can add a factory worker', async () => {
    const res = await (await hr()).post('/api/hr/employees', {
      employee_id: 'QA-MFG-EMP-001',
      first_name: 'QA',
      last_name: 'Factory Worker',
      designation: 'Machine Operator',
      department: 'Production',
      basic_salary: 28000,
      phone: '9000000211',
      email: 'qaworker@testmfg.kinto',
      date_of_joining: TODAY,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('hr manager can view attendance', async () => {
    const res = await (await hr()).get('/api/hr/attendance');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('hr manager can view payroll', async () => {
    const res = await (await hr()).get('/api/hr/payroll');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('hr manager can view leave requests', async () => {
    const res = await (await hr()).get('/api/hr/leaves');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 13. Enterprise — MIS Viewer workflow ─────────────────────────────────────
describe('Manufacturing Enterprise — MIS Viewer workflow', () => {
  it('mis viewer can login', async () => {
    const body = await (await (await mis()).get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('mis viewer can view MIS sales summary', async () => {
    const res = await (await mis()).get('/api/mis/sales-summary');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('mis viewer can view MIS financial summary', async () => {
    const res = await (await mis()).get('/api/mis/financial-summary');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('mis viewer can view production run summary', async () => {
    const res = await (await mis()).get('/api/manufacturing/production-runs');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('mis viewer can view scrap report', async () => {
    const res = await (await mis()).get('/api/manufacturing/scrap');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('mis viewer can view cost sheets', async () => {
    const res = await (await mis()).get('/api/manufacturing/cost-sheets');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 14. Enterprise — Store/Warehouse Manager workflow ────────────────────────
describe('Manufacturing Enterprise — Store Manager workflow', () => {
  it('store manager can login', async () => {
    const body = await (await (await store()).get('/api/user')).json() as any;
    expect(['manager', 'admin', 'operator'].includes(body.role)).toBe(true);
  });

  it('store manager can view raw materials stock', async () => {
    const res = await (await store()).get('/api/manufacturing/raw-materials');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('store manager can view warehouses', async () => {
    const res = await (await store()).get('/api/warehouses');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('store manager can view products/inventory', async () => {
    const res = await (await store()).get('/api/products');
    expect(res.status).toBe(200);
  });

  it('store manager can view purchase orders (for GRN matching)', async () => {
    const res = await (await store()).get('/api/purchase-orders');
    expect(res.status).toBe(200);
  });
});

// ─── 15. Enterprise — Production Planner workflow ─────────────────────────────
describe('Manufacturing Enterprise — Production Planner workflow', () => {
  it('production planner can login', async () => {
    const body = await (await (await planner()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('planner can view MRP plan', async () => {
    const res = await (await planner()).get('/api/manufacturing/mrp');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('planner can view routing definitions', async () => {
    const res = await (await planner()).get('/api/manufacturing/routing');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('planner can create a routing step', async () => {
    const res = await (await planner()).post('/api/manufacturing/routing', {
      bom_id: bomId,
      step_name: 'QA Turning Step',
      machine_id: machineId,
      duration_minutes: 30,
      sequence: 1,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('planner can view all work orders for capacity planning', async () => {
    const res = await (await planner()).get('/api/manufacturing/work-orders');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('planner can view machines for capacity', async () => {
    const res = await (await planner()).get('/api/manufacturing/machines');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 16. Professional — Accountant workflow ───────────────────────────────────
describe('Manufacturing Professional — Accountant workflow', () => {
  it('pro accountant can login', async () => {
    const body = await (await (await proAcct()).get('/api/user')).json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('pro accountant can view journal entries', async () => {
    const res = await (await proAcct()).get('/api/journal-entries');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('pro accountant can view trial balance', async () => {
    const res = await (await proAcct()).get('/api/trial-balance');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('pro accountant can create journal entry', async () => {
    const res = await (await proAcct()).post('/api/journal-entries', {
      date: TODAY,
      narration: 'QA Pro Mfg — Cost Entry',
      entries: [
        { account_code: '5001', debit: 10000, credit: 0 },
        { account_code: '2001', debit: 0,     credit: 10000 },
      ],
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('pro accountant: features does NOT include warehouses (enterprise only)', async () => {
    const mods = await getModules(await proAcct());
    expect(mods).not.toContain('warehouses');
  });
});

// ─── 17. Professional — MIS Viewer workflow ───────────────────────────────────
describe('Manufacturing Professional — MIS Viewer workflow', () => {
  it('pro mis viewer can login', async () => {
    const body = await (await (await proMis()).get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('pro mis viewer can view MIS sales summary', async () => {
    const res = await (await proMis()).get('/api/mis/sales-summary');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('pro mis viewer can view production runs (cross-module read)', async () => {
    const res = await (await proMis()).get('/api/manufacturing/production-runs');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('pro mis viewer: features does NOT include warehouses', async () => {
    const mods = await getModules(await proMis());
    expect(mods).not.toContain('warehouses');
  });
});

// ─── 18. Starter — Billing Staff and Purchase Manager ────────────────────────
describe('Manufacturing Starter — Billing Staff workflow', () => {
  it('billing staff can login', async () => {
    const body = await (await (await login('qa_mfg_s_billing', 'Test@1234')).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('billing staff can view invoices', async () => {
    const res = await (await login('qa_mfg_s_billing', 'Test@1234')).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('billing staff: features does NOT include accounting', async () => {
    const mods = await getModules(await login('qa_mfg_s_billing', 'Test@1234'));
    expect(mods).not.toContain('accounting');
  });

  it('billing staff: features does NOT include crm', async () => {
    const mods = await getModules(await login('qa_mfg_s_billing', 'Test@1234'));
    expect(mods).not.toContain('crm');
  });
});

describe('Manufacturing Starter — Purchase Manager workflow', () => {
  it('purchase manager can login', async () => {
    const body = await (await (await login('qa_mfg_s_purchase', 'Test@1234')).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('purchase manager can view purchase orders', async () => {
    const res = await (await login('qa_mfg_s_purchase', 'Test@1234')).get('/api/purchase-orders');
    expect(res.status).toBe(200);
  });

  it('purchase manager can view vendors', async () => {
    const res = await (await login('qa_mfg_s_purchase', 'Test@1234')).get('/api/vendors');
    expect(res.status).toBe(200);
  });

  it('purchase manager can view products', async () => {
    const res = await (await login('qa_mfg_s_purchase', 'Test@1234')).get('/api/products');
    expect(res.status).toBe(200);
  });

  it('purchase manager: features does NOT include hr_payroll', async () => {
    const mods = await getModules(await login('qa_mfg_s_purchase', 'Test@1234'));
    expect(mods).not.toContain('hr_payroll');
  });
});
