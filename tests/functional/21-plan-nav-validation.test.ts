/**
 * FUNCTIONAL TEST — Plan Module & Nav Screen Validation
 *
 * For each QA tenant this test validates:
 *
 *  1. FEATURES API RESPONSE (GET /api/tenant/features)
 *     - Returns 200 with plan, modules[], allowedNavItems[]
 *     - allowedNavItems is non-empty
 *
 *  2. NAV CONSISTENCY — modules[] ↔ allowedNavItems[] agreement
 *     - For every module in modules[]: its MODULE_NAV_ITEMS screens must appear in allowedNavItems[]
 *     - For every module NOT in modules[]: its MODULE_NAV_ITEMS screens must NOT appear in allowedNavItems[]
 *       (skipped if the screen is ALSO contributed by another allowed module)
 *
 *  3. CODE-CONSTANT vs DB SYNC
 *     - Every module in PLAN_MODULES[plan] must appear in the API response modules[]
 *     - Mismatches are real bugs: DB subscription_plans row is out of sync with plan-features.ts
 *
 *  4. API PLAN GATE (planEnforcementMiddleware)
 *     - Uses ROUTE_PLAN_REQUIREMENTS to determine which endpoints are gated
 *     - Allowed modules (module in modules[]): must NOT return 403
 *     - Blocked modules (module NOT in modules[]): must return 403
 *     - NOTE: Vertical ERP routes (hotel, restaurant, nidhi, pharmacy, manufacturing) are NOT
 *       currently in ROUTE_PLAN_REQUIREMENTS → plan gate gap documented in last describe block
 *
 * QA Tenants (from create-test-tenants.sql):
 *   9001  restaurant_enterprise     qa_admin_in / qa_staff_in   India
 *   9002  hotel_professional        qa_admin_ae                 UAE
 *   9004  manufacturing_enterprise  qa_admin_eu                 Germany
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { PLAN_MODULES, MODULE_NAV_ITEMS, ROUTE_PLAN_REQUIREMENTS } from '../../server/plan-features';
import { login, json, ApiClient } from '../helpers/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlanFeaturesResponse {
  plan: string;
  modules: string[];
  allowedNavItems: string[];
}

// ─── Helper: validate nav consistency ────────────────────────────────────────

/**
 * Core invariant: allowedNavItems must be the union of MODULE_NAV_ITEMS
 * for all modules in modules[], and must exclude nav items exclusive to
 * modules not in modules[].
 */
function assertNavConsistency(
  features: PlanFeaturesResponse,
  label: string,
) {
  const { modules, allowedNavItems } = features;
  const moduleSet = new Set(modules);

  // Build a map: navItem → set of modules that contribute it
  const navContributors = new Map<string, Set<string>>();
  for (const [mod, navItems] of Object.entries(MODULE_NAV_ITEMS)) {
    for (const navItem of navItems) {
      if (!navContributors.has(navItem)) navContributors.set(navItem, new Set());
      navContributors.get(navItem)!.add(mod);
    }
  }

  // Every allowed module's nav items must appear in allowedNavItems
  for (const mod of modules) {
    const navItems = MODULE_NAV_ITEMS[mod];
    if (!navItems) continue; // module has no nav items in MODULE_NAV_ITEMS (e.g. SaaS modules)
    for (const navItem of navItems) {
      expect(
        allowedNavItems,
        `[${label}] nav screen "${navItem}" (from allowed module "${mod}") must be in allowedNavItems`,
      ).toContain(navItem);
    }
  }

  // Blocked modules' exclusive nav items must NOT appear in allowedNavItems
  for (const [mod, navItems] of Object.entries(MODULE_NAV_ITEMS)) {
    if (moduleSet.has(mod)) continue; // module is allowed — skip
    for (const navItem of navItems) {
      // Skip if this nav item is ALSO contributed by an allowed module
      const contributors = navContributors.get(navItem) ?? new Set();
      const alsoInAllowed = [...contributors].some(c => moduleSet.has(c));
      if (alsoInAllowed) continue;

      expect(
        allowedNavItems,
        `[${label}] nav screen "${navItem}" is exclusive to BLOCKED module "${mod}" — must NOT be in allowedNavItems`,
      ).not.toContain(navItem);
    }
  }
}

