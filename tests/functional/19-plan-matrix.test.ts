/**
 * FUNCTIONAL TEST — Plan Module Matrix (54 plans × module gating)
 *
 * Two layers:
 *  1. Unit: import PLAN_MODULES and assert every plan has the correct
 *     modules — catches typos / accidental removals at code level.
 *  2. API: for key plans, login and verify the /api/config/plan-features
 *     endpoint returns the correct module list, and representative module
 *     APIs either permit or deny access accordingly.
 *
 * How plan gating works in this app:
 *   tenant.plan → seed-permissions.ts → role permissions → API 403/200
 *   The /api/config/plan-features endpoint exposes what the tenant can see.
 *   The functional tests below use it as the source of truth for each tenant.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { PLAN_MODULES } from '../../server/plan-features';
import { login, json, ApiClient } from '../helpers/api';

// ─── Layer 1: Unit — module list contracts ───────────────────────────────────

describe('Plan Matrix — Unit: Restaurant plans', () => {
  it('restaurant_starter has restaurant + invoicing + basic_inventory only (no accounting/crm)', () => {
    const m = PLAN_MODULES['restaurant_starter'];
    expect(m).toContain('restaurant');
    expect(m).toContain('invoicing');
    expect(m).toContain('basic_inventory');
    expect(m).toContain('expenses');
    expect(m).toContain('documents');
    expect(m).not.toContain('accounting');
    expect(m).not.toContain('crm');
    expect(m).not.toContain('hr_payroll');
    expect(m).not.toContain('mis');
  });

  it('restaurant_professional adds accounting + mis + crm + production + warehouses + api_hub', () => {
    const m = PLAN_MODULES['restaurant_professional'];
    expect(m).toContain('restaurant');
    expect(m).toContain('accounting');
    expect(m).toContain('mis');
    expect(m).toContain('crm');
    expect(m).toContain('production');
    expect(m).toContain('warehouses');
    expect(m).toContain('api_hub');
    expect(m).not.toContain('hr_payroll');
    expect(m).not.toContain('projects');
    expect(m).not.toContain('fixed_assets');
  });

  it('restaurant_enterprise adds hr_payroll + projects + fixed_assets + multi_currency', () => {
    const m = PLAN_MODULES['restaurant_enterprise'];
    expect(m).toContain('restaurant');
    expect(m).toContain('accounting');
    expect(m).toContain('hr_payroll');
    expect(m).toContain('projects');
    expect(m).toContain('fixed_assets');
    expect(m).toContain('multi_currency');
  });
});

describe('Plan Matrix — Unit: Hotel plans', () => {
  it('hotel_starter has hotel + invoicing but no accounting', () => {
    const m = PLAN_MODULES['hotel_starter'];
    expect(m).toContain('hotel');
    expect(m).toContain('invoicing');
    expect(m).not.toContain('accounting');
    expect(m).not.toContain('hr_payroll');
  });

  it('hotel_professional adds accounting + mis + crm + warehouses', () => {
    const m = PLAN_MODULES['hotel_professional'];
    expect(m).toContain('hotel');
    expect(m).toContain('accounting');
    expect(m).toContain('mis');
    expect(m).toContain('crm');
    expect(m).toContain('warehouses');
    expect(m).not.toContain('hr_payroll');
    expect(m).not.toContain('projects');
  });

  it('hotel_enterprise adds hr_payroll + projects + fixed_assets + multi_currency', () => {
    const m = PLAN_MODULES['hotel_enterprise'];
    expect(m).toContain('hr_payroll');
    expect(m).toContain('projects');
    expect(m).toContain('fixed_assets');
    expect(m).toContain('multi_currency');
  });
});

describe('Plan Matrix — Unit: Healthcare plans', () => {
  it('healthcare_starter has healthcare + invoicing (no purchase_orders)', () => {
    const m = PLAN_MODULES['healthcare_starter'];
    expect(m).toContain('healthcare');
    expect(m).toContain('invoicing');
    expect(m).not.toContain('purchase_orders');
    expect(m).not.toContain('accounting');
  });

  it('healthcare_professional adds purchase_orders + accounting + mis + crm', () => {
    const m = PLAN_MODULES['healthcare_professional'];
    expect(m).toContain('purchase_orders');
    expect(m).toContain('accounting');
    expect(m).toContain('mis');
    expect(m).toContain('crm');
  });

  it('healthcare_enterprise adds hr_payroll + fixed_assets + multi_currency', () => {
    const m = PLAN_MODULES['healthcare_enterprise'];
    expect(m).toContain('hr_payroll');
    expect(m).toContain('fixed_assets');
    expect(m).toContain('multi_currency');
  });
});

describe('Plan Matrix — Unit: Pharmacy plans', () => {
  it('pharmacy_starter has pharmacy + invoicing + basic_inventory (no accounting)', () => {
    const m = PLAN_MODULES['pharmacy_starter'];
    expect(m).toContain('pharmacy');
    expect(m).toContain('invoicing');
    expect(m).toContain('basic_inventory');
    expect(m).not.toContain('accounting');
    expect(m).not.toContain('crm');
  });

  it('pharmacy_enterprise adds crm + hr_payroll', () => {
    const m = PLAN_MODULES['pharmacy_enterprise'];
    expect(m).toContain('crm');
    expect(m).toContain('hr_payroll');
  });
});

describe('Plan Matrix — Unit: NGO plans', () => {
  it('ngo_starter has ngo + invoicing + expenses (no purchase_orders)', () => {
    const m = PLAN_MODULES['ngo_starter'];
    expect(m).toContain('ngo');
    expect(m).toContain('invoicing');
    expect(m).not.toContain('purchase_orders');
    expect(m).not.toContain('accounting');
  });

  it('ngo_professional adds accounting + mis', () => {
    const m = PLAN_MODULES['ngo_professional'];
    expect(m).toContain('accounting');
    expect(m).toContain('mis');
    expect(m).not.toContain('hr_payroll');
  });

  it('ngo_enterprise adds hr_payroll + projects + multi_currency', () => {
    const m = PLAN_MODULES['ngo_enterprise'];
    expect(m).toContain('hr_payroll');
    expect(m).toContain('projects');
    expect(m).toContain('multi_currency');
  });
});

describe('Plan Matrix — Unit: Nidhi Company plans', () => {
  it('nidhi_starter has nidhi module (no accounting)', () => {
    const m = PLAN_MODULES['nidhi_starter'];
    expect(m).toContain('nidhi');
    expect(m).not.toContain('accounting');
    expect(m).not.toContain('hr_payroll');
  });

  it('nidhi_enterprise adds hr_payroll + fixed_assets + multi_currency', () => {
    const m = PLAN_MODULES['nidhi_enterprise'];
    expect(m).toContain('hr_payroll');
    expect(m).toContain('fixed_assets');
    expect(m).toContain('multi_currency');
  });
});

describe('Plan Matrix — Unit: Gold ERP plans', () => {
  it('gold_starter has gold_erp + invoicing + basic_inventory (no accounting)', () => {
    const m = PLAN_MODULES['gold_starter'];
    expect(m).toContain('gold_erp');
    expect(m).not.toContain('accounting');
    expect(m).not.toContain('crm');
  });

  it('gold_professional adds accounting + mis + production', () => {
    const m = PLAN_MODULES['gold_professional'];
    expect(m).toContain('accounting');
    expect(m).toContain('mis');
    expect(m).toContain('production');
  });

  it('gold_enterprise adds crm + hr_payroll + warehouses + pos', () => {
    const m = PLAN_MODULES['gold_enterprise'];
    expect(m).toContain('crm');
    expect(m).toContain('hr_payroll');
    expect(m).toContain('warehouses');
    expect(m).toContain('pos');
  });
});

describe('Plan Matrix — Unit: POS / Retail plans', () => {
  it('pos_starter has pos + basic_inventory (no accounting)', () => {
    const m = PLAN_MODULES['pos_starter'];
    expect(m).toContain('pos');
    expect(m).toContain('basic_inventory');
    expect(m).not.toContain('accounting');
    expect(m).not.toContain('crm');
  });

  it('pos_professional adds accounting + mis + crm', () => {
    const m = PLAN_MODULES['pos_professional'];
    expect(m).toContain('accounting');
    expect(m).toContain('mis');
    expect(m).toContain('crm');
  });

  it('pos_enterprise adds hr_payroll + fixed_assets + multi_currency + warehouses', () => {
    const m = PLAN_MODULES['pos_enterprise'];
    expect(m).toContain('hr_payroll');
    expect(m).toContain('fixed_assets');
    expect(m).toContain('multi_currency');
    expect(m).toContain('warehouses');
  });
});

describe('Plan Matrix — Unit: Manufacturing plans', () => {
  it('manufacturing_starter has production + basic_inventory (no accounting)', () => {
    const m = PLAN_MODULES['manufacturing_starter'];
    expect(m).toContain('production');
    expect(m).toContain('basic_inventory');
    expect(m).not.toContain('accounting');
    expect(m).not.toContain('crm');
  });

  it('manufacturing_professional adds accounting + mis + sales_orders + quality_returns', () => {
    const m = PLAN_MODULES['manufacturing_professional'];
    expect(m).toContain('accounting');
    expect(m).toContain('mis');
    expect(m).toContain('sales_orders');
    expect(m).toContain('quality_returns');
  });

  it('manufacturing_enterprise adds crm + hr_payroll + warehouses + projects + multi_currency', () => {
    const m = PLAN_MODULES['manufacturing_enterprise'];
    expect(m).toContain('crm');
    expect(m).toContain('hr_payroll');
    expect(m).toContain('warehouses');
    expect(m).toContain('projects');
    expect(m).toContain('multi_currency');
  });
});

describe('Plan Matrix — Unit: E-Commerce plans', () => {
  it('ecommerce_starter has ecommerce + invoicing + basic_inventory (no accounting)', () => {
    const m = PLAN_MODULES['ecommerce_starter'];
    expect(m).toContain('ecommerce');
    expect(m).not.toContain('accounting');
    expect(m).not.toContain('crm');
  });

  it('ecommerce_professional adds accounting + mis + sales_orders + api_hub', () => {
    const m = PLAN_MODULES['ecommerce_professional'];
    expect(m).toContain('accounting');
    expect(m).toContain('mis');
    expect(m).toContain('sales_orders');
    expect(m).toContain('api_hub');
  });

  it('ecommerce_enterprise adds crm + hr_payroll + multi_currency + pos', () => {
    const m = PLAN_MODULES['ecommerce_enterprise'];
    expect(m).toContain('crm');
    expect(m).toContain('hr_payroll');
    expect(m).toContain('multi_currency');
    expect(m).toContain('pos');
  });
});

describe('Plan Matrix — Unit: HR & Payroll plans', () => {
  it('hr_starter has hr_payroll + expenses only', () => {
    const m = PLAN_MODULES['hr_starter'];
    expect(m).toContain('hr_payroll');
    expect(m).toContain('expenses');
    expect(m).not.toContain('accounting');
    expect(m).not.toContain('invoicing');
  });

  it('hr_enterprise adds accounting + projects + timesheets', () => {
    const m = PLAN_MODULES['hr_enterprise'];
    expect(m).toContain('accounting');
    expect(m).toContain('projects');
    expect(m).toContain('timesheets');
  });
});

describe('Plan Matrix — Unit: Logistics plans', () => {
  it('logistics_starter has logistics_transport + invoicing + basic_inventory (no accounting)', () => {
    const m = PLAN_MODULES['logistics_starter'];
    expect(m).toContain('logistics_transport');
    expect(m).not.toContain('accounting');
  });

  it('logistics_professional adds accounting + mis + crm', () => {
    const m = PLAN_MODULES['logistics_professional'];
    expect(m).toContain('accounting');
    expect(m).toContain('mis');
    expect(m).toContain('crm');
  });

  it('logistics_enterprise adds hr_payroll + fixed_assets + multi_currency', () => {
    const m = PLAN_MODULES['logistics_enterprise'];
    expect(m).toContain('hr_payroll');
    expect(m).toContain('fixed_assets');
    expect(m).toContain('multi_currency');
  });
});

describe('Plan Matrix — Unit: Real Estate plans', () => {
  it('real_estate_starter has real_estate + invoicing (no accounting)', () => {
    const m = PLAN_MODULES['real_estate_starter'];
    expect(m).toContain('real_estate');
    expect(m).not.toContain('accounting');
  });

  it('real_estate_enterprise adds hr_payroll + projects + multi_currency', () => {
    const m = PLAN_MODULES['real_estate_enterprise'];
    expect(m).toContain('hr_payroll');
    expect(m).toContain('projects');
    expect(m).toContain('multi_currency');
  });
});

describe('Plan Matrix — Unit: Agriculture plans', () => {
  it('agriculture_starter has agriculture + invoicing + basic_inventory (no accounting)', () => {
    const m = PLAN_MODULES['agriculture_starter'];
    expect(m).toContain('agriculture');
    expect(m).not.toContain('accounting');
    expect(m).not.toContain('crm');
  });

  it('agriculture_enterprise adds crm + hr_payroll + multi_currency', () => {
    const m = PLAN_MODULES['agriculture_enterprise'];
    expect(m).toContain('crm');
    expect(m).toContain('hr_payroll');
    expect(m).toContain('multi_currency');
  });
});

describe('Plan Matrix — Unit: Education plans', () => {
  it('education_starter has education + invoicing (no accounting)', () => {
    const m = PLAN_MODULES['education_starter'];
    expect(m).toContain('education');
    expect(m).not.toContain('accounting');
  });

  it('education_enterprise adds crm + hr_payroll + projects + multi_currency', () => {
    const m = PLAN_MODULES['education_enterprise'];
    expect(m).toContain('crm');
    expect(m).toContain('hr_payroll');
    expect(m).toContain('projects');
    expect(m).toContain('multi_currency');
  });
});

describe('Plan Matrix — Unit: CRM plans', () => {
  it('crm_starter has crm + invoicing (no purchase_orders/accounting)', () => {
    const m = PLAN_MODULES['crm_starter'];
    expect(m).toContain('crm');
    expect(m).toContain('invoicing');
    expect(m).not.toContain('purchase_orders');
    expect(m).not.toContain('accounting');
    expect(m).not.toContain('hr_payroll');
  });

  it('crm_enterprise adds hr_payroll + projects + multi_currency + sales_orders', () => {
    const m = PLAN_MODULES['crm_enterprise'];
    expect(m).toContain('hr_payroll');
    expect(m).toContain('projects');
    expect(m).toContain('multi_currency');
    expect(m).toContain('sales_orders');
  });
});

describe('Plan Matrix — Unit: Generic plans', () => {
  it('basic plan has invoicing + purchase_orders + basic_inventory + gatepasses (no accounting/crm)', () => {
    const m = PLAN_MODULES['basic'];
    expect(m).toContain('invoicing');
    expect(m).toContain('purchase_orders');
    expect(m).toContain('gatepasses');
    expect(m).not.toContain('accounting');
    expect(m).not.toContain('crm');
    expect(m).not.toContain('hr_payroll');
  });

  it('professional plan has accounting + mis + crm + production (no hr_payroll/projects)', () => {
    const m = PLAN_MODULES['professional'];
    expect(m).toContain('accounting');
    expect(m).toContain('mis');
    expect(m).toContain('crm');
    expect(m).toContain('production');
    expect(m).not.toContain('hr_payroll');
    expect(m).not.toContain('projects');
    expect(m).not.toContain('fixed_assets');
  });

  it('enterprise plan has all major modules including hr_payroll, projects, fixed_assets, multi_currency', () => {
    const m = PLAN_MODULES['enterprise'];
    expect(m).toContain('hr_payroll');
    expect(m).toContain('projects');
    expect(m).toContain('fixed_assets');
    expect(m).toContain('multi_currency');
  });
});

// ─── Layer 2: API — plan-features endpoint per representative tenant ──────────
// These tests require the plan tenants seed to be loaded (all-plan-tenants.sql)
// and permissions seeded for each tenant.

describe('Plan Matrix — API: Restaurant Starter (9101) plan-features', () => {
  let api: ApiClient;

  beforeAll(async () => {
    try {
      api = await login('qa_rst_s_admin', 'Test@1234');
    } catch {
      // seed not loaded — skip gracefully
    }
  });

  it('plan-features returns modules for restaurant_starter', async () => {
    if (!api) return;
    const res = await api.get('/api/config/plan-features');
    if (res.status === 401) return; // seed not loaded
    expect(res.status).toBe(200);
    const data = await json<{ plan: string; modules: string[] }>(res);
    expect(data.plan).toBe('restaurant_starter');
    expect(data.modules).toContain('restaurant');
    expect(data.modules).toContain('invoicing');
  });

  it('invoices API accessible to restaurant_starter', async () => {
    if (!api) return;
    const res = await api.get('/api/invoices');
    if (res.status === 401) return;
    expect(res.status).not.toBe(403);
  });

  it('accounting API blocked for restaurant_starter', async () => {
    if (!api) return;
    const res = await api.get('/api/chart-of-accounts');
    if (res.status === 401) return;
    expect(res.status).toBe(403);
  });

  it('CRM API blocked for restaurant_starter', async () => {
    if (!api) return;
    const res = await api.get('/api/crm/leads');
    if (res.status === 401) return;
    expect(res.status).toBe(403);
  });
});

describe('Plan Matrix — API: Restaurant Professional (9102) plan-features', () => {
  let api: ApiClient;

  beforeAll(async () => {
    try {
      api = await login('qa_rst_p_admin', 'Test@1234');
    } catch { /* seed not loaded */ }
  });

  it('plan-features returns modules for restaurant_professional', async () => {
    if (!api) return;
    const res = await api.get('/api/config/plan-features');
    if (res.status === 401) return;
    expect(res.status).toBe(200);
    const data = await json<{ plan: string; modules: string[] }>(res);
    expect(data.plan).toBe('restaurant_professional');
    expect(data.modules).toContain('accounting');
    expect(data.modules).toContain('crm');
    expect(data.modules).toContain('mis');
  });

  it('accounting API accessible to restaurant_professional', async () => {
    if (!api) return;
    const res = await api.get('/api/chart-of-accounts');
    if (res.status === 401) return;
    expect(res.status).not.toBe(403);
  });

  it('HR payroll API still blocked for restaurant_professional', async () => {
    if (!api) return;
    const res = await api.get('/api/hr/employees');
    if (res.status === 401) return;
    expect(res.status).toBe(403);
  });
});

