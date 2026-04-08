import { AsyncLocalStorage } from "async_hooks";
import { eq, type SQL } from "drizzle-orm";

/**
 * AsyncLocalStorage-based tenant context.
 * Propagates tenantId automatically across all async operations
 * within a request — no need to pass it through every function.
 */
const tenantStorage = new AsyncLocalStorage<number>();

/**
 * Get the current tenant ID from the async context.
 * Returns null if no tenant context is set (e.g., during seeding or system ops).
 */
export function getCurrentTenantId(): number | null {
  return tenantStorage.getStore() ?? null;
}

/**
 * Run a function within a specific tenant context.
 * All async operations started within `fn` will inherit this tenantId.
 */
export function runWithTenantId<T>(tenantId: number, fn: () => T): T {
  return tenantStorage.run(tenantId, fn);
}

/**
 * Drizzle WHERE clause helper for tenant scoping.
 * Returns eq(table.tenantId, currentTenantId) if context is set,
 * or undefined if no context (which and() silently ignores).
 * Also returns undefined if the table doesn't have a tenantId column.
 */
export function tc(table: any): SQL | undefined {
  const t = getCurrentTenantId();
  if (t === null || !table || !("tenantId" in table)) return undefined;
  return eq(table.tenantId, t);
}
