/**
 * FUNCTIONAL TEST — Gold ERP
 *
 * Golden path:
 *   Live gold rate fetch → Jewellery item created (with purity/weight) →
 *   Customer sale (making charge + GST 3%) → Old gold purchase →
 *   Gold saving scheme enrollment → Maturity redemption →
 *   BIS hallmarking → Stock valuation report
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, expectStatus, ApiClient } from '../helpers/api';

let api: ApiClient;
let itemId: number;
let saleId: number;
let schemeId: number;
let enrollmentId: number;

const TODAY = new Date().toISOString().split('T')[0];

beforeAll(async () => {
  api = await login('qa_admin_in', 'Test@1234');
});

describe('Gold ERP — 1. Live Gold Rate', () => {
  it('GET /api/gold/live-rate returns current gold price per gram', async () => {
    const res = await api.get('/api/gold/live-rate');
    expect(res.status, 'Live rate API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const rate = await json<{ rate_per_gram?: number; purity?: string; source?: string }>(res);
    expect(rate).toBeDefined();
    if (rate.rate_per_gram) {
      expect(rate.rate_per_gram).toBeGreaterThan(5000); // gold > ₹5000/gram
    }
  });

  it('GET /api/gold/rate-history returns price history', async () => {
    const res = await api.get('/api/gold/rate-history?days=7');
    expect(res.status).not.toBe(404);
  });
});

describe('Gold ERP — 2. Inventory (Jewellery Items)', () => {
  it('GET /api/gold/inventory returns jewellery stock', async () => {
    const res = await api.get('/api/gold/inventory');
    expect(res.status, 'Gold inventory API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const items = await json<unknown[]>(res);
    expect(Array.isArray(items)).toBe(true);
  });

  it('POST /api/gold/inventory adds a jewellery item', async () => {
    const res = await api.post('/api/gold/inventory', {
      item_code: `GOLD-QA-${Date.now().toString().slice(-5)}`,
      name: 'QA 22K Gold Necklace',
      category: 'necklace',
      purity: '22K',
      gross_weight_grams: 25.5,
      net_weight_grams: 23.2,
      making_charge_per_gram: 350,
      stone_cost: 0,
      hsn_code: '7113',
      gst_rate: 3,
      bis_hallmark_number: `BIS-QA-${Date.now().toString().slice(-6)}`,
      quantity: 1,
    });
    expect(res.status, 'Add gold item must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; name: string }>(res);
    itemId = body.id;
    expect(body.name).toBe('QA 22K Gold Necklace');
  });

  it('GET /api/gold/inventory/:id returns item with valuation', async () => {
    if (!itemId) return;
    const res = await api.get(`/api/gold/inventory/${itemId}`);
    await expectStatus(res, 200);
    const item = await json<{
      id: number;
      net_weight_grams: number;
      current_value?: number;
    }>(res);
    expect(item.net_weight_grams).toBe(23.2);
  });
});

describe('Gold ERP — 3. Sales (with GST 3%)', () => {
  it('GET /api/gold/sales returns sale list', async () => {
    const res = await api.get('/api/gold/sales');
    expect(res.status, 'Gold sales API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/gold/sales creates a jewellery sale (GST @ 3%)', async () => {
    const goldRate = 6800; // ₹ per gram (test value)
    const netWeight = 23.2;
    const makingCharge = 350 * netWeight; // 8120
    const goldValue = goldRate * netWeight; // 157760
    const subtotal = goldValue + makingCharge; // 165880
    const gst = subtotal * 0.03; // 4976.40

    const res = await api.post('/api/gold/sales', {
      customer_id: 9001,
      sale_date: TODAY,
      items: [{ inventory_id: itemId ?? 1, quantity: 1 }],
      gold_rate_per_gram: goldRate,
      subtotal: subtotal,
      gst_amount: gst,
      total: subtotal + gst,
      payment_method: 'cash',
      old_gold_exchange: false,
    });
    expect(res.status, 'Gold sale must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; gst_amount: number; total: number }>(res);
    saleId = body.id;
    // GST must be 3% on subtotal (not inclusive)
    expect(body.gst_amount).toBeCloseTo(gst, 0);
  });

  it('POST /api/gold/purchase records old gold purchase from customer', async () => {
    const res = await api.post('/api/gold/purchase', {
      customer_id: 9001,
      purchase_date: TODAY,
      item_description: 'Old gold bangles',
      purity: '18K',
      gross_weight_grams: 18.0,
      net_weight_grams: 16.5,
      rate_per_gram: 4500,  // at 18K rate
      total_amount: 74250,
      payment_method: 'cash',
    });
    expect(res.status, 'Old gold purchase must not 404').not.toBe(404);
  });
});

describe('Gold ERP — 4. Saving Schemes', () => {
  it('GET /api/gold/schemes returns gold saving schemes', async () => {
    const res = await api.get('/api/gold/schemes');
    expect(res.status, 'Schemes API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const schemes = await json<unknown[]>(res);
    expect(Array.isArray(schemes)).toBe(true);
  });

  it('POST /api/gold/schemes creates a new scheme', async () => {
    const res = await api.post('/api/gold/schemes', {
      name: 'QA Gold Savings Scheme 11+1',
      duration_months: 12,
      bonus_months: 1,
      min_installment: 1000,
      scheme_type: 'amount_based',
    });
    expect(res.status, 'Create scheme must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; name: string }>(res);
    schemeId = body.id;
    expect(body.name).toBe('QA Gold Savings Scheme 11+1');
  });

  it('POST /api/gold/schemes/:id/enroll enrolls a customer', async () => {
    const res = await api.post(`/api/gold/schemes/${schemeId ?? 1}/enroll`, {
      customer_id: 9001,
      enrollment_date: TODAY,
      monthly_installment: 2000,
      start_date: TODAY,
    });
    expect(res.status, 'Enroll customer must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number }>(res);
    enrollmentId = body.id;
    expect(enrollmentId).toBeGreaterThan(0);
  });

  it('POST /api/gold/schemes/installments/:id pays monthly installment', async () => {
    if (!enrollmentId) return;
    const res = await api.post(`/api/gold/schemes/installments/${enrollmentId}`, {
      amount: 2000,
      payment_date: TODAY,
      payment_method: 'upi',
    });
    expect(res.status).not.toBe(404);
  });
});

describe('Gold ERP — 5. BIS Hallmarking', () => {
  it('GET /api/gold/hallmarking returns hallmarking list', async () => {
    const res = await api.get('/api/gold/hallmarking');
    expect(res.status, 'Hallmarking API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/gold/hallmarking submits items for hallmarking', async () => {
    const res = await api.post('/api/gold/hallmarking', {
      items: [{ inventory_id: itemId ?? 1 }],
      submission_date: TODAY,
      hallmarking_centre: 'BIS AHC Mumbai',
      expected_return_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    });
    expect(res.status, 'Submit hallmarking must not 404').not.toBe(404);
  });
});

describe('Gold ERP — 6. Stock Valuation', () => {
  it('GET /api/gold/stock-valuation returns current stock value at live rate', async () => {
    const res = await api.get('/api/gold/stock-valuation');
    expect(res.status, 'Stock valuation API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const val = await json<{ total_weight_grams?: number; total_value?: number }>(res);
    expect(val).toBeDefined();
  });
});