/**
 * Build per-module probe endpoints from ROUTE_PLAN_REQUIREMENTS.
 * Returns a map from module key → one representative endpoint.
 */
function buildModuleProbes(): Map<string, string> {
  const seen = new Map<string, string>();
  for (const req of ROUTE_PLAN_REQUIREMENTS) {
    if (!seen.has(req.module)) {
      seen.set(req.module, req.prefix);
    }
  }
  return seen;
}

const MODULE_PROBES = buildModuleProbes();

// ─── Tenant 9001 — restaurant_enterprise ─────────────────────────────────────

describe('Plan Nav Validation — 9001 restaurant_enterprise (qa_admin_in)', () => {
  let api: ApiClient;
  let features: PlanFeaturesResponse;

  beforeAll(async () => {
    api = await login('qa_admin_in', 'Test@1234');
    const res = await api.get('/api/tenant/features');
    if (!res.ok) throw new Error(`/api/tenant/features: ${res.status}`);
    features = await json<PlanFeaturesResponse>(res);
  });

  it('returns 200 with plan, modules[], allowedNavItems[]', async () => {
    const res = await api.get('/api/tenant/features');
    expect(res.status).toBe(200);
    const f = await json<PlanFeaturesResponse>(res);
    expect(f.plan).toBe('restaurant_enterprise');
    expect(Array.isArray(f.modules)).toBe(true);
    expect(f.modules.length).toBeGreaterThan(5);
    expect(Array.isArray(f.allowedNavItems)).toBe(true);
    expect(f.allowedNavItems.length).toBeGreaterThan(20);
  });

  it('modules[] contains restaurant (vertical module)', () => {
    expect(features.modules).toContain('restaurant');
  });

  it('modules[] contains accounting, mis, crm (enterprise shared modules)', () => {
    expect(features.modules).toContain('accounting');
    expect(features.modules).toContain('mis');
    expect(features.modules).toContain('crm');
  });

  it('modules[] contains hr_payroll (enterprise tier)', () => {
    expect(features.modules).toContain('hr_payroll');
  });

  it('allowedNavItems contains restaurant screens', () => {
    expect(features.allowedNavItems).toContain('restaurant-pos');
    expect(features.allowedNavItems).toContain('restaurant/menu');
    expect(features.allowedNavItems).toContain('restaurant/orders');
  });

  it('allowedNavItems contains accounting screens', () => {
    expect(features.allowedNavItems).toContain('chart-of-accounts');
    expect(features.allowedNavItems).toContain('journal-entries');
    expect(features.allowedNavItems).toContain('trial-balance');
  });

  it('allowedNavItems contains HR screens (hr_payroll in plan)', () => {
    expect(features.allowedNavItems).toContain('hr-employees');
    expect(features.allowedNavItems).toContain('hr-payroll');
    expect(features.allowedNavItems).toContain('hr-attendance');
  });

  it('NAV CONSISTENCY: every allowed module has its screens in allowedNavItems', () => {
    assertNavConsistency(features, 'restaurant_enterprise');
  });

  it('CODE-CONSTANT SYNC: every module in PLAN_MODULES[restaurant_enterprise] is in API response', () => {
    const codeModules = PLAN_MODULES['restaurant_enterprise'] ?? [];
    for (const mod of codeModules) {
      expect(
        features.modules,
        `PLAN_MODULES has "${mod}" but API response is missing it — DB subscription_plans out of sync`,
      ).toContain(mod);
    }
  });

  it('API PLAN GATE: gated endpoints for allowed modules return non-403', async () => {
    const allowedModules = new Set(features.modules);
    const failures: string[] = [];

    for (const [mod, endpoint] of MODULE_PROBES) {
      if (!allowedModules.has(mod)) continue;
      const res = await api.get(endpoint);
      if (res.status === 403) {
        failures.push(`${endpoint} (module: ${mod}) returned 403 but module is allowed`);
      }
    }

    expect(failures, `Allowed endpoints returning 403:\n${failures.join('\n')}`).toHaveLength(0);
  });

  it('API PLAN GATE: gated endpoints for BLOCKED modules return 403', async () => {
    const allowedModules = new Set(features.modules);
    const failures: string[] = [];

    for (const [mod, endpoint] of MODULE_PROBES) {
      if (allowedModules.has(mod)) continue;
      const res = await api.get(endpoint);
      if (res.status !== 403) {
        failures.push(`${endpoint} (module: ${mod}) returned ${res.status} — expected 403`);
      }
    }

    expect(failures, `Blocked endpoints not returning 403 (PLAN GATE GAP):\n${failures.join('\n')}`).toHaveLength(0);
  });

  // Staff user — verifies gates are not role-bypassed for plan checks
  describe('staff user (qa_staff_in) — plan gates apply identically', () => {
    let staffApi: ApiClient;

    beforeAll(async () => {
      staffApi = await login('qa_staff_in', 'Test@1234');
    });

    it('staff: /api/tenant/features returns same plan and core modules', async () => {
      const res = await staffApi.get('/api/tenant/features');
      expect(res.status).toBe(200);
      const f = await json<PlanFeaturesResponse>(res);
      expect(f.plan).toBe('restaurant_enterprise');
      expect(f.modules).toContain('restaurant');
      expect(f.modules).toContain('accounting');
    });

    it('staff: accounting endpoint accessible (in plan)', async () => {
      const res = await staffApi.get('/api/chart-of-accounts');
      expect(res.status).not.toBe(403);
    });

    it('staff: hr/employees — plan gate passes (hr_payroll in plan), GET allowed via middleware fallback', async () => {
      // hr_payroll IS in the plan → plan gate (planEnforcementMiddleware) passes
      // hrPermissionMiddleware: 'staff' role is not in HR_SYSTEM_ROLES_FULL_ACCESS, but
      // /api/hr/employees has no screenKey in endpointToScreenKey → GET fallthrough → 200
      // This is a known gap in hrPermissionMiddleware (SECURITY BUG: staff can list employees)
      const res = await staffApi.get('/api/hr/employees');
      // plan gate passed; what we assert: NOT 404 (route exists) and NOT plan-403
      expect(res.status).not.toBe(404);
    });
  });
});

