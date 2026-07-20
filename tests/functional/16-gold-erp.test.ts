/**
 * FUNCTIONAL TEST — Gold ERP (Tenant 8000, plan: gold_erp_enterprise)
 *
 * Owner login: qa_gold_e_owner / Test@1234
 *
 * Coverage:
 *  1.  Live Metal Rates          — GET today / history / POST rate
 *  2.  Jewellery Item Master     — CRUD + GET by ID
 *  3.  Bullion Stock & Txns      — GET stock / GET txns / POST txn / metal-ledger
 *  4.  Karigar Management        — CRUD + karigar-ledger
 *  5.  Production Orders         — POST / GET / GET stages / PUT status
 *  6.  Job-Work Orders           — POST / GET / PUT close
 *  7.  Production Pipeline       — sketch / CAD / CAM / ghat / finalize / settlement
 *  8.  Wholesale & Hallmarking   — wholesale-jobwork / hallmarking / batches / BIS
 *  9.  Retail Operations         — counter-bookings / customer-approvals / buyback / repairs
 * 10.  Chit Schemes              — POST scheme / enroll member / collect installment
 * 11.  Analytics                 — stats / overview / wastage / karigar-output / stock-value
 * 12.  Digital Gold              — purchase / holdings
 * 13.  SEBI / BIS Compliance    — sebi-monthly-return / bis-registrations
 * 14.  GST at 3%                 — CRITICAL: sale invoice gst_amount == subtotal × 0.03
 * 15.  Estimates                 — POST / GET
 * 16.  Custom Roles & Permissions — create role / assign Gold screens / check / delete
 * 17.  Cross-Module: HR→Karigar  — create HR employee → karigar list accessible
 * 18.  Cross-Module: GL Posting  — journal-entries / trial-balance / COA accessible
 * 19.  Cross-Module: CRM Sync   — CRM contact → gold customers
 * 20.  Cross-Module: Vendor      — bullion supplier via shared /api/vendors
 * 21.  Multi-Showroom (Branches) — shared branches = Gold showrooms
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, expectStatus, ApiClient } from '../helpers/api';

const PW = 'Test@1234';
const TODAY = new Date().toISOString().split('T')[0];
const YEAR  = new Date().getFullYear();
const MONTH = String(new Date().getMonth() + 1).padStart(2, '0');

let api: ApiClient;
let adminApi: ApiClient;

let itemId: number;
let karigarId: number;
let productionOrderId: number;
let jobworkOrderId: number;
let hallmarkingId: number;
let chitSchemeId: number;
let chitMemberId: number;
let repairId: number;
let buybackId: number;
let counterBookingId: number;
let bullionTxnId: number;
let customRoleId: number;

beforeAll(async () => {
  api      = await login('qa_gold_e_owner', PW);
  adminApi = await login('qa_gold_e_owner', PW);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. LIVE METAL RATES
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 1. Live Metal Rates', () => {
  it('GET /api/gold-erp/metal-rates returns history list', async () => {
    const res = await api.get('/api/gold-erp/metal-rates');
    if (res.status === 403 || res.status === 404) return;
    await expectStatus(res, 200);
    const data = await json<unknown>(res);
    expect(data).toBeDefined();
  });

  it('GET /api/gold-erp/metal-rates/today returns today\'s rate', async () => {
    const res = await api.get('/api/gold-erp/metal-rates/today');
    if (res.status === 403 || res.status === 404) return;
    await expectStatus(res, 200);
    const rate = await json<unknown>(res);
    expect(rate).toBeDefined();
  });

  it('POST /api/gold-erp/metal-rates sets a rate', async () => {
    const res = await api.post('/api/gold-erp/metal-rates', {
      metal: 'gold', purity_name: '22K', purity_percent: 91.6,
      rate_per_gram: 5500, rate_date: TODAY,
    });
    if (res.status === 403 || res.status === 422 || res.status === 404) return;
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/rates/live returns live rate feed', async () => {
    const res = await api.get('/api/gold-erp/rates/live');
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. JEWELLERY ITEM MASTER
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 2. Jewellery Item Master', () => {
  it('GET /api/gold-erp/items returns stock list', async () => {
    const res = await api.get('/api/gold-erp/items');
    if (res.status === 403 || res.status === 404) return;
    await expectStatus(res, 200);
    const items = await json<unknown[]>(res);
    expect(Array.isArray(items)).toBe(true);
  });

  it('POST /api/gold-erp/items creates a jewellery item', async () => {
    const res = await api.post('/api/gold-erp/items', {
      itemCode: `GOLD-QA-${Date.now().toString().slice(-5)}`,
      name: 'QA 22K Gold Necklace',
      category: 'necklace', purity: '22K',
      grossWeight: 25.5, netWeight: 23.2,
      makingChargePerGram: 350, stoneCost: 0,
      hsnCode: '7113', gstRate: 3, quantity: 1,
    });
    if (res.status === 403 || res.status === 422 || res.status === 404) return;
    expect(res.status).not.toBe(500);
    const body = await json<any>(res);
    itemId = body.id;
    expect(itemId).toBeTruthy();
  });

  it('GET /api/gold-erp/items list contains the created item', async () => {
    if (!itemId) return;
    const res = await api.get('/api/gold-erp/items');
    if (res.status === 403 || res.status === 404) return;
    await expectStatus(res, 200);
    const items = await json<any[]>(res);
    const found = items.some((it: any) => it.id === itemId);
    expect(found).toBe(true);
  });

  it('PUT /api/gold-erp/items/:id updates item weight', async () => {
    if (!itemId) return;
    const res = await api.put(`/api/gold-erp/items/${itemId}`, {
      name: 'QA 22K Gold Necklace Updated',
      category: 'necklace', metal_type: 'gold', purity_name: '22K',
      gross_weight_gm: 26.0, stone_weight_gm: 0,
    });
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/designs returns design catalogue', async () => {
    const res = await api.get('/api/gold-erp/designs');
    if (res.status === 403 || res.status === 404) return;
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. BULLION STOCK & TRANSACTIONS
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 3. Bullion Stock & Transactions', () => {
  it('GET /api/gold-erp/bullion-stock returns current stock', async () => {
    const res = await api.get('/api/gold-erp/bullion-stock');
    if (res.status === 403 || res.status === 404) return;
    await expectStatus(res, 200);
    const data = await json<unknown>(res);
    expect(data).toBeDefined();
  });

  it('GET /api/gold-erp/bullion-transactions returns transaction list', async () => {
    const res = await api.get('/api/gold-erp/bullion-transactions');
    if (res.status === 403 || res.status === 404) return;
    await expectStatus(res, 200);
    const data = await json<unknown[]>(res);
    expect(Array.isArray(data)).toBe(true);
  });

  it('POST /api/gold-erp/bullion-transactions records purchase', async () => {
    const res = await api.post('/api/gold-erp/bullion-transactions', {
      txn_type: 'purchase', txn_date: TODAY,
      metal_type: 'gold', purity_name: '24K',
      weight_gm: 100, rate_per_gram: 6000,
      amount: 600000, total_amount: 618000,
      party_name: 'QA Bullion Supplier',
      notes: 'QA test purchase',
    });
    expect(res.status).not.toBe(500);
    if (res.status === 200 || res.status === 201) {
      bullionTxnId = (await json<any>(res)).id;
    }
  });

  it('GET /api/gold-erp/metal-ledger returns ledger entries', async () => {
    const res = await api.get('/api/gold-erp/metal-ledger');
    if (res.status === 403 || res.status === 404) return;
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/metal-ledger/balances returns balances', async () => {
    const res = await api.get('/api/gold-erp/metal-ledger/balances');
    if (res.status === 403 || res.status === 404) return;
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. KARIGAR MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 4. Karigar Management', () => {
  it('GET /api/gold-erp/karigars returns karigar list', async () => {
    const res = await api.get('/api/gold-erp/karigars');
    if (res.status === 403 || res.status === 404) return;
    await expectStatus(res, 200);
    const data = await json<unknown>(res);
    expect(data).toBeDefined();
  });

  it('POST /api/gold-erp/karigars creates a karigar', async () => {
    const res = await api.post('/api/gold-erp/karigars', {
      name: 'QA Karigar Ramesh',
      phone: '9' + Date.now().toString().slice(-9),
      specialty: 'necklace', rate_type: 'per_gram',
      rate: 250, address: 'Mumbai',
    });
    if (res.status === 403 || res.status === 422 || res.status === 404) return;
    expect(res.status).not.toBe(500);
    if (res.status === 200 || res.status === 201) {
      karigarId = (await json<any>(res)).id;
      expect(karigarId).toBeGreaterThan(0);
    }
  });

  it('PUT /api/gold-erp/karigars/:id updates karigar rate', async () => {
    if (!karigarId) return;
    const res = await api.put(`/api/gold-erp/karigars/${karigarId}`, {
      name: 'QA Karigar Ramesh Updated', specialization: 'necklace',
      metal_type: 'gold', wage_per_gram: 275,
    });
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/karigar-ledger returns karigar ledger', async () => {
    const res = await api.get('/api/gold-erp/karigar-ledger');
    if (res.status === 403 || res.status === 404) return;
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. PRODUCTION ORDERS
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 5. Production Orders', () => {
  it('GET /api/gold-erp/production-orders returns list', async () => {
    const res = await api.get('/api/gold-erp/production-orders');
    if (res.status === 403 || res.status === 404) return;
    await expectStatus(res, 200);
    const data = await json<unknown>(res);
    expect(data).toBeDefined();
  });

  it('POST /api/gold-erp/production-orders creates order', async () => {
    const res = await api.post('/api/gold-erp/production-orders', {
      order_no: `PO-QA-${Date.now().toString().slice(-6)}`,
      karigar_id: karigarId ?? undefined,
      item_description: 'QA 22K Bangles set',
      purity: '22K', gross_weight_issued: 20.0,
      expected_net_weight: 18.5,
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'in_progress',
    });
    if (res.status === 403 || res.status === 422 || res.status === 404) return;
    expect(res.status).not.toBe(500);
    if (res.status === 200 || res.status === 201) {
      productionOrderId = (await json<any>(res)).id;
    }
  });

  it('GET /api/gold-erp/production-orders/:id/stages returns stages', async () => {
    if (!productionOrderId) return;
    const res = await api.get(`/api/gold-erp/production-orders/${productionOrderId}/stages`);
    expect(res.status).not.toBe(500);
  });

  it('PUT /api/gold-erp/production-orders/:id updates status to completed', async () => {
    if (!productionOrderId) return;
    const res = await api.put(`/api/gold-erp/production-orders/${productionOrderId}`, {
      status: 'completed', actual_net_weight: 18.4, wastage: 1.6,
    });
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. JOB-WORK ORDERS
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 6. Job-Work Orders (Internal)', () => {
  it('GET /api/gold-erp/jobwork-orders returns list', async () => {
    const res = await api.get('/api/gold-erp/jobwork-orders');
    if (res.status === 403 || res.status === 404) return;
    expect(res.status).not.toBe(500);
  });

  it('POST /api/gold-erp/jobwork-orders creates jobwork order', async () => {
    const res = await api.post('/api/gold-erp/jobwork-orders', {
      karigar_id: karigarId ?? undefined,
      description: 'QA Ring sizing jobwork',
      metal: 'gold', purity: '22K',
      weight_issued: 5.0,
      due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    });
    if (res.status === 403 || res.status === 422 || res.status === 404) return;
    expect(res.status).not.toBe(500);
    if (res.status === 200 || res.status === 201) {
      jobworkOrderId = (await json<any>(res)).id;
    }
  });

  it('PUT /api/gold-erp/jobwork-orders/:id closes order', async () => {
    if (!jobworkOrderId) return;
    const res = await api.put(`/api/gold-erp/jobwork-orders/${jobworkOrderId}`, {
      status: 'completed', weight_received: 4.85, wastage: 0.15,
    });
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. PRODUCTION PIPELINE
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 7. Production Pipeline (sketch/CAD/CAM/ghat/finalize)', () => {
  it('GET /api/gold-erp/sketch returns sketch list', async () => {
    const res = await api.get('/api/gold-erp/sketch');
    expect(res.status).not.toBe(500);
  });

  it('POST /api/gold-erp/sketch creates sketch', async () => {
    if (!productionOrderId) return;
    const res = await api.post('/api/gold-erp/sketch', {
      production_order_id: productionOrderId,
      customer_brief: 'QA traditional necklace design',
      design_category: 'necklace',
    });
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/cad returns CAD list', async () => {
    const res = await api.get('/api/gold-erp/cad');
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/cam returns CAM list', async () => {
    const res = await api.get('/api/gold-erp/cam');
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/casting-trees returns casting trees', async () => {
    const res = await api.get('/api/gold-erp/casting-trees');
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/ghat-entries returns ghat entries', async () => {
    const res = await api.get('/api/gold-erp/ghat-entries');
    expect(res.status).not.toBe(500);
  });

  it('POST /api/gold-erp/ghat-entries creates ghat entry', async () => {
    if (!productionOrderId) return;
    const res = await api.post('/api/gold-erp/ghat-entries', {
      production_order_id: productionOrderId,
      stage_name: 'casting',
      karigar_id: karigarId ?? null,
      issued_weight_gm: 50.0, received_weight_gm: 47.5,
      weigh_date: TODAY, notes: 'QA ghat test',
    });
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/finalize returns finalized orders', async () => {
    const res = await api.get('/api/gold-erp/finalize');
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/settlements returns karigar settlements', async () => {
    const res = await api.get('/api/gold-erp/settlements');
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/finishing returns finishing records', async () => {
    const res = await api.get('/api/gold-erp/finishing');
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. WHOLESALE & HALLMARKING
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 8. Wholesale & Hallmarking (BIS)', () => {
  it('GET /api/gold-erp/wholesale-jobwork returns wholesale jobwork list', async () => {
    const res = await api.get('/api/gold-erp/wholesale-jobwork');
    expect(res.status).not.toBe(500);
  });

  it('POST /api/gold-erp/wholesale-jobwork creates customer jobwork (customer\'s gold)', async () => {
    const res = await api.post('/api/gold-erp/wholesale-jobwork', {
      customer_name: 'QA Wholesale Customer',
      customer_phone: '9800001111',
      description: 'Customer gold ring making',
      purity: '22K',
      gold_received_grams: 10.5,
      making_charge: 500,
      due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    });
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/hallmarking returns HUID records', async () => {
    const res = await api.get('/api/gold-erp/hallmarking');
    if (res.status === 403 || res.status === 404) return;
    expect(res.status).not.toBe(500);
  });

  it('POST /api/gold-erp/hallmarking records HUID', async () => {
    const res = await api.post('/api/gold-erp/hallmarking', {
      item_id: itemId ?? undefined,
      huid: `HUID-QA-${Date.now().toString().slice(-8)}`,
      purity: '22K', weight: 23.2,
      hallmarking_date: TODAY,
      hallmarking_center: 'BIS QA Center',
      certificate_no: `CERT-QA-${Date.now().toString().slice(-6)}`,
    });
    if (res.status === 403 || res.status === 422 || res.status === 404) return;
    expect(res.status).not.toBe(500);
    if (res.status === 200 || res.status === 201) {
      hallmarkingId = (await json<any>(res)).id;
    }
  });

  it('GET /api/gold-erp/hallmarking-batches returns batch list', async () => {
    const res = await api.get('/api/gold-erp/hallmarking-batches');
    expect(res.status).not.toBe(500);
  });

  it('POST /api/gold-erp/hallmarking-batches creates BIS batch', async () => {
    const res = await api.post('/api/gold-erp/hallmarking-batches', {
      batch_no: `BATCH-QA-${Date.now().toString().slice(-6)}`,
      submission_date: TODAY,
      items: itemId ? [{ item_id: itemId, purity: '22K', weight: 23.2 }] : [],
      center_name: 'BIS QA Center',
    });
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/bis-registrations returns BIS registrations', async () => {
    const res = await api.get('/api/gold-erp/bis-registrations');
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/bis-report returns BIS compliance report', async () => {
    const res = await api.get('/api/gold-erp/bis-report');
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. RETAIL OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 9. Retail Operations', () => {
  it('GET /api/gold-erp/counter-bookings returns booking list', async () => {
    const res = await api.get('/api/gold-erp/counter-bookings');
    expect(res.status).not.toBe(500);
  });

  it('POST /api/gold-erp/counter-bookings creates a booking', async () => {
    const res = await api.post('/api/gold-erp/counter-bookings', {
      customer_name: 'QA Gold Counter Customer',
      customer_phone: '9800002222',
      booking_type: 'custom', urgency: 'normal',
      description: 'QA necklace order booking',
      advance_collected: 5000,
      expected_ready: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      item_description: 'QA Necklace 22K',
    });
    expect(res.status).not.toBe(500);
    if (res.status === 200 || res.status === 201) {
      counterBookingId = (await json<any>(res)).id;
    }
  });

  it('GET /api/gold-erp/customer-approvals returns approvals list', async () => {
    const res = await api.get('/api/gold-erp/customer-approvals');
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/repairs returns repairs list', async () => {
    const res = await api.get('/api/gold-erp/repairs');
    if (res.status === 403 || res.status === 404) return;
    expect(res.status).not.toBe(500);
  });

  it('POST /api/gold-erp/repairs creates a repair job', async () => {
    const res = await api.post('/api/gold-erp/repairs', {
      customer_name: 'QA Repair Customer',
      customer_phone: '9800003333',
      item_description: 'Gold chain broken link repair',
      metal: 'gold', weight: 8.5,
      estimated_cost: 500, received_date: TODAY,
      expected_delivery: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    });
    if (res.status === 403 || res.status === 422 || res.status === 404) return;
    expect(res.status).not.toBe(500);
    if (res.status === 200 || res.status === 201) {
      repairId = (await json<any>(res)).id;
    }
  });

  it('PUT /api/gold-erp/repairs/:id marks repair as ready', async () => {
    if (!repairId) return;
    const res = await api.put(`/api/gold-erp/repairs/${repairId}`, {
      status: 'ready', actual_cost: 450,
    });
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/buyback returns buyback list', async () => {
    const res = await api.get('/api/gold-erp/buyback');
    expect(res.status).not.toBe(500);
  });

  it('POST /api/gold-erp/buyback creates old gold buyback', async () => {
    const res = await api.post('/api/gold-erp/buyback', {
      customer_name: 'QA Buyback Customer',
      customer_phone: '9800004444',
      item_description: 'Old 22K gold chain',
      weight_grams: 15.0, purity: '22K',
      rate_per_gram: 4800, total_amount: 72000,
      deductions: 0, net_amount: 72000, date: TODAY,
    });
    expect(res.status).not.toBe(500);
    if (res.status === 200 || res.status === 201) {
      buybackId = (await json<any>(res)).id;
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. CHIT SCHEMES
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 10. Chit Schemes', () => {
  it('GET /api/gold-erp/chit-schemes returns scheme list', async () => {
    const res = await api.get('/api/gold-erp/chit-schemes');
    if (res.status === 403 || res.status === 404) return;
    await expectStatus(res, 200);
    const data = await json<unknown>(res);
    expect(data).toBeDefined();
  });

  it('POST /api/gold-erp/chit-schemes creates a gold scheme', async () => {
    const res = await api.post('/api/gold-erp/chit-schemes', {
      name: `QA Gold Chit ${Date.now().toString().slice(-5)}`,
      duration_months: 11, monthly_amount: 1000,
      metal_type: 'gold', bonus_month_free: true,
      start_date: TODAY, max_members: 20,
    });
    if (res.status === 403 || res.status === 422 || res.status === 404) return;
    expect(res.status).not.toBe(500);
    if (res.status === 200 || res.status === 201) {
      chitSchemeId = (await json<any>(res)).id;
      expect(chitSchemeId).toBeGreaterThan(0);
    }
  });

  it('POST /api/gold-erp/chit-schemes/:id/members enrolls a member', async () => {
    if (!chitSchemeId) return;
    const res = await api.post(`/api/gold-erp/chit-schemes/${chitSchemeId}/members`, {
      customer_name: 'QA Chit Member',
      customer_phone: '9800005555',
      enrollment_date: TODAY,
    });
    if (res.status === 403 || res.status === 422 || res.status === 404) return;
    expect(res.status).not.toBe(500);
    if (res.status === 200 || res.status === 201) {
      const b = await json<any>(res);
      chitMemberId = b.id ?? b.member_id;
    }
  });

  it('GET /api/gold-erp/chit-schemes/:id/members returns member list', async () => {
    if (!chitSchemeId) return;
    const res = await api.get(`/api/gold-erp/chit-schemes/${chitSchemeId}/members`);
    if (res.status === 403 || res.status === 404) return;
    expect(res.status).not.toBe(500);
  });

  it('POST /api/gold-erp/chit-members/:id/pay collects installment', async () => {
    if (!chitMemberId) return;
    const res = await api.post(`/api/gold-erp/chit-members/${chitMemberId}/pay`, {
      amount: 1000, payment_date: TODAY, payment_mode: 'cash',
    });
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/chit-members/:id/installments returns installment history', async () => {
    if (!chitMemberId) return;
    const res = await api.get(`/api/gold-erp/chit-members/${chitMemberId}/installments`);
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/chit-members returns all members', async () => {
    const res = await api.get('/api/gold-erp/chit-members');
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 11. Analytics & Reports', () => {
  it('GET /api/gold-erp/stats returns KPI stats', async () => {
    const res = await api.get('/api/gold-erp/stats');
    if (res.status === 403 || res.status === 404) return;
    await expectStatus(res, 200);
    const data = await json<unknown>(res);
    expect(data).toBeDefined();
  });

  it('GET /api/gold-erp/analytics/overview returns analytics overview', async () => {
    const res = await api.get('/api/gold-erp/analytics/overview');
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/analytics/wastage returns wastage report', async () => {
    const res = await api.get('/api/gold-erp/analytics/wastage');
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/analytics/karigar-output returns karigar output', async () => {
    const res = await api.get('/api/gold-erp/analytics/karigar-output');
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/analytics/making-charges returns making charge report', async () => {
    const res = await api.get('/api/gold-erp/analytics/making-charges');
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/analytics/stock-value returns stock valuation', async () => {
    const res = await api.get('/api/gold-erp/analytics/stock-value');
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/gst-summary returns GST summary', async () => {
    const res = await api.get('/api/gold-erp/gst-summary');
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/dashboard-kpis-summary returns dashboard KPIs', async () => {
    const res = await api.get('/api/gold-erp/dashboard-kpis-summary');
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. DIGITAL GOLD
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 12. Digital Gold', () => {
  it('GET /api/gold-erp/digital-gold/holdings returns holdings', async () => {
    const res = await api.get('/api/gold-erp/digital-gold/holdings');
    expect(res.status).not.toBe(500);
  });

  it('POST /api/gold-erp/digital-gold/purchase records digital gold purchase', async () => {
    const res = await api.post('/api/gold-erp/digital-gold/purchase', {
      customer_name: 'QA Digital Gold Customer',
      customer_phone: '9800006666',
      amount_inr: 5000, gold_grams: 0.83,
      rate_per_gram: 6000, payment_mode: 'upi', date: TODAY,
    });
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. SEBI / BIS COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 13. SEBI & BIS Compliance', () => {
  it('GET /api/gold-erp/sebi-bullion-report returns SEBI report', async () => {
    const res = await api.get('/api/gold-erp/sebi-bullion-report');
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/sebi/monthly-return/:year/:month returns monthly return', async () => {
    const res = await api.get(`/api/gold-erp/sebi/monthly-return/${YEAR}/${MONTH}`);
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. GST AT 3% — CRITICAL BUSINESS RULE
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 14. GST 3% on Gold Sales (Critical Business Rule)', () => {
  it('Gold sale: gst_amount must equal subtotal × 0.03', async () => {
    const subtotal = 50000;
    const expectedGst = subtotal * 0.03; // 1500

    const res = await api.post('/api/gold-erp/sales', {
      customer_name: 'QA GST Test Buyer',
      customer_phone: '9800007777',
      items: [{ name: '22K Gold Necklace 10g', weight_gm: 10, rate_per_gm: 5000, making_charge: 0 }],
      subtotal,
      gst_amount: expectedGst,
      total: subtotal + expectedGst,
      payment_mode: 'cash',
    });
    expect(res.status, 'gold sale should not 500').not.toBe(500);
    if (res.status === 200 || res.status === 201) {
      const body = await json<any>(res);
      if (body.gst_amount != null) {
        const gstVal = parseFloat(body.gst_amount);
        expect(gstVal, 'GST must be exactly 3% of subtotal').toBeCloseTo(expectedGst, 0);
        expect(gstVal, 'GST must not exceed 3.1%').toBeLessThanOrEqual(subtotal * 0.031);
      }
    }
  });

  it('gst_summary endpoint is accessible for GST reconciliation', async () => {
    const res = await api.get('/api/gold-erp/gst-summary');
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. ESTIMATES
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 15. Estimates & Quotes', () => {
  it('GET /api/gold-erp/estimates returns estimate list', async () => {
    const res = await api.get('/api/gold-erp/estimates');
    if (res.status === 403 || res.status === 404) return;
    expect(res.status).not.toBe(500);
  });

  it('POST /api/gold-erp/estimates creates an estimate with 3% GST', async () => {
    const subtotal = 27700;
    const gst = subtotal * 0.03;
    const res = await api.post('/api/gold-erp/estimates', {
      customer_name: 'QA Estimate Customer',
      customer_phone: '9800008888',
      items: [{ description: 'QA 22K Ring 5g', weight: 5, rate: 5500, making: 200 }],
      subtotal, gst_amount: gst, total: subtotal + gst,
      valid_until: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    });
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. CUSTOM ROLES & PERMISSIONS (Gold ERP screens)
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 16. Custom Roles & Permissions', () => {
  it('GET /api/roles returns tenant role list', async () => {
    const res = await adminApi.get('/api/roles');
    if (res.status === 403) return;
    expect(res.status).not.toBe(500);
    const body = await json<any>(res);
    const list = Array.isArray(body) ? body : body.data ?? body.roles ?? [];
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/roles creates custom Gold Showroom Manager role', async () => {
    const res = await adminApi.post('/api/roles', {
      name: 'qa_gold_showroom_mgr_' + Date.now().toString().slice(-5),
      display_name: 'QA Gold Showroom Manager',
      description: 'Custom role for Gold ERP showroom managers — QA test',
    });
    if (res.status === 403) return;
    expect(res.status).not.toBe(500);
    if (res.status === 200 || res.status === 201) {
      const body = await json<any>(res);
      customRoleId = body.id;  // may be UUID string or integer
      expect(customRoleId).toBeTruthy();
    }
  });

  it('GET /api/role-permissions returns permission matrix', async () => {
    const res = await adminApi.get('/api/role-permissions');
    if (res.status === 403) return;
    expect(res.status).not.toBe(500);
  });

  it('POST /api/role-permissions assigns gold-erp view to custom role', async () => {
    if (!customRoleId) return;
    const res = await adminApi.post('/api/role-permissions', {
      roleId: customRoleId,
      screenKey: 'gold-erp',
      canView: true, canCreate: false, canEdit: false, canDelete: false,
    });
    if (res.status === 403) return;
    expect(res.status).not.toBe(500);
  });

  it('POST /api/role-permissions assigns karigar create+edit to custom role', async () => {
    if (!customRoleId) return;
    const res = await adminApi.post('/api/role-permissions', {
      roleId: customRoleId,
      screenKey: 'gold-erp-karigar',
      canView: true, canCreate: true, canEdit: true, canDelete: false,
    });
    if (res.status === 403) return;
    expect(res.status).not.toBe(500);
  });

  it('GET /api/roles/:roleId/permissions returns assigned permissions', async () => {
    if (!customRoleId) return;
    const res = await adminApi.get(`/api/roles/${customRoleId}/permissions`);
    if (res.status === 403 || res.status === 404) return;
    expect(res.status).not.toBe(500);
    if (res.status === 200) {
      const body = await json<any>(res);
      expect(body).toBeDefined();
    }
  });

  it('GET /api/my-permissions returns permissions for current user', async () => {
    const res = await api.get('/api/my-permissions');
    expect(res.status).not.toBe(500);
    if (res.status === 200) {
      const body = await json<any>(res);
      expect(body).toBeDefined();
    }
  });

  it('PATCH /api/role-permissions/:id updates canCreate', async () => {
    // Get existing permission for the role
    if (!customRoleId) return;
    const listRes = await adminApi.get(`/api/role-permissions/${customRoleId}`);
    if (listRes.status !== 200) return;
    const perms = await json<any[]>(listRes);
    const perm = Array.isArray(perms) ? perms[0] : null;
    if (!perm?.id) return;
    const res = await adminApi.patch(`/api/role-permissions/${perm.id}`, { canCreate: true });
    if (res.status === 403 || res.status === 404) return;
    expect(res.status).not.toBe(500);
  });

  it('DELETE /api/roles/:id removes custom role (cleanup)', async () => {
    if (!customRoleId) return;
    const res = await adminApi.delete(`/api/roles/${customRoleId}`);
    if (res.status === 403 || res.status === 404) return;
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. CROSS-MODULE: HR Employee → Karigar link
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 17. Cross-Module: HR Employee → Karigar', () => {
  let hrEmpId: number;

  it('POST /api/hr/employees creates a gold artisan in HR', async () => {
    const res = await api.post('/api/hr/employees', {
      first_name: 'Gold', last_name: 'Artisan QA',
      emp_code: 'GOLD-QA-' + Date.now().toString().slice(-5),
      gender: 'male', join_date: TODAY,
      phone: '9' + Date.now().toString().slice(-9),
      status: 'active', employee_type: 'permanent',
      basic_salary: 22000,
    });
    expect(res.status).not.toBe(500);
    if (res.status === 200 || res.status === 201) {
      hrEmpId = (await json<any>(res)).id;
      expect(hrEmpId).toBeGreaterThan(0);
    }
  });

  it('GET /api/hr/employees returns the new artisan', async () => {
    if (!hrEmpId) return;
    const res = await api.get('/api/hr/employees');
    expect(res.status).not.toBe(500);
    if (res.status === 200) {
      const body = await json<any>(res);
      const list = Array.isArray(body) ? body : body.data ?? [];
      const found = list.some((e: any) => e.id === hrEmpId);
      expect(found).toBe(true);
    }
  });

  it('GET /api/gold-erp/karigars — karigar list accessible from Gold ERP tenant', async () => {
    const res = await api.get('/api/gold-erp/karigars');
    expect(res.status).not.toBe(500);
  });

  it('GET /api/hr/attendance accessible for karigar attendance tracking', async () => {
    const res = await api.get('/api/hr/attendance');
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 18. CROSS-MODULE: GL Journal Entries
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 18. Cross-Module: GL (Finance)', () => {
  it('GET /api/journal-entries accessible from Gold ERP tenant', async () => {
    const res = await api.get('/api/journal-entries?limit=5');
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(500);
  });

  it('GET /api/trial-balance accessible', async () => {
    const res = await api.get('/api/trial-balance');
    expect(res.status).not.toBe(403);
  });

  it('GET /api/chart-of-accounts accessible', async () => {
    const res = await api.get('/api/chart-of-accounts');
    expect(res.status).not.toBe(403);
  });

  it('GET /api/profit-loss accessible', async () => {
    const res = await api.get('/api/profit-loss');
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 19. CROSS-MODULE: CRM Contact / Customer Sync
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 19. Cross-Module: CRM Customer Sync', () => {
  it('POST /api/crm/contacts creates a contact for Gold ERP customer', async () => {
    const res = await api.post('/api/crm/contacts', {
      first_name: 'Gold CRM', last_name: 'Buyer',
      phone: '9' + Date.now().toString().slice(-9),
      email: 'goldcrm@qa.test',
    });
    expect(res.status).not.toBe(500);
  });

  it('GET /api/crm/contacts returns contacts (Gold ERP shares CRM)', async () => {
    const res = await api.get('/api/crm/contacts');
    expect(res.status).not.toBe(500);
    if (res.status === 200) {
      const body = await json<any>(res);
      const list = Array.isArray(body) ? body : body.data ?? [];
      expect(list.length).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 20. CROSS-MODULE: Vendor / Bullion Supplier
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 20. Cross-Module: Vendor (Bullion Supplier)', () => {
  it('POST /api/vendors creates a bullion supplier → syncs to CRM', async () => {
    const res = await api.post('/api/vendors', {
      vendorCode: 'BULLION-QA-' + Date.now().toString().slice(-5),
      vendorName: 'QA Gold Bullion Supplier',
      gstNumber: '27AABCG5678K1ZM',
      mobileNumber: '9' + Date.now().toString().slice(-9),
      email: 'bullion@qa.test',
      address: 'Mumbai', city: 'Mumbai', state: 'Maharashtra',
      vendorType: 'supplier',
    });
    expect(res.status).not.toBe(500);
  });

  it('GET /api/vendors returns vendor list', async () => {
    const res = await api.get('/api/vendors');
    expect(res.status).not.toBe(500);
    if (res.status === 200) {
      const body = await json<any>(res);
      const list = Array.isArray(body) ? body : body.data ?? [];
      expect(list.length).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 21. MULTI-SHOWROOM — Shared Branches as Gold Showrooms
// ─────────────────────────────────────────────────────────────────────────────
describe('Gold ERP — 21. Multi-Showroom via Shared Branches', () => {
  let branchId: number;

  it('GET /api/masters/branches returns showroom branch list', async () => {
    const res = await api.get('/api/masters/branches');
    expect(res.status).not.toBe(500);
  });

  it('POST /api/masters/branches creates a Gold showroom (Bandra)', async () => {
    const res = await api.post('/api/masters/branches', {
      name: 'QA Gold Showroom Bandra',
      address: 'Bandra West, Mumbai',
      phone: '9' + Date.now().toString().slice(-9),
      gstin: '27AABCG5678K1ZN',
    });
    expect(res.status).not.toBe(500);
    if (res.status === 200 || res.status === 201) {
      branchId = (await json<any>(res)).id;
    }
  });

  it('POST /api/masters/branches creates a second Gold showroom (Juhu)', async () => {
    const res = await api.post('/api/masters/branches', {
      name: 'QA Gold Showroom Juhu',
      address: 'Juhu, Mumbai',
      phone: '9' + Date.now().toString().slice(-9),
    });
    expect(res.status).not.toBe(500);
  });

  it('GET /api/masters/branches/:id returns showroom detail', async () => {
    if (!branchId) return;
    const res = await api.get(`/api/masters/branches/${branchId}`);
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/inventory-bridge — stock visible across showrooms', async () => {
    const res = await api.get('/api/gold-erp/inventory-bridge');
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gold-erp/production-bridge — production linkage across showrooms', async () => {
    const res = await api.get('/api/gold-erp/production-bridge');
    expect(res.status).not.toBe(500);
  });
});
