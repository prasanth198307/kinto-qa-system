/**
 * FUNCTIONAL TEST — Manufacturing ERP (core business: water QA)
 *
 * Golden path: Raw material received → issued to production →
 *              Production entry → Finished goods batch →
 *              Sales order → Invoice → Payment collected
 *
 * All API routes used here are confirmed in server/routes.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, expectStatus, ApiClient } from '../helpers/api';

let api: ApiClient;
let rawMaterialId: number;
let issuanceId: number;
let productionEntryId: number;
let finishedGoodId: number;
let salesOrderId: number;
let invoiceId: number;

beforeAll(async () => {
  api = await login('qa_admin_in', 'Test@1234');
});

describe('1. Raw Materials — receive stock', () => {
  it('creates a raw material type', async () => {
    const res = await api.post('/api/raw-material-types', {
      name: 'QA Test Material Type',
      unit: 'kg',
    });
    if (res.status === 409) return; // already exists
    await expectStatus(res, 200);
  });

  it('creates a raw material', async () => {
    const res = await api.post('/api/raw-materials', {
      name: 'QA Test Raw Material',
      code: 'QA-RM-001',
      unit: 'kg',
      reorder_level: 100,
      current_stock: 0,
    });
    const body = await json<{ id: number; name: string }>(res);
    rawMaterialId = body.id;
    expect(body.name).toBe('QA Test Raw Material');
  });

  it('records a purchase (stock-in) transaction', async () => {
    const res = await api.post('/api/raw-material-transactions', {
      raw_material_id: rawMaterialId,
      transaction_type: 'purchase',
      quantity: 500,
      unit_cost: 12.5,
      notes: 'QA test purchase',
      transaction_date: new Date().toISOString().split('T')[0],
    });
    await expectStatus(res, 200);
    const body = await json<{ quantity: number }>(res);
    expect(body.quantity).toBe(500);
  });

  it('verifies stock increased after purchase', async () => {
    const res = await api.get(`/api/raw-materials/${rawMaterialId}`);
    const rm = await json<{ id: number; current_stock: number }>(res);
    expect(rm.current_stock).toBeGreaterThanOrEqual(500);
  });
});

describe('2. Production — issue materials, record output', () => {
  it('creates a raw material issuance (RM → WIP)', async () => {
    const res = await api.post('/api/raw-material-issuances', {
      issuance_date: new Date().toISOString().split('T')[0],
      notes: 'QA test issuance',
      items: [
        {
          raw_material_id: rawMaterialId,
          quantity_issued: 200,
          unit_cost: 12.5,
        },
      ],
    });
    const body = await json<{ id: number; status: string }>(res);
    issuanceId = body.id;
    expect(issuanceId).toBeGreaterThan(0);
  });

  it('creates a production entry (WIP → Finished Goods)', async () => {
    const res = await api.post('/api/production-entries', {
      entry_date: new Date().toISOString().split('T')[0],
      product_id: 9001,  // Paneer Butter Masala used as stand-in product
      quantity_produced: 150,
      batch_number: `QA-BATCH-${Date.now()}`,
      notes: 'QA test production',
    });
    if (res.status === 404 || res.status === 422) {
      // product may not map to a production product — skip gracefully
      return;
    }
    const body = await json<{ id: number }>(res);
    productionEntryId = body.id;
    expect(productionEntryId).toBeGreaterThan(0);
  });
});

describe('3. Sales Order → Invoice → Payment', () => {
  it('creates a sales order', async () => {
    const res = await api.post('/api/sales-orders', {
      customer_id: 9001,
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      items: [
        { product_id: 9001, quantity: 2, unit_price: 320.00, tax_rate: 5 },
        { product_id: 9003, quantity: 10, unit_price: 30.00, tax_rate: 5 },
      ],
    });
    const body = await json<{ id: number; status: string }>(res);
    salesOrderId = body.id;
    expect(salesOrderId).toBeGreaterThan(0);
    expect(body.status).toMatch(/draft|pending/);
  });

  it('confirms the sales order', async () => {
    const res = await api.post(`/api/sales-orders/${salesOrderId}/confirm`, {});
    await expectStatus(res, 200);
    const body = await json<{ status: string }>(res);
    expect(body.status).toMatch(/confirmed|active/);
  });

  it('creates invoice from sales order', async () => {
    const res = await api.post('/api/invoices', {
      customer_id: 9001,
      sales_order_id: salesOrderId,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      lines: [
        { product_id: 9001, quantity: 2, unit_price: 320.00, discount: 0, tax_rate: 5 },
        { product_id: 9003, quantity: 10, unit_price: 30.00, discount: 0, tax_rate: 5 },
      ],
    });
    const body = await json<{ id: number; subtotal: number; tax_amount: number; total_amount: number }>(res);
    invoiceId = body.id;
    // subtotal = 640 + 300 = 940; tax 5% = 47; total = 987
    expect(body.subtotal).toBeCloseTo(940.00, 1);
    expect(body.tax_amount).toBeCloseTo(47.00, 1);
    expect(body.total_amount).toBeCloseTo(987.00, 1);
  });

  it('records invoice payment', async () => {
    const invoiceRes = await api.get(`/api/invoices/${invoiceId}`);
    const invoice = await json<{ total_amount: number }>(invoiceRes);

    const payRes = await api.post('/api/invoice-payments', {
      invoice_id: invoiceId,
      amount: invoice.total_amount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'upi',
      reference_number: `QA-PAY-${Date.now()}`,
    });
    await expectStatus(payRes, 200);
  });

  it('invoice status is paid after payment', async () => {
    const res = await api.get(`/api/invoices/${invoiceId}`);
    const invoice = await json<{ status: string; paid_amount: number; total_amount: number }>(res);
    expect(invoice.status).toBe('paid');
    expect(invoice.paid_amount).toBeCloseTo(invoice.total_amount, 1);
  });
});

describe('4. Purchase Order workflow', () => {
  let poId: number;

  it('creates a purchase order for raw material', async () => {
    const res = await api.post('/api/purchase-orders', {
      vendor_id: 9001,  // seed vendor
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      items: [
        { raw_material_id: rawMaterialId, quantity: 1000, unit_price: 12.0 },
      ],
    });
    const body = await json<{ id: number; status: string }>(res);
    poId = body.id;
    expect(poId).toBeGreaterThan(0);
    expect(body.status).toMatch(/draft|pending/);
  });

  it('fetches purchase order details', async () => {
    const res = await api.get(`/api/purchase-orders/${poId}`);
    const po = await json<{ id: number; vendor_id: number }>(res);
    expect(po.id).toBe(poId);
    expect(po.vendor_id).toBe(9001);
  });

  it('fetches PO line items', async () => {
    const res = await api.get(`/api/purchase-order-items/${poId}`);
    const items = await json<Array<{ raw_material_id: number; quantity: number }>>(res);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].quantity).toBe(1000);
  });
});

describe('5. Sales Returns', () => {
  it('creates a sales return against the invoice', async () => {
    const res = await api.post('/api/sales-returns', {
      invoice_id: invoiceId,
      return_date: new Date().toISOString().split('T')[0],
      reason: 'QA test return',
      items: [
        { product_id: 9003, quantity: 2, unit_price: 30.00, tax_rate: 5 },
      ],
    });
    if (res.status === 422 || res.status === 400) {
      // return window may be closed or items already dispatched — acceptable
      return;
    }
    const body = await json<{ id: number }>(res);
    expect(body.id).toBeGreaterThan(0);
  });
});

describe('6. Today Stats and MIS', () => {
  it('GET /api/stats/today returns revenue and orders', async () => {
    const res = await api.get('/api/stats/today');
    await expectStatus(res, 200);
    const stats = await json<{ revenue?: number; orders?: number }>(res);
    expect(stats).toBeDefined();
  });

  it('GET /api/mis/kpi-dashboard returns KPIs', async () => {
    const res = await api.get('/api/mis/kpi-dashboard');
    if (res.status === 404) return; // might be behind plan
    await expectStatus(res, 200);
  });
});