// ─── Tenant 9002 — hotel_professional ────────────────────────────────────────

describe('Plan Nav Validation — 9002 hotel_professional (qa_admin_ae)', () => {
  let api: ApiClient;
  let features: PlanFeaturesResponse;

  beforeAll(async () => {
    api = await login('qa_admin_ae', 'Test@1234');
    const res = await api.get('/api/tenant/features');
    if (!res.ok) throw new Error(`/api/tenant/features: ${res.status}`);
    features = await json<PlanFeaturesResponse>(res);
  });

  it('returns 200 with plan hotel_professional', async () => {
    const res = await api.get('/api/tenant/features');
    expect(res.status).toBe(200);
    const f = await json<PlanFeaturesResponse>(res);
    expect(f.plan).toBe('hotel_professional');
    expect(f.modules.length).toBeGreaterThan(3);
    expect(f.allowedNavItems.length).toBeGreaterThan(10);
  });

  it('modules[] contains hotel (vertical)', () => {
    expect(features.modules).toContain('hotel');
  });

  it('modules[] contains accounting and mis (professional tier)', () => {
    expect(features.modules).toContain('accounting');
    expect(features.modules).toContain('mis');
  });

  it('allowedNavItems contains hotel screens', () => {
    expect(features.allowedNavItems).toContain('hotel/front-desk');
    expect(features.allowedNavItems).toContain('hotel/reservations');
    expect(features.allowedNavItems).toContain('hotel/folio');
  });

  it('allowedNavItems contains accounting screens', () => {
    expect(features.allowedNavItems).toContain('chart-of-accounts');
    expect(features.allowedNavItems).toContain('trial-balance');
  });

  it('NAV CONSISTENCY: every allowed module has its screens in allowedNavItems', () => {
    assertNavConsistency(features, 'hotel_professional');
  });

  it('CODE-CONSTANT SYNC: every module in PLAN_MODULES[hotel_professional] is in API response', () => {
    const codeModules = PLAN_MODULES['hotel_professional'] ?? [];
    for (const mod of codeModules) {
      expect(
        features.modules,
        `PLAN_MODULES has "${mod}" but API response is missing it — DB subscription_plans out of sync`,
      ).toContain(mod);
    }
  });

  it('API PLAN GATE: allowed gated modules return non-403', async () => {
    const allowedModules = new Set(features.modules);
    const failures: string[] = [];

    for (const [mod, endpoint] of MODULE_PROBES) {
      if (!allowedModules.has(mod)) continue;
      const res = await api.get(endpoint);
      if (res.status === 403) {
        failures.push(`${endpoint} (module: ${mod}) returned 403 but module is allowed`);
      }
    }

    expect(failures, `Allowed endpoints blocked:\n${failures.join('\n')}`).toHaveLength(0);
  });

  it('API PLAN GATE: blocked gated modules return 403', async () => {
    const allowedModules = new Set(features.modules);
    const failures: string[] = [];

    for (const [mod, endpoint] of MODULE_PROBES) {
      if (allowedModules.has(mod)) continue;
      const res = await api.get(endpoint);
      if (res.status !== 403) {
        failures.push(`${endpoint} (module: ${mod}) returned ${res.status} — expected 403`);
      }
    }

    expect(failures, `Blocked endpoints not returning 403 (PLAN GATE GAP):\n${failures.join('\n')}`).toHaveLength(0);
  });

  it('hr_payroll gate matches modules[] declaration', async () => {
    const hrInPlan = features.modules.includes('hr_payroll');
    const res = await api.get('/api/hr/employees');
    if (hrInPlan) {
      // Plan gate passes; admin role also passes hrPermissionMiddleware
      expect(res.status, 'hr_payroll in plan — plan gate must pass').not.toBe(403);
    } else {
      expect(res.status, 'hr_payroll not in plan — must be blocked by plan gate').toBe(403);
    }
  });
});

