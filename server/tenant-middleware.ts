import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { tenants } from "@shared/schema";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      tenantId?: number;
      tenant?: typeof tenants.$inferSelect;
    }
  }
}

/**
 * Attaches req.tenantId from session or logged-in user.
 * Does NOT block requests — enforcement is per-route.
 */
export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const session = req.session as any;
    const user = req.user as any;

    const tenantId: number | undefined =
      session?.tenantId ?? user?.tenantId ?? undefined;

    if (tenantId) {
      req.tenantId = tenantId;
    }
  } catch {
    // Non-blocking — proceed even if tenant lookup fails
  }
  next();
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
