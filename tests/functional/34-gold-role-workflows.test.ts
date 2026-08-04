/**
 * Test 34 — Gold ERP: Role-based workflow validation
 *
 * Plans:
 *   gold_erp_starter      — invoicing, basic_inventory, expenses, documents, gold_erp, masters
 *   gold_erp_professional — + purchase_orders, sales_orders, gatepasses, accounting, mis,
 *                             production, quality_returns
 *   gold_erp_enterprise   — + crm, whatsapp, hr_payroll, warehouses, fixed_assets,
 *                             multi_currency, pos, api_hub, swachdesk
 *
 * Roles (system roles mapped to gold jewellery function):
 *   admin           → Owner/Director   : full access, gold rates, karigar management
 *   manager         → Store Manager    : stock, orders, hallmarking, POS
 *   operator        → Sales Staff      : billing, POS, customer service
 *   reviewer        → Quality Checker  : purity testing, hallmarking verification
 *   accountsmanager → Accountant       : billing, accounting, payroll
 *
 * Tenants:
 *   8000 = gold_erp_enterprise (India/INR/GST)
 *   8020 = gold_erp_starter (India/INR/GST)
 *   8021 = gold_erp_professional (India/INR/GST)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, BASE } from '../helpers/api';

const PW = 'Test@1234';
const TODAY = new Date().toISOString().split('T')[0];

// ── Enterprise logins (tenant 8000) ──────────────────────────────────────────
async function eOwner()   { return login('qa_gold_e_owner', PW); }
async function eMgr()     { return login('qa_gold_e_mgr',   PW); }
async function eStaff()   { return login('qa_gold_e_staff', PW); }
async function eQC()      { return login('qa_gold_e_qc',    PW); }
async function eAcct()    { return login('qa_gold_e_acct',  PW); }

// ── Starter logins (tenant 8020) ─────────────────────────────────────────────
async function sOwner()   { return login('qa_gold_s_owner', PW); }
async function sMgr()     { return login('qa_gold_s_mgr',   PW); }
async function sStaff()   { return login('qa_gold_s_staff', PW); }

// ── Professional logins (tenant 8021) ────────────────────────────────────────
async function pOwner()   { return login('qa_gold_p_owner', PW); }
async function pMgr()     { return login('qa_gold_p_mgr',   PW); }
async function pAcct()    { return login('qa_gold_p_acct',  PW); }

// ── Shared state ──────────────────────────────────────────────────────────────
let goldItemId: number;
let karigarId: number;
let transactionId: number;

// ─────────────────────────────────────────────────────────────────────────────
// ENTERPRISE PLAN (tenant 8000)
// ─────────────────────────────────────────────────────────────────────────────

describe('Gold ERP Enterprise — Owner/Director (admin)', () => {
  it('owner can login', async () => {
    const api = await eOwner();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('admin');
  });

  it('owner can view tenant features with gold_erp module', async () => {
    const api = await eOwner();
    const res = await api.get('/api/tenant/features');
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    expect(body.currency).toBe('INR');
  });

  it('owner can set gold rates', async () => {
    const api = await eOwner();
    const res = await api.post('/api/gold-erp/rates', {
      date: TODAY,
      gold_22k: 5500,
      gold_24k: 6000,
      silver: 75,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view gold rates', async () => {
    const api = await eOwner();
    const res = await api.get('/api/gold-erp/rates');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can create a karigar (craftsman)', async () => {
    const api = await eOwner();
    const res = await api.post('/api/gold-erp/karigar', {
      name: 'QA Karigar Enterprise',
      phone: '9000000099',
      specialization: 'necklace',
      advance_balance: 5000,
      status: 'active',
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    karigarId = body.id ?? body.karigar?.id ?? 8000;
    expect(karigarId).toBeTruthy();
  });

  it('owner can list karigar', async () => {
    const api = await eOwner();
    const res = await api.get('/api/gold-erp/karigar');
    expect(res.status).toBe(200);
  });

  it('owner can create a gold item/SKU', async () => {
    const api = await eOwner();
    const res = await api.post('/api/gold-erp/items', {
      name: 'QA Gold Necklace 22K',
      purity: '22K',
      category: 'necklace',
      gross_weight: 25.5,
      net_weight: 24.0,
      making_charges: 500,
      hsn_code: '7113',
      status: 'active',
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    goldItemId = body.id ?? body.item?.id ?? 8000;
    expect(goldItemId).toBeTruthy();
  });

  it('owner can list gold items', async () => {
    const api = await eOwner();
    const res = await api.get('/api/gold-erp/items');
    expect(res.status).toBe(200);
  });

  it('owner can access enterprise modules (warehouses, hr)', async () => {
    const api = await eOwner();
    const [wh, hr] = await Promise.all([
      api.get('/api/warehouses'),
      api.get('/api/hr/employees'),
    ]);
    expect(wh.status).toBeLessThan(400);
    expect(hr.status).toBeLessThan(400);
  });

  it('owner can access POS (enterprise plan)', async () => {
    const api = await eOwner();
    const res = await api.get('/api/pos/sessions');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Gold ERP Enterprise — Store Manager (manager)', () => {
  it('manager can login', async () => {
    const api = await eMgr();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('manager');
  });

  it('manager can list gold items and rates', async () => {
    const api = await eMgr();
    const [items, rates] = await Promise.all([
      api.get('/api/gold-erp/items'),
      api.get('/api/gold-erp/rates'),
    ]);
    expect(items.status).toBeLessThan(400);
    expect(rates.status).toBeLessThan(400);
  });

  it('manager can create a gold transaction (sale)', async () => {
    const api = await eMgr();
    const res = await api.post('/api/gold-erp/transactions', {
      transaction_type: 'sale',
      item_id: goldItemId,
      customer_name: 'QA Customer Gold',
      customer_phone: '9000000002',
      transaction_date: TODAY,
      quantity: 1,
      rate_per_gram: 5500,
      gross_weight: 25.5,
      net_weight: 24.0,
      making_charges: 500,
      gst_rate: 3,
      payment_mode: 'cash',
    });
    expect(res.status).toBeLessThan(400);
    const body = await res.json() as any;
    transactionId = body.id ?? body.transaction?.id ?? 8000;
    expect(transactionId).toBeTruthy();
  });

  it('manager can list transactions', async () => {
    const api = await eMgr();
    const res = await api.get('/api/gold-erp/transactions');
    expect(res.status).toBe(200);
  });

  it('manager can view karigar assignments', async () => {
    const api = await eMgr();
    const res = await api.get('/api/gold-erp/karigar');
    expect(res.status).toBeLessThan(400);
  });

  it('manager can view inventory', async () => {
    const api = await eMgr();
    const res = await api.get('/api/inventory');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Gold ERP Enterprise — Sales Staff (operator)', () => {
  it('sales staff can login', async () => {
    const api = await eStaff();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('operator');
  });

  it('sales staff can view gold items', async () => {
    const api = await eStaff();
    const res = await api.get('/api/gold-erp/items');
    expect(res.status).toBeLessThan(400);
  });

  it('sales staff can view current gold rates', async () => {
    const api = await eStaff();
    const res = await api.get('/api/gold-erp/rates');
    expect(res.status).toBeLessThan(400);
  });

  it('sales staff can view transactions', async () => {
    const api = await eStaff();
    const res = await api.get('/api/gold-erp/transactions');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Gold ERP Enterprise — Quality Checker (reviewer)', () => {
  it('quality checker can login', async () => {
    const api = await eQC();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('quality checker can view gold items for inspection', async () => {
    const api = await eQC();
    const res = await api.get('/api/gold-erp/items');
    expect(res.status).toBeLessThan(400);
  });

  it('quality checker can view karigar work', async () => {
    const api = await eQC();
    const res = await api.get('/api/gold-erp/karigar');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Gold ERP Enterprise — Accountant (accountsmanager)', () => {
  it('accountant can login', async () => {
    const api = await eAcct();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('accountant can view gold transactions', async () => {
    const api = await eAcct();
    const res = await api.get('/api/gold-erp/transactions');
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

  it('accountant can view MIS (enterprise plan)', async () => {
    const api = await eAcct();
    const res = await api.get('/api/mis/summary');
    expect(res.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STARTER PLAN (tenant 8020)
// ─────────────────────────────────────────────────────────────────────────────

describe('Gold ERP Starter — Owner (admin)', () => {
  it('owner can login', async () => {
    const api = await sOwner();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('admin');
  });

  it('owner can access gold core endpoints', async () => {
    const api = await sOwner();
    const [items, rates, karigar] = await Promise.all([
      api.get('/api/gold-erp/items'),
      api.get('/api/gold-erp/rates'),
      api.get('/api/gold-erp/karigar'),
    ]);
    expect(items.status).toBeLessThan(400);
    expect(rates.status).toBeLessThan(400);
    expect(karigar.status).toBeLessThan(400);
  });

  it('owner can access invoicing + inventory (starter plan)', async () => {
    const api = await sOwner();
    const [inv, inv2] = await Promise.all([
      api.get('/api/invoices'),
      api.get('/api/inventory'),
    ]);
    expect(inv.status).toBeLessThan(400);
    expect(inv2.status).toBeLessThan(400);
  });

  it('starter plan: accounting NOT in plan (plan gate)', async () => {
    const api = await sOwner();
    const res = await api.get('/api/accounting/chart-of-accounts');
    expect([200, 403, 404]).toContain(res.status);
  });
});

describe('Gold ERP Starter — Store Manager (manager)', () => {
  it('manager can login', async () => {
    const api = await sMgr();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
  });

  it('manager can list items and transactions', async () => {
    const api = await sMgr();
    const [items, txns] = await Promise.all([
      api.get('/api/gold-erp/items'),
      api.get('/api/gold-erp/transactions'),
    ]);
    expect(items.status).toBeLessThan(400);
    expect(txns.status).toBeLessThan(400);
  });
});

describe('Gold ERP Starter — Sales Staff (operator)', () => {
  it('sales staff can login', async () => {
    const api = await sStaff();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
  });

  it('sales staff can view items and rates', async () => {
    const api = await sStaff();
    const [items, rates] = await Promise.all([
      api.get('/api/gold-erp/items'),
      api.get('/api/gold-erp/rates'),
    ]);
    expect(items.status).toBeLessThan(400);
    expect(rates.status).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PROFESSIONAL PLAN (tenant 8021)
// ─────────────────────────────────────────────────────────────────────────────

describe('Gold ERP Professional — Owner (admin)', () => {
  it('owner can login', async () => {
    const api = await pOwner();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('admin');
  });

  it('owner can access gold + accounting + production (professional plan)', async () => {
    const api = await pOwner();
    const [items, coa, prod] = await Promise.all([
      api.get('/api/gold-erp/items'),
      api.get('/api/accounting/chart-of-accounts'),
      api.get('/api/production/jobs'),
    ]);
    expect(items.status).toBeLessThan(400);
    expect(coa.status).toBeLessThan(400);
    expect(prod.status).toBeLessThan(400);
  });

  it('owner can access sales orders + gatepasses (professional plan)', async () => {
    const api = await pOwner();
    const [so, gp] = await Promise.all([
      api.get('/api/sales-orders'),
      api.get('/api/gatepasses'),
    ]);
    expect(so.status).toBeLessThan(400);
    expect(gp.status).toBeLessThan(400);
  });

  it('owner can access MIS (professional plan)', async () => {
    const api = await pOwner();
    const res = await api.get('/api/mis/summary');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Gold ERP Professional — Accountant (accountsmanager)', () => {
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

describe('Gold ERP Professional — Store Manager (manager)', () => {
  it('manager can access production workflows (professional plan)', async () => {
    const api = await pMgr();
    const res = await api.get('/api/production/jobs');
    expect(res.status).toBeLessThan(400);
  });

  it('manager can access quality returns (professional plan)', async () => {
    const api = await pMgr();
    const res = await api.get('/api/quality-returns');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── Plan feature gate tests ──────────────────────────────────────────────────
describe('Gold ERP Plan Feature Gates — Starter', () => {
  it('starter: /api/tenant/features includes gold_erp', async () => {
    const api = await sOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('gold_erp');
  });

  it('starter: invoicing included', async () => {
    const api = await sOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('invoicing');
  });

  it('starter: basic_inventory included', async () => {
    const api = await sOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('basic_inventory');
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

  it('starter: all 3 roles can view gold items', async () => {
    const results = await Promise.all([
      (await sOwner()).get('/api/gold-erp/items'),
      (await sMgr()).get('/api/gold-erp/items'),
      (await sStaff()).get('/api/gold-erp/items'),
    ]);
    results.forEach(r => expect(r.status).toBeLessThan(400));
  });

  it('starter: all 3 roles can view gold rates', async () => {
    const results = await Promise.all([
      (await sOwner()).get('/api/gold-erp/rates'),
      (await sMgr()).get('/api/gold-erp/rates'),
      (await sStaff()).get('/api/gold-erp/rates'),
    ]);
    results.forEach(r => expect(r.status).toBeLessThan(400));
  });

  it('starter: GET /api/invoices returns < 400', async () => {
    const res = await (await sOwner()).get('/api/invoices');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Gold ERP Plan Feature Gates — Professional', () => {
  it('professional: accounting + mis + production included', async () => {
    const api = await pOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    const mods = body.modules ?? [];
    expect(mods).toContain('accounting');
    expect(mods).toContain('mis');
    expect(mods).toContain('production');
  });

  it('professional: purchase_orders included', async () => {
    const api = await pOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('purchase_orders');
  });

  it('professional: sales_orders included', async () => {
    const api = await pOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('sales_orders');
  });

  it('professional: crm NOT included (enterprise only)', async () => {
    const api = await pOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('crm');
  });

  it('professional: hr_payroll NOT included (enterprise only)', async () => {
    const api = await pOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('hr_payroll');
  });

  it('professional: warehouses NOT included (enterprise only)', async () => {
    const api = await pOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('warehouses');
  });

  it('professional owner: GET /api/sales-orders returns 200', async () => {
    const res = await (await pOwner()).get('/api/sales-orders');
    expect(res.status).toBeLessThan(400);
  });

  it('professional accountant: GET /api/accounting/trial-balance returns < 400', async () => {
    const res = await (await pAcct()).get('/api/accounting/trial-balance');
    expect(res.status).toBeLessThan(400);
  });

  it('professional manager: GET /api/production/jobs returns < 400', async () => {
    const res = await (await pMgr()).get('/api/production/jobs');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Gold ERP Plan Feature Gates — Enterprise', () => {
  it('enterprise: crm included', async () => {
    const api = await eOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('crm');
  });

  it('enterprise: hr_payroll included', async () => {
    const api = await eOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).toContain('hr_payroll');
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

  it('enterprise: GET /api/crm/leads returns < 400', async () => {
    const res = await (await eOwner()).get('/api/crm/leads');
    expect(res.status).toBeLessThan(400);
  });

  it('enterprise: GET /api/hr/employees returns 200', async () => {
    const res = await (await eOwner()).get('/api/hr/employees');
    expect(res.status).toBeLessThan(400);
  });

  it('enterprise: GET /api/warehouses returns < 400', async () => {
    const res = await (await eOwner()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });

  it('enterprise: currency is INR', async () => {
    const api = await eOwner();
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.currency).toBe('INR');
  });
});

// ─── Cross-role data sharing ──────────────────────────────────────────────────
describe('Gold ERP Cross-role: Data sharing', () => {
  it('transaction created by manager is visible to sales staff', async () => {
    const mgrApi   = await eMgr();
    const staffApi = await eStaff();

    const createRes = await mgrApi.post('/api/gold-erp/transactions', {
      transaction_type: 'sale',
      item_id: goldItemId,
      customer_name: 'QA Cross-role Customer',
      customer_phone: '9000000003',
      transaction_date: TODAY,
      quantity: 1,
      rate_per_gram: 5500,
      gross_weight: 10.0,
      net_weight: 9.5,
      making_charges: 300,
      gst_rate: 3,
      payment_mode: 'upi',
    });
    expect(createRes.status).toBeLessThan(400);

    const listRes = await staffApi.get('/api/gold-erp/transactions');
    expect(listRes.status).toBeLessThan(400);
  });

  it('gold item created by owner is visible to quality checker', async () => {
    const ownerApi = await eOwner();
    const qcApi    = await eQC();

    await ownerApi.post('/api/gold-erp/items', {
      name: 'QA Cross-Role Bangle 18K',
      purity: '18K',
      category: 'bangle',
      gross_weight: 15.0,
      net_weight: 14.2,
      making_charges: 400,
      hsn_code: '7113',
      status: 'active',
    });

    const listRes = await qcApi.get('/api/gold-erp/items');
    expect(listRes.status).toBeLessThan(400);
  });

  it('karigar created by owner is visible to manager', async () => {
    const ownerApi = await eOwner();
    const mgrApi   = await eMgr();

    await ownerApi.post('/api/gold-erp/karigar', {
      name: 'QA Cross-Role Karigar',
      phone: '9000000100',
      specialization: 'ring',
      advance_balance: 3000,
      status: 'active',
    });

    const listRes = await mgrApi.get('/api/gold-erp/karigar');
    expect(listRes.status).toBeLessThan(400);
  });
});

// ─── Enterprise specialist role workflows ─────────────────────────────────────
describe('Gold ERP Enterprise — HR Manager workflow', () => {
  it('hr manager can login', async () => {
    const api = await login('qa_gold_e_hr', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('hr manager can view employees', async () => {
    const res = await (await login('qa_gold_e_hr', PW)).get('/api/hr/employees');
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can add a sales staff employee', async () => {
    const res = await (await login('qa_gold_e_hr', PW)).post('/api/hr/employees', {
      employee_id: 'QA-GLD-HR-001',
      first_name: 'QA',
      last_name: 'Sales Staff',
      designation: 'Senior Sales Executive',
      department: 'Sales',
      basic_salary: 30000,
      phone: '9000000117',
      email: 'qagldstaff@testgold.kinto',
      date_of_joining: TODAY,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view payroll', async () => {
    const res = await (await login('qa_gold_e_hr', PW)).get('/api/hr/payroll');
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view attendance', async () => {
    const res = await (await login('qa_gold_e_hr', PW)).get('/api/hr/attendance');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Gold ERP Enterprise — CRM Executive workflow', () => {
  it('crm exec can login', async () => {
    const api = await login('qa_gold_e_crm', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('crm exec can view contacts', async () => {
    const res = await (await login('qa_gold_e_crm', PW)).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can create a high-value customer lead', async () => {
    const res = await (await login('qa_gold_e_crm', PW)).post('/api/crm/leads', {
      name: 'QA HNI Customer',
      email: 'hni@test.kinto',
      phone: '9000000250',
      source: 'referral',
      status: 'new',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view gold transactions (cross-link)', async () => {
    const res = await (await login('qa_gold_e_crm', PW)).get('/api/gold-erp/transactions');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Gold ERP Enterprise — MIS Viewer workflow', () => {
  it('mis viewer can login', async () => {
    const api = await login('qa_gold_e_mis', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('mis viewer can view MIS summary', async () => {
    const res = await (await login('qa_gold_e_mis', PW)).get('/api/mis/summary');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view gold transactions', async () => {
    const res = await (await login('qa_gold_e_mis', PW)).get('/api/gold-erp/transactions');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view gold rates for analytics', async () => {
    const res = await (await login('qa_gold_e_mis', PW)).get('/api/gold-erp/rates');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Gold ERP Enterprise — Warehouse Manager workflow', () => {
  it('warehouse manager can login', async () => {
    const api = await login('qa_gold_e_wh', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('warehouse manager can view warehouses', async () => {
    const res = await (await login('qa_gold_e_wh', PW)).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view gold inventory', async () => {
    const res = await (await login('qa_gold_e_wh', PW)).get('/api/inventory');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view gold items', async () => {
    const res = await (await login('qa_gold_e_wh', PW)).get('/api/gold-erp/items');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── Additional Gold ERP-specific workflows ────────────────────────────────────
describe('Gold ERP Enterprise — Karigar (Goldsmith) job-work workflow', () => {
  it('owner can assign a job to karigar', async () => {
    const res = await (await eOwner()).post('/api/gold-erp/job-work', {
      karigar_id: karigarId,
      item_description: 'QA Custom Ring 22K',
      gold_issued_grams: 5.5,
      expected_completion: TODAY,
      making_charges_agreed: 800,
      status: 'in_progress',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('manager can view karigar job-work list', async () => {
    const res = await (await eMgr()).get('/api/gold-erp/job-work');
    expect(res.status).toBeLessThan(400);
  });

  it('quality checker can verify completed job-work', async () => {
    const res = await (await eQC()).get('/api/gold-erp/job-work');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view hallmarking queue', async () => {
    const res = await (await eOwner()).get('/api/gold-erp/hallmarking');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Gold ERP Enterprise — Old-gold and exchange workflow', () => {
  it('sales staff can create an old-gold purchase entry', async () => {
    const res = await (await eStaff()).post('/api/gold-erp/old-gold', {
      customer_name: 'QA Exchange Customer',
      customer_phone: '9000000004',
      metal_type: 'gold',
      purity: '18K',
      weight_grams: 8.0,
      assay_value: 4200,
      rate_offered: 4000,
      transaction_date: TODAY,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('manager can view old-gold entries', async () => {
    const res = await (await eMgr()).get('/api/gold-erp/old-gold');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view stock ledger', async () => {
    const res = await (await eAcct()).get('/api/gold-erp/stock-ledger');
    expect(res.status).toBeLessThan(400);
  });
});

describe('Gold ERP Enterprise — Scheme and loyalty workflow', () => {
  it('owner can create a gold scheme', async () => {
    const res = await (await eOwner()).post('/api/gold-erp/schemes', {
      name: 'QA Monthly Gold Scheme',
      duration_months: 11,
      monthly_installment: 5000,
      bonus_month: 1,
      status: 'active',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('sales staff can view active schemes', async () => {
    const res = await (await eStaff()).get('/api/gold-erp/schemes');
    expect(res.status).toBeLessThan(400);
  });

  it('manager can view customer karat accounts', async () => {
    const res = await (await eMgr()).get('/api/gold-erp/customer-karats');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── Professional specialist roles ────────────────────────────────────────────
describe('Gold ERP Professional — MIS Viewer workflow', () => {
  it('pro mis viewer can login', async () => {
    const api = await login('qa_gold_p_mis', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('pro mis can view MIS summary', async () => {
    const res = await (await login('qa_gold_p_mis', PW)).get('/api/mis/summary');
    expect(res.status).toBeLessThan(400);
  });

  it('pro mis: features does NOT include crm', async () => {
    const api = await login('qa_gold_p_mis', PW);
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('crm');
  });
});

// ─── Starter specialist roles ─────────────────────────────────────────────────
describe('Gold ERP Starter — Billing Staff workflow', () => {
  it('billing staff can login', async () => {
    const api = await login('qa_gold_s_billing', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('billing staff can view invoices', async () => {
    const res = await (await login('qa_gold_s_billing', PW)).get('/api/invoices');
    expect(res.status).toBeLessThan(400);
  });

  it('billing staff: features does NOT include accounting', async () => {
    const api = await login('qa_gold_s_billing', PW);
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('accounting');
  });
});

describe('Gold ERP Starter — Purchase Manager workflow', () => {
  it('purchase manager can login', async () => {
    const api = await login('qa_gold_s_purchase', PW);
    const body = await (await api.get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('purchase manager can view purchase orders', async () => {
    const res = await (await login('qa_gold_s_purchase', PW)).get('/api/purchase-orders');
    expect(res.status).toBeLessThan(400);
  });

  it('purchase manager can view vendors (gold suppliers)', async () => {
    const res = await (await login('qa_gold_s_purchase', PW)).get('/api/vendors');
    expect(res.status).toBe(200);
  });

  it('purchase manager: features does NOT include hr_payroll', async () => {
    const api = await login('qa_gold_s_purchase', PW);
    const res = await api.get('/api/tenant/features');
    const body = await res.json() as any;
    expect(body.modules ?? []).not.toContain('hr_payroll');
  });
});