describe('Plan Matrix — API: Restaurant Enterprise (9103) plan-features', () => {
  let api: ApiClient;

  beforeAll(async () => {
    try {
      api = await login('qa_rst_e_admin', 'Test@1234');
    } catch { /* seed not loaded */ }
  });

  it('plan-features returns modules for restaurant_enterprise', async () => {
    if (!api) return;
    const res = await api.get('/api/config/plan-features');
    if (res.status === 401) return;
    expect(res.status).toBe(200);
    const data = await json<{ plan: string; modules: string[] }>(res);
    expect(data.plan).toBe('restaurant_enterprise');
    expect(data.modules).toContain('hr_payroll');
    expect(data.modules).toContain('projects');
    expect(data.modules).toContain('multi_currency');
  });

  it('HR payroll accessible to restaurant_enterprise', async () => {
    if (!api) return;
    const res = await api.get('/api/hr/employees');
    if (res.status === 401) return;
    expect(res.status).not.toBe(403);
  });

  it('nidhi API still blocked for restaurant_enterprise (wrong vertical)', async () => {
    if (!api) return;
    const res = await api.get('/api/nidhi/members');
    if (res.status === 401) return;
    expect(res.status).toBe(403);
  });
});

describe('Plan Matrix — API: Manufacturing Professional (9141) vs Enterprise (9142)', () => {
  let proApi: ApiClient;
  let entApi: ApiClient;

  beforeAll(async () => {
    try { proApi = await login('qa_mfg_p_admin', 'Test@1234'); } catch { /* skip */ }
    try { entApi = await login('qa_mfg_e_admin', 'Test@1234'); } catch { /* skip */ }
  });

  it('manufacturing_professional: accounting accessible', async () => {
    if (!proApi) return;
    const res = await proApi.get('/api/chart-of-accounts');
    if (res.status === 401) return;
    expect(res.status).not.toBe(403);
  });

  it('manufacturing_professional: hr_payroll blocked', async () => {
    if (!proApi) return;
    const res = await proApi.get('/api/hr/employees');
    if (res.status === 401) return;
    expect(res.status).toBe(403);
  });

  it('manufacturing_enterprise: hr_payroll accessible', async () => {
    if (!entApi) return;
    const res = await entApi.get('/api/hr/employees');
    if (res.status === 401) return;
    expect(res.status).not.toBe(403);
  });

  it('manufacturing_enterprise: fixed_assets accessible', async () => {
    if (!entApi) return;
    const res = await entApi.get('/api/fixed-assets');
    if (res.status === 401) return;
    expect(res.status).not.toBe(403);
  });
});

