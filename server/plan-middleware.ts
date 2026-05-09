import { Request, Response, NextFunction } from "express";
import { ROUTE_PLAN_REQUIREMENTS, planMeetsMinimum } from "./plan-features";
import { db } from "./db";
import { tenants, subscriptionPlans } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Modules NOT sold in the Module Marketplace catalog.
 * When selected_modules is set by the super-admin, these modules are NOT controlled
 * by that list — they always fall through to the plan-level check instead.
 * Everything else (invoicing, accounting, expenses, inventory, hr_payroll, crm, etc.)
 * IS catalog-managed: if selected_modules is set and doesn't include the module, ACCESS IS DENIED.
 */
const NON_CATALOG_MODULES = new Set([
  'mis',                // Dashboard/MIS — free, always on
  'documents',          // Document vault — not in catalog
  'whatsapp',           // WhatsApp integration — not in catalog
  'fixed_assets',       // Fixed assets — not in catalog
  'multi_currency',     // Multi-currency — not in catalog
  'recurring_invoices', // Recurring invoices — not in catalog
]);

/**
 * Catalog slugs (stored in subscriptions.selected_modules via the Module Marketplace)
 * do not always match the route-level module names used in ROUTE_PLAN_REQUIREMENTS.
 * This map lets the plan enforcement accept either form.
 *
 * Key   = ROUTE_PLAN_REQUIREMENTS module name
 * Value = set of catalog slugs (or legacy names) that count as equivalent
 */
const MODULE_ALIASES: Record<string, string[]> = {
  // Catalog slug → route-level module name mappings
  sales_orders:       ["sales", "sales_orders"],
  quality_returns:    ["quality", "quality_returns"],
  expenses:           ["expenses", "expense_claims"],
  basic_inventory:    ["inventory", "basic_inventory"],
  mis:                ["mis", "dashboard"],
  purchase_orders:    ["purchase", "purchase_orders"],
  logistics_transport:["logistics", "logistics_transport"],
  // These exist only as route-level names (not in catalog); no alias needed but listed for clarity
  documents:          ["documents"],
  whatsapp:           ["whatsapp"],
  fixed_assets:       ["fixed_assets"],
  multi_currency:     ["multi_currency"],
  recurring_invoices: ["recurring_invoices"],
};

/** Returns true if the tenant's selected_modules list satisfies the given route module. */
function tenantHasModule(tenantModules: string[], routeModule: string): boolean {
  const aliases = MODULE_ALIASES[routeModule] ?? [routeModule];
  return aliases.some(a => tenantModules.includes(a));
}

