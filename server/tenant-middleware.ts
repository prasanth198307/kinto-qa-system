import { Request, Response, NextFunction } from "express";
import { db } from "./db";
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
 */
export function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const session = req.session as any;
    const user = req.user as any;

    const tenantId: number =
      session?.tenantId ?? user?.tenantId ?? 1;

    req.tenantId = tenantId;

    // Propagate tenantId through the entire async call chain
    // This means storage.ts queries pick it up without prop-drilling
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
      logoUrl: tenants.logoUrl,
      primaryColor: tenants.primaryColor,
      isSuperAdmin: tenants.isSuperAdmin,
    })
    .from(tenants)
    .where(eq(tenants.slug, slug.toLowerCase().trim()));

  return tenant ?? null;
}