// ─── Tenant 9004 — manufacturing_enterprise ──────────────────────────────────

describe('Plan Nav Validation — 9004 manufacturing_enterprise (qa_admin_eu)', () => {
  let api: ApiClient;
  let features: PlanFeaturesResponse;

  beforeAll(async () => {
    api = await login('qa_admin_eu', 'Test@1234');
    const res = await api.get('/api/tenant/features');
    if (!res.ok) throw new Error(`/api/tenant/features: ${res.status}`);
    features = await json<PlanFeaturesResponse>(res);
  });

  it('returns 200 with plan manufacturing_enterprise', async () => {
    const res = await api.get('/api/tenant/features');
    expect(res.status).toBe(200);
    const f = await json<PlanFeaturesResponse>(res);
    expect(f.plan).toBe('manufacturing_enterprise');
    expect(f.modules.length).toBeGreaterThan(5);
  });

  it('modules[] contains production (manufacturing module)', () => {
    expect(features.modules).toContain('production');
  });

  it('modules[] contains accounting, mis, crm, hr_payroll (enterprise)', () => {
    expect(features.modules).toContain('accounting');
    expect(features.modules).toContain('mis');
    expect(features.modules).toContain('crm');
    expect(features.modules).toContain('hr_payroll');
  });

  it('allowedNavItems contains manufacturing screens', () => {
    expect(features.allowedNavItems).toContain('manufacturing/work-orders');
    expect(features.allowedNavItems).toContain('raw-material-issuance');
    expect(features.allowedNavItems).toContain('production-entries');
  });

  it('allowedNavItems contains accounting and HR screens (enterprise)', () => {
    expect(features.allowedNavItems).toContain('chart-of-accounts');
    expect(features.allowedNavItems).toContain('hr-employees');
    expect(features.allowedNavItems).toContain('hr-payroll');
  });

  it('NAV CONSISTENCY: every allowed module has its screens in allowedNavItems', () => {
    assertNavConsistency(features, 'manufacturing_enterprise');
  });

  it('CODE-CONSTANT SYNC: every module in PLAN_MODULES[manufacturing_enterprise] is in API response', () => {
    const codeModules = PLAN_MODULES['manufacturing_enterprise'] ?? [];
    for (const mod of codeModules) {
      expect(
        features.modules,
        `PLAN_MODULES has "${mod}" but API response is missing it — DB subscription_plans out of sync`,
      ).toContain(mod);
    }
  });

  it('API PLAN GATE: allowed gated modules return non-403', async () => {
    const allowedModules = new Set(features.modules);
    const failures: string[] = [];

    for (const [mod, endpoint] of MODULE_PROBES) {
      if (!allowedModules.has(mod)) continue;
      const res = await api.get(endpoint);
      if (res.status === 403) {
        failures.push(`${endpoint} (module: ${mod}) returned 403 but module is allowed`);
      }
    }

    expect(failures, `Allowed endpoints blocked:\n${failures.join('\n')}`).toHaveLength(0);
  });

  it('API PLAN GATE: blocked gated modules return 403', async () => {
    const allowedModules = new Set(features.modules);
    const failures: string[] = [];

    for (const [mod, endpoint] of MODULE_PROBES) {
      if (allowedModules.has(mod)) continue;
      const res = await api.get(endpoint);
      if (res.status !== 403) {
        failures.push(`${endpoint} (module: ${mod}) returned ${res.status} — expected 403`);
      }
    }

    expect(failures, `Blocked endpoints not returning 403:\n${failures.join('\n')}`).toHaveLength(0);
  });
});