// Simple in-process cache: plan slug → modules[]  (TTL 5 min)
const planModuleCache = new Map<string, { modules: string[]; at: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// Cache for per-tenant selected modules (TTL 2 min)
const tenantModuleCache = new Map<number, { modules: string[]; at: number }>();
const TENANT_CACHE_TTL_MS = 2 * 60 * 1000;

export function invalidateTenantModuleCache(tenantId: number) {
  tenantModuleCache.delete(tenantId);
}

async function getSelectedModulesForTenant(tenantId: number): Promise<string[] | null> {
  const cached = tenantModuleCache.get(tenantId);
  if (cached && Date.now() - cached.at < TENANT_CACHE_TTL_MS) return cached.modules;

  try {
    const rows = await db.execute(sql`
      SELECT selected_modules FROM subscriptions
      WHERE tenant_id = ${tenantId} LIMIT 1
    `);
    const raw = (rows.rows as any[])[0]?.selected_modules;
    if (Array.isArray(raw) && raw.length > 0) {
      tenantModuleCache.set(tenantId, { modules: raw as string[], at: Date.now() });
      return raw as string[];
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Immediately evict a plan's modules from the cache.
 * Call this whenever a plan's modules are created or updated so the
 * enforcement middleware picks up the change on the very next request.
 */
export function invalidatePlanCache(planSlug: string) {
  planModuleCache.delete(planSlug);
}

async function getModulesForPlan(planSlug: string): Promise<string[] | null> {
  const cached = planModuleCache.get(planSlug);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.modules;

  try {
    const rows = await db
      .select({ modules: subscriptionPlans.modules })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, planSlug))
      .limit(1);

    if (rows[0]?.modules && Array.isArray(rows[0].modules)) {
      const modules = rows[0].modules as string[];
      planModuleCache.set(planSlug, { modules, at: Date.now() });
      return modules;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Express middleware that blocks API requests for modules not included
 * in the tenant's active subscription plan.
 *
 * DB modules are the single source of truth — whatever modules are stored in
 * the subscription_plans table for a plan slug are the ones that are allowed.
 * Super-admins bypass all plan checks.
 *
 * Fallback: if the plan slug has no DB record, uses the hardcoded hierarchical
 * planMeetsMinimum() check so the system never blocks on a DB miss.
 */
export async function planEnforcementMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only gate authenticated requests
  if (!req.isAuthenticated()) return next();

  const user = req.user as any;

  // Super-admins bypass plan gating entirely
  if (user?.isSuperAdmin) return next();

  // Always fetch plan fresh from DB — never use session cache which can be stale
  const tenantId: number = (req.session as any).tenantId ?? user?.tenantId ?? 1;
  let tenantPlan: string = "enterprise";
  try {
    const rows = await db.select({ plan: tenants.plan }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    tenantPlan = rows[0]?.plan ?? "enterprise";
  } catch {
    tenantPlan = "enterprise"; // Fail open — don't block on DB error
  }

  for (const rule of ROUTE_PLAN_REQUIREMENTS) {
    if (req.path.startsWith(rule.prefix)) {
      // Always resolve plan-level modules — needed for fallback in both paths below
      const dbModules = await getModulesForPlan(tenantPlan);

      // 1. Check per-tenant selected_modules (set by super-admin via Module Marketplace).
      //    When set, selected_modules is the authoritative list for catalog-managed modules.
      //    — If module IS in selected_modules → ALLOW immediately.
      //    — If module is NOT in selected_modules AND it's catalog-managed → DENY immediately.
      //    — Non-catalog modules (mis, documents, whatsapp, etc.) always fall through to plan check.
      const tenantModules = await getSelectedModulesForTenant(tenantId);
      if (tenantModules !== null) {
        if (tenantHasModule(tenantModules, rule.module)) {
          break; // explicitly enabled in per-tenant selection → allow
        }
        // Module not in selected_modules. Block catalog-managed modules immediately.
        if (!NON_CATALOG_MODULES.has(rule.module)) {
          return res.status(403).json({
            message: `This module has been disabled for your account. Please contact your administrator to enable it.`,
            planRequired: rule.minPlan,
            currentPlan: tenantPlan,
            module: rule.module,
          });
        }
        // Non-catalog module — fall through to plan-level check below
      }

      // 2. Check plan-level module list from DB
      if (dbModules !== null) {
        if (!tenantHasModule(dbModules, rule.module)) {
          return res.status(403).json({
            message: `Your current plan (${tenantPlan}) does not include access to this module. Please upgrade to access this feature.`,
            planRequired: rule.minPlan,
            currentPlan: tenantPlan,
            module: rule.module,
          });
        }
      } else {
        // No DB record for this plan slug — use hardcoded hierarchy for known plan names,
        // fail open (allow) for completely unknown slugs to avoid locking out custom tenants.
        const KNOWN_PLANS = ['trial', 'basic', 'professional', 'enterprise'];
        if (KNOWN_PLANS.includes(tenantPlan) && !planMeetsMinimum(tenantPlan, rule.minPlan)) {
          return res.status(403).json({
            message: `Your current plan (${tenantPlan}) does not include access to this module. Please upgrade to ${rule.minPlan} or higher.`,
            planRequired: rule.minPlan,
            currentPlan: tenantPlan,
            module: rule.module,
          });
        }
      }
      break;
    }
  }

  next();
}
