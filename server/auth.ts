import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { User as SelectUser, tenants, users, roles, deletionAudit } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { lookupTenantBySlug } from "./tenant-middleware";
import { seedNewTenant } from "./seed-tenant";

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
  const isReplit = !!(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN);
  const isDevelopment = process.env.NODE_ENV === "development";
  const useSecure = !isDevelopment && isReplit;

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "insecure_dev_secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    },
  };

  console.log(
    `🔧 Session configured — Secure: ${useSecure}, SameSite: Lax, Dev Mode: ${isDevelopment}${isReplit ? " (Replit)" : ""}`
  );

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("🔍 Login attempt for user:", username);
        const user = await storage.getUserByUsername(username);
        if (!user || !user.password) return done(null, false);
        const valid = await comparePasswords(password, user.password);
        if (!valid) {
          console.warn(`🚫 Invalid password for user: ${username}`);
          return done(null, false);
        }
        console.log(`✅ Login successful for ${username}`);
        return done(null, user);
      } catch (err) {
        console.error("🔥 Login error:", err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    const user = await storage.getUser(id);
    done(null, user);
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
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as any;
    if (!currentUser?.isSuperAdmin && currentUser?.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const allTenants = await db
        .select({
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
          plan: tenants.plan,
          status: tenants.status,
          trialEndsAt: tenants.trialEndsAt,
          maxUsers: tenants.maxUsers,
          billingEmail: tenants.billingEmail,
          contactName: tenants.contactName,
          contactPhone: tenants.contactPhone,
          isSuperAdmin: tenants.isSuperAdmin,
          createdAt: tenants.createdAt,
          userCount: sql<number>`(SELECT COUNT(*) FROM users u WHERE u.tenant_id = ${tenants.id} AND u.record_status = 1)`,
        })
        .from(tenants)
        .orderBy(desc(tenants.createdAt));

      return res.json(allTenants);
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

      // Write deletion audit record FIRST (before any deletion)
      await db.insert(deletionAudit).values({
        tenantId: targetTenantId,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        ownerEmail: (tenant as any).billingEmail,
        rowsDeleted,
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
  app.post("/api/login", (req, res, next) => {
    const { tenantSlug } = req.body;

    passport.authenticate("local", async (err: any, user: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid username or password" });

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

        const userTenantId = (user as any).tenantId ?? 1;
        if (userTenantId !== tenant.id) {
          console.warn(`⚠️ User ${user.username} (tenant ${userTenantId}) attempted login to tenant ${tenant.id}`);
          return res.status(401).json({ message: "Invalid username or password" });
        }
        tenantPlan = (tenant as any).plan ?? "trial";
        tenantStatus = effectiveStatus;
      } else {
        // No slug provided — look up tenant plan/status by user's tenantId
        const userTenantId = (user as any).tenantId ?? 1;
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

      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ message: "Session regeneration failed" });

        req.login(user, (err) => {
          if (err) return res.status(500).json({ message: "Login failed" });

          // Store tenantId, tenantPlan, and tenantStatus in session
          (req.session as any).tenantId = (user as any).tenantId ?? 1;
          (req.session as any).tenantPlan = tenantPlan;
          (req.session as any).tenantStatus = tenantStatus;

          req.session.save((err) => {
            if (err) return res.status(500).json({ message: "Session save failed" });

            console.log(`✅ Session saved — user: ${user.username}, tenant: ${(req.session as any).tenantId}, plan: ${tenantPlan}, status: ${tenantStatus}`);
            return res.json(req.user);
          });
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
        res.clearCookie("connect.sid");
        res.redirect("/login");
      });
    });
  });

  // ─── Current user ──────────────────────────────────────────────────────────
  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (user.roleId) {
      const roleData = await storage.getRole(user.roleId);
      res.json({ ...user, role: roleData?.name });
    } else {
      res.json(user);
    }
  });

  // ─── Forgot password ───────────────────────────────────────────────────────
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });
      const user = await storage.getUserByEmail(email);
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

export { hashPassword };