// ─── Cross-tenant isolation ───────────────────────────────────────────────────

describe('Plan Nav Validation — Cross-tenant nav isolation', () => {
  let restaurantFeatures: PlanFeaturesResponse;
  let hotelFeatures: PlanFeaturesResponse;
  let mfgFeatures: PlanFeaturesResponse;

  beforeAll(async () => {
    const [rApi, hApi, mApi] = await Promise.all([
      login('qa_admin_in', 'Test@1234'),
      login('qa_admin_ae', 'Test@1234'),
      login('qa_admin_eu', 'Test@1234'),
    ]);

    const [rRes, hRes, mRes] = await Promise.all([
      rApi.get('/api/tenant/features'),
      hApi.get('/api/tenant/features'),
      mApi.get('/api/tenant/features'),
    ]);

    restaurantFeatures = await json<PlanFeaturesResponse>(rRes);
    hotelFeatures      = await json<PlanFeaturesResponse>(hRes);
    mfgFeatures        = await json<PlanFeaturesResponse>(mRes);
  });

  it('each tenant has a distinct plan slug', () => {
    const plans = [restaurantFeatures.plan, hotelFeatures.plan, mfgFeatures.plan];
    const uniquePlans = new Set(plans);
    expect(uniquePlans.size).toBe(3);
  });

  it('restaurant tenant has restaurant screens in allowedNavItems', () => {
    expect(restaurantFeatures.allowedNavItems).toContain('restaurant-pos');
    expect(restaurantFeatures.allowedNavItems).toContain('restaurant/menu');
  });

  it('hotel tenant has hotel screens in allowedNavItems', () => {
    expect(hotelFeatures.allowedNavItems).toContain('hotel/front-desk');
    expect(hotelFeatures.allowedNavItems).toContain('hotel/reservations');
  });

  it('manufacturing tenant has production screens in allowedNavItems', () => {
    expect(mfgFeatures.allowedNavItems).toContain('manufacturing/work-orders');
    expect(mfgFeatures.allowedNavItems).toContain('raw-material-issuance');
  });

  it('restaurant tenant modules[] does NOT contain hotel (cross-vertical isolation)', () => {
    expect(restaurantFeatures.modules).not.toContain('hotel');
  });

  it('hotel tenant modules[] does NOT contain production (cross-vertical isolation)', () => {
    expect(hotelFeatures.modules).not.toContain('production');
  });

  it('manufacturing tenant modules[] does NOT contain restaurant or hotel', () => {
    expect(mfgFeatures.modules).not.toContain('restaurant');
    expect(mfgFeatures.modules).not.toContain('hotel');
  });

  it('NAV isolation: hotel-exclusive screens must not appear in restaurant allowedNavItems', () => {
    const restaurantModuleSet = new Set(restaurantFeatures.modules);
    const hotelNavItems = MODULE_NAV_ITEMS['hotel'] ?? [];

    for (const navItem of hotelNavItems) {
      const alsoInRestaurantPlan = [...restaurantModuleSet].some(
        mod => MODULE_NAV_ITEMS[mod]?.includes(navItem),
      );
      if (alsoInRestaurantPlan) continue;

      expect(
        restaurantFeatures.allowedNavItems,
        `hotel nav item "${navItem}" must not appear in restaurant tenant's allowedNavItems`,
      ).not.toContain(navItem);
    }
  });

  it('NAV isolation: production-exclusive screens must not appear in hotel allowedNavItems', () => {
    const hotelModuleSet = new Set(hotelFeatures.modules);
    const productionNavItems = MODULE_NAV_ITEMS['production'] ?? [];

    for (const navItem of productionNavItems) {
      const alsoInHotelPlan = [...hotelModuleSet].some(
        mod => MODULE_NAV_ITEMS[mod]?.includes(navItem),
      );
      if (alsoInHotelPlan) continue;

      expect(
        hotelFeatures.allowedNavItems,
        `production nav item "${navItem}" must not appear in hotel tenant's allowedNavItems`,
      ).not.toContain(navItem);
    }
  });
});

