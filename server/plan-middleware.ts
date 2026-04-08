import { Request, Response, NextFunction } from "express";
import { ROUTE_PLAN_REQUIREMENTS, planMeetsMinimum } from "./plan-features";
import { db } from "./db";
import { tenants } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Express middleware that blocks API requests for modules not included
 * in the tenant's active subscription plan.
 *
 * The tenant's plan is stored in session at login time.
 * Super-admins (isSuperAdmin flag on user) bypass all plan checks.
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

  for (const rule of ROUTE_PLAN_REQUIREMENTS) {
    if (req.path.startsWith(rule.prefix)) {
      if (!planMeetsMinimum(tenantPlan, rule.minPlan)) {
        return res.status(403).json({
          message: `Your current plan (${tenantPlan}) does not include access to this module. Please upgrade to ${rule.minPlan} or higher.`,
          planRequired: rule.minPlan,
          currentPlan: tenantPlan,
          module: rule.module,
        });
      }
      // Found a matching rule and tenant qualifies — no need to check further
      break;
    }
  }

  next();
}
