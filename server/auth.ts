import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { User as SelectUser, tenants, users, roles, deletionAudit } from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, sql, or, and } from "drizzle-orm";
import { lookupTenantBySlug } from "./tenant-middleware";
import { seedNewTenant } from "./seed-tenant";
import { backupTenant } from "./backup";
import {
  loginRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
  enforceConcurrentSessionLimit,
  logSecurityEvent,
} from "./security-middleware";
import {
  isAccountLocked,
  getLockoutExpiry,
  PASSWORD_POLICY,
} from "./password-policy";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    if (!supplied || !stored) throw new Error("Missing password or stored hash");
    if (stored.startsWith("$2")) return await bcrypt.compare(supplied, stored);
    const [salt, storedHash] = stored.split(":");
    if (!salt || !storedHash) throw new Error("Invalid stored password format");
    const derivedKey = (await scryptAsync(supplied, salt, KEY_LENGTH)) as Buffer;
    const storedBuffer = Buffer.from(storedHash, "hex");
    return timingSafeEqual(derivedKey, storedBuffer);
  } catch (err) {
    console.error("❌ comparePasswords error:", err);
    return false;
  }
}

export function setupAuth(app: Express) {
  const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

  const sessionSettings: session.SessionOptions = {
    name: "swach.sid",
    secret: process.env.SESSION_SECRET || "insecure_dev_secret",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: storage.sessionStore,
    cookie: {
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    },
  };

  console.log(`🔧 Session configured — Secure: false, SameSite: lax, MaxAge: 7 days`);

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ passReqToCallback: true } as any, async (req: any, username: string, password: string, done: any) => {
      try {
        console.log("🔍 Login attempt for user:", username);
        const { tenantSlug } = req.body;

        let user: any;

        if (tenantSlug) {
          // Preferred path: scope lookup to the specific tenant
          const tenant = await lookupTenantBySlug(tenantSlug);
          if (!tenant) return done(null, false);
          const r = await pool.query(
            `SELECT u.*, COALESCE(r.name, u.role) AS role
             FROM users u
             LEFT JOIN roles r ON r.id = u.role_id
             WHERE LOWER(u.username) = LOWER($1) AND u.tenant_id = $2
             LIMIT 1`,
            [username, tenant.id]
          );
          user = r.rows[0] ?? null;
        } else {
          // Fallback: global lookup (super-admin or no slug provided)
          const r = await pool.query(
            `SELECT u.*, COALESCE(r.name, u.role) AS role
             FROM users u
             LEFT JOIN roles r ON r.id = u.role_id
             WHERE LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1)
             ORDER BY u.is_super_admin DESC NULLS LAST
             LIMIT 1`,
            [username]
          );
          user = r.rows[0] ?? null;
        }

        if (!user || !user.password) return done(null, false);

        // ── Account lockout check ──────────────────────────────────────────
        if (isAccountLocked(user.lockedUntil ?? null)) {
          const until = new Date(user.lockedUntil).toLocaleTimeString();
          return done(null, false, { message: `Account locked due to too many failed attempts. Try again after ${until}.` });
        }

        const valid = await comparePasswords(password, user.password);
        if (!valid) {
          console.warn(`🚫 Invalid password for user: ${username}`);
          // Increment failure counter; lock if threshold hit
          const newCount = (user.failedLoginAttempts ?? 0) + 1;
          const shouldLock = newCount >= PASSWORD_POLICY.maxFailedAttempts;
          await pool.query(
            `UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3`,
            [newCount, shouldLock ? getLockoutExpiry() : null, user.id]
          );
          if (shouldLock) {
            return done(null, false, { message: `Account locked after ${PASSWORD_POLICY.maxFailedAttempts} failed attempts. Try again in ${PASSWORD_POLICY.lockoutMinutes} minutes.` });
          }
          return done(null, false);
        }

        // ── Successful authentication — reset failure counter ──────────────
        if ((user.failedLoginAttempts ?? 0) > 0) {
          await pool.query(
            `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
            [user.id]
          );
        }

        // Re-fetch fresh user row so totp_enabled + other new columns are present
        const freshRow = await pool.query(
          `SELECT id, username, email, totp_enabled, totp_secret, mfa_enforced, must_change_password, password_changed_at FROM users WHERE id = $1`,
          [user.id]
        );
        const freshUser = freshRow.rows[0];

        console.log(`✅ Login successful for ${username}`);
        return done(null, { ...user, ...freshUser });
      } catch (err) {
        console.error("🔥 Login error:", err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        // User no longer exists or is deactivated — expire the session cleanly
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      // DB error during deserialization — fail gracefully, don't leave session in zombie state
      console.error("[Auth] deserializeUser error for id", id, err);
      done(null, false);
    }
  });

  // ─── Public: Look up which companies an email/username belongs to ────────────
  app.post("/api/auth/lookup-email", async (req, res) => {
    try {
      const { emailOrUsername } = req.body;
      if (!emailOrUsername) return res.status(400).json({ message: "Email is required" });

      const matches = await db
        .select({
          tenantId: users.tenantId,
          tenantName: tenants.name,
          tenantSlug: tenants.slug,
          tenantPlan: tenants.plan,
          tenantStatus: tenants.status,
        })
        .from(users)
        .innerJoin(tenants, eq(users.tenantId, tenants.id))
        .where(and(
          or(eq(users.email, emailOrUsername.toLowerCase().trim()), eq(users.username, emailOrUsername.trim())),
          eq(users.recordStatus, 1),
        ));

      // Deduplicate by tenantId
      const seen = new Set<number>();
      const companies = matches.filter(m => {
        if (seen.has(m.tenantId!)) return false;
        seen.add(m.tenantId!);
        return true;
      });

      return res.json({ companies });
    } catch (err) {
      console.error("Email lookup error:", err);
      return res.status(500).json({ message: "Lookup failed" });
    }
  });

  // ─── Public: Tenant lookup by slug ──────────────────────────────────────────
  app.get("/api/tenants/lookup/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      if (!slug) return res.status(400).json({ message: "Slug is required" });

      const tenant = await lookupTenantBySlug(slug);
      if (!tenant) return res.status(404).json({ message: "Company not found" });
      if (tenant.status === "suspended") {
        return res.status(403).json({ message: "This company account is suspended. Please contact support." });
      }

      return res.json(tenant);
    } catch (err) {
      console.error("Tenant lookup error:", err);
      return res.status(500).json({ message: "Failed to lookup company" });
    }
  });

  // ─── Public: Check slug availability ────────────────────────────────────────
  app.get("/api/tenants/check-slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const slugRegex = /^[a-z0-9-]{3,50}$/;
      if (!slugRegex.test(slug)) {
        return res.json({ available: false, reason: "invalid" });
      }
      const existing = await lookupTenantBySlug(slug);
      return res.json({ available: !existing });
    } catch (err) {
      return res.status(500).json({ message: "Check failed" });
    }
  });

  // ─── Public: Register a new company (creates tenant + first admin) ────────────
  app.post("/api/tenants/register", async (req, res) => {
    try {
      const {
        companyName,
        slug,
        adminName,
        email,
        password,
        phone,
        gstNumber,
        address,
      } = req.body;

      if (!companyName || !slug || !adminName || !email || !password) {
        return res.status(400).json({ message: "Company name, slug, admin name, email and password are required" });
      }

      // Validate slug format
      const slugRegex = /^[a-z0-9-]{3,50}$/;
      if (!slugRegex.test(slug)) {
        return res.status(400).json({ message: "Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only" });
      }

      // Check slug uniqueness
      const existing = await lookupTenantBySlug(slug);
      if (existing) {
        return res.status(409).json({ message: "This company URL is already taken. Please choose another." });
      }

      // Create tenant
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const [newTenant] = await db
        .insert(tenants)
        .values({
          name: companyName.trim(),
          slug: slug.toLowerCase().trim(),
          plan: "trial",
          status: "trial",
          trialEndsAt,
          maxUsers: 5,
          billingEmail: email,
          contactName: adminName.trim(),
          contactPhone: phone || null,
          gstNumber: gstNumber || null,
          address: address || null,
        })
        .returning();

      // Seed default roles + Chart of Accounts for the new tenant
      const { adminRoleId } = await seedNewTenant(newTenant.id);

      // Create first admin user for this tenant
      const hashedPw = await hashPassword(password);
      const adminUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");

      const newUser = await db
        .insert(users)
        .values({
          username: adminUsername,
          email: email.toLowerCase().trim(),
          password: hashedPw,
          firstName: adminName.split(" ")[0] || adminName,
          lastName: adminName.split(" ").slice(1).join(" ") || null,
          mobileNumber: phone ? phone.replace(/[^0-9]/g, "").slice(-10) || null : null,
          roleId: adminRoleId,
          tenantId: newTenant.id,
          recordStatus: 1,
        } as any)
        .returning();

      // Auto-save CORS origin for the slug-based production URL
      const defaultOrigin = `https://${newTenant.slug}.swacherp.com`;
      await db.update(tenants)
        .set({ corsOrigins: [defaultOrigin] })
        .where(eq(tenants.id, newTenant.id));

      console.log(`✅ New tenant registered: ${newTenant.name} (${newTenant.slug}) with admin: ${adminUsername}`);

      return res.status(201).json({
        message: "Company registered successfully",
        tenant: { id: newTenant.id, name: newTenant.name, slug: newTenant.slug },
        username: adminUsername,
      });
    } catch (err: any) {
      console.error("Company registration error:", err);
      if (err?.code === "23505") {
        return res.status(409).json({ message: "Email or company URL already exists" });
      }
      return res.status(500).json({ message: "Failed to register company" });
    }
  });

  // ─── Public: One-click demo login ───────────────────────────────────────────
  // Auto-seeds the demo tenant if it doesn't exist, then logs the caller in
  // as acme-admin. No credentials required — anyone can use this.
  app.post("/api/demo-login", async (req: any, res) => {
    try {
      // 1. Ensure demo tenant exists
      const { seedDemoTenant } = await import("./seed-demo-tenant");
      const seedResult = await seedDemoTenant();
      const tenantId = seedResult.tenantId;

      // 2. Find the demo admin user
      const [demoUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.tenantId, tenantId), eq(users.username, "acme-admin"), eq(users.recordStatus, 1)))
        .limit(1);

      if (!demoUser) {
        return res.status(500).json({ message: "Demo user not found. Please try again." });
      }

      // 3. Get role name
      const roleRow = demoUser.roleId
        ? await db.select({ name: roles.name }).from(roles).where(eq(roles.id, demoUser.roleId)).limit(1)
        : [];
      const roleName = roleRow[0]?.name ?? "admin";

      // 4. Log in via passport
      const userWithRole = { ...demoUser, role: roleName, isDemo: true };

      req.login(userWithRole, (err: any) => {
        if (err) return res.status(500).json({ message: "Demo login failed" });

        (req.session as any).tenantId    = tenantId;
        (req.session as any).tenantPlan  = "professional";
        (req.session as any).tenantStatus = "active";
        (req.session as any).isDemo      = true;

        req.session.save((err: any) => {
          if (err) return res.status(500).json({ message: "Session save failed" });
          console.log(`✅ Demo login — user: acme-admin, tenant: ${tenantId}`);
          return res.json({ ...userWithRole, isDemo: true });
        });
      });
    } catch (err: any) {
      console.error("Demo login error:", err);
      return res.status(500).json({ message: err?.message ?? "Demo login failed" });
    }
  });

  // ─── Super-admin: Seed demo tenant ─────────────────────────────────────────
  app.post("/api/admin/seed-demo", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as any;
    if (!currentUser?.isSuperAdmin && currentUser?.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const { seedDemoTenant } = await import("./seed-demo-tenant");
      const result = await seedDemoTenant();
      return res.json(result);
    } catch (err: any) {
      console.error("Demo seed error:", err);
      return res.status(500).json({ message: err?.message ?? "Failed to seed demo tenant" });
    }
  });

  // ─── Super-admin: List all tenants ─────────────────────────────────────────
  app.get("/api/admin/tenants", async (req: any, res) => {
    if (!req.isAuthenticated()) {
      console.warn(`[ADMIN] GET /api/admin/tenants → 401 | sessionID=${req.sessionID} | passportUser=${JSON.stringify((req.session as any)?.passport)}`);
      return res.sendStatus(401);
    }
    const currentUser = req.user as any;
    if (!currentUser?.isSuperAdmin && currentUser?.role !== "admin") {
      console.warn(`[ADMIN] GET /api/admin/tenants → 403 | user=${currentUser?.username} isSuperAdmin=${currentUser?.isSuperAdmin} role=${currentUser?.role}`);
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const result = await pool.query(`
        SELECT
          t.id,
          t.name,
          t.slug,
          t.plan,
          t.status,
          t.trial_ends_at   AS "trialEndsAt",
          t.max_users       AS "maxUsers",
          t.billing_email   AS "billingEmail",
          t.contact_name    AS "contactName",
          t.contact_phone   AS "contactPhone",
          t.is_super_admin  AS "isSuperAdmin",
          t.is_internal     AS "isInternal",
          t.created_at      AS "createdAt",
          t.logo_url        AS "logoUrl",
          (SELECT COUNT(*)::int
             FROM users u
            WHERE u.tenant_id = t.id
              AND u.record_status = 1)  AS "userCount"
        FROM tenants t
        ORDER BY t.created_at DESC
      `);
      return res.json(result.rows);
    } catch (err) {
      console.error("List tenants error:", err);
      return res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  // ─── Super-admin: Update tenant status ────────────────────────────────────
  app.patch("/api/admin/tenants/:id/status", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as any;
    if (!currentUser?.isSuperAdmin && currentUser?.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const { id } = req.params;
      const { status, plan, maxUsers } = req.body;

      const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
      if (status) updates.status = status;
      if (plan) updates.plan = plan;
      if (maxUsers) updates.maxUsers = maxUsers;

      const [updated] = await db
        .update(tenants)
        .set(updates)
        .where(eq(tenants.id, parseInt(id)))
        .returning();

      if (!updated) return res.status(404).json({ message: "Tenant not found" });

      console.log(`[ADMIN] Tenant ${id} updated: ${JSON.stringify(updates)}`);
      return res.json(updated);
    } catch (err) {
      console.error("Update tenant status error:", err);
      return res.status(500).json({ message: "Failed to update tenant" });
    }
  });

  // ─── Super-admin: Impersonate a tenant ────────────────────────────────────
  app.post("/api/admin/tenants/:id/impersonate", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as any;
    if (!currentUser?.isSuperAdmin) return res.status(403).json({ message: "Super-admin only" });

    const targetTenantId = parseInt(req.params.id);
    try {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, targetTenantId));
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      // Find the admin user of the target tenant
      const [targetAdmin] = await db
        .select()
        .from(users)
        .where(eq(users.tenantId, targetTenantId))
        .limit(1);

      if (!targetAdmin) return res.status(404).json({ message: "No users found in this tenant" });

      // Swap session to impersonate the tenant
      const previousTenantId = (req.session as any).tenantId;
      const previousUserId = (req.session as any).userId;
      (req.session as any).impersonating = true;
      (req.session as any).originalTenantId = previousTenantId;
      (req.session as any).originalUserId = previousUserId;
      (req.session as any).tenantId = targetTenantId;
      (req.session as any).tenantPlan = tenant.plan;
      (req.session as any).tenantStatus = tenant.status;

      // Log the impersonation
      console.log(`[ADMIN] Super-admin ${currentUser.username} impersonating tenant ${targetTenantId} (${tenant.slug})`);

      return res.json({
        message: `Now viewing as ${tenant.name}`,
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
      });
    } catch (err) {
      console.error("Impersonate error:", err);
      return res.status(500).json({ message: "Failed to impersonate tenant" });
    }
  });

  // ─── Super-admin: Stop impersonation ──────────────────────────────────────
  app.post("/api/admin/impersonate/stop", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!(req.session as any).impersonating) return res.status(400).json({ message: "Not impersonating" });

    (req.session as any).tenantId = (req.session as any).originalTenantId;
    (req.session as any).tenantPlan = undefined;
    (req.session as any).tenantStatus = undefined;
    (req.session as any).impersonating = false;
    (req.session as any).originalTenantId = undefined;
    (req.session as any).originalUserId = undefined;

    return res.json({ message: "Stopped impersonation, returned to super-admin" });
  });

  // ─── Super-admin: Delete tenant data (irreversible) ───────────────────────
  app.post("/api/admin/tenants/:id/delete-data", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as any;
    if (!currentUser?.isSuperAdmin) return res.status(403).json({ message: "Super-admin only" });

    const targetTenantId = parseInt(req.params.id);
    const { reason, confirm } = req.body;

    if (confirm !== "DELETE") {
      return res.status(400).json({ message: 'Send confirm: "DELETE" to proceed' });
    }

    try {
      // Get tenant info before deletion
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, targetTenantId));
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      if ((tenant as any).isSuperAdmin) return res.status(403).json({ message: "Cannot delete super-admin tenant" });

      // Count rows per key table before deletion
      const rowsDeleted: Record<string, number> = {};
      const tables = [
        "invoices", "invoice_items", "sales_orders", "sales_order_items",
        "purchase_orders", "purchase_order_items", "gatepasses", "gatepass_items",
        "vendors", "products", "raw_materials", "users",
        "journal_entries", "journal_lines", "expense_vouchers", "documents",
        "checklist_submissions", "production_entries", "finished_goods",
      ];

      for (const table of tables) {
        try {
          const result = await db.execute(
            sql`SELECT COUNT(*)::int AS cnt FROM ${sql.identifier(table)} WHERE tenant_id = ${targetTenantId}`
          );
          rowsDeleted[table] = (result.rows[0] as any)?.cnt ?? 0;
        } catch {
          rowsDeleted[table] = 0;
        }
      }

      // Step 1: Run pre-deletion backup (save full export BEFORE any deletion)
      let preDeletionBackupFile: string | null = null;
      try {
        preDeletionBackupFile = await backupTenant(targetTenantId, "pre-deletion");
        console.log(`[DELETE TENANT] Pre-deletion backup created: ${preDeletionBackupFile}`);
      } catch (backupErr) {
        console.error("[DELETE TENANT] Pre-deletion backup failed (proceeding anyway):", (backupErr as any).message);
      }

      // Write deletion audit record FIRST (before any deletion)
      await db.insert(deletionAudit).values({
        tenantId: targetTenantId,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        ownerEmail: (tenant as any).billingEmail,
        rowsDeleted,
        exportUrl: preDeletionBackupFile ?? undefined,
        deletedBy: currentUser.username,
        reason: reason || "Manual deletion by super-admin",
      });

      // Delete all tenant data from key tables (in dependency order)
      const deleteOrder = [
        "checklist_submissions", "submission_tasks",
        "whatsapp_conversation_sessions",
        "pm_executions", "pm_execution_tasks",
        "journal_lines", "journal_entries",
        "invoice_payments", "payment_evidence",
        "credit_note_items", "credit_notes",
        "debit_note_items", "debit_notes",
        "vendor_debit_note_items", "vendor_debit_notes",
        "sales_return_items", "sales_returns",
        "gatepass_items", "gatepasses",
        "invoice_items", "invoices",
        "sales_order_items", "sales_orders",
        "purchase_order_items", "purchase_orders",
        "raw_material_issuance_items", "raw_material_issuance",
        "production_reconciliation_items", "production_reconciliations",
        "production_entries",
        "raw_material_transactions",
        "finished_goods",
        "raw_materials",
        "product_bom",
        "products",
        "vendors",
        "expense_items", "expense_vouchers",
        "monthly_expenses",
        "cash_register_transactions", "cash_register_days",
        "documents",
        "notification_config",
        "role_permissions", "roles",
        "users",
        "chart_of_accounts",
        "scrap_inventory",
      ];

      for (const table of deleteOrder) {
        try {
          await db.execute(
            sql`DELETE FROM ${sql.identifier(table)} WHERE tenant_id = ${targetTenantId}`
          );
        } catch (e) {
          console.warn(`[DELETE TENANT] Could not delete from ${table}:`, (e as any).message);
        }
      }

      // Mark tenant as deleted (do NOT delete the tenants row — per spec)
      await db.update(tenants).set({
        status: "deleted" as any,
        updatedAt: new Date().toISOString(),
      } as any).where(eq(tenants.id, targetTenantId));

      console.log(`[ADMIN] Tenant ${targetTenantId} (${tenant.slug}) data deleted by ${currentUser.username}`);
      return res.json({ message: `Tenant "${tenant.name}" data permanently deleted`, rowsDeleted });
    } catch (err) {
      console.error("Delete tenant data error:", err);
      return res.status(500).json({ message: "Failed to delete tenant data" });
    }
  });

  // ─── Super-admin: Deletion audit log ─────────────────────────────────────
  app.get("/api/admin/deletion-audit", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.user?.isSuperAdmin) return res.status(403).json({ message: "Super-admin only" });
    try {
      const records = await db.select().from(deletionAudit).orderBy(desc(deletionAudit.deletedAt));
      return res.json(records);
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch deletion audit" });
    }
  });

  // ─── Login ─────────────────────────────────────────────────────────────────
  app.post("/api/login", loginRateLimiter, (req, res, next) => {
    const { tenantSlug } = req.body;

    passport.authenticate("local", async (err: any, user: any) => {
      if (err) return next(err);
      if (!user) {
        // Log failed attempt
        logSecurityEvent(req, "LOGIN_FAILED", `Failed login for username: ${req.body?.username ?? "unknown"}`, "warn");
        return res.status(401).json({ message: "Invalid username or password" });
      }

      let tenantPlan = "trial";
      let tenantStatus = "active";

      // If tenantSlug provided, verify user belongs to that tenant and grab plan/status
      if (tenantSlug) {
        const tenant = await lookupTenantBySlug(tenantSlug);
        if (!tenant) return res.status(401).json({ message: "Company not found" });

        // Check for trial expiry — auto-expire if needed
        let effectiveStatus = tenant.status;
        if (effectiveStatus === "trial" && (tenant as any).trialEndsAt) {
          const trialEnd = new Date((tenant as any).trialEndsAt);
          if (trialEnd < new Date()) {
            // Auto-expire the tenant in DB
            await db.update(tenants).set({ status: "expired", updatedAt: new Date().toISOString() }).where(eq(tenants.id, tenant.id));
            effectiveStatus = "expired";
          }
        }

        if (effectiveStatus === "suspended") return res.status(403).json({ message: "Your company account has been suspended. Please contact support.", code: "TENANT_SUSPENDED" });
        if (effectiveStatus === "expired") return res.status(403).json({ message: "Your trial has expired. Please upgrade to continue.", code: "TRIAL_EXPIRED" });

        const userTenantId = (user as any).tenantId ?? (user as any).tenant_id ?? 1;
        if (userTenantId !== tenant.id) {
          console.warn(`⚠️ User ${user.username} (tenant ${userTenantId}) attempted login to tenant ${tenant.id}`);
          return res.status(401).json({ message: "Invalid username or password" });
        }
        tenantPlan = (tenant as any).plan ?? "trial";
        tenantStatus = effectiveStatus;
      } else {
        // No slug provided — look up tenant plan/status by user's tenantId
        const userTenantId = (user as any).tenantId ?? (user as any).tenant_id ?? 1;
        const tenantRow = await db.select({ plan: tenants.plan, status: tenants.status, trialEndsAt: tenants.trialEndsAt }).from(tenants).where(eq(tenants.id, userTenantId)).limit(1);
        tenantPlan = tenantRow[0]?.plan ?? "trial";
        let effectiveStatus = tenantRow[0]?.status ?? "active";
        if (effectiveStatus === "trial" && tenantRow[0]?.trialEndsAt) {
          if (new Date(tenantRow[0].trialEndsAt) < new Date()) {
            await db.update(tenants).set({ status: "expired", updatedAt: new Date().toISOString() }).where(eq(tenants.id, userTenantId));
            effectiveStatus = "expired";
          }
        }
        if (effectiveStatus === "suspended") return res.status(403).json({ message: "Your company account has been suspended. Please contact support.", code: "TENANT_SUSPENDED" });
        if (effectiveStatus === "expired") return res.status(403).json({ message: "Your trial has expired. Please upgrade to continue.", code: "TRIAL_EXPIRED" });
        tenantStatus = effectiveStatus;
      }

      // ── MFA gate: if TOTP is enabled, pause login and require second factor ──
      if ((user as any).totp_enabled) {
        const session = req.session as any;
        session.pendingMfaUserId = user.id;
        session.pendingMfaExpiry = Date.now() + 5 * 60 * 1000; // 5-min window
        session.pendingMfaTenantId = (user as any).tenantId ?? (user as any).tenant_id ?? 1;
        session.pendingMfaPlan = tenantPlan;
        session.pendingMfaStatus = tenantStatus;
        return req.session.save(() => res.json({ mfaRequired: true }));
      }

      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed" });

        // Store tenantId, tenantPlan, and tenantStatus in session
        (req.session as any).tenantId = (user as any).tenantId ?? (user as any).tenant_id ?? 1;
        (req.session as any).tenantPlan = tenantPlan;
        (req.session as any).tenantStatus = tenantStatus;

        req.session.save(async (err) => {
          if (err) return res.status(500).json({ message: "Session save failed" });

          try {
            // Enforce concurrent session limit (max 3 per user)
            await enforceConcurrentSessionLimit(user.id, (req.session as any).id ?? req.sessionID);

            // Purge legacy connect.sid cookies (old domain-scoped and hostname-scoped)
            // so stale browser cookies can't shadow the new swach.sid session.
            res.clearCookie("connect.sid", { path: "/" });
            res.clearCookie("connect.sid", { domain: ".swacherp.com", path: "/" });

            // Log successful login with IP
            logSecurityEvent(req, "LOGIN_SUCCESS", `User ${user.username} logged in`, "info", String(user.id), (user as any).tenantId ?? (user as any).tenant_id);

            console.log(`✅ Session saved — user: ${user.username}, tenant: ${(req.session as any).tenantId}, plan: ${tenantPlan}, status: ${tenantStatus}`);
            // Re-fetch via storage so the response always uses camelCase Drizzle ORM
            // fields (isSuperAdmin, tenantId, isActive) — the raw SQL user object is
            // snake_case and causes the frontend to mis-route (e.g. isSuperAdmin undefined).
            const normalizedUser = await storage.getUser(String(user.id));
            return res.json(normalizedUser ?? req.user);
          } catch (innerErr) {
            console.error("🔥 Post-login error:", innerErr);
            return res.status(500).json({ message: "Login succeeded but session setup failed" });
          }
        });
      });
    })(req, res, next);
  });

  // ─── Logout ────────────────────────────────────────────────────────────────
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie("swach.sid");
        // Also clear the old connect.sid cookie (all domain variants) so stale
        // browser cookies can't cause phantom 401s after deployment.
        res.clearCookie("connect.sid");
        res.clearCookie("connect.sid", { domain: ".swacherp.com", path: "/" });
        res.json({ message: "Logged out" });
      });
    });
  });

  // ─── Current user ──────────────────────────────────────────────────────────
  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const isDemo = !!(req.session as any).isDemo;
    // getUser() already joins roles and returns role: COALESCE(roles.name, users.role)
    // so we just pass it through — no need for a second getRole() lookup that
    // can silently return undefined and overwrite the correct role name.
    res.json({ ...user, isDemo });
  });

  // ─── Forgot password ───────────────────────────────────────────────────────
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email, tenantSlug } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });

      let user: any;
      if (tenantSlug) {
        const tenant = await lookupTenantBySlug(tenantSlug);
        if (tenant) {
          user = await storage.getUserByUsernameAndTenant(email, tenant.id);
        }
      } else {
        user = await storage.getUserByEmail(email);
      }

      if (!user) return res.status(200).json({ message: "If the email exists, a reset link will be sent" });

      const resetToken = randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 3600000);
      await storage.setPasswordResetToken(user.id, resetToken, resetTokenExpiry);

      console.log(`🔐 Password reset token for ${email}: ${resetToken}`);
      console.log(`Reset link: ${process.env.REPLIT_DOMAINS || "http://localhost:5050"}/auth/reset-password?token=${resetToken}`);

      return res.status(200).json({ message: "If the email exists, a reset link will be sent" });
    } catch (error) {
      console.error("Forgot password error:", error);
      return res.status(500).json({ message: "Failed to process request" });
    }
  });

  // ─── Reset password ────────────────────────────────────────────────────────
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) return res.status(400).json({ message: "Token and new password are required" });

      const user = await storage.getUserByResetToken(token);
      if (!user || !user.resetTokenExpiry || new Date() > user.resetTokenExpiry)
        return res.status(400).json({ message: "Invalid or expired reset token" });

      const hashedPassword = await hashPassword(newPassword);
      await storage.resetPassword(user.id, hashedPassword);

      return res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Reset password error:", error);
      return res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // ─── Debug session middleware ───────────────────────────────────────────────
  app.use((req, _res, next) => {
    if (req.path.startsWith("/api/") && process.env.NODE_ENV === "development") {
      console.log("🔹 Request:", req.method, req.path);
      console.log("   Session ID:", req.sessionID);
      console.log("   Authenticated:", req.isAuthenticated());
    }
    next();
  });
}

export { hashPassword, comparePasswords };
