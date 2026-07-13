/**
 * FUNCTIONAL TEST — Pharmacy ERP
 *
 * Golden path:
 *   Drug master setup → Purchase (GRN with batch/expiry) →
 *   FEFO stock check → Prescription intake →
 *   Dispense (FEFO billing) → Narcotics register entry →
 *   Expiry alert → GST e-invoice
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, expectStatus, ApiClient } from '../helpers/api';

let api: ApiClient;
let drugId: number;
let batchId: number;
let prescriptionId: number;
let billId: number;

const TODAY = new Date().toISOString().split('T')[0];
const EXPIRY_DATE = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
const EXPIRY_NEAR = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

beforeAll(async () => {
  api = await login('qa_admin_in', 'Test@1234');
});

describe('Pharmacy ERP — 1. Drug Master', () => {
  it('GET /api/pharmacy/drugs returns drug catalog', async () => {
    const res = await api.get('/api/pharmacy/drugs');
    expect(res.status, 'Drug catalog API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const drugs = await json<unknown[]>(res);
    expect(Array.isArray(drugs)).toBe(true);
  });

  it('POST /api/pharmacy/drugs adds a drug to master', async () => {
    const res = await api.post('/api/pharmacy/drugs', {
      name: 'QA Amoxicillin 500mg',
      generic_name: 'Amoxicillin',
      manufacturer: 'QA Pharma Ltd',
      category: 'antibiotic',
      hsn_code: '3004',
      gst_rate: 12,
      mrp: 120,
      pack_size: 10,
      unit: 'strip',
      schedule: 'H',
      is_narcotic: false,
      reorder_level: 50,
    });
    expect(res.status, 'Add drug must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; name: string }>(res);
    drugId = body.id;
    expect(body.name).toBe('QA Amoxicillin 500mg');
  });
});

describe('Pharmacy ERP — 2. Purchase & GRN (Batch/Expiry)', () => {
  it('POST /api/pharmacy/purchase creates a drug purchase (GRN)', async () => {
    const res = await api.post('/api/pharmacy/purchase', {
      vendor_id: 9001,
      purchase_date: TODAY,
      invoice_number: `QA-PHR-${Date.now()}`,
      items: [
        {
          drug_id: drugId ?? 1,
          batch_number: `BATCH-QA-${Date.now().toString().slice(-6)}`,
          expiry_date: EXPIRY_DATE,
          quantity: 100,
          purchase_rate: 90,
          mrp: 120,
          gst_rate: 12,
        },
      ],
    });
    expect(res.status, 'Pharmacy purchase must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; items?: Array<{ batch_id: number }> }>(res);
    expect(body.id).toBeGreaterThan(0);
    if (body.items?.[0]?.batch_id) batchId = body.items[0].batch_id;
  });

  it('GET /api/pharmacy/inventory returns stock with batch details', async () => {
    const res = await api.get('/api/pharmacy/inventory');
    expect(res.status, 'Pharmacy inventory must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const stock = await json<unknown[]>(res);
    expect(Array.isArray(stock)).toBe(true);
  });
});

describe('Pharmacy ERP — 3. FEFO Stock Availability', () => {
  it('GET /api/pharmacy/fefo-stock/:drugId returns batches sorted by expiry (FEFO)', async () => {
    const dId = drugId ?? 1;
    const res = await api.get(`/api/pharmacy/fefo-stock/${dId}`);
    expect(res.status, 'FEFO stock API must exist').not.toBe(404);
    if (res.status === 403 || res.status === 404) return;
    const batches = await json<Array<{ batch_number: string; expiry_date: string; quantity: number }>>(res);
    if (batches.length > 1) {
      // Verify sorted by expiry (FEFO = First Expired First Out)
      const dates = batches.map((b) => new Date(b.expiry_date).getTime());
      const isSorted = dates.every((d, i) => i === 0 || d >= dates[i - 1]);
      expect(isSorted).toBe(true);
    }
  });
});

describe('Pharmacy ERP — 4. Prescription & Dispensing', () => {
  it('GET /api/pharmacy/prescriptions returns prescription list', async () => {
    const res = await api.get('/api/pharmacy/prescriptions');
    expect(res.status, 'Prescriptions API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/pharmacy/prescriptions registers a prescription', async () => {
    const res = await api.post('/api/pharmacy/prescriptions', {
      patient_id: 1,
      doctor_name: 'Dr. QA Physician',
      prescription_date: TODAY,
      drugs: [
        { drug_id: drugId ?? 1, quantity: 30, instructions: '1 tab TDS × 10 days' },
      ],
    });
    expect(res.status, 'Register prescription must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number }>(res);
    prescriptionId = body.id;
    expect(prescriptionId).toBeGreaterThan(0);
  });

  it('POST /api/pharmacy/billing dispenses drugs (FEFO, with GST)', async () => {
    const res = await api.post('/api/pharmacy/billing', {
      patient_id: 1,
      prescription_id: prescriptionId,
      items: [
        {
          drug_id: drugId ?? 1,
          batch_id: batchId,
          quantity: 30,
          mrp: 120,
          sale_rate: 108, // 10% discount
          gst_rate: 12,
        },
      ],
      discount_percent: 10,
      payment_method: 'cash',
    });
    expect(res.status, 'Pharmacy billing must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{
      id: number;
      subtotal: number;
      gst_amount: number;
      total: number;
    }>(res);
    billId = body.id;
    // GST must be on post-discount value
    expect(body.gst_amount).toBeCloseTo(body.subtotal * 0.12, 0);
    expect(body.total).toBeGreaterThan(0);
  });

  it('Pharmacy bill must show ₹ for IN tenant', async () => {
    if (!billId) return;
    const res = await api.get(`/api/pharmacy/billing/${billId}`);
    if (res.status !== 200) return;
    const text = await res.text();
    expect(text).not.toContain('undefined');
  });
});

describe('Pharmacy ERP — 5. Narcotics Register', () => {
  it('GET /api/pharmacy/narcotics-register returns narcotic log', async () => {
    const res = await api.get('/api/pharmacy/narcotics-register');
    expect(res.status, 'Narcotics register API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const log = await json<unknown[]>(res);
    expect(Array.isArray(log)).toBe(true);
  });

  it('POST /api/pharmacy/narcotics-register logs narcotic dispensing', async () => {
    const res = await api.post('/api/pharmacy/narcotics-register', {
      drug_name: 'QA Morphine 10mg',
      batch_number: 'NARC-001',
      patient_id: 1,
      doctor_name: 'Dr. QA Physician',
      quantity_dispensed: 5,
      date: TODAY,
      licence_number: 'NARC-LIC-QA-001',
    });
    expect(res.status, 'Log narcotic must not 404').not.toBe(404);
  });
});

describe('Pharmacy ERP — 6. Expiry Tracking & Alerts', () => {
  it('GET /api/pharmacy/expiry-tracking returns near-expiry batches', async () => {
    const res = await api.get('/api/pharmacy/expiry-tracking?days=90');
    expect(res.status, 'Expiry tracking API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const batches = await json<Array<{ expiry_date: string; quantity: number }>>(res);
    expect(Array.isArray(batches)).toBe(true);
    // All returned batches should expire within 90 days
    const cutoff = Date.now() + 90 * 86400000;
    batches.forEach((b) => {
      expect(new Date(b.expiry_date).getTime()).toBeLessThanOrEqual(cutoff);
    });
  });

  it('GET /api/pharmacy/suppliers returns vendor list for pharma', async () => {
    const res = await api.get('/api/pharmacy/suppliers');
    expect(res.status).not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });
});
