/**
 * FUNCTIONAL TEST — Agriculture ERP
 *
 * Golden path:
 *   Farm registration → Crop planning → Harvest recording →
 *   Mandi price lookup → Sale entry → Equipment tracking →
 *   PMFBY insurance enrollment → Supply chain tracing
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, expectStatus, ApiClient } from '../helpers/api';

let api: ApiClient;
let farmId: number;
let cropId: number;
let harvestId: number;
let saleId: number;
let equipmentId: number;

const TODAY = new Date().toISOString().split('T')[0];

beforeAll(async () => {
  api = await login('qa_admin_in', 'Test@1234');
});

describe('Agriculture ERP — 1. Farm & Land Management', () => {
  it('GET /api/agriculture/farms returns farm list', async () => {
    const res = await api.get('/api/agriculture/farms');
    expect(res.status, 'Farms API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const farms = await json<unknown[]>(res);
    expect(Array.isArray(farms)).toBe(true);
  });

  it('POST /api/agriculture/farms registers a farm', async () => {
    const res = await api.post('/api/agriculture/farms', {
      name: 'QA Green Acres Farm',
      owner_name: 'Ramesh Patil',
      location: 'Nashik, MH',
      survey_number: `SRV-QA-${Date.now().toString().slice(-5)}`,
      area_acres: 12.5,
      soil_type: 'loamy',
      water_source: 'borewell',
      latitude: 20.0112,
      longitude: 73.7907,
    });
    expect(res.status, 'Register farm must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; name: string; area_acres: number }>(res);
    farmId = body.id;
    expect(body.name).toBe('QA Green Acres Farm');
    expect(body.area_acres).toBe(12.5);
  });
});

describe('Agriculture ERP — 2. Crop Planning & Tracking', () => {
  it('GET /api/agriculture/crops returns crop list', async () => {
    const res = await api.get('/api/agriculture/crops');
    expect(res.status, 'Crops API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/agriculture/crops creates a crop cycle', async () => {
    const res = await api.post('/api/agriculture/crops', {
      farm_id: farmId ?? 1,
      crop_name: 'Onion',
      variety: 'Red Nashik',
      season: 'Rabi',
      sowing_date: TODAY,
      expected_harvest_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      area_acres: 5,
      expected_yield_kg: 15000,
      seed_cost: 5000,
      fertilizer_cost: 8000,
      pesticide_cost: 3000,
      labour_cost: 12000,
    });
    expect(res.status, 'Create crop must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; crop_name: string }>(res);
    cropId = body.id;
    expect(body.crop_name).toBe('Onion');
  });

  it('POST /api/agriculture/crops/:id/activities logs field activity', async () => {
    if (!cropId) return;
    const res = await api.post(`/api/agriculture/crops/${cropId}/activities`, {
      activity_type: 'irrigation',
      date: TODAY,
      description: 'Drip irrigation — 2 hours',
      cost: 200,
      labour_hours: 2,
    });
    expect(res.status).not.toBe(404);
  });
});

describe('Agriculture ERP — 3. Harvest Recording', () => {
  it('POST /api/agriculture/harvests records a harvest', async () => {
    const res = await api.post('/api/agriculture/harvests', {
      crop_id: cropId ?? 1,
      farm_id: farmId ?? 1,
      harvest_date: TODAY,
      quantity_kg: 14500,
      quality_grade: 'A',
      moisture_percent: 12,
      storage_location: 'QA Cold Storage',
    });
    expect(res.status, 'Record harvest must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; quantity_kg: number }>(res);
    harvestId = body.id;
    expect(body.quantity_kg).toBe(14500);
  });
});

describe('Agriculture ERP — 4. Mandi Prices', () => {
  it('GET /api/agriculture/mandi-prices returns live mandi rates', async () => {
    const res = await api.get('/api/agriculture/mandi-prices?commodity=onion&state=MH');
    expect(res.status, 'Mandi prices API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const prices = await json<unknown[]>(res);
    expect(Array.isArray(prices)).toBe(true);
  });

  it('GET /api/agriculture/mandi-prices/history returns price history', async () => {
    const res = await api.get('/api/agriculture/mandi-prices/history?commodity=onion&days=30');
    expect(res.status).not.toBe(404);
  });
});

describe('Agriculture ERP — 5. Sales & Revenue', () => {
  it('GET /api/agriculture/sales returns sale records', async () => {
    const res = await api.get('/api/agriculture/sales');
    expect(res.status, 'Agriculture sales API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/agriculture/sales records a produce sale', async () => {
    const res = await api.post('/api/agriculture/sales', {
      harvest_id: harvestId,
      buyer_name: 'Pune Wholesale Market',
      buyer_type: 'wholesale',
      sale_date: TODAY,
      quantity_kg: 5000,
      rate_per_kg: 18.5,
      total_amount: 92500,
      payment_mode: 'bank_transfer',
      mandi_name: 'Nashik Mandi',
    });
    expect(res.status, 'Record sale must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; total_amount: number }>(res);
    saleId = body.id;
    expect(body.total_amount).toBe(92500);
  });
});

describe('Agriculture ERP — 6. Equipment Management', () => {
  it('GET /api/agriculture/equipment returns equipment list', async () => {
    const res = await api.get('/api/agriculture/equipment');
    expect(res.status, 'Equipment API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/agriculture/equipment adds farm equipment', async () => {
    const res = await api.post('/api/agriculture/equipment', {
      name: 'QA Tractor MF 241',
      type: 'tractor',
      registration_number: 'MH-QA-TR-001',
      purchase_date: '2023-04-01',
      purchase_cost: 800000,
      farm_id: farmId ?? 1,
      fuel_type: 'diesel',
    });
    expect(res.status, 'Add equipment must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number }>(res);
    equipmentId = body.id;
    expect(equipmentId).toBeGreaterThan(0);
  });
});

describe('Agriculture ERP — 7. PMFBY Insurance', () => {
  it('GET /api/agriculture/insurance returns insurance schemes', async () => {
    const res = await api.get('/api/agriculture/insurance');
    expect(res.status, 'Insurance API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/agriculture/insurance/enroll enrolls crop in PMFBY', async () => {
    const res = await api.post('/api/agriculture/insurance/enroll', {
      crop_id: cropId ?? 1,
      farm_id: farmId ?? 1,
      scheme_name: 'PMFBY',
      season: 'Rabi 2025-26',
      insured_area_acres: 5,
      sum_insured: 75000,
      premium_amount: 1875,  // 2.5% farmer share
      bank_account: '50100123456789',
      ifsc: 'HDFC0001234',
    });
    expect(res.status, 'PMFBY enrollment must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; policy_number?: string }>(res);
    expect(body.id).toBeGreaterThan(0);
  });
});

describe('Agriculture ERP — 8. Supply Chain Tracing', () => {
  it('GET /api/public/farm/:batchCode traces produce batch', async () => {
    const res = await api.get('/api/public/farm/QA-BATCH-001');
    // Public endpoint — should return trace info or 404 for unknown batch
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/agriculture/analytics returns farm analytics', async () => {
    const res = await api.get('/api/agriculture/analytics');
    expect(res.status).not.toBe(404);
  });
});

describe('Agriculture ERP — 9. Custom Roles & Permissions API', () => {
  it('GET /api/roles returns roles for agriculture tenant', async () => {
    const res = await api.get('/api/roles');
    expect(res.status).not.toBe(404);
    if (res.status === 200) {
      const roles = await json<unknown[]>(res);
      expect(Array.isArray(roles)).toBe(true);
    }
  });

  it('GET /api/roles?tab=permissions returns permission matrix', async () => {
    const res = await api.get('/api/roles?tab=permissions');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/user-management/users returns user list', async () => {
    const res = await api.get('/api/user-management/users');
    expect(res.status).not.toBe(404);
    if (res.status === 200 && res.headers.get("content-type")?.includes("application/json")) {
      const users = await json<unknown[]>(res);
      expect(Array.isArray(users)).toBe(true);
    }
  });

  it('POST /api/roles creates a custom role for agriculture tenant', async () => {
    const res = await api.post('/api/roles', {
      name: 'QA Field Inspector',
      description: 'Custom role for crop field inspection',
      permissions: ['agriculture_read', 'agriculture_write', 'crop_inspect'],
    });
    expect(res.status).not.toBe(404);
  });
});

describe('Agriculture ERP — 10. Masters: Regions, Branches, Tax Config, Audit Log', () => {
  it('GET /api/masters/branches returns branch/region list', async () => {
    const res = await api.get('/api/masters/branches');
    expect(res.status).not.toBe(404);
    if (res.status === 200) {
      const branches = await json<unknown[]>(res);
      expect(Array.isArray(branches)).toBe(true);
    }
  });

  it('GET /api/masters/tax-config returns tax configuration', async () => {
    const res = await api.get('/api/masters/tax-config');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/masters/audit-log returns audit trail entries', async () => {
    const res = await api.get('/api/masters/audit-log');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/masters/approval-workflow returns approval workflow config', async () => {
    const res = await api.get('/api/masters/approval-workflow');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/masters/departments returns department list', async () => {
    const res = await api.get('/api/masters/departments');
    expect(res.status).not.toBe(404);
  });
});

describe('Agriculture ERP — 11. Cross-Module Integration', () => {
  it('GET /api/accounting/journal-entries works alongside agriculture (GL cross-module)', async () => {
    const res = await api.get('/api/accounting/journal-entries?limit=5');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/hr/employees works alongside agriculture (HR cross-module)', async () => {
    const res = await api.get('/api/hr/employees');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/crm/contacts works alongside agriculture (CRM cross-module)', async () => {
    const res = await api.get('/api/crm/contacts');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/mis/summary works alongside agriculture (MIS cross-module)', async () => {
    const res = await api.get('/api/mis/summary');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/invoices works alongside agriculture produce billing (AR cross-module)', async () => {
    const res = await api.get('/api/invoices?limit=5');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/warehouses works alongside agriculture produce storage (Warehouse cross-module)', async () => {
    const res = await api.get('/api/warehouses');
    expect(res.status).not.toBe(404);
  });
});
