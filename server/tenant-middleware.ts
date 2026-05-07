import { Request, Response, NextFunction } from "express";
import { db, pool } from "./db";
import { tenants } from "@shared/schema";
import { eq } from "drizzle-orm";
import { runWithTenantId } from "./tenant-context";

declare global {
  namespace Express {
    interface Request {
      tenantId?: number;
      tenant?: typeof tenants.$inferSelect;
    }
  }
}

/**
 * Global tenant middleware.
 * Reads tenantId from session (set at login), attaches to req,
 * AND sets it in AsyncLocalStorage so all storage queries auto-scope.
 * Also blocks suspended/expired tenants on every API call.
 */
export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const session = req.session as any;
    const user = req.user as any;

    const tenantId: number = session?.tenantId ?? user?.tenantId ?? 1;
    req.tenantId = tenantId;

    // Block suspended or expired tenants from all authenticated API requests
    // Allow a small allowlist so the UI can still fetch plan/company info and log out
    // Billing routes must be accessible so suspended/expired tenants can upgrade their plan
    const TENANT_STATUS_ALLOWLIST = [
      '/api/tenant/info', '/api/tenant/features', '/api/logout', '/api/user',
      '/api/billing/plans', '/api/billing/create-order', '/api/billing/verify-payment',
      '/api/billing/request-upgrade', '/api/billing/history',
      '/api/billing/subscription', '/api/billing/cancel',
    ];
    const isAllowlisted = TENANT_STATUS_ALLOWLIST.some(p => req.path.startsWith(p));

    if (req.isAuthenticated() && req.path.startsWith('/api/') && !(user?.isSuperAdmin) && !isAllowlisted) {
      const tenantStatus: string = session?.tenantStatus;
      if (tenantStatus === 'suspended') {
        return res.status(403).json({
          message: 'Your company account has been suspended. Please contact support.',
          code: 'TENANT_SUSPENDED',
        });
      }
      if (tenantStatus === 'expired') {
        return res.status(403).json({
          message: 'Your trial has expired. Please upgrade your plan to continue.',
          code: 'TRIAL_EXPIRED',
        });
      }
    }

    // Set tenant_id in PostgreSQL session for RLS policies (Phase A security).
    // Best-effort — failure never blocks the request (app-level tc() is primary).
    pool
      .query("SELECT set_config('app.current_tenant_id', $1, false)", [String(tenantId)])
      .catch((e) => console.debug("[SECURITY] pg set_config failed:", (e as Error).message));

    // Propagate tenantId through the entire async call chain
    runWithTenantId(tenantId, next);
  } catch {
    next();
  }
}

/**
 * Hard-blocks requests with no valid tenant context.
 * Use after isAuthenticated for tenant-scoped routes.
 */
export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return res.status(403).json({ message: "Tenant context required" });
  }
  next();
}

/**
 * Lookup a tenant by slug — returns public info only.
 */
export async function lookupTenantBySlug(slug: string) {
  const [tenant] = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      plan: tenants.plan,
      status: tenants.status,
      trialEndsAt: tenants.trialEndsAt,
      logoUrl: tenants.logoUrl,
      primaryColor: tenants.primaryColor,
      maxUsers: tenants.maxUsers,
      isSuperAdmin: tenants.isSuperAdmin,
    })
    .from(tenants)
    .where(eq(tenants.slug, slug.toLowerCase().trim()));

  return tenant ?? null;
}
