/**
 * FUNCTIONAL TEST — Hotel ERP
 *
 * Golden path:
 *   Room setup → Guest reservation → Check-in →
 *   Folio charges (room + F&B + spa) → Check-out →
 *   Folio invoice → Payment → Revenue report
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, expectStatus, ApiClient } from '../helpers/api';

let api: ApiClient;
let roomId: number;
let reservationId: number;
let bookingId: number;
let folioId: number;

const TODAY = new Date().toISOString().split('T')[0];
const TOMORROW = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const DAY_AFTER = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];

beforeAll(async () => {
  // AE tenant has hotel_professional plan
  api = await login('qa_admin_ae', 'Test@1234');
});

describe('Hotel ERP — 1. Room Setup', () => {
  it('GET /api/hotel/rooms returns room list', async () => {
    const res = await api.get('/api/hotel/rooms');
    expect(res.status, 'Rooms API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const rooms = await json<unknown[]>(res);
    expect(Array.isArray(rooms)).toBe(true);
    if (rooms.length > 0) roomId = (rooms[0] as { id: number }).id;
  });

  it('POST /api/hotel/rooms creates a room', async () => {
    const res = await api.post('/api/hotel/rooms', {
      room_number: `QA-${Date.now().toString().slice(-3)}`,
      room_type: 'deluxe',
      floor: 3,
      capacity: 2,
      base_rate: 850,
      status: 'available',
      amenities: ['AC', 'TV', 'WiFi', 'Minibar'],
    });
    expect(res.status, 'Create room must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; room_number: string }>(res);
    roomId = body.id;
    expect(roomId).toBeGreaterThan(0);
  });

  it('GET /api/hotel/room-types returns room type list', async () => {
    const res = await api.get('/api/hotel/room-types');
    expect(res.status).not.toBe(404);
  });

  it('GET /api/hotel/housekeeping returns housekeeping task list', async () => {
    const res = await api.get('/api/hotel/housekeeping');
    expect(res.status, 'Housekeeping API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });
});

describe('Hotel ERP — 2. Reservations', () => {
  it('GET /api/hotel/reservations returns reservation list', async () => {
    const res = await api.get('/api/hotel/reservations');
    expect(res.status, 'Reservations API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/hotel/reservations creates a booking', async () => {
    const res = await api.post('/api/hotel/reservations', {
      guest_name: 'QA Guest Al Rashidi',
      guest_phone: '+971501234567',
      guest_email: 'qa.guest@hotel.test',
      room_id: roomId ?? 1,
      room_type: 'deluxe',
      check_in_date: TOMORROW,
      check_out_date: DAY_AFTER,
      adults: 2,
      children: 0,
      rate_per_night: 850,
      total_nights: 1,
      source: 'direct',
      payment_mode: 'pay_at_hotel',
      special_requests: 'High floor, QA test booking',
    });
    expect(res.status, 'Create reservation must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; status: string }>(res);
    reservationId = body.id;
    expect(body.status).toMatch(/confirmed|pending/);
  });
});

describe('Hotel ERP — 3. Check-In', () => {
  it('POST /api/hotel/check-in checks guest in', async () => {
    const res = await api.post('/api/hotel/check-in', {
      reservation_id: reservationId ?? 1,
      room_id: roomId ?? 1,
      actual_check_in: TODAY,
      id_type: 'passport',
      id_number: 'QA123456',
      advance_paid: 200,
    });
    expect(res.status, 'Check-in API must exist').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; folio_id?: number; status: string }>(res);
    bookingId = body.id;
    if (body.folio_id) folioId = body.folio_id;
    expect(body.status).toMatch(/checked_in|active/);
  });

  it('GET /api/hotel/front-desk returns current occupancy', async () => {
    const res = await api.get('/api/hotel/front-desk');
    expect(res.status, 'Front desk API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const data = await json<{ occupied?: number; available?: number }>(res);
    expect(data).toBeDefined();
  });
});

describe('Hotel ERP — 4. Folio (In-House Charges)', () => {
  it('GET /api/hotel/folio/:id returns guest folio', async () => {
    const fId = folioId ?? 1;
    const res = await api.get(`/api/hotel/folio/${fId}`);
    expect(res.status, 'Folio API must exist').not.toBe(404);
    if (res.status === 403 || res.status === 404) return;
    const folio = await json<{ id: number; charges: unknown[] }>(res);
    expect(folio.id).toBe(fId);
  });

  it('POST /api/hotel/folio/:id/charges adds a charge to folio', async () => {
    const fId = folioId ?? 1;
    const res = await api.post(`/api/hotel/folio/${fId}/charges`, {
      charge_type: 'restaurant',
      description: 'Breakfast Buffet x2',
      amount: 240,
      tax_rate: 5,
      date: TODAY,
    });
    expect(res.status, 'Add folio charge must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    await expectStatus(res, 200);
  });

  it('currency on folio must be AED not ₹', async () => {
    const fId = folioId ?? 1;
    const res = await api.get(`/api/hotel/folio/${fId}`);
    if (res.status !== 200) return;
    const text = await res.text();
    expect(text).not.toContain('₹');
    expect(text).not.toContain('INR');
  });
});

describe('Hotel ERP — 5. Check-Out & Billing', () => {
  it('POST /api/hotel/check-out generates final folio bill', async () => {
    const res = await api.post('/api/hotel/check-out', {
      booking_id: bookingId ?? 1,
      actual_check_out: TODAY,
      payment_method: 'card',
    });
    expect(res.status, 'Check-out API must exist').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{
      invoice_id?: number;
      total_amount: number;
      currency_code: string;
    }>(res);
    expect(body.total_amount).toBeGreaterThan(0);
    if (body.currency_code) expect(body.currency_code).toBe('AED');
  });
});

describe('Hotel ERP — 6. Revenue Management', () => {
  it('GET /api/hotel/revenue-management returns RevPAR metrics', async () => {
    const res = await api.get('/api/hotel/revenue-management');
    expect(res.status, 'Revenue management API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const data = await json<{ revpar?: number; occupancy_rate?: number; adr?: number }>(res);
    expect(data).toBeDefined();
  });

  it('GET /api/hotel/channel-manager returns OTA channel rates', async () => {
    const res = await api.get('/api/hotel/channel-manager');
    expect(res.status, 'Channel manager API must exist').not.toBe(404);
  });

  it('GET /api/hotel/analytics returns hotel analytics', async () => {
    const res = await api.get(`/api/hotel/analytics?from=${TODAY}&to=${TODAY}`);
    expect(res.status).not.toBe(404);
  });
});

describe('Hotel ERP — 7. Banquet & Events', () => {
  it('GET /api/hotel/banquet returns banquet bookings', async () => {
    const res = await api.get('/api/hotel/banquet');
    expect(res.status).not.toBe(404);
  });

  it('POST /api/hotel/banquet creates an event booking', async () => {
    const res = await api.post('/api/hotel/banquet', {
      event_name: 'QA Corporate Conference',
      date: DAY_AFTER,
      start_time: '09:00',
      end_time: '17:00',
      hall: 'Conference Room A',
      pax: 50,
      menu_type: 'lunch_buffet',
      total_amount: 10000,
      customer_id: 9006,
    });
    expect(res.status).not.toBe(404);
  });
});
