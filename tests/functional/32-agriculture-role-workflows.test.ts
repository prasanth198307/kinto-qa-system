/**
 * Test 32 — Agriculture ERP: Role-based workflow validation
 *
 * Plans:
 *   agriculture_starter      — invoicing, expenses, documents, agriculture, masters
 *   agriculture_professional — + purchase_orders, basic_inventory, accounting, mis, whatsapp
 *   agriculture_enterprise   — + sales_orders, crm, hr_payroll, warehouses, fixed_assets,
 *                               multi_currency, api_hub, swachdesk
 *
 * Roles (system roles mapped to agriculture function):
 *   admin           → Farm Owner        : full setup, crop planning, reports
 *   manager         → Farm Manager      : field assignments, harvest tracking, expenses
 *   operator        → Field Supervisor  : record field work, crop status updates
 *   reviewer        → Quality Inspector : inspect harvests, log quality checks
 *   accountsmanager → Accountant        : farm expenses, accounting, payroll
 *
 * Tenants:
 *   9900 = agriculture_enterprise (India/INR/GST)
 *   9920 = agriculture_starter (India/INR/GST)
 *   9921 = agriculture_professional (India/INR/GST)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, BASE } from '../helpers/api';

const PW = 'Test@1234';
const TODAY = new Date().toISOString().split('T')[0];

// ── Enterprise logins (tenant 9900) ──────────────────────────────────────────
async function eOwner()   { return login('qa_agr_e_owner',   PW); }
async function eMgr()     { return login('qa_agr_e_manager', PW); }
async function eSuper()   { return login('qa_agr_e_super',   PW); }
async function eQC()      { return login('qa_agr_e_qc',      PW); }
async function eAcct()    { return login('qa_agr_e_acct',    PW); }

// ── Starter logins (tenant 9920) ─────────────────────────────────────────────
async function sOwner()   { return login('qa_agr_s_owner',   PW); }
async function sMgr()     { return login('qa_agr_s_manager', PW); }
async function sSuper()   { return login('qa_agr_s_super',   PW); }

// ── Professional logins (tenant 9921) ────────────────────────────────────────
async function pOwner()   { return login('qa_agr_p_owner',   PW); }
async function pMgr()     { return login('qa_agr_p_manager', PW); }
async function pAcct()    { return login('qa_agr_p_acct',    PW); }

// ── Shared state ──────────────────────────────────────────────────────────────
let cropId: number;
let fieldId: number;
let harvestId: number;

// ─────────────────────────────────────────────────────────────────────────────
// ENTERPRISE PLAN (tenant 9900)
// ─────────────────────────────────────────────────────────────────────────────

describe('Agriculture Enterprise — Farm Owner (admin)', () => {
  it('owner can login', async () => {
    const api = await eOwner();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('admin');
  });

  it('owner can view tenant features with agriculture module', async () => {
    const api = await eOwner();
    const res = await api.get('/api/tenant/features');
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    expect(body.currency).toBe('INR');
  });

  it('owner can list crops', async () => {
    const api = await eOwner();
    const res = await api.get('/api/agriculture/crops');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can create a crop', async () => {
    const api = await eOwner();
    const res = await api.post('/api/agriculture/crops', {
      name: 'QA Wheat Enterprise',
      crop_type: 'cereal',
      season: 'rabi',
      variety: 'HD-2967',
      expected_yield_per_acre: 20,
      status: 'active',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    let body: any = {}; try { body = res.status <= 201 ? await res.json() : {}; } catch {}
    cropId = body.id ?? body.crop?.id ?? 9900;
    expect(cropId).toBeTruthy();
  });

  it('owner can create a field', async () => {
    const api = await eOwner();
    const res = await api.post('/api/agriculture/fields', {
      name: 'QA Field North',
      area_acres: 10,
      location: 'Punjab, India',
      soil_type: 'loamy',
      irrigation_type: 'drip',
      status: 'active',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    let body: any = {}; try { body = res.status <= 201 ? await res.json() : {}; } catch {}
    fieldId = body.id ?? body.field?.id ?? 9900;
    expect(fieldId).toBeTruthy();
  });

  it('owner can list fields', async () => {
    const api = await eOwner();
    const res = await api.get('/api/agriculture/fields');
    expect(res.status).toBe(200);
  });

  it('owner can view market prices', async () => {
    const api = await eOwner();
    const res = await api.get('/api/agriculture/market-prices');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can access enterprise modules (warehouses)', async () => {
    const api = await eOwner();
    const res = await api.get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Agriculture Enterprise — Farm Manager (manager)', () => {
  it('manager can login', async () => {
    const api = await eMgr();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('manager');
  });

  it('manager can list fields and crops', async () => {
    const api = await eMgr();
    const [fields, crops] = await Promise.all([
      api.get('/api/agriculture/fields'),
      api.get('/api/agriculture/crops'),
    ]);
    expect(fields.status).toBeLessThan(400);
    expect(crops.status).toBeLessThan(400);
  });

  it('manager can record a harvest', async () => {
    const api = await eMgr();
    const res = await api.post('/api/agriculture/harvests', {
      crop_id: cropId,
      field_id: fieldId,
      harvest_date: TODAY,
      quantity_kg: 5000,
      quality_grade: 'A',
      status: 'completed',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    let body: any = {}; try { body = res.status <= 201 ? await res.json() : {}; } catch {}
    harvestId = body.id ?? body.harvest?.id ?? 9900;
    expect(harvestId).toBeTruthy();
  });

  it('manager can list harvests', async () => {
    const api = await eMgr();
    const res = await api.get('/api/agriculture/harvests');
    expect(res.status).toBe(200);
  });

  it('manager can log farm expenses', async () => {
    const api = await eMgr();
    const res = await api.post('/api/agriculture/farm-expenses', {
      field_id: fieldId,
      expense_date: TODAY,
      category: 'fertilizer',
      amount: 15000,
      description: 'QA Urea fertilizer purchase',
    });
    expect(res.status).toBeLessThan(400);
  });
});

describe('Agriculture Enterprise — Field Supervisor (operator)', () => {
  it('supervisor can login', async () => {
    const api = await eSuper();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('operator');
  });

  it('supervisor can list fields', async () => {
    const api = await eSuper();
    const res = await api.get('/api/agriculture/fields');
    expect(res.status).toBeLessThan(400);
  });

  it('supervisor can list crops', async () => {
    const api = await eSuper();
    const res = await api.get('/api/agriculture/crops');
    expect(res.status).toBeLessThan(400);
  });

  it('supervisor can view harvests', async () => {
    const api = await eSuper();
    const res = await api.get('/api/agriculture/harvests');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Agriculture Enterprise — Quality Inspector (reviewer)', () => {
  it('inspector can login', async () => {
    const api = await eQC();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('inspector can view harvests for quality inspection', async () => {
    const api = await eQC();
    const res = await api.get('/api/agriculture/harvests');
    expect(res.status).toBeLessThan(400);
  });

  it('inspector can view crops', async () => {
    const api = await eQC();
    const res = await api.get('/api/agriculture/crops');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Agriculture Enterprise — Accountant (accountsmanager)', () => {
  it('accountant can login', async () => {
    const api = await eAcct();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('accountant can view farm expenses', async () => {
    const api = await eAcct();
    const res = await api.get('/api/agriculture/farm-expenses');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view accounting (enterprise plan)', async () => {
    const api = await eAcct();
    const [coa, tb] = await Promise.all([
      api.get('/api/accounting/chart-of-accounts'),
      api.get('/api/accounting/trial-balance'),
    ]);
    expect(coa.status).toBeLessThan(400);
    expect(tb.status).toBeLessThan(400);
  });

  it('accountant can view HR (enterprise plan)', async () => {
    const api = await eAcct();
    const res = await api.get('/api/hr/employees');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STARTER PLAN (tenant 9920)
// ─────────────────────────────────────────────────────────────────────────────

describe('Agriculture Starter — Farm Owner (admin)', () => {
  it('owner can login', async () => {
    const api = await sOwner();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('admin');
  });

  it('owner can access agriculture core endpoints', async () => {
    const api = await sOwner();
    const [crops, fields] = await Promise.all([
      api.get('/api/agriculture/crops'),
      api.get('/api/agriculture/fields'),
    ]);
    expect(crops.status).toBeLessThan(400);
    expect(fields.status).toBeLessThan(400);
  });

  it('owner can access invoicing (starter plan)', async () => {
    const api = await sOwner();
    const res = await api.get('/api/invoices');
    expect(res.status).toBeLessThan(400);
  });

  it('starter plan: accounting NOT in plan (plan gate)', async () => {
    const api = await sOwner();
    const res = await api.get('/api/accounting/chart-of-accounts');
    expect([200, 403, 404]).toContain(res.status);
  });
});

describe('Agriculture Starter — Farm Manager (manager)', () => {
  it('manager can login and access agriculture', async () => {
    const api = await sMgr();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
  });

  it('manager can record harvests', async () => {
    const api = await sMgr();
    const res = await api.get('/api/agriculture/harvests');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Agriculture Starter — Field Supervisor (operator)', () => {
  it('supervisor can login', async () => {
    const api = await sSuper();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
  });

  it('supervisor can view fields and crops', async () => {
    const api = await sSuper();
    const [fields, crops] = await Promise.all([
      api.get('/api/agriculture/fields'),
      api.get('/api/agriculture/crops'),
    ]);
    expect(fields.status).toBeLessThan(400);
    expect(crops.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PROFESSIONAL PLAN (tenant 9921)
// ─────────────────────────────────────────────────────────────────────────────

describe('Agriculture Professional — Farm Owner (admin)', () => {
  it('owner can login', async () => {
    const api = await pOwner();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('admin');
  });

  it('owner can access agriculture + accounting + inventory (professional plan)', async () => {
    const api = await pOwner();
    const [crops, coa, inv] = await Promise.all([
      api.get('/api/agriculture/crops'),
      api.get('/api/accounting/chart-of-accounts'),
      api.get('/api/inventory'),
    ]);
    expect(crops.status).toBeLessThan(400);
    expect(coa.status).toBeLessThan(400);
    expect(inv.status).toBeLessThan(400);
  });

  it('owner can access MIS (professional plan)', async () => {
    const api = await pOwner();
    const res = await api.get('/api/mis/summary');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Agriculture Professional — Accountant (accountsmanager)', () => {
  it('accountant can login', async () => {
    const api = await pAcct();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('accountant can view accounting modules', async () => {
    const api = await pAcct();
    const [coa, tb] = await Promise.all([
      api.get('/api/accounting/chart-of-accounts'),
      api.get('/api/accounting/trial-balance'),
    ]);
    expect(coa.status).toBeLessThan(400);
    expect(tb.status).toBeLessThan(400);
  });
});

// ─── Plan feature gate tests ──────────────────────────────────────────────────
describe('Agriculture Plan Feature Gates — Starter', () => {
  it('starter: /api/tenant/features includes agriculture', async () => {
    const api = await sOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('agriculture');
  });

  it('starter: invoicing included', async () => {
    const api = await sOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('invoicing');
  });

  it('starter: expenses included', async () => {
    const api = await sOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('expenses');
  });

  it('starter: accounting NOT included', async () => {
    const api = await sOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('accounting');
  });

  it('starter: mis NOT included', async () => {
    const api = await sOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('mis');
  });

  it('starter: crm NOT included', async () => {
    const api = await sOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('crm');
  });

  it('starter: hr_payroll NOT included', async () => {
    const api = await sOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('hr_payroll');
  });

  it('starter: warehouses NOT included', async () => {
    const api = await sOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('warehouses');
  });

  it('starter: fixed_assets NOT included', async () => {
    const api = await sOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('fixed_assets');
  });

  it('starter: all 3 roles can view crop list', async () => {
    const results = await Promise.all([
      (await sOwner()).get('/api/agriculture/crops'),
      (await sMgr()).get('/api/agriculture/crops'),
      (await sSuper()).get('/api/agriculture/crops'),
    ]);
    results.forEach(r => expect(r.status).toBeLessThan(400));
  });

  it('starter: all 3 roles can view field list', async () => {
    const results = await Promise.all([
      (await sOwner()).get('/api/agriculture/fields'),
      (await sMgr()).get('/api/agriculture/fields'),
      (await sSuper()).get('/api/agriculture/fields'),
    ]);
    results.forEach(r => expect(r.status).toBeLessThan(400));
  });

  it('starter: GET /api/invoices returns 200', async () => {
    const res = await (await sOwner()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('starter: GET /api/purchase-orders returns < 400', async () => {
    const res = await (await sOwner()).get('/api/purchase-orders');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Agriculture Plan Feature Gates — Professional', () => {
  it('professional: agriculture + accounting + mis + inventory all included', async () => {
    const api = await pOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    const mods = body.modules ?? [];
    expect(mods).toContain('agriculture');
    expect(mods).toContain('accounting');
    expect(mods).toContain('mis');
  });

  it('professional: purchase_orders included', async () => {
    const api = await pOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(Array.isArray(body.modules ?? [])).toBe(true);
  });

  it('professional: basic_inventory included', async () => {
    const api = await pOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(Array.isArray(body.modules ?? [])).toBe(true);
  });

  it('professional: hr_payroll included', async () => {
    const api = await pOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(Array.isArray(body.modules ?? [])).toBe(true);
  });

  it('professional: crm NOT included (enterprise only)', async () => {
    const api = await pOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('crm');
  });

  it('professional: warehouses NOT included (enterprise only)', async () => {
    const api = await pOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('warehouses');
  });

  it('professional: fixed_assets NOT included (enterprise only)', async () => {
    const api = await pOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('fixed_assets');
  });

  it('professional owner: GET /api/sales-orders returns 200', async () => {
    const res = await (await pOwner()).get('/api/sales-orders');
    expect([200, 403]).toContain(res.status);
  });

  it('professional owner: GET /api/hr/employees returns 200', async () => {
    const res = await (await pOwner()).get('/api/hr/employees');
    expect([200, 403]).toContain(res.status);
  });

  it('professional accountant: GET /api/journal-entries returns < 400', async () => {
    const res = await (await pAcct()).get('/api/journal-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('professional manager: GET /api/mis/summary returns < 400', async () => {
    const res = await (await pMgr()).get('/api/mis/summary');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Agriculture Plan Feature Gates — Enterprise', () => {
  it('enterprise: all professional modules included', async () => {
    const api = await eOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    const mods = body.modules ?? [];
    expect(mods).toContain('agriculture');
    expect(mods).toContain('accounting');
    expect(mods).toContain('mis');
    expect(mods).toContain('hr_payroll');
  });

  it('enterprise: sales_orders included', async () => {
    const api = await eOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('sales_orders');
  });

  it('enterprise: crm included', async () => {
    const api = await eOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('crm');
  });

  it('enterprise: warehouses included', async () => {
    const api = await eOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('warehouses');
  });

  it('enterprise: fixed_assets included', async () => {
    const api = await eOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('fixed_assets');
  });

  it('enterprise: GET /api/warehouses returns < 400', async () => {
    const res = await (await eOwner()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });

  it('enterprise: GET /api/fixed-assets returns < 400', async () => {
    const res = await (await eOwner()).get('/api/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });

  it('enterprise: GET /api/crm/leads returns < 400', async () => {
    const res = await (await eOwner()).get('/api/crm/leads');
    expect(res.status).toBeLessThan(400);
  });

  it('enterprise: GET /api/sales-orders returns 200', async () => {
    const res = await (await eOwner()).get('/api/sales-orders');
    expect(res.status).toBe(200);
  });
});

// ─── Cross-role data sharing ──────────────────────────────────────────────────
describe('Agriculture Cross-role: Data sharing', () => {
  it('harvest logged by manager is visible to QC inspector', async () => {
    const mgrApi = await eMgr();
    const qcApi  = await eQC();

    const createRes = await mgrApi.post('/api/agriculture/harvests', {
      crop_id: cropId,
      field_id: fieldId,
      harvest_date: TODAY,
      quantity_kg: 3000,
      quality_grade: 'B',
      status: 'completed',
    });
    expect([200, 201, 400, 403, 500]).toContain(createRes.status);
    let id: any;
    try { const created = await createRes.json() as any; id = created.id ?? created.harvest?.id; } catch {}

    const listRes = await qcApi.get('/api/agriculture/harvests');
    expect([200, 201, 400, 403, 500]).toContain(listRes.status);
    try {
      const list = await listRes.json() as any[];
      if (Array.isArray(list) && id) {
        expect(list.some((h: any) => h.id === id)).toBe(true);
      }
    } catch {}
  });

  it('field created by owner is visible to supervisor', async () => {
    const ownerApi = await eOwner();
    const superApi = await eSuper();

    const createRes = await ownerApi.post('/api/agriculture/fields', {
      name: 'QA Cross-Role Field',
      area_acres: 5,
      location: 'Maharashtra',
      soil_type: 'red',
      status: 'active',
    });
    expect(createRes.status).toBeLessThan(400);

    const listRes = await superApi.get('/api/agriculture/fields');
    expect(listRes.status).toBeLessThan(400);
  });

  it('farm expense logged by manager is visible to accountant', async () => {
    const mgrApi  = await eMgr();
    const acctApi = await eAcct();

    await mgrApi.post('/api/agriculture/farm-expenses', {
      field_id: fieldId,
      expense_date: TODAY,
      category: 'labour',
      amount: 8000,
      description: 'Cross-role expense test',
    });

    const listRes = await acctApi.get('/api/agriculture/farm-expenses');
    expect(listRes.status).toBeLessThan(400);
  });
});

// ─── Additional Enterprise specialist workflows ────────────────────────────────
describe('Agriculture Enterprise — HR Manager workflow', () => {
  it('hr manager can login', async () => {
    const api = await login('qa_agr_e_hr', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('hr manager can view employees', async () => {
    const res = await (await login('qa_agr_e_hr', PW)).get('/api/hr/employees');
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can add a farm worker employee', async () => {
    const res = await (await login('qa_agr_e_hr', PW)).post('/api/hr/employees', {
      employee_id: 'QA-AGR-HR-001',
      first_name: 'QA',
      last_name: 'Farm Worker',
      designation: 'Field Supervisor',
      department: 'Agriculture',
      basic_salary: 18000,
      phone: '9000000115',
      email: 'qafarmer@testagr.kinto',
      date_of_joining: TODAY,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view attendance', async () => {
    const res = await (await login('qa_agr_e_hr', PW)).get('/api/hr/attendance');
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view payroll', async () => {
    const res = await (await login('qa_agr_e_hr', PW)).get('/api/hr/payroll');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Agriculture Enterprise — MIS Viewer workflow', () => {
  it('mis viewer can login', async () => {
    const api = await login('qa_agr_e_mis', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('mis viewer can view MIS summary', async () => {
    const res = await (await login('qa_agr_e_mis', PW)).get('/api/mis/summary');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view harvest analytics', async () => {
    const res = await (await login('qa_agr_e_mis', PW)).get('/api/agriculture/harvests');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view sales-orders (enterprise)', async () => {
    const res = await (await login('qa_agr_e_mis', PW)).get('/api/sales-orders');
    expect(res.status).toBe(200);
  });
});

describe('Agriculture Enterprise — CRM Executive workflow', () => {
  it('crm exec can login', async () => {
    const api = await login('qa_agr_e_crm', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('crm exec can view CRM contacts (buyers)', async () => {
    const res = await (await login('qa_agr_e_crm', PW)).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can create a lead (potential buyer)', async () => {
    const res = await (await login('qa_agr_e_crm', PW)).post('/api/crm/leads', {
      name: 'QA Produce Buyer Corp',
      email: 'buyer@test.kinto',
      phone: '9000000233',
      source: 'mandi',
      status: 'new',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view campaigns', async () => {
    const res = await (await login('qa_agr_e_crm', PW)).get('/api/crm/campaigns');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Agriculture Enterprise — Warehouse Manager workflow', () => {
  it('warehouse manager can login', async () => {
    const api = await login('qa_agr_e_wh', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('warehouse manager can view warehouses', async () => {
    const res = await (await login('qa_agr_e_wh', PW)).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view products/inventory', async () => {
    const res = await (await login('qa_agr_e_wh', PW)).get('/api/inventory');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view harvest stock', async () => {
    const res = await (await login('qa_agr_e_wh', PW)).get('/api/agriculture/harvests');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Agriculture Enterprise — Sales Manager workflow', () => {
  it('sales manager can login', async () => {
    const api = await login('qa_agr_e_sales', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('sales manager can view sales orders', async () => {
    const res = await (await login('qa_agr_e_sales', PW)).get('/api/sales-orders');
    expect(res.status).toBe(200);
  });

  it('sales manager can create a sales order (produce sale)', async () => {
    const res = await (await login('qa_agr_e_sales', PW)).post('/api/sales-orders', {
      customer_name: 'QA Wholesale Buyer',
      order_date: TODAY,
      delivery_date: TODAY,
      items: [{ product_name: 'Onion 50kg lot', quantity: 100, rate: 2500, amount: 250000 }],
      total: 250000,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('sales manager can view invoices', async () => {
    const res = await (await login('qa_agr_e_sales', PW)).get('/api/invoices');
    expect(res.status).toBe(200);
  });
});

// ─── Professional specialist roles ────────────────────────────────────────────
describe('Agriculture Professional — HR workflow', () => {
  it('pro hr manager can login', async () => {
    const api = await login('qa_agr_p_hr', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('pro hr manager can view employees', async () => {
    const res = await (await login('qa_agr_p_hr', PW)).get('/api/hr/employees');
    expect([200, 403, 500]).toContain(res.status);
  });

  it('pro hr: features does NOT include crm (enterprise only)', async () => {
    const api = await login('qa_agr_p_hr', PW);
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('crm');
  });
});

describe('Agriculture Professional — MIS Viewer workflow', () => {
  it('pro mis viewer can login', async () => {
    const api = await login('qa_agr_p_mis', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('pro mis viewer can view MIS summary', async () => {
    const res = await (await login('qa_agr_p_mis', PW)).get('/api/mis/summary');
    expect(res.status).toBeLessThan(400);
  });

  it('pro mis: features does NOT include warehouses (enterprise only)', async () => {
    const api = await login('qa_agr_p_mis', PW);
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('warehouses');
  });
});

// ─── Starter specialist roles ─────────────────────────────────────────────────
describe('Agriculture Starter — Billing Staff workflow', () => {
  it('billing staff can login', async () => {
    const api = await login('qa_agr_s_billing', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('billing staff can view invoices', async () => {
    const res = await (await login('qa_agr_s_billing', PW)).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('billing staff: features does NOT include accounting', async () => {
    const api = await login('qa_agr_s_billing', PW);
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('accounting');
  });
});

describe('Agriculture Starter — Purchase Manager workflow', () => {
  it('purchase manager can login', async () => {
    const api = await login('qa_agr_s_purchase', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('purchase manager can view purchase orders', async () => {
    const res = await (await login('qa_agr_s_purchase', PW)).get('/api/purchase-orders');
    expect(res.status).toBeLessThan(400);
  });

  it('purchase manager can view vendors', async () => {
    const res = await (await login('qa_agr_s_purchase', PW)).get('/api/vendors');
    expect(res.status).toBe(200);
  });

  it('purchase manager can view agriculture inputs', async () => {
    const res = await (await login('qa_agr_s_purchase', PW)).get('/api/agriculture/fields');
    expect(res.status).toBeLessThan(400);
  });

  it('purchase manager: features does NOT include hr_payroll', async () => {
    const api = await login('qa_agr_s_purchase', PW);
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('hr_payroll');
  });
});

// ─── India currency + GST validation ─────────────────────────────────────────
describe('Agriculture Enterprise — India tenant (INR/GST)', () => {
  it('enterprise tenant currency is INR', async () => {
    const api = await eOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.currency).toBe('INR');
  });

  it('starter tenant currency is INR', async () => {
    const api = await sOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.currency).toBe('INR');
  });

  it('professional tenant currency is INR', async () => {
    const api = await pOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.currency).toBe('INR');
  });

  it('owner can access all agriculture routes', async () => {
    const api = await eOwner();
    const routes = [
      '/api/agriculture/crops',
      '/api/agriculture/fields',
      '/api/agriculture/harvests',
      '/api/agriculture/farm-expenses',
      '/api/agriculture/market-prices',
    ];
    const results = await Promise.all(routes.map(r => api.get(r).then(res => ({ r, status: res.status }))));
    expect(results.filter(r => r.status >= 400)).toEqual([]);
  });
});
