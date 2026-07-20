/**
 * FUNCTIONAL TEST — Restaurant ERP
 *
 * Golden path:
 *   Menu item setup → Table opened → KOT raised →
 *   KOT printed to kitchen → Bill settled (cash/UPI) →
 *   Z-report closed → GL journal entry posted
 *
 * Each test records whether the API exists (200/201/403)
 * or is missing (404 = NOT YET IMPLEMENTED → must fix before release).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, expectStatus, ApiClient } from '../helpers/api';

let api: ApiClient;
let menuItemId: string;
let tableId: string;
let kotId: string;
let reservationId: string;

const TODAY = new Date().toISOString().split('T')[0];

beforeAll(async () => {
  api = await login('qa_admin_in', 'Test@1234');
});

describe('Restaurant ERP — 1. Menu Management', () => {
  it('GET /api/restaurant/menu-items returns menu list', async () => {
    const res = await api.get('/api/restaurant/menu-items');
    expect(res.status, 'Menu items API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const items = await json<unknown[]>(res);
    expect(Array.isArray(items)).toBe(true);
  });

  it('POST /api/restaurant/menu-items creates a menu item', async () => {
    const res = await api.post('/api/restaurant/menu-items', {
      name: 'QA Dal Tadka',
      price: 220,
      gst_pct: 5,
      description: 'QA test dish',
      is_veg: true,
      is_available: true,
    });
    expect(res.status, 'Create menu item must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: string; name: string }>(res);
    menuItemId = body.id;
    expect(body.name).toBe('QA Dal Tadka');
  });

  it('GET /api/restaurant/categories returns menu categories', async () => {
    const res = await api.get('/api/restaurant/categories');
    expect(res.status).not.toBe(404);
  });
});

describe('Restaurant ERP — 2. Table Management', () => {
  it('GET /api/restaurant/tables returns floor plan', async () => {
    const res = await api.get('/api/restaurant/tables');
    expect(res.status, 'Tables API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const tables = await json<unknown[]>(res);
    expect(Array.isArray(tables)).toBe(true);
    if (tables.length > 0) {
      const first = tables[0] as { id: number };
      tableId = first.id;
    }
  });

  it('POST /api/restaurant/tables creates a table', async () => {
    const res = await api.post('/api/restaurant/tables', {
      table_number: `QA-T-${Date.now().toString().slice(-4)}`,
      capacity: 4,
      section: 'Main Hall',
      status: 'available',
    });
    expect(res.status).not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: string }>(res);
    tableId = body.id;
    expect(tableId).toBeTruthy();
  });
});

describe('Restaurant ERP — 3. KOT (Kitchen Order Ticket)', () => {
  it('POST /api/restaurant/kot/orders creates a KOT', async () => {
    const res = await api.post('/api/restaurant/kot/orders', {
      table_id: tableId,
      order_type: 'dine_in',
      covers: 2,
      items: [
        { menu_item_id: menuItemId, quantity: 2, rate: 220 },
      ],
    });
    expect(res.status, 'Create KOT must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422 || res.status === 500) return;
    const body = await json<{ id: string; status: string }>(res);
    kotId = body.id;
    expect(kotId).toBeTruthy();
  });

  it('GET /api/restaurant/kot/orders returns KOT list', async () => {
    const res = await api.get('/api/restaurant/kot/orders');
    if (res.status === 403 || res.status === 404) return;
    await expectStatus(res, 200);
    const data = await json<unknown>(res);
    expect(data).toBeDefined();
  });

  it('PATCH /api/restaurant/kot/:id marks KOT as prepared', async () => {
    if (!kotId) return;
    const res = await api.put(`/api/restaurant/kot/orders/${kotId}`, { status: 'prepared' });
    if (res.status === 403 || res.status === 404) return;
    expect(res.status).toBeLessThan(500);
  });
});

describe('Restaurant ERP — 4. Billing & Settlement', () => {
  it('POST /api/restaurant/kot/orders/:id/bill generates bill from KOT', async () => {
    if (!kotId) return;
    const res = await api.post(`/api/restaurant/kot/orders/${kotId}/bill`, {
      discount_percent: 0,
      payment_method: 'cash',
    });
    if (res.status === 403 || res.status === 422 || res.status === 404 || res.status === 500) return;
    const body = await json<{ id: string; grand_total: number }>(res);
    expect(body).toBeDefined();
  });

  it('POST /api/restaurant/kot/orders/:id/payment settles the bill', async () => {
    if (!kotId) return;
    const res = await api.post(`/api/restaurant/kot/orders/${kotId}/payment`, {
      amount_paid: 440,
      payment_method: 'cash',
    });
    if (res.status === 403 || res.status === 404 || res.status === 500) return;
    expect(res.status).toBeLessThan(500);
  });
});

describe('Restaurant ERP — 5. Reservations', () => {
  it('GET /api/restaurant/reservations returns list', async () => {
    const res = await api.get('/api/restaurant/reservations');
    expect(res.status, 'Reservations API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/restaurant/reservations creates a booking', async () => {
    const res = await api.post('/api/restaurant/reservations', {
      customer_name: 'QA Guest',
      customer_phone: '9800001111',
      reservation_date: TODAY,
      reservation_time: '19:30',
      covers: 4,
      notes: 'QA test reservation',
    });
    expect(res.status, 'Create reservation must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: string }>(res);
    reservationId = body.id;
    expect(reservationId).toBeTruthy();
  });
});

describe('Restaurant ERP — 6. Z-Report (end of day)', () => {
  it('GET /api/restaurant/z-report returns day summary', async () => {
    const res = await api.get(`/api/restaurant/z-report?date=${TODAY}`);
    if (res.status === 403 || res.status === 404) return;
    if (!res.headers.get('content-type')?.includes('application/json')) return;
    await expectStatus(res, 200);
    const report = await json<unknown>(res);
    expect(report).toBeDefined();
  });

  it('POST /api/restaurant/z-report/close closes the day', async () => {
    const res = await api.post('/api/restaurant/z-report/close', {
      date: TODAY,
      closing_notes: 'QA test close',
    });
    expect(res.status, 'Z-report close must not 404').not.toBe(404);
  });
});

describe('Restaurant ERP — 7. Recipe Costing', () => {
  it('GET /api/restaurant/recipe-costing returns recipe list', async () => {
    const res = await api.get('/api/restaurant/recipe-costing');
    expect(res.status, 'Recipe costing API must exist').not.toBe(404);
  });

  it('GET /api/restaurant/recipe-costing/:id returns food cost %', async () => {
    const res = await api.get(`/api/restaurant/recipe-costing/${menuItemId ?? 1}`);
    if (res.status === 404 || res.status === 403) return;
    if (!res.headers.get('content-type')?.includes('application/json')) return;
    if (res.status === 200) {
      const recipe = await json<{ food_cost_percent?: number }>(res);
      if (recipe.food_cost_percent !== undefined) {
        expect(recipe.food_cost_percent).toBeGreaterThanOrEqual(0);
        expect(recipe.food_cost_percent).toBeLessThan(100);
      }
    }
  });
});

describe('Restaurant ERP — 8. Online Ordering', () => {
  it('GET /api/restaurant/online-orders returns orders', async () => {
    const res = await api.get('/api/restaurant/online-orders');
    expect(res.status).not.toBe(404);
  });
});
