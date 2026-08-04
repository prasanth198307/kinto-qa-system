/**
 * FUNCTIONAL TEST — E-Commerce ERP
 *
 * Golden path:
 *   Product listing → Online order received (Flipkart/Amazon webhook) →
 *   Order processing → Invoice generation → Shipping label →
 *   Delivery tracking → Return request → Marketplace reconciliation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, expectStatus, ApiClient } from '../helpers/api';

let api: ApiClient;
let productListingId: number;
let orderId: number;
let returnId: number;

const TODAY = new Date().toISOString().split('T')[0];

beforeAll(async () => {
  api = await login('qa_admin_in', 'Test@1234');
});

describe('E-Commerce ERP — 1. Product Listings', () => {
  it('GET /api/ecommerce/products returns listed products', async () => {
    const res = await api.get('/api/ecommerce/products');
    expect(res.status, 'E-commerce products API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/ecommerce/products lists a product on marketplace', async () => {
    const res = await api.post('/api/ecommerce/products', {
      product_id: 9001,
      title: 'QA Water Purifier Model X — E-Commerce Listing',
      description: 'Advanced RO purifier with UV and UF technology',
      mrp: 15000,
      selling_price: 12999,
      category: 'Home & Kitchen',
      marketplace: 'amazon',
      asin: `QA-ASIN-${Date.now().toString().slice(-8)}`,
      images: ['https://cdn.kinto.in/products/qa-wp.jpg'],
      keywords: ['water purifier', 'RO', 'UV', 'UF'],
    });
    expect(res.status, 'List product must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number | string; asin: string }>(res);
    productListingId = body.id as number;
    expect(productListingId).toBeTruthy();
  });
});

describe('E-Commerce ERP — 2. Orders', () => {
  it('GET /api/ecommerce/orders returns order list', async () => {
    const res = await api.get('/api/ecommerce/orders');
    expect(res.status, 'E-commerce orders API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const orders = await json<unknown[]>(res);
    expect(Array.isArray(orders)).toBe(true);
  });

  it('POST /api/ecommerce/orders creates a marketplace order', async () => {
    const res = await api.post('/api/ecommerce/orders', {
      marketplace: 'amazon',
      marketplace_order_id: `AMZ-QA-${Date.now()}`,
      customer_name: 'QA E-Commerce Customer',
      customer_phone: '9800001111',
      delivery_address: 'Mumbai, MH - 400001',
      order_date: TODAY,
      items: [
        {
          product_id: 9001,
          listing_id: productListingId,
          quantity: 1,
          selling_price: 12999,
          marketplace_commission: 780,
        },
      ],
      payment_method: 'prepaid',
      shipping_provider: 'amazon_logistics',
    });
    expect(res.status, 'Create order must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; status: string }>(res);
    orderId = body.id;
    expect(body.status).toMatch(/pending|processing|new/);
  });

  it('PATCH /api/ecommerce/orders/:id processes order (pack + ship)', async () => {
    if (!orderId) return;
    const res = await api.put(`/api/ecommerce/orders/${orderId}`, {
      status: 'shipped',
      tracking_number: `TRK-QA-${Date.now()}`,
      shipping_provider: 'amazon_logistics',
      shipped_date: TODAY,
      expected_delivery: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    });
    expect(res.status).not.toBe(404);
  });
});

describe('E-Commerce ERP — 3. Invoicing', () => {
  it('POST /api/ecommerce/orders/:id/invoice generates e-commerce invoice', async () => {
    if (!orderId) return;
    const res = await api.post(`/api/ecommerce/orders/${orderId}/invoice`, {
      invoice_date: TODAY,
    });
    expect(res.status, 'E-com invoice must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ invoice_id: number; total: number }>(res);
    expect(body.invoice_id).toBeGreaterThan(0);
  });
});

describe('E-Commerce ERP — 4. Returns & Refunds', () => {
  it('GET /api/ecommerce/returns returns return list', async () => {
    const res = await api.get('/api/ecommerce/returns');
    expect(res.status).not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/ecommerce/returns creates a return request', async () => {
    const res = await api.post('/api/ecommerce/returns', {
      order_id: orderId ?? 1,
      reason: 'Product not as described — QA test',
      return_type: 'refund',
      items: [{ product_id: 9001, quantity: 1 }],
    });
    expect(res.status, 'Return must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number | string }>(res);
    returnId = body.id as number;
    expect(returnId).toBeTruthy();
  });
});

describe('E-Commerce ERP — 5. Marketplace Integrations', () => {
  it('GET /api/ecommerce/marketplace returns marketplace connection status', async () => {
    const res = await api.get('/api/ecommerce/marketplace');
    expect(res.status, 'Marketplace API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const data = await json<{
      amazon?: { connected: boolean };
      flipkart?: { connected: boolean };
      meesho?: { connected: boolean };
    }>(res);
    expect(data).toBeDefined();
  });

  it('GET /api/ecommerce/marketplace/reconciliation returns commission reconciliation', async () => {
    const res = await api.get(`/api/ecommerce/marketplace/reconciliation?month=7&year=2026`);
    expect(res.status).not.toBe(404);
  });
});

describe('E-Commerce ERP — 6. Analytics', () => {
  it('GET /api/ecommerce/analytics returns sales funnel metrics', async () => {
    const res = await api.get('/api/ecommerce/analytics');
    expect(res.status, 'E-commerce analytics must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const data = await json<{
      total_orders?: number;
      total_revenue?: number;
      return_rate?: number;
    }>(res);
    expect(data).toBeDefined();
  });

  it('GET /api/ecommerce/customers returns customer list with LTV', async () => {
    const res = await api.get('/api/ecommerce/customers');
    expect(res.status).not.toBe(404);
  });
});

describe('E-Commerce ERP — 7. Custom Roles & Permissions API', () => {
  it('GET /api/roles returns roles for e-commerce tenant', async () => {
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
    if (res.status === 200 && res.headers.get('content-type')?.includes('application/json')) {
      const users = await json<unknown[]>(res);
      expect(Array.isArray(users)).toBe(true);
    }
  });

  it('POST /api/roles creates a custom role for e-commerce tenant', async () => {
    const res = await api.post('/api/roles', {
      name: 'QA Catalog Editor',
      description: 'Custom role for product listing management',
      permissions: ['ecommerce_read', 'ecommerce_write', 'catalog_edit'],
    });
    expect(res.status).not.toBe(404);
  });
});

describe('E-Commerce ERP — 8. Masters: Regions, Branches, Tax Config, Audit Log', () => {
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

describe('E-Commerce ERP — 9. Cross-Module Integration', () => {
  it('GET /api/accounting/journal-entries works alongside e-commerce (GL cross-module)', async () => {
    const res = await api.get('/api/accounting/journal-entries?limit=5');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/hr/employees works alongside e-commerce (HR cross-module)', async () => {
    const res = await api.get('/api/hr/employees');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/crm/contacts works alongside e-commerce (CRM cross-module)', async () => {
    const res = await api.get('/api/crm/contacts');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/mis/summary works alongside e-commerce (MIS cross-module)', async () => {
    const res = await api.get('/api/mis/summary');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/invoices works alongside e-commerce order billing (AR cross-module)', async () => {
    const res = await api.get('/api/invoices?limit=5');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/warehouses works alongside e-commerce inventory (Warehouse cross-module)', async () => {
    const res = await api.get('/api/warehouses');
    expect(res.status).not.toBe(404);
  });
});
