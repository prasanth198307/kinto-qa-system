import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { User as SelectUser, tenants, users, roles } from "@shared/schema";
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

  // ─── Login ─────────────────────────────────────────────────────────────────
  app.post("/api/login", (req, res, next) => {
    const { tenantSlug } = req.body;

    passport.authenticate("local", async (err: any, user: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid username or password" });

      // If tenantSlug provided, verify user belongs to that tenant
      if (tenantSlug) {
        const tenant = await lookupTenantBySlug(tenantSlug);
        if (!tenant) return res.status(401).json({ message: "Company not found" });
        if (tenant.status === "suspended") return res.status(403).json({ message: "Company account is suspended" });

        const userTenantId = (user as any).tenantId ?? 1;
        if (userTenantId !== tenant.id) {
          console.warn(`⚠️ User ${user.username} (tenant ${userTenantId}) attempted login to tenant ${tenant.id}`);
          return res.status(401).json({ message: "Invalid username or password" });
        }
      }

      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ message: "Session regeneration failed" });

        req.login(user, (err) => {
          if (err) return res.status(500).json({ message: "Login failed" });

          // Store tenantId in session
          (req.session as any).tenantId = (user as any).tenantId ?? 1;

          req.session.save((err) => {
            if (err) return res.status(500).json({ message: "Session save failed" });

            console.log(`✅ Session saved — user: ${user.username}, tenant: ${(req.session as any).tenantId}`);
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