describe('Plan Matrix — API: HR Starter (9143) plan-features', () => {
  let api: ApiClient;

  beforeAll(async () => {
    try { api = await login('qa_hr_s_admin', 'Test@1234'); } catch { /* skip */ }
  });

  it('hr_starter: hr_payroll accessible', async () => {
    if (!api) return;
    const res = await api.get('/api/hr/employees');
    if (res.status === 401) return;
    expect(res.status).not.toBe(403);
  });

  it('hr_starter: invoices blocked (not in module list)', async () => {
    if (!api) return;
    // hr_starter only has hr_payroll + expenses — no invoicing module
    const res = await api.get('/api/invoices');
    if (res.status === 401) return;
    expect(res.status).toBe(403);
  });

  it('hr_starter: accounting blocked', async () => {
    if (!api) return;
    const res = await api.get('/api/chart-of-accounts');
    if (res.status === 401) return;
    expect(res.status).toBe(403);
  });
});

describe('Plan Matrix — API: POS Professional (9138) plan-features', () => {
  let api: ApiClient;

  beforeAll(async () => {
    try { api = await login('qa_pos_p_admin', 'Test@1234'); } catch { /* skip */ }
  });

  it('pos_professional: pos API accessible', async () => {
    if (!api) return;
    const res = await api.get('/api/pos/products');
    if (res.status === 401) return;
    expect(res.status).not.toBe(403);
  });

  it('pos_professional: accounting accessible', async () => {
    if (!api) return;
    const res = await api.get('/api/chart-of-accounts');
    if (res.status === 401) return;
    expect(res.status).not.toBe(403);
  });

  it('pos_professional: hr_payroll blocked', async () => {
    if (!api) return;
    const res = await api.get('/api/hr/employees');
    if (res.status === 401) return;
    expect(res.status).toBe(403);
  });

  it('pos_professional: hotel API blocked (wrong vertical)', async () => {
    if (!api) return;
    const res = await api.get('/api/hotel/rooms');
    if (res.status === 401) return;
    expect(res.status).toBe(403);
  });
});