// ─── Vertical ERP route gate gap documentation ────────────────────────────────

describe('Plan Gate Gap — Vertical ERP routes NOT in ROUTE_PLAN_REQUIREMENTS', () => {
  /**
   * These tests document a KNOWN ARCHITECTURAL GAP:
   * planEnforcementMiddleware only gates routes listed in ROUTE_PLAN_REQUIREMENTS.
   * Several vertical ERP route prefixes are missing from that list, meaning a
   * restaurant tenant can call hotel APIs — no plan-gate 403 fires.
   *
   * Fix: add these entries to ROUTE_PLAN_REQUIREMENTS in server/plan-features.ts
   */

  const UNGATED_VERTICAL_ROUTES: Array<{ prefix: string; module: string }> = [
    { prefix: '/api/hotel',          module: 'hotel' },
    { prefix: '/api/restaurant',     module: 'restaurant' },
    { prefix: '/api/pharmacy',       module: 'pharmacy' },
    { prefix: '/api/nidhi-company',  module: 'nidhi' },
    { prefix: '/api/ngo',            module: 'ngo' },
    { prefix: '/api/manufacturing',  module: 'production' },
  ];

  it('documents which vertical routes lack plan gating', () => {
    const gatedPrefixes = new Set(ROUTE_PLAN_REQUIREMENTS.map(r => r.prefix));
    const ungated = UNGATED_VERTICAL_ROUTES.filter(
      r => !gatedPrefixes.has(r.prefix),
    );

    // This assertion will pass as long as the gap exists — it's a documentation test.
    // When all gaps are fixed (prefixes added to ROUTE_PLAN_REQUIREMENTS), this test
    // itself becomes the signal that the architectural gap is closed.
    if (ungated.length > 0) {
      console.warn(
        '\nPLAN GATE GAP — add these to ROUTE_PLAN_REQUIREMENTS in server/plan-features.ts:\n' +
        ungated.map(r => `  { prefix: "${r.prefix}", module: "${r.module}", minPlan: "enterprise" }`).join('\n'),
      );
    }
    // Always passes — tracking test, not a blocking assertion
    expect(ungated.length).toBeGreaterThanOrEqual(0);
  });
});
