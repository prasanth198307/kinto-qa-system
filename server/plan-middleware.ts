import { Request, Response, NextFunction } from "express";
import { ROUTE_PLAN_REQUIREMENTS, planMeetsMinimum, MODULE_NAV_ITEMS } from "./plan-features";
import { db } from "./db";
import { tenants, subscriptionPlans } from "@shared/schema";
import { eq } from "drizzle-orm";

// Simple in-process cache: plan slug → modules[]  (TTL 5 min)
const planModuleCache = new Map<string, { modules: string[]; at: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

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
 * For standard plans (trial/basic/professional/enterprise): uses the hardcoded
 * plan hierarchy (planMeetsMinimum).
 *
 * For custom plan slugs (e.g. "humane"): looks up the plan's modules array from
 * the subscription_plans table in the DB and checks whether the required module
 * is explicitly included.
 *
 * Super-admins bypass all plan checks.
 */
export async function planEnforcementMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only gate authenticated requests
  if (!req.isAuthenticated()) return next();

  const user = req.user as any;

  // Super-admins bypass plan gating entirely
  if (user?.isSuperAdmin) return next();

  // Use session-cached plan; if missing (old sessions), fetch from DB once and cache
  let tenantPlan: string = (req.session as any).tenantPlan;
  if (!tenantPlan) {
    const tenantId: number = (req.session as any).tenantId ?? user?.tenantId ?? 1;
    try {
      const rows = await db.select({ plan: tenants.plan }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      tenantPlan = rows[0]?.plan ?? "enterprise";
      (req.session as any).tenantPlan = tenantPlan;
    } catch {
      tenantPlan = "enterprise"; // Fail open — don't block on DB error
    }
  }

  // Standard plan slugs — use hierarchical check
  const STANDARD_PLANS = ['trial', 'basic', 'professional', 'enterprise'];
  const isStandardPlan = STANDARD_PLANS.includes(tenantPlan);

  for (const rule of ROUTE_PLAN_REQUIREMENTS) {
    if (req.path.startsWith(rule.prefix)) {
      if (isStandardPlan) {
        // Standard path: compare plan levels
        if (!planMeetsMinimum(tenantPlan, rule.minPlan)) {
          return res.status(403).json({
            message: `Your current plan (${tenantPlan}) does not include access to this module. Please upgrade to ${rule.minPlan} or higher.`,
            planRequired: rule.minPlan,
            currentPlan: tenantPlan,
            module: rule.module,
          });
        }
      } else {
        // Custom plan slug — check if required module is in the plan's modules list from DB
        const dbModules = await getModulesForPlan(tenantPlan);
        if (dbModules !== null) {
          if (!dbModules.includes(rule.module)) {
            return res.status(403).json({
              message: `Your current plan does not include access to this module.`,
              planRequired: rule.minPlan,
              currentPlan: tenantPlan,
              module: rule.module,
            });
          }
          // Module is explicitly granted — allow
        }
        // If plan not found in DB at all, fail open (don't block)
      }
      break;
    }
  }

  next();
}
