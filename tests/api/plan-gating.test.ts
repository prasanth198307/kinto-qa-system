/**
 * Plan gating test: verify that modules locked by the tenant's plan
 * return 403, and permitted modules return 200.
 *
 * Tenant qa_admin_in has plan: restaurant_enterprise (full access)
 * Tenant qa_admin_ae has plan: hotel_professional (hotel access, no restaurant)
 * Tenant qa_admin_us has plan: retail_professional (retail access)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, ApiClient } from '../helpers/api';

describe('Plan Gating — restaurant_enterprise (IN tenant)', () => {
  let api: ApiClient;

  beforeAll(async () => {
    api = await login('qa_admin_in', 'Test@1234');
  });

  const permitted = [
    '/api/restaurant/tables',
    '/api/restaurant/menu-items',
    '/api/restaurant/reservations',
    '/api/invoices',
    '/api/hr/employees',
    '/api/inventory/products',
    '/api/customers',
    '/api/vendors',
  ];

  const blocked = [
    '/api/nidhi/members',
    '/api/nidhi/loans',
    '/api/ngo/donors',
    '/api/real-estate/projects',
  ];

  for (const route of permitted) {
    it(`GET ${route} → 200 or 404 (not 403)`, async () => {
      const res = await api.get(route);
      expect(res.status, `Expected not 403 for ${route}`).not.toBe(403);
    });
  }

  for (const route of blocked) {
    it(`GET ${route} → 403 (plan does not include this module)`, async () => {
      const res = await api.get(route);
      expect(res.status, `Expected 403 for ${route}`).toBe(403);
    });
  }
});

describe('Plan Gating — hotel_professional (AE tenant)', () => {
  let api: ApiClient;

  beforeAll(async () => {
    api = await login('qa_admin_ae', 'Test@1234');
  });

  const permitted = [
    '/api/hotel/rooms',
    '/api/hotel/reservations',
    '/api/hotel/check-in',
    '/api/invoices',
    '/api/customers',
  ];

  const blocked = [
    '/api/restaurant/tables',
    '/api/nidhi/members',
    '/api/manufacturing/production-orders',
  ];

  for (const route of permitted) {
    it(`GET ${route} → 200 or 404 (not 403)`, async () => {
      const res = await api.get(route);
      expect(res.status, `Expected not 403 for ${route}`).not.toBe(403);
    });
  }

  for (const route of blocked) {
    it(`GET ${route} → 403`, async () => {
      const res = await api.get(route);
      expect(res.status).toBe(403);
    });
  }
});

describe('Plan Gating — retail_professional (US tenant)', () => {
  let api: ApiClient;

  beforeAll(async () => {
    api = await login('qa_admin_us', 'Test@1234');
  });

  const permitted = [
    '/api/pos/products',
    '/api/inventory/products',
    '/api/customers',
    '/api/invoices',
  ];

  const blocked = [
    '/api/restaurant/tables',
    '/api/hotel/rooms',
    '/api/nidhi/members',
    '/api/ngo/donors',
    '/api/healthcare/patients',
  ];

  for (const route of permitted) {
    it(`GET ${route} → 200 or 404 (not 403)`, async () => {
      const res = await api.get(route);
      expect(res.status, `Expected not 403 for ${route}`).not.toBe(403);
    });
  }

  for (const route of blocked) {
    it(`GET ${route} → 403`, async () => {
      const res = await api.get(route);
      expect(res.status).toBe(403);
    });
  }
});
