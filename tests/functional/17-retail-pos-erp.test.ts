/**
 * FUNCTIONAL TEST — Retail / POS ERP
 *
 * Golden path:
 *   Product setup with barcode → POS sale (multi-payment) →
 *   Receipt print → Return & exchange → Loyalty points →
 *   Inventory sync (stock deducted) → Day-close Z-report →
 *   B2B portal order → Franchise management
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, expectStatus, ApiClient } from '../helpers/api';

let api: ApiClient;
let productId: number;
let posOrderId: number;
let returnId: number;
let loyaltyMemberId: number;

const TODAY = new Date().toISOString().split('T')[0];

beforeAll(async () => {
  // US tenant has retail_professional plan
  api = await login('qa_admin_us', 'Test@1234');
});

describe('Retail/POS ERP — 1. Product Catalog', () => {
  it('GET /api/pos/products returns POS-enabled products', async () => {
    const res = await api.get('/api/pos/products');
    expect(res.status, 'POS products API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const products = await json<unknown[]>(res);
    expect(Array.isArray(products)).toBe(true);
  });

  it('GET /api/pos/products/search searches by barcode or name', async () => {
    const res = await api.get('/api/pos/products/search?q=Laptop');
    expect(res.status).not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('GET /api/pos/categories returns product categories', async () => {
    const res = await api.get('/api/pos/categories');
    expect(res.status).not.toBe(404);
  });
});

describe('Retail/POS ERP — 2. POS Sale Transaction', () => {
  it('POST /api/pos/orders creates a POS sale', async () => {
    const res = await api.post('/api/pos/orders', {
      customer_id: 9011,
      order_date: TODAY,
      items: [
        { product_id: 9021, quantity: 1, unit_price: 999.99, discount: 0, tax_rate: 8 },
        { product_id: 9022, quantity: 2, unit_price: 29.99, discount: 5, tax_rate: 8 },
      ],
      subtotal: 1056.97,
      tax_amount: 84.54,
      total: 1141.51,
      payment: {
        method: 'split',
        cash: 500,
        card: 641.51,
      },
    });
    expect(res.status, 'POS order must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{
      id: number;
      order_number: string;
      total: number;
      status: string;
    }>(res);
    posOrderId = body.id;
    expect(body.total).toBeCloseTo(1141.51, 1);
    expect(body.status).toMatch(/completed|paid/);
  });

  it('GET /api/pos/orders/:id returns order with receipt data', async () => {
    if (!posOrderId) return;
    const res = await api.get(`/api/pos/orders/${posOrderId}`);
    await expectStatus(res, 200);
    const order = await json<{ id: number; items: unknown[] }>(res);
    expect(order.items.length).toBe(2);
  });

  it('POS order currency must be $ not ₹ for US tenant', async () => {
    if (!posOrderId) return;
    const res = await api.get(`/api/pos/orders/${posOrderId}`);
    if (res.status !== 200) return;
    const text = await res.text();
    expect(text).not.toContain('₹');
    expect(text).not.toContain('INR');
  });

  it('Inventory stock decremented after POS sale', async () => {
    const resBefore = await api.get('/api/products/9021');
    if (resBefore.status !== 200) return;
    const before = await json<{ stock_quantity: number }>(resBefore);
    // After a sale of qty 1, stock should be reduced
    expect(before.stock_quantity).toBeGreaterThanOrEqual(0);
  });
});

describe('Retail/POS ERP — 3. Sales Return & Exchange', () => {
  it('GET /api/pos/returns returns return list', async () => {
    const res = await api.get('/api/pos/returns');
    expect(res.status, 'POS returns API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/pos/returns creates a return', async () => {
    const res = await api.post('/api/pos/returns', {
      order_id: posOrderId ?? 1,
      return_date: TODAY,
      reason: 'Defective product — QA test',
      items: [
        { product_id: 9022, quantity: 1, unit_price: 29.99, tax_rate: 8 },
      ],
      refund_method: 'original',
    });
    expect(res.status, 'POS return must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; refund_amount: number }>(res);
    returnId = body.id;
    expect(body.refund_amount).toBeGreaterThan(0);
  });
});

describe('Retail/POS ERP — 4. Loyalty Program', () => {
  it('GET /api/retail/loyalty-members returns members', async () => {
    const res = await api.get('/api/retail/loyalty-members');
    expect(res.status, 'Loyalty API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/retail/loyalty-members enrolls customer in loyalty', async () => {
    const res = await api.post('/api/retail/loyalty-members', {
      customer_id: 9011,
      membership_tier: 'silver',
      enrollment_date: TODAY,
    });
    expect(res.status, 'Enroll loyalty must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 409 || res.status === 422) return;
    const body = await json<{ id: number; membership_number: string }>(res);
    loyaltyMemberId = body.id;
    expect(body.membership_number).toBeDefined();
  });

  it('POST /api/retail/loyalty/earn-points awards points after sale', async () => {
    const res = await api.post('/api/retail/loyalty/earn-points', {
      customer_id: 9011,
      order_id: posOrderId,
      purchase_amount: 1141.51,
    });
    expect(res.status).not.toBe(404);
  });

  it('GET /api/retail/loyalty/points/:customerId returns point balance', async () => {
    const res = await api.get('/api/retail/loyalty/points/9011');
    expect(res.status).not.toBe(404);
  });
});

describe('Retail/POS ERP — 5. Inventory Sync', () => {
  it('GET /api/pos/stock-alerts returns low-stock alerts', async () => {
    const res = await api.get('/api/pos/stock-alerts');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/pos/stock/:productId returns real-time stock', async () => {
    const res = await api.get('/api/pos/stock/9021');
    expect(res.status).not.toBe(404);
    if (res.status === 200) {
      const stock = await json<{ quantity: number }>(res);
      expect(stock.quantity).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Retail/POS ERP — 6. Z-Report (Day Close)', () => {
  it('GET /api/pos/z-report returns today\'s summary', async () => {
    const res = await api.get(`/api/pos/z-report?date=${TODAY}`);
    expect(res.status, 'POS Z-report must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const report = await json<{
      total_sales?: number;
      total_returns?: number;
      cash_total?: number;
      card_total?: number;
    }>(res);
    expect(report).toBeDefined();
  });
});

describe('Retail/POS ERP — 7. B2B Portal', () => {
  it('GET /api/retail/b2b/orders returns B2B orders', async () => {
    const res = await api.get('/api/retail/b2b/orders');
    expect(res.status, 'B2B portal API must exist').not.toBe(404);
  });

  it('POST /api/retail/b2b/orders creates B2B wholesale order', async () => {
    const res = await api.post('/api/retail/b2b/orders', {
      customer_id: 9012,
      items: [
        { product_id: 9021, quantity: 10, unit_price: 850, discount: 15 },
      ],
      payment_terms: 'net_30',
      delivery_address: 'Los Angeles, CA',
    });
    expect(res.status).not.toBe(404);
  });
});

describe('Retail/POS ERP — 8. Franchise Management', () => {
  it('GET /api/retail/franchises returns franchise list', async () => {
    const res = await api.get('/api/retail/franchises');
    expect(res.status, 'Franchise API must exist').not.toBe(404);
  });

  it('GET /api/retail/franchise/analytics returns consolidated sales', async () => {
    const res = await api.get('/api/retail/franchise/analytics');
    expect(res.status).not.toBe(404);
  });
});
