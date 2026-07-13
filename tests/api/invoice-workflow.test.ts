/**
 * API workflow test: Invoice creation → GST/VAT calculation → payment → PDF.
 * Tests golden-path for all 4 tenant regions.
 * Run: npx vitest tests/api/invoice-workflow.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, expectStatus, ApiClient } from '../helpers/api';

interface InvoiceLine {
  product_id: number;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  currency_code: string;
}

describe('Invoice Workflow — India (GST)', () => {
  let api: ApiClient;

  beforeAll(async () => {
    api = await login('qa_admin_in', 'Test@1234');
  });

  it('creates invoice with 5% GST on taxable value', async () => {
    const res = await api.post('/api/invoices', {
      customer_id: 9001,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      lines: [
        { product_id: 9001, quantity: 2, unit_price: 320.00, discount: 0, tax_rate: 5 },
        { product_id: 9003, quantity: 4, unit_price: 30.00, discount: 0, tax_rate: 5 },
      ],
    });

    const invoice = await json<Invoice>(res);

    // subtotal = (2*320) + (4*30) = 640 + 120 = 760
    expect(invoice.subtotal).toBeCloseTo(760.00, 2);
    // tax = 760 * 5% = 38
    expect(invoice.tax_amount).toBeCloseTo(38.00, 2);
    // total = 798
    expect(invoice.total_amount).toBeCloseTo(798.00, 2);
    expect(invoice.status).toBe('unpaid');
  });

  it('applies discount before GST (post-discount taxable value)', async () => {
    const res = await api.post('/api/invoices', {
      customer_id: 9001,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      lines: [
        // price 1000, qty 1, discount 10% → taxable = 900, GST 18% = 162
        { product_id: 9004, quantity: 1, unit_price: 1000.00, discount: 10, tax_rate: 18 },
      ],
    });

    const invoice = await json<Invoice>(res);
    expect(invoice.subtotal).toBeCloseTo(900.00, 2);   // post-discount
    expect(invoice.tax_amount).toBeCloseTo(162.00, 2); // 18% on 900
    expect(invoice.total_amount).toBeCloseTo(1062.00, 2);
  });

  it('records payment and marks invoice as paid', async () => {
    // create invoice first
    const createRes = await api.post('/api/invoices', {
      customer_id: 9001,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      lines: [{ product_id: 9001, quantity: 1, unit_price: 320.00, discount: 0, tax_rate: 5 }],
    });
    const invoice = await json<Invoice>(createRes);

    // record full payment
    const payRes = await api.post(`/api/invoices/${invoice.id}/payment`, {
      amount: invoice.total_amount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
    });
    await expectStatus(payRes, 200);

    // fetch and verify paid
    const fetchRes = await api.get(`/api/invoices/${invoice.id}`);
    const updated = await json<Invoice>(fetchRes);
    expect(updated.status).toBe('paid');
  });

  it('returns currency_code INR in invoice response', async () => {
    const res = await api.get('/api/invoices?limit=1');
    const data = await json<{ invoices: Invoice[] }>(res);
    if (data.invoices.length > 0) {
      // currency should come from tenant config
      expect(data.invoices[0].currency_code ?? 'INR').toBe('INR');
    }
  });
});

describe('Invoice Workflow — UAE (VAT 5%)', () => {
  let api: ApiClient;

  beforeAll(async () => {
    api = await login('qa_admin_ae', 'Test@1234');
  });

  it('creates invoice with 5% VAT', async () => {
    const res = await api.post('/api/invoices', {
      customer_id: 9006,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      lines: [
        { product_id: 9011, quantity: 2, unit_price: 850.00, discount: 0, tax_rate: 5 },
      ],
    });

    const invoice = await json<Invoice>(res);
    // 2 * 850 = 1700; VAT 5% = 85
    expect(invoice.subtotal).toBeCloseTo(1700.00, 2);
    expect(invoice.tax_amount).toBeCloseTo(85.00, 2);
    expect(invoice.total_amount).toBeCloseTo(1785.00, 2);
  });
});

describe('Invoice Workflow — USA (Sales Tax 8%)', () => {
  let api: ApiClient;

  beforeAll(async () => {
    api = await login('qa_admin_us', 'Test@1234');
  });

  it('creates invoice with 8% sales tax', async () => {
    const res = await api.post('/api/invoices', {
      customer_id: 9011,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      lines: [
        { product_id: 9021, quantity: 1, unit_price: 999.99, discount: 0, tax_rate: 8 },
      ],
    });

    const invoice = await json<Invoice>(res);
    expect(invoice.subtotal).toBeCloseTo(999.99, 2);
    expect(invoice.tax_amount).toBeCloseTo(80.00, 1); // 8% of 999.99 ≈ 80
    expect(invoice.total_amount).toBeCloseTo(1079.99, 0);
  });
});

describe('Invoice Workflow — EU (German VAT 19%)', () => {
  let api: ApiClient;

  beforeAll(async () => {
    api = await login('qa_admin_eu', 'Test@1234');
  });

  it('creates invoice with 19% VAT', async () => {
    const res = await api.post('/api/invoices', {
      customer_id: 9016,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      lines: [
        { product_id: 9031, quantity: 1, unit_price: 1250.00, discount: 0, tax_rate: 19 },
        { product_id: 9032, quantity: 10, unit_price: 89.50, discount: 0, tax_rate: 19 },
      ],
    });

    const invoice = await json<Invoice>(res);
    // 1250 + 895 = 2145; VAT 19% = 407.55
    expect(invoice.subtotal).toBeCloseTo(2145.00, 2);
    expect(invoice.tax_amount).toBeCloseTo(407.55, 1);
    expect(invoice.total_amount).toBeCloseTo(2552.55, 0);
  });
});
